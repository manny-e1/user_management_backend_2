import { Router } from 'express';
import * as controller from './controller.js';
import {
  errorCatcher,
  validateRequest,
} from '@/middleware/error-middleware.js';
import { AuditLogFilter } from './type.js';
import { isAuthenticated } from '@/middleware/privilage.js';

const r = Router();

r.get(
  '/',
  errorCatcher(isAuthenticated),
  // validateRequest({ query: AuditLogFilter }),
  errorCatcher(controller.httpGetAuditLogs)
);
r.get(
  '/:id',
  errorCatcher(isAuthenticated),
  validateRequest({ query: AuditLogFilter }),
  errorCatcher(controller.httpGetAuditLog)
);

export { r as auditLogRouter };
