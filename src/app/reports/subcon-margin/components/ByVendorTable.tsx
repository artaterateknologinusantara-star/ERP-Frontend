'use client';

import React from 'react';
import { formatRp } from '@/lib/format';
import { SubconMarginByVendorReport } from '@/services/subconMarginReport.service';

export default function ByVendorTable({ data }: { data: SubconMarginByVendorReport }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="erp-table-cell text-left">Vendor</th>
            <th className="erp-table-cell text-right">Jumlah Request</th>
            <th className="erp-table-cell text-right">Submission Approved</th>
            <th className="erp-table-cell text-right">Total Nilai Jual</th>
            <th className="erp-table-cell text-right">Total Margin</th>
            <th className="erp-table-cell text-right">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.supplierId} className="border-b border-border hover:bg-primary/5 transition-colors">
              <td className="erp-table-cell font-600">{r.supplierName}</td>
              <td className="erp-table-cell text-right font-tabular">{r.requestCount}</td>
              <td className="erp-table-cell text-right font-tabular">{r.approvedSubmissionCount}</td>
              <td className="erp-table-cell text-right font-tabular">{formatRp(r.totalNilaiJual)}</td>
              <td className="erp-table-cell text-right font-tabular font-600 text-emerald-600">{formatRp(r.totalMargin)}</td>
              <td className="erp-table-cell text-right font-tabular">{r.marginPercent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td className="erp-table-cell font-700" colSpan={3}>Total</td>
            <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(data.totalNilaiJual)}</td>
            <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">{formatRp(data.totalMargin)}</td>
            <td className="erp-table-cell font-700 font-tabular text-right">{data.marginPercent.toFixed(1)}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
