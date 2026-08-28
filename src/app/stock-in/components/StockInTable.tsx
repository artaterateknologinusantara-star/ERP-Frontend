'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getStockHistory,
  recordStockIn,
  StockTransaction,
} from '@/services/inventory.service';
import { itemMasterService } from '@/services/itemmaster.service';
import { formatDate } from '@/lib/format';
import ERPModal from '@/components/ui/ERPModal';
import TablePagination from '@/components/ui/TablePagination';
import type { ItemMaster } from '@/types';

const PER_PAGE = 20;

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PurchaseOrder: { cls: 'bg-blue-50 text-blue-700', label: 'Goods Receipt' },
    Manual:        { cls: 'bg-muted text-muted-foreground', label: 'Manual' },
    Return:        { cls: 'bg-green-50 text-green-700', label: 'Retur' },
  };
  const cfg = map[source] ?? { cls: 'bg-muted text-muted-foreground', label: source };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

interface Props {
  refreshKey?: number;
  onStockIn?: () => void;
}

export default function StockInTable({ refreshKey, onStockIn }: Props) {
  const [rows, setRows] = useState<StockTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage] = useState(PER_PAGE);

  // Stock In modal
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemOptions, setItemOptions] = useState<ItemMaster[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);
  const [qty, setQty] = useState<number | ''>('');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async (p: number, pp: number) => {
    setLoading(true);
    try {
      const res = await getStockHistory({ page: p, perPage: pp, type: 'StockIn' });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat history stock in');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, perPage); }, [page, perPage, load, refreshKey]);

  // Item search debounce
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

  const openModal = () => {
    setSelectedItem(null);
    setItemSearch('');
    setItemOptions([]);
    setQty('');
    setRefNo('');
    setNotes('');
    setShowDropdown(false);
    setModal(true);
  };

  const handleSave = async () => {
    if (!selectedItem) { toast.error('Pilih item terlebih dahulu'); return; }
    if (!qty || Number(qty) <= 0) { toast.error('Qty harus lebih dari 0'); return; }
    setSaving(true);
    try {
      await recordStockIn({
        itemMasterId: selectedItem.id,
        qty: Number(qty),
        refNo: refNo.trim() || undefined,
        notes: notes.trim() || undefined,
        source: 'Manual',
      });
      toast.success('Stock In berhasil dicatat');
      setModal(false);
      load(1, perPage);
      setPage(1);
      onStockIn?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat Stock In');
    } finally {
      setSaving(false);
    }
  };

  const stockInRows = rows;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <>
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-700 text-foreground">Riwayat Stock In</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} transaksi masuk</p>
          </div>
          <button className="btn-primary flex items-center gap-1.5" onClick={openModal}>
            <Plus size={14} /> Stock In Manual
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Tanggal', 'Item', 'Tipe Sumber', 'Qty', 'Stok Sebelum', 'Stok Sesudah', 'Ref', 'Catatan', 'Dicatat Oleh'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : stockInRows.length === 0 ? (
                <tr><td colSpan={9} className="erp-table-cell text-center py-8 text-muted-foreground">Belum ada transaksi stock in.</td></tr>
              ) : stockInRows.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="erp-table-cell">
                    <p className="font-600">{row.itemName}</p>
                    <p className="text-xs text-muted-foreground">{row.itemCode}</p>
                  </td>
                  <td className="erp-table-cell"><SourceBadge source={row.source} /></td>
                  <td className="erp-table-cell font-tabular font-700 text-green-600">
                    +{row.qty.toLocaleString('id-ID')}
                  </td>
                  <td className="erp-table-cell font-tabular text-right text-muted-foreground">
                    {row.stockBefore.toLocaleString('id-ID')}
                  </td>
                  <td className="erp-table-cell font-tabular text-right font-600">
                    {row.stockAfter.toLocaleString('id-ID')}
                  </td>
                  <td className="erp-table-cell text-muted-foreground">{row.refNo ?? '—'}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[150px] truncate">{row.notes ?? '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          perPage={perPage}
          onPageChange={setPage}
        />
      </div>

      {/* Stock In Manual Modal */}
      <ERPModal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Stock In Manual"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Catat Stock In'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Item search */}
          <div className="relative">
            <label className="erp-form-label">Item <span className="text-red-500">*</span></label>
            {selectedItem ? (
              <div className="erp-input flex items-center justify-between">
                <div>
                  <span className="font-600">{selectedItem.code}</span>
                  <span className="text-muted-foreground ml-2">{selectedItem.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">Stok: {selectedItem.stock} {selectedItem.uom}</span>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground ml-2"
                  onClick={() => { setSelectedItem(null); setItemSearch(''); }}
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="Cari kode atau nama item..."
                  value={itemSearch}
                  onChange={(e) => { setItemSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && itemOptions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {itemOptions.map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors text-[13px] border-b border-border last:border-0"
                        onClick={() => {
                          setSelectedItem(item);
                          setItemSearch('');
                          setShowDropdown(false);
                        }}
                      >
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

          {/* Qty */}
          <div>
            <label className="erp-form-label">Qty <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              step="any"
              className="erp-input"
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>

          {/* Ref No */}
          <div>
            <label className="erp-form-label">Nomor Referensi <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <input
              type="text"
              className="erp-input"
              placeholder="Nomor PO, GR, dll."
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              placeholder="Keterangan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </ERPModal>
    </>
  );
}
