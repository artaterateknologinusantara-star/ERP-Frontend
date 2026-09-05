'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { Eye, CheckCircle, Truck, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import {
  getPOList,
  updatePOStatus,
  deletePO,
} from '@/services/purchase.service';
import { PurchaseOrderStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Partial Receive', label: 'Partial Receive' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const PURCHASE_ORDERS_QUERY_KEY = 'purchase-orders';

export default function PurchaseOrderTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; no: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Kept as true server-side pagination (page/perPage/search/status all sent to the API) rather
  // than switching to useTableFilter's fetch-everything-then-filter-client-side model — PO count
  // isn't bounded the way AR/AP/Riwayat Penawaran are, and the backend's PaginationParams caps
  // perPage at 100 regardless of what's requested, so "fetch all with a big perPage" would silently
  // drop rows once the table passes 100 POs. react-query still gets us the caching/invalidation win:
  // navigating away and back to the same page/filter within the 2-minute staleTime skips the
  // network round-trip, and mutations below just invalidate the key instead of a manual reload().
  const { data, isLoading } = useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, { page, perPage, search, statusFilter }],
    queryFn: () => getPOList({
      page,
      perPage,
      search: search || undefined,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const loading = isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });

  const handleSearch = (val: string) => {
    setSearchInput(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleConfirmOrder = async (id: string, no: string) => {
    try {
      await updatePOStatus(id, 'Ordered');
      toast.success(`${no} dikonfirmasi ke Ordered`);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengkonfirmasi order');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePO(deleteTarget.id);
      toast.success(`${deleteTarget.no} berhasil dihapus`);
      setDeleteTarget(null);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus PO');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <React.Fragment>
      <div className="erp-card">
      <TableToolbar
        search={searchInput}
        onSearch={handleSearch}
        searchPlaceholder="Cari no. PO, supplier, ref PR..."
        totalCount={total}
        countLabel="purchase order"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No PO', 'Ref PR', 'Supplier', 'Tanggal', 'Delivery Date', 'Jml Item', 'Status', 'Total'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  Memuat data...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/purchase-order/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.purchaseRequestNo || '—'}</td>
                  <td className="erp-table-cell font-500">{row.supplierName}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.deliveryDate ? formatDate(row.deliveryDate) : '—'}</td>
                  <td className="erp-table-cell text-center font-600">{row.itemCount}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as PurchaseOrderStatus} size="sm" />
                    {row.status === 'Completed' && !row.hasActiveSupplierInvoice && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-600 whitespace-nowrap">Diterima, Belum Ditagih</span>
                    )}
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,   label: 'Lihat Detail', onClick: () => router.push(`/purchase-order/${row.id}`) },
                      ...(row.status === 'Draft' ? [
                        { icon: <CheckCircle size={13} />, label: 'Konfirmasi Order', onClick: () => handleConfirmOrder(row.id, row.no), separator: true },
                        { icon: <Trash2 size={13} />,      label: 'Hapus PO',         onClick: () => setDeleteTarget({ id: row.id, no: row.no }), danger: true },
                      ] : []),
                      ...(row.status === 'Ordered' ? [
                        { icon: <Truck size={13} />, label: 'Terima Barang', onClick: () => router.push(`/purchase-order/${row.id}`), separator: true },
                      ] : []),
                      ...(row.status === 'Partial Receive' ? [
                        { icon: <Truck size={13} />, label: 'Terima Lanjutan', onClick: () => router.push(`/purchase-order/${row.id}`), separator: true },
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

    <ConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDelete}
      title="Hapus Purchase Order?"
      description={`${deleteTarget?.no} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
      confirmLabel="Hapus"
      loading={deleting}
    />
    </React.Fragment>
  );
}
