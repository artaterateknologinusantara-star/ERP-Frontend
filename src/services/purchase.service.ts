import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';

// ── Types ──────────────────────────────────────

export interface PRItem {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  estPrice: number;
  notes?: string;
  orderedQty: number;
}

export interface PurchaseRequestListItem {
  id: string;
  no: string;
  salesOrderNo?: string;
  salesOrderId?: string;
  requestedByName: string;
  date: string;
  status: string;
  total: number;
  itemCount: number;
}

export interface PurchaseRequestDetail {
  id: string;
  no: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  requestedBy: string;
  requestedByName: string;
  date: string;
  status: string;
  total: number;
  notes?: string;
  approvedAt?: string;
  approvedByName?: string;
  itemsNeedingPriceVerification: number;
  items: PRItem[];
}

export interface PurchaseRequestStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  totalValue: number;
}

export interface CreatePRItemRequest {
  itemName: string;
  qty: number;
  unit: string;
  estPrice: number;
  notes?: string;
}

export interface CreatePRRequest {
  salesOrderId?: string;
  notes?: string;
  items: CreatePRItemRequest[];
}

export interface POItem {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  price: number;
  receivedQty: number;
  invoicedQty: number;
  total: number;
  itemMasterId?: string;
}

export interface PurchaseOrderListItem {
  id: string;
  no: string;
  purchaseRequestNo?: string;
  purchaseRequestId?: string;
  supplierName: string;
  supplierId: string;
  date: string;
  deliveryDate?: string;
  status: string;
  total: number;
  itemCount: number;
  hasActiveSupplierInvoice: boolean;
}

export interface POPaymentItem {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  cashBankAccountId?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface RecordPOPaymentRequest {
  paymentDate: string;
  amount: number;
  method: string;
  cashBankAccountId?: string;
  reference?: string;
  notes?: string;
}

export interface PurchaseOrderDetail {
  id: string;
  no: string;
  purchaseRequestId?: string;
  purchaseRequestNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  deliveryDate?: string;
  status: string;
  total: number;
  totalPaid: number;
  balance: number;
  notes?: string;
  hasActiveSupplierInvoice: boolean;
  items: POItem[];
  payments: POPaymentItem[];
}

export interface PurchaseOrderStats {
  total: number;
  draft: number;
  ordered: number;
  partialReceive: number;
  completed: number;
  totalValue: number;
}

// ── PR Functions ────────────────────────────────

export async function getPRStats(): Promise<PurchaseRequestStats> {
  const res = await api.get<PurchaseRequestStats>('/purchase-requests/stats');
  return res.data;
}

export async function getPRList(params?: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedResponse<PurchaseRequestListItem>> {
  return api.getList<PurchaseRequestListItem>('/purchase-requests', params);
}

export async function getPRDetail(id: string): Promise<PurchaseRequestDetail> {
  const res = await api.get<PurchaseRequestDetail>(`/purchase-requests/${id}`);
  return res.data;
}

export async function createPR(data: CreatePRRequest): Promise<PurchaseRequestDetail> {
  const res = await api.post<PurchaseRequestDetail>('/purchase-requests', data);
  return res.data;
}

export async function generatePRFromSO(soId: string): Promise<PurchaseRequestDetail> {
  const res = await api.post<PurchaseRequestDetail>(`/purchase-requests/generate-from-so/${soId}`, {});
  return res.data;
}

export async function updatePRStatus(id: string, status: string): Promise<void> {
  await api.patch(`/purchase-requests/${id}/status`, { status });
}

export async function deletePR(id: string): Promise<void> {
  await api.delete(`/purchase-requests/${id}`);
}

// ── PO Functions ────────────────────────────────

export async function getPOStats(): Promise<PurchaseOrderStats> {
  const res = await api.get<PurchaseOrderStats>('/purchase-orders/stats');
  return res.data;
}

export async function getPOList(params?: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  purchaseRequestId?: string;
  purchaseRequestIds?: string;
}): Promise<PaginatedResponse<PurchaseOrderListItem>> {
  return api.getList<PurchaseOrderListItem>('/purchase-orders', params);
}

export async function getPODetail(id: string): Promise<PurchaseOrderDetail> {
  const res = await api.get<PurchaseOrderDetail>(`/purchase-orders/${id}`);
  return res.data;
}

export async function createPOFromPR(
  prId: string,
  data: {
    supplierId: string;
    items: { prItemId: string; qty: number }[];
    notes?: string;
    deliveryDate?: string;
  }
): Promise<PurchaseOrderDetail> {
  const res = await api.post<PurchaseOrderDetail>(`/purchase-orders/from-pr/${prId}`, data);
  return res.data;
}

export async function updatePOStatus(id: string, status: string): Promise<void> {
  await api.patch(`/purchase-orders/${id}/status`, { status });
}

export async function receiveGoods(
  poId: string,
  data: {
    items: { itemId: string; receivedQty: number }[];
    notes?: string;
  }
): Promise<void> {
  await api.post<unknown>(`/purchase-orders/${poId}/receive`, data);
}

export async function deletePO(id: string): Promise<void> {
  await api.delete(`/purchase-orders/${id}`);
}

export async function recordPOPayment(
  poId: string,
  data: RecordPOPaymentRequest
): Promise<POPaymentItem> {
  const res = await api.post<POPaymentItem>(`/purchase-orders/${poId}/payments`, data);
  return res.data!;
}
