'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { formatRp } from '@/lib/format';
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

  const toggleCollapse = (groupId: string) =>
    setCollapsed((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
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
            }
          ),
        }
      ),
    });
  };

  const addRow = (groupId: string) => {
    const group = tabData.groups.find((g) => g.id === groupId);
    if (!group) return;
    const newRow: CostingRow = {
      id: `row-${groupId}-${Date.now()}`,
      no: `${tabData.groups.indexOf(group) + 1}.${group.rows.length + 1}`,
      equipment: '',
      description: '',
      manufacturer: '',
      qty: 1,
      unit: 'Unit',
      servicePrice: 0,
      materialPrice: 0,
      sortOrder: group.rows.length,
    };
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
    const newGroup: CostingGroup = {
      id: `grp-${tabData.id}-${Date.now()}`,
      name: 'Kategori Baru',
      rows: [],
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

  return (
    <div>
    <div className="overflow-x-auto overflow-y-auto max-h-[560px]">
      <table className="w-full text-base border-collapse min-w-[1100px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted border-b-2 border-border">
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider w-10">No</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[140px]">Equipment</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[180px]">Deskripsi</th>
            <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[90px]">Mfg</th>
            <th className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider w-20">Qty</th>
            <th className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider w-28">UoM</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">Jasa/Satuan</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[110px]">Jasa Total</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">Material/Satuan</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[120px]">Material Total</th>
            <th className="erp-table-cell text-right text-muted-foreground font-600 text-xs uppercase tracking-wider min-w-[130px]">Total</th>
            <th className="erp-table-cell w-8"></th>
          </tr>
        </thead>
        <tbody>
          {tabData.groups.map((group) => {
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
                  <td className="erp-table-cell" colSpan={9}>
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
                        onClick={() => addRow(group.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors whitespace-nowrap"
                      ><Plus size={11} /> Tambah Baris</button>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      ><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>

                {/* Rows */}
                {!isCollapsed && group.rows.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group/row">
                    <td className="erp-table-cell text-muted-foreground text-xs font-tabular text-center">
                      <span className="flex items-center gap-1">
                        <GripVertical size={11} className="text-muted-foreground/40 cursor-grab" />
                        {row.no}
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
                    <td className="erp-table-cell">
                      <input type="number" value={row.qty} min={0}
                        onChange={(e) => updateRow(group.id, row.id, 'qty', parseFloat(e.target.value) || 0)}
                        className="erp-input text-right font-tabular" />
                    </td>
                    <td className="erp-table-cell">
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
                    <td className="erp-table-cell text-right font-700 font-tabular text-primary text-base" colSpan={2}>
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
            <td className="erp-table-cell text-right font-700 font-tabular text-base" colSpan={2}>
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

    <div className="mt-3 pt-3 border-t border-border">
      <button
        onClick={addGroup}
        className="flex items-center gap-1.5 px-3 py-2 text-base font-600 text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 hover:border-primary transition-all"
      >
        <Plus size={14} /> Tambah Kategori Baru
      </button>
    </div>
    </div>
  );
}
