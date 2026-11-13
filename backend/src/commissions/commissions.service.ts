import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CommissionConfigService, CommissionRates } from "./commission-config.service";
import { calculateCommissionAmounts } from "./commission-calculator";
import { CreateCommissionDto } from "./dto/create-commission.dto";
import { UpdateCommissionDto } from "./dto/update-commission.dto";
import { CommissionFilterDto } from "./dto/commission-filter.dto";
import { CommissionStatsDto } from "./dto/commission-stats.dto";
import { UpdateCommissionConfigDto } from "./dto/update-commission-config.dto";
import { Role } from "../common/enums/role.enum";
import { CommissionPaymentStatus } from "@prisma/client";

const COMMISSION_INCLUDE = {
  transaction: {
    include: {
      property: { select: { id: true, title: true, city: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      fieldAgent: { include: { user: { select: { firstName: true, lastName: true } } } },
      officeAgent: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  },
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const sumBy = (list: any[], key: string) =>
  round2(list.reduce((s, c) => s + Number(c[key] ?? 0), 0));

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private commissionConfig: CommissionConfigService,
  ) {}

  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found");
    return agent.id;
  }

  async getConfig() {
    return this.commissionConfig.getRates();
  }

  async updateConfig(dto: UpdateCommissionConfigDto) {
    const current = await this.commissionConfig.getRates();
    const field = dto.fieldAgentShareRate ?? current.fieldAgentShareRate;
    const office = dto.officeAgentShareRate ?? current.officeAgentShareRate;
    if (field + office > 1) {
      throw new BadRequestException("La somme des parts agents ne peut pas dépasser 1");
    }
    return this.commissionConfig.updateRates(dto);
  }

  async calculatePreview(transactionAmount: number, opts: Partial<CommissionRates> = {}) {
    const d = await this.commissionConfig.getRates();
    try {
      return calculateCommissionAmounts(
        transactionAmount,
        opts.buyerCommissionRate ?? d.buyerCommissionRate,
        opts.sellerCommissionRate ?? d.sellerCommissionRate,
        opts.fieldAgentShareRate ?? d.fieldAgentShareRate,
        opts.officeAgentShareRate ?? d.officeAgentShareRate,
      );
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  /**
   * Crée une commission pour une transaction (utilisé par TransactionsService).
   */
  async createForTransaction(
    transactionId: string,
    transactionAmount: number,
    opts: Partial<CommissionRates> & { notes?: string } = {},
  ) {
    const existing = await this.prisma.commission.findUnique({
      where: { transactionId },
    });
    if (existing) {
      throw new BadRequestException(
        `Commission already exists for transaction ${transactionId}`,
      );
    }

    const c = await this.calculatePreview(transactionAmount, opts);

    return this.prisma.commission.create({
      data: {
        transactionId,
        commissionRate: c.commissionRate,
        buyerCommissionRate: c.buyerCommissionRate,
        sellerCommissionRate: c.sellerCommissionRate,
        fieldAgentShareRate: c.fieldAgentShareRate,
        officeAgentShareRate: c.officeAgentShareRate,
        buyerAmount: c.buyerAmount,
        sellerAmount: c.sellerAmount,
        amount: c.amount,
        agencyAmount: c.agencyAmount,
        fieldAgentAmount: c.fieldAgentAmount,
        officeAgentAmount: c.officeAgentAmount,
        notes: opts.notes,
      },
      include: COMMISSION_INCLUDE,
    });
  }

  async findAll(filter: CommissionFilterDto, user: any) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);
      where.OR = [
        { transaction: { fieldAgentId: agentId } },
        { transaction: { officeAgentId: agentId } },
      ];
    } else if (filter.fieldAgentId) {
      where.transaction = { fieldAgentId: filter.fieldAgentId };
    } else if (filter.officeAgentId) {
      where.transaction = { officeAgentId: filter.officeAgentId };
    }

    if (filter.transactionId) {
      where.transactionId = filter.transactionId;
    }

    if (filter.paymentStatus) {
      where.paymentStatus = filter.paymentStatus;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.commission.count({ where }),
      this.prisma.commission.findMany({
        where,
        include: COMMISSION_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: COMMISSION_INCLUDE,
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${id} not found`);
    }

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);
      const tx = commission.transaction;
      if (tx.fieldAgentId !== agentId && tx.officeAgentId !== agentId) {
        throw new ForbiddenException("Access denied");
      }
    }

    return commission;
  }

  async create(dto: CreateCommissionDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Agents cannot create commissions");
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${dto.transactionId} not found`);
    }

    return this.createForTransaction(dto.transactionId, Number(transaction.amount), {
      buyerCommissionRate: dto.buyerCommissionRate,
      sellerCommissionRate: dto.sellerCommissionRate,
      fieldAgentShareRate: dto.fieldAgentShareRate,
      officeAgentShareRate: dto.officeAgentShareRate,
      notes: dto.notes,
    });
  }

  async update(id: string, dto: UpdateCommissionDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Agents cannot update commissions");
    }

    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: { transaction: true },
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${id} not found`);
    }

    const data: any = {};

    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.paymentStatus !== undefined) {
      data.paymentStatus = dto.paymentStatus;
      if (dto.paymentStatus === CommissionPaymentStatus.PAID && !commission.paidAt) {
        data.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
      } else if (dto.paymentStatus === CommissionPaymentStatus.PENDING) {
        data.paidAt = null;
      }
    } else if (dto.paidAt) {
      data.paidAt = new Date(dto.paidAt);
    }

    const rateChanged =
      dto.buyerCommissionRate !== undefined ||
      dto.sellerCommissionRate !== undefined ||
      dto.fieldAgentShareRate !== undefined ||
      dto.officeAgentShareRate !== undefined;

    if (rateChanged) {
      const calculated = await this.calculatePreview(Number(commission.transaction.amount), {
        buyerCommissionRate:
          dto.buyerCommissionRate ?? Number(commission.buyerCommissionRate ?? 0),
        sellerCommissionRate:
          dto.sellerCommissionRate ?? Number(commission.sellerCommissionRate ?? 0),
        fieldAgentShareRate: dto.fieldAgentShareRate ?? Number(commission.fieldAgentShareRate),
        officeAgentShareRate: dto.officeAgentShareRate ?? Number(commission.officeAgentShareRate),
      });
      Object.assign(data, calculated);
    }

    return this.prisma.commission.update({
      where: { id },
      data,
      include: COMMISSION_INCLUDE,
    });
  }

  async remove(id: string, user: any) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Only ADMIN can delete commissions");
    }

    const commission = await this.prisma.commission.findUnique({ where: { id } });
    if (!commission) {
      throw new NotFoundException(`Commission ${id} not found`);
    }

    await this.prisma.commission.delete({ where: { id } });
    return { message: `Commission ${id} deleted` };
  }

  async getStats(filter: CommissionStatsDto, user: any) {
    const where: any = {};

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);
      where.OR = [
        { transaction: { fieldAgentId: agentId } },
        { transaction: { officeAgentId: agentId } },
      ];
    } else if (filter.fieldAgentId) {
      where.transaction = { fieldAgentId: filter.fieldAgentId };
    } else if (filter.officeAgentId) {
      where.transaction = { officeAgentId: filter.officeAgentId };
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const commissions = await this.prisma.commission.findMany({
      where,
      select: {
        amount: true,
        buyerAmount: true,
        sellerAmount: true,
        agencyAmount: true,
        fieldAgentAmount: true,
        officeAgentAmount: true,
        paymentStatus: true,
      },
    });

    const paid = commissions.filter((c) => c.paymentStatus === CommissionPaymentStatus.PAID);
    const pending = commissions.filter(
      (c) => c.paymentStatus === CommissionPaymentStatus.PENDING,
    );
    const totalAmount = sumBy(commissions, "amount");

    return {
      totalCommissions: commissions.length,
      paidCommissions: paid.length,
      pendingCommissions: pending.length,
      totalAmount,
      paidAmount: sumBy(paid, "amount"),
      unpaidAmount: sumBy(pending, "amount"),
      totalBuyerAmount: sumBy(commissions, "buyerAmount"),
      totalSellerAmount: sumBy(commissions, "sellerAmount"),
      totalAgencyAmount: sumBy(commissions, "agencyAmount"),
      totalFieldAgentAmount: sumBy(commissions, "fieldAgentAmount"),
      totalOfficeAgentAmount: sumBy(commissions, "officeAgentAmount"),
      averageCommission: commissions.length ? round2(totalAmount / commissions.length) : 0,
    };
  }

  /** @deprecated use getConfig() */
  getDefaultRates() {
    return this.commissionConfig.getRates();
  }
}