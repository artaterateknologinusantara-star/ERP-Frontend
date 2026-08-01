import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface ARItem {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  salesOrderNo?: string;
  invoiceDate: string;
  dueDate: string;
  terms?: string;
  grandTotal: number;
  paid: number;
  balance: number;
  status: string;
  agingDays: number;
  agingBucket: string;
}

export interface ARStats {
  totalOutstanding: number;
  current: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61to90: number;
  overdueOver90: number;
  totalInvoices: number;
  overdueCount: number;
}

export interface APItem {
  id: string;
  poNo: string;
  supplierId: string;
  supplierName: string;
  purchaseRequestNo?: string;
  poDate: string;
  deliveryDate?: string;
  total: number;
  totalPaid: number;
  balance: number;
  status: string;
  agingDays: number;
}

export interface APStats {
  totalPending: number;
  ordered: number;
  partialReceive: number;
  completed: number;
  totalPos: number;
  overdueDelivery: number;
}

export interface CashInItem {
  id: string;
  date: string;
  refNo: string;
  description: string;
  customerName: string;
  invoiceNo: string;
  invoiceId: string;
  amount: number;
  method: string;
  notes?: string;
}

export interface CashOutItem {
  id: string;
  date: string;
  refNo: string;
  description: string;
  supplierName: string;
  poNo: string;
  amount: number;
  status: string;
  notes?: string;
}

export interface FinanceSummary {
  totalCashInAllTime: number;
  totalCashInThisMonth: number;
  totalCashInThisYear: number;
  totalCashOutAllTime: number;
  totalCashOutThisMonth: number;
  totalCashOutThisYear: number;
  totalAR: number;
  overdueAR: number;
  totalAP: number;
  netCashThisMonth: number;
  netCashThisYear: number;
}

export interface MonthlyChartItem {
  month: string;
  year: number;
  cashIn: number;
  cashOut: number;
  net: number;
}

// ── Helpers ────────────────────────────────────

function buildQS(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const pairs = (Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][])
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return pairs.length ? '?' + new URLSearchParams(pairs).toString() : '';
}

// ── Functions ──────────────────────────────────

export async function getARList(): Promise<ARItem[]> {
  const res = await api.get<ARItem[]>('/finance/ar');
  return res.data;
}

export async function getARStats(): Promise<ARStats> {
  const res = await api.get<ARStats>('/finance/ar/stats');
  return res.data;
}

export async function getAPList(): Promise<APItem[]> {
  const res = await api.get<APItem[]>('/finance/ap');
  return res.data;
}

export async function getAPStats(): Promise<APStats> {
  const res = await api.get<APStats>('/finance/ap/stats');
  return res.data;
}

export async function getCashInList(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<CashInItem[]> {
  const res = await api.get<CashInItem[]>(`/finance/cash-in${buildQS(params)}`);
  return res.data;
}

export async function getCashOutList(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<CashOutItem[]> {
  const res = await api.get<CashOutItem[]>(`/finance/cash-out${buildQS(params)}`);
  return res.data;
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const res = await api.get<FinanceSummary>('/finance/summary');
  return res.data;
}

export async function getMonthlyChart(): Promise<MonthlyChartItem[]> {
  const res = await api.get<MonthlyChartItem[]>('/finance/monthly-chart');
  return res.data;
}
