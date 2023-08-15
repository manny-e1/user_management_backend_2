import { db } from '@/db/index.js';
import { NewTransactionLog, transactionLogs } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq } from 'drizzle-orm';

export type ChangeStatus = {
  id: string;
  status: number;
  msg?: string;
  checker: string;
};

export async function createTxnLog(body: NewTransactionLog) {
  try {
    await db.insert(transactionLogs).values(body);
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getTxnLogs() {
  try {
    const txnLogs = await db
      .select({
        id: transactionLogs.id,
        createdAt: transactionLogs.createdAt,
        cRIB: transactionLogs.cRIB,
        cRMB: transactionLogs.cRMB,
        cCIB: transactionLogs.cCIB,
        cCMB: transactionLogs.cCMB,
        nRIB: transactionLogs.nRIB,
        nRMB: transactionLogs.nRMB,
        nCIB: transactionLogs.nCIB,
        nCMB: transactionLogs.nCMB,
        status: transactionLogs.status,
      })
      .from(transactionLogs)
      .orderBy(desc(transactionLogs.createdAt));
    const data = txnLogs.map((log, index) => ({ ...log, tid: index + 1 }));
    return { txnLogs: data };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getTxnLog(id: string) {
  try {
    const txnLog = await db
      .select()
      .from(transactionLogs)
      .where(eq(transactionLogs.id, id));

    if (!txnLog.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { txnLog: txnLog[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function getLastUpdatedValue() {
  try {
    const txnLog = await db
      .select()
      .from(transactionLogs)
      .where(eq(transactionLogs.status, 1))
      .orderBy(desc(transactionLogs.updatedAt))
      .limit(1);

    if (!txnLog.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { txnLog: txnLog[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function changeStatus(body: ChangeStatus) {
  try {
    const updatedData = await db
      .update(transactionLogs)
      .set({
        updateChecker: body.checker,
        updatedAt: new Date(),
        status: body.status,
        msg: body.msg ?? '',
      })
      .where(eq(transactionLogs.id, body.id))
      .returning({
        cRIB: transactionLogs.cRIB,
        cRMB: transactionLogs.cRMB,
        cCIB: transactionLogs.cCIB,
        cCMB: transactionLogs.cCMB,
        nRIB: transactionLogs.nRIB,
        nRMB: transactionLogs.nRMB,
        nCIB: transactionLogs.nCIB,
        nCMB: transactionLogs.nCMB,
        status: transactionLogs.status,
        msg: transactionLogs.msg,
        createdAt: transactionLogs.createdAt,
        updatedAt: transactionLogs.updatedAt,
        updateChecker: transactionLogs.updateChecker,
        trxId: transactionLogs.id,
      });
    if (!updatedData.length) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { updatedTxnLog: updatedData[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}
