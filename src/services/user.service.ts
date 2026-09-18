import { api } from '@/lib/api';

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  isSandbox: boolean;
}

export interface RoleOption {
  id: string;
  name: string;
  description?: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  roleId: string;
  isSandbox: boolean;
  existingSandboxDbName?: string;
}

export interface SandboxInstance {
  sandboxDbName: string;
  userCount: number;
  sampleNames: string;
  createdAt: string;
}

export interface UpdateUserDto {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  isActive: boolean;
}

export const userService = {
  async list(): Promise<UserListItem[]> {
    const res = await api.get<UserListItem[]>('/users');
    return res.data ?? [];
  },

  async listRoles(): Promise<RoleOption[]> {
    const res = await api.get<RoleOption[]>('/users/roles');
    return res.data ?? [];
  },

  async getSandboxInstances(): Promise<SandboxInstance[]> {
    const res = await api.get<SandboxInstance[]>('/users/sandbox-instances');
    return res.data ?? [];
  },

  create(dto: CreateUserDto) {
    return api.post<UserListItem>('/users', dto);
  },

  update(id: string, dto: UpdateUserDto) {
    return api.put<UserListItem>(`/users/${id}`, dto);
  },

  delete(id: string) {
    return api.delete(`/users/${id}`);
  },
};
