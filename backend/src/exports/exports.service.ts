import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { CashService } from "../cash/cash.service";
import { Role } from "../common/enums/role.enum";
import { agencyDayRange } from "../common/utils/agency-day";

export const EXPORT_TYPES = ["visites", "clients", "biens", "frais", "transactions"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

// ── Libellés français (les fichiers sont lus par l'agence, pas par des développeurs) ──
const VISIT_STATUS: Record<string, string> = {
  SCHEDULED: "Planifiée", CONFIRMED: "Confirmée", COMPLETED: "Terminée", CANCELLED: "Annulée", NO_SHOW: "Absent",
};
const PROPERTY_TYPE: Record<string, string> = {
  APARTMENT: "Appartement", VILLA: "Villa", HOUSE: "Maison", LAND: "Terrain", COMMERCIAL: "Local commercial",
  OFFICE: "Bureau", BUSINESS: "Fonds de commerce", OTHER: "Autre",
};
const PROPERTY_STATUS: Record<string, string> = {
  DRAFT: "Brouillon", AVAILABLE: "Disponible", RESERVED: "Réservé", SOLD: "Vendu", RENTED: "Loué", ARCHIVED: "Archivé",
};
const TX_TYPE: Record<string, string> = { SALE: "Vente", RENTAL: "Location" };
const TITLE_TYPE: Record<string, string> = {
  INDIVIDUAL: "Individuel", COLLECTIVE: "Collectif", IN_PROGRESS: "En cours", NONE: "Sans titre",
};
const TX_STATUS: Record<string, string> = {
  PENDING: "En attente", IN_PROGRESS: "En cours", COMPLETED: "Finalisée", CANCELLED: "Annulée",
};
const CLIENT_TYPE: Record<string, string> = { BUYER: "Acheteur", SELLER: "Vendeur", RENTER: "Locataire" };
const CLIENT_STATUS: Record<string, string> = { PROSPECT: "Prospect", CLIENT: "Client confirmé" };
const FOLLOW_UP: Record<string, string> = {
  TO_CONTACT: "À contacter", CONTACTED: "Contacté", NEGOTIATION: "Négociation", WON: "Gagné", LOST: "Perdu",
};
const FINANCING: Record<string, string> = { CASH: "Comptant", CREDIT: "Crédit bancaire", MIXED: "Comptant + crédit" };
const CASH_TYPE: Record<string, string> = { VISIT_FEE: "Frais de visite", EXPENSE: "Dépense" };
const EXPENSE_CATEGORY: Record<string, string> = {
  TRANSPORT: "Transport", FUEL: "Carburant", PHONE: "Téléphone", OFFICE: "Fournitures / bureau",
  ADVERTISING: "Publicité", MEAL: "Repas", OTHER: "Autre",
};
const PAYMENT_METHOD: Record<string, string> = { CASH: "Espèces", CARD: "Carte", TRANSFER: "Virement", CHECK: "Chèque" };
const COMMISSION_STATUS: Record<string, string> = { PENDING: "À payer", PAID: "Payée", CANCELLED: "Annulée" };

const label = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v : "");
const person = (u?: { firstName: string; lastName: string } | null) => (u ? `${u.firstName} ${u.lastName}`.trim() : "");
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

interface Column {
  header: string;
  key: string;
  width?: number;
  /** Format Excel : date, date + heure, montant */
  format?: "date" | "datetime" | "money";
  /** Additionné dans la ligne TOTAL (frais, montants) ; pas les budgets ni les prix */
  sum?: boolean;
}

const MONEY_FORMAT = '#,##0" DT"';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private cash: CashService,
  ) {}

  /** Fichier Excel + nom proposé au téléchargement. */
  async export(type: ExportType, user: any, from?: string, to?: string) {
    if ((from && !DAY.test(from)) || (to && !DAY.test(to))) {
      throw new BadRequestException("Dates attendues au format AAAA-MM-JJ");
    }
    const period = from || to ? ` ${from ?? "…"} au ${to ?? "…"}` : "";
    const today = new Date().toISOString().slice(0, 10);

    const sheets: Record<ExportType, () => Promise<{ title: string; columns: Column[]; rows: Record<string, unknown>[] }>> = {
      visites: () => this.visits(user, from, to),
      clients: () => this.clients(user),
      biens: () => this.properties(),
      frais: () => this.cashEntries(user, from, to),
      transactions: () => this.transactions(user, from, to),
    };
    const { title, columns, rows } = await sheets[type]();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Le Portail Immobilier";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
    rows.forEach((r) => sheet.addRow(r));

    // En-tête lisible, filtres Excel activés, formats de dates et montants
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E2A4A" } };
    header.alignment = { vertical: "middle" };
    header.height = 22;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    columns.forEach((c, i) => {
      const col = sheet.getColumn(i + 1);
      if (c.format === "date") col.numFmt = "dd/mm/yyyy";
      if (c.format === "datetime") col.numFmt = "dd/mm/yyyy hh:mm";
      if (c.format === "money") col.numFmt = MONEY_FORMAT;
    });

    // Ligne de total pour les montants
    const moneyCols = columns.filter((c) => c.sum);
    if (rows.length && moneyCols.length) {
      const total: Record<string, unknown> = { [columns[0].key]: "TOTAL" };
      moneyCols.forEach((c) => (total[c.key] = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0)));
      const row = sheet.addRow(total);
      row.font = { bold: true };
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: `${type}${period.replace(/ /g, "_").replace(/…/g, "")}_${today}.xlsx` };
  }

  // ── Visites : un agent n'exporte que ses visites (terrain ou bureau) ──
  private async visits(user: any, from?: string, to?: string) {
    const where: Prisma.VisitWhereInput = {};
    if (user.role === Role.AGENT) where.OR = [{ fieldAgentId: user.agentId }, { officeAgentId: user.agentId }];
    if (from || to) {
      where.scheduledAt = {
        ...(from && { gte: agencyDayRange(from).start }),
        ...(to && { lt: agencyDayRange(to).end }),
      };
    }
    const visits = await this.prisma.visit.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      select: {
        scheduledAt: true, status: true, visitType: true, duration: true, feedback: true,
        client: { select: { firstName: true, lastName: true, phone: true } },
        properties: { select: { property: { select: { reference: true, title: true, city: true } } } },
        fieldAgent: { select: { user: { select: { firstName: true, lastName: true } } } },
        officeAgent: { select: { user: { select: { firstName: true, lastName: true } } } },
        cashEntries: { where: { type: "VISIT_FEE" }, select: { amount: true } },
      },
    });
    return {
      title: "Visites",
      columns: [
        { header: "Date et heure", key: "date", width: 18, format: "datetime" },
        { header: "Statut", key: "status", width: 13 },
        { header: "Client", key: "client", width: 24 },
        { header: "Téléphone", key: "phone", width: 15 },
        { header: "Biens", key: "properties", width: 40 },
        { header: "Ville", key: "city", width: 16 },
        { header: "Agent terrain", key: "field", width: 20 },
        { header: "Agent bureau", key: "office", width: 20 },
        { header: "Type", key: "type", width: 12 },
        { header: "Durée (min)", key: "duration", width: 11 },
        { header: "Frais encaissés", key: "fee", width: 15, format: "money", sum: true },
        { header: "Compte rendu", key: "feedback", width: 50 },
      ] as Column[],
      rows: visits.map((v) => ({
        date: v.scheduledAt,
        status: label(VISIT_STATUS, v.status),
        client: person(v.client),
        phone: v.client.phone,
        properties: v.properties.map((p) => `${p.property.reference} – ${p.property.title}`).join(" | "),
        city: [...new Set(v.properties.map((p) => p.property.city))].join(", "),
        field: person(v.fieldAgent?.user),
        office: person(v.officeAgent?.user),
        type: v.visitType === "REMOTE" ? "À distance" : "Sur place",
        duration: v.duration,
        fee: v.cashEntries.reduce((s, e) => s + Number(e.amount), 0),
        feedback: v.feedback ?? "",
      })),
    };
  }

  // ── Clients : un agent n'exporte que son portefeuille ; clients supprimés exclus ──
  private async clients(user: any) {
    const where: Prisma.ClientWhereInput = { isActive: true };
    if (user.role === Role.AGENT) where.agentId = user.agentId;
    const clients = await this.prisma.client.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        firstName: true, lastName: true, phone: true, whatsapp: true, email: true, city: true,
        clientType: true, status: true, followUpStatus: true, transactionType: true, financing: true,
        budgetMin: true, budgetMax: true, needDescription: true, nextFollowUpAt: true, createdAt: true,
        agent: { select: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { visits: true } },
      },
    });
    return {
      title: "Clients",
      columns: [
        { header: "Nom", key: "name", width: 26 },
        { header: "Téléphone", key: "phone", width: 15 },
        { header: "WhatsApp", key: "whatsapp", width: 15 },
        { header: "E-mail", key: "email", width: 26 },
        { header: "Ville", key: "city", width: 16 },
        { header: "Type", key: "type", width: 12 },
        { header: "Statut", key: "status", width: 15 },
        { header: "Suivi", key: "followUp", width: 13 },
        { header: "Recherche", key: "transaction", width: 11 },
        { header: "Financement", key: "financing", width: 18 },
        { header: "Budget min", key: "budgetMin", width: 14, format: "money" },
        { header: "Budget max", key: "budgetMax", width: 14, format: "money" },
        { header: "Besoin", key: "need", width: 40 },
        { header: "Visites", key: "visits", width: 9 },
        { header: "Prochaine relance", key: "nextFollowUp", width: 16, format: "date" },
        { header: "Agent", key: "agent", width: 20 },
        { header: "Créé le", key: "createdAt", width: 12, format: "date" },
      ] as Column[],
      rows: clients.map((c) => ({
        name: person(c),
        phone: c.phone,
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        city: c.city ?? "",
        type: label(CLIENT_TYPE, c.clientType),
        status: label(CLIENT_STATUS, c.status),
        followUp: label(FOLLOW_UP, c.followUpStatus),
        transaction: label(TX_TYPE, c.transactionType),
        financing: label(FINANCING, c.financing),
        budgetMin: num(c.budgetMin),
        budgetMax: num(c.budgetMax),
        need: c.needDescription ?? "",
        visits: c._count.visits,
        nextFollowUp: c.nextFollowUpAt,
        agent: person(c.agent?.user),
        createdAt: c.createdAt,
      })),
    };
  }

  // ── Biens : visibles par tout le personnel (comme la liste du CRM) ──
  private async properties() {
    const properties = await this.prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        reference: true, title: true, type: true, transactionType: true, status: true, isPublished: true,
        address: true, city: true, district: true, price: true, surface: true, rooms: true, bedrooms: true,
        titleType: true, createdAt: true,
        owner: { select: { firstName: true, lastName: true, phone: true } },
        agent: { select: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { visitProperties: true } },
      },
    });
    return {
      title: "Biens",
      columns: [
        { header: "Référence", key: "reference", width: 16 },
        { header: "Titre", key: "title", width: 36 },
        { header: "Type", key: "type", width: 16 },
        { header: "Opération", key: "transaction", width: 11 },
        { header: "Statut", key: "status", width: 12 },
        { header: "Publié", key: "published", width: 8 },
        { header: "Prix", key: "price", width: 15, format: "money" },
        { header: "Surface (m²)", key: "surface", width: 12 },
        { header: "Pièces", key: "rooms", width: 8 },
        { header: "Chambres", key: "bedrooms", width: 9 },
        { header: "Adresse", key: "address", width: 30 },
        { header: "Délégation", key: "district", width: 16 },
        { header: "Gouvernorat", key: "city", width: 14 },
        { header: "Titre foncier", key: "titleType", width: 13 },
        { header: "Propriétaire", key: "owner", width: 22 },
        { header: "Tél. propriétaire", key: "ownerPhone", width: 15 },
        { header: "Agent", key: "agent", width: 20 },
        { header: "Visites", key: "visits", width: 9 },
        { header: "Créé le", key: "createdAt", width: 12, format: "date" },
      ] as Column[],
      rows: properties.map((p) => ({
        reference: p.reference,
        title: p.title,
        type: label(PROPERTY_TYPE, p.type),
        transaction: label(TX_TYPE, p.transactionType),
        status: label(PROPERTY_STATUS, p.status),
        published: p.isPublished ? "Oui" : "Non",
        price: num(p.price),
        surface: num(p.surface),
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        address: p.address ?? "",
        district: p.district ?? "",
        city: p.city ?? "",
        titleType: label(TITLE_TYPE, p.titleType),
        owner: person(p.owner),
        ownerPhone: p.owner?.phone ?? "",
        agent: person(p.agent?.user),
        visits: p._count.visitProperties,
        createdAt: p.createdAt,
      })),
    };
  }

  // ── Frais & dépenses : mêmes droits que la page (gérant, ou agent autorisé) ──
  private async cashEntries(user: any, from?: string, to?: string) {
    if (!(await this.cash.hasAccess(user))) {
      throw new ForbiddenException("Accès aux frais et dépenses non autorisé par le gérant");
    }
    const entries = await this.prisma.cashEntry.findMany({
      where: from || to
        ? { date: { ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }), ...(to && { lte: new Date(`${to}T00:00:00.000Z`) }) } }
        : {},
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        date: true, type: true, label: true, category: true, amount: true, paymentMethod: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      title: "Frais et dépenses",
      columns: [
        { header: "Date", key: "date", width: 12, format: "date" },
        { header: "Type", key: "type", width: 15 },
        { header: "Libellé", key: "label", width: 44 },
        { header: "Catégorie", key: "category", width: 18 },
        { header: "Encaissé", key: "income", width: 14, format: "money", sum: true },
        { header: "Dépensé", key: "expense", width: 14, format: "money", sum: true },
        { header: "Paiement", key: "payment", width: 11 },
        { header: "Saisi par", key: "author", width: 20 },
      ] as Column[],
      rows: entries.map((e) => ({
        date: e.date,
        type: label(CASH_TYPE, e.type),
        label: e.label,
        category: label(EXPENSE_CATEGORY, e.category),
        income: e.type === "VISIT_FEE" ? Number(e.amount) : null,
        expense: e.type === "EXPENSE" ? Number(e.amount) : null,
        payment: label(PAYMENT_METHOD, e.paymentMethod),
        author: person(e.createdBy),
      })),
    };
  }

  // ── Transactions (+ commissions) : un agent n'exporte que les siennes ──
  private async transactions(user: any, from?: string, to?: string) {
    const where: Prisma.TransactionWhereInput = {};
    if (user.role === Role.AGENT) where.OR = [{ fieldAgentId: user.agentId }, { officeAgentId: user.agentId }];
    if (from || to) {
      where.date = {
        ...(from && { gte: agencyDayRange(from).start }),
        ...(to && { lt: agencyDayRange(to).end }),
      };
    }
    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        date: true, type: true, status: true, amount: true, notes: true,
        property: { select: { reference: true, title: true } },
        client: { select: { firstName: true, lastName: true } },
        fieldAgent: { select: { user: { select: { firstName: true, lastName: true } } } },
        officeAgent: { select: { user: { select: { firstName: true, lastName: true } } } },
        commission: {
          select: { amount: true, agencyAmount: true, fieldAgentAmount: true, officeAgentAmount: true, paymentStatus: true },
        },
      },
    });
    return {
      title: "Transactions",
      columns: [
        { header: "Date", key: "date", width: 12, format: "date" },
        { header: "Opération", key: "type", width: 11 },
        { header: "Statut", key: "status", width: 12 },
        { header: "Bien", key: "property", width: 36 },
        { header: "Client", key: "client", width: 22 },
        { header: "Montant", key: "amount", sum: true, width: 15, format: "money" },
        { header: "Commission totale", key: "commission", sum: true, width: 16, format: "money" },
        { header: "Part agence", key: "agency", sum: true, width: 14, format: "money" },
        { header: "Part agent terrain", key: "fieldShare", sum: true, width: 16, format: "money" },
        { header: "Part agent bureau", key: "officeShare", sum: true, width: 16, format: "money" },
        { header: "Commission", key: "commissionStatus", width: 12 },
        { header: "Agent terrain", key: "field", width: 20 },
        { header: "Agent bureau", key: "office", width: 20 },
        { header: "Notes", key: "notes", width: 36 },
      ] as Column[],
      rows: transactions.map((t) => ({
        date: t.date,
        type: label(TX_TYPE, t.type),
        status: label(TX_STATUS, t.status),
        property: t.property ? `${t.property.reference} – ${t.property.title}` : "",
        client: person(t.client),
        amount: num(t.amount),
        commission: num(t.commission?.amount),
        agency: num(t.commission?.agencyAmount),
        fieldShare: num(t.commission?.fieldAgentAmount),
        officeShare: num(t.commission?.officeAgentAmount),
        commissionStatus: label(COMMISSION_STATUS, t.commission?.paymentStatus),
        field: person(t.fieldAgent?.user),
        office: person(t.officeAgent?.user),
        notes: t.notes ?? "",
      })),
    };
  }
}
