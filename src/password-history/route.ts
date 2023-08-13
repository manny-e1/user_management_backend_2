import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import {
  httpChangeLastPwdDate,
  httpCheckPasswordValidity,
} from './controller.js';

const router = Router();

router.get('/:userId', errorCatcher(httpCheckPasswordValidity));
router.post('/change-date', errorCatcher(httpChangeLastPwdDate));
export { router as passwordHistoryRouter };
