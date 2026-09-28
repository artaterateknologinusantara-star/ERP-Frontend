'use client';

import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SyaratKetentuanSection({ value, onChange }: Props) {
  return (
    <div className="erp-card">
      <div className="pnw-section-title">
        <span className="pnw-section-mark" />
        Syarat &amp; ketentuan
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="erp-input resize-y w-full text-base leading-relaxed min-h-[96px]"
        placeholder="Syarat & ketentuan penawaran..."
      />
      <p className="text-xs text-muted-foreground mt-2">
        Terisi otomatis dari pengaturan Profil Perusahaan, bisa diedit khusus untuk penawaran ini.
        Ditampilkan pada PDF di bawah judul &quot;SYARAT &amp; KETENTUAN&quot;, diikuti rincian Term
        Pembayaran.
      </p>
    </div>
  );
}
