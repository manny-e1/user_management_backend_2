import { db } from '@/db/index.js';
import { Role, roles } from '@/db/schema.js';
import { logger } from '@/logger.js';
import { eq } from 'drizzle-orm';

export async function createRole(role: Role) {
  try {
    await db.insert(roles).values({ role });
    return { message: 'success' };
  } catch (error) {
    logger.error(error);
    const err = error as Error;
    if (err.message.includes('duplicate key value violates')) {
      return { error: 'Duplicate role' };
    }
    return { error: err.message };
  }
}

export async function getAllRoles() {
  try {
    const result = await db
      .select({
        id: roles.id,
        name: roles.role,
      })
      .from(roles);

    return { roles: result };
  } catch (error) {
    logger.error(error);
    return { error: (error as Error).message };
  }
}
