import { Router } from 'express';
import { container } from 'tsyringe';
import { DashboardService } from './dashboard.service.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSuccess } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(DashboardService);

router.use(...orgStaffPipeline);

router.get(
  '/stats',
  requirePermission(Permission.DASHBOARD_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.getStats(getOrganizationId(req)));
  }),
);

router.get(
  '/export',
  requirePermission(Permission.REPORT_EXPORT),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const csv = await service.exportReport(orgId);
    await auditSuccess(req, AuditAction.REPORT_EXPORT, {
      resourceType: 'Report',
      newValue: { organizationId: orgId, type: 'dashboard' },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-dashboard.csv"');
    res.send(csv);
  }),
);

export default router;
