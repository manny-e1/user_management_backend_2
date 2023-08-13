import { db } from '@/db/index.js';
import { tokens, users } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/errors.js';
import { eq } from 'drizzle-orm';

export type CreateToken = {
  userId: string;
  token: string;
};

export async function createToken(body: CreateToken) {
  const d = new Date();
  const tokenExpiry = new Date(d.setMinutes(d.getMinutes() + 30));
  try {
    const token = await db
      .insert(tokens)
      .values({ ...body, tokenExpiry })
      .returning({
        userId: tokens.userId,
        token: tokens.token,
        tokenExpiry: tokens.tokenExpiry,
      });
    return { token };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('duplicate key value violates')) {
      return { error: 'token already exists', status: 403 };
    } else if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid user-group id', status: 403 };
    }
    return { error: err.message };
  }
}

export async function getToken({ token }: { token: string }) {
  try {
    const result = await db
      .select({
        tokenExpiry: tokens.tokenExpiry,
        userId: tokens.userId,
        status: users.status,
      })
      .from(tokens)
      .where(eq(tokens.token, token))
      .innerJoin(users, eq(users.id, tokens.userId));
    if (!result.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { token: result[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: 'invalid user id' };
    }
    return { error: err.message };
  }
}
