'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { Eye, CreditCard, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import CurrencyInput from '@/components/ui/CurrencyInput';
import {
  getInvoices,
  recordPayment,
  invoiceService,
  InvoiceListItem,
} from '@/services/invoice.service';
import { getFlatAccounts, Account } from '@/services/account.service';
import { InvoiceStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Partial Paid', label: 'Partial Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Overdue', label: 'Overdue' },
];

const PAYMENT_METHODS = ['Transfer', 'Tunai', 'Giro', 'Cek'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const INVOICES_QUERY_KEY = 'invoices';

export default function InvoiceTable() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState<InvoiceListItem | null>(null);
  const [payForm, setPayForm] = useState({
    paymentDate: todayIso(),
    amount: '',
    method: 'Transfer',
    cashBankAccountId: '',
    reference: '',
    notes: '',
  });
  const [paying, setPaying] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);

  useEffect(() => {
    getFlatAccounts().then((all) => setCashAccounts(all.filter((a) => a.type === 'Asset'))).catch(() => toast.error('Gagal memuat daftar akun'));
  }, []);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Server-side pagination + a real server-side status filter (InvoiceQueryParams.Status, added
  // alongside this migration -- the status dropdown used to filter the already-paginated page
  // client-side, which gave the wrong total/page count whenever it narrowed results). Not
  // useTableFilter: invoice count isn't bounded and PaginationParams clamps perPage at 100.
  const { data, isLoading } = useQuery({
    queryKey: [INVOICES_QUERY_KEY, { page, perPage, search, statusFilter }],
    queryFn: () => getInvoices({
      page,
      perPage,
      search: search || undefined,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const displayRows = data?.data ?? [];
  const total = data?.total ?? 0;
  const loading = isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const openPayModal = (row: InvoiceListItem) => {
    setPayTarget(row);
    setPayForm({ paymentDate: todayIso(), amount: '', method: 'Transfer', cashBankAccountId: '', reference: '', notes: '' });
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const amount = parseFloat(payForm.amount);
    if (!payForm.amount || isNaN(amount) || amount <= 0) {
      toast.error('Jumlah pembayaran wajib diisi dan harus lebih dari 0');
      return;
    }
    if (amount > payTarget.balance) {
      toast.error(`Jumlah melebihi sisa tagihan (${formatRp(payTarget.balance)})`);
      return;
    }
    if (!payForm.cashBankAccountId) {
      toast.error('Akun Kas/Bank wajib dipilih');
      return;
    }
    setPaying(true);
    try {
      await recordPayment(payTarget.id, {
        paymentDate: payForm.paymentDate,
        amount,
        method: payForm.method,
        cashBankAccountId: payForm.cashBankAccountId,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      });
      toast.success('Pembayaran berhasil dicatat');
      setPayModal(false);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat pembayaran');
    } finally {
      setPaying(false);
    }
  };

  const openDeleteModal = (row: InvoiceListItem) => {
    setDeleteTarget(row);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await invoiceService.delete(deleteTarget.id);
      toast.success('Invoice berhasil dihapus');
      setDeleteModal(false);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus invoice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="erp-card">
        <TableToolbar
          search={searchInput}
          onSearch={handleSearch}
          searchPlaceholder="Cari no. invoice, pelanggan..."
          totalCount={total}
          countLabel="invoice"
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
          statusOptions={STATUS_OPTIONS}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['No Invoice', 'Customer', 'Tgl Invoice', 'Jatuh Tempo', 'Status', 'Total', 'Terbayar', 'Sisa', 'Aging'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
                <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
              ) : displayRows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Tidak ada data ditemukan</td></tr>
              ) : displayRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/invoice/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.customerName}>{row.customerName}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                  <td className={`erp-table-cell font-500 ${row.status === 'Overdue' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {formatDate(row.dueDate)}
                  </td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as InvoiceStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">
                    {formatRp(row.amount)}
                    {row.retentionAmount > row.retentionReleasedAmount && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-600">Retensi</span>
                    )}
                  </td>
                  <td className="erp-table-cell font-tabular text-right text-emerald-600">
                    {row.paid > 0 ? formatRp(row.paid) : '—'}
                  </td>
                  <td className={`erp-table-cell font-700 font-tabular text-right ${row.balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {row.balance > 0 ? formatRp(row.balance) : '—'}
                  </td>
                  <td className="erp-table-cell">
                    {row.agingDays > 0
                      ? <span className="text-red-600 font-medium">{row.agingDays} hari</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,      label: 'Lihat Detail',    onClick: () => router.push(`/invoice/${row.id}`) },
                      { icon: <CreditCard size={13} />, label: 'Record Payment', onClick: () => openPayModal(row), disabled: row.status === 'Paid' },
                      { icon: <Trash2 size={13} />,   label: 'Hapus Invoice',   onClick: () => openDeleteModal(row), danger: true, separator: true },
                    ]} />
                  </td>
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
          onPerPageChange={handlePerPageChange}
        />
      </div>

      {/* Record Payment Modal */}
      <ERPModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Record Pembayaran"
        subtitle={payTarget?.no}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayModal(false)} disabled={paying}>Batal</button>
            <button className="btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </>
        }
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sisa Tagihan</span>
                <span className="font-700 text-red-600">{formatRp(payTarget.balance)}</span>
              </div>
            </div>
            <div>
              <label className="erp-form-label">Tanggal Pembayaran<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="date"
                className="erp-input"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="erp-form-label">Jumlah<span className="text-red-500 ml-0.5">*</span></label>
              <CurrencyInput
                placeholder={String(payTarget.balance)}
                value={Number(payForm.amount) || 0}
                onChange={(v) => setPayForm((f) => ({ ...f, amount: v ? String(v) : '' }))}
              />
            </div>
            <div>
              <label className="erp-form-label">Metode<span className="text-red-500 ml-0.5">*</span></label>
              <select
                className="erp-input"
                value={payForm.method}
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-form-label">Akun Kas/Bank<span className="text-red-500 ml-0.5">*</span></label>
              <select
                className="erp-input"
                value={payForm.cashBankAccountId}
                onChange={(e) => setPayForm((f) => ({ ...f, cashBankAccountId: e.target.value }))}
              >
                <option value="">— Pilih Akun —</option>
                {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-form-label">Referensi</label>
              <input
                type="text"
                className="erp-input"
                placeholder="No. transfer / cek / giro"
                value={payForm.reference}
                onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div>
              <label className="erp-form-label">Catatan</label>
              <textarea
                className="erp-input resize-none"
                rows={2}
                value={payForm.notes}
                onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        )}
      </ERPModal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Hapus Invoice?"
        description={`Invoice "${deleteTarget?.no}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleting}
      />
    </>
  );
}
