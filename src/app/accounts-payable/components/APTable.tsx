'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Download, Eye, CreditCard } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import StatusBadge from '@/components/ui/StatusBadge';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { getAPList, APItem } from '@/services/finance.service';
import { PurchaseOrderStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua',          label: 'Semua Status' },
  { value: 'Ordered',        label: 'Ordered' },
  { value: 'PartialReceive', label: 'Partial Receive' },
  { value: 'Completed',      label: 'Completed' },
];

export default function APTable() {
  const router = useRouter();
  const [items, setItems]     = useState<APItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage]       = useState(1);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    getAPList()
      .then(setItems)
      .catch(() => toast.error('Gagal memuat data AP'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.poNo.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          (r.purchaseRequestNo ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'Semua') {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData   = filtered.slice((page - 1) * perPage, page * perPage);

  const totalAmount   = useMemo(() => filtered.reduce((s, r) => s + r.total, 0), [filtered]);
  const totalBalance  = useMemo(() => filtered.reduce((s, r) => s + (r.balance ?? r.total), 0), [filtered]);
  const totalPaid     = useMemo(() => filtered.reduce((s, r) => s + (r.totalPaid ?? 0), 0), [filtered]);

  return (
    <div className="erp-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari no. PO, supplier, ref PR..."
            className="erp-input pl-8 w-full"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="erp-input min-w-[160px]"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} PO</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[1050px]">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No PO', 'Supplier', 'Ref PR', 'Tgl PO', 'Est. Delivery', 'Total', 'Terbayar', 'Sisa', 'Status', 'Aging'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">Memuat data...</td></tr>
            ) : pageData.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">Tidak ada data</td></tr>
            ) : pageData.map((row) => {
              const sisa = row.balance ?? row.total;
              return (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-700 text-primary">{row.poNo}</td>
                  <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.supplierName}>{row.supplierName}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.purchaseRequestNo || '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.poDate)}</td>
                  <td className="erp-table-cell text-muted-foreground">
                    {row.deliveryDate ? formatDate(row.deliveryDate) : '—'}
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                  <td className="erp-table-cell font-600 font-tabular text-emerald-600 text-right">{formatRp(row.totalPaid ?? 0)}</td>
                  <td className={`erp-table-cell font-700 font-tabular text-right ${sisa > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {sisa > 0 ? formatRp(sisa) : 'Lunas'}
                  </td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as PurchaseOrderStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell text-muted-foreground text-xs">
                    {row.agingDays > 0 ? `${row.agingDays} hari` : '—'}
                  </td>
                  <td className="erp-table-cell erp-action-col">
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,        label: 'Lihat PO',    onClick: () => router.push(`/purchase-order/${row.id}`) },
                      ...(sisa > 0 ? [{ icon: <CreditCard size={13} />, label: 'Catat Pembayaran', onClick: () => router.push(`/purchase-order/${row.id}`) }] : []),
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {!loading && filtered.length > 0 && (
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="erp-table-cell font-700 text-foreground" colSpan={5}>TOTAL</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalAmount)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">{formatRp(totalPaid)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-red-600">{formatRp(totalBalance)}</td>
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
