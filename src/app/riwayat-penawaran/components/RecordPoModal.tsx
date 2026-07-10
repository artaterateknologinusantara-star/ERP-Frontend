'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatRp } from '@/lib/format';
import { toast } from 'sonner';
import { X, Paperclip, Download, Loader2, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react';
import type { CustomerPO, QuotationListItem } from '@/types';
import { customerPoService } from '@/services/customerpo.service';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationListItem;
  onSuccess: () => void;
  onRequestRevision?: () => void;
}

export default function RecordPoModal({ isOpen, onClose, quotation, onSuccess, onRequestRevision }: Props) {
  const [existing, setExisting] = useState<CustomerPO | null>(null);
  const [fetching, setFetching] = useState(false);

  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFetching(true);
    setExisting(null);
    customerPoService
      .getByQuotationId(quotation.id)
      .then((res) => { if (res.success && res.data) setExisting(res.data); else setExisting(null); })
      .catch(() => setExisting(null))
      .finally(() => setFetching(false));
  }, [isOpen, quotation.id]);

  // ── Amount validation ───────────────────────────────────────────────────────
  const poAmount = amount;
  const quotaTotal = quotation.grandTotal;
  const difference = poAmount - quotaTotal;
  const pctDiff = quotaTotal > 0 ? (Math.abs(difference) / quotaTotal) * 100 : 0;
  const isOver  = poAmount > 0 && difference > 0;
  const isUnder = poAmount > 0 && difference < 0;
  const isMatch = poAmount > 0 && difference === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNo.trim()) { toast.error('Nomor PO wajib diisi'); return; }
    if (!poDate)       { toast.error('Tanggal PO wajib diisi'); return; }
    if (poAmount <= 0) { toast.error('Nilai PO harus lebih dari 0'); return; }
    if (isOver)        { toast.error('Nilai PO tidak boleh melebihi total penawaran yang disetujui'); return; }
    if (isUnder && !notes.trim()) { toast.error('Wajib mengisi catatan alasan untuk nilai PO yang berbeda dari penawaran'); return; }

    setSubmitting(true);
    try {
      await customerPoService.create(
        { quotationId: quotation.id, poNo: poNo.trim(), poDate, amount: poAmount, notes: notes.trim() || undefined },
        file ?? undefined,
      );
      toast.success('Customer PO berhasil disimpan');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan Customer PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!existing) return;
    setDownloading(true);
    try {
      await customerPoService.downloadAttachment(existing.id);
    } catch {
      toast.error('Gagal mengunduh lampiran');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-700 text-foreground">Customer PO</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {quotation.no} — {quotation.customerName}
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
          {fetching ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Memuat data...</span>
            </div>
          ) : existing ? (
            /* ── View mode ─────────────────────────────────────────────── */
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-[13px] text-green-800 font-500">
                Customer PO sudah diinput untuk penawaran ini.
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">No. PO Customer</p>
                  <p className="font-700">{existing.poNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Tanggal PO</p>
                  <p className="font-500">{existing.poDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Nilai PO</p>
                  <p className="font-700 text-primary">{formatRp(existing.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">No. Penawaran</p>
                  <p className="font-500">{existing.quotationNo}</p>
                </div>
              </div>
              {existing.notes && (
                <div className="text-[13px]">
                  <p className="text-muted-foreground text-xs mb-0.5">Catatan</p>
                  <p className="text-foreground">{existing.notes}</p>
                </div>
              )}
              {existing.hasAttachment && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 text-[13px] text-primary hover:underline disabled:opacity-60"
                >
                  {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {existing.attachmentName ?? 'Unduh Lampiran'}
                </button>
              )}
            </div>
          ) : (
            /* ── Create mode ───────────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Quotation total reference */}
              <div className="bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Penawaran Disetujui</span>
                  <span className="font-700 text-foreground">{formatRp(quotaTotal)}</span>
                </div>
                {poAmount > 0 && !isMatch && (
                  <div className={`flex items-center justify-between border-t mt-2 pt-2 ${isOver ? 'border-red-200' : 'border-orange-200'}`}>
                    <span className={isOver ? 'text-red-600' : 'text-orange-600'}>
                      {isOver ? 'Kelebihan' : 'Selisih'}
                    </span>
                    <span className={`font-700 ${isOver ? 'text-red-700' : 'text-orange-700'}`}>
                      {formatRp(Math.abs(difference))}
                      <span className="font-500 ml-1">({pctDiff.toFixed(1)}%)</span>
                    </span>
                  </div>
                )}
                {isMatch && (
                  <div className="flex items-center gap-1.5 text-emerald-700 border-t border-emerald-200 mt-2 pt-2">
                    <CheckCircle size={12} />
                    <span className="font-500">Nilai PO sesuai penawaran</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="erp-form-label">No. PO Customer <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="Misal: PO-2026-001"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="erp-form-label">Tanggal PO <span className="text-destructive">*</span></label>
                  <input
                    type="date"
                    className="erp-input"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="erp-form-label">Nilai PO (Rp) <span className="text-destructive">*</span></label>
                  <CurrencyInput
                    value={amount}
                    onChange={setAmount}
                    error={isOver}
                    className={isOver ? 'focus:!border-red-500 focus:![box-shadow:0_0_0_3px_rgba(239,68,68,0.12)]' : isUnder ? 'border-orange-400' : ''}
                    required
                  />
                </div>
              </div>

              {/* Hard block: PO exceeds quotation */}
              {isOver && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-900">
                  <p className="font-600 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    Nilai PO melebihi total penawaran
                  </p>
                  <p className="text-red-700 mt-1 leading-relaxed">
                    PO tidak dapat diinput dengan nilai di atas penawaran yang disetujui. Konfirmasi ulang nilai dengan customer.
                  </p>
                </div>
              )}

              {/* Soft warning: PO below quotation */}
              {isUnder && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-[12.5px] text-orange-900 space-y-2">
                  <p className="font-600 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    Nilai PO lebih rendah dari penawaran
                  </p>
                  <p className="text-orange-700 leading-relaxed">
                    Jika perbedaan disebabkan oleh pengurangan item atau perubahan scope, disarankan membuat <strong>Revisi Penawaran</strong> terlebih dahulu agar dokumen tetap sinkron.
                  </p>
                  {onRequestRevision && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-[12px] font-600 px-3 py-1.5 rounded-md bg-orange-100 text-orange-900 border border-orange-300 hover:bg-orange-200 transition-colors"
                      onClick={onRequestRevision}
                    >
                      <GitBranch size={12} /> Buat Revisi Penawaran
                    </button>
                  )}
                  <p className="text-orange-600 text-[11.5px]">
                    Untuk melanjutkan tanpa revisi, wajib isi catatan alasan di bawah.
                  </p>
                </div>
              )}

              <div>
                <label className="erp-form-label">
                  Catatan
                  {isUnder
                    ? <span className="text-destructive"> * (wajib untuk nilai berbeda)</span>
                    : <span className="text-muted-foreground font-400"> (opsional)</span>
                  }
                </label>
                <textarea
                  className={`erp-input resize-none ${isUnder && !notes.trim() ? 'border-orange-400' : ''}`}
                  rows={2}
                  placeholder={isUnder ? 'Jelaskan alasan perbedaan nilai PO vs penawaran...' : 'Catatan tambahan (opsional)'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="erp-form-label">Lampiran PO</label>
                <div
                  className="border border-dashed border-border rounded-lg px-4 py-3 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-[13px]">
                      <Paperclip size={13} className="text-primary" />
                      <span className="font-500 text-primary truncate max-w-[280px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[13px] text-muted-foreground">
                      <Paperclip size={13} className="inline mr-1.5" />
                      Klik untuk upload file PO (PDF, JPG, PNG, DOCX)
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || isOver}
                  title={isOver ? 'Nilai PO melebihi penawaran yang disetujui' : undefined}
                >
                  {submitting
                    ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</>
                    : 'Simpan PO Customer'
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
