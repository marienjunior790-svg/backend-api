import { inject, injectable } from 'tsyringe';
import { OrganizationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app.error.js';
import { AuditService } from '../../shared/services/audit.service.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';

@injectable()
export class PlatformService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(AuditService) private readonly audit: AuditService,
  ) {}

  private assertSuperAdmin(role: UserRole) {
    if (role !== UserRole.SUPER_ADMIN) throw new ForbiddenError('Accès réservé au super administrateur');
  }

  async listOrganizations(role: UserRole) {
    this.assertSuperAdmin(role);
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, apartments: true, leases: true } },
      },
    });
  }

  async validateOrganization(role: UserRole, organizationId: string, isValidated: boolean, actorId?: string) {
    this.assertSuperAdmin(role);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organisation introuvable');
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { isValidated },
    });
    await this.audit.log({
      action: isValidated ? AuditAction.ORG_VALIDATE : AuditAction.ORG_DEACTIVATE,
      userId: actorId,
      userRole: role,
      resourceType: 'organization',
      resourceId: organizationId,
      oldValue: { isValidated: org.isValidated },
      newValue: { isValidated },
    });
    return updated;
  }

  async setOrganizationActive(role: UserRole, organizationId: string, isActive: boolean, actorId?: string) {
    this.assertSuperAdmin(role);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundError('Organisation introuvable');
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { isActive },
    });
    await this.audit.log({
      action: isActive ? AuditAction.ORG_ACTIVATE : AuditAction.ORG_DEACTIVATE,
      userId: actorId,
      userRole: role,
      resourceType: 'organization',
      resourceId: organizationId,
      oldValue: { isActive: org.isActive },
      newValue: { isActive },
    });
    return updated;
  }

  async listAgencies(role: UserRole) {
    this.assertSuperAdmin(role);
    return this.prisma.organization.findMany({
      where: { type: OrganizationType.AGENCY },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, apartments: true } } },
    });
  }

  async listUsers(role: UserRole, page = 1, limit = 50) {
    this.assertSuperAdmin(role);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, limit };
  }

  async listSubscriptions(role: UserRole) {
    this.assertSuperAdmin(role);
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { organization: { select: { id: true, name: true, type: true } } },
    });
  }

  async listAuditLogs(role: UserRole, page = 1, limit = 50) {
    this.assertSuperAdmin(role);
    return this.audit.list(page, limit);
  }

  async exportAuditLogs(role: UserRole) {
    this.assertSuperAdmin(role);
    const result = await this.audit.list(1, 10000);
    return this.audit.toCsv(result.items);
  }

  platformBillingStub(role: UserRole) {
    this.assertSuperAdmin(role);
    return { invoices: [], message: 'Module facturation — à connecter' };
  }

  platformWorkflowsStub(role: UserRole) {
    this.assertSuperAdmin(role);
    return { workflows: [], message: 'Workflows n8n — à connecter' };
  }

  platformAiStub(role: UserRole) {
    this.assertSuperAdmin(role);
    return { models: ['LIA'], status: 'active' };
  }

  platformSettingsStub(role: UserRole) {
    this.assertSuperAdmin(role);
    return { maintenanceMode: false, defaultLocale: 'fr' };
  }

  async platformStats(role: UserRole) {
    this.assertSuperAdmin(role);
    const [organizations, users, apartments, applications, tickets] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.apartment.count(),
      this.prisma.rentalApplication.count(),
      this.prisma.maintenanceTicket.count(),
    ]);
    return { organizations, users, apartments, applications, tickets };
  }
}
