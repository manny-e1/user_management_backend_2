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
  char,
} from 'drizzle-orm/pg-core';

//roles
export const roleValues = [
  'admin',
  'admin 2',
  'admin 3',
  'admin 4',
  'normal user 1',
  'normal user 2',
  'normal user 3',
  'normal user 4',
  'normal user 5',
  'manager 1',
  'manager 2',
  'manager 3',
  'manager 4',
  'manager 5',
] as const;

export const roleEnum = pgEnum('role', roleValues);

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
export const statusEnum = pgEnum('status', ['locked', 'active', 'inactive']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    password: varchar('password', { length: 256 }),
    staffId: varchar('staff_id', { length: 256 }).notNull(),
    status: statusEnum('status').default('inactive').notNull(),
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
  extendedStartDate: timestamp('extended_start_date'),
  extendedEndDate: timestamp('extended_end_date'),
  iRakyatYN: boolean('iRakyatYN').default(false).notNull(),
  iBizRakyatYN: boolean('iBizRakyatYN').default(false).notNull(),
  iRakyatStatus: varchar('iRakyatStatus').default('').notNull(),
  iBizRakyatStatus: varchar('iBizRakyatStatus').default('').notNull(),
  submissionStatus: varchar('submissionStatus').default('New').notNull(),
  approvalStatus: varchar('approvalStatus').default('Pending').notNull(),
  approvedBy: varchar('approvedBy').default('').notNull(),
  iRakyatCN: boolean('iRakyatCN').default(false),
  iBizRakyatCN: boolean('iBizRakyatCN').default(false),
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
  | 'rejectReason'
  | 'iRakyatStatus'
  | 'iBizRakyatStatus'
  | 'isDeleted'
  | 'updatedAt'
  | 'createdAt'
  | 'iRakyatCN'
  | 'iBizRakyatCN'
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

//mfa config
export const mfaStatusEnum = pgEnum('mfa_status', [
  'pending',
  'approved',
  'rejected',
]);
export const mfaConfigs = pgTable('mfa_configs', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  cSMS: integer('c_sms').notNull(),
  cMO: integer('c_mo').notNull(),
  cMA: integer('c_ma').notNull(),
  nSMS: integer('n_sms').notNull(),
  nMO: integer('n_mo').notNull(),
  nMA: integer('n_ma').notNull(),
  status: mfaStatusEnum('status').notNull().default('pending'),
  maker: uuid('maker')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  checker: uuid('checker').references(() => users.id, { onDelete: 'cascade' }),
  reason: varchar('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  actionTakenTime: timestamp('action_taken_time'),
});

export type MFAConfig = InferModel<typeof mfaConfigs>;

// i-secure notes
export const isecureNotes = pgTable('isecure_notes', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  cDisplayStatus: char('c_display_status', {
    length: 3,
    enum: ['on', 'off'],
  }).notNull(),
  nDisplayStatus: char('n_display_status', {
    length: 3,
    enum: ['on', 'off'],
  }).notNull(),
  status: mfaStatusEnum('status').notNull().default('pending'),
  maker: uuid('maker')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  image: text('image').notNull(),
  imageUpdated: char('image_updated', {
    length: 1,
    enum: ['Y', 'N'],
  })
    .notNull()
    .default('N'),
  checker: uuid('checker').references(() => users.id, { onDelete: 'cascade' }),
  reason: varchar('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  actionTakenTime: timestamp('action_taken_time'),
});

export type ISecureNote = InferModel<typeof isecureNotes>;

const auditLogSchema = {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  performedBy: varchar('email', { length: 256 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  // action: varchar('action', { length: 20 }).notNull(),
  status: char('status', { length: 1, enum: ['F', 'S'] }).notNull(),
  newValue: text('new_value'),
  previousValue: text('previous_value'),
  createdAt: timestamp('created_at').notNull(),
};
export const coldAuditLogs = pgTable('cold_audit_logs', {
  ...auditLogSchema,
});

export const hotAuditLogs = pgTable('hot_audit_logs', {
  ...auditLogSchema,
});

export type AuditLog = InferModel<typeof coldAuditLogs>;
