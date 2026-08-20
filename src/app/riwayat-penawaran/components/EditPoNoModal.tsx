"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPoNo(customerPo.poNo);
      setReason('');
      customerPoService.history(customerPo.id)
        .then((r) => { if (r.success) setHistory(r.data ?? []); })
        .catch(() => setHistory([]));
    }
  }, [isOpen, customerPo]);

  const handleSave = async () => {
    if (!poNo.trim()) { toast.error('Nomor PO wajib diisi'); return; }
    if (poNo === customerPo.poNo) { toast.error('Nomor PO baru sama dengan yang lama'); return; }
    setSaving(true);
    try {
      await customerPoService.updateNumber(customerPo.id, poNo.trim(), reason.trim() || undefined);
      toast.success('Nomor PO berhasil diperbarui');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui nomor PO');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 p-4">
        <h3 className="text-[15px] font-700 mb-2">Edit Nomor PO</h3>
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
