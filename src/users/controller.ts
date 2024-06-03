import { Request, Response } from 'express';
import type { CreateUser } from '@/users/service.js';
import * as UserService from '@/users/service.js';
import createHttpError from 'http-errors';
import { ERRORS, MODULES } from '@/utils/constants.js';
import { Status, User } from '@/db/schema.js';
import {
  generateRandomUuid,
  hasChangedBefore,
  isExpired,
  isSameDay,
} from '@/utils/helpers.js';
import { createToken, getToken } from '@/tokens/service.js';
import { message, transport } from '@/utils/send-email.js';
import argon2 from 'argon2';
import { logger } from '@/logger.js';
import jwt from 'jsonwebtoken';
import * as PasswordHistoryService from '@/password-history/service.js';
import { getUserGroup } from '@/userGroup/service.js';
import { Email } from './types.js';
import * as AuditLogService from '@/audit-logs/service.js';

export async function httpCreateUser(
  req: Request<{}, {}, CreateUser>,
  res: Response
) {
  const { name, email, userGroup, staffId } = req.body;
  if (!name || !email || !userGroup || !staffId) {
    throw createHttpError.BadRequest(
      'please make sure name, email, userGroup and staffId is included in the bpdy'
    );
  }
  const result = await UserService.createUser(req.body);
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: 'user creation failed',
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (
      result.error.includes('email address') ||
      result.error === ERRORS.INVALID_ID
    ) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  const user = result.user!;
  const token = generateRandomUuid(190, 'base64');
  const tok = await createToken({ token, userId: user.id });
  if (tok.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `user creation failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (tok.status) {
      throw createHttpError.BadRequest(tok.error);
    }
    throw createHttpError(tok.error);
  }
  const userGrp = await getUserGroup(user.userGroup);
  if (userGrp.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `user creation failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError(userGrp.error);
  }
  const msg = message({
    token,
    email: user.email,
    subject: 'Email activation',
    name: user.name,
    reset: false,
    userGroup: userGrp.userGroup?.name ?? '',
  });
  transport
    .sendMail(msg)
    .then((_) =>
      logger.info(`user activation email sent to user with address ${email}`)
    )
    .catch((err) =>
      logger.error(`sending user activation email for ${email} failed`, err)
    );
  await AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_MANAGEMENT,
    description: `User[${user.email}] created`,
    newValue: JSON.stringify(user),
    status: 'S',
    previousValue: null,
  });
  res.status(201).json({ message: 'success' });
}

export async function httpGetAllUsers(req: Request, res: Response) {
  const result = await UserService.getAllUsers();
  if (result.error) {
    throw createHttpError(result.error);
  }
  const users = result.users?.map((user, index) => ({
    ...user,
    idx: index + 1,
  }));
  res.status(200).json({ users });
}

export async function httpGetUser(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  const result = await UserService.getUser(id);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError(result.error);
  }
  res.status(200).json(result);
}

export async function httpLogin(
  req: Request<{}, {}, { email: string; password: string }>,
  res: Response
) {
  const { email, password } = req.body;

  const result = await UserService.getUserByEmail(email);
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_LOGIN,
      description: `User[${email}] login failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('invalid credentials');
    }
    throw createHttpError(result.error);
  }

  const user = result.user!;

  if (user.status === 'locked') {
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_LOGIN,
      description: `User[${email}] login failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError.Unauthorized(
      'your account is locked, contact admin to unlock'
    );
  }

  const verify =
    user.password && (await argon2.verify(user.password, password));
  const trailsResult = await UserService.getWrongPasswordTrials(user.id);
  let trailCount = 0;
  if (!trailsResult.error) {
    const trials = trailsResult.trails;
    const today = new Date();
    trials?.forEach((trail) => {
      if (isSameDay(today, trail.createdAt)) {
        trailCount += 1;
      }
    });
  }
  if (!verify && trailCount >= 2) {
    await UserService.addWrongPasswordTrial(user.id);
    await UserService.changeUserStatus({
      id: user.id!,
      status: 'locked',
    });
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_LOGIN,
      description: `user[${email}] login failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError.Unauthorized(
      'You have reached maximum invalid login and your account is locked'
    );
  } else if (!verify) {
    await UserService.addWrongPasswordTrial(user.id);
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_LOGIN,
      description: `User[${email}] login failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    throw createHttpError.Unauthorized('invalid credentials');
  }

  const token = jwt.sign(
    {
      id: user.id,
    },
    process.env.SECRET_KEY
  );
  const userAgent = req.headers['user-agent'] || '';
  const loginSession = await UserService.createLoginSession({
    ip: '',
    userAgent,
    userId: user.id,
    userRole: user.role,
    sessionToken: token,
  });
  if (loginSession.error) {
    throw createHttpError.InternalServerError("couldn't create login session");
  }
  const omitedUser = {
    id: user.id,
    email: user.email,
    status: user.status,
    staffId: user.staffId,
    role: user.role,
    userGroup: user.userGroup,
  };
  await AuditLogService.createAuditLog({
    performedBy: email,
    module: MODULES.USER_LOGIN,
    description: `User[${user.email}] logged in`,
    newValue: JSON.stringify(omitedUser),
    status: 'S',
    previousValue: null,
  });
  return res.status(200).json({
    user: {
      ...omitedUser,
      token,
    },
  });
}

export async function httpChangeUserStatus(
  req: Request<{}, {}, { email: string; status: Status }>,
  res: Response
) {
  const { status, email } = req.body;

  const userResult = await UserService.getUserByEmail(email);
  if (userResult.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `status change failed(while getting user by email)`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (userResult.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError(userResult.error);
  }
  const omitedUser = {
    id: userResult.user!.id,
    email: userResult.user!.email,
    status: userResult.user!.status,
    staffId: userResult.user!.staffId,
    userGroup: userResult.user!.userGroup,
  };
  const result = await UserService.changeUserStatus({
    id: 'id',
    email,
    status,
  });
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `status change failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        "Couldn't change the user status, make sure the user id/email is valid"
      );
    }
    throw createHttpError(result.error);
  }
  if (status === 'active') {
    const result2 = await UserService.deleteWrongPassTrials(result.id!);
    if (result2.error) {
      await AuditLogService.createAuditLog({
        performedBy: req.user.email!,
        module: MODULES.USER_MANAGEMENT,
        description: `status change failed`,
        newValue: null,
        status: 'F',
        previousValue: null,
      });
      if (result2.error === ERRORS.DELETE_FAILED) {
        throw createHttpError.NotFound(
          "failed to delete the user's wrong password trials, make sure the user id is valid"
        );
      }
      throw createHttpError(result2.error);
    }
  }
  await AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_MANAGEMENT,
    description: `User[${email}] status changed`,
    newValue: JSON.stringify({ omitedUser, status }),
    status: 'S',
    previousValue: JSON.stringify(omitedUser),
  });
  res.status(200).json({ message: 'success' });
}

export async function httpCheckUserByUserGroup(
  req: Request<{}, {}, {}, { userGroupId: string }>,
  res: Response
) {
  const { userGroupId } = req.query;

  if (!userGroupId) {
    throw createHttpError.BadRequest('please include userGroupId in the query');
  }
  const result = await UserService.checkUserByUserGroup(userGroupId);
  if (result.error) {
    throw createHttpError(result.error);
  }

  res.json(result);
}

export async function httpEditUser(
  req: Request<{ id: string }, {}, { name: string; userGroup: string }>,
  res: Response
) {
  const { name, userGroup } = req.body;
  const { id: userId } = req.params;
  const userResult = await UserService.getUser(userId, false);
  if (userResult.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `user edit failed(while getting user by id)`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (userResult.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError(userResult.error);
  }

  const result = await UserService.editUser({ name, userGroup, userId });
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `user edit failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(userResult.user),
    });
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        'failed to update user, make sure the user id is correct'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
  await AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_MANAGEMENT,
    description: `User[${userResult.user?.email}] edited`,
    newValue: JSON.stringify({ ...userResult.user, name, userGroup }),
    status: 'S',
    previousValue: JSON.stringify(userResult.user),
  });
  res.json({ message: 'success' });
}

export async function httpActivateUser(
  req: Request<{}, {}, {}, { token: string }>,
  res: Response
) {
  let { token } = req.query;
  if (!token) {
    throw createHttpError.BadRequest('please include token in the query');
  }
  token = token.replace(/\s/g, '+');
  const tok = await getToken({ token });
  if (tok.error) {
    if (tok.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('token not found');
    }
    throw createHttpError(tok.error);
  }
  const expired = isExpired(tok.token?.tokenExpiry!);
  if (expired) {
    throw createHttpError.BadRequest(
      'the token has expired, please request for a new one'
    );
  }
  const result = await UserService.changeUserStatus({
    id: tok.token?.userId!,
    status: 'active',
  });
  if (result.error) {
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        'failed to activate account, make your the user id is valid'
      );
    }
    throw createHttpError(result.error);
  }
  res.json(result);
}

export async function httpResendAcctivationEmail(
  req: Request<{}, {}, Email>,
  res: Response
) {
  const { email } = req.body;
  const result = await UserService.getUserByEmail(email);
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `resend activation email failed for user[${email}]`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError.InternalServerError(result.error);
  }
  const user = result.user!;
  if (user.status === 'active') {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `resend activation email failed for user[${email}]`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });

    throw createHttpError.BadRequest('user is already activated');
  }
  const token = generateRandomUuid(190, 'base64');
  const tok = await createToken({ token, userId: user.id });
  if (tok.error) {
    await AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `resend activation email failed for user[${email}]`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (tok.status) {
      throw createHttpError.BadRequest(tok.error);
    }
    throw createHttpError(tok.error);
  }
  const msg = message({
    token,
    email: user.email,
    subject: 'Email activation',
    name: user.name,
    reset: false,
    userGroup: user.userGroupName || '',
  });
  transport
    .sendMail(msg)
    .then((_) =>
      logger.info(`user activation email sent to user with address ${email}`)
    )
    .catch((err) =>
      logger.error(`sending user activation email for ${email} failed`, err)
    );
  await AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_MANAGEMENT,
    description: `resent activation email for user[${email}]`,
    newValue: null,
    status: 'S',
    previousValue: null,
  });
  res.json({ message: 'success' });
}

export async function httpForgotPassword(
  req: Request<{}, {}, { email: string }>,
  res: Response
) {
  const { email } = req.body;

  logger.info('Forgot password request ...');

  if (!email) {
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_MANAGEMENT,
      description: `forgot password request failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });

    throw createHttpError.BadRequest(
      'please include email in your request body'
    );
  }
  const result = await UserService.getUserByEmail(email);
  if (result.error) {
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_MANAGEMENT,
      description: `forgot password request failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('Email not found');
    }
    throw createHttpError(result.error);
  }
  const user = result.user!;
  const token = generateRandomUuid(190, 'base64');
  const tok = await createToken({ token, userId: user.id });
  if (tok.error) {
    await AuditLogService.createAuditLog({
      performedBy: email,
      module: MODULES.USER_MANAGEMENT,
      description: `forgot password request failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });

    if (tok.status) {
      throw createHttpError.BadRequest(tok.error);
    }
    throw createHttpError(tok.error);
  }
  const msg = message({
    email,
    token,
    subject: 'Password Reset',
    name: user.name,
    reset: true,
    userGroup: user.userGroupName,
  });
  logger.info('transport email ...');
  transport
    .sendMail(msg)
    .then((_) =>
      logger.info(`reset password
         email sent to user with email ${email}`)
    )
    .catch((err) =>
      logger.error(`sending reset passwordemail for ${email} failed`, err)
    );
  await AuditLogService.createAuditLog({
    performedBy: email,
    module: MODULES.USER_MANAGEMENT,
    description: `forgot password request for user[${email}]`,
    newValue: null,
    status: 'S',
    previousValue: null,
  });
  res.json({ message: 'success' });
}

export async function httpCheckResetPasswordToken(
  req: Request<{}, {}, {}, { token: string; src?: 'activate' }>,
  res: Response
) {
  let { token, src } = req.query;
  if (!token) {
    throw createHttpError.BadRequest('Please include token in the query');
  }
  token = token.replace(/\s/g, '+');
  const tok = await getToken({ token });
  if (tok.error) {
    if (tok.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('Token not found');
    }
    throw createHttpError(tok.error);
  }
  const expired = isExpired(tok.token?.tokenExpiry!);
  if (expired) {
    throw createHttpError.BadRequest(
      'The token has expired, please request for a new one'
    );
  }

  if (src && src === 'activate' && tok.token?.status === 'active') {
    throw createHttpError.BadRequest(
      'Your account is already activated. Please login to your account'
    );
  }
  res.json({ user: { id: tok.token?.userId } });
}

export async function httpCheckCurrrentPassword(
  req: Request<{}, {}, { password: string; id: string }>,
  res: Response
) {
  const { id, password } = req.body;
  if (!password || !id) {
    throw createHttpError.BadRequest(
      'Please include password and id in the request body'
    );
  }
  const result = await UserService.getUser(id, true);
  if (result.error) {
    if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(ERRORS.INVALID_ID);
    }
    throw createHttpError(result.error);
  }
  const lastPassword = result.user!.password;

  const verify = await argon2.verify(lastPassword as string, password);
  if (verify) {
    return res.status(200).json({ message: 'success' });
  }
  throw createHttpError.BadRequest('Invalid current password');
}

export async function httpResetPassword(
  req: Request<{}, {}, { password: string; id?: string; src?: 'activate' }>,
  res: Response
) {
  const { password, id, src } = req.body;
  const isActivate = src === 'activate';
  const module = isActivate ? MODULES.USER_ACTIVATION : MODULES.PASSWORD_RESET;
  const errorMessage = `${module} failed`;
  const userId = id ?? req.app.get('user').id;
  let user: Omit<User, 'password' | 'createdAt' | 'updatedAt'> | undefined =
    undefined;
  user = (await UserService.getUser(userId, true)).user;

  const result = await PasswordHistoryService.getPasswordHistory(userId);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: user?.email || '',
      module,
      description: errorMessage,
      newValue: null,
      status: 'F',
      previousValue: isActivate ? JSON.stringify(user) : null,
    });
    if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(ERRORS.INVALID_ID);
    }
    throw createHttpError(result.error);
  }
  const pwdHistory = result.pwdHistory!;
  const changedBefore = await hasChangedBefore(pwdHistory, password);

  if (changedBefore) {
    AuditLogService.createAuditLog({
      performedBy: user?.email || '',
      module,
      description: errorMessage,
      newValue: null,
      status: 'F',
      previousValue: isActivate ? JSON.stringify(user) : null,
    });

    throw createHttpError.BadRequest(
      'You can’t reuse old password. Please enter new password'
    );
  }

  if (src !== 'activate') {
    let todayChangeCount = 0;
    const today = new Date();
    pwdHistory
      .filter((pwd) => pwd.source === 'reset')
      .forEach((history) => {
        if (isSameDay(today, history.createdAt)) {
          todayChangeCount++;
        }
      });

    if (todayChangeCount >= 2) {
      AuditLogService.createAuditLog({
        performedBy: user?.email || '',
        module,
        description: errorMessage,
        newValue: null,
        status: 'F',
        previousValue: isActivate ? JSON.stringify(user) : null,
      });

      throw createHttpError.BadRequest(
        'You’ve exceeded the number of times password update per day. Please try again tomorrow'
      );
    }
  }

  if (isActivate) {
    const result = await UserService.changeUserStatus({
      id: userId,
      status: 'active',
    });
    if (result.error) {
      AuditLogService.createAuditLog({
        performedBy: user?.email || '',
        module,
        description: errorMessage,
        newValue: null,
        status: 'F',
        previousValue: isActivate ? JSON.stringify(user) : null,
      });
      if (result.error === ERRORS.UPDATE_FAILED) {
        throw createHttpError.NotFound(
          'failed to activate account, make your the user id is valid'
        );
      }
      throw createHttpError(result.error);
    }
  }
  const hashedPassword = await argon2.hash(password);

  const addPwdResult = await PasswordHistoryService.addToPasswordHistory({
    userId,
    password: hashedPassword,
    source: src === 'activate' ? 'activation' : 'reset',
  });
  if (addPwdResult.error) {
    AuditLogService.createAuditLog({
      performedBy: user?.email || '',
      module,
      description: errorMessage,
      newValue: null,
      status: 'F',
      previousValue: isActivate ? JSON.stringify(user) : null,
    });
    throw createHttpError.InternalServerError(addPwdResult.error);
  }

  const resetPwdResult = await UserService.resetPassword({
    userId,
    password: hashedPassword,
  });
  if (resetPwdResult.error) {
    AuditLogService.createAuditLog({
      performedBy: user?.email || '',
      module,
      description: errorMessage,
      newValue: null,
      status: 'F',
      previousValue: isActivate ? JSON.stringify(user) : null,
    });
    if (resetPwdResult.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError(resetPwdResult.error);
  }
  AuditLogService.createAuditLog({
    performedBy: user?.email || '',
    module,
    description: `user activated`,
    newValue: isActivate ? JSON.stringify({ ...user, status: 'active' }) : null,
    status: 'S',
    previousValue: isActivate ? JSON.stringify(user) : null,
  });
  res.json(resetPwdResult);
}

export async function httpDeleteUser(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const user = (await UserService.getUser(id, false)).user;
  const result = await UserService.deleteUser(id);
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_MANAGEMENT,
      description: `delete account failed`,
      newValue: null,
      status: 'F',
      previousValue: JSON.stringify(user),
    });
    if (result.error === ERRORS.DELETE_FAILED) {
      throw createHttpError.NotFound(
        'Failed to delete the user, make your the user id is valid'
      );
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_MANAGEMENT,
    description: `user[${user?.email}] account deleted`,
    newValue: null,
    status: 'S',
    previousValue: JSON.stringify(user),
  });
  res.status(200).json(result);
}

export async function httpLogoutUser(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const result = await UserService.logoutUser({ id, userAgent });
  if (result.error) {
    AuditLogService.createAuditLog({
      performedBy: req.user.email!,
      module: MODULES.USER_LOGOUT,
      description: `User[${req.user.email}] logout failed`,
      newValue: null,
      status: 'F',
      previousValue: null,
    });
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound('Failed to logout the user');
    }
    throw createHttpError(result.error);
  }
  AuditLogService.createAuditLog({
    performedBy: req.user.email!,
    module: MODULES.USER_LOGOUT,
    description: `User[${req.user.email}] logged out`,
    newValue: null,
    status: 'S',
    previousValue: null,
  });
  res.status(200).json(result);
}

// export async function httpDeleteWrongPassTrials(
//   req: Request<{}, {}, { id: string }>,
//   res: Response
// ) {
//   const { id } = req.body;
//   const result = await UserService.deleteWrongPassTrials(id);
//   if (result.error) {
//     if (result.error === ERRORS.DELETE_FAILED) {
//       throw createHttpError.NotFound(
//         'Failed to delete the user, make your the user id is valid'
//       );
//     }
//     throw createHttpError(result.error);
//   }
//   res.json(result);
// }
