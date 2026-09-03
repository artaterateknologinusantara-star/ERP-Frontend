'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Eye } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import StatusBadge from '@/components/ui/StatusBadge';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { getSupplierInvoiceList, SupplierInvoiceListItem } from '@/services/supplierInvoice.service';
import { SupplierInvoiceStatus } from '@/types';
import SupplierInvoiceDetailModal from './SupplierInvoiceDetailModal';

const STATUS_OPTIONS = [
  { value: 'Semua',         label: 'Semua Status' },
  { value: 'Draft',         label: 'Draft' },
  { value: 'Approved',      label: 'Approved' },
  { value: 'PartiallyPaid', label: 'Partially Paid' },
  { value: 'Paid',          label: 'Paid' },
  { value: 'Cancelled',     label: 'Cancelled' },
];

export default function SupplierInvoiceTable() {
  const [items, setItems]     = useState<SupplierInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage]       = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    getSupplierInvoiceList({ perPage: 100 })
      .then((res) => setItems(res.data))
      .catch(() => toast.error('Gagal memuat data Supplier Invoice'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.no.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.purchaseOrderNo.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'Semua') {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData   = filtered.slice((page - 1) * perPage, page * perPage);

  const totalSubtotal = useMemo(() => filtered.reduce((s, r) => s + r.subtotal, 0), [filtered]);
  const totalPpn       = useMemo(() => filtered.reduce((s, r) => s + r.ppnMasukan, 0), [filtered]);
  const totalAmount    = useMemo(() => filtered.reduce((s, r) => s + r.total, 0), [filtered]);

  return (
    <div className="erp-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari no. invoice, no. PO, supplier..."
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
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} Invoice</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[1200px]">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No', 'PO Terkait', 'Supplier', 'No. Invoice Vendor', 'Tanggal', 'Jatuh Tempo', 'Subtotal', 'PPN Masukan', 'Total', 'No. Faktur Pajak', 'Status'].map((h) => (
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
              <tr
                key={row.id}
                className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => setDetailId(row.id)}
              >
                <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                <td className="erp-table-cell text-muted-foreground text-xs">{row.purchaseOrderNo}</td>
                <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.supplierName}>{row.supplierName}</td>
                <td className="erp-table-cell text-muted-foreground">{row.invoiceNumber}</td>
                <td className="erp-table-cell text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                <td className="erp-table-cell text-muted-foreground">{formatDate(row.dueDate)}</td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.subtotal)}</td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.ppnMasukan)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                <td className="erp-table-cell text-muted-foreground text-xs">{row.nomorFakturPajak || '—'}</td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as SupplierInvoiceStatus} size="sm" />
                </td>
                <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                  <RowActionMenu items={[
                    { icon: <Eye size={13} />, label: 'Lihat Detail', onClick: () => setDetailId(row.id) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && filtered.length > 0 && (
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td className="erp-table-cell font-700 text-foreground" colSpan={6}>TOTAL</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalSubtotal)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalPpn)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalAmount)}</td>
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

      {detailId && (
        <SupplierInvoiceDetailModal
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
          invoiceId={detailId}
        />
      )}
    </div>
  );
}
