import { Router } from 'express';
import * as TransactionLogController from '@/transaction-limit/controller.js';
import { errorCatcher } from '@/middleware/error-middleware.js';
import {
  isAuthenticated,
  isManager1,
  isNormalUser1,
  isNormalUser1OrManager1,
} from '@/middleware/privilage.js';

const router = Router();

router
  .route('/')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser1),
    errorCatcher(TransactionLogController.httpCreateTxnLog)
  )
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser1OrManager1),
    errorCatcher(TransactionLogController.httpGetTxnLogs)
  );
router.get(
  '/last-updated',
  errorCatcher(isAuthenticated),
  errorCatcher(isNormalUser1OrManager1),
  errorCatcher(TransactionLogController.httpGetLastUpdatedValue)
);
router
  .route('/:id')
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser1OrManager1),
    errorCatcher(TransactionLogController.httpGetTxnLog)
  )
  .put(
    errorCatcher(isAuthenticated),
    errorCatcher(isManager1),
    errorCatcher(TransactionLogController.httpChangeStatus)
  );

export { router as transactionLogRouter };
