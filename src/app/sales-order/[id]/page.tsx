'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import WorkflowStepper from '@/components/ui/WorkflowStepper';
import WorkflowBanner, { BannerTone } from '@/components/ui/WorkflowBanner';
import { formatRp, formatDate } from '@/lib/format';
import {
  ShoppingCart, Truck, CheckCircle2, XCircle, FileText,
  Receipt, AlertCircle, Info, Clock, Eye,
} from 'lucide-react';
import {
  getSalesOrderDetail, SalesOrderDetail, salesOrderService,
  getSalesOrderDownPayments, recordDownPayment, SalesOrderPaymentRecord,
} from '@/services/salesorder.service';
import { generatePRFromSO, getPOList, PurchaseOrderListItem } from '@/services/purchase.service';
import { createDOFromSO, getDeliveryOrders, DeliveryOrderListItem } from '@/services/inventory.service';
import { invoiceService } from '@/services/invoice.service';
import { api } from '@/lib/api';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { SalesOrderStatus } from '@/types';
import { SALES_ORDERS_QUERY_KEY } from '../components/SalesOrderTable';

const DP_METHODS = ['Transfer', 'Tunai', 'Giro', 'Cek'];

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

// Phase itself is computed server-side (SalesOrderService.ComputeOpenPhase/ComputeStaticPhase) and
// comes back on `so.phase` — this page no longer recomputes it from relatedPRs/relatedPOs, so it
// can't drift from the phase shown in the Sales Order list.

// ── Stepper ───────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'SO Open' },
  { label: 'Generate PR' },
  { label: 'Approval PR' },
  { label: 'Proses GR' },
  { label: 'Delivery' },
  { label: 'Invoice' },
  { label: 'Selesai' },
];

const PHASE_STEP: Record<WorkflowPhase, number> = {
  'pr-needed':     1,
  'pr-processing': 2,
  'gr-pending':    3,
  'do-ready':      4,
  'invoice-ready': 5,
  'completed':     STEPS.length - 1,
  'cancelled':    -1,
};

// ── Contextual banner config ──────────────────────────────────────────────────
// Maps the workflow phase to a <WorkflowBanner> config (shared component — see
// src/components/ui/WorkflowBanner.tsx). Returns null for phases with nothing to say
// (invoice-ready has its own dedicated banner further down, completed/cancelled need none).

function getSOBannerConfig(
  phase: WorkflowPhase, prHasItems: boolean, firstLinkedPOId: string | undefined,
): { tone: BannerTone; icon: React.ReactNode; message: React.ReactNode; linkHref?: string; linkLabel?: string } | null {
  switch (phase) {
    case 'pr-needed':
      return {
        tone: 'blue',
        icon: <AlertCircle size={15} />,
        message: 'Langkah wajib: Generate Purchase Request terlebih dahulu sebelum bisa membuat Delivery Order.',
      };
    case 'pr-processing':
      return {
        tone: 'amber',
        icon: <Clock size={15} />,
        message: 'PR sedang diproses. Selesaikan alur PR → Approval → PO Purchasing (pembelian ke supplier) terlebih dahulu sebelum bisa membuat DO.',
      };
    case 'gr-pending':
      return {
        tone: 'orange',
        icon: <Clock size={15} />,
        // "PO" here is deliberately spelled out as "PO Purchasing" (PO ke supplier) — this
        // banner sits on the Sales Order page, where "Customer PO" is the other PO users
        // already know, so a bare "PO" reads as ambiguous rather than obviously Purchasing.
        message: 'PO Purchasing (pembelian ke supplier) sudah dibuat. Selesaikan proses penerimaan barang (Goods Receipt) di halaman PO Purchasing sebelum melanjutkan ke Delivery.',
        linkHref: firstLinkedPOId ? `/purchase-order/${firstLinkedPOId}` : undefined,
        linkLabel: 'Lihat PO Purchasing →',
      };
    case 'do-ready':
      return {
        tone: 'green',
        icon: <Info size={15} />,
        message: prHasItems
          ? 'GR selesai — material siap. Buat Delivery Order untuk pengiriman ke customer.'
          : 'Material tersedia di stok. Buat Delivery Order (jika ada pengiriman fisik) atau langsung Buat Invoice (jika proyek jasa murni).',
      };
    case 'invoice-ready':
      return {
        tone: 'purple',
        icon: <Receipt size={15} />,
        message: 'SO sudah dikirim. Buat Invoice untuk penagihan ke customer.',
      };
    default:
      return null;
  }
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
  const queryClient = useQueryClient();

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
  const [previewPdfUrl, setPreviewPdfUrl]       = useState<string | null>(null);
  const [previewLoading, setPreviewLoading]     = useState(false);

  // Related docs
  const [relatedDOs,      setRelatedDOs]      = useState<DeliveryOrderListItem[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<RelatedInvoice[]>([]);
  const [relatedPRs,      setRelatedPRs]      = useState<RelatedPR[]>([]);
  const [relatedPOs,      setRelatedPOs]      = useState<PurchaseOrderListItem[]>([]);
  const [loadingRelated,  setLoadingRelated]  = useState(false);

  // Down Payment
  const [downPayments, setDownPayments]   = useState<SalesOrderPaymentRecord[]>([]);
  const [loadingDp, setLoadingDp]         = useState(false);
  const [dpModal, setDpModal]             = useState(false);
  const [dpForm, setDpForm] = useState<{ paymentDate: string; amount: string; method: string; reference: string; notes: string }>({
    paymentDate: todayStr(), amount: '', method: 'Transfer', reference: '', notes: '',
  });
  const [savingDp, setSavingDp] = useState(false);

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
    loadDownPayments(so.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [so?.id]);

  async function loadDownPayments(soId: string) {
    setLoadingDp(true);
    try {
      setDownPayments(await getSalesOrderDownPayments(soId));
    } catch {
      // silent — DP section just shows empty state
    } finally {
      setLoadingDp(false);
    }
  }

  const totalDpReceived = downPayments.reduce((s, dp) => s + dp.amount, 0);

  const openDpModal = () => {
    setDpForm({ paymentDate: todayStr(), amount: '', method: 'Transfer', reference: '', notes: '' });
    setDpModal(true);
  };

  const handleRecordDp = async () => {
    if (!so) return;
    const amount = parseFloat(dpForm.amount);
    if (!dpForm.amount || isNaN(amount) || amount <= 0) {
      toast.error('Jumlah DP wajib diisi dan harus lebih dari 0');
      return;
    }
    const remainingCap = so.grandTotal - totalDpReceived;
    if (amount > remainingCap) {
      toast.error(`Jumlah melebihi sisa kapasitas DP (${formatRp(remainingCap)})`);
      return;
    }
    setSavingDp(true);
    try {
      await recordDownPayment(so.id, {
        paymentDate: dpForm.paymentDate,
        amount,
        method: dpForm.method,
        reference: dpForm.reference || undefined,
        notes: dpForm.notes || undefined,
      });
      toast.success('Down Payment berhasil dicatat');
      setDpModal(false);
      loadDownPayments(so.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencatat Down Payment');
    } finally {
      setSavingDp(false);
    }
  };

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
      const [dosRes, invoicesRes, prsRes] = await Promise.allSettled([
        getDeliveryOrders({ perPage: 200 }),
        api.get<{ data: RelatedInvoice[] }>('/invoices?perPage=200'),
        api.get<{ data: RelatedPR[] }>('/purchase-requests?perPage=200'),
      ]);

      if (dosRes.status === 'fulfilled')
        setRelatedDOs(dosRes.value.data.filter((d) => d.salesOrderNo === soNo));

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

      // Check linked POs (across all vendors) — used for the GR-pending banner's PO link, not for
      // phase (phase itself comes from so.phase, computed server-side).
      if (linkedPRIds.length > 0) {
        const posRes = await getPOList({ perPage: 100, purchaseRequestIds: linkedPRIds.join(',') });
        setRelatedPOs(posRes.data);
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
      queryClient.invalidateQueries({ queryKey: [SALES_ORDERS_QUERY_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [SALES_ORDERS_QUERY_KEY] });
      router.push(`/invoice/${res.data?.id}`);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Gagal membuat invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  async function handleOpenPreview() {
    if (!so) return;
    setPreviewLoading(true);
    try {
      const blob = await salesOrderService.exportPdf(so.id);
      setPreviewPdfUrl(window.URL.createObjectURL(blob));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat preview PDF');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleClosePreview() {
    if (previewPdfUrl) window.URL.revokeObjectURL(previewPdfUrl);
    setPreviewPdfUrl(null);
  }

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

  const phase       = (so?.phase ?? 'pr-needed') as WorkflowPhase;
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
        {/* A Draft SO hasn't entered the workflow yet (no PR/PO/GR step has a meaningful phase to
            show), same reasoning as the banner's Open/Delivered guard below. */}
        {so.status !== 'Draft' && (
          <WorkflowStepper
            title="Progress SO"
            steps={STEPS}
            currentStep={PHASE_STEP[phase]}
            cancelled={phase === 'cancelled'}
            cancelledLabel="Sales Order telah dibatalkan"
          />
        )}

        {/* ── Contextual Banner ── */}
        {(so.status === 'Open' || so.status === 'Delivered') && (() => {
          // Link to a PO that still needs GR, not just the first one returned — a PR can split
          // across multiple supplier POs, and an already-Completed one gives the user nowhere
          // to go to actually finish the pending Goods Receipt.
          const firstLinkedPOId = (relatedPOs.find((po) => po.status !== 'Completed') ?? relatedPOs[0])?.id;
          const cfg = getSOBannerConfig(phase, prHasItems, firstLinkedPOId);
          return cfg && <WorkflowBanner {...cfg} />;
        })()}

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
                onClick={handleOpenPreview}
                disabled={previewLoading}
                className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={14} /> {previewLoading ? 'Memuat...' : 'Preview'}
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

        {/* ── Down Payment ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Down Payment</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-600 text-muted-foreground">
                {downPayments.length} DP
              </span>
            </div>
            <button
              onClick={openDpModal}
              disabled={totalDpReceived >= so.grandTotal}
              title={totalDpReceived >= so.grandTotal ? 'Total DP sudah mencapai Grand Total SO' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-300 text-emerald-700 rounded-md hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-600"
            >
              <Receipt size={14} /> Terima DP
            </button>
          </div>

          {loadingDp ? (
            <div className="h-16 bg-muted animate-pulse rounded-lg" />
          ) : downPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada Down Payment tercatat.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/40">
                      {['Tanggal', 'Metode', 'Referensi', 'Jumlah DP', 'Sudah Diterapkan', 'Sisa'].map((h) => (
                        <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {downPayments.map((dp) => (
                      <tr key={dp.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="erp-table-cell text-muted-foreground">{formatDate(dp.paymentDate)}</td>
                        <td className="erp-table-cell">{dp.method}</td>
                        <td className="erp-table-cell text-muted-foreground">{dp.reference || '—'}</td>
                        <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(dp.amount)}</td>
                        <td className="erp-table-cell font-tabular text-right text-muted-foreground">{formatRp(dp.amountApplied)}</td>
                        <td className="erp-table-cell font-tabular text-right">
                          {dp.remaining > 0 ? (
                            <span className="text-emerald-600 font-700">{formatRp(dp.remaining)}</span>
                          ) : (
                            <span className="text-muted-foreground">Rp 0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-3 text-sm gap-2">
                <span className="text-muted-foreground">Total DP diterima:</span>
                <span className="font-700 font-tabular text-emerald-600">{formatRp(totalDpReceived)}</span>
              </div>
            </>
          )}
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

      {/* ── Preview Modal (PDF) ── */}
      {previewPdfUrl && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClosePreview}
        >
          <div
            className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '90vw', maxWidth: 900, height: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-700 text-foreground">{so.no}</h3>
                <StatusBadge status={so.status as SalesOrderStatus} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileText size={14} />
                  {exportingPdf ? 'Mengunduh...' : 'Download PDF'}
                </button>
                <button onClick={handleClosePreview} className="text-muted-foreground hover:text-foreground transition-colors">
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 bg-slate-200 overflow-hidden">
              <iframe src={previewPdfUrl} className="w-full h-full" title={`Sales Order ${so.no}`} />
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

      {/* ── Down Payment Modal ── */}
      {dpModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDpModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-700 text-foreground mb-0.5">Terima Down Payment</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {so.no} — {so.customerName}
            </p>

            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa kapasitas DP</span>
                  <span className="font-700 text-emerald-600">{formatRp(so.grandTotal - totalDpReceived)}</span>
                </div>
              </div>
              <div>
                <label className="erp-form-label">Tanggal DP<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="date"
                  className="erp-input"
                  value={dpForm.paymentDate}
                  onChange={(e) => setDpForm((f) => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="erp-form-label">Jumlah<span className="text-red-500 ml-0.5">*</span></label>
                <CurrencyInput
                  value={Number(dpForm.amount) || 0}
                  onChange={(v) => setDpForm((f) => ({ ...f, amount: v ? String(v) : '' }))}
                />
              </div>
              <div>
                <label className="erp-form-label">Metode<span className="text-red-500 ml-0.5">*</span></label>
                <select
                  className="erp-input"
                  value={dpForm.method}
                  onChange={(e) => setDpForm((f) => ({ ...f, method: e.target.value }))}
                >
                  {DP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="erp-form-label">Referensi</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="No. transfer / cek / giro"
                  value={dpForm.reference}
                  onChange={(e) => setDpForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="erp-form-label">Catatan</label>
                <textarea
                  className="erp-input resize-none"
                  rows={2}
                  value={dpForm.notes}
                  onChange={(e) => setDpForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setDpModal(false)} className="btn-secondary flex-1" disabled={savingDp}>
                Batal
              </button>
              <button
                onClick={handleRecordDp}
                disabled={savingDp || !dpForm.amount}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {savingDp ? 'Menyimpan...' : 'Simpan DP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
