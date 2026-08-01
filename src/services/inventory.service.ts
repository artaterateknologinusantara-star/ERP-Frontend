import { api } from '@/lib/api';

// ── Helper ──────────────────────────────────────────────────────────────────

function buildPath(base: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return base;
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
  pendingDOs: number;
  activeDOs: number;
}

export interface LowStockItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  stock: number;
  minStock: number;
  uom: string;
  shortage: number;
}

export interface StockTransaction {
  id: string;
  itemCode: string;
  itemName: string;
  type: string;
  source: string;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  refNo?: string;
  notes?: string;
  createdByName: string;
  createdAt: string;
}

export interface DeliveryOrderListItem {
  id: string;
  no: string;
  salesOrderNo?: string;
  customerName?: string;
  deliveryDate: string;
  deliveryAddress?: string;
  status: string;
  itemCount: number;
  createdByName: string;
  createdAt: string;
}

export interface DeliveryOrderItem {
  id: string;
  itemMasterId: string;
  itemName: string;
  sku?: string;
  qty: number;
  uom: string;
  qtyOrdered: number;
  qtyPreviouslyOut: number;
  currentStock: number;
  notes?: string;
}

export interface DeliveryOrderDetail extends DeliveryOrderListItem {
  salesOrderId?: string;
  customerId?: string;
  recipientName?: string;
  notes?: string;
  items: DeliveryOrderItem[];
}

export interface CreateDOItemRequest {
  itemMasterId: string;
  qty: number;
  uom: string;
  notes?: string;
  sortOrder?: number;
}

export interface CreateDORequest {
  salesOrderId?: string;
  customerId?: string;
  deliveryDate: string;
  deliveryAddress?: string;
  recipientName?: string;
  notes?: string;
  items: CreateDOItemRequest[];
}

export interface RecordStockInRequest {
  itemMasterId: string;
  qty: number;
  refNo?: string;
  refId?: string;
  notes?: string;
  source?: string;
}

// ── Functions ────────────────────────────────────────────────────────────────

export async function getInventoryStats(): Promise<InventoryStats> {
  const res = await api.get<InventoryStats>('/inventory/stats');
  return res.data!;
}

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const res = await api.get<LowStockItem[]>('/inventory/low-stock');
  return res.data ?? [];
}

export async function getStockHistory(params?: {
  itemMasterId?: string;
  page?: number;
  perPage?: number;
}): Promise<StockTransaction[]> {
  const path = buildPath('/inventory/stock-history', params as Record<string, string | number | undefined>);
  const res = await api.get<StockTransaction[]>(path);
  return res.data ?? [];
}

export async function recordStockIn(data: RecordStockInRequest): Promise<StockTransaction> {
  const res = await api.post<StockTransaction>('/inventory/stock-in', data);
  return res.data!;
}

export async function getDeliveryOrders(params?: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
}): Promise<DeliveryOrderListItem[]> {
  const path = buildPath('/inventory/delivery-orders', params as Record<string, string | number | undefined>);
  const res = await api.get<DeliveryOrderListItem[]>(path);
  return res.data ?? [];
}

export async function getDeliveryOrderDetail(id: string): Promise<DeliveryOrderDetail> {
  const res = await api.get<DeliveryOrderDetail>(`/inventory/delivery-orders/${id}`);
  return res.data!;
}

export async function createDeliveryOrder(data: CreateDORequest): Promise<DeliveryOrderDetail> {
  const res = await api.post<DeliveryOrderDetail>('/inventory/delivery-orders', data);
  return res.data!;
}

export async function confirmDeliveryOrder(id: string): Promise<DeliveryOrderDetail> {
  const res = await api.post<DeliveryOrderDetail>(`/inventory/delivery-orders/${id}/confirm`, {});
  return res.data!;
}

export async function markDODelivered(id: string): Promise<DeliveryOrderDetail> {
  const res = await api.post<DeliveryOrderDetail>(`/inventory/delivery-orders/${id}/delivered`, {});
  return res.data!;
}

export async function deleteDeliveryOrder(id: string): Promise<void> {
  await api.delete(`/inventory/delivery-orders/${id}`);
}

export async function createDOFromSO(soId: string): Promise<DeliveryOrderDetail> {
  const res = await api.post<DeliveryOrderDetail>(
    `/inventory/delivery-orders/from-so/${soId}`,
    {}
  );
  return res.data!;
}
