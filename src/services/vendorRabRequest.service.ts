import { vendorApi } from '@/lib/vendorApi';
import type { VendorRabRequest } from '@/types';

export interface SubmitVendorRabLine {
  vendorRabRequestLineId: string;
  servicePrice: number;
  materialPrice: number;
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
    return vendorApi.post(`/vendor/rab-requests/${id}/submissions`, { lines });
  },
};
