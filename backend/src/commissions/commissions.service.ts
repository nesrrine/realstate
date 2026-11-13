
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import {
  CommissionConfigService,
  CommissionRates,
} from "./commission-config.service";

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
      property: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      fieldAgent: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      officeAgent: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  },
};

const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

const sumBy = (list: any[], key: string): number =>
  round2(
    list.reduce(
      (sum, item) => sum + Number(item[key] ?? 0),
      0,
    ),
  );

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionConfig: CommissionConfigService,
  ) {}

  /**
   * Récupérer l'identifiant de l'agent connecté.
   */
  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      throw new ForbiddenException("No agent profile found");
    }

    return agent.id;
  }

  /**
   * Récupérer la configuration des commissions.
   */
  async getConfig(): Promise<CommissionRates> {
    return this.commissionConfig.getRates();
  }

  /**
   * Modifier les taux de commissions.
   *
   * Acheteur : modifiable
   * Vendeur : modifiable
   * Agent terrain : modifiable
   * Agent bureau : modifiable
   * Agence : calcul automatique du reste
   */
  async updateConfig(dto: UpdateCommissionConfigDto) {
    return this.commissionConfig.updateRates(dto);
  }

  /**
   * Calculer une commission sans enregistrer.
   *
   * Les taux non fournis utilisent les paramètres enregistrés.
   */
  async calculatePreview(
    transactionAmount: number,
    opts: Partial<CommissionRates> = {},
  ) {
    const defaults = await this.commissionConfig.getRates();

    try {
      return calculateCommissionAmounts(
        transactionAmount,

        opts.buyerCommissionRate ??
          defaults.buyerCommissionRate,

        opts.sellerCommissionRate ??
          defaults.sellerCommissionRate,

        opts.fieldAgentShareRate ??
          defaults.fieldAgentShareRate,

        opts.officeAgentShareRate ??
          defaults.officeAgentShareRate,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors du calcul de la commission";

      throw new BadRequestException(message);
    }
  }

  /**
   * Créer automatiquement une commission pour une transaction.
   * Utilisé par TransactionsService.
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

    const calculated = await this.calculatePreview(
      transactionAmount,
      opts,
    );

    return this.prisma.commission.create({
      data: {
        transactionId,

        commissionRate: calculated.commissionRate,

        buyerCommissionRate:
          calculated.buyerCommissionRate,

        sellerCommissionRate:
          calculated.sellerCommissionRate,

        fieldAgentShareRate:
          calculated.fieldAgentShareRate,

        officeAgentShareRate:
          calculated.officeAgentShareRate,

        buyerAmount: calculated.buyerAmount,
        sellerAmount: calculated.sellerAmount,
        amount: calculated.amount,

        agencyAmount: calculated.agencyAmount,
        fieldAgentAmount: calculated.fieldAgentAmount,
        officeAgentAmount: calculated.officeAgentAmount,

        notes: opts.notes,
      },
      include: COMMISSION_INCLUDE,
    });
  }

  /**
   * Liste paginée des commissions.
   */
  async findAll(filter: CommissionFilterDto, user: any) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(
      Math.max(1, filter.limit ?? 20),
      100,
    );

    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);

      where.OR = [
        {
          transaction: {
            fieldAgentId: agentId,
          },
        },
        {
          transaction: {
            officeAgentId: agentId,
          },
        },
      ];
    } else {
      const transactionFilter: any = {};

      if (filter.fieldAgentId) {
        transactionFilter.fieldAgentId = filter.fieldAgentId;
      }

      if (filter.officeAgentId) {
        transactionFilter.officeAgentId = filter.officeAgentId;
      }

      if (Object.keys(transactionFilter).length > 0) {
        where.transaction = transactionFilter;
      }
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
        orderBy: {
          createdAt: "desc",
        },
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

  /**
   * Détail d'une commission.
   */
  async findOne(id: string, user: any) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: COMMISSION_INCLUDE,
    });

    if (!commission) {
      throw new NotFoundException(
        `Commission ${id} not found`,
      );
    }

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);
      const transaction = commission.transaction;

      if (
        transaction.fieldAgentId !== agentId &&
        transaction.officeAgentId !== agentId
      ) {
        throw new ForbiddenException("Access denied");
      }
    }

    return commission;
  }

  /**
   * Création manuelle d'une commission.
   */
  async create(dto: CreateCommissionDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException(
        "Agents cannot create commissions",
      );
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: {
        id: dto.transactionId,
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${dto.transactionId} not found`,
      );
    }

    return this.createForTransaction(
      dto.transactionId,
      Number(transaction.amount),
      {
        buyerCommissionRate: dto.buyerCommissionRate,
        sellerCommissionRate: dto.sellerCommissionRate,
        fieldAgentShareRate: dto.fieldAgentShareRate,
        officeAgentShareRate: dto.officeAgentShareRate,
        notes: dto.notes,
      },
    );
  }

  /**
   * Modifier une commission existante.
   *
   * Si un taux change, tous les montants sont recalculés.
   * Les taux historiques sont conservés si aucun nouveau taux
   * n'est fourni.
   */
  async update(
    id: string,
    dto: UpdateCommissionDto,
    user: any,
  ) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException(
        "Agents cannot update commissions",
      );
    }

    const commission = await this.prisma.commission.findUnique({
      where: { id },
      include: {
        transaction: true,
      },
    });

    if (!commission) {
      throw new NotFoundException(
        `Commission ${id} not found`,
      );
    }

    const data: any = {};

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    // Gestion du paiement.
    if (dto.paymentStatus !== undefined) {
      data.paymentStatus = dto.paymentStatus;

      if (
        dto.paymentStatus === CommissionPaymentStatus.PAID &&
        !commission.paidAt
      ) {
        data.paidAt = dto.paidAt
          ? new Date(dto.paidAt)
          : new Date();
      }

      if (
        dto.paymentStatus === CommissionPaymentStatus.PENDING
      ) {
        data.paidAt = null;
      }
    } else if (dto.paidAt) {
      data.paidAt = new Date(dto.paidAt);
    }

    // Vérifier si les taux ont changé.
    const rateChanged =
      dto.buyerCommissionRate !== undefined ||
      dto.sellerCommissionRate !== undefined ||
      dto.fieldAgentShareRate !== undefined ||
      dto.officeAgentShareRate !== undefined;

    if (rateChanged) {
      const calculated = await this.calculatePreview(
        Number(commission.transaction.amount),
        {
          buyerCommissionRate:
            dto.buyerCommissionRate ??
            Number(commission.buyerCommissionRate),

          sellerCommissionRate:
            dto.sellerCommissionRate ??
            Number(commission.sellerCommissionRate),

          fieldAgentShareRate:
            dto.fieldAgentShareRate ??
            Number(commission.fieldAgentShareRate),

          officeAgentShareRate:
            dto.officeAgentShareRate ??
            Number(commission.officeAgentShareRate),
        },
      );

      Object.assign(data, calculated);
    }

    return this.prisma.commission.update({
      where: { id },
      data,
      include: COMMISSION_INCLUDE,
    });
  }

  /**
   * Supprimer une commission.
   * ADMIN uniquement.
   */
  async remove(id: string, user: any) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only ADMIN can delete commissions",
      );
    }

    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException(
        `Commission ${id} not found`,
      );
    }

    await this.prisma.commission.delete({
      where: { id },
    });

    return {
      message: `Commission ${id} deleted`,
    };
  }

  /**
   * Statistiques des commissions.
   */
  async getStats(
    filter: CommissionStatsDto,
    user: any,
  ) {
    const where: any = {};

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);

      where.OR = [
        {
          transaction: {
            fieldAgentId: agentId,
          },
        },
        {
          transaction: {
            officeAgentId: agentId,
          },
        },
      ];
    } else {
      const transactionFilter: any = {};

      if (filter.fieldAgentId) {
        transactionFilter.fieldAgentId = filter.fieldAgentId;
      }

      if (filter.officeAgentId) {
        transactionFilter.officeAgentId = filter.officeAgentId;
      }

      if (Object.keys(transactionFilter).length > 0) {
        where.transaction = transactionFilter;
      }
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};

      if (filter.startDate) {
        where.createdAt.gte = new Date(filter.startDate);
      }

      if (filter.endDate) {
        const endDate = new Date(filter.endDate);

        // Inclure toute la journée de fin.
        endDate.setHours(23, 59, 59, 999);

        where.createdAt.lte = endDate;
      }
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

    const paid = commissions.filter(
      (commission) =>
        commission.paymentStatus ===
        CommissionPaymentStatus.PAID,
    );

    const pending = commissions.filter(
      (commission) =>
        commission.paymentStatus ===
        CommissionPaymentStatus.PENDING,
    );

    const totalAmount = sumBy(commissions, "amount");

    return {
      totalCommissions: commissions.length,

      paidCommissions: paid.length,
      pendingCommissions: pending.length,

      totalAmount,

      paidAmount: sumBy(paid, "amount"),
      unpaidAmount: sumBy(pending, "amount"),

      totalBuyerAmount: sumBy(
        commissions,
        "buyerAmount",
      ),

      totalSellerAmount: sumBy(
        commissions,
        "sellerAmount",
      ),

      totalAgencyAmount: sumBy(
        commissions,
        "agencyAmount",
      ),

      totalFieldAgentAmount: sumBy(
        commissions,
        "fieldAgentAmount",
      ),

      totalOfficeAgentAmount: sumBy(
        commissions,
        "officeAgentAmount",
      ),

      averageCommission:
        commissions.length > 0
          ? round2(totalAmount / commissions.length)
          : 0,
    };
  }

  /**
   * Compatibilité avec les anciennes routes.
   * @deprecated Utiliser getConfig().
   */
  getDefaultRates() {
    return this.commissionConfig.getRates();
  }
}
