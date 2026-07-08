'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { downloadBlob } from '@/lib/downloadBlob';
import {
  getPpnReconciliation,
  exportPpnReconciliationPdf,
  PpnReconciliation,
  PpnReconciliationRow,
} from '@/services/reports.service';

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, rows, total }: { title: string; rows: PpnReconciliationRow[]; total: number }) {
  return (
    <div>
      <h4 className="text-xs font-700 text-foreground uppercase tracking-wide mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Tanggal', 'No. Dokumen', 'Customer/Supplier', 'NPWP', 'No. Faktur Pajak', 'Jumlah PPN'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="erp-table-cell text-muted-foreground text-sm py-4" colSpan={6}>Tidak ada transaksi</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.entryNumber}-${i}`} className="border-b border-border">
                  <td className="erp-table-cell text-xs whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="erp-table-cell text-xs">{r.documentNo}</td>
                  <td className="erp-table-cell text-xs">{r.partnerName ?? '—'}</td>
                  <td className="erp-table-cell text-xs">{r.npwp ?? '—'}</td>
                  <td className="erp-table-cell text-xs">{r.nomorFakturPajak ?? '—'}</td>
                  <td className="erp-table-cell font-tabular text-right text-xs">{formatRp(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="erp-table-cell font-700 text-xs" colSpan={5}>Total {title}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-xs">{formatRp(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function PpnReconciliationReport() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<PpnReconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getPpnReconciliation(startDate, endDate)
      .then(setData)
      .catch(() => toast.error('Gagal memuat Rekapitulasi PPN'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await exportPpnReconciliationPdf(startDate, endDate);
      downloadBlob(blob, `RekapitulasiPPN_${startDate}_${endDate}.pdf`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal download PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Rekapitulasi PPN</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            PPN Keluaran (Invoice AR) vs PPN Masukan (Supplier Invoice) untuk periode terpilih — dibaca
            langsung dari General Ledger, siap dicocokkan ke SPT Masa PPN
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input type="date" className="erp-input w-36 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" className="erp-input w-36 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button className="btn-secondary text-xs py-1" onClick={handleExportPdf} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Mengunduh...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Memuat data...</div>
      ) : !data ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Tidak ada data</div>
      ) : (
        <div className="space-y-5">
          <Section title="PPN Keluaran" rows={data.ppnKeluaran} total={data.totalPpnKeluaran} />
          <Section title="PPN Masukan" rows={data.ppnMasukan} total={data.totalPpnMasukan} />

          <div className={`flex items-center justify-between p-3 rounded-lg border ${data.selisih >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div>
              <span className="text-sm font-700 text-foreground block">SELISIH (PPN Keluaran − PPN Masukan)</span>
              <span className="text-xs text-muted-foreground">
                {data.selisih >= 0 ? 'PPN Kurang Bayar (harus disetor)' : 'PPN Lebih Bayar (bisa dikompensasi/restitusi)'}
              </span>
            </div>
            <span className={`text-base font-700 font-tabular ${data.selisih >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatRp(data.selisih)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
