
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionFilterDto } from "./dto/transaction-filter.dto";

import { Role } from "../common/enums/role.enum";

import {
  TransactionStatus,
  CommissionPaymentStatus,
} from "@prisma/client";

import { calculateCommissionAmounts } from "../commissions/commission-calculator";
import { CommissionConfigService } from "../commissions/commission-config.service";

const TX_INCLUDE = {
  property: {
    select: {
      id: true,
      reference: true,
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

  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },

  fieldAgent: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },

  officeAgent: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },

  commission: true,
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionConfig: CommissionConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Récupérer l'identifiant de l'agent.
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
   * Gestion des erreurs de calcul.
   */
  private calculateCommission(
    amount: number,
    buyerRate: number,
    sellerRate: number,
    fieldRate: number,
    officeRate: number,
  ) {
    try {
      return calculateCommissionAmounts(
        amount,
        buyerRate,
        sellerRate,
        fieldRate,
        officeRate,
      );
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Erreur de calcul de commission",
      );
    }
  }

  /**
   * LISTE DES TRANSACTIONS
   */
  async findAll(filter: TransactionFilterDto, user: any) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(
      Math.max(1, filter.limit ?? 20),
      100,
    );

    const skip = (page - 1) * limit;

    const where: any = {};
    const andConditions: any[] = [];

    // Restriction des agents.
    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);

      andConditions.push({
        OR: [
          { fieldAgentId: agentId },
          { officeAgentId: agentId },
        ],
      });
    } else {
      if (filter.fieldAgentId) {
        where.fieldAgentId = filter.fieldAgentId;
      }

      if (filter.officeAgentId) {
        where.officeAgentId = filter.officeAgentId;
      }
    }

    const txType = filter.transactionType ?? filter.type;

    if (txType) {
      where.type = txType;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.propertyId) {
      where.propertyId = filter.propertyId;
    }

    if (filter.clientId) {
      where.clientId = filter.clientId;
    }

    // Recherche globale.
    // AND évite d'écraser la restriction d'accès des agents.
    if (filter.search?.trim()) {
      const search = filter.search.trim();

      andConditions.push({
        OR: [
          {
            property: {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            property: {
              city: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            client: {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            client: {
              lastName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            fieldAgent: {
              user: {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            fieldAgent: {
              user: {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            officeAgent: {
              user: {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            officeAgent: {
              user: {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),

      this.prisma.transaction.findMany({
        where,
        include: TX_INCLUDE,
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
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * DÉTAIL D'UNE TRANSACTION
   */
  async findOne(id: string, user: any) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: TX_INCLUDE,
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${id} not found`,
      );
    }

    if (user.role === Role.AGENT) {
      const agentId = await this.getAgentId(user.id);

      if (
        transaction.fieldAgentId !== agentId &&
        transaction.officeAgentId !== agentId
      ) {
        throw new ForbiddenException("Access denied");
      }
    }

    return transaction;
  }

  /**
   * CRÉATION D'UNE TRANSACTION
   *
   * Les taux sont récupérés depuis CommissionConfigService.
   * Des taux personnalisés peuvent être transmis dans le DTO.
   */
  async create(dto: CreateTransactionDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException(
        "Agents cannot create transactions directly",
      );
    }

    const fieldAgentId = dto.fieldAgentId;
    const officeAgentId = dto.officeAgentId;

    if (!fieldAgentId || !officeAgentId) {
      throw new BadRequestException(
        "fieldAgentId and officeAgentId are required",
      );
    }

    const createCommission = dto.createCommission !== false;

    const status =
      dto.status ?? TransactionStatus.PENDING;

    // Calculer la commission avant la création.
    let calculated: ReturnType<typeof calculateCommissionAmounts> | null =
      null;

    if (createCommission) {
      const rates = await this.commissionConfig.getRates();

      calculated = this.calculateCommission(
        dto.amount,

        dto.buyerCommissionRate ??
          rates.buyerCommissionRate,

        dto.sellerCommissionRate ??
          rates.sellerCommissionRate,

        dto.fieldAgentShareRate ??
          rates.fieldAgentShareRate,

        dto.officeAgentShareRate ??
          rates.officeAgentShareRate,
      );
    }

    // Transaction + commission + statut du bien atomiques.
    const transaction = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.transaction.create({
          data: {
            propertyId: dto.propertyId,
            clientId: dto.clientId,
            ownerId: dto.ownerId,
            fieldAgentId,
            officeAgentId,

            type: dto.transactionType,
            amount: dto.amount,

            date: dto.date
              ? new Date(dto.date)
              : null,

            status,
            notes: dto.notes,
          },
        });

        if (calculated) {
          await tx.commission.create({
            data: {
              transactionId: created.id,

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
              fieldAgentAmount:
                calculated.fieldAgentAmount,

              officeAgentAmount:
                calculated.officeAgentAmount,

              paymentStatus:
                CommissionPaymentStatus.PENDING,
            },
          });
        }

        if (status === TransactionStatus.COMPLETED) {
          const newStatus =
            dto.transactionType === "SALE"
              ? "SOLD"
              : "RENTED";

          await tx.property.update({
            where: {
              id: dto.propertyId,
            },
            data: {
              status: newStatus,
            },
          });
        }

        return tx.transaction.findUnique({
          where: {
            id: created.id,
          },
          include: TX_INCLUDE,
        });
      },
    );

    if (!transaction) {
      throw new NotFoundException(
        "Transaction created but could not be retrieved",
      );
    }

    // Notification après validation de la transaction.
    const txTypeLabel =
      transaction.type === "SALE" ? "vente" : "location";

    const clientName =
      `${transaction.client.firstName} ${transaction.client.lastName}`;

    await this.notifications.create({
      agentIds: [
        transaction.fieldAgentId,
        transaction.officeAgentId,
      ],

      actorUserId: user.id,
      clientId: transaction.clientId,

      title: `Nouvelle transaction de ${txTypeLabel}`,

      body:
        `Transaction créée pour ${clientName} — ` +
        `bien "${transaction.property.title}" ` +
        `(${transaction.property.city}).`,

      link: `/crm/transactions/${transaction.id}`,
    });

    return transaction;
  }

  /**
   * MODIFICATION D'UNE TRANSACTION
   *
   * Si le montant change :
   * - On conserve les anciens taux de cette commission.
   * - On recalcule les montants acheteur et vendeur.
   * - On recalcule la part des agents.
   * - On recalcule automatiquement la part agence.
   */
  async update(
    id: string,
    dto: UpdateTransactionDto,
    user: any,
  ) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException(
        "Agents cannot update transactions",
      );
    }

    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        commission: true,

        property: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },

        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Transaction ${id} not found`,
      );
    }

    const data: any = {};

    if (dto.amount !== undefined) {
      data.amount = dto.amount;
    }

    if (dto.date !== undefined) {
      data.date = dto.date
        ? new Date(dto.date)
        : null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    if (dto.fieldAgentId !== undefined) {
      data.fieldAgentId = dto.fieldAgentId;
    }

    if (dto.officeAgentId !== undefined) {
      data.officeAgentId = dto.officeAgentId;
    }

    const newAmount =
      dto.amount !== undefined
        ? dto.amount
        : Number(existing.amount);

    let calculated:
      | ReturnType<typeof calculateCommissionAmounts>
      | null = null;

    // Recalcul de la commission si le montant change.
    if (dto.amount !== undefined && existing.commission) {
      calculated = this.calculateCommission(
        newAmount,

        Number(existing.commission.buyerCommissionRate),

        Number(existing.commission.sellerCommissionRate),

        Number(existing.commission.fieldAgentShareRate),

        Number(existing.commission.officeAgentShareRate),
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.transaction.update({
          where: { id },
          data,
        });

        if (calculated && existing.commission) {
          await tx.commission.update({
            where: {
              id: existing.commission.id,
            },
            data: calculated,
          });
        }

        if (
          dto.status === TransactionStatus.COMPLETED &&
          existing.status !== TransactionStatus.COMPLETED
        ) {
          const newStatus =
            existing.type === "SALE"
              ? "SOLD"
              : "RENTED";

          await tx.property.update({
            where: {
              id: existing.propertyId,
            },
            data: {
              status: newStatus,
            },
          });
        }

        return tx.transaction.findUnique({
          where: { id },
          include: TX_INCLUDE,
        });
      },
    );

    if (!result) {
      throw new NotFoundException(
        `Transaction ${id} not found after update`,
      );
    }

    // Notification si la transaction est finalisée.
    if (
      dto.status === TransactionStatus.COMPLETED &&
      existing.status !== TransactionStatus.COMPLETED
    ) {
      const txTypeLabel =
        existing.type === "SALE" ? "vente" : "location";

      await this.notifications.create({
        agentIds: [
          existing.fieldAgentId,
          existing.officeAgentId,
        ],

        actorUserId: user.id,
        clientId: existing.clientId,

        title: `Transaction ${txTypeLabel} finalisée`,

        body:
          `La transaction pour "${existing.property.title}" ` +
          `(${existing.property.city}) est marquée comme terminée.`,

        link: `/crm/transactions/${existing.id}`,
      });
    }

    return result;
  }

  /**
   * SUPPRESSION D'UNE TRANSACTION
   */
  async remove(id: string, user: any) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only ADMIN can delete transactions",
      );
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction ${id} not found`,
      );
    }

    await this.prisma.transaction.delete({
      where: { id },
    });

    return {
      message: `Transaction ${id} deleted`,
    };
  }
}
