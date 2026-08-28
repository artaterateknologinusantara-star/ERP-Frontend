'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  PurchaseOrderListItem,
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

export default function PurchaseOrderTable() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; no: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPOList({
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
        if (!cancelled) toast.error('Gagal memuat data Purchase Order');
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

  const handleConfirmOrder = async (id: string, no: string) => {
    try {
      await updatePOStatus(id, 'Ordered');
      toast.success(`${no} dikonfirmasi ke Ordered`);
      reload();
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
      reload();
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
