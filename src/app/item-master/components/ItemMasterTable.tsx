'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Download, Plus, Eye, Edit2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { itemMasterService } from '@/services/itemmaster.service';
import type { ItemMaster } from '@/types';
import { formatRp } from '@/lib/format';

const PER_PAGE = 10;

export default function ItemMasterTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await itemMasterService.list({ page: p, perPage: PER_PAGE, search: q || undefined });
      setItems(res.data as ItemMaster[]);
      setTotal(res.total);
    } catch {
      toast.error('Gagal memuat data item master');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search, page), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="erp-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode, nama item, kategori, brand..."
            className="erp-input pl-8 w-full"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{total} item</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Tambah Item</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Item', 'Kategori', 'Brand', 'UoM', 'Stok', 'Min Stok', 'Harga', 'Gudang', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data item master...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="erp-table-cell text-center py-8 text-muted-foreground">
                  {search ? `Tidak ada item ditemukan untuk "${search}".` : 'Belum ada data item master.'}
                </td>
              </tr>
            ) : items.map((row) => {
              const isLow = row.stock <= row.minStock;
              return (
                <tr key={row.id} className={`border-b border-border hover:bg-primary/5 transition-colors ${isLow ? 'bg-amber-50/30' : ''}`}>
                  <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                  <td className="erp-table-cell font-500">
                    <div className="flex items-center gap-1.5">
                      {isLow && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
                      {row.name}
                    </div>
                  </td>
                  <td className="erp-table-cell text-muted-foreground">{row.category ?? '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.brand ?? '—'}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.uom}</td>
                  <td className={`erp-table-cell font-700 font-tabular text-right ${isLow ? 'text-amber-600' : 'text-foreground'}`}>
                    {row.stock.toLocaleString('id-ID')}
                  </td>
                  <td className="erp-table-cell font-tabular text-right text-muted-foreground">{row.minStock.toLocaleString('id-ID')}</td>
                  <td className="erp-table-cell font-tabular text-right">{formatRp(row.price)}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.warehouse ?? '—'}</td>
                  <td className="erp-table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 ${
                      row.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Lihat detail">
                        <Eye size={13} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          Halaman {page} dari {totalPages} &bull; {total} item
        </span>
        <div className="flex items-center gap-1">
          <button
            className="btn-secondary py-1 px-2.5 text-xs"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            className="btn-secondary py-1 px-2.5 text-xs"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
