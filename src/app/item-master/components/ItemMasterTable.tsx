'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Download, Plus, Eye, Edit2, Trash2, AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { toast } from 'sonner';
import { itemMasterService, CreateItemMasterDto } from '@/services/itemmaster.service';
import { downloadCsv } from '@/lib/export';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import CurrencyInput from '@/components/ui/CurrencyInput';
import type { ItemMaster } from '@/types';
import { formatRp } from '@/lib/format';
import { computeAutoSellingPrice, computeFloorPrice, marginWarningText, isBelowMinimumMargin, type ItemMarginType } from '@/lib/itemMargin';

const PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
];

const EMPTY_FORM: CreateItemMasterDto = {
  name: '', description: '', category: '', brand: '', uom: '', warehouse: '', stock: 0, minStock: 0, sellingPrice: 0, purchasePrice: undefined,
  marginType: 'percent', marginDefault: undefined, marginMinimum: undefined, isSellingPriceManual: false,
};

export default function ItemMasterTable() {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [belowMinMarginOnly, setBelowMinMarginOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<ItemMaster | null>(null);
  const [form, setForm] = useState<CreateItemMasterDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItemMaster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkMarginConfirm, setBulkMarginConfirm] = useState(false);
  const [bulkMarginRunning, setBulkMarginRunning] = useState(false);

  const load = useCallback(async (q: string, p: number, pp: number, st: string, belowMin: boolean) => {
    setLoading(true);
    try {
      const isActive = st === 'Aktif' ? true : st === 'Tidak Aktif' ? false : undefined;
      const res = await itemMasterService.list({ page: p, perPage: pp, search: q || undefined, isActive, belowMinimumMargin: belowMin || undefined });
      setItems(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat data item master');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, page, perPage, statusFilter, belowMinMarginOnly), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, page, perPage, statusFilter, belowMinMarginOnly, load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (item: ItemMaster) => {
    setSelected(item);
    setForm({
      name: item.name, description: item.description || '', category: item.category || '', brand: item.brand || '', uom: item.uom, warehouse: item.warehouse || '', stock: item.stock, minStock: item.minStock,
      sellingPrice: item.sellingPrice, purchasePrice: item.purchasePrice,
      marginType: item.marginType ?? 'percent', marginDefault: item.marginDefault, marginMinimum: item.marginMinimum, isSellingPriceManual: item.isSellingPriceManual,
    });
    setModal('edit');
  };
  const openDetail = (item: ItemMaster) => { setSelected(item); setModal('detail'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama item wajib diisi'); return; }
    if (!form.uom.trim()) { toast.error('Satuan (UoM) wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await itemMasterService.create(form);
        toast.success('Item berhasil ditambahkan');
      } else if (modal === 'edit' && selected) {
        await itemMasterService.update(selected.id, form);
        toast.success('Item berhasil diperbarui');
      }
      closeModal();
      load(search, page, perPage, statusFilter, belowMinMarginOnly);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan item');
    } finally {
      setSaving(false);
    }
  };

  const applyAutoMarginToForm = () => {
    const auto = computeAutoSellingPrice(form.purchasePrice, form.marginType, form.marginDefault);
    if (auto == null) { toast.error('Harga beli atau margin belum diisi'); return; }
    setForm((f) => ({ ...f, sellingPrice: Math.round(auto * 100) / 100, isSellingPriceManual: false }));
  };

  const handleBulkApplyMargin = async () => {
    setBulkMarginRunning(true);
    try {
      const isActive = statusFilter === 'Aktif' ? true : statusFilter === 'Tidak Aktif' ? false : undefined;
      const res = await itemMasterService.bulkApplyMargin({ search: search || undefined, isActive });
      toast.success(`${res.updated} item diperbarui, ${res.skipped} dilewati (sudah manual/menunggu harga beli).`);
      setBulkMarginConfirm(false);
      load(search, page, perPage, statusFilter, belowMinMarginOnly);
    } catch {
      toast.error('Gagal menjalankan margin otomatis massal');
    } finally {
      setBulkMarginRunning(false);
    }
  };

  const handleToggleStatus = async (item: ItemMaster) => {
    try {
      await itemMasterService.setStatus(item.id, !item.isActive);
      toast.success(`Item ${item.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      load(search, page, perPage, statusFilter, belowMinMarginOnly);
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleExport = async () => {
    try {
      const res = await itemMasterService.list({ page: 1, perPage: 9999 });
      const data = res.data;
      const headers = ['Kode', 'Nama Item', 'Deskripsi', 'Kategori', 'Brand', 'Satuan', 'Stok', 'Min Stok', 'Harga Jual', 'Harga Beli', 'Gudang', 'Status'];
      const rows = data.map((i) => [i.code, i.name, i.description || '', i.category || '', i.brand || '', i.uom, i.stock, i.minStock, i.sellingPrice, i.purchasePrice ?? '', i.warehouse || '', i.isActive ? 'Aktif' : 'Nonaktif']);
      downloadCsv(`item_master_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      toast.success(`${data.length} item berhasil diekspor`);
    } catch {
      toast.error('Gagal mengekspor data item master');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await itemMasterService.delete(deleteTarget.id);
      toast.success('Item berhasil dihapus');
      setDeleteTarget(null);
      load(search, page, perPage, statusFilter, belowMinMarginOnly);
    } catch {
      toast.error('Gagal menghapus item');
    } finally {
      setDeleting(false);
    }
  };

  const numField = (label: string, key: 'stock' | 'minStock', optional = false) => (
    <div>
      <label className="erp-form-label">
        {label}
        {optional && <span className="text-xs text-muted-foreground ml-1">(opsional)</span>}
      </label>
      <input
        type="number"
        min={0}
        className="erp-input"
        value={form[key] ?? ''}
        placeholder={optional ? 'Kosongkan jika belum diketahui' : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          const v = parseFloat(raw);
          setForm((f) => ({ ...f, [key]: optional && (raw === '' || isNaN(v)) ? undefined : (v || 0) }));
        }}
      />
    </div>
  );

  const moneyField = (label: string, key: 'sellingPrice' | 'purchasePrice', optional = false) => (
    <div>
      <label className="erp-form-label">
        {label}
        {optional && <span className="text-xs text-muted-foreground ml-1">(opsional)</span>}
      </label>
      <CurrencyInput
        value={form[key] ?? 0}
        placeholder={optional ? 'Kosongkan jika belum diketahui' : undefined}
        onChange={(v) => setForm((f) => ({ ...f, [key]: optional && !v ? undefined : v }))}
      />
    </div>
  );

  const marginNumberField = (label: string, key: 'marginDefault' | 'marginMinimum') => (
    <div>
      <label className="erp-form-label">{label}</label>
      <input
        type="number"
        min={0}
        step="0.01"
        className="erp-input"
        value={form[key] ?? ''}
        placeholder={form.marginType === 'percent' ? '%' : 'Rp'}
        onChange={(e) => {
          const raw = e.target.value;
          const v = parseFloat(raw);
          setForm((f) => ({ ...f, [key]: raw === '' || isNaN(v) ? undefined : v }));
        }}
      />
    </div>
  );

  const sellingPriceField = () => {
    const floorWarning = marginWarningText(form.purchasePrice, form.marginType, form.marginMinimum, form.sellingPrice ?? 0);
    return (
      <div className="md:col-span-2">
        <label className="erp-form-label">Harga Jual (Rp)</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CurrencyInput
              value={form.sellingPrice ?? 0}
              onChange={(v) => setForm((f) => ({ ...f, sellingPrice: v, isSellingPriceManual: true }))}
            />
          </div>
          <button type="button" className="btn-secondary whitespace-nowrap" onClick={applyAutoMarginToForm} title="Hitung harga jual dari margin">
            <Sparkles size={13} /> Set Margin Otomatis
          </button>
          {form.isSellingPriceManual && (
            <button type="button" className="btn-secondary whitespace-nowrap" onClick={applyAutoMarginToForm} title="Kembali ke harga otomatis dari margin">
              <RotateCcw size={13} /> Reset ke Otomatis
            </button>
          )}
        </div>
        {form.isSellingPriceManual && (
          <p className="text-xs text-muted-foreground mt-1">Harga jual ini diedit manual — tidak lagi mengikuti perubahan harga beli.</p>
        )}
        {floorWarning && <p className="text-xs text-red-600 mt-1">{floorWarning}</p>}
      </div>
    );
  };

  const marginBadge = (item: ItemMaster) => {
    if (!item.marginType || item.marginDefault == null) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 bg-muted text-muted-foreground">Margin belum diatur</span>;
    }
    if (item.purchasePrice == null) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 bg-amber-50 text-amber-700">Menunggu harga beli</span>;
    }
    const belowMin = isBelowMinimumMargin(item.sellingPrice, computeFloorPrice(item.purchasePrice, item.marginType, item.marginMinimum));
    if (belowMin) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 bg-red-50 text-red-600" title={marginWarningText(item.purchasePrice, item.marginType, item.marginMinimum, item.sellingPrice) ?? undefined}>Di bawah minimum</span>;
    }
    return <span className="text-muted-foreground text-xs">{item.marginType === 'percent' ? `${item.marginDefault}%` : formatRp(item.marginDefault)}</span>;
  };

  const txtField = (label: string, key: keyof CreateItemMasterDto, required = false) => (
    <div>
      <label className="erp-form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type="text"
        className="erp-input"
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <>
      <div className="erp-card shadow-card">
        <TableToolbar
          search={search}
          onSearch={handleSearch}
          searchPlaceholder="Cari kode, nama item, kategori, brand..."
          totalCount={total}
          countLabel="item"
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
          statusOptions={STATUS_OPTIONS}
          onExport={handleExport}
          actions={
            <>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                <input type="checkbox" checked={belowMinMarginOnly} onChange={(e) => { setBelowMinMarginOnly(e.target.checked); setPage(1); }} />
                Margin di bawah minimum
              </label>
              <button className="btn-secondary" onClick={() => setBulkMarginConfirm(true)}>
                <Sparkles size={14} /> Set Margin Otomatis (Massal)
              </button>
              <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Item</button>
            </>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Kode', 'Nama Item', 'Kategori', 'Brand', 'UoM', 'Stok', 'Min Stok', 'Harga Jual', 'Harga Beli', 'Margin', 'Gudang', 'Status'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
                <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={13} className="erp-table-cell text-center py-8 text-muted-foreground">
                  {search ? `Tidak ada item untuk "${search}".` : 'Belum ada data item master.'}
                </td></tr>
              ) : items.map((row) => {
                const isLow = row.stock <= row.minStock;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer ${isLow ? 'bg-amber-50/30' : ''}`}
                    onClick={() => openDetail(row)}
                  >
                    <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                    <td className="erp-table-cell font-500 max-w-[180px]">
                      <div className="flex items-center gap-1.5 truncate" title={row.name}>
                        {isLow && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
                        <span className="truncate">{row.name}</span>
                      </div>
                    </td>
                    <td className="erp-table-cell text-muted-foreground">{row.category ?? '—'}</td>
                    <td className="erp-table-cell text-muted-foreground">{row.brand ?? '—'}</td>
                    <td className="erp-table-cell text-muted-foreground">{row.uom}</td>
                    <td className={`erp-table-cell font-700 font-tabular text-right ${isLow ? 'text-amber-600' : ''}`}>
                      {row.stock.toLocaleString('id-ID')}
                    </td>
                    <td className="erp-table-cell font-tabular text-right text-muted-foreground">{row.minStock.toLocaleString('id-ID')}</td>
                    <td className="erp-table-cell font-tabular text-right">{formatRp(row.sellingPrice)}</td>
                    <td className="erp-table-cell font-tabular text-right text-muted-foreground">{row.purchasePrice != null ? formatRp(row.purchasePrice) : '—'}</td>
                    <td className="erp-table-cell">{marginBadge(row)}</td>
                    <td className="erp-table-cell text-muted-foreground">{row.warehouse ?? '—'}</td>
                    <td className="erp-table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${row.isActive ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {row.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu items={[
                        { icon: <Eye size={13} />,   label: 'Detail Item', onClick: () => openDetail(row) },
                        { icon: <Edit2 size={13} />, label: 'Edit Item',   onClick: () => openEdit(row) },
                        { icon: <Trash2 size={13} />, label: 'Hapus Item', onClick: () => setDeleteTarget(row), danger: true, separator: true },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination page={page} totalPages={totalPages} totalCount={total} perPage={perPage} onPageChange={setPage} onPerPageChange={handlePerPageChange} />
      </div>

      {/* Create / Edit Modal */}
      <ERPModal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Tambah Item Master' : 'Edit Item Master'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {txtField('Nama Item', 'name', true)}
          {txtField('Kategori', 'category')}
          {txtField('Brand / Merek', 'brand')}
          {txtField('Satuan (UoM)', 'uom', true)}
          {txtField('Gudang', 'warehouse')}
          {numField('Stok Awal', 'stock')}
          {numField('Stok Minimum', 'minStock')}
          {moneyField('Harga Beli (Rp)', 'purchasePrice', true)}
          <div>
            <label className="erp-form-label">Tipe Margin</label>
            <select
              className="erp-input"
              value={form.marginType ?? 'percent'}
              onChange={(e) => setForm((f) => ({ ...f, marginType: e.target.value as ItemMarginType }))}
            >
              <option value="percent">Persen (%)</option>
              <option value="nominal">Nominal (Rp)</option>
            </select>
          </div>
          {marginNumberField('Margin Default', 'marginDefault')}
          {marginNumberField('Margin Minimum', 'marginMinimum')}
          {form.marginDefault != null && form.marginMinimum != null && form.marginMinimum > form.marginDefault && (
            <div className="md:col-span-2 text-xs text-amber-600">
              Margin minimum lebih besar dari margin default — periksa kembali pengaturan margin item ini.
            </div>
          )}
          {sellingPriceField()}
          <div className="md:col-span-2">
            <label className="erp-form-label">Deskripsi</label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </ERPModal>

      {/* Detail Modal */}
      <ERPModal isOpen={modal === 'detail'} onClose={closeModal} title="Detail Item" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal}>Tutup</button>
            <button className="btn-primary" onClick={() => { closeModal(); if (selected) openEdit(selected); }}>Edit</button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3 text-[13px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                ['Kode', selected.code], ['Nama', selected.name],
                ['Kategori', selected.category || '—'], ['Brand', selected.brand || '—'],
                ['Satuan', selected.uom], ['Gudang', selected.warehouse || '—'],
                ['Stok', selected.stock.toLocaleString('id-ID')],
                ['Min Stok', selected.minStock.toLocaleString('id-ID')],
                ['Harga Jual', formatRp(selected.sellingPrice)],
                ['Harga Beli', selected.purchasePrice != null ? formatRp(selected.purchasePrice) : '—'],
                ['Harga Beli Terakhir', selected.lastPurchasePrice != null ? formatRp(selected.lastPurchasePrice) : '—'],
                ['Tipe Margin', selected.marginType ? (selected.marginType === 'percent' ? 'Persen' : 'Nominal') : '—'],
                ['Margin Default', selected.marginDefault != null ? (selected.marginType === 'percent' ? `${selected.marginDefault}%` : formatRp(selected.marginDefault)) : '—'],
                ['Margin Minimum', selected.marginMinimum != null ? (selected.marginType === 'percent' ? `${selected.marginMinimum}%` : formatRp(selected.marginMinimum)) : '—'],
                ['Mode Harga Jual', selected.isSellingPriceManual ? 'Manual' : 'Otomatis'],
                ['Preferred Vendor', selected.preferredVendorName ?? '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-500 text-foreground">{val}</p>
                </div>
              ))}
            </div>
            <div>{marginBadge(selected)}</div>
            {selected.description && (
              <div>
                <p className="text-xs text-muted-foreground">Deskripsi</p>
                <p className="font-500">{selected.description}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${selected.isActive ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {selected.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
              <button
                className={`text-xs px-3 py-1.5 rounded-md font-600 transition-colors ${selected.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                onClick={() => { handleToggleStatus(selected); closeModal(); }}
              >
                {selected.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          </div>
        )}
      </ERPModal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Item?"
        description={`Item "${deleteTarget?.name}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={bulkMarginConfirm}
        onClose={() => setBulkMarginConfirm(false)}
        onConfirm={handleBulkApplyMargin}
        title="Set Margin Otomatis Massal?"
        description="Harga jual akan dihitung ulang dari margin untuk semua item pada daftar (sesuai filter aktif) yang belum diedit manual. Item dengan harga jual manual akan dilewati."
        confirmLabel="Terapkan"
        variant="default"
        loading={bulkMarginRunning}
      />
    </>
  );
}
