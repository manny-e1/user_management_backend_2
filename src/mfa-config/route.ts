import { Router } from 'express';
import * as mfaConfigController from '@/mfa-config/controller.js';
import { errorCatcher } from '@/middleware/error-middleware.js';

const r = Router();

r.route('/')
  .post(errorCatcher(mfaConfigController.httpCreateMFAConfig))
  .get(errorCatcher(mfaConfigController.httpGetMFAConfigs));
r.get(
  '/last-updated',
  errorCatcher(mfaConfigController.httpGetLastUpdatedValue)
);
r.route('/:id')
  .get(errorCatcher(mfaConfigController.httpGetMFAConfig))
  .patch(errorCatcher(mfaConfigController.httpUpdateMFAConfig));
r.patch('/:id/review', errorCatcher(mfaConfigController.httpReviewMFAConfig));

export { r as mfaConfigRouter };
