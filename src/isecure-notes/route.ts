import { Router } from 'express';
import * as iSecureNoteController from '@/isecure-notes/controller.js';
import {
  errorCatcher,
  validateRequest,
} from '@/middleware/error-middleware.js';
import {
  CreateISecureNote,
  ReviewISecureNote,
  UpdateISecureNote,
} from './types.js';
import { upload } from '@/utils/upload-image.js';
import { isAuthenticated } from '@/middleware/privilage.js';

const r = Router();

r.route('/')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(upload.single('image')),
    errorCatcher(iSecureNoteController.httpCreateISecureNote)
  )
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(iSecureNoteController.httpGetISecureNotes)
  );
r.get(
  '/last-updated',
  errorCatcher(isAuthenticated),
  errorCatcher(iSecureNoteController.httpGetLastUpdatedValue)
);
r.route('/:id')
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(iSecureNoteController.httpGetISecureNote)
  )
  .patch(
    errorCatcher(isAuthenticated),
    validateRequest({ body: UpdateISecureNote }),
    errorCatcher(upload.single('image')),
    errorCatcher(iSecureNoteController.httpUpdateISecureNote)
  );
r.patch(
  '/:id/review',
  errorCatcher(isAuthenticated),
  validateRequest({ body: ReviewISecureNote }),
  errorCatcher(iSecureNoteController.httpReviewISecureNote)
);

export { r as iSecureNoteRouter };
