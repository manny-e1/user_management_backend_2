import { Request, Response } from 'express';
import type { CreateUser } from '@/users/service.js';
import * as UserService from '@/users/service.js';
import createHttpError from 'http-errors';
import { ERRORS } from '@/utils/errors.js';
import { Status } from '@/db/schema.js';
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
    if (tok.status) {
      throw createHttpError.BadRequest(tok.error);
    }
    throw createHttpError(tok.error);
  }
  const userGrp = await getUserGroup(user.userGroup);
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
    .then((_) => logger.info(`reset password set to user with email ${email}`))
    .catch((err) =>
      logger.error(`sending reset password email for ${email} failed`, err)
    );
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
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('invalid credentials');
    }
    throw createHttpError(result.error);
  }

  const user = result.user!;

  if (user.status === 'locked') {
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
    throw createHttpError.Unauthorized(
      'You have reached maximum invalid login and your account is locked'
    );
  } else if (!verify) {
    await UserService.addWrongPasswordTrial(user.id);
    throw createHttpError.Unauthorized('invalid credentials');
  }

  const token = jwt.sign(
    {
      id: user.id,
    },
    process.env.SECRET_KEY
  );
  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '';
  const userAgent = req.headers['user-agent'] || '';
  const loginSession = await UserService.createLoginSession({
    ip,
    userAgent,
    userId: user.id,
    userRole: user.role,
  });
  if (loginSession.error) {
    throw createHttpError.InternalServerError("couldn't create login session");
  }
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      status: user.status,
      staffId: user.staffId,
      role: user.role,
      userGroup: user.userGroup,
      token,
    },
  });
}

export async function httpChangeUserStatus(
  req: Request<{}, {}, { email: string; status: Status }>,
  res: Response
) {
  const { status, email } = req.body;

  const result = await UserService.changeUserStatus({
    id: 'id',
    email,
    status,
  });
  if (result.error) {
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
      if (result2.error === ERRORS.DELETE_FAILED) {
        throw createHttpError.NotFound(
          'Failed to delete the user, make your the user id is valid'
        );
      }
      throw createHttpError(result2.error);
    }
  }
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
  const result = await UserService.editUser({ name, userGroup, userId });
  if (result.error) {
    if (result.error === ERRORS.UPDATE_FAILED) {
      throw createHttpError.NotFound(
        'failed to update user, make sure the user id is correct'
      );
    } else if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(result.error);
    }
    throw createHttpError(result.error);
  }
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

export async function httpForgotPassword(
  req: Request<{}, {}, { email: string }>,
  res: Response
) {
  const { email } = req.body;

  logger.info('Forgot password request ...');

  if (!email) {
    throw createHttpError.BadRequest(
      'please include email in your request body'
    );
  }
  const result = await UserService.getUserByEmail(email);
  if (result.error) {
    if (result.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('Email not found');
    }
    throw createHttpError(result.error);
  }
  const user = result.user!;
  const token = generateRandomUuid(190, 'base64');
  const tok = await createToken({ token, userId: user.id });
  if (tok.error) {
    logger.info('Token error ...');

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
    userGroup: user.userGroup,
  });
  logger.info('transport email ...');
  transport
    .sendMail(msg)
    .then((_) => logger.info(`reset password set to user with email ${email}`))
    .catch((err) =>
      logger.error(`sending reset password email for ${email} failed`, err)
    );

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
  const userId = id ?? req.app.get('user').id;
  const result = await PasswordHistoryService.getPasswordHistory(userId);
  if (result.error) {
    if (result.error === ERRORS.INVALID_ID) {
      throw createHttpError.BadRequest(ERRORS.INVALID_ID);
    }
    throw createHttpError(result.error);
  }
  const pwdHistory = result.pwdHistory!;
  const changedBefore = await hasChangedBefore(pwdHistory, password);

  if (changedBefore) {
    throw createHttpError.BadRequest(
      'You can’t reuse old password. Please enter new password'
    );
  }
  if (!src) {
    let todayChangeCount = 0;
    const today = new Date();
    pwdHistory.forEach((history) => {
      if (isSameDay(today, history.createdAt)) {
        todayChangeCount++;
      }
    });

    if (todayChangeCount >= 2) {
      throw createHttpError.BadRequest(
        'You’ve exceeded the number of times you can update your password per day. Please try again tomorrow'
      );
    }
  }

  if (src && src === 'activate') {
    const result = await UserService.changeUserStatus({
      id: userId,
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
  }
  const hashedPassword = await argon2.hash(password);
  const result2 = await UserService.resetPassword({
    userId,
    password: hashedPassword,
  });
  if (result2.error) {
    if (result2.error === ERRORS.NOT_FOUND) {
      throw createHttpError.NotFound('user not found');
    }
    throw createHttpError(result2.error);
  }
  if (!src) {
    await PasswordHistoryService.addToPasswordHistory({
      userId,
      password: hashedPassword,
    });
  }
  res.json(result2);
}

export async function httpDeleteUser(
  req: Request<{ id: string }>,
  res: Response
) {
  const { id } = req.params;
  const result = await UserService.deleteUser(id);
  if (result.error) {
    if (result.error === ERRORS.DELETE_FAILED) {
      throw createHttpError.NotFound(
        'Failed to delete the user, make your the user id is valid'
      );
    }
    throw createHttpError(result.error);
  }
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
