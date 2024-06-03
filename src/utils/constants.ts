export const ERRORS = {
  NOT_FOUND: 'not found',
  UPDATE_FAILED: 'updated failed',
  DELETE_FAILED: 'delete failed',
  PWD_UPDATE_LIMIT: 'pwd update limit',
  OLD_PWD_UPDATE: 'old pwd update',
  INVALID_ID: 'invalid id',
} as const;

export const MODULES = {
  USER_MANAGEMENT: 'User Management',
  GROUP_AND_ROLE_MAINTENANCE: 'Group and Role Maintenance',
  MFA_CONFIGURATION: 'MFA Configuration',
  TRANSACTION_LIMIT: 'Transaction Limit',
  SYSTEM_MAINTENANCE: 'System Maintenance',
  USER_ACTIVATION: 'User Activation',
  PASSWORD_RESET: 'Password Reset',
  USER_LOGIN: 'User Login',
  USER_LOGOUT: 'User Logout',
  ISECURE_NOTE: 'i-Secure Note',
} as const;
