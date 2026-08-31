'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { usePublicCompanySettings } from '@/hooks/useCompanySettings';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { data: publicSettings } = usePublicCompanySettings();
  const companyName = publicSettings?.companyName || 'ERP System';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('Token reset tidak ditemukan di link ini'); return; }
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    if (password !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return; }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password berhasil diubah. Silakan login.');
      router.replace('/login');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <KeyRound size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-700 text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Buat Password Baru</p>
        </div>

        <form onSubmit={handleSubmit} className="erp-card shadow-card space-y-4">
          {!token && (
            <p className="text-sm text-red-600">
              Token reset tidak ditemukan. Pastikan Anda membuka link lengkap dari halaman Lupa Password.
            </p>
          )}
          <div>
            <label className="erp-form-label">Password Baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="erp-input pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="erp-form-label">Konfirmasi Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="erp-input"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading || !token}>
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-6">
          <ArrowLeft size={14} /> Kembali ke Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
