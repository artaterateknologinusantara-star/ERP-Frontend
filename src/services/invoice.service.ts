import { api } from '@/lib/api';
import { Invoice, InvoiceStatus, PaginatedResponse } from '@/types';

export interface InvoiceListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: InvoiceStatus | 'Semua';
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateInvoiceDto {
  salesOrderId?: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  nomorFakturPajak?: string;
}

export interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: 'Transfer' | 'Tunai' | 'Giro' | 'Cek';
  reference?: string;
  notes?: string;
}

export const invoiceService = {
  list(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
    return api.getList<Invoice>('/invoices', {
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
    return api.get<Invoice>(`/invoices/${id}`);
  },

  create(dto: CreateInvoiceDto) {
    return api.post<Invoice>('/invoices', dto);
  },

  update(id: string, dto: Partial<CreateInvoiceDto>) {
    return api.put<Invoice>(`/invoices/${id}`, dto);
  },

  updateStatus(id: string, status: InvoiceStatus) {
    return api.patch<Invoice>(`/invoices/${id}/status`, { status });
  },

  recordPayment(dto: RecordPaymentDto) {
    return api.post('/invoices/payments', dto);
  },

  delete(id: string) {
    return api.delete(`/invoices/${id}`);
  },

  exportPdf(id: string): Promise<Blob> {
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('syntera_token')}` },
    }).then((r) => r.blob());
  },
};

// ── New Types ──────────────────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: string;
  no: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  terms?: string;
  amount: number;
  paid: number;
  balance: number;
  retentionAmount: number;
  retentionReleasedAmount: number;
  status: string;
  salesOrderNo?: string;
  agingDays: number;
}

export interface InvoiceStats {
  total: number;
  outstanding: number;
  overdue: number;
  totalCollected: number;
}

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  cashBankAccountId?: string;
  reference?: string;
  notes?: string;
}

export interface InvoiceItemDetail {
  id: string;
  description: string;
  sku?: string;
  qty: number;
  uom: string;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

export interface InvoiceDetail {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerNpwp?: string;
  invoiceDate: string;
  dueDate: string;
  terms?: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  amount: number;
  subTotal: number;
  taxAmount: number;
  paid: number;
  balance: number;
  retentionAmount: number;
  retentionReleasedAmount: number;
  status: string;
  notes?: string;
  agingDays: number;
  payments: PaymentRecord[];
  items: InvoiceItemDetail[];
}

export interface RecordPaymentRequest {
  paymentDate: string;
  amount: number;
  method: string;
  cashBankAccountId?: string;
  reference?: string;
  notes?: string;
}

// ── New Functions ──────────────────────────────────────────────────────────────

export async function getInvoiceStats(): Promise<InvoiceStats> {
  const res = await api.get<InvoiceStats>('/invoices/stats');
  return res.data;
}

export async function getInvoices(params: {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}): Promise<import('@/types').PaginatedResponse<InvoiceListItem>> {
  return api.getList<InvoiceListItem>('/invoices', {
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
    status: params.status || undefined,
  });
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail> {
  type BackendDetail = Omit<InvoiceDetail, 'subTotal' | 'taxAmount' | 'items'> & {
    subTotal?: number;
    taxAmount?: number;
    items?: InvoiceItemDetail[];
  };
  const res = await api.get<BackendDetail>(`/invoices/${id}`);
  const d = res.data;
  const subTotal  = d.subTotal  ?? Math.round((d.amount / 1.11) * 100) / 100;
  const taxAmount = d.taxAmount ?? Math.round((d.amount - subTotal) * 100) / 100;
  return {
    ...d,
    subTotal,
    taxAmount,
    items: d.items ?? [],
  };
}

export async function recordPayment(id: string, data: RecordPaymentRequest): Promise<void> {
  await api.post(`/invoices/${id}/payments`, {
    date: data.paymentDate,
    amount: data.amount,
    method: data.method,
    cashBankAccountId: data.cashBankAccountId,
    reference: data.reference,
    notes: data.notes,
  });
}

// ── Down Payment Customer ────────────────────────────────────────────────────

export interface ApplyDownPaymentRequest {
  salesOrderPaymentId: string;
  amountToApply: number;
}

export async function applyDownPaymentToInvoice(
  invoiceId: string,
  data: ApplyDownPaymentRequest
): Promise<InvoiceDetail> {
  const res = await api.post<InvoiceDetail>(`/invoices/${invoiceId}/apply-down-payment`, data);
  return res.data;
}

// ── Retention ─────────────────────────────────────────────────────────────────

export interface ReleaseRetentionRequest {
  releaseDate: string;
  amount: number;
  notes?: string;
}

export async function releaseRetention(
  invoiceId: string,
  data: ReleaseRetentionRequest
): Promise<InvoiceDetail> {
  const res = await api.post<InvoiceDetail>(`/invoices/${invoiceId}/retention-release`, data);
  return res.data;
}
