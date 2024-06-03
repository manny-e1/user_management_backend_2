import { Request, Response } from 'express';
import { CreateISecureNote, ReviewISecureNote } from './types.js';
import * as iSecureNoteService from './service.js';
import createHttpError from 'http-errors';
import { ERRORS, MODULES } from '@/utils/constants.js';
import * as AuditLogService from '@/audit-logs/service.js';

export async function httpCreateISecureNote(
  req: Request<{}, {}, CreateISecureNote>,
  res: Response
) {
  const { cDisplayStatus, nDisplayStatus } = req.body;
  if (!req.file) {
    throw createHttpError.BadRequest('no file uploaded');
  }
  const result = await iSecureNoteService.createISecureNote({
    cDisplayStatus,
    nDisplayStatus,
    image: req.file.filename!,
    createdAt: new Date(),
    updatedAt: new Date(),
    maker: req.user.id!,
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.ISECURE_NOTE,
      description: `new request failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.ISECURE_NOTE,
    description: `new request added`,
    newValue: JSON.stringify(result.note),
    status: 'S',
    previousValue: null,
  });
  res.status(201).json(result);
}

export async function httpGetISecureNotes(req: Request, res: Response) {
  const result = await iSecureNoteService.getISecureNotes();
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetISecureNote(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await iSecureNoteService.getISecureNote(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(
        'i-secure note not found, make sure the id is valid'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpGetLastUpdatedValue(req: Request, res: Response) {
  const result = await iSecureNoteService.getLastUpdatedValue();
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound(result.error);
    }
    throw createHttpError(result.error);
  }

  if (req.user) {
    return res.json(result);
  }
  const { id, cDisplayStatus, nDisplayStatus, status, createdAt, updatedAt } =
    result.iSecureNote!;
  res.json({
    mfaConfig: {
      id,
      cDisplayStatus,
      nDisplayStatus,
      status,
      createdAt,
      updatedAt,
    },
  });
}

export async function httpReviewISecureNote(
  req: Request<{ id: string }, {}, ReviewISecureNote>,
  res: Response
) {
  const { id } = req.params;
  const { status, reason } = req.body;
  const errMsg = status === 'approved' ? 'approval failed' : 'rejection failed';
  const successMsg =
    status === 'approved' ? 'request approved' : 'request rejected';
  const prevNote = (await iSecureNoteService.getISecureNote(id)).iSecureNote;
  const result = await iSecureNoteService.reviewISecureNote(id, {
    status,
    reason,
    checker: req.user.id!,
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.ISECURE_NOTE,
      description: errMsg,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevNote),
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
    module: MODULES.ISECURE_NOTE,
    description: successMsg,
    newValue: JSON.stringify(result.note),
    status: 'S',
    previousValue: JSON.stringify(prevNote),
  });
  res.status(200).json(result);
}

export async function httpUpdateISecureNote(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  if (!req.file) {
    throw createHttpError.BadRequest('no file uploaded');
  }
  const prevNote = (await iSecureNoteService.getISecureNote(id)).iSecureNote;
  const result = await iSecureNoteService.updateImage({
    id,
    image: req.file.filename,
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.ISECURE_NOTE,
      description: 'image update failed',
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(prevNote),
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
    module: MODULES.ISECURE_NOTE,
    description: 'image updated',
    newValue: JSON.stringify({ ...prevNote, image: req.file.filename }),
    status: 'S',
    previousValue: JSON.stringify(prevNote),
  });
  res.status(200).json(result);
}
