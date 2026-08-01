'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Download, Plus, Eye, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { toast } from 'sonner';
import { itemMasterService, CreateItemMasterDto } from '@/services/itemmaster.service';
import { downloadCsv } from '@/lib/export';
import ERPModal from '@/components/ui/ERPModal';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import CurrencyInput from '@/components/ui/CurrencyInput';
import type { ItemMaster } from '@/types';
import { formatRp } from '@/lib/format';

const PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
];

const EMPTY_FORM: CreateItemMasterDto = {
  name: '', description: '', category: '', brand: '', uom: '', warehouse: '', stock: 0, minStock: 0, sellingPrice: 0, purchasePrice: undefined,
};

export default function ItemMasterTable() {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<ItemMaster | null>(null);
  const [form, setForm] = useState<CreateItemMasterDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q: string, p: number, pp: number, st: string) => {
    setLoading(true);
    try {
      const isActive = st === 'Aktif' ? true : st === 'Tidak Aktif' ? false : undefined;
      const res = await itemMasterService.list({ page: p, perPage: pp, search: q || undefined, isActive });
      setItems(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat data item master');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, page, perPage, statusFilter), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, page, perPage, statusFilter, load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (item: ItemMaster) => {
    setSelected(item);
    setForm({ name: item.name, description: item.description || '', category: item.category || '', brand: item.brand || '', uom: item.uom, warehouse: item.warehouse || '', stock: item.stock, minStock: item.minStock, sellingPrice: item.sellingPrice, purchasePrice: item.purchasePrice });
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
      load(search, page, perPage, statusFilter);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan item');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: ItemMaster) => {
    try {
      await itemMasterService.setStatus(item.id, !item.isActive);
      toast.success(`Item ${item.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      load(search, page, perPage, statusFilter);
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

  const handleDelete = async (item: ItemMaster) => {
    if (!confirm(`Hapus item "${item.name}"?`)) return;
    try {
      await itemMasterService.delete(item.id);
      toast.success('Item berhasil dihapus');
      load(search, page, perPage, statusFilter);
    } catch {
      toast.error('Gagal menghapus item');
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
            <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Item</button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Kode', 'Nama Item', 'Kategori', 'Brand', 'UoM', 'Stok', 'Min Stok', 'Harga Jual', 'Harga Beli', 'Gudang', 'Status'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
                <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={12} className="erp-table-cell text-center py-8 text-muted-foreground">
                  {search ? `Tidak ada item untuk "${search}".` : 'Belum ada data item master.'}
                </td></tr>
              ) : items.map((row) => {
                const isLow = row.stock <= row.minStock;
                return (
                  <tr key={row.id} className={`border-b border-border hover:bg-primary/5 transition-colors group ${isLow ? 'bg-amber-50/30' : ''}`}>
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
                    <td className="erp-table-cell text-muted-foreground">{row.warehouse ?? '—'}</td>
                    <td className="erp-table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${row.isActive ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {row.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="erp-table-cell erp-action-col">
                      <RowActionMenu items={[
                        { icon: <Eye size={13} />,   label: 'Detail Item', onClick: () => openDetail(row) },
                        { icon: <Edit2 size={13} />, label: 'Edit Item',   onClick: () => openEdit(row) },
                        { icon: <Trash2 size={13} />, label: 'Hapus Item', onClick: () => handleDelete(row), danger: true, separator: true },
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
          {moneyField('Harga Jual (Rp)', 'sellingPrice')}
          {moneyField('Harga Beli (Rp)', 'purchasePrice', true)}
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
                ['Preferred Vendor', selected.preferredVendorName ?? '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-500 text-foreground">{val}</p>
                </div>
              ))}
            </div>
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
    </>
  );
}
