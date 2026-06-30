import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

/** Contexte abonnement attaché à chaque requête authentifiée */
export interface SubscriptionContext {
  subscriptionId: string | null;
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  gracePeriodEndsAt: Date | null;
  limits: {
    maxApartments: number | null;
    maxUsers: number | null;
    pdfLeaseContract: boolean;
    pdfPaymentReceipt: boolean;
    analytics: boolean;
    aiAssistant: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      subscription?: SubscriptionContext;
    }
  }
}

export {};
