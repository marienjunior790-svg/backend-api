import { Router } from 'express';
import { container } from 'tsyringe';
import { ListingService } from './listing.service.js';
import { listingSearchSchema, publishApartmentSchema } from './listing.schema.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { authenticatedPipeline, orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { requireOrgResource } from '../../shared/middleware/resource-guard.middleware.js';
import { validateBody, validateQuery } from '../../shared/middleware/validate.middleware.js';
import { requireFeature } from '../../shared/middleware/feature.middleware.js';
import { FeatureKey } from '../../shared/constants/feature-keys.js';
import { asyncHandler, getPagination, sendSuccess, toPaginationMeta } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { withAudit } from '../../shared/audit/audit-request.js';

const router = Router();
const service = container.resolve(ListingService);

router.get(
  '/search',
  ...authenticatedPipeline,
  requirePermission(Permission.LISTING_VIEW),
  validateQuery(listingSearchSchema),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const q = req.query as Record<string, string | undefined>;
    const { items, total } = await service.search(skip, limit, {
      city: q.city,
      district: q.district,
      minRent: q.minRent ? Number(q.minRent) : undefined,
      maxRent: q.maxRent ? Number(q.maxRent) : undefined,
      minRooms: q.minRooms ? Number(q.minRooms) : undefined,
      search: q.search,
    });
    sendSuccess(res, items, undefined, 200, toPaginationMeta(page, limit, total));
  }),
);

router.get(
  '/:id',
  ...authenticatedPipeline,
  requirePermission(Permission.LISTING_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.getPublicListing(req.params.id));
  }),
);

router.post(
  '/apartments/:id/publish',
  ...orgStaffPipeline,
  requirePermission(Permission.LISTING_CREATE),
  requireOrgResource('apartment'),
  requireFeature(FeatureKey.PUBLISH_LISTING),
  validateBody(publishApartmentSchema),
  asyncHandler(async (req, res) => {
    const item = await withAudit(
      req,
      AuditAction.LISTING_PUBLISH,
      () => service.publish(getOrganizationId(req), req.params.id, req.body.amenities),
      (r) => ({ resourceType: 'Apartment', resourceId: r.id, newValue: { isPublished: true } }),
    );
    sendSuccess(res, item, 'Annonce publiée');
  }),
);

router.post(
  '/apartments/:id/unpublish',
  ...orgStaffPipeline,
  requirePermission(Permission.LISTING_EDIT),
  requireOrgResource('apartment'),
  requireFeature(FeatureKey.PUBLISH_LISTING),
  asyncHandler(async (req, res) => {
    const item = await withAudit(
      req,
      AuditAction.LISTING_UNPUBLISH,
      () => service.unpublish(getOrganizationId(req), req.params.id),
      (r) => ({ resourceType: 'Apartment', resourceId: r.id, newValue: { isPublished: false } }),
    );
    sendSuccess(res, item, 'Annonce retirée');
  }),
);

export default router;
