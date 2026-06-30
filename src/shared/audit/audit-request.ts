import { Request } from 'express';
import { container } from 'tsyringe';
import { Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../services/audit.service.js';
import { getClientIp } from '../middleware/session.middleware.js';

export interface AuditDetails {
  resourceType?: string;
  resourceId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  errorMessage?: string | null;
}

function resolveAudit(req: Request) {
  const audit = container.resolve(AuditService);
  return {
    audit,
    base: {
      organizationId: req.user?.organizationId ?? undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
      ipAddress: getClientIp(req),
    },
  };
}

export async function auditSuccess(req: Request, action: string, details: AuditDetails = {}): Promise<void> {
  const { audit, base } = resolveAudit(req);
  await audit.log({ ...base, action, ...details, success: true });
}

export async function auditFailure(req: Request, action: string, details: AuditDetails = {}): Promise<void> {
  const { audit, base } = resolveAudit(req);
  await audit.log({ ...base, action, ...details, success: false });
}

/** Journalisation des jobs cron / n8n (sans utilisateur connecté) */
export async function auditSystem(action: string, details: AuditDetails & { organizationId?: string } = {}): Promise<void> {
  const audit = container.resolve(AuditService);
  await audit.log({
    organizationId: details.organizationId,
    userRole: UserRole.SYSTEM_BOT,
    action,
    resourceType: details.resourceType,
    resourceId: details.resourceId,
    oldValue: details.oldValue,
    newValue: details.newValue,
    success: true,
  });
}

export async function withAudit<T>(
  req: Request,
  action: string,
  fn: () => Promise<T>,
  details?: AuditDetails | ((result: T) => AuditDetails),
): Promise<T> {
  try {
    const result = await fn();
    const meta = typeof details === 'function' ? details(result) : details ?? {};
    await auditSuccess(req, action, meta);
    return result;
  } catch (err) {
    await auditFailure(req, action, {
      errorMessage: err instanceof Error ? err.message : 'Erreur',
    });
    throw err;
  }
}
