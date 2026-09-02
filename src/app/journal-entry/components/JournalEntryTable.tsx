'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { canCreate } from '@/lib/permissions';
import { getJournalEntryList } from '@/services/journalEntry.service';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Posted', label: 'Posted' },
  { value: 'Reversed', label: 'Reversed' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'Semua', label: 'Semua Source' },
  { value: 'ManualAdjustment', label: 'ManualAdjustment' },
  { value: 'OpeningBalance', label: 'OpeningBalance' },
  { value: 'SalesInvoice', label: 'SalesInvoice' },
  { value: 'PurchaseInvoice', label: 'PurchaseInvoice' },
  { value: 'StockIn', label: 'StockIn' },
  { value: 'StockOut', label: 'StockOut' },
  { value: 'CashIn', label: 'CashIn' },
  { value: 'CashOut', label: 'CashOut' },
  { value: 'OperationalExpense', label: 'OperationalExpense' },
  { value: 'Reversal', label: 'Reversal' },
  { value: 'CustomerAdvanceReceived', label: 'CustomerAdvanceReceived' },
  { value: 'CustomerAdvanceApplied', label: 'CustomerAdvanceApplied' },
];

const JOURNAL_ENTRIES_QUERY_KEY = 'journal-entries';

export default function JournalEntryTable() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('Semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: [JOURNAL_ENTRIES_QUERY_KEY, { page, perPage, statusFilter, sourceTypeFilter, dateFrom, dateTo }],
    queryFn: () => getJournalEntryList({
      page,
      perPage,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
      sourceType: sourceTypeFilter !== 'Semua' ? sourceTypeFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const loading = isLoading;

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasFilter = statusFilter !== 'Semua' || sourceTypeFilter !== 'Semua' || dateFrom || dateTo;

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Daftar Journal Entry</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{total} jurnal (manual + auto-posting)</p>
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
            className="erp-input w-48 text-xs"
            value={sourceTypeFilter}
            onChange={(e) => handleFilterChange(setSourceTypeFilter)(e.target.value)}
          >
            {SOURCE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
              onClick={() => { setStatusFilter('Semua'); setSourceTypeFilter('Semua'); setDateFrom(''); setDateTo(''); setPage(1); }}
            >
              Reset
            </button>
          )}
          {canCreate('Accounting') && (
            <button className="btn-primary" onClick={() => router.push('/journal-entry/buat')}>
              <Plus size={14} /> Buat Jurnal Manual
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. Entry', 'Tanggal', 'Deskripsi', 'Source Type', 'Status', 'Total Debit', 'Total Kredit', 'Dibuat Oleh'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  Memuat data...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/journal-entry/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.entryNumber}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell max-w-[280px] truncate" title={row.description}>{row.description}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.sourceType}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.totalDebit)}</td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.totalCredit)}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.createdByName || '—'}</td>
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
