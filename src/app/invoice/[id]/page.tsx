'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ERPModal from '@/components/ui/ERPModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import WorkflowStepper from '@/components/ui/WorkflowStepper';
import { formatRp, formatDate } from '@/lib/format';
import { AlertTriangle, CreditCard, DollarSign } from 'lucide-react';
import {
  getInvoiceDetail,
  recordPayment,
  applyDownPaymentToInvoice,
  InvoiceDetail,
  RecordPaymentRequest,
} from '@/services/invoice.service';
import { getSalesOrderDownPayments, SalesOrderPaymentRecord } from '@/services/salesorder.service';
import { InvoiceStatus } from '@/types';

const PAYMENT_METHODS = ['Transfer', 'Tunai', 'Giro', 'Cek'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const methodBadge: Record<string, string> = {
  Transfer: 'bg-blue-100 text-blue-700',
  Tunai:    'bg-green-100 text-green-700',
  Giro:     'bg-gray-100 text-gray-600',
  Cek:      'bg-gray-100 text-gray-600',
};

// ── Stepper ───────────────────────────────────────────────────────────────────

const INVOICE_STEPS = [
  { label: 'Draft' },
  { label: 'Terkirim' },
  { label: 'Dibayar Sebagian' },
  { label: 'Lunas' },
];

// A background job flips status straight to "Overdue" once past due date, overwriting whether it
// was Sent or Partial Paid before — so Overdue can't be mapped to a fixed step. Use `paid` instead
// to tell those two apart; the aging alert already surfaces the lateness itself.
function invoiceStepIndex(status: string, paid: number): number {
  if (status === 'Draft') return 0;
  if (status === 'Paid') return 3;
  return paid > 0 ? 2 : 1;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState<{
    paymentDate: string;
    amount: string;
    method: string;
    reference: string;
    notes: string;
  }>({
    paymentDate: todayIso(),
    amount: '',
    method: 'Transfer',
    reference: '',
    notes: '',
  });
  const [paying, setPaying] = useState(false);

  // Down Payment
  const [availableDps, setAvailableDps]   = useState<SalesOrderPaymentRecord[]>([]);
  const [loadingDps, setLoadingDps]       = useState(false);
  const [applyDpModal, setApplyDpModal]   = useState(false);
  const [applyDpForm, setApplyDpForm]     = useState<{ salesOrderPaymentId: string; amount: string }>({
    salesOrderPaymentId: '', amount: '',
  });
  const [applyingDp, setApplyingDp]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoiceDetail(id);
      setInv(data);
    } catch {
      toast.error('Gagal memuat detail invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!inv?.salesOrderId) { setAvailableDps([]); return; }
    setLoadingDps(true);
    getSalesOrderDownPayments(inv.salesOrderId)
      .then((dps) => setAvailableDps(dps.filter((dp) => dp.remaining > 0)))
      .catch(() => setAvailableDps([]))
      .finally(() => setLoadingDps(false));
  }, [inv?.salesOrderId]);

  const totalDpAvailable = availableDps.reduce((s, dp) => s + dp.remaining, 0);

  const openApplyDpModal = () => {
    if (availableDps.length === 0) return;
    setApplyDpForm({ salesOrderPaymentId: availableDps[0].id, amount: '' });
    setApplyDpModal(true);
  };

  const handleApplyDp = async () => {
    if (!inv) return;
    const selected = availableDps.find((dp) => dp.id === applyDpForm.salesOrderPaymentId);
    if (!selected) return;
    const amount = parseFloat(applyDpForm.amount);
    if (!applyDpForm.amount || isNaN(amount) || amount <= 0) {
      toast.error('Jumlah yang diterapkan wajib diisi dan harus lebih dari 0');
      return;
    }
    const cap = Math.min(selected.remaining, inv.balance);
    if (amount > cap) {
      toast.error(`Jumlah melebihi batas (sisa DP: ${formatRp(selected.remaining)}, sisa tagihan: ${formatRp(inv.balance)})`);
      return;
    }
    setApplyingDp(true);
    try {
      await applyDownPaymentToInvoice(inv.id, {
        salesOrderPaymentId: selected.id,
        amountToApply: amount,
      });
      toast.success('Down Payment berhasil diterapkan ke Invoice');
      setApplyDpModal(false);
      load();
      if (inv.salesOrderId) getSalesOrderDownPayments(inv.salesOrderId).then((dps) => setAvailableDps(dps.filter((dp) => dp.remaining > 0)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menerapkan Down Payment');
    } finally {
      setApplyingDp(false);
    }
  };

  const openPayModal = () => {
    if (!inv) return;
    setPayForm({ paymentDate: todayIso(), amount: '', method: 'Transfer', reference: '', notes: '' });
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!inv) return;
    const amount = parseFloat(payForm.amount);
    if (!payForm.amount || isNaN(amount) || amount <= 0) {
      toast.error('Jumlah pembayaran wajib diisi dan harus lebih dari 0');
      return;
    }
    if (amount > inv.balance) {
      toast.error(`Jumlah melebihi sisa tagihan (${formatRp(inv.balance)})`);
      return;
    }
    setPaying(true);
    try {
      const req: RecordPaymentRequest = {
        paymentDate: payForm.paymentDate,
        amount,
        method: payForm.method,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      };
      await recordPayment(inv.id, req);
      toast.success('Pembayaran berhasil dicatat');
      setPayModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat pembayaran');
    } finally {
      setPaying(false);
    }
  };

  const canPay = inv && inv.status !== 'Paid' && inv.status !== 'Draft';
  const payDisabledReason = inv?.status === 'Paid'
    ? 'Invoice sudah lunas'
    : inv?.status === 'Draft'
    ? 'Kirim invoice dulu'
    : undefined;

  if (loading) {
    return (
      <AppLayout
        title="Invoice Detail"
        breadcrumbs={[{ label: 'Sales' }, { label: 'Invoice', href: '/invoice' }, { label: '...' }]}
      >
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!inv) {
    return (
      <AppLayout
        title="Invoice Detail"
        breadcrumbs={[{ label: 'Sales' }, { label: 'Invoice', href: '/invoice' }, { label: 'Tidak ditemukan' }]}
      >
        <div className="text-center py-20 text-muted-foreground text-sm">Invoice tidak ditemukan.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Invoice ${inv.no}`}
      breadcrumbs={[
        { label: 'Sales' },
        { label: 'Invoice', href: '/invoice' },
        { label: inv.no },
      ]}
    >
      <div className="space-y-6">

        {/* ── Workflow Progress ── */}
        <WorkflowStepper
          title="Progress Invoice"
          steps={INVOICE_STEPS}
          currentStep={invoiceStepIndex(inv.status, inv.paid)}
        />

        {/* ── Header ── */}
        <div className="erp-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{inv.no}</h1>
                <StatusBadge status={inv.status as InvoiceStatus} />
              </div>
              {/* Aging Alert */}
              {inv.agingDays > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>Terlambat <strong>{inv.agingDays} hari</strong> sejak jatuh tempo</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`btn-primary flex items-center gap-1.5 ${!canPay ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={payDisabledReason}
                onClick={() => canPay && openPayModal()}
                disabled={!canPay}
              >
                <CreditCard size={14} /> Record Payment
              </button>
              <button className="btn-secondary opacity-50 cursor-not-allowed" title="Segera hadir" disabled>
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Kepada */}
          <div className="erp-card space-y-3">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Kepada</h3>
            <div>
              <p className="font-semibold text-lg text-foreground">{inv.customerName}</p>
              {inv.customerAddress && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{inv.customerAddress}</p>
              )}
              {inv.customerNpwp && (
                <p className="text-sm text-muted-foreground mt-1">NPWP: {inv.customerNpwp}</p>
              )}
            </div>
          </div>

          {/* Detail Dokumen */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Detail Dokumen</h3>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ['Invoice Date', formatDate(inv.invoiceDate)],
                  ['Due Date', formatDate(inv.dueDate)],
                  ['Terms', inv.terms || '—'],
                  ['Ref SO', inv.salesOrderNo || '—'],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-28 text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="font-500 text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Line Items ── */}
        {inv.items && inv.items.length > 0 && (
          <div className="erp-card overflow-hidden p-0">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider px-5 pt-4 pb-3 border-b border-border">
              Item
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Deskripsi</th>
                    <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider w-20">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider w-16">UoM</th>
                    <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider w-36">Harga Satuan</th>
                    <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider w-36">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inv.items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="px-4 py-3 text-muted-foreground text-[13px]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-500 text-[13px] text-foreground">{item.description}</div>
                        {item.sku && (
                          <div className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-tabular text-foreground">
                        {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{item.uom}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-tabular text-foreground">{formatRp(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-700 font-tabular text-foreground">{formatRp(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            <div className="border-t border-border bg-muted/20 px-5 py-4">
              <div className="flex flex-col items-end gap-2 max-w-xs ml-auto text-[13px]">
                <div className="flex gap-8 w-full justify-between text-muted-foreground">
                  <span>Sub Total</span>
                  <span className="font-tabular">{formatRp(inv.subTotal)}</span>
                </div>
                <div className="flex gap-8 w-full justify-between text-muted-foreground">
                  <span>PPN (11%)</span>
                  <span className="font-tabular">{formatRp(inv.taxAmount)}</span>
                </div>
                <div className="flex gap-8 w-full justify-between font-700 text-foreground border-t border-border pt-2 mt-1">
                  <span>Grand Total</span>
                  <span className="font-tabular text-primary">{formatRp(inv.amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Down Payment tersedia ── */}
        {!loadingDps && totalDpAvailable > 0 && inv.balance > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
            <span>
              DP tersedia dari Sales Order ini: <strong>{formatRp(totalDpAvailable)}</strong>
            </span>
            <button
              onClick={openApplyDpModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-400 bg-white text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors font-600"
            >
              <DollarSign size={14} /> Terapkan DP ke Invoice ini
            </button>
          </div>
        )}

        {/* ── Payment Summary ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">Ringkasan Pembayaran</h3>
          <div className="max-w-sm ml-auto space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sub Total</span>
              <span className="font-tabular">{formatRp(inv.subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PPN (11%)</span>
              <span className="font-tabular">{formatRp(inv.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-700">Grand Total</span>
              <span className="font-700 font-tabular">{formatRp(inv.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-tabular text-emerald-600">{formatRp(inv.paid)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-border pt-2">
              <span className="font-700 text-base">Sisa Tagihan</span>
              {inv.balance > 0 ? (
                <span className="font-800 font-tabular text-base text-red-600">{formatRp(inv.balance)}</span>
              ) : (
                <span className="font-700 font-tabular text-base text-green-600">Lunas ✓</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Riwayat Pembayaran ── */}
        <div className="erp-card">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Riwayat Pembayaran</h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-600 text-muted-foreground">
              {inv.payments.length} pembayaran
            </span>
          </div>

          {inv.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <DollarSign size={28} className="opacity-30" />
              <p className="text-sm">Belum ada pembayaran tercatat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal', 'Metode', 'Referensi', 'Jumlah'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="erp-table-cell text-muted-foreground">{formatDate(p.paymentDate)}</td>
                      <td className="erp-table-cell">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-600 ${methodBadge[p.method] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="erp-table-cell text-muted-foreground">{p.reference || '—'}</td>
                      <td className="erp-table-cell font-700 font-tabular text-emerald-600 text-right">{formatRp(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        {inv.notes && (
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Catatan</p>
            <p className="text-sm text-foreground whitespace-pre-line">{inv.notes}</p>
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      <ERPModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title="Record Pembayaran"
        subtitle={inv.no}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayModal(false)} disabled={paying}>Batal</button>
            <button className="btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa Tagihan</span>
              <span className="font-700 text-red-600">{formatRp(inv.balance)}</span>
            </div>
          </div>
          <div>
            <label className="erp-form-label">Tanggal Pembayaran<span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="date"
              className="erp-input"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="erp-form-label">Jumlah<span className="text-red-500 ml-0.5">*</span></label>
            <CurrencyInput
              placeholder={String(inv.balance)}
              value={Number(payForm.amount) || 0}
              onChange={(v) => setPayForm((f) => ({ ...f, amount: v ? String(v) : '' }))}
            />
          </div>
          <div>
            <label className="erp-form-label">Metode<span className="text-red-500 ml-0.5">*</span></label>
            <select
              className="erp-input"
              value={payForm.method}
              onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="erp-form-label">Referensi</label>
            <input
              type="text"
              className="erp-input"
              placeholder="No. transfer / cek / giro"
              value={payForm.reference}
              onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
            />
          </div>
          <div>
            <label className="erp-form-label">Catatan</label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              value={payForm.notes}
              onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </ERPModal>

      {/* ── Terapkan Down Payment Modal ── */}
      <ERPModal
        isOpen={applyDpModal}
        onClose={() => setApplyDpModal(false)}
        title="Terapkan Down Payment"
        subtitle={inv.no}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setApplyDpModal(false)} disabled={applyingDp}>Batal</button>
            <button className="btn-primary" onClick={handleApplyDp} disabled={applyingDp}>
              {applyingDp ? 'Menerapkan...' : 'Terapkan DP'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa Tagihan Invoice</span>
              <span className="font-700 text-red-600">{formatRp(inv.balance)}</span>
            </div>
          </div>
          <div>
            <label className="erp-form-label">Pilih Down Payment<span className="text-red-500 ml-0.5">*</span></label>
            <select
              className="erp-input"
              value={applyDpForm.salesOrderPaymentId}
              onChange={(e) => setApplyDpForm((f) => ({ ...f, salesOrderPaymentId: e.target.value }))}
            >
              {availableDps.map((dp) => (
                <option key={dp.id} value={dp.id}>
                  {formatDate(dp.paymentDate)} — Sisa {formatRp(dp.remaining)} ({dp.method})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="erp-form-label">Jumlah yang Diterapkan<span className="text-red-500 ml-0.5">*</span></label>
            <CurrencyInput
              value={Number(applyDpForm.amount) || 0}
              onChange={(v) => setApplyDpForm((f) => ({ ...f, amount: v ? String(v) : '' }))}
            />
            {(() => {
              const selected = availableDps.find((dp) => dp.id === applyDpForm.salesOrderPaymentId);
              if (!selected) return null;
              const cap = Math.min(selected.remaining, inv.balance);
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  Maksimum: {formatRp(cap)} (dibatasi sisa DP dan sisa tagihan Invoice)
                </p>
              );
            })()}
          </div>
        </div>
      </ERPModal>
    </AppLayout>
  );
}
