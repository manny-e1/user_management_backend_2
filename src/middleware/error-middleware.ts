import { Request, NextFunction, Response } from 'express';
import createError, { HttpError } from 'http-errors';
import { IsJsonString } from '../utils/helpers.js';

export interface ParamsDictionary {
  [key: string]: string;
}

type ControllerFn<
  Params extends ParamsDictionary,
  Res,
  Req,
  Query extends Record<string, any>
> = (
  req: Request<Params, Res, Req, Query>,
  res: Response,
  next: NextFunction
) => void;

export function notFound(req: Request, _: Response, next: NextFunction) {
  next(createError(404, `Not Found - ${req.method} ${req.originalUrl}`));
}

export function errorCatcher<
  Params extends ParamsDictionary,
  Res,
  Req,
  Query extends Record<string, any>
>(fn: ControllerFn<Params, Res, Req, Query>) {
  return (
    req: Request<Params, Res, Req, Query>,
    res: Response,
    next: NextFunction
  ) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: Error | HttpError,
  _: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  res.status(statusCode).json({
    error: IsJsonString(err.message) ? JSON.parse(err.message) : err.message,
  });
}
