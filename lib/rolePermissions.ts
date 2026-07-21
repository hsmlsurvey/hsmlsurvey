import { Permissions, TableKey, Action, Role } from '@/types';
import { supabase } from '@/lib/supabase';

// In-memory cache for role permissions (loaded once per session)
let rolePermsCache: Record<Role, Permissions> | null = null;
let rolePermsLoading: Promise<Record<Role, Permissions>> | null = null;

export async function loadRolePermissions(): Promise<Record<Role, Permissions>> {
  if (rolePermsCache) return rolePermsCache;
  if (rolePermsLoading) return rolePermsLoading;

  rolePermsLoading = (async () => {
    const { data } = await supabase.from('role_permissions').select('role, permissions');
    const result: Record<Role, Permissions> = {
      admin: {} as Permissions,
      moderator: {} as Permissions,
      user: {} as Permissions,
    };
    (data || []).forEach((r: any) => {
      result[r.role as Role] = (r.permissions || {}) as Permissions;
    });
    rolePermsCache = result;
    return result;
  })();

  return rolePermsLoading;
}

export function getRolePermissions(role: Role): Permissions | null {
  if (!rolePermsCache) return null;
  return rolePermsCache[role] || ({} as Permissions);
}

export function invalidateRolePermissions() {
  rolePermsCache = null;
  rolePermsLoading = null;
}

export function hasRolePermission(role: Role, table: TableKey, action: Action): boolean {
  if (role === 'admin') return true;
  const perms = getRolePermissions(role);
  if (!perms) return false;
  return perms?.[table]?.[action] === true;
}
