import { db } from '@/db/index.js';
import { Role, roles, userGroups } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq } from 'drizzle-orm';

export type CreateUserGroup = {
  name: string;
  roleId: number;
};

export async function createUserGroup(body: CreateUserGroup) {
  try {
    await db.insert(userGroups).values({ ...body });
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('duplicate key value violates')) {
      return { error: 'Duplicate user group' };
    }
    return { error: err.message };
  }
}

export async function getAllUserGroups() {
  try {
    const result = await db
      .select({
        id: userGroups.id,
        name: userGroups.name,
        role: roles.role,
      })
      .from(userGroups)
      .innerJoin(roles, eq(roles.id, userGroups.roleId))
      .orderBy(desc(userGroups.createdAt));
    return { userGroups: result };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getUserGroup(id: string) {
  try {
    const userGroup = await db
      .select({
        name: userGroups.name,
        role: userGroups.roleId,
        id: userGroups.id,
      })
      .from(userGroups)
      .where(eq(userGroups.id, id));
    if (!userGroup.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { userGroup: userGroup[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function editUserGroup({
  id,
  body,
}: {
  id: string;
  body: CreateUserGroup;
}) {
  try {
    const upd = await db
      .update(userGroups)
      .set({ name: body.name, roleId: body.roleId, updatedAt: new Date() })
      .where(eq(userGroups.id, id));
    if (upd.rowCount === 0) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function deleteUserGroup(id: string) {
  try {
    const result = await db
      .delete(userGroups)
      .where(eq(userGroups.id, id))
      .returning({ id: userGroups.id });
    if (!result.length || !result[0].id) {
      return { error: ERRORS.DELETE_FAILED };
    }
    return { message: result[0].id };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    } else if (err.message.includes('violates foreign key constraint')) {
      return {
        error: 'User group is used',
      };
    }
    return { error: err.message };
  }
}
