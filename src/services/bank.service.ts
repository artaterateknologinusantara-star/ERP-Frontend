import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syntera_token');
}

// ── Types ──────────────────────────────────────

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface CsvRowError {
  rowNumber: number;
  reason: string;
}

/** Dilempar saat import ditolak backend (400 dengan daftar error per baris CSV). */
export class BankImportRejectedError extends Error {
  rowErrors: CsvRowError[];
  constructor(message: string, rowErrors: CsvRowError[]) {
    super(message);
    this.rowErrors = rowErrors;
  }
}

export interface ImportBankStatementRequest {
  accountId: string;
  periodStart: string;
  periodEnd: string;
  statementEndingBalance?: number;
}

export interface BankStatementImportSummary {
  id: string;
  lineCount: number;
}

export interface BankStatementImportListItem {
  id: string;
  importDate: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  statementEndingBalance?: number;
  lineCount: number;
  matchedCount: number;
  unmatchedCount: number;
  ignoredCount: number;
}

export interface MatchCandidate {
  journalEntryLineId: string;
  journalEntryId: string;
  entryNumber: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
}

export interface BankStatementLineDetail {
  id: string;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  amount: number;
  matchStatus: string;
  matchedJournalEntryLineId?: string;
  suggestedMatches: MatchCandidate[];
}

export interface BankStatementImportDetail {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  importDate: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  statementEndingBalance?: number;
  lines: BankStatementLineDetail[];
}

// ── Functions ──────────────────────────────────

export async function getBalances(asOf?: string): Promise<AccountBalance[]> {
  const dateStr = asOf ?? new Date().toISOString().slice(0, 10);
  const res = await api.get<AccountBalance[]>(`/bank-reconciliation/balances?asOf=${dateStr}`);
  return res.data;
}

export async function importBankStatement(
  request: ImportBankStatementRequest,
  file: File
): Promise<BankStatementImportSummary> {
  const token = getToken();
  const formData = new FormData();
  formData.append('AccountId', request.accountId);
  formData.append('PeriodStart', request.periodStart);
  formData.append('PeriodEnd', request.periodEnd);
  if (request.statementEndingBalance !== undefined) {
    formData.append('StatementEndingBalance', String(request.statementEndingBalance));
  }
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/bank-reconciliation/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    if (res.status === 400 && Array.isArray(json.data)) {
      throw new BankImportRejectedError(json.message ?? 'Import CSV ditolak.', json.data as CsvRowError[]);
    }
    throw new Error(json.message ?? 'Gagal mengimpor mutasi bank');
  }

  return json.data as BankStatementImportSummary;
}

export async function listImports(accountId: string): Promise<BankStatementImportListItem[]> {
  const res = await api.get<BankStatementImportListItem[]>(`/bank-reconciliation/imports?accountId=${accountId}`);
  return res.data;
}

export async function getImportDetail(id: string): Promise<BankStatementImportDetail> {
  const res = await api.get<BankStatementImportDetail>(`/bank-reconciliation/imports/${id}`);
  return res.data;
}

export async function matchLine(lineId: string, journalEntryLineId: string): Promise<BankStatementLineDetail> {
  const res = await api.post<BankStatementLineDetail>(`/bank-reconciliation/lines/${lineId}/match`, {
    journalEntryLineId,
  });
  return res.data;
}

export async function unmatchLine(lineId: string): Promise<BankStatementLineDetail> {
  const res = await api.post<BankStatementLineDetail>(`/bank-reconciliation/lines/${lineId}/unmatch`, {});
  return res.data;
}

export async function ignoreLine(lineId: string): Promise<BankStatementLineDetail> {
  const res = await api.post<BankStatementLineDetail>(`/bank-reconciliation/lines/${lineId}/ignore`, {});
  return res.data;
}
