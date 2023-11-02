import type { NewTransactionLog } from '@/db/schema.js';
import type { ChangeStatus } from '@/transaction-limit/service.js';
import { Request, Response } from 'express';
import * as TxnLimitService from '@/transaction-limit/service.js';
import createHttpError from 'http-errors';
import { ERRORS } from '@/utils/errors.js';

export async function httpCreateTxnLog(
  req: Request<{}, {}, NewTransactionLog>,
  res: Response
) {
  const { cCIB, cCMB, cRIB, cRMB, nCIB, nCMB, nRIB, nRMB, marker } = req.body;
  const result = await TxnLimitService.createTxnLog({
    cCIB,
    cCMB,
    cRIB,
    cRMB,
    nCIB,
    nCMB,
    nRIB,
    nRMB,
    marker,
  });
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(201).json(result);
}

export async function httpGetTxnLogs(req: Request, res: Response) {
  const result = await TxnLimitService.getTxnLogs();
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetTxnLog(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await TxnLimitService.getTxnLog(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'transaction log not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetLastUpdatedValue(req: Request, res: Response) {
  const result = await TxnLimitService.getLastUpdatedValue();
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(result.error);
    }
    throw createHttpError(result.error);
  }

  if (req.user) {
    return res.json(result);
  }
  const {
    cCIB,
    cCMB,
    cRIB,
    cRMB,
    id,
    createdAt,
    nCIB,
    nCMB,
    nRIB,
    nRMB,
    status,
    updatedAt,
  } = result.txnLog!;
  res.json({
    txnLog: {
      cCIB,
      cCMB,
      cRIB,
      cRMB,
      nCIB,
      nCMB,
      nRIB,
      nRMB,
      id,
      createdAt,
      status,
      updatedAt,
    },
  });
}

export async function httpChangeStatus(
  req: Request<{ id: string }, {}, Omit<ChangeStatus, 'id'>>,
  res: Response
) {
  const { checker, msg, status } = req.body;
  const { id } = req.params;
  const result = await TxnLimitService.changeStatus({
    id,
    checker,
    msg,
    status,
  });
  if (result.error) {
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        'updating transaction log failed, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.json(result);
}
