'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { Eye, Trash2 } from 'lucide-react';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { getSalesOrders, SalesOrderListItem, salesOrderService } from '@/services/salesorder.service';
import { SalesOrderStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Open', label: 'Open' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function SalesOrderTable() {
  const router = useRouter();

  const [rows, setRows] = useState<SalesOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (q: string, p: number, pp: number, st: string) => {
    setLoading(true);
    try {
      const res = await getSalesOrders({
        page: p,
        perPage: pp,
        search: q || undefined,
        status: st !== 'Semua' ? st : undefined,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat data sales order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, page, perPage, statusFilter), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, page, perPage, statusFilter, load]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPageChange = (pp: number) => { setPerPage(pp); setPage(1); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await salesOrderService.delete(deleteTarget.id);
      toast.success('Sales Order berhasil dihapus');
      setDeleteModal(false);
      load(search, page, perPage, statusFilter);
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
          search={search}
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
                    <StatusBadge status={row.status as SalesOrderStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.grandTotal)}</td>
                  <td className="erp-table-cell text-muted-foreground text-xs">{row.refQuotation || '—'}</td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={[
                      { icon: <Eye size={13} />,   label: 'Lihat Detail', onClick: () => router.push(`/sales-order/${row.id}`) },
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
    </>
  );
}
