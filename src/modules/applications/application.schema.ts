import { z } from 'zod';

const dependentSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().int().min(0).optional(),
  relationship: z.string().optional(),
});

const referenceSchema = z.object({
  landlordName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  period: z.string().optional(),
});

export const formDataSchema = z.object({
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  contractType: z.string().optional(),
  guarantorRelation: z.string().optional(),
  dependents: z.array(dependentSchema).optional(),
  rentalReferences: z.array(referenceSchema).optional(),
  observations: z.string().optional(),
}).passthrough();

export const createApplicationSchema = z.object({
  apartmentId: z.string().min(1),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  profession: z.string().optional(),
  monthlyIncome: z.coerce.number().int().positive().optional(),
  idNumber: z.string().optional(),
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email().optional(),
  documentsNotes: z.string().optional(),
  address: z.string().optional(),
  employer: z.string().optional(),
  formData: formDataSchema.optional(),
  currentStep: z.coerce.number().int().min(0).max(8).optional(),
});

export const saveDraftSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  email: z.string().email().optional().or(z.literal('')),
  profession: z.string().optional(),
  monthlyIncome: z.coerce.number().int().positive().optional().nullable(),
  idNumber: z.string().optional(),
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email().optional().or(z.literal('')),
  documentsNotes: z.string().optional(),
  address: z.string().optional(),
  employer: z.string().optional(),
  formData: formDataSchema.optional(),
  currentStep: z.coerce.number().int().min(0).max(8).optional(),
});

export const startDraftSchema = z.object({
  apartmentId: z.string().min(1),
});

export const reviewApplicationSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  rejectionReason: z.string().optional(),
});

export const applicationListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'UNDER_REVIEW', 'AI_SCORED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional(),
  apartmentId: z.string().optional(),
});

export const documentCategorySchema = z.enum([
  'ID_CARD',
  'PROFILE_PHOTO',
  'INCOME_PROOF',
  'EMPLOYMENT_CONTRACT',
  'PROOF_OF_ADDRESS',
  'GUARANTOR_DOCUMENT',
  'ADDITIONAL',
]);
