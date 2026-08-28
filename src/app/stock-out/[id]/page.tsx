'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Trash2, Truck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatDate } from '@/lib/format';
import {
  getDeliveryOrderDetail,
  confirmDeliveryOrder,
  markDODelivered,
  deleteDeliveryOrder,
  DeliveryOrderDetail,
} from '@/services/inventory.service';

export default function DeliveryOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [do_, setDO] = useState<DeliveryOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'deliver' | 'delete' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeliveryOrderDetail(id);
      setDO(data);
    } catch {
      toast.error('Gagal memuat detail Delivery Order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const executeConfirmedAction = async () => {
    if (!do_ || !confirmAction) return;
    setActioning(true);
    try {
      if (confirmAction === 'confirm') {
        await confirmDeliveryOrder(id);
        toast.success('DO berhasil dikonfirmasi');
        setConfirmAction(null);
        load();
      } else if (confirmAction === 'deliver') {
        await markDODelivered(id);
        toast.success('DO ditandai Terkirim');
        setConfirmAction(null);
        load();
      } else {
        await deleteDeliveryOrder(id);
        toast.success('DO berhasil dihapus');
        router.push('/stock-out');
        return;
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Operasi gagal');
    } finally {
      setActioning(false);
    }
  };

  const CONFIRM_COPY: Record<'confirm' | 'deliver' | 'delete', { title: string; description: string; confirmLabel: string; variant: 'danger' | 'default' }> = {
    confirm: { title: 'Konfirmasi Delivery Order?', description: `DO ${do_?.no} akan dikonfirmasi. Stok akan dikurangi sesuai items DO.`, confirmLabel: 'Konfirmasi', variant: 'default' },
    deliver: { title: 'Tandai Sebagai Terkirim?', description: `DO ${do_?.no} akan ditandai sebagai Terkirim.`, confirmLabel: 'Tandai Terkirim', variant: 'default' },
    delete:  { title: 'Hapus Delivery Order?', description: `DO ${do_?.no} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`, confirmLabel: 'Hapus', variant: 'danger' },
  };

  const isConfirmedOrDelivered = do_?.status === 'Confirmed' || do_?.status === 'Delivered';
  const hasLowStock = do_?.items.some((i) => i.currentStock < i.qty) && do_?.status === 'Draft';

  if (loading) {
    return (
      <AppLayout
        title="Delivery Order Detail"
        breadcrumbs={[
          { label: 'Inventory' },
          { label: 'Stock Out / DO', href: '/stock-out' }, { label: '...' },
        ]}
      >
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!do_) {
    return (
      <AppLayout
        title="Delivery Order Detail"
        breadcrumbs={[
          { label: 'Inventory' },
          { label: 'Stock Out / DO', href: '/stock-out' }, { label: 'Tidak ditemukan' },
        ]}
      >
        <div className="text-center py-20 text-muted-foreground text-sm">Delivery Order tidak ditemukan.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`DO ${do_.no}`}
      breadcrumbs={[
        { label: 'Inventory' },
        { label: 'Stock Out / DO', href: '/stock-out' },
        { label: do_.no },
      ]}
    >
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{do_.no}</h1>
              <StatusBadge status={do_.status} />
            </div>
            <div className="flex items-center gap-2">
              {do_.status === 'Draft' && (
                <>
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md font-500">
                    ⚠ Stok akan dikurangi saat dikonfirmasi
                  </p>
                  <button className="btn-primary flex items-center gap-1.5" onClick={() => setConfirmAction('confirm')} disabled={actioning}>
                    <CheckCircle2 size={14} /> Konfirmasi DO
                  </button>
                  <button className="btn-secondary text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmAction('delete')} disabled={actioning}>
                    <Trash2 size={14} /> Hapus
                  </button>
                </>
              )}
              {do_.status === 'Confirmed' && (
                <button className="btn-primary flex items-center gap-1.5" onClick={() => setConfirmAction('deliver')} disabled={actioning}>
                  <Truck size={14} /> Tandai Terkirim
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kiri */}
          <div className="erp-card space-y-2.5">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Informasi</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Ref SO</dt>
                <dd className="font-500">
                  {do_.salesOrderId ? (
                    <Link href={`/sales-order/${do_.salesOrderId}`} className="text-primary hover:underline">
                      {do_.salesOrderNo}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Customer</dt>
                <dd className="font-500">{do_.customerName ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Penerima</dt>
                <dd className="font-500">{do_.recipientName ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Catatan</dt>
                <dd className="text-muted-foreground">{do_.notes ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Kanan */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Detail Pengiriman</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Status</dt>
                <dd><StatusBadge status={do_.status} size="sm" /></dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Tgl Delivery</dt>
                <dd className="font-500">{formatDate(do_.deliveryDate)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Alamat Kirim</dt>
                <dd className="font-500 break-words">{do_.deliveryAddress ?? '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Dibuat Oleh</dt>
                <dd className="font-500">{do_.createdByName}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Low Stock Warning ── */}
        {hasLowStock && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Peringatan:</strong> Beberapa item stok tidak mencukupi.
              Konfirmasi akan gagal jika stok kurang dari qty DO.
            </p>
          </div>
        )}

        {/* ── Items Table ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">
            Daftar Item ({do_.items.length} item)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {[
                    '#', 'Item', 'Qty DO', 'UoM',
                    isConfirmedOrDelivered ? 'Qty Keluar' : 'Stok Tersedia',
                    'Status Stok',
                  ].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {do_.items.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada item</td></tr>
                ) : do_.items.map((item, i) => {
                  const enough = item.currentStock >= item.qty;
                  const partial = item.currentStock > 0 && item.currentStock < item.qty;
                  const empty = item.currentStock === 0;

                  let stockBadge: React.ReactNode;
                  if (isConfirmedOrDelivered) {
                    stockBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-600 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Sudah Keluar
                      </span>
                    );
                  } else if (empty) {
                    stockBadge = <span className="inline-flex items-center text-[11px] font-600 bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Habis</span>;
                  } else if (partial) {
                    stockBadge = <span className="inline-flex items-center text-[11px] font-600 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Kurang</span>;
                  } else {
                    stockBadge = <span className="inline-flex items-center text-[11px] font-600 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Cukup</span>;
                  }

                  return (
                    <tr key={item.id} className={`border-b border-border transition-colors ${!isConfirmedOrDelivered && !enough ? 'bg-red-50/30' : 'hover:bg-muted/20'}`}>
                      <td className="erp-table-cell text-muted-foreground">{i + 1}</td>
                      <td className="erp-table-cell">
                        <p className="font-500">{item.itemName}</p>
                        {item.sku && <p className="text-xs text-muted-foreground mt-0.5">{item.sku}</p>}
                      </td>
                      <td className="erp-table-cell font-tabular font-700">{item.qty.toLocaleString('id-ID')}</td>
                      <td className="erp-table-cell text-muted-foreground">{item.uom}</td>
                      <td className={`erp-table-cell font-tabular font-600 ${!isConfirmedOrDelivered && !enough ? 'text-red-600' : ''}`}>
                        {isConfirmedOrDelivered ? item.qty.toLocaleString('id-ID') : item.currentStock.toLocaleString('id-ID')}
                      </td>
                      <td className="erp-table-cell">{stockBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmedAction}
        title={confirmAction ? CONFIRM_COPY[confirmAction].title : ''}
        description={confirmAction ? CONFIRM_COPY[confirmAction].description : ''}
        confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction].confirmLabel : ''}
        variant={confirmAction ? CONFIRM_COPY[confirmAction].variant : 'default'}
        loading={actioning}
      />
    </AppLayout>
  );
}
