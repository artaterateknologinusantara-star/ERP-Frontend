'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, Eye, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to PO';

interface PurchaseRequest {
  id: string;
  no: string;
  requestedBy: string;
  department: string;
  date: string;
  items: number;
  estimatedTotal: number;
  status: PRStatus;
  notes: string;
}

const prData: PurchaseRequest[] = [
  { id: 'pr-001', no: 'PR.SYN-26.0032', requestedBy: 'Budi Santoso', department: 'Engineering', date: '10/05/2026', items: 12, estimatedTotal: 420000000, status: 'Pending Approval', notes: 'Network Core Upgrade - Telkom' },
  { id: 'pr-002', no: 'PR.SYN-26.0031', requestedBy: 'Rizky Ananda', department: 'Procurement', date: '09/05/2026', items: 8, estimatedTotal: 185000000, status: 'Approved', notes: 'CCTV BCA Kantor Pusat' },
  { id: 'pr-003', no: 'PR.SYN-26.0030', requestedBy: 'Sari Wulandari', department: 'Engineering', date: '08/05/2026', items: 25, estimatedTotal: 650000000, status: 'Converted to PO', notes: 'Data Center Astra International' },
  { id: 'pr-004', no: 'PR.SYN-26.0029', requestedBy: 'Dian Pratiwi', department: 'Procurement', date: '07/05/2026', items: 6, estimatedTotal: 95000000, status: 'Draft', notes: 'Fiber Optic Wijaya Karya' },
  { id: 'pr-005', no: 'PR.SYN-26.0028', requestedBy: 'Budi Santoso', department: 'Engineering', date: '01/05/2026', items: 15, estimatedTotal: 310000000, status: 'Rejected', notes: 'Access Control PLN' },
  { id: 'pr-006', no: 'PR.SYN-26.0027', requestedBy: 'Rizky Ananda', department: 'Procurement', date: '28/04/2026', items: 30, estimatedTotal: 820000000, status: 'Approved', notes: 'CCTV Pertamina Refinery' },
];

const statusColors: Record<PRStatus, string> = {
  Draft: 'status-draft',
  'Pending Approval': 'status-kadaluarsa',
  Approved: 'status-disetujui',
  Rejected: 'status-ditolak',
  'Converted to PO': 'status-terkirim',
};

const formatRp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

export default function PurchaseRequestTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return prData;
    const q = search.toLowerCase();
    return prData.filter((r) => r.no.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="erp-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Cari no. PR, requester, keterangan..." className="erp-input pl-8 w-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">{filtered.length} purchase request</span>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary"><Download size={14} /> Export</button>
          <button className="btn-primary"><Plus size={14} /> Buat PR</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. PR', 'Requester', 'Departemen', 'Tanggal', 'Jml Item', 'Est. Total', 'Keterangan', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell font-600 text-primary">{row.no}</td>
                <td className="erp-table-cell font-500">{row.requestedBy}</td>
                <td className="erp-table-cell text-muted-foreground">{row.department}</td>
                <td className="erp-table-cell text-muted-foreground">{row.date}</td>
                <td className="erp-table-cell text-center font-600">{row.items}</td>
                <td className="erp-table-cell font-600 font-tabular text-right">{formatRp(row.estimatedTotal)}</td>
                <td className="erp-table-cell text-muted-foreground max-w-[200px] truncate">{row.notes}</td>
                <td className="erp-table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[row.status]}`}>{row.status}</span>
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
