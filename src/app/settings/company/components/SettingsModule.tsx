'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Edit2, Trash2, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import DemoLeadsTab from './DemoLeadsTab';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ERPModal from '@/components/ui/ERPModal';
import { companySettingsService, NumberingConfigEntry } from '@/services/companySettings.service';
import { branchService, Branch, CreateBranchDto } from '@/services/branch.service';
import type { CompanySettings } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SettingsTab = 'company' | 'branch' | 'users' | 'roles' | 'demo-leads' | 'tax' | 'numbering' | 'preferences';

interface SettingsModuleProps {
  activeTab: SettingsTab;
}

const EMPTY_BRANCH_FORM: CreateBranchDto = { name: '', address: '', phone: '', manager: '' };

const taxSettings = [
  { id: 'tax-001', name: 'PPN 11%', rate: 11, type: 'Percentage', status: 'Aktif', default: true },
  { id: 'tax-002', name: 'PPh 23 (2%)', rate: 2, type: 'Percentage', status: 'Aktif', default: false },
  { id: 'tax-003', name: 'PPh 21', rate: 5, type: 'Percentage', status: 'Aktif', default: false },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTATION: 'Penawaran',
  SALES_ORDER: 'Sales Order',
  INVOICE: 'Invoice',
  PURCHASE_REQUEST: 'Purchase Request',
  PURCHASE_ORDER: 'Purchase Order',
  JOURNAL_ENTRY: 'Journal Entry',
  SUPPLIER_INVOICE: 'Supplier Invoice',
  EXPENSE: 'Expense',
  DELIVERY_ORDER: 'Delivery Order',
};

export default function SettingsModule({ activeTab }: SettingsModuleProps) {
  const queryClient = useQueryClient();

  // ── Branch (Manajemen Cabang) ─────────────────────────────────────────────
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branchModal, setBranchModal] = useState<'create' | 'edit' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<CreateBranchDto>(EMPTY_BRANCH_FORM);
  const [branchNameError, setBranchNameError] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState(false);

  const loadBranches = async () => {
    setLoadingBranches(true);
    try {
      const res = await branchService.list({ perPage: 100 });
      setBranches(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data Cabang');
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'branch') return;
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openCreateBranch = () => {
    setBranchForm(EMPTY_BRANCH_FORM);
    setBranchNameError('');
    setBranchModal('create');
  };

  const openEditBranch = (b: Branch) => {
    setSelectedBranch(b);
    setBranchForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '', manager: b.manager ?? '' });
    setBranchNameError('');
    setBranchModal('edit');
  };

  const closeBranchModal = () => {
    setBranchModal(null);
    setSelectedBranch(null);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) {
      setBranchNameError('Nama Cabang wajib diisi.');
      return;
    }
    setSavingBranch(true);
    try {
      if (branchModal === 'create') {
        await branchService.create(branchForm);
        toast.success('Cabang berhasil ditambahkan');
      } else if (branchModal === 'edit' && selectedBranch) {
        await branchService.update(selectedBranch.id, { ...branchForm, isActive: selectedBranch.isActive });
        toast.success('Cabang berhasil diperbarui');
      }
      closeBranchModal();
      loadBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan Cabang');
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchTarget) return;
    setDeletingBranch(true);
    try {
      await branchService.delete(deleteBranchTarget.id);
      toast.success('Cabang berhasil dihapus');
      setDeleteBranchTarget(null);
      loadBranches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus Cabang');
    } finally {
      setDeletingBranch(false);
    }
  };
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyNPWP, setCompanyNPWP] = useState('');
  const [documentPrefix, setDocumentPrefix] = useState('');
  const [savedDocumentPrefix, setSavedDocumentPrefix] = useState('');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  // Not shown in this form, but round-tripped so saving doesn't null them out server-side
  // (UpdateAsync writes every field on the request; leaving these out would wipe them).
  const [website, setWebsite] = useState('');
  const [footerText, setFooterText] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');

  const [companyNameError, setCompanyNameError] = useState('');
  const [companyEmailError, setCompanyEmailError] = useState('');

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoUrlRef = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const setLogoPreview = (url: string | null) => {
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    logoUrlRef.current = url;
    setLogoPreviewUrl(url);
  };

  const applySettings = async (data: CompanySettings) => {
    setCompanyName(data.companyName ?? '');
    setCompanyEmail(data.email ?? '');
    setCompanyPhone(data.phone ?? '');
    setCompanyAddress(data.address ?? '');
    setCompanyNPWP(data.npwp ?? '');
    setDocumentPrefix(data.documentPrefix ?? '');
    setSavedDocumentPrefix(data.documentPrefix ?? '');
    setBankName(data.bankName ?? '');
    setBankAccountNumber(data.bankAccountNumber ?? '');
    setBankAccountHolderName(data.bankAccountHolderName ?? '');
    setWebsite(data.website ?? '');
    setFooterText(data.footerText ?? '');
    setSignatureName(data.signatureName ?? '');
    setSignatureTitle(data.signatureTitle ?? '');
    setLogoFileName(data.logoFileName ?? null);

    if (data.logoPath) {
      setLogoPreview(await companySettingsService.getLogoObjectUrl());
    } else {
      setLogoPreview(null);
    }
  };

  useEffect(() => {
    // 'numbering' also needs Company Settings loaded — the "Kode/Prefix Dokumen" field
    // and its save/regenerate actions live in that tab now, but still read/write the
    // same CompanySettings record as the 'company' tab.
    if (activeTab !== 'company' && activeTab !== 'numbering') return;
    let active = true;
    setLoadingSettings(true);
    companySettingsService
      .get()
      .then(async (res) => {
        if (!active) return;
        if (res.success && res.data) await applySettings(res.data);
        else toast.error(res.message ?? 'Gagal memuat Company Settings');
      })
      .catch((err) => {
        if (active) toast.error(err instanceof Error ? err.message : 'Gagal memuat Company Settings');
      })
      .finally(() => { if (active) setLoadingSettings(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => () => { if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current); }, []);

  const [numberingConfigs, setNumberingConfigs] = useState<NumberingConfigEntry[]>([]);
  const [loadingNumberingConfigs, setLoadingNumberingConfigs] = useState(true);

  useEffect(() => {
    if (activeTab !== 'numbering') return;
    let active = true;
    setLoadingNumberingConfigs(true);
    companySettingsService
      .getNumberingConfigs()
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setNumberingConfigs(res.data);
        else toast.error(res.message ?? 'Gagal memuat data Numbering');
      })
      .catch((err) => {
        if (active) toast.error(err instanceof Error ? err.message : 'Gagal memuat data Numbering');
      })
      .finally(() => { if (active) setLoadingNumberingConfigs(false); });
    return () => { active = false; };
  }, [activeTab]);

  const validateCompanyProfile = () => {
    let ok = true;
    if (!companyName.trim()) {
      setCompanyNameError('Nama Perusahaan wajib diisi.');
      ok = false;
    } else {
      setCompanyNameError('');
    }
    if (companyEmail.trim() && !EMAIL_RE.test(companyEmail.trim())) {
      setCompanyEmailError('Format Email tidak valid.');
      ok = false;
    } else {
      setCompanyEmailError('');
    }
    return ok;
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCompanyProfile()) {
      toast.error('Periksa kembali data yang wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const res = await companySettingsService.update({
        companyName: companyName.trim(),
        address: companyAddress.trim() || undefined,
        phone: companyPhone.trim() || undefined,
        email: companyEmail.trim() || undefined,
        website: website.trim() || undefined,
        footerText: footerText.trim() || undefined,
        signatureName: signatureName.trim() || undefined,
        signatureTitle: signatureTitle.trim() || undefined,
        documentPrefix: documentPrefix.trim() || undefined,
        npwp: companyNPWP.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolderName: bankAccountHolderName.trim() || undefined,
      });
      if (res.success && res.data) {
        await applySettings(res.data);
        queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        toast.success(res.message ?? 'Company Settings berhasil disimpan');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan Company Settings');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedDocumentPrefix = documentPrefix.trim() !== savedDocumentPrefix.trim();

  const handleRegeneratePrefixes = async () => {
    setRegenerating(true);
    try {
      const res = await companySettingsService.regeneratePrefixes();
      if (res.success && res.data) {
        toast.success(res.message ?? `Prefix diperbarui untuk ${res.data.updatedCount} tipe dokumen.`);
        setNumberingConfigs(res.data.numberingConfigs);
        setShowRegenerateConfirm(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui prefix dokumen');
    } finally {
      setRegenerating(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await companySettingsService.uploadLogo(file);
      if (res.success && res.data) {
        await applySettings(res.data);
        queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        toast.success(res.message ?? 'Logo berhasil diunggah');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadingLogo(true);
    try {
      const res = await companySettingsService.deleteLogo();
      if (res.success && res.data) {
        await applySettings(res.data);
        queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        toast.success(res.message ?? 'Logo berhasil dihapus');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (activeTab === 'company') {
    if (loadingSettings) {
      return (
        <div className="erp-card shadow-card flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[13px]">Memuat Company Settings...</span>
        </div>
      );
    }
    return (
      <form onSubmit={handleSaveCompanyProfile} className="space-y-5">
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4 pb-3 border-b border-border">Informasi Perusahaan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Logo Perusahaan</label>
              <div className="flex items-start gap-4">
                <div
                  className="border border-dashed border-border rounded-lg w-28 h-28 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors overflow-hidden flex-shrink-0"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 size={18} className="animate-spin text-primary" />
                  ) : logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreviewUrl} alt="Logo perusahaan" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-muted-foreground text-[11px] px-2">
                      <ImagePlus size={16} className="mx-auto mb-1" />
                      Klik untuk upload
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  {logoFileName && (
                    <div className="flex items-center gap-2 text-[13px] mb-1.5">
                      <span className="font-500 text-foreground truncate max-w-[220px]">{logoFileName}</span>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Format PNG, JPG, GIF, atau WEBP. Maksimal 2MB.</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
                onChange={handleLogoFileChange}
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Nama Perusahaan <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={`erp-input ${companyNameError ? 'border-red-500' : ''}`}
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (e.target.value.trim()) setCompanyNameError('');
                }}
                onBlur={validateCompanyProfile}
              />
              {companyNameError && <p className="text-xs text-red-500 mt-1">{companyNameError}</p>}
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Email Perusahaan</label>
              <input
                type="email"
                className={`erp-input ${companyEmailError ? 'border-red-500' : ''}`}
                value={companyEmail}
                onChange={(e) => {
                  setCompanyEmail(e.target.value);
                  if (!e.target.value.trim() || EMAIL_RE.test(e.target.value.trim())) setCompanyEmailError('');
                }}
                onBlur={validateCompanyProfile}
              />
              {companyEmailError && <p className="text-xs text-red-500 mt-1">{companyEmailError}</p>}
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Telepon</label>
              <input type="text" className="erp-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">NPWP</label>
              <input type="text" maxLength={20} className="erp-input" value={companyNPWP} onChange={(e) => setCompanyNPWP(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Website</label>
              <input type="text" maxLength={200} className="erp-input" placeholder="www.perusahaananda.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
              <p className="text-xs text-muted-foreground mt-1">Preferensi tampilan lokal (belum tersimpan ke server).</p>
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Zona Waktu</label>
              <select className="erp-input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Preferensi tampilan lokal (belum tersimpan ke server).</p>
            </div>
          </div>
        </div>

        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4 pb-3 border-b border-border">Informasi Bank</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Nama Bank</label>
              <input type="text" className="erp-input" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Nomor Rekening</label>
              <input type="text" className="erp-input" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Nama Pemilik Rekening</label>
              <input type="text" className="erp-input" value={bankAccountHolderName} onChange={(e) => setBankAccountHolderName(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" className="btn-primary" disabled={saving || !companyName.trim()}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    );
  }

  if (activeTab === 'branch') {
    return (
      <>
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Manajemen Cabang</h3>
          <button className="btn-primary" onClick={openCreateBranch}><Plus size={14} /> Tambah Cabang</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Kode', 'Nama Cabang', 'Alamat', 'Telepon', 'Manager', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingBranches ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Belum ada cabang</td></tr>
              ) : branches.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                  <td className="erp-table-cell font-600">{row.name}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-[250px] truncate">{row.address || '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.phone || '—'}</td>
                  <td className="erp-table-cell">{row.manager || '—'}</td>
                  <td className="erp-table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${row.isActive ? 'status-disetujui' : 'status-draft'}`}>
                      {row.isActive ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => openEditBranch(row)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                        onClick={() => setDeleteBranchTarget(row)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ERPModal
        isOpen={branchModal !== null}
        onClose={closeBranchModal}
        title={branchModal === 'create' ? 'Tambah Cabang' : 'Edit Cabang'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={closeBranchModal} disabled={savingBranch}>Batal</button>
            <button className="btn-primary" onClick={handleSaveBranch} disabled={savingBranch}>
              {savingBranch ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="erp-form-label">Nama Cabang <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`erp-input ${branchNameError ? 'border-red-500' : ''}`}
              value={branchForm.name}
              onChange={(e) => {
                setBranchForm((f) => ({ ...f, name: e.target.value }));
                if (e.target.value.trim()) setBranchNameError('');
              }}
            />
            {branchNameError && <p className="text-xs text-red-500 mt-1">{branchNameError}</p>}
          </div>
          <div>
            <label className="erp-form-label">Alamat</label>
            <textarea
              className="erp-input resize-none"
              rows={2}
              value={branchForm.address}
              onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="erp-form-label">Telepon</label>
              <input
                type="text"
                className="erp-input"
                value={branchForm.phone}
                onChange={(e) => setBranchForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="erp-form-label">Manager</label>
              <input
                type="text"
                className="erp-input"
                value={branchForm.manager}
                onChange={(e) => setBranchForm((f) => ({ ...f, manager: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </ERPModal>

      <ConfirmModal
        isOpen={deleteBranchTarget !== null}
        onClose={() => setDeleteBranchTarget(null)}
        onConfirm={handleDeleteBranch}
        loading={deletingBranch}
        variant="danger"
        title="Hapus Cabang?"
        description={`Cabang "${deleteBranchTarget?.name}" akan dihapus dari daftar. Tindakan ini dapat dipulihkan lewat database kalau diperlukan.`}
        confirmLabel="Hapus"
      />
      </>
    );
  }

  if (activeTab === 'users') {
    return <UsersTab />;
  }

  if (activeTab === 'roles') {
    return <RolesTab />;
  }

  if (activeTab === 'demo-leads') {
    return <DemoLeadsTab />;
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
    const yy = String(new Date().getFullYear() % 100).padStart(2, '0');
    return (
      <div className="space-y-5">
        <form onSubmit={handleSaveCompanyProfile} className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4 pb-3 border-b border-border">Kode/Prefix Dokumen</h3>
          <div className="max-w-xl">
            <input
              type="text"
              maxLength={20}
              className="erp-input"
              value={documentPrefix}
              onChange={(e) => setDocumentPrefix(e.target.value)}
              disabled={loadingSettings}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Contoh: ABC atau NAMAPERUSAHAAN — akan dipakai di nomor dokumen baru, seperti INV.ABC-{yy}.0001.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Mengubah prefix ini tidak akan mempengaruhi dokumen yang sudah ada, hanya dokumen baru ke depan.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button type="submit" className="btn-primary text-xs" disabled={saving || loadingSettings || !companyName.trim()}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : <><Save size={13} /> Simpan Perubahan</>}
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={hasUnsavedDocumentPrefix || !savedDocumentPrefix}
                title={hasUnsavedDocumentPrefix ? 'Simpan perubahan Kode/Prefix Dokumen dulu sebelum menerapkannya' : undefined}
                onClick={() => setShowRegenerateConfirm(true)}
              >
                Terapkan Prefix ke Dokumen Baru
              </button>
            </div>
            {hasUnsavedDocumentPrefix && (
              <p className="text-xs text-muted-foreground mt-1">
                Simpan perubahan Kode/Prefix Dokumen di atas dulu sebelum menerapkannya ke dokumen baru.
              </p>
            )}
          </div>
        </form>

        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-700 text-foreground">Format Penomoran Dokumen</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['Modul', 'Prefix', 'Contoh Nomor Berikutnya', 'Reset Otomatis'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingNumberingConfigs ? (
                  <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">Memuat data...</td></tr>
                ) : numberingConfigs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">Belum ada data Numbering</td></tr>
                ) : numberingConfigs.map((row) => (
                  <tr key={row.docType} className="border-b border-border hover:bg-primary/5 transition-colors">
                    <td className="erp-table-cell font-600">{DOC_TYPE_LABELS[row.docType] ?? row.docType}</td>
                    <td className="erp-table-cell font-600 text-primary">{row.prefix}</td>
                    <td className="erp-table-cell font-600 text-xs">
                      {row.prefix}-{yy}.{String(row.lastNumber + 1).padStart(4, '0')}
                    </td>
                    <td className="erp-table-cell text-muted-foreground">Tidak reset otomatis (nomor terus berlanjut lintas tahun)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          isOpen={showRegenerateConfirm}
          onClose={() => setShowRegenerateConfirm(false)}
          onConfirm={handleRegeneratePrefixes}
          loading={regenerating}
          variant="default"
          title="Terapkan Prefix ke Dokumen Baru?"
          description={`Ini akan mengubah prefix nomor dokumen BARU ke depan (contoh: Q.SYN jadi Q.${savedDocumentPrefix || 'SYN'}). Dokumen yang SUDAH ADA tidak akan berubah nomornya.`}
          confirmLabel="Terapkan"
        />
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
