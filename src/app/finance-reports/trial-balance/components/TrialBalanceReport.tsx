'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { formatRp } from '@/lib/format';
import { downloadBlob } from '@/lib/downloadBlob';
import { getTrialBalance, exportTrialBalancePdf, TrialBalanceRow } from '@/services/reports.service';
import GeneralLedgerModal from './GeneralLedgerModal';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TrialBalanceReport() {
  const [asOfDate, setAsOfDate] = useState(today());
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; code: string; name: string } | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getTrialBalance(asOfDate)
      .then(setRows)
      .catch(() => toast.error('Gagal memuat Trial Balance'))
      .finally(() => setLoading(false));
  }, [asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const blob = await exportTrialBalancePdf(asOfDate);
      downloadBlob(blob, `TrialBalance_${asOfDate}.pdf`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal download PDF');
    } finally {
      setExporting(false);
    }
  }

  const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Trial Balance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Saldo seluruh akun per tanggal — klik baris untuk lihat Buku Besar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <label className="text-xs text-muted-foreground">Per Tanggal</label>
          <input
            type="date"
            className="erp-input w-36 text-xs"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
          <button className="btn-secondary text-xs py-1" onClick={handleExportPdf} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Mengunduh...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode Akun', 'Nama Akun', 'Tipe', 'Debit', 'Kredit'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Memuat data...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Tidak ada transaksi</td></tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.accountId}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedAccount({ id: r.accountId, code: r.accountCode, name: r.accountName })}
                >
                  <td className="erp-table-cell font-600 text-primary text-xs">{r.accountCode}</td>
                  <td className="erp-table-cell">{r.accountName}</td>
                  <td className="erp-table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-gray-100 text-gray-600">
                      {r.accountType}
                    </span>
                  </td>
                  <td className="erp-table-cell font-tabular text-right">{r.totalDebit === 0 ? '—' : formatRp(r.totalDebit)}</td>
                  <td className="erp-table-cell font-tabular text-right">{r.totalCredit === 0 ? '—' : formatRp(r.totalCredit)}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border">
                <td className="erp-table-cell font-700 text-foreground" colSpan={3}>TOTAL</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalDebit)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(totalCredit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={`text-xs font-600 mt-3 ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
          {isBalanced ? 'Balance — Total Debit = Total Kredit' : `TIDAK BALANCE — selisih ${formatRp(totalDebit - totalCredit)}`}
        </p>
      )}

      {selectedAccount && (
        <GeneralLedgerModal
          accountId={selectedAccount.id}
          accountCode={selectedAccount.code}
          accountName={selectedAccount.name}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
