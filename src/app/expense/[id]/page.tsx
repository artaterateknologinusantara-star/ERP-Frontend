'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ERPModal from '@/components/ui/ERPModal';
import { formatRp, formatDate } from '@/lib/format';
import { canApprove } from '@/lib/permissions';
import { Download, Loader2, AlertTriangle, CheckCircle2, FileX } from 'lucide-react';
import {
  getExpenseDetail,
  submitExpense,
  approveExpense,
  rejectExpense,
  downloadExpenseAttachment,
  ExpenseDetail,
} from '@/services/expense.service';
import { getJournalEntriesBySourceId, getJournalEntryDetail, JournalEntryDetail } from '@/services/journalEntry.service';
import { ExpenseStatus } from '@/types';

export default function ExpenseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [journal, setJournal] = useState<JournalEntryDetail | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState(false);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenseDetail(id);
      setExpense(data);
    } catch {
      toast.error('Gagal memuat detail Expense');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Ambil jurnal SUNGGUHAN dari GL (bukan preview dihitung ulang) begitu Expense sudah Approved
  useEffect(() => {
    if (!expense || expense.status !== 'Approved') { setJournal(null); return; }
    setJournalLoading(true);
    setJournalError(false);
    getJournalEntriesBySourceId(expense.id)
      .then((list) => {
        if (list.length === 0) { setJournalError(true); return null; }
        return getJournalEntryDetail(list[0].id);
      })
      .then((detail) => { if (detail) setJournal(detail); })
      .catch(() => setJournalError(true))
      .finally(() => setJournalLoading(false));
  }, [expense?.id, expense?.status]);

  const handleSubmit = async () => {
    if (!expense) return;
    setSaving(true);
    try {
      await submitExpense(expense.id);
      toast.success('Expense berhasil diajukan');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal submit Expense');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!expense) return;
    setSaving(true);
    try {
      await approveExpense(expense.id);
      toast.success('Expense berhasil di-approve');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal approve Expense');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!expense) return;
    setRejecting(true);
    try {
      await rejectExpense(expense.id, rejectReason.trim() || undefined);
      toast.success('Expense berhasil ditolak');
      setRejectModal(false);
      setRejectReason('');
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal reject Expense');
    } finally {
      setRejecting(false);
    }
  };

  const handleDownload = async () => {
    if (!expense) return;
    setDownloading(true);
    try {
      await downloadExpenseAttachment(expense.id);
    } catch {
      toast.error('Gagal mengunduh lampiran');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Expense Detail" breadcrumbs={[{ label: 'Finance' }, { label: 'Expense Management', href: '/expense' }, { label: '...' }]}>
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!expense) {
    return (
      <AppLayout title="Expense Detail" breadcrumbs={[{ label: 'Finance' }, { label: 'Expense Management', href: '/expense' }, { label: 'Tidak ditemukan' }]}>
        <div className="text-center py-20 text-muted-foreground text-sm">Expense tidak ditemukan.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={expense.expenseNo}
      breadcrumbs={[
        { label: 'Finance' },
        { label: 'Expense Management', href: '/expense' },
        { label: expense.expenseNo },
      ]}
    >
      <div className="space-y-6">

        {expense.status === 'Submitted' && (
          <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>Expense menunggu persetujuan.</span>
          </div>
        )}
        {expense.status === 'Rejected' && (
          <div className="flex items-start gap-2.5 text-sm px-4 py-3 border border-red-200 bg-red-50 text-red-800 rounded-lg">
            <FileX size={15} className="shrink-0 mt-0.5" />
            <span>Expense ini ditolak dan tidak dapat diproses lebih lanjut. Buat Expense baru kalau pengeluaran ini masih diperlukan.</span>
          </div>
        )}

        {/* Header */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{expense.expenseNo}</h1>
              <StatusBadge status={expense.status as ExpenseStatus} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {expense.status === 'Draft' && (
                <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Memproses...' : 'Submit'}
                </button>
              )}
              {expense.status === 'Submitted' && canApprove('Finance') && (
                <>
                  <button
                    className="btn-primary flex items-center gap-1.5 bg-green-600 hover:bg-green-700 border-green-600"
                    onClick={handleApprove}
                    disabled={saving}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn-secondary text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => setRejectModal(true)}
                    disabled={saving}
                  >
                    ✗ Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Informasi Expense</h3>
            <dl className="space-y-2 text-sm">
              {([
                ['Kategori', expense.expenseCategoryName],
                ['Deskripsi', expense.description],
                ['Vendor', expense.vendorName || '—'],
                ['Tanggal', formatDate(expense.expenseDate)],
                ['No. Referensi', expense.referenceNumber || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-32 text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="font-500 text-foreground break-words">{value}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Catatan</dt>
                <dd className="font-500 text-foreground break-words">{expense.remarks || '—'}</dd>
              </div>
              <div className="flex gap-2 items-center">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Lampiran</dt>
                <dd>
                  {expense.hasAttachment ? (
                    <button
                      className="inline-flex items-center gap-1.5 text-primary hover:underline disabled:opacity-60"
                      disabled={downloading}
                      onClick={handleDownload}
                    >
                      {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      {expense.attachmentName ?? 'Unduh Lampiran'}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">Pembayaran & Approval</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Jumlah</dt>
                <dd className="font-700 font-tabular text-foreground">{formatRp(expense.amount)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Metode</dt>
                <dd className="font-500 text-foreground">{expense.method}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Akun Kas/Bank</dt>
                <dd className="font-500 text-foreground">{expense.cashBankAccountCode} — {expense.cashBankAccountName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Status</dt>
                <dd><StatusBadge status={expense.status as ExpenseStatus} size="sm" /></dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Disetujui Tgl</dt>
                <dd className="font-500 text-foreground">{expense.approvedAt ? formatDate(expense.approvedAt) : 'Belum disetujui'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Disetujui Oleh</dt>
                <dd className="font-500 text-foreground">{expense.approvedByName || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Jurnal terbentuk — data LIVE dari GL, bukan dihitung ulang di frontend */}
        {expense.status === 'Approved' && (
          <div className="erp-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider">Jurnal yang Terbentuk</h3>
              <Link href="/finance-reports/trial-balance" className="text-xs text-primary hover:underline">
                Lihat di Buku Besar →
              </Link>
            </div>
            {journalLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 size={14} className="animate-spin" /> Memuat jurnal...
              </div>
            ) : journalError || !journal ? (
              <div className="text-sm text-muted-foreground py-4">Jurnal tidak ditemukan.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="font-600 text-primary">{journal.entryNumber}</span>
                  <span className="text-muted-foreground">— {journal.description}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/40">
                        {['Kode Akun', 'Nama Akun', 'Debit', 'Kredit'].map((h) => (
                          <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {journal.lines.map((l) => (
                        <tr key={l.id} className="border-b border-border">
                          <td className="erp-table-cell font-600 text-primary text-xs">{l.accountCode}</td>
                          <td className="erp-table-cell">{l.accountName}</td>
                          <td className="erp-table-cell font-tabular text-right">{l.debit === 0 ? '—' : formatRp(l.debit)}</td>
                          <td className="erp-table-cell font-tabular text-right">{l.credit === 0 ? '—' : formatRp(l.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <ERPModal
        isOpen={rejectModal}
        onClose={() => { setRejectModal(false); setRejectReason(''); }}
        title="Reject Expense"
        subtitle={expense.expenseNo}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setRejectModal(false); setRejectReason(''); }} disabled={rejecting}>
              Batal
            </button>
            <button className="btn-primary bg-red-600 hover:bg-red-700 border-red-600" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Memproses...' : 'Reject'}
            </button>
          </>
        }
      >
        <div>
          <label className="erp-form-label">Alasan Penolakan <span className="text-xs text-muted-foreground">(opsional)</span></label>
          <textarea
            className="erp-input resize-none"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Jelaskan alasan Expense ini ditolak..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Expense yang ditolak tidak dapat diproses lagi (dead-end). Kalau pengeluaran ini masih
            diperlukan, buat Expense baru setelah masalah diperbaiki.
          </p>
        </div>
      </ERPModal>
    </AppLayout>
  );
}
