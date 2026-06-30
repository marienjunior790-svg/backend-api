import { NextFunction, Request, Response } from 'express';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import { container } from 'tsyringe';
import { SubscriptionService } from '../../modules/subscriptions/subscription.service.js';
import { SubscriptionError } from '../errors/subscription.error.js';
import { asyncHandler } from '../utils/response.util.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Routes toujours autorisées même en GRACE_PERIOD / SUSPENDED */
function isExemptRoute(req: Request): boolean {
  const path = req.baseUrl + req.path;
  return path.includes('/subscription') || path.includes('/auth');
}

/**
 * Middleware SaaS — vérifie le statut d'abonnement de l'organisation.
 * - ACTIVE : accès complet (limites plan gérées dans les services)
 * - GRACE_PERIOD : lecture seule + gestion abonnement
 * - SUSPENDED / CANCELLED : lecture seule + réactivation abonnement
 */
export const verifySubscription = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === UserRole.SUPER_ADMIN) return next();
  if (!req.user?.organizationId) return next();

  const service = container.resolve(SubscriptionService);
  const context = await service.resolveAccessContext(req.user.organizationId);
  req.subscription = context;

  // Lecture toujours autorisée — les données client ne sont jamais supprimées
  if (req.method === 'GET') return next();

  if (isExemptRoute(req)) return next();

  if (context.status === SubscriptionStatus.ACTIVE) return next();

  if (context.status === SubscriptionStatus.GRACE_PERIOD) {
    throw new SubscriptionError(
      'Abonnement expiré — période de grâce. Renouvelez pour continuer à modifier vos données.',
      SubscriptionStatus.GRACE_PERIOD,
      'SUBSCRIPTION_GRACE_PERIOD',
    );
  }

  throw new SubscriptionError(
    'Subscription inactive',
    context.status,
    'SUBSCRIPTION_INACTIVE',
  );
});

/** Garde-fous standard pour routes métier protégées */
export const businessGuards = [
  // authMiddleware et requireOrganization sont appliqués par route
];
