import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as RoleController from '@/role/controller.js';
import {
  isAdmin,
  isAdminOrAdmin2,
  isAuthenticated,
} from '@/middleware/privilage.js';

const router = Router();

router
  .route('/')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isAdmin),
    errorCatcher(RoleController.httpCreateRole)
  )
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isAdminOrAdmin2),
    errorCatcher(RoleController.httpGetRole)
  );

export { router as roleRouter };
