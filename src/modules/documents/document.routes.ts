import { Router } from 'express';
import multer from 'multer';
import { container } from 'tsyringe';
import { DocumentService } from './document.service.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { requireOrgResource } from '../../shared/middleware/resource-guard.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSuccess, withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(DocumentService);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(...orgStaffPipeline);

router.post(
  '/apartments/:apartmentId/photos',
  requirePermission(Permission.DOCUMENT_CREATE),
  requireOrgResource('apartment', 'apartmentId'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const doc = await withAudit(
      req,
      AuditAction.DOCUMENT_UPLOAD,
      () => service.uploadApartmentPhoto(getOrganizationId(req), req.params.apartmentId, req.file!, req.user!.userId),
      (d) => ({ resourceType: 'Document', resourceId: d.id, newValue: { apartmentId: req.params.apartmentId } }),
    );
    sendSuccess(res, doc, 'Photo uploadée', 201);
  }),
);

router.get(
  '/apartments/:apartmentId',
  requirePermission(Permission.DOCUMENT_VIEW),
  requireOrgResource('apartment', 'apartmentId'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.listByApartment(getOrganizationId(req), req.params.apartmentId));
  }),
);

router.delete(
  '/:id',
  requirePermission(Permission.DOCUMENT_DELETE),
  requireOrgResource('document'),
  asyncHandler(async (req, res) => {
    const orgId = getOrganizationId(req);
    await service.delete(orgId, req.params.id);
    await auditSuccess(req, AuditAction.DOCUMENT_DELETE, {
      resourceType: 'Document',
      resourceId: req.params.id,
    });
    sendSuccess(res, null, 'Document supprimé');
  }),
);

export default router;
