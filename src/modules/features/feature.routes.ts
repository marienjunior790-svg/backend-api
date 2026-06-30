import { Router } from 'express';
import { container } from 'tsyringe';
import { FeatureService } from './feature.service.js';
import { Permission } from '../../shared/auth/permissions.js';
import { authenticatedPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';

const router = Router();
const service = container.resolve(FeatureService);

router.get(
  '/me',
  ...authenticatedPipeline,
  requirePermission(Permission.SETTINGS_VIEW),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const features = await service.getUserFeaturesDetailed(userId, role);
    const map = await service.getUserFeatureMap(userId, role);
    sendSuccess(res, { features, permissions: map });
  }),
);

export default router;
