import { Router } from 'express';
import * as TransactionLogController from '@/transaction-limit/controller.js';
import { errorCatcher } from '@/middleware/error-middleware.js';

const router = Router();

router
  .route('/')
  .post(errorCatcher(TransactionLogController.httpCreateTxnLog))
  .get(errorCatcher(TransactionLogController.httpGetTxnLogs));
router.get(
  '/last-updated',
  errorCatcher(TransactionLogController.httpGetLastUpdatedValue)
);
router
  .route('/:id')
  .get(errorCatcher(TransactionLogController.httpGetTxnLog))
  .put(errorCatcher(TransactionLogController.httpChangeStatus));

export { router as transactionLogRouter };
