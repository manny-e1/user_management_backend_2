import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db/index.js';
import {
  loginSessions,
  roles,
  userGroups,
  users,
  wrongPasswordTrial,
} from '@/db/schema.js';
import type { LoginSession, Status } from '@/db/schema.js';
import { ERRORS } from '@/utils/constants.js';
import { logger } from '@/logger.js';
import { SelectedFields, date } from 'drizzle-orm/pg-core';

export type CreateUser = {
  name: string;
  email: string;
  userGroup: string;
  staffId: string;
};

export async function createUser(body: CreateUser) {
  try {
    const newUser = await db
      .insert(users)
      .values({ ...body })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        userGroup: users.userGroup,
      });
    return { user: newUser[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('duplicate key value violates')) {
      return { error: 'user with this email address already exists' };
    } else if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    } else if (err.message.includes('users_user_group_id_user_groups_id_fk')) {
      return { error: 'Invalid user group id' };
    }
    return { error: err.message };
  }
}

export async function getAllUsers() {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: roles.role,
        userGroup: userGroups.name,
        staffId: users.staffId,
        status: users.status,
      })
      .from(users)
      .innerJoin(userGroups, eq(userGroups.id, users.userGroup))
      .innerJoin(roles, eq(roles.id, userGroups.roleId))
      .orderBy(desc(users.createdAt));
    return { users: result };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getUser(id: string, pwd?: boolean) {
  try {
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        userGroup: users.userGroup,
        staffId: users.staffId,
        status: users.status,
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    const nUser = pwd
      ? {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          userGroup: user[0].userGroup,
          staffId: user[0].staffId,
          status: user[0].status,
          password: user[0].password,
        }
      : {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          userGroup: user[0].userGroup,
          staffId: user[0].staffId,
          status: user[0].status,
        };
    return { user: nUser };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function checkUserByUserGroup(userGroupId: string) {
  try {
    const user = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.userGroup, userGroupId))
      .limit(1);

    if (!user.length) {
      return { isThereUser: false };
    }
    return { isThereUser: true };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid user-group id' };
    }
    return { error: err.message };
  }
}

export async function changeUserStatus({
  id,
  email,
  status,
}: {
  id: string;
  email?: string;
  status: Status;
}) {
  try {
    const result = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(email ? eq(users.email, email) : eq(users.id, id))
      .returning({ id: users.id });
    if (!result.length) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { id: result[0].id };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function addWrongPasswordTrial(id: string) {
  try {
    await db.insert(wrongPasswordTrial).values({ userId: id });
    return { message: 'success' };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function getWrongPasswordTrials(id: string) {
  try {
    const trails = await db
      .select()
      .from(wrongPasswordTrial)
      .where(eq(wrongPasswordTrial.userId, id));
    return { trails };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await db
      .select({
        name: users.name,
        id: users.id,
        password: users.password,
        email: users.email,
        userGroup: users.userGroup,
        userGroupName: userGroups.name,
        staffId: users.staffId,
        role: roles.role,
        status: users.status,
      })
      .from(users)
      .innerJoin(userGroups, eq(userGroups.id, users.userGroup))
      .innerJoin(roles, eq(roles.id, userGroups.roleId))
      .where(eq(users.email, email));
    if (!user.length || !user[0].id) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { user: user[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function editUser({
  name,
  userGroup,
  userId,
}: {
  userId: string;
  name: string;
  userGroup: string;
}) {
  try {
    const upd = await db
      .update(users)
      .set({ name, userGroup: userGroup, updatedAt: new Date() })
      .where(eq(users.id, userId));
    if (upd.rowCount === 0) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function resetPassword({
  password,
  userId,
}: {
  password: string;
  userId: string;
}) {
  try {
    const user = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!user.length || !user[0].id) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function deleteUser(id: string) {
  try {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!result.length || !result[0].id) {
      return { error: ERRORS.DELETE_FAILED };
    }
    return { message: result[0].id };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function deleteWrongPassTrials(id: string) {
  try {
    const res = await db
      .delete(wrongPasswordTrial)
      .where(and(eq(wrongPasswordTrial.userId, id)));
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function createLoginSession(
  body: Omit<LoginSession, 'id' | 'createdAt' | 'status'>
) {
  try {
    const newUser = await db.insert(loginSessions).values({ ...body });
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

export async function getLoginSession(
  body: Pick<LoginSession, 'userId' | 'userAgent' | 'sessionToken'>
) {
  try {
    const loginSession = await db
      .select({
        id: loginSessions.id,
        userId: loginSessions.userId,
        userAgent: loginSessions.userAgent,
        sessionToken: loginSessions.sessionToken,
        status: loginSessions.status,
        userRole: loginSessions.userRole,
        userEmail: users.email,
      })
      .from(loginSessions)
      .leftJoin(users, eq(users.id, loginSessions.userId))
      .where(
        and(
          eq(loginSessions.userId, body.userId),
          eq(loginSessions.userAgent, body.userAgent),
          eq(loginSessions.sessionToken, body.sessionToken),
          eq(loginSessions.status, 'active')
        )
      )
      .orderBy(desc(loginSessions.createdAt))
      .limit(1);
    if (!loginSession.length) {
      return { error: 'not found' };
    }
    return { loginSession: loginSession[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}

export async function logoutUser({
  id,
  userAgent,
}: {
  id: string;
  userAgent: string;
}) {
  try {
    const result = await db
      .update(loginSessions)
      .set({ status: 'expired' })
      .where(
        and(
          eq(loginSessions.userId, id),
          eq(loginSessions.userAgent, userAgent),
          eq(loginSessions.status, 'active')
        )
      );
    if (result.rowCount === 0) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    return { error: err.message };
  }
}
