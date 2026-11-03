import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CommissionConfigService } from "./commission-config.service";
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
    return this.commissionConfig.updateRates(dto);
  }

  async calculatePreview(
    transactionAmount: number,
    commissionRate?: number,
    fieldAgentShareRate?: number,
    officeAgentShareRate?: number,
  ) {
    const defaults = await this.commissionConfig.getRates();
    return calculateCommissionAmounts(
      transactionAmount,
      commissionRate ?? defaults.commissionRate,
      fieldAgentShareRate ?? defaults.fieldAgentShareRate,
      officeAgentShareRate ?? defaults.officeAgentShareRate,
    );
  }

  /**
   * Crée une commission pour une transaction (utilisé par TransactionsService).
   */
  async createForTransaction(
    transactionId: string,
    transactionAmount: number,
    commissionRate?: number,
    fieldAgentShareRate?: number,
    officeAgentShareRate?: number,
    notes?: string,
  ) {
    const existing = await this.prisma.commission.findUnique({
      where: { transactionId },
    });
    if (existing) {
      throw new BadRequestException(
        `Commission already exists for transaction ${transactionId}`,
      );
    }

    const defaults = await this.commissionConfig.getRates();
    const calculated = calculateCommissionAmounts(
      transactionAmount,
      commissionRate ?? defaults.commissionRate,
      fieldAgentShareRate ?? defaults.fieldAgentShareRate,
      officeAgentShareRate ?? defaults.officeAgentShareRate,
    );

    return this.prisma.commission.create({
      data: {
        transactionId,
        commissionRate: calculated.commissionRate,
        fieldAgentShareRate: calculated.fieldAgentShareRate,
        officeAgentShareRate: calculated.officeAgentShareRate,
        amount: calculated.amount,
        agencyAmount: calculated.agencyAmount,
        fieldAgentAmount: calculated.fieldAgentAmount,
        officeAgentAmount: calculated.officeAgentAmount,
        notes,
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

    return this.createForTransaction(
      dto.transactionId,
      Number(transaction.amount),
      dto.commissionRate,
      dto.fieldAgentShareRate,
      dto.officeAgentShareRate,
      dto.notes,
    );
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
      dto.commissionRate !== undefined ||
      dto.fieldAgentShareRate !== undefined ||
      dto.officeAgentShareRate !== undefined;

    if (rateChanged) {
      const calculated = calculateCommissionAmounts(
        Number(commission.transaction.amount),
        dto.commissionRate ?? Number(commission.commissionRate),
        dto.fieldAgentShareRate ?? Number(commission.fieldAgentShareRate),
        dto.officeAgentShareRate ?? Number(commission.officeAgentShareRate),
      );
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

    const [totalCommissions, paidCommissions, pendingCommissions, commissions] =
      await this.prisma.$transaction([
        this.prisma.commission.count({ where }),
        this.prisma.commission.count({
          where: { ...where, paymentStatus: CommissionPaymentStatus.PAID },
        }),
        this.prisma.commission.count({
          where: { ...where, paymentStatus: CommissionPaymentStatus.PENDING },
        }),
        this.prisma.commission.findMany({
          where,
          select: {
            amount: true,
            agencyAmount: true,
            fieldAgentAmount: true,
            officeAgentAmount: true,
            paymentStatus: true,
          },
        }),
      ]);

    const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    const paidAmount = commissions
      .filter((c) => c.paymentStatus === CommissionPaymentStatus.PAID)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidAmount = commissions
      .filter((c) => c.paymentStatus === CommissionPaymentStatus.PENDING)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
      totalAgencyAmount: Math.round(
        commissions.reduce((s, c) => s + Number(c.agencyAmount), 0) * 100,
      ) / 100,
      totalFieldAgentAmount: Math.round(
        commissions.reduce((s, c) => s + Number(c.fieldAgentAmount), 0) * 100,
      ) / 100,
      totalOfficeAgentAmount: Math.round(
        commissions.reduce((s, c) => s + Number(c.officeAgentAmount), 0) * 100,
      ) / 100,
      averageCommission:
        totalCommissions > 0
          ? Math.round((totalAmount / totalCommissions) * 100) / 100
          : 0,
    };
  }

  /** @deprecated use getConfig() */
  getDefaultRates() {
    return this.commissionConfig.getRates();
  }
}
