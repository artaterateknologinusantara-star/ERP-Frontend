"use client";

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Paperclip, X } from 'lucide-react';
import { customerPoService } from '@/services/customerpo.service';
import type { CustomerPO } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerPo: CustomerPO;
  onUpdated: () => void;
}

export default function EditPoNoModal({ isOpen, onClose, customerPo, onUpdated }: Props) {
  const [poNo, setPoNo] = useState(customerPo.poNo);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPoNo(customerPo.poNo);
      setReason('');
      setFile(null);
      customerPoService.history(customerPo.id)
        .then((r) => { if (r.success) setHistory(r.data ?? []); })
        .catch(() => setHistory([]));
    }
  }, [isOpen, customerPo]);

  const handleSave = async () => {
    const trimmedNo = poNo.trim();
    if (!trimmedNo) { toast.error('Nomor PO wajib diisi'); return; }
    const numberChanged = trimmedNo !== customerPo.poNo;
    if (!numberChanged && !file) {
      toast.error('Tidak ada perubahan. Ubah nomor PO atau unggah lampiran PO.');
      return;
    }
    setSaving(true);
    try {
      if (numberChanged) {
        await customerPoService.updateNumber(customerPo.id, trimmedNo, reason.trim() || undefined);
      }
      if (file) {
        await customerPoService.uploadAttachment(customerPo.id, file);
      }
      toast.success('Customer PO berhasil diperbarui');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui Customer PO');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 p-4">
        <h3 className="text-[15px] font-700 mb-2">Edit Nomor / Lampiran PO</h3>
        <div className="space-y-3">
          <div>
            <label className="erp-form-label">Nomor PO</label>
            <input className="erp-input" value={poNo} onChange={(e) => setPoNo(e.target.value)} />
          </div>
          <div>
            <label className="erp-form-label">Alasan (opsional)</label>
            <textarea className="erp-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <label className="erp-form-label">
              Lampiran PO {customerPo.hasAttachment ? '(ganti file)' : '(belum ada — upload jika lupa saat input awal)'}
            </label>
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
                  {customerPo.hasAttachment
                    ? (customerPo.attachmentName ?? 'Klik untuk ganti file PO')
                    : 'Klik untuk upload file PO (PDF, JPG, PNG, DOCX)'}
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
          <div>
            <label className="erp-form-label">Riwayat Perubahan</label>
            <div className="max-h-40 overflow-auto text-[13px]">
              {history.length === 0 ? (
                <div className="text-muted-foreground">Belum ada perubahan.</div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="border-b py-2">
                    <div className="text-sm">{new Date(h.changedAt).toLocaleString()} — <strong>{h.changedByName ?? 'System'}</strong></div>
                    <div className="text-xs text-muted-foreground">{h.oldPoNo} → {h.newPoNo}</div>
                    {h.reason && <div className="text-[12px] mt-1">Alasan: {h.reason}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-secondary" onClick={onClose}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
