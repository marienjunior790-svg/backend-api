import { z } from 'zod';
import { SubscriptionPlan } from '@prisma/client';

export const changePlanSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

export const reactivateSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan).optional(),
});

export type ChangePlanDto = z.infer<typeof changePlanSchema>;
export type ReactivateDto = z.infer<typeof reactivateSchema>;
