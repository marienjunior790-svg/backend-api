import { inject, injectable } from 'tsyringe';
import { NotificationType, RentFollowUpType, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

export interface CreateNotificationInput {
  organizationId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@injectable()
export class NotificationService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForUser(organizationId: string, userId: string, filter?: 'unread' | 'read') {
    const where = {
      organizationId,
      OR: [{ userId }, { userId: null }],
      ...(filter === 'unread' ? { readAt: null } : {}),
      ...(filter === 'read' ? { readAt: { not: null } } : {}),
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Notifications personnelles (locataire sans organisation liée). */
  async listPersonal(userId: string, filter?: 'unread' | 'read') {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(filter === 'unread' ? { readAt: null } : {}),
        ...(filter === 'read' ? { readAt: { not: null } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(organizationId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        organizationId,
        OR: [{ userId }, { userId: null }],
      },
    });
    if (!notification) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        organizationId,
        readAt: null,
        OR: [{ userId }, { userId: null }],
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Notifie tous les admins/agents actifs de l'organisation */
  async notifyOrganizationStaff(input: Omit<CreateNotificationInput, 'userId'>) {
    const staff = await this.prisma.user.findMany({
      where: {
        organizationId: input.organizationId,
        isActive: true,
        role: { in: [UserRole.ORG_ADMIN, UserRole.AGENT] },
      },
      select: { id: true },
    });

    if (staff.length === 0) {
      return this.create({ ...input, userId: null });
    }

    return this.prisma.notification.createMany({
      data: staff.map((u) => ({
        organizationId: input.organizationId,
        userId: u.id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    });
  }
}
