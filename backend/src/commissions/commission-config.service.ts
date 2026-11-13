import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export const SETTING_BUYER_COMMISSION_RATE =
  "BUYER_COMMISSION_RATE";

export const SETTING_SELLER_COMMISSION_RATE =
  "SELLER_COMMISSION_RATE";

export const SETTING_FIELD_AGENT_SHARE_RATE =
  "FIELD_AGENT_SHARE_RATE";

export const SETTING_OFFICE_AGENT_SHARE_RATE =
  "OFFICE_AGENT_SHARE_RATE";

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
    const value = Number(this.config.get<string>(key, def));

    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        `Configuration invalide pour ${key}`,
      );
    }

    return value;
  }

  private validateRates(rates: CommissionRates): void {
    const entries: [string, number][] = [
      ["Commission acheteur", rates.buyerCommissionRate],
      ["Commission vendeur", rates.sellerCommissionRate],
      ["Part agent terrain", rates.fieldAgentShareRate],
      ["Part agent bureau", rates.officeAgentShareRate],
    ];

    for (const [name, value] of entries) {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new BadRequestException(
          `${name} doit être compris entre 0 et 1`,
        );
      }
    }

    if (
      rates.fieldAgentShareRate +
        rates.officeAgentShareRate >
      1
    ) {
      throw new BadRequestException(
        "La somme des parts agents ne peut pas dépasser 100 %",
      );
    }
  }

  async getRates(): Promise<CommissionRates> {
    const keys = [
      SETTING_BUYER_COMMISSION_RATE,
      SETTING_SELLER_COMMISSION_RATE,
      SETTING_FIELD_AGENT_SHARE_RATE,
      SETTING_OFFICE_AGENT_SHARE_RATE,
    ];

    const rows = await this.prisma.appSetting.findMany({
      where: {
        key: { in: keys },
      },
    });

    const map = Object.fromEntries(
      rows.map((row) => [row.key, row.value]),
    );

    const pick = (
      key: string,
      envKey: string,
      def: string,
    ): number => {
      const raw =
        map[key] ?? String(this.env(envKey, def));

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        throw new BadRequestException(
          `Taux invalide dans les paramètres : ${key}`,
        );
      }

      return value;
    };

    const rates: CommissionRates = {
      buyerCommissionRate: pick(
        SETTING_BUYER_COMMISSION_RATE,
        "BUYER_COMMISSION_RATE",
        "0.02",
      ),

      sellerCommissionRate: pick(
        SETTING_SELLER_COMMISSION_RATE,
        "SELLER_COMMISSION_RATE",
        "0.02",
      ),

      fieldAgentShareRate: pick(
        SETTING_FIELD_AGENT_SHARE_RATE,
        "FIELD_AGENT_SHARE_RATE",
        "0.30",
      ),

      officeAgentShareRate: pick(
        SETTING_OFFICE_AGENT_SHARE_RATE,
        "OFFICE_AGENT_SHARE_RATE",
        "0.20",
      ),
    };

    this.validateRates(rates);

    return rates;
  }

  async updateRates(
    partial: Partial<CommissionRates>,
  ): Promise<CommissionRates> {
    const current = await this.getRates();

    const next: CommissionRates = {
      buyerCommissionRate:
        partial.buyerCommissionRate ??
        current.buyerCommissionRate,

      sellerCommissionRate:
        partial.sellerCommissionRate ??
        current.sellerCommissionRate,

      fieldAgentShareRate:
        partial.fieldAgentShareRate ??
        current.fieldAgentShareRate,

      officeAgentShareRate:
        partial.officeAgentShareRate ??
        current.officeAgentShareRate,
    };

    this.validateRates(next);

    const entries: [string, number][] = [
      [
        SETTING_BUYER_COMMISSION_RATE,
        next.buyerCommissionRate,
      ],
      [
        SETTING_SELLER_COMMISSION_RATE,
        next.sellerCommissionRate,
      ],
      [
        SETTING_FIELD_AGENT_SHARE_RATE,
        next.fieldAgentShareRate,
      ],
      [
        SETTING_OFFICE_AGENT_SHARE_RATE,
        next.officeAgentShareRate,
      ],
    ];

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: {
            key,
            value: String(value),
          },
          update: {
            value: String(value),
          },
        }),
      ),
    );

    return next;
  }
}