import { Router, type Request } from 'express';
import { container } from 'tsyringe';
import { MaintenanceService } from '../maintenance/maintenance.service.js';
import { maintenanceListQuerySchema } from '../maintenance/maintenance.schema.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { technicianPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { validateQuery } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, getPagination, sendSuccess, toPaginationMeta } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(MaintenanceService);

router.use(...technicianPipeline);

function actorFrom(req: Request) {
  const u = req.user!;
  return { userId: u.userId, name: u.email };
}

router.get(
  '/jobs',
  requirePermission(Permission.TECH_JOBS_VIEW),
  validateQuery(maintenanceListQuerySchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const userId = req.user!.userId;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const { status, priority } = req.query as {
      status?: import('@prisma/client').MaintenanceTicketStatus;
      priority?: import('@prisma/client').MaintenancePriority;
    };
    const { items, total } = await service.listForTechnician(orgId, userId, skip, limit, { status, priority });
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get('/jobs/:id', requirePermission(Permission.TECH_JOBS_VIEW), asyncHandler(async (req, res) => {
  sendSuccess(res, await service.getForTechnician(getOrganizationId(req), req.user!.userId, req.params.id));
}));

router.post('/jobs/:id/accept', requirePermission(Permission.TECH_JOBS_MANAGE), asyncHandler(async (req, res) => {
  const result = await withAudit(
    req,
    AuditAction.MAINTENANCE_ASSIGN,
    () => service.acceptJob(getOrganizationId(req), req.params.id, actorFrom(req)),
    (r) => ({ resourceType: 'MaintenanceTicket', resourceId: r.id }),
  );
  sendSuccess(res, result, 'Mission acceptée');
}));

router.post('/jobs/:id/start', requirePermission(Permission.TECH_JOBS_MANAGE), asyncHandler(async (req, res) => {
  const result = await withAudit(
    req,
    AuditAction.MAINTENANCE_UPDATE,
    () => service.start(getOrganizationId(req), req.params.id, actorFrom(req)),
    (r) => ({ resourceType: 'MaintenanceTicket', resourceId: r.id, newValue: { status: r.status } }),
  );
  sendSuccess(res, result, 'Intervention démarrée');
}));

router.post('/jobs/:id/complete', requirePermission(Permission.MAINTENANCE_CLOSE), asyncHandler(async (req, res) => {
  const result = await withAudit(
    req,
    AuditAction.MAINTENANCE_CLOSE,
    () => service.complete(getOrganizationId(req), req.params.id, actorFrom(req)),
    (r) => ({ resourceType: 'MaintenanceTicket', resourceId: r.id, newValue: { status: r.status } }),
  );
  sendSuccess(res, result, 'Intervention terminée');
}));

router.post('/jobs/:id/close', requirePermission(Permission.MAINTENANCE_CLOSE), asyncHandler(async (req, res) => {
  const result = await withAudit(
    req,
    AuditAction.MAINTENANCE_CLOSE,
    () => service.close(getOrganizationId(req), req.params.id, actorFrom(req)),
    (r) => ({ resourceType: 'MaintenanceTicket', resourceId: r.id, newValue: { status: r.status } }),
  );
  sendSuccess(res, result, 'Intervention clôturée');
}));

export default router;
