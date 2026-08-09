'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import {
  ShoppingCart, Truck, CheckCircle2, XCircle, FileText,
  Receipt, AlertCircle, Info, Clock, Eye,
} from 'lucide-react';
import { getSalesOrderDetail, SalesOrderDetail, salesOrderService } from '@/services/salesorder.service';
import { generatePRFromSO, getPOList, PurchaseOrderListItem } from '@/services/purchase.service';
import { createDOFromSO, getDeliveryOrders, DeliveryOrderListItem } from '@/services/inventory.service';
import { invoiceService } from '@/services/invoice.service';
import { api } from '@/lib/api';
import { SalesOrderStatus } from '@/types';

// ── Local interfaces ──────────────────────────────────────────────────────────

interface RelatedInvoice {
  id: string;
  no: string;
  status: string;
  salesOrderNo?: string;
  salesOrderId?: string;
}

interface RelatedPR {
  id: string;
  no: string;
  status: string;
  salesOrderNo?: string;
  salesOrderId?: string;
  itemCount?: number;
}

// ── Workflow phase ────────────────────────────────────────────────────────────

type WorkflowPhase =
  | 'pr-needed'      // Open, no PR yet — must generate PR first
  | 'pr-processing'  // Open, PR exists but not yet Ordered (in approval flow)
  | 'gr-pending'     // Open, PR is Ordered, PO exists but GR not done
  | 'do-ready'       // Open, all GR done (or PR has 0 items)
  | 'invoice-ready'  // Delivered — ready to invoice
  | 'completed'
  | 'cancelled';

function computePhase(
  soStatus: string,
  relatedPRs: RelatedPR[],
  allLinkedPOsCompleted: boolean,
  hasLinkedPOs: boolean,
): WorkflowPhase {
  if (soStatus === 'Cancelled') return 'cancelled';
  if (soStatus === 'Completed') return 'completed';
  if (soStatus === 'Delivered') return 'invoice-ready';
  if (soStatus === 'Open') {
    if (relatedPRs.length === 0) return 'pr-needed';
    const pr = relatedPRs[0];
    const prHasItems = (pr.itemCount ?? 1) > 0;
    const prFullyDone = ['Selesai', 'Completed'].includes(pr.status)
      || (pr.status === 'Ordered' && allLinkedPOsCompleted);
    if (prHasItems && !prFullyDone) {
      // PR is Ordered and PO(s) exist but GR not yet completed
      if (pr.status === 'Ordered' && hasLinkedPOs) return 'gr-pending';
      return 'pr-processing';
    }
    return 'do-ready';
  }
  return 'do-ready';
}

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'SO Open' },
  { label: 'Generate PR' },
  { label: 'Proses GR' },
  { label: 'Delivery' },
  { label: 'Invoice' },
  { label: 'Selesai' },
];

const PHASE_STEP: Record<WorkflowPhase, number> = {
  'pr-needed':     1,
  'pr-processing': 2,
  'gr-pending':    2,
  'do-ready':      3,
  'invoice-ready': 4,
  'completed':     6,
  'cancelled':    -1,
};

function WorkflowStepper({ phase }: { phase: WorkflowPhase }) {
  if (phase === 'cancelled') {
    return (
      <div className="erp-card flex items-center gap-2 text-sm text-red-600 border border-red-200 bg-red-50">
        <XCircle size={15} />
        <span className="font-600">Sales Order telah dibatalkan</span>
      </div>
    );
  }

  const currentStep = PHASE_STEP[phase];

  return (
    <div className="erp-card">
      <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-3">Progress SO</p>
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const done    = idx < currentStep;
          const active  = idx === currentStep;
          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center shrink-0">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 transition-all',
                  done   ? 'bg-green-500 text-white' :
                  active ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-1' :
                           'bg-muted text-muted-foreground',
                ].join(' ')}>
                  {done ? '✓' : idx + 1}
                </div>
                <span className={[
                  'text-[10px] mt-1 text-center leading-tight whitespace-nowrap',
                  done   ? 'text-green-600 font-500' :
                  active ? 'text-primary font-600' :
                           'text-muted-foreground',
                ].join(' ')}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={[
                  'flex-1 h-0.5 mx-1 mb-4',
                  idx < currentStep ? 'bg-green-400' : 'bg-muted',
                ].join(' ')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Contextual banner ─────────────────────────────────────────────────────────

function WorkflowBanner({
  phase, prHasItems, firstLinkedPOId,
}: {
  phase: WorkflowPhase;
  prHasItems: boolean;
  firstLinkedPOId?: string;
}) {
  type BannerCfg = { icon: React.ReactNode; cls: string; msg: string; poLink?: string };
  const cfgs: Partial<Record<WorkflowPhase, BannerCfg>> = {
    'pr-needed': {
      icon: <AlertCircle size={15} className="shrink-0 mt-0.5" />,
      cls:  'bg-blue-50 border-blue-200 text-blue-800',
      msg:  'Langkah wajib: Generate Purchase Request terlebih dahulu sebelum bisa membuat Delivery Order.',
    },
    'pr-processing': {
      icon: <Clock size={15} className="shrink-0 mt-0.5" />,
      cls:  'bg-amber-50 border-amber-200 text-amber-800',
      msg:  'PR sedang diproses. Selesaikan alur PR → Approval → PO terlebih dahulu sebelum bisa membuat DO.',
    },
    'gr-pending': {
      icon: <Clock size={15} className="shrink-0 mt-0.5" />,
      cls:  'bg-orange-50 border-orange-200 text-orange-800',
      msg:  'PO sudah dibuat. Selesaikan proses penerimaan barang (Goods Receipt) di halaman PO sebelum melanjutkan ke Delivery.',
      poLink: firstLinkedPOId,
    },
    'do-ready': {
      icon: <Info size={15} className="shrink-0 mt-0.5" />,
      cls:  'bg-green-50 border-green-200 text-green-800',
      msg:  prHasItems
        ? 'GR selesai — material siap. Buat Delivery Order untuk pengiriman ke customer.'
        : 'Material tersedia di stok. Buat Delivery Order (jika ada pengiriman fisik) atau langsung Buat Invoice (jika proyek jasa murni).',
    },
    'invoice-ready': {
      icon: <Receipt size={15} className="shrink-0 mt-0.5" />,
      cls:  'bg-purple-50 border-purple-200 text-purple-800',
      msg:  'SO sudah dikirim. Buat Invoice untuk penagihan ke customer.',
    },
  };

  const cfg = cfgs[phase];
  if (!cfg) return null;

  return (
    <div className={`flex items-start gap-2.5 text-sm px-4 py-3 border rounded-lg ${cfg.cls}`}>
      {cfg.icon}
      <span>
        {cfg.msg}
        {cfg.poLink && (
          <Link href={`/purchase-order/${cfg.poLink}`} className="ml-2 font-600 underline hover:no-underline whitespace-nowrap">
            Lihat PO →
          </Link>
        )}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDecimal(value: number): string {
  return parseFloat(value.toFixed(4)).toString();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params.id as string;

  const [so, setSo]                         = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [generatingPR, setGeneratingPR]     = useState(false);
  const [creatingDO, setCreatingDO]         = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal]     = useState(false);
  const [confirmAction, setConfirmAction]   = useState<{
    title: string; description: string; status: string;
    confirmLabel: string; variant?: 'danger' | 'default';
  } | null>(null);

  // Invoice modal
  const [invoiceModal, setInvoiceModal]         = useState(false);
  const [invoiceDate, setInvoiceDate]           = useState('');
  const [invoiceDueDate, setInvoiceDueDate]     = useState('');
  const [invoiceNomorFakturPajak, setInvoiceNomorFakturPajak] = useState('');
  const [creatingInvoice, setCreatingInvoice]   = useState(false);

  // PDF export
  const [exportingPdf, setExportingPdf]         = useState(false);
  const [showPreview, setShowPreview]           = useState(false);

  // Related docs
  const [relatedDOs,      setRelatedDOs]      = useState<DeliveryOrderListItem[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<RelatedInvoice[]>([]);
  const [relatedPRs,      setRelatedPRs]      = useState<RelatedPR[]>([]);
  const [relatedPOs,      setRelatedPOs]      = useState<PurchaseOrderListItem[]>([]);
  const [linkedPOsDone,   setLinkedPOsDone]   = useState(false);
  const [loadingRelated,  setLoadingRelated]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSalesOrderDetail(id);
      setSo(data);
    } catch {
      toast.error('Gagal memuat detail Sales Order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!so) return;
    fetchRelatedDocuments(so.id, so.no);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [so?.id]);

  // Pre-fill invoice dates when modal opens
  useEffect(() => {
    if (invoiceModal) {
      const t = todayStr();
      setInvoiceDate(t);
      setInvoiceDueDate(addDays(t, 30));
      setInvoiceNomorFakturPajak('');
    }
  }, [invoiceModal]);

  async function fetchRelatedDocuments(soId: string, soNo: string) {
    setLoadingRelated(true);
    try {
      const [dosRes, invoicesRes, prsRes, posRes] = await Promise.allSettled([
        getDeliveryOrders({ perPage: 200 }),
        api.get<{ data: RelatedInvoice[] }>('/invoices?perPage=200'),
        api.get<{ data: RelatedPR[] }>('/purchase-requests?perPage=200'),
        getPOList({ perPage: 200 }),
      ]);

      if (dosRes.status === 'fulfilled')
        setRelatedDOs(dosRes.value.filter((d) => d.salesOrderNo === soNo));

      if (invoicesRes.status === 'fulfilled') {
        const all = (invoicesRes.value.data as unknown as { data?: RelatedInvoice[] })?.data
          ?? (invoicesRes.value.data as unknown as RelatedInvoice[]) ?? [];
        setRelatedInvoices(all.filter((inv) => inv.salesOrderNo === soNo || inv.salesOrderId === soId));
      }

      let linkedPRIds: string[] = [];
      if (prsRes.status === 'fulfilled') {
        const all = (prsRes.value.data as unknown as { data?: RelatedPR[] })?.data
          ?? (prsRes.value.data as unknown as RelatedPR[]) ?? [];
        const filtered = all.filter((pr) => pr.salesOrderNo === soNo || pr.salesOrderId === soId);
        setRelatedPRs(filtered);
        linkedPRIds = filtered.map((pr) => pr.id);
      }

      // Check linked POs and whether all GR are done
      if (posRes.status === 'fulfilled' && linkedPRIds.length > 0) {
        const linkedPOs = posRes.value.data.filter(
          (po) => po.purchaseRequestId && linkedPRIds.includes(po.purchaseRequestId),
        );
        setRelatedPOs(linkedPOs);
        const allDone = linkedPOs.length > 0 && linkedPOs.every((po) => po.status === 'Completed');
        setLinkedPOsDone(allDone);
      }
    } catch {
      // silent
    } finally {
      setLoadingRelated(false);
    }
  }

  const triggerStatusChange = (
    title: string, description: string, status: string,
    confirmLabel: string, variant: 'danger' | 'default' = 'default',
  ) => {
    setConfirmAction({ title, description, status, confirmLabel, variant });
    setConfirmModal(true);
  };

  const handleConfirmStatus = async () => {
    if (!so || !confirmAction) return;
    setSaving(true);
    try {
      await salesOrderService.updateStatus(so.id, confirmAction.status as SalesOrderStatus);
      toast.success(`SO berhasil diubah ke ${confirmAction.status}`);
      setConfirmModal(false);
      setConfirmAction(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah status');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePR = async () => {
    if (!so) return;
    setGeneratingPR(true);
    try {
      const pr = await generatePRFromSO(so.id);
      toast.success(`Purchase Request ${pr.no} berhasil dibuat`);
      router.push(`/purchase-request/${pr.id}`);
    } catch (e: unknown) {
      const httpStatus = (e as { status?: number }).status;
      if (httpStatus === 409) {
        // PR already exists for this SO — redirect to it instead of creating a duplicate
        const existing = relatedPRs[0];
        if (existing) {
          toast.info(`PR sudah ada untuk SO ini: ${existing.no}`);
          router.push(`/purchase-request/${existing.id}`);
        } else {
          toast.warning('PR sudah ada untuk SO ini. Cek tab Dokumen Terkait.');
        }
      } else {
        toast.error(e instanceof Error ? e.message : 'Gagal generate PR');
      }
    } finally {
      setGeneratingPR(false);
    }
  };

  const handleCreateDO = async () => {
    if (!so) return;
    setCreatingDO(true);
    try {
      const doResult = await createDOFromSO(so.id);
      toast.success(`Delivery Order ${doResult.no} berhasil dibuat`);
      router.push(`/stock-out/${doResult.id}`);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Gagal membuat DO');
    } finally {
      setCreatingDO(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!so || !invoiceDate || !invoiceDueDate) return;
    setCreatingInvoice(true);
    try {
      const res = await invoiceService.create({
        salesOrderId: so.id,
        customerId:   so.customerId,
        invoiceDate,
        dueDate:      invoiceDueDate,
        amount:       so.grandTotal,
        nomorFakturPajak: invoiceNomorFakturPajak.trim() || undefined,
      });
      toast.success(`Invoice ${res.data?.no} berhasil dibuat`);
      router.push(`/invoice/${res.data?.id}`);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Gagal membuat invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  async function handleExportPdf() {
    if (!so) return;
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('syntera_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${baseUrl}/sales-orders/${so.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengambil PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SO_${so.no}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal download PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  // ── Derived state ──

  const phase       = computePhase(so?.status ?? '', relatedPRs, linkedPOsDone, relatedPOs.length > 0);
  const firstPR     = relatedPRs[0];
  const prHasItems  = firstPR ? (firstPR.itemCount ?? 1) > 0 : false;
  const prZeroItems = firstPR ? firstPR.itemCount === 0 : false;

  // "Buat DO" shown disabled (blocked by GR) when PR has items but GR not done
  const buatDOBlocked     = phase === 'pr-processing' || phase === 'gr-pending';
  // "Buat Invoice" available on Delivered, or when PR has 0 items (pure service, skip DO)
  const canBuatInvoice    = so?.status === 'Delivered' || (phase === 'do-ready' && prZeroItems);

  // ── Loading/404 states ──

  if (loading) {
    return (
      <AppLayout title="Sales Order Detail" breadcrumbs={[
        { label: 'Sales' },
        { label: 'Sales Order', href: '/sales-order' }, { label: '...' },
      ]}>
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!so) {
    return (
      <AppLayout title="Sales Order Detail" breadcrumbs={[
        { label: 'Sales' },
        { label: 'Sales Order', href: '/sales-order' }, { label: 'Tidak ditemukan' },
      ]}>
        <div className="text-center py-20 text-muted-foreground text-sm">Sales Order tidak ditemukan.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`SO ${so.no}`}
      breadcrumbs={[
        { label: 'Sales' },
        { label: 'Sales Order', href: '/sales-order' }, { label: so.no },
      ]}
    >
      <div className="space-y-6">

        {/* ── Workflow Progress ── */}
        <WorkflowStepper phase={phase} />

        {/* ── Contextual Banner ── */}
        {(so.status === 'Open' || so.status === 'Delivered') && (
          <WorkflowBanner phase={phase} prHasItems={prHasItems} firstLinkedPOId={relatedPOs[0]?.id} />
        )}

        {/* ── Header Card ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{so.no}</h1>
              <StatusBadge status={so.status as SalesOrderStatus} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">

              {/* Draft: activate */}
              {so.status === 'Draft' && (
                <button
                  onClick={() => triggerStatusChange('Aktifkan Sales Order', `Aktifkan SO ${so.no} menjadi Open?`, 'Open', 'Aktifkan')}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-indigo-300 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors font-600"
                >
                  <CheckCircle2 size={14} /> Aktifkan SO
                </button>
              )}

              {/* Generate PR — hidden once a PR exists */}
              {relatedPRs.length === 0 && so.status === 'Open' && (
                <button
                  onClick={() => handleGeneratePR()}
                  disabled={generatingPR}
                  className="btn-primary flex items-center gap-1.5 disabled:opacity-50 text-sm"
                >
                  <ShoppingCart size={14} />
                  {generatingPR ? 'Membuat PR...' : 'Generate PR'}
                </button>
              )}

              {/* Buat DO — only when Open and no DO created yet */}
              {so.status === 'Open' && relatedDOs.length === 0 && (
                phase === 'do-ready' ? (
                  <button
                    onClick={handleCreateDO}
                    disabled={creatingDO}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50 disabled:opacity-50 transition-colors"
                  >
                    <Truck size={14} />
                    {creatingDO ? 'Membuat DO...' : 'Buat DO'}
                  </button>
                ) : buatDOBlocked ? (
                  <button
                    disabled
                    title="Tunggu hingga Goods Receipt selesai"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-muted text-muted-foreground rounded-md opacity-40 cursor-not-allowed"
                  >
                    <Truck size={14} /> Buat DO
                  </button>
                ) : null
              )}

              {/* Buat Invoice */}
              {canBuatInvoice && (
                <button
                  onClick={() => setInvoiceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 transition-colors font-600"
                >
                  <Receipt size={14} /> Buat Invoice
                </button>
              )}

              {/* Selesaikan SO (Delivered → Completed) */}
              {so.status === 'Delivered' && (
                <button
                  onClick={() => triggerStatusChange(
                    'Selesaikan Sales Order',
                    `Tandai SO ${so.no} sebagai Completed? Pastikan invoice sudah lunas.`,
                    'Completed', 'Selesaikan',
                  )}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-400 bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors font-600"
                >
                  <CheckCircle2 size={14} /> Selesaikan SO
                </button>
              )}

              {/* TODO: Tombol Batalkan di-disable sementara — aktifkan kembali jika diperlukan flow pembatalan SO */}
              {/* {(so.status === 'Open' || so.status === 'Delivered') && (
                <button
                  onClick={() => triggerStatusChange(
                    'Batalkan Sales Order',
                    `SO ${so.no} akan dibatalkan. Tindakan ini tidak dapat diurungkan.`,
                    'Cancelled', 'Batalkan SO', 'danger',
                  )}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={14} /> Batalkan
                </button>
              )} */}

              <button
                onClick={() => setShowPreview(true)}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Eye size={14} /> Preview
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={14} />
                {exportingPdf ? 'Mengunduh...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="erp-card space-y-3">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Kepada</h3>
            <div>
              <p className="font-semibold text-lg text-foreground">{so.customerName}</p>
              {so.customerAddress && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{so.customerAddress}</p>}
              {so.customerNpwp && <p className="text-sm text-muted-foreground mt-1">NPWP: {so.customerNpwp}</p>}
              {so.customerContactPerson && <p className="text-sm text-muted-foreground">Contact: {so.customerContactPerson}</p>}
            </div>
            {so.shipTo && (
              <>
                <hr className="border-border" />
                <p className="text-sm"><span className="font-semibold">Dikirim ke:</span> {so.shipTo}</p>
              </>
            )}
          </div>

          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Detail Dokumen</h3>
            <dl className="space-y-2 text-sm">
              {([
                ['Order Date',    formatDate(so.date)],
                ['Expected Date', so.expectedDate ? formatDate(so.expectedDate) : '—'],
                ['Terms',         so.terms || '—'],
                ['Salesperson',   so.salesName],
                ['Project',       so.projectName],
                ['Ref Quotation', so.refQuotation || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-32 text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="font-500 text-foreground break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">Item</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['#', 'Deskripsi', 'Qty', 'Qty Shipped', 'Qty Not Shipped', 'UoM', 'Harga Satuan', 'Amount'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {so.items.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Tidak ada item</td></tr>
                ) : so.items.map((item, i) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="erp-table-cell text-muted-foreground">{i + 1}</td>
                    <td className="erp-table-cell">
                      <p className="font-medium">{item.description}</p>
                      {item.sku && <p className="text-xs text-gray-400 mt-0.5">{item.sku}</p>}
                    </td>
                    <td className="erp-table-cell font-tabular">{formatDecimal(item.qty)}</td>
                    <td className="erp-table-cell font-tabular">{formatDecimal(item.qtyShipped)}</td>
                    <td className="erp-table-cell font-tabular">{formatDecimal(item.qtyNotShipped)}</td>
                    <td className="erp-table-cell text-muted-foreground">{item.uom}</td>
                    <td className="erp-table-cell font-tabular text-right">{formatRp(item.unitPrice)}</td>
                    <td className="erp-table-cell font-tabular text-right font-700">{formatRp(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td colSpan={7} className="erp-table-cell text-right text-muted-foreground font-500 py-2">Sub Total</td>
                  <td className="erp-table-cell text-right font-tabular font-600">{formatRp(so.subTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="erp-table-cell text-right text-muted-foreground font-500 py-2">PPN (11%)</td>
                  <td className="erp-table-cell text-right font-tabular font-600">{formatRp(so.taxAmount)}</td>
                </tr>
                <tr className="border-t-2 border-border">
                  <td colSpan={7} className="erp-table-cell text-right font-700 text-base py-2.5">Grand Total</td>
                  <td className="erp-table-cell text-right font-tabular font-800 text-base text-primary">{formatRp(so.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Dokumen Terkait ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-4">Dokumen Terkait</h3>
          {loadingRelated ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded w-24" />
                  <div className="h-3 bg-muted animate-pulse rounded w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Purchase Request */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-600 text-[13px] text-foreground">Purchase Request</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-600">{relatedPRs.length}</span>
                </div>
                {relatedPRs.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-2">Belum ada PR</p>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    {relatedPRs.map((pr) => (
                      <Link key={pr.id} href={`/purchase-request/${pr.id}`}
                        className="flex items-center justify-between text-[13px] hover:bg-muted/50 rounded p-1 -mx-1 transition-colors">
                        <div>
                          <span className="font-600 text-primary">{pr.no}</span>
                          {pr.itemCount !== undefined && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                              ({pr.itemCount} item)
                            </span>
                          )}
                        </div>
                        <StatusBadge status={pr.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
                {so.status === 'Open' && relatedPRs.length === 0 && (
                  <button onClick={() => handleGeneratePR()} disabled={generatingPR}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50 font-500">
                    {generatingPR ? 'Membuat...' : '+ Generate PR'}
                  </button>
                )}
              </div>

              {/* Delivery Orders */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-600 text-[13px] text-foreground">Delivery Order</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-600">{relatedDOs.length}</span>
                </div>
                {relatedDOs.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-2">Belum ada DO</p>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    {relatedDOs.map((d) => (
                      <Link key={d.id} href={`/stock-out/${d.id}`}
                        className="flex items-center justify-between text-[13px] hover:bg-muted/50 rounded p-1 -mx-1 transition-colors">
                        <span className="font-600 text-primary">{d.no}</span>
                        <StatusBadge status={d.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
                {so.status === 'Open' && relatedDOs.length === 0 && phase === 'do-ready' && (
                  <button onClick={handleCreateDO} disabled={creatingDO}
                    className="text-xs text-orange-600 hover:underline disabled:opacity-50 font-500">
                    {creatingDO ? 'Membuat...' : '+ Buat DO'}
                  </button>
                )}
              </div>

              {/* Invoice */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-600 text-[13px] text-foreground">Invoice</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-600">{relatedInvoices.length}</span>
                </div>
                {relatedInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-2">Belum ada Invoice</p>
                ) : (
                  <div className="space-y-1.5 mb-2">
                    {relatedInvoices.map((inv) => (
                      <Link key={inv.id} href={`/invoice/${inv.id}`}
                        className="flex items-center justify-between text-[13px] hover:bg-muted/50 rounded p-1 -mx-1 transition-colors">
                        <span className="font-600 text-primary">{inv.no}</span>
                        <StatusBadge status={inv.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
                {canBuatInvoice && (
                  <button onClick={() => setInvoiceModal(true)}
                    className="text-xs text-purple-600 hover:underline font-500">
                    + Buat Invoice
                  </button>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── Notes ── */}
        {so.notes && (
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Catatan</p>
            <p className="text-sm text-foreground whitespace-pre-line">{so.notes}</p>
          </div>
        )}

      </div>

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        isOpen={confirmModal}
        onClose={() => { setConfirmModal(false); setConfirmAction(null); }}
        onConfirm={handleConfirmStatus}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Konfirmasi'}
        loading={saving}
        variant={confirmAction?.variant}
      />

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-700 text-foreground">{so.no}</h3>
                <StatusBadge status={so.status as SalesOrderStatus} />
              </div>
              <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
              {/* 2-col info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">Kepada</p>
                  <p className="font-semibold text-foreground">{so.customerName}</p>
                  {so.customerAddress && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{so.customerAddress}</p>}
                  {so.customerNpwp && <p className="text-sm text-muted-foreground mt-1">NPWP: {so.customerNpwp}</p>}
                  {so.customerContactPerson && <p className="text-sm text-muted-foreground">Contact: {so.customerContactPerson}</p>}
                </div>
                <div>
                  <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">Detail Dokumen</p>
                  <dl className="space-y-1 text-sm">
                    {([
                      ['Tanggal', formatDate(so.date)],
                      ['Expected', so.expectedDate ? formatDate(so.expectedDate) : '—'],
                      ['Terms', so.terms || '—'],
                      ['Project', so.projectName],
                      ['Ref Quotation', so.refQuotation || '—'],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="w-28 text-muted-foreground flex-shrink-0">{label}</dt>
                        <dd className="font-500 text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted/40">
                      {['#', 'Deskripsi', 'Qty', 'UoM', 'Harga Satuan', 'Amount'].map((h) => (
                        <th key={h} className="border border-border px-3 py-2 text-left text-xs font-600 text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {so.items.map((item, i) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="border border-border px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="border border-border px-3 py-2">
                          <p className="font-medium">{item.description}</p>
                          {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                        </td>
                        <td className="border border-border px-3 py-2 font-tabular">{formatDecimal(item.qty)}</td>
                        <td className="border border-border px-3 py-2 text-muted-foreground">{item.uom}</td>
                        <td className="border border-border px-3 py-2 font-tabular text-right">{formatRp(item.unitPrice)}</td>
                        <td className="border border-border px-3 py-2 font-tabular text-right font-700">{formatRp(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="border border-border px-3 py-2 text-right text-muted-foreground font-500">Sub Total</td>
                      <td className="border border-border px-3 py-2 text-right font-tabular font-600">{formatRp(so.subTotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="border border-border px-3 py-2 text-right text-muted-foreground font-500">PPN (11%)</td>
                      <td className="border border-border px-3 py-2 text-right font-tabular font-600">{formatRp(so.taxAmount)}</td>
                    </tr>
                    <tr className="font-700 bg-muted/20">
                      <td colSpan={5} className="border border-border px-3 py-2 text-right">Grand Total</td>
                      <td className="border border-border px-3 py-2 text-right font-tabular text-primary">{formatRp(so.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={() => setShowPreview(false)} className="btn-secondary">Tutup</button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
              >
                <FileText size={14} />
                {exportingPdf ? 'Mengunduh...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {invoiceModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setInvoiceModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-700 text-foreground mb-0.5">Buat Invoice</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {so.no} — {so.customerName}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5">
                  Tanggal Invoice
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="erp-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="erp-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5">
                  Jumlah
                </label>
                <div className="erp-input bg-muted/30 text-muted-foreground font-tabular font-600 select-none">
                  {formatRp(so.grandTotal)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5">
                  Nomor Faktur Pajak
                  <span className="text-muted-foreground/70 font-400"> (opsional)</span>
                </label>
                <input
                  type="text"
                  value={invoiceNomorFakturPajak}
                  onChange={(e) => setInvoiceNomorFakturPajak(e.target.value)}
                  placeholder="010.XXX-XX.XXXXXXXX"
                  className="erp-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setInvoiceModal(false)}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={creatingInvoice || !invoiceDate || !invoiceDueDate}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {creatingInvoice ? 'Membuat...' : 'Buat Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
