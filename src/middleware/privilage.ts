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
    if (
      !req.originalUrl.includes('last-updated') &&
      req.originalUrl !== '/api/maintenance'
    ) {
      throw createHttpError.Unauthorized();
    }
    next();
    return;
  }
  try {
    const parsedToken = ZJwtPayload.safeParse(
      jwt.verify(token, process.env.SECRET_KEY)
    );
    if (!parsedToken.success) {
      throw createHttpError.Unauthorized();
    }
    const userAgent = req.headers['user-agent'] || '';
    const result = await getLoginSession({
      userAgent,
      userId: parsedToken.data.id,
      sessionToken: token,
    });
    if (result.error) {
      throw createHttpError.Unauthorized();
    }
    req.user = {
      id: result.loginSession?.userId,
      role: result.loginSession?.userRole,
      email: result.loginSession?.userEmail,
    };
    next();
  } catch (error) {
    throw createHttpError.Unauthorized((error as Error).message);
  }
}

export async function isAdminOrAdmin4(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'admin 4')
    throw createHttpError.Forbidden();
  next();
}

export async function isAdmin3OrAdmin4(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin 3' && req.user?.role !== 'admin 4')
    throw createHttpError.Forbidden();
  next();
}

export async function isAdminOrAdmin2OrAdmin4(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (
    req.user?.role !== 'admin' &&
    req.user?.role !== 'admin 2' &&
    req.user?.role !== 'admin 4'
  )
    throw createHttpError.Forbidden();
  next();
}

export async function isManager1(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'manager 1') throw createHttpError.Forbidden();
  next();
}
export async function isManager2(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'manager 2') throw createHttpError.Forbidden();
  next();
}
export async function isNormalUser1(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'normal user 1') throw createHttpError.Forbidden();
  next();
}
export async function isNormalUser2(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'normal user 2') throw createHttpError.Forbidden();
  next();
}

export async function isNormalUser1OrManager1(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (!req.user) {
    next();
    return;
  }
  if (req.user?.role !== 'normal user 1' && req.user?.role !== 'manager 1')
    throw createHttpError.Forbidden();
  next();
}

export async function isNormalUser2OrManager2(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (!req.user) {
    next();
    return;
  }
  if (req.user?.role !== 'normal user 2' && req.user?.role !== 'manager 2')
    throw createHttpError.Forbidden();
  next();
}
