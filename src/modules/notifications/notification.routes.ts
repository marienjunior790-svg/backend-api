import { Router } from 'express';
import { container } from 'tsyringe';
import { UserRole } from '@prisma/client';
import { NotificationService } from './notification.service.js';
import { Permission } from '../../shared/auth/permissions.js';
import { authenticatedPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { UnauthorizedError } from '../../shared/errors/app.error.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';

const router = Router();
const service = container.resolve(NotificationService);

function resolveOrgId(req: import('express').Request): string {
  const orgId = req.user?.organizationId;
  if (!orgId) throw new UnauthorizedError('Organisation requise');
  return orgId;
}

router.use(...authenticatedPipeline, requirePermission(Permission.NOTIFICATION_VIEW));

router.get('/', asyncHandler(async (req, res) => {
  const u = req.user!;
  const filter = req.query.filter as 'unread' | 'read' | undefined;

  if (u.role === UserRole.TENANT && !u.organizationId) {
    const items = await service.listPersonal(u.userId, filter);
    sendSuccess(res, items, undefined, 200, { unread: items.filter((n) => !n.readAt).length });
    return;
  }

  const items = await service.listForUser(resolveOrgId(req), u.userId, filter);
  sendSuccess(res, items, undefined, 200, { unread: items.filter((n) => !n.readAt).length });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  const u = req.user!;
  if (u.role === UserRole.TENANT && !u.organizationId) {
    const items = await service.listPersonal(u.userId, 'unread');
    for (const n of items) {
      await service.markRead(n.organizationId, u.userId, n.id);
    }
    sendSuccess(res, { count: items.length }, 'Notifications marquées comme lues');
    return;
  }
  const count = await service.markAllRead(resolveOrgId(req), u.userId);
  sendSuccess(res, { count }, 'Notifications marquées comme lues');
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const u = req.user!;
  if (u.role === UserRole.TENANT && !u.organizationId) {
    const items = await service.listPersonal(u.userId);
    const n = items.find((i) => i.id === req.params.id);
    if (!n) {
      sendSuccess(res, null);
      return;
    }
    const item = await service.markRead(n.organizationId, u.userId, req.params.id);
    sendSuccess(res, item);
    return;
  }
  const item = await service.markRead(resolveOrgId(req), u.userId, req.params.id);
  sendSuccess(res, item);
}));

export default router;
