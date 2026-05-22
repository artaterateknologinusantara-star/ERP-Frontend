'use client';

import React from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { Eye, ArrowRight } from 'lucide-react';

const recentQuotations = [
  { id: 'q-001', no: 'Q.SYN-26.0148', pelanggan: 'PT Telkom Indonesia', proyek: 'Network Core Upgrade Tbk', total: 'Rp 847.500.000', status: 'Terkirim' as const, tanggal: '10/05/2026', sales: 'Rizky A.' },
  { id: 'q-002', no: 'Q.SYN-26.0147', pelanggan: 'PT Bank Central Asia', proyek: 'CCTV Kantor Pusat Jakarta', total: 'Rp 312.000.000', status: 'Disetujui' as const, tanggal: '09/05/2026', sales: 'Sari W.' },
  { id: 'q-003', no: 'Q.SYN-26.0146', pelanggan: 'PT Astra International', proyek: 'Data Center Rack System', total: 'Rp 1.240.000.000', status: 'Draft' as const, tanggal: '08/05/2026', sales: 'Budi S.' },
  { id: 'q-004', no: 'Q.SYN-26.0145', pelanggan: 'PT Wijaya Karya', proyek: 'Fiber Optic Backbone Proyek', total: 'Rp 560.000.000', status: 'Terkirim' as const, tanggal: '07/05/2026', sales: 'Dian P.' },
  { id: 'q-005', no: 'Q.SYN-26.0144', pelanggan: 'PT Indosat Ooredoo', proyek: 'WiFi Office Deployment', total: 'Rp 185.000.000', status: 'Ditolak' as const, tanggal: '05/05/2026', sales: 'Rizky A.' },
  { id: 'q-006', no: 'Q.SYN-26.0143', pelanggan: 'PT PLN (Persero)', proyek: 'Access Control System', total: 'Rp 420.000.000', status: 'Kadaluarsa' as const, tanggal: '01/05/2026', sales: 'Sari W.' },
  { id: 'q-007', no: 'Q.SYN-26.0142', pelanggan: 'PT Pertamina', proyek: 'CCTV Refinery Security', total: 'Rp 930.000.000', status: 'Disetujui' as const, tanggal: '28/04/2026', sales: 'Budi S.' },
  { id: 'q-008', no: 'Q.SYN-26.0141', pelanggan: 'PT Garuda Indonesia', proyek: 'IP Phone & PABX System', total: 'Rp 215.000.000', status: 'Terkirim' as const, tanggal: '25/04/2026', sales: 'Dian P.' },
];

export default function DashboardRecentTable() {
  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-700 text-foreground">Penawaran Terbaru</h3>
          <p className="text-base text-muted-foreground mt-0.5">8 penawaran terakhir dibuat atau diperbarui</p>
        </div>
        <Link href="/riwayat-penawaran" className="flex items-center gap-1 text-primary text-base font-600 hover:underline">
          Lihat Semua <ArrowRight size={14} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">No. Penawaran</th>
              <th className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">Pelanggan</th>
              <th className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">Total</th>
              <th className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left erp-table-cell text-muted-foreground font-600 text-xs uppercase tracking-wider">Sales</th>
              <th className="erp-table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {recentQuotations.map((q, i) => (
              <tr
                key={q.id}
                className={`border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
              >
                <td className="erp-table-cell font-600 text-primary">{q.no}</td>
                <td className="erp-table-cell text-foreground">{q.pelanggan}</td>
                <td className="erp-table-cell font-600 text-foreground font-tabular">{q.total}</td>
                <td className="erp-table-cell">
                  <StatusBadge status={q.status} size="sm" />
                </td>
                <td className="erp-table-cell text-muted-foreground">{q.sales}</td>
                <td className="erp-table-cell">
                  <button className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}