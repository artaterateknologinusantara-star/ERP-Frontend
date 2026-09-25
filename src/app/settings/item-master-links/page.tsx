'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link2, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ItemAutocomplete from '@/app/buat-penawaran-baru/components/ItemAutocomplete';
import { catalogLinkService, UnlinkedCatalogItem } from '@/services/catalogLink.service';
import type { ItemMaster } from '@/types';

// Layar admin sederhana untuk beres-beres data lama: baris Quotation/Sales Order yang belum ada
// ItemMasterId (dari sebelum field ini ada, atau dari SO lama sebelum fallback tebak-nama
// dihapus — lihat insiden "Server Blade 2U"). TIDAK ADA auto-backfill fuzzy — admin pilih link
// yang benar satu-satu, kapan pun mereka mau. Bukan proses otomatis.
export default function ItemMasterLinksPage() {
  const [items, setItems] = useState<UnlinkedCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<Record<string, string>>({});
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await catalogLinkService.getUnlinked());
    } catch {
      toast.error('Gagal memuat daftar item belum terhubung');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLink = async (item: UnlinkedCatalogItem, master: ItemMaster) => {
    setLinkingId(item.itemRowId);
    try {
      await catalogLinkService.link(item.sourceType, item.itemRowId, master.id);
      toast.success(`${item.sourceNo} berhasil ditautkan ke ${master.name}`);
      setItems((prev) => prev.filter((x) => x.itemRowId !== item.itemRowId));
      setSearch((prev) => {
        const next = { ...prev };
        delete next[item.itemRowId];
        return next;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menautkan item');
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <AppLayout
      title="Item Belum Terhubung"
      breadcrumbs={[{ label: 'Settings' }, { label: 'Item Belum Terhubung' }]}
    >
      <div className="erp-card shadow-card">
        <h3 className="text-sm font-700 text-foreground mb-1 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-amber-600" />
          Baris Quotation / Sales Order Belum Terhubung ke Item Master
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Daftar ini berisi baris lama yang belum ada link eksplisit ke Item Master — biasanya dari sebelum
          fitur link ini ada. Tidak ada tebakan otomatis: pilih Item Master yang benar untuk setiap baris.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Semua baris sudah terhubung ke Item Master. 🎉</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.itemRowId} className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5">
                <span className="text-[11px] font-600 px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  {item.sourceType === 'Quotation' ? 'Penawaran' : 'Sales Order'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-600">{item.sourceNo}</span>
                  <span className="text-[13px] text-muted-foreground ml-2">{item.description}</span>
                  <span className="text-[11px] text-muted-foreground ml-2">
                    Sku: {item.sku || '—'} · Qty: {item.qty} {item.uom}
                  </span>
                </div>
                <div className="w-72">
                  <ItemAutocomplete
                    value={search[item.itemRowId] ?? ''}
                    onChange={(v) => setSearch((prev) => ({ ...prev, [item.itemRowId]: v }))}
                    onSelect={(master) => handleLink(item, master)}
                  />
                </div>
                {linkingId === item.itemRowId && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 size={12} className="animate-pulse" /> Menautkan...
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
