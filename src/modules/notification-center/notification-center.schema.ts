import { z } from 'zod';

export const sendMessageSchema = z.object({
  recipientId: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  threadId: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const createReminderSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  targetUserId: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
  scheduledAt: z.string().datetime(),
});
