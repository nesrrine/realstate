import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../common/enums/role.enum";
import { agencyDayRange } from "../common/utils/agency-day";
import { CreateCashEntryDto, VisitFeeDto } from "./dto/cash.dto";
import { AgencySettingsService } from "../settings/agency-settings.service";

const ENTRY_SELECT = {
  id: true, type: true, date: true, amount: true, label: true, category: true,
  paymentMethod: true, createdAt: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  visit: {
    select: {
      id: true, scheduledAt: true,
      client: { select: { id: true, firstName: true, lastName: true } },
      properties: { select: { property: { select: { title: true } } }, take: 1 },
    },
  },
} satisfies Prisma.CashEntrySelect;

// Colonne DATE (jour calendaire sans heure) : minuit UTC représente bien ce jour
const toDay = (day: string) => new Date(`${day}T00:00:00.000Z`);
const isManager = (user: any) => user.role === Role.ADMIN || user.role === Role.MANAGER;

@Injectable()
export class CashService {
  constructor(
    private prisma: PrismaService,
    private agencySettings: AgencySettingsService,
  ) {}

  // ── ACCÈS ─────────────────────────────────────────────────────────
  /** Gérant/admin : toujours. Agent : seulement si le gérant l'a autorisé. */
  async hasAccess(user: any): Promise<boolean> {
    if (isManager(user)) return true;
    if (user.role !== Role.AGENT) return false;
    const agent = await this.prisma.agent.findUnique({
      where: { userId: user.id },
      select: { canManageCash: true },
    });
    return !!agent?.canManageCash;
  }

  private async assertAccess(user: any) {
    if (!(await this.hasAccess(user)))
      throw new ForbiddenException("Accès aux frais et dépenses non autorisé par le gérant");
  }

  async setAgentAccess(agentId: string, enabled: boolean) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, select: { id: true } });
    if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { canManageCash: enabled },
      select: { id: true, canManageCash: true },
    });
  }

  // ── JOURNÉE ───────────────────────────────────────────────────────
  async findDay(day: string, user: any) {
    await this.assertAccess(user);
    const entries = await this.prisma.cashEntry.findMany({
      where: { date: toDay(day) },
      select: ENTRY_SELECT,
      orderBy: { createdAt: "asc" },
    });
    const sum = (type: "VISIT_FEE" | "EXPENSE") =>
      entries.filter((e) => e.type === type).reduce((s, e) => s + Number(e.amount), 0);
    const visitFees = sum("VISIT_FEE");
    const expenses = sum("EXPENSE");
    return { date: day, entries, totals: { visitFees, expenses, balance: visitFees - expenses } };
  }

  /** Totaux par jour sur une période (jours sans opération omis). */
  async summary(from: string, to: string, user: any) {
    await this.assertAccess(user);
    const rows = await this.prisma.cashEntry.groupBy({
      by: ["date", "type"],
      where: { date: { gte: toDay(from), lte: toDay(to) } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { date: "desc" },
    });

    const days = new Map<string, { date: string; visitFees: number; expenses: number; count: number }>();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      const d = days.get(key) ?? { date: key, visitFees: 0, expenses: 0, count: 0 };
      const amount = Number(r._sum.amount ?? 0);
      if (r.type === "VISIT_FEE") d.visitFees += amount;
      else d.expenses += amount;
      d.count += r._count._all;
      days.set(key, d);
    }
    const list = [...days.values()].map((d) => ({ ...d, balance: d.visitFees - d.expenses }));
    const totals = list.reduce(
      (t, d) => ({
        visitFees: t.visitFees + d.visitFees,
        expenses: t.expenses + d.expenses,
        balance: t.balance + d.balance,
      }),
      { visitFees: 0, expenses: 0, balance: 0 },
    );
    return { from, to, days: list, totals };
  }

  /** Visites du jour, avec leur frais de visite (payé ou non). */
  async visitsOfDay(day: string, user: any) {
    await this.assertAccess(user);
    // Journée à l'heure de Tunis (une visite à 00h30 ne doit pas tomber la veille)
    const { start, end } = agencyDayRange(day);
    const visits = await this.prisma.visit.findMany({
      where: { scheduledAt: { gte: start, lt: end } },
      select: {
        id: true, scheduledAt: true, status: true,
        client: { select: { firstName: true, lastName: true } },
        properties: { select: { property: { select: { title: true } } }, take: 1 },
        cashEntries: { where: { type: "VISIT_FEE" }, select: { amount: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
    return visits.map(({ cashEntries, ...v }) => ({
      ...v,
      feePaid: cashEntries.length > 0,
      feeAmount: cashEntries.reduce((s, e) => s + Number(e.amount), 0),
    }));
  }

  /**
   * Coche / décoche « frais payé » d'une visite terminée.
   * Payé = une ligne VISIT_FEE rattachée à la visite (elle compte dans la caisse du jour).
   */
  async setVisitFee(visitId: string, dto: VisitFeeDto, user: any) {
    await this.assertAccess(user);
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true, status: true,
        client: { select: { firstName: true, lastName: true } },
        properties: { select: { property: { select: { title: true } } }, take: 1 },
        cashEntries: { where: { type: "VISIT_FEE" }, select: { id: true, createdById: true } },
      },
    });
    if (!visit) throw new NotFoundException(`Visit ${visitId} not found`);

    if (!dto.paid) {
      // Même règle que la suppression : un agent ne retire que ses propres saisies
      if (!isManager(user) && visit.cashEntries.some((e) => e.createdById !== user.id))
        throw new ForbiddenException("Ce frais a été saisi par quelqu'un d'autre");
      await this.prisma.cashEntry.deleteMany({ where: { visitId, type: "VISIT_FEE" } });
      return { visitId, feePaid: false, feeAmount: 0 };
    }

    if (visit.status !== "COMPLETED")
      throw new BadRequestException("Seule une visite terminée peut être marquée comme payée");
    if (visit.cashEntries.length > 0)
      throw new BadRequestException("Le frais de cette visite est déjà enregistré");

    // Montant par défaut : frais de visite définis dans Paramètres
    const amount = dto.amount ?? (await this.agencySettings.get()).visitFee;
    const title = visit.properties[0]?.property.title;
    await this.prisma.cashEntry.create({
      data: {
        type: "VISIT_FEE",
        date: toDay(dto.date),
        amount,
        label: `Frais de visite – ${visit.client.firstName} ${visit.client.lastName}${title ? ` (${title})` : ""}`,
        paymentMethod: dto.paymentMethod ?? "CASH",
        visitId,
        createdById: user.id,
      },
    });
    return { visitId, feePaid: true, feeAmount: amount };
  }

  // ── ÉCRITURE ──────────────────────────────────────────────────────
  async create(dto: CreateCashEntryDto, user: any) {
    await this.assertAccess(user);
    if (dto.visitId) {
      const visit = await this.prisma.visit.findUnique({ where: { id: dto.visitId }, select: { id: true } });
      if (!visit) throw new NotFoundException(`Visit ${dto.visitId} not found`);
    }
    return this.prisma.cashEntry.create({
      data: {
        type: dto.type,
        date: toDay(dto.date),
        amount: dto.amount,
        label: dto.label.trim(),
        // La catégorie ne concerne que les dépenses, la visite que les frais de visite
        category: dto.type === "EXPENSE" ? dto.category ?? "OTHER" : null,
        visitId: dto.type === "VISIT_FEE" ? dto.visitId ?? null : null,
        paymentMethod: dto.paymentMethod ?? "CASH",
        createdById: user.id,
      },
      select: ENTRY_SELECT,
    });
  }

  /** Le gérant supprime toute ligne ; un agent autorisé seulement les siennes. */
  async remove(id: string, user: any) {
    await this.assertAccess(user);
    const entry = await this.prisma.cashEntry.findUnique({ where: { id }, select: { createdById: true } });
    if (!entry) throw new NotFoundException(`Entry ${id} not found`);
    if (!isManager(user) && entry.createdById !== user.id)
      throw new ForbiddenException("Vous ne pouvez supprimer que vos propres saisies");
    await this.prisma.cashEntry.delete({ where: { id } });
    return { message: "Supprimé" };
  }
}
