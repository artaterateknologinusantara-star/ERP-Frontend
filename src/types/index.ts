// ─── Common ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

// ─── Status Types ─────────────────────────────────────────────────────────────

export type QuotationStatus = 'Draft' | 'Terkirim' | 'Disetujui' | 'Ditolak' | 'Kadaluarsa' | 'Direvisi' | 'Selesai' | 'Superseded';
export type SalesOrderStatus = 'Draft' | 'Open' | 'Delivered' | 'Completed' | 'Cancelled';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Partial Paid' | 'Paid' | 'Overdue';
export type PurchaseRequestStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Ordered' | 'PartiallyOrdered';
export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'Partial Receive' | 'Completed' | 'Cancelled';
export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
export type ActiveStatus = 'Aktif' | 'Tidak Aktif';

// ─── Master Data ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  code: string;
  name: string;
  industry: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  npwp?: string;
  totalQuotations: number;
  totalRevenue: number;
  status: ActiveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  npwp?: string;
  bankName?: string;
  bankAccount?: string;
  totalPO: number;
  status: ActiveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMaster {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  uom: string;
  warehouse?: string;
  stock: number;
  minStock: number;
  sellingPrice: number;
  purchasePrice?: number;
  lastPurchasePrice?: number;
  marginType?: 'percent' | 'nominal';
  marginDefault?: number;
  marginMinimum?: number;
  isSellingPriceManual: boolean;
  preferredVendorId?: string;
  preferredVendorName?: string;
  model?: string;
  leadTimeDays?: number;
  vendorItemCode?: string;
  procurementNotes?: string;
  isInventoryItem: boolean;
  reorderPoint?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  unit: string;
  type: 'Material' | 'Service';
  basePrice?: number;
  status: ActiveStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Costing / Quotation ──────────────────────────────────────────────────────

export interface CostingRow {
  id: string;
  no: string;
  equipment: string;
  description: string;
  manufacturer: string;
  qty: number;
  unit: string;
  servicePrice: number;
  materialPrice: number;
  /** Harga beli/satuan material — dipakai untuk hitung margin di form. Tidak dikirim/disimpan ke backend. */
  costPrice: number;
  sortOrder: number;
  /** Snapshot dari Item Master saat baris diisi — dipakai untuk warning margin di form. Tidak dikirim/disimpan ke backend. */
  itemMasterId?: string;
  marginType?: 'percent' | 'nominal';
  marginMinimum?: number;
  sellingPriceFloor?: number;
}

export interface CostingGroup {
  id: string;
  name: string;
  rows: CostingRow[];
  sortOrder: number;
}

export interface CostingTab {
  id: string;
  label: string;
  groups: CostingGroup[];
  sortOrder: number;
}

export interface PaymentTerm {
  id: string;
  description: string;
  percentage: number;
}

export interface Quotation {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  projectName: string;
  date: string;
  validUntil: string;
  salesId: string;
  salesName: string;
  revision: number;
  status: QuotationStatus;
  tabs: CostingTab[];
  discount: number;
  taxRate: number;
  paymentTerms: string;
  termsAndConditions: string;
  notes: string;
  additionalNotes: string;
  totalMaterial: number;
  totalService: number;
  totalBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
  approvedAt?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationListItem {
  id: string;
  no: string;
  customerName: string;
  customerEmail?: string;
  projectName: string;
  date: string;
  revision: number;
  salesName: string;
  grandTotal: number;
  status: QuotationStatus;
  isLatestRevision: boolean;
  sentAt?: string;
  hasCustomerPO: boolean;
}

// ─── Customer PO ──────────────────────────────────────────────────────────────

export interface CustomerPO {
  id: string;
  poNo: string;
  quotationId: string;
  quotationNo: string;
  customerName: string;
  projectName: string;
  poDate: string;
  amount: number;
  hasAttachment: boolean;
  salesOrderId?: string;
  salesOrderNo?: string;
  hasHistory: boolean;
  notes?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPoHistory {
  id: string;
  customerPoId: string;
  oldPoNo: string;
  newPoNo: string;
  changedBy?: string;
  changedByName?: string;
  changedAt: string;
  reason?: string;
}

// ─── Sales Order ─────────────────────────────────────────────────────────────

export interface SalesOrder {
  id: string;
  no: string;
  quotationId?: string;
  quotationNo?: string;
  customerId: string;
  customerName: string;
  projectName: string;
  date: string;
  deliveryDate: string;
  salesId: string;
  salesName: string;
  total: number;
  status: SalesOrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  no: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
  nomorFakturPajak?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Purchasing ───────────────────────────────────────────────────────────────

export interface PurchaseRequest {
  id: string;
  no: string;
  salesOrderId?: string;
  salesOrderNo?: string;
  requestedBy: string;
  date: string;
  status: PurchaseRequestStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  no: string;
  purchaseRequestId?: string;
  purchaseRequestNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  deliveryDate: string;
  total: number;
  status: PurchaseOrderStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface ARRecord {
  id: string;
  customerId: string;
  customerName: string;
  totalInvoice: number;
  paid: number;
  outstanding: number;
  aging0_30: number;
  aging31_60: number;
  aging61_90: number;
  agingOver90: number;
  lastPaymentDate?: string;
}

export interface APRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  totalInvoice: number;
  paid: number;
  outstanding: number;
  aging0_30: number;
  aging31_60: number;
  aging61_90: number;
  agingOver90: number;
  lastPaymentDate?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: ActiveStatus;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ─── Company Settings ──────────────────────────────────────────────────────────

export interface CompanySettings {
  id: string;
  companyName: string;
  logoPath?: string | null;
  logoFileName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  footerText?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  documentPrefix?: string | null;
  npwp?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolderName?: string | null;
  updatedAt: string;
}

// ─── Table / UI Helpers ───────────────────────────────────────────────────────

export interface SummaryCardData {
  id: string;
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
}

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
}
