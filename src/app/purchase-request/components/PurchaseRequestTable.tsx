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
import { canApprove } from '@/lib/permissions';
import { Eye, Plus, Send, CheckCircle, XCircle, ShoppingBag, RotateCcw, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import {
  getPRList,
  updatePRStatus,
  deletePR,
} from '@/services/purchase.service';
import { PurchaseRequestStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Ordered', label: 'Ordered' },
];

const PURCHASE_REQUESTS_QUERY_KEY = 'purchase-requests';

export default function PurchaseRequestTable() {
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

  // Server-side pagination (not useTableFilter -- PR count isn't bounded and PaginationParams
  // clamps perPage at 100). The status filter param below now actually works server-side --
  // PurchaseRequestQueryParams.Status, added alongside this migration.
  const { data, isLoading } = useQuery({
    queryKey: [PURCHASE_REQUESTS_QUERY_KEY, { page, perPage, search, statusFilter }],
    queryFn: () => getPRList({
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [PURCHASE_REQUESTS_QUERY_KEY] });

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

  const handleStatusAction = async (id: string, newStatus: string, msg: string) => {
    try {
      await updatePRStatus(id, newStatus);
      toast.success(msg);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Operasi gagal');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePR(deleteTarget.id);
      toast.success(`${deleteTarget.no} berhasil dihapus`);
      setDeleteTarget(null);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus PR');
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
        searchPlaceholder="Cari no. PR, requester..."
        totalCount={total}
        countLabel="purchase request"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        actions={
          <button className="btn-primary" onClick={() => router.push('/purchase-request/buat')}>
            <Plus size={14} /> Buat PR Manual
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No PR', 'Ref SO', 'Dibuat Oleh', 'Tanggal', 'Jml Item', 'Status', 'Total'].map((h) => (
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
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/purchase-request/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.salesOrderNo || '—'}</td>
                  <td className="erp-table-cell font-500">{row.requestedByName}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell text-center font-600">{row.itemCount}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as PurchaseRequestStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />, label: 'Lihat Detail', onClick: () => router.push(`/purchase-request/${row.id}`) },
                      ...(row.status === 'Draft' ? [
                        { icon: <Send size={13} />,    label: 'Submit PR',  onClick: () => handleStatusAction(row.id, 'Submitted', 'PR berhasil diajukan'), separator: true },
                        { icon: <Trash2 size={13} />,  label: 'Hapus PR',   onClick: () => setDeleteTarget({ id: row.id, no: row.no }) },
                      ] : []),
                      ...(row.status === 'Submitted' && canApprove('Purchasing') ? [
                        { icon: <CheckCircle size={13} />, label: 'Approve PR', onClick: () => handleStatusAction(row.id, 'Approved', 'PR disetujui'), separator: true },
                        { icon: <XCircle size={13} />,    label: 'Reject PR',  onClick: () => handleStatusAction(row.id, 'Rejected', 'PR ditolak'), danger: true },
                      ] : []),
                      ...(row.status === 'Approved' ? [
                        { icon: <ShoppingBag size={13} />, label: 'Buat PO', onClick: () => router.push(`/purchase-request/${row.id}`), separator: true },
                      ] : []),
                      ...(row.status === 'Rejected' ? [
                        { icon: <RotateCcw size={13} />, label: 'Reset ke Draft', onClick: () => handleStatusAction(row.id, 'Draft', 'PR di-reset ke Draft'), separator: true },
                        { icon: <Trash2 size={13} />,    label: 'Hapus PR',       onClick: () => setDeleteTarget({ id: row.id, no: row.no }) },
                      ] : []),
                      ...(row.status === 'Ordered' ? [
                        { icon: <Trash2 size={13} />, label: 'Hapus PR', onClick: () => setDeleteTarget({ id: row.id, no: row.no }), danger: true, separator: true },
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
      title="Hapus Purchase Request?"
      description={`${deleteTarget?.no} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
      confirmLabel="Hapus"
      loading={deleting}
    />
    </React.Fragment>
  );
}
