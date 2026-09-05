'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatRp, formatDate } from '@/lib/format';
import { canApprove } from '@/lib/permissions';
import {
  getJournalEntryDetail,
  postJournalEntry,
  reverseJournalEntry,
  type JournalEntryDetail,
} from '@/services/journalEntry.service';

export default function JournalEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [reverseModal, setReverseModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getJournalEntryDetail(id)
      .then(setEntry)
      .catch(() => toast.error('Gagal memuat journal entry'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await postJournalEntry(entry.id);
      toast.success(`${entry.entryNumber} berhasil di-post`);
      setPostModal(false);
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal men-post journal entry');
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const reversal = await reverseJournalEntry(entry.id);
      toast.success(`${entry.entryNumber} berhasil di-reverse (${reversal.entryNumber})`);
      setReverseModal(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal me-reverse journal entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Journal Entry" breadcrumbs={[{ label: 'Accounting' }, { label: 'Journal Entry' }]}>
        <div className="erp-card text-center py-12 text-muted-foreground">Memuat data...</div>
      </AppLayout>
    );
  }

  if (!entry) {
    return (
      <AppLayout title="Journal Entry" breadcrumbs={[{ label: 'Accounting' }, { label: 'Journal Entry' }]}>
        <div className="erp-card text-center py-12 text-muted-foreground">Journal entry tidak ditemukan.</div>
      </AppLayout>
    );
  }

  const showPostAction = entry.status === 'Draft' && canApprove('Accounting');
  const showReverseAction = entry.status === 'Posted' && !entry.reversedByEntryId && canApprove('Accounting');

  return (
    <AppLayout
      title="Journal Entry"
      breadcrumbs={[
        { label: 'Accounting' },
        { label: 'Journal Entry', href: '/journal-entry' },
        { label: entry.entryNumber },
      ]}
    >
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="erp-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{entry.entryNumber}</h1>
              <StatusBadge status={entry.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {showPostAction && (
                <button
                  className="btn-primary flex items-center gap-1.5 bg-green-600 hover:bg-green-700 border-green-600"
                  onClick={() => setPostModal(true)}
                  disabled={saving}
                >
                  ✓ Post
                </button>
              )}
              {showReverseAction && (
                <button
                  className="btn-secondary text-red-500 border-red-300 hover:bg-red-50"
                  onClick={() => setReverseModal(true)}
                  disabled={saving}
                >
                  Reverse
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Kiri: Informasi Entry */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
              Informasi Entry
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Tanggal</dt>
                <dd className="font-500 text-foreground">{formatDate(entry.date)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Deskripsi</dt>
                <dd className="font-500 text-foreground break-words">{entry.description}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Source Type</dt>
                <dd className="font-500 text-foreground">{entry.sourceType}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Dibuat Oleh</dt>
                <dd className="font-500 text-foreground">{entry.createdByName || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground flex-shrink-0">Dibuat Pada</dt>
                <dd className="font-500 text-foreground">{formatDate(entry.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Kanan: Status Posting */}
          <div className="erp-card">
            <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
              Status Posting
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-36 text-muted-foreground flex-shrink-0">Status</dt>
                <dd><StatusBadge status={entry.status} size="sm" /></dd>
              </div>
              {(entry.status === 'Posted' || entry.status === 'Reversed') && (
                <>
                  <div className="flex gap-2">
                    <dt className="w-36 text-muted-foreground flex-shrink-0">Diposting Pada</dt>
                    <dd className="font-500 text-foreground">{entry.postedAt ? formatDate(entry.postedAt) : '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-36 text-muted-foreground flex-shrink-0">Diposting Oleh</dt>
                    <dd className="font-500 text-foreground">{entry.postedByName || '—'}</dd>
                  </div>
                </>
              )}
              {entry.status === 'Reversed' && entry.reversedByEntryId && (
                <div className="flex gap-2">
                  <dt className="w-36 text-muted-foreground flex-shrink-0">Entry Pembalik</dt>
                  <dd className="font-500">
                    <Link
                      href={`/journal-entry/${entry.reversedByEntryId}`}
                      className="text-primary hover:underline"
                    >
                      Lihat entry pembalik
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* ── Baris Jurnal ── */}
        <div className="erp-card">
          <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-3">
            Baris Jurnal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['Akun', 'Debit', 'Kredit', 'Memo'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border">
                    <td className="erp-table-cell font-500">{line.accountCode} — {line.accountName}</td>
                    <td className="erp-table-cell font-tabular text-right">{line.debit > 0 ? formatRp(line.debit) : '—'}</td>
                    <td className="erp-table-cell font-tabular text-right">{line.credit > 0 ? formatRp(line.credit) : '—'}</td>
                    <td className="erp-table-cell text-muted-foreground">{line.memo || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-700">
                  <td className="erp-table-cell">Total</td>
                  <td className="erp-table-cell font-tabular text-right">{formatRp(entry.totalDebit)}</td>
                  <td className="erp-table-cell font-tabular text-right">{formatRp(entry.totalCredit)}</td>
                  <td className="erp-table-cell"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="pb-6">
          <button className="btn-secondary" onClick={() => router.push('/journal-entry')}>
            Kembali ke Daftar
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={postModal}
        onClose={() => setPostModal(false)}
        onConfirm={handlePost}
        title="Post Journal Entry Ini?"
        description={`${entry.entryNumber} akan berstatus Posted dan masuk ke laporan keuangan. Tindakan ini tidak dapat dibatalkan langsung — hanya bisa di-reverse setelahnya.`}
        confirmLabel="Ya, Post"
        variant="default"
        loading={saving}
      />

      <ConfirmModal
        isOpen={reverseModal}
        onClose={() => setReverseModal(false)}
        onConfirm={handleReverse}
        title="Reverse Journal Entry Ini?"
        description={`Sebuah entry pembalik baru akan dibuat untuk menetralkan ${entry.entryNumber}. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Reverse"
        variant="danger"
        loading={saving}
      />
    </AppLayout>
  );
}
