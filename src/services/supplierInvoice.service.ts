import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';

// ── Types ──────────────────────────────────────

export interface SupplierInvoiceItem {
  id: string;
  purchaseOrderItemId: string;
  itemName: string;
  qty: number;
  price: number;
  amount: number;
}

export interface SupplierInvoiceListItem {
  id: string;
  no: string;
  invoiceNumber: string;
  purchaseOrderNo: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  ppnMasukan: number;
  nomorFakturPajak?: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
}

export interface SupplierInvoiceDetail {
  id: string;
  no: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  purchaseOrderNo: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  ppnMasukan: number;
  nomorFakturPajak?: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  approvedAt?: string;
  items: SupplierInvoiceItem[];
  createdAt: string;
}

export interface CreateSupplierInvoiceItemRequest {
  purchaseOrderItemId: string;
  qty: number;
}

export interface CreateSupplierInvoiceRequest {
  purchaseOrderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  ppnMasukan: number;
  nomorFakturPajak?: string;
  items: CreateSupplierInvoiceItemRequest[];
}

// ── Functions ────────────────────────────────

export async function getSupplierInvoiceList(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  supplierId?: string;
  purchaseOrderId?: string;
}): Promise<PaginatedResponse<SupplierInvoiceListItem>> {
  return api.getList<SupplierInvoiceListItem>('/supplier-invoices', params);
}

export async function getSupplierInvoiceDetail(id: string): Promise<SupplierInvoiceDetail> {
  const res = await api.get<SupplierInvoiceDetail>(`/supplier-invoices/${id}`);
  return res.data;
}

export async function createSupplierInvoice(
  data: CreateSupplierInvoiceRequest
): Promise<SupplierInvoiceDetail> {
  const res = await api.post<SupplierInvoiceDetail>('/supplier-invoices', data);
  return res.data;
}
