'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { downloadBlob } from '@/lib/downloadBlob';
import { getIncomeStatement, exportIncomeStatementPdf, IncomeStatement, IncomeStatementAccountRow } from '@/services/reports.service';

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, rows, total }: { title: string; rows: IncomeStatementAccountRow[]; total: number }) {
  return (
    <div>
      <h4 className="text-xs font-700 text-foreground uppercase tracking-wide mb-2">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="erp-table-cell text-muted-foreground text-sm py-4" colSpan={3}>Tidak ada transaksi</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.accountCode} className="border-b border-border">
                  <td className="erp-table-cell font-600 text-primary text-xs w-24">{r.accountCode}</td>
                  <td className="erp-table-cell">{r.accountName}</td>
                  <td className="erp-table-cell font-tabular text-right w-40">{formatRp(r.amount)}</td>
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

export default function LabaRugiReport() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getIncomeStatement(startDate, endDate)
      .then(setData)
      .catch(() => toast.error('Gagal memuat Laporan Laba Rugi'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await exportIncomeStatementPdf(startDate, endDate);
      downloadBlob(blob, `LabaRugi_${startDate}_${endDate}.pdf`);
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
          <h3 className="text-[13px] font-700 text-foreground">Laporan Laba Rugi</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pendapatan dikurangi Beban (termasuk HPP) untuk periode terpilih</p>
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
          <Section title="Pendapatan" rows={data.revenues} total={data.totalRevenue} />
          <Section title="Beban (termasuk HPP)" rows={data.expenses} total={data.totalExpense} />

          <div className={`flex items-center justify-between p-3 rounded-lg border ${data.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-sm font-700 text-foreground">LABA / RUGI BERSIH</span>
            <span className={`text-base font-700 font-tabular ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatRp(data.netIncome)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
