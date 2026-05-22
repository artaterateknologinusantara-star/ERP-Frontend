import { api } from '@/lib/api';
import { SalesOrder, SalesOrderStatus, PaginatedResponse } from '@/types';

export interface SOListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: SalesOrderStatus | 'Semua';
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateSODto {
  quotationId?: string;
  customerId: string;
  projectName: string;
  salesId: string;
  date: string;
  deliveryDate: string;
}

export const salesOrderService = {
  list(params?: SOListParams): Promise<PaginatedResponse<SalesOrder>> {
    return api.getList<SalesOrder>('/sales-orders', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      status: params?.status !== 'Semua' ? params?.status : undefined,
      customerId: params?.customerId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
  },

  getById(id: string) {
    return api.get<SalesOrder>(`/sales-orders/${id}`);
  },

  createFromQuotation(quotationId: string) {
    return api.post<SalesOrder>('/sales-orders/from-quotation', { quotationId });
  },

  create(dto: CreateSODto) {
    return api.post<SalesOrder>('/sales-orders', dto);
  },

  update(id: string, dto: Partial<CreateSODto>) {
    return api.put<SalesOrder>(`/sales-orders/${id}`, dto);
  },

  updateStatus(id: string, status: SalesOrderStatus) {
    return api.patch<SalesOrder>(`/sales-orders/${id}/status`, { status });
  },

  delete(id: string) {
    return api.delete(`/sales-orders/${id}`);
  },
};
