'use client';

import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { PaymentTerm } from '@/types';

interface Props {
  terms: PaymentTerm[];
  onChange: (terms: PaymentTerm[]) => void;
  netPayment: number;
  setNetPayment: (v: number) => void;
}

export default function SyaratPembayaranSection({ terms, onChange, netPayment, setNetPayment }: Props) {
  const totalPercentage = terms.reduce((s, t) => s + t.percentage, 0);
  const isValid = totalPercentage === 100;

  const addTerm = () => {
    onChange([...terms, { id: `pt-${Date.now()}`, description: '', percentage: 0 }]);
  };

  const updateTerm = (id: string, field: keyof PaymentTerm, value: string | number) => {
    onChange(terms.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const deleteTerm = (id: string) => {
    onChange(terms.filter((t) => t.id !== id));
  };

  return (
    <div className="erp-card shadow-card">
      <div className="erp-section-header">Syarat Pembayaran</div>

      <div className="space-y-2 mb-4">
        {terms.map((term, i) => (
          <div key={term.id} className="flex items-center gap-2 group/term">
            <span className="text-xs font-700 text-muted-foreground w-5 flex-shrink-0 text-center">{i + 1}.</span>
            <input
              type="text"
              value={term.description}
              onChange={(e) => updateTerm(term.id, 'description', e.target.value)}
              placeholder="Deskripsi termin pembayaran"
              className="erp-input flex-1"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="number"
                value={term.percentage}
                min={0}
                max={100}
                onChange={(e) => updateTerm(term.id, 'percentage', parseFloat(e.target.value) || 0)}
                className="erp-input w-16 text-right font-tabular"
              />
              <span className="text-base text-muted-foreground">%</span>
            </div>
            <button
              onClick={() => deleteTerm(term.id)}
              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/term:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Total Percentage Indicator */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-1.5">
          {!isValid && <AlertCircle size={14} className="text-red-500" />}
          <span className={`text-base font-600 ${isValid ? 'text-green-700' : 'text-red-600'}`}>
            Total: {totalPercentage}%
          </span>
        </div>
        {!isValid && (
          <span className="text-xs text-red-500 font-500">Total harus 100% (sisa {100 - totalPercentage}%)</span>
        )}
        {isValid && (
          <span className="text-xs text-green-600 font-500">✓ Total pembayaran valid</span>
        )}
      </div>

      {/* Net Payment */}
      <div className="flex items-center gap-3 mb-4">
        <label className="erp-form-label mb-0 whitespace-nowrap">Net Payment:</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={netPayment}
            min={0}
            onChange={(e) => setNetPayment(parseInt(e.target.value) || 0)}
            className="erp-input w-16 text-center font-tabular"
          />
          <span className="text-base text-muted-foreground">hari</span>
        </div>
      </div>

      <button onClick={addTerm} className="flex items-center gap-1.5 text-base font-600 text-primary hover:underline">
        <Plus size={14} /> Tambah Termin Pembayaran
      </button>
    </div>
  );
}
