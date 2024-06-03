import { Request, Response } from 'express';
import { NewMaintenanceLog } from '@/db/schema.js';

import * as MntService from '@/system-maintenance/service.js';
import * as RjtService from '@/rejection-log/service.js';
import createHttpError from 'http-errors';
import { ERRORS, MODULES } from '@/utils/constants.js';
import * as AuditLogService from '@/audit-logs/service.js';
import { message } from '@/utils/send-email.js';
/***
 * @method POST
 * @param NewMaitenanceLog
 * @returns Created Maintenance Data
 */
export async function httpCreateMntLogs(
  req: Request<
    {},
    {},
    {
      startDate: string;
      endDate: string;
      iRakyatYN: boolean;
      iBizRakyatYN: boolean;
      submittedBy: string;
    }[]
  >,
  res: Response
) {
  const mntLogs: (Omit<
    NewMaintenanceLog,
    'extendedStartDate' | 'extendedEndDate'
  > & { createdAt: Date; updatedAt: Date })[] = [];

  req.body.map((item) => {
    const { startDate, endDate, iRakyatYN, iBizRakyatYN, submittedBy } = item;
    mntLogs.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      iRakyatYN: iRakyatYN,
      iBizRakyatYN: iBizRakyatYN,
      submittedBy: submittedBy,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  const result = await MntService.createMntLogs(mntLogs);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `request creation failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `new request added`,
    newValue: JSON.stringify(result.log),
    status: 'S',
    previousValue: null,
  });
  res.status(201).json({ message: result.message });
}

/***
 * @method GET
 * @param None
 * @returns All records of Maintenance Data
 */
export async function httpGetMntLogs(
  req: Request<{}, {}, NewMaintenanceLog>,
  res: Response
) {
  const paymentSite = req.user === undefined;
  const result = await MntService.getMntLogs(paymentSite);
  if (result.error) {
    throw createHttpError(result.error);
  }

  res.status(200).json(result);
}

/***
 * @method GET
 * @param {id: string}
 * @returns All records of Maintenance Data
 */
export async function httpGetMntLog(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await MntService.getMntLog(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'maintenance log not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

/***
 * @method PUT
 * @param NewMaintenanceLog
 * @returns All records of Maintenance Data
 */
export async function httpUpdateMntLog(
  req: Request<
    { id: string },
    {},
    {
      startDate: string;
      endDate: string;
      iRakyatYN: boolean;
      iBizRakyatYN: boolean;
      submittedBy: string;
    }
  >,
  res: Response
) {
  const { id } = req.params;
  const body = req.body;
  const { startDate, endDate, iRakyatYN, iBizRakyatYN, submittedBy } = body;
  const mntLog: Omit<NewMaintenanceLog, 'startDate' | 'endDate'> = {
    extendedStartDate: new Date(startDate),
    extendedEndDate: new Date(endDate),
    iRakyatYN: iRakyatYN,
    iBizRakyatYN: iBizRakyatYN,
    submittedBy: submittedBy,
    submittedAt: new Date(),
  };
  const log = (await MntService.getMntLog(id)).mntLog;
  const result = await MntService.updateMntLog(id, mntLog);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `edit failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(log),
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'maintenance log not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `request edited`,
    newValue: JSON.stringify(result.updatedLog),
    status: 'S',
    previousValue: JSON.stringify(log),
  });
  res.status(200).json({ message: result.message });
}

/***
 * @method DELETE
 * @param {id: string}
 * @returns All records of Maintenance Data
 */
export async function httpDelMntLog(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await MntService.delMntLog(id);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `delete failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'maintenance log not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `request deleted`,
    newValue: null,
    status: 'S',
    previousValue: JSON.stringify(result.deletedLog),
  });
  res.status(200).json({ message: result.message });
}

/***
 * @method POST
 * @param None
 * @returns Approve Maintenance Logs
 */
export async function httpApproveMntLogs(
  req: Request<{}, {}, { ids: string[]; email: string }>,
  res: Response
) {
  const { ids, email } = req.body;
  const prevLogs = Promise.all(
    ids.map(async (id) => {
      return (await MntService.getMntLog(ids[0])).mntLog;
    })
  );
  const result = await MntService.approveMntLogs(ids, email);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `approve failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevLogs),
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'Maintenance log not found. Make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `request approved`,
    newValue: JSON.stringify(result.approvedLog),
    status: 'S',
    previousValue: JSON.stringify(prevLogs),
  });
  res.status(200).json({ message: result.message });
}

/***
 * @method POST
 * @param None
 * @returns Reject Maintenance Logs
 */
export async function httpRejectMntLogs(
  req: Request<{}, {}, { ids: string[]; email: string; msg: string }>,
  res: Response
) {
  const { ids, email, msg } = req.body;
  const result = await MntService.rejectMntLogs(ids, email, msg);
  const prevLogs = Promise.all(
    ids.map(async (id) => {
      return (await MntService.getMntLog(ids[0])).mntLog;
    })
  );
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `reject failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevLogs),
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'Maintenance log not found. Make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `request rejected`,
    newValue: JSON.stringify(result.rejectedLogs),
    status: 'S',
    previousValue: JSON.stringify(prevLogs),
  });
  res.status(200).json({ message: result.message });
}

export async function httpGetRejectionLogs(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await RjtService.getRejectionLogs(id);

  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'Rejection log not found. Make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpCompleteMntLogs(
  req: Request<{}, {}, { id: string; channel: string }>,
  res: Response
) {
  const { id, channel } = req.body;
  const prevLog = (await MntService.getMntLog(id)).mntLog;
  const result = await MntService.completeMntLogs(id, channel);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.SYSTEM_MAINTENANCE,
      description: `complete failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevLog),
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'Maintenance log not found. Make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.SYSTEM_MAINTENANCE,
    description: `request completed`,
    newValue: JSON.stringify(result.completeMntLog),
    status: 'S',
    previousValue: JSON.stringify(prevLog),
  });
  res.status(200).json(result);
}
