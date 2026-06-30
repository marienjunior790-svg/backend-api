import { z } from 'zod';

export const featureKeyBodySchema = z.object({
  featureKey: z.string().min(1).max(64),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});
