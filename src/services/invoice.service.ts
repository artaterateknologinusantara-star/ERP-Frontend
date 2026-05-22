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
