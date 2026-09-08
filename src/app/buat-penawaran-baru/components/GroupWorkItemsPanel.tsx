'use client';

import React, { useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { quotationService } from '@/services/quotation.service';
import type { CostingGroup, WorkItem, WorkDetail } from '@/types';

interface Props {
  group: CostingGroup;
  onUpdate: (fields: Partial<CostingGroup>) => void;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;

function detailPayload(d: WorkDetail) {
  return { name: d.name, spesifikasi: d.spesifikasi, volume: d.volume, unit: d.unit, unitPrice: d.unitPrice, sortOrder: d.sortOrder };
}

export default function GroupWorkItemsPanel({ group, onUpdate }: Props) {
  const isPersisted = GUID_RE.test(group.id);
  const workItems = group.workItems ?? [];
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setWorkItems = (next: WorkItem[]) => onUpdate({ workItems: next });

  const handleAddWorkItem = async () => {
    try {
      const res = await quotationService.createWorkItem(group.id, { name: 'Item Pekerjaan Baru', sortOrder: workItems.length });
      setWorkItems([...workItems, { ...res.data, workDetails: [] }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah Item Pekerjaan');
    }
  };

  const handleRenameWorkItem = (workItem: WorkItem, name: string) => {
    setWorkItems(workItems.map((w) => (w.id === workItem.id ? { ...w, name } : w)));
  };

  const handleWorkItemBlur = async (workItem: WorkItem) => {
    try {
      await quotationService.updateWorkItem(workItem.id, { name: workItem.name, sortOrder: workItem.sortOrder });
    } catch {
      toast.error('Gagal menyimpan nama Item Pekerjaan');
    }
  };

  const handleDeleteWorkItem = async (workItem: WorkItem) => {
    try {
      await quotationService.deleteWorkItem(workItem.id);
      setWorkItems(workItems.filter((w) => w.id !== workItem.id));
    } catch {
      toast.error('Gagal menghapus Item Pekerjaan');
    }
  };

  const handleAddWorkDetail = async (workItem: WorkItem) => {
    try {
      const res = await quotationService.createWorkDetail(workItem.id, {
        name: '', spesifikasi: '', volume: 0, unit: '', unitPrice: 0, sortOrder: workItem.workDetails.length,
      });
      const detail: WorkDetail = { ...res.data, attachments: [] };
      setWorkItems(workItems.map((w) => (w.id === workItem.id ? { ...w, workDetails: [...w.workDetails, detail] } : w)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah Detail Kerja');
    }
  };

  const updateDetailLocal = (workItemId: string, detailId: string, patch: Partial<WorkDetail>) => {
    setWorkItems(workItems.map((w) => (
      w.id !== workItemId ? w : {
        ...w,
        workDetails: w.workDetails.map((d) => (d.id === detailId ? { ...d, ...patch } : d)),
      }
    )));
  };

  const handleDetailBlur = async (detail: WorkDetail) => {
    try {
      await quotationService.updateWorkDetail(detail.id, detailPayload(detail));
    } catch {
      toast.error('Gagal menyimpan Detail Kerja');
    }
  };

  const handleDeleteWorkDetail = async (workItem: WorkItem, detail: WorkDetail) => {
    try {
      await quotationService.deleteWorkDetail(detail.id);
      setWorkItems(workItems.map((w) => (
        w.id !== workItem.id ? w : { ...w, workDetails: w.workDetails.filter((d) => d.id !== detail.id) }
      )));
    } catch {
      toast.error('Gagal menghapus Detail Kerja');
    }
  };

  const handleUploadImage = async (workItem: WorkItem, detail: WorkDetail, file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      toast.error('Gambar harus berformat JPG atau PNG');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Ukuran gambar maksimal 1MB');
      return;
    }
    try {
      const attachment = await quotationService.uploadWorkDetailAttachment(detail.id, file);
      updateDetailLocal(workItem.id, detail.id, { attachments: [...detail.attachments, attachment] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah gambar');
    }
  };

  const handleDeleteImage = async (workItem: WorkItem, detail: WorkDetail, attachmentId: string) => {
    try {
      await quotationService.deleteWorkDetailAttachment(attachmentId);
      updateDetailLocal(workItem.id, detail.id, { attachments: detail.attachments.filter((a) => a.id !== attachmentId) });
    } catch {
      toast.error('Gagal menghapus gambar');
    }
  };

  if (!isPersisted) {
    return (
      <div className="pt-1.5 text-xs text-muted-foreground italic">
        Detail RAB/BQ: simpan penawaran dulu
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-2">
      <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Detail RAB/BQ</span>

      {workItems.map((workItem, wi) => (
        <div key={workItem.id} className="border border-border rounded-lg p-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-tabular flex-shrink-0">{wi + 1}.</span>
            <input
              type="text"
              value={workItem.name}
              onChange={(e) => handleRenameWorkItem(workItem, e.target.value)}
              onBlur={() => handleWorkItemBlur(workItem)}
              placeholder="Nama Item Pekerjaan"
              className="erp-input flex-1 text-xs font-600 py-1"
            />
            <button
              type="button"
              onClick={() => handleAddWorkDetail(workItem)}
              className="p-1 rounded hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
              title="Tambah Detail Kerja"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteWorkItem(workItem)}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
              title="Hapus Item Pekerjaan"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {workItem.workDetails.map((detail) => {
            const totalHarga = detail.volume * detail.unitPrice;
            const inputKey = `${workItem.id}:${detail.id}`;
            return (
              <div key={detail.id} className="ml-4 pl-2 border-l-2 border-border space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={detail.name}
                    onChange={(e) => updateDetailLocal(workItem.id, detail.id, { name: e.target.value })}
                    onBlur={() => handleDetailBlur(detail)}
                    placeholder="Detail Kerja (mis. Peninggian lantai t.20cm)"
                    className="erp-input text-xs py-1"
                  />
                  <input
                    type="text"
                    value={detail.spesifikasi}
                    onChange={(e) => updateDetailLocal(workItem.id, detail.id, { spesifikasi: e.target.value })}
                    onBlur={() => handleDetailBlur(detail)}
                    placeholder="Spesifikasi"
                    className="erp-input text-xs py-1"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="number"
                    value={detail.volume}
                    onChange={(e) => updateDetailLocal(workItem.id, detail.id, { volume: parseFloat(e.target.value) || 0 })}
                    onBlur={() => handleDetailBlur(detail)}
                    placeholder="Vol for Con +/-"
                    className="erp-input w-28 text-xs text-right font-tabular py-1"
                  />
                  <input
                    type="text"
                    value={detail.unit}
                    onChange={(e) => updateDetailLocal(workItem.id, detail.id, { unit: e.target.value })}
                    onBlur={() => handleDetailBlur(detail)}
                    placeholder="Sat"
                    className="erp-input w-16 text-xs py-1"
                  />
                  <div className="w-32">
                    <CurrencyInput
                      value={detail.unitPrice}
                      prefix=""
                      onChange={(v) => updateDetailLocal(workItem.id, detail.id, { unitPrice: v })}
                      onBlur={() => handleDetailBlur(detail)}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total: <span className="font-600 text-foreground font-tabular">
                      {totalHarga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                    </span>
                  </span>

                  <input
                    ref={(el) => { fileInputRefs.current[inputKey] = el; }}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handleUploadImage(workItem, detail, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[inputKey]?.click()}
                    className="flex items-center gap-1 px-1.5 py-1 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                  >
                    <Upload size={11} /> Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkDetail(workItem, detail)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {detail.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {detail.attachments.map((a) => (
                      <span key={a.id} className="flex items-center gap-1 text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        {a.fileName}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(workItem, detail, a.id)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddWorkItem}
        className="flex items-center gap-1 px-2 py-1 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
      >
        <Plus size={12} /> Item Pekerjaan
      </button>
    </div>
  );
}
