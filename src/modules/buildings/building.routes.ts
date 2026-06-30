import { Router } from 'express';
import { container } from 'tsyringe';
import { BuildingService } from './building.service.js';
import { createBuildingSchema, generateApartmentsSchema, listQuerySchema, updateBuildingSchema } from './building.schema.js';
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
const service = container.resolve(BuildingService);

router.use(...orgStaffPipeline);

router.get(
  '/',
  requirePermission(Permission.BUILDING_VIEW),
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const { items, total } = await service.list(orgId, page, limit, skip);
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  requirePermission(Permission.BUILDING_VIEW),
  requireOrgResource('building'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.get(getOrganizationId(req), req.params.id));
  }),
);

router.post(
  '/',
  requirePermission(Permission.BUILDING_CREATE),
  validateBody(createBuildingSchema),
  asyncHandler(async (req, res) => {
    const created = await withAudit(req, AuditAction.BUILDING_CREATE, () => service.create(getOrganizationId(req), req.body), (r) => ({
      resourceType: 'Building',
      resourceId: r.id,
      newValue: { name: r.name, address: r.address },
    }));
    sendSuccess(res, created, 'Immeuble créé', 201);
  }),
);

router.put(
  '/:id',
  requirePermission(Permission.BUILDING_EDIT),
  requireOrgResource('building'),
  validateBody(updateBuildingSchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const before = await service.get(orgId, req.params.id);
    const updated = await withAudit(req, AuditAction.BUILDING_UPDATE, () => service.update(orgId, req.params.id, req.body), (r) => ({
      resourceType: 'Building',
      resourceId: r.id,
      oldValue: { name: before.name },
      newValue: { name: r.name },
    }));
    sendSuccess(res, updated, 'Immeuble mis à jour');
  }),
);

router.delete(
  '/:id',
  requirePermission(Permission.BUILDING_DELETE),
  requireOrgResource('building'),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const existing = await service.get(orgId, req.params.id);
    await service.delete(orgId, req.params.id);
    await auditSuccess(req, AuditAction.BUILDING_DELETE, {
      resourceType: 'Building',
      resourceId: req.params.id,
      oldValue: { name: existing.name },
    });
    sendSuccess(res, null, 'Immeuble supprimé');
  }),
);

router.post(
  '/:id/generate-apartments',
  requirePermission(Permission.APARTMENT_CREATE),
  requireOrgResource('building'),
  validateBody(generateApartmentsSchema),
  asyncHandler(async (req, res) => {
    const items = await withAudit(
      req,
      AuditAction.APARTMENT_BULK_CREATE,
      () => service.generateApartments(getOrganizationId(req), req.params.id, req.body),
      (r) => ({
        resourceType: 'Building',
        resourceId: req.params.id,
        newValue: { count: r.length },
      }),
    );
    sendSuccess(res, items, `${items.length} appartement(s) généré(s)`, 201);
  }),
);

export default router;
