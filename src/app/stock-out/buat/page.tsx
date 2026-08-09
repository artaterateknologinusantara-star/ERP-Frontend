'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { createDeliveryOrder } from '@/services/inventory.service';
import { itemMasterService } from '@/services/itemmaster.service';
import { salesOrderService } from '@/services/salesorder.service';
import type { ItemMaster, SalesOrder } from '@/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemMasterId: z.string().min(1, 'Item wajib dipilih'),
  qty: z.number({ error: 'Qty wajib diisi' }).positive('Qty harus > 0'),
  uom: z.string().min(1, 'UoM wajib diisi'),
  notes: z.string().optional(),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  salesOrderId: z.string().optional(),
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
  selectedItem: ItemMaster | null;
  search: string;
  options: ItemMaster[];
  showDropdown: boolean;
}

const emptyMeta = (): ItemRowMeta => ({ selectedItem: null, search: '', options: [], showDropdown: false });

// ── Component ─────────────────────────────────────────────────────────────────

export default function BuatDOPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // SO search
  const [soSearch, setSoSearch] = useState('');
  const [soOptions, setSoOptions] = useState<SalesOrder[]>([]);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [showSODropdown, setShowSODropdown] = useState(false);

  // Per-row item meta
  const [rowMetas, setRowMetas] = useState<ItemRowMeta[]>([emptyMeta()]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
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

  // Load item options per row
  const loadItemOptions = useCallback(async (index: number, query: string) => {
    try {
      const res = await itemMasterService.list({ search: query || undefined, perPage: 20, isActive: true });
      setRowMetas((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], options: res.data };
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    rowMetas.forEach((meta, i) => {
      const t = setTimeout(() => loadItemOptions(i, meta.search), 300);
      return () => clearTimeout(t);
    });
  }, [rowMetas.map((m) => m.search).join(','), loadItemOptions]);

  const selectSO = (so: SalesOrder) => {
    setSelectedSO(so);
    setValue('salesOrderId', so.id);
    setValue('customerId', so.customerId);
    setShowSODropdown(false);
    setSoSearch('');
  };

  const clearSO = () => {
    setSelectedSO(null);
    setValue('salesOrderId', undefined);
    setValue('customerId', undefined);
    setValue('deliveryAddress', undefined);
  };

  const selectItem = (rowIndex: number, item: ItemMaster) => {
    setValue(`items.${rowIndex}.itemMasterId`, item.id);
    setValue(`items.${rowIndex}.uom`, item.uom);
    setRowMetas((prev) => {
      const next = [...prev];
      if (next[rowIndex]) {
        next[rowIndex] = { ...next[rowIndex], selectedItem: item, showDropdown: false, search: '' };
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
        next[rowIndex] = { ...next[rowIndex], selectedItem: null, search: '', showDropdown: false };
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

  const updateRowMeta = (index: number, patch: Partial<ItemRowMeta>) => {
    setRowMetas((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const result = await createDeliveryOrder({
        salesOrderId: data.salesOrderId || undefined,
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
    return meta.selectedItem.stock < item.qty;
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
              <label className="erp-form-label">Ref Sales Order <span className="text-xs text-muted-foreground">(opsional)</span></label>
              {selectedSO ? (
                <div className="erp-input flex items-center justify-between">
                  <div>
                    <span className="font-600 text-primary">{selectedSO.no}</span>
                    <span className="text-muted-foreground ml-2">{selectedSO.customerName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{selectedSO.projectName}</span>
                  </div>
                  <button type="button" className="text-muted-foreground hover:text-foreground ml-2 text-lg leading-none" onClick={clearSO}>×</button>
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
            </div>

            {/* Customer */}
            <div>
              <label className="erp-form-label">Customer <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <input type="text" className="erp-input bg-muted/30" value={selectedSO?.customerName ?? ''} readOnly placeholder="Auto-fill dari SO atau isi manual" />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="erp-form-label">Tanggal Delivery <span className="text-red-500">*</span></label>
              <input type="date" className="erp-input" {...register('deliveryDate')} />
              {errors.deliveryDate && <p className="text-xs text-red-500 mt-1">{errors.deliveryDate.message}</p>}
            </div>

            {/* Delivery Address */}
            <div className="md:col-span-2">
              <label className="erp-form-label">Alamat Pengiriman <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <textarea className="erp-input resize-none" rows={2} placeholder="Alamat tujuan pengiriman..." {...register('deliveryAddress')} />
            </div>

            {/* Recipient */}
            <div>
              <label className="erp-form-label">Penerima <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <input type="text" className="erp-input" placeholder="Nama penerima di lokasi..." {...register('recipientName')} />
            </div>

            {/* Notes */}
            <div>
              <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
              <textarea className="erp-input resize-none" rows={2} placeholder="Catatan pengiriman..." {...register('notes')} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Items ── */}
        <div className="erp-card shadow-card">
          <h3 className="text-sm font-700 text-foreground mb-4">Daftar Item</h3>
          {errors.items && typeof errors.items.message === 'string' && (
            <p className="text-xs text-red-500 mb-3">{errors.items.message}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['#', 'Item', 'Qty', 'UoM', 'Stok Tersedia', 'Catatan', ''].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, i) => {
                  const meta = rowMetas[i] ?? emptyMeta();
                  const watchedQty = watchedItems[i]?.qty ?? 0;
                  const stockInsufficient = meta.selectedItem && meta.selectedItem.stock < watchedQty;

                  return (
                    <tr key={field.id} className={`border-b border-border ${stockInsufficient ? 'bg-red-50/40' : ''}`}>
                      <td className="erp-table-cell text-muted-foreground w-8">{i + 1}</td>

                      {/* Item dropdown */}
                      <td className="erp-table-cell min-w-[220px]">
                        <div className="relative">
                          {meta.selectedItem ? (
                            <div className="erp-input flex items-center justify-between text-[12px]">
                              <div>
                                <span className="font-600">{meta.selectedItem.code}</span>
                                <span className="ml-1.5 text-muted-foreground">{meta.selectedItem.name}</span>
                              </div>
                              <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => clearItem(i)}>×</button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="text"
                                className="erp-input text-[12px]"
                                placeholder="Cari item..."
                                value={meta.search}
                                onChange={(e) => updateRowMeta(i, { search: e.target.value, showDropdown: true })}
                                onFocus={() => updateRowMeta(i, { showDropdown: true })}
                              />
                              {meta.showDropdown && meta.options.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                  {meta.options.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="w-full text-left px-2.5 py-2 hover:bg-muted text-[12px] border-b border-border last:border-0"
                                      onMouseDown={() => selectItem(i, item)}
                                    >
                                      <span className="font-600 text-primary">{item.code}</span>
                                      <span className="ml-1.5">{item.name}</span>
                                      <span className={`text-[11px] ml-1.5 ${item.stock === 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        Stok: {item.stock} {item.uom}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {/* Hidden input for react-hook-form */}
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
                              step="any"
                              className={`erp-input w-20 font-tabular text-[12px] ${stockInsufficient ? 'border-red-300' : ''}`}
                              value={f.value}
                              onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                            />
                          )}
                        />
                        {errors.items?.[i]?.qty && (
                          <p className="text-[11px] text-red-500 mt-0.5">{errors.items[i]?.qty?.message}</p>
                        )}
                      </td>

                      {/* UoM */}
                      <td className="erp-table-cell w-20">
                        <input
                          type="text"
                          className="erp-input w-16 text-[12px]"
                          {...register(`items.${i}.uom`)}
                        />
                      </td>

                      {/* Stock */}
                      <td className="erp-table-cell w-28">
                        {meta.selectedItem ? (
                          <span className={`font-tabular font-600 text-[12px] ${stockInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                            {meta.selectedItem.stock.toLocaleString('id-ID')}
                            {stockInsufficient && (
                              <span className="ml-1 text-[10px] text-red-500">⚠ Kurang</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="erp-table-cell">
                        <input
                          type="text"
                          className="erp-input text-[12px]"
                          placeholder="Catatan item..."
                          {...register(`items.${i}.notes`)}
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
            className="mt-3 btn-secondary text-[13px] flex items-center gap-1.5"
            onClick={addRow}
          >
            <Plus size={13} /> Tambah Item
          </button>
        </div>

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
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
