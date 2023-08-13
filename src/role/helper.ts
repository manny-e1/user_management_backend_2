import { Role } from '@/db/schema.js';

export function isRole(role: Role): role is Role {
  const roles: Array<Role> = [
    'admin',
    'admin 2',
    'manager 1',
    'manager 2',
    'normal user 1',
    'normal user 2',
  ];
  return roles.includes(role);
}
