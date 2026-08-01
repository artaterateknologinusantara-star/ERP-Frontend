import { api } from '@/lib/api';
import { Supplier, PaginatedResponse } from '@/types';

export interface SupplierListParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
}

export const supplierService = {
  list(params?: SupplierListParams): Promise<PaginatedResponse<Supplier>> {
    return api.getList<Supplier>('/suppliers', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
    });
  },

  getById(id: string) {
    return api.get<Supplier>(`/suppliers/${id}`);
  },

  create(dto: CreateSupplierDto) {
    return api.post<Supplier>('/suppliers', dto);
  },

  update(id: string, dto: Partial<CreateSupplierDto>) {
    return api.put<Supplier>(`/suppliers/${id}`, dto);
  },

  setStatus(id: string, isActive: boolean) {
    return api.patch<Supplier>(`/suppliers/${id}/status`, { isActive });
  },

  delete(id: string) {
    return api.delete(`/suppliers/${id}`);
  },
};
