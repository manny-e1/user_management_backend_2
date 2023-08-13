import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import winston from 'winston';
import { logger } from './logger.js';
import { errorHandler, notFound } from './middleware/error-middleware.js';
import { userRouter } from './users/route.js';
import { userGroupRouter } from './userGroup/route.js';
import { roleRouter } from './role/route.js';
import { transactionLogRouter } from './transaction-limit/route.js';
import { passwordHistoryRouter } from './password-history/route.js';
import { maintenanceLogRouter } from './system-maintenance/route.js';
import dotenv from 'dotenv';
import { commonRouter } from './common/route.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(path.dirname(__filename));

const app = express();

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('common', {
      stream: fs.createWriteStream(path.join(__dirname, 'access.log'), {
        flags: 'a',
      }),
    })
  );
}

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.json({ message: 'hello' });
});

app.use('/api/common', commonRouter);
app.use('/api/users', userRouter);
app.use('/api/groups', userGroupRouter);
app.use('/api/roles', roleRouter);
app.use('/api/transactions', transactionLogRouter);
app.use('/api/maintenance', maintenanceLogRouter);
app.use('/api/password-histories', passwordHistoryRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
