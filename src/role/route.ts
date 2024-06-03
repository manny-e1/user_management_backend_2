import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as RoleController from '@/role/controller.js';
import {
  isAdminOrAdmin2OrAdmin4,
  isAdminOrAdmin4,
  isAuthenticated,
} from '@/middleware/privilage.js';

const router = Router();

router
  .route('/')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isAdminOrAdmin4),
    errorCatcher(RoleController.httpCreateRole)
  )
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isAdminOrAdmin2OrAdmin4),
    errorCatcher(RoleController.httpGetRole)
  );

export { router as roleRouter };
