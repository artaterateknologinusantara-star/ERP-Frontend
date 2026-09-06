import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';

export interface TaxRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  isDefault: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TaxRateListParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface TaxRateFormDto {
  code: string;
  name: string;
  rate: number;
  isDefault: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export const taxRateService = {
  list(params?: TaxRateListParams): Promise<PaginatedResponse<TaxRate>> {
    return api.getList<TaxRate>('/tax-rates', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
    });
  },

  getById(id: string) {
    return api.get<TaxRate>(`/tax-rates/${id}`);
  },

  create(dto: TaxRateFormDto) {
    return api.post<TaxRate>('/tax-rates', dto);
  },

  update(id: string, dto: TaxRateFormDto) {
    return api.put<TaxRate>(`/tax-rates/${id}`, dto);
  },

  setStatus(id: string, isActive: boolean) {
    return api.patch<TaxRate>(`/tax-rates/${id}/status`, { isActive });
  },
};
