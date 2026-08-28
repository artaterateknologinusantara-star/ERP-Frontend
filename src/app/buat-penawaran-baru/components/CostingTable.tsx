'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { getMarginTier, marginTierClasses } from '@/lib/margin';
import { computeFloorPrice, floorWarningText } from '@/lib/itemMargin';
import type { CostingTab, CostingGroup, CostingRow, ItemMaster } from '@/types';
import ItemAutocomplete from './ItemAutocomplete';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface Props {
  tabData: CostingTab;
  onUpdate: (updated: CostingTab) => void;
}

const uomOptions = ['Unit', 'Meter', 'Box', 'Pack', 'Set', 'Batang', 'Titik', 'Ls', 'Buah', 'Roll'];

export default function CostingTable({ tabData, onUpdate }: Props) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleCollapse = (groupId: string) =>
    setCollapsed((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );

  const toggleRowExpanded = (rowId: string) =>
    setExpandedRows((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );

  const updateRow = (groupId: string, rowId: string, field: keyof CostingRow, value: string | number) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId ? g : {
          ...g,
          rows: g.rows.map((r) => r.id !== rowId ? r : { ...r, [field]: value }),
        }
      ),
    });
  };

  const fillRowFromItem = (groupId: string, rowId: string, item: ItemMaster) => {
    onUpdate({
      ...tabData,
      groups: tabData.groups.map((g) =>
        g.id !== groupId ? g : {
          ...g,
          rows: g.rows.map((r) =>
            r.id !== rowId ? r : {
              ...r,
              equipment: item.name,
              description: item.description ?? '',
              manufacturer: item.brand ?? '',
              unit: item.uom,
              materialPrice: item.sellingPrice,
              costPrice: item.purchasePrice ?? item.lastPurchasePrice ?? 0,
              itemMasterId: item.id,
              marginType: item.marginType,
              marginMinimum: item.marginMinimum,
              sellingPriceFloor: computeFloorPrice(item.purchasePrice, item.marginType, item.marginMinimum) ?? undefined,
            }
          ),
        }
      ),
    });
  };

  const makeEmptyRow = (groupId: string, no: string, sortOrder: number, suffix: string | number = Date.now()): CostingRow => ({
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
    const newRow = makeEmptyRow(groupId, `${tabData.groups.indexOf(group) + 1}.${group.rows.length + 1}`, group.rows.length);
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

  const addGroup = () => {
    const groupId = `grp-${tabData.id}-${Date.now()}`;
    const groupNo = tabData.groups.length + 1;
    const newGroup: CostingGroup = {
      id: groupId,
      name: 'Kategori Baru',
      // Mulai dengan 2 baris kosong agar user langsung paham cara mengisi tabel.
      rows: [
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

  const deleteGroup = (groupId: string) => {
    onUpdate({ ...tabData, groups: tabData.groups.filter((g) => g.id !== groupId) });
  };

  const groupJasa = (g: CostingGroup) => g.rows.reduce((s, r) => s + r.qty * r.servicePrice, 0);
  const groupMaterial = (g: CostingGroup) => g.rows.reduce((s, r) => s + r.qty * r.materialPrice, 0);
  const groupTotal = (g: CostingGroup) => g.rows.reduce((s, r) => s + r.qty * (r.servicePrice + r.materialPrice), 0);
  const tabJasa = () => tabData.groups.reduce((s, g) => s + groupJasa(g), 0);
  const tabMaterial = () => tabData.groups.reduce((s, g) => s + groupMaterial(g), 0);
  const tabTotal = () => tabData.groups.reduce((s, g) => s + groupTotal(g), 0);

  const fmtRp = (v: number) => (v === 0 ? '—' : formatRp(v));

  const rowRevenue = (r: CostingRow) => r.qty * (r.servicePrice + r.materialPrice);
  const rowMarginPercent = (r: CostingRow) => {
    const revenue = rowRevenue(r);
    if (revenue <= 0) return 0;
    return ((revenue - r.qty * r.costPrice) / revenue) * 100;
  };

  return (
    <div>
    <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[560px]">
      <table className="w-full text-base border-collapse min-w-[1220px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted border-b-2 border-border">
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider w-10">No</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[140px]">Equipment</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[180px]">Deskripsi</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[90px]">Mfg</th>
            <th className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[70px]">Qty</th>
            <th className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[100px]">UoM</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">Jasa/Satuan</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">Jasa Total</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">Material/Satuan</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">Harga Beli/Satuan</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">Material Total</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[130px]">Total</th>
            <th className="erp-table-cell w-8"></th>
          </tr>
        </thead>
        <tbody>
          {tabData.groups.map((group, groupIndex) => {
            const isCollapsed = collapsed.includes(group.id);
            return (
              <React.Fragment key={group.id}>
                {/* Group Header */}
                <tr className="group-row-bg border-b border-border">
                  <td className="erp-table-cell">
                    <button
                      onClick={() => toggleCollapse(group.id)}
                      className="p-0.5 rounded hover:bg-muted transition-colors"
                    >
                      {isCollapsed
                        ? <ChevronRight size={14} className="text-primary" />
                        : <ChevronDown size={14} className="text-primary" />}
                    </button>
                  </td>
                  <td className="erp-table-cell" colSpan={10}>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroupName(group.id, e.target.value)}
                      className="bg-transparent border-none outline-none text-primary font-700 text-base w-full"
                    />
                  </td>
                  <td className="erp-table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      ><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>

                {/* Rows */}
                {!isCollapsed && group.rows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group/row">
                    <td className="erp-table-cell text-muted-foreground text-xs font-tabular text-center">
                      <span className="flex items-center gap-1">
                        <GripVertical size={11} className="text-muted-foreground/40 cursor-grab" />
                        {groupIndex + 1}.{rowIndex + 1}
                      </span>
                    </td>
                    <td className="erp-table-cell">
                      <ItemAutocomplete
                        value={row.equipment}
                        onChange={(v) => updateRow(group.id, row.id, 'equipment', v)}
                        onSelect={(item) => fillRowFromItem(group.id, row.id, item)}
                      />
                    </td>
                    <td className="erp-table-cell">
                      <input type="text" value={row.description}
                        onChange={(e) => updateRow(group.id, row.id, 'description', e.target.value)}
                        className="erp-input text-base" placeholder="Deskripsi singkat" />
                    </td>
                    <td className="erp-table-cell">
                      <input type="text" value={row.manufacturer}
                        onChange={(e) => updateRow(group.id, row.id, 'manufacturer', e.target.value)}
                        className="erp-input text-base" placeholder="Brand / MFG" />
                    </td>
                    <td className="erp-table-cell min-w-[70px]">
                      <input type="number" value={row.qty} min={0}
                        onChange={(e) => updateRow(group.id, row.id, 'qty', parseFloat(e.target.value) || 0)}
                        className="erp-input text-right font-tabular" />
                    </td>
                    <td className="erp-table-cell min-w-[100px]">
                      <select value={row.unit}
                        onChange={(e) => updateRow(group.id, row.id, 'unit', e.target.value)}
                        className="erp-input text-base">
                        {uomOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="erp-table-cell">
                      <CurrencyInput value={row.servicePrice} prefix=""
                        onChange={(v) => updateRow(group.id, row.id, 'servicePrice', v)} />
                    </td>
                    <td className="erp-table-cell text-right font-tabular text-base text-foreground">
                      {fmtRp(row.qty * row.servicePrice)}
                    </td>
                    <td className="erp-table-cell">
                      <CurrencyInput value={row.materialPrice} prefix=""
                        onChange={(v) => updateRow(group.id, row.id, 'materialPrice', v)} />
                      {floorWarningText(row.sellingPriceFloor, row.materialPrice) && (
                        <p className="text-[11px] text-red-600 mt-0.5">{floorWarningText(row.sellingPriceFloor, row.materialPrice)}</p>
                      )}
                    </td>
                    <td className="erp-table-cell">
                      <CurrencyInput value={row.costPrice} prefix=""
                        onChange={(v) => updateRow(group.id, row.id, 'costPrice', v)} />
                    </td>
                    <td className="erp-table-cell text-right font-tabular text-base text-foreground">
                      {fmtRp(row.qty * row.materialPrice)}
                    </td>
                    <td className="erp-table-cell text-right font-700 font-tabular text-foreground">
                      {fmtRp(row.qty * (row.servicePrice + row.materialPrice))}
                    </td>
                    <td className="erp-table-cell">
                      <button onClick={() => deleteRow(group.id, row.id)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/row:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add Row — placed at the bottom of the group's items, per requested position */}
                {!isCollapsed && (
                  <tr className="border-b border-border">
                    <td className="erp-table-cell" colSpan={13}>
                      <button
                        onClick={() => addRow(group.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                      ><Plus size={11} /> Tambah Baris</button>
                    </td>
                  </tr>
                )}

                {/* Group Subtotal */}
                {!isCollapsed && (
                  <tr className="costing-subtotal-bar">
                    <td className="erp-table-cell" colSpan={6}>
                      <span className="text-primary font-700 text-xs uppercase tracking-wide">
                        Subtotal — {group.name}
                      </span>
                    </td>
                    <td className="erp-table-cell text-right font-700 font-tabular text-primary text-base" colSpan={2}>
                      {fmtRp(groupJasa(group))}
                    </td>
                    <td className="erp-table-cell text-right font-700 font-tabular text-primary text-base" colSpan={3}>
                      {fmtRp(groupMaterial(group))}
                    </td>
                    <td className="erp-table-cell text-right font-700 font-tabular text-primary text-base">
                      {fmtRp(groupTotal(group))}
                    </td>
                    <td className="erp-table-cell" />
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="grand-total-bar">
            <td className="erp-table-cell font-700 text-sm uppercase tracking-wide" colSpan={6}>
              Total — {tabData.label}
            </td>
            <td className="erp-table-cell text-right font-700 font-tabular text-base" colSpan={2}>
              {fmtRp(tabJasa())}
            </td>
            <td className="erp-table-cell text-right font-700 font-tabular text-base" colSpan={3}>
              {fmtRp(tabMaterial())}
            </td>
            <td className="erp-table-cell text-right font-700 font-tabular text-base">
              {fmtRp(tabTotal())}
            </td>
            <td className="erp-table-cell" />
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
                {isCollapsed
                  ? <ChevronRight size={16} className="text-primary" />
                  : <ChevronDown size={16} className="text-primary" />}
              </button>
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateGroupName(group.id, e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-primary font-700 text-md"
              />
              <button
                onClick={() => deleteGroup(group.id)}
                className="min-w-11 min-h-11 flex items-center justify-center flex-shrink-0 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
              ><Trash2 size={15} /></button>
            </div>

            {/* Rows */}
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {group.rows.map((row, rowIndex) => {
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
                          {groupIndex + 1}.{rowIndex + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-md font-600 text-foreground truncate">
                            {row.equipment || 'Item belum diisi'}
                          </span>
                          <span className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xl font-700 font-tabular text-foreground">
                              {fmtRp(rowRevenue(row))}
                            </span>
                            <span className={`text-xs font-700 font-tabular px-1.5 py-0.5 rounded ${tc.bg} ${tc.text}`}>
                              {marginPct >= 0 ? '' : '-'}{Math.abs(marginPct).toFixed(0)}%
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
                            <ItemAutocomplete
                              value={row.equipment}
                              onChange={(v) => updateRow(group.id, row.id, 'equipment', v)}
                              onSelect={(item) => fillRowFromItem(group.id, row.id, item)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="tooltip-label block mb-1">Deskripsi</label>
                              <input type="text" value={row.description}
                                onChange={(e) => updateRow(group.id, row.id, 'description', e.target.value)}
                                className="erp-input text-md" placeholder="Deskripsi singkat" />
                            </div>
                            <div>
                              <label className="tooltip-label block mb-1">Brand / MFG</label>
                              <input type="text" value={row.manufacturer}
                                onChange={(e) => updateRow(group.id, row.id, 'manufacturer', e.target.value)}
                                className="erp-input text-md" placeholder="Brand / MFG" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="tooltip-label block mb-1">Qty</label>
                              <input type="number" inputMode="decimal" value={row.qty} min={0}
                                onChange={(e) => updateRow(group.id, row.id, 'qty', parseFloat(e.target.value) || 0)}
                                className="erp-input text-md font-tabular" />
                            </div>
                            <div>
                              <label className="tooltip-label block mb-1">Satuan</label>
                              <select value={row.unit}
                                onChange={(e) => updateRow(group.id, row.id, 'unit', e.target.value)}
                                className="erp-input text-md">
                                {uomOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="tooltip-label block mb-1">Jasa / Satuan</label>
                              <CurrencyInput value={row.servicePrice} prefix=""
                                onChange={(v) => updateRow(group.id, row.id, 'servicePrice', v)} />
                            </div>
                            <div>
                              <label className="tooltip-label block mb-1">Material / Satuan</label>
                              <CurrencyInput value={row.materialPrice} prefix=""
                                onChange={(v) => updateRow(group.id, row.id, 'materialPrice', v)} />
                              {floorWarningText(row.sellingPriceFloor, row.materialPrice) && (
                                <p className="text-[11px] text-red-600 mt-0.5">{floorWarningText(row.sellingPriceFloor, row.materialPrice)}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="tooltip-label block mb-1">Harga Beli / Satuan (HPP)</label>
                            <CurrencyInput value={row.costPrice} prefix=""
                              onChange={(v) => updateRow(group.id, row.id, 'costPrice', v)} />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">Total baris: <span className="font-600 font-tabular text-foreground">{fmtRp(rowRevenue(row))}</span></span>
                            <button
                              onClick={() => deleteRow(group.id, row.id)}
                              className="min-w-11 min-h-11 flex items-center justify-center rounded hover:bg-red-50 text-red-500 transition-colors"
                            ><Trash2 size={15} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Row */}
                <div className="p-3">
                  <button
                    onClick={() => addRow(group.id)}
                    className="w-full min-h-11 flex items-center justify-center gap-1.5 text-md font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  ><Plus size={14} /> Tambah Baris</button>
                </div>
              </div>
            )}

            {/* Group Subtotal */}
            {!isCollapsed && (
              <div className="costing-subtotal-bar px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-700 text-primary uppercase tracking-wide">Subtotal</span>
                <span className="font-700 font-tabular text-primary text-md">{fmtRp(groupTotal(group))}</span>
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
    </div>
  );
}
