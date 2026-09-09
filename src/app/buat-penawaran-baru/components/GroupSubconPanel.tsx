'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { supplierService } from '@/services/supplier.service';
import { formatRp } from '@/lib/format';
import { getMarginTier, marginTierClasses } from '@/lib/margin';
import type { CostingGroup } from '@/types';

interface Props {
  group: CostingGroup;
  onUpdate: (fields: Partial<CostingGroup>) => void;
}

export default function GroupSubconPanel({ group, onUpdate }: Props) {
  const { data: subconResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () =>
      supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const subconOptions = subconResult?.data ?? [];

  const finalSubconCost = group.finalSubconCost ?? 0;
  const finalSellingPrice = group.finalSellingPrice ?? 0;
  const margin = finalSellingPrice - finalSubconCost;
  const marginPercent = finalSellingPrice > 0 ? (margin / finalSellingPrice) * 100 : 0;
  const tier = getMarginTier(marginPercent);
  const tc = marginTierClasses[tier];
  const hasValues = finalSubconCost > 0 || finalSellingPrice > 0;

  return (
    <div className="pt-1.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="text-muted-foreground flex-shrink-0">Subkontraktor:</label>
        <select
          className="erp-input w-auto min-w-[160px] py-1"
          value={group.subcontractorId ?? ''}
          onChange={(e) => onUpdate({ subcontractorId: e.target.value || null })}
        >
          <option value="">— Pilih Subkontraktor —</option>
          {subconOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="text-muted-foreground flex-shrink-0">
          Harga Beli (Biaya Final Subcon):
        </label>
        <div className="w-36">
          <CurrencyInput
            value={group.finalSubconCost ?? 0}
            prefix=""
            onChange={(v) => onUpdate({ finalSubconCost: v || null })}
          />
        </div>

        <label className="text-muted-foreground flex-shrink-0">Harga Jual:</label>
        <div className="w-36">
          <CurrencyInput
            value={group.finalSellingPrice ?? 0}
            prefix=""
            onChange={(v) => onUpdate({ finalSellingPrice: v || null })}
          />
        </div>
      </div>

      {hasValues && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Margin:</span>
          <span className={`font-600 font-tabular px-1.5 py-0.5 rounded ${tc.bg} ${tc.text}`}>
            {formatRp(margin)} ({marginPercent.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}
