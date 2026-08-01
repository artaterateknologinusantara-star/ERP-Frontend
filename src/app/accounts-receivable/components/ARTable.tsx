'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Download, Eye } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import StatusBadge from '@/components/ui/StatusBadge';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { getARList, ARItem } from '@/services/finance.service';
import { InvoiceStatus } from '@/types';

const AGING_COLORS: Record<string, string> = {
  'Current':    'bg-green-100 text-green-700',
  '1-30 hari':  'bg-yellow-100 text-yellow-700',
  '31-60 hari': 'bg-orange-100 text-orange-700',
  '61-90 hari': 'bg-orange-200 text-orange-800',
  '>90 hari':   'bg-red-100 text-red-700',
};

const FILTER_OPTIONS = [
  { value: 'all',     label: 'Semua' },
  { value: 'current', label: 'Current' },
  { value: 'overdue', label: 'Overdue' },
];

export default function ARTable() {
  const router = useRouter();
  const [items, setItems]   = useState<ARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'current' | 'overdue'>('all');
  const [page, setPage]     = useState(1);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    getARList()
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.agingDays - a.agingDays);
        setItems(sorted);
      })
      .catch(() => toast.error('Gagal memuat data AR'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.invoiceNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          (r.salesOrderNo ?? '').toLowerCase().includes(q)
      );
    }
    if (filter === 'current') result = result.filter((r) => r.agingDays <= 0);
    if (filter === 'overdue') result = result.filter((r) => r.agingDays > 0);
    return result;
  }, [items, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData   = filtered.slice((page - 1) * perPage, page * perPage);

  const totals = useMemo(() => ({
    grandTotal: filtered.reduce((s, r) => s + r.grandTotal, 0),
    paid:       filtered.reduce((s, r) => s + r.paid, 0),
    balance:    filtered.reduce((s, r) => s + r.balance, 0),
  }), [filtered]);

  return (
    <div className="erp-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari no. invoice, customer, SO..."
            className="erp-input pl-8 w-full"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value as typeof filter); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-500 transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} invoice</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No Invoice', 'Customer', 'SO', 'Tgl Invoice', 'Jatuh Tempo', 'Terms', 'Total', 'Terbayar', 'Sisa', 'Aging', 'Status'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center py-12 text-muted-foreground text-sm">Memuat data...</td></tr>
            ) : pageData.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12 text-muted-foreground text-sm">Tidak ada data</td></tr>
            ) : pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-700 text-primary">{row.invoiceNo}</td>
                <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.customerName}>{row.customerName}</td>
                <td className="erp-table-cell text-muted-foreground text-xs">{row.salesOrderNo || '—'}</td>
                <td className="erp-table-cell text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                <td className={`erp-table-cell font-500 ${row.agingDays > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {formatDate(row.dueDate)}
                </td>
                <td className="erp-table-cell text-muted-foreground">{row.terms || '—'}</td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.grandTotal)}</td>
                <td className="erp-table-cell font-tabular text-right text-emerald-600">{formatRp(row.paid)}</td>
                <td className={`erp-table-cell font-700 font-tabular text-right ${row.balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {formatRp(row.balance)}
                </td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${AGING_COLORS[row.agingBucket] ?? 'bg-gray-100 text-gray-600'}`}>
                    {row.agingDays > 0 ? `${row.agingDays} hari` : 'Current'}
                  </span>
                </td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as InvoiceStatus} size="sm" />
                </td>
                <td className="erp-table-cell erp-action-col">
                  <RowActionMenu items={[
                    { icon: <Eye size={13} />, label: 'Lihat Invoice', onClick: () => router.push(`/invoice/${row.id}`) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && filtered.length > 0 && (
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="erp-table-cell font-700 text-foreground" colSpan={6}>TOTAL</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totals.grandTotal)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">{formatRp(totals.paid)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-red-600">{formatRp(totals.balance)}</td>
                <td className="erp-table-cell" colSpan={2} />
                <td className="erp-action-col" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={filtered.length}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>
  );
}
