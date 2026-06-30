import { z } from 'zod';

export const listingSearchSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  minRent: z.coerce.number().int().optional(),
  maxRent: z.coerce.number().int().optional(),
  minRooms: z.coerce.number().int().optional(),
  search: z.string().optional(),
});

export const publishApartmentSchema = z.object({
  amenities: z.string().optional(),
});
