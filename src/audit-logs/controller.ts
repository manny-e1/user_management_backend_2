import { Request, Response } from 'express';
import * as AuditLogService from './service.js';
import createHttpError from 'http-errors';
import { ERRORS } from '@/utils/constants.js';
import { AuditLogFilter } from './type.js';

export async function httpGetAuditLogs(
  req: Request<{}, {}, {}, AuditLogFilter>,
  res: Response
) {
  const result = await AuditLogService.getAuditLogs(req.query);
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetAuditLog(req: Request, res: Response) {
  const { id } = req.params;
  const result = await AuditLogService.getAuditLog(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'audit log not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}
