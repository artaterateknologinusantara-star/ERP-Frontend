'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import { supplierService } from '@/services/supplier.service';
import { vendorRabRequestInternalService, CreateVendorRabRequestLineDto } from '@/services/vendorRabRequest.internal.service';
import type { CostingGroup } from '@/types';
import { hasPermission } from '@/lib/permissions';

interface Props {
  group: CostingGroup;
  isOpen: boolean;
  onClose: () => void;
}

interface DraftLine extends CreateVendorRabRequestLineDto {
  key: string;
}

const emptyLine = (sortOrder: number): DraftLine => ({
  key: `line-${Date.now()}-${sortOrder}`,
  name: '',
  spesifikasi: '',
  volume: 0,
  unit: '',
  sortOrder,
});

export default function SendRabRequestModal({ group, isOpen, onClose }: Props) {
  const canSendRabRequest = hasPermission('Sales', 'canCreate');
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState(`RAB — ${group.name}`);
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);
  const [saving, setSaving] = useState(false);

  // Subcontractor filter already includes SupplierType.Both server-side (SupplierService.cs) —
  // same query GroupSubconPanel already uses.
  const { data: supplierResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () => supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const suppliers = supplierResult?.data ?? [];

  const addLine = () => setLines((prev) => [...prev, emptyLine(prev.length)]);
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const reset = () => {
    setSupplierId('');
    setName(`RAB — ${group.name}`);
    setDueDate('');
    setLines([emptyLine(0)]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Pilih vendor terlebih dahulu'); return; }
    if (!name.trim()) { toast.error('Nama permintaan wajib diisi'); return; }
    const invalidLines = lines.filter((l) => !l.name.trim() || l.volume <= 0 || !l.unit.trim());
    if (lines.length === 0 || invalidLines.length > 0) {
      toast.error('Setiap baris wajib punya nama, volume > 0, dan satuan');
      return;
    }
    setSaving(true);
    try {
      await vendorRabRequestInternalService.createAndSend(group.id, {
        supplierId,
        name,
        dueDate: dueDate || undefined,
        lines: lines.map((l, i) => ({
          name: l.name,
          spesifikasi: l.spesifikasi || undefined,
          volume: l.volume,
          unit: l.unit,
          sortOrder: i,
        })),
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

        <div className="space-y-2">
          <label className="erp-form-label">Baris Item (vendor hanya mengisi harga satuan)</label>
          {lines.map((line) => (
            <div key={line.key} className="border border-border rounded-md p-2.5 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Item"
                  className="erp-input text-xs py-1.5"
                  value={line.name}
                  onChange={(e) => updateLine(line.key, { name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Spesifikasi (opsional)"
                  className="erp-input text-xs py-1.5"
                  value={line.spesifikasi}
                  onChange={(e) => updateLine(line.key, { spesifikasi: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Volume"
                  className="erp-input text-xs py-1.5 w-24 text-right font-tabular"
                  value={line.volume || ''}
                  onChange={(e) => updateLine(line.key, { volume: parseFloat(e.target.value) || 0 })}
                />
                <input
                  type="text"
                  placeholder="Satuan"
                  className="erp-input text-xs py-1.5 w-24"
                  value={line.unit}
                  onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  className="ml-auto p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
          >
            <Plus size={12} /> Tambah Baris
          </button>
        </div>
      </div>
    </ERPModal>
  );
}
