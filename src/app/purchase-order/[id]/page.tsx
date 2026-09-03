'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ERPModal from '@/components/ui/ERPModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import CreateSupplierInvoiceModal from '../components/CreateSupplierInvoiceModal';
import { formatRp, formatDate } from '@/lib/format';
import { CheckCircle2, CreditCard, FileCheck } from 'lucide-react';
import {
  getPODetail,
  updatePOStatus,
  receiveGoods,
  recordPOPayment,
  PurchaseOrderDetail,
  POItem,
  RecordPOPaymentRequest,
} from '@/services/purchase.service';
import { PurchaseOrderStatus } from '@/types';

const PAYMENT_METHODS = ['Transfer', 'Tunai', 'Giro', 'Cek'];

const methodBadge: Record<string, string> = {
  Transfer: 'bg-blue-100 text-blue-700',
  Tunai:    'bg-green-100 text-green-700',
  Giro:     'bg-gray-100 text-gray-600',
  Cek:      'bg-gray-100 text-gray-600',
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id     = params.id as string;

  const [po, setPo]           = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Receive modal
  const [receiveModal, setReceiveModal]   = useState(false);
  const [receiveQtys, setReceiveQtys]     = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes]   = useState('');
  const [receiving, setReceiving]         = useState(false);

  // Create Supplier Invoice modal
  const [siModal, setSiModal]           = useState(false);

  // Payment modal
  const [payModal, setPayModal]         = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm]   = useState<RecordPOPaymentRequest>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'Transfer',
    reference: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPODetail(id);
      setPo(data);
    } catch {
      toast.error('Gagal memuat detail Purchase Order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmOrder = async () => {
    if (!po) return;
    setSaving(true);
    try {
      await updatePOStatus(po.id, 'Ordered');
      toast.success('PO dikonfirmasi ke Ordered');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengkonfirmasi PO');
    } finally {
      setSaving(false);
    }
  };

  const openReceiveModal = () => {
    if (!po) return;
    const initial: Record<string, number> = {};
    po.items.forEach((item) => {
      const sisa = item.qty - item.receivedQty;
      if (sisa > 0) initial[item.id] = sisa;
    });
    setReceiveQtys(initial);
    setReceiveNotes('');
    setReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!po) return;
    const items = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, receivedQty]) => ({ itemId, receivedQty }));

    if (items.length === 0) { toast.error('Masukkan minimal 1 item dengan qty > 0'); return; }

    setReceiving(true);
    try {
      await receiveGoods(po.id, { items, notes: receiveNotes || undefined });
      toast.success('Penerimaan barang berhasil dicatat');
      setReceiveModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat penerimaan barang');
    } finally {
      setReceiving(false);
    }
  };

  const openPayModal = () => {
    if (!po) return;
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: po.balance ?? po.total,
      method: 'Transfer',
      reference: '',
      notes: '',
    });
    setPayModal(true);
  };

  const handleRecordPayment = async () => {
    if (!po) return;
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error('Jumlah pembayaran harus lebih dari 0');
      return;
    }
    setPaymentLoading(true);
    try {
      await recordPOPayment(po.id, {
        paymentDate: paymentForm.paymentDate,
        amount:      Number(paymentForm.amount),
        method:      paymentForm.method,
        reference:   paymentForm.reference || undefined,
        notes:       paymentForm.notes || undefined,
      });
      toast.success('Pembayaran berhasil dicatat');
      setPayModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  const canReceive   = po?.status === 'Ordered' || po?.status === 'Partial Receive';
  const canInvoice   = po?.status === 'Partial Receive' || po?.status === 'Completed';
  const pendingItems = (po?.items ?? []).filter((item) => item.qty - item.receivedQty > 0);
  const balance      = po?.balance ?? po?.total ?? 0;
  const canPay       = po && po.status !== 'Draft' && po.status !== 'Cancelled' && balance > 0;

  if (loading) {
    return (
      <AppLayout title="Purchase Order Detail" breadcrumbs={[{ label: 'Purchasing' }, { label: 'Purchase Order', href: '/purchase-order' }, { label: '...' }]}>
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!po) {
    return (
      <AppLayout title="Purchase Order Detail" breadcrumbs={[{ label: 'Purchasing' }, { label: 'Purchase Order', href: '/purchase-order' }, { label: 'Tidak ditemukan' }]}>
        <div className="text-center py-20 text-muted-foreground text-sm">Purchase Order tidak ditemukan.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`PO ${po.no}`}
      breadcrumbs={[{ label: 'Purchasing' }, { label: 'Purchase Order', href: '/purchase-order' }, { label: po.no }]}
    >
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{po.no}</h1>
              <StatusBadge status={po.status as PurchaseOrderStatus} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {po.status === 'Draft' && (
                <button className="btn-primary flex items-center gap-1.5" onClick={handleConfirmOrder} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Konfirmasi Order'}
                </button>
              )}
              {canReceive && (
                <button className="btn-primary flex items-center gap-1.5" onClick={openReceiveModal} disabled={pendingItems.length === 0}>
                  {po.status === 'Partial Receive' ? 'Terima Barang Lanjutan' : 'Terima Barang'}
                </button>
              )}
              {canInvoice && (
                <button
                  className="btn-secondary flex items-center gap-1.5"
                  onClick={() => setSiModal(true)}
                >
                  <FileCheck size={14} /> Buat Supplier Invoice
                </button>
              )}
              {canPay && (
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  onClick={openPayModal}
                >
                  <CreditCard size={14} /> Catat Pembayaran
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Informasi Order</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Supplier', po.supplierName],
                ['Tanggal PO', formatDate(po.date)],
                ['Delivery Date', po.deliveryDate ? formatDate(po.deliveryDate) : '—'],
                ['Catatan', po.notes || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-36 text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="font-500 text-foreground break-words">{val}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Ref PR</dt>
                <dd className="font-500">
                  {po.purchaseRequestId ? (
                    <Link href={`/purchase-request/${po.purchaseRequestId}`} className="text-primary hover:underline">
                      {po.purchaseRequestNo}
                    </Link>
                  ) : <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            </dl>
          </div>

          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Ringkasan</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Status</dt>
                <dd><StatusBadge status={po.status as PurchaseOrderStatus} size="sm" /></dd>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Total PO</dt>
                <dd className="font-800 font-tabular text-lg text-primary">{formatRp(po.total)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Terbayar</dt>
                <dd className="font-600 font-tabular text-emerald-600">{formatRp(po.totalPaid ?? 0)}</dd>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <dt className="w-28 text-muted-foreground flex-shrink-0">Sisa Hutang</dt>
                <dd className={`font-800 font-tabular text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {balance > 0 ? formatRp(balance) : 'Lunas ✓'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">Daftar Item</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['#', 'Nama Item', 'Qty Pesan', 'Diterima', 'Sisa', 'Unit', 'Harga/Unit', 'Total'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.items.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada item</td></tr>
                ) : po.items.map((item, i) => {
                  const sisa = item.qty - item.receivedQty;
                  const pct  = item.qty > 0 ? (item.receivedQty / item.qty) * 100 : 0;
                  const isFull    = sisa === 0;
                  const isPartial = !isFull && item.receivedQty > 0;
                  const barColor  = isFull ? 'bg-green-500' : isPartial ? 'bg-amber-400' : 'bg-gray-200';
                  return (
                    <tr key={item.id} className={`border-b border-border transition-colors ${isFull ? 'text-gray-400' : isPartial ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-muted/20'}`}>
                      <td className="erp-table-cell">{i + 1}</td>
                      <td className="erp-table-cell min-w-[160px]">
                        <p className={`font-500 ${isFull ? '' : 'text-foreground'}`}>{item.itemName}</p>
                        <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="erp-table-cell font-tabular">{item.qty}</td>
                      <td className="erp-table-cell font-tabular text-green-600">{item.receivedQty}</td>
                      <td className="erp-table-cell font-tabular">
                        {isFull ? <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={13} /> 0</span>
                          : <span className={isPartial ? 'text-amber-600 font-600' : ''}>{sisa}</span>}
                      </td>
                      <td className="erp-table-cell text-muted-foreground">{item.unit}</td>
                      <td className="erp-table-cell font-tabular text-right">{formatRp(item.price)}</td>
                      <td className="erp-table-cell font-tabular font-700 text-right">{formatRp(item.qty * item.price)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={7} className="erp-table-cell text-right font-700 text-base py-2.5">Grand Total</td>
                  <td className="erp-table-cell text-right font-tabular font-800 text-base text-primary">{formatRp(po.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Riwayat Pembayaran ── */}
        {po.payments && po.payments.length > 0 && (
          <div className="erp-card">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Riwayat Pembayaran</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-600 text-muted-foreground">
                {po.payments.length} transaksi
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal', 'Metode', 'Referensi', 'Catatan', 'Jumlah'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                      <td className="erp-table-cell">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-600 ${methodBadge[p.method] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="erp-table-cell text-muted-foreground">{p.reference || '—'}</td>
                      <td className="erp-table-cell text-muted-foreground max-w-[160px] truncate">{p.notes || '—'}</td>
                      <td className="erp-table-cell font-700 font-tabular text-emerald-600 text-right">{formatRp(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={4} className="erp-table-cell text-right font-600 text-[13px]">Total Terbayar</td>
                    <td className="erp-table-cell font-800 font-tabular text-emerald-600 text-right">{formatRp(po.totalPaid ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Terima Barang ── */}
      <ERPModal isOpen={receiveModal} onClose={() => setReceiveModal(false)} title="Terima Barang" subtitle={po.no} size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setReceiveModal(false)} disabled={receiving}>Batal</button>
            <button className="btn-primary" onClick={handleReceive} disabled={receiving}>
              {receiving ? 'Menyimpan...' : 'Catat Penerimaan'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Masukkan jumlah barang yang diterima untuk setiap item.</p>
          {pendingItems.map((item: POItem) => {
            const sisa = item.qty - item.receivedQty;
            return (
              <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                <div>
                  <p className="font-500 text-sm text-foreground">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sisa: {sisa} {item.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-32 flex-shrink-0">Qty diterima</label>
                  <input
                    type="number" min={0} max={sisa}
                    value={receiveQtys[item.id] ?? sisa}
                    onChange={(e) => {
                      const val = Math.min(sisa, Math.max(0, Number(e.target.value)));
                      setReceiveQtys((prev) => ({ ...prev, [item.id]: val }));
                    }}
                    className="erp-input w-28 font-tabular"
                  />
                  <span className="text-xs text-muted-foreground">{item.unit}</span>
                </div>
              </div>
            );
          })}
          <div>
            <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
            <textarea className="erp-input resize-none" rows={2} value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Catatan penerimaan barang..." />
          </div>
        </div>
      </ERPModal>

      {/* ── Modal Buat Supplier Invoice ── */}
      <CreateSupplierInvoiceModal
        isOpen={siModal}
        onClose={() => setSiModal(false)}
        po={po}
        onCreated={load}
      />

      {/* ── Modal Catat Pembayaran ── */}
      <ERPModal isOpen={payModal} onClose={() => setPayModal(false)} title="Catat Pembayaran PO" subtitle={po.no} size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayModal(false)} disabled={paymentLoading}>Batal</button>
            <button className="btn-primary" onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa Hutang</span>
              <span className="font-700 text-red-600">{formatRp(balance)}</span>
            </div>
          </div>
          <div>
            <label className="erp-form-label">Tanggal Pembayaran <span className="text-red-500">*</span></label>
            <input type="date" className="erp-input" value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          </div>
          <div>
            <label className="erp-form-label">Jumlah <span className="text-red-500">*</span></label>
            <CurrencyInput
              placeholder={String(balance)}
              value={paymentForm.amount || 0}
              onChange={(v) => setPaymentForm((f) => ({ ...f, amount: v }))}
            />
          </div>
          <div>
            <label className="erp-form-label">Metode <span className="text-red-500">*</span></label>
            <select className="erp-input" value={paymentForm.method}
              onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="erp-form-label">Referensi</label>
            <input type="text" className="erp-input" placeholder="No. transfer / cek / giro"
              value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} />
          </div>
          <div>
            <label className="erp-form-label">Catatan</label>
            <textarea className="erp-input resize-none" rows={2}
              value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </ERPModal>
    </AppLayout>
  );
}
