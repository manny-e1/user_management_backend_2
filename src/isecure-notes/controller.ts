import { Request, Response } from 'express';
import { CreateISecureNote, ReviewISecureNote } from './types.js';
import * as iSecureNoteService from './service.js';
import createHttpError from 'http-errors';
import { ERRORS } from '@/utils/errors.js';

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
    throw createHttpError(result.error);
  }
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
  const result = await iSecureNoteService.reviewISecureNote(id, {
    status,
    reason,
    checker: req.user.id!,
  });
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

export async function httpUpdateISecureNote(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  if (!req.file) {
    throw createHttpError.BadRequest('no file uploaded');
  }
  const result = await iSecureNoteService.updateImage({
    id,
    image: req.file.filename,
  });
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
