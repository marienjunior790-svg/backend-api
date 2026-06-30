import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { UserRole } from '@prisma/client';
import { FeatureKeyType } from '../../shared/constants/feature-keys.js';
import { FeatureService } from '../../modules/features/feature.service.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app.error.js';

export function requireFeature(featureKey: FeatureKeyType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (req.user.role === UserRole.SUPER_ADMIN) return next();

      const service = container.resolve(FeatureService);
      const enabled = await service.isFeatureEnabled(req.user.userId, req.user.role, featureKey);
      if (!enabled) {
        throw new ForbiddenError(
          `Cette action est désactivée pour votre compte (${featureKey})`,
          'FEATURE_DISABLED',
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
