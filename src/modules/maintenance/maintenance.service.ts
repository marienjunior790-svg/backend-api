import { inject, injectable } from 'tsyringe';
import {
  ApartmentStatus,
  LeaseStatus,
  MaintenanceEventType,
  MaintenancePriority,
  MaintenanceTicketStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors/app.error.js';
import { NotificationService } from '../notifications/notification.service.js';
import { N8nWebhookService } from '../../infrastructure/automation/n8n.service.js';
import { AutomationEvent } from '../../infrastructure/automation/automation.events.js';

const URGENT_KEYWORDS = ['urgent', 'fuite', 'gaz', 'électri', 'electri', 'incendie', 'inondation', 'panne'];
const LOW_KEYWORDS = ['peinture', 'nettoyage', 'porte', 'ampoule', 'cosmétique'];

export function classifyPriority(title: string, description?: string | null): MaintenancePriority {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (URGENT_KEYWORDS.some((k) => text.includes(k))) return MaintenancePriority.HIGH;
  if (LOW_KEYWORDS.some((k) => text.includes(k))) return MaintenancePriority.LOW;
  return MaintenancePriority.MEDIUM;
}

const ticketInclude = {
  apartment: { include: { building: true } },
  tenant: true,
  lease: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true, phone: true } },
  reportedBy: { select: { id: true, firstName: true, lastName: true } },
  events: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.MaintenanceTicketInclude;

@injectable()
export class MaintenanceService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(NotificationService) private readonly notifications: NotificationService,
    @inject(N8nWebhookService) private readonly n8n: N8nWebhookService,
  ) {}

  async list(
    organizationId: string,
    skip: number,
    limit: number,
    filters: { status?: MaintenanceTicketStatus; priority?: MaintenancePriority; apartmentId?: string },
  ) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.apartmentId && { apartmentId: filters.apartmentId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          apartment: { include: { building: true } },
          tenant: true,
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return { items, total };
  }

  async get(organizationId: string, id: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({
      where: { id, organizationId },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundError('Ticket introuvable');
    return ticket;
  }

  async create(
    organizationId: string,
    data: {
      apartmentId: string;
      tenantId?: string;
      leaseId?: string;
      title: string;
      description?: string;
      priority?: MaintenancePriority;
    },
    actor?: { userId: string; name: string },
  ) {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: data.apartmentId, organizationId },
    });
    if (!apartment) throw new NotFoundError('Appartement introuvable');

    const priority = data.priority ?? classifyPriority(data.title, data.description);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceTicket.create({
        data: {
          organizationId,
          apartmentId: data.apartmentId,
          tenantId: data.tenantId,
          leaseId: data.leaseId,
          title: data.title,
          description: data.description,
          priority,
          status: MaintenanceTicketStatus.OPEN,
          reportedById: actor?.userId,
        },
        include: ticketInclude,
      });

      await tx.maintenanceTicketEvent.create({
        data: {
          ticketId: created.id,
          organizationId,
          type: MaintenanceEventType.CREATED,
          message: `Ticket créé — priorité ${priorityLabel(priority)}`,
          actorId: actor?.userId,
          actorName: actor?.name,
        },
      });

      if (priority === MaintenancePriority.HIGH || priority === MaintenancePriority.CRITICAL) {
        await tx.apartment.update({
          where: { id: data.apartmentId },
          data: { status: ApartmentStatus.MAINTENANCE },
        });
      }

      return created;
    });

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const payload = this.toWebhookPayload(ticket, org?.name);

    this.n8n.emit({ event: AutomationEvent.MAINTENANCE_CREATED, organizationId, organizationName: org?.name, data: payload });
    await this.notifications.notifyOrganizationStaff({
      organizationId,
      type: NotificationType.MAINTENANCE_CREATED,
      title: 'Nouveau ticket maintenance',
      message: `${ticket.title} — ${ticket.apartment.label}`,
      data: payload,
    });

    return this.get(organizationId, ticket.id);
  }

  async assign(
    organizationId: string,
    id: string,
    data: { assignedToId?: string; assignedToName?: string; note?: string },
    actor?: { userId: string; name: string },
  ) {
    const ticket = await this.get(organizationId, id);
    if (ticket.status === MaintenanceTicketStatus.CLOSED || ticket.status === MaintenanceTicketStatus.CANCELLED) {
      throw new ValidationError('Ticket déjà clôturé');
    }

    let assigneeName = data.assignedToName;
    if (data.assignedToId) {
      const user = await this.prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId, isActive: true },
      });
      if (!user) throw new NotFoundError('Technicien introuvable');
      assigneeName = `${user.firstName} ${user.lastName}`;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceTicket.update({
        where: { id },
        data: {
          assignedToId: data.assignedToId ?? null,
          assignedToName: assigneeName ?? null,
          status: MaintenanceTicketStatus.ASSIGNED,
        },
      });
      await tx.maintenanceTicketEvent.create({
        data: {
          ticketId: id,
          organizationId,
          type: MaintenanceEventType.ASSIGNED,
          message: `Assigné à ${assigneeName ?? 'technicien'}`,
          actorId: actor?.userId,
          actorName: actor?.name,
        },
      });
      if (data.note) {
        await tx.maintenanceTicketEvent.create({
          data: {
            ticketId: id,
            organizationId,
            type: MaintenanceEventType.NOTE_ADDED,
            message: data.note,
            actorId: actor?.userId,
            actorName: actor?.name,
          },
        });
      }
    });

    const updated = await this.get(organizationId, id);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const payload = { ...this.toWebhookPayload(updated, org?.name), assigneeName };

    this.n8n.emit({ event: AutomationEvent.MAINTENANCE_ASSIGNED, organizationId, organizationName: org?.name, data: payload });
    await this.notifications.notifyOrganizationStaff({
      organizationId,
      type: NotificationType.MAINTENANCE_ASSIGNED,
      title: 'Ticket assigné',
      message: `${updated.title} → ${assigneeName}`,
      data: payload,
    });

    return updated;
  }

  async start(organizationId: string, id: string, actor?: { userId: string; name: string }) {
    return this.transition(organizationId, id, MaintenanceTicketStatus.IN_PROGRESS, 'Intervention démarrée', actor);
  }

  async complete(organizationId: string, id: string, actor?: { userId: string; name: string }) {
    const updated = await this.transition(organizationId, id, MaintenanceTicketStatus.COMPLETED, 'Intervention terminée', actor);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const payload = this.toWebhookPayload(updated, org?.name);
    this.n8n.emit({ event: AutomationEvent.MAINTENANCE_COMPLETED, organizationId, organizationName: org?.name, data: payload });
    await this.notifications.notifyOrganizationStaff({
      organizationId,
      type: NotificationType.MAINTENANCE_COMPLETED,
      title: 'Intervention terminée',
      message: updated.title,
      data: payload,
    });
    return updated;
  }

  async close(organizationId: string, id: string, actor?: { userId: string; name: string }) {
    const ticket = await this.get(organizationId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceTicket.update({
        where: { id },
        data: { status: MaintenanceTicketStatus.CLOSED, closedAt: new Date() },
      });
      await tx.maintenanceTicketEvent.create({
        data: {
          ticketId: id,
          organizationId,
          type: MaintenanceEventType.CLOSED,
          message: 'Ticket clôturé et archivé',
          actorId: actor?.userId,
          actorName: actor?.name,
        },
      });

      const openCount = await tx.maintenanceTicket.count({
        where: {
          apartmentId: ticket.apartmentId,
          status: { notIn: [MaintenanceTicketStatus.CLOSED, MaintenanceTicketStatus.CANCELLED] },
          id: { not: id },
        },
      });

      if (openCount === 0) {
        const activeLease = await tx.lease.findFirst({
          where: { apartmentId: ticket.apartmentId, status: LeaseStatus.ACTIVE },
        });
        await tx.apartment.update({
          where: { id: ticket.apartmentId },
          data: { status: activeLease ? ApartmentStatus.OCCUPIED : ApartmentStatus.AVAILABLE },
        });
      }
    });

    const updated = await this.get(organizationId, id);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    this.n8n.emit({
      event: AutomationEvent.MAINTENANCE_CLOSED,
      organizationId,
      organizationName: org?.name,
      data: this.toWebhookPayload(updated, org?.name),
    });
    return updated;
  }

  async addNote(organizationId: string, id: string, message: string, actor?: { userId: string; name: string }) {
    await this.get(organizationId, id);
    await this.prisma.maintenanceTicketEvent.create({
      data: {
        ticketId: id,
        organizationId,
        type: MaintenanceEventType.NOTE_ADDED,
        message,
        actorId: actor?.userId,
        actorName: actor?.name,
      },
    });
    return this.get(organizationId, id);
  }

  async update(
    organizationId: string,
    id: string,
    data: { title?: string; description?: string; priority?: MaintenancePriority },
    actor?: { userId: string; name: string },
  ) {
    const existing = await this.get(organizationId, id);
    if (existing.status === MaintenanceTicketStatus.CLOSED) {
      throw new ValidationError('Ticket clôturé');
    }

    await this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority && { priority: data.priority }),
      },
    });

    if (data.priority && data.priority !== existing.priority) {
      await this.prisma.maintenanceTicketEvent.create({
        data: {
          ticketId: id,
          organizationId,
          type: MaintenanceEventType.PRIORITY_SET,
          message: `Priorité : ${priorityLabel(data.priority)}`,
          actorId: actor?.userId,
          actorName: actor?.name,
        },
      });
    }

    return this.get(organizationId, id);
  }

  private async transition(
    organizationId: string,
    id: string,
    status: MaintenanceTicketStatus,
    message: string,
    actor?: { userId: string; name: string },
  ) {
    const ticket = await this.get(organizationId, id);
    if (ticket.status === MaintenanceTicketStatus.CLOSED) {
      throw new ValidationError('Ticket clôturé');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceTicket.update({ where: { id }, data: { status } });
      await tx.maintenanceTicketEvent.create({
        data: {
          ticketId: id,
          organizationId,
          type: MaintenanceEventType.STATUS_CHANGED,
          message,
          actorId: actor?.userId,
          actorName: actor?.name,
        },
      });
    });

    return this.get(organizationId, id);
  }

  async listForTechnician(
    organizationId: string,
    userId: string,
    skip: number,
    limit: number,
    filters: { status?: MaintenanceTicketStatus; priority?: MaintenancePriority },
  ) {
    const where: Prisma.MaintenanceTicketWhereInput = {
      organizationId,
      assignedToId: userId,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
    };

    const [items, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          apartment: { include: { building: true } },
          tenant: true,
        },
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return { items, total };
  }

  async getForTechnician(organizationId: string, userId: string, id: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({
      where: { id, organizationId, assignedToId: userId },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundError('Intervention introuvable');
    return ticket;
  }

  async acceptJob(organizationId: string, id: string, actor: { userId: string; name: string }) {
    const ticket = await this.getForTechnician(organizationId, actor.userId, id);
    if (ticket.status !== MaintenanceTicketStatus.OPEN && ticket.status !== MaintenanceTicketStatus.ASSIGNED) {
      throw new ValidationError('Cette mission ne peut plus être acceptée');
    }
    return this.transition(organizationId, id, MaintenanceTicketStatus.ASSIGNED, 'Mission acceptée par le technicien', actor);
  }

  private toWebhookPayload(
    ticket: Prisma.MaintenanceTicketGetPayload<{ include: typeof ticketInclude }>,
    organizationName?: string,
  ) {
    return {
      ticketId: ticket.id,
      organizationName,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      apartmentLabel: ticket.apartment.label,
      buildingName: ticket.apartment.building?.name,
      tenantName: ticket.tenant ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}` : null,
      tenantPhone: ticket.tenant?.phone ?? null,
      assignedToName: ticket.assignedToName
        ?? (ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : null),
    };
  }
}

function priorityLabel(p: MaintenancePriority) {
  const map: Record<MaintenancePriority, string> = {
    LOW: 'Normale',
    MEDIUM: 'Haute',
    HIGH: 'Urgent',
    CRITICAL: 'Urgent',
  };
  return map[p];
}

export { priorityLabel };
