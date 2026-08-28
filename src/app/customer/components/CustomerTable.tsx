'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ActiveStatus } from '@/types';
import { customerService, CreateCustomerDto } from '@/services/customer.service';
import { downloadCsv } from '@/lib/export';
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';

interface CustomerRow {
  id: string;
  code: string;
  name: string;
  industry?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  npwp?: string;
  isActive: boolean;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
];

const PER_PAGE = 10;
const CUSTOMERS_QUERY_KEY = 'customers';

const EMPTY_FORM: CreateCustomerDto = {
  name: '', industry: '', contactPerson: '', phone: '', email: '', address: '', city: '', npwp: '',
};

export default function CustomerTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CreateCustomerDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Customer count is server-filtered correctly already (CustomerParams.IsActive), just needed the
  // react-query wrap -- not useTableFilter, customer count isn't bounded and PaginationParams
  // clamps perPage at 100.
  const { data, isLoading } = useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, { page, perPage, search, statusFilter }],
    queryFn: () => {
      const isActive = statusFilter === 'Aktif' ? true : statusFilter === 'Tidak Aktif' ? false : undefined;
      return customerService.list({ page, perPage, search: search || undefined, isActive });
    },
    placeholderData: keepPreviousData,
  });

  const rows = (data?.data ?? []) as unknown as CustomerRow[];
  const total = data?.total ?? 0;
  const loading = isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (row: CustomerRow) => {
    setSelected(row);
    setForm({ name: row.name, industry: row.industry || '', contactPerson: row.contactPerson || '', phone: row.phone || '', email: row.email || '', address: row.address || '', city: row.city || '', npwp: row.npwp || '' });
    setModal('edit');
  };
  const openDetail = (row: CustomerRow) => { setSelected(row); setModal('detail'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama customer wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await customerService.create(form);
        toast.success('Customer berhasil ditambahkan');
      } else if (modal === 'edit' && selected) {
        await customerService.update(selected.id, form);
        toast.success('Customer berhasil diperbarui');
      }
      closeModal();
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan customer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row: CustomerRow) => {
    try {
      await customerService.setStatus(row.id, !row.isActive);
      toast.success(`Customer ${row.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      invalidate();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const handleExport = async () => {
    try {
      const res = await customerService.list({ page: 1, perPage: 9999 });
      const data = res.data as unknown as CustomerRow[];
      const headers = ['Kode', 'Nama Customer', 'Industri', 'Contact Person', 'Telepon', 'Email', 'Kota', 'NPWP', 'Alamat', 'Status'];
      const rows = data.map((c) => [c.code, c.name, c.industry || '', c.contactPerson || '', c.phone || '', c.email || '', c.city || '', c.npwp || '', c.address || '', c.isActive ? 'Aktif' : 'Tidak Aktif']);
      downloadCsv(`customer_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      toast.success(`${data.length} customer berhasil diekspor`);
    } catch {
      toast.error('Gagal mengekspor data customer');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customerService.delete(deleteTarget.id);
      toast.success('Customer berhasil dihapus');
      setDeleteTarget(null);
      invalidate();
    } catch {
      toast.error('Gagal menghapus customer');
    } finally {
      setDeleting(false);
    }
  };

  const field = (label: string, key: keyof CreateCustomerDto, type = 'text', required = false) => (
    <div>
      <label className="erp-form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        className="erp-input"
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <>
      <div className="erp-card">
        <TableToolbar
          search={searchInput}
          onSearch={handleSearch}
          searchPlaceholder="Cari nama, kode, kota customer..."
          totalCount={total}
          countLabel="customer"
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
          statusOptions={STATUS_OPTIONS}
          onExport={handleExport}
          actions={
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={14} /> Tambah Customer
            </button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Kode', 'Nama Customer', 'Industri', 'Contact', 'Telepon', 'Kota', 'Status'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
                <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada customer ditemukan</td></tr>
              ) : rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => openDetail(row)}
                >
                  <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                  <td className="erp-table-cell font-600 max-w-[180px] truncate" title={row.name}>{row.name}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.industry || '—'}</td>
                  <td className="erp-table-cell">{row.contactPerson || '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.phone || '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.city || '—'}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={(row.isActive ? 'Aktif' : 'Tidak Aktif') as ActiveStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,    label: 'Detail Customer', onClick: () => openDetail(row) },
                      { icon: <Edit2 size={13} />,  label: 'Edit Customer',   onClick: () => openEdit(row) },
                      { icon: <Trash2 size={13} />, label: 'Hapus Customer',  onClick: () => setDeleteTarget(row), danger: true, separator: true },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination page={page} totalPages={totalPages} totalCount={total} perPage={perPage} onPageChange={setPage} onPerPageChange={handlePerPageChange} />
      </div>

      {/* Create / Edit Modal */}
      <ERPModal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'create' ? 'Tambah Customer' : 'Edit Customer'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Nama Customer', 'name', 'text', true)}
          {field('Industri', 'industry')}
          {field('Contact Person', 'contactPerson')}
          {field('Telepon', 'phone')}
          {field('Email', 'email', 'email')}
          {field('Kota', 'city')}
          {field('NPWP', 'npwp')}
          <div className="md:col-span-2">
            <label className="erp-form-label">Alamat</label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
        </div>
      </ERPModal>

      {/* Detail Modal */}
      <ERPModal isOpen={modal === 'detail'} onClose={closeModal} title="Detail Customer" size="md"
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
                ['Kode', selected.code], ['Nama', selected.name], ['Industri', selected.industry || '—'],
                ['Contact', selected.contactPerson || '—'], ['Telepon', selected.phone || '—'],
                ['Email', selected.email || '—'], ['Kota', selected.city || '—'], ['NPWP', selected.npwp || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-500 text-foreground">{val}</p>
                </div>
              ))}
            </div>
            {selected.address && (
              <div>
                <p className="text-xs text-muted-foreground">Alamat</p>
                <p className="font-500">{selected.address}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <StatusBadge status={(selected.isActive ? 'Aktif' : 'Tidak Aktif') as ActiveStatus} />
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
        title="Hapus Customer?"
        description={`Customer "${deleteTarget?.name}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        loading={deleting}
      />
    </>
  );
}
