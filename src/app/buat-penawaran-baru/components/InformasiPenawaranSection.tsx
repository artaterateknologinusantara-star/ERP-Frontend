'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { SelectOption, Customer } from '@/types';
import { customerService } from '@/services/customer.service';
import { api } from '@/lib/api';

export interface InfoFormValues {
  customerId: string;
  projectName: string;
  projectLocation: string;
  attn: string;
  date: string;
  validUntil: string;
  salesId: string;
  branch: string;
  quotationNo: string;
  revision: number;
}

interface Props {
  values: InfoFormValues;
  onChange: (patch: Partial<InfoFormValues>) => void;
  errors?: Partial<Record<keyof InfoFormValues, string>>;
}

const BRANCH_OPTIONS = ['Jakarta Pusat', 'Jakarta Selatan', 'Surabaya', 'Bandung', 'Medan'];

export default function InformasiPenawaranSection({ values, onChange, errors }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOptions, setSalesOptions] = useState<SelectOption[]>([]);

  // Combobox state
  const [customerSearch, setCustomerSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    customerService.list({ perPage: 200, isActive: true })
      .then((res) => setCustomers(res.data))
      .catch(() => {});

    api.get<{ id: string; name: string }[]>('/auth/users')
      .then((res) => setSalesOptions((res.data ?? []).map((u) => ({ value: u.id, label: u.name }))))
      .catch(() => {});
  }, []);

  // Sync search input with selected customer label when value changes externally (e.g. edit mode)
  useEffect(() => {
    if (values.customerId && !comboOpen) {
      const label = customers.find((c) => c.id === values.customerId)?.name ?? '';
      setCustomerSearch(label);
    }
  }, [values.customerId, customers, comboOpen]);

  // Close combobox on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        if (!values.customerId) setCustomerSearch('');
        else {
          const label = customers.find((c) => c.id === values.customerId)?.name ?? '';
          setCustomerSearch(label);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [values.customerId, customers]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    const address = [customer.address, customer.city].filter(Boolean).join(', ');
    onChange({
      customerId: customer.id,
      attn: customer.contactPerson ?? '',
      projectLocation: address,
    });
    setCustomerSearch(customer.name);
    setComboOpen(false);
  };

  const handleClearCustomer = () => {
    onChange({ customerId: '', attn: '', projectLocation: '' });
    setCustomerSearch('');
    setComboOpen(false);
  };

  const field = (key: keyof InfoFormValues) => ({
    value: values[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ [key]: e.target.value }),
  });

  return (
    <div className="erp-card shadow-card">
      <div className="erp-section-header">Informasi Penawaran</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">

        {/* ── Left Column ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Nama Pelanggan — Searchable Combobox */}
          <div>
            <label className="erp-form-label">
              Nama Pelanggan <span className="required">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Pilih atau ketik nama pelanggan terdaftar</p>
            <div className="relative" ref={comboRef}>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setComboOpen(true); }}
                  onFocus={() => setComboOpen(true)}
                  placeholder="Ketik nama pelanggan..."
                  className={`erp-input pr-8 ${errors?.customerId ? 'border-red-400' : ''}`}
                  autoComplete="off"
                />
                {values.customerId ? (
                  <button type="button" onClick={handleClearCustomer} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                )}
              </div>

              {comboOpen && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                      Pelanggan tidak ditemukan
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCustomer(c)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors ${
                          values.customerId === c.id ? 'bg-primary/10 text-primary font-600' : 'text-foreground'
                        }`}
                      >
                        <span className="block font-500">{c.name}</span>
                        {c.contactPerson && (
                          <span className="block text-xs text-muted-foreground">{c.contactPerson}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors?.customerId && <p className="text-red-500 text-xs mt-1 font-500">{errors.customerId}</p>}
          </div>

          {/* Nama Proyek */}
          <div>
            <label className="erp-form-label">
              Nama / Kode Proyek <span className="required">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Nama atau kode internal proyek</p>
            <input
              type="text"
              {...field('projectName')}
              placeholder="Contoh: PRJ-2026-NETCORE"
              className="erp-input"
            />
            {errors?.projectName && <p className="text-red-500 text-xs mt-1 font-500">{errors.projectName}</p>}
          </div>

          {/* Alamat Kantor */}
          <div>
            <label className="erp-form-label">Alamat Kantor</label>
            <input
              type="text"
              {...field('projectLocation')}
              placeholder="Contoh: Gedung Menara Astra, Jakarta Pusat"
              className="erp-input"
            />
          </div>

          {/* Kepada (Attn) */}
          <div>
            <label className="erp-form-label">
              Kepada (Attn) <span className="required">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Nama kontak penerima penawaran</p>
            <input
              type="text"
              {...field('attn')}
              placeholder="Contoh: Bpk. Andi Wijaya, Procurement Manager"
              className="erp-input"
            />
            {errors?.attn && <p className="text-red-500 text-xs mt-1 font-500">{errors.attn}</p>}
          </div>

          {/* Tanggal Penawaran */}
          <div>
            <label className="erp-form-label">
              Tanggal Penawaran <span className="required">*</span>
            </label>
            <input type="date" {...field('date')} className="erp-input" />
            {errors?.date && <p className="text-red-500 text-xs mt-1 font-500">{errors.date}</p>}
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Cabang */}
          <div>
            <label className="erp-form-label">Cabang</label>
            <div className="relative">
              <select {...field('branch')} className="erp-input appearance-none pr-8">
                {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Sales Person */}
          <div>
            <label className="erp-form-label">
              Sales Person <span className="required">*</span>
            </label>
            <div className="relative">
              <select
                value={values.salesId}
                onChange={(e) => onChange({ salesId: e.target.value })}
                className="erp-input appearance-none pr-8"
              >
                <option value="">— Pilih Sales —</option>
                {salesOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {errors?.salesId && <p className="text-red-500 text-xs mt-1 font-500">{errors.salesId}</p>}
          </div>

          {/* No. Penawaran */}
          <div>
            <label className="erp-form-label">No. Penawaran</label>
            <p className="text-xs text-muted-foreground mb-1.5">Dibuat otomatis oleh sistem</p>
            <input
              type="text"
              value={values.quotationNo}
              readOnly
              className="erp-input bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Revisi */}
          <div>
            <label className="erp-form-label">Revisi</label>
            <input
              type="text"
              value={values.revision > 0 ? `R.${String(values.revision).padStart(2, '0')}` : '—'}
              readOnly
              className="erp-input w-24 bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Tanggal Kadaluarsa */}
          <div>
            <label className="erp-form-label">
              Tanggal Kadaluarsa <span className="required">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">Penawaran tidak berlaku setelah tanggal ini</p>
            <input type="date" {...field('validUntil')} className="erp-input" />
            {errors?.validUntil && <p className="text-red-500 text-xs mt-1 font-500">{errors.validUntil}</p>}
          </div>
        </div>
      </div>

    </div>
  );
}
