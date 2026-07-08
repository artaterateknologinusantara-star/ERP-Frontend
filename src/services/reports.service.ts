import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface IncomeStatementAccountRow {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface IncomeStatement {
  startDate: string;
  endDate: string;
  revenues: IncomeStatementAccountRow[];
  expenses: IncomeStatementAccountRow[];
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
}

export interface BalanceSheetAccountRow {
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: BalanceSheetAccountRow[];
  liabilities: BalanceSheetAccountRow[];
  equities: BalanceSheetAccountRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquities: number;
  selisih: number;
}

export interface GeneralLedgerLine {
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedger {
  accountId: string;
  accountCode: string;
  accountName: string;
  normalBalance: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  lines: GeneralLedgerLine[];
  closingBalance: number;
}

// ── Helpers ────────────────────────────────────

function buildQS(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const pairs = (Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][])
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return pairs.length ? '?' + new URLSearchParams(pairs).toString() : '';
}

async function fetchPdf(path: string): Promise<Blob> {
  const token = localStorage.getItem('syntera_token');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export PDF gagal: ${res.status}`);
  return res.blob();
}

// ── Functions ──────────────────────────────────

export async function getTrialBalance(asOfDate?: string): Promise<TrialBalanceRow[]> {
  const res = await api.get<TrialBalanceRow[]>(`/reports/trial-balance${buildQS({ asOfDate })}`);
  return res.data;
}

export async function getIncomeStatement(startDate?: string, endDate?: string): Promise<IncomeStatement> {
  const res = await api.get<IncomeStatement>(`/reports/income-statement${buildQS({ startDate, endDate })}`);
  return res.data;
}

export async function getBalanceSheet(asOfDate?: string): Promise<BalanceSheet> {
  const res = await api.get<BalanceSheet>(`/reports/balance-sheet${buildQS({ asOfDate })}`);
  return res.data;
}

export async function getGeneralLedger(accountId: string, startDate?: string, endDate?: string): Promise<GeneralLedger> {
  const res = await api.get<GeneralLedger>(`/reports/general-ledger/${accountId}${buildQS({ startDate, endDate })}`);
  return res.data;
}

export function exportTrialBalancePdf(asOfDate?: string): Promise<Blob> {
  return fetchPdf(`/reports/trial-balance/pdf${buildQS({ asOfDate })}`);
}

export function exportIncomeStatementPdf(startDate?: string, endDate?: string): Promise<Blob> {
  return fetchPdf(`/reports/income-statement/pdf${buildQS({ startDate, endDate })}`);
}

export function exportBalanceSheetPdf(asOfDate?: string): Promise<Blob> {
  return fetchPdf(`/reports/balance-sheet/pdf${buildQS({ asOfDate })}`);
}

export function exportGeneralLedgerPdf(accountId: string, startDate?: string, endDate?: string): Promise<Blob> {
  return fetchPdf(`/reports/general-ledger/${accountId}/pdf${buildQS({ startDate, endDate })}`);
}
