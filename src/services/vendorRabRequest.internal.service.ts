import { api } from '@/lib/api';
import type { VendorRabRequest, VendorRabSubmission } from '@/types';

export interface CreateVendorRabRequestLineDto {
  name: string;
  spesifikasi?: string;
  volume: number;
  unit: string;
  sortOrder: number;
}

export interface CreateVendorRabRequestDto {
  supplierId: string;
  name: string;
  dueDate?: string;
  lines: CreateVendorRabRequestLineDto[];
}

// Internal/maincon-facing — normal "Internal" scheme, no separate client needed.
export const vendorRabRequestInternalService = {
  createAndSend(groupId: string, dto: CreateVendorRabRequestDto) {
    return api.post<VendorRabRequest>(`/quotations/groups/${groupId}/rab-requests`, dto);
  },

  listByGroup(groupId: string) {
    return api.get<VendorRabRequest[]>(`/quotations/groups/${groupId}/rab-requests`);
  },

  getById(id: string) {
    return api.get<VendorRabRequest>(`/vendor-rab-requests/${id}`);
  },
};

export const vendorRabSubmissionService = {
  getById(id: string) {
    return api.get<VendorRabSubmission>(`/vendor-submissions/${id}`);
  },

  setLineMarkup(submissionId: string, lineId: string, serviceMarkup: number, materialMarkup: number) {
    return api.put(`/vendor-submissions/${submissionId}/lines/${lineId}/markup`, { serviceMarkup, materialMarkup });
  },

  approve(submissionId: string) {
    return api.post<string>(`/vendor-submissions/${submissionId}/approve`, {});
  },

  reject(submissionId: string, reason?: string) {
    return api.post(`/vendor-submissions/${submissionId}/reject`, { reason });
  },
};
