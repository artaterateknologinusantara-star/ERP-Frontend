'use client';

import React, { useState } from 'react';
import { Download, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface CashTransaction {
  id: string;
  no: string;
  date: string;
  type: 'Cash In' | 'Cash Out';
  category: string;
  description: string;
  amount: number;
  bank: string;
  ref: string;
}

const transactions: CashTransaction[] = [
  { id: 'ct-001', no: 'CI.SYN-26.0048', date: '10/05/2026', type: 'Cash In', category: 'Pembayaran Invoice', description: 'Pembayaran INV.SYN-26.0062 - PT Astra', amount: 1240000000, bank: 'BCA', ref: 'INV.SYN-26.0062' },
  { id: 'ct-002', no: 'CO.SYN-26.0032', date: '09/05/2026', type: 'Cash Out', category: 'Pembayaran Vendor', description: 'Pembayaran PO.SYN-26.0017 - Netviel', amount: 310000000, bank: 'Mandiri', ref: 'PO.SYN-26.0017' },
  { id: 'ct-003', no: 'CI.SYN-26.0047', date: '08/05/2026', type: 'Cash In', category: 'Pembayaran Invoice', description: 'Pembayaran INV.SYN-26.0059 - PT Pertamina', amount: 930000000, bank: 'BNI', ref: 'INV.SYN-26.0059' },
  { id: 'ct-004', no: 'CO.SYN-26.0031', date: '07/05/2026', type: 'Cash Out', category: 'Operasional', description: 'Biaya operasional kantor Mei 2026', amount: 45000000, bank: 'BCA', ref: '-' },
  { id: 'ct-005', no: 'CI.SYN-26.0046', date: '05/05/2026', type: 'Cash In', category: 'Uang Muka', description: 'DP 50% SO.SYN-26.0048 - PT Telkom', amount: 423750000, bank: 'BCA', ref: 'SO.SYN-26.0048' },
  { id: 'ct-006', no: 'CO.SYN-26.0030', date: '03/05/2026', type: 'Cash Out', category: 'Pembayaran Vendor', description: 'Pembayaran PO.SYN-26.0018 - Draka', amount: 92500000, bank: 'Mandiri', ref: 'PO.SYN-26.0018' },
];

const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

export default function CashInTable() {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(transactions.length / perPage));
  const pageData = transactions.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Transaksi Kas</h3>
          <p className="text-xs text-muted-foreground">Cash In & Cash Out terbaru</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Catat Transaksi</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. Transaksi', 'Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Jumlah', 'Bank', 'Referensi', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-600 text-primary">{row.no}</td>
                <td className="erp-table-cell text-muted-foreground">{row.date}</td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${row.type === 'Cash In' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.type}</span>
                </td>
                <td className="erp-table-cell text-muted-foreground">{row.category}</td>
                <td className="erp-table-cell max-w-[200px] truncate">{row.description}</td>
                <td className={`erp-table-cell font-600 font-tabular text-right ${row.type === 'Cash In' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {row.type === 'Cash In' ? '+' : '-'}{formatRp(row.amount)}
                </td>
                <td className="erp-table-cell text-muted-foreground">{row.bank}</td>
                <td className="erp-table-cell text-primary text-xs">{row.ref}</td>
                <td className="erp-table-cell">
                  <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Eye size={13} /></button>
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
