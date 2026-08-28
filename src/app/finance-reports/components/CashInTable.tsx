'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, Eye } from 'lucide-react';
import TablePagination from '@/components/ui/TablePagination';
import { formatRp, formatDate } from '@/lib/format';
import {
  getCashInList, getCashOutList,
  CashInItem, CashOutItem,
} from '@/services/finance.service';

export interface CashInTableProps {
  type: 'cash-in' | 'cash-out';
}

export default function CashInTable({ type }: CashInTableProps) {
  const router = useRouter();
  const [items, setItems]     = useState<(CashInItem | CashOutItem)[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const fetchData = () => {
    setLoading(true);
    const params = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    const call = type === 'cash-in'
      ? getCashInList(params)
      : getCashOutList(params);
    call
      .then(setItems)
      .catch(() => toast.error(`Gagal memuat data ${type === 'cash-in' ? 'Cash In' : 'Cash Out'}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const pageData   = items.slice((page - 1) * perPage, page * perPage);

  const isCashIn = type === 'cash-in';
  const title    = isCashIn ? 'Transaksi Cash In' : 'Transaksi Cash Out';
  const subtitle = isCashIn ? 'Pembayaran diterima dari pelanggan' : 'Pembayaran keluar ke supplier';

  const totalAmount = items.reduce((s, r) => s + r.amount, 0);

  const headers = isCashIn
    ? ['Tanggal', 'Ref', 'Keterangan', 'Customer', 'No Invoice', 'Metode', 'Jumlah', 'Aksi']
    : ['Tanggal', 'Ref', 'Keterangan', 'Supplier', 'No PO', 'Status', 'Jumlah', 'Aksi'];

  return (
    <div className="erp-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-700 text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input
            type="date"
            className="erp-input w-36 text-xs"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            placeholder="Dari"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            className="erp-input w-36 text-xs"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            placeholder="Sampai"
          />
          {(startDate || endDate) && (
            <button
              className="btn-secondary text-xs py-1"
              onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
            >
              Reset
            </button>
          )}
          <button className="btn-secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {headers.map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Memuat data...</td></tr>
            ) : pageData.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">Tidak ada data</td></tr>
            ) : isCashIn ? (
              (pageData as CashInItem[]).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/invoice/${row.invoiceId}`)}
                >
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell font-600 text-primary text-xs">{row.refNo}</td>
                  <td className="erp-table-cell max-w-[180px] truncate">{row.description}</td>
                  <td className="erp-table-cell font-500">{row.customerName}</td>
                  <td className="erp-table-cell text-xs text-muted-foreground">{row.invoiceNo}</td>
                  <td className="erp-table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-blue-100 text-blue-700">
                      {row.method}
                    </span>
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">
                    +{formatRp(row.amount)}
                  </td>
                  <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                      onClick={() => router.push(`/invoice/${row.invoiceId}`)}
                    >
                      <Eye size={11} /> Invoice
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              (pageData as CashOutItem[]).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/purchase-order/${row.id}`)}
                >
                  <td className="erp-table-cell text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="erp-table-cell font-600 text-primary text-xs">{row.refNo}</td>
                  <td className="erp-table-cell max-w-[180px] truncate">{row.description}</td>
                  <td className="erp-table-cell font-500">{row.supplierName}</td>
                  <td className="erp-table-cell text-xs text-muted-foreground">{row.poNo}</td>
                  <td className="erp-table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 bg-gray-100 text-gray-600">
                      {row.status}
                    </span>
                  </td>
                  <td className="erp-table-cell font-700 font-tabular text-right text-red-600">
                    -{formatRp(row.amount)}
                  </td>
                  <td className="erp-table-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                      onClick={() => router.push(`/purchase-order/${row.id}`)}
                    >
                      <Eye size={11} /> PO
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && items.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t-2 border-border">
                <td className="erp-table-cell font-700 text-foreground" colSpan={6}>TOTAL</td>
                <td className={`erp-table-cell font-700 font-tabular text-right ${isCashIn ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isCashIn ? '+' : '-'}{formatRp(totalAmount)}
                </td>
                <td className="erp-table-cell" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={items.length}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>
  );
}
