'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Upload, CheckCircle2, XCircle, Ban, PlusCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ERPModal from '@/components/ui/ERPModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatRp, formatDate } from '@/lib/format';
import {
  getBalances,
  importBankStatement,
  listImports,
  getImportDetail,
  matchLine,
  unmatchLine,
  ignoreLine,
  BankImportRejectedError,
  type AccountBalance,
  type BankStatementImportListItem,
  type BankStatementImportDetail,
  type CsvRowError,
} from '@/services/bank.service';

const today = new Date().toISOString().slice(0, 10);

const STATUS_BADGE: Record<string, string> = {
  Matched: 'bg-green-50 text-green-700 border-green-200',
  Unmatched: 'bg-amber-50 text-amber-700 border-amber-200',
  Ignored: 'bg-muted text-muted-foreground border-border',
};

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [imports, setImports] = useState<BankStatementImportListItem[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [importDetail, setImportDetail] = useState<BankStatementImportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [glBalance, setGlBalance] = useState<number | null>(null);

  const [selectedCandidate, setSelectedCandidate] = useState<Record<string, string>>({});
  const [actingLineId, setActingLineId] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  // ── Load akun (dari endpoint balances — sama-sama 4 akun Kas/BCA/Mandiri/BNI) ──
  useEffect(() => {
    getBalances()
      .then((list) => {
        setAccounts(list);
        if (list.length > 0) setSelectedAccountId((prev) => prev || list[0].accountId);
      })
      .catch(() => toast.error('Gagal memuat daftar akun bank'));
  }, []);

  // ── Load riwayat import untuk akun terpilih ──
  const reloadImports = useCallback(() => {
    if (!selectedAccountId) return;
    setLoadingImports(true);
    listImports(selectedAccountId)
      .then(setImports)
      .catch(() => toast.error('Gagal memuat riwayat import'))
      .finally(() => setLoadingImports(false));
  }, [selectedAccountId]);

  useEffect(() => {
    setSelectedImportId(null);
    setImportDetail(null);
    reloadImports();
  }, [selectedAccountId, reloadImports]);

  // ── Load detail import terpilih + saldo GL per PeriodEnd-nya ──
  const reloadDetail = useCallback((importId: string) => {
    setLoadingDetail(true);
    getImportDetail(importId)
      .then((detail) => {
        setImportDetail(detail);
        return getBalances(detail.periodEnd);
      })
      .then((balances) => {
        const acc = balances.find((b) => b.accountId === selectedAccountId);
        setGlBalance(acc?.balance ?? 0);
      })
      .catch(() => toast.error('Gagal memuat detail import'))
      .finally(() => setLoadingDetail(false));
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedImportId) reloadDetail(selectedImportId);
  }, [selectedImportId, reloadDetail]);

  const selectedAccount = accounts.find((a) => a.accountId === selectedAccountId);

  const handleConfirmMatch = async (lineId: string, journalEntryLineId?: string) => {
    const jelId = journalEntryLineId ?? selectedCandidate[lineId];
    if (!jelId) { toast.error('Pilih kandidat match terlebih dahulu'); return; }
    setActingLineId(lineId);
    try {
      await matchLine(lineId, jelId);
      toast.success('Baris berhasil di-match');
      if (selectedImportId) reloadDetail(selectedImportId);
      reloadImports();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal melakukan match');
    } finally {
      setActingLineId(null);
    }
  };

  const handleUnmatch = async (lineId: string) => {
    setActingLineId(lineId);
    try {
      await unmatchLine(lineId);
      toast.success('Match dibatalkan');
      if (selectedImportId) reloadDetail(selectedImportId);
      reloadImports();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal membatalkan match');
    } finally {
      setActingLineId(null);
    }
  };

  const handleIgnore = async (lineId: string) => {
    setActingLineId(lineId);
    try {
      await ignoreLine(lineId);
      toast.success('Baris ditandai diabaikan');
      if (selectedImportId) reloadDetail(selectedImportId);
      reloadImports();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengabaikan baris');
    } finally {
      setActingLineId(null);
    }
  };

  const statementBalance = importDetail?.statementEndingBalance;
  const selisih = glBalance !== null && statementBalance !== undefined && statementBalance !== null
    ? glBalance - statementBalance
    : null;

  return (
    <AppLayout
      title="Rekonsiliasi Bank"
      breadcrumbs={[{ label: 'Finance' }, { label: 'Rekonsiliasi Bank' }]}
    >
      <div className="space-y-5">

        {/* Pilih Akun & Aksi Import */}
        <div className="erp-card">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="w-full md:w-72">
              <label className="erp-form-label">Akun Bank</label>
              <select
                className="erp-input"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>{a.accountCode} — {a.accountName}</option>
                ))}
              </select>
              {selectedAccount && (
                <p className="text-xs text-muted-foreground mt-1">Saldo GL saat ini: {formatRp(selectedAccount.balance)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              disabled={!selectedAccountId}
              className="btn-primary flex items-center gap-2 justify-center"
            >
              <Upload size={14} /> Import Mutasi
            </button>
          </div>
        </div>

        {/* Riwayat Import */}
        <div className="erp-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4">Riwayat Import</h3>
          {loadingImports ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada import mutasi untuk akun ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['Tanggal Import', 'File', 'Periode', 'Saldo Akhir Statement', 'Baris', 'Matched', 'Unmatched', 'Ignored'].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr
                      key={imp.id}
                      onClick={() => setSelectedImportId(imp.id)}
                      className={`border-b border-border cursor-pointer hover:bg-muted/30 transition-colors ${selectedImportId === imp.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="erp-table-cell whitespace-nowrap">{formatDate(imp.importDate)}</td>
                      <td className="erp-table-cell truncate max-w-[200px]">{imp.fileName}</td>
                      <td className="erp-table-cell whitespace-nowrap">{formatDate(imp.periodStart)} – {formatDate(imp.periodEnd)}</td>
                      <td className="erp-table-cell font-tabular">{imp.statementEndingBalance !== undefined && imp.statementEndingBalance !== null ? formatRp(imp.statementEndingBalance) : '—'}</td>
                      <td className="erp-table-cell font-tabular">{imp.lineCount}</td>
                      <td className="erp-table-cell font-tabular text-green-600">{imp.matchedCount}</td>
                      <td className="erp-table-cell font-tabular text-amber-600">{imp.unmatchedCount}</td>
                      <td className="erp-table-cell font-tabular text-muted-foreground">{imp.ignoredCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Import Terpilih */}
        {selectedImportId && (
          <div className="erp-card">
            <h3 className="text-[13px] font-700 text-foreground mb-4">Detail Import</h3>

            {loadingDetail || !importDetail ? (
              <p className="text-sm text-muted-foreground">Memuat detail...</p>
            ) : (
              <>
                {/* Ringkasan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground">Saldo GL (per {formatDate(importDetail.periodEnd)})</p>
                    <p className="text-lg font-800 font-tabular text-foreground mt-1">{glBalance !== null ? formatRp(glBalance) : '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground">Saldo Akhir Statement</p>
                    <p className="text-lg font-800 font-tabular text-foreground mt-1">
                      {statementBalance !== undefined && statementBalance !== null ? formatRp(statementBalance) : 'Tidak diisi'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${selisih === null ? 'border-border bg-muted/20' : selisih === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-xs text-muted-foreground">Selisih</p>
                    <p className={`text-lg font-800 font-tabular mt-1 ${selisih === null ? 'text-foreground' : selisih === 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {selisih !== null ? formatRp(Math.abs(selisih)) : '—'}
                    </p>
                  </div>
                </div>

                {/* Tabel Baris */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/40">
                        {['Tanggal', 'Keterangan', 'Jumlah', 'Status', 'Kandidat Match', 'Aksi'].map((h) => (
                          <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importDetail.lines.map((line) => {
                        const acting = actingLineId === line.id;
                        return (
                          <tr key={line.id} className="border-b border-border align-top">
                            <td className="erp-table-cell whitespace-nowrap">{formatDate(line.transactionDate)}</td>
                            <td className="erp-table-cell max-w-[240px]">{line.description}</td>
                            <td className={`erp-table-cell font-tabular whitespace-nowrap ${line.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatRp(line.amount)}
                            </td>
                            <td className="erp-table-cell whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-600 border ${STATUS_BADGE[line.matchStatus] ?? 'border-border'}`}>
                                {line.matchStatus}
                              </span>
                            </td>
                            <td className="erp-table-cell min-w-[220px]">
                              {line.matchStatus === 'Unmatched' && line.suggestedMatches.length > 0 && (
                                line.suggestedMatches.length === 1 ? (
                                  <div className="text-xs">
                                    <p className="font-600 text-foreground">{line.suggestedMatches[0].entryNumber}</p>
                                    <p className="text-muted-foreground truncate max-w-[200px]">{line.suggestedMatches[0].description}</p>
                                  </div>
                                ) : (
                                  <select
                                    className="erp-input text-xs"
                                    value={selectedCandidate[line.id] ?? ''}
                                    onChange={(e) => setSelectedCandidate((prev) => ({ ...prev, [line.id]: e.target.value }))}
                                  >
                                    <option value="">— Pilih kandidat —</option>
                                    {line.suggestedMatches.map((c) => (
                                      <option key={c.journalEntryLineId} value={c.journalEntryLineId}>
                                        {c.entryNumber} — {c.description} ({formatDate(c.date)})
                                      </option>
                                    ))}
                                  </select>
                                )
                              )}
                              {line.matchStatus === 'Unmatched' && line.suggestedMatches.length === 0 && (
                                <span className="text-xs text-muted-foreground">Tidak ada saran</span>
                              )}
                            </td>
                            <td className="erp-table-cell whitespace-nowrap">
                              {line.matchStatus === 'Unmatched' && line.suggestedMatches.length > 0 && (
                                <button
                                  type="button"
                                  disabled={acting || (line.suggestedMatches.length > 1 && !selectedCandidate[line.id])}
                                  onClick={() => handleConfirmMatch(
                                    line.id,
                                    line.suggestedMatches.length === 1 ? line.suggestedMatches[0].journalEntryLineId : undefined
                                  )}
                                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-600 disabled:opacity-40 disabled:cursor-not-allowed mr-2"
                                >
                                  <CheckCircle2 size={13} /> Konfirmasi Match
                                </button>
                              )}
                              {line.matchStatus === 'Matched' && (
                                <button
                                  type="button"
                                  disabled={acting}
                                  onClick={() => handleUnmatch(line.id)}
                                  className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-600 disabled:opacity-40"
                                >
                                  <XCircle size={13} /> Batalkan Match
                                </button>
                              )}
                              {line.matchStatus === 'Unmatched' && line.suggestedMatches.length === 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={acting}
                                    onClick={() => handleIgnore(line.id)}
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-600 disabled:opacity-40"
                                  >
                                    <Ban size={13} /> Abaikan
                                  </button>
                                  <Link
                                    href="/journal-entry/buat"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-600"
                                  >
                                    <PlusCircle size={13} /> Buat Jurnal Penyesuaian
                                  </Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        accountId={selectedAccountId}
        onImported={() => { reloadImports(); }}
      />
    </AppLayout>
  );
}

// ── Modal Import ─────────────────────────────────────────────────────────────

function ImportModal({
  open, onClose, accountId, onImported,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onImported: () => void;
}) {
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [statementEndingBalance, setStatementEndingBalance] = useState<number>(0);
  const [hasEndingBalance, setHasEndingBalance] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rowErrors, setRowErrors] = useState<CsvRowError[]>([]);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setPeriodStart(today);
      setPeriodEnd(today);
      setStatementEndingBalance(0);
      setHasEndingBalance(false);
      setFile(null);
      setRowErrors([]);
      setSubmitError('');
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setRowErrors([]);

    if (!accountId) { setSubmitError('Pilih akun bank terlebih dahulu'); return; }
    if (!file) { setSubmitError('File CSV wajib diupload'); return; }
    if (periodEnd < periodStart) { setSubmitError('Periode Akhir tidak boleh sebelum Periode Awal'); return; }

    setSubmitting(true);
    try {
      const result = await importBankStatement({
        accountId,
        periodStart,
        periodEnd,
        statementEndingBalance: hasEndingBalance ? statementEndingBalance : undefined,
      }, file);
      toast.success(`Import berhasil, ${result.lineCount} baris tersimpan`);
      onImported();
      onClose();
    } catch (e: unknown) {
      if (e instanceof BankImportRejectedError) {
        setRowErrors(e.rowErrors);
        setSubmitError(e.message);
      } else {
        const msg = e instanceof Error ? e.message : 'Gagal mengimpor mutasi bank';
        setSubmitError(msg);
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ERPModal
      isOpen={open}
      onClose={onClose}
      title="Import Mutasi Bank"
      subtitle="Format CSV: kolom Tanggal (yyyy-MM-dd), Keterangan, Debit, Kredit"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <button type="submit" form="import-bank-form" disabled={submitting} className="btn-primary flex items-center gap-2 justify-center min-w-[140px]">
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Mengimpor...
              </>
            ) : 'Import'}
          </button>
        </>
      }
    >
      <form id="import-bank-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="erp-form-label">Periode Awal<span className="text-red-500 ml-0.5">*</span></label>
            <input type="date" className="erp-input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div>
            <label className="erp-form-label">Periode Akhir<span className="text-red-500 ml-0.5">*</span></label>
            <input type="date" className="erp-input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-1.5">
            <input type="checkbox" checked={hasEndingBalance} onChange={(e) => setHasEndingBalance(e.target.checked)} />
            <span className="erp-form-label mb-0">Isi Saldo Akhir Statement <span className="text-xs text-muted-foreground">(opsional)</span></span>
          </label>
          {hasEndingBalance && (
            <CurrencyInput value={statementEndingBalance} onChange={setStatementEndingBalance} />
          )}
        </div>

        <div>
          <label className="erp-form-label">File CSV<span className="text-red-500 ml-0.5">*</span></label>
          <input
            type="file"
            accept=".csv"
            className="erp-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}

        {rowErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-h-52 overflow-y-auto">
            <p className="text-xs font-700 text-red-700 mb-2">Baris bermasalah — perbaiki di file CSV lalu upload ulang:</p>
            <ul className="space-y-1">
              {rowErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-700">
                  <span className="font-700">Baris {err.rowNumber}:</span> {err.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </ERPModal>
  );
}
