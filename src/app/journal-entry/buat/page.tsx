'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import CurrencyInput from '@/components/ui/CurrencyInput';
import BalanceSummary from '@/components/ui/BalanceSummary';
import { getFlatAccounts, type Account } from '@/services/account.service';
import { createJournalEntry } from '@/services/journalEntry.service';

// ── Schema ──────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  accountId: z.string().min(1, 'Akun wajib dipilih'),
  debit: z.coerce.number({ error: 'Harus angka' }).min(0, 'Tidak boleh negatif'),
  credit: z.coerce.number({ error: 'Harus angka' }).min(0, 'Tidak boleh negatif'),
  memo: z.string().optional(),
});

const schema = z.object({
  date: z.string().optional(),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  lines: z.array(lineSchema).min(2, 'Minimal 2 baris (1 Debit, 1 Kredit)'),
});

type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().slice(0, 10);

const defaultLine = { accountId: '', debit: 0 as unknown as number, credit: 0 as unknown as number, memo: '' };

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BuatJournalEntryPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: today,
      description: '',
      lines: [{ ...defaultLine }, { ...defaultLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    getFlatAccounts().then(setAccounts).catch(() => toast.error('Gagal memuat daftar akun'));
  }, []);

  const addLine = () => append({ ...defaultLine });
  const removeLine = (index: number) => remove(index);

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await createJournalEntry({
        description: data.description,
        date: data.date ? `${data.date}T00:00:00Z` : undefined,
        lines: data.lines
          .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            memo: l.memo || undefined,
          })),
      });
      toast.success(`Journal entry ${result.entryNumber} berhasil dibuat (Draft)`);
      router.push(`/journal-entry/${result.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat journal entry';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Buat Jurnal Manual"
      breadcrumbs={[
        { label: 'Accounting' },
        { label: 'Journal Entry', href: '/journal-entry' },
        { label: 'Buat Jurnal Manual' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat Jurnal Manual</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Journal entry dibuat sebagai Draft — perlu di-post terpisah oleh user yang berwenang
              sebelum masuk ke laporan keuangan (Segregation of Duties).
            </p>
          </div>

          {/* Informasi */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">
              Informasi
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="erp-form-label">Tanggal</label>
                <input
                  type="date"
                  {...register('date')}
                  className="erp-input"
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label className="erp-form-label">Deskripsi *</label>
                <input
                  type="text"
                  {...register('description')}
                  className="erp-input"
                  placeholder="Contoh: Koreksi pencatatan biaya listrik bulan Agustus"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
            </div>
          </div>

          {/* Baris Jurnal */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">
              Baris Jurnal
            </h2>
            {errors.lines && !Array.isArray(errors.lines) && (
              <p className="text-red-500 text-xs mb-3">{errors.lines.message}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    {['#', 'Akun *', 'Debit', 'Kredit', 'Memo', ''].map((h) => (
                      <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b border-border">
                      <td className="erp-table-cell text-muted-foreground w-8">{index + 1}</td>

                      <td className="erp-table-cell min-w-[220px]">
                        <select
                          {...register(`lines.${index}.accountId`)}
                          className={`erp-input text-xs ${errors.lines?.[index]?.accountId ? 'border-red-400' : ''}`}
                        >
                          <option value="">— Pilih Akun —</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
                          ))}
                        </select>
                        {errors.lines?.[index]?.accountId && (
                          <p className="text-red-500 text-[10px] mt-0.5">{errors.lines[index]?.accountId?.message}</p>
                        )}
                      </td>

                      <td className="erp-table-cell w-36">
                        <Controller
                          control={control}
                          name={`lines.${index}.debit`}
                          render={({ field: f }) => (
                            <CurrencyInput
                              prefix=""
                              value={f.value}
                              onChange={f.onChange}
                              className="text-xs"
                            />
                          )}
                        />
                      </td>

                      <td className="erp-table-cell w-36">
                        <Controller
                          control={control}
                          name={`lines.${index}.credit`}
                          render={({ field: f }) => (
                            <CurrencyInput
                              prefix=""
                              value={f.value}
                              onChange={f.onChange}
                              className="text-xs"
                            />
                          )}
                        />
                      </td>

                      <td className="erp-table-cell min-w-[160px]">
                        <input
                          type="text"
                          {...register(`lines.${index}.memo`)}
                          placeholder="Catatan..."
                          className="erp-input text-xs"
                        />
                      </td>

                      <td className="erp-table-cell w-10">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={fields.length <= 2}
                          className={`p-1.5 rounded transition-colors ${
                            fields.length <= 2
                              ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                              : 'hover:bg-red-50 text-red-400 hover:text-red-600'
                          }`}
                          title={fields.length <= 2 ? 'Minimal 2 baris' : 'Hapus baris'}
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
                onClick={addLine}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-600 transition-colors"
              >
                <Plus size={14} /> Tambah Baris
              </button>
            </div>
          </div>

          <BalanceSummary control={control} name="lines" />

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end pt-2 pb-6">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 min-w-[200px] justify-center"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : 'Simpan (Draft)'}
            </button>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
