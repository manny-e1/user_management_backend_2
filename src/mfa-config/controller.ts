import { Request, Response } from 'express';
import { CreateMFAConfig, ReviewMFAConfig, UpdateMFAConfig } from './types.js';
import * as MFAConfigService from './service.js';
import createHttpError from 'http-errors';
import { ERRORS, MODULES } from '@/utils/constants.js';
import * as AuditLogService from '@/audit-logs/service.js';

export async function httpCreateMFAConfig(
  req: Request<{}, {}, CreateMFAConfig>,
  res: Response
) {
  const { cMA, cMO, cSMS, nMA, nMO, nSMS } = req.body;
  const result = await MFAConfigService.create({
    maker: req.user.id!,
    cMA,
    cMO,
    cSMS,
    nMA,
    nMO,
    nSMS,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.MFA_CONFIGURATION,
      description: `new request failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.MFA_CONFIGURATION,
    description: `new request added`,
    newValue: JSON.stringify(result.mfaConfig),
    status: 'S',
    previousValue: null,
  });
  res.status(201).json({ message: result.message });
}

export async function httpGetMFAConfigs(req: Request, res: Response) {
  const result = await MFAConfigService.getMFAConfigs();
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetMFAConfig(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await MFAConfigService.getMFAConfig(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'mfa configuration not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetLastUpdatedValue(req: Request, res: Response) {
  const result = await MFAConfigService.getLastUpdatedValue();
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(result.error);
    }
    throw createHttpError(result.error);
  }

  if (req.user) {
    return res.json(result);
  }
  const { id, cSMS, cMO, cMA, nSMS, nMO, nMA, status, createdAt, updatedAt } =
    result.mfaConfig!;
  res.json({
    mfaConfig: {
      id,
      cSMS,
      cMO,
      cMA,
      nSMS,
      nMO,
      nMA,
      status,
      createdAt,
      updatedAt,
    },
  });
}

export async function httpUpdateMFAConfig(
  req: Request<{ id: string }, {}, UpdateMFAConfig>,
  res: Response
) {
  const { id } = req.params;
  const result = await MFAConfigService.update(id, req.body);
  if (result.error) {
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.InternalServerError('update failed');
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpReviewMFAConfig(
  req: Request<{ id: string }, {}, ReviewMFAConfig>,
  res: Response
) {
  const { id } = req.params;
  const { status, reason } = req.body;
  const prevConfig = (await MFAConfigService.getMFAConfig(id)).mfaConfig;
  const errMsg = status === 'approved' ? 'approval failed' : 'rejection failed';
  const successMsg =
    status === 'approved' ? 'request approved' : 'request rejected';
  const result = await MFAConfigService.reviewMFAConfig(id, {
    status,
    reason,
    checker: req.user.id!,
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.MFA_CONFIGURATION,
      description: errMsg,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevConfig),
    });
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.InternalServerError('update failed');
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.MFA_CONFIGURATION,
    description: successMsg,
    newValue: JSON.stringify(result.mfaConfig),
    status: 'S',
    previousValue: JSON.stringify(prevConfig),
  });
  res.status(200).json(result);
}
