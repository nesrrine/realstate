import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentDto } from "./dto/update-agent.dto";
import { AgentFilterDto } from "./dto/agent-filter.dto";

// Utilisateur connecté (issu du JWT)
export interface Actor {
  userId: string;
  role: Role;
}

// Champs renvoyés pour un agent (jamais passwordHash)
const AGENT_LIST_SELECT = {
  id: true,
  licenseNumber: true,
  bio: true,
  agentType: true,
  canManageCash: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  },
  // Visites accompagnées (terrain) et planifiées (bureau), hors annulées et absences
  _count: {
    select: {
      clients: true,
      properties: true,
      fieldAgentVisits: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
      officeAgentVisits: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
    },
  },
} satisfies Prisma.AgentSelect;

// Chaîne vide / espaces -> null (évite les conflits d'unicité sur "")
const emptyToNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

// Erreur Prisma P2002 -> 409 lisible
const handlePrismaError = (e: unknown): never => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = e.meta?.target;
    const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");
    throw new ConflictException(`Valeur déjà utilisée : ${fields}`);
  }
  throw e;
};

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Un ADMIN ne peut jamais agir sur un compte MANAGER ─────────────
  private assertCanManage(targetRole: Role, actor: Actor) {
    if (targetRole === Role.MANAGER && actor.role !== Role.MANAGER) {
      throw new ForbiddenException("Seul le gérant peut modifier ce compte");
    }
  }

  // ── Création d'un agent (MANAGER, ADMIN) ───────────────────────────
  async create(dto: CreateAgentDto, actor: Actor) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email already registered");

    const licenseNumber = emptyToNull(dto.licenseNumber);
    const phone = emptyToNull(dto.phone);
    const bio = emptyToNull(dto.bio);
    const agentType = dto.agentType ?? 'FIELD';

    if (licenseNumber) {
      const lic = await this.prisma.agent.findUnique({
        where: { licenseNumber },
      });
      if (lic) throw new ConflictException("License number already in use");
    }

    const passwordHash = await argon2.hash(dto.password);

    // Rôle à attribuer selon l'acteur
    let roleToSet: Role = Role.AGENT;
    if (actor.role === Role.MANAGER) {
      // MANAGER peut choisir AGENT ou ADMIN (pas MANAGER)
      roleToSet = dto.role ?? Role.AGENT;
      if (roleToSet === Role.MANAGER) {
        throw new ForbiddenException(
          "Un gestionnaire ne peut pas créer un autre gestionnaire",
        );
      }
    }

    try {
      return await this.prisma.agent.create({
        data: {
          licenseNumber,
          bio,
          agentType,
          user: {
            create: {
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone,
              role: roleToSet,
            },
          },
        },
        select: AGENT_LIST_SELECT,
      });
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  // ── Liste pour les menus déroulants (léger) ────────────────────────
  findOptions() {
    return this.prisma.agent.findMany({
      where: { user: { isActive: true } },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { user: { lastName: "asc" } },
    });
  }

  // ── Liste avec compteurs, filtres et pagination (pas de N+1) ───────
  async findAll(filter: AgentFilterDto = {} as AgentFilterDto) {
    const page = Math.max(Number(filter.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 200);
    const skip = (page - 1) * limit;

    const userWhere: Prisma.UserWhereInput = {};

    if (filter.search) {
      userWhere.OR = [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName: { contains: filter.search, mode: "insensitive" } },
        { email: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    if (filter.isActive !== undefined) {
      userWhere.isActive = filter.isActive;
    }

    const where: Prisma.AgentWhereInput = {
      ...(Object.keys(userWhere).length > 0 && { user: userWhere }),
      ...(filter.agentType && { agentType: filter.agentType }),
    };

    const sortOrder: Prisma.SortOrder =
      filter.sortOrder === "desc" ? "desc" : "asc";

    let orderBy: Prisma.AgentOrderByWithRelationInput;
    switch (filter.sortBy) {
      case "createdAt":
        orderBy = { user: { createdAt: sortOrder } };
        break;
      case "firstName":
        orderBy = { user: { firstName: sortOrder } };
        break;
      default:
        orderBy = { user: { lastName: sortOrder } };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.agent.count({ where }),
      this.prisma.agent.findMany({
        where,
        select: AGENT_LIST_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Détail ─────────────────────────────────────────────────────────
  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: AGENT_LIST_SELECT,
    });
    if (!agent) throw new NotFoundException("Agent introuvable");
    return agent;
  }

  // ── Modification ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateAgentDto) {
    const agent = await this.findOne(id);

    // undefined = champ non envoyé (inchangé) ; '' = vidé (-> null)
    const licenseNumber =
      dto.licenseNumber === undefined ? undefined : emptyToNull(dto.licenseNumber);
    const agentType = dto.agentType;

    if (licenseNumber && licenseNumber !== agent.licenseNumber) {
      const lic = await this.prisma.agent.findUnique({
        where: { licenseNumber },
      });
      if (lic) throw new ConflictException("License number already in use");
    }

    try {
      return await this.prisma.agent.update({
        where: { id },
        data: {
          licenseNumber,
          bio: dto.bio === undefined ? undefined : emptyToNull(dto.bio),
          agentType,
          user: {
            update: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone === undefined ? undefined : emptyToNull(dto.phone),
            },
          },
        },
        select: AGENT_LIST_SELECT,
      });
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  // ── Activer / désactiver ───────────────────────────────────────────
  async setStatus(id: string, isActive: boolean, actor: Actor) {
    const agent = await this.findOne(id);
    this.assertCanManage(agent.user.role, actor);

    if (agent.user.id === actor.userId) {
      throw new BadRequestException(
        "Vous ne pouvez pas modifier le statut de votre propre compte",
      );
    }

    return this.prisma.user.update({
      where: { id: agent.user.id },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  // ── Réinitialiser le mot de passe ──────────────────────────────────
  async resetPassword(id: string, newPassword: string, actor: Actor) {
    const agent = await this.findOne(id);
    this.assertCanManage(agent.user.role, actor);

    if (agent.user.id === actor.userId) {
      throw new ForbiddenException(
        "Utilisez la page de changement de mot de passe pour votre propre compte",
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    // Réinitialisation par le gérant : les sessions ouvertes de l'agent sont coupées
    await this.prisma.user.update({
      where: { id: agent.user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return { message: "Mot de passe réinitialisé" };
  }

  // ── Portefeuille d'un agent (avant suppression) ────────────────────
  async portfolio(id: string) {
    await this.findOne(id);
    const [clients, properties, leads, visits, transactions, cashEntries] = await this.prisma.$transaction([
      this.prisma.client.count({ where: { OR: [{ agentId: id }, { fieldAgentId: id }] } }),
      this.prisma.property.count({ where: { agentId: id } }),
      this.prisma.lead.count({ where: { agentId: id } }),
      this.prisma.visit.count({ where: { OR: [{ fieldAgentId: id }, { officeAgentId: id }] } }),
      this.prisma.transaction.count({ where: { OR: [{ fieldAgentId: id }, { officeAgentId: id }] } }),
      this.prisma.cashEntry.count({ where: { createdBy: { agent: { id } } } }),
    ]);
    return { clients, properties, leads, visits, transactions, cashEntries };
  }

  /**
   * Suppression complète du compte d'un agent.
   * Rien n'est perdu pour l'agence : clients, biens, leads, visites, transactions
   * et saisies de caisse sont transférés à un autre agent (par défaut celui qui supprime),
   * puis le profil agent et le compte utilisateur sont supprimés.
   */
  async remove(id: string, actor: Actor, transferToId?: string) {
    const agent = await this.findOne(id);
    this.assertCanManage(agent.user.role, actor);

    if (agent.user.id === actor.userId) {
      throw new BadRequestException(
        "Vous ne pouvez pas supprimer votre propre compte",
      );
    }

    const heir = transferToId
      ? await this.prisma.agent.findUnique({
          where: { id: transferToId },
          select: { id: true, userId: true, user: { select: { isActive: true, firstName: true, lastName: true } } },
        })
      : await this.prisma.agent.findUnique({
          where: { userId: actor.userId },
          select: { id: true, userId: true, user: { select: { isActive: true, firstName: true, lastName: true } } },
        });
    if (!heir) throw new BadRequestException("Choisissez l'agent qui reprend le portefeuille");
    if (heir.id === id) throw new BadRequestException("Le portefeuille doit être transféré à un autre agent");
    if (!heir.user.isActive) throw new BadRequestException("L'agent qui reprend le portefeuille est désactivé");

    const to = heir.id;
    const moved = await this.prisma.$transaction(async (tx) => {
      const counts = {
        clients: (await tx.client.updateMany({ where: { agentId: id }, data: { agentId: to } })).count,
        properties: (await tx.property.updateMany({ where: { agentId: id }, data: { agentId: to } })).count,
        leads: (await tx.lead.updateMany({ where: { agentId: id }, data: { agentId: to } })).count,
        visits:
          (await tx.visit.updateMany({ where: { fieldAgentId: id }, data: { fieldAgentId: to } })).count +
          (await tx.visit.updateMany({ where: { officeAgentId: id }, data: { officeAgentId: to } })).count,
        transactions:
          (await tx.transaction.updateMany({ where: { fieldAgentId: id }, data: { fieldAgentId: to } })).count +
          (await tx.transaction.updateMany({ where: { officeAgentId: id }, data: { officeAgentId: to } })).count,
        cashEntries: (await tx.cashEntry.updateMany({ where: { createdById: agent.user.id }, data: { createdById: heir.userId } })).count,
      };
      await tx.client.updateMany({ where: { fieldAgentId: id }, data: { fieldAgentId: to } });
      // Notifications de l'agent : supprimées avec lui (cascade) ; historique d'interactions conservé sans auteur
      await tx.agent.delete({ where: { id } });
      await tx.user.delete({ where: { id: agent.user.id } });
      return counts;
    });

    return {
      message: `Compte de ${agent.user.firstName} ${agent.user.lastName} supprimé`,
      transferredTo: { id: heir.id, name: `${heir.user.firstName} ${heir.user.lastName}` },
      moved,
    };
  }
}