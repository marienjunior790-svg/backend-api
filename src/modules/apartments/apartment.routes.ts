import { Router } from 'express';
import { container } from 'tsyringe';
import { ApartmentService } from './apartment.service.js';
import { apartmentListQuerySchema, createApartmentSchema, updateApartmentSchema } from './apartment.schema.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { requireOrgResource } from '../../shared/middleware/resource-guard.middleware.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.middleware.js';
import { requireFeature } from '../../shared/middleware/feature.middleware.js';
import { FeatureKey } from '../../shared/constants/feature-keys.js';
import { asyncHandler, getPagination, sendSuccess, toPaginationMeta } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSuccess, withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(ApartmentService);

router.use(...orgStaffPipeline);

router.get(
  '/',
  requirePermission(Permission.APARTMENT_VIEW),
  validateQuery(apartmentListQuerySchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const { status, buildingId, search } = req.query as { status?: string; buildingId?: string; search?: string };
    const { items, total } = await service.list(orgId, page, limit, skip, {
      status: status as import('@prisma/client').ApartmentStatus | undefined,
      buildingId,
      search,
    });
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  requirePermission(Permission.APARTMENT_VIEW),
  requireOrgResource('apartment'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.get(getOrganizationId(req), req.params.id));
  }),
);

router.post(
  '/',
  requirePermission(Permission.APARTMENT_CREATE),
  requireFeature(FeatureKey.CREATE_LISTING),
  validateBody(createApartmentSchema),
  asyncHandler(async (req, res) => {
    const created = await withAudit(req, AuditAction.APARTMENT_CREATE, () => service.create(getOrganizationId(req), req.body), (r) => ({
      resourceType: 'Apartment',
      resourceId: r.id,
      newValue: { label: r.label, buildingId: r.buildingId },
    }));
    sendSuccess(res, created, 'Appartement créé', 201);
  }),
);

router.put(
  '/:id',
  requirePermission(Permission.APARTMENT_EDIT),
  requireOrgResource('apartment'),
  requireFeature(FeatureKey.EDIT_LISTING),
  validateBody(updateApartmentSchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const before = await service.get(orgId, req.params.id);
    const updated = await withAudit(req, AuditAction.APARTMENT_UPDATE, () => service.update(orgId, req.params.id, req.body), (r) => ({
      resourceType: 'Apartment',
      resourceId: r.id,
      oldValue: { label: before.label, status: before.status },
      newValue: { label: r.label, status: r.status },
    }));
    sendSuccess(res, updated, 'Appartement mis à jour');
  }),
);

router.delete(
  '/:id',
  requirePermission(Permission.APARTMENT_DELETE),
  requireOrgResource('apartment'),
  requireFeature(FeatureKey.DELETE_LISTING),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const existing = await service.get(orgId, req.params.id);
    await service.delete(orgId, req.params.id);
    await auditSuccess(req, AuditAction.APARTMENT_DELETE, {
      resourceType: 'Apartment',
      resourceId: req.params.id,
      oldValue: { label: existing.label },
    });
    sendSuccess(res, null, 'Appartement supprimé');
  }),
);

export default router;
