import { ApiResponse, CustomerPO, PaginatedResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syntera_token');
}

export interface CreateCustomerPoDto {
  quotationId: string;
  poNo: string;
  poDate: string;
  amount: number;
  notes?: string;
}

export const customerPoService = {
  list(params?: { page?: number; perPage?: number; search?: string }): Promise<PaginatedResponse<CustomerPO>> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.perPage) qs.set('perPage', String(params.perPage));
    if (params?.search) qs.set('search', params.search);
    return fetch(`${BASE_URL}/customer-pos?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json() as Promise<ApiResponse<PaginatedResponse<CustomerPO>>>)
      .then((r) => r.data!);
  },

  getById(id: string): Promise<ApiResponse<CustomerPO>> {
    const token = getToken();
    return fetch(`${BASE_URL}/customer-pos/${id}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).then((r) => r.json() as Promise<ApiResponse<CustomerPO>>);
  },

  getByQuotationId(quotationId: string): Promise<ApiResponse<CustomerPO>> {
    const token = getToken();
    return fetch(`${BASE_URL}/customer-pos/by-quotation/${quotationId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).then((r) => r.json() as Promise<ApiResponse<CustomerPO>>);
  },

  async create(data: CreateCustomerPoDto, file?: File): Promise<ApiResponse<CustomerPO>> {
    const token = getToken();
    const formData = new FormData();
    formData.append('quotationId', data.quotationId);
    formData.append('poNo', data.poNo);
    formData.append('poDate', data.poDate);
    formData.append('amount', String(data.amount));
    if (data.notes) formData.append('notes', data.notes);
    if (file) formData.append('attachment', file);

    const res = await fetch(`${BASE_URL}/customer-pos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Gagal menyimpan Customer PO');
    }
    return res.json() as Promise<ApiResponse<CustomerPO>>;
  },

  async downloadAttachment(id: string): Promise<void> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/customer-pos/${id}/attachment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) throw new Error('Gagal mengunduh lampiran');

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const fileName = match?.[1]?.replace(/['"]/g, '') ?? 'attachment';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },

  delete(id: string): Promise<ApiResponse<void>> {
    const token = getToken();
    return fetch(`${BASE_URL}/customer-pos/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json() as Promise<ApiResponse<void>>);
  },
};
