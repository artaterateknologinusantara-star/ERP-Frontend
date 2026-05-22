import { api } from '@/lib/api';
import { ItemMaster, PaginatedResponse } from '@/types';

export interface ItemMasterListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  isActive?: boolean;
}

export interface ItemMasterStats {
  totalActive: number;
  totalAll: number;
  lowStockCount: number;
}

export const itemMasterService = {
  list(params?: ItemMasterListParams): Promise<PaginatedResponse<ItemMaster>> {
    return api.getList<ItemMaster>('/item-masters', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      sortBy: params?.sortBy,
      sortDir: params?.sortDir,
      ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
    });
  },

  getById(id: string) {
    return api.get<ItemMaster>(`/item-masters/${id}`);
  },

  async getStats(): Promise<ItemMasterStats> {
    const res = await api.get<ItemMasterStats>('/item-masters/stats');
    return res.data!;
  },
};
