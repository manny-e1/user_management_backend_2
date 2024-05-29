import z from 'zod';

export const CreateMFAConfig = z.object({
  cSMS: z.number(),
  cMO: z.number(),
  cMA: z.number(),
  nSMS: z.number(),
  nMO: z.number(),
  nMA: z.number(),
});
export type CreateMFAConfig = z.infer<typeof CreateMFAConfig>;
export type UpdateMFAConfig = Omit<CreateMFAConfig, 'maker'>;

export const ReviewMFAConfig = z.object({
  status: z.union([z.literal('approved'), z.literal('rejected')]),
  reason: z.string().optional(),
});
export type ReviewMFAConfig = z.infer<typeof ReviewMFAConfig>;
