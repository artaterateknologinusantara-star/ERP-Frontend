'use client';

import React from 'react';
import { useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import { formatRp } from '@/lib/format';

interface BalanceSummaryProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
}

// Live Total Debit/Kredit/Selisih panel for journal-entry-style forms (Opening Balance, Buat
// Jurnal Manual) — shared so both stay visually and behaviorally identical instead of drifting
// as two copies. `name` is the field-array path holding rows shaped like { debit, credit }.
export default function BalanceSummary<T extends FieldValues>({ control, name }: BalanceSummaryProps<T>) {
  const lines = useWatch({ control, name }) as Array<{ debit?: number; credit?: number }> | undefined;
  const totalDebit = (lines ?? []).reduce((s, l) => s + (Number(l?.debit) || 0), 0);
  const totalCredit = (lines ?? []).reduce((s, l) => s + (Number(l?.credit) || 0), 0);
  const diff = Math.round(totalDebit - totalCredit);
  const isBalanced = diff === 0 && totalDebit > 0;

  return (
    <div className="erp-card">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Debit</p>
          <p className="text-lg font-700 font-tabular">{formatRp(totalDebit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Kredit</p>
          <p className="text-lg font-700 font-tabular">{formatRp(totalCredit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Selisih</p>
          <p className={`text-lg font-700 font-tabular ${isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatRp(diff)}
          </p>
        </div>
      </div>
      {!isBalanced && (
        <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {totalDebit === 0 && totalCredit === 0
            ? 'Isi minimal satu baris Debit dan satu baris Kredit.'
            : 'Total Debit dan Total Kredit harus sama sebelum bisa disimpan.'}
        </p>
      )}
    </div>
  );
}
