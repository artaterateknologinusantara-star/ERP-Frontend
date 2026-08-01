'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Paperclip, X } from 'lucide-react';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { createExpense } from '@/services/expense.service';
import { getExpenseCategoryList, ExpenseCategory } from '@/services/expenseCategory.service';
import { getFlatAccounts, Account } from '@/services/account.service';
import { supplierService } from '@/services/supplier.service';
import type { Supplier } from '@/types';

const PAYMENT_METHODS = ['Transfer', 'Tunai', 'Giro', 'Cek'];

const today = new Date().toISOString().slice(0, 10);

export default function BuatExpensePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    getExpenseCategoryList(true).then(setCategories).catch(() => toast.error('Gagal memuat Kategori Pengeluaran'));
    getFlatAccounts().then((all) => setCashAccounts(all.filter((a) => a.type === 'Asset'))).catch(() => toast.error('Gagal memuat daftar akun'));
    supplierService.list({ perPage: 200 }).then((res) => setSuppliers(res.data)).catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!expenseCategoryId) { setSubmitError('Kategori wajib dipilih'); return; }
    if (!description.trim()) { setSubmitError('Deskripsi wajib diisi'); return; }
    const amountNum = Number(amount);
    if (!amount || amountNum <= 0) { setSubmitError('Jumlah harus lebih dari 0'); return; }

    setSubmitting(true);
    try {
      const result = await createExpense({
        expenseDate,
        expenseCategoryId,
        description: description.trim(),
        vendorId: vendorId || undefined,
        amount: amountNum,
        method,
        cashBankAccountId: cashBankAccountId || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      }, file ?? undefined);
      toast.success(`Expense ${result.expenseNo} berhasil dibuat`);
      router.push(`/expense/${result.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat Expense';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Buat Expense"
      breadcrumbs={[
        { label: 'SynteraERP' },
        { label: 'Finance' },
        { label: 'Expense Management', href: '/expense' },
        { label: 'Buat Baru' },
      ]}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="space-y-5">

          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat Expense Baru</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Pengeluaran operasional (OPEX) — bukan biaya proyek/Purchasing</p>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Informasi Expense</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="erp-form-label">Tanggal<span className="text-red-500 ml-0.5">*</span></label>
                <input type="date" className="erp-input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
              </div>
              <div>
                <label className="erp-form-label">Kategori<span className="text-red-500 ml-0.5">*</span></label>
                <select className="erp-input" value={expenseCategoryId} onChange={(e) => setExpenseCategoryId(e.target.value)} required>
                  <option value="">— Pilih Kategori —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="erp-form-label">Deskripsi<span className="text-red-500 ml-0.5">*</span></label>
                <input type="text" className="erp-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Misal: Tagihan listrik kantor Juli" required />
              </div>
              <div>
                <label className="erp-form-label">Vendor <span className="text-xs text-muted-foreground">(opsional, referensi saja)</span></label>
                <select className="erp-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">— Tidak ada —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="erp-form-label">No. Referensi <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <input type="text" className="erp-input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Misal: No. Kwitansi / Invoice" />
              </div>
            </div>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Pembayaran</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="erp-form-label">Jumlah (Rp)<span className="text-red-500 ml-0.5">*</span></label>
                <CurrencyInput value={Number(amount) || 0} onChange={(v) => setAmount(v ? String(v) : '')} required />
              </div>
              <div>
                <label className="erp-form-label">Metode Pembayaran<span className="text-red-500 ml-0.5">*</span></label>
                <select className="erp-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="erp-form-label">Akun Kas/Bank <span className="text-xs text-muted-foreground">(default: 1-1001 Kas)</span></label>
                <select className="erp-input" value={cashBankAccountId} onChange={(e) => setCashBankAccountId(e.target.value)}>
                  <option value="">— Default (1-1001 Kas) —</option>
                  {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="erp-card">
            <h2 className="text-sm font-700 text-foreground mb-4 pb-2 border-b border-border">Lampiran & Catatan</h2>
            <div className="space-y-4">
              <div>
                <label className="erp-form-label">Bukti Pengeluaran <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <div
                  className="border border-dashed border-border rounded-lg px-4 py-3 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-[13px]">
                      <Paperclip size={13} className="text-primary" />
                      <span className="font-500 text-primary truncate max-w-[280px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[13px] text-muted-foreground">
                      <Paperclip size={13} className="inline mr-1.5" />
                      Klik untuk upload bukti (PDF, JPG, PNG, DOCX)
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <label className="erp-form-label">Catatan <span className="text-xs text-muted-foreground">(opsional)</span></label>
                <textarea className="erp-input resize-none" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Catatan tambahan..." />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-6">
            <Link href="/expense" className="btn-secondary">Batal</Link>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 min-w-[160px] justify-center">
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : 'Simpan Expense'}
            </button>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
