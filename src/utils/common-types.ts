import { object, string, union, literal, infer as ZInfer } from 'zod';
export const ENVOBJ = object({
  DB_USER: string(),
  DB_PWD: string(),
  DB_HOST: string(),
  DB_NAME: string(),
  EMAIL_FROM: string(),
  EMAIL_HOST: string(),
  EMAIL_PORT: string(),
  EMAIL_USER: string(),
  EMAIL_PASS: string(),
  DB_USER_LOCAL: string().optional(),
  DB_PWD_LOCAL: string().optional(),
  DB_HOST_LOCAL: string().optional(),
  DB_PORT_LOCAL: string().optional(),
  DB_NAME_LOCAL: string().optional(),
  EMAIL_HOST_LOCAL: string().optional(),
  EMAIL_PORT_LOCAL: string().optional(),
  EMAIL_USER_LOCAL: string().optional(),
  EMAIL_PASS_LOCAL: string().optional(),
  SECRET_KEY: string(),
  NODE_ENV: union([literal('development'), literal('production')]),
  FRONT_END_URL: string(),
  PORT: string(),
});

export interface ENVOBJ extends ZInfer<typeof ENVOBJ> {}
