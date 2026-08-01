'use client';

import React, { useState } from 'react';
import { Save, Plus, Edit2, Trash2 } from 'lucide-react';
import UsersTab from './UsersTab';

type SettingsTab = 'company' | 'branch' | 'users' | 'roles' | 'tax' | 'numbering' | 'preferences';

interface SettingsModuleProps {
  activeTab: SettingsTab;
}

const branches = [
  { id: 'br-001', name: 'Jakarta Pusat', address: 'Jl. Sudirman No. 45, Jakarta Pusat', phone: '021-5551234', manager: 'Budi Santoso', status: 'Aktif' },
  { id: 'br-002', name: 'Surabaya', address: 'Jl. Pemuda No. 12, Surabaya', phone: '031-5552345', manager: 'Rizky Ananda', status: 'Aktif' },
  { id: 'br-003', name: 'Bandung', address: 'Jl. Asia Afrika No. 8, Bandung', phone: '022-5553456', manager: 'Sari Wulandari', status: 'Aktif' },
];

const users = [
  { id: 'usr-001', name: 'Budi Santoso', email: 'budi@syntera.co.id', role: 'Sales Manager', branch: 'Jakarta', status: 'Aktif', lastLogin: '12/05/2026' },
  { id: 'usr-002', name: 'Rizky Ananda', email: 'rizky@syntera.co.id', role: 'Sales Executive', branch: 'Surabaya', status: 'Aktif', lastLogin: '11/05/2026' },
  { id: 'usr-003', name: 'Sari Wulandari', email: 'sari@syntera.co.id', role: 'Finance Manager', branch: 'Jakarta', status: 'Aktif', lastLogin: '10/05/2026' },
  { id: 'usr-004', name: 'Dian Pratiwi', email: 'dian@syntera.co.id', role: 'Procurement', branch: 'Bandung', status: 'Aktif', lastLogin: '09/05/2026' },
  { id: 'usr-005', name: 'Ahmad Fauzi', email: 'ahmad@syntera.co.id', role: 'Engineer', branch: 'Jakarta', status: 'Tidak Aktif', lastLogin: '01/04/2026' },
];

const roles = [
  { id: 'rol-001', name: 'Super Admin', description: 'Akses penuh ke semua modul', users: 1, permissions: 'All' },
  { id: 'rol-002', name: 'Sales Manager', description: 'Kelola penawaran, SO, invoice', users: 2, permissions: 'Sales, Reports' },
  { id: 'rol-003', name: 'Sales Executive', description: 'Buat dan kirim penawaran', users: 3, permissions: 'Sales' },
  { id: 'rol-004', name: 'Finance Manager', description: 'Kelola AR, AP, Finance', users: 2, permissions: 'Finance, Reports' },
  { id: 'rol-005', name: 'Procurement', description: 'Kelola PR, PO, Vendor', users: 2, permissions: 'Purchasing' },
  { id: 'rol-006', name: 'Engineer', description: 'Lihat proyek dan task', users: 5, permissions: 'Project (Read)' },
];

const taxSettings = [
  { id: 'tax-001', name: 'PPN 11%', rate: 11, type: 'Percentage', status: 'Aktif', default: true },
  { id: 'tax-002', name: 'PPh 23 (2%)', rate: 2, type: 'Percentage', status: 'Aktif', default: false },
  { id: 'tax-003', name: 'PPh 21', rate: 5, type: 'Percentage', status: 'Aktif', default: false },
];

const numberingFormats = [
  { id: 'num-001', module: 'Penawaran', prefix: 'Q.SYN', format: 'Q.SYN-YY.NNNN', example: 'Q.SYN-26.0148', autoReset: 'Tahunan' },
  { id: 'num-002', module: 'Sales Order', prefix: 'SO.SYN', format: 'SO.SYN-YY.NNNN', example: 'SO.SYN-26.0048', autoReset: 'Tahunan' },
  { id: 'num-003', module: 'Invoice', prefix: 'INV.SYN', format: 'INV.SYN-YY.NNNN', example: 'INV.SYN-26.0064', autoReset: 'Tahunan' },
  { id: 'num-004', module: 'Purchase Request', prefix: 'PR.SYN', format: 'PR.SYN-YY.NNNN', example: 'PR.SYN-26.0032', autoReset: 'Tahunan' },
  { id: 'num-005', module: 'Purchase Order', prefix: 'PO.SYN', format: 'PO.SYN-YY.NNNN', example: 'PO.SYN-26.0019', autoReset: 'Tahunan' },
];

export default function SettingsModule({ activeTab }: SettingsModuleProps) {
  const [companyName, setCompanyName] = useState('PT Syntera Teknologi Indonesia');
  const [companyEmail, setCompanyEmail] = useState('info@syntera.co.id');
  const [companyPhone, setCompanyPhone] = useState('021-5550000');
  const [companyAddress, setCompanyAddress] = useState('Jl. Sudirman No. 45, Jakarta Pusat 10220');
  const [companyNPWP, setCompanyNPWP] = useState('01.234.567.8-901.000');
  const [currency, setCurrency] = useState('IDR');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  if (activeTab === 'company') {
    return (
      <div className="space-y-5">
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4 pb-3 border-b border-border">Informasi Perusahaan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Nama Perusahaan <span className="text-red-500">*</span></label>
              <input type="text" className="erp-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Email Perusahaan</label>
              <input type="email" className="erp-input" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Telepon</label>
              <input type="text" className="erp-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">NPWP</label>
              <input type="text" className="erp-input" value={companyNPWP} onChange={(e) => setCompanyNPWP(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Alamat</label>
              <textarea className="erp-input resize-none" rows={2} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Mata Uang</label>
              <select className="erp-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="IDR">IDR — Rupiah Indonesia</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Zona Waktu</label>
              <select className="erp-input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <button className="btn-primary"><Save size={14} /> Simpan Perubahan</button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'branch') {
    return (
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Manajemen Cabang</h3>
          <button className="btn-primary"><Plus size={14} /> Tambah Cabang</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama Cabang', 'Alamat', 'Telepon', 'Manager', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600">{row.name}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[250px] truncate">{row.address}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.phone}</td>
                  <td className="erp-table-cell">{row.manager}</td>
                  <td className="erp-table-cell"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 status-disetujui">{row.status}</span></td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'users') {
    return <UsersTab />;
  }

  if (activeTab === 'roles') {
    return (
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Manajemen Role</h3>
          <button className="btn-primary"><Plus size={14} /> Tambah Role</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama Role', 'Deskripsi', 'Jumlah User', 'Akses Modul', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600">{row.name}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.description}</td>
                  <td className="erp-table-cell text-center font-600">{row.users}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.permissions}</td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'tax') {
    return (
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Pengaturan Pajak</h3>
          <button className="btn-primary"><Plus size={14} /> Tambah Pajak</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama Pajak', 'Tarif (%)', 'Tipe', 'Default', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {taxSettings.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600">{row.name}</td>
                  <td className="erp-table-cell font-700 text-primary">{row.rate}%</td>
                  <td className="erp-table-cell text-muted-foreground">{row.type}</td>
                  <td className="erp-table-cell">{row.default ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 status-disetujui">Default</span> : '-'}</td>
                  <td className="erp-table-cell"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${row.status === 'Aktif' ? 'status-disetujui' : 'status-draft'}`}>{row.status}</span></td>
                  <td className="erp-table-cell">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'numbering') {
    return (
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Format Penomoran Dokumen</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Modul', 'Prefix', 'Format', 'Contoh', 'Reset Otomatis', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numberingFormats.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600">{row.module}</td>
                  <td className="erp-table-cell font-600 text-primary">{row.prefix}</td>
                  <td className="erp-table-cell text-muted-foreground font-mono text-xs">{row.format}</td>
                  <td className="erp-table-cell font-600 text-xs">{row.example}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.autoReset}</td>
                  <td className="erp-table-cell">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // preferences
  return (
    <div className="erp-card shadow-card">
      <h3 className="text-[13px] font-700 text-foreground mb-4 pb-3 border-b border-border">Preferensi ERP</h3>
      <div className="space-y-4 max-w-xl">
        {[
          { label: 'Bahasa Sistem', value: 'Bahasa Indonesia', options: ['Bahasa Indonesia', 'English'] },
          { label: 'Format Tanggal', value: 'DD/MM/YYYY', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
          { label: 'Format Angka', value: 'Rp 1.000.000', options: ['Rp 1.000.000', 'Rp 1,000,000'] },
          { label: 'PPN Default', value: '11%', options: ['11%', '0%'] },
        ].map((pref) => (
          <div key={pref.label} className="flex items-center gap-4">
            <label className="text-[13px] font-500 text-foreground w-40 flex-shrink-0">{pref.label}</label>
            <select className="erp-input max-w-[240px]" defaultValue={pref.value}>
              {pref.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div className="flex justify-end pt-4 border-t border-border">
          <button className="btn-primary"><Save size={14} /> Simpan Preferensi</button>
        </div>
      </div>
    </div>
  );
}
