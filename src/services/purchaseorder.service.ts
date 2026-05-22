import { api } from '@/lib/api';
import { PurchaseRequest, PurchaseOrder, PurchaseOrderStatus, PurchaseRequestStatus, PaginatedResponse } from '@/types';

export interface POListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: PurchaseOrderStatus | 'Semua';
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreatePODto {
  purchaseRequestId?: string;
  supplierId: string;
  date: string;
  deliveryDate: string;
  notes?: string;
  items: { itemId: string; qty: number; unit: string; price: number }[];
}

export interface GoodsReceiptDto {
  purchaseOrderId: string;
  receiptDate: string;
  receivedBy: string;
  items: { poItemId: string; receivedQty: number; notes?: string }[];
}

export const purchaseOrderService = {
  // Purchase Requests
  listPR(params?: { page?: number; perPage?: number; search?: string; status?: PurchaseRequestStatus | 'Semua' }): Promise<PaginatedResponse<PurchaseRequest>> {
    return api.getList<PurchaseRequest>('/purchase-requests', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      status: params?.status !== 'Semua' ? params?.status : undefined,
    });
  },

  approvePR(id: string) {
    return api.patch<PurchaseRequest>(`/purchase-requests/${id}/approve`);
  },

  rejectPR(id: string, reason: string) {
    return api.patch<PurchaseRequest>(`/purchase-requests/${id}/reject`, { reason });
  },

  // Purchase Orders
  list(params?: POListParams): Promise<PaginatedResponse<PurchaseOrder>> {
    return api.getList<PurchaseOrder>('/purchase-orders', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      status: params?.status !== 'Semua' ? params?.status : undefined,
      supplierId: params?.supplierId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
  },

  getById(id: string) {
    return api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },

  create(dto: CreatePODto) {
    return api.post<PurchaseOrder>('/purchase-orders', dto);
  },

  update(id: string, dto: Partial<CreatePODto>) {
    return api.put<PurchaseOrder>(`/purchase-orders/${id}`, dto);
  },

  updateStatus(id: string, status: PurchaseOrderStatus) {
    return api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
  },

  receiveGoods(dto: GoodsReceiptDto) {
    return api.post('/goods-receipts', dto);
  },

  delete(id: string) {
    return api.delete(`/purchase-orders/${id}`);
  },
};
