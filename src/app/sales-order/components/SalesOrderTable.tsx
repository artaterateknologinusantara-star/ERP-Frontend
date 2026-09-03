'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { Eye, Trash2, FileText, FileDown, X } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { getSalesOrders, SalesOrderListItem, salesOrderService } from '@/services/salesorder.service';
import { SalesOrderStatus } from '@/types';

// ── PDF Preview Modal ──────────────────────────────────────────────────────────
function PdfPreviewModal({ row, url, onClose }: {
  row: SalesOrderListItem;
  url: string;
  onClose: () => void;
}) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `SO_${row.no.replace(/\//g, '-')}.pdf`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: 900, height: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-widest">Preview Sales Order</p>
            <p className="font-700 text-[15px] text-foreground leading-tight truncate">{row.no}</p>
            <p className="text-[12px] text-muted-foreground truncate">{row.customerName} · {row.projectName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              className="inline-flex items-center gap-1.5 text-[12px] font-600 px-3.5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
              onClick={handleDownload}
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-200 overflow-hidden">
          <iframe src={url} className="w-full h-full" title={`Sales Order ${row.no}`} />
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Open', label: 'Open' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// Exported so pages whose actions change an SO's workflow phase (generate PR, approve PR, receive
// goods, confirm DO, create invoice) can invalidate this list's cache after a successful mutation —
// otherwise the Phase badge here only updates on a manual refresh (stale up to `staleTime`).
export const SALES_ORDERS_QUERY_KEY = 'sales-orders';

export default function SalesOrderTable() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pdfPreview, setPdfPreview] = useState<{ row: SalesOrderListItem; url: string } | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState<string | null>(null);

  // Server-side pagination, not useTableFilter's fetch-all-then-filter-client model: SO count isn't
  // bounded, and the backend's PaginationParams caps perPage at 100 regardless of what's requested,
  // so "fetch all with a big perPage" would silently drop rows past 100 SOs.
  const { data, isLoading } = useQuery({
    queryKey: [SALES_ORDERS_QUERY_KEY, { page, perPage, search, statusFilter }],
    queryFn: () => getSalesOrders({
      page,
      perPage,
      search: search || undefined,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const loading = isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [SALES_ORDERS_QUERY_KEY] });

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const handleOpenPdfPreview = async (row: SalesOrderListItem) => {
    setPdfPreviewLoading(row.id);
    try {
      const blob = await salesOrderService.exportPdf(row.id);
      setPdfPreview({ row, url: URL.createObjectURL(blob) });
    } catch {
      toast.error('Gagal memuat PDF');
    } finally {
      setPdfPreviewLoading(null);
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await salesOrderService.delete(deleteTarget.id);
      toast.success('Sales Order berhasil dihapus');
      setDeleteModal(false);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus Sales Order');
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
          searchPlaceholder="Cari no. SO, pelanggan, proyek..."
          totalCount={total}
          countLabel="sales order"
          statusFilter={statusFilter}
          onStatusFilter={handleStatusFilter}
          statusOptions={STATUS_OPTIONS}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['No SO', 'Customer', 'Proyek', 'Tanggal', 'Expected Date', 'Status', 'Grand Total', 'Ref Quotation'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
                <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Tidak ada data ditemukan</td></tr>
              ) : rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/sales-order/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.customerName}>{row.customerName}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[160px] truncate" title={row.projectName}>{row.projectName}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.expectedDate ? formatDate(row.expectedDate) : '—'}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.phase || (row.status as SalesOrderStatus)} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.grandTotal)}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.refQuotation || '—'}</td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,   label: 'Lihat Detail', onClick: () => router.push(`/sales-order/${row.id}`) },
                      {
                        icon: pdfPreviewLoading === row.id
                          ? <div className="w-[13px] h-[13px] border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <FileText size={13} />,
                        label: 'Lihat PDF',
                        onClick: () => handleOpenPdfPreview(row),
                        disabled: pdfPreviewLoading === row.id,
                      },
                      { icon: <Trash2 size={13} />, label: 'Hapus SO',    onClick: () => { setDeleteTarget(row); setDeleteModal(true); }, danger: true, separator: true },
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

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Hapus Sales Order?"
        description={`SO "${deleteTarget?.no}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={deleting}
      />

      {pdfPreview && (
        <PdfPreviewModal
          row={pdfPreview.row}
          url={pdfPreview.url}
          onClose={handleClosePdfPreview}
        />
      )}
    </>
  );
}
