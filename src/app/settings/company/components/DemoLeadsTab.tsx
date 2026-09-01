'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { demoLeadService, DemoLeadItem } from '@/services/demoLead.service';

const STATUS_OPTIONS = ['New', 'Contacted', 'Converted', 'Rejected'] as const;

const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  Converted: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function DemoLeadsTab() {
  const [leads, setLeads] = useState<DemoLeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await demoLeadService.list());
    } catch {
      toast.error('Gagal memuat data demo leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await demoLeadService.updateStatus(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="erp-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Demo Leads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Permintaan demo yang masuk dari halaman /demo</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Tanggal', 'Nama', 'Perusahaan', 'WhatsApp', 'Email', 'Industri', 'Kebutuhan', 'Catatan', 'Status'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="erp-table-cell text-center py-8 text-muted-foreground">Memuat data...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={9} className="erp-table-cell text-center py-8 text-muted-foreground">Belum ada permintaan demo</td></tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border hover:bg-primary/5 transition-colors">
                <td className="erp-table-cell text-muted-foreground whitespace-nowrap">
                  {new Date(lead.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="erp-table-cell font-600">{lead.fullName}</td>
                <td className="erp-table-cell">{lead.companyName}</td>
                <td className="erp-table-cell">
                  <a href={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {lead.whatsappNumber}
                  </a>
                </td>
                <td className="erp-table-cell">{lead.companyEmail}</td>
                <td className="erp-table-cell">{lead.industry}</td>
                <td className="erp-table-cell max-w-[200px] truncate" title={lead.need}>{lead.need}</td>
                <td className="erp-table-cell max-w-[200px] truncate text-muted-foreground" title={lead.notes || ''}>{lead.notes || '—'}</td>
                <td className="erp-table-cell">
                  <select
                    className={`text-xs font-600 rounded-full border px-2 py-1 ${STATUS_STYLES[lead.status] ?? ''}`}
                    value={lead.status}
                    disabled={updatingId === lead.id}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
