import { Router } from 'express';
import * as MaintenanceController from '@/system-maintenance/controller.js';
import { errorCatcher } from '@/middleware/error-middleware.js';
import {
  isAuthenticated,
  isManager2,
  isNormalUser2,
  isNormalUser2OrManager2,
} from '@/middleware/privilage.js';

const router = Router();

router
  .route('/')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2OrManager2),
    errorCatcher(MaintenanceController.httpCreateMntLogs)
  )
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2OrManager2),
    errorCatcher(MaintenanceController.httpGetMntLogs)
  );

router
  .route('/:id')
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2OrManager2),
    errorCatcher(MaintenanceController.httpGetMntLog)
  )
  .put(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2),
    errorCatcher(MaintenanceController.httpUpdateMntLog)
  )
  .delete(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2),
    errorCatcher(MaintenanceController.httpDelMntLog)
  );

router
  .route('/approve')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isManager2),
    errorCatcher(MaintenanceController.httpApproveMntLogs)
  );

router
  .route('/reject')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isManager2),
    errorCatcher(MaintenanceController.httpRejectMntLogs)
  );

router
  .route('/complete')
  .post(
    errorCatcher(isAuthenticated),
    errorCatcher(isManager2),
    errorCatcher(MaintenanceController.httpCompleteMntLogs)
  );

router
  .route('/rejection/:id')
  .get(
    errorCatcher(isAuthenticated),
    errorCatcher(isNormalUser2OrManager2),
    errorCatcher(MaintenanceController.httpGetRejectionLogs)
  );

export { router as maintenanceLogRouter };
