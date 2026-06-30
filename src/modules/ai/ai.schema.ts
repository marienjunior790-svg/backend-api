import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export const aiAnalyzeSchema = z.object({
  analysisType: z.enum(['overview', 'revenue', 'occupancy', 'delinquency']).default('overview'),
});

export type AiChatDto = z.infer<typeof aiChatSchema>;
export type AiAnalyzeDto = z.infer<typeof aiAnalyzeSchema>;
