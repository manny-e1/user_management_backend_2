import {
  errorCatcher,
  validateRequest,
} from '@/middleware/error-middleware.js';
import { Router } from 'express';
import * as UserController from '@/users/controller.js';
import { isAdminOrAdmin4, isAuthenticated } from '@/middleware/privilage.js';
import { Email } from './types.js';

const router = Router();

router
  .route('/')
  .all(errorCatcher(isAuthenticated), errorCatcher(isAdminOrAdmin4))
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
  errorCatcher(isAuthenticated),
  errorCatcher(UserController.httpCheckCurrrentPassword)
);
router.get(
  '/check-token',
  errorCatcher(UserController.httpCheckResetPasswordToken)
);
router.post('/reset-password', errorCatcher(UserController.httpResetPassword));
router.patch(
  '/change-status',
  errorCatcher(isAuthenticated),
  errorCatcher(isAdminOrAdmin4),
  errorCatcher(UserController.httpChangeUserStatus)
);

router.post(
  '/resend-email',
  validateRequest({ body: Email }),
  errorCatcher(isAuthenticated),
  errorCatcher(isAdminOrAdmin4),
  errorCatcher(UserController.httpResendAcctivationEmail)
);
router.patch(
  '/:id',
  errorCatcher(isAuthenticated),
  errorCatcher(UserController.httpLogoutUser)
);
router
  .route('/:id')
  .all(errorCatcher(isAuthenticated), errorCatcher(isAdminOrAdmin4))
  .get(errorCatcher(UserController.httpGetUser))
  .put(errorCatcher(UserController.httpEditUser))
  .delete(errorCatcher(UserController.httpDeleteUser));
export { router as userRouter };
