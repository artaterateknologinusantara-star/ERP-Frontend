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
    return api.post<SalesOrder>(`/sales-orders/from-quotation/${quotationId}`, {});
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

// ── New Types ──────────────────────────────────────────────────────────────────

export interface SalesOrderItem {
  id: string;
  itemMasterId?: string;
  description: string;
  sku?: string;
  qty: number;
  uom: string;
  unitPrice: number;
  discount: number;
  amount: number;
  qtyShipped: number;
  qtyNotShipped: number;
  notes?: string;
  sortOrder: number;
}

export interface SalesOrderDetail {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerNpwp?: string;
  customerContactPerson?: string;
  projectName: string;
  salesId: string;
  salesName: string;
  date: string;
  expectedDate?: string;
  shipTo?: string;
  terms?: string;
  refQuotation?: string;
  notes?: string;
  status: string;
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  items: SalesOrderItem[];
  createdAt: string;
}

export interface SalesOrderListItem {
  id: string;
  no: string;
  customerName: string;
  projectName: string;
  date: string;
  expectedDate?: string;
  status: string;
  grandTotal: number;
  refQuotation?: string;
}

export interface SalesOrderStats {
  total: number;
  open: number;
  delivered: number;
  completedThisMonth: number;
  totalValue: number;
}

export interface CreateSalesOrderItemRequest {
  itemMasterId?: string;
  description: string;
  sku?: string;
  qty: number;
  uom: string;
  unitPrice: number;
  discount: number;
  notes?: string;
  sortOrder: number;
}

export interface CreateSalesOrderRequest {
  quotationId?: string;
  customerId: string;
  projectName: string;
  salesId: string;
  expectedDate?: string;
  shipTo?: string;
  terms?: string;
  refQuotation?: string;
  notes?: string;
  items: CreateSalesOrderItemRequest[];
}

// ── New Functions ──────────────────────────────────────────────────────────────

export async function getSalesOrderStats(): Promise<SalesOrderStats> {
  const res = await api.get<SalesOrderStats>('/sales-orders/stats');
  return res.data;
}

export async function getSalesOrderDetail(id: string): Promise<SalesOrderDetail> {
  const res = await api.get<SalesOrderDetail>(`/sales-orders/${id}`);
  return res.data;
}

export async function getSalesOrders(params: {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}): Promise<import('@/types').PaginatedResponse<SalesOrderListItem>> {
  return api.getList<SalesOrderListItem>('/sales-orders', {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    status: params.status || undefined,
  });
}

export async function createSalesOrder(
  data: CreateSalesOrderRequest
): Promise<SalesOrderDetail> {
  const res = await api.post<SalesOrderDetail>('/sales-orders', data);
  return res.data;
}

export async function createSOFromQuotation(
  quotationId: string
): Promise<SalesOrderDetail> {
  const res = await api.post<SalesOrderDetail>(
    `/sales-orders/from-quotation/${quotationId}`,
    null
  );
  return res.data;
}
