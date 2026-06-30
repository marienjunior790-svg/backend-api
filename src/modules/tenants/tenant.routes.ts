import { Router } from 'express';
import { container } from 'tsyringe';
import { TenantService } from './tenant.service.js';
import { createTenantSchema, tenantListQuerySchema, updateTenantSchema } from './tenant.schema.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { requireOrgResource } from '../../shared/middleware/resource-guard.middleware.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, getPagination, sendSuccess, toPaginationMeta } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSuccess, withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(TenantService);

router.use(...orgStaffPipeline);

router.get(
  '/',
  requirePermission(Permission.TENANT_VIEW),
  validateQuery(tenantListQuerySchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const { search } = req.query as { search?: string };
    const { items, total } = await service.list(orgId, page, limit, skip, search);
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  requirePermission(Permission.TENANT_VIEW),
  requireOrgResource('tenant'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.get(getOrganizationId(req), req.params.id));
  }),
);

router.post(
  '/',
  requirePermission(Permission.TENANT_CREATE),
  validateBody(createTenantSchema),
  asyncHandler(async (req, res) => {
    const created = await withAudit(req, AuditAction.TENANT_CREATE, () => service.create(getOrganizationId(req), req.body), (r) => ({
      resourceType: 'Tenant',
      resourceId: r.id,
      newValue: { firstName: r.firstName, lastName: r.lastName },
    }));
    sendSuccess(res, created, 'Locataire créé', 201);
  }),
);

router.put(
  '/:id',
  requirePermission(Permission.TENANT_EDIT),
  requireOrgResource('tenant'),
  validateBody(updateTenantSchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const before = await service.get(orgId, req.params.id);
    const updated = await withAudit(req, AuditAction.TENANT_UPDATE, () => service.update(orgId, req.params.id, req.body), (r) => ({
      resourceType: 'Tenant',
      resourceId: r.id,
      oldValue: { firstName: before.firstName, lastName: before.lastName },
      newValue: { firstName: r.firstName, lastName: r.lastName },
    }));
    sendSuccess(res, updated, 'Locataire mis à jour');
  }),
);

router.delete(
  '/:id',
  requirePermission(Permission.TENANT_DELETE),
  requireOrgResource('tenant'),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const existing = await service.get(orgId, req.params.id);
    await service.delete(orgId, req.params.id);
    await auditSuccess(req, AuditAction.TENANT_DELETE, {
      resourceType: 'Tenant',
      resourceId: req.params.id,
      oldValue: { firstName: existing.firstName, lastName: existing.lastName },
    });
    sendSuccess(res, null, 'Locataire supprimé');
  }),
);

export default router;
