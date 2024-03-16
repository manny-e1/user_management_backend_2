import { db } from '@/db/index.js';
import {
  maintenanceLogs,
  NewMaintenanceLog,
  rejectionLogs,
} from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq, inArray, sql, and } from 'drizzle-orm';

export async function createMntLogs(
  body: (Omit<NewMaintenanceLog, 'extendedStartDate' | 'extendedEndDate'> & {
    createdAt: Date;
    updatedAt: Date;
  })[]
) {
  try {
    await db.insert(maintenanceLogs).values(body);
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getMntLogs(paymentSite: boolean) {
  const fullObj = {
    id: maintenanceLogs.id,
    submittedAt: maintenanceLogs.submittedAt,
    submittedBy: maintenanceLogs.submittedBy,
    startDate: maintenanceLogs.startDate,
    endDate: maintenanceLogs.endDate,
    iRakyatYN: maintenanceLogs.iRakyatYN,
    iBizRakyatYN: maintenanceLogs.iBizRakyatYN,
    iRakyatStatus: maintenanceLogs.iRakyatStatus,
    iBizRakyatStatus: maintenanceLogs.iBizRakyatStatus,
    submissionStatus: maintenanceLogs.submissionStatus,
    approvalStatus: maintenanceLogs.approvalStatus,
    extendedStartDate: maintenanceLogs.extendedStartDate,
    extendedEndDate: maintenanceLogs.extendedEndDate,
    approvedBy:maintenanceLogs.approvedBy,
    rejectReason:maintenanceLogs.rejectReason,
    isDeleted:maintenanceLogs.isDeleted,
  };

  const { submittedBy: _, ...forB2C } = fullObj;
  const returnData = paymentSite ? forB2C : fullObj;
  try {
    const mntLogs = await db
      .select(returnData)
      .from(maintenanceLogs)
      .orderBy(desc(maintenanceLogs.createdAt));

    const now = new Date().toISOString();

    const data = mntLogs.map((item, index: number) => {

      if (item.startDate.toISOString() > now) {
        item.iRakyatStatus = '';
        item.iBizRakyatStatus = '';
      }

      if (
        item.endDate.toISOString() < now
        // &&item.approvalStatus == 'Approved'
      ) {
        return {
          ...item,
          mid: index + 1,
          iRakyatStatus: item.iRakyatYN && item.approvedBy !='' ? item.submissionStatus=='New' && item.approvalStatus=='Rejected' ?'':item.iRakyatStatus=='A' && item.submissionStatus=='Edited' && item.approvalStatus=='Rejected'?'C':'':'',
          iBizRakyatStatus: item.iBizRakyatYN && item.approvedBy !='' ? item.submissionStatus=='New' && item.approvalStatus=='Rejected' ?'':item.iBizRakyatStatus=='A' && item.submissionStatus=='Edited' && item.approvalStatus=='Rejected'?'C':'':'',
        };
      } else if (
        item.approvalStatus == 'Rejected' &&
        item.submissionStatus == 'Marked'
      ) {
        return {
          ...item,
          mid: index + 1,
          // iRakyatStatus: item.iRakyatYN ? 'A' : '',
          // iBizRakyatStatus: item.iBizRakyatYN ? 'A' : '',
        };
      } else {
        return {
          ...item,
          mid: index + 1,
        };
      }
    });
    return { mntLogs: data };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getMntLog(id: string) {
  try {
    const maintenanceLog = await db
      .select()
      .from(maintenanceLogs)
      .where(eq(maintenanceLogs.id, id));

    if (!maintenanceLog.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    const mntLog = maintenanceLog[0];
    const now = new Date().toISOString();
    if (
      mntLog.endDate.toISOString() < now
      // &&mntLog.approvalStatus == 'Approved'
    ) {
      return {
        mntLog: {
          ...mntLog,
          iRakyatStatus: mntLog.iRakyatYN ? 'C' : '',
          iBizRakyatStatus: mntLog.iBizRakyatYN ? 'C' : '',
        },
      };
    } else {
      return { mntLog };
    }
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function updateMntLog(
  id: string,
  data: Omit<NewMaintenanceLog, 'startDate' | 'endDate'>
) {
  try {
    await db
      .update(maintenanceLogs)
      .set({
        ...data,
        submissionStatus: 'Edited',
        approvalStatus: 'Pending',
        iRakyatStatus: sql`CASE WHEN "iRakyatYN" IS TRUE AND "approvalStatus" = 'Approved' THEN (CASE WHEN "iRakyatStatus"='C' THEN 'C' ELSE 'A' END) ELSE '' END`,
        iBizRakyatStatus: sql`CASE WHEN "iBizRakyatYN" IS TRUE AND "approvalStatus" = 'Approved' THEN (CASE WHEN "iBizRakyatStatus"='C' THEN 'C' ELSE 'A' END) ELSE '' END`,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceLogs.id, id));
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

export async function delMntLog(id: string) {
  try {
    const resp = await db
      .update(maintenanceLogs)
      .set({
        approvalStatus: 'Pending',
        submissionStatus: 'Delete',
        submittedAt: new Date(),
        iRakyatStatus: '',
        iBizRakyatStatus: '',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceLogs.id, id));
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

// Checker Functions
export async function approveMntLogs(ids: string[], email: string) {
  try {
    await db
      .update(maintenanceLogs)
      .set({
        updatedAt: new Date(),
        approvedBy: email,
        approvalStatus: 'Approved',
        startDate: sql`CASE WHEN "extended_start_date" IS NOT NULL THEN extended_start_date ELSE "startDate" END`,
        endDate: sql`CASE WHEN "extended_end_date" IS NOT NULL THEN extended_end_date ELSE "endDate" END`,
        extendedEndDate: null,
        extendedStartDate: null,
       iRakyatStatus: sql`CASE WHEN "iRakyatYN" IS TRUE AND "iRakyatStatus" != 'C' THEN (CASE WHEN "iRakyatCN" IS TRUE THEN 'C' ELSE 'A' END) ELSE (CASE WHEN "iRakyatYN" IS FALSE THEN '' ELSE "iRakyatStatus" END) END`,
        iBizRakyatStatus: sql`CASE WHEN "iBizRakyatYN" IS TRUE AND "iBizRakyatStatus"!='C' THEN (CASE WHEN "iBizRakyatCN" IS TRUE THEN 'C' ELSE 'A' END) ELSE (CASE WHEN "iBizRakyatYN" IS FALSE THEN '' ELSE "iBizRakyatStatus" END) END`,
        isDeleted: sql`CASE WHEN "submissionStatus"='Delete' THEN TRUE ELSE FALSE END`,
        iRakyatCN: false,
        iBizRakyatCN: false,
      })
      .where(inArray(maintenanceLogs.id, ids));

    await db.delete(maintenanceLogs).where(eq(maintenanceLogs.isDeleted, true));

    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

export async function rejectMntLogs(ids: string[], email: string, msg: string) {
  try {
    await db
      .update(maintenanceLogs)
      .set({
        updatedAt: new Date(),
        approvalStatus: 'Rejected',
        iRakyatStatus: sql`CASE WHEN "iRakyatYN" IS TRUE THEN (CASE WHEN "iRakyatCN" IS TRUE THEN 'A' ELSE "iRakyatStatus" END) ELSE '' END`,
        iBizRakyatStatus: sql`CASE WHEN "iBizRakyatYN" IS TRUE THEN (CASE WHEN "iBizRakyatCN" IS TRUE THEN 'A' ELSE "iBizRakyatStatus" END) ELSE '' END`,
        extendedStartDate: null,
        extendedEndDate: null,
        approvedBy: email,
        rejectReason: msg,
        iRakyatCN: false,
        iBizRakyatCN: false,
      })
      .where(inArray(maintenanceLogs.id, ids));

    await db.insert(rejectionLogs).values(
      ids.map((id) => {
        return {
          mid: id,
          reason: msg,
          rejectedBy: email,
          rejectedDate: new Date(),
          submissionStatus: sql`(SELECT "submissionStatus" from "maintenance_logs" WHERE "id"=${id})`,
        };
      })
    );
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

export async function completeMntLogs(id: string, channel: string) {
  try {
    await db
      .update(maintenanceLogs)
      .set(
        channel == 'rakyat'
          ? {
              approvalStatus: 'Pending',
              submissionStatus: 'Marked',
              submittedAt: new Date(),
              iRakyatCN: true,
            }
          : {
              approvalStatus: 'Pending',
              submissionStatus: 'Marked',
              submittedAt: new Date(),
              iBizRakyatCN: true,
            }
      )
      .where(eq(maintenanceLogs.id, id));
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}
