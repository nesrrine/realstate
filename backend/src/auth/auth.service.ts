import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Role } from "@prisma/client";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

// Champs publics d'un utilisateur (jamais passwordHash)
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

// Chaîne vide / espaces -> null
const emptyToNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

// Doublon (email, numéro de carte) détecté par la base
const handlePrismaError = (e: unknown): never => {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  ) {
    throw new ConflictException("Valeur déjà utilisée");
  }

  throw e;
};

@Injectable()
export class AuthService {
  // Hash factice : permet de faire le même travail quand l'email n'existe pas,
  // pour qu'on ne puisse pas deviner les emails existants par le temps de réponse
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.dummyHash = argon2.hash(randomUUID());
  }

  private signToken(user: {
    id: string;
    email: string;
    role: string;
    agentId?: string | null;
  }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      agentId: user.agentId,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        ...USER_PUBLIC_SELECT,
        passwordHash: true,
        agent: { select: { id: true } },
      },
    });

    if (!user) {
      await argon2.verify(await this.dummyHash, dto.password);
      throw new UnauthorizedException("Identifiants invalides");
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    // Vérifié après le mot de passe : on ne révèle l'état du compte
    // qu'à quelqu'un qui connaît le bon mot de passe
    if (!user.isActive) {
      throw new UnauthorizedException(
        "Compte désactivé. Contactez votre gérant.",
      );
    }

    const { passwordHash, agent, ...safeUser } = user;
    const agentId = agent?.id ?? null;

    return {
      user: { ...safeUser, agentId },
      accessToken: this.signToken({ ...safeUser, agentId }),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_PUBLIC_SELECT,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            licenseNumber: true,
            bio: true,
            avatarUrl: true,
            agentType: true,
            canManageCash: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const { agent, ...rest } = user;

    return {
      ...rest,
      agentId: agent?.id ?? null,
      agent: agent ?? null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!existing) throw new NotFoundException("Utilisateur introuvable");

    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (conflict) throw new ConflictException("Cet email est déjà utilisé");
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = emptyToNull(dto.phone);

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (e) {
      return handlePrismaError(e);
    }

    return this.getMe(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable");

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'actuel",
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      // Toutes les sessions ouvertes (autres appareils compris) sont fermées
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return {
      message:
        "Mot de passe modifié : reconnectez-vous avec le nouveau mot de passe",
    };
  }

  async createAdmin(dto: CreateAdminDto, requesterUserId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { role: true, isActive: true },
    });
    if (!requester || !requester.isActive || requester.role !== Role.MANAGER) {
      throw new ForbiddenException(
        "Seul le gérant peut créer un administrateur",
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Email already registered");

    const licenseNumber = emptyToNull(dto.licenseNumber);
    const phone = emptyToNull(dto.phone);
    const bio = emptyToNull(dto.bio);

    if (licenseNumber) {
      const lic = await this.prisma.agent.findUnique({
        where: { licenseNumber },
        select: { id: true },
      });
      if (lic) throw new ConflictException("License number already in use");
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone,
          role: Role.ADMIN,
          agent: {
            create: { licenseNumber, bio },
          },
        },
        select: {
          ...USER_PUBLIC_SELECT,
          agent: { select: { id: true } },
        },
      });
    } catch (e) {
      return handlePrismaError(e);
    }
  }
}