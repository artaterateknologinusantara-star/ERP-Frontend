'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatRp } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import { SubconMarginByQuotationReport } from '@/services/subconMarginReport.service';

export default function ByQuotationTable({ data }: { data: SubconMarginByQuotationReport }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (quotationId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(quotationId)) next.delete(quotationId);
      else next.add(quotationId);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="erp-table-cell text-left">No Quotation</th>
            <th className="erp-table-cell text-left">Project</th>
            <th className="erp-table-cell text-left">Customer</th>
            <th className="erp-table-cell text-left">Status</th>
            <th className="erp-table-cell text-right">Total Nilai Jual</th>
            <th className="erp-table-cell text-right">Total Margin</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const isExpanded = expandedIds.has(row.quotationId);
            return (
              <React.Fragment key={row.quotationId}>
                <tr className="border-b border-border hover:bg-primary/5 transition-colors">
                  <td className="erp-table-cell font-700 text-primary whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 cursor-pointer select-none"
                      onClick={() => toggleExpand(row.quotationId)}
                    >
                      {isExpanded
                        ? <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" />
                        : <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />}
                      {row.no}
                    </span>
                  </td>
                  <td className="erp-table-cell max-w-[200px] truncate" title={row.projectName}>{row.projectName}</td>
                  <td className="erp-table-cell max-w-[160px] truncate" title={row.customerName}>{row.customerName}</td>
                  <td className="erp-table-cell"><StatusBadge status={row.status} size="sm" /></td>
                  <td className="erp-table-cell text-right font-tabular">{formatRp(row.totalNilaiJual)}</td>
                  <td className="erp-table-cell text-right font-tabular font-600 text-emerald-600">{formatRp(row.totalMargin)}</td>
                </tr>
                {isExpanded && row.vendorGroups.map((vg) => (
                  <tr key={vg.vendorRabSubmissionId} className="border-b border-border bg-muted/20">
                    <td className="erp-table-cell" />
                    <td className="erp-table-cell text-muted-foreground text-[12px]" colSpan={2}>
                      <span className="inline-flex items-center gap-1 pl-[17px] italic">
                        ↳ {vg.groupName} — {vg.supplierName}
                      </span>
                    </td>
                    <td className="erp-table-cell text-muted-foreground text-[12px]">—</td>
                    <td className="erp-table-cell text-right font-tabular text-[12px]">{formatRp(vg.totalNilaiJual)}</td>
                    <td className="erp-table-cell text-right font-tabular text-[12px] text-emerald-600">{formatRp(vg.totalMargin)}</td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
