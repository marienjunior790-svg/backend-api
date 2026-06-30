import { SubscriptionError, PlanLimitError } from '../../src/shared/errors/subscription.error.js';
import { SubscriptionStatus } from '@prisma/client';

describe('Subscription errors', () => {
  it('SubscriptionError produit un JSON SaaS standard', () => {
    const err = new SubscriptionError('Subscription inactive', SubscriptionStatus.SUSPENDED);
    expect(err.statusCode).toBe(403);
    expect(err.toJSON()).toEqual({
      success: false,
      error: 'Subscription inactive',
      code: 'SUBSCRIPTION_INACTIVE',
      subscriptionStatus: SubscriptionStatus.SUSPENDED,
    });
  });

  it('PlanLimitError inclut la clé de limite', () => {
    const err = new PlanLimitError('Limite biens atteinte', 'maxApartments');
    expect(err.toJSON()).toMatchObject({
      success: false,
      code: 'PLAN_LIMIT_EXCEEDED',
      limit: 'maxApartments',
    });
  });
});
