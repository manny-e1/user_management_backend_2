import { Request, Response } from "express";
import createHttpError from "http-errors";
import * as CommonService from './service.js';

export async function httpGetPendingCount(
	req: Request<{}, {}, {type: string}>,
	res: Response
) {
	const {type} = req.body;
	const result = await CommonService.getPendingCount(type);
	if (result.error) {
		throw createHttpError(result.error);
	}

	res.status(200).json(result);
}