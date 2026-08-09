'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatRp } from '@/lib/format';
import { Plus, Trash2 } from 'lucide-react';
import { itemMasterService } from '@/services/itemmaster.service';
import { createPR } from '@/services/purchase.service';
import type { ItemMaster } from '@/types';

// ── Schema ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemName: z.string().min(1, 'Nama item wajib diisi'),
  qty: z.coerce.number({ error: 'Qty harus angka' }).positive('Qty harus > 0'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  estPrice: z.coerce.number({ error: 'Harga harus angka' }).min(0, 'Harga tidak boleh negatif'),
  notes: z.string().optional(),
});

const schema = z.object({
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Minimal 1 item'),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toLocaleDateString('id-ID', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

const defaultItem = {
  itemName: '',
  qty: 1 as unknown as number,
  unit: '',
  estPrice: 0 as unknown as number,
  notes: '',
};

// ── Row Total ──────────────────────────────────────────────────────────────

function RowTotal({ control, index }: { control: ReturnType<typeof useForm<FormValues>>['control']; index: number }) {
  const qty = useWatch({ control, name: `items.${index}.qty` });
  const estPrice = useWatch({ control, name: `items.${index}.estPrice` });
  const total = (Number(qty) || 0) * (Number(estPrice) || 0);
  return <span className="text-sm font-tabular font-600">{formatRp(total)}</span>;
}

// ── Grand Total ────────────────────────────────────────────────────────────

function GrandTotal({ control }: { control: ReturnType<typeof useForm<FormValues>>['control'] }) {
  const items = useWatch({ control, name: 'items' });
  const total = (items ?? []).reduce((sum, item) => {
    return sum + (Number(item?.qty) || 0) * (Number(item?.estPrice) || 0);
  }, 0);
  return (
    <div className="erp-card">
      <div className="max-w-xs ml-auto">
        <div className="flex justify-between items-center pt-2 border-t-2 border-border">
          <span className="font-700 text-base">Total Estimasi</span>
          <span className="font-800 font-tabular text-base text-primary">{formatRp(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BuatPurchaseRequestPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<ItemMaster[][]>([[]]);
  const [showDropdowns, setShowDropdowns] = useState<boolean[]>([false]);
  const debounceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      notes: '',
      items: [{ ...defaultItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Sync autocomplete arrays when field count changes
  useEffect(() => {
    setSuggestions((prev) => {
      const next = [...prev];
      while (next.length < fields.length) next.push([]);
      return next.slice(0, fields.length);
    });
    setShowDropdowns((prev) => {
      const next = [...prev];
      while (next.length < fields.length) next.push(false);
      return next.slice(0, fields.length);
    });
  }, [fields.length]);

  // ── Autocomplete ──────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback((query: string, index: number) => {
    if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]);
    debounceTimers.current[index] = setTimeout(async () => {
      try {
        const res = await itemMasterService.list({ search: query, perPage: 10 });
        setSuggestions((prev) => {
          const next = [...prev];
          next[index] = res.data;
          return next;
        });
      } catch {
        // ignore
      }
    }, 300);
  }, []);

  const handleItemNameChange = useCallback((index: number, value: string) => {
    if (value.length >= 2) {
      fetchSuggestions(value, index);
      setShowDropdowns((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    } else {
      setShowDropdowns((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  }, [fetchSuggestions]);

  const handleSelectItem = (index: number, item: ItemMaster) => {
    setValue(`items.${index}.itemName`, item.name);
    setValue(`items.${index}.unit`, item.uom ?? '');
    setValue(`items.${index}.estPrice`, item.purchasePrice ?? 0);
    setShowDropdowns((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  const closeDropdown = (index: number) => {
    setShowDropdowns((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  const addItem = () => {
    append({ ...defaultItem });
  };

  const removeItem = (index: number) => {
    remove(index);
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
    setShowDropdowns((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const result = await createPR({
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          itemName: item.itemName,
          qty: item.qty,
          unit: item.unit,
          estPrice: item.estPrice,
          notes: item.notes || undefined,
        })),
      });
      toast.success(`Purchase Request ${result.no} berhasil dibuat`);
      router.push(`/purchase-request/${result.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat Purchase Request';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout
      title="Buat Purchase Request"
      breadcrumbs={[
        { label: 'Purchasing' },
        { label: 'Purchase Request', href: '/purchase-request' },
        { label: 'Buat Baru' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">

          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat Purchase Request Manual</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              PR tanpa referensi SO — untuk kebutuhan internal / pembelian langsung
            </p>
          </div>

          {/* Section 1: Informasi */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">
              Informasi
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="erp-form-label">Tanggal</label>
                <input
                  type="text"
                  value={today}
                  readOnly
                  className="erp-input bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="erp-form-label">
                  Catatan
                  <span className="text-xs text-muted-foreground ml-1">(opsional)</span>
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Catatan internal..."
                  className="erp-input resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">
              Daftar Item
            </h2>
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-red-500 text-xs mb-3">{errors.items.message}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['#', 'Nama Item *', 'Qty *', 'Unit *', 'Est. Harga *', 'Est. Total', 'Catatan', ''].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b border-border">

                      {/* # */}
                      <td className="erp-table-cell text-muted-foreground w-8">{index + 1}</td>

                      {/* Nama Item */}
                      <td className="erp-table-cell min-w-[180px] relative">
                        <div className="relative">
                          <input
                            type="text"
                            {...register(`items.${index}.itemName`, {
                              onChange: (e) => handleItemNameChange(index, e.target.value),
                            })}
                            placeholder="Nama item..."
                            className={`erp-input text-xs ${errors.items?.[index]?.itemName ? 'border-red-400' : ''}`}
                            onBlur={() => setTimeout(() => closeDropdown(index), 150)}
                            autoComplete="off"
                          />
                          {showDropdowns[index] && (suggestions[index]?.length ?? 0) > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto top-full">
                              {suggestions[index].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectItem(index, item)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors"
                                >
                                  <span className="block font-500">{item.name}</span>
                                  <span className="block text-muted-foreground">
                                    {item.code} · {item.uom} ·{' '}
                                    {item.purchasePrice != null
                                      ? formatRp(item.purchasePrice)
                                      : <span className="text-amber-500">Harga beli belum diisi</span>}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.items?.[index]?.itemName && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.itemName?.message}</p>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="erp-table-cell w-20">
                        <input
                          type="number"
                          {...register(`items.${index}.qty`, { valueAsNumber: true })}
                          min={0.0001}
                          step="any"
                          className={`erp-input text-xs w-20 font-tabular ${errors.items?.[index]?.qty ? 'border-red-400' : ''}`}
                        />
                        {errors.items?.[index]?.qty && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.qty?.message}</p>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="erp-table-cell w-24">
                        <input
                          type="text"
                          {...register(`items.${index}.unit`)}
                          placeholder="pcs"
                          className={`erp-input text-xs w-24 ${errors.items?.[index]?.unit ? 'border-red-400' : ''}`}
                        />
                        {errors.items?.[index]?.unit && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.unit?.message}</p>
                        )}
                      </td>

                      {/* Est. Harga */}
                      <td className="erp-table-cell min-w-[140px]">
                        <Controller
                          control={control}
                          name={`items.${index}.estPrice`}
                          render={({ field: f }) => (
                            <CurrencyInput
                              value={f.value}
                              onChange={f.onChange}
                              className={`text-xs ${errors.items?.[index]?.estPrice ? 'border-red-400' : ''}`}
                            />
                          )}
                        />
                        {errors.items?.[index]?.estPrice && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.estPrice?.message}</p>
                        )}
                      </td>

                      {/* Est. Total */}
                      <td className="erp-table-cell text-right min-w-[110px]">
                        <RowTotal control={control} index={index} />
                      </td>

                      {/* Catatan */}
                      <td className="erp-table-cell min-w-[120px]">
                        <input
                          type="text"
                          {...register(`items.${index}.notes`)}
                          placeholder="Catatan..."
                          className="erp-input text-xs"
                        />
                      </td>

                      {/* Hapus */}
                      <td className="erp-table-cell w-10">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={fields.length === 1}
                          className={`p-1.5 rounded transition-colors ${
                            fields.length === 1
                              ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                              : 'hover:bg-red-50 text-red-400 hover:text-red-600'
                          }`}
                          title={fields.length === 1 ? 'Minimal 1 item' : 'Hapus baris'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-600 transition-colors"
              >
                <Plus size={14} /> Tambah Item
              </button>
            </div>
          </div>

          {/* Section 3: Grand Total */}
          <GrandTotal control={control} />

          {/* Footer */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-6">
            <Link href="/purchase-request" className="btn-secondary">
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 min-w-[160px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : 'Simpan PR'}
            </button>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
