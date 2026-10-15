import { ROLE_PERMISSIONS, type UserRole } from '@/types/auth';

/** True when a role grants `resource:action` (supports `*` and `resource:*`). */
export function canAccess(role: UserRole | undefined, perm: string | null): boolean {
  if (!perm) return true;
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role] ?? [];
  if (granted.includes('*')) return true;
  if (granted.includes(perm)) return true;
  const resource = perm.split(':')[0];
  return granted.includes(`${resource}:*`);
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}
