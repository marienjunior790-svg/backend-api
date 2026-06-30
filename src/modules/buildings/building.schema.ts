import { z } from 'zod';

export const createBuildingSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(3),
  district: z.string().optional(),
  city: z.string().optional(),
  floorCount: z.coerce.number().int().positive().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  description: z.string().optional(),
});

export const generateApartmentsSchema = z.object({
  count: z.coerce.number().int().min(1).max(200),
  defaultRentAmount: z.coerce.number().int().positive(),
  rooms: z.coerce.number().int().positive().optional(),
  surface: z.coerce.number().positive().optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

export const listQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
