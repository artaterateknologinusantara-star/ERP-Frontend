import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  isActive: boolean;
}

export interface CreateExpenseCategoryRequest {
  code: string;
  name: string;
  description?: string;
  accountId: string;
}

export interface UpdateExpenseCategoryRequest {
  name: string;
  description?: string;
  accountId: string;
  isActive: boolean;
}

// ── Functions ──────────────────────────────────

export async function getExpenseCategoryList(isActive?: boolean): Promise<ExpenseCategory[]> {
  const qs = isActive === undefined ? '' : `?isActive=${isActive}`;
  const res = await api.get<ExpenseCategory[]>(`/expense-categories${qs}`);
  return res.data;
}

export async function getExpenseCategoryDetail(id: string): Promise<ExpenseCategory> {
  const res = await api.get<ExpenseCategory>(`/expense-categories/${id}`);
  return res.data;
}

export async function createExpenseCategory(data: CreateExpenseCategoryRequest): Promise<ExpenseCategory> {
  const res = await api.post<ExpenseCategory>('/expense-categories', data);
  return res.data;
}

export async function updateExpenseCategory(id: string, data: UpdateExpenseCategoryRequest): Promise<ExpenseCategory> {
  const res = await api.put<ExpenseCategory>(`/expense-categories/${id}`, data);
  return res.data;
}
