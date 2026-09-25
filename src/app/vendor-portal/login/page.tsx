'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { vendorApi } from '@/lib/vendorApi';
import { usePublicCompanySettings } from '@/hooks/useCompanySettings';
import AnonymousLogo from '@/components/AnonymousLogo';
import type { VendorUser } from '@/types';

interface VendorLoginResponse {
  token: string;
  name: string;
  email: string;
  supplierId: string;
  supplierName: string;
  expiresAt: string;
}

export default function VendorLoginPage() {
  const router = useRouter();
  const { data: publicSettings } = usePublicCompanySettings();
  const companyName = publicSettings?.companyName || 'ERP System';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('vendor_token')) {
      router.replace('/vendor-portal/rab-requests');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return; }
    setLoading(true);
    try {
      const res = await vendorApi.post<VendorLoginResponse>('/vendor/auth/login', { email, password });
      localStorage.setItem('vendor_token', res.data.token);
      const vendorUser: VendorUser = {
        name: res.data.name,
        email: res.data.email,
        supplierId: res.data.supplierId,
        supplierName: res.data.supplierName,
      };
      localStorage.setItem('vendor_user', JSON.stringify(vendorUser));
      toast.success(`Selamat datang, ${res.data.name}`);
      router.replace('/vendor-portal/rab-requests');
    } catch {
      toast.error('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <AnonymousLogo hasLogo={publicSettings?.hasLogo} className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-700 text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal Vendor — Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="erp-card shadow-card space-y-4">
          <div>
            <label className="erp-form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@vendor.id"
              className="erp-input"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="erp-form-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="erp-input pr-10"
                autoComplete="current-password"
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

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-3.5 h-3.5 border-2 border-blue-200 border-t-white rounded-full animate-spin" />
                Masuk...
              </span>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {companyName} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
