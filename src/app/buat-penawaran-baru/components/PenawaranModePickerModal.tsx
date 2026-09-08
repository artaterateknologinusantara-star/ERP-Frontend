'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, HardHat } from 'lucide-react';
import ERPModal from '@/components/ui/ERPModal';

export type PenawaranMode = 'standard' | 'civil-me';

interface Props {
  onSelect: (mode: PenawaranMode) => void;
}

const options: {
  mode: PenawaranMode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}[] = [
  {
    mode: 'standard',
    icon: FileText,
    title: 'Penawaran Existing',
    description: 'Format penawaran standar yang sudah berjalan selama ini — tabel costing per kategori item.',
  },
  {
    mode: 'civil-me',
    icon: HardHat,
    title: 'Penawaran Civil ME',
    description: 'Untuk pekerjaan Civil & Mechanical/Electrical — dilengkapi kalkulator dimensi, rekap volume per kategori, dan alokasi subkontraktor.',
  },
];

// Blocks the create-quotation form until a mode is picked — the mode then stays
// fixed for the rest of the form (no mid-form toggle).
export default function PenawaranModePickerModal({ onSelect }: Props) {
  const router = useRouter();

  return (
    <ERPModal
      isOpen
      onClose={() => router.push('/riwayat-penawaran')}
      title="Pilih Jenis Penawaran"
      subtitle="Pilihan ini menentukan bentuk form yang akan ditampilkan"
      size="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(({ mode, icon: Icon, title, description }) => (
          <button
            key={mode}
            onClick={() => onSelect(mode)}
            className="text-left p-4 rounded-lg border-2 border-border bg-card hover:border-primary/40 hover:shadow-card-hover transition-all duration-150"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Icon size={16} className="text-primary" />
            </div>
            <h4 className="text-base font-700 text-foreground mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </button>
        ))}
      </div>
    </ERPModal>
  );
}
