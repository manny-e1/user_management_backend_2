import { getLoginSession } from '@/users/service.js';
import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { number, object, string } from 'zod';

const ZJwtPayload = object({ id: string(), iat: number() });

export async function isAuthenticated(
  req: Request,
  _: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.includes('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : undefined;
  if (!token) {
    throw createHttpError.Unauthorized();
  }
  try {
    const parsedToken = ZJwtPayload.safeParse(
      jwt.verify(token, process.env.SECRET_KEY)
    );
    if (!parsedToken.success) {
      throw createHttpError.Unauthorized();
    }
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await getLoginSession({
      ip,
      userAgent,
      userId: parsedToken.data.id,
    });
    if (result.error) {
      throw createHttpError.Unauthorized();
    }
    req.user = {
      id: result.loginSession?.userId,
      role: result.loginSession?.userRole,
    };
    next();
  } catch (error) {
    throw new Error((error as Error).message);
  }
}

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== 'admin') throw createHttpError.Forbidden();
  next();
}

export async function isAdminOrAdmin2(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'admin' && req.user.role !== 'admin 2')
    throw createHttpError.Forbidden();
  next();
}

export async function isManager1(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'manager 1') throw createHttpError.Forbidden();
  next();
}
export async function isManager2(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'manager 2') throw createHttpError.Forbidden();
  next();
}
export async function isNormalUser1(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'normal user 1') throw createHttpError.Forbidden();
  next();
}
export async function isNormalUser2(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'normal user 2') throw createHttpError.Forbidden();
  next();
}

export async function isNormalUser1OrManager1(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'normal user 1' && req.user.role !== 'manager 1')
    throw createHttpError.Forbidden();
  next();
}

export async function isNormalUser2OrManager2(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user.role !== 'normal user 2' && req.user.role !== 'manager 2')
    throw createHttpError.Forbidden();
  next();
}
