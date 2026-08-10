'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { usePublicCompanySettings } from '@/hooks/useCompanySettings';

interface LoginResponse {
  token: string;
  name: string;
  email: string;
  role: string;
  expiresAt: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { data: publicSettings } = usePublicCompanySettings();
  const companyName = publicSettings?.companyName || 'ERP System';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('syntera_token')) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return; }
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      localStorage.setItem('syntera_token', res.data.token);
      localStorage.setItem('syntera_user', JSON.stringify({ name: res.data.name, email: res.data.email, role: res.data.role }));
      toast.success(`Selamat datang, ${res.data.name}`);
      router.replace('/');
    } catch {
      toast.error('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <LogIn size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-700 text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Masuk ke akun Anda</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="erp-card shadow-card space-y-4">
          <div>
            <label className="erp-form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@perusahaan.id"
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
