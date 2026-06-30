import { Router } from 'express';
import { container } from 'tsyringe';
import { InspectionService } from './inspection.service.js';
import {
  createInspectionSchema,
  inspectionListQuerySchema,
  signInspectionSchema,
  updateInspectionSchema,
} from './inspection.schema.js';
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
const service = container.resolve(InspectionService);

router.use(...orgStaffPipeline);

router.get(
  '/',
  requirePermission(Permission.INSPECTION_VIEW),
  validateQuery(inspectionListQuerySchema),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const q = req.query as { apartmentId?: string; leaseId?: string; type?: string };
    const { items, total } = await service.list(orgId, skip, limit, q);
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  requirePermission(Permission.INSPECTION_VIEW),
  requireOrgResource('propertyInspection'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.get(getOrganizationId(req), req.params.id));
  }),
);

router.post(
  '/',
  requirePermission(Permission.INSPECTION_CREATE),
  validateBody(createInspectionSchema),
  asyncHandler(async (req, res) => {
    const created = await withAudit(
      req,
      AuditAction.INSPECTION_CREATE,
      () => service.create(getOrganizationId(req), req.user!.userId, req.body),
      (r) => ({ resourceType: 'PropertyInspection', resourceId: (r as { id: string }).id }),
    );
    sendSuccess(res, created, 'État des lieux créé', 201);
  }),
);

router.patch(
  '/:id',
  requirePermission(Permission.INSPECTION_EDIT),
  requireOrgResource('propertyInspection'),
  validateBody(updateInspectionSchema),
  asyncHandler(async (req, res) => {
    const updated = await withAudit(
      req,
      AuditAction.INSPECTION_UPDATE,
      () => service.update(getOrganizationId(req), req.params.id, req.body),
      () => ({ resourceType: 'PropertyInspection', resourceId: req.params.id }),
    );
    sendSuccess(res, updated, 'État des lieux mis à jour');
  }),
);

router.post(
  '/:id/sign',
  requirePermission(Permission.INSPECTION_SIGN),
  requireOrgResource('propertyInspection'),
  validateBody(signInspectionSchema),
  asyncHandler(async (req, res) => {
    const signed = await withAudit(
      req,
      AuditAction.INSPECTION_SIGN,
      () => service.sign(getOrganizationId(req), req.params.id, req.body),
      () => ({ resourceType: 'PropertyInspection', resourceId: req.params.id }),
    );
    sendSuccess(res, signed, 'État des lieux signé');
  }),
);

router.delete(
  '/:id',
  requirePermission(Permission.INSPECTION_DELETE),
  requireOrgResource('propertyInspection'),
  asyncHandler(async (req, res) => {
    await withAudit(req, AuditAction.INSPECTION_DELETE, () => service.remove(getOrganizationId(req), req.params.id), () => ({
      resourceType: 'PropertyInspection',
      resourceId: req.params.id,
    }));
    sendSuccess(res, null, 'État des lieux supprimé');
  }),
);

export default router;
