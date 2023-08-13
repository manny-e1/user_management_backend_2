import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as UserGroupController from '@/userGroup/controller.js';

const router = Router();

router
  .route('/')
  .post(errorCatcher(UserGroupController.httpCreateUserGroup))
  .get(errorCatcher(UserGroupController.httpGetAllUserGroups));
router
  .route('/:id')
  .get(errorCatcher(UserGroupController.httpGetUserGroup))
  .put(errorCatcher(UserGroupController.httpEditUserGroup))
  .delete(errorCatcher(UserGroupController.httpDeleteUserGroup));

export { router as userGroupRouter };
