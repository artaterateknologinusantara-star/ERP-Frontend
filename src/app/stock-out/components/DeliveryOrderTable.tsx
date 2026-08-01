'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, CheckCircle2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  getDeliveryOrders,
  confirmDeliveryOrder,
  markDODelivered,
  deleteDeliveryOrder,
  DeliveryOrderListItem,
} from '@/services/inventory.service';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';

const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

interface Props {
  refreshKey?: number;
  onRefresh?: () => void;
}

export default function DeliveryOrderTable({ refreshKey, onRefresh }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<DeliveryOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage] = useState(PER_PAGE);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async (q: string, st: string, p: number, pp: number) => {
    setLoading(true);
    try {
      const data = await getDeliveryOrders({
        page: p,
        perPage: pp,
        search: q || undefined,
        status: st !== 'Semua' ? st : undefined,
      });
      setRows(data);
    } catch {
      toast.error('Gagal memuat Delivery Order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter, page, perPage), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, statusFilter, page, perPage, load, refreshKey]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));

  const handleConfirm = async (id: string, no: string) => {
    if (!confirm(`Konfirmasi DO ${no}? Stok akan dikurangi sesuai DO.`)) return;
    setActioning(id);
    try {
      await confirmDeliveryOrder(id);
      toast.success(`DO ${no} dikonfirmasi`);
      load(search, statusFilter, page, perPage);
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal konfirmasi DO');
    } finally {
      setActioning(null);
    }
  };

  const handleDeliver = async (id: string, no: string) => {
    if (!confirm(`Tandai DO ${no} sebagai Terkirim?`)) return;
    setActioning(id);
    try {
      await markDODelivered(id);
      toast.success(`DO ${no} ditandai Terkirim`);
      load(search, statusFilter, page, perPage);
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal update status');
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`Hapus DO ${no}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActioning(id);
    try {
      await deleteDeliveryOrder(id);
      toast.success(`DO ${no} berhasil dihapus`);
      load(search, statusFilter, page, perPage);
      onRefresh?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus DO');
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="erp-card shadow-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari nomor DO atau customer..."
        totalCount={rows.length}
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
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.salesOrderNo ?? '—'}</td>
                  <td className="erp-table-cell font-500">{row.customerName ?? '—'}</td>
                  <td className="erp-table-cell whitespace-nowrap text-muted-foreground">{formatDate(row.deliveryDate)}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[160px] truncate">{row.deliveryAddress ?? '—'}</td>
                  <td className="erp-table-cell text-center font-tabular">{row.itemCount}</td>
                  <td className="erp-table-cell"><StatusBadge status={row.status} /></td>
                  <td className="erp-table-cell">
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
                            onClick={() => handleConfirm(row.id, row.no)}
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                            title="Hapus"
                            disabled={busy}
                            onClick={() => handleDelete(row.id, row.no)}
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
                          onClick={() => handleDeliver(row.id, row.no)}
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
        totalCount={rows.length}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>
  );
}
