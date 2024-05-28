import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as UserGroupController from '@/userGroup/controller.js';
import {
  isAdminOrAdmin2OrAdmin4,
  isAuthenticated,
} from '@/middleware/privilage.js';

const router = Router();

router
  .route('/')
  .all(errorCatcher(isAuthenticated), errorCatcher(isAdminOrAdmin2OrAdmin4))
  .post(errorCatcher(UserGroupController.httpCreateUserGroup))
  .get(errorCatcher(UserGroupController.httpGetAllUserGroups));
router
  .route('/:id')
  .all(errorCatcher(isAuthenticated), errorCatcher(isAdminOrAdmin2OrAdmin4))
  .get(errorCatcher(UserGroupController.httpGetUserGroup))
  .put(errorCatcher(UserGroupController.httpEditUserGroup))
  .delete(errorCatcher(UserGroupController.httpDeleteUserGroup));

export { router as userGroupRouter };
