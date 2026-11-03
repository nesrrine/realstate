import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Coordonnées de l'agence et frais de visite, modifiables dans Paramètres (table app_settings). */
export interface AgencySettings {
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
  visitFee: number;
}

const KEYS: Record<keyof AgencySettings, string> = {
  name: "agency.name",
  address: "agency.address",
  mapsUrl: "agency.mapsUrl",
  phone: "agency.phone",
  visitFee: "visit.fee",
};

/** Valeurs par défaut : variables d'environnement, sinon valeurs de base de l'agence. */
const DEFAULTS = (): AgencySettings => ({
  name: process.env.AGENCY_NAME || "Le Portail Immobilier",
  address: process.env.AGENCY_ADDRESS || "",
  mapsUrl: process.env.AGENCY_MAPS_URL || "",
  phone: process.env.AGENCY_PHONE || "",
  visitFee: Number(process.env.VISIT_FEE) || 20,
});

@Injectable()
export class AgencySettingsService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<AgencySettings> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { in: Object.values(KEYS) } } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const d = DEFAULTS();
    return {
      name: map.get(KEYS.name) ?? d.name,
      address: map.get(KEYS.address) ?? d.address,
      mapsUrl: map.get(KEYS.mapsUrl) ?? d.mapsUrl,
      phone: map.get(KEYS.phone) ?? d.phone,
      visitFee: Number(map.get(KEYS.visitFee) ?? d.visitFee) || d.visitFee,
    };
  }

  async update(partial: Partial<AgencySettings>): Promise<AgencySettings> {
    const entries = (Object.keys(KEYS) as (keyof AgencySettings)[])
      .filter((k) => partial[k] !== undefined)
      .map((k) => ({ key: KEYS[k], value: String(partial[k]).trim() }));
    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.appSetting.upsert({ where: { key: e.key }, create: e, update: { value: e.value } }),
      ),
    );
    return this.get();
  }
}
