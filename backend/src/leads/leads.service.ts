import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadFilterDto } from "./dto/lead-filter.dto";
import { Role } from "../common/enums/role.enum";
import { LeadSource } from "@prisma/client";

const LEAD_INCLUDE = {
  client:   { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  properties: { include: { property: { select: { id: true, title: true, city: true, price: true, status: true } } } },
  agent:    { include: { user: { select: { firstName: true, lastName: true } } } },
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found");
    return agent.id;
  }

  async findAll(filter: LeadFilterDto, user: any) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (user.role === Role.AGENT) where.agentId = await this.getAgentId(user.id);
    else if (filter.agentId) where.agentId = filter.agentId;
    if (filter.status)   where.status = filter.status;
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.propertyId) {
      where.properties = { some: { propertyId: filter.propertyId } };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({ where, include: LEAD_INCLUDE, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    if (user.role === Role.AGENT && lead.agent.userId !== user.id)
      throw new ForbiddenException("Access denied");
    return lead;
  }

  async create(dto: CreateLeadDto, user: any) {
    const agentId = (user.role === Role.AGENT)
      ? await this.getAgentId(user.id)
      : dto.agentId ?? await this.getAgentId(user.id);

    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true, firstName: true, lastName: true, agentId: true, agent: { select: { userId: true } } },
    });
    if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
    if (user.role === Role.AGENT && client?.agent?.userId !== user.id) {
      throw new ForbiddenException("You can only create leads for your own clients");
    }

    // Collect property IDs (backward-compatible: propertyId OR propertyIds)
    const propertyIds: string[] = [];
    if (dto.propertyId) propertyIds.push(dto.propertyId);
    if (dto.propertyIds && dto.propertyIds.length > 0) {
      for (const pid of dto.propertyIds) {
        if (!propertyIds.includes(pid)) propertyIds.push(pid);
      }
    }

    // Validate each property exists
    for (const pid of propertyIds) {
      const property = await this.prisma.property.findUnique({
        where: { id: pid },
        select: { id: true, title: true, city: true },
      });
      if (!property) throw new NotFoundException(`Property ${pid} not found`);
    }

    const lead = await this.prisma.lead.create({
      data: {
        clientId: dto.clientId,
        agentId,
        status: dto.status ?? "NEW",
        source: dto.source ?? LeadSource.OTHER,
        notes: dto.notes,
        budget: dto.budget,
        properties: {
          create: propertyIds.map((pid) => ({ propertyId: pid })),
        },
      },
      include: LEAD_INCLUDE,
    });

    const clientName = `${client.firstName} ${client.lastName}`;
    const propertyLabel = lead.properties.length > 0
      ? lead.properties.map((p) => p.property.title).join(", ")
      : "bien non spécifié";

    await this.notifications.create({
      agentId,
      actorUserId: user.id,
      clientId: client.id,
      title: "Nouveau lead",
      body: `Nouveau Lead de ${clientName} — opportunité sur ${propertyLabel} (source: ${lead.source}).`,
      link: `/crm/leads/${lead.id}`,
    });

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, user: any) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { agent: { select: { userId: true } }, client: { select: { firstName: true, lastName: true } } },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    if (user.role === Role.AGENT && lead.agent.userId !== user.id)
      throw new ForbiddenException("You can only update your own leads");

    const oldStatus = lead.status;
    const { status, source, notes, budget } = dto;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        ...(budget !== undefined && { budget }),
      },
      include: LEAD_INCLUDE,
    });

    if (status === "WON" && oldStatus !== "WON") {
      await this.notifications.create({
        agentId: lead.agentId,
        actorUserId: user.id,
        clientId: lead.clientId,
        title: "Lead gagné !",
        body: `Le lead de ${lead.client?.firstName ?? ''} a été marqué comme GAGNÉ.`,
        link: `/crm/leads/${lead.id}`,
      });
    }

    return updated;
  }

  async remove(id: string, user: any) {
    if (user.role === Role.AGENT) throw new ForbiddenException("Agents cannot delete leads");
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    await this.prisma.lead.delete({ where: { id } });
    return { message: `Lead ${id} deleted` };
  }
}
