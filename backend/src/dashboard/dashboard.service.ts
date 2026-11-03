import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardFilterDto } from "./dto/dashboard-filter.dto";
import { Role } from "../common/enums/role.enum";
import { agencyDayRange, agencyToday } from "../common/utils/agency-day";
import { Prisma, TransactionStatus } from "@prisma/client";

type DateRange = { gte?: Date; lte?: Date };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found");
    return agent.id;
  }

  private async resolveAgentFilter(
    filter: DashboardFilterDto,
    user: { id: string; role: Role },
  ): Promise<string | undefined> {
    if (user.role === Role.AGENT) return this.getAgentId(user.id);
    return filter.agentId;
  }

  private buildDateRange(filter: DashboardFilterDto): DateRange | undefined {
    if (!filter.startDate && !filter.endDate) return undefined;
    const range: DateRange = {};
    if (filter.startDate) range.gte = new Date(filter.startDate);
    if (filter.endDate) range.lte = new Date(filter.endDate);
    return range;
  }

  private transactionWhere(
    fieldAgentId: string | undefined,
    officeAgentId: string | undefined,
    dateRange: DateRange | undefined,
    type?: "SALE" | "RENTAL",
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {
      ...(type && { type }),
      ...(dateRange && { createdAt: dateRange }),
      status: { not: TransactionStatus.CANCELLED },
    };
    if (fieldAgentId || officeAgentId) {
      where.OR = [];
      if (fieldAgentId) where.OR.push({ fieldAgentId });
      if (officeAgentId) where.OR.push({ officeAgentId });
    }
    return where;
  }

  private commissionWhere(
    fieldAgentId: string | undefined,
    officeAgentId: string | undefined,
    dateRange: DateRange | undefined,
  ): Prisma.CommissionWhereInput {
    const transaction: Prisma.TransactionWhereInput = {};
    if (fieldAgentId) transaction.fieldAgentId = fieldAgentId;
    if (officeAgentId) transaction.officeAgentId = officeAgentId;
    if (dateRange) transaction.createdAt = dateRange;
    return Object.keys(transaction).length ? { transaction } : {};
  }

  /**
   * GET /api/dashboard/summary
   */
  async getSummary(filter: DashboardFilterDto, user: any) {
    const agentId = await this.resolveAgentFilter(filter, user);
    const dateRange = this.buildDateRange(filter);

    // « Visites du jour » à l'heure de Tunis, quel que soit le fuseau du serveur
    const { start: today, end: tomorrow } = agencyDayRange(agencyToday());
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const txWhere = this.transactionWhere(agentId, agentId, dateRange);
    const commissionWhere = this.commissionWhere(agentId, agentId, dateRange);

    const leadWhere: Prisma.LeadWhereInput = {
      createdAt: { gte: weekAgo },
      ...(agentId && { agentId }),
    };

    const [
      availableProperties,
      totalClients,
      newLeads,
      todayVisits,
      upcomingVisits,
      sales,
      rentals,
      revenue,
      commissionsAgg,
      agentPerformance,
      recentLeads,
    ] = await Promise.all([
      this.prisma.property.count({
        where: {
          status: { in: ["AVAILABLE", "RESERVED"] },
          ...(agentId && { agentId }),
        },
      }),
      this.prisma.client.count({
        where: { isActive: true, ...(agentId && { agentId }) },
      }),
      this.prisma.lead.count({
        where: {
          createdAt: { gte: weekAgo },
          ...(agentId && { agentId }),
        },
      }),
      this.prisma.visit.count({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          ...(agentId && { fieldAgentId: agentId }),
        },
      }),
      this.prisma.visit.count({
        where: {
          scheduledAt: { gte: tomorrow, lt: weekAhead },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          ...(agentId && { fieldAgentId: agentId }),
        },
      }),
      this.prisma.transaction.count({
        where: this.transactionWhere(agentId, agentId, dateRange, "SALE"),
      }),
      this.prisma.transaction.count({
        where: this.transactionWhere(agentId, agentId, dateRange, "RENTAL"),
      }),
      this.prisma.transaction.aggregate({
        where: txWhere,
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: commissionWhere,
        _sum: { amount: true, agencyAmount: true, fieldAgentAmount: true, officeAgentAmount: true },
      }),
      this.fetchAgentPerformance(agentId, dateRange, user.role === Role.AGENT ? 1 : 5),
      this.prisma.lead.findMany({
        where: leadWhere,
        select: {
          id: true,
          status: true,
          source: true,
          budget: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true } },
          properties: { select: { property: { select: { title: true, city: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 7,
      }),
    ]);

    const revenueTotal = Number(revenue._sum.amount ?? 0);
    const commissionTotal = Number(commissionsAgg._sum.amount ?? 0);

    return {
      availableProperties,
      totalClients,
      newLeads,
      visitsToday: todayVisits,
      upcomingVisits,
      sales,
      rentals,
      revenue: Math.round(revenueTotal * 100) / 100,
      commissions: Math.round(commissionTotal * 100) / 100,
      commissionBreakdown: {
        agency: Math.round(Number(commissionsAgg._sum.agencyAmount ?? 0) * 100) / 100,
        fieldAgent: Math.round(Number(commissionsAgg._sum.fieldAgentAmount ?? 0) * 100) / 100,
        officeAgent: Math.round(Number(commissionsAgg._sum.officeAgentAmount ?? 0) * 100) / 100,
      },
      agentPerformance,
      properties: { available: availableProperties },
      clients: { total: totalClients },
      leads: { new: newLeads },
      visits: { today: todayVisits, upcoming: upcomingVisits },
      transactions: { sales, rentals, total: sales + rentals },
      revenueDetail: { total: Math.round(revenueTotal * 100) / 100 },
      commissionsDetail: { total: Math.round(commissionTotal * 100) / 100 },
      recentLeads: recentLeads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        source: lead.source,
        budget: Number(lead.budget ?? 0),
        createdAt: lead.createdAt.toISOString(),
        client: { firstName: lead.client.firstName, lastName: lead.client.lastName },
        properties: lead.properties.map((p) => ({
          property: {
            title: p.property.title,
            city: p.property.city,
          },
        })),
      })),
    };
  }

  /**
   * GET /api/dashboard/sales
   */
  async getSalesStats(filter: DashboardFilterDto, user: any) {
    const agentId = await this.resolveAgentFilter(filter, user);
    const dateRange = this.buildDateRange(filter);

    const agentSql = agentId
      ? Prisma.sql`AND (t."fieldAgentId" = ${agentId} OR t."officeAgentId" = ${agentId})`
      : Prisma.empty;
    const dateStart = dateRange?.gte
      ? Prisma.sql`AND t."createdAt" >= ${dateRange.gte}`
      : Prisma.empty;
    const dateEnd = dateRange?.lte
      ? Prisma.sql`AND t."createdAt" <= ${dateRange.lte}`
      : Prisma.empty;

    const propAgentSql = agentId ? Prisma.sql`AND p."agentId" = ${agentId}` : Prisma.empty;

    const [salesByMonth, propertiesByType, transactionsByPropertyType, priceDistribution] =
      await Promise.all([
        this.prisma.$queryRaw<
          Array<{ month: string; sales: bigint; rentals: bigint; revenue: number }>
        >`
          SELECT
            TO_CHAR(t."createdAt", 'YYYY-MM') AS month,
            COUNT(*) FILTER (WHERE t.type = 'SALE')::bigint AS sales,
            COUNT(*) FILTER (WHERE t.type = 'RENTAL')::bigint AS rentals,
            COALESCE(SUM(t.amount), 0)::numeric AS revenue
          FROM transactions t
          WHERE t.status <> 'CANCELLED'
            AND t."createdAt" >= NOW() - INTERVAL '12 months'
            ${agentSql}
            ${dateStart}
            ${dateEnd}
          GROUP BY 1
          ORDER BY month ASC
        `,
        this.prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
          SELECT p.type, COUNT(*)::bigint AS count
          FROM properties p
          WHERE 1=1
            ${propAgentSql}
          GROUP BY p.type
          ORDER BY count DESC
        `,
        this.prisma.$queryRaw<
          Array<{ type: string; count: bigint; total_amount: number }>
        >`
          SELECT
            p.type,
            COUNT(t.id)::bigint AS count,
            COALESCE(SUM(t.amount), 0)::numeric AS total_amount
          FROM transactions t
          INNER JOIN properties p ON t."propertyId" = p.id
          WHERE t.status <> 'CANCELLED'
            ${dateStart}
            ${dateEnd}
            ${agentSql}
          GROUP BY p.type
          ORDER BY count DESC
        `,
        this.prisma.$queryRaw<Array<{ range: string; count: bigint }>>`
          SELECT
            CASE
              WHEN t.amount < 100000 THEN '< 100K'
              WHEN t.amount < 250000 THEN '100K-250K'
              WHEN t.amount < 500000 THEN '250K-500K'
              WHEN t.amount < 1000000 THEN '500K-1M'
              ELSE '> 1M'
            END AS range,
            COUNT(*)::bigint AS count
          FROM transactions t
          WHERE t.status <> 'CANCELLED'
            ${dateStart}
            ${dateEnd}
            ${agentSql}
          GROUP BY 1
          ORDER BY MIN(t.amount)
        `,
      ]);

    const mapMonth = (rows: typeof salesByMonth) =>
      rows.map((row) => ({
        month: row.month,
        sales: Number(row.sales),
        rentals: Number(row.rentals),
        revenue: Number(row.revenue || 0),
      }));

    const byMonth = mapMonth(salesByMonth);

    return {
      salesByMonth: byMonth,
      salesPerMonth: byMonth.map(({ month, sales, revenue }) => ({
        month,
        count: sales,
        revenue,
      })),
      rentalsPerMonth: byMonth.map(({ month, rentals, revenue }) => ({
        month,
        count: rentals,
        revenue,
      })),
      propertiesByType: propertiesByType.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
      transactionsByPropertyType: transactionsByPropertyType.map((row) => ({
        type: row.type,
        count: Number(row.count),
        totalAmount: Number(row.total_amount || 0),
      })),
      byPropertyType: transactionsByPropertyType.map((row) => ({
        type: row.type,
        count: Number(row.count),
        totalAmount: Number(row.total_amount || 0),
      })),
      priceDistribution: priceDistribution.map((row) => ({
        range: row.range,
        count: Number(row.count),
      })),
    };
  }

  /**
   * GET /api/dashboard/leads
   */
  async getLeadsStats(filter: DashboardFilterDto, user: any) {
    const agentId = await this.resolveAgentFilter(filter, user);
    const dateRange = this.buildDateRange(filter);
    const leadWhere: Prisma.LeadWhereInput = {
      ...(agentId && { agentId }),
      ...(dateRange && { createdAt: dateRange }),
    };

    const [leadsBySource, leadsByStatus, totalLeads, wonLeads, leadsByMonth] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ["source"],
          where: leadWhere,
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        this.prisma.lead.groupBy({
          by: ["status"],
          where: leadWhere,
          _count: { id: true },
        }),
        this.prisma.lead.count({ where: leadWhere }),
        this.prisma.lead.count({ where: { ...leadWhere, status: "WON" } }),
        this.prisma.$queryRaw<
          Array<{ month: string; count: bigint; won: bigint; lost: bigint }>
        >`
          SELECT
            TO_CHAR(l."createdAt", 'YYYY-MM') AS month,
            COUNT(*)::bigint AS count,
            COUNT(*) FILTER (WHERE l.status = 'WON')::bigint AS won,
            COUNT(*) FILTER (WHERE l.status = 'LOST')::bigint AS lost
          FROM leads l
          WHERE l."createdAt" >= NOW() - INTERVAL '12 months'
            ${agentId ? Prisma.sql`AND l."agentId" = ${agentId}` : Prisma.empty}
            ${dateRange?.gte ? Prisma.sql`AND l."createdAt" >= ${dateRange.gte}` : Prisma.empty}
            ${dateRange?.lte ? Prisma.sql`AND l."createdAt" <= ${dateRange.lte}` : Prisma.empty}
          GROUP BY 1
          ORDER BY month ASC
        `,
      ]);

    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    return {
      leadsBySource: leadsBySource.map((item) => ({
        source: item.source,
        count: item._count.id,
      })),
      bySource: leadsBySource.map((item) => ({
        source: item.source,
        count: item._count.id,
      })),
      byStatus: leadsByStatus.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      conversion: {
        total: totalLeads,
        won: wonLeads,
        lost: totalLeads - wonLeads,
        rate: Math.round(conversionRate * 100) / 100,
      },
      leadsByMonth: leadsByMonth.map((row) => ({
        month: row.month,
        count: Number(row.count),
        won: Number(row.won),
        lost: Number(row.lost),
      })),
      byMonth: leadsByMonth.map((row) => ({
        month: row.month,
        count: Number(row.count),
        won: Number(row.won),
        lost: Number(row.lost),
      })),
    };
  }

  /**
   * GET /api/dashboard/agents
   */
  async getAgentsPerformance(filter: DashboardFilterDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Agents cannot view other agents' performance");
    }

    const dateRange = this.buildDateRange(filter);
    const agents = await this.fetchAgentPerformance(
      filter.agentId,
      dateRange,
      undefined,
    );

    return { agentPerformance: agents, agents };
  }

  private agentPerfCache: { key: string; data: any[]; expires: number } | null = null;

  /** Requête SQL unique — performance agents (transactions, CA, commissions, clients, leads, visites) */
  private async fetchAgentPerformance(
    agentId: string | undefined,
    dateRange: DateRange | undefined,
    limit?: number,
  ) {
    const cacheKey = `${agentId ?? 'all'}|${dateRange?.gte?.toISOString() ?? ''}|${dateRange?.lte?.toISOString() ?? ''}|${limit ?? 'none'}`;
    const now = Date.now();
    if (this.agentPerfCache && this.agentPerfCache.key === cacheKey && this.agentPerfCache.expires > now) {
      return this.agentPerfCache.data;
    }

    const dateStart = dateRange?.gte
      ? Prisma.sql`AND t."createdAt" >= ${dateRange.gte}`
      : Prisma.empty;
    const dateEnd = dateRange?.lte
      ? Prisma.sql`AND t."createdAt" <= ${dateRange.lte}`
      : Prisma.empty;
    const visitDateStart = dateRange?.gte
      ? Prisma.sql`AND v."scheduledAt" >= ${dateRange.gte}`
      : Prisma.empty;
    const visitDateEnd = dateRange?.lte
      ? Prisma.sql`AND v."scheduledAt" <= ${dateRange.lte}`
      : Prisma.empty;
    const agentFilter = agentId ? Prisma.sql`AND a.id = ${agentId}` : Prisma.empty;
    const limitSql =
      limit !== undefined ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        agent_id: string;
        firstName: string;
        lastName: string;
        sales: bigint;
        rentals: bigint;
        total_transactions: bigint;
        total_revenue: number;
        total_commissions: number;
        active_clients: bigint;
        active_leads: bigint;
        total_visits: bigint;
        completed_visits: bigint;
        total_properties: bigint;
        available_properties: bigint;
      }>
    >`
      SELECT
        a.id AS agent_id,
        u."firstName",
        u."lastName",
        COUNT(t.id) FILTER (WHERE t.type = 'SALE' AND t.status <> 'CANCELLED')::bigint AS sales,
        COUNT(t.id) FILTER (WHERE t.type = 'RENTAL' AND t.status <> 'CANCELLED')::bigint AS rentals,
        COUNT(t.id) FILTER (WHERE t.status <> 'CANCELLED')::bigint AS total_transactions,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status <> 'CANCELLED'), 0)::numeric AS total_revenue,
        COALESCE(SUM(c.amount), 0)::numeric AS total_commissions,
        COUNT(DISTINCT cl.id) FILTER (WHERE cl."isActive" = true)::bigint AS active_clients,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('WON', 'LOST'))::bigint AS active_leads,
        COUNT(DISTINCT v.id)::bigint AS total_visits,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'COMPLETED')::bigint AS completed_visits,
        COUNT(DISTINCT p.id)::bigint AS total_properties,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('AVAILABLE', 'RESERVED'))::bigint AS available_properties
      FROM agents a
      INNER JOIN users u ON a."userId" = u.id
      LEFT JOIN transactions t ON (t."fieldAgentId" = a.id OR t."officeAgentId" = a.id)
        ${dateStart}
        ${dateEnd}
      LEFT JOIN commissions c ON c."transactionId" = t.id
      LEFT JOIN clients cl ON cl."agentId" = a.id
      LEFT JOIN leads l ON l."agentId" = a.id
      LEFT JOIN visits v ON (v."fieldAgentId" = a.id OR v."officeAgentId" = a.id)
        ${visitDateStart}
        ${visitDateEnd}
      LEFT JOIN properties p ON p."agentId" = a.id
      WHERE u."isActive" = true
        ${agentFilter}
      GROUP BY a.id, u."firstName", u."lastName"
      ORDER BY total_revenue DESC, total_transactions DESC
      ${limitSql}
    `;

    const data = rows.map((agent) => ({
      agentId: agent.agent_id,
      name: `${agent.firstName} ${agent.lastName}`,
      sales: Number(agent.sales),
      rentals: Number(agent.rentals),
      transactions: Number(agent.total_transactions),
      revenue: Number(agent.total_revenue || 0),
      commissions: Number(agent.total_commissions || 0),
      activeClients: Number(agent.active_clients),
      activeLeads: Number(agent.active_leads),
      visits: {
        total: Number(agent.total_visits),
        completed: Number(agent.completed_visits),
      },
      properties: {
        total: Number(agent.total_properties),
        available: Number(agent.available_properties),
      },
    }));

    // Cache 60 secondes : évite de refaire la même requête lourde dans le même navigateur.
    this.agentPerfCache = { key: cacheKey, data, expires: now + 60_000 };

    return data;
  }
}
