import { z } from 'zod';
import { LeaseStatus } from '@prisma/client';

export const createLeaseSchema = z.object({
  apartmentId: z.string().min(1),
  tenantId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyRent: z.coerce.number().int().positive().optional(),
  depositAmount: z.coerce.number().int().nonnegative().optional(),
  terms: z.string().optional(),
});

export const updateLeaseSchema = createLeaseSchema.partial();

export const leaseListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(LeaseStatus).optional(),
});

export const renewLeaseSchema = z.object({
  endDate: z.string().optional(),
  monthlyRent: z.coerce.number().int().positive().optional(),
  extensionMonths: z.coerce.number().int().min(1).max(60).optional(),
});
