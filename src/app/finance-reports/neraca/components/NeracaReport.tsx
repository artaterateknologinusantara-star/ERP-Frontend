'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { downloadBlob } from '@/lib/downloadBlob';
import { getBalanceSheet, exportBalanceSheetPdf, BalanceSheet, BalanceSheetAccountRow } from '@/services/reports.service';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, rows, total }: { title: string; rows: BalanceSheetAccountRow[]; total: number }) {
  return (
    <div>
      <div className="bg-muted/40 px-2 py-1 rounded mb-2">
        <h4 className="text-xs font-700 text-foreground uppercase tracking-wide">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="erp-table-cell text-muted-foreground text-sm py-4" colSpan={3}>Tidak ada saldo</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.accountCode}-${i}`} className="border-b border-border">
                  <td className="erp-table-cell font-600 text-primary text-xs w-24">{r.accountCode}</td>
                  <td className="erp-table-cell">{r.accountName}</td>
                  <td className="erp-table-cell font-tabular text-right w-40">{formatRp(r.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td className="erp-table-cell font-700" colSpan={2}>Total {title}</td>
              <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function NeracaReport() {
  const [asOfDate, setAsOfDate] = useState(today());
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getBalanceSheet(asOfDate)
      .then(setData)
      .catch(() => toast.error('Gagal memuat Neraca'))
      .finally(() => setLoading(false));
  }, [asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await exportBalanceSheetPdf(asOfDate);
      downloadBlob(blob, `Neraca_${asOfDate}.pdf`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal download PDF');
    } finally {
      setExporting(false);
    }
  }

  const isBalanced = !!data && Math.abs(data.selisih) < 0.01;

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Neraca (Balance Sheet)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Aset, Liabilitas, dan Ekuitas per tanggal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label className="text-xs text-muted-foreground">Per Tanggal</label>
          <input type="date" className="erp-input w-36 text-xs" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
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
          <Section title="Aset" rows={data.assets} total={data.totalAssets} />
          <Section title="Liabilitas" rows={data.liabilities} total={data.totalLiabilities} />
          <Section title="Ekuitas" rows={data.equities} total={data.totalEquities} />

          <div className="border-t-2 border-border pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-700">TOTAL ASET</span>
              <span className="font-700 font-tabular">{formatRp(data.totalAssets)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-700">TOTAL LIABILITAS + EKUITAS</span>
              <span className="font-700 font-tabular">{formatRp(data.totalLiabilities + data.totalEquities)}</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-lg border mt-2 ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className={`text-sm font-700 ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>SELISIH</span>
              <span className={`text-sm font-700 font-tabular ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatRp(data.selisih)}
              </span>
            </div>
            {!isBalanced && (
              <p className="text-xs text-red-600 mt-1">
                Neraca tidak balance — kemungkinan ada bug pada posting jurnal di fase manapun. Mohon investigasi sebelum melanjutkan.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
