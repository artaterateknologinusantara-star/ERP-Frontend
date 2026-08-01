import { api } from '@/lib/api';
import { Customer, PaginatedResponse } from '@/types';

export interface CustomerListParams {
  page?: number;
  perPage?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateCustomerDto {
  name: string;
  industry?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  npwp?: string;
}

export const customerService = {
  list(params?: CustomerListParams): Promise<PaginatedResponse<Customer>> {
    return api.getList<Customer>('/customers', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
    });
  },

  getById(id: string) {
    return api.get<Customer>(`/customers/${id}`);
  },

  create(dto: CreateCustomerDto) {
    return api.post<Customer>('/customers', dto);
  },

  update(id: string, dto: Partial<CreateCustomerDto>) {
    return api.put<Customer>(`/customers/${id}`, dto);
  },

  setStatus(id: string, isActive: boolean) {
    return api.patch<Customer>(`/customers/${id}/status`, { isActive });
  },

  delete(id: string) {
    return api.delete(`/customers/${id}`);
  },
};
