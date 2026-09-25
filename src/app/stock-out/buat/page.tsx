'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import {
  createDeliveryOrder,
  getShippableItemsForSO,
  linkSoItemToItemMaster,
  ShippableSoItem,
  UnmatchedSoItem,
} from '@/services/inventory.service';
import { salesOrderService } from '@/services/salesorder.service';
import ItemAutocomplete from '@/app/buat-penawaran-baru/components/ItemAutocomplete';
import type { SalesOrder, ItemMaster } from '@/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemMasterId: z.string().min(1, 'Item wajib dipilih'),
  qty: z.number({ error: 'Qty wajib diisi' }).positive('Qty harus > 0'),
  uom: z.string().min(1, 'UoM wajib diisi'),
  notes: z.string().optional(),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  salesOrderId: z.string().min(1, 'Sales Order wajib dipilih'),
  customerId: z.string().optional(),
  deliveryDate: z.string().min(1, 'Tanggal delivery wajib diisi'),
  deliveryAddress: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Minimal 1 item'),
});

type FormValues = z.infer<typeof schema>;

// ── Item row state ────────────────────────────────────────────────────────────

interface ItemRowMeta {
  selectedItem: ShippableSoItem | null;
  showDropdown: boolean;
}

const emptyMeta = (): ItemRowMeta => ({ selectedItem: null, showDropdown: false });

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuatDOPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // SO search
  const [soSearch, setSoSearch] = useState('');
  const [soOptions, setSoOptions] = useState<SalesOrder[]>([]);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [showSODropdown, setShowSODropdown] = useState(false);

  // Item shippable dari SO terpilih — sumber kebenaran dibatasi ke item + sisa qty SO ini,
  // sinkron dengan validasi CreateDeliveryOrderAsync di backend.
  const [shippableItems, setShippableItems] = useState<ShippableSoItem[]>([]);
  const [loadingShippable, setLoadingShippable] = useState(false);

  // Baris SO yang belum ada Item Master eksplisit — dulu ditebak dari nama (bisa salah sasaran,
  // lihat insiden "Server Blade 2U"), sekarang harus di-link manual oleh user di sini.
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedSoItem[]>([]);
  const [linkSearch, setLinkSearch] = useState<Record<string, string>>({});
  const [linkingSoItemId, setLinkingSoItemId] = useState<string | null>(null);

  // Per-row item meta
  const [rowMetas, setRowMetas] = useState<ItemRowMeta[]>([emptyMeta()]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ itemMasterId: '', qty: 1, uom: '', notes: '', sortOrder: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  // Load SO options
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await salesOrderService.list({ perPage: 100, status: 'Open' });
        setSoOptions(res.data);
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [soSearch]);

  const loadShippable = async (soId: string) => {
    setLoadingShippable(true);
    try {
      const result = await getShippableItemsForSO(soId);
      setShippableItems(result.matched);
      setUnmatchedItems(result.unmatched);
    } catch {
      toast.error('Gagal memuat item yang bisa di-DO-kan dari SO ini');
      setShippableItems([]);
      setUnmatchedItems([]);
    } finally {
      setLoadingShippable(false);
    }
  };

  const selectSO = async (so: SalesOrder) => {
    setSelectedSO(so);
    setValue('salesOrderId', so.id);
    setValue('customerId', so.customerId);
    setShowSODropdown(false);
    setSoSearch('');

    await loadShippable(so.id);

    // Reset baris item — pilihan sebelumnya (dari SO lain, kalau ada) tidak relevan lagi.
    reset((prev) => ({
      ...prev,
      salesOrderId: so.id,
      customerId: so.customerId,
      items: [{ itemMasterId: '', qty: 1, uom: '', notes: '', sortOrder: 0 }],
    }));
    setRowMetas([emptyMeta()]);
  };

  const handleLinkItem = async (soItemId: string, item: ItemMaster) => {
    setLinkingSoItemId(soItemId);
    try {
      await linkSoItemToItemMaster(soItemId, item.id);
      toast.success(`Berhasil ditautkan ke ${item.name}`);
      if (selectedSO) await loadShippable(selectedSO.id);
      setLinkSearch((prev) => {
        const next = { ...prev };
        delete next[soItemId];
        return next;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menautkan item');
    } finally {
      setLinkingSoItemId(null);
    }
  };

  const selectItem = (rowIndex: number, item: ShippableSoItem) => {
    setValue(`items.${rowIndex}.itemMasterId`, item.itemMasterId);
    setValue(`items.${rowIndex}.uom`, item.uom);
    setValue(`items.${rowIndex}.qty`, Math.min(1, item.remainingQty) || item.remainingQty);
    setRowMetas((prev) => {
      const next = [...prev];
      if (next[rowIndex]) {
        next[rowIndex] = { ...next[rowIndex], selectedItem: item, showDropdown: false };
      }
      return next;
    });
  };

  const clearItem = (rowIndex: number) => {
    setValue(`items.${rowIndex}.itemMasterId`, '');
    setValue(`items.${rowIndex}.uom`, '');
    setRowMetas((prev) => {
      const next = [...prev];
      if (next[rowIndex]) {
        next[rowIndex] = { ...next[rowIndex], selectedItem: null, showDropdown: false };
      }
      return next;
    });
  };

  const addRow = () => {
    append({ itemMasterId: '', qty: 1, uom: '', notes: '', sortOrder: fields.length });
    setRowMetas((prev) => [...prev, emptyMeta()]);
  };

  const removeRow = (index: number) => {
    remove(index);
    setRowMetas((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormValues) => {
    // Jaga-jaga di sisi client selain validasi qty per baris (backend tetap sumber kebenaran) —
    // qty tidak boleh melebihi sisa SO untuk item yang sama, dijumlahkan lintas baris.
    const qtyByItem = new Map<string, number>();
    for (const item of data.items) {
      qtyByItem.set(item.itemMasterId, (qtyByItem.get(item.itemMasterId) ?? 0) + item.qty);
    }
    for (const [itemMasterId, totalQty] of qtyByItem) {
      const shippable = shippableItems.find((s) => s.itemMasterId === itemMasterId);
      if (shippable && totalQty > shippable.remainingQty) {
        toast.error(`Qty ${shippable.itemName} melebihi sisa Sales Order (${shippable.remainingQty} ${shippable.uom})`);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await createDeliveryOrder({
        salesOrderId: data.salesOrderId,
        customerId: data.customerId || undefined,
        deliveryDate: data.deliveryDate,
        deliveryAddress: data.deliveryAddress || undefined,
        recipientName: data.recipientName || undefined,
        notes: data.notes || undefined,
        items: data.items.map((item, i) => ({
          itemMasterId: item.itemMasterId,
          qty: item.qty,
          uom: item.uom,
          notes: item.notes || undefined,
          sortOrder: i,
        })),
      });
      toast.success(`DO ${result.no} berhasil dibuat`);
      router.push(`/stock-out/${result.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat Delivery Order');
    } finally {
      setSaving(false);
    }
  };

  const lowStockCount = watchedItems.filter((item, i) => {
    const meta = rowMetas[i];
    if (!meta?.selectedItem) return false;
    return meta.selectedItem.stockAvailable < item.qty;
  }).length;

  return (
    <AppLayout
      title="Buat Delivery Order"
      breadcrumbs={[
        { label: 'Inventory' },
        { label: 'Stock Out / DO', href: '/stock-out' },
        { label: 'Buat DO' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Info Pengiriman ── */}
        <div className="erp-card shadow-card">
          <h3 className="text-sm font-700 text-foreground mb-4">Informasi Pengiriman</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Ref SO */}
            <div className="relative md:col-span-2">
              <label className="erp-form-label">Sales Order <span className="text-red-500">*</span></label>
              {selectedSO ? (
                <div className="erp-input flex items-center justify-between">
                  <div>
                    <span className="font-600 text-primary">{selectedSO.no}</span>
                    <span className="text-muted-foreground ml-2">{selectedSO.customerName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{selectedSO.projectName}</span>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="Cari Sales Order..."
                    value={soSearch}
                    onChange={(e) => { setSoSearch(e.target.value); setShowSODropdown(true); }}
                    onFocus={() => setShowSODropdown(true)}
                    onBlur={() => setTimeout(() => setShowSODropdown(false), 200)}
                  />
                  {showSODropdown && soOptions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {soOptions
                        .filter((so) =>
                          !soSearch ||
                          so.no.toLowerCase().includes(soSearch.toLowerCase()) ||
                          so.customerName.toLowerCase().includes(soSearch.toLowerCase())
                        )
                        .map((so) => (
                          <button
                            key={so.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted text-[13px] border-b border-border last:border-0"
                            onClick={() => selectSO(so)}
                          >
                            <span className="font-600 text-primary">{so.no}</span>
                            <span className="ml-2">{so.customerName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{so.projectName}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
              {errors.salesOrderId && <p className="text-xs text-red-500 mt-1">{errors.salesOrderId.message}</p>}
            </div>

            {/* Customer */}
            <div>
              <label className="erp-form-label">Customer</label>
              <input type="text" className="erp-input bg-muted/30" value={selectedSO?.customerName ?? ''} readOnly placeholder="Auto-fill dari SO" />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="erp-form-label">Tanggal Delivery <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="deliveryDate"
                render={({ field: f }) => (
                  <input type="date" className="erp-input" value={f.value ?? ''} onChange={f.onChange} />
                )}
              />
              {errors.deliveryDate && <p className="text-xs text-red-500 mt-1">{errors.deliveryDate.message}</p>}
            </div>

            {/* Delivery Address */}
            <div className="md:col-span-2">
              <label className="erp-form-label">Alamat Pengiriman <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <Controller
                control={control}
                name="deliveryAddress"
                render={({ field: f }) => (
                  <textarea className="erp-input resize-none" rows={2} placeholder="Alamat tujuan pengiriman..." value={f.value ?? ''} onChange={f.onChange} />
                )}
              />
            </div>

            {/* Recipient */}
            <div>
              <label className="erp-form-label">Penerima <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <Controller
                control={control}
                name="recipientName"
                render={({ field: f }) => (
                  <input type="text" className="erp-input" placeholder="Nama penerima di lokasi..." value={f.value ?? ''} onChange={f.onChange} />
                )}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <Controller
                control={control}
                name="notes"
                render={({ field: f }) => (
                  <textarea className="erp-input resize-none" rows={2} placeholder="Catatan pengiriman..." value={f.value ?? ''} onChange={f.onChange} />
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Items ── */}
        <div className="erp-card shadow-card">
          <h3 className="text-sm font-700 text-foreground mb-4">Daftar Item</h3>

          {!selectedSO ? (
            <p className="text-sm text-muted-foreground">Pilih Sales Order terlebih dahulu untuk memilih item.</p>
          ) : loadingShippable ? (
            <p className="text-sm text-muted-foreground">Memuat item dari SO...</p>
          ) : shippableItems.length === 0 ? (
            <p className="text-sm text-amber-700">
              Tidak ada item SO ini yang cocok dengan Item Master. Pastikan item terdaftar di Item Master dengan SKU/nama yang sesuai.
            </p>
          ) : (
            <>
              {errors.items && typeof errors.items.message === 'string' && (
                <p className="text-xs text-red-500 mb-3">{errors.items.message}</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/40">
                      {['#', 'Item', 'Qty', 'UoM', 'Sisa SO', 'Catatan', ''].map((h) => (
                        <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, i) => {
                      const meta = rowMetas[i] ?? emptyMeta();
                      const watchedQty = watchedItems[i]?.qty ?? 0;
                      const stockInsufficient = !!meta.selectedItem && meta.selectedItem.stockAvailable < watchedQty;
                      const overRemaining = !!meta.selectedItem && watchedQty > meta.selectedItem.remainingQty;
                      const availableOptions = shippableItems.filter(
                        (opt) => !watchedItems.some((wi, wIdx) => wIdx !== i && wi.itemMasterId === opt.itemMasterId)
                      );

                      return (
                        <tr key={field.id} className={`border-b border-border ${stockInsufficient || overRemaining ? 'bg-red-50/40' : ''}`}>
                          <td className="erp-table-cell text-muted-foreground w-8">{i + 1}</td>

                          {/* Item dropdown — dibatasi ke item SO ini */}
                          <td className="erp-table-cell min-w-[220px]">
                            <div className="relative">
                              {meta.selectedItem ? (
                                <div className="erp-input flex items-center justify-between text-[12px]">
                                  <div>
                                    <span className="font-600">{meta.selectedItem.sku}</span>
                                    <span className="ml-1.5 text-muted-foreground">{meta.selectedItem.itemName}</span>
                                  </div>
                                  <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => clearItem(i)}>×</button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="erp-input text-[12px] text-left text-muted-foreground"
                                    onClick={() => setRowMetas((prev) => {
                                      const next = [...prev];
                                      if (next[i]) next[i] = { ...next[i], showDropdown: true };
                                      return next;
                                    })}
                                  >
                                    Pilih item dari SO...
                                  </button>
                                  {meta.showDropdown && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                      {availableOptions.map((item) => (
                                        <button
                                          key={item.itemMasterId}
                                          type="button"
                                          className="w-full text-left px-2.5 py-2 hover:bg-muted text-[12px] border-b border-border last:border-0 disabled:opacity-40"
                                          disabled={item.remainingQty <= 0}
                                          onMouseDown={() => selectItem(i, item)}
                                        >
                                          <span className="font-600 text-primary">{item.sku}</span>
                                          <span className="ml-1.5">{item.itemName}</span>
                                          <span className="text-[11px] ml-1.5 text-muted-foreground">
                                            Sisa: {item.remainingQty} {item.uom}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                              <Controller
                                control={control}
                                name={`items.${i}.itemMasterId`}
                                render={({ field: f }) => <input type="hidden" {...f} />}
                              />
                            </div>
                            {errors.items?.[i]?.itemMasterId && (
                              <p className="text-[11px] text-red-500 mt-0.5">{errors.items[i]?.itemMasterId?.message}</p>
                            )}
                          </td>

                          {/* Qty */}
                          <td className="erp-table-cell w-24">
                            <Controller
                              control={control}
                              name={`items.${i}.qty`}
                              render={({ field: f }) => (
                                <input
                                  type="number"
                                  min={0.001}
                                  max={meta.selectedItem?.remainingQty}
                                  step="any"
                                  className={`erp-input w-20 font-tabular text-[12px] ${stockInsufficient || overRemaining ? 'border-red-300' : ''}`}
                                  value={f.value}
                                  onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                            {overRemaining && (
                              <p className="text-[11px] text-red-500 mt-0.5">Melebihi sisa SO</p>
                            )}
                            {errors.items?.[i]?.qty && (
                              <p className="text-[11px] text-red-500 mt-0.5">{errors.items[i]?.qty?.message}</p>
                            )}
                          </td>

                          {/* UoM */}
                          <td className="erp-table-cell w-20">
                            <span className="text-[12px] text-muted-foreground">{meta.selectedItem?.uom ?? '—'}</span>
                          </td>

                          {/* Sisa SO */}
                          <td className="erp-table-cell w-28">
                            {meta.selectedItem ? (
                              <span className={`font-tabular font-600 text-[12px] ${overRemaining ? 'text-red-600' : 'text-green-600'}`}>
                                {meta.selectedItem.remainingQty.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="erp-table-cell">
                            <Controller
                              control={control}
                              name={`items.${i}.notes`}
                              render={({ field: f }) => (
                                <input
                                  type="text"
                                  className="erp-input text-[12px]"
                                  placeholder="Catatan item..."
                                  value={f.value ?? ''}
                                  onChange={f.onChange}
                                />
                              )}
                            />
                          </td>

                          {/* Delete */}
                          <td className="erp-table-cell w-8">
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                              disabled={fields.length === 1}
                              onClick={() => removeRow(i)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="mt-3 btn-secondary text-[13px] flex items-center gap-1.5 disabled:opacity-40"
                onClick={addRow}
                disabled={fields.length >= shippableItems.length}
              >
                <Plus size={13} /> Tambah Item
              </button>
            </>
          )}
        </div>

        {/* ── Section 2b: Item belum terhubung ke Item Master ── */}
        {selectedSO && unmatchedItems.length > 0 && (
          <div className="erp-card shadow-card border border-amber-300/60 bg-amber-50/30">
            <h3 className="text-sm font-700 text-foreground mb-1 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" />
              Item Belum Terhubung ke Item Master
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Baris SO ini belum punya Item Master yang jelas (SKU tidak cocok), jadi tidak bisa dihitung stoknya
              secara otomatis. Pilih Item Master yang benar untuk masing-masing baris supaya bisa di-DO-kan.
            </p>
            <div className="space-y-2">
              {unmatchedItems.map((u) => (
                <div key={u.soItemId} className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-600">{u.description}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      Sku: {u.sku || '—'} · Qty: {u.qty} {u.uom}
                    </span>
                  </div>
                  <div className="w-72">
                    <ItemAutocomplete
                      value={linkSearch[u.soItemId] ?? ''}
                      onChange={(v) => setLinkSearch((prev) => ({ ...prev, [u.soItemId]: v }))}
                      onSelect={(item) => handleLinkItem(u.soItemId, item)}
                    />
                  </div>
                  {linkingSoItemId === u.soItemId && (
                    <span className="text-xs text-muted-foreground">Menautkan...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 3: Summary ── */}
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Total item: <strong className="text-foreground">{fields.length} item</strong>
              </p>
              {lowStockCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-700 text-sm">
                  <AlertTriangle size={14} />
                  <span><strong>{lowStockCount} item</strong> stok tidak mencukupi</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={() => router.push('/stock-out')}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving || !selectedSO}>
                {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
