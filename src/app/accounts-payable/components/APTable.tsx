'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

type APStatus = 'Draft' | 'Waiting Payment' | 'Partial Paid' | 'Paid' | 'Overdue';

interface APRecord {
  id: string;
  no: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: APStatus;
}

const apData: APRecord[] = [
  { id: 'ap-001', no: 'SINV.SYN-26.0032', vendor: 'PT Ruijie Networks Indonesia', invoiceDate: '05/05/2026', dueDate: '04/06/2026', amount: 420000000, paid: 0, status: 'Waiting Payment' },
  { id: 'ap-002', no: 'SINV.SYN-26.0031', vendor: 'PT Draka Indonesia', invoiceDate: '03/05/2026', dueDate: '02/06/2026', amount: 185000000, paid: 92500000, status: 'Partial Paid' },
  { id: 'ap-003', no: 'SINV.SYN-26.0030', vendor: 'PT Netviel Distributor', invoiceDate: '28/04/2026', dueDate: '28/05/2026', amount: 310000000, paid: 310000000, status: 'Paid' },
  { id: 'ap-004', no: 'SINV.SYN-26.0029', vendor: 'PT Indorack Multikreasi', invoiceDate: '20/04/2026', dueDate: '20/05/2026', amount: 95000000, paid: 0, status: 'Overdue' },
  { id: 'ap-005', no: 'SINV.SYN-26.0028', vendor: 'CV Mitra Teknologi', invoiceDate: '15/04/2026', dueDate: '15/05/2026', amount: 67000000, paid: 0, status: 'Overdue' },
  { id: 'ap-006', no: 'SINV.SYN-26.0027', vendor: 'PT Cisco Systems Indonesia', invoiceDate: '10/04/2026', dueDate: '10/05/2026', amount: 820000000, paid: 0, status: 'Draft' },
];

const statusColors: Record<APStatus, string> = {
  Draft: 'status-draft',
  'Waiting Payment': 'status-terkirim',
  'Partial Paid': 'bg-amber-100 text-amber-700',
  Paid: 'status-disetujui',
  Overdue: 'status-ditolak',
};

const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

export default function APTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return apData;
    const q = search.toLowerCase();
    return apData.filter((r) => r.no.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Cari no. invoice, vendor..." className="erp-input pl-8 w-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} hutang</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Catat Hutang</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. Invoice', 'Vendor', 'Tgl Invoice', 'Jatuh Tempo', 'Jumlah', 'Terbayar', 'Sisa', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => {
              const balance = row.amount - row.paid;
              return (
                <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-600 text-primary">{row.no}</td>
                  <td className="erp-table-cell font-500">{row.vendor}</td>
                  <td className="erp-table-cell text-muted-foreground">{row.invoiceDate}</td>
                  <td className={`erp-table-cell font-500 ${row.status === 'Overdue' ? 'text-red-600' : 'text-muted-foreground'}`}>{row.dueDate}</td>
                  <td className="erp-table-cell font-600 font-tabular text-right">{formatRp(row.amount)}</td>
                  <td className="erp-table-cell font-tabular text-right text-emerald-600">{formatRp(row.paid)}</td>
                  <td className={`erp-table-cell font-600 font-tabular text-right ${balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatRp(balance)}</td>
                  <td className="erp-table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="erp-table-cell">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Lihat Detail"><Eye size={13} /></button>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Upload Bukti Transfer"><Upload size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
