import { Router } from 'express';
import * as mfaConfigController from '@/mfa-config/controller.js';
import {
  errorCatcher,
  validateRequest,
} from '@/middleware/error-middleware.js';
import { CreateMFAConfig, ReviewMFAConfig } from './types.js';

const r = Router();

r.route('/')
  .post(
    validateRequest({ body: CreateMFAConfig }),
    errorCatcher(mfaConfigController.httpCreateMFAConfig)
  )
  .get(errorCatcher(mfaConfigController.httpGetMFAConfigs));
r.get(
  '/last-updated',
  errorCatcher(mfaConfigController.httpGetLastUpdatedValue)
);
r.route('/:id').get(errorCatcher(mfaConfigController.httpGetMFAConfig));
// .patch(errorCatcher(mfaConfigController.httpUpdateMFAConfig));
r.patch(
  '/:id/review',
  validateRequest({ body: ReviewMFAConfig }),
  errorCatcher(mfaConfigController.httpReviewMFAConfig)
);

export { r as mfaConfigRouter };
