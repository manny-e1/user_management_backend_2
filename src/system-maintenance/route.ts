import { Router } from 'express';
import * as MaintenanceController from '@/system-maintenance/controller.js';
import { errorCatcher } from '@/middleware/error-middleware.js';

const router = Router();

router
  .route('/')
  .post(errorCatcher(MaintenanceController.httpCreateMntLogs))
  .get(errorCatcher(MaintenanceController.httpGetMntLogs));

router
  .route('/:id')
  .get(errorCatcher(MaintenanceController.httpGetMntLog))
  .put(errorCatcher(MaintenanceController.httpUpdateMntLog))
  .delete(errorCatcher(MaintenanceController.httpDelMntLog));

router
  .route('/approve')
  .post(errorCatcher(MaintenanceController.httpApproveMntLogs));

router
  .route('/reject')
  .post(errorCatcher(MaintenanceController.httpRejectMntLogs));

router
  .route('/complete')
  .post(errorCatcher(MaintenanceController.httpCompleteMntLogs));

router
  .route('/rejection/:id')
  .get(errorCatcher(MaintenanceController.httpGetRejectionLogs));

export { router as maintenanceLogRouter };
