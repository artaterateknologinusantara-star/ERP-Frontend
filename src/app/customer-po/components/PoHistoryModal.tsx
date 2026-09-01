'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, History as HistoryIcon } from 'lucide-react';
import { customerPoService } from '@/services/customerpo.service';
import type { CustomerPO, CustomerPoHistory } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerPo: CustomerPO;
}

export default function PoHistoryModal({ isOpen, onClose, customerPo }: Props) {
  const [history, setHistory] = useState<CustomerPoHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    customerPoService
      .history(customerPo.id)
      .then((r) => setHistory(r.data ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [isOpen, customerPo.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-700 text-foreground flex items-center gap-2">
              <HistoryIcon size={16} className="text-indigo-700" />
              Riwayat Perubahan No. PO
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customerPo.poNo} — {customerPo.customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Memuat riwayat...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              Belum ada perubahan nomor PO untuk dokumen ini.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal', 'No. PO Lama', 'No. PO Baru', 'Diubah Oleh', 'Alasan'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr
                      key={h.id}
                      className={`border-b border-border ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="erp-table-cell text-muted-foreground whitespace-nowrap">
                        {new Date(h.changedAt).toLocaleString('id-ID')}
                      </td>
                      <td className="erp-table-cell font-500 text-muted-foreground line-through">{h.oldPoNo}</td>
                      <td className="erp-table-cell font-700 text-indigo-700">{h.newPoNo}</td>
                      <td className="erp-table-cell">{h.changedByName ?? '—'}</td>
                      <td className="erp-table-cell text-muted-foreground max-w-[220px] truncate" title={h.reason}>
                        {h.reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button className="btn-secondary" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
