'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatRp } from '@/lib/format';
import { getFlatAccounts, type Account } from '@/services/account.service';
import {
  createOpeningBalance,
  getExistingPostedOpeningBalances,
  type JournalEntryListItem,
} from '@/services/journalEntry.service';

// ── Schema ──────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  accountId: z.string().min(1, 'Akun wajib dipilih'),
  debit: z.coerce.number({ error: 'Harus angka' }).min(0, 'Tidak boleh negatif'),
  credit: z.coerce.number({ error: 'Harus angka' }).min(0, 'Tidak boleh negatif'),
  memo: z.string().optional(),
});

const schema = z.object({
  date: z.string().min(1, 'Tanggal cut-off wajib diisi'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  lines: z.array(lineSchema).min(2, 'Minimal 2 baris (1 Debit, 1 Kredit)'),
});

type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().slice(0, 10);

const defaultLine = { accountId: '', debit: 0 as unknown as number, credit: 0 as unknown as number, memo: '' };

// ── Balance Summary (live) ───────────────────────────────────────────────────

function BalanceSummary({ control }: { control: ReturnType<typeof useForm<FormValues>>['control'] }) {
  const lines = useWatch({ control, name: 'lines' });
  const totalDebit = (lines ?? []).reduce((s, l) => s + (Number(l?.debit) || 0), 0);
  const totalCredit = (lines ?? []).reduce((s, l) => s + (Number(l?.credit) || 0), 0);
  const diff = Math.round((totalDebit - totalCredit) * 100) / 100;
  const isBalanced = diff === 0 && totalDebit > 0;

  return (
    <div className="erp-card">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Debit</p>
          <p className="text-lg font-700 font-tabular">{formatRp(totalDebit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Kredit</p>
          <p className="text-lg font-700 font-tabular">{formatRp(totalCredit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Selisih</p>
          <p className={`text-lg font-700 font-tabular ${isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatRp(diff)}
          </p>
        </div>
      </div>
      {!isBalanced && (
        <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {totalDebit === 0 && totalCredit === 0
            ? 'Isi minimal satu baris Debit dan satu baris Kredit.'
            : 'Total Debit dan Total Kredit harus sama sebelum bisa disimpan.'}
        </p>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OpeningBalancePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<JournalEntryListItem[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
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
      description: 'Opening Balance - Saldo Awal',
      lines: [{ ...defaultLine }, { ...defaultLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  useEffect(() => {
    getFlatAccounts().then(setAccounts).catch(() => toast.error('Gagal memuat daftar akun'));
    getExistingPostedOpeningBalances()
      .then(setExisting)
      .catch(() => toast.error('Gagal memeriksa Opening Balance sebelumnya'))
      .finally(() => setLoadingExisting(false));
  }, []);

  const addLine = () => append({ ...defaultLine });
  const removeLine = (index: number) => remove(index);

  const submitOpeningBalance = async (data: FormValues) => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await createOpeningBalance({
        date: `${data.date}T00:00:00Z`,
        description: data.description,
        lines: data.lines
          .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            memo: l.memo || undefined,
          })),
      });
      toast.success(`Opening Balance ${result.entryNumber} berhasil dibuat`);
      router.push('/finance-reports/trial-balance');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat Opening Balance';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (existing.length > 0) {
      setShowConfirm(true);
      return;
    }
    submitOpeningBalance(data);
  };

  return (
    <AppLayout
      title="Opening Balance"
      breadcrumbs={[
        { label: 'Accounting' },
        { label: 'Opening Balance' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-foreground">Opening Balance (Saldo Awal)</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Journal Entry pembuka untuk memasukkan saldo Kas/Piutang/Persediaan/Utang/Modal dari
              pembukuan lama ke General Ledger, per tanggal cut-off go-live. Hanya berlaku untuk akun
              Asset/Liability/Equity — akun Pendapatan/Beban akan ditolak sistem.
            </p>
          </div>

          {!loadingExisting && existing.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                Opening Balance sudah pernah dibuat sebelumnya: <strong>{existing[0].entryNumber}</strong>{' '}
                pada {new Date(existing[0].date).toLocaleDateString('id-ID')}
                {existing.length > 1 ? ` (dan ${existing.length - 1} entry lainnya)` : ''}. Anda tetap bisa
                melanjutkan, tapi akan diminta konfirmasi ulang sebelum submit.
              </span>
            </div>
          )}

          {/* Informasi */}
          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">
              Informasi
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="erp-form-label">Tanggal Cut-off *</label>
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
                  placeholder="Opening Balance - Saldo Awal"
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

          <BalanceSummary control={control} />

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
              ) : 'Simpan Opening Balance'}
            </button>
          </div>

        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit(submitOpeningBalance)}
        title="Opening Balance Sudah Pernah Dibuat"
        description={`Opening Balance sudah pernah dibuat sebelumnya (${existing[0]?.entryNumber ?? '-'} pada ${
          existing[0] ? new Date(existing[0].date).toLocaleDateString('id-ID') : '-'
        }). Apakah Anda yakin ingin membuat set Opening Balance baru?`}
        confirmLabel="Ya, Lanjutkan"
        loading={submitting}
        variant="danger"
      />
    </AppLayout>
  );
}
