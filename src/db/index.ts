import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { logger } from '../logger.js';
import dotenv from 'dotenv';
dotenv.config();

let config = {};

logger.info(process.env.NODE_ENV);

if (process.env.NODE_ENV === 'development') {
  config = {
    user: process.env.DB_USER_LOCAL,
    host: process.env.DB_HOST_LOCAL,
    database: process.env.DB_NAME_LOCAL,
    password: process.env.DB_PWD_LOCAL,
    port: Number(process.env.DB_PORT_LOCAL),
    ssl: false,
  };
} else {
  config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PWD,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}
const pool = new pg.Pool({
  ...config,
});

await pool.connect();
export const db = drizzle(pool);
