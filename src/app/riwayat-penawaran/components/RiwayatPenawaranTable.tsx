'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { toast } from 'sonner';
import {
  Send, Edit2, GitBranch, Trash2, Plus,
  ChevronsUpDown, ChevronUp, ChevronDown,
  CheckCircle, XCircle, FileCheck, FileText, FileDown,
  MoreHorizontal, Eye, X,
} from 'lucide-react';
import RecordPoModal from './RecordPoModal';
import type { QuotationListItem, QuotationStatus } from '@/types';
import { quotationService } from '@/services/quotation.service';

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

// ── Button style tokens ────────────────────────────────────────────────────────
const PILL = 'inline-flex items-center gap-1 text-[11px] font-600 px-2.5 py-[3px] rounded-md transition-colors whitespace-nowrap border select-none';
const PILL_BLUE    = `${PILL} bg-blue-50   text-blue-700    border-blue-200   hover:bg-blue-100`;
const PILL_GREEN   = `${PILL} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`;
const PILL_RED     = `${PILL} bg-red-50    text-red-600     border-red-200    hover:bg-red-100`;
const PILL_PURPLE  = `${PILL} bg-violet-50 text-violet-700  border-violet-200 hover:bg-violet-100`;
const PILL_EMERALD = `${PILL} bg-teal-50   text-teal-700    border-teal-200   hover:bg-teal-100`;
const PILL_SLATE   = `${PILL} bg-slate-50  text-slate-600   border-slate-200  hover:bg-slate-100`;
const PILL_INDIGO  = `${PILL} bg-indigo-50 text-indigo-700  border-indigo-200 hover:bg-indigo-100`;

const ICON_BTN      = 'flex-shrink-0 p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const ICON_BTN_BLUE = `${ICON_BTN} text-slate-400 hover:text-blue-600 hover:bg-blue-50`;

// ── Types ──────────────────────────────────────────────────────────────────────
type SortKey = keyof QuotationListItem;

interface Props {
  quotations: QuotationListItem[];
  loading: boolean;
  onRefresh: () => void;
}

interface DropdownItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
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
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-widest">
              Preview Penawaran
            </p>
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
              title="Tutup"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 bg-slate-200 overflow-hidden">
          <iframe
            src={url}
            className="w-full h-full"
            title={`Penawaran ${row.no}`}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sort icon (stable outside parent) ─────────────────────────────────────────
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

// ── Row dropdown ───────────────────────────────────────────────────────────────
function RowDropdown({ items, isOpen, onToggle }: {
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="relative flex-shrink-0">
      <button
        title="Aksi lainnya"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`p-1.5 rounded-md transition-colors ${
          isOpen
            ? 'bg-slate-100 text-slate-700'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <MoreHorizontal size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border/70 rounded-xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.14)] z-50 overflow-hidden py-1">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.separator && <div className="mx-3 my-1 border-t border-border/60" />}
              <button
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-500 text-left transition-colors ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50/80'
                    : 'text-foreground hover:bg-muted/60'
                }`}
                onClick={() => { item.onClick(); onToggle(); }}
              >
                <span className={`flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RiwayatPenawaranTable({ quotations, loading, onRefresh }: Props) {
  const router = useRouter();

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
  const [openDropdownId,  setOpenDropdownId] = useState<string | null>(null);

  // PDF preview
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

  // ── Selection ─────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () =>
    setSelected(selected.length === pageData.length ? [] : pageData.map((r) => r.id));

  // ── Handlers ──────────────────────────────────────────────────────────────────
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
        `Dear Procurement,\n\nPlease find attached our quotation for your review.\n\nThank you.\n\nBest Regards,\n${sendTarget.salesName}`
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

  // ── Dropdown item builder ─────────────────────────────────────────────────────
  const getDropdownItems = (row: QuotationListItem): DropdownItem[] => {
    const isLoadingPdf = pdfPreviewLoading === row.id;

    const viewPdfItem: DropdownItem = {
      icon: isLoadingPdf
        ? <span className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
        : <Eye size={13} />,
      label: 'Lihat PDF',
      onClick: () => handleOpenPdfPreview(row),
    };

    if (row.status === S.DRAFT) {
      return [
        viewPdfItem,
        {
          icon: <Trash2 size={13} />,
          label: 'Hapus Penawaran',
          onClick: () => setDeleteTarget(row.id),
          danger: true,
          separator: true,
        },
      ];
    }

    if (row.status === S.TERKIRIM) {
      const items: DropdownItem[] = [viewPdfItem];
      if (row.isLatestRevision) {
        items.push({
          icon: <GitBranch size={13} />,
          label: 'Buat Revisi',
          onClick: () => setRevisionTarget(row),
          separator: true,
        });
      }
      return items;
    }

    if (row.status === S.DISETUJUI) {
      return [
        viewPdfItem,
        {
          icon: <GitBranch size={13} />,
          label: 'Buat Revisi',
          onClick: () => setRevisionTarget(row),
          separator: true,
        },
      ];
    }

    if (row.status === S.SELESAI) {
      return [
        viewPdfItem,
        {
          icon: <GitBranch size={13} />,
          label: 'Buat Revisi',
          onClick: () => setRevisionTarget(row),
          separator: true,
        },
      ];
    }

    // Ditolak, Kadaluarsa, Direvisi, Superseded
    return [viewPdfItem];
  };

  // ── Column definitions ────────────────────────────────────────────────────────
  const columns: { key: SortKey; label: string; minW: string }[] = [
    { key: 'no',           label: 'No. Penawaran', minW: 'min-w-[150px]' },
    { key: 'customerName', label: 'Pelanggan',     minW: 'min-w-[180px]' },
    { key: 'projectName',  label: 'Proyek',        minW: 'min-w-[200px]' },
    { key: 'date',         label: 'Tanggal',       minW: 'min-w-[100px]' },
    { key: 'revision',     label: 'Revisi',        minW: 'min-w-[70px]'  },
    { key: 'salesName',    label: 'Sales',         minW: 'min-w-[130px]' },
    { key: 'grandTotal',   label: 'Total Final',   minW: 'min-w-[160px]' },
    { key: 'status',       label: 'Status',        minW: 'min-w-[110px]' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
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
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSelected([])}
          >
            Batalkan
          </button>
        </div>
      )}

      {/* Overlay — closes dropdown on outside click */}
      {openDropdownId && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
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
              <th className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[200px]">
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
              pageData.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border hover:bg-primary/5 transition-colors ${
                    selected.includes(row.id) ? 'bg-primary/5' : i % 2 !== 0 ? 'bg-muted/20' : ''
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
                  <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                  <td className="erp-table-cell font-500">{row.customerName}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[200px] truncate" title={row.projectName}>
                    {row.projectName}
                  </td>
                  <td className="erp-table-cell text-muted-foreground">{row.date}</td>
                  <td className="erp-table-cell text-center">
                    {row.revision > 0 ? (
                      <span className="bg-orange-100 text-orange-700 text-xs font-700 px-2 py-0.5 rounded-full">
                        R.{String(row.revision).padStart(2, '0')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="erp-table-cell">{row.salesName}</td>
                  <td className="erp-table-cell font-700 font-tabular">{formatRp(row.grandTotal)}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={row.status as QuotationStatus} size="sm" />
                  </td>

                  {/* ── Action cell ──────────────────────────────────────── */}
                  <td className="erp-table-cell py-2">
                    <div className="flex items-center justify-center gap-1">

                      {/* DRAFT: Edit (labeled) + Send (icon) */}
                      {row.status === S.DRAFT && (
                        <>
                          <Link
                            href={`/buat-penawaran-baru?id=${row.id}`}
                            className={PILL_BLUE}
                            title="Edit penawaran"
                          >
                            <Edit2 size={11} /> Edit
                          </Link>
                          <button
                            className={ICON_BTN_BLUE}
                            title="Kirim Penawaran ke Customer"
                            onClick={() => setSendTarget(row)}
                          >
                            <Send size={13} />
                          </button>
                        </>
                      )}

                      {/* TERKIRIM: Approve + Reject */}
                      {row.status === S.TERKIRIM && (
                        <>
                          <button
                            className={PILL_GREEN}
                            title="Setujui penawaran ini"
                            onClick={() => setApprovalModal({ action: 'approve', row })}
                          >
                            <CheckCircle size={11} /> Setujui
                          </button>
                          <button
                            className={PILL_RED}
                            title="Tolak penawaran ini"
                            onClick={() => setApprovalModal({ action: 'reject', row })}
                          >
                            <XCircle size={11} /> Tolak
                          </button>
                        </>
                      )}

                      {/* DISETUJUI: Customer PO */}
                      {row.status === S.DISETUJUI && (
                        <button
                          className={row.hasCustomerPO ? PILL_EMERALD : PILL_PURPLE}
                          title={row.hasCustomerPO ? 'Lihat Customer PO' : 'Input Customer PO'}
                          onClick={() => setPoTarget(row)}
                        >
                          {row.hasCustomerPO
                            ? <><FileCheck size={11} /> Lihat PO</>
                            : <><FileText size={11} /> Input PO</>
                          }
                        </button>
                      )}

                      {/* SELESAI: fully locked — view recorded PO */}
                      {row.status === S.SELESAI && (
                        <button
                          className={PILL_INDIGO}
                          title="Lihat Customer PO"
                          onClick={() => setPoTarget(row)}
                        >
                          <FileCheck size={11} /> Lihat PO
                        </button>
                      )}

                      {/* SUPERSEDED: show linked PO if present, otherwise just dropdown */}
                      {row.status === S.SUPERSEDED && row.hasCustomerPO && (
                        <button
                          className={PILL_SLATE}
                          title="Lihat Customer PO terdahulu"
                          onClick={() => setPoTarget(row)}
                        >
                          <FileCheck size={11} /> Lihat PO
                        </button>
                      )}

                      {/* INACTIVE: Lihat PDF langsung */}
                      {(row.status === S.DITOLAK || row.status === S.KADALUARSA || row.status === S.DIREVISI || row.status === S.SUPERSEDED) && (
                        <button
                          className={PILL_SLATE}
                          title="Lihat PDF penawaran"
                          disabled={pdfPreviewLoading === row.id}
                          onClick={() => handleOpenPdfPreview(row)}
                        >
                          {pdfPreviewLoading === row.id
                            ? <span className="w-2.5 h-2.5 border border-slate-400/40 border-t-slate-500 rounded-full animate-spin" />
                            : <Eye size={11} />
                          }
                          Lihat
                        </button>
                      )}

                      {/* Contextual more-actions dropdown */}
                      <RowDropdown
                        items={getDropdownItems(row)}
                        isOpen={openDropdownId === row.id}
                        onToggle={() => setOpenDropdownId((id) => id === row.id ? null : row.id)}
                      />
                    </div>
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

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

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

      {poTarget && (
        <RecordPoModal
          isOpen
          onClose={() => setPoTarget(null)}
          quotation={poTarget}
          onSuccess={() => {
            setPoTarget(null);
            onRefresh();
            if (poTarget.status === S.DISETUJUI) router.push('/customer-po');
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
