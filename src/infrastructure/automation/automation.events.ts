/**
 * Événements métier émis vers n8n.
 * Chaque événement = webhook POST avec payload typé.
 */
export enum AutomationEvent {
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_DUE_SOON = 'payment.due_soon',
  PAYMENT_LATE = 'payment.late',
  PAYMENT_DUNNING = 'payment.dunning',
  PAYMENT_OWNER_ALERT = 'payment.owner_alert',
  MAINTENANCE_CREATED = 'maintenance.created',
  MAINTENANCE_ASSIGNED = 'maintenance.assigned',
  MAINTENANCE_COMPLETED = 'maintenance.completed',
  MAINTENANCE_CLOSED = 'maintenance.closed',
  LEASE_ACTIVATED = 'lease.activated',
  LEASE_EXPIRING = 'lease.expiring',
  SUBSCRIPTION_GRACE = 'subscription.grace_period',
  SUBSCRIPTION_SUSPENDED = 'subscription.suspended',
  SUBSCRIPTION_REACTIVATED = 'subscription.reactivated',
}

export interface AutomationPayload {
  event: AutomationEvent;
  timestamp: string;
  organizationId: string;
  organizationName?: string;
  data: Record<string, unknown>;
}

/** Chemins webhook n8n relatifs à N8N_WEBHOOK_BASE_URL */
export const N8N_WEBHOOK_PATHS: Record<AutomationEvent, string> = {
  [AutomationEvent.PAYMENT_RECEIVED]: '/immo-tec/payment-received',
  [AutomationEvent.PAYMENT_DUE_SOON]: '/immo-tec/payment-due-soon',
  [AutomationEvent.PAYMENT_LATE]: '/immo-tec/payment-late',
  [AutomationEvent.PAYMENT_DUNNING]: '/immo-tec/payment-dunning',
  [AutomationEvent.PAYMENT_OWNER_ALERT]: '/immo-tec/payment-owner-alert',
  [AutomationEvent.MAINTENANCE_CREATED]: '/immo-tec/maintenance-created',
  [AutomationEvent.MAINTENANCE_ASSIGNED]: '/immo-tec/maintenance-assigned',
  [AutomationEvent.MAINTENANCE_COMPLETED]: '/immo-tec/maintenance-completed',
  [AutomationEvent.MAINTENANCE_CLOSED]: '/immo-tec/maintenance-closed',
  [AutomationEvent.LEASE_ACTIVATED]: '/immo-tec/lease-activated',
  [AutomationEvent.LEASE_EXPIRING]: '/immo-tec/lease-expiring',
  [AutomationEvent.SUBSCRIPTION_GRACE]: '/immo-tec/subscription-grace',
  [AutomationEvent.SUBSCRIPTION_SUSPENDED]: '/immo-tec/subscription-suspended',
  [AutomationEvent.SUBSCRIPTION_REACTIVATED]: '/immo-tec/subscription-reactivated',
};
