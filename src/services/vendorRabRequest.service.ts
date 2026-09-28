import { vendorApi } from '@/lib/vendorApi';
import { BASE_URL } from '@/lib/api';
import type { VendorRabRequest, VendorRabSubmission } from '@/types';

// Vendor menyusun RAB-nya sendiri dari nol (bukan lagi isi-harga-ke-baris-yang-diminta) — lihat
// perubahan arah task RAB Sep 2026.
export interface SubmitVendorRabLine {
  workItemName?: string | null;
  name: string;
  spesifikasi?: string | null;
  volume: number;
  unit: string;
  servicePrice: number;
  materialPrice: number;
}

// Sama seperti vendorApi.ts — duplikasi kecil token getter ini sengaja, karena downloadTemplate/
// importSubmission butuh fetch mentah (blob response / multipart body) yang tidak cocok dengan
// helper vendorApi.get/post (selalu JSON), persis pola getToken() di bank.service.ts.
function getVendorToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vendor_token');
}

/** Dilempar saat import Excel ditolak backend (400 dengan daftar pesan error per baris). */
export class VendorRabImportRejectedError extends Error {
  errors: string[];
  constructor(message: string, errors: string[]) {
    super(message);
    this.errors = errors;
  }
}

// Vendor-facing — scoped server-side to the logged-in vendor's SupplierId via the JWT claim.
export const vendorRabRequestService = {
  list() {
    return vendorApi.get<VendorRabRequest[]>('/vendor/rab-requests');
  },

  getById(id: string) {
    return vendorApi.get<VendorRabRequest>(`/vendor/rab-requests/${id}`);
  },

  submit(id: string, lines: SubmitVendorRabLine[]) {
    return vendorApi.post<VendorRabSubmission>(`/vendor/rab-requests/${id}/submissions`, { lines });
  },

  async downloadTemplate(id: string): Promise<Blob> {
    const token = getVendorToken();
    const res = await fetch(`${BASE_URL}/vendor/rab-requests/${id}/template.xlsx`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Gagal mengunduh template: ${res.status}`);
    return res.blob();
  },

  async importSubmission(id: string, file: File): Promise<VendorRabSubmission> {
    const token = getVendorToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/vendor/rab-requests/${id}/submissions/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const json = await res.json().catch(() => ({ message: res.statusText }));

    if (!res.ok) {
      if (res.status === 400 && Array.isArray(json.data)) {
        throw new VendorRabImportRejectedError(json.message ?? 'Import Excel ditolak.', json.data as string[]);
      }
      throw new Error(json.message ?? 'Gagal mengimpor submission Excel');
    }

    return json.data as VendorRabSubmission;
  },
};
