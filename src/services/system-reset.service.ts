import { api } from '@/lib/api';

export interface ResetResult {
  success: boolean;
  message: string;
  deletedCounts: Record<string, number>;
  auditLogId: string;
}

export const systemResetService = {
  resetQuotations: () => api.post<ResetResult>('/system/reset/quotations', {}),
  resetSales: () => api.post<ResetResult>('/system/reset/sales', {}),
  resetPurchasing: () => api.post<ResetResult>('/system/reset/purchasing', {}),
  resetFinance: () => api.post<ResetResult>('/system/reset/finance', {}),
  resetProjects: () => api.post<ResetResult>('/system/reset/projects', {}),
  resetInventory: () => api.post<ResetResult>('/system/reset/inventory', {}),
  resetAll: () => api.post<ResetResult>('/system/reset/all', {}),
};
