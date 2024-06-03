import { db } from '@/db/index.js';
import { ISecureNote, isecureNotes, users } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { ERRORS } from '@/utils/constants.js';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ReviewISecureNote } from './types.js';

export async function createISecureNote(
  body: Omit<
    ISecureNote,
    'id' | 'actionTakenTime' | 'reason' | 'checker' | 'status' | 'imageUpdated'
  >
) {
  try {
    const note = await db.insert(isecureNotes).values(body).returning();
    return { message: 'success', note: note[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getISecureNotes() {
  try {
    const notes = await db
      .select({
        id: isecureNotes.id,
        createdAt: isecureNotes.createdAt,
        cDisplayStatus: isecureNotes.cDisplayStatus,
        nDisplayStatus: isecureNotes.nDisplayStatus,
        imageUpdated: isecureNotes.imageUpdated,
        reason: isecureNotes.reason,
        actionTakenTime: isecureNotes.actionTakenTime,
        image: isecureNotes.image,
        updatedAt: isecureNotes.updatedAt,
        maker: isecureNotes.maker,
        checker: isecureNotes.checker,
        status: isecureNotes.status,
      })
      .from(isecureNotes)
      .orderBy(desc(isecureNotes.createdAt));
    const data = notes.map((note, index) => ({
      ...note,
      tid: index + 1,
    }));
    return { iSecureNotes: data };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function getISecureNote(id: string) {
  try {
    const maker = alias(users, 'maker');
    const checker = alias(users, 'checker');
    const note = await db
      .select({
        id: isecureNotes.id,
        createdAt: isecureNotes.createdAt,
        cDisplayStatus: isecureNotes.cDisplayStatus,
        nDisplayStatus: isecureNotes.nDisplayStatus,
        imageUpdated: isecureNotes.imageUpdated,
        reason: isecureNotes.reason,
        actionTakenTime: isecureNotes.actionTakenTime,
        image: isecureNotes.image,
        updatedAt: isecureNotes.updatedAt,
        maker: isecureNotes.maker,
        checker: isecureNotes.checker,
        status: isecureNotes.status,
        makerEmail: maker.email,
        checkerEmail: checker.email,
      })
      .from(isecureNotes)
      .leftJoin(maker, eq(isecureNotes.maker, maker.id))
      .leftJoin(checker, eq(isecureNotes.checker, checker.id))
      .where(eq(isecureNotes.id, id));

    if (!note.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { iSecureNote: note[0] };
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
    const note = await db
      .select()
      .from(isecureNotes)
      .where(eq(isecureNotes.status, 'approved'))
      .orderBy(desc(isecureNotes.updatedAt))
      .limit(1);

    if (!note.length) {
      return { error: ERRORS.NOT_FOUND };
    }
    return { iSecureNote: note[0] };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}

export async function reviewISecureNote(
  id: string,
  body: ReviewISecureNote & { checker: string }
) {
  try {
    const result = await db
      .update(isecureNotes)
      .set({ ...body, actionTakenTime: new Date(), updatedAt: new Date() })
      .where(eq(isecureNotes.id, id))
      .returning();
    if (!result.length) {
      return { error: ERRORS.UPDATE_FAILED };
    }
    return { message: 'success', note: result[0] };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('invalid input syntax for type uuid')) {
      return { error: ERRORS.INVALID_ID };
    }
    return { error: err.message };
  }
}

export async function updateImage({
  id,
  image,
}: {
  id: string;
  image: string;
}) {
  try {
    const result = await db
      .update(isecureNotes)
      .set({ image: image, updatedAt: new Date(), imageUpdated: 'Y' })
      .where(eq(isecureNotes.id, id));
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
