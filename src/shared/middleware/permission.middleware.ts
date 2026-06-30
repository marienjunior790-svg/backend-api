import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { UnauthorizedError, ForbiddenError } from '../errors/app.error.js';
import { RbacService } from '../rbac/rbac.service.js';

export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const rbac = container.resolve(RbacService);
      let allowed = false;
      for (const p of permissions) {
        if (await rbac.hasPermission(req.user.role, p)) {
          allowed = true;
          break;
        }
      }
      if (!allowed) throw new ForbiddenError('Permission refusée');
      next();
    } catch (err) {
      next(err);
    }
  };
}
