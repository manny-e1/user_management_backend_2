import { InferModel } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  boolean,
  doublePrecision,
  text,
} from 'drizzle-orm/pg-core';

//roles
export const roleEnum = pgEnum('role', [
  'admin',
  'admin 2',
  'normal user 1',
  'normal user 2',
  'manager 1',
  'manager 2',
]);

//login_sessions
export const loginSessionEnum = pgEnum('login_session', ['active', 'expired']);

export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    role: roleEnum('role').notNull(),
  },
  (roles) => {
    return {
      roleIndex: uniqueIndex('role_idx').on(roles.role),
    };
  }
);

export type Role = Pick<InferModel<typeof roles>, 'role'>['role'];

//userGroups
export const userGroups = pgTable(
  'user_groups',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    roleId: integer('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (userGroups) => {
    return {
      cpk: uniqueIndex('name_idx').on(userGroups.name),
    };
  }
);

export type UserGroups = InferModel<typeof userGroups>;

//users
export const statusEnum = pgEnum('status', ['locked', 'active']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    password: varchar('password', { length: 256 }),
    staffId: varchar('staff_id', { length: 256 }).notNull(),
    status: statusEnum('status').default('locked').notNull(),
    userGroup: uuid('user_group_id')
      .references(() => userGroups.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (users) => {
    return {
      emailIndex: uniqueIndex('email_idx').on(users.email),
    };
  }
);

export type User = InferModel<typeof users>;
export type Status = Pick<User, 'status'>['status'];

//tokens
export const tokens = pgTable('tokens', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: varchar('token', { length: 256 }).notNull(),
  tokenExpiry: timestamp('token_expiry').notNull(),
});

export type tokens = InferModel<typeof tokens>;

//sources
export const sourceEnum = pgEnum('source', ['activation', 'reset']);

//password_history
export const passwordHistory = pgTable('password_history', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  source: sourceEnum('source').default('reset').notNull(),
  password: varchar('password', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PasswordHistory = InferModel<typeof passwordHistory>;
export type Sources = Pick<
  InferModel<typeof passwordHistory>,
  'source'
>['source'];

//Transaction log
export const transactionLogs = pgTable('transaction_logs', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  cRIB: doublePrecision('c_rib').notNull(),
  cRMB: doublePrecision('c_rmb').notNull(),
  cCIB: doublePrecision('c_cib').notNull(),
  cCMB: doublePrecision('c_cmb').notNull(),
  nRIB: doublePrecision('n_rib').notNull(),
  nRMB: doublePrecision('n_rmb').notNull(),
  nCIB: doublePrecision('n_cib').notNull(),
  nCMB: doublePrecision('n_cmb').notNull(),
  status: integer('status').notNull().default(0),
  marker: varchar('marker'),
  msg: varchar('msg').default('').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updateChecker: varchar('update_checker'),
});

export type NewTransactionLog = Omit<
  InferModel<typeof transactionLogs>,
  'id' | 'status' | 'msg' | 'createdAt' | 'updatedAt' | 'updateChecker'
>;

// System Maintenance
export const maintenanceLogs = pgTable('maintenance_logs', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  createdAt: timestamp('createdAt').notNull(),
  submittedAt: timestamp('submittedAt').defaultNow(),
  submittedBy: varchar('submittedBy').default('').notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  iRakyatYN: boolean('iRakyatYN').default(false).notNull(),
  iBizRakyatYN: boolean('iBizRakyatYN').default(false).notNull(),
  iRakyatStatus: varchar('iRakyatStatus').default('').notNull(),
  iBizRakyatStatus: varchar('iBizRakyatStatus').default('').notNull(),
  submissionStatus: varchar('submissionStatus').default('New').notNull(),
  approvalStatus: varchar('approvalStatus').default('Pending').notNull(),
  approvedBy: varchar('approvedBy').default('').notNull(),
  isCompleted: boolean('isCompleted').default(false).notNull(),
  rejectReason: varchar('rejectReason').default('').notNull(),
  isDeleted: boolean('isDeleted').default(false).notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export type NewMaintenanceLog = Omit<
  InferModel<typeof maintenanceLogs>,
  | 'id'
  | 'submissionStatus'
  | 'approvalStatus'
  | 'approvedBy'
  | 'isCompleted'
  | 'rejectReason'
  | 'iRakyatStatus'
  | 'iBizRakyatStatus'
  | 'isDeleted'
  | 'updatedAt'
  | 'createdAt'
>;

// Rejection Logs
export const rejectionLogs = pgTable('rejection_logs', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  mid: uuid('mid')
    .references(() => maintenanceLogs.id, { onDelete: 'cascade' })
    .notNull(),
  rejectedDate: timestamp('rejectedDate').notNull(),
  submissionStatus: varchar('submissionStatus').notNull(),
  rejectedBy: varchar('rejectedBy').notNull(),
  reason: varchar('reason').notNull(),
});

export type NewRejectionLog = Omit<InferModel<typeof rejectionLogs>, 'id'>;

//Wrong_password_trail
export const wrongPasswordTrial = pgTable('wrong_password_trials', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

//login_session
export const loginSessions = pgTable('login_sessions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionToken: text('session_token').notNull(),
  userRole: roleEnum('user_role').notNull(),
  status: loginSessionEnum('status').default('active'),
  ip: varchar('ip', { length: 16 }).notNull(),
  userAgent: text('user_agent').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type LoginSession = InferModel<typeof loginSessions>;
