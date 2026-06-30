import { Router } from 'express';
import { container } from 'tsyringe';
import { FeatureService } from './feature.service.js';
import { featureKeyBodySchema } from './feature.schema.js';
import { Permission } from '../../shared/auth/permissions.js';
import { adminUsersPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSuccess } from '../../shared/audit/audit-request.js';

const router = Router({ mergeParams: true });
const service = container.resolve(FeatureService);

router.use(...adminUsersPipeline);

router.get(
  '/',
  requirePermission(Permission.USER_VIEW, Permission.PLATFORM_USER_VIEW),
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const target = await service.assertCanManageUser(
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId,
      targetUserId,
    );
    const features = await service.getUserFeaturesDetailed(targetUserId, target.role);
    sendSuccess(res, features);
  }),
);

router.post(
  '/enable',
  requirePermission(Permission.USER_EDIT, Permission.PLATFORM_USER_MANAGE),
  validateBody(featureKeyBodySchema),
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    await service.assertCanManageUser(
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId,
      targetUserId,
    );
    const features = await service.setFeatureForUser(
      targetUserId,
      req.body.featureKey,
      true,
      req.user!.userId,
    );
    await auditSuccess(req, AuditAction.FEATURE_ENABLE, {
      resourceType: 'User',
      resourceId: targetUserId,
      newValue: { featureKey: req.body.featureKey },
    });
    sendSuccess(res, features, 'Fonctionnalité activée');
  }),
);

router.post(
  '/disable',
  requirePermission(Permission.USER_EDIT, Permission.PLATFORM_USER_MANAGE),
  validateBody(featureKeyBodySchema),
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    await service.assertCanManageUser(
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId,
      targetUserId,
    );
    const features = await service.setFeatureForUser(
      targetUserId,
      req.body.featureKey,
      false,
      req.user!.userId,
    );
    await auditSuccess(req, AuditAction.FEATURE_DISABLE, {
      resourceType: 'User',
      resourceId: targetUserId,
      newValue: { featureKey: req.body.featureKey },
    });
    sendSuccess(res, features, 'Fonctionnalité désactivée');
  }),
);

export default router;
