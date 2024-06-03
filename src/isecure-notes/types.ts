import { ACCEPTED_FILE_TYPES, MAX_UPLOAD_SIZE } from '@/utils/upload-image.js';
import z from 'zod';

const image = z
  .instanceof(File)
  .refine((file) => {
    return !file || file.size <= MAX_UPLOAD_SIZE;
  }, 'file size must be less than 5MB')
  .refine((file) => {
    return ACCEPTED_FILE_TYPES.includes(file.type);
  }, 'file type must only be JPEG, JPG or PNG');

export const CreateISecureNote = z.object({
  cDisplayStatus: z.union([z.literal('on'), z.literal('off')]),
  nDisplayStatus: z.union([z.literal('on'), z.literal('off')]),
  image,
});
export type CreateISecureNote = z.infer<typeof CreateISecureNote>;

export const UpdateISecureNote = z.object({
  image: image.optional(),
});

export const ReviewISecureNote = z.object({
  status: z.union([z.literal('approved'), z.literal('rejected')]),
  reason: z.string().optional(),
});
export type ReviewISecureNote = z.infer<typeof ReviewISecureNote>;
