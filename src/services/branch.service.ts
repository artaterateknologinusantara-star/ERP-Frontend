import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BranchListParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface CreateBranchDto {
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
}

export interface UpdateBranchDto extends CreateBranchDto {
  isActive: boolean;
}

export const branchService = {
  list(params?: BranchListParams): Promise<PaginatedResponse<Branch>> {
    return api.getList<Branch>('/branches', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
    });
  },

  getById(id: string) {
    return api.get<Branch>(`/branches/${id}`);
  },

  create(dto: CreateBranchDto) {
    return api.post<Branch>('/branches', dto);
  },

  update(id: string, dto: UpdateBranchDto) {
    return api.put<Branch>(`/branches/${id}`, dto);
  },

  delete(id: string) {
    return api.delete(`/branches/${id}`);
  },
};
