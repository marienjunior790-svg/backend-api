import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { extendedPrisma } from '../../shared/utils/extended-prisma.js';
import { NotFoundError } from '../../shared/errors/app.error.js';

@injectable()
export class NotificationCenterService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  private db() {
    return extendedPrisma(this.prisma);
  }

  async summary(organizationId: string, userId: string) {
    const [unreadNotifications, unreadMessages, pendingTasks, pendingReminders] = await Promise.all([
      this.prisma.notification.count({ where: { organizationId, userId, readAt: null } }),
      this.db().message.count({ where: { organizationId, recipientId: userId, readAt: null } }),
      this.db().staffTask.count({ where: { organizationId, assignedToId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.db().reminder.count({ where: { organizationId, status: 'PENDING' } }),
    ]);
    return { unreadNotifications, unreadMessages, pendingTasks, pendingReminders };
  }

  async listMessages(organizationId: string, userId: string) {
    return this.db().message.findMany({
      where: {
        organizationId,
        OR: [{ senderId: userId }, { recipientId: userId }, { recipientId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async sendMessage(organizationId: string, senderId: string, data: { recipientId?: string; subject?: string; body: string; threadId?: string }) {
    return this.db().message.create({
      data: {
        organizationId,
        senderId,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body,
        threadId: data.threadId ?? `thread-${senderId}-${Date.now()}`,
      },
    });
  }

  async markMessageRead(organizationId: string, userId: string, messageId: string) {
    const msg = await this.db().message.findFirst({ where: { id: messageId, organizationId } });
    if (!msg) throw new NotFoundError('Message introuvable');
    return this.db().message.update({ where: { id: messageId }, data: { readAt: new Date() } });
  }

  async listReminders(organizationId: string) {
    return this.db().reminder.findMany({
      where: { organizationId },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });
  }

  async createReminder(organizationId: string, data: {
    type: string;
    title: string;
    message: string;
    targetUserId?: string;
    relatedType?: string;
    relatedId?: string;
    scheduledAt: string;
  }) {
    return this.db().reminder.create({
      data: {
        organizationId,
        type: data.type,
        title: data.title,
        message: data.message,
        targetUserId: data.targetUserId,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        scheduledAt: new Date(data.scheduledAt),
      },
    });
  }

  async sendReminder(organizationId: string, id: string) {
    const reminder = await this.db().reminder.findFirst({ where: { id, organizationId } });
    if (!reminder) throw new NotFoundError('Relance introuvable');
    return this.db().reminder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async listTasks(organizationId: string, userId: string) {
    return this.db().staffTask.findMany({
      where: {
        organizationId,
        OR: [{ assignedToId: userId }, { createdById: userId }, { assignedToId: null }],
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 100,
    });
  }

  async createTask(organizationId: string, createdById: string, data: { title: string; description?: string; assignedToId?: string; dueDate?: string }) {
    return this.db().staffTask.create({
      data: {
        organizationId,
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        createdById,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async completeTask(organizationId: string, id: string) {
    const task = await this.db().staffTask.findFirst({ where: { id, organizationId } });
    if (!task) throw new NotFoundError('Tâche introuvable');
    return this.db().staffTask.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });
  }
}
