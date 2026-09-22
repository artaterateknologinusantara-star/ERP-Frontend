'use client';

import React, { useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ERPModal from '@/components/ui/ERPModal';
import { quotationService } from '@/services/quotation.service';
import { isGuid } from '@/lib/guid';
import type { CostingGroup, WorkItem, WorkDetail } from '@/types';

interface Props {
  group: CostingGroup;
  onUpdate: (fields: Partial<CostingGroup>) => void;
  // Controlled from the parent — the trigger button lives in the Subtotal row (CostingTable),
  // not here, so this component only owns the modal itself.
  isOpen: boolean;
  onClose: () => void;
}

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;

export default function GroupWorkItemsPanel({ group, onUpdate, isOpen, onClose }: Props) {
  const workItems = group.workItems ?? [];
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Mirrors the latest workItems across renders so a multi-file upload batch (several awaits
  // in a row) always appends onto the most recent attachments list instead of a stale one
  // captured at the start of the batch — a plain closure over `workItems` would lose earlier
  // uploads in the same batch once a second one resolves.
  const workItemsRef = useRef(workItems);
  workItemsRef.current = workItems;

  const setWorkItems = (next: WorkItem[]) => {
    workItemsRef.current = next;
    onUpdate({ workItems: next });
  };

  // WorkItem/WorkDetail rows are pure local state now — no network call until the whole
  // Quotation form is submitted (buildDto sends the full workItems tree, upsert-by-Id on the
  // backend). Only uploaded attachments (below) still need a real API round-trip, since a file
  // has to land on a real, already-saved WorkDetail.Id.

  const handleAddWorkItem = () => {
    const newWorkItem: WorkItem = {
      id: `wi-${group.id}-${Date.now()}`,
      name: 'Item Pekerjaan Baru',
      sortOrder: workItems.length,
      workDetails: [],
    };
    setWorkItems([...workItems, newWorkItem]);
  };

  const handleRenameWorkItem = (workItem: WorkItem, name: string) => {
    setWorkItems(workItems.map((w) => (w.id === workItem.id ? { ...w, name } : w)));
  };

  const handleDeleteWorkItem = (workItem: WorkItem) => {
    setWorkItems(workItems.filter((w) => w.id !== workItem.id));
  };

  const handleAddWorkDetail = (workItem: WorkItem) => {
    const newDetail: WorkDetail = {
      id: `wd-${workItem.id}-${Date.now()}`,
      name: '',
      spesifikasi: '',
      volume: 0,
      unit: '',
      unitPrice: 0,
      sortOrder: workItem.workDetails.length,
      attachments: [],
    };
    setWorkItems(workItems.map((w) => (w.id === workItem.id ? { ...w, workDetails: [...w.workDetails, newDetail] } : w)));
  };

  const updateDetailLocal = (workItemId: string, detailId: string, patch: Partial<WorkDetail>) => {
    setWorkItems(workItemsRef.current.map((w) => (
      w.id !== workItemId ? w : {
        ...w,
        workDetails: w.workDetails.map((d) => (d.id === detailId ? { ...d, ...patch } : d)),
      }
    )));
  };

  const handleDeleteWorkDetail = (workItem: WorkItem, detail: WorkDetail) => {
    setWorkItems(workItems.map((w) => (
      w.id !== workItem.id ? w : { ...w, workDetails: w.workDetails.filter((d) => d.id !== detail.id) }
    )));
  };

  const handleUploadImage = async (workItem: WorkItem, detail: WorkDetail, file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      toast.error(`${file.name}: harus berformat JPG atau PNG`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`${file.name}: ukuran maksimal 1MB`);
      return;
    }
    try {
      const attachment = await quotationService.uploadWorkDetailAttachment(detail.id, file);
      // Read the latest attachments via the ref (not the `detail` argument, which may be stale
      // by the time this resolves) so an earlier upload in the same multi-file batch isn't lost.
      const currentAttachments = workItemsRef.current
        .find((w) => w.id === workItem.id)?.workDetails.find((d) => d.id === detail.id)?.attachments ?? [];
      updateDetailLocal(workItem.id, detail.id, { attachments: [...currentAttachments, attachment] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${file.name}: gagal mengunggah gambar`);
    }
  };

  const handleUploadImages = async (workItem: WorkItem, detail: WorkDetail, files: File[]) => {
    // Sequential, not Promise.all — each upload must land (and update workItemsRef) before the
    // next one reads "current attachments", and a rejected file (bad type/oversize) must not
    // abort the rest of the batch.
    for (const file of files) {
      await handleUploadImage(workItem, detail, file);
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

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail RAB/BQ"
      subtitle={group.name}
      size="full"
    >
      <div className="space-y-2">
      {workItems.map((workItem, wi) => (
        <div key={workItem.id} className="erp-card !p-3 space-y-2">
          <div className="flex items-center gap-1.5 pb-2 border-b border-border">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-700 flex-shrink-0">
              {wi + 1}
            </span>
            <input
              type="text"
              value={workItem.name}
              onChange={(e) => handleRenameWorkItem(workItem, e.target.value)}
              placeholder="Nama Item Pekerjaan"
              className="erp-input flex-1 text-xs font-600 py-1"
            />
            <button
              type="button"
              onClick={() => handleAddWorkDetail(workItem)}
              className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
              title="Tambah Detail Kerja"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteWorkItem(workItem)}
              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
              title="Hapus Item Pekerjaan"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="space-y-1.5">
          {workItem.workDetails.map((detail, di) => {
            const totalHarga = detail.volume * detail.unitPrice;
            const inputKey = `${workItem.id}:${detail.id}`;
            const canUpload = isGuid(detail.id);
            return (
              <div key={detail.id} className="bg-muted/30 border border-border/60 rounded-md p-2 space-y-1.5">
                <span className="text-[10px] font-600 text-muted-foreground uppercase tracking-wide">
                  Detail {wi + 1}.{di + 1}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div>
                    <label className="erp-form-label">Nama Item/Deskripsi</label>
                    <input
                      type="text"
                      value={detail.name}
                      onChange={(e) => updateDetailLocal(workItem.id, detail.id, { name: e.target.value })}
                      placeholder="mis. Peninggian lantai t.20cm"
                      className="erp-input text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="erp-form-label">Spesifikasi</label>
                    <textarea
                      value={detail.spesifikasi}
                      onChange={(e) => updateDetailLocal(workItem.id, detail.id, { spesifikasi: e.target.value })}
                      placeholder={'mis. - Stop kontak...\n- NYM 3x2.5mm...\n- Broco...'}
                      rows={3}
                      className="erp-input text-xs py-1 resize-y"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-1.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                    <div>
                      <label className="erp-form-label">Volume</label>
                      <input
                        type="number"
                        value={detail.volume === 0 ? '' : detail.volume}
                        onChange={(e) => updateDetailLocal(workItem.id, detail.id, { volume: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="erp-input text-xs text-right font-tabular py-1"
                      />
                    </div>
                    <div>
                      <label className="erp-form-label">Satuan</label>
                      <input
                        type="text"
                        value={detail.unit}
                        onChange={(e) => updateDetailLocal(workItem.id, detail.id, { unit: e.target.value })}
                        placeholder="Sat"
                        className="erp-input text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="erp-form-label">Harga Satuan</label>
                      <CurrencyInput
                        value={detail.unitPrice}
                        prefix=""
                        onChange={(v) => updateDetailLocal(workItem.id, detail.id, { unitPrice: v })}
                        className="text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="erp-form-label">Total</label>
                      <div className="erp-input text-xs text-right font-tabular py-1 bg-muted/60 border-transparent font-600 text-foreground">
                        {totalHarga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="erp-form-label opacity-0 hidden sm:block">&nbsp;</span>
                    <div className="flex items-center gap-1">
                      <input
                        ref={(el) => { fileInputRefs.current[inputKey] = el; }}
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          // Snapshot to a plain array BEFORE clearing value — `e.target.files` is a
                          // live FileList tied to the input, so resetting `.value` empties it too if
                          // read afterwards, silently dropping every file in the batch.
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          e.target.value = '';
                          if (files.length > 0) handleUploadImages(workItem, detail, files);
                        }}
                      />
                      <button
                        type="button"
                        disabled={!canUpload}
                        onClick={() => fileInputRefs.current[inputKey]?.click()}
                        title={canUpload ? 'Upload Gambar' : 'Simpan penawaran dulu untuk upload gambar'}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Upload size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkDetail(workItem, detail)}
                        title="Hapus Detail Kerja"
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
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
    </ERPModal>
  );
}
