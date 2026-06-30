import { Router } from 'express';
import multer from 'multer';
import { container } from 'tsyringe';
import { ApplicationService } from './application.service.js';
import { ApplicationDocumentService } from './application-document.service.js';
import {
  applicationListQuerySchema,
  createApplicationSchema,
  documentCategorySchema,
  reviewApplicationSchema,
  saveDraftSchema,
  startDraftSchema,
} from './application.schema.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { orgStaffPipeline, tenantPipeline, authenticatedPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { requireApplicationAccess, requireOrgResource } from '../../shared/middleware/resource-guard.middleware.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, getPagination, sendSuccess, toPaginationMeta } from '../../shared/utils/response.util.js';
import { RbacService } from '../../shared/rbac/rbac.service.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(ApplicationService);
const docService = container.resolve(ApplicationDocumentService);
const rbac = container.resolve(RbacService);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Locataire ───────────────────────────────────────────────────────────────

router.post(
  '/draft',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  validateBody(startDraftSchema),
  asyncHandler(async (req, res) => {
    const draft = await withAudit(
      req,
      AuditAction.APPLICATION_DRAFT_CREATE,
      () => service.getOrCreateDraft(req.user!.userId, req.body.apartmentId),
      (r) => ({ resourceType: 'RentalApplication', resourceId: (r as { id: string }).id }),
    );
    sendSuccess(res, draft, 'Brouillon prêt');
  }),
);

router.put(
  '/:id/draft',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  requireApplicationAccess(),
  validateBody(saveDraftSchema),
  asyncHandler(async (req, res) => {
    const saved = await withAudit(
      req,
      AuditAction.APPLICATION_DRAFT_UPDATE,
      () => service.saveDraft(req.user!.userId, req.params.id, req.body),
      () => ({ resourceType: 'RentalApplication', resourceId: req.params.id }),
    );
    sendSuccess(res, saved, 'Brouillon enregistré');
  }),
);

router.post(
  '/:id/submit',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  requireApplicationAccess(),
  asyncHandler(async (req, res) => {
    const submitted = await withAudit(
      req,
      AuditAction.APPLICATION_SUBMIT,
      () => service.submit(req.user!.userId, req.params.id),
      (r) => ({ resourceType: 'RentalApplication', resourceId: r.id, newValue: { status: r.status } }),
    );
    sendSuccess(res, submitted, 'Candidature envoyée — analyse IA en cours');
  }),
);

router.post(
  '/:id/documents',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  requireApplicationAccess(),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const category = documentCategorySchema.parse(req.body.category);
    const doc = await withAudit(
      req,
      AuditAction.DOCUMENT_UPLOAD,
      () => docService.upload(req.params.id, category, req.file!, req.user!.userId),
      (r) => ({ resourceType: 'ApplicationDocument', resourceId: r.id, newValue: { category } }),
    );
    sendSuccess(res, doc, 'Document ajouté', 201);
  }),
);

router.delete(
  '/:id/documents/:docId',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  requireApplicationAccess(),
  asyncHandler(async (req, res) => {
    await withAudit(req, AuditAction.DOCUMENT_DELETE, () => docService.delete(req.params.id, req.params.docId, req.user!.userId), () => ({
      resourceType: 'ApplicationDocument',
      resourceId: req.params.docId,
    }));
    sendSuccess(res, null, 'Document supprimé');
  }),
);

router.post(
  '/',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_SUBMIT),
  validateBody(createApplicationSchema),
  asyncHandler(async (req, res) => {
    const created = await withAudit(
      req,
      AuditAction.APPLICATION_SUBMIT,
      () => service.create(req.user!.userId, req.body),
      (r) => ({ resourceType: 'RentalApplication', resourceId: r.id }),
    );
    sendSuccess(res, created, 'Candidature envoyée', 201);
  }),
);

router.get(
  '/mine',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_VIEW),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const { items, total } = await service.listMine(req.user!.userId, skip, limit);
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.post(
  '/:id/withdraw',
  ...tenantPipeline,
  requirePermission(Permission.APPLICATION_WITHDRAW),
  requireApplicationAccess(),
  asyncHandler(async (req, res) => {
    const result = await withAudit(
      req,
      AuditAction.APPLICATION_WITHDRAW,
      () => service.withdraw(req.user!.userId, req.params.id),
      () => ({ resourceType: 'RentalApplication', resourceId: req.params.id, newValue: { status: 'WITHDRAWN' } }),
    );
    sendSuccess(res, result, 'Candidature annulée');
  }),
);

// ─── Staff organisation ──────────────────────────────────────────────────────

router.get(
  '/',
  ...orgStaffPipeline,
  requirePermission(Permission.APPLICATION_VIEW),
  validateQuery(applicationListQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const q = req.query as { status?: import('@prisma/client').RentalApplicationStatus; apartmentId?: string };
    const { items, total } = await service.listForOrg(getOrganizationId(req), skip, limit, q);
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  ...authenticatedPipeline,
  requireApplicationAccess(),
  requirePermission(Permission.APPLICATION_VIEW),
  asyncHandler(async (req, res) => {
    const u = req.user!;
    sendSuccess(res, await service.get(u.organizationId, req.params.id, u.userId, u.role));
  }),
);

router.post(
  '/:id/score',
  ...orgStaffPipeline,
  requirePermission(Permission.APPLICATION_SCORE),
  requireOrgResource('rentalApplication'),
  asyncHandler(async (req, res) => {
    const scored = await withAudit(
      req,
      AuditAction.AI_SCORE,
      () => service.runAiScoring(getOrganizationId(req), req.params.id),
      (r) => ({ resourceType: 'RentalApplication', resourceId: r.id, newValue: { aiScore: r.aiScore } }),
    );
    sendSuccess(res, scored, 'Score IA calculé');
  }),
);

router.post(
  '/:id/review',
  ...orgStaffPipeline,
  requireOrgResource('rentalApplication'),
  validateBody(reviewApplicationSchema),
  asyncHandler(async (req, res) => {
    const perm = req.body.decision === 'accept' ? Permission.APPLICATION_APPROVE : Permission.APPLICATION_REJECT;
    await rbac.assertPermission(req.user!.role, perm);
    const action = req.body.decision === 'accept' ? AuditAction.APPLICATION_APPROVE : AuditAction.APPLICATION_REJECT;
    const result = await withAudit(
      req,
      action,
      () =>
        service.review(
          getOrganizationId(req),
          req.params.id,
          req.user!.userId,
          req.body.decision,
          req.body.rejectionReason,
        ),
      () => ({
        resourceType: 'RentalApplication',
        resourceId: req.params.id,
        newValue: { decision: req.body.decision },
      }),
    );
    sendSuccess(res, result, req.body.decision === 'accept' ? 'Demande acceptée' : 'Demande refusée');
  }),
);

export default router;
