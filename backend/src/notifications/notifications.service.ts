import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../common/enums/role.enum";

const NOTIFICATION_SELECT = {
  id: true,
  agentId: true,
  clientId: true,
  title: true,
  body: true,
  isRead: true,
  readAt: true,
  link: true,
  createdAt: true,
  agent: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
};

// Aucun destinataire ne peut avoir cet id : utilisateur sans profil agent → liste vide
const NO_AGENT = "__none__";

const isManager = (user: any) => user.role === Role.ADMIN || user.role === Role.MANAGER;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Chaque notification a un destinataire (agentId).
   * - « mine » (par défaut, tous les rôles) : uniquement les notifications reçues par l'utilisateur.
   * - « team » (gérant/admin) : celles de toute l'équipe, en lecture seule.
   */
  private buildWhere(
    user: any,
    filter?: { scope?: "mine" | "team"; agentId?: string; clientId?: string; isRead?: boolean },
  ) {
    const where: any = {};

    if (filter?.scope === "team" && isManager(user)) {
      if (filter.agentId) where.agentId = filter.agentId;
      if (filter.clientId) where.clientId = filter.clientId;
    } else {
      where.agentId = user.agentId ?? NO_AGENT;
    }

    if (filter?.isRead !== undefined) {
      where.isRead = filter.isRead;
    }

    return where;
  }

  async findAll(
    user: any,
    filter?: { scope?: "mine" | "team"; agentId?: string; clientId?: string; limit?: number; unreadOnly?: boolean },
  ) {
    const limit = Math.min(filter?.limit ?? 50, 100);

    const where = this.buildWhere(user, {
      scope: filter?.scope,
      agentId: filter?.agentId,
      clientId: filter?.clientId,
      isRead: filter?.unreadOnly ? false : undefined,
    });

    const [total, unreadCount, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return {
      data,
      meta: { total, unreadCount, limit },
    };
  }

  /** Badge de la cloche : seulement les notifications non lues de l'utilisateur. */
  async getUnreadCount(user: any): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { ...this.buildWhere(user), isRead: false },
    });
    return { count };
  }

  /** On ne marque comme lue que ses propres notifications (pas celles d'un collègue). */
  async markAsRead(id: string, user: any) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, agentId: true },
    });
    if (!notification || notification.agentId !== user.agentId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
      select: NOTIFICATION_SELECT,
    });
  }

  async markAllAsRead(user: any) {
    const { count } = await this.prisma.notification.updateMany({
      where: { ...this.buildWhere(user), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: "Toutes vos notifications ont été marquées comme lues", count };
  }

  /**
   * Envoie une notification à un ou plusieurs agents.
   * - doublons et destinataires vides ignorés ;
   * - l'auteur de l'action (actorUserId) n'est pas notifié de ce qu'il vient de faire lui-même ;
   * - ne lève jamais d'erreur : une notification ratée ne doit pas annuler l'action métier.
   */
  async create(payload: {
    agentId?: string | null;
    agentIds?: (string | null | undefined)[];
    actorUserId?: string;
    clientId?: string | null;
    title: string;
    body: string;
    link?: string | null;
  }) {
    const { agentId, agentIds = [], actorUserId, clientId, title, body, link } = payload;
    try {
      let recipients = [...new Set([agentId, ...agentIds].filter((id): id is string => !!id))];
      if (actorUserId && recipients.length > 0) {
        const actor = await this.prisma.agent.findUnique({ where: { userId: actorUserId }, select: { id: true } });
        recipients = recipients.filter((id) => id !== actor?.id);
      }
      if (recipients.length === 0) return { count: 0 };

      return await this.prisma.notification.createMany({
        data: recipients.map((id) => ({
          agentId: id,
          clientId: clientId ?? undefined,
          title,
          body,
          link: link ?? undefined,
        })),
      });
    } catch (e) {
      this.logger.warn(`Notification « ${title} » non créée : ${(e as Error).message}`);
      return { count: 0 };
    }
  }
}
