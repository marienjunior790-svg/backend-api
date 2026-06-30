import { SubscriptionStatus } from '@prisma/client';
import { AppError } from './app.error.js';

/** Erreur abonnement — format JSON compatible SaaS */
export class SubscriptionError extends AppError {
  constructor(
    message: string,
    public readonly subscriptionStatus: SubscriptionStatus,
    code = 'SUBSCRIPTION_INACTIVE',
  ) {
    super(403, message, code);
    this.name = 'SubscriptionError';
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      subscriptionStatus: this.subscriptionStatus,
    };
  }
}

export class PlanLimitError extends AppError {
  constructor(message: string, public readonly limitKey: string) {
    super(403, message, 'PLAN_LIMIT_EXCEEDED');
    this.name = 'PlanLimitError';
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      limit: this.limitKey,
    };
  }
}
