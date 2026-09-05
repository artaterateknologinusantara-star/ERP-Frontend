'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import RowActionMenu, { ActionItem } from '@/components/ui/RowActionMenu';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { canApprove } from '@/lib/permissions';
import { toast } from 'sonner';
import {
  Send, Edit2, GitBranch, Trash2, Plus,
  ChevronsUpDown, ChevronUp, ChevronDown,
  CheckCircle, XCircle, FileCheck, FileText, FileDown,
  Eye, X,
} from 'lucide-react';
import RecordPoModal from './RecordPoModal';
import type { QuotationListItem, QuotationStatus } from '@/types';
import { quotationService } from '@/services/quotation.service';
import { createSOFromQuotation } from '@/services/salesorder.service';

// ── Status constants ───────────────────────────────────────────────────────────
const S: Record<string, QuotationStatus> = {
  DRAFT:      'Draft',
  TERKIRIM:   'Terkirim',
  DISETUJUI:  'Disetujui',
  DITOLAK:    'Ditolak',
  KADALUARSA: 'Kadaluarsa',
  DIREVISI:   'Direvisi',
  SELESAI:    'Selesai',
  SUPERSEDED: 'Superseded',
};

const STATUS_OPTIONS = [
  { value: 'Semua',       label: 'Semua Status' },
  { value: S.DRAFT,       label: 'Draft' },
  { value: S.TERKIRIM,    label: 'Terkirim' },
  { value: S.DISETUJUI,   label: 'Disetujui' },
  { value: S.DITOLAK,     label: 'Ditolak' },
  { value: S.KADALUARSA,  label: 'Kadaluarsa' },
  { value: S.DIREVISI,    label: 'Direvisi' },
  { value: S.SELESAI,     label: 'Selesai' },
  { value: S.SUPERSEDED,  label: 'Superseded' },
];

// ── Types ──────────────────────────────────────────────────────────────────────
type SortKey = keyof QuotationListItem;

interface Props {
  quotations: QuotationListItem[];
  loading: boolean;
  onRefresh: () => void;
}

// ── PDF Preview Modal ──────────────────────────────────────────────────────────
function PdfPreviewModal({ row, url, onClose }: {
  row: QuotationListItem;
  url: string;
  onClose: () => void;
}) {
  const handleDownload = () => {
    const revSuffix = row.revision > 0 ? `_R${String(row.revision).padStart(2, '0')}` : '';
    const a = document.createElement('a');
    a.href = url;
    a.download = `Penawaran_${row.no.replace(/\//g, '-')}${revSuffix}.pdf`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: 900, height: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-widest">Preview Penawaran</p>
            <p className="font-700 text-[15px] text-foreground leading-tight truncate">
              {row.no}
              {row.revision > 0 && (
                <span className="ml-2 text-[11px] font-600 text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                  R.{String(row.revision).padStart(2, '0')}
                </span>
              )}
            </p>
            <p className="text-[12px] text-muted-foreground truncate">{row.customerName} · {row.projectName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              className="inline-flex items-center gap-1.5 text-[12px] font-600 px-3.5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
              onClick={handleDownload}
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-200 overflow-hidden">
          <iframe src={url} className="w-full h-full" title={`Penawaran ${row.no}`} />
        </div>
      </div>
    </div>
  );
}

// ── Sort icon ──────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: {
  col: SortKey;
  sortKey: SortKey | null | undefined;
  sortDir: 'asc' | 'desc';
}) {
  if (sortKey !== col) return <ChevronsUpDown size={12} className="text-muted-foreground" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-primary" />
    : <ChevronDown size={12} className="text-primary" />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RiwayatPenawaranTable({ quotations, loading, onRefresh }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selected,        setSelected]       = useState<string[]>([]);
  const [deleteTarget,    setDeleteTarget]   = useState<string | null>(null);
  const [deleteLoading,   setDeleteLoading]  = useState(false);
  const [sendTarget,      setSendTarget]     = useState<QuotationListItem | null>(null);
  const [sendLoading,     setSendLoading]    = useState(false);
  const [revisionTarget,  setRevisionTarget] = useState<QuotationListItem | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [poTarget,        setPoTarget]       = useState<QuotationListItem | null>(null);
  const [approvalModal,   setApprovalModal]  = useState<{ action: 'approve' | 'reject'; row: QuotationListItem } | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [soAutoLoading,   setSoAutoLoading]  = useState(false);
  const [pdfPreview,        setPdfPreview]       = useState<{ row: QuotationListItem; url: string } | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState<string | null>(null);

  const {
    search, statusFilter, page, perPage,
    sortKey, sortDir, filtered, pageData, totalPages,
    handleSearch, handleStatusFilter, handleSort, handlePerPageChange, setPage,
  } = useTableFilter<QuotationListItem>({
    data: quotations,
    searchFields: ['no', 'customerName', 'projectName', 'salesName'],
    statusField: 'status',
    defaultPerPage: 10,
  });

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () =>
    setSelected(selected.length === pageData.length ? [] : pageData.map((r) => r.id));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await quotationService.delete(deleteTarget);
      toast.success('Penawaran berhasil dihapus');
      setDeleteTarget(null);
      onRefresh();
    } catch {
      toast.error('Gagal menghapus penawaran');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendTarget) return;
    setSendLoading(true);
    try {
      const blob = await quotationService.exportPdf(sendTarget.id);
      const revSuffix = sendTarget.revision > 0
        ? `_R${String(sendTarget.revision).padStart(2, '0')}`
        : '';
      const fileName = `Quotation_${sendTarget.no.replace(/\//g, '-')}${revSuffix}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      await quotationService.send(sendTarget.id);
      const subject = encodeURIComponent(`Quotation - ${sendTarget.no} - ${sendTarget.customerName}`);
      const body = encodeURIComponent(
        `Dear Procurement,\n\n I hope this email finds you well.

Please find the attached quotation for your review and consideration. The quotation has been prepared based on the requirements and information discussed, and we trust it will provide a clear overview of the proposed scope, pricing, and commercial terms.

Should you require any further clarification, additional information, or wish to discuss any aspect of the proposal in greater detail, please do not hesitate to contact us. We would be pleased to assist and address any questions you may have.

Thank you for your time and consideration. We look forward to your feedback and the opportunity to work together.\n\nThank you.\n\nBest Regards,\n${sendTarget.salesName}`
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(sendTarget.customerEmail ?? '')}&su=${subject}&body=${body}`,
        '_blank'
      );
      toast.success(`Penawaran ${sendTarget.no} berhasil dikirim. PDF sudah diunduh — lampirkan ke email.`);
      setSendTarget(null);
      onRefresh();
    } catch {
      toast.error('Gagal memproses pengiriman penawaran');
    } finally {
      setSendLoading(false);
    }
  };

  const handleRevision = async () => {
    if (!revisionTarget) return;
    setRevisionLoading(true);
    try {
      const res = await quotationService.revision(revisionTarget.id);
      toast.success('Draft revisi berhasil dibuat');
      setRevisionTarget(null);
      router.push(`/buat-penawaran-baru?id=${res.data!.id}`);
    } catch {
      toast.error('Gagal membuat revisi');
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!approvalModal) return;
    const { action, row } = approvalModal;
    setApprovalLoading(true);
    try {
      if (action === 'approve') {
        await quotationService.approve(row.id);
        toast.success(`Penawaran ${row.no} berhasil disetujui`);
      } else {
        await quotationService.reject(row.id);
        toast.success(`Penawaran ${row.no} ditolak`);
      }
      setApprovalModal(null);
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      onRefresh();
    } catch {
      toast.error(action === 'approve' ? 'Gagal menyetujui penawaran' : 'Gagal menolak penawaran');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    try {
      await quotationService.bulkDelete(selected);
      toast.success(`${selected.length} penawaran dihapus`);
      setSelected([]);
      onRefresh();
    } catch {
      toast.error('Gagal menghapus penawaran');
    }
  };

  const handleAutoCreateSO = async (quotationId: string) => {
    setSoAutoLoading(true);
    try {
      const so = await createSOFromQuotation(quotationId);
      toast.success(`Sales Order ${so.no} berhasil dibuat`);
      router.push(`/sales-order/${so.id}`);
    } catch {
      toast.error('Gagal membuat Sales Order otomatis');
      router.push('/customer-po');
    } finally {
      setSoAutoLoading(false);
    }
  };

  const handleOpenPdfPreview = async (row: QuotationListItem) => {
    setPdfPreviewLoading(row.id);
    try {
      const blob = await quotationService.exportPdf(row.id);
      setPdfPreview({ row, url: URL.createObjectURL(blob) });
    } catch {
      toast.error('Gagal memuat PDF');
    } finally {
      setPdfPreviewLoading(null);
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  };

  // ── Action items builder ────────────────────────────────────────────────────
  const getActionItems = (row: QuotationListItem): ActionItem[] => {
    const isLoadingPdf = pdfPreviewLoading === row.id;
    const items: ActionItem[] = [];

    if (row.status === S.DRAFT) {
      items.push(
        { icon: <Edit2 size={13} />,  label: 'Edit Penawaran',     onClick: () => router.push(`/buat-penawaran-baru?id=${row.id}`) },
        { icon: <Send size={13} />,   label: 'Kirim ke Customer',  onClick: () => setSendTarget(row) },
      );
    }

    if (row.status === S.TERKIRIM && canApprove('Sales')) {
      items.push(
        { icon: <CheckCircle size={13} />, label: 'Setujui',  onClick: () => setApprovalModal({ action: 'approve', row }) },
        { icon: <XCircle size={13} />,     label: 'Tolak',    onClick: () => setApprovalModal({ action: 'reject', row }), danger: true },
      );
    }

    if (row.status === S.DISETUJUI) {
      items.push({
        icon: row.hasCustomerPO ? <FileCheck size={13} /> : <FileText size={13} />,
        label: row.hasCustomerPO ? 'Lihat Customer PO' : 'Input Customer PO',
        onClick: () => setPoTarget(row),
      });
    }

    if (row.status === S.SELESAI || (row.status === S.SUPERSEDED && row.hasCustomerPO)) {
      items.push({ icon: <FileCheck size={13} />, label: 'Lihat Customer PO', onClick: () => setPoTarget(row) });
    }

    // PDF preview — separator if there are items above
    items.push({
      icon: isLoadingPdf
        ? <span className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
        : <Eye size={13} />,
      label: 'Lihat PDF',
      onClick: () => handleOpenPdfPreview(row),
      disabled: isLoadingPdf,
      separator: items.length > 0,
    });

    // Revision — eligible statuses
    if (
      (row.status === S.TERKIRIM && row.isLatestRevision) ||
      row.status === S.DISETUJUI ||
      row.status === S.SELESAI
    ) {
      items.push({ icon: <GitBranch size={13} />, label: 'Buat Revisi', onClick: () => setRevisionTarget(row) });
    }

    // Delete — Draft only
    if (row.status === S.DRAFT) {
      items.push({ icon: <Trash2 size={13} />, label: 'Hapus Penawaran', onClick: () => setDeleteTarget(row.id), danger: true, separator: true });
    }

    return items;
  };

  // ── Column definitions ─────────────────────────────────────────────────────
  const columns: { key: SortKey; label: string; minW: string }[] = [
    { key: 'no',           label: 'No. Penawaran', minW: 'min-w-[150px]' },
    { key: 'customerName', label: 'Pelanggan',     minW: 'min-w-[160px]' },
    { key: 'projectName',  label: 'Proyek',        minW: 'min-w-[160px]' },
    { key: 'date',         label: 'Tanggal',       minW: 'min-w-[100px]' },
    { key: 'revision',     label: 'Revisi',        minW: 'min-w-[70px]'  },
    { key: 'salesName',    label: 'Sales',         minW: 'min-w-[120px]' },
    { key: 'grandTotal',   label: 'Total Final',   minW: 'min-w-[140px]' },
    { key: 'status',       label: 'Status',        minW: 'min-w-[110px]' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari no. penawaran, pelanggan, proyek..."
        totalCount={filtered.length}
        countLabel="penawaran"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onExport={() => toast.info('Export ke Excel')}
        actions={
          <Link href="/buat-penawaran-baru" className="btn-primary">
            <Plus size={14} /> Buat Penawaran
          </Link>
        }
      />

      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg animate-slide-up">
          <span className="text-[13px] font-600 text-primary">{selected.length} dipilih</span>
          <button className="btn-danger text-xs py-1 px-2.5" onClick={handleBulkDelete}>
            <Trash2 size={12} /> Hapus
          </button>
          <button className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected([])}>
            Batalkan
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              <th className="erp-table-cell w-8">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selected.length === pageData.length && pageData.length > 0}
                  onChange={toggleAll}
                  aria-label="Pilih semua"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground ${col.minW}`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
              ))}
              <th className="erp-table-cell erp-action-col text-muted-foreground font-600 text-xs uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-[13px]">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-muted-foreground">
                  <p className="text-[13px]">Tidak ada penawaran ditemukan</p>
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border hover:bg-primary/5 transition-colors ${
                    selected.includes(row.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="erp-table-cell">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      aria-label={`Pilih ${row.no}`}
                    />
                  </td>
                  <td className="erp-table-cell font-700 text-primary whitespace-nowrap">{row.no}</td>
                  <td className="erp-table-cell font-500 max-w-[160px] truncate" title={row.customerName}>{row.customerName}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[160px] truncate" title={row.projectName}>{row.projectName}</td>
                  <td className="erp-table-cell text-muted-foreground whitespace-nowrap">{row.date}</td>
                  <td className="erp-table-cell text-center">
                    {row.revision > 0 ? (
                      <span className="bg-orange-100 text-orange-700 text-xs font-700 px-2 py-0.5 rounded-full">
                        R.{String(row.revision).padStart(2, '0')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="erp-table-cell whitespace-nowrap">{row.salesName}</td>
                  <td className="erp-table-cell font-700 font-tabular whitespace-nowrap">{formatRp(row.grandTotal)}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as QuotationStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell erp-action-col" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu items={getActionItems(row)} />
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
        totalCount={filtered.length}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={handlePerPageChange}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Hapus Penawaran?"
        description="Penawaran ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
      />

      <ConfirmModal
        isOpen={!!sendTarget}
        onClose={() => setSendTarget(null)}
        onConfirm={handleSend}
        loading={sendLoading}
        title="Kirim Penawaran ke Customer?"
        description={`PDF penawaran ${sendTarget?.no} akan dibuat dan diunduh otomatis. Gmail akan dibuka dengan subject, body, dan penerima yang sudah terisi — lampirkan PDF ke email lalu kirim.`}
        confirmLabel="Ya, Kirim"
      />

      <ConfirmModal
        isOpen={!!revisionTarget}
        onClose={() => setRevisionTarget(null)}
        onConfirm={handleRevision}
        loading={revisionLoading}
        title="Buat Revisi Penawaran?"
        description={(() => {
          const no = revisionTarget?.no ?? '';
          const rev = revisionTarget && revisionTarget.revision > 0 ? ` (R.${String(revisionTarget.revision).padStart(2, '0')})` : '';
          if (revisionTarget?.status === S.SELESAI)
            return `Penawaran ${no}${rev} sudah memiliki Customer PO. Draft revisi baru akan dibuat — penawaran lama menjadi Superseded.`;
          if (revisionTarget?.status === S.DISETUJUI)
            return `Penawaran ${no}${rev} sudah disetujui. Draft revisi baru akan dibuat untuk penyesuaian scope/nilai — penawaran lama menjadi Direvisi dan perlu approval ulang.`;
          return `Penawaran ${no}${rev} akan direvisi. Draft baru akan dibuat dengan nomor yang sama.`;
        })()}
        confirmLabel="Ya, Buat Revisi"
      />

      <ConfirmModal
        isOpen={!!approvalModal}
        onClose={() => setApprovalModal(null)}
        onConfirm={handleApproval}
        loading={approvalLoading}
        title={approvalModal?.action === 'approve' ? 'Setujui Penawaran?' : 'Tolak Penawaran?'}
        description={
          approvalModal?.action === 'approve'
            ? `Penawaran ${approvalModal?.row.no} untuk ${approvalModal?.row.customerName} akan disetujui. Status akan berubah menjadi Disetujui.`
            : `Penawaran ${approvalModal?.row.no} untuk ${approvalModal?.row.customerName} akan ditolak. Status akan berubah menjadi Ditolak.`
        }
        confirmLabel={approvalModal?.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
      />

      {soAutoLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-2xl flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-[14px] font-600 text-foreground">Membuat Sales Order...</p>
              <p className="text-[12px] text-muted-foreground">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      )}

      {poTarget && (
        <RecordPoModal
          isOpen
          onClose={() => setPoTarget(null)}
          quotation={poTarget}
          onSuccess={() => {
            const quotationId = poTarget.id;
            setPoTarget(null);
            onRefresh();
            handleAutoCreateSO(quotationId);
          }}
          onRequestRevision={() => {
            const target = poTarget;
            setPoTarget(null);
            setRevisionTarget(target);
          }}
        />
      )}

      {pdfPreview && (
        <PdfPreviewModal
          row={pdfPreview.row}
          url={pdfPreview.url}
          onClose={handleClosePdfPreview}
        />
      )}
    </div>
  );
}
