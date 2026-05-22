'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface ARRecord {
  id: string;
  customer: string;
  totalInvoice: number;
  paid: number;
  outstanding: number;
  aging0_30: number;
  aging31_60: number;
  aging61_90: number;
  agingOver90: number;
  lastPayment: string;
}

const arData: ARRecord[] = [
  { id: 'ar-001', customer: 'PT Telkom Indonesia', totalInvoice: 847500000, paid: 0, outstanding: 847500000, aging0_30: 847500000, aging31_60: 0, aging61_90: 0, agingOver90: 0, lastPayment: '-' },
  { id: 'ar-002', customer: 'PT Bank Central Asia', totalInvoice: 312000000, paid: 156000000, outstanding: 156000000, aging0_30: 156000000, aging31_60: 0, aging61_90: 0, agingOver90: 0, lastPayment: '01/05/2026' },
  { id: 'ar-003', customer: 'PT Wijaya Karya', totalInvoice: 560000000, paid: 0, outstanding: 560000000, aging0_30: 0, aging31_60: 560000000, aging61_90: 0, agingOver90: 0, lastPayment: '-' },
  { id: 'ar-004', customer: 'PT Garuda Indonesia', totalInvoice: 215000000, paid: 100000000, outstanding: 115000000, aging0_30: 0, aging31_60: 115000000, aging61_90: 0, agingOver90: 0, lastPayment: '15/04/2026' },
  { id: 'ar-005', customer: 'PT Semen Indonesia', totalInvoice: 685000000, paid: 0, outstanding: 685000000, aging0_30: 0, aging31_60: 0, aging61_90: 685000000, agingOver90: 0, lastPayment: '-' },
  { id: 'ar-006', customer: 'PT Indosat Ooredoo', totalInvoice: 185000000, paid: 0, outstanding: 185000000, aging0_30: 0, aging31_60: 0, aging61_90: 0, agingOver90: 185000000, lastPayment: '-' },
];

const formatRp = (val: number) => val === 0 ? '-' : 'Rp ' + val.toLocaleString('id-ID');

export default function ARTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return arData;
    const q = search.toLowerCase();
    return arData.filter((r) => r.customer.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-[13px] font-700 text-foreground">Aging Report — Piutang Pelanggan</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Ringkasan piutang berdasarkan umur tagihan</p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Cari pelanggan..." className="erp-input pl-8 w-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Terima Pembayaran</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Customer', 'Total Invoice', 'Terbayar', 'Outstanding', '0-30 Hari', '31-60 Hari', '61-90 Hari', '>90 Hari', 'Pembayaran Terakhir', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-600">{row.customer}</td>
                <td className="erp-table-cell font-tabular text-right">{formatRp(row.totalInvoice)}</td>
                <td className="erp-table-cell font-tabular text-right text-emerald-600">{formatRp(row.paid)}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-primary">{formatRp(row.outstanding)}</td>
                <td className="erp-table-cell font-tabular text-right text-slate-600">{formatRp(row.aging0_30)}</td>
                <td className="erp-table-cell font-tabular text-right text-amber-600">{formatRp(row.aging31_60)}</td>
                <td className="erp-table-cell font-tabular text-right text-orange-600">{formatRp(row.aging61_90)}</td>
                <td className="erp-table-cell font-tabular text-right text-red-600">{formatRp(row.agingOver90)}</td>
                <td className="erp-table-cell text-muted-foreground">{row.lastPayment}</td>
                <td className="erp-table-cell">
                  <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Eye size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary/5 border-t-2 border-primary/20">
              <td className="erp-table-cell font-700 text-foreground">TOTAL</td>
              <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(arData.reduce((s, r) => s + r.totalInvoice, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">{formatRp(arData.reduce((s, r) => s + r.paid, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-primary">{formatRp(arData.reduce((s, r) => s + r.outstanding, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(arData.reduce((s, r) => s + r.aging0_30, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-amber-600">{formatRp(arData.reduce((s, r) => s + r.aging31_60, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-orange-600">{formatRp(arData.reduce((s, r) => s + r.aging61_90, 0))}</td>
              <td className="erp-table-cell font-700 font-tabular text-right text-red-600">{formatRp(arData.reduce((s, r) => s + r.agingOver90, 0))}</td>
              <td className="erp-table-cell" colSpan={2}></td>
            </tr>
          </tfoot>
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
