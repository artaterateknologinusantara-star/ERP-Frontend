'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, Edit2, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  city: string;
  rating: number;
  totalPO: number;
  status: 'Aktif' | 'Tidak Aktif';
}

const vendorData: Vendor[] = [
  { id: 'v-001', code: 'VND-001', name: 'PT Ruijie Networks Indonesia', category: 'Network Equipment', contact: 'Andi Wijaya', phone: '021-5551234', city: 'Jakarta', rating: 5, totalPO: 12, status: 'Aktif' },
  { id: 'v-002', code: 'VND-002', name: 'PT Draka Indonesia', category: 'Cabling', contact: 'Budi Hartono', phone: '021-5552345', city: 'Jakarta', rating: 4, totalPO: 8, status: 'Aktif' },
  { id: 'v-003', code: 'VND-003', name: 'PT Netviel Distributor', category: 'Fiber Optic', contact: 'Citra Dewi', phone: '022-5553456', city: 'Bandung', rating: 5, totalPO: 15, status: 'Aktif' },
  { id: 'v-004', code: 'VND-004', name: 'PT Indorack Multikreasi', category: 'Rack & Cabinet', contact: 'Doni Setiawan', phone: '021-5554567', city: 'Tangerang', rating: 4, totalPO: 6, status: 'Aktif' },
  { id: 'v-005', code: 'VND-005', name: 'CV Mitra Teknologi', category: 'Accessories', contact: 'Eka Putri', phone: '031-5555678', city: 'Surabaya', rating: 3, totalPO: 4, status: 'Aktif' },
  { id: 'v-006', code: 'VND-006', name: 'PT Cisco Systems Indonesia', category: 'Network Equipment', contact: 'Fajar Nugroho', phone: '021-5556789', city: 'Jakarta', rating: 5, totalPO: 20, status: 'Aktif' },
  { id: 'v-007', code: 'VND-007', name: 'PT Hikvision Indonesia', category: 'CCTV', contact: 'Gita Sari', phone: '021-5557890', city: 'Jakarta', rating: 4, totalPO: 9, status: 'Aktif' },
  { id: 'v-008', code: 'VND-008', name: 'CV Solusi Jaringan', category: 'Accessories', contact: 'Hendra Kusuma', phone: '024-5558901', city: 'Semarang', rating: 3, totalPO: 2, status: 'Tidak Aktif' },
];

export default function VendorTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return vendorData;
    const q = search.toLowerCase();
    return vendorData.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.city.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Cari nama vendor, kategori, kota..." className="erp-input pl-8 w-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} vendor</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Tambah Vendor</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Vendor', 'Kategori', 'Contact', 'Telepon', 'Kota', 'Rating', 'Total PO', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                <td className="erp-table-cell font-600">{row.name}</td>
                <td className="erp-table-cell text-muted-foreground">{row.category}</td>
                <td className="erp-table-cell">{row.contact}</td>
                <td className="erp-table-cell text-muted-foreground">{row.phone}</td>
                <td className="erp-table-cell text-muted-foreground">{row.city}</td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < row.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'} />
                    ))}
                  </div>
                </td>
                <td className="erp-table-cell text-center font-600">{row.totalPO}</td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${row.status === 'Aktif' ? 'status-disetujui' : 'status-draft'}`}>{row.status}</span>
                </td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Eye size={13} /></button>
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Edit2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</span>
        <div className="flex items-center gap-1">
          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></button>
          <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></button>
        </div>
      </div>
    </div>
  );
}
