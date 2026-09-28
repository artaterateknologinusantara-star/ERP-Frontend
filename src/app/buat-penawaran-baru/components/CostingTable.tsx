'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ClipboardList,
  Link2,
  Link2Off,
  Send,
  ListChecks,
} from 'lucide-react';
import { formatRp } from '@/lib/format';
import { calcServiceSubtotal, calcMaterialSubtotal } from '@/lib/quotationCalc';
import { getMarginTier, marginTierClasses } from '@/lib/margin';
import { computeFloorPrice, floorWarningText } from '@/lib/itemMargin';
import { isGuid } from '@/lib/guid';
import {
  detailTotal,
  addWorkDetailToGroup,
  updateWorkDetailInGroup,
  deleteWorkDetailInGroup,
} from '@/lib/workDetailOps';
import type { CostingTab, CostingGroup, CostingRow, ItemMaster, WorkDetail } from '@/types';
import ItemAutocomplete from './ItemAutocomplete';
import CurrencyInput from '@/components/ui/CurrencyInput';
import DimensionCalculatorPopover from './DimensionCalculatorPopover';
import SendRabRequestModal from './SendRabRequestModal';
import RabRequestsReviewPanel from './RabRequestsReviewPanel';
import { hasPermission } from '@/lib/permissions';

// Sementara disembunyikan atas permintaan user (Sep 2026) — input recap Volume/Satuan per
// kategori (group.recapVolume/recapUnit) di baris Subtotal. Data & field-nya tetap ada di
// model/DB, cuma UI-nya di-toggle off di sini; tinggal set true lagi untuk mengaktifkan.
const SHOW_GROUP_RECAP_INPUT = false;

interface Props {
  tabData: CostingTab;
  onUpdate: (updated: CostingTab) => void;
  isCivilMeMode: boolean;
  groupCategoryLetters: Record<string, string>;
  // Modal Detail RAB/BQ sekarang 1 instance per Tab, dimiliki oleh CostingTabsSection (bukan
  // CostingTable) — supaya bisa menampilkan semua Group dokumen sekaligus. Tombol di baris Group
  // di sini cuma memicu callback ini dengan groupId yang harus di-scroll-ke + dibuka.
  onOpenRabDetail: (groupId: string) => void;
  // "Kirim RAB ke Vendor"/"Review RAB" butuh group.id yang sudah GUID asli (baris DB nyata) —
  // VendorRabRequest.QuotationGroupId adalah FK wajib, bukan sekadar validasi UI (lihat investigasi
  // sebelum fitur ini dibuat). Kalau group masih id sementara (penawaran belum pernah disimpan),
  // callback ini men-trigger auto-save (tanpa redirect, beda dari tombol "Simpan Penawaran" biasa)
  // lewat handleSaveDraft di BuatPenawaranForm, lalu mengembalikan GUID baru untuk group yang SAMA
  // (dicocokkan by posisi index tab+group, karena id sementaranya hilang begitu tersimpan) — atau
  // null kalau validasi/simpan gagal (toast error sudah ditampilkan oleh handleSaveDraft).
  onEnsureGroupSaved: (tabId: string, groupId: string) => Promise<string | null>;
}

const uomOptions = ['Unit', 'Meter', 'Box', 'Pack', 'Set', 'Batang', 'Titik', 'Ls', 'Buah', 'Roll'];

export default function CostingTable({
  tabData,
  onUpdate,
  isCivilMeMode,
  groupCategoryLetters,
  onOpenRabDetail,
  onEnsureGroupSaved,
}: Props) {
  const canSendRabRequest = hasPermission('Sales', 'canCreate');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  // groupId lagi diproses auto-save (klik "Kirim RAB"/"Review RAB" pada kategori yang belum
  // tersimpan) — dipakai untuk disable tombol yg bersangkutan + kasih feedback "Menyimpan..."
  // supaya user tidak dobel-klik selagi request simpan berjalan.
  const [savingRabGroupId, setSavingRabGroupId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  // "Material dari Maincon" (CostingRow, sekarang seksi sekunder untuk Civil ME) — collapsed
  // by default per grup, walau grup itu sudah punya isi. User harus klik chevron dulu untuk
  // melihatnya, supaya tampilan default kategori Civil ME tetap bersih & fokus ke RAB/BQ.
  const [expandedMaincon, setExpandedMaincon] = useState<string[]>([]);
  const [activeSendRabGroupId, setActiveSendRabGroupId] = useState<string | null>(null);
  const activeSendRabGroup = tabData.groups.find((g) => g.id === activeSendRabGroupId);
  const [activeReviewRabGroupId, setActiveReviewRabGroupId] = useState<string | null>(null);
  const activeReviewRabGroup = tabData.groups.find((g) => g.id === activeReviewRabGroupId);

  // Dipanggil dari tombol "Kirim RAB ke Vendor"/"Review RAB" — kalau group.id belum GUID asli
  // (penawaran belum pernah disimpan), auto-save dulu lewat onEnsureGroupSaved sebelum membuka
  // modal, supaya user tidak perlu klik "Simpan Penawaran" manual sendiri. Modal dibuka dengan
  // GUID BARU yang dikembalikan — bukan groupId lama yang sudah tidak ada lagi setelah tersimpan.
  const openSendRab = async (groupId: string) => {
    if (isGuid(groupId)) {
      setActiveSendRabGroupId(groupId);
      return;
    }
    setSavingRabGroupId(groupId);
    try {
      const realId = await onEnsureGroupSaved(tabData.id, groupId);
      if (realId) setActiveSendRabGroupId(realId);
    } finally {
      setSavingRabGroupId(null);
    }
  };

  const openReviewRab = async (groupId: string) => {
    if (isGuid(groupId)) {
      setActiveReviewRabGroupId(groupId);
      return;
    }
    setSavingRabGroupId(groupId);
    try {
      const realId = await onEnsureGroupSaved(tabData.id, groupId);
      if (realId) setActiveReviewRabGroupId(realId);
    } finally {
      setSavingRabGroupId(null);
    }
  };

  const toggleCollapse = (groupId: string) =>
    setCollapsed((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );

  const toggleRowExpanded = (rowId: string) =>
    setExpandedRows((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );

  const toggleMainconExpanded = (groupId: string) =>
    setExpandedMaincon((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );

  const expandMaincon = (groupId: string) =>
    setExpandedMaincon((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));

  const updateRow = (
    groupId: string,
    rowId: string,
    field: keyof CostingRow,
    value: string | number
  ) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              rows: g.rows.map((r) => (r.id !== rowId ? r : { ...r, [field]: value })),
            }
      ),
    });
  };

  const updateRowFields = (groupId: string, rowId: string, fields: Partial<CostingRow>) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              rows: g.rows.map((r) => (r.id !== rowId ? r : { ...r, ...fields })),
            }
      ),
    });
  };

  const fillRowFromItem = (groupId: string, rowId: string, item: ItemMaster) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              rows: g.rows.map((r) =>
                r.id !== rowId
                  ? r
                  : {
                      ...r,
                      equipment: item.name,
                      description: item.description ?? '',
                      manufacturer: item.brand ?? '',
                      unit: item.uom,
                      materialPrice: item.sellingPrice,
                      costPrice: item.purchasePrice ?? item.lastPurchasePrice ?? 0,
                      itemMasterId: item.id,
                      itemMasterCode: item.code,
                      itemMasterName: item.name,
                      marginType: item.marginType,
                      marginMinimum: item.marginMinimum,
                      sellingPriceFloor:
                        computeFloorPrice(
                          item.purchasePrice,
                          item.marginType,
                          item.marginMinimum
                        ) ?? undefined,
                    }
              ),
            }
      ),
    });
  };

  // Lepas link Item Master — baris kembali jadi free-text biasa, nama tidak lagi dikunci.
  // Tidak menghapus nama/harga yang sudah terisi, hanya memutus link-nya.
  const clearItemMasterLink = (groupId: string, rowId: string) => {
    updateRowFields(groupId, rowId, {
      itemMasterId: undefined,
      itemMasterCode: undefined,
      itemMasterName: undefined,
      marginType: undefined,
      marginMinimum: undefined,
      sellingPriceFloor: undefined,
    });
  };

  const makeEmptyRow = (
    groupId: string,
    no: string,
    sortOrder: number,
    suffix: string | number = Date.now()
  ): CostingRow => ({
    id: `row-${groupId}-${suffix}`,
    no,
    equipment: '',
    description: '',
    manufacturer: '',
    qty: 1,
    unit: 'Unit',
    servicePrice: 0,
    materialPrice: 0,
    costPrice: 0,
    sortOrder,
  });

  const addRow = (groupId: string) => {
    const group = tabData.groups.find((g) => g.id === groupId);
    if (!group) return;
    const newRow = makeEmptyRow(
      groupId,
      `${tabData.groups.indexOf(group) + 1}.${group.rows.length + 1}`,
      group.rows.length
    );
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId ? g : { ...g, rows: [...g.rows, newRow] }
      ),
    });
  };

  const deleteRow = (groupId: string, rowId: string) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId ? g : { ...g, rows: g.rows.filter((r) => r.id !== rowId) }
      ),
    });
  };

  // ── WorkItem/WorkDetail (Detail RAB/BQ) — editing inline di tabel Penawaran ini, data SAMA
  // dengan yang diisi lewat modal "Isi Detail RAB/BQ" (GroupWorkItemsPanel.tsx). Pakai helper
  // bersama src/lib/workDetailOps.ts (dipakai juga oleh modal itu) supaya kedua tempat edit tidak
  // pernah punya logika yang bisa berbeda hasil satu sama lain — keduanya menulis ke tabData.groups
  // yang sama lewat onUpdate, jadi tidak ada risiko 2 sumber kebenaran.
  const addWorkDetail = (group: CostingGroup) => {
    const { workItems: nextWorkItems } = addWorkDetailToGroup(group);
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== group.id ? g : { ...g, workItems: nextWorkItems }
      ),
    });
  };

  const updateWorkDetail = (
    groupId: string,
    workItemId: string,
    detailId: string,
    patch: Partial<WorkDetail>
  ) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, workItems: updateWorkDetailInGroup(g.workItems, workItemId, detailId, patch) }
      ),
    });
  };

  const deleteWorkDetail = (groupId: string, workItemId: string, detailId: string) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, workItems: deleteWorkDetailInGroup(g.workItems, workItemId, detailId) }
      ),
    });
  };

  const addGroup = () => {
    const groupId = `grp-${tabData.id}-${Date.now()}`;
    const groupNo = tabData.groups.length + 1;
    const newGroup: CostingGroup = {
      id: groupId,
      name: 'Kategori Baru',
      // Mulai dengan 2 baris kosong agar user langsung paham cara mengisi tabel.
      // Civil & ME tidak punya tabel item — grup diisi lewat Subkontraktor/BOQ.
      rows: isCivilMeMode
        ? []
        : [
            makeEmptyRow(groupId, `${groupNo}.1`, 0, 1),
            makeEmptyRow(groupId, `${groupNo}.2`, 1, 2),
          ],
      sortOrder: tabData.groups.length,
    };
    onUpdate({ ...tabData, groups: [...tabData.groups, newGroup] });
  };

  const updateGroupName = (groupId: string, name: string) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    });
  };

  const updateGroupFields = (groupId: string, fields: Partial<CostingGroup>) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) => (g.id === groupId ? { ...g, ...fields } : g)),
    });
  };

  const deleteGroup = (groupId: string) => {
    onUpdate({ ...tabData, groups: tabData.groups.filter((g) => g.id !== groupId) });
  };

  // Formula sama persis dengan GrandTotalPanel/TotalMarginSection/sticky bar mobile
  // BuatPenawaranForm — reuse calcServiceSubtotal/calcMaterialSubtotal (src/lib/quotationCalc.ts)
  // per Group tunggal (dibungkus array 1 elemen) daripada duplikasi formula inline di sini.
  const groupJasa = (g: CostingGroup) => calcServiceSubtotal([g], isCivilMeMode);
  const groupMaterial = (g: CostingGroup) => calcMaterialSubtotal([g], isCivilMeMode);
  const groupTotal = (g: CostingGroup) => groupJasa(g) + groupMaterial(g);
  const tabJasa = () => tabData.groups.reduce((s, g) => s + groupJasa(g), 0);
  const tabMaterial = () => tabData.groups.reduce((s, g) => s + groupMaterial(g), 0);
  const tabTotal = () => tabData.groups.reduce((s, g) => s + groupTotal(g), 0);

  // Jumlah baris WorkDetail (RAB/BQ) di 1 Group — dipakai supaya penomoran baris "Material dari
  // Maincon" (CostingRow, sekarang tampilan sekunder untuk Civil ME) melanjutkan urutan setelah
  // baris RAB/BQ (tampilan utama), bukan tumpang tindih mulai dari 1 lagi.
  const workDetailCount = (g: CostingGroup) =>
    (g.workItems ?? []).reduce((n, w) => n + w.workDetails.length, 0);

  const fmtRp = (v: number) => (v === 0 ? '—' : formatRp(v));

  const rowRevenue = (r: CostingRow) => r.qty * (r.servicePrice + r.materialPrice);
  const rowMarginPercent = (r: CostingRow) => {
    const revenue = rowRevenue(r);
    if (revenue <= 0) return 0;
    return ((revenue - r.qty * r.costPrice) / revenue) * 100;
  };

  return (
    <div>
      <datalist id="uom-options">
        {uomOptions.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[560px]">
        <table className="w-full text-base border-collapse min-w-[1220px]">
          {/* Header teks berbeda untuk Civil ME: RAB/BQ (WorkDetail) sekarang tampilan utama,
            jadi header pakai istilah RAB/BQ (Uraian Pekerjaan/Spesifikasi/Volume/Satuan), dengan
            kolom Spesifikasi & Material/Satuan di-merge (colSpan 2) — PERSIS mengikuti merge yang
            sama dipakai baris WorkDetail di body, supaya baris RAB/BQ tidak lagi terlihat "sama
            persis" dengan baris "Material dari Maincon" (CostingRow, yang tetap pakai 3 kolom
            terpisah Equipment/Deskripsi/Mfg saat isCivilMeMode false). Total lebar kolom (13)
            tetap sama pada kedua varian supaya colSpan={13} di tempat lain (caption, subtotal,
            add-row) tetap akurat. Deliberately NOT sticky: sticking it to the viewport made it cut
            into the row list mid-scroll instead of staying put above row 1 where it belongs. */}
          <thead>
            <tr className="bg-muted border-b-2 border-border">
              <th className="erp-table-cell !py-1.5 text-left text-muted-foreground font-600 text-xs uppercase tracking-wider w-10">
                No
              </th>
              <th className="erp-table-cell !py-1.5 text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[140px]">
                {isCivilMeMode ? 'Uraian Pekerjaan' : 'Equipment'}
              </th>
              {isCivilMeMode ? (
                <th
                  className="erp-table-cell !py-1.5 text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[180px]"
                  colSpan={2}
                >
                  Spesifikasi
                </th>
              ) : (
                <>
                  <th className="erp-table-cell !py-1.5 text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[180px]">
                    Deskripsi
                  </th>
                  <th className="erp-table-cell !py-1.5 text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[90px]">
                    Mfg
                  </th>
                </>
              )}
              <th className="erp-table-cell !py-1.5 text-center text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[80px]">
                {isCivilMeMode ? 'Volume' : 'Qty'}
              </th>
              <th className="erp-table-cell !py-1.5 text-center text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[100px]">
                {isCivilMeMode ? 'Satuan' : 'UoM'}
              </th>
              <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">
                Jasa/Satuan
              </th>
              <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">
                Jasa Total
              </th>
              {isCivilMeMode ? (
                <th
                  className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]"
                  colSpan={2}
                >
                  Material/Satuan
                </th>
              ) : (
                <>
                  <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">
                    Material/Satuan
                  </th>
                  <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">
                    Harga Beli/Satuan
                  </th>
                </>
              )}
              <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">
                Material Total
              </th>
              <th className="erp-table-cell !py-1.5 text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[130px]">
                Total
              </th>
              <th className="erp-table-cell !py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tabData.groups.map((group, groupIndex) => {
              const isCollapsed = collapsed.includes(group.id);
              return (
                <React.Fragment key={group.id}>
                  {/* Group Header */}
                  <tr className="group-row-bg border-b border-border">
                    <td className="erp-table-cell !py-1.5">
                      <button
                        onClick={() => toggleCollapse(group.id)}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight size={14} className="text-primary" />
                        ) : (
                          <ChevronDown size={14} className="text-primary" />
                        )}
                      </button>
                    </td>
                    <td className="erp-table-cell !py-1.5" colSpan={10}>
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => updateGroupName(group.id, e.target.value)}
                        className="bg-card border border-border shadow-sm rounded px-1.5 py-0.5 -mx-1.5 outline-none text-primary font-700 text-base w-full transition-colors hover:border-primary/40 focus:border-primary/50"
                      />
                    </td>
                    <td className="erp-table-cell !py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => deleteGroup(group.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Detail RAB/BQ (WorkItem/WorkDetail) — TAMPILAN UTAMA untuk Civil ME. Data SAMA
                    dengan modal "Isi Detail RAB/BQ" (GroupWorkItemsPanel.tsx), diedit lewat helper
                    bersama src/lib/workDetailOps.ts supaya kedua tempat edit tidak pernah berbeda
                    hasil. WorkDetail tidak punya field Mfg/Harga Beli — 2 kolom itu di-merge ke
                    kolom tetangganya (Deskripsi, Material/Satuan) untuk baris ini saja. */}
                  {!isCollapsed &&
                    isCivilMeMode &&
                    (() => {
                      let runningIndex = 0;
                      return (group.workItems ?? []).map((workItem) => (
                        <React.Fragment key={workItem.id}>
                          {workItem.name.trim() !== '' && (
                            <tr className="border-b border-border bg-primary/[0.03]">
                              <td
                                className="erp-table-cell !py-1.5 font-700 text-primary text-sm"
                                colSpan={13}
                              >
                                {workItem.name}
                              </td>
                            </tr>
                          )}
                          {workItem.workDetails.map((detail) => {
                            const no = ++runningIndex;
                            const t = detailTotal(detail);
                            return (
                              <tr
                                key={detail.id}
                                className="border-b border-border hover:bg-primary/5 transition-colors group/row bg-primary/[0.02]"
                              >
                                <td className="erp-table-cell !py-1.5 text-muted-foreground text-xs font-tabular text-center">
                                  <span className="flex items-center gap-1">
                                    <GripVertical
                                      size={11}
                                      className="text-muted-foreground/40 cursor-grab"
                                    />
                                    {groupIndex + 1}.{no}
                                  </span>
                                </td>
                                <td className="erp-table-cell !py-1.5">
                                  <input
                                    type="text"
                                    value={detail.name}
                                    onChange={(e) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    className="erp-input !py-1 text-base"
                                    placeholder="Uraian pekerjaan"
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5" colSpan={2}>
                                  <input
                                    type="text"
                                    value={detail.spesifikasi}
                                    onChange={(e) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        spesifikasi: e.target.value,
                                      })
                                    }
                                    className="erp-input !py-1 text-base"
                                    placeholder="Spesifikasi"
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5 min-w-[80px]">
                                  <input
                                    type="number"
                                    value={detail.volume}
                                    min={0}
                                    onChange={(e) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        volume: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="erp-input !py-1 text-right font-tabular [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5 min-w-[100px]">
                                  <input
                                    list="uom-options"
                                    value={detail.unit}
                                    onChange={(e) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        unit: e.target.value,
                                      })
                                    }
                                    className="erp-input !py-1 text-base"
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5">
                                  <CurrencyInput
                                    value={detail.servicePrice}
                                    prefix=""
                                    className="!py-1"
                                    onChange={(v) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        servicePrice: v,
                                      })
                                    }
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5 text-right font-tabular text-base text-foreground">
                                  {fmtRp(t.jasa)}
                                </td>
                                <td className="erp-table-cell !py-1.5" colSpan={2}>
                                  <CurrencyInput
                                    value={detail.materialPrice}
                                    prefix=""
                                    className="!py-1"
                                    onChange={(v) =>
                                      updateWorkDetail(group.id, workItem.id, detail.id, {
                                        materialPrice: v,
                                      })
                                    }
                                  />
                                </td>
                                <td className="erp-table-cell !py-1.5 text-right font-tabular text-base text-foreground">
                                  {fmtRp(t.material)}
                                </td>
                                <td className="erp-table-cell !py-1.5 text-right font-700 font-tabular text-foreground">
                                  {fmtRp(t.jasa + t.material)}
                                </td>
                                <td className="erp-table-cell !py-1.5">
                                  <button
                                    onClick={() =>
                                      deleteWorkDetail(group.id, workItem.id, detail.id)
                                    }
                                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/row:opacity-100"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ));
                    })()}

                  {/* Material dari Maincon (CostingRow) — dulu tampilan utama, sekarang fitur
                    SEKUNDER khusus untuk kasus material yang disuplai langsung oleh main-contractor
                    (bukan lewat RAB Vendor). TETAP DIPERTAHANKAN (lihat quotationCalc.ts) — jangan
                    dihapus, hanya didemosikan tampilannya untuk Civil ME. Collapsed by default
                    (walau grup sudah punya isi baris) supaya tampilan default kategori Civil ME
                    tetap bersih & fokus ke RAB/BQ — expand lewat chevron kalau perlu dicek/diedit.
                    Untuk mode non-Civil-ME, ini tetap satu-satunya cara input baris (tidak
                    berubah, tidak ada collapse). */}
                  {!isCollapsed && isCivilMeMode && group.rows.length > 0 && (
                    <tr className="border-b border-dashed border-border/70">
                      <td className="erp-table-cell p-0" colSpan={13}>
                        <button
                          type="button"
                          onClick={() => toggleMainconExpanded(group.id)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 text-left font-600 text-muted-foreground text-[11px] uppercase tracking-wide hover:text-primary hover:bg-muted/30 transition-colors"
                        >
                          {expandedMaincon.includes(group.id) ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          Material dari Maincon ({group.rows.length})
                        </button>
                      </td>
                    </tr>
                  )}
                  {!isCollapsed &&
                    (!isCivilMeMode || expandedMaincon.includes(group.id)) &&
                    group.rows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className="border-b border-border hover:bg-primary/5 transition-colors group/row"
                      >
                        <td className="erp-table-cell !py-1.5 text-muted-foreground text-xs font-tabular text-center">
                          <span className="flex items-center gap-1">
                            <GripVertical
                              size={11}
                              className="text-muted-foreground/40 cursor-grab"
                            />
                            {groupIndex + 1}.{workDetailCount(group) + rowIndex + 1}
                          </span>
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          {row.itemMasterId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="erp-input flex-1 flex items-center gap-1.5 bg-muted/30 text-[13px] truncate">
                                <Link2 size={12} className="text-primary shrink-0" />
                                <span className="truncate">
                                  {row.itemMasterCode && (
                                    <span className="font-700 mr-1">{row.itemMasterCode}</span>
                                  )}
                                  {row.itemMasterName ?? row.equipment}
                                </span>
                              </span>
                              <button
                                type="button"
                                title="Lepas link Item Master"
                                onClick={() => clearItemMasterLink(group.id, row.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                              >
                                <Link2Off size={13} />
                              </button>
                            </div>
                          ) : (
                            <ItemAutocomplete
                              value={row.equipment}
                              onChange={(v) => updateRow(group.id, row.id, 'equipment', v)}
                              onSelect={(item) => fillRowFromItem(group.id, row.id, item)}
                            />
                          )}
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              updateRow(group.id, row.id, 'description', e.target.value)
                            }
                            className="erp-input !py-1 text-base"
                            placeholder="Deskripsi singkat"
                          />
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <input
                            type="text"
                            value={row.manufacturer}
                            onChange={(e) =>
                              updateRow(group.id, row.id, 'manufacturer', e.target.value)
                            }
                            className="erp-input !py-1 text-base"
                            placeholder="Brand / MFG"
                          />
                        </td>
                        <td className="erp-table-cell !py-1.5 min-w-[80px]">
                          <div className="relative">
                            <input
                              type="number"
                              value={row.qty}
                              min={0}
                              onChange={(e) =>
                                updateRow(group.id, row.id, 'qty', parseFloat(e.target.value) || 0)
                              }
                              className="erp-input !py-1 text-right font-tabular [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {isCivilMeMode && (
                              <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <DimensionCalculatorPopover
                                  length={row.length}
                                  width={row.width}
                                  height={row.height}
                                  onApply={({ qty, length, width, height }) =>
                                    updateRowFields(group.id, row.id, {
                                      qty,
                                      length,
                                      width,
                                      height,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="erp-table-cell !py-1.5 min-w-[100px]">
                          <input
                            list="uom-options"
                            value={row.unit}
                            onChange={(e) => updateRow(group.id, row.id, 'unit', e.target.value)}
                            className="erp-input !py-1 text-base"
                          />
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <CurrencyInput
                            value={row.servicePrice}
                            prefix=""
                            className="!py-1"
                            onChange={(v) => updateRow(group.id, row.id, 'servicePrice', v)}
                          />
                        </td>
                        <td className="erp-table-cell !py-1.5 text-right font-tabular text-base text-foreground">
                          {fmtRp(row.qty * row.servicePrice)}
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <CurrencyInput
                            value={row.materialPrice}
                            prefix=""
                            className="!py-1"
                            onChange={(v) => updateRow(group.id, row.id, 'materialPrice', v)}
                          />
                          {floorWarningText(row.sellingPriceFloor, row.materialPrice) && (
                            <p className="text-[11px] text-red-600 mt-0.5">
                              {floorWarningText(row.sellingPriceFloor, row.materialPrice)}
                            </p>
                          )}
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <CurrencyInput
                            value={row.costPrice}
                            prefix=""
                            className="!py-1"
                            onChange={(v) => updateRow(group.id, row.id, 'costPrice', v)}
                          />
                        </td>
                        <td className="erp-table-cell !py-1.5 text-right font-tabular text-base text-foreground">
                          {fmtRp(row.qty * row.materialPrice)}
                        </td>
                        <td className="erp-table-cell !py-1.5 text-right font-700 font-tabular text-foreground">
                          {fmtRp(row.qty * (row.servicePrice + row.materialPrice))}
                        </td>
                        <td className="erp-table-cell !py-1.5">
                          <button
                            onClick={() => deleteRow(group.id, row.id)}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/row:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {/* Group Subtotal + toolbar — DIGABUNG jadi 1 baris (dulu 2 <tr> terpisah:
                    "Add Row" lalu "Subtotal" 2-baris sendiri) supaya tiap kategori tidak terasa
                    seperti tumpukan banyak "tabel" kecil. Semua aksi (tambah baris, Isi Detail
                    RAB/BQ, Kirim RAB, Review RAB) + label Subtotal + Volume/Satuan sekarang satu
                    baris flex-wrap tunggal; achievement Jasa/Material/Total tetap di kolom kanan
                    yang sama seperti sebelumnya. RAB/BQ (utama) didahulukan, "Material dari
                    Maincon" (CostingRow) tetap tombol sekunder khusus Civil ME. Untuk non-Civil-ME,
                    "Tambah Baris" tetap satu-satunya & primer seperti sebelumnya. */}
                  {!isCollapsed && (
                    <tr className="costing-subtotal-bar">
                      <td className="erp-table-cell !py-2" colSpan={6}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isCivilMeMode && (
                            <button
                              onClick={() => addWorkDetail(group)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors flex-shrink-0"
                            >
                              <Plus size={11} /> Tambah RAB/BQ
                            </button>
                          )}
                          <button
                            onClick={() => {
                              addRow(group.id);
                              if (isCivilMeMode) expandMaincon(group.id);
                            }}
                            className={
                              isCivilMeMode
                                ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-600 text-muted-foreground bg-muted/40 hover:bg-muted/60 rounded transition-colors flex-shrink-0'
                                : 'inline-flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors flex-shrink-0'
                            }
                          >
                            <Plus size={11} />{' '}
                            {isCivilMeMode ? 'Material dari Maincon' : 'Tambah Baris'}
                          </button>
                          {isCivilMeMode && (
                            <>
                              <span className="w-px h-4 bg-border flex-shrink-0" />
                              <button
                                type="button"
                                onClick={() => onOpenRabDetail(group.id)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 hover:bg-primary/10 hover:border-primary/50 rounded transition-colors flex-shrink-0"
                              >
                                <ClipboardList size={12} />
                                Isi Detail RAB/BQ
                                <span className="text-[10px] font-700 bg-primary/10 rounded px-1 py-0.5">
                                  {groupCategoryLetters[group.id] ?? '?'}
                                </span>
                                {(group.workItems?.length ?? 0) > 0 && (
                                  <span className="text-[10px] font-700 bg-primary/20 rounded-full px-1.5 py-0.5">
                                    {group.workItems!.length}
                                  </span>
                                )}
                              </button>
                              {canSendRabRequest && (
                                <button
                                  type="button"
                                  disabled={savingRabGroupId === group.id}
                                  onClick={() => openSendRab(group.id)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 hover:bg-primary/10 hover:border-primary/50 rounded transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Send size={12} />
                                  {savingRabGroupId === group.id
                                    ? 'Menyimpan...'
                                    : 'Kirim RAB ke Subcon'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={savingRabGroupId === group.id}
                                onClick={() => openReviewRab(group.id)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 hover:bg-primary/10 hover:border-primary/50 rounded transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <ListChecks size={12} />
                                {savingRabGroupId === group.id
                                  ? 'Menyimpan...'
                                  : 'Review RAB Subcon'}
                              </button>
                            </>
                          )}
                          <span className="flex-1 min-w-[8px]" />
                          <span className="text-primary font-700 text-xs uppercase tracking-wide flex-shrink-0">
                            Subtotal
                          </span>
                          {SHOW_GROUP_RECAP_INPUT && isCivilMeMode && (
                            <span className="flex items-center gap-1.5 text-xs flex-shrink-0">
                              <label className="text-muted-foreground">Vol:</label>
                              <input
                                type="number"
                                min={0}
                                value={group.recapVolume ?? ''}
                                onChange={(e) =>
                                  updateGroupFields(group.id, {
                                    recapVolume:
                                      e.target.value === ''
                                        ? null
                                        : parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="erp-input w-14 !py-1 text-right font-tabular"
                                placeholder="1"
                              />
                              <input
                                list="uom-options"
                                value={group.recapUnit ?? ''}
                                onChange={(e) =>
                                  updateGroupFields(group.id, { recapUnit: e.target.value || null })
                                }
                                className="erp-input w-16 !py-1"
                                placeholder="Ls"
                              />
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="erp-table-cell !py-2 text-right font-700 font-tabular text-primary text-base"
                        colSpan={2}
                      >
                        {fmtRp(groupJasa(group))}
                      </td>
                      <td
                        className="erp-table-cell !py-2 text-right font-700 font-tabular text-primary text-base"
                        colSpan={3}
                      >
                        {fmtRp(groupMaterial(group))}
                      </td>
                      <td className="erp-table-cell !py-2 text-right font-700 font-tabular text-primary text-base">
                        {fmtRp(groupTotal(group))}
                      </td>
                      <td className="erp-table-cell !py-2 text-right" />
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="grand-total-bar">
              <td
                className="erp-table-cell !py-1.5 font-700 text-sm uppercase tracking-wide"
                colSpan={6}
              >
                Total — {tabData.label}
              </td>
              <td
                className="erp-table-cell !py-1.5 text-right font-700 font-tabular text-base"
                colSpan={2}
              >
                {fmtRp(tabJasa())}
              </td>
              <td
                className="erp-table-cell !py-1.5 text-right font-700 font-tabular text-base"
                colSpan={3}
              >
                {fmtRp(tabMaterial())}
              </td>
              <td className="erp-table-cell !py-1.5 text-right font-700 font-tabular text-base">
                {fmtRp(tabTotal())}
              </td>
              <td className="erp-table-cell !py-1.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card list — replaces the table below lg, one card per group with expandable item rows */}
      <div className="lg:hidden space-y-4 max-h-[70vh] overflow-y-auto">
        {tabData.groups.map((group, groupIndex) => {
          const isCollapsed = collapsed.includes(group.id);
          return (
            <div key={group.id} className="border border-border rounded-lg overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-1 bg-muted px-2 py-2">
                <button
                  onClick={() => toggleCollapse(group.id)}
                  className="min-w-11 min-h-11 flex items-center justify-center flex-shrink-0 rounded hover:bg-card/60 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} className="text-primary" />
                  ) : (
                    <ChevronDown size={16} className="text-primary" />
                  )}
                </button>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  className="flex-1 min-w-0 bg-card border border-border shadow-sm rounded px-1.5 py-0.5 -mx-1.5 outline-none text-primary font-700 text-md transition-colors hover:border-primary/40 focus:border-primary/50"
                />
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="min-w-11 min-h-11 flex items-center justify-center flex-shrink-0 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Rows */}
              {!isCollapsed && (
                <div className="divide-y divide-border">
                  {/* Detail RAB/BQ (WorkItem/WorkDetail) — TAMPILAN UTAMA untuk Civil ME, sama
                    seperti versi desktop di atas, data identik dengan modal "Isi Detail RAB/BQ".
                    WorkDetail tidak punya Mfg/Harga Beli, jadi tidak ditampilkan di sini (bukan
                    disembunyikan, memang tidak ada field-nya). */}
                  {isCivilMeMode &&
                    (group.workItems ?? []).map((workItem) => (
                      <React.Fragment key={workItem.id}>
                        {workItem.name.trim() !== '' && (
                          <div className="px-3 py-2 bg-primary/[0.03] text-sm font-700 text-primary">
                            {workItem.name}
                          </div>
                        )}
                        {workItem.workDetails.map((detail) => {
                          const isDetailOpen = expandedRows.includes(detail.id);
                          const t = detailTotal(detail);
                          return (
                            <div key={detail.id} className="bg-primary/[0.02]">
                              <button
                                onClick={() => toggleRowExpanded(detail.id)}
                                className="w-full flex items-start gap-2 px-3 py-3 text-left"
                              >
                                <span className="flex-1 min-w-0">
                                  <span className="block text-md font-600 text-foreground truncate">
                                    {detail.name || 'Detail belum diisi'}
                                  </span>
                                  <span className="text-xl font-700 font-tabular text-foreground">
                                    {fmtRp(t.jasa + t.material)}
                                  </span>
                                </span>
                                <span className="min-w-11 min-h-11 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                  {isDetailOpen ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                </span>
                              </button>
                              {isDetailOpen && (
                                <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-3">
                                  <div>
                                    <label className="tooltip-label block mb-1">
                                      Uraian Pekerjaan
                                    </label>
                                    <input
                                      type="text"
                                      value={detail.name}
                                      onChange={(e) =>
                                        updateWorkDetail(group.id, workItem.id, detail.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      className="erp-input text-md"
                                      placeholder="Uraian pekerjaan"
                                    />
                                  </div>
                                  <div>
                                    <label className="tooltip-label block mb-1">Spesifikasi</label>
                                    <input
                                      type="text"
                                      value={detail.spesifikasi}
                                      onChange={(e) =>
                                        updateWorkDetail(group.id, workItem.id, detail.id, {
                                          spesifikasi: e.target.value,
                                        })
                                      }
                                      className="erp-input text-md"
                                      placeholder="Spesifikasi"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="tooltip-label block mb-1">Volume</label>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        value={detail.volume}
                                        min={0}
                                        onChange={(e) =>
                                          updateWorkDetail(group.id, workItem.id, detail.id, {
                                            volume: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                        className="erp-input text-md font-tabular"
                                      />
                                    </div>
                                    <div>
                                      <label className="tooltip-label block mb-1">Satuan</label>
                                      <input
                                        list="uom-options"
                                        value={detail.unit}
                                        onChange={(e) =>
                                          updateWorkDetail(group.id, workItem.id, detail.id, {
                                            unit: e.target.value,
                                          })
                                        }
                                        className="erp-input text-md"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="tooltip-label block mb-1">
                                        Jasa / Satuan
                                      </label>
                                      <CurrencyInput
                                        value={detail.servicePrice}
                                        prefix=""
                                        onChange={(v) =>
                                          updateWorkDetail(group.id, workItem.id, detail.id, {
                                            servicePrice: v,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="tooltip-label block mb-1">
                                        Material / Satuan
                                      </label>
                                      <CurrencyInput
                                        value={detail.materialPrice}
                                        prefix=""
                                        onChange={(v) =>
                                          updateWorkDetail(group.id, workItem.id, detail.id, {
                                            materialPrice: v,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-muted-foreground">
                                      Total baris:{' '}
                                      <span className="font-600 font-tabular text-foreground">
                                        {fmtRp(t.jasa + t.material)}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() =>
                                        deleteWorkDetail(group.id, workItem.id, detail.id)
                                      }
                                      className="min-w-11 min-h-11 flex items-center justify-center rounded hover:bg-red-50 text-red-500 transition-colors"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}

                  {/* Material dari Maincon (CostingRow) — dulu tampilan utama, sekarang fitur
                    SEKUNDER khusus material yang disuplai langsung oleh main-contractor. TETAP
                    DIPERTAHANKAN (lihat quotationCalc.ts), hanya didemosikan tampilannya untuk
                    Civil ME. Collapsed by default (walau grup sudah punya isi), expand lewat
                    chevron. Untuk non-Civil-ME, ini tetap satu-satunya cara input baris (tidak
                    ada collapse). */}
                  {isCivilMeMode && group.rows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleMainconExpanded(group.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 bg-muted/20 text-[11px] font-700 text-muted-foreground uppercase tracking-wide"
                    >
                      {expandedMaincon.includes(group.id) ? (
                        <ChevronDown size={13} />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                      Material dari Maincon ({group.rows.length})
                    </button>
                  )}
                  {(!isCivilMeMode || expandedMaincon.includes(group.id)) &&
                    group.rows.map((row, rowIndex) => {
                      const isRowOpen = expandedRows.includes(row.id);
                      const marginPct = rowMarginPercent(row);
                      const tier = getMarginTier(marginPct);
                      const tc = marginTierClasses[tier];
                      return (
                        <div key={row.id} className="bg-card">
                          {/* Main row — always visible */}
                          <button
                            onClick={() => toggleRowExpanded(row.id)}
                            className="w-full flex items-start gap-2 px-3 py-3 text-left"
                          >
                            <span className="text-xs text-muted-foreground font-tabular pt-1 flex-shrink-0">
                              {groupIndex + 1}.{workDetailCount(group) + rowIndex + 1}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-md font-600 text-foreground truncate">
                                {row.equipment || 'Item belum diisi'}
                              </span>
                              <span className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xl font-700 font-tabular text-foreground">
                                  {fmtRp(rowRevenue(row))}
                                </span>
                                <span
                                  className={`text-xs font-700 font-tabular px-1.5 py-0.5 rounded ${tc.bg} ${tc.text}`}
                                >
                                  {marginPct >= 0 ? '' : '-'}
                                  {Math.abs(marginPct).toFixed(0)}%
                                </span>
                              </span>
                            </span>
                            <span className="min-w-11 min-h-11 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                              {isRowOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          </button>

                          {/* Detail — expand on tap */}
                          {isRowOpen && (
                            <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-3">
                              <div>
                                <label className="tooltip-label block mb-1">Equipment</label>
                                {row.itemMasterId ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="erp-input flex-1 flex items-center gap-1.5 bg-muted/30 text-md truncate">
                                      <Link2 size={13} className="text-primary shrink-0" />
                                      <span className="truncate">
                                        {row.itemMasterCode && (
                                          <span className="font-700 mr-1">
                                            {row.itemMasterCode}
                                          </span>
                                        )}
                                        {row.itemMasterName ?? row.equipment}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      title="Lepas link Item Master"
                                      onClick={() => clearItemMasterLink(group.id, row.id)}
                                      className="p-2 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                    >
                                      <Link2Off size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <ItemAutocomplete
                                    value={row.equipment}
                                    onChange={(v) => updateRow(group.id, row.id, 'equipment', v)}
                                    onSelect={(item) => fillRowFromItem(group.id, row.id, item)}
                                  />
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="tooltip-label block mb-1">Deskripsi</label>
                                  <input
                                    type="text"
                                    value={row.description}
                                    onChange={(e) =>
                                      updateRow(group.id, row.id, 'description', e.target.value)
                                    }
                                    className="erp-input text-md"
                                    placeholder="Deskripsi singkat"
                                  />
                                </div>
                                <div>
                                  <label className="tooltip-label block mb-1">Brand / MFG</label>
                                  <input
                                    type="text"
                                    value={row.manufacturer}
                                    onChange={(e) =>
                                      updateRow(group.id, row.id, 'manufacturer', e.target.value)
                                    }
                                    className="erp-input text-md"
                                    placeholder="Brand / MFG"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="tooltip-label block mb-1">Qty</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={row.qty}
                                      min={0}
                                      onChange={(e) =>
                                        updateRow(
                                          group.id,
                                          row.id,
                                          'qty',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="erp-input text-md font-tabular"
                                    />
                                    {isCivilMeMode && (
                                      <DimensionCalculatorPopover
                                        length={row.length}
                                        width={row.width}
                                        height={row.height}
                                        onApply={({ qty, length, width, height }) =>
                                          updateRowFields(group.id, row.id, {
                                            qty,
                                            length,
                                            width,
                                            height,
                                          })
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <label className="tooltip-label block mb-1">Satuan</label>
                                  <input
                                    list="uom-options"
                                    value={row.unit}
                                    onChange={(e) =>
                                      updateRow(group.id, row.id, 'unit', e.target.value)
                                    }
                                    className="erp-input text-md"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="tooltip-label block mb-1">Jasa / Satuan</label>
                                  <CurrencyInput
                                    value={row.servicePrice}
                                    prefix=""
                                    onChange={(v) => updateRow(group.id, row.id, 'servicePrice', v)}
                                  />
                                </div>
                                <div>
                                  <label className="tooltip-label block mb-1">
                                    Material / Satuan
                                  </label>
                                  <CurrencyInput
                                    value={row.materialPrice}
                                    prefix=""
                                    onChange={(v) =>
                                      updateRow(group.id, row.id, 'materialPrice', v)
                                    }
                                  />
                                  {floorWarningText(row.sellingPriceFloor, row.materialPrice) && (
                                    <p className="text-[11px] text-red-600 mt-0.5">
                                      {floorWarningText(row.sellingPriceFloor, row.materialPrice)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="tooltip-label block mb-1">
                                  Harga Beli / Satuan (HPP)
                                </label>
                                <CurrencyInput
                                  value={row.costPrice}
                                  prefix=""
                                  onChange={(v) => updateRow(group.id, row.id, 'costPrice', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-muted-foreground">
                                  Total baris:{' '}
                                  <span className="font-600 font-tabular text-foreground">
                                    {fmtRp(rowRevenue(row))}
                                  </span>
                                </span>
                                <button
                                  onClick={() => deleteRow(group.id, row.id)}
                                  className="min-w-11 min-h-11 flex items-center justify-center rounded hover:bg-red-50 text-red-500 transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Add Row — RAB/BQ (utama) didahulukan; "Material dari Maincon" (CostingRow)
                    didemosikan jadi tombol sekunder khusus Civil ME. */}
                  <div className="p-3 flex flex-col gap-2">
                    {isCivilMeMode && (
                      <button
                        onClick={() => addWorkDetail(group)}
                        className="w-full min-h-11 flex items-center justify-center gap-1.5 text-md font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Tambah Detail RAB/BQ
                      </button>
                    )}
                    <button
                      onClick={() => {
                        addRow(group.id);
                        if (isCivilMeMode) expandMaincon(group.id);
                      }}
                      className={
                        isCivilMeMode
                          ? 'w-full min-h-11 flex items-center justify-center gap-1.5 text-md font-600 text-muted-foreground bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors'
                          : 'w-full min-h-11 flex items-center justify-center gap-1.5 text-md font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors'
                      }
                    >
                      <Plus size={14} /> {isCivilMeMode ? 'Material dari Maincon' : 'Tambah Baris'}
                    </button>
                  </div>
                </div>
              )}

              {/* Group Subtotal */}
              {!isCollapsed && (
                <div className="costing-subtotal-bar px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-700 text-primary uppercase tracking-wide flex-shrink-0">
                      Subtotal
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-700 font-tabular text-primary text-md">
                        {fmtRp(groupTotal(group))}
                      </span>
                    </div>
                  </div>
                  {SHOW_GROUP_RECAP_INPUT && isCivilMeMode && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <label className="text-muted-foreground flex-shrink-0">Volume:</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={group.recapVolume ?? ''}
                        onChange={(e) =>
                          updateGroupFields(group.id, {
                            recapVolume:
                              e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                          })
                        }
                        className="erp-input w-full text-right font-tabular py-1"
                        placeholder="1"
                      />
                      <input
                        list="uom-options"
                        value={group.recapUnit ?? ''}
                        onChange={(e) =>
                          updateGroupFields(group.id, { recapUnit: e.target.value || null })
                        }
                        className="erp-input w-full py-1"
                        placeholder="Ls"
                      />
                    </div>
                  )}
                  {isCivilMeMode && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenRabDetail(group.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 shadow-sm hover:bg-primary/10 hover:border-primary/50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <ClipboardList size={12} />
                        RAB/BQ
                        <span className="text-[10px] font-700 bg-primary/10 rounded px-1 py-0.5">
                          {groupCategoryLetters[group.id] ?? '?'}
                        </span>
                        {(group.workItems?.length ?? 0) > 0 && (
                          <span className="text-[10px] font-700 bg-primary/20 rounded-full px-1.5 py-0.5">
                            {group.workItems!.length}
                          </span>
                        )}
                      </button>
                      {canSendRabRequest && (
                        <button
                          type="button"
                          disabled={savingRabGroupId === group.id}
                          onClick={() => openSendRab(group.id)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 shadow-sm hover:bg-primary/10 hover:border-primary/50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send size={12} />
                          {savingRabGroupId === group.id ? 'Menyimpan...' : 'Kirim RAB ke Subcon'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingRabGroupId === group.id}
                        onClick={() => openReviewRab(group.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-600 text-primary bg-card border border-primary/30 shadow-sm hover:bg-primary/10 hover:border-primary/50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ListChecks size={12} />
                        {savingRabGroupId === group.id ? 'Menyimpan...' : 'Review RAB Subcon'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Tab total */}
        <div className="grand-total-bar rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="font-700 text-xs uppercase tracking-wide">Total — {tabData.label}</span>
          <span className="text-lg font-800 font-tabular">{fmtRp(tabTotal())}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <button
          onClick={addGroup}
          className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 text-base font-600 text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 hover:border-primary transition-all"
        >
          <Plus size={14} /> Tambah Kategori Baru
        </button>
      </div>

      {/* Modal Detail RAB/BQ sekarang dikonsolidasikan 1 instance per Tab, di-mount di
          CostingTabsSection (bukan di sini) — supaya bisa menampilkan semua Group sekaligus
          persis seperti mockup, bukan cuma Group ini. Tombol di bawah cuma memicu
          onOpenRabDetail(group.id) supaya parent tahu Group mana yang harus di-scroll-ke +
          dibuka saat modal itu tampil. */}
      {activeSendRabGroup && (
        <SendRabRequestModal
          group={activeSendRabGroup}
          isOpen
          onClose={() => setActiveSendRabGroupId(null)}
        />
      )}
      {activeReviewRabGroup && (
        <RabRequestsReviewPanel
          groupId={activeReviewRabGroup.id}
          groupName={activeReviewRabGroup.name}
          isOpen
          onClose={() => setActiveReviewRabGroupId(null)}
        />
      )}
    </div>
  );
}
