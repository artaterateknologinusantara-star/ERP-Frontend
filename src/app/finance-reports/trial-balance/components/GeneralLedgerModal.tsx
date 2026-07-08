'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import { formatRp, formatDate } from '@/lib/format';
import { downloadBlob } from '@/lib/downloadBlob';
import { getGeneralLedger, exportGeneralLedgerPdf, GeneralLedger } from '@/services/reports.service';

interface GeneralLedgerModalProps {
  accountId: string;
  accountCode: string;
  accountName: string;
  isOpen: boolean;
  onClose: () => void;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GeneralLedgerModal({ accountId, accountCode, accountName, isOpen, onClose }: GeneralLedgerModalProps) {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<GeneralLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getGeneralLedger(accountId, startDate, endDate)
      .then(setData)
      .catch(() => toast.error('Gagal memuat Buku Besar'))
      .finally(() => setLoading(false));
  }, [accountId, startDate, endDate]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await exportGeneralLedgerPdf(accountId, startDate, endDate);
      downloadBlob(blob, `BukuBesar_${accountCode}_${startDate}_${endDate}.pdf`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal download PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Buku Besar — ${accountCode} ${accountName}`}
      subtitle="Rincian mutasi akun beserta saldo berjalan"
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="erp-input w-36 text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              className="erp-input w-36 text-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn-secondary text-xs py-1" onClick={handleExportPdf} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Mengunduh...' : 'Export PDF'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Memuat data...</div>
        ) : !data ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Tidak ada data</div>
        ) : (
          <>
            <div className="flex items-center justify-between erp-card !p-3">
              <span className="text-xs text-muted-foreground">Saldo Awal ({data.startDate})</span>
              <span className="font-700 font-tabular">{formatRp(data.openingBalance)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal', 'No. Jurnal', 'Deskripsi', 'Debit', 'Kredit', 'Saldo'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Tidak ada mutasi pada periode ini</td></tr>
                  ) : (
                    data.lines.map((l, i) => (
                      <tr key={i} className="border-b border-border hover:bg-primary/5 transition-colors">
                        <td className="erp-table-cell text-muted-foreground">{formatDate(l.date)}</td>
                        <td className="erp-table-cell font-600 text-primary text-xs">{l.entryNumber}</td>
                        <td className="erp-table-cell max-w-[220px] truncate">{l.description}</td>
                        <td className="erp-table-cell font-tabular text-right">{l.debit === 0 ? '—' : formatRp(l.debit)}</td>
                        <td className="erp-table-cell font-tabular text-right">{l.credit === 0 ? '—' : formatRp(l.credit)}</td>
                        <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(l.runningBalance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between erp-card !p-3 bg-muted/30">
              <span className="text-xs font-600 text-foreground">Saldo Akhir ({data.endDate})</span>
              <span className="font-700 font-tabular text-primary">{formatRp(data.closingBalance)}</span>
            </div>
          </>
        )}
      </div>
    </ERPModal>
  );
}
