import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface SubconMarginByVendorRow {
  supplierId: string;
  supplierName: string;
  requestCount: number;
  approvedSubmissionCount: number;
  totalNilaiJual: number;
  totalMargin: number;
  marginPercent: number;
}

export interface SubconMarginByVendorReport {
  startDate: string;
  endDate: string;
  rows: SubconMarginByVendorRow[];
  totalNilaiJual: number;
  totalMargin: number;
  marginPercent: number;
}

export interface SubconMarginQuotationVendorGroup {
  quotationGroupId: string;
  groupName: string;
  supplierId: string;
  supplierName: string;
  vendorRabSubmissionId: string;
  reviewedAt: string | null;
  totalNilaiJual: number;
  totalMargin: number;
}

export interface SubconMarginByQuotationRow {
  quotationId: string;
  no: string;
  projectName: string;
  customerName: string;
  status: string;
  vendorGroups: SubconMarginQuotationVendorGroup[];
  totalNilaiJual: number;
  totalMargin: number;
}

export interface SubconMarginByQuotationReport {
  startDate: string;
  endDate: string;
  rows: SubconMarginByQuotationRow[];
}

// ── Helpers ────────────────────────────────────

function buildQS(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const pairs = (Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][])
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return pairs.length ? '?' + new URLSearchParams(pairs).toString() : '';
}

// ── Functions ──────────────────────────────────

export async function getSubconMarginByVendor(
  startDate?: string,
  endDate?: string,
  supplierId?: string
): Promise<SubconMarginByVendorReport> {
  const res = await api.get<SubconMarginByVendorReport>(`/reports/subcon-margin/by-vendor${buildQS({ startDate, endDate, supplierId })}`);
  return res.data;
}

export async function getSubconMarginByQuotation(
  startDate?: string,
  endDate?: string,
  supplierId?: string
): Promise<SubconMarginByQuotationReport> {
  const res = await api.get<SubconMarginByQuotationReport>(`/reports/subcon-margin/by-quotation${buildQS({ startDate, endDate, supplierId })}`);
  return res.data;
}
