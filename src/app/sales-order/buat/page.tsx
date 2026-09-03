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
import { Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { customerService } from '@/services/customer.service';
import { itemMasterService } from '@/services/itemmaster.service';
import { createSalesOrder } from '@/services/salesorder.service';
import { api } from '@/lib/api';
import type { Customer, ItemMaster } from '@/types';

// ── Schema ──────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemMasterId: z.string().optional(),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  sku: z.string().optional(),
  qty: z.coerce.number({ error: 'Qty harus angka' }).positive('Qty harus > 0'),
  uom: z.string().min(1, 'Satuan wajib diisi'),
  unitPrice: z.coerce.number({ error: 'Harga harus angka' }).min(0),
  discount: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

const schema = z.object({
  customerId: z.string().uuid('Customer wajib dipilih'),
  projectName: z.string().min(1, 'Nama project wajib diisi'),
  salesId: z.string().uuid('Salesperson wajib dipilih'),
  expectedDate: z.string().optional(),
  shipTo: z.string().optional(),
  terms: z.string().optional(),
  refQuotation: z.string().optional(),
  notes: z.string().optional(),
  retentionPercentage: z.coerce.number().min(0, 'Minimal 0%').max(100, 'Maksimal 100%').default(0),
  items: z.array(itemSchema).min(1, 'Minimal 1 item'),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ─────────────────────────────────────────────────────────────────

const today = new Date().toLocaleDateString('id-ID', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

const defaultItem = {
  itemMasterId: undefined,
  description: '',
  sku: '',
  qty: 1 as unknown as number,
  uom: '',
  unitPrice: 0 as unknown as number,
  discount: 0 as unknown as number,
  notes: '',
};

function calcAmount(qty: number, unitPrice: number, discount: number): number {
  return Math.round(qty * unitPrice * (1 - discount / 100) * 100) / 100;
}

// ── Row Amount (watches single row) ─────────────────────────────────────────

function RowAmount({ control, index }: { control: ReturnType<typeof useForm<FormValues>>['control']; index: number }) {
  const qty = useWatch({ control, name: `items.${index}.qty` });
  const unitPrice = useWatch({ control, name: `items.${index}.unitPrice` });
  const discount = useWatch({ control, name: `items.${index}.discount` });
  const amount = calcAmount(Number(qty) || 0, Number(unitPrice) || 0, Number(discount) || 0);
  return <span className="text-sm font-tabular font-600">{formatRp(amount)}</span>;
}

// ── Summary (watches all items) ──────────────────────────────────────────────

function Summary({ control }: { control: ReturnType<typeof useForm<FormValues>>['control'] }) {
  const items = useWatch({ control, name: 'items' });
  const subTotal = (items ?? []).reduce((sum, item) => {
    return sum + calcAmount(Number(item?.qty) || 0, Number(item?.unitPrice) || 0, Number(item?.discount) || 0);
  }, 0);
  const taxAmount = Math.round(subTotal * 0.11 * 100) / 100;
  const grandTotal = Math.round((subTotal + taxAmount) * 100) / 100;

  return (
    <div className="erp-card">
      <div className="max-w-xs ml-auto space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sub Total</span>
          <span className="font-tabular">{formatRp(subTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">PPN (11%)</span>
          <span className="font-tabular">{formatRp(taxAmount)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-border pt-2">
          <span className="font-700 text-base">Grand Total</span>
          <span className="font-700 font-tabular text-base text-primary">{formatRp(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BuatSalesOrderPage() {
  const router = useRouter();

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOptions, setSalesOptions] = useState<{ value: string; label: string }[]>([]);

  // Customer combobox state
  const [customerSearch, setCustomerSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Autocomplete state per item row
  const [suggestions, setSuggestions] = useState<ItemMaster[][]>([[]]);
  const [showDropdowns, setShowDropdowns] = useState<boolean[]>([false]);
  const debounceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Submit error
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      customerId: '',
      projectName: '',
      salesId: '',
      expectedDate: '',
      shipTo: '',
      terms: '',
      refQuotation: '',
      notes: '',
      retentionPercentage: 0 as unknown as number,
      items: [defaultItem],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedCustomerId = watch('customerId');

  // ── Load reference data ─────────────────────────────────────────────────

  useEffect(() => {
    customerService.list({ perPage: 200, isActive: true })
      .then((res) => setCustomers(res.data))
      .catch(() => {});

    api.get<{ id: string; name: string }[]>('/auth/users')
      .then((res) => setSalesOptions((res.data ?? []).map((u) => ({ value: u.id, label: u.name }))))
      .catch(() => {});
  }, []);

  // Sync customerSearch label when external customerId changes
  useEffect(() => {
    if (watchedCustomerId && !comboOpen) {
      const label = customers.find((c) => c.id === watchedCustomerId)?.name ?? '';
      setCustomerSearch(label);
    }
  }, [watchedCustomerId, customers, comboOpen]);

  // Close combobox on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        if (!watchedCustomerId) {
          setCustomerSearch('');
        } else {
          const label = customers.find((c) => c.id === watchedCustomerId)?.name ?? '';
          setCustomerSearch(label);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [watchedCustomerId, customers]);

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

  // ── Handlers ───────────────────────────────────────────────────────────

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.city ?? '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    setValue('customerId', customer.id);
    const address = [customer.address, customer.city].filter(Boolean).join(', ');
    setValue('shipTo', address);
    setCustomerSearch(customer.name);
    setComboOpen(false);
  };

  const handleClearCustomer = () => {
    setValue('customerId', '');
    setValue('shipTo', '');
    setCustomerSearch('');
  };

  const fetchItemSuggestions = useCallback((query: string, index: number) => {
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

  const handleDescriptionChange = useCallback((index: number, value: string) => {
    if (value.length >= 2) {
      fetchItemSuggestions(value, index);
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
  }, [fetchItemSuggestions]);

  const handleSelectItem = (index: number, item: ItemMaster) => {
    setValue(`items.${index}.description`, item.name);
    setValue(`items.${index}.sku`, item.code ?? '');
    setValue(`items.${index}.uom`, item.uom ?? '');
    setValue(`items.${index}.unitPrice`, item.sellingPrice ?? 0);
    setValue(`items.${index}.itemMasterId`, item.id);
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

  // ── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const request = {
        customerId: data.customerId,
        projectName: data.projectName,
        salesId: data.salesId,
        expectedDate: data.expectedDate || undefined,
        shipTo: data.shipTo || undefined,
        terms: data.terms || undefined,
        refQuotation: data.refQuotation || undefined,
        notes: data.notes || undefined,
        retentionPercentage: data.retentionPercentage ?? 0,
        items: data.items.map((item, i) => ({
          itemMasterId: item.itemMasterId || undefined,
          description: item.description,
          sku: item.sku || undefined,
          qty: item.qty,
          uom: item.uom,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 0,
          notes: item.notes || undefined,
          sortOrder: i,
        })),
      };
      const result = await createSalesOrder(request);
      toast.success(`Sales Order ${result.no} berhasil dibuat`);
      router.push(`/sales-order/${result.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat Sales Order';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AppLayout
      title="Buat Sales Order"
      breadcrumbs={[
        { label: 'Sales' },
        { label: 'Sales Order', href: '/sales-order' },
        { label: 'Buat Baru' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">

          {/* ── Page Title ── */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat Sales Order Baru</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Isi semua field yang ditandai * untuk membuat SO baru</p>
          </div>

          {/* ── Section 1: Informasi Dasar ── */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Informasi Dasar</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">

              {/* Kiri */}
              <div className="space-y-4">

                {/* Customer */}
                <div>
                  <label className="erp-form-label">Customer <span className="text-red-500">*</span></label>
                  <div className="relative" ref={comboRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setComboOpen(true); }}
                        onFocus={() => setComboOpen(true)}
                        placeholder="Ketik nama customer..."
                        className={`erp-input pr-8 ${errors.customerId ? 'border-red-400' : ''}`}
                        autoComplete="off"
                      />
                      {watchedCustomerId ? (
                        <button type="button" onClick={handleClearCustomer}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      ) : (
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      )}
                    </div>
                    {comboOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground text-center">Customer tidak ditemukan</div>
                        ) : filteredCustomers.map((c) => (
                          <button key={c.id} type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectCustomer(c)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors ${watchedCustomerId === c.id ? 'bg-primary/10 text-primary font-600' : 'text-foreground'}`}
                          >
                            <span className="block font-500">{c.name}</span>
                            {c.city && <span className="block text-xs text-muted-foreground">{c.city}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
                  {/* hidden input for RHF */}
                  <Controller
                    control={control}
                    name="customerId"
                    render={({ field }) => <input type="hidden" {...field} />}
                  />
                </div>

                {/* Project Name */}
                <div>
                  <label className="erp-form-label">Nama Project <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    {...register('projectName')}
                    placeholder="Contoh: Network Core Upgrade 2026"
                    className={`erp-input ${errors.projectName ? 'border-red-400' : ''}`}
                  />
                  {errors.projectName && <p className="text-red-500 text-xs mt-1">{errors.projectName.message}</p>}
                </div>

                {/* Salesperson */}
                <div>
                  <label className="erp-form-label">Salesperson <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      {...register('salesId')}
                      className={`erp-input appearance-none pr-8 ${errors.salesId ? 'border-red-400' : ''}`}
                    >
                      <option value="">— Pilih Salesperson —</option>
                      {salesOptions.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.salesId && <p className="text-red-500 text-xs mt-1">{errors.salesId.message}</p>}
                </div>
              </div>

              {/* Kanan */}
              <div className="space-y-4">

                {/* Order Date (read-only) */}
                <div>
                  <label className="erp-form-label">Order Date</label>
                  <input
                    type="text"
                    value={today}
                    readOnly
                    className="erp-input bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>

                {/* Expected Date */}
                <div>
                  <label className="erp-form-label">Expected Date</label>
                  <input
                    type="date"
                    {...register('expectedDate')}
                    className="erp-input"
                  />
                </div>

                {/* Terms */}
                <div>
                  <label className="erp-form-label">Terms</label>
                  <input
                    type="text"
                    {...register('terms')}
                    placeholder="contoh: Net 30, Net 15, COD"
                    className="erp-input"
                  />
                </div>

                {/* Ref Quotation */}
                <div>
                  <label className="erp-form-label">Ref Quotation</label>
                  <input
                    type="text"
                    {...register('refQuotation')}
                    placeholder="contoh: Q.SYN-26.0149 R1"
                    className="erp-input"
                  />
                </div>

                {/* Retention Percentage */}
                <div>
                  <label className="erp-form-label">Retensi (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('retentionPercentage', { valueAsNumber: true })}
                      min={0}
                      max={100}
                      step="any"
                      placeholder="0"
                      className={`erp-input pr-8 font-tabular ${errors.retentionPercentage ? 'border-red-400' : ''}`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opsional. Persentase nilai invoice yang ditahan sampai retensi dilepas manual.
                  </p>
                  {errors.retentionPercentage && <p className="text-red-500 text-xs mt-1">{errors.retentionPercentage.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Ship To ── */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Alamat Pengiriman</h2>
            <div>
              <label className="erp-form-label">Ship To</label>
              <textarea
                {...register('shipTo')}
                rows={3}
                placeholder="Alamat pengiriman (auto-fill dari customer)"
                className="erp-input resize-none"
              />
            </div>
          </div>

          {/* ── Section 3: Items ── */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Daftar Item</h2>
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-red-500 text-xs mb-3">{errors.items.message}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['#', 'Deskripsi *', 'SKU', 'Qty *', 'UoM *', 'Harga Satuan *', 'Disc%', 'Amount', ''].map((h) => (
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

                      {/* Deskripsi */}
                      <td className="erp-table-cell min-w-[200px] relative">
                        <div className="relative">
                          <input
                            type="text"
                            {...register(`items.${index}.description`, {
                              onChange: (e) => handleDescriptionChange(index, e.target.value),
                            })}
                            placeholder="Nama/deskripsi item..."
                            className={`erp-input text-xs ${errors.items?.[index]?.description ? 'border-red-400' : ''}`}
                            onBlur={() => setTimeout(() => closeDropdown(index), 150)}
                            autoComplete="off"
                          />
                          {showDropdowns[index] && suggestions[index]?.length > 0 && (
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
                                  <span className="block text-muted-foreground">{item.code} · {item.uom} · {formatRp(item.sellingPrice)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.items?.[index]?.description && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.description?.message}</p>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="erp-table-cell w-24">
                        <input
                          type="text"
                          {...register(`items.${index}.sku`)}
                          placeholder="SKU"
                          className="erp-input text-xs w-24"
                        />
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

                      {/* UoM */}
                      <td className="erp-table-cell w-20">
                        <input
                          type="text"
                          {...register(`items.${index}.uom`)}
                          placeholder="pcs"
                          className={`erp-input text-xs w-20 ${errors.items?.[index]?.uom ? 'border-red-400' : ''}`}
                        />
                        {errors.items?.[index]?.uom && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.uom?.message}</p>
                        )}
                      </td>

                      {/* Harga Satuan */}
                      <td className="erp-table-cell min-w-[140px]">
                        <Controller
                          control={control}
                          name={`items.${index}.unitPrice`}
                          render={({ field: f }) => (
                            <CurrencyInput
                              value={f.value}
                              onChange={f.onChange}
                              className={`text-xs ${errors.items?.[index]?.unitPrice ? 'border-red-400' : ''}`}
                            />
                          )}
                        />
                        {errors.items?.[index]?.unitPrice && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.items[index]?.unitPrice?.message}</p>
                        )}
                      </td>

                      {/* Disc% */}
                      <td className="erp-table-cell w-20">
                        <div className="relative">
                          <input
                            type="number"
                            {...register(`items.${index}.discount`, { valueAsNumber: true })}
                            min={0}
                            max={100}
                            step="any"
                            className="erp-input text-xs pr-6 w-20 font-tabular"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="erp-table-cell text-right min-w-[120px]">
                        <RowAmount control={control} index={index} />
                      </td>

                      {/* Hapus */}
                      <td className="erp-table-cell w-10">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={fields.length === 1}
                          className={`p-1.5 rounded transition-colors ${fields.length === 1 ? 'opacity-30 cursor-not-allowed text-muted-foreground' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
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

            {/* Tambah Item */}
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

          {/* ── Section 4: Summary ── */}
          <Summary control={control} />

          {/* ── Section 5: Catatan ── */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Catatan (Opsional)</h2>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="Catatan internal atau pesan ke customer..."
              className="erp-input resize-none"
            />
          </div>

          {/* ── Footer ── */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-6">
            <Link href="/sales-order" className="btn-secondary">
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
              ) : 'Simpan Sales Order'}
            </button>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
