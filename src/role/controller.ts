import { Role } from '@/db/schema.js';
import { Request, Response } from 'express';
import * as RoleService from '@/role/service.js';
import createHttpError from 'http-errors';
import { isRole } from './helper.js';

export async function httpCreateRole(
  req: Request<{}, {}, { role: Role }>,
  res: Response
) {
  const { role } = req.body;
  if (!isRole(role)) {
    throw createHttpError.BadRequest('Invalid role');
  }
  const result = await RoleService.createRole(role);
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(201).json(result);
}

export async function httpGetRole(req: Request, res: Response) {
  const result = await RoleService.getAllRoles();
  if (result.error) {
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}
