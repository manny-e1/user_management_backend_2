import z from 'zod';

export const Email = z.object({ email: z.string().email() });
export type Email = z.infer<typeof Email>;
