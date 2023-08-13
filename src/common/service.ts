import { db } from '@/db/index.js';
import { maintenanceLogs, NewMaintenanceLog, rejectionLogs, transactionLogs, users } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq, inArray, sql, and } from 'drizzle-orm';

export async function getPendingCount(type: string) {
	try {
		if(type === 'transaction') {
			const result = await db
				.select({count: sql<number>`count(*)`})
				.from(transactionLogs)
				.where(eq(transactionLogs.status, 0));
			return {count: result[0].count};
		} else if(type === 'maintenance') {
			const result = await db
				.select({count: sql<number>`count(*)`})
				.from(maintenanceLogs)
				.where(eq(maintenanceLogs.approvalStatus, "Pending"));
			return {count: result[0].count};
		} else {
			const result = await db
				.select({count: sql<number>`count(*)`})
				.from(users)
				.where(eq(users.status, 'locked'));
			return {count: result[0].count};
		}
	} catch(error) {
		logger.error(error);
		const err = error as Error;
		return {error: err.message};
	}
}