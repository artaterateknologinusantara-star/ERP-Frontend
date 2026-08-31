import { api } from '@/lib/api';
import { quotationService } from './quotation.service';
import { approveExpense, rejectExpense } from './expense.service';
import { updatePRStatus } from './purchase.service';

export type PendingApprovalType = 'Quotation' | 'Expense' | 'PurchaseRequest' | 'SupplierInvoice';

export interface PendingApproval {
  id: string;
  module: string;
  type: PendingApprovalType;
  typeLabel: string;
  no: string;
  title: string;
  amount: number;
  date: string;
  requestedByName: string;
  detailUrl?: string;
}

// SupplierInvoice has no reject flow on the backend (SupplierInvoiceController only exposes
// /approve) — Draft invoices are corrected by editing them, not rejected.
export const canReject = (type: PendingApprovalType) => type !== 'SupplierInvoice';

export const approvalService = {
  async getPending(): Promise<PendingApproval[]> {
    const res = await api.get<PendingApproval[]>('/approvals/pending');
    return res.data ?? [];
  },

  approve(item: PendingApproval) {
    switch (item.type) {
      case 'Quotation': return quotationService.approve(item.id);
      case 'Expense': return approveExpense(item.id);
      case 'PurchaseRequest': return updatePRStatus(item.id, 'Approved');
      case 'SupplierInvoice': return api.post(`/supplier-invoices/${item.id}/approve`, {});
    }
  },

  reject(item: PendingApproval) {
    switch (item.type) {
      case 'Quotation': return quotationService.reject(item.id);
      case 'Expense': return rejectExpense(item.id);
      case 'PurchaseRequest': return updatePRStatus(item.id, 'Rejected');
      case 'SupplierInvoice': throw new Error('Supplier Invoice tidak memiliki alur tolak.');
    }
  },
};
