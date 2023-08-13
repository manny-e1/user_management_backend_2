import { errorCatcher } from "@/middleware/error-middleware.js";
import { Router } from "express";
import * as commonController from './controller.js';

const router = Router();

router
	.post('/pending', errorCatcher(commonController.httpGetPendingCount))

export { router as commonRouter }