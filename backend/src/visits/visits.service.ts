import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateVisitDto } from "./dto/create-visit.dto";
import { UpdateVisitDto } from "./dto/update-visit.dto";
import { VisitFilterDto } from "./dto/visit-filter.dto";
import { Role } from "../common/enums/role.enum";
import { agencyDayRange, agencyMonthStart, agencyToday } from "../common/utils/agency-day";

const VISIT_INCLUDE = {
  // FIX: email ajouté (la page détail affiche visit.client.email)
  client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  properties: { include: { property: { select: { id: true, title: true, address: true, city: true } } } },
  fieldAgent: { include: { user: { select: { firstName: true, lastName: true } } } },
  officeAgent: { include: { user: { select: { firstName: true, lastName: true } } } },
};

/** Date et heure d'une visite à l'heure de Tunis (le serveur peut tourner en UTC). */
const visitDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Tunis", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(d);

/** Visites annulées ou client absent : ne comptent pas dans la numérotation visite / revisite. */
const NOT_COUNTED: ("CANCELLED" | "NO_SHOW")[] = ["CANCELLED", "NO_SHOW"];

@Injectable()
export class VisitsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found");
    return agent.id;
  }

  // FIX: un agent est propriétaire s'il est agent terrain OU agent bureau
  private isOwner(visit: any, userId: string): boolean {
    return visit.fieldAgent?.userId === userId || visit.officeAgent?.userId === userId;
  }

  async findAll(filter: VisitFilterDto, user: any) {
    const page = filter.page ?? 1;
    // Agenda (période bornée) : jusqu'à 500 visites d'un coup ; liste paginée : 100 max
    const maxLimit = filter.dateFrom && filter.dateTo ? 500 : 100;
    const limit = Math.min(filter.limit ?? 20, maxLimit);
    const skip = (page - 1) * limit;
    const where = await this.scopeWhere(user);

    if (user.role !== Role.AGENT) {
      if (filter.fieldAgentId) where.fieldAgentId = filter.fieldAgentId;
      // FIX: le filtre "Agent bureau" n'était jamais appliqué
      if (filter.officeAgentId) where.officeAgentId = filter.officeAgentId;
    }

    if (filter.status) where.status = filter.status;
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.propertyId) where.properties = { some: { propertyId: filter.propertyId } };
    if (filter.dateFrom || filter.dateTo) {
      where.scheduledAt = {};
      if (filter.dateFrom) where.scheduledAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.scheduledAt.lte = new Date(filter.dateTo);
    }
    if (filter.search?.trim()) {
      const q = { contains: filter.search.trim(), mode: "insensitive" as const };
      // AND : ne pas écraser le OR de périmètre de l'agent
      where.AND = [{
        OR: [
          { client: { firstName: q } },
          { client: { lastName: q } },
          { client: { phone: q } },
          { properties: { some: { property: { title: q } } } },
          { properties: { some: { property: { city: q } } } },
        ],
      }];
    }

    const sortOrder = filter.sortOrder === "desc" ? "desc" : "asc";
    const [total, data] = await this.prisma.$transaction([
      this.prisma.visit.count({ where }),
      this.prisma.visit.findMany({ where, include: VISIT_INCLUDE, orderBy: { scheduledAt: sortOrder }, skip, take: limit }),
    ]);
    return { data: await this.withVisitNumbers(data), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Compteurs sur toutes les visites visibles (pas seulement la page affichée). */
  async stats(user: any) {
    const scope = await this.scopeWhere(user);
    const now = new Date();
    const { start: startOfDay, end: endOfDay } = agencyDayRange(agencyToday(now));
    const startOfMonth = agencyMonthStart(now);
    const open = { in: ["SCHEDULED", "CONFIRMED"] as any };

    const [total, today, upcoming, overdue, completed, thisMonth] = await this.prisma.$transaction([
      this.prisma.visit.count({ where: scope }),
      this.prisma.visit.count({ where: { ...scope, scheduledAt: { gte: startOfDay, lt: endOfDay } } }),
      this.prisma.visit.count({ where: { ...scope, status: open, scheduledAt: { gte: now } } }),
      // Date passée mais statut jamais mis à jour
      this.prisma.visit.count({ where: { ...scope, status: open, scheduledAt: { lt: now } } }),
      this.prisma.visit.count({ where: { ...scope, status: "COMPLETED" } }),
      this.prisma.visit.count({ where: { ...scope, scheduledAt: { gte: startOfMonth } } }),
    ]);
    return { total, today, upcoming, overdue, completed, thisMonth };
  }

  /** Périmètre : un agent ne voit que ses visites (terrain ou bureau). */
  private async scopeWhere(user: any): Promise<any> {
    if (user.role !== Role.AGENT) return {};
    const agentId = await this.getAgentId(user.id);
    return { OR: [{ fieldAgentId: agentId }, { officeAgentId: agentId }] };
  }

  async findOne(id: string, user: any) {
    const visit = await this.prisma.visit.findUnique({ where: { id }, include: VISIT_INCLUDE });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    if (user.role === Role.AGENT && !this.isOwner(visit, user.id))
      throw new NotFoundException(`Visit ${id} not found`);
    const [numbered] = await this.withVisitNumbers([visit]);
    return numbered;
  }

  /**
   * 1re visite d'un client = « visite », les suivantes = « revisites ».
   * visitNumber : rang de la visite chez ce client (toutes agences/agents confondus) ;
   * clientVisitCount : nombre total de visites du client. Annulées et absences exclues.
   */
  private async withVisitNumbers<T extends { id: string; clientId: string }>(visits: T[]) {
    const clientIds = [...new Set(visits.map((v) => v.clientId))];
    const all = clientIds.length
      ? await this.prisma.visit.findMany({
          where: { clientId: { in: clientIds }, status: { notIn: NOT_COUNTED } },
          select: { id: true, clientId: true },
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
        })
      : [];
    const rank = new Map<string, number>();
    const count = new Map<string, number>();
    for (const v of all) {
      const n = (count.get(v.clientId) ?? 0) + 1;
      count.set(v.clientId, n);
      rank.set(v.id, n);
    }
    return visits.map((v) => ({
      ...v,
      visitNumber: rank.get(v.id) ?? null,
      clientVisitCount: count.get(v.clientId) ?? 0,
    }));
  }

  /** Nombre de visites d'un client : sert au formulaire pour annoncer « visite » ou « revisite n° X ». */
  async clientVisitCount(clientId: string) {
    const count = await this.prisma.visit.count({ where: { clientId, status: { notIn: NOT_COUNTED } } });
    return { clientId, count, nextNumber: count + 1 };
  }

  async create(dto: CreateVisitDto, user: any) {
    const connectedAgentId = await this.getAgentId(user.id);

    const fieldAgentId = dto.fieldAgentId ?? connectedAgentId;
    const officeAgentId =
      user.role === Role.AGENT
        ? connectedAgentId
        : dto.officeAgentId ?? connectedAgentId;

    const propertyIds = Array.from(
      new Set([...(dto.propertyId ? [dto.propertyId] : []), ...(dto.propertyIds ?? [])]),
    );

    await this.assertPropertiesExist(propertyIds);

    const status = dto.status ?? "SCHEDULED";

    const visit = await this.prisma.$transaction(async (tx) => {
      const created = await tx.visit.create({
        data: {
          clientId: dto.clientId,
          fieldAgentId,
          officeAgentId,
          visitType: dto.visitType ?? "IN_PERSON",
          scheduledAt: new Date(dto.scheduledAt),
          status,
          completedAt: status === "COMPLETED" ? new Date() : undefined,
          duration: dto.duration,
          feedback: dto.feedback,
          properties: { create: propertyIds.map((pid) => ({ propertyId: pid })) },
        },
        include: VISIT_INCLUDE,
      });
      // Visite enregistrée directement comme terminée : même règle qu'à la modification
      if (status === "COMPLETED") await this.promoteProspect(tx, created.clientId);
      return created;
    });

    const clientName = `${visit.client.firstName} ${visit.client.lastName}`;
    const propTitles = visit.properties.map((p) => p.property.title);
    const propLabel = propTitles.length > 0 ? propTitles.join(", ") : "aucun bien";
    await this.notifications.create({
      agentIds: [fieldAgentId, officeAgentId],
      actorUserId: user.id,
      clientId: visit.clientId,
      title: "Nouvelle visite programmée",
      body: `Visite de ${clientName} pour "${propLabel}" le ${visitDate(visit.scheduledAt)}`,
      link: `/crm/visits/${visit.id}`,
    });

    return visit;
  }

  async update(id: string, dto: UpdateVisitDto, user: any) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        fieldAgent: { select: { userId: true, id: true } },
        officeAgent: { select: { userId: true, id: true } }, // FIX: nécessaire pour isOwner
        client: { select: { firstName: true, lastName: true } },
      },
    });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);

    if (user.role === Role.AGENT) {
      if (!this.isOwner(visit, user.id)) throw new NotFoundException(`Visit ${id} not found`);

      const connectedAgentId = await this.getAgentId(user.id);
      // L'agent de bureau est forcé à l'agent connecté (non modifiable par un agent)
      if (
        dto.officeAgentId !== undefined &&
        dto.officeAgentId !== null &&
        dto.officeAgentId !== "" &&
        dto.officeAgentId !== connectedAgentId &&
        dto.officeAgentId !== (visit.officeAgent?.id ?? "")
      )
        throw new ForbiddenException("L'agent bureau est fixé à votre compte");
      // Empêcher un agent de déconnecter l'agent bureau
      if (dto.officeAgentId === "" || dto.officeAgentId === null)
        throw new ForbiddenException("L'agent bureau est fixé à votre compte");
    }

    const oldStatus = visit.status;
    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.completedAt) data.completedAt = new Date(dto.completedAt);
    if (dto.status === "COMPLETED" && !data.completedAt) data.completedAt = new Date();

    if (dto.clientId !== undefined) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
      data.client = { connect: { id: dto.clientId } };
    }

    if (dto.fieldAgentId !== undefined) {
      const agent = await this.prisma.agent.findUnique({ where: { id: dto.fieldAgentId } });
      if (!agent) throw new NotFoundException(`Agent ${dto.fieldAgentId} not found`);
      data.fieldAgent = { connect: { id: dto.fieldAgentId } };
    }

    if (dto.officeAgentId !== undefined) {
      if (dto.officeAgentId) {
        const agent = await this.prisma.agent.findUnique({ where: { id: dto.officeAgentId } });
        if (!agent) throw new NotFoundException(`Agent ${dto.officeAgentId} not found`);
        data.officeAgent = { connect: { id: dto.officeAgentId } };
      } else {
        data.officeAgent = { disconnect: true };
      }
    }

    if (dto.visitType !== undefined) {
      data.visitType = dto.visitType;
    }

    if (dto.propertyIds !== undefined) await this.assertPropertiesExist(dto.propertyIds);

    delete data.clientId;
    delete data.fieldAgentId;
    delete data.officeAgentId;
    delete data.visitType;
    delete data.propertyIds;

    // FIX: transaction atomique + biens mis à jour AVANT la relecture,
    // donc la réponse contient les données à jour (plus besoin d'actualiser)
    const justCompleted = dto.status === "COMPLETED" && oldStatus !== "COMPLETED";
    // Une visite déjà terminée rattachée à un autre client compte aussi pour ce client
    const clientChanged = dto.clientId !== undefined && dto.clientId !== visit.clientId;
    const completedAfterUpdate = (dto.status ?? oldStatus) === "COMPLETED";
    const shouldPromote = justCompleted || (clientChanged && completedAfterUpdate);

    const { updatedVisit, promoted } = await this.prisma.$transaction(async (tx) => {
      if (dto.propertyIds !== undefined) {
        const unique = Array.from(new Set(dto.propertyIds));
        await tx.visitProperty.deleteMany({ where: { visitId: id } });
        if (unique.length > 0) {
          await tx.visitProperty.createMany({
            data: unique.map((pid) => ({ visitId: id, propertyId: pid })),
          });
        }
      }
      const updated = await tx.visit.update({ where: { id }, data, include: VISIT_INCLUDE });
      // Le client de la visite (éventuellement changé dans cette même requête)
      const wasPromoted = shouldPromote && (await this.promoteProspect(tx, updated.clientId));
      return { updatedVisit: updated, promoted: wasPromoted };
    });

    const clientName = `${updatedVisit.client.firstName} ${updatedVisit.client.lastName}`;
    const team = [updatedVisit.fieldAgentId, updatedVisit.officeAgentId];
    const common = { actorUserId: user.id, clientId: updatedVisit.clientId, link: `/crm/visits/${visit.id}` };
    const isOpen = updatedVisit.status === "SCHEDULED" || updatedVisit.status === "CONFIRMED";

    if (justCompleted || promoted) {
      await this.notifications.create({
        ...common,
        agentIds: team,
        title: "Visite terminée",
        body: promoted
          ? `La visite de ${clientName} a été marquée comme terminée. Le client est maintenant confirmé.`
          : `La visite de ${clientName} a été marquée comme terminée.`,
      });
    } else if (dto.status === "CANCELLED" && oldStatus !== "CANCELLED") {
      await this.notifications.create({
        ...common,
        agentIds: team,
        title: "Visite annulée",
        body: `La visite de ${clientName} du ${visitDate(updatedVisit.scheduledAt)} a été annulée.`,
      });
    } else if (isOpen && data.scheduledAt && data.scheduledAt.getTime() !== visit.scheduledAt.getTime()) {
      await this.notifications.create({
        ...common,
        agentIds: team,
        title: "Visite reprogrammée",
        body: `La visite de ${clientName} est déplacée au ${visitDate(updatedVisit.scheduledAt)}.`,
      });
    }

    // Nouvel agent terrain : il doit savoir qu'il a une visite à faire
    if (isOpen && updatedVisit.fieldAgentId !== visit.fieldAgentId) {
      await this.notifications.create({
        ...common,
        agentId: updatedVisit.fieldAgentId,
        title: "Visite assignée",
        body: `Vous accompagnez ${clientName} le ${visitDate(updatedVisit.scheduledAt)}.`,
      });
    }

    return updatedVisit;
  }

  async remove(id: string, user: any) {
    if (user.role === Role.AGENT) throw new NotFoundException(`Visit ${id} not found`);
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    await this.prisma.visit.delete({ where: { id } });
    return { message: `Visit ${id} deleted` };
  }

  private async assertPropertiesExist(ids: string[]) {
    if (ids.length === 0) return;
    const found = await this.prisma.property.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((p) => p.id));
    const missing = ids.find((pid) => !foundIds.has(pid));
    if (missing) throw new NotFoundException(`Property ${missing} not found`);
  }

  /** Visite terminée : un prospect devient client confirmé. Renvoie true s'il a été promu. */
  private async promoteProspect(
    db: Pick<Prisma.TransactionClient, "client">,
    clientId: string,
  ): Promise<boolean> {
    const { count } = await db.client.updateMany({
      where: { id: clientId, status: "PROSPECT" },
      data: { status: "CLIENT" },
    });
    return count > 0;
  }
}
