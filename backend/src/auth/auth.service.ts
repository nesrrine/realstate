import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(user: { id: string; email: string; role: string; agentId?: string | null }) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role, agentId: user.agentId });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    if (!user.isActive) {
      throw new UnauthorizedException("Account disabled");
    }

    const { passwordHash, ...safeUser } = user;

    const agent = await this.prisma.agent.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return {
      user: { ...safeUser, agentId: agent?.id ?? null },
      accessToken: this.signToken({ ...safeUser, agentId: agent?.id ?? null }),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            licenseNumber: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      agentId: user.agent?.id ?? null,
      agent: user.agent
        ? {
            id: user.agent.id,
            licenseNumber: user.agent.licenseNumber,
            bio: user.agent.bio,
            avatarUrl: user.agent.avatarUrl,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!existing) throw new NotFoundException("User not found");

    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (conflict) throw new ConflictException("Cet email est déjà utilisé");
    }

    const data: { email?: string; firstName?: string; lastName?: string; phone?: string | null } = {};
    if (dto.email) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone || null;

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getMe(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException("Mot de passe actuel incorrect");

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      // Toutes les sessions ouvertes (autres appareils compris) sont fermées
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return { message: "Mot de passe modifié : reconnectez-vous avec le nouveau mot de passe" };
  }

  async createAdmin(dto: CreateAdminDto, requesterUserId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { role: true, isActive: true },
    });
    if (!requester || !requester.isActive || requester.role !== Role.MANAGER) {
      throw new ForbiddenException("Only a manager can create an admin");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Email already registered");

    if (dto.licenseNumber) {
      const lic = await this.prisma.agent.findUnique({
        where: { licenseNumber: dto.licenseNumber },
        select: { id: true },
      });
      if (lic) throw new ConflictException("License number already in use");
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.ADMIN,
        agent: {
          create: {
            licenseNumber: dto.licenseNumber,
            bio: dto.bio,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        agent: { select: { id: true } },
      },
    });
  }
}