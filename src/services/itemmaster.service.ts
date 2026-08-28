import { api } from '@/lib/api';
import { ItemMaster, PaginatedResponse } from '@/types';

export interface ItemMasterListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  isActive?: boolean;
  belowMinimumMargin?: boolean;
}

export interface ItemMasterStats {
  totalActive: number;
  totalAll: number;
  lowStockCount: number;
  belowMinimumMarginCount: number;
}

export interface CreateItemMasterDto {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  uom: string;
  warehouse?: string;
  stock: number;
  minStock: number;
  sellingPrice: number;
  purchasePrice?: number;
  marginType?: 'percent' | 'nominal';
  marginDefault?: number;
  marginMinimum?: number;
  isSellingPriceManual?: boolean;
}

export interface BulkApplyMarginParams {
  search?: string;
  isActive?: boolean;
}

export interface BulkApplyMarginResult {
  updated: number;
  skipped: number;
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
      ...(params?.belowMinimumMargin !== undefined ? { belowMinimumMargin: String(params.belowMinimumMargin) } : {}),
    });
  },

  getById(id: string) {
    return api.get<ItemMaster>(`/item-masters/${id}`);
  },

  async getStats(): Promise<ItemMasterStats> {
    const res = await api.get<ItemMasterStats>('/item-masters/stats');
    return res.data!;
  },

  create(dto: CreateItemMasterDto) {
    return api.post<ItemMaster>('/item-masters', dto);
  },

  update(id: string, dto: Partial<CreateItemMasterDto>) {
    return api.put<ItemMaster>(`/item-masters/${id}`, dto);
  },

  setStatus(id: string, isActive: boolean) {
    return api.patch<ItemMaster>(`/item-masters/${id}/status`, { isActive });
  },

  delete(id: string) {
    return api.delete(`/item-masters/${id}`);
  },

  async bulkApplyMargin(params: BulkApplyMarginParams): Promise<BulkApplyMarginResult> {
    const res = await api.post<BulkApplyMarginResult>('/item-masters/bulk-apply-margin', params);
    return res.data!;
  },
};
