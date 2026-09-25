import { api } from '@/lib/api';
import { GUID_RE } from '@/lib/guid';
import {
  CostingTab,
  Quotation,
  QuotationListItem,
  QuotationStatus,
  PaginatedResponse,
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
  facilityId?: string;
  renovPic?: string;
  facilityName?: string;
  scopeOfWork?: string;
  location?: string;
  contractor?: string;
  validityPeriod?: string;
  paymentTerms?: string;
  termins?: BackendTermin[];
  termsAndConditions?: string;
  notes?: string;
  additionalNotes?: string;
  tabs: BackendTab[];
}

interface BackendTermin {
  sortOrder: number;
  description: string;
  percentage: number;
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
  // Always sent as a full array (never omitted) once a group has RAB/BQ data — the backend
  // treats an omitted field as "leave WorkItems untouched" but an explicit array (even []) as
  // the complete, authoritative set: anything not listed here gets deleted, attachments
  // included. See mapTabsToBackend below.
  workItems: BackendWorkItem[];
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
  itemMasterId?: string;
}

interface BackendWorkItem {
  id?: string;
  name: string;
  sortOrder: number;
  workDetails: BackendWorkDetail[];
}

interface BackendWorkDetail {
  id?: string;
  name: string;
  spesifikasi?: string;
  volume: number;
  unit: string;
  servicePrice: number;
  materialPrice: number;
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
        itemMasterId: row.itemMasterId || undefined,
      })),
      workItems: (group.workItems ?? []).map((w, wi) => ({
        id: GUID_RE.test(w.id) ? w.id : undefined,
        name: w.name,
        sortOrder: w.sortOrder ?? wi,
        workDetails: w.workDetails.map((d, di) => ({
          id: GUID_RE.test(d.id) ? d.id : undefined,
          name: d.name,
          spesifikasi: d.spesifikasi || undefined,
          volume: d.volume,
          unit: d.unit,
          servicePrice: d.servicePrice,
          materialPrice: d.materialPrice,
          sortOrder: d.sortOrder ?? di,
        })),
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

  // ── Item Pekerjaan / Detail Kerja (RAB/BQ) — WorkItem/WorkDetail rows themselves are now
  // state-local in the form and only persisted via the main create/update payload (see
  // mapTabsToBackend above); only the attachment endpoints below still hit the API directly,
  // since an uploaded file has to exist on a real, already-saved WorkDetail.Id.
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
