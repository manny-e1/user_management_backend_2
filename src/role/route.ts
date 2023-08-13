import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as RoleController from '@/role/controller.js';

const router = Router();

router
  .route('/')
  .post(errorCatcher(RoleController.httpCreateRole))
  .get(errorCatcher(RoleController.httpGetRole));

export { router as roleRouter };
