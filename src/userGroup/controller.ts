import { Request, Response } from 'express';
import type { CreateUserGroup } from '@/userGroup/service.js';
import * as UserGroupService from '@/userGroup/service.js';
import createHttpError from 'http-errors';
import { ERRORS, MODULES } from '@/utils/constants.js';
import * as AuditLogService from '@/audit-logs/service.js';

export async function httpCreateUserGroup(
  req: Request<{}, {}, CreateUserGroup>,
  res: Response
) {
  const { name, roleId } = req.body;
  const errObj = {
    performedBy: req.user.email!,
    module: MODULES.GROUP_AND_ROLE_MAINTENANCE,
    description: `user group creation failed`,
    newValue: null,
    status: 'F',
    previousValue: null,
  } as const;
  if (!name || !roleId) {
    AuditLogService.createAuditLog(errObj);
    throw createHttpError(
      'please make sure name and roleId is in the request body'
    );
  }
  const result = await UserGroupService.createUserGroup({ name, roleId });
  if (result.error) {
    AuditLogService.createAuditLog(errObj);
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    ...errObj,
    description: `user group[${result.group?.name}] created`,
    newValue: JSON.stringify(result.group),
    status: 'S',
  });
  res.status(201).json({ message: result.message });
}

export async function httpGetAllUserGroups(req: Request, res: Response) {
  const result = await UserGroupService.getAllUserGroups();
  if (result.error) {
    throw createHttpError(result.error);
  }
  const userGroups = result.userGroups?.map((userGroup, index) => ({
    ...userGroup,
    idx: index + 1,
  }));
  res.status(200).json({ userGroups });
}

export async function httpGetUserGroup(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await UserGroupService.getUserGroup(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user group not found');
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpEditUserGroup(
  req: Request<{ id: string }, {}, CreateUserGroup>,
  res: Response
) {
  const { id } = req.params;
  const { roleId, name } = req.body;
  const group = (await UserGroupService.getUserGroup(id)).userGroup;
  const result = await UserGroupService.editUserGroup({
    id,
    body: { roleId, name },
  });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.GROUP_AND_ROLE_MAINTENANCE,
      description: `user group[${group?.name}] edit failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(group),
    });
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        "Couldn't update user-group, make your the user-group id is valid"
      );
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.GROUP_AND_ROLE_MAINTENANCE,
    description: `user group[${group?.name}] edited`,
    newValue: JSON.stringify({ ...group, role: roleId, name }),
    status: 'S',
    previousValue: JSON.stringify(group),
  });
  res.status(200).json(result);
}

export async function httpDeleteUserGroup(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const group = (await UserGroupService.getUserGroup(id)).userGroup;
  const result = await UserGroupService.deleteUserGroup(id);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.GROUP_AND_ROLE_MAINTENANCE,
      description: `user group[${group?.name}] delete failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(group),
    });
    if (result.error === ERRORS.DELETE_FAILED) {
      throw createHttpError.NotFound(
        'Failed to delete user-group, make your the user-group id is valid'
      );
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.GROUP_AND_ROLE_MAINTENANCE,
    description: `user group[${group?.name}] deleted`,
    newValue: null,
    status: 'S',
    previousValue: JSON.stringify(group),
  });
  res.status(200).json(result);
}
