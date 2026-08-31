import { api } from '@/lib/api';

export const PERMISSION_ACTIONS = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  canView: 'Lihat',
  canCreate: 'Tambah',
  canEdit: 'Ubah',
  canDelete: 'Hapus',
  canApprove: 'Approve',
};

export const MODULE_LABELS: Record<string, string> = {
  Sales: 'Sales',
  Purchasing: 'Purchasing',
  Finance: 'Finance',
  Accounting: 'Accounting',
  Inventory: 'Inventory',
  Project: 'Project',
  Settings: 'Settings',
};

export interface ModulePermission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface RoleListItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  userCount: number;
  permissions: ModulePermission[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface UpdateRoleDto {
  name: string;
  description?: string;
  isActive: boolean;
}

export const roleService = {
  async list(): Promise<RoleListItem[]> {
    const res = await api.get<RoleListItem[]>('/roles');
    return res.data ?? [];
  },

  async listModules(): Promise<string[]> {
    const res = await api.get<string[]>('/roles/modules');
    return res.data ?? [];
  },

  create(dto: CreateRoleDto) {
    return api.post<RoleListItem>('/roles', dto);
  },

  update(id: string, dto: UpdateRoleDto) {
    return api.put<RoleListItem>(`/roles/${id}`, dto);
  },

  updatePermissions(id: string, permissions: ModulePermission[]) {
    return api.put<RoleListItem>(`/roles/${id}/permissions`, { permissions });
  },

  delete(id: string) {
    return api.delete(`/roles/${id}`);
  },
};
