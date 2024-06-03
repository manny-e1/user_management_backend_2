import { z } from 'zod';

export const AuditLogFilter = z.object({
  from: z.string(),
  to: z.string(),
  modules: z.string(),
  performedBy: z.string(),
  status: z.union([z.literal('All'), z.literal('S'), z.literal('F')]),
});
export type AuditLogFilter = z.infer<typeof AuditLogFilter>;
