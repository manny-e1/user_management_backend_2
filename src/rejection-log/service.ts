import { db } from "@/db/index.js";
import { rejectionLogs } from "@/db/schema.js";
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq } from 'drizzle-orm';

export async function getRejectionLogs(id: string) {
	try {
	  const rjtLogs = await db
		.select()
		.from(rejectionLogs)
		.where(eq(rejectionLogs.mid, id))
		.orderBy(desc(rejectionLogs.rejectedDate));
	  return { rjtLogs: rjtLogs };
	} catch (error) {
	  logger.error(error);
	  return { error: (error as Error).message };
	}
  }