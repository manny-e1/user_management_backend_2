import { db } from '@/db/index.js';
import { MFAConfig, mfaConfigs, users } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/constants.js';
import { and, desc, eq } from 'drizzle-orm';
import { ReviewMFAConfig, UpdateMFAConfig } from './types.js';
import { alias } from 'drizzle-orm/pg-core';

export async function create(
  body: Omit<
    MFAConfig,
    'id' | 'checker' | 'status' | 'reason' | 'actionTakenTime'
  >
) {
  try {
    const mfaConfig = await db.insert(mfaConfigs).values(body).returning();
    return { message: 'success', mfaConfig: mfaConfig[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getMFAConfigs() {
  try {
    const configs = await db
      .select({
        id: mfaConfigs.id,
        createdAt: mfaConfigs.createdAt,
        cSMS: mfaConfigs.cSMS,
        cMO: mfaConfigs.cMO,
        cMA: mfaConfigs.cMA,
        nSMS: mfaConfigs.nSMS,
        nMO: mfaConfigs.nMO,
        nMA: mfaConfigs.nMA,
        status: mfaConfigs.status,
      })
      .from(mfaConfigs)
      .orderBy(desc(mfaConfigs.createdAt));
    const data = configs.map((config, index) => ({
      ...config,
      tid: index + 1,
    }));
    return { mfaConfigs: data };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getMFAConfig(id: string) {
  try {
    const maker = alias(users, 'maker');
    const checker = alias(users, 'checker');
    const config = await db
      .select({
        id: mfaConfigs.id,
        cSMS: mfaConfigs.cSMS,
        cMO: mfaConfigs.cMO,
        cMA: mfaConfigs.cMA,
        nSMS: mfaConfigs.nSMS,
        nMO: mfaConfigs.nMO,
        nMA: mfaConfigs.nMA,
        reason: mfaConfigs.reason,
        maker: mfaConfigs.maker,
        makerEmail: maker.email,
        status: mfaConfigs.status,
        checker: mfaConfigs.checker,
        checkerEmail: checker.email,
        actionTakenTime: mfaConfigs.actionTakenTime,
        createdAt: mfaConfigs.createdAt,
        updatedAt: mfaConfigs.updatedAt,
      })
      .from(mfaConfigs)
      .leftJoin(maker, eq(mfaConfigs.maker, maker.id))
      .leftJoin(checker, eq(mfaConfigs.checker, checker.id))
      .where(eq(mfaConfigs.id, id));

    if (!config.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { mfaConfig: config[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function getLastUpdatedValue() {
  try {
    const mfaConfig = await db
      .select()
      .from(mfaConfigs)
      .where(eq(mfaConfigs.status, 'approved'))
      .orderBy(desc(mfaConfigs.updatedAt))
      .limit(1);

    if (!mfaConfig.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { mfaConfig: mfaConfig[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function update(id: string, body: UpdateMFAConfig) {
  try {
    const result = await db
      .update(mfaConfigs)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(mfaConfigs.id, id));
    if (!result.rowCount) {
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

export async function reviewMFAConfig(
  id: string,
  body: ReviewMFAConfig & { checker: string }
) {
  try {
    const result = await db
      .update(mfaConfigs)
      .set({ ...body, actionTakenTime: new Date(), updatedAt: new Date() })
      .where(eq(mfaConfigs.id, id))
      .returning();
    if (!result.length) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { message: 'success', mfaConfig: result[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}
