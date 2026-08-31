import type { ModulePermission, PermissionAction } from '@/services/role.service';

interface StoredUser {
  name: string;
  email: string;
  role: string;
  permissions: ModulePermission[];
}

// Populated at login (see /login/page.tsx) and refreshed whenever /auth/me is re-fetched.
// A module with no entry here means the role has zero access to it (default-deny, mirrors the
// backend's ModulePermissionHandler).
export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('syntera_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function hasPermission(module: string, action: PermissionAction): boolean {
  const user = getStoredUser();
  const perm = user?.permissions?.find((p) => p.module === module);
  return perm?.[action] ?? false;
}

export function canApprove(module: string): boolean {
  return hasPermission(module, 'canApprove');
}

// Whether the role has any access at all to a module (any of the 5 action flags) — used to decide
// sidebar visibility. Deliberately not just canView: an admin who granted Create/Edit/Approve but
// forgot to tick View shouldn't have the module silently disappear from navigation.
export function hasModuleAccess(module: string): boolean {
  const user = getStoredUser();
  const perm = user?.permissions?.find((p) => p.module === module);
  if (!perm) return false;
  return perm.canView || perm.canCreate || perm.canEdit || perm.canDelete || perm.canApprove;
}

export function hasAnyApprovePermission(): boolean {
  const user = getStoredUser();
  return user?.permissions?.some((p) => p.canApprove) ?? false;
}
