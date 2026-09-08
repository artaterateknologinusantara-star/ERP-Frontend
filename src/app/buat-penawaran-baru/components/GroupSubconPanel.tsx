'use client';

import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { supplierService } from '@/services/supplier.service';
import { quotationService } from '@/services/quotation.service';
import type { CostingGroup } from '@/types';

interface Props {
  group: CostingGroup;
  onUpdate: (fields: Partial<CostingGroup>) => void;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GroupSubconPanel({ group, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: subconResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () => supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const subconOptions = subconResult?.data ?? [];

  // A group only has a real backend id (and can carry a RAB attachment) once the
  // quotation containing it has been saved at least once — new/unsaved groups use a
  // client-generated id like "grp-tab-1-172..." instead of a GUID.
  const isPersisted = GUID_RE.test(group.id);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('File RAB harus berupa PDF');
      return;
    }
    setUploading(true);
    try {
      await quotationService.uploadGroupRab(group.id, file);
      onUpdate({ hasRabAttachment: true });
      toast.success('RAB berhasil diunggah');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah RAB');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await quotationService.deleteGroupRab(group.id);
      onUpdate({ hasRabAttachment: false });
      toast.success('RAB berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus RAB');
    }
  };

  const handleView = async () => {
    try {
      const blob = await quotationService.downloadGroupRab(group.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Gagal membuka RAB');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs pt-1.5">
      <label className="text-muted-foreground flex-shrink-0">Subkontraktor:</label>
      <select
        className="erp-input w-auto min-w-[160px] py-1"
        value={group.subcontractorId ?? ''}
        onChange={(e) => onUpdate({ subcontractorId: e.target.value || null })}
      >
        <option value="">— Pilih Subkontraktor —</option>
        {subconOptions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label className="text-muted-foreground flex-shrink-0">Biaya Final Subcon:</label>
      <div className="w-36">
        <CurrencyInput
          value={group.finalSubconCost ?? 0}
          prefix=""
          onChange={(v) => onUpdate({ finalSubconCost: v || null })}
        />
      </div>

      <label className="text-muted-foreground flex-shrink-0">RAB:</label>
      {!isPersisted ? (
        <span className="text-muted-foreground italic">simpan penawaran dulu</span>
      ) : group.hasRabAttachment ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleView}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <FileText size={12} /> Lihat
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload RAB
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
