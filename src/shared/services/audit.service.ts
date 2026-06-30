import { inject, injectable } from 'tsyringe';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

export interface AuditLogInput {
  organizationId?: string | null;
  userId?: string | null;
  userRole?: UserRole | null;
  ipAddress?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  success?: boolean;
  errorMessage?: string | null;
}

export interface AuditListFilters {
  organizationId?: string;
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

export interface AuditListResult {
  items: Array<{
    id: string;
    organizationId: string | null;
    userId: string | null;
    userRole: UserRole | null;
    ipAddress: string | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    oldValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    success: boolean;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
}

@injectable()
export class AuditService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  private get auditLog() {
    return (this.prisma as unknown as {
      auditLog: {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
        findMany: (args: Record<string, unknown>) => Promise<AuditListResult['items']>;
        count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
      };
    }).auditLog;
  }

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.auditLog.create({
        data: {
          organizationId: input.organizationId ?? undefined,
          userId: input.userId ?? undefined,
          userRole: input.userRole ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          oldValue: input.oldValue,
          newValue: input.newValue,
          success: input.success ?? true,
          errorMessage: input.errorMessage ?? undefined,
        },
      });
    } catch {
      // Ne jamais bloquer la requête métier si l'audit échoue
    }
  }

  async logFromRequest(
    req: import('express').Request,
    action: string,
    details: Omit<AuditLogInput, 'action' | 'userId' | 'userRole' | 'organizationId' | 'ipAddress' | 'success'> & { success?: boolean },
  ): Promise<void> {
    const { getClientIp } = await import('../middleware/session.middleware.js');
    await this.log({
      organizationId: req.user?.organizationId ?? undefined,
      userId: req.user?.userId,
      userRole: req.user?.role,
      ipAddress: getClientIp(req),
      action,
      ...details,
    });
  }

  async list(page = 1, limit = 50, filters: AuditListFilters = {}): Promise<AuditListResult> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  toCsv(rows: AuditListResult['items']): string {
    const header = 'id,createdAt,action,success,userId,userRole,organizationId,resourceType,resourceId,ipAddress';
    const lines = rows.map((r) =>
      [
        r.id,
        r.createdAt.toISOString(),
        r.action,
        r.success,
        r.userId ?? '',
        r.userRole ?? '',
        r.organizationId ?? '',
        r.resourceType ?? '',
        r.resourceId ?? '',
        r.ipAddress ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...lines].join('\n');
  }
}
