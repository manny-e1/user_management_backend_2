import http from 'node:http';
import app from './app.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db/index.js';
import { logger } from './logger.js';

await migrate(db, {
  migrationsFolder: 'migrations',
});

const port = parseInt(process.env.PORT || '5001', 10);
const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  logger.info('Listening on:', server.address());
});
