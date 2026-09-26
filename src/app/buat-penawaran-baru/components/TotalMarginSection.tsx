'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { getMarginTier, marginTierClasses } from '@/lib/margin';
import { calcMaterialSubtotal, calcServiceSubtotal, calcCostSubtotal, applyDiscount } from '@/lib/quotationCalc';
import type { CostingTab } from '@/types';

interface Props {
  tabs: CostingTab[];
  discount?: number;
  isCivilMeMode?: boolean;
}

export default function TotalMarginSection({ tabs, discount = 0, isCivilMeMode = false }: Props) {
  const groups = tabs.flatMap((t) => t.groups);

  const totalJasa = calcServiceSubtotal(groups, isCivilMeMode);
  const totalMaterial = calcMaterialSubtotal(groups, isCivilMeMode);
  const totalCost = calcCostSubtotal(groups, isCivilMeMode);
  const totalRevenue = applyDiscount(totalJasa + totalMaterial, discount);
  const totalMargin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  const tier = getMarginTier(marginPercent);
  const tc = marginTierClasses[tier];
  const isPositive = totalMargin >= 0;

  return (
    <div className={`${tc.bg} border ${tc.border} rounded-lg p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className={`${tc.text} flex-shrink-0`} />
        <h3 className={`text-base font-700 ${tc.text}`}>Total Margin</h3>
      </div>

      <div className="flex items-center justify-between py-2.5 bg-white/60 rounded-lg px-3 mb-3">
        <span className="text-base font-700 text-foreground">Total Margin</span>
        <span className={`text-xl font-800 font-tabular ${tc.text}`}>
          {isPositive ? '' : '- '}
          {formatRp(Math.abs(totalMargin))}
          <span className="text-sm font-600 ml-1.5">({marginPercent.toFixed(1)}%)</span>
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Total Penjualan (Jasa + Material){discount > 0 ? ` setelah diskon ${discount}%` : ''}
          </span>
          <span className="font-600 font-tabular text-foreground">{formatRp(totalRevenue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Harga Beli Material</span>
          <span className="font-600 font-tabular text-foreground">{formatRp(totalCost)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        {isCivilMeMode
          ? 'Dihitung dari Harga Jual dikurangi Harga Beli (Biaya Final Subcon) per Kategori (Group) pada panel Subkontraktor di atas. Nilai ini tidak tersimpan ke server — dihitung ulang setiap kali form dibuka.'
          : 'Dihitung dari harga beli/satuan pada tabel di atas (otomatis terisi dari Item Master saat memilih equipment, bisa diedit manual). Jasa dihitung 100% margin. Nilai ini tidak tersimpan ke server — dihitung ulang setiap kali form dibuka.'}
      </p>
    </div>
  );
}
