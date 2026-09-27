'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supplierService } from '@/services/supplier.service';
import {
  getSubconMarginByVendor,
  getSubconMarginByQuotation,
  SubconMarginByVendorReport,
  SubconMarginByQuotationReport,
} from '@/services/subconMarginReport.service';
import ByVendorTable from './ByVendorTable';
import ByQuotationTable from './ByQuotationTable';

type ViewMode = 'vendor' | 'quotation';

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SubconMarginReport() {
  const [view, setView] = useState<ViewMode>('vendor');
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [supplierId, setSupplierId] = useState('');

  const [vendorData, setVendorData] = useState<SubconMarginByVendorReport | null>(null);
  const [quotationData, setQuotationData] = useState<SubconMarginByQuotationReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Subcontractor filter already includes SupplierType.Both server-side (SupplierService.cs).
  const { data: supplierResult } = useQuery({
    queryKey: ['suppliers-subcontractor'],
    queryFn: () => supplierService.list({ perPage: 200, isActive: true, supplierType: 'Subcontractor' }),
    staleTime: 60_000,
  });
  const suppliers = supplierResult?.data ?? [];

  const fetchData = useCallback(() => {
    setLoading(true);
    const supplierFilter = supplierId || undefined;
    const request = view === 'vendor'
      ? getSubconMarginByVendor(startDate, endDate, supplierFilter).then(setVendorData)
      : getSubconMarginByQuotation(startDate, endDate, supplierFilter).then(setQuotationData);
    request
      .catch(() => toast.error('Gagal memuat Laporan Margin Subkontraktor'))
      .finally(() => setLoading(false));
  }, [view, startDate, endDate, supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isEmpty = view === 'vendor'
    ? (vendorData?.rows.length ?? 0) === 0
    : (quotationData?.rows.length ?? 0) === 0;

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">Laporan Margin Subkontraktor</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Margin dari RAB vendor yang sudah disetujui, dihitung berdasarkan tanggal persetujuan
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input type="date" className="erp-input w-36 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" className="erp-input w-36 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <select className="erp-input w-48 text-xs" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Semua Vendor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="inline-flex items-center rounded-lg border border-border p-0.5 mb-4">
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-600 rounded-md transition-colors ${
            view === 'vendor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('vendor')}
        >
          Per Vendor
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-600 rounded-md transition-colors ${
            view === 'quotation' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('quotation')}
        >
          Per Quotation
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Memuat data...</div>
      ) : isEmpty ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Belum ada submission RAB yang disetujui pada periode ini.
        </div>
      ) : view === 'vendor' ? (
        <ByVendorTable data={vendorData!} />
      ) : (
        <ByQuotationTable data={quotationData!} />
      )}
    </div>
  );
}
