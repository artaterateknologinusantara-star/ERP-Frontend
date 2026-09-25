import { api } from '@/lib/api';
import type { SupplierPortalUser } from '@/types';

export interface CreateSupplierPortalUserDto {
  name: string;
  email: string;
  password: string;
}

export const supplierPortalUserService = {
  list(supplierId: string) {
    return api.get<SupplierPortalUser[]>(`/suppliers/${supplierId}/portal-users`);
  },

  create(supplierId: string, dto: CreateSupplierPortalUserDto) {
    return api.post<SupplierPortalUser>(`/suppliers/${supplierId}/portal-users`, dto);
  },

  activate(supplierId: string, id: string) {
    return api.put(`/suppliers/${supplierId}/portal-users/${id}/activate`, {});
  },

  deactivate(supplierId: string, id: string) {
    return api.put(`/suppliers/${supplierId}/portal-users/${id}/deactivate`, {});
  },
};
