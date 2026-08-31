'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, KeyRound, Copy } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import { userService, UserListItem, CreateUserDto, UpdateUserDto, RoleOption } from '@/services/user.service';
import { authService } from '@/services/auth.service';
import { formatDate } from '@/lib/format';
import type { ActiveStatus } from '@/types';

const EMPTY_FORM = { name: '', email: '', password: '', roleId: '', isActive: true };

export default function UsersTab() {
  const [users, setUsers]   = useState<UserListItem[]>([]);
  const [roles, setRoles]   = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([userService.list(), userService.listRoles()]);
      setUsers(u);
      setRoles(r);
    } catch {
      toast.error('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, roleId: roles[0]?.id ?? '' });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (u: UserListItem) => {
    setSelected(u);
    setForm({ name: u.name, email: u.email, password: '', roleId: u.roleId, isActive: u.isActive });
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!form.email.trim()) { toast.error('Email wajib diisi'); return; }
    if (!form.roleId) { toast.error('Role wajib dipilih'); return; }
    if (modal === 'create' && !form.password) { toast.error('Password wajib diisi'); return; }

    setSaving(true);
    try {
      if (modal === 'create') {
        const dto: CreateUserDto = { name: form.name, email: form.email, password: form.password, roleId: form.roleId };
        await userService.create(dto);
        toast.success('User berhasil dibuat');
      } else if (selected) {
        const dto: UpdateUserDto = { name: form.name, email: form.email, password: form.password || undefined, roleId: form.roleId, isActive: form.isActive };
        await userService.update(selected.id, dto);
        toast.success('User berhasil diperbarui');
      }
      closeModal();
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.delete(deleteTarget.id);
      toast.success('User berhasil dihapus');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Gagal menghapus user');
    } finally {
      setDeleting(false);
    }
  };

  const openReset = (u: UserListItem) => {
    setResetTarget(u);
    setResetLink(null);
  };

  const closeReset = () => { setResetTarget(null); setResetLink(null); };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await authService.forgotPassword(resetTarget.email);
      if (res.resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${res.resetToken}`);
      } else {
        toast.error('Token reset tidak diterima dari server');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat link reset password');
    } finally {
      setResetting(false);
    }
  };

  const handleCopyResetLink = async () => {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    toast.success('Link disalin');
  };

  const f = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div>
      <label className="erp-form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        className="erp-input"
        value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </div>
  );

  return (
    <>
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Manajemen Pengguna</h3>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Tambah User</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama', 'Email', 'Role', 'Status', 'Login Terakhir', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="erp-table-cell text-center py-8 text-muted-foreground">Belum ada user</td></tr>
              ) : users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => openEdit(u)}
                >
                  <td className="erp-table-cell font-600">{u.name}</td>
                  <td className="erp-table-cell text-muted-foreground">{u.email}</td>
                  <td className="erp-table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 status-terkirim">{u.roleName}</span>
                  </td>
                  <td className="erp-table-cell">
                    <StatusBadge status={(u.isActive ? 'Aktif' : 'Tidak Aktif') as ActiveStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell text-muted-foreground">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
                  </td>
                  <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600" onClick={() => openEdit(u)}><Edit2 size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600" title="Reset Password" onClick={() => openReset(u)}><KeyRound size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTarget(u)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ERPModal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modal === 'create' ? 'Tambah User' : 'Edit User'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {f('Nama Lengkap', 'name', 'text', true)}
          {f('Email', 'email', 'email', true)}
          <div>
            <label className="erp-form-label">
              Password{modal === 'edit' && <span className="text-xs text-muted-foreground ml-1">(kosongkan jika tidak diubah)</span>}
              {modal === 'create' && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              type="password"
              className="erp-input"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              autoComplete="new-password"
              placeholder={modal === 'edit' ? '••••••••' : ''}
            />
          </div>
          <div>
            <label className="erp-form-label">Role <span className="text-red-500">*</span></label>
            <select className="erp-input" value={form.roleId} onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
              <option value="">— Pilih role —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {modal === 'edit' && (
            <div className="flex items-center gap-3">
              <label className="erp-form-label mb-0">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <span className="text-[13px]">{form.isActive ? 'Aktif' : 'Tidak Aktif'}</span>
              </label>
            </div>
          )}
        </div>
      </ERPModal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus User?"
        description={`User "${deleteTarget?.name}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        loading={deleting}
      />

      <ERPModal
        isOpen={!!resetTarget}
        onClose={closeReset}
        title={`Reset Password — ${resetTarget?.name ?? ''}`}
        size="md"
        footer={
          resetLink ? (
            <button className="btn-secondary" onClick={closeReset}>Selesai</button>
          ) : (
            <>
              <button className="btn-secondary" onClick={closeReset} disabled={resetting}>Batal</button>
              <button className="btn-primary" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Membuat link...' : 'Buat Link Reset'}
              </button>
            </>
          )
        }
      >
        {!resetLink ? (
          <p className="text-sm text-muted-foreground">
            Sistem belum terhubung ke server email, jadi link reset perlu dikirim manual ke user
            (chat/telepon) setelah dibuat di sini.
          </p>
        ) : (
          <div className="space-y-2">
            <label className="erp-form-label">Link Reset Password</label>
            <div className="flex items-center gap-2">
              <input readOnly value={resetLink} className="erp-input text-xs" />
              <button type="button" className="btn-secondary shrink-0 px-2.5" onClick={handleCopyResetLink} title="Salin link">
                <Copy size={14} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Link berlaku selama 30 menit. Kirim ke user ini secara manual.</p>
          </div>
        )}
      </ERPModal>
    </>
  );
}
