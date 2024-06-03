import { db } from '@/db/index.js';
import { AuditLog, hotAuditLogs, users } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/constants.js';
import { and, desc, eq, inArray, sql, between, or } from 'drizzle-orm';
import { AuditLogFilter } from './type.js';

export async function createAuditLog(body: Omit<AuditLog, 'id' | 'createdAt'>) {
  await db.insert(hotAuditLogs).values({ ...body, createdAt: new Date() });
}

export async function getAuditLogs(filter: AuditLogFilter) {
  const performers =
    filter.performedBy === 'All'
      ? sql`TRUE`
      : inArray(hotAuditLogs.performedBy, JSON.parse(filter.performedBy));
  const modules =
    filter.modules === 'All'
      ? sql`TRUE`
      : inArray(hotAuditLogs.module, JSON.parse(filter.modules));
  const statusFilter =
    filter.status === 'All'
      ? or(eq(hotAuditLogs.status, 'F'), eq(hotAuditLogs.status, 'S'))
      : eq(hotAuditLogs.status, filter.status);
  const dateFilter = between(
    hotAuditLogs.createdAt,
    new Date(filter.from),
    new Date(filter.to)
  );
  try {
    const logs = await db
      .select()
      .from(hotAuditLogs)
      .where(and(performers, modules, statusFilter, dateFilter))
      .orderBy(desc(hotAuditLogs.createdAt));
    const data = logs.map((log, index) => ({
      ...log,
      tid: index + 1,
    }));
    return { auditLogs: data };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getAuditLog(id: string) {
  try {
    const log = await db
      .select()
      .from(hotAuditLogs)
      .where(eq(hotAuditLogs.id, id));
    if (!log.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { auditLog: log[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}
