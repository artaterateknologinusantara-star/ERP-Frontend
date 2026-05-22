import { api } from '@/lib/api';
import { CostingTab, Quotation, QuotationListItem, QuotationStatus, PaginatedResponse } from '@/types';

export interface SendQuotationResult {
  quotationNo: string;
  projectName: string;
  customerName: string;
  customerEmail?: string;
  sentAt: string;
}

export interface QuotationListParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: QuotationStatus | 'Semua';
  salesId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateQuotationDto {
  customerId: string;
  salesId: string;
  projectName: string;
  date: string;
  validUntil?: string;
  discount: number;
  taxRate: number;
  paymentTerms?: string;
  notes?: string;
  additionalNotes?: string;
  tabs: BackendTab[];
}

// ── Backend shape (matches SaveQuotationRequest on the API) ───────────────────
interface BackendTab {
  label: string;
  sortOrder: number;
  groups: BackendGroup[];
}

interface BackendGroup {
  name: string;
  sortOrder: number;
  items: BackendItem[];
}

interface BackendItem {
  itemNo: string;
  equipment: string;
  description?: string;
  manufacturer?: string;
  qty: number;
  unit: string;
  servicePrice: number;
  materialPrice: number;
  sortOrder: number;
}

// Maps frontend CostingTab[] → backend tabs shape
export function mapTabsToBackend(tabs: CostingTab[]): BackendTab[] {
  return tabs.map((tab, ti) => ({
    label: tab.label,
    sortOrder: tab.sortOrder ?? ti,
    groups: tab.groups.map((group, gi) => ({
      name: group.name,
      sortOrder: group.sortOrder ?? gi,
      items: group.rows.map((row, ri) => ({
        itemNo: row.no,
        equipment: row.equipment,
        description: row.description || undefined,
        manufacturer: row.manufacturer || undefined,
        qty: row.qty,
        unit: row.unit,
        servicePrice: row.servicePrice,
        materialPrice: row.materialPrice,
        sortOrder: row.sortOrder ?? ri,
      })),
    })),
  }));
}

export const quotationService = {
  list(params?: QuotationListParams): Promise<PaginatedResponse<QuotationListItem>> {
    return api.getList<QuotationListItem>('/quotations', {
      page: params?.page,
      perPage: params?.perPage,
      search: params?.search,
      status: params?.status !== 'Semua' ? params?.status : undefined,
      salesId: params?.salesId,
      customerId: params?.customerId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
  },

  getById(id: string) {
    return api.get<Quotation>(`/quotations/${id}`);
  },

  create(dto: CreateQuotationDto) {
    return api.post<Quotation>('/quotations', dto);
  },

  update(id: string, dto: Partial<CreateQuotationDto>) {
    return api.put<Quotation>(`/quotations/${id}`, dto);
  },

  updateStatus(id: string, status: QuotationStatus) {
    return api.patch<Quotation>(`/quotations/${id}/status`, { status });
  },

  duplicate(id: string) {
    return api.post<Quotation>(`/quotations/${id}/duplicate`, {});
  },

  send(id: string) {
    return api.post<SendQuotationResult>(`/quotations/${id}/send`, {});
  },

  revision(id: string) {
    return api.post<Quotation>(`/quotations/${id}/revision`, {});
  },

  approve(id: string) {
    return api.post(`/quotations/${id}/approve`, {});
  },

  reject(id: string) {
    return api.post(`/quotations/${id}/reject`, {});
  },

  delete(id: string) {
    return api.delete(`/quotations/${id}`);
  },

  bulkDelete(ids: string[]) {
    return api.post('/quotations/bulk-delete', { ids });
  },

  exportPdf(id: string): Promise<Blob> {
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}/quotations/${id}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('syntera_token')}` },
    }).then((r) => {
      if (!r.ok) throw new Error(`PDF export failed: ${r.status}`);
      return r.blob();
    });
  },
};
