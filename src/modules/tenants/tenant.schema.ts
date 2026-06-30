import { z } from 'zod';

export const createTenantSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
  idNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const tenantListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});
