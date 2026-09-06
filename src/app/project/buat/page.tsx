'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { projectService, UserLookup } from '@/services/project.service';
import { customerService } from '@/services/customer.service';
import { salesOrderService } from '@/services/salesorder.service';
import type { Customer, SalesOrder } from '@/types';

// ── Schema ──────────────────────────────────────────────────────────────────
// Mirror validasi backend ProjectController.ValidateRevenueRecognitionAndSalesOrderAsync
// (ProjectController.cs:610-616): method PercentageOfCompletion butuh SalesOrderId
// dan EstimatedTotalCost > 0. Ini murni UX (mencegah round-trip gagal) - backend tetap
// jadi sumber kebenaran validasi.

const schema = z
  .object({
    name: z.string().min(1, 'Nama Project wajib diisi'),
    customerId: z.string().min(1, 'Customer wajib dipilih'),
    salesOrderId: z.string().optional(),
    projectManagerId: z.string().optional(),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    endDate: z.string().optional(),
    budget: z.coerce.number({ error: 'Harus angka' }).min(0, 'Tidak boleh negatif'),
    notes: z.string().optional(),
    revenueRecognitionMethod: z.enum(['Immediate', 'PercentageOfCompletion']),
    estimatedTotalCost: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.revenueRecognitionMethod === 'PercentageOfCompletion') {
      if (!data.salesOrderId) {
        ctx.addIssue({
          code: 'custom',
          path: ['salesOrderId'],
          message: 'Metode Percentage of Completion butuh Project terhubung ke Sales Order.',
        });
      }
      if (!data.estimatedTotalCost || data.estimatedTotalCost <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['estimatedTotalCost'],
          message: 'Metode Percentage of Completion butuh Estimated Total Cost yang valid (lebih dari 0).',
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().slice(0, 10);

export default function BuatProjectPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [managers, setManagers] = useState<UserLookup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      customerId: '',
      salesOrderId: '',
      projectManagerId: '',
      startDate: today,
      endDate: '',
      budget: 0 as unknown as number,
      notes: '',
      revenueRecognitionMethod: 'Immediate',
      estimatedTotalCost: undefined,
    },
  });

  const method = watch('revenueRecognitionMethod');

  useEffect(() => {
    customerService.list({ perPage: 200 }).then((res) => setCustomers(res.data)).catch(() => toast.error('Gagal memuat daftar Customer'));
    salesOrderService.list({ perPage: 200 }).then((res) => setSalesOrders(res.data)).catch(() => toast.error('Gagal memuat daftar Sales Order'));
    projectService.getManagers().then(setManagers).catch(() => toast.error('Gagal memuat daftar Project Manager'));
  }, []);

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await projectService.create({
        name: data.name,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId || undefined,
        projectManagerId: data.projectManagerId || undefined,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        budget: Number(data.budget) || 0,
        notes: data.notes?.trim() || undefined,
        revenueRecognitionMethod: data.revenueRecognitionMethod,
        estimatedTotalCost:
          data.revenueRecognitionMethod === 'PercentageOfCompletion' ? Number(data.estimatedTotalCost) : undefined,
      });
      toast.success(result.message || 'Project berhasil dibuat');
      router.push(`/project/${result.data!.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat Project';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Buat Project"
      breadcrumbs={[{ label: 'Project', href: '/project' }, { label: 'Buat Baru' }]}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat Project Baru</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Project baru dibuat dengan status Planning.</p>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Informasi Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="erp-form-label">Nama Project<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  className="erp-input"
                  {...register('name')}
                  placeholder="Misal: Network Core Upgrade - Telkom"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Customer<span className="text-red-500 ml-0.5">*</span></label>
                <select className="erp-input" {...register('customerId')}>
                  <option value="">— Pilih Customer —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Sales Order <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <select className="erp-input" {...register('salesOrderId')}>
                  <option value="">— Tidak terhubung —</option>
                  {salesOrders.map((so) => <option key={so.id} value={so.id}>{so.no} — {so.customerName}</option>)}
                </select>
                {errors.salesOrderId && <p className="text-red-500 text-xs mt-1">{errors.salesOrderId.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Project Manager <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <select className="erp-input" {...register('projectManagerId')}>
                  <option value="">— Belum ditentukan —</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="erp-form-label">Tanggal Mulai<span className="text-red-500 ml-0.5">*</span></label>
                <input type="date" className="erp-input" {...register('startDate')} />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Estimasi Selesai <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <input type="date" className="erp-input" {...register('endDate')} />
              </div>
            </div>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Anggaran & Revenue Recognition</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="erp-form-label">Budget</label>
                <Controller
                  control={control}
                  name="budget"
                  render={({ field: f }) => <CurrencyInput value={f.value} onChange={f.onChange} />}
                />
                {errors.budget && <p className="text-red-500 text-xs mt-1">{errors.budget.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Revenue Recognition Method</label>
                <select className="erp-input" {...register('revenueRecognitionMethod')}>
                  <option value="Immediate">Immediate</option>
                  <option value="PercentageOfCompletion">Percentage of Completion</option>
                </select>
              </div>
              {method === 'PercentageOfCompletion' && (
                <div className="md:col-span-2">
                  <label className="erp-form-label">Estimated Total Cost<span className="text-red-500 ml-0.5">*</span></label>
                  <Controller
                    control={control}
                    name="estimatedTotalCost"
                    render={({ field: f }) => (
                      <CurrencyInput value={f.value ?? 0} onChange={f.onChange} error={!!errors.estimatedTotalCost} />
                    )}
                  />
                  {errors.estimatedTotalCost && (
                    <p className="text-red-500 text-xs mt-1">{errors.estimatedTotalCost.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Dipakai sebagai penyebut basis Cost-to-Cost (ActualCost / EstimatedTotalCost).
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Catatan</h2>
            <textarea
              className="erp-input resize-none"
              rows={3}
              {...register('notes')}
              placeholder="Catatan tambahan mengenai Project..."
            />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-6">
            <Link href="/project" className="btn-secondary">Batal</Link>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 min-w-[160px] justify-center">
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : 'Simpan Project'}
            </button>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
