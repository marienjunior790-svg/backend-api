import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { UnauthorizedError } from '../errors/app.error.js';

/** Revalide le compte en base (actif, rôle, organisation) — évite les JWT obsolètes. */
export async function validateSessionMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next();
    const prisma = container.resolve(PrismaService);
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isActive: true, role: true, organizationId: true, email: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedError('Compte désactivé ou introuvable');
    }
    req.user = {
      userId: req.user.userId,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? req.ip ?? '';
  return req.ip ?? req.socket.remoteAddress ?? '';
}
