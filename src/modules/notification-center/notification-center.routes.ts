import { Router } from 'express';
import { container } from 'tsyringe';
import { NotificationCenterService } from './notification-center.service.js';
import { createReminderSchema, createTaskSchema, sendMessageSchema } from './notification-center.schema.js';
import { Permission } from '../../shared/auth/permissions.js';
import { authenticatedPipeline, orgStaffPipeline } from '../../shared/middleware/security.stack.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { getOrganizationId } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { withAudit } from '../../shared/audit/audit-request.js';
import { UnauthorizedError } from '../../shared/errors/app.error.js';

const router = Router();
const service = container.resolve(NotificationCenterService);

function orgId(req: import('express').Request): string {
  const id = req.user?.organizationId;
  if (!id) throw new UnauthorizedError('Organisation requise');
  return id;
}

router.get(
  '/summary',
  ...authenticatedPipeline,
  requirePermission(Permission.NOTIFICATION_CENTER_VIEW),
  asyncHandler(async (req, res) => {
    const u = req.user!;
    const summary = u.organizationId
      ? await service.summary(u.organizationId, u.userId)
      : { unreadNotifications: 0, unreadMessages: 0, pendingTasks: 0, pendingReminders: 0 };
    sendSuccess(res, summary);
  }),
);

router.get(
  '/messages',
  ...orgStaffPipeline,
  requirePermission(Permission.MESSAGE_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.listMessages(orgId(req), req.user!.userId));
  }),
);

router.post(
  '/messages',
  ...orgStaffPipeline,
  requirePermission(Permission.MESSAGE_SEND),
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const msg = await withAudit(
      req,
      AuditAction.MESSAGE_SEND,
      () => service.sendMessage(orgId(req), req.user!.userId, req.body),
      (r) => ({ resourceType: 'Message', resourceId: (r as { id: string }).id }),
    );
    sendSuccess(res, msg, 'Message envoyé', 201);
  }),
);

router.patch(
  '/messages/:id/read',
  ...orgStaffPipeline,
  requirePermission(Permission.MESSAGE_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.markMessageRead(orgId(req), req.user!.userId, req.params.id));
  }),
);

router.get(
  '/reminders',
  ...orgStaffPipeline,
  requirePermission(Permission.REMINDER_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.listReminders(orgId(req)));
  }),
);

router.post(
  '/reminders',
  ...orgStaffPipeline,
  requirePermission(Permission.REMINDER_SEND),
  validateBody(createReminderSchema),
  asyncHandler(async (req, res) => {
    const reminder = await withAudit(
      req,
      AuditAction.REMINDER_SEND,
      () => service.createReminder(orgId(req), req.body),
      (r) => ({ resourceType: 'Reminder', resourceId: (r as { id: string }).id }),
    );
    sendSuccess(res, reminder, 'Relance programmée', 201);
  }),
);

router.post(
  '/reminders/:id/send',
  ...orgStaffPipeline,
  requirePermission(Permission.REMINDER_SEND),
  asyncHandler(async (req, res) => {
    const sent = await withAudit(
      req,
      AuditAction.REMINDER_SEND,
      () => service.sendReminder(orgId(req), req.params.id),
      () => ({ resourceType: 'Reminder', resourceId: req.params.id }),
    );
    sendSuccess(res, sent, 'Relance envoyée');
  }),
);

router.get(
  '/tasks',
  ...orgStaffPipeline,
  requirePermission(Permission.TASK_VIEW),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await service.listTasks(orgId(req), req.user!.userId));
  }),
);

router.post(
  '/tasks',
  ...orgStaffPipeline,
  requirePermission(Permission.TASK_CREATE),
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await withAudit(
      req,
      AuditAction.TASK_CREATE,
      () => service.createTask(orgId(req), req.user!.userId, req.body),
      (r) => ({ resourceType: 'StaffTask', resourceId: (r as { id: string }).id }),
    );
    sendSuccess(res, task, 'Tâche créée', 201);
  }),
);

router.post(
  '/tasks/:id/complete',
  ...orgStaffPipeline,
  requirePermission(Permission.TASK_COMPLETE),
  asyncHandler(async (req, res) => {
    const task = await withAudit(
      req,
      AuditAction.TASK_COMPLETE,
      () => service.completeTask(orgId(req), req.params.id),
      () => ({ resourceType: 'StaffTask', resourceId: req.params.id }),
    );
    sendSuccess(res, task, 'Tâche terminée');
  }),
);

export default router;
