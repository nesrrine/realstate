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
import { TransactionStatus, CommissionPaymentStatus } from "@prisma/client";
import { calculateCommissionAmounts } from "../commissions/commission-calculator";
import { CommissionConfigService } from "../commissions/commission-config.service";

const TX_INCLUDE = {
  property: { select: { id: true, reference: true, title: true, city: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
  fieldAgent: {
    select: {
      id: true,
      userId: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  officeAgent: {
    select: {
      id: true,
      userId: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  commission: true,
};

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private commissionConfig: CommissionConfigService,
    private notifications: NotificationsService,
  ) {}

  private async getAgentId(userId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("No agent profile found");
    return agent.id;
  }

  async findAll(filter: TransactionFilterDto, user: any) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (user.role === Role.AGENT) where.fieldAgentId = await this.getAgentId(user.id);
    else if (filter.fieldAgentId) where.fieldAgentId = filter.fieldAgentId;

    const txType = filter.transactionType ?? filter.type;
    if (txType) where.type = txType;
    if (filter.status) where.status = filter.status;
    if (filter.propertyId) where.propertyId = filter.propertyId;
    if (filter.clientId) where.clientId = filter.clientId;

    if (filter.search) {
      where.OR = [
        { property: { title: { contains: filter.search, mode: "insensitive" } } },
        { property: { city: { contains: filter.search, mode: "insensitive" } } },
        { client: { firstName: { contains: filter.search, mode: "insensitive" } } },
        { client: { lastName: { contains: filter.search, mode: "insensitive" } } },
        { fieldAgent: { user: { firstName: { contains: filter.search, mode: "insensitive" } } } },
        { fieldAgent: { user: { lastName: { contains: filter.search, mode: "insensitive" } } } },
        { officeAgent: { user: { firstName: { contains: filter.search, mode: "insensitive" } } } },
        { officeAgent: { user: { lastName: { contains: filter.search, mode: "insensitive" } } } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: TX_INCLUDE,
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
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string, user: any) {
    const tx = await this.prisma.transaction.findUnique({ where: { id }, include: TX_INCLUDE });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    if (user.role === Role.AGENT && tx.fieldAgent.userId !== user.id)
      throw new ForbiddenException("Access denied");
    return tx;
  }

  async create(dto: CreateTransactionDto, user: any) {
    if (user.role === Role.AGENT) {
      throw new ForbiddenException("Agents cannot create transactions directly");
    }

    let fieldAgentId = dto.fieldAgentId;
    let officeAgentId = dto.officeAgentId;

    if (!fieldAgentId || !officeAgentId) {
      if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
        throw new BadRequestException("fieldAgentId and officeAgentId are required");
      }
      fieldAgentId = await this.getAgentId(user.id);
      officeAgentId = fieldAgentId;
    }

    const createCommission = dto.createCommission !== false;
    const status = dto.status ?? TransactionStatus.PENDING;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          propertyId: dto.propertyId,
          clientId: dto.clientId,
          ownerId: dto.ownerId,
          fieldAgentId,
          officeAgentId,
          type: dto.transactionType,
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : null,
          status,
          notes: dto.notes,
        },
        include: TX_INCLUDE,
      });

      if (createCommission) {
        const rates = await this.commissionConfig.getRates();
        const calculated = calculateCommissionAmounts(
          dto.amount,
          dto.commissionRate ?? rates.commissionRate,
          rates.fieldAgentShareRate,
          rates.officeAgentShareRate,
        );
        await tx.commission.create({
          data: {
            transactionId: transaction.id,
            commissionRate: calculated.commissionRate,
            fieldAgentShareRate: calculated.fieldAgentShareRate,
            officeAgentShareRate: calculated.officeAgentShareRate,
            amount: calculated.amount,
            agencyAmount: calculated.agencyAmount,
            fieldAgentAmount: calculated.fieldAgentAmount,
            officeAgentAmount: calculated.officeAgentAmount,
            paymentStatus: CommissionPaymentStatus.PENDING,
          },
        });
      }

      if (status === TransactionStatus.COMPLETED) {
        const newStatus = dto.transactionType === "SALE" ? "SOLD" : "RENTED";
        await tx.property.update({
          where: { id: dto.propertyId },
          data: { status: newStatus },
        });
      }

      return tx.transaction.findUnique({ where: { id: transaction.id }, include: TX_INCLUDE });
    });

    const txTypeLabel = transaction.type === "SALE" ? "vente" : "location";
    const clientName = `${transaction.client.firstName} ${transaction.client.lastName}`;

    await this.notifications.create({
      agentIds: [transaction.fieldAgentId, transaction.officeAgentId],
      actorUserId: user.id,
      clientId: transaction.clientId,
      title: `Nouvelle transaction de ${txTypeLabel}`,
      body: `Transaction créée pour ${clientName} — bien "${transaction.property.title}" (${transaction.property.city}).`,
      link: `/crm/transactions/${transaction.id}`,
    });

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto, user: any) {
    if (user.role === Role.AGENT) throw new ForbiddenException("Agents cannot update transactions");
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        commission: true,
        property: { select: { id: true, title: true, city: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    });
    if (!existing) throw new NotFoundException(`Transaction ${id} not found`);

    const data: any = { ...dto };
    if (dto.date) data.date = new Date(dto.date);

    await this.prisma.transaction.update({
      where: { id },
      data,
    });

    if (dto.amount !== undefined && existing.commission) {
      const calculated = calculateCommissionAmounts(
        dto.amount,
        Number(existing.commission.commissionRate),
        Number(existing.commission.fieldAgentShareRate),
        Number(existing.commission.officeAgentShareRate),
      );
      await this.prisma.commission.update({
        where: { id: existing.commission.id },
        data: calculated,
      });
    }

    if (
      dto.status === TransactionStatus.COMPLETED &&
      existing.status !== TransactionStatus.COMPLETED
    ) {
      const newStatus = existing.type === "SALE" ? "SOLD" : "RENTED";
      await this.prisma.property.update({
        where: { id: existing.propertyId },
        data: { status: newStatus },
      });

      const txTypeLabel = existing.type === "SALE" ? "vente" : "location";
      await this.notifications.create({
        agentIds: [existing.fieldAgentId, existing.officeAgentId],
        actorUserId: user.id,
        clientId: existing.clientId,
        title: `Transaction ${txTypeLabel} finalisée`,
        body: `La transaction pour "${existing.property.title}" (${existing.property.city}) est marquée comme terminée.`,
        link: `/crm/transactions/${existing.id}`,
      });
    }

    return this.prisma.transaction.findUnique({ where: { id }, include: TX_INCLUDE });
  }

  async remove(id: string, user: any) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException("Only ADMIN can delete transactions");
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    await this.prisma.transaction.delete({ where: { id } });
    return { message: `Transaction ${id} deleted` };
  }
}
