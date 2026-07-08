'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import RowActionMenu from '@/components/ui/RowActionMenu';
import ERPModal from '@/components/ui/ERPModal';
import TableToolbar from '@/components/ui/TableToolbar';
import {
  getExpenseCategoryList,
  createExpenseCategory,
  updateExpenseCategory,
  ExpenseCategory,
  CreateExpenseCategoryRequest,
} from '@/services/expenseCategory.service';
import { getFlatAccounts, Account } from '@/services/account.service';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
];

const EMPTY_FORM: CreateExpenseCategoryRequest = { code: '', name: '', description: '', accountId: '' };

export default function ExpenseCategoryTable() {
  const [items, setItems] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<CreateExpenseCategoryRequest>(EMPTY_FORM);
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (st: string) => {
    setLoading(true);
    try {
      const isActive = st === 'Aktif' ? true : st === 'Tidak Aktif' ? false : undefined;
      const data = await getExpenseCategoryList(isActive);
      setItems(data);
    } catch {
      toast.error('Gagal memuat data Kategori Pengeluaran');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(statusFilter); }, [statusFilter, load]);

  useEffect(() => {
    getFlatAccounts()
      .then((all) => setAccounts(all.filter((a) => a.type === 'Expense')))
      .catch(() => toast.error('Gagal memuat daftar akun'));
  }, []);

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(EMPTY_FORM); setFormIsActive(true); setModal('create'); };
  const openEdit = (item: ExpenseCategory) => {
    setSelected(item);
    setForm({ code: item.code, name: item.name, description: item.description ?? '', accountId: item.accountId });
    setFormIsActive(item.isActive);
    setModal('edit');
  };
  const openDetail = (item: ExpenseCategory) => { setSelected(item); setModal('detail'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama kategori wajib diisi'); return; }
    if (!form.accountId) { toast.error('Akun wajib dipilih'); return; }
    if (modal === 'create' && !form.code.trim()) { toast.error('Kode kategori wajib diisi'); return; }

    setSaving(true);
    try {
      if (modal === 'create') {
        await createExpenseCategory(form);
        toast.success('Kategori Pengeluaran berhasil ditambahkan');
      } else if (modal === 'edit' && selected) {
        await updateExpenseCategory(selected.id, {
          name: form.name,
          description: form.description,
          accountId: form.accountId,
          isActive: formIsActive,
        });
        toast.success('Kategori Pengeluaran berhasil diperbarui');
      }
      closeModal();
      load(statusFilter);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan Kategori Pengeluaran');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: ExpenseCategory) => {
    try {
      await updateExpenseCategory(item.id, {
        name: item.name,
        description: item.description,
        accountId: item.accountId,
        isActive: !item.isActive,
      });
      toast.success(`Kategori ${item.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      load(statusFilter);
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Cari kode atau nama kategori..."
        totalCount={filtered.length}
        countLabel="kategori"
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        actions={
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Kategori</button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Kategori', 'Akun COA', 'Status'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="erp-table-cell text-center py-8 text-muted-foreground">
                {search ? `Tidak ada kategori untuk "${search}".` : 'Belum ada Kategori Pengeluaran.'}
              </td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                <td className="erp-table-cell font-500">{row.name}</td>
                <td className="erp-table-cell text-muted-foreground">{row.accountCode} — {row.accountName}</td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${row.isActive ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {row.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="erp-table-cell erp-action-col">
                  <RowActionMenu items={[
                    { icon: <Eye size={13} />, label: 'Detail', onClick: () => openDetail(row) },
                    { icon: <Edit2 size={13} />, label: 'Edit', onClick: () => openEdit(row) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <ERPModal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Tambah Kategori Pengeluaran' : 'Edit Kategori Pengeluaran'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="erp-form-label">Kode<span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="text"
              className="erp-input disabled:bg-muted/50 disabled:cursor-not-allowed"
              value={form.code}
              disabled={modal === 'edit'}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Misal: RENT"
            />
            {modal === 'edit' && <p className="text-xs text-muted-foreground mt-1">Kode tidak dapat diubah setelah dibuat.</p>}
          </div>
          <div>
            <label className="erp-form-label">Nama Kategori<span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="text"
              className="erp-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Misal: Office Rent"
            />
          </div>
          <div>
            <label className="erp-form-label">Akun COA<span className="text-red-500 ml-0.5">*</span></label>
            <select
              className="erp-input"
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">— Pilih Akun —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="erp-form-label">Deskripsi <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {modal === 'edit' && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-500">Status Aktif</span>
              <button
                type="button"
                className={`text-xs px-3 py-1.5 rounded-md font-600 transition-colors ${formIsActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                onClick={() => setFormIsActive((v) => !v)}
              >
                {formIsActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          )}
        </div>
      </ERPModal>

      {/* Detail Modal */}
      <ERPModal isOpen={modal === 'detail'} onClose={closeModal} title="Detail Kategori Pengeluaran" size="sm"
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
                ['Akun COA', `${selected.accountCode} — ${selected.accountName}`],
              ].map(([label, val]) => (
                <div key={label} className="col-span-2">
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
    </div>
  );
}
