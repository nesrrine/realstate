import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export const SETTING_BUYER_COMMISSION_RATE = "BUYER_COMMISSION_RATE";
export const SETTING_SELLER_COMMISSION_RATE = "SELLER_COMMISSION_RATE";
export const SETTING_FIELD_AGENT_SHARE_RATE = "FIELD_AGENT_SHARE_RATE";
export const SETTING_OFFICE_AGENT_SHARE_RATE = "OFFICE_AGENT_SHARE_RATE";

export interface CommissionRates {
  buyerCommissionRate: number;
  sellerCommissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
}

@Injectable()
export class CommissionConfigService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private env(key: string, def: string): number {
    return parseFloat(this.config.get<string>(key, def));
  }

  async getRates(): Promise<CommissionRates> {
    const keys = [
      SETTING_BUYER_COMMISSION_RATE,
      SETTING_SELLER_COMMISSION_RATE,
      SETTING_FIELD_AGENT_SHARE_RATE,
      SETTING_OFFICE_AGENT_SHARE_RATE,
    ];
    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: keys } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const pick = (key: string, envKey: string, def: string) =>
      parseFloat(map[key] ?? String(this.env(envKey, def)));

    return {
      buyerCommissionRate: pick(SETTING_BUYER_COMMISSION_RATE, "BUYER_COMMISSION_RATE", "0.02"),
      sellerCommissionRate: pick(SETTING_SELLER_COMMISSION_RATE, "SELLER_COMMISSION_RATE", "0.02"),
      fieldAgentShareRate: pick(SETTING_FIELD_AGENT_SHARE_RATE, "FIELD_AGENT_SHARE_RATE", "0.3"),
      officeAgentShareRate: pick(SETTING_OFFICE_AGENT_SHARE_RATE, "OFFICE_AGENT_SHARE_RATE", "0.2"),
    };
  }

  async updateRates(partial: Partial<CommissionRates>): Promise<CommissionRates> {
    const current = await this.getRates();
    const next: CommissionRates = {
      buyerCommissionRate: partial.buyerCommissionRate ?? current.buyerCommissionRate,
      sellerCommissionRate: partial.sellerCommissionRate ?? current.sellerCommissionRate,
      fieldAgentShareRate: partial.fieldAgentShareRate ?? current.fieldAgentShareRate,
      officeAgentShareRate: partial.officeAgentShareRate ?? current.officeAgentShareRate,
    };

    const entries: [string, number][] = [
      [SETTING_BUYER_COMMISSION_RATE, next.buyerCommissionRate],
      [SETTING_SELLER_COMMISSION_RATE, next.sellerCommissionRate],
      [SETTING_FIELD_AGENT_SHARE_RATE, next.fieldAgentShareRate],
      [SETTING_OFFICE_AGENT_SHARE_RATE, next.officeAgentShareRate],
    ];

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        }),
      ),
    );

    return next;
  }
}