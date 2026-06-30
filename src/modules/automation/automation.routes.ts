import { Router } from 'express';
import { container } from 'tsyringe';
import { AutomationJobService, AutomationQueryService } from './automation.service.js';
import { RentFollowUpService } from '../rent-followup/rent-followup.service.js';
import { daysQuerySchema } from './automation.schema.js';
import { verifyAutomationKey } from '../../shared/middleware/automation.middleware.js';
import { validateQuery } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler, sendSuccess } from '../../shared/utils/response.util.js';
import { AuditAction } from '../../shared/audit/audit-actions.js';
import { auditSystem } from '../../shared/audit/audit-request.js';

const router = Router();
const queries = container.resolve(AutomationQueryService);
const jobs = container.resolve(AutomationJobService);
const rentFollowUp = container.resolve(RentFollowUpService);

router.use(verifyAutomationKey);

router.get(
  '/payments/due-soon',
  validateQuery(daysQuerySchema),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const items = await queries.getPaymentsDueSoon(days);
    sendSuccess(res, items, undefined, 200, { count: items.length, days });
  }),
);

router.get(
  '/payments/late',
  asyncHandler(async (_req, res) => {
    const items = await queries.getLatePayments();
    sendSuccess(res, items, undefined, 200, { count: items.length });
  }),
);

router.get(
  '/leases/expiring',
  validateQuery(daysQuerySchema),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const items = await queries.getLeasesExpiringSoon(days);
    sendSuccess(res, items, undefined, 200, { count: items.length, days });
  }),
);

router.get(
  '/subscriptions/expiring',
  validateQuery(daysQuerySchema),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const items = await queries.getSubscriptionsExpiringSoon(days);
    sendSuccess(res, items, undefined, 200, { count: items.length, days });
  }),
);

router.get(
  '/subscriptions/attention',
  asyncHandler(async (_req, res) => {
    const items = await queries.getSubscriptionsNeedingAttention();
    sendSuccess(res, items, undefined, 200, { count: items.length });
  }),
);

router.post(
  '/jobs/rent-follow-up',
  asyncHandler(async (_req, res) => {
    const result = await rentFollowUp.runDailyFollowUp();
    await auditSystem(AuditAction.AUTOMATION_JOB_RUN, {
      resourceType: 'AutomationJob',
      newValue: { job: 'rent-follow-up', result },
    });
    sendSuccess(res, result, 'Suivi des loyers exécuté');
  }),
);

router.post(
  '/jobs/mark-late',
  asyncHandler(async (_req, res) => {
    const result = await jobs.markLatePaymentsAndNotify();
    await auditSystem(AuditAction.AUTOMATION_JOB_RUN, {
      resourceType: 'AutomationJob',
      newValue: { job: 'mark-late', result },
    });
    sendSuccess(res, result, 'Paiements en retard traités');
  }),
);

router.post(
  '/jobs/sync-subscriptions',
  asyncHandler(async (_req, res) => {
    const result = await jobs.syncSubscriptionStatuses();
    await auditSystem(AuditAction.AUTOMATION_JOB_RUN, {
      resourceType: 'AutomationJob',
      newValue: { job: 'sync-subscriptions', result },
    });
    sendSuccess(res, result, 'Abonnements synchronisés');
  }),
);

router.get(
  '/reminders/rent',
  validateQuery(daysQuerySchema),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const items = await rentFollowUp.getRentReminders(days);
    sendSuccess(res, items, undefined, 200, { count: items.length, days });
  }),
);

export default router;
