import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AgencySettingsService } from "../settings/agency-settings.service";
import { ContactType, PublicContactDto } from "./contact.dto";

const TYPE_LABELS: Record<ContactType, string> = {
  achat: "Achat",
  location: "Location",
  vente: "Vendre un bien",
  estimation: "Estimation",
  autre: "Autre demande",
};

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private agency: AgencySettingsService,
  ) {}

  /** Coordonnées affichées sur le site (pas de donnée interne). */
  async publicAgency() {
    const { name, address, mapsUrl, phone } = await this.agency.get();
    return { name, address, mapsUrl, phone };
  }

  /**
   * Formulaire « Contact » du site → lead dans le CRM.
   * - client déjà connu (même numéro) : le lead est ajouté à sa fiche, chez son agent ;
   * - sinon nouveau prospect, confié à l'agent du bien ou au gérant ;
   * - l'agent concerné reçoit une notification.
   */
  async submit(dto: PublicContactDto) {
    if (dto.website) return { ok: true }; // robot : on ne crée rien

    const property = dto.propertyId
      ? await this.prisma.property.findFirst({
          where: { id: dto.propertyId, isPublished: true },
          select: { id: true, title: true, reference: true, agentId: true, transactionType: true },
        })
      : null;

    const existing = await this.findClientByPhone(dto.phone);
    const agentId = existing?.agentId ?? property?.agentId ?? (await this.defaultAgentId());
    if (!agentId) {
      this.logger.error("Demande de contact perdue : aucun agent ni gérant actif");
      return { ok: false };
    }

    const [firstName, ...rest] = dto.name.split(/\s+/);
    const client =
      existing ??
      (await this.prisma.client.create({
        data: {
          agentId,
          firstName,
          lastName: rest.join(" ") || "(site web)",
          phone: dto.phone,
          email: dto.email ?? null,
          status: "PROSPECT",
          transactionType:
            dto.type === "location" ? "RENTAL" : dto.type === "achat" ? "SALE" : property?.transactionType ?? null,
          notes: "Créé depuis le formulaire de contact du site.",
        },
        select: { id: true, agentId: true, firstName: true, lastName: true },
      }));

    const lead = await this.prisma.lead.create({
      data: {
        clientId: client.id,
        agentId: client.agentId,
        source: "WEBSITE",
        notes: [
          `Formulaire de contact du site — ${TYPE_LABELS[dto.type]}`,
          property ? `Bien : ${property.title} (réf. ${property.reference})` : "",
          dto.email ? `E-mail : ${dto.email}` : "",
          "",
          dto.message,
        ]
          .filter((l, i) => l || i === 3)
          .join("\n"),
        ...(property && { properties: { create: [{ propertyId: property.id }] } }),
      },
      select: { id: true },
    });

    await this.notifications.create({
      agentId: client.agentId,
      clientId: client.id,
      title: existing ? "Nouvelle demande d'un client (site)" : "Nouveau contact depuis le site",
      body: `${dto.name} (${dto.phone}) — ${TYPE_LABELS[dto.type]}${property ? ` : ${property.title}` : ""}. À rappeler.`,
      link: `/crm/leads/${lead.id}`,
    });

    return { ok: true };
  }

  /** Même numéro = même client (8 derniers chiffres, comme la détection de doublons du CRM). */
  private async findClientByPhone(phone: string) {
    const key = phone.replace(/\D/g, "").slice(-8);
    if (key.length < 8) return null;
    const rows = await this.prisma.$queryRaw<{ id: string; agentId: string }[]>`
      SELECT id, "agentId" FROM clients
      WHERE "isActive" = true AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${key}
      ORDER BY "createdAt" ASC
      LIMIT 1`;
    return rows[0] ?? null;
  }

  private async defaultAgentId() {
    const manager = await this.prisma.agent.findFirst({
      where: { user: { role: { in: ["MANAGER", "ADMIN"] }, isActive: true } },
      orderBy: [{ user: { role: "desc" } }, { createdAt: "asc" }],
      select: { id: true },
    });
    return manager?.id ?? null;
  }
}
