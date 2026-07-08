'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, Send, CheckCircle, XCircle } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import StatusBadge from '@/components/ui/StatusBadge';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { getExpenseList, submitExpense, approveExpense, ExpenseListItem } from '@/services/expense.service';
import { getExpenseCategoryList, ExpenseCategory } from '@/services/expenseCategory.service';
import { ExpenseStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Paid', label: 'Paid' },
];

export default function ExpenseTable() {
  const router = useRouter();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    getExpenseList({
      page,
      perPage,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
      expenseCategoryId: categoryFilter !== 'Semua' ? categoryFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => { setItems(res.data); setTotal(res.total); })
      .catch(() => toast.error('Gagal memuat data Expense'))
      .finally(() => setLoading(false));
  }, [page, perPage, statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    getExpenseCategoryList().then(setCategories).catch(() => {});
  }, []);

  const reload = () => setRefreshKey((k) => k + 1);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const handleSubmit = async (id: string, no: string) => {
    try {
      await submitExpense(id);
      toast.success(`${no} berhasil diajukan`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal submit Expense');
    }
  };

  const handleApprove = async (id: string, no: string) => {
    try {
      await approveExpense(id);
      toast.success(`${no} berhasil di-approve`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal approve Expense');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasFilter = statusFilter !== 'Semua' || categoryFilter !== 'Semua' || dateFrom || dateTo;

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Daftar Expense</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{total} pengeluaran operasional</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            className="erp-input w-36 text-xs"
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="erp-input w-44 text-xs"
            value={categoryFilter}
            onChange={(e) => handleFilterChange(setCategoryFilter)(e.target.value)}
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            type="date"
            className="erp-input w-36 text-xs"
            value={dateFrom}
            onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            className="erp-input w-36 text-xs"
            value={dateTo}
            onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
          />
          {hasFilter && (
            <button
              className="btn-secondary text-xs py-1"
              onClick={() => { setStatusFilter('Semua'); setCategoryFilter('Semua'); setDateFrom(''); setDateTo(''); setPage(1); }}
            >
              Reset
            </button>
          )}
          <button className="btn-primary" onClick={() => router.push('/expense/buat')}>
            <Plus size={14} /> Buat Expense
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. Expense', 'Tanggal', 'Kategori', 'Deskripsi', 'Vendor', 'Status', 'Jumlah'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Memuat data...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Tidak ada data ditemukan</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                  <td className="erp-table-cell font-700 text-primary">{row.expenseNo}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.expenseDate)}</td>
                  <td className="erp-table-cell font-500">{row.expenseCategoryName}</td>
                  <td className="erp-table-cell max-w-[220px] truncate" title={row.description}>{row.description}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.vendorName || '—'}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as ExpenseStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.amount)}</td>
                  <td className="erp-table-cell erp-action-col">
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />, label: 'Lihat Detail', onClick: () => router.push(`/expense/${row.id}`) },
                      ...(row.status === 'Draft' ? [
                        { icon: <Send size={13} />, label: 'Submit', onClick: () => handleSubmit(row.id, row.expenseNo), separator: true },
                      ] : []),
                      ...(row.status === 'Submitted' ? [
                        { icon: <CheckCircle size={13} />, label: 'Approve', onClick: () => handleApprove(row.id, row.expenseNo), separator: true },
                        { icon: <XCircle size={13} />, label: 'Reject', onClick: () => router.push(`/expense/${row.id}`), danger: true },
                      ] : []),
                    ]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(pp) => { setPerPage(pp); setPage(1); }}
      />
    </div>
  );
}
