'use client';

import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { BASE_URL } from '@/lib/api';

interface Props {
  hasLogo?: boolean;
  className?: string;
}

// GET /company-settings/logo is [AllowAnonymous] server-side (renders on pre-login screens where
// no JWT exists yet) — unlike Sidebar.tsx's authenticated blob-fetch, a plain <img src> works.
export default function AnonymousLogo({ hasLogo, className = '' }: Props) {
  const [errored, setErrored] = useState(false);

  if (hasLogo === false || errored) {
    return (
      <div className={`rounded-2xl bg-primary flex items-center justify-center ${className}`}>
        <LogIn size={22} className="text-white" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE_URL}/company-settings/logo`}
      alt="Logo perusahaan"
      className={`object-contain ${className}`}
      onError={() => setErrored(true)}
    />
  );
}
