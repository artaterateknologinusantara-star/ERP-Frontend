'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Upload,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileSpreadsheet,
  Pencil,
  Check,
  FileText,
  Paperclip,
} from 'lucide-react';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ERPModal from '@/components/ui/ERPModal';
import { quotationService } from '@/services/quotation.service';
import { isGuid } from '@/lib/guid';
import { formatDate, formatInt } from '@/lib/format';
import { toCategoryLetter } from '@/lib/categoryLetter';
import {
  parseBoqExcelFile,
  matchGroupsAgainstExisting,
  type ParsedBoqDocument,
  type ParsedBoqGroup,
} from '@/lib/boqExcelImport';
import ImportBoqPreviewModal, { type BoqImportMode } from './ImportBoqPreviewModal';
import type { CostingTab, CostingGroup, WorkItem, WorkDetail } from '@/types';
import type { DocumentInfo } from './CostingTabsSection';

// Pixel-perfect rebuild sesuai docs mockup Main.dc.html (terisi) / Kosong.dc.html (kosong) —
// SEMUA ukuran/warna/jarak di bawah ini diambil LANGSUNG dari inline style di kedua file itu,
// bukan tebakan. Lihat grep "GRID_TEMPLATE" dsb untuk nilai persisnya.
const GRID_TEMPLATE_FULL = '60px minmax(0,1fr) 72px 84px 124px 124px 128px 128px 88px';
const GRID_TEMPLATE_GROUP = '60px minmax(0,1fr) 128px 128px 88px';
const GRID_TEMPLATE_FOOTER = 'minmax(0,1fr) 128px 128px 88px';
const COL_GAP = 12;

const ACCENT = '#1d4ed8';
const ACCENT_SOFT = '#eef3ff';
const ACCENT_LINE = '#c9d7fb';
const ACCENT_DEEP = '#1e3a8a';
const DANGER = '#b42318';
const BORDER_LIGHT = '#e3e6eb';
const BORDER_INPUT_2 = '#c9ced6';
const TEXT_SECONDARY = '#4a5260';
const TEXT_TERTIARY = '#5b6472';
const TEXT_HEADING = '#3b4250';
const PILL_BG = '#eceef2';

interface Props {
  tabData: CostingTab;
  onUpdateTab: (updated: CostingTab) => void;
  isOpen: boolean;
  onClose: () => void;
  // Group yang harus otomatis di-scroll-ke + dibuka, dengan Group lain diciutkan — dipakai saat
  // modal dibuka dari tombol "Isi Detail RAB/BQ" di baris Group tertentu (CostingTable). null/
  // undefined kalau dibuka dari tombol umum "Detail RAB/BQ" di level Tab (semua Group dibuka).
  focusGroupId?: string | null;
  // groupId -> huruf kategori (A, B, C...), dihitung lintas SEMUA Tab di CostingTabsSection —
  // PERSIS sama dengan huruf yang akan dicetak PDF (lihat src/lib/categoryLetter.ts).
  groupCategoryLetters: Record<string, string>;
  documentInfo: DocumentInfo;
  onExportPdf: () => void;
}

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;

function detailTotal(d: WorkDetail) {
  return { jasa: d.volume * d.servicePrice, material: d.volume * d.materialPrice };
}

function fmtVolume(n: number): string {
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// `importToken`+`groupIndex` (bukan cuma Date.now()) supaya id antar-Group tetap unik walau
// semua Group dibangun di tick sinkron yang sama saat commit import.
function buildWorkDetailsFromParsedGroup(
  parsedGroup: ParsedBoqGroup,
  importToken: number,
  groupIndex: number
): WorkDetail[] {
  return parsedGroup.rows.map((row, ri) => ({
    id: `wd-import-${importToken}-${groupIndex}-${ri}`,
    name: row.name,
    spesifikasi: row.spesifikasi,
    volume: row.volume,
    unit: row.unit,
    servicePrice: row.servicePrice,
    materialPrice: row.materialPrice,
    sortOrder: ri,
    attachments: [],
  }));
}

const UNIT_OPTIONS = [
  'Titik',
  'Ls',
  'm²',
  'Unit',
  'Set',
  'Pcs',
  'Meter',
  'Box',
  'Pack',
  'Batang',
  'Buah',
  'Roll',
];

export default function GroupWorkItemsPanel({
  tabData,
  onUpdateTab,
  isOpen,
  onClose,
  focusGroupId,
  groupCategoryLetters,
  documentInfo,
  onExportPdf,
}: Props) {
  const groups = tabData.groups;
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const kategoriInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState('');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [boqImportDoc, setBoqImportDoc] = useState<ParsedBoqDocument | null>(null);
  const [boqImportPreviewOpen, setBoqImportPreviewOpen] = useState(false);
  const editSnapshotRef = useRef<{
    groupId: string;
    workItemId: string;
    detail: WorkDetail;
  } | null>(null);

  // Buka Group yang di-fokus (dari tombol per-baris di CostingTable) dan ciutkan sisanya + auto
  // scroll ke situ. Kalau tidak ada fokus spesifik (dibuka dari tombol umum di level Tab), semua
  // Group dibuka. Sengaja cuma bergantung ke isOpen/focusGroupId — tidak perlu re-run tiap
  // tabData berubah (mis. user mengetik), supaya state ciut/buka tidak ke-reset saat mengetik.
  useEffect(() => {
    if (!isOpen) return;
    if (focusGroupId) {
      setCollapsedGroupIds(groups.filter((g) => g.id !== focusGroupId).map((g) => g.id));
      requestAnimationFrame(() => {
        groupRefs.current[focusGroupId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      setCollapsedGroupIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, focusGroupId]);

  const updateGroup = (groupId: string, updater: (g: CostingGroup) => CostingGroup) => {
    onUpdateTab({
      ...tabData,
      groups: tabData.groups.map((g) => (g.id === groupId ? updater(g) : g)),
    });
  };

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsedGroupIds.includes(g.id));
  const toggleCollapseAll = () => setCollapsedGroupIds(allCollapsed ? [] : groups.map((g) => g.id));

  const handleRenameGroup = (groupId: string, name: string) =>
    updateGroup(groupId, (g) => ({ ...g, name }));

  const handleAddGroup = () => {
    const newGroup: CostingGroup = {
      id: `grp-${tabData.id}-${Date.now()}`,
      name: '',
      rows: [],
      sortOrder: tabData.groups.length,
      workItems: [],
    };
    onUpdateTab({ ...tabData, groups: [...tabData.groups, newGroup] });
    requestAnimationFrame(() => {
      groupRefs.current[newGroup.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    onUpdateTab({ ...tabData, groups: tabData.groups.filter((g) => g.id !== groupId) });
  };

  // Kalau Group belum punya WorkItem sama sekali, buat 1 secara otomatis dengan Name kosong —
  // PDF (QuotationPdfService.RenderWorkItemsContent) merender WorkItem.Name sebagai judul teks
  // sendiri SEBELUM tabel WorkDetail-nya; Name kosong berarti judul itu tidak kelihatan sama
  // sekali, jadi baris WorkDetail tampak langsung menyatu di bawah huruf Group — persis seperti
  // mockup. Detail baru selalu masuk ke WorkItem TERAKHIR di Group itu (bukan bikin WorkItem baru
  // tiap kali) supaya penomoran WorkDetail (yang di PDF reset per-WorkItem) tetap 1..N berurutan.
  const handleAddDetail = (group: CostingGroup) => {
    const workItems = group.workItems ?? [];
    const newDetail: WorkDetail = {
      id: `wd-${group.id}-${Date.now()}`,
      name: '',
      spesifikasi: '',
      volume: 0,
      unit: '',
      servicePrice: 0,
      materialPrice: 0,
      sortOrder: 0,
      attachments: [],
    };
    let targetWorkItemId: string;
    let nextWorkItems: WorkItem[];
    if (workItems.length === 0) {
      const newWorkItem: WorkItem = {
        id: `wi-${group.id}-${Date.now()}`,
        name: '',
        sortOrder: 0,
        workDetails: [newDetail],
      };
      nextWorkItems = [newWorkItem];
      targetWorkItemId = newWorkItem.id;
    } else {
      const last = workItems[workItems.length - 1];
      newDetail.sortOrder = last.workDetails.length;
      nextWorkItems = workItems.map((w, i) =>
        i === workItems.length - 1 ? { ...w, workDetails: [...w.workDetails, newDetail] } : w
      );
      targetWorkItemId = last.id;
    }
    updateGroup(group.id, (g) => ({ ...g, workItems: nextWorkItems }));
    setCollapsedGroupIds((prev) => prev.filter((id) => id !== group.id));
    editSnapshotRef.current = {
      groupId: group.id,
      workItemId: targetWorkItemId,
      detail: newDetail,
    };
    setEditingKey(newDetail.id);
  };

  const updateDetailLocal = (
    groupId: string,
    workItemId: string,
    detailId: string,
    patch: Partial<WorkDetail>
  ) => {
    updateGroup(groupId, (g) => ({
      ...g,
      workItems: (g.workItems ?? []).map((w) =>
        w.id !== workItemId
          ? w
          : {
              ...w,
              workDetails: w.workDetails.map((d) => (d.id === detailId ? { ...d, ...patch } : d)),
            }
      ),
    }));
  };

  const handleDeleteDetail = (groupId: string, workItemId: string, detailId: string) => {
    updateGroup(groupId, (g) => ({
      ...g,
      workItems: (g.workItems ?? []).map((w) =>
        w.id !== workItemId
          ? w
          : { ...w, workDetails: w.workDetails.filter((d) => d.id !== detailId) }
      ),
    }));
    if (editingKey === detailId) {
      editSnapshotRef.current = null;
      setEditingKey(null);
    }
  };

  const startEdit = (groupId: string, workItemId: string, detail: WorkDetail) => {
    editSnapshotRef.current = { groupId, workItemId, detail: { ...detail } };
    setEditingKey(detail.id);
  };
  const commitEdit = () => {
    editSnapshotRef.current = null;
    setEditingKey(null);
  };
  const cancelEdit = () => {
    const snap = editSnapshotRef.current;
    if (snap) {
      // Baris yang baru ditambah (Uraian masih kosong) dibatalkan berarti dibuang, bukan
      // disimpan kosong — sesuai permintaan "detail baru tidak disimpan sampai uraian diisi".
      if (snap.detail.name.trim() === '') {
        handleDeleteDetail(snap.groupId, snap.workItemId, snap.detail.id);
      } else {
        updateDetailLocal(snap.groupId, snap.workItemId, snap.detail.id, snap.detail);
      }
    }
    editSnapshotRef.current = null;
    setEditingKey(null);
  };

  const handleUploadImage = async (
    groupId: string,
    workItemId: string,
    detail: WorkDetail,
    file: File
  ) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      toast.error(`${file.name}: harus berformat JPG atau PNG`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`${file.name}: ukuran maksimal 1MB`);
      return;
    }
    try {
      const attachment = await quotationService.uploadWorkDetailAttachment(detail.id, file);
      const currentGroup = tabData.groups.find((g) => g.id === groupId);
      const currentAttachments =
        currentGroup?.workItems
          ?.find((w) => w.id === workItemId)
          ?.workDetails.find((d) => d.id === detail.id)?.attachments ?? [];
      updateDetailLocal(groupId, workItemId, detail.id, {
        attachments: [...currentAttachments, attachment],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${file.name}: gagal mengunggah gambar`);
    }
  };

  const handleUploadImages = async (
    groupId: string,
    workItemId: string,
    detail: WorkDetail,
    files: File[]
  ) => {
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      await handleUploadImage(groupId, workItemId, detail, file);
    }
  };

  const handleDeleteImage = async (
    groupId: string,
    workItemId: string,
    detail: WorkDetail,
    attachmentId: string
  ) => {
    try {
      await quotationService.deleteWorkDetailAttachment(attachmentId);
      updateDetailLocal(groupId, workItemId, detail.id, {
        attachments: detail.attachments.filter((a) => a.id !== attachmentId),
      });
    } catch {
      toast.error('Gagal menghapus gambar');
    }
  };

  // Import Excel seluruh dokumen (multi-Group sekaligus) — parsing murni ada di
  // src/lib/boqExcelImport.ts (deteksi kolom dari teks header, deteksi baris Group/Total/detail,
  // validasi subtotal). Handler di sini cuma menjalankan parser lalu membuka modal pratinjau;
  // commit ke tabData baru terjadi di handleConfirmImport setelah user konfirmasi mode.
  const handleSelectBoqExcelFile = async (file: File) => {
    const result = await parseBoqExcelFile(file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBoqImportDoc(result.document);
    setBoqImportPreviewOpen(true);
  };

  const handleConfirmImport = (mode: BoqImportMode) => {
    const doc = boqImportDoc;
    if (!doc) return;
    const importToken = Date.now();

    let nextGroups: CostingGroup[];
    if (mode === 'replace') {
      nextGroups = doc.groups.map((parsedGroup, gi) => ({
        id: `grp-${tabData.id}-import-${importToken}-${gi}`,
        name: parsedGroup.name,
        rows: [],
        sortOrder: gi,
        workItems: [
          {
            id: `wi-import-${importToken}-${gi}`,
            name: '',
            sortOrder: 0,
            workDetails: buildWorkDetailsFromParsedGroup(parsedGroup, importToken, gi),
          },
        ],
      }));
    } else {
      const plans = matchGroupsAgainstExisting(doc.groups, tabData.groups);
      nextGroups = [...tabData.groups];
      plans.forEach(({ parsedGroup, targetGroupId }, gi) => {
        const workDetails = buildWorkDetailsFromParsedGroup(parsedGroup, importToken, gi);
        if (targetGroupId) {
          nextGroups = nextGroups.map((g) => {
            if (g.id !== targetGroupId) return g;
            const existingWorkItems = g.workItems ?? [];
            const newWorkItem: WorkItem = {
              id: `wi-import-${importToken}-${gi}`,
              name: '',
              sortOrder: existingWorkItems.length,
              workDetails,
            };
            return { ...g, workItems: [...existingWorkItems, newWorkItem] };
          });
        } else {
          nextGroups = [
            ...nextGroups,
            {
              id: `grp-${tabData.id}-import-${importToken}-${gi}`,
              name: parsedGroup.name,
              rows: [],
              sortOrder: nextGroups.length,
              workItems: [
                { id: `wi-import-${importToken}-${gi}`, name: '', sortOrder: 0, workDetails },
              ],
            },
          ];
        }
      });
    }

    onUpdateTab({ ...tabData, groups: nextGroups });
    setCollapsedGroupIds([]);
    setBoqImportPreviewOpen(false);
    setBoqImportDoc(null);
    const totalRows = doc.groups.reduce((s, g) => s + g.rows.length, 0);
    toast.success(`${totalRows} baris dari ${doc.groups.length} bagian berhasil diimpor`);
  };

  // ── Search filter ──────────────────────────────────────────────────────────
  const searchTerm = search.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;
  const visibleGroups = useMemo(() => {
    if (!isSearching) return groups;
    return groups
      .map((g) => {
        if (g.name.toLowerCase().includes(searchTerm)) return g;
        const matchingWorkItems = (g.workItems ?? [])
          .map((w) => {
            const details = w.workDetails.filter(
              (d) =>
                d.name.toLowerCase().includes(searchTerm) ||
                d.spesifikasi.toLowerCase().includes(searchTerm)
            );
            return details.length > 0 ? { ...w, workDetails: details } : null;
          })
          .filter((w): w is WorkItem => w !== null);
        return matchingWorkItems.length > 0 ? { ...g, workItems: matchingWorkItems } : null;
      })
      .filter((g): g is CostingGroup => g !== null);
  }, [groups, isSearching, searchTerm]);

  // ── Ringkasan (seluruh dokumen / Tab ini) ───────────────────────────────────
  const summary = groups.reduce(
    (acc, g) => {
      (g.workItems ?? []).forEach((w) => {
        w.workDetails.forEach((d) => {
          const t = detailTotal(d);
          acc.jasa += t.jasa;
          acc.material += t.material;
          acc.detailCount += 1;
        });
      });
      acc.workItemCount += (g.workItems ?? []).length;
      return acc;
    },
    { jasa: 0, material: 0, detailCount: 0, workItemCount: 0 }
  );
  const nextGroupLetter = toCategoryLetter(Object.keys(groupCategoryLetters).length);

  const gridStyle = (template: string): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: template,
    columnGap: COL_GAP,
  });

  return (
    <>
      <ERPModal
        isOpen={isOpen}
        onClose={onClose}
        title="Detail RAB/BQ"
        size="full"
        headerExtra={
          <div className="flex items-center gap-2.5 mt-1">
            <label className="text-[13px] text-[#5b6472] font-500">Nama BOQ</label>
            <div className="flex items-center gap-1.5 h-9 pl-3 pr-1.5 border border-[#e3e6eb] rounded-lg bg-[#f8f9fb]">
              <input
                ref={kategoriInputRef}
                value={tabData.label}
                onChange={(e) => onUpdateTab({ ...tabData, label: e.target.value })}
                placeholder="Nama BOQ Baru"
                className="border-0 bg-transparent outline-none font-600 w-[200px] text-[14px]"
              />
              <button
                type="button"
                aria-label="Ubah nama BOQ"
                onClick={() => kategoriInputRef.current?.focus()}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[#5b6472] hover:bg-black/5"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[#4a5260] text-[13px]">
              <Check size={16} />
              Perubahan tersimpan otomatis sebagai draft
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[13px] text-[#5b6472] font-600">Grand Total</span>
                <span className="text-[22px] font-800">
                  Rp {formatInt(summary.jasa + summary.material)}
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 border border-[#d5d9e0] bg-white rounded-[10px] font-600"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="h-11 px-4 inline-flex items-center gap-2 border border-[#1d4ed8] bg-white rounded-[10px] font-700 text-[#1d4ed8]"
                >
                  <FileText size={18} /> Pratinjau PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-6 border-0 bg-[#1d4ed8] rounded-[10px] font-700 text-white"
                >
                  Simpan RAB
                </button>
              </div>
            </div>
          </div>
        }
      >
        {/* Informasi Dokumen — dipindah ke atas body (bukan di header ERPModal) supaya tetap 100%
          lebar/posisi persis seperti mockup (grid 2x2 lebar 560px), tanpa terikat pada slot
          headerExtra yang sempit di sebelah judul. TANPA Area Block Tender — field itu sudah
          dihapus total dari sistem (task #46) dan sengaja tidak dihidupkan lagi walau ada di
          mockup, sesuai instruksi eksplisit. */}
        <div className="flex items-start justify-end -mt-2 mb-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 w-[560px] p-3.5 border border-[#e3e6eb] rounded-xl bg-[#f8f9fb]">
            <div className="col-span-2 text-sm font-700 text-[#3b4250]">
              Informasi Dokumen <span className="font-500 text-[#5b6472]">· tampil di kop PDF</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-[#4a5260] font-600">Proyek</span>
              <div className="h-9 box-border px-2.5 border border-[#d5d9e0] rounded-lg bg-white flex items-center text-[14px] truncate">
                {documentInfo.projectName || <span className="text-[#8a93a1]">Nama proyek</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-[#4a5260] font-600">No. Dokumen</span>
              <div className="h-9 box-border px-2.5 border border-[#d5d9e0] rounded-lg bg-white flex items-center text-[14px] truncate">
                {documentInfo.quotationNo || (
                  <span className="text-[#8a93a1]">Otomatis saat disimpan</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-sm text-[#4a5260] font-600">Tanggal</span>
              <div className="h-9 box-border px-2.5 border border-[#d5d9e0] rounded-lg bg-white flex items-center text-[14px] truncate w-1/2">
                {documentInfo.date ? (
                  formatDate(documentInfo.date)
                ) : (
                  <span className="text-[#8a93a1]">dd/mm/yyyy</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kartu ringkasan */}
        <div
          className="grid gap-4 mb-5"
          style={{ gridTemplateColumns: '1fr 1fr 1.4fr 1.4fr 1.8fr' }}
        >
          <div className="flex flex-col gap-1 p-3.5 border border-[#e3e6eb] rounded-xl">
            <span className="text-sm text-[#5b6472] font-600">Item Pekerjaan</span>
            <span className="text-[22px] font-700">{groups.length}</span>
          </div>
          <div className="flex flex-col gap-1 p-3.5 border border-[#e3e6eb] rounded-xl">
            <span className="text-sm text-[#5b6472] font-600">Detail Item</span>
            <span className="text-[22px] font-700">{summary.detailCount}</span>
          </div>
          <div className="flex flex-col gap-1 p-3.5 border border-[#e3e6eb] rounded-xl">
            <span className="text-sm text-[#5b6472] font-600">Total Jasa &amp; Instalasi</span>
            <span className="text-[22px] font-700">Rp {formatInt(summary.jasa)}</span>
          </div>
          <div className="flex flex-col gap-1 p-3.5 border border-[#e3e6eb] rounded-xl">
            <span className="text-sm text-[#5b6472] font-600">Total Material</span>
            <span className="text-[22px] font-700">Rp {formatInt(summary.material)}</span>
          </div>
          <div
            className="flex flex-col gap-1 p-3.5 rounded-xl"
            style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_LINE}` }}
          >
            <span className="text-sm font-600" style={{ color: ACCENT_DEEP }}>
              Grand Total RAB
            </span>
            <span className="text-[26px] font-800 tracking-tight" style={{ color: ACCENT_DEEP }}>
              Rp {formatInt(summary.jasa + summary.material)}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 h-11 px-3.5 border border-[#d5d9e0] rounded-[10px] text-[#5b6472] w-[360px]">
            <Search size={18} />
            <input
              aria-label="Cari"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari uraian atau spesifikasi…"
              className="border-0 outline-none flex-1 bg-transparent text-[14px]"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleCollapseAll}
              disabled={groups.length === 0}
              className="h-11 px-3.5 inline-flex items-center gap-2 border-0 bg-transparent rounded-[10px] font-600 text-[#3b4250] disabled:opacity-40"
            >
              <ChevronsUpDown size={18} /> {allCollapsed ? 'Buka semua' : 'Tutup semua'}
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handleSelectBoqExcelFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="h-11 px-4 inline-flex items-center gap-2 border border-[#d5d9e0] bg-white rounded-[10px] font-600"
            >
              <FileSpreadsheet size={18} /> Import Excel
            </button>
            <button
              type="button"
              onClick={handleAddGroup}
              className="h-11 px-[18px] inline-flex items-center gap-2 border-0 rounded-[10px] font-700 text-white"
              style={{ background: ACCENT }}
            >
              <Plus size={18} /> Item Pekerjaan
            </button>
          </div>
        </div>

        {isSearching && visibleGroups.length === 0 && (
          <p className="text-sm text-[#4a5260] text-center py-6">
            Tidak ada uraian/spesifikasi yang cocok dengan &quot;{search}&quot;.
          </p>
        )}

        {groups.length > 0 && (
          <div className="border border-[#e3e6eb] rounded-xl overflow-hidden">
            {/* Header 2 tingkat */}
            <div
              style={gridStyle(GRID_TEMPLATE_FULL)}
              className="px-5 bg-[#f4f5f7] border-b border-[#e3e6eb] text-sm font-700 tracking-wide uppercase text-[#4a5260]"
            >
              <div className="row-span-2 flex items-center">No</div>
              <div className="row-span-2 flex items-center">Uraian &amp; Spesifikasi</div>
              <div className="row-span-2 flex items-center justify-end">Volume</div>
              <div className="row-span-2 flex items-center">Satuan</div>
              <div className="col-span-2 py-1 text-center border-b border-[#d5d9e0]">
                Harga Satuan
              </div>
              <div className="col-span-2 py-1 text-center border-b border-[#d5d9e0]">Total</div>
              <div className="row-span-2 flex items-center justify-center">Aksi</div>
              <div className="py-1 text-right normal-case tracking-normal">
                Jasa &amp; Instalasi
              </div>
              <div className="py-1 text-right normal-case tracking-normal">Material</div>
              <div className="py-1 text-right normal-case tracking-normal">
                Jasa &amp; Instalasi
              </div>
              <div className="py-1 text-right normal-case tracking-normal">Material</div>
            </div>

            {visibleGroups.map((group) => {
              const isCollapsed = !isSearching && collapsedGroupIds.includes(group.id);
              const letter = groupCategoryLetters[group.id] ?? '?';
              const workItems = group.workItems ?? [];
              const detailCount = workItems.reduce((n, w) => n + w.workDetails.length, 0);
              const groupTotals = workItems.reduce(
                (acc, w) =>
                  w.workDetails.reduce((a, d) => {
                    const t = detailTotal(d);
                    a.jasa += t.jasa;
                    a.material += t.material;
                    return a;
                  }, acc),
                { jasa: 0, material: 0 }
              );

              return (
                <div
                  key={group.id}
                  ref={(el) => {
                    groupRefs.current[group.id] = el;
                  }}
                >
                  {/* Baris Group (berhuruf) */}
                  <div
                    style={{ ...gridStyle(GRID_TEMPLATE_GROUP), height: 56, alignItems: 'center' }}
                    className="px-5 bg-[#f8f9fb] border-b border-[#e3e6eb]"
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={
                          isCollapsed ? `Buka bagian ${letter}` : `Ciutkan bagian ${letter}`
                        }
                        onClick={() => toggleCollapse(group.id)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[#3b4250]"
                      >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <span
                        className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px] text-white font-800 text-base"
                        style={{ background: ACCENT }}
                      >
                        {letter}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        value={group.name}
                        onChange={(e) => handleRenameGroup(group.id, e.target.value)}
                        placeholder="Nama item pekerjaan, mis. Preliminaries"
                        className={`flex-1 min-w-0 h-10 box-border px-3 rounded-lg font-600 text-lg bg-white ${
                          group.name.trim() === ''
                            ? 'outline outline-3'
                            : 'border border-transparent hover:border-[#e3e6eb]'
                        }`}
                        style={
                          group.name.trim() === ''
                            ? { border: `1px solid ${ACCENT}`, outlineColor: ACCENT_LINE }
                            : undefined
                        }
                      />
                      {detailCount > 0 && (
                        <span
                          className="text-sm text-[#4a5260] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: PILL_BG }}
                        >
                          {detailCount} detail
                        </span>
                      )}
                    </div>
                    <div className="text-right font-700">Rp {formatInt(groupTotals.jasa)}</div>
                    <div className="text-right font-700">Rp {formatInt(groupTotals.material)}</div>
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        aria-label="Ubah nama item pekerjaan"
                        onClick={() => groupRefs.current[group.id]?.querySelector('input')?.focus()}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#5b6472]"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus item pekerjaan"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg"
                        style={{ color: DANGER }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed &&
                    workItems.map((workItem) => (
                      <React.Fragment key={workItem.id}>
                        {workItem.name.trim() !== '' && (
                          <div
                            className="px-5 pt-2 pb-1 font-700 text-base"
                            style={{ paddingLeft: 72 }}
                          >
                            {workItem.name}
                          </div>
                        )}
                        {workItem.workDetails.map((detail, di) => {
                          const isEditing = editingKey === detail.id;
                          const canUpload = isGuid(detail.id);
                          const inputKey = `${workItem.id}:${detail.id}`;
                          const t = detailTotal(detail);

                          if (isEditing) {
                            return (
                              <div
                                key={detail.id}
                                className="flex flex-col gap-3 px-5 py-3.5"
                                style={{
                                  background: ACCENT_SOFT,
                                  borderTop: `2px solid ${ACCENT}`,
                                  borderBottom: `1px solid ${ACCENT_LINE}`,
                                }}
                              >
                                <div
                                  style={{ ...gridStyle(GRID_TEMPLATE_FULL), alignItems: 'start' }}
                                >
                                  <div
                                    className="pt-2.5 pl-8 font-700"
                                    style={{ color: ACCENT_DEEP }}
                                  >
                                    {di + 1}
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <input
                                      autoFocus
                                      aria-label="Uraian pekerjaan"
                                      value={detail.name}
                                      onChange={(e) =>
                                        updateDetailLocal(group.id, workItem.id, detail.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      placeholder="Uraian, mis. Mobilisasi & Demobilisasi"
                                      className="h-10 box-border px-3 rounded-lg font-600 bg-white outline-0"
                                      style={{
                                        border: `1px solid ${ACCENT}`,
                                        boxShadow: `0 0 0 3px ${ACCENT_LINE}`,
                                      }}
                                    />
                                    <textarea
                                      aria-label="Spesifikasi"
                                      rows={2}
                                      value={detail.spesifikasi}
                                      onChange={(e) =>
                                        updateDetailLocal(group.id, workItem.id, detail.id, {
                                          spesifikasi: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      placeholder="Spesifikasi, mis. NYM 3x2.5mm² ex. Supreme, Pipa Conduit…"
                                      className="box-border px-3 py-2 rounded-lg bg-white resize-y text-sm leading-snug"
                                      style={{ border: `1px solid ${BORDER_INPUT_2}` }}
                                    />
                                  </div>
                                  <input
                                    aria-label="Volume"
                                    type="number"
                                    value={detail.volume === 0 ? '' : detail.volume}
                                    onChange={(e) =>
                                      updateDetailLocal(group.id, workItem.id, detail.id, {
                                        volume: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="0,00"
                                    className="h-10 box-border px-2.5 rounded-lg bg-white text-right min-w-0"
                                    style={{ border: `1px solid ${BORDER_INPUT_2}` }}
                                  />
                                  <div className="relative">
                                    <select
                                      aria-label="Satuan"
                                      value={detail.unit}
                                      onChange={(e) =>
                                        updateDetailLocal(group.id, workItem.id, detail.id, {
                                          unit: e.target.value,
                                        })
                                      }
                                      className="w-full h-10 box-border pl-2.5 pr-6 rounded-lg bg-white appearance-none"
                                      style={{ border: `1px solid ${BORDER_INPUT_2}` }}
                                    >
                                      <option value="">Pilih</option>
                                      {UNIT_OPTIONS.map((u) => (
                                        <option key={u} value={u}>
                                          {u}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      size={16}
                                      className="absolute right-2 top-3 pointer-events-none text-[#5b6472]"
                                    />
                                  </div>
                                  <CurrencyInput
                                    value={detail.servicePrice}
                                    prefix="Rp"
                                    prefixVariant="chip"
                                    onChange={(v) =>
                                      updateDetailLocal(group.id, workItem.id, detail.id, {
                                        servicePrice: v,
                                      })
                                    }
                                  />
                                  <CurrencyInput
                                    value={detail.materialPrice}
                                    prefix="Rp"
                                    prefixVariant="chip"
                                    onChange={(v) =>
                                      updateDetailLocal(group.id, workItem.id, detail.id, {
                                        materialPrice: v,
                                      })
                                    }
                                  />
                                  <div
                                    className="h-10 flex items-center justify-end font-700"
                                    style={{ color: ACCENT_DEEP }}
                                  >
                                    {formatInt(t.jasa)}
                                  </div>
                                  <div
                                    className="h-10 flex items-center justify-end font-700"
                                    style={{ color: ACCENT_DEEP }}
                                  >
                                    {formatInt(t.material)}
                                  </div>
                                  <div className="flex justify-center gap-1">
                                    <input
                                      ref={(el) => {
                                        fileInputRefs.current[inputKey] = el;
                                      }}
                                      type="file"
                                      accept="image/jpeg,image/png"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        const files = e.target.files
                                          ? Array.from(e.target.files)
                                          : [];
                                        e.target.value = '';
                                        if (files.length > 0)
                                          handleUploadImages(group.id, workItem.id, detail, files);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      aria-label="Unggah lampiran"
                                      disabled={!canUpload}
                                      onClick={() => fileInputRefs.current[inputKey]?.click()}
                                      title={
                                        canUpload
                                          ? undefined
                                          : 'Simpan penawaran dulu untuk upload gambar'
                                      }
                                      className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-white disabled:opacity-40"
                                      style={{ border: `1px dashed #9aa3b0`, color: TEXT_HEADING }}
                                    >
                                      <Upload size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Hapus detail"
                                      onClick={() =>
                                        handleDeleteDetail(group.id, workItem.id, detail.id)
                                      }
                                      className="w-10 h-10 inline-flex items-center justify-center rounded-lg"
                                      style={{ color: DANGER }}
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                                {detail.attachments.length > 0 && (
                                  <div
                                    className="flex flex-wrap gap-1.5"
                                    style={{ paddingLeft: 72 }}
                                  >
                                    {detail.attachments.map((a) => (
                                      <span
                                        key={a.id}
                                        className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded-lg"
                                        style={{ border: `1px solid ${BORDER_INPUT_2}` }}
                                      >
                                        {a.fileName}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteImage(group.id, workItem.id, detail, a.id)
                                          }
                                          className="text-[#5b6472] hover:text-red-500"
                                          aria-label={`Hapus lampiran ${a.fileName}`}
                                        >
                                          <X size={11} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div
                                  className="flex items-center justify-between"
                                  style={{ paddingLeft: 72 }}
                                >
                                  <div className="text-sm" style={{ color: TEXT_SECONDARY }}>
                                    Total = Volume × Harga Satuan, dihitung terpisah untuk Jasa
                                    &amp; Instalasi dan Material ·{' '}
                                    <kbd
                                      className="px-1.5 py-px rounded border bg-white"
                                      style={{ borderColor: BORDER_INPUT_2 }}
                                    >
                                      Enter
                                    </kbd>{' '}
                                    simpan ·{' '}
                                    <kbd
                                      className="px-1.5 py-px rounded border bg-white"
                                      style={{ borderColor: BORDER_INPUT_2 }}
                                    >
                                      Esc
                                    </kbd>{' '}
                                    batal
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      className="h-10 px-4 rounded-lg font-600 bg-white"
                                      style={{ border: `1px solid ${BORDER_INPUT_2}` }}
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={commitEdit}
                                      className="h-10 px-4 inline-flex items-center gap-1.5 rounded-lg font-700 text-white border-0"
                                      style={{ background: ACCENT }}
                                    >
                                      <Check size={16} /> Simpan baris
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={detail.id}
                              style={{ ...gridStyle(GRID_TEMPLATE_FULL), alignItems: 'center' }}
                              className="px-5 py-2.5 cursor-pointer hover:bg-black/[0.02]"
                              onClick={() => startEdit(group.id, workItem.id, detail)}
                            >
                              <div className="pl-8" style={{ color: TEXT_SECONDARY }}>
                                {di + 1}
                              </div>
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="font-600">
                                  {detail.name || (
                                    <span className="italic text-[#8a93a1]">(belum diisi)</span>
                                  )}
                                </div>
                                {detail.spesifikasi && (
                                  <div className="text-sm" style={{ color: TEXT_SECONDARY }}>
                                    {detail.spesifikasi}
                                  </div>
                                )}
                              </div>
                              <div className="text-right font-tabular">
                                {fmtVolume(detail.volume)}
                              </div>
                              <div className="font-tabular">{detail.unit}</div>
                              <div className="text-right font-tabular">
                                {formatInt(detail.servicePrice)}
                              </div>
                              <div className="text-right font-tabular">
                                {formatInt(detail.materialPrice)}
                              </div>
                              <div className="text-right font-tabular font-600">
                                {formatInt(t.jasa)}
                              </div>
                              <div className="text-right font-tabular font-600">
                                {formatInt(t.material)}
                              </div>
                              <div className="flex justify-center gap-1">
                                {detail.attachments.length > 0 ? (
                                  <button
                                    type="button"
                                    aria-label={`Lampiran, ${detail.attachments.length} file`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="relative w-10 h-10 inline-flex items-center justify-center rounded-lg"
                                    style={{ background: ACCENT_SOFT, color: ACCENT_DEEP }}
                                  >
                                    <Paperclip size={18} />
                                    <span
                                      className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] rounded-full text-white text-[10px] font-700 leading-[15px] text-center"
                                      style={{ background: ACCENT }}
                                    >
                                      {detail.attachments.length}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label="Lampiran"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEdit(group.id, workItem.id, detail);
                                    }}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg"
                                    style={{ color: TEXT_TERTIARY }}
                                  >
                                    <Paperclip size={18} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label="Hapus detail"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDetail(group.id, workItem.id, detail.id);
                                  }}
                                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg"
                                  style={{ color: DANGER }}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}

                  {!isCollapsed && (
                    <div
                      className="py-2 border-b"
                      style={{ paddingLeft: 112, paddingRight: 20, borderColor: BORDER_LIGHT }}
                    >
                      <button
                        type="button"
                        onClick={() => handleAddDetail(group)}
                        className="h-10 px-3 inline-flex items-center gap-1.5 rounded-lg font-600 bg-transparent border-0"
                        style={{ color: ACCENT }}
                      >
                        <Plus size={16} /> Tambah detail ke {letter}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total per kolom */}
            <div
              style={{ ...gridStyle(GRID_TEMPLATE_FOOTER), alignItems: 'center' }}
              className="px-5 py-2.5 bg-[#f4f5f7]"
            >
              <div
                className="text-right font-700 uppercase text-sm tracking-wide"
                style={{ color: TEXT_HEADING }}
              >
                Total per kolom
              </div>
              <div className="text-right font-800">{formatInt(summary.jasa)}</div>
              <div className="text-right font-800">{formatInt(summary.material)}</div>
              <div />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleAddGroup}
          className="mt-4 w-full h-[52px] flex items-center justify-center gap-2 rounded-xl font-700 bg-white"
          style={{ border: `1.5px dashed #b7bec9`, color: ACCENT }}
        >
          <Plus size={18} /> Tambah Item Pekerjaan ({nextGroupLetter})
        </button>

        {groups.length === 0 && (
          <p className="mt-3 text-center text-sm" style={{ color: TEXT_SECONDARY }}>
            Punya BOQ di Excel? Klik &quot;Import Excel&quot; — seluruh Group/bagian di file dibaca
            dan dibuat otomatis, tidak perlu menambah Item Pekerjaan dulu.
          </p>
        )}
      </ERPModal>
      <ImportBoqPreviewModal
        isOpen={boqImportPreviewOpen}
        onClose={() => setBoqImportPreviewOpen(false)}
        document={boqImportDoc}
        existingGroups={tabData.groups}
        onConfirm={handleConfirmImport}
      />
    </>
  );
}
