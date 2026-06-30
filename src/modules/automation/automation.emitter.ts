import { inject, injectable } from 'tsyringe';
import { N8nWebhookService } from '../../infrastructure/automation/n8n.service.js';
import { AutomationEvent } from '../../infrastructure/automation/automation.events.js';

/** Émission d'événements métier vers n8n (sans dépendance circulaire) */
@injectable()
export class AutomationEmitter {
  constructor(@inject(N8nWebhookService) private readonly n8n: N8nWebhookService) {}

  paymentReceived(params: {
    organizationId: string;
    organizationName?: string;
    paymentId: string;
    amount: number;
    tenantName: string;
    tenantPhone: string;
    apartmentLabel: string;
    receiptUrl?: string | null;
  }) {
    this.n8n.emit({
      event: AutomationEvent.PAYMENT_RECEIVED,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      data: { ...params },
    });
  }

  leaseActivated(params: {
    organizationId: string;
    organizationName?: string;
    leaseId: string;
    tenantName: string;
    tenantPhone: string;
    apartmentLabel: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
  }) {
    this.n8n.emit({
      event: AutomationEvent.LEASE_ACTIVATED,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      data: { ...params },
    });
  }

  subscriptionReactivated(params: {
    organizationId: string;
    organizationName?: string;
    plan: string;
    expiresAt: Date | null;
  }) {
    this.n8n.emit({
      event: AutomationEvent.SUBSCRIPTION_REACTIVATED,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      data: { ...params },
    });
  }
}
