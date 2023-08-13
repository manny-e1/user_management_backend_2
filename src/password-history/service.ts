import { db } from '@/db/index.js';
import { passwordHistory } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { desc, eq } from 'drizzle-orm';

export async function addToPasswordHistory({
  userId,
  password,
}: {
  userId: string;
  password: string;
}) {
  try {
    await db.insert(passwordHistory).values({ userId, password });
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
  }
}

export async function getPasswordHistory(userId: string) {
  try {
    const pwdHistory = await db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));
    return { pwdHistory };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid id' };
    }
    return { error: err.message };
  }
}

export async function checkPasswordValidity(id: string) {
  try {
    const pwd = await db
      .select({ updatedAt: passwordHistory.updatedAt })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, id))
      .orderBy(desc(passwordHistory.createdAt));
    if (!pwd.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { updatedAt: pwd[0].updatedAt };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function changeLastPwdDate({
  id,
  date,
}: {
  id: string;
  date: Date;
}) {
  try {
    const upd = await db
      .update(passwordHistory)
      .set({ updatedAt: date })
      .where(eq(passwordHistory.userId, id));
    return { message: 'success' };
  } catch (error) {
    return { error };
  }
}
