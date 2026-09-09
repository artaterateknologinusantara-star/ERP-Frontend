import { api } from '@/lib/api';
import { GUID_RE } from '@/lib/guid';
import {
  CostingTab,
  Quotation,
  QuotationListItem,
  QuotationStatus,
  PaginatedResponse,
  WorkItem,
  WorkDetail,
  WorkDetailAttachment,
} from '@/types';

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
  isCivilMeMode: boolean;
  totalAreaSqm?: number | null;
  paymentTerms?: string;
  termsAndConditions?: string;
  notes?: string;
  additionalNotes?: string;
  tabs: BackendTab[];
}

// ── Backend shape (matches SaveQuotationRequest on the API) ───────────────────
interface BackendTab {
  id?: string;
  label: string;
  sortOrder: number;
  groups: BackendGroup[];
}

interface BackendGroup {
  id?: string;
  name: string;
  sortOrder: number;
  recapVolume?: number | null;
  recapUnit?: string | null;
  subcontractorId?: string | null;
  finalSubconCost?: number | null;
  finalSellingPrice?: number | null;
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
  length?: number | null;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
}

// Maps frontend CostingTab[] → backend tabs shape
export function mapTabsToBackend(tabs: CostingTab[]): BackendTab[] {
  return tabs.map((tab, ti) => ({
    id: GUID_RE.test(tab.id) ? tab.id : undefined,
    label: tab.label,
    sortOrder: tab.sortOrder ?? ti,
    groups: tab.groups.map((group, gi) => ({
      id: GUID_RE.test(group.id) ? group.id : undefined,
      name: group.name,
      sortOrder: group.sortOrder ?? gi,
      recapVolume: group.recapVolume ?? undefined,
      recapUnit: group.recapUnit ?? undefined,
      subcontractorId: group.subcontractorId ?? undefined,
      finalSubconCost: group.finalSubconCost ?? undefined,
      finalSellingPrice: group.finalSellingPrice ?? undefined,
      items: group.rows.map((row, ri) => ({
        itemNo: row.no,
        equipment: row.equipment,
        description: row.description || undefined,
        manufacturer: row.manufacturer || undefined,
        qty: row.qty,
        unit: row.unit,
        servicePrice: row.servicePrice,
        materialPrice: row.materialPrice,
        length: row.length ?? undefined,
        width: row.width ?? undefined,
        height: row.height ?? undefined,
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

  // ── Item Pekerjaan / Detail Kerja (RAB/BQ) — auto-save per baris ────────────
  createWorkItem(groupId: string, dto: { name: string; sortOrder: number }) {
    return api.post<WorkItem>(`/quotations/groups/${groupId}/work-items`, dto);
  },

  updateWorkItem(id: string, dto: { name: string; sortOrder: number }) {
    return api.put<void>(`/quotations/work-items/${id}`, dto);
  },

  deleteWorkItem(id: string) {
    return api.delete(`/quotations/work-items/${id}`);
  },

  createWorkDetail(
    workItemId: string,
    dto: {
      name: string;
      spesifikasi?: string;
      volume: number;
      unit: string;
      unitPrice: number;
      sortOrder: number;
    }
  ) {
    return api.post<WorkDetail>(`/quotations/work-items/${workItemId}/work-details`, dto);
  },

  updateWorkDetail(
    id: string,
    dto: {
      name: string;
      spesifikasi?: string;
      volume: number;
      unit: string;
      unitPrice: number;
      sortOrder: number;
    }
  ) {
    return api.put<void>(`/quotations/work-details/${id}`, dto);
  },

  deleteWorkDetail(id: string) {
    return api.delete(`/quotations/work-details/${id}`);
  },

  async uploadWorkDetailAttachment(
    workDetailId: string,
    file: File
  ): Promise<WorkDetailAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/quotations/work-details/${workDetailId}/attachments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('syntera_token')}` },
        body: formData,
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Gagal mengunggah gambar');
    }
    const body = await res.json();
    return body.data;
  },

  async deleteWorkDetailAttachment(attachmentId: string): Promise<void> {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/quotations/work-details/attachments/${attachmentId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('syntera_token')}` },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? 'Gagal menghapus gambar');
    }
  },

  downloadWorkDetailAttachment(attachmentId: string): Promise<Blob> {
    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/quotations/work-details/attachments/${attachmentId}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('syntera_token')}` },
      }
    ).then((r) => {
      if (!r.ok) throw new Error(`Attachment download failed: ${r.status}`);
      return r.blob();
    });
  },
};
