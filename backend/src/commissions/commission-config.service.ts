import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export const SETTING_COMMISSION_RATE = "COMMISSION_RATE";
export const SETTING_FIELD_AGENT_SHARE_RATE = "FIELD_AGENT_SHARE_RATE";
export const SETTING_OFFICE_AGENT_SHARE_RATE = "OFFICE_AGENT_SHARE_RATE";

export interface CommissionRates {
  commissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
}

@Injectable()
export class CommissionConfigService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private envCommissionRate(): number {
    return parseFloat(this.config.get("COMMISSION_RATE", "0.02"));
  }

  private envFieldAgentShareRate(): number {
    return parseFloat(this.config.get("FIELD_AGENT_SHARE_RATE", "0.3"));
  }

  private envOfficeAgentShareRate(): number {
    return parseFloat(this.config.get("OFFICE_AGENT_SHARE_RATE", "0.2"));
  }

  async getRates(): Promise<CommissionRates> {
    const rows = await this.prisma.appSetting.findMany({
      where: {
        key: { in: [SETTING_COMMISSION_RATE, SETTING_FIELD_AGENT_SHARE_RATE, SETTING_OFFICE_AGENT_SHARE_RATE] },
      },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      commissionRate: parseFloat(
        map[SETTING_COMMISSION_RATE] ?? String(this.envCommissionRate()),
      ),
      fieldAgentShareRate: parseFloat(
        map[SETTING_FIELD_AGENT_SHARE_RATE] ?? String(this.envFieldAgentShareRate()),
      ),
      officeAgentShareRate: parseFloat(
        map[SETTING_OFFICE_AGENT_SHARE_RATE] ?? String(this.envOfficeAgentShareRate()),
      ),
    };
  }

  async updateRates(partial: Partial<CommissionRates>): Promise<CommissionRates> {
    const current = await this.getRates();
    const next: CommissionRates = {
      commissionRate: partial.commissionRate ?? current.commissionRate,
      fieldAgentShareRate: partial.fieldAgentShareRate ?? current.fieldAgentShareRate,
      officeAgentShareRate: partial.officeAgentShareRate ?? current.officeAgentShareRate,
    };

    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key: SETTING_COMMISSION_RATE },
        create: {
          key: SETTING_COMMISSION_RATE,
          value: String(next.commissionRate),
        },
        update: { value: String(next.commissionRate) },
      }),
      this.prisma.appSetting.upsert({
        where: { key: SETTING_FIELD_AGENT_SHARE_RATE },
        create: {
          key: SETTING_FIELD_AGENT_SHARE_RATE,
          value: String(next.fieldAgentShareRate),
        },
        update: { value: String(next.fieldAgentShareRate) },
      }),
      this.prisma.appSetting.upsert({
        where: { key: SETTING_OFFICE_AGENT_SHARE_RATE },
        create: {
          key: SETTING_OFFICE_AGENT_SHARE_RATE,
          value: String(next.officeAgentShareRate),
        },
        update: { value: String(next.officeAgentShareRate) },
      }),
    ]);

    return next;
  }
}
