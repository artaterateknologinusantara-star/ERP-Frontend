'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';
import StatusBadge from '@/components/ui/StatusBadge';
import RowActionMenu from '@/components/ui/RowActionMenu';
import { supplierPortalUserService } from '@/services/supplierPortalUser.service';
import { formatDate } from '@/lib/format';
import type { ActiveStatus } from '@/types';

interface Props {
  supplierId: string;
}

const EMPTY_FORM = { name: '', email: '', password: '' };

export default function SupplierPortalUsersPanel({ supplierId }: Props) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-portal-users', supplierId],
    queryFn: () => supplierPortalUserService.list(supplierId),
  });
  const users = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['supplier-portal-users', supplierId] });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error('Nama, email wajib diisi dan password minimal 8 karakter');
      return;
    }
    setSaving(true);
    try {
      await supplierPortalUserService.create(supplierId, form);
      toast.success('Akun portal vendor berhasil dibuat');
      setForm(EMPTY_FORM);
      setShowCreate(false);
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat akun portal vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await supplierPortalUserService.deactivate(supplierId, id);
        toast.success('Akun dinonaktifkan');
      } else {
        await supplierPortalUserService.activate(supplierId, id);
        toast.success('Akun diaktifkan');
      }
      invalidate();
    } catch {
      toast.error('Gagal mengubah status akun');
    }
  };

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Akun Portal Vendor</p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-600 text-primary hover:underline"
        >
          <Plus size={12} /> Tambah Akun
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Memuat...</p>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada akun login portal vendor.</p>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-xs border border-border rounded-md p-2">
              <div>
                <p className="font-600">{u.name}</p>
                <p className="text-muted-foreground">{u.email}</p>
                <p className="text-muted-foreground">
                  {u.lastLoginAt ? `Login terakhir: ${formatDate(u.lastLoginAt)}` : 'Belum pernah login'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={(u.isActive ? 'Aktif' : 'Tidak Aktif') as ActiveStatus} size="sm" />
                <RowActionMenu items={[
                  {
                    label: u.isActive ? 'Nonaktifkan' : 'Aktifkan',
                    onClick: () => handleToggle(u.id, u.isActive),
                    danger: u.isActive,
                  },
                ]} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ERPModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tambah Akun Portal Vendor"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Batal</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="erp-form-label">Nama PIC</label>
            <input type="text" className="erp-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="erp-form-label">Email</label>
            <input type="email" className="erp-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="erp-form-label">Password (min. 8 karakter)</label>
            <input type="text" className="erp-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <p className="text-[11px] text-muted-foreground mt-1">Beritahukan password ini ke vendor secara manual — belum ada pengiriman email undangan.</p>
          </div>
        </div>
      </ERPModal>
    </div>
  );
}
