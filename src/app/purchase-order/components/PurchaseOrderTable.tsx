'use client';

import React from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { Eye, Edit2, Plus } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types';

const MOCK_PO: PurchaseOrder[] = [
  { id: 'po-001', no: 'PO.SYN-26.0019', supplierId: 's-001', supplierName: 'PT Ruijie Networks Indonesia', date: '10/05/2026', deliveryDate: '25/05/2026', total: 420000000, status: 'Ordered', purchaseRequestNo: 'PR.SYN-26.0032', createdAt: '', updatedAt: '' },
  { id: 'po-002', no: 'PO.SYN-26.0018', supplierId: 's-002', supplierName: 'PT Draka Indonesia', date: '09/05/2026', deliveryDate: '20/05/2026', total: 185000000, status: 'Partial Receive', purchaseRequestNo: 'PR.SYN-26.0031', createdAt: '', updatedAt: '' },
  { id: 'po-003', no: 'PO.SYN-26.0017', supplierId: 's-003', supplierName: 'PT Netviel Distributor', date: '08/05/2026', deliveryDate: '15/05/2026', total: 310000000, status: 'Completed', purchaseRequestNo: 'PR.SYN-26.0030', createdAt: '', updatedAt: '' },
  { id: 'po-004', no: 'PO.SYN-26.0016', supplierId: 's-004', supplierName: 'PT Indorack Multikreasi', date: '07/05/2026', deliveryDate: '18/05/2026', total: 95000000, status: 'Draft', purchaseRequestNo: 'PR.SYN-26.0029', createdAt: '', updatedAt: '' },
  { id: 'po-005', no: 'PO.SYN-26.0015', supplierId: 's-005', supplierName: 'CV Mitra Teknologi', date: '01/05/2026', deliveryDate: '12/05/2026', total: 67000000, status: 'Ordered', purchaseRequestNo: 'PR.SYN-26.0028', createdAt: '', updatedAt: '' },
  { id: 'po-006', no: 'PO.SYN-26.0014', supplierId: 's-006', supplierName: 'PT Cisco Systems Indonesia', date: '28/04/2026', deliveryDate: '10/05/2026', total: 820000000, status: 'Completed', purchaseRequestNo: 'PR.SYN-26.0027', createdAt: '', updatedAt: '' },
];

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Partial Receive', label: 'Partial Receive' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function PurchaseOrderTable() {
  const { search, statusFilter, page, perPage, filtered, pageData, totalPages, handleSearch, handleStatusFilter, setPage, handlePerPageChange } = useTableFilter<PurchaseOrder>({
    data: MOCK_PO,
    searchFields: ['no', 'supplierName', 'purchaseRequestNo'],
    statusField: 'status',
  });

  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari no. PO, supplier, ref PR..."
        totalCount={filtered.length}
        countLabel="purchase order"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onExport={() => toast.info('Export ke Excel')}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Buat PO baru')}>
            <Plus size={14} /> Buat PO
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. PO', 'Supplier', 'Tanggal', 'Tgl Kirim', 'Total', 'Ref PR', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-[13px]">Tidak ada data ditemukan</td></tr>
            ) : pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                <td className="erp-table-cell font-500">{row.supplierName}</td>
                <td className="erp-table-cell text-muted-foreground">{row.date}</td>
                <td className="erp-table-cell text-muted-foreground">{row.deliveryDate}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                <td className="erp-table-cell text-primary text-xs">{row.purchaseRequestNo ?? '—'}</td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as PurchaseOrderStatus} size="sm" />
                </td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" onClick={() => toast.info(`Detail ${row.no}`)}><Eye size={13} /></button>
                    <button className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => toast.info(`Edit ${row.no}`)}><Edit2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination page={page} totalPages={totalPages} totalCount={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={handlePerPageChange} />
    </div>
  );
}
