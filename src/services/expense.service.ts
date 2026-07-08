import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syntera_token');
}

// ── Types ──────────────────────────────────────

export interface ExpenseListItem {
  id: string;
  expenseNo: string;
  expenseDate: string;
  expenseCategoryId: string;
  expenseCategoryName: string;
  description: string;
  vendorName?: string;
  amount: number;
  status: string;
}

export interface ExpenseDetail extends ExpenseListItem {
  vendorId?: string;
  method: string;
  cashBankAccountId: string;
  cashBankAccountCode: string;
  cashBankAccountName: string;
  referenceNumber?: string;
  hasAttachment: boolean;
  attachmentName?: string;
  approvedAt?: string;
  approvedByName?: string;
  remarks?: string;
  createdAt: string;
}

export interface CreateExpenseRequest {
  expenseDate: string;
  expenseCategoryId: string;
  description: string;
  vendorId?: string;
  amount: number;
  method: string;
  cashBankAccountId?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface ExpenseListParams {
  page?: number;
  perPage?: number;
  status?: string;
  expenseCategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Functions ──────────────────────────────────

export async function getExpenseList(params?: ExpenseListParams): Promise<PaginatedResponse<ExpenseListItem>> {
  return api.getList<ExpenseListItem>('/expenses', { ...params });
}

export async function getExpenseDetail(id: string): Promise<ExpenseDetail> {
  const res = await api.get<ExpenseDetail>(`/expenses/${id}`);
  return res.data;
}

export async function createExpense(data: CreateExpenseRequest, attachment?: File): Promise<ExpenseDetail> {
  const token = getToken();
  const formData = new FormData();
  formData.append('ExpenseDate', data.expenseDate);
  formData.append('ExpenseCategoryId', data.expenseCategoryId);
  formData.append('Description', data.description);
  if (data.vendorId) formData.append('VendorId', data.vendorId);
  formData.append('Amount', String(data.amount));
  formData.append('Method', data.method);
  if (data.cashBankAccountId) formData.append('CashBankAccountId', data.cashBankAccountId);
  if (data.referenceNumber) formData.append('ReferenceNumber', data.referenceNumber);
  if (data.remarks) formData.append('Remarks', data.remarks);
  if (attachment) formData.append('attachment', attachment);

  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Gagal menyimpan Expense');
  }
  const json = await res.json();
  return json.data as ExpenseDetail;
}

export async function submitExpense(id: string): Promise<ExpenseDetail> {
  const res = await api.post<ExpenseDetail>(`/expenses/${id}/submit`, {});
  return res.data;
}

export async function approveExpense(id: string): Promise<ExpenseDetail> {
  const res = await api.post<ExpenseDetail>(`/expenses/${id}/approve`, {});
  return res.data;
}

export async function rejectExpense(id: string, reason?: string): Promise<ExpenseDetail> {
  const res = await api.post<ExpenseDetail>(`/expenses/${id}/reject`, { reason });
  return res.data;
}

export async function downloadExpenseAttachment(id: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/expenses/${id}/attachment`, {
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
}
