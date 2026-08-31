'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  roleService, RoleListItem, ModulePermission,
  PERMISSION_ACTIONS, PERMISSION_ACTION_LABELS, MODULE_LABELS,
} from '@/services/role.service';
import type { ActiveStatus } from '@/types';

const EMPTY_FORM = { name: '', description: '', isActive: true };
const ADMIN_ROLE_NAME = 'Administrator';

function emptyPermission(module: string): ModulePermission {
  return { module, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
}

export default function RolesTab() {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<RoleListItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [permMatrix, setPermMatrix] = useState<ModulePermission[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([roleService.list(), roleService.listModules()]);
      setRoles(r);
      setModules(m);
    } catch {
      toast.error('Gagal memuat data role');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAdminRole = selected?.name === ADMIN_ROLE_NAME;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPermMatrix(modules.map(emptyPermission));
    setSelected(null);
    setModal('create');
  };

  const openEdit = (r: RoleListItem) => {
    setSelected(r);
    setForm({ name: r.name, description: r.description ?? '', isActive: r.isActive });
    setPermMatrix(modules.map((m) => r.permissions.find((p) => p.module === m) ?? emptyPermission(m)));
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const togglePerm = (module: string, action: keyof Omit<ModulePermission, 'module'>) => {
    setPermMatrix((prev) => prev.map((p) => (p.module === module ? { ...p, [action]: !p[action] } : p)));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama role wajib diisi'); return; }

    setSaving(true);
    try {
      const activePermissions = permMatrix.filter(
        (p) => p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove
      );

      if (modal === 'create') {
        const created = await roleService.create({ name: form.name, description: form.description || undefined });
        if (activePermissions.length > 0) {
          await roleService.updatePermissions(created.data.id, activePermissions);
        }
        toast.success('Role berhasil dibuat');
      } else if (selected) {
        await roleService.update(selected.id, { name: form.name, description: form.description || undefined, isActive: form.isActive });
        if (!isAdminRole) {
          await roleService.updatePermissions(selected.id, activePermissions);
        }
        toast.success('Role berhasil diperbarui');
      }
      closeModal();
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.delete(deleteTarget.id);
      toast.success('Role berhasil dihapus');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus role');
    } finally {
      setDeleting(false);
    }
  };

  const accessSummary = (r: RoleListItem) => {
    if (r.name === ADMIN_ROLE_NAME) return 'Semua modul';
    const active = r.permissions.filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove);
    if (active.length === 0) return '— Belum ada akses —';
    return active.map((p) => MODULE_LABELS[p.module] ?? p.module).join(', ');
  };

  return (
    <>
      <div className="erp-card shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-700 text-foreground">Manajemen Role</h3>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Tambah Role</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-border bg-muted/40">
                {['Nama Role', 'Deskripsi', 'Jumlah User', 'Akses Modul', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={6} className="erp-table-cell text-center py-8 text-muted-foreground">Belum ada role</td></tr>
              ) : roles.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors group cursor-pointer"
                  onClick={() => openEdit(r)}
                >
                  <td className="erp-table-cell font-600">{r.name}</td>
                  <td className="erp-table-cell text-muted-foreground">{r.description || '—'}</td>
                  <td className="erp-table-cell text-center font-600">{r.userCount}</td>
                  <td className="erp-table-cell text-muted-foreground max-w-xs truncate" title={accessSummary(r)}>{accessSummary(r)}</td>
                  <td className="erp-table-cell">
                    <StatusBadge status={(r.isActive ? 'Aktif' : 'Tidak Aktif') as ActiveStatus} size="sm" />
                  </td>
                  <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600" onClick={() => openEdit(r)}>
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={r.name === ADMIN_ROLE_NAME ? 'Role Administrator tidak dapat dihapus' : 'Hapus role'}
                        disabled={r.name === ADMIN_ROLE_NAME}
                        onClick={() => setDeleteTarget(r)}
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

      {/* Create / Edit role, incl. module access matrix */}
      <ERPModal
        isOpen={modal !== null}
        onClose={closeModal}
        title={modal === 'create' ? 'Tambah Role' : 'Edit Role'}
        subtitle={
          modal === 'create'
            ? 'Tentukan aksi yang boleh dilakukan role ini pada tiap modul. Kosongkan modul yang tidak relevan.'
            : isAdminRole
              ? 'Role Administrator selalu memiliki akses penuh dan tidak dapat diubah.'
              : 'Centang aksi yang boleh dilakukan role ini pada tiap modul. Kosongkan semua untuk mencabut akses modul tersebut.'
        }
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="erp-form-label">Nama Role <span className="text-red-500">*</span></label>
              <input
                className="erp-input"
                value={form.name}
                disabled={isAdminRole}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="erp-form-label">Deskripsi</label>
              <input
                className="erp-input"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          {modal === 'edit' && (
            <div className="flex items-center gap-3">
              <label className="erp-form-label mb-0">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.isActive}
                  disabled={isAdminRole}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <span className="text-[13px]">{form.isActive ? 'Aktif' : 'Tidak Aktif'}</span>
              </label>
            </div>
          )}

          <div>
            <label className="erp-form-label">Akses Modul</label>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    <th className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">Modul</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="erp-table-cell text-center text-muted-foreground font-600 text-xs uppercase tracking-wider">
                        {PERMISSION_ACTION_LABELS[a]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(isAdminRole
                    ? modules.map((m) => ({ module: m, canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true }))
                    : permMatrix
                  ).map((row) => (
                    <tr key={row.module} className="border-b border-border last:border-b-0">
                      <td className="erp-table-cell font-600">{MODULE_LABELS[row.module] ?? row.module}</td>
                      {PERMISSION_ACTIONS.map((a) => (
                        <td key={a} className="erp-table-cell text-center">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={row[a]}
                            disabled={isAdminRole}
                            onChange={() => togglePerm(row.module, a)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ERPModal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Role?"
        description={`Role "${deleteTarget?.name}" akan dihapus permanen. Role yang masih dipakai user aktif tidak dapat dihapus.`}
        confirmLabel="Hapus"
        loading={deleting}
      />
    </>
  );
}
