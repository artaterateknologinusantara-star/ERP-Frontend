'use client';

import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CatatanTambahanSection({ value, onChange }: Props) {
  return (
    <div className="erp-card shadow-card">
      <div className="erp-section-header">Catatan Tambahan</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="erp-input resize-none w-full text-base leading-relaxed"
        placeholder="Tambahkan catatan atau informasi tambahan untuk penawaran ini..."
      />
      <p className="text-xs text-muted-foreground mt-2">
        Catatan ini akan ditampilkan pada dokumen penawaran yang dikirim ke pelanggan.
      </p>
    </div>
  );
}
