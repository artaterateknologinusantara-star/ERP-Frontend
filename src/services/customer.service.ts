import { api } from '@/lib/api';
import { Customer, ActiveStatus, PaginatedResponse } from '@/types';

export interface CustomerListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: ActiveStatus | 'Semua';
  industry?: string;
  city?: string;
}

export interface CreateCustomerDto {
  code?: string;
  name: string;
  industry: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  npwp?: string;
}

export const customerService = {
  list(params?: CustomerListParams): Promise<PaginatedResponse<Customer>> {
    return api.getList<Customer>('/customers', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      status: params?.status !== 'Semua' ? params?.status : undefined,
      industry: params?.industry,
      city: params?.city,
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

  setStatus(id: string, status: ActiveStatus) {
    return api.patch<Customer>(`/customers/${id}/status`, { status });
  },

  delete(id: string) {
    return api.delete(`/customers/${id}`);
  },
};
