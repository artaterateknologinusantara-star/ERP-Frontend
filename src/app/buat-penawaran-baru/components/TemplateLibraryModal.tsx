'use client';

import React, { useState } from 'react';
import ERPModal from '@/components/ui/ERPModal';
import { Search, ChevronDown, BookOpen } from 'lucide-react';
import type { CostingTab } from '@/types';

interface Template {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  jumlahItem: number;
  estimasiNilai: string;
  tabs: CostingTab[];
}

const templateLibrary: Template[] = [
  {
    id: 'tpl-cctv-office',
    nama: 'CCTV Office Installation',
    kategori: 'CCTV',
    deskripsi: 'Template standar instalasi CCTV untuk gedung perkantoran 4–8 lantai. Mencakup IP camera indoor/outdoor, NVR, HDD, dan kabel.',
    jumlahItem: 18,
    estimasiNilai: 'Rp 150–400 Jt',
    tabs: [],
  },
  {
    id: 'tpl-fiber-backbone',
    nama: 'Fiber Optic Backbone',
    kategori: 'Fiber Optic',
    deskripsi: 'Template backbone fiber optic antar gedung atau antar lantai. Single mode 12 core, ODF, patch cord, dan splicing.',
    jumlahItem: 12,
    estimasiNilai: 'Rp 80–250 Jt',
    tabs: [],
  },
  {
    id: 'tpl-wifi-office',
    nama: 'WiFi Office Deployment',
    kategori: 'Wireless',
    deskripsi: 'Deployment WiFi 6 enterprise untuk kantor. Mencakup AP, controller, PoE switch, kabel UTP, dan konfigurasi SSID.',
    jumlahItem: 22,
    estimasiNilai: 'Rp 120–350 Jt',
    tabs: [],
  },
  {
    id: 'tpl-datacenter-rack',
    nama: 'Data Center Rack System',
    kategori: 'Data Center',
    deskripsi: 'Sistem rack data center lengkap. Server rack, PDU, patch panel, cable management, grounding, dan UPS.',
    jumlahItem: 28,
    estimasiNilai: 'Rp 300–800 Jt',
    tabs: [],
  },
  {
    id: 'tpl-access-door',
    nama: 'Access Door System',
    kategori: 'Access Control',
    deskripsi: 'Sistem akses pintu dengan card reader, controller, elektrik lock, dan integrasi ke sistem CCTV.',
    jumlahItem: 15,
    estimasiNilai: 'Rp 50–180 Jt',
    tabs: [],
  },
  {
    id: 'tpl-network-smb',
    nama: 'Network SMB Package',
    kategori: 'Networking',
    deskripsi: 'Paket jaringan untuk perusahaan menengah. Core switch, access switch, firewall, AP, dan UTP cabling.',
    jumlahItem: 20,
    estimasiNilai: 'Rp 200–500 Jt',
    tabs: [],
  },
];

const kategoriOptions = ['Semua', 'CCTV', 'Fiber Optic', 'Wireless', 'Data Center', 'Access Control', 'Networking'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (tabs: CostingTab[]) => void;
}

export default function TemplateLibraryModal({ isOpen, onClose, onLoadTemplate }: Props) {
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('Semua');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = templateLibrary.filter((t) => {
    const matchSearch = t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.deskripsi.toLowerCase().includes(search.toLowerCase());
    const matchKat = kategori === 'Semua' || t.kategori === kategori;
    return matchSearch && matchKat;
  });

  const selectedTemplate = templateLibrary.find((t) => t.id === selected);

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    // In real app, load template.tabs from backend
    // backend integration point: fetch template detail by selectedTemplate.id
    onLoadTemplate(selectedTemplate.tabs.length > 0 ? selectedTemplate.tabs : []);
  };

  const kategoriColors: Record<string, string> = {
    CCTV: 'bg-violet-100 text-violet-700',
    'Fiber Optic': 'bg-orange-100 text-orange-700',
    Wireless: 'bg-sky-100 text-sky-700',
    'Data Center': 'bg-blue-100 text-blue-700',
    'Access Control': 'bg-green-100 text-green-700',
    Networking: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title="Template Library"
      subtitle="Pilih template untuk mengisi struktur costing penawaran"
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Batal</button>
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={handleUseTemplate}
          >
            <BookOpen size={14} /> Gunakan Template
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Cari template..."
              className="erp-input pl-8 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="erp-input appearance-none pr-8 min-w-[160px]"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {kategoriOptions.map((k) => (
                <option key={`kat-${k}`} value={k}>{k}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-base text-muted-foreground">{filtered.length} template</span>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl.id === selected ? null : tpl.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all duration-150 hover:shadow-card-hover
                ${selected === tpl.id
                  ? 'border-primary bg-primary/5 shadow-card'
                  : 'border-border bg-card hover:border-primary/40'
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${kategoriColors[tpl.kategori] || 'bg-muted text-muted-foreground'}`}>
                  {tpl.kategori}
                </span>
                {selected === tpl.id && (
                  <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </span>
                )}
              </div>
              <h4 className="text-base font-700 text-foreground mb-1">{tpl.nama}</h4>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tpl.deskripsi}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tpl.jumlahItem} item</span>
                <span className="font-600 text-foreground">{tpl.estimasiNilai}</span>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-xl font-600">Tidak ada template ditemukan</p>
            <p className="text-base mt-1">Coba ubah kata kunci atau filter kategori</p>
          </div>
        )}

        {/* Selected Preview */}
        {selectedTemplate && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 animate-slide-up">
            <p className="text-base font-700 text-primary mb-1">Template Dipilih: {selectedTemplate.nama}</p>
            <p className="text-xs text-muted-foreground">{selectedTemplate.deskripsi}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{selectedTemplate.jumlahItem} item siap dimuat</span>
              <span>Estimasi nilai: {selectedTemplate.estimasiNilai}</span>
            </div>
          </div>
        )}
      </div>
    </ERPModal>
  );
}