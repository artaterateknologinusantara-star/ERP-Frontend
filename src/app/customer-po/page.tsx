'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { customerPoService } from '@/services/customerpo.service';
import { createSOFromQuotation } from '@/services/salesorder.service';
import { formatRp } from '@/lib/format';
import { toast } from 'sonner';
import { FileCheck, Download, Loader2, Search, ShoppingBag } from 'lucide-react';
import type { CustomerPO } from '@/types';

export default function CustomerPoPage() {
  const router = useRouter();
  const [data,     setData]     = useState<CustomerPO[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [dlId,     setDlId]     = useState<string | null>(null);
  const [soLoadingId, setSoLoadingId] = useState<string | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    customerPoService
      .list({ perPage: 200, search: q })
      .then((res) => setData(res.data))
      .catch(() => toast.error('Gagal memuat data Customer PO'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    load(e.target.value || undefined);
  };

  const handleBuatSO = async (cpo: CustomerPO) => {
    // If SO already exists, navigate directly without extra API call
    if (cpo.salesOrderId) {
      router.push(`/sales-order/${cpo.salesOrderId}`);
      return;
    }
    setSoLoadingId(cpo.id);
    try {
      const so = await createSOFromQuotation(cpo.quotationId);
      toast.success(`Sales Order ${so.no} berhasil dibuat`);
      router.push(`/sales-order/${so.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat Sales Order');
    } finally {
      setSoLoadingId(null);
    }
  };

  const handleDownload = async (cpo: CustomerPO) => {
    if (!cpo.hasAttachment) return;
    setDlId(cpo.id);
    try {
      await customerPoService.downloadAttachment(cpo.id);
    } catch {
      toast.error('Gagal mengunduh lampiran');
    } finally {
      setDlId(null);
    }
  };

  const totalAmount = data.reduce((sum, c) => sum + c.amount, 0);

  return (
    <AppLayout
      title="Customer PO"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Sales' }, { label: 'Customer PO' }]}
    >
      <div className="space-y-5">

        {/* Summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="erp-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FileCheck size={18} className="text-indigo-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-500 uppercase tracking-wider">Total PO</p>
              <p className="text-[22px] font-700 leading-tight">{data.length}</p>
            </div>
          </div>
          <div className="erp-card sm:col-span-2 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <FileCheck size={18} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-500 uppercase tracking-wider">Total Nilai PO</p>
              <p className="text-[22px] font-700 leading-tight text-emerald-700">{formatRp(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="erp-card">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Cari no. PO, penawaran, pelanggan..."
                className="erp-input pl-8 text-[13px] h-9"
              />
            </div>
            <span className="text-[13px] text-muted-foreground ml-auto">
              {data.length} Customer PO
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-border bg-muted/40">
                  {['No. PO Customer', 'No. Penawaran', 'Pelanggan', 'Proyek', 'Tanggal PO', 'Nilai PO', 'Lampiran', 'Aksi'].map((h) => (
                    <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin" />
                        <span>Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      Belum ada Customer PO
                    </td>
                  </tr>
                ) : (
                  data.map((cpo, i) => (
                    <tr
                      key={cpo.id}
                      className={`border-b border-border hover:bg-primary/5 transition-colors ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="erp-table-cell font-700 text-indigo-700">{cpo.poNo}</td>
                      <td className="erp-table-cell font-600 text-primary">{cpo.quotationNo}</td>
                      <td className="erp-table-cell font-500">{cpo.customerName}</td>
                      <td className="erp-table-cell text-muted-foreground max-w-[200px] truncate" title={cpo.projectName}>
                        {cpo.projectName}
                      </td>
                      <td className="erp-table-cell text-muted-foreground">{cpo.poDate}</td>
                      <td className="erp-table-cell font-700 font-tabular text-emerald-700">{formatRp(cpo.amount)}</td>
                      <td className="erp-table-cell">
                        {cpo.hasAttachment ? (
                          <button
                            className="inline-flex items-center gap-1.5 text-[11px] font-600 text-sky-700 hover:text-sky-800 disabled:opacity-50"
                            disabled={dlId === cpo.id}
                            onClick={() => handleDownload(cpo)}
                          >
                            {dlId === cpo.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Download size={12} />
                            }
                            {cpo.attachmentName ?? 'Unduh'}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                      <td className="erp-table-cell">
                        <button
                          className={`inline-flex items-center gap-1 text-[11px] font-600 px-2.5 py-[3px] rounded-md border transition-colors disabled:opacity-50 whitespace-nowrap ${
                            cpo.salesOrderId
                              ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                              : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                          title={cpo.salesOrderId ? `SO ${cpo.salesOrderNo}` : 'Buat Sales Order dari Quotation ini'}
                          disabled={soLoadingId === cpo.id}
                          onClick={() => handleBuatSO(cpo)}
                        >
                          {soLoadingId === cpo.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <ShoppingBag size={11} />
                          }
                          {cpo.salesOrderId ? 'Lihat SO' : 'Buat SO'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
