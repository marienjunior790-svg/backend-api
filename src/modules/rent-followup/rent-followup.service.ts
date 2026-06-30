import { inject, injectable } from 'tsyringe';
import {
  LeaseStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  RentFollowUpType,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { N8nWebhookService } from '../../infrastructure/automation/n8n.service.js';
import { AutomationEvent } from '../../infrastructure/automation/automation.events.js';
import { decimalToNumber } from '../../shared/utils/response.util.js';
import { NotificationService } from '../notifications/notification.service.js';
import { RENT_FOLLOW_UP } from './rent-followup.constants.js';

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    organization: { select: { id: true; name: true; email: true; phone: true } };
    lease: {
      include: {
        tenant: { select: { firstName: true; lastName: true; phone: true; email: true } };
        apartment: { select: { label: true } };
      };
    };
  };
}>;

@injectable()
export class RentFollowUpService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(N8nWebhookService) private readonly n8n: N8nWebhookService,
    @inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  /** Job quotidien — parcours 3 complet */
  async runDailyFollowUp() {
    const monthlyPaymentsCreated = await this.ensureMonthlyPayments();
    const markedLate = await this.markLatePayments();
    const dueSoonReminders = await this.sendDueSoonReminders();
    const dunningSent = await this.sendProgressiveDunning();
    const ownerAlerts = await this.sendOwnerAlerts();

    return {
      monthlyPaymentsCreated,
      markedLate,
      dueSoonReminders,
      dunningSent,
      ownerAlerts,
    };
  }

  /** Crée les échéances du mois pour tous les contrats actifs */
  async ensureMonthlyPayments(): Promise<number> {
    const now = new Date();
    const periodMonth = now.getMonth() + 1;
    const periodYear = now.getFullYear();
    const dueDate = new Date(periodYear, periodMonth - 1, 5);

    const leases = await this.prisma.lease.findMany({
      where: { status: LeaseStatus.ACTIVE },
      select: { id: true, organizationId: true, monthlyRent: true },
    });

    let created = 0;
    for (const lease of leases) {
      const existing = await this.prisma.payment.findUnique({
        where: {
          leaseId_periodMonth_periodYear: {
            leaseId: lease.id,
            periodMonth,
            periodYear,
          },
        },
      });
      if (existing) continue;

      await this.prisma.payment.create({
        data: {
          organizationId: lease.organizationId,
          leaseId: lease.id,
          amount: lease.monthlyRent,
          dueDate,
          periodMonth,
          periodYear,
          status: PaymentStatus.PENDING,
        },
      });
      created++;
    }

    return created;
  }

  async markLatePayments(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toMark = await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        dueDate: { lt: today },
      },
      include: this.paymentInclude(),
    });

    if (toMark.length === 0) return 0;

    await this.prisma.payment.updateMany({
      where: { id: { in: toMark.map((p) => p.id) } },
      data: { status: PaymentStatus.LATE },
    });

    for (const payment of toMark) {
      const payload = this.toPaymentPayload(payment);
      this.emit(AutomationEvent.PAYMENT_LATE, payment, payload);
      await this.notifications.notifyOrganizationStaff({
        organizationId: payment.organizationId,
        type: NotificationType.PAYMENT_LATE,
        title: 'Loyer en retard',
        message: `${payload.tenantName} — ${payload.apartmentLabel} : ${payload.amount} XAF`,
        data: payload,
      });
    }

    return toMark.length;
  }

  async sendDueSoonReminders(): Promise<number> {
    const payments = await this.getPaymentsDueSoon(RENT_FOLLOW_UP.reminderDaysBefore);
    let sent = 0;

    for (const payment of payments) {
      const exists = await this.prisma.rentFollowUpLog.findUnique({
        where: {
          paymentId_type: { paymentId: payment.id, type: RentFollowUpType.DUE_SOON },
        },
      });
      if (exists) continue;

      const payload = this.toPaymentPayload(payment);
      await this.logFollowUp(payment.organizationId, payment.id, RentFollowUpType.DUE_SOON);
      this.emit(AutomationEvent.PAYMENT_DUE_SOON, payment, payload);

      await this.notifications.notifyOrganizationStaff({
        organizationId: payment.organizationId,
        type: NotificationType.PAYMENT_DUE_SOON,
        title: 'Rappel loyer à venir',
        message: `${payload.tenantName} — échéance le ${this.formatDate(payment.dueDate)}`,
        data: payload,
      });

      sent++;
    }

    return sent;
  }

  async sendProgressiveDunning(): Promise<number> {
    const latePayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.LATE },
      include: this.paymentInclude(),
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sent = 0;

    for (const payment of latePayments) {
      const due = new Date(payment.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLate = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      for (const day of RENT_FOLLOW_UP.dunningDaysAfterDue) {
        if (daysLate < day) continue;

        const type = RENT_FOLLOW_UP.dunningTypeByDay[day] as RentFollowUpType;
        const exists = await this.prisma.rentFollowUpLog.findUnique({
          where: { paymentId_type: { paymentId: payment.id, type } },
        });
        if (exists) continue;

        const payload = { ...this.toPaymentPayload(payment), dunningLevel: type, daysLate };
        await this.logFollowUp(payment.organizationId, payment.id, type);
        this.emit(AutomationEvent.PAYMENT_DUNNING, payment, payload);

        await this.notifications.notifyOrganizationStaff({
          organizationId: payment.organizationId,
          type: NotificationType.PAYMENT_DUNNING,
          title: `Relance loyer (J+${day})`,
          message: `${payload.tenantName} — ${payload.apartmentLabel} : impayé depuis ${daysLate} jours`,
          data: payload,
        });

        sent++;
      }
    }

    return sent;
  }

  async sendOwnerAlerts(): Promise<number> {
    const threshold = RENT_FOLLOW_UP.ownerAlertDaysAfterDue;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sent = 0;

    const latePayments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.LATE },
      include: this.paymentInclude(),
    });

    for (const payment of latePayments) {
      const due = new Date(payment.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLate = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLate < threshold) continue;

      const exists = await this.prisma.rentFollowUpLog.findUnique({
        where: {
          paymentId_type: { paymentId: payment.id, type: RentFollowUpType.OWNER_ALERT },
        },
      });
      if (exists) continue;

      const payload = { ...this.toPaymentPayload(payment), daysLate };
      await this.logFollowUp(payment.organizationId, payment.id, RentFollowUpType.OWNER_ALERT);
      this.emit(AutomationEvent.PAYMENT_OWNER_ALERT, payment, payload);

      await this.notifications.notifyOrganizationStaff({
        organizationId: payment.organizationId,
        type: NotificationType.PAYMENT_OWNER_ALERT,
        title: 'Alerte impayé — action requise',
        message: `${payload.tenantName} n'a pas payé depuis ${daysLate} jours (${payload.amount} XAF)`,
        data: payload,
      });

      sent++;
    }

    return sent;
  }

  /** Loyers à échéance dans N jours, sans rappel déjà envoyé */
  async getPaymentsDueSoon(days = RENT_FOLLOW_UP.reminderDaysBefore) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
        dueDate: { gte: now, lte: until },
        followUpLogs: { none: { type: RentFollowUpType.DUE_SOON } },
      },
      include: this.paymentInclude(),
      orderBy: { dueDate: 'asc' },
    });

    return payments;
  }

  async getRentReminders(days: number = RENT_FOLLOW_UP.reminderDaysBefore) {
    const payments = await this.getPaymentsDueSoon(days as (typeof RENT_FOLLOW_UP.reminderDaysBefore));
    return payments.map((p) => this.toPaymentPayload(p));
  }

  private paymentInclude() {
    return {
      organization: { select: { id: true, name: true, email: true, phone: true } },
      lease: {
        include: {
          tenant: { select: { firstName: true, lastName: true, phone: true, email: true } },
          apartment: { select: { label: true } },
        },
      },
    } as const;
  }

  private toPaymentPayload(payment: PaymentWithRelations) {
    return {
      paymentId: payment.id,
      organizationId: payment.organizationId,
      organizationName: payment.organization.name,
      organizationPhone: payment.organization.phone,
      organizationEmail: payment.organization.email,
      tenantName: `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`,
      tenantPhone: payment.lease.tenant.phone,
      tenantEmail: payment.lease.tenant.email,
      apartmentLabel: payment.lease.apartment.label,
      amount: decimalToNumber(payment.amount),
      amountPaid: decimalToNumber(payment.amountPaid),
      dueDate: payment.dueDate,
      periodMonth: payment.periodMonth,
      periodYear: payment.periodYear,
      status: payment.status,
    };
  }

  private async logFollowUp(organizationId: string, paymentId: string, type: RentFollowUpType) {
    await this.prisma.rentFollowUpLog.create({
      data: { organizationId, paymentId, type },
    });
  }

  private emit(event: AutomationEvent, payment: PaymentWithRelations, data: Record<string, unknown>) {
    this.n8n.emit({
      event,
      organizationId: payment.organizationId,
      organizationName: payment.organization.name,
      data,
    });
  }

  private formatDate(d: Date) {
    return new Date(d).toLocaleDateString('fr-FR');
  }
}
