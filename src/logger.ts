import winston from 'winston';

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format,
    }),
    new winston.transports.File({ filename: 'combined.log', format }),
  ],
});
