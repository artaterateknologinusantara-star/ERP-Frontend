'use client';

import React from 'react';
import { formatRp } from '@/lib/format';
import type { CostingTab } from '@/types';

interface Props {
  tabs: CostingTab[];
  discount: number;
  setDiscount: (v: number) => void;
  taxRate: number;
  setTaxRate: (v: number) => void;
}

export default function GrandTotalPanel({ tabs, discount, setDiscount, taxRate, setTaxRate }: Props) {
  const calcMaterial = (tab: CostingTab) =>
    tab.groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.materialPrice, 0), 0);

  const calcService = (tab: CostingTab) =>
    tab.groups.reduce((s, g) => s + g.rows.reduce((rs, r) => rs + r.qty * r.servicePrice, 0), 0);

  const tabTotals = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    total: calcMaterial(t) + calcService(t),
  }));

  const totalMaterial = tabs.reduce((s, t) => s + calcMaterial(t), 0);
  const totalService = tabs.reduce((s, t) => s + calcService(t), 0);
  const grandTotal = totalMaterial + totalService;
  const discountAmount = grandTotal * (discount / 100);
  const afterDiscount = grandTotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const grandTotalWithTax = afterDiscount + taxAmount;

  const tabLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];

  return (
    <div className="erp-card shadow-card lg:sticky lg:top-16">
      <h3 className="text-xl font-700 text-foreground mb-4">Ringkasan Grand Total</h3>

      {/* Per-tab totals */}
      <div className="space-y-2 mb-4">
        {tabTotals.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-base text-muted-foreground">
              Total {tabLabels[i] ?? i + 1}. {t.label}
            </span>
            <span className="text-base font-600 text-foreground font-tabular">
              {formatRp(t.total)}
            </span>
          </div>
        ))}
      </div>

      {/* Material / Service breakdown */}
      <div className="bg-muted/30 rounded-lg px-3 py-2 mb-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Material</span>
          <span className="font-600 font-tabular text-foreground">{formatRp(totalMaterial)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Jasa</span>
          <span className="font-600 font-tabular text-foreground">{formatRp(totalService)}</span>
        </div>
      </div>

      {/* Grand Total before discount */}
      <div className="flex items-center justify-between py-2.5 bg-muted/50 rounded-lg px-3 mb-3">
        <span className="text-base font-700 text-foreground">Grand Total</span>
        <span className="text-xl font-800 text-foreground font-tabular">{formatRp(grandTotal)}</span>
      </div>

      {/* Diskon */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-base text-muted-foreground">Diskon (%)</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="erp-input w-16 text-right font-tabular text-base"
          />
          <span className="text-base text-muted-foreground">%</span>
        </div>
      </div>

      {discount > 0 && (
        <div className="flex items-center justify-between mb-2 text-red-500">
          <span className="text-base">Potongan Diskon</span>
          <span className="text-base font-600 font-tabular">- {formatRp(discountAmount)}</span>
        </div>
      )}

      <div className="flex items-center justify-between py-2 border-b border-border mb-2">
        <span className="text-base text-muted-foreground">Setelah Diskon</span>
        <span className="text-base font-700 text-foreground font-tabular">{formatRp(afterDiscount)}</span>
      </div>

      {/* PPN */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-base text-muted-foreground">PPN (%)</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={taxRate}
            onChange={(e) => setTaxRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            className="erp-input w-16 text-right font-tabular text-base"
          />
          <span className="text-base text-muted-foreground">%</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-base text-muted-foreground">Nominal PPN</span>
        <span className="text-base font-600 text-foreground font-tabular">{formatRp(taxAmount)}</span>
      </div>

      {/* Final Grand Total */}
      <div className="grand-total-bar rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-base font-700">Grand Total + PPN</span>
        <span className="text-xl font-800 font-tabular">{formatRp(grandTotalWithTax)}</span>
      </div>
    </div>
  );
}
