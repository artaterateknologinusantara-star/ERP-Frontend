'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { supplierService } from '@/services/supplier.service';
import type { CostingGroup } from '@/types';

interface Props {
  group: CostingGroup;
  onUpdate: (fields: Partial<CostingGroup>) => void;
}

export default function GroupSubconPanel({ group, onUpdate }: Props) {
  const { data: subconResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () => supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const subconOptions = subconResult?.data ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs pt-1.5">
      <label className="text-muted-foreground flex-shrink-0">Subkontraktor:</label>
      <select
        className="erp-input w-auto min-w-[160px] py-1"
        value={group.subcontractorId ?? ''}
        onChange={(e) => onUpdate({ subcontractorId: e.target.value || null })}
      >
        <option value="">— Pilih Subkontraktor —</option>
        {subconOptions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label className="text-muted-foreground flex-shrink-0">Biaya Final Subcon:</label>
      <div className="w-36">
        <CurrencyInput
          value={group.finalSubconCost ?? 0}
          prefix=""
          onChange={(v) => onUpdate({ finalSubconCost: v || null })}
        />
      </div>
    </div>
  );
}
