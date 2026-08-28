'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Eye, CheckCircle2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  getDeliveryOrders,
  confirmDeliveryOrder,
  markDODelivered,
  deleteDeliveryOrder,
} from '@/services/inventory.service';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import ConfirmModal from '@/components/ui/ConfirmModal';

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const DELIVERY_ORDERS_QUERY_KEY = 'delivery-orders';

interface Props {
  refreshKey?: number;
  onRefresh?: () => void;
}

export default function DeliveryOrderTable({ refreshKey, onRefresh }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage] = useState(PER_PAGE);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'confirm' | 'deliver' | 'delete'; id: string; no: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // refreshKey (bumped by the parent's onRefresh) is folded into the query key -- StockOutContent
  // also refreshes StockOutSummaryCards off the same key, so this table needs to refetch in step
  // with it rather than managing its own separate invalidation.
  const { data, isLoading } = useQuery({
    queryKey: [DELIVERY_ORDERS_QUERY_KEY, { page, perPage, search, statusFilter, refreshKey }],
    queryFn: () => getDeliveryOrders({
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

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, id, no } = confirmAction;
    setActioning(id);
    try {
      if (type === 'confirm') {
        await confirmDeliveryOrder(id);
        toast.success(`DO ${no} dikonfirmasi`);
      } else if (type === 'deliver') {
        await markDODelivered(id);
        toast.success(`DO ${no} ditandai Terkirim`);
      } else {
        await deleteDeliveryOrder(id);
        toast.success(`DO ${no} berhasil dihapus`);
      }
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: [DELIVERY_ORDERS_QUERY_KEY] });
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Operasi gagal');
    } finally {
      setActioning(null);
    }
  };

  const CONFIRM_COPY: Record<'confirm' | 'deliver' | 'delete', { title: string; description: (no: string) => string; confirmLabel: string; variant: 'danger' | 'default' }> = {
    confirm: { title: 'Konfirmasi Delivery Order?', description: (no) => `DO ${no} akan dikonfirmasi. Stok akan dikurangi sesuai DO.`, confirmLabel: 'Konfirmasi', variant: 'default' },
    deliver: { title: 'Tandai Sebagai Terkirim?', description: (no) => `DO ${no} akan ditandai sebagai Terkirim.`, confirmLabel: 'Tandai Terkirim', variant: 'default' },
    delete:  { title: 'Hapus Delivery Order?', description: (no) => `DO ${no} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`, confirmLabel: 'Hapus', variant: 'danger' },
  };

  return (
    <React.Fragment>
      <div className="erp-card shadow-card">
      <TableToolbar
        search={searchInput}
        onSearch={handleSearch}
        searchPlaceholder="Cari nomor DO atau customer..."
        totalCount={total}
        countLabel="DO"
        statusFilter={statusFilter}
        onStatusFilter={handleStatus}
        statusOptions={STATUS_OPTIONS}
        actions={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => router.push('/stock-out/buat')}>
            <Plus size={14} /> Buat DO Baru
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No DO', 'Ref SO', 'Customer', 'Tgl Delivery', 'Alamat', 'Jml Item', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="erp-table-cell text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package size={28} className="opacity-40" />
                    <p className="text-sm">Belum ada Delivery Order.</p>
                    <button className="btn-primary mt-1" onClick={() => router.push('/stock-out/buat')}>
                      <Plus size={13} /> Buat DO Pertama
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => {
              const busy = actioning === row.id;
              return (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/stock-out/${row.id}`)}
                >
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.salesOrderNo ?? '—'}</td>
                  <td className="erp-table-cell font-500">{row.customerName ?? '—'}</td>
                  <td className="erp-table-cell whitespace-nowrap text-muted-foreground">{formatDate(row.deliveryDate)}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[160px] truncate">{row.deliveryAddress ?? '—'}</td>
                  <td className="erp-table-cell text-center font-tabular">{row.itemCount}</td>
                  <td className="erp-table-cell"><StatusBadge status={row.status} /></td>
                  <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary"
                        title="Lihat Detail"
                        onClick={() => router.push(`/stock-out/${row.id}`)}
                      >
                        <Eye size={13} />
                      </button>
                      {row.status === 'Draft' && (
                        <>
                          <button
                            className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 disabled:opacity-40"
                            title="Konfirmasi"
                            disabled={busy}
                            onClick={() => setConfirmAction({ type: 'confirm', id: row.id, no: row.no })}
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                            title="Hapus"
                            disabled={busy}
                            onClick={() => setConfirmAction({ type: 'delete', id: row.id, no: row.no })}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                      {row.status === 'Confirmed' && (
                        <button
                          className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 disabled:opacity-40"
                          title="Tandai Terkirim"
                          disabled={busy}
                          onClick={() => setConfirmAction({ type: 'deliver', id: row.id, no: row.no })}
                        >
                          <Package size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>

    <ConfirmModal
      isOpen={!!confirmAction}
      onClose={() => setConfirmAction(null)}
      onConfirm={executeConfirmedAction}
      title={confirmAction ? CONFIRM_COPY[confirmAction.type].title : ''}
      description={confirmAction ? CONFIRM_COPY[confirmAction.type].description(confirmAction.no) : ''}
      confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction.type].confirmLabel : ''}
      variant={confirmAction ? CONFIRM_COPY[confirmAction.type].variant : 'default'}
      loading={!!actioning}
    />
    </React.Fragment>
  );
}
