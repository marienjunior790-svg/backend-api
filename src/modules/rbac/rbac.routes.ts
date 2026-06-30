import { Router } from 'express';
import { container } from 'tsyringe';
import { RbacService } from '../../shared/rbac/rbac.service.js';
import { PERMISSION_CATALOG } from '../../shared/rbac/permission-catalog.js';
import { ROLE_PERMISSION_MATRIX } from '../../shared/rbac/role-matrix.js';
import { authenticatedPipeline, platformAdminPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { Permission } from '../../shared/auth/permissions.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';

const router = Router();
const rbac = container.resolve(RbacService);

router.get(
  '/me',
  ...authenticatedPipeline,
  asyncHandler(async (req, res) => {
    const keys = await rbac.getPermissionsForRole(req.user!.role);
    sendSuccess(res, { permissions: keys });
  }),
);

router.get(
  '/catalog',
  ...platformAdminPipeline,
  requirePermission(Permission.PLATFORM_SETTINGS),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, { catalog: PERMISSION_CATALOG, matrix: ROLE_PERMISSION_MATRIX });
  }),
);

export default router;
