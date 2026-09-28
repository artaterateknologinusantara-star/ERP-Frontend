'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Download, Plus, Trash2, Upload } from 'lucide-react';
import VendorShell from '@/components/vendor/VendorShell';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { vendorRabRequestService, VendorRabImportRejectedError } from '@/services/vendorRabRequest.service';
import { downloadBlob } from '@/lib/downloadBlob';
import { formatDate, formatRp } from '@/lib/format';
import { useVendorAuth } from '@/hooks/useVendorAuth';
import type { VendorRabSubmissionLine } from '@/types';

// Vendor (subcon) sekarang menyusun RAB-nya sendiri dari nol — nama bagian/item/spesifikasi/
// volume/satuan/harga — bukan lagi cuma isi harga ke baris yang di-draft maincon (lihat
// perubahan arah task RAB Sep 2026). Builder ini mirror pola GroupWorkItemsPanel.tsx di sisi
// maincon (bagian → baris, tambah/hapus bebas), disederhanakan untuk portal vendor yang lebih
// ringkas/mobile-friendly.
interface BuilderRow {
  id: string;
  name: string;
  spesifikasi: string;
  volume: number;
  unit: string;
  servicePrice: number;
  materialPrice: number;
  negotiationNote?: string | null;
}

interface BuilderGroup {
  id: string;
  workItemName: string;
  rows: BuilderRow[];
}

let rowCounter = 0;
function newRowId() {
  rowCounter += 1;
  return `row-${Date.now()}-${rowCounter}`;
}

function emptyRow(): BuilderRow {
  return {
    id: newRowId(),
    name: '',
    spesifikasi: '',
    volume: 0,
    unit: '',
    servicePrice: 0,
    materialPrice: 0,
  };
}

function emptyGroup(): BuilderGroup {
  return { id: newRowId(), workItemName: '', rows: [emptyRow()] };
}

// Kelompokkan baris dari attempt sebelumnya (saat RevisionRequested) balik jadi Group builder —
// urutan kemunculan pertama tiap WorkItemName dipertahankan, sama seperti fan-out di backend
// (QuotationService.ApplyApprovedVendorRabSubmissionAsync).
function groupsFromLines(lines: VendorRabSubmissionLine[]): BuilderGroup[] {
  const byName = new Map<string, BuilderGroup>();
  const order: string[] = [];
  for (const line of [...lines].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const key = line.workItemName?.trim() || '';
    if (!byName.has(key)) {
      byName.set(key, { id: newRowId(), workItemName: key, rows: [] });
      order.push(key);
    }
    byName.get(key)!.rows.push({
      id: newRowId(),
      name: line.name,
      spesifikasi: line.spesifikasi ?? '',
      volume: line.volume,
      unit: line.unit,
      servicePrice: line.servicePrice,
      materialPrice: line.materialPrice,
      negotiationNote: line.negotiationNote,
    });
  }
  return order.map((key) => byName.get(key)!);
}

function VendorRabRequestDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loading: authLoading } = useVendorAuth();
  const [groups, setGroups] = useState<BuilderGroup[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-rab-request', params.id],
    queryFn: () => vendorRabRequestService.getById(params.id),
    enabled: !authLoading,
  });

  const request = data?.data;

  const sortedSubmissions = [...(request?.submissions ?? [])].sort((a, b) => b.attemptNumber - a.attemptNumber);
  const latest = sortedSubmissions[0];
  const canSubmit = !latest || latest.status === 'Rejected' || latest.status === 'RevisionRequested';

  // Pre-fill dari attempt terakhir HANYA saat RevisionRequested (bukan Rejected — reject total
  // berarti vendor mulai dari nol lagi, sesuai keputusan produk). Sekali saja per request (bukan
  // tiap refetch) supaya draft yang sedang diedit vendor tidak ke-reset oleh polling react-query.
  useEffect(() => {
    if (!request || initialized) return;
    if (canSubmit && latest?.status === 'RevisionRequested' && latest.lines.length > 0) {
      setGroups(groupsFromLines(latest.lines));
    } else if (canSubmit) {
      setGroups([emptyGroup()]);
    }
    setInitialized(true);
  }, [request, canSubmit, latest, initialized]);

  if (authLoading || isLoading) {
    return <div className="text-center py-10 text-muted-foreground text-sm">Memuat data...</div>;
  }

  if (!request) {
    return <div className="text-center py-10 text-muted-foreground text-sm">Permintaan RAB tidak ditemukan.</div>;
  }

  const updateGroup = (groupId: string, patch: Partial<BuilderGroup>) =>
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));

  const updateRow = (groupId: string, rowId: string, patch: Partial<BuilderRow>) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId ? g : { ...g, rows: g.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) },
      ),
    );

  const addGroup = () => setGroups((prev) => [...prev, emptyGroup()]);
  const removeGroup = (groupId: string) => setGroups((prev) => prev.filter((g) => g.id !== groupId));
  const addRow = (groupId: string) =>
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, rows: [...g.rows, emptyRow()] } : g)));
  const removeRow = (groupId: string, rowId: string) =>
    setGroups((prev) =>
      prev.map((g) => (g.id !== groupId ? g : { ...g, rows: g.rows.filter((r) => r.id !== rowId) })),
    );

  const allRows = groups.flatMap((g) => g.rows);
  const grandTotal = allRows.reduce((sum, r) => sum + r.volume * (r.servicePrice + r.materialPrice), 0);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const blob = await vendorRabRequestService.downloadTemplate(request.id);
      downloadBlob(blob, `RAB-${request.name}.xlsx`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengunduh template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportErrors([]);
    setImporting(true);
    try {
      await vendorRabRequestService.importSubmission(request.id, file);
      toast.success('Submission berhasil dikirim, menunggu review.');
      setInitialized(false);
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-request', params.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-requests'] });
    } catch (e: unknown) {
      if (e instanceof VendorRabImportRejectedError) {
        setImportErrors(e.errors);
        toast.error(e.message);
      } else {
        toast.error(e instanceof Error ? e.message : 'Gagal mengimpor submission Excel');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async () => {
    setImportErrors([]);
    if (allRows.length === 0) {
      toast.error('Tambahkan minimal 1 baris item.');
      return;
    }
    const emptyName = allRows.filter((r) => r.name.trim() === '');
    if (emptyName.length > 0) {
      toast.error(`Ada ${emptyName.length} baris dengan Nama Item kosong.`);
      return;
    }
    const badVolume = allRows.filter((r) => r.volume <= 0);
    if (badVolume.length > 0) {
      toast.error(`Ada ${badVolume.length} baris dengan Volume tidak lebih dari 0.`);
      return;
    }
    const emptyUnit = allRows.filter((r) => r.unit.trim() === '');
    if (emptyUnit.length > 0) {
      toast.error(`Ada ${emptyUnit.length} baris dengan Satuan kosong.`);
      return;
    }

    setSubmitting(true);
    try {
      await vendorRabRequestService.submit(
        request.id,
        groups.flatMap((g) =>
          g.rows.map((r) => ({
            workItemName: g.workItemName.trim() || null,
            name: r.name,
            spesifikasi: r.spesifikasi.trim() || null,
            volume: r.volume,
            unit: r.unit,
            servicePrice: r.servicePrice,
            materialPrice: r.materialPrice,
          })),
        ),
      );
      toast.success('Submission berhasil dikirim, menunggu review.');
      setInitialized(false);
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-request', params.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-requests'] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengirim submission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/vendor-portal/rab-requests')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> Kembali
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-700 text-foreground">{request.name}</h1>
          <p className="text-sm text-muted-foreground">
            Jatuh tempo: {request.dueDate ? formatDate(request.dueDate) : '—'}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {sortedSubmissions.length > 0 && (
        <div className="erp-card space-y-2">
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Riwayat Submission</p>
          {sortedSubmissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>Attempt #{s.attemptNumber} — {formatDate(s.submittedAt)}</span>
              <StatusBadge status={s.status} size="sm" />
            </div>
          ))}
          {latest?.status === 'Rejected' && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md p-2 mt-1">
              Submission terakhir ditolak. Silakan perbaiki dan kirim ulang.
            </p>
          )}
          {latest?.status === 'RevisionRequested' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2 mt-1">
              Maincon meminta revisi pada baris tertentu (ditandai di bawah). Baris lain sudah
              terisi otomatis dari submission sebelumnya — ubah seperlunya lalu kirim ulang.
            </p>
          )}
        </div>
      )}

      {!canSubmit && latest?.status === 'PendingReview' && (
        <div className="erp-card text-center py-6 text-sm text-muted-foreground">
          Submission Anda sedang menunggu review dari maincon.
        </div>
      )}

      {!canSubmit && latest?.status === 'Approved' && (
        <div className="erp-card text-center py-6 text-sm text-green-700 bg-green-50">
          Submission Anda sudah disetujui.
        </div>
      )}

      {canSubmit && (
        <div className="space-y-3">
          <div className="erp-card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 border border-border rounded-md hover:bg-black/5"
              >
                <Download size={14} /> {downloadingTemplate ? 'Mengunduh...' : 'Download Template Excel'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 border border-border rounded-md hover:bg-black/5"
              >
                <Upload size={14} /> {importing ? 'Mengunggah...' : 'Upload Excel Terisi'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Isi lewat Excel atau lewat form di bawah — keduanya langsung mengirim submission, pilih salah satu.
            </p>
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-h-52 overflow-y-auto">
                <p className="text-xs font-700 text-red-700 mb-2">
                  File Excel ditolak — perbaiki baris berikut lalu upload ulang:
                </p>
                <ul className="space-y-1">
                  {importErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700">{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {groups.map((group) => (
            <div key={group.id} className="erp-card space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={group.workItemName}
                  onChange={(e) => updateGroup(group.id, { workItemName: e.target.value })}
                  placeholder="Nama Bagian/Pekerjaan (opsional)"
                  className="flex-1 h-9 px-2.5 border border-border rounded-md text-sm font-600 bg-background"
                />
                {groups.length > 1 && (
                  <button
                    type="button"
                    aria-label="Hapus bagian"
                    onClick={() => removeGroup(group.id)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {group.rows.map((row) => {
                  const total = row.volume * (row.servicePrice + row.materialPrice);
                  return (
                    <div key={row.id} className="border border-border rounded-md p-3 space-y-2">
                      {row.negotiationNote && (
                        <p className="text-xs text-amber-800 bg-amber-100 rounded-md px-2 py-1">
                          Catatan maincon: {row.negotiationNote}
                        </p>
                      )}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          <input
                            value={row.name}
                            onChange={(e) => updateRow(group.id, row.id, { name: e.target.value })}
                            placeholder="Nama Item"
                            className="w-full h-9 px-2.5 border border-border rounded-md text-sm font-600 bg-background"
                          />
                          <textarea
                            value={row.spesifikasi}
                            onChange={(e) => updateRow(group.id, row.id, { spesifikasi: e.target.value })}
                            placeholder="Spesifikasi (opsional)"
                            rows={2}
                            className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs bg-background resize-y"
                          />
                        </div>
                        {group.rows.length > 1 && (
                          <button
                            type="button"
                            aria-label="Hapus baris"
                            onClick={() => removeRow(group.id, row.id)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-28">
                          <input
                            type="number"
                            value={row.volume === 0 ? '' : row.volume}
                            onChange={(e) => updateRow(group.id, row.id, { volume: parseFloat(e.target.value) || 0 })}
                            placeholder="Volume"
                            className="w-full h-9 px-2.5 border border-border rounded-md text-sm bg-background text-right"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            value={row.unit}
                            onChange={(e) => updateRow(group.id, row.id, { unit: e.target.value })}
                            placeholder="Satuan"
                            className="w-full h-9 px-2.5 border border-border rounded-md text-sm bg-background"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="erp-form-label flex-shrink-0 mb-0">Harga Jasa</label>
                          <div className="w-36">
                            <CurrencyInput
                              value={row.servicePrice}
                              onChange={(v) => updateRow(group.id, row.id, { servicePrice: v })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="erp-form-label flex-shrink-0 mb-0">Harga Material</label>
                          <div className="w-36">
                            <CurrencyInput
                              value={row.materialPrice}
                              onChange={(v) => updateRow(group.id, row.id, { materialPrice: v })}
                            />
                          </div>
                        </div>
                        {total > 0 && (
                          <span className="text-xs text-muted-foreground font-tabular ml-auto">
                            = {formatRp(total)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => addRow(group.id)}
                className="text-xs font-600 text-primary flex items-center gap-1"
              >
                <Plus size={14} /> Tambah Item
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addGroup}
            className="w-full h-10 border border-dashed border-border rounded-md text-sm font-600 text-primary flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Tambah Bagian/Pekerjaan
          </button>

          <div className="erp-card flex items-center justify-between">
            <span className="text-sm font-600 text-muted-foreground">Total RAB</span>
            <span className="text-lg font-700">{formatRp(grandTotal)}</span>
          </div>

          <button className="btn-primary w-full justify-center" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Submission'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function VendorRabRequestDetailPage() {
  return (
    <VendorShell>
      <VendorRabRequestDetail />
    </VendorShell>
  );
}
