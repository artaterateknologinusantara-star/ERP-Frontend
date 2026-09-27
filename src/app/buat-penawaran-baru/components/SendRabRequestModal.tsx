'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ERPModal from '@/components/ui/ERPModal';
import { supplierService } from '@/services/supplier.service';
import { vendorRabRequestInternalService } from '@/services/vendorRabRequest.internal.service';
import type { CostingGroup } from '@/types';
import { hasPermission } from '@/lib/permissions';

interface Props {
  group: CostingGroup;
  isOpen: boolean;
  onClose: () => void;
}

export default function SendRabRequestModal({ group, isOpen, onClose }: Props) {
  const canSendRabRequest = hasPermission('Sales', 'canCreate');
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState(`RAB — ${group.name}`);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Subcontractor filter already includes SupplierType.Both server-side (SupplierService.cs).
  const { data: supplierResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () => supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const suppliers = supplierResult?.data ?? [];

  const reset = () => {
    setSupplierId('');
    setName(`RAB — ${group.name}`);
    setDueDate('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Pilih vendor terlebih dahulu'); return; }
    if (!name.trim()) { toast.error('Nama permintaan wajib diisi'); return; }
    setSaving(true);
    try {
      // Vendor menyusun RAB-nya sendiri dari nol lewat portal (nama bagian/item/spesifikasi/
      // volume/satuan/harga) — maincon tidak lagi men-draft baris di sini (redesign RAB vendor-
      // authored 27 Sep 2026). Lines dikirim kosong; VendorRabRequestService.CreateAndSendAsync
      // tidak mensyaratkan minimal 1 baris.
      await vendorRabRequestInternalService.createAndSend(group.id, {
        supplierId,
        name,
        dueDate: dueDate || undefined,
        lines: [],
      });
      toast.success('Permintaan RAB berhasil dikirim ke vendor');
      queryClient.invalidateQueries({ queryKey: ['vendor-rab-requests-by-group', group.id] });
      handleClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengirim permintaan RAB');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Kirim Permintaan RAB ke Vendor"
      subtitle={group.name}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose} disabled={saving}>Batal</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !canSendRabRequest}
            title={!canSendRabRequest ? 'Anda tidak memiliki izin mengirim permintaan RAB' : undefined}
          >
            {saving ? 'Mengirim...' : 'Kirim ke Vendor'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="erp-form-label">Vendor (Subkontraktor)</label>
            <select className="erp-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Pilih Vendor —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="erp-form-label">Jatuh Tempo (opsional)</label>
            <input type="date" className="erp-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="erp-form-label">Nama Permintaan</label>
            <input type="text" className="erp-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
      </div>
    </ERPModal>
  );
}
