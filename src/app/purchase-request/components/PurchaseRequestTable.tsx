'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import { Eye, Plus, Send, CheckCircle, XCircle, ShoppingBag, RotateCcw, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import {
  getPRList,
  updatePRStatus,
  deletePR,
  PurchaseRequestListItem,
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

export default function PurchaseRequestTable() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseRequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPRList({
      page,
      perPage,
      search: search || undefined,
      status: statusFilter !== 'Semua' ? statusFilter : undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setItems(res.data);
          setTotal(res.total);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Gagal memuat data Purchase Request');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, perPage, search, statusFilter, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

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
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Operasi gagal');
    }
  };

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`Hapus ${no}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deletePR(id);
      toast.success(`${no} berhasil dihapus`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus PR');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
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
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.salesOrderNo || '—'}</td>
                  <td className="erp-table-cell font-500">{row.requestedByName}</td>
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell text-center font-600">{row.itemCount}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as PurchaseRequestStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                  <td className="erp-table-cell erp-action-col">
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />, label: 'Lihat Detail', onClick: () => router.push(`/purchase-request/${row.id}`) },
                      ...(row.status === 'Draft' ? [
                        { icon: <Send size={13} />,    label: 'Submit PR',  onClick: () => handleStatusAction(row.id, 'Submitted', 'PR berhasil diajukan'), separator: true },
                        { icon: <Trash2 size={13} />,  label: 'Hapus PR',   onClick: () => handleDelete(row.id, row.no), danger: true },
                      ] : []),
                      ...(row.status === 'Submitted' ? [
                        { icon: <CheckCircle size={13} />, label: 'Approve PR', onClick: () => handleStatusAction(row.id, 'Approved', 'PR disetujui'), separator: true },
                        { icon: <XCircle size={13} />,    label: 'Reject PR',  onClick: () => handleStatusAction(row.id, 'Rejected', 'PR ditolak'), danger: true },
                      ] : []),
                      ...(row.status === 'Approved' ? [
                        { icon: <ShoppingBag size={13} />, label: 'Buat PO', onClick: () => router.push(`/purchase-request/${row.id}`), separator: true },
                      ] : []),
                      ...(row.status === 'Rejected' ? [
                        { icon: <RotateCcw size={13} />, label: 'Reset ke Draft', onClick: () => handleStatusAction(row.id, 'Draft', 'PR di-reset ke Draft'), separator: true },
                        { icon: <Trash2 size={13} />,    label: 'Hapus PR',       onClick: () => handleDelete(row.id, row.no), danger: true },
                      ] : []),
                      ...(row.status === 'Ordered' ? [
                        { icon: <Trash2 size={13} />, label: 'Hapus PR', onClick: () => handleDelete(row.id, row.no), danger: true, separator: true },
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
