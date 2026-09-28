import React from 'react';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './penawaran-theme.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

// Tema visual "enterprise" (palet navy + IBM Plex Sans/Mono, lihat penawaran-theme.css) — scoped
// ke class `pnw-theme` di sini, hanya berlaku untuk route /buat-penawaran-baru. Root layout
// (src/app/layout.tsx) dan tailwind.css global TIDAK disentuh, jadi 50+ halaman ERP lain tetap
// pakai palet biru/Plus Jakarta Sans seperti semula.
export default function BuatPenawaranBaruLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pnw-theme ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>{children}</div>
  );
}
