import { z } from 'zod';

export const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(3),
});
