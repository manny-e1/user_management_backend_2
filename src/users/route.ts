import { errorCatcher } from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as UserController from '@/users/controller.js';

const router = Router();

router
  .route('/')
  .post(errorCatcher(UserController.httpCreateUser))
  .get(errorCatcher(UserController.httpGetAllUsers));
router.post('/login', errorCatcher(UserController.httpLogin));
router.get('/check', errorCatcher(UserController.httpCheckUserByUserGroup));
router.patch('/activate', errorCatcher(UserController.httpActivateUser));
router.post(
  '/forgot-password',
  errorCatcher(UserController.httpForgotPassword)
);
router.post(
  '/check-current-password',
  errorCatcher(UserController.httpCheckCurrrentPassword)
);
router.get(
  '/check-token',
  errorCatcher(UserController.httpCheckResetPasswordToken)
);
router.post('/reset-password', errorCatcher(UserController.httpResetPassword));
router.patch(
  '/change-status',
  errorCatcher(UserController.httpChangeUserStatus)
);
// router.delete(
//   '/delete-wrong-passwords',
//   errorCatcher(UserController.httpDeleteWrongPassTrials)
// );
router
  .route('/:id')
  .get(errorCatcher(UserController.httpGetUser))
  .put(errorCatcher(UserController.httpEditUser))
  .delete(errorCatcher(UserController.httpDeleteUser));
export { router as userRouter };
