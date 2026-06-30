import { z } from 'zod';
import { ApartmentStatus } from '@prisma/client';

export const createApartmentSchema = z.object({
  buildingId: z.string().optional(),
  label: z.string().min(1),
  floor: z.coerce.number().int().optional(),
  surface: z.coerce.number().positive().optional(),
  rooms: z.coerce.number().int().positive().optional(),
  rentAmount: z.coerce.number().int().positive(),
  currency: z.string().default('XAF'),
  status: z.nativeEnum(ApartmentStatus).optional(),
  description: z.string().optional(),
});

export const updateApartmentSchema = createApartmentSchema.partial();

export const apartmentListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(ApartmentStatus).optional(),
  buildingId: z.string().optional(),
  search: z.string().optional(),
});
