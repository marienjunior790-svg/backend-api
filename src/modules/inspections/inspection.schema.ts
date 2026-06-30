import { z } from 'zod';

export const inspectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  apartmentId: z.string().optional(),
  leaseId: z.string().optional(),
  type: z.enum(['ENTRY', 'EXIT']).optional(),
});

export const createInspectionSchema = z.object({
  apartmentId: z.string().min(1),
  leaseId: z.string().optional(),
  tenantId: z.string().optional(),
  type: z.enum(['ENTRY', 'EXIT']),
  notes: z.string().optional(),
  checklist: z.record(z.unknown()).optional(),
});

export const updateInspectionSchema = z.object({
  notes: z.string().optional(),
  checklist: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'COMPLETED', 'SIGNED']).optional(),
  photos: z.array(z.object({ url: z.string(), label: z.string().optional() })).optional(),
});

export const signInspectionSchema = z.object({
  tenantSignatureUrl: z.string().url().optional(),
  agentSignatureUrl: z.string().url().optional(),
});
