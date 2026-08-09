'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, AlertTriangle, XCircle, DollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import ERPModal from '@/components/ui/ERPModal';
import { formatRp, formatDate } from '@/lib/format';
import {
  getInventoryStats,
  getLowStockItems,
  getStockHistory,
  recordStockIn,
  InventoryStats,
  LowStockItem,
  StockTransaction,
} from '@/services/inventory.service';
import { itemMasterService } from '@/services/itemmaster.service';
import type { ItemMaster } from '@/types';

export default function WarehousePage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [history, setHistory] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock In modal
  const [modal, setModal] = useState(false);
  const [preselectedItem, setPreselectedItem] = useState<LowStockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemOptions, setItemOptions] = useState<ItemMaster[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);
  const [qty, setQty] = useState<number | ''>('');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ls, h] = await Promise.all([
        getInventoryStats(),
        getLowStockItems(),
        getStockHistory({ perPage: 10 }),
      ]);
      setStats(s);
      setLowStock(ls);
      setHistory(h);
    } catch {
      toast.error('Gagal memuat data gudang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Item search
  useEffect(() => {
    if (!modal) return;
    const t = setTimeout(async () => {
      try {
        const res = await itemMasterService.list({ search: itemSearch || undefined, perPage: 20, isActive: true });
        setItemOptions(res.data);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, modal]);

  const openStockIn = (item?: LowStockItem) => {
    setPreselectedItem(item ?? null);
    setSelectedItem(null);
    setItemSearch('');
    setItemOptions([]);
    setQty('');
    setRefNo('');
    setNotes(item ? `Restock ${item.name}` : '');
    setShowDropdown(false);
    setModal(true);
  };

  const handleStockIn = async () => {
    if (!selectedItem && !preselectedItem) { toast.error('Pilih item'); return; }
    if (!qty || Number(qty) <= 0) { toast.error('Qty harus > 0'); return; }
    const itemId = selectedItem?.id ?? preselectedItem?.id;
    if (!itemId) return;
    setSaving(true);
    try {
      await recordStockIn({ itemMasterId: itemId, qty: Number(qty), refNo: refNo || undefined, notes: notes || undefined, source: 'Manual' });
      toast.success('Stock In berhasil');
      setModal(false);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const summaryCards = [
    { label: 'Total Item', value: stats ? stats.totalItems.toLocaleString('id-ID') : '—', sub: `${stats?.activeItems ?? 0} aktif`, icon: <Package size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
    { label: 'Nilai Stok', value: stats ? formatRp(stats.totalStockValue, true) : '—', sub: 'HPP × Stok', icon: <DollarSign size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Stok Menipis', value: stats ? stats.lowStockItems.toLocaleString('id-ID') : '—', sub: 'Di bawah minimum', icon: <AlertTriangle size={16} />, iconBg: stats && stats.lowStockItems > 0 ? 'bg-amber-50' : 'bg-muted', iconColor: stats && stats.lowStockItems > 0 ? 'text-amber-600' : 'text-muted-foreground' },
    { label: 'Habis', value: stats ? stats.outOfStockItems.toLocaleString('id-ID') : '—', sub: 'Stok = 0', icon: <XCircle size={16} />, iconBg: stats && stats.outOfStockItems > 0 ? 'bg-red-50' : 'bg-muted', iconColor: stats && stats.outOfStockItems > 0 ? 'text-red-500' : 'text-muted-foreground' },
  ];

  return (
    <AppLayout
      title="Warehouse"
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Warehouse' }]}
    >
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="erp-card shadow-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-500">{card.label}</p>
                <p className="text-2xl font-800 text-foreground font-tabular">{card.value}</p>
                <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Low Stock Alert ── */}
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-700 text-foreground flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Item Stok Menipis
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{lowStock.length} item di bawah stok minimum</p>
            </div>
            <button className="btn-primary flex items-center gap-1.5" onClick={() => openStockIn()}>
              <Plus size={13} /> Stock In Manual
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Memuat...</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 text-green-600">✓ Semua stok dalam kondisi aman</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Kode', 'Nama', 'Stok', 'Min Stok', 'Kekurangan', 'Aksi'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-amber-50/30 transition-colors">
                      <td className="erp-table-cell font-600 text-primary">{item.code}</td>
                      <td className="erp-table-cell font-500">
                        <p>{item.name}</p>
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </td>
                      <td className="erp-table-cell font-tabular font-700 text-amber-600">
                        {item.stock.toLocaleString('id-ID')} {item.uom}
                      </td>
                      <td className="erp-table-cell font-tabular text-muted-foreground">
                        {item.minStock.toLocaleString('id-ID')} {item.uom}
                      </td>
                      <td className="erp-table-cell font-tabular text-red-600 font-700">
                        −{item.shortage.toLocaleString('id-ID')}
                      </td>
                      <td className="erp-table-cell">
                        <button
                          className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 font-600"
                          onClick={() => openStockIn(item)}
                        >
                          Stock In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Transactions ── */}
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-700 text-foreground">Transaksi Stok Terkini</h3>
              <p className="text-xs text-muted-foreground mt-0.5">10 transaksi terakhir</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-[12px]" onClick={() => router.push('/stock-in')}>Semua Stock In</button>
              <button className="btn-secondary text-[12px]" onClick={() => router.push('/stock-out')}>Semua DO</button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Memuat...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi stok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal', 'Item', 'Tipe', 'Qty', 'Ref'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                      <td className="erp-table-cell">
                        <p className="font-500">{tx.itemName}</p>
                        <p className="text-xs text-muted-foreground">{tx.itemCode}</p>
                      </td>
                      <td className="erp-table-cell">
                        <span className={`inline-flex items-center text-[11px] font-600 px-2 py-0.5 rounded-full ${tx.type === 'StockIn' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {tx.type === 'StockIn' ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className={`erp-table-cell font-tabular font-700 ${tx.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.qty > 0 ? '+' : ''}{tx.qty.toLocaleString('id-ID')}
                      </td>
                      <td className="erp-table-cell text-muted-foreground">{tx.refNo ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Stock In Modal ── */}
      <ERPModal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Stock In Manual"
        subtitle={preselectedItem ? preselectedItem.name : undefined}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleStockIn} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Catat Stock In'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Show preselected item or search */}
          {preselectedItem ? (
            <div>
              <label className="erp-form-label">Item</label>
              <div className="erp-input bg-muted/30 text-[13px]">
                <span className="font-600 text-primary">{preselectedItem.code}</span>
                <span className="ml-2">{preselectedItem.name}</span>
                <span className="text-xs text-amber-600 ml-2">Stok: {preselectedItem.stock} {preselectedItem.uom}</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <label className="erp-form-label">Item <span className="text-red-500">*</span></label>
              {selectedItem ? (
                <div className="erp-input flex items-center justify-between">
                  <span><span className="font-600">{selectedItem.code}</span> {selectedItem.name}</span>
                  <button type="button" className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => { setSelectedItem(null); setItemSearch(''); }}>×</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="Cari item..."
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && itemOptions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {itemOptions.map((item) => (
                        <button key={item.id} type="button" className="w-full text-left px-3 py-2.5 hover:bg-muted text-[13px] border-b border-border last:border-0"
                          onClick={() => { setSelectedItem(item); setShowDropdown(false); }}>
                          <span className="font-600 text-primary">{item.code}</span>
                          <span className="ml-2">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">Stok: {item.stock} {item.uom}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="erp-form-label">Qty <span className="text-red-500">*</span></label>
            <input type="number" min={1} step="any" className="erp-input" placeholder="0"
              value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="erp-form-label">Nomor Referensi <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <input type="text" className="erp-input" placeholder="Nomor PO, GR, dll." value={refNo} onChange={(e) => setRefNo(e.target.value)} />
          </div>
          <div>
            <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <textarea className="erp-input resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </ERPModal>
    </AppLayout>
  );
}
