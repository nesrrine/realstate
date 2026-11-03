import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientFilterDto } from "./dto/client-filter.dto";
import { Role } from "../common/enums/role.enum";
import { InteractionType, FollowUpStatus } from "@prisma/client";

const CLIENT_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phone: true,
  whatsapp: true, address: true, city: true, zipCode: true,
  cinOrPassport: true, professionalAddress: true,
  budgetMin: true, budgetMax: true, preferredZones: true,
  preferredPropertyTypes: true, minSurface: true, bedrooms: true,
  transactionType: true, financing: true, needDescription: true, fieldAgentId: true,
  clientType: true, status: true,
  followUpStatus: true, lastInteractionAt: true, nextFollowUpAt: true,
  notes: true, isActive: true,
  agentId: true,
  createdAt: true, updatedAt: true,
  agent: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } },
  fieldAgent: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
};

// Chaîne vide / espaces -> null (évite les conflits d'unicité sur "")
const emptyToNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

// Champs texte optionnels du modèle Client
const OPTIONAL_STRINGS = ["email", "whatsapp", "address", "city", "zipCode", "professionalAddress", "notes", "needDescription", "financing", "fieldAgentId"];

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
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Build WHERE clause based on user role and filters.
   * - AGENT: forced agentId = user.agentId, ignore any agentId in filter.
   * - MANAGER/ADMIN: apply filters, plus optional agentId filter.
   */
  private buildWhere(filter: ClientFilterDto, user: any) {
    const where: any = {};

   if (user.role === Role.AGENT) {
  if (!user.agentId) {
    throw new ForbiddenException("Aucun profil agent associé à ce compte");
  }
  where.agentId = user.agentId;
} else if (filter.agentId) {
  where.agentId = filter.agentId;
}

    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.city) where.city = { contains: filter.city, mode: "insensitive" };
    if (filter.transactionType) where.transactionType = filter.transactionType;
    if (filter.clientType) where.clientType = filter.clientType;
    if (filter.status) where.status = filter.status;
    if (filter.followUpStatus) where.followUpStatus = filter.followUpStatus;
    if (filter.nextFollowUpAt) where.nextFollowUpAt = { lte: filter.nextFollowUpAt };

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: "insensitive" } },
        { lastName:  { contains: filter.search, mode: "insensitive" } },
        { email:     { contains: filter.search, mode: "insensitive" } },
        { phone:     { contains: filter.search, mode: "insensitive" } },
        { city:      { contains: filter.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  // ── FIND ALL ────────────────────────────────────────────────────
  async findAll(filter: ClientFilterDto, user: any) {
    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip  = (page - 1) * limit;

    const where = this.buildWhere(filter, user);

    const allowed = ["createdAt", "lastName", "firstName", "updatedAt"];
    const sortBy    = allowed.includes(filter.sortBy) ? filter.sortBy : "createdAt";
    const sortOrder = filter.sortOrder === "asc" ? "asc" : "desc";

    const [total, data] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where, select: CLIENT_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip, take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ── FIND ONE ────────────────────────────────────────────────────
  async findOne(id: string, user: any) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: {
        ...CLIENT_SELECT,
        leads: {
          orderBy: { createdAt: "desc" }, take: 10,
          select: {
            id: true, status: true, source: true, createdAt: true,
            properties: { select: { property: { select: { id: true, title: true, city: true, price: true } } } },
          },
        },
        visits: {
          orderBy: { scheduledAt: "desc" }, take: 10,
          select: {
            id: true, status: true, scheduledAt: true, rating: true,
            properties: { select: { property: { select: { id: true, title: true, city: true } } } },
          },
        },
      },
    });

    if (!client) throw new NotFoundException(`Client ${id} not found`);

    if (user.role === Role.AGENT && client.agentId !== user.agentId) {
      // Not found to avoid leaking existence
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
  }

  // ── CREATE ──────────────────────────────────────────────────────
  async create(dto: CreateClientDto, user: any) {
    let agentId: string;
    if (user.role === Role.AGENT) {
      agentId = user.agentId;
    } else {
      if (!dto.agentId) {
        throw new ConflictException("agentId is required for MANAGER/ADMIN");
      }
      const exists = await this.prisma.agent.findUnique({ where: { id: dto.agentId } });
      if (!exists) throw new NotFoundException(`Agent ${dto.agentId} not found`);
      agentId = dto.agentId;
    }

    const email = emptyToNull(dto.email);
    // Ne pas bloquer sur l'email d'un autre agent (partage autorisé).
    // L'unicité DB gère le conflit via P2002 si email vraiment déjà pris.

    // Les dates vides ("") ou nulles -> undefined pour éviter l'erreur Prisma
    // "Invalid datetime received" (500 non géré).
    const lastInteractionAt = dto.lastInteractionAt ? new Date(dto.lastInteractionAt) : undefined;
    const nextFollowUpAt = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined;

    // Doublon de téléphone (même agent uniquement), quel que soit le format saisi
    const phoneExists = (await this.findIdsByPhone(dto.phone, agentId)).length > 0;
    if (phoneExists) throw new ConflictException(`Un contact avec le téléphone ${dto.phone} existe déjà`);

    try {
      const client = await this.prisma.client.create({
        data: {
          firstName: dto.firstName, lastName: dto.lastName,
          phone: dto.phone,
          whatsapp: emptyToNull(dto.whatsapp),
          email,
          address: emptyToNull(dto.address),
          city: emptyToNull(dto.city),
          zipCode: emptyToNull(dto.zipCode),
          cinOrPassport: dto.cinOrPassport,
          professionalAddress: emptyToNull(dto.professionalAddress),
          budgetMin: dto.budgetMin, budgetMax: dto.budgetMax,
          preferredZones: dto.preferredZones ?? [],
          preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
          minSurface: dto.minSurface, bedrooms: dto.bedrooms,
          transactionType: dto.transactionType,
          financing: emptyToNull(dto.financing),
          needDescription: emptyToNull(dto.needDescription),
          fieldAgentId: await this.validFieldAgent(dto.fieldAgentId),
          clientType: dto.clientType,
          status: dto.status ?? "PROSPECT",
          followUpStatus: dto.followUpStatus ?? "TO_CONTACT",
          lastInteractionAt,
          nextFollowUpAt,
          notes: emptyToNull(dto.notes),
          agentId,
        },
        select: CLIENT_SELECT,
      });

      await this.notifications.create({
        agentId: client.agentId,
        actorUserId: user.id,
        clientId: client.id,
        title: "Nouveau client assigné",
        body: `${client.firstName} ${client.lastName} vous a été assigné(e).`,
        link: `/crm/clients/${client.id}`,
      });

      return client;
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  async update(id: string, dto: UpdateClientDto, user: any) {
    const client = await this.prisma.client.findUnique({
      where: { id }, select: { agent: { select: { userId: true, id: true } } },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    if (user.role === Role.AGENT && client.agent.userId !== user.id)
      throw new ForbiddenException("You can only update your own clients");

    const { agentId, ...rest } = dto as any;
    const data: any = { ...rest };

    // '' -> null pour les champs texte optionnels
    for (const key of OPTIONAL_STRINGS) {
      if (typeof data[key] === "string") data[key] = emptyToNull(data[key]);
    }

    // Les dates vides ("") ou nulles -> undefined pour éviter l'erreur Prisma
    // "Invalid datetime received" (500 non géré).
    if (data.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined;
    }
    if (data.lastInteractionAt !== undefined) {
      data.lastInteractionAt = data.lastInteractionAt ? new Date(data.lastInteractionAt) : undefined;
    }

    if (data.fieldAgentId) data.fieldAgentId = await this.validFieldAgent(data.fieldAgentId);

    if (agentId !== undefined) {
      if (user.role === Role.AGENT) {
        if (agentId && agentId !== user.agentId) {
          throw new ForbiddenException("You cannot change the agent of a client");
        }
      } else if (agentId) {
        const exists = await this.prisma.agent.findUnique({ where: { id: agentId } });
        if (!exists) throw new NotFoundException(`Agent ${agentId} not found`);
        data.agentId = agentId;
      }
    }

    try {
      return await this.prisma.client.update({ where: { id }, data, select: CLIENT_SELECT });
    } catch (e) {
      return handlePrismaError(e);
    }
  }

  /**
   * Convert a Contact from PROSPECT to CLIENT status.
   * Retains all Leads, Visits, and history. Does NOT create a new Client.
   */
  async convertToClient(id: string, user: any) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, status: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    if (user.role === Role.AGENT && client.agent.userId !== user.id)
      throw new NotFoundException(`Client ${id} not found`);

    if (client.status === "CLIENT") {
      return this.prisma.client.findUnique({ where: { id }, select: CLIENT_SELECT });
    }

    await this.prisma.client.update({
      where: { id },
      data: { status: "CLIENT" },
    });

    await this.notifications.create({
      agentId: client.agentId,
      actorUserId: user.id,
      clientId: client.id,
      title: "Prospect converti en client",
      body: `${client.firstName} ${client.lastName} est maintenant un client confirmé.`,
      link: `/crm/clients/${client.id}`,
    });

    return this.prisma.client.findUnique({ where: { id }, select: CLIENT_SELECT });
  }

  // ── REMOVE (soft delete) ────────────────────────────────────────
  async remove(id: string, user: any) {
    if (user.role === Role.AGENT)
      throw new ForbiddenException("Agents cannot delete clients");

    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);

    await this.prisma.client.update({ where: { id }, data: { isActive: false } });
    return { message: `Client ${id} deactivated successfully` };
  }

  // ── REASSIGN to another agent ────────────────────────────────────
  async reassign(id: string, agentId: string, user: any) {
    if (user.role === Role.AGENT)
      throw new ForbiddenException("Agents cannot reassign clients");

    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    const targetAgent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!targetAgent) throw new NotFoundException(`Agent ${agentId} not found`);

    const updated = await this.prisma.client.update({ where: { id }, data: { agentId }, select: CLIENT_SELECT });

    if (client.agentId !== agentId) {
      await this.notifications.create({
        agentId,
        actorUserId: user.id,
        clientId: client.id,
        title: "Client réassigné",
        body: `${client.firstName} ${client.lastName} a été assigné(e) à votre dossier.`,
        link: `/crm/clients/${client.id}`,
      });
      // L'ancien agent est prévenu que le dossier ne le concerne plus
      await this.notifications.create({
        agentId: client.agentId,
        actorUserId: user.id,
        title: "Client retiré de votre dossier",
        body: `${client.firstName} ${client.lastName} a été confié(e) à un autre agent.`,
      });
    }

    return updated;
  }

  // ── DÉTECTION DE DOUBLONS ───────────────────────────────────────
  /**
   * Recherche des clients similaires (email identique insensible à la casse,
   * ou téléphone normalisé identique) chez tous les agents.
   * Ne bloque pas : retourne la liste pour avertir l'utilisateur.
   */
  async detectDuplicates(dto: CreateClientDto, user: any) {
    const email = emptyToNull(dto.email);
    const phoneIds = await this.findIdsByPhone(dto.phone);

    const where: any = { OR: [] };
    if (email) where.OR.push({ email: { equals: email, mode: "insensitive" } });
    if (phoneIds.length) where.OR.push({ id: { in: phoneIds } });
    if (where.OR.length === 0) return { hasDuplicate: false, duplicates: [], message: "" };

    const candidates = await this.prisma.client.findMany({
      where,
      select: {
        ...CLIENT_SELECT,
        agent: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      take: 20,
    });

    const normalizedInput = this.normalizePhone(dto.phone);
    const duplicates = candidates.filter((c) => {
      const sameEmail = email && c.email?.toLowerCase() === email.toLowerCase();
      const samePhone = !!normalizedInput && this.normalizePhone(c.phone) === normalizedInput;
      return sameEmail || samePhone;
    });

    return {
      hasDuplicate: duplicates.length > 0,
      duplicates,
      message: duplicates.length > 0
        ? "Des fiches similaires existent déjà"
        : "",
    };
  }

  // ── FUSION DE DOUBLONS ──────────────────────────────────────────
  /**
   * Fusionne le client `sourceId` dans le client `targetId`.
   * Transfère visites, leads, transactions et notifications vers la cible,
   * puis désactive la source (soft delete).
   * Réservé à ADMIN/MANAGER.
   */
  async merge(sourceId: string, targetId: string, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Seuls ADMIN et MANAGER peuvent fusionner des fiches");
    }

    if (sourceId === targetId) {
      throw new ConflictException("Impossible de fusionner une fiche avec elle-même");
    }

    const source = await this.prisma.client.findUnique({ where: { id: sourceId } });
    const target = await this.prisma.client.findUnique({ where: { id: targetId } });
    if (!source) throw new NotFoundException(`Client source ${sourceId} introuvable`);
    if (!target) throw new NotFoundException(`Client cible ${targetId} introuvable`);

    await this.prisma.$transaction([
      this.prisma.visit.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }),
      this.prisma.lead.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }),
      this.prisma.transaction.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }),
      this.prisma.notification.updateMany({ where: { clientId: sourceId }, data: { clientId: targetId } }),
      this.prisma.client.update({ where: { id: sourceId }, data: { isActive: false } }),
    ]);

    await this.notifications.create({
      agentIds: [target.agentId, source.agentId],
      actorUserId: user.id,
      clientId: target.id,
      title: "Fiche client fusionnée",
      body: `${source.firstName} ${source.lastName} a été fusionné(e) dans ${target.firstName} ${target.lastName}.`,
      link: `/crm/clients/${target.id}`,
    });

    return this.prisma.client.findUnique({ where: { id: targetId }, select: CLIENT_SELECT });
  }

  // ── INTERACTIONS CLIENT ─────────────────────────────────────────
  /**
   * Ajoute une interaction (appel, message, visite, note, email) à l'historique d'un client.
   * Met à jour lastInteractionAt et nextFollowUpAt si fournis.
   */
  async createInteraction(clientId: string, data: {
    type: InteractionType;
    title: string;
    body?: string;
    occurredAt?: Date;
    agentId?: string;
    followUpStatus?: FollowUpStatus;
    nextFollowUpAt?: Date;
  }, user: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException(`Client ${clientId} not found`);

    if (user.role === Role.AGENT && client.agentId !== user.agentId)
      throw new NotFoundException(`Client ${clientId} not found`);

    const interaction = await this.prisma.clientInteraction.create({
      data: {
        clientId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        occurredAt: data.occurredAt ?? new Date(),
        agentId: data.agentId ?? (user.role === Role.AGENT ? user.agentId : undefined),
      },
    });

    // Mettre à jour le suivi commercial du client
    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        lastInteractionAt: data.occurredAt ?? new Date(),
        ...(data.followUpStatus ? { followUpStatus: data.followUpStatus } : {}),
        ...(data.nextFollowUpAt ? { nextFollowUpAt: data.nextFollowUpAt } : {}),
      },
    });

    return interaction;
  }

  // ── MISE À JOUR DU SUIVI ────────────────────────────────────────
  async updateFollowUp(clientId: string, data: {
    followUpStatus?: FollowUpStatus;
    nextFollowUpAt?: Date;
    lastInteractionAt?: Date;
  }, user: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException(`Client ${clientId} not found`);

    if (user.role === Role.AGENT && client.agentId !== user.agentId)
      throw new NotFoundException(`Client ${clientId} not found`);

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.followUpStatus ? { followUpStatus: data.followUpStatus } : {}),
        ...(data.nextFollowUpAt ? { nextFollowUpAt: data.nextFollowUpAt } : {}),
        ...(data.lastInteractionAt ? { lastInteractionAt: data.lastInteractionAt } : {}),
      },
      select: CLIENT_SELECT,
    });
  }

  /** Agent terrain : vide → null, sinon il doit exister (404 clair plutôt qu'une erreur de clé étrangère). */
  private async validFieldAgent(id?: string | null): Promise<string | null> {
    if (!id) return null;
    const agent = await this.prisma.agent.findUnique({ where: { id }, select: { id: true } });
    if (!agent) throw new NotFoundException(`Agent terrain ${id} introuvable`);
    return agent.id;
  }

  /**
   * Clé de comparaison d'un téléphone : les 8 derniers chiffres (numéro tunisien),
   * sans espaces, tirets ni indicatif (+216 / 00216).
   * « +216 98 962 581 », « 0021698962581 » et « 98962581 » donnent « 98962581 ».
   */
  private normalizePhone(phone?: string | null): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "").slice(-8);
  }

  /** Clients dont le téléphone normalisé est identique (recherche faite en base). */
  private async findIdsByPhone(phone?: string | null, agentId?: string): Promise<string[]> {
    const key = this.normalizePhone(phone);
    if (!key) return [];
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM clients
      WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${key}
      ${agentId ? Prisma.sql`AND "agentId" = ${agentId}` : Prisma.empty}
      LIMIT 20`;
    return rows.map((r) => r.id);
  }
}