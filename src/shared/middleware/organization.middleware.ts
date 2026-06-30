import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app.error.js';

/**
 * Vérifie que l'organisation de l'utilisateur est active et validée.
 * Obligatoire pour toutes les routes métier multi-tenant (sauf SUPER_ADMIN).
 */
export async function verifyOrganizationActiveMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next();
    if (req.user.role === UserRole.SUPER_ADMIN) return next();
    if (req.user.role === UserRole.TENANT) return next();

    const orgId = req.user.organizationId;
    if (!orgId) throw new UnauthorizedError('Organisation requise');

    const prisma = container.resolve(PrismaService);
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { isActive: true, isValidated: true },
    });

    if (!org) throw new UnauthorizedError('Organisation introuvable');
    if (!org.isActive) throw new ForbiddenError('Organisation désactivée');
    if (!org.isValidated) throw new ForbiddenError('Organisation en attente de validation');

    next();
  } catch (err) {
    next(err);
  }
}
