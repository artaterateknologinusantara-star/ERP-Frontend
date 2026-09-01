'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Sunrise, CheckCircle2 } from 'lucide-react';
import { demoLeadService, DEMO_LEAD_NEEDS } from '@/services/demoLead.service';

const EMPTY_FORM = {
  fullName: '',
  whatsappNumber: '',
  companyEmail: '',
  companyName: '',
  industry: '',
  need: '',
  notes: '',
};

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-orange-200 bg-white text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors';

const labelClass = 'block text-[13px] font-600 text-slate-700 mb-1.5';

export default function DemoRequestPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (field: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.whatsappNumber.trim() || !form.companyEmail.trim() ||
        !form.companyName.trim() || !form.industry.trim() || !form.need) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      await demoLeadService.create({
        fullName: form.fullName.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        companyEmail: form.companyEmail.trim(),
        companyName: form.companyName.trim(),
        industry: form.industry.trim(),
        need: form.need,
        notes: form.notes.trim() || undefined,
      });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim permintaan demo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50/50 to-white flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
            <Sunrise size={26} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-800 tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            FREE DEMO ARUNA ERP
          </h1>
          <p className="text-sm font-600 text-orange-900/70 mt-1">
            Let&rsquo;s Grow Your Business with Aruna
          </p>
          <p className="text-[13px] text-slate-500 mt-2">
            Isi form di bawah, tim kami akan menghubungi Anda untuk konsultasi dan demo gratis.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-orange-900/5 border border-orange-100 p-6 sm:p-7 space-y-4">
          <div>
            <label className={labelClass}>Nama Lengkap <span className="text-orange-500">*</span></label>
            <input className={inputClass} value={form.fullName} onChange={setField('fullName')} />
          </div>

          <div>
            <label className={labelClass}>Nomor WhatsApp <span className="text-orange-500">*</span></label>
            <input className={inputClass} value={form.whatsappNumber} onChange={setField('whatsappNumber')} type="tel" />
          </div>

          <div>
            <label className={labelClass}>Email Perusahaan <span className="text-orange-500">*</span></label>
            <input className={inputClass} value={form.companyEmail} onChange={setField('companyEmail')} type="email" />
          </div>

          <div>
            <label className={labelClass}>Nama Perusahaan <span className="text-orange-500">*</span></label>
            <input className={inputClass} value={form.companyName} onChange={setField('companyName')} />
          </div>

          <div>
            <label className={labelClass}>Industri Perusahaan <span className="text-orange-500">*</span></label>
            <input
              className={inputClass}
              value={form.industry}
              onChange={setField('industry')}
              placeholder="Manufaktur, Distribusi, Retail, dll"
            />
          </div>

          <div>
            <label className={labelClass}>Kebutuhan <span className="text-orange-500">*</span></label>
            <div className="space-y-2 mt-1">
              {DEMO_LEAD_NEEDS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer text-[13px] text-slate-700">
                  <input
                    type="radio"
                    name="need"
                    value={option}
                    checked={form.need === option}
                    onChange={setField('need')}
                    className="shrink-0 accent-orange-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Catatan untuk Konsultan</label>
            <input className={inputClass} value={form.notes} onChange={setField('notes')} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full justify-center flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 active:to-amber-700 disabled:opacity-60 text-white font-700 text-sm py-2.5 shadow-md shadow-orange-500/25 transition-all"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-orange-200 border-t-white rounded-full animate-spin" />
                Mengirim...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      </div>

      {submitted && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Terima kasih"
          onClick={() => setSubmitted(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 text-center animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-700 text-slate-900 mb-1.5">Terima kasih!</h2>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Permintaan demo Anda sudah kami terima. Tim kami akan segera menghubungi Anda via WhatsApp atau email!
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-5 w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-600 text-sm py-2.5 transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
