'use client';

import React from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { Eye, Edit2, Plus } from 'lucide-react';
import { SalesOrder, SalesOrderStatus } from '@/types';

const MOCK_SO: SalesOrder[] = [
  { id: 'so-001', no: 'SO.SYN-26.0048', customerId: 'c-001', customerName: 'PT Telkom Indonesia', projectName: 'Network Core Upgrade', date: '10/05/2026', deliveryDate: '25/05/2026', salesId: 'u-001', salesName: 'Rizky Ananda', total: 847500000, status: 'Open', createdAt: '', updatedAt: '' },
  { id: 'so-002', no: 'SO.SYN-26.0047', customerId: 'c-002', customerName: 'PT Bank Central Asia', projectName: 'CCTV Kantor Pusat', date: '09/05/2026', deliveryDate: '20/05/2026', salesId: 'u-002', salesName: 'Sari Wulandari', total: 312000000, status: 'Delivered', createdAt: '', updatedAt: '' },
  { id: 'so-003', no: 'SO.SYN-26.0046', customerId: 'c-003', customerName: 'PT Astra International', projectName: 'Data Center Rack System', date: '08/05/2026', deliveryDate: '30/05/2026', salesId: 'u-003', salesName: 'Budi Santoso', total: 1240000000, status: 'Draft', createdAt: '', updatedAt: '' },
  { id: 'so-004', no: 'SO.SYN-26.0045', customerId: 'c-004', customerName: 'PT Wijaya Karya', projectName: 'Fiber Optic Backbone', date: '07/05/2026', deliveryDate: '15/05/2026', salesId: 'u-004', salesName: 'Dian Pratiwi', total: 560000000, status: 'Completed', createdAt: '', updatedAt: '' },
  { id: 'so-005', no: 'SO.SYN-26.0044', customerId: 'c-006', customerName: 'PT PLN (Persero)', projectName: 'Access Control System', date: '01/05/2026', deliveryDate: '22/05/2026', salesId: 'u-002', salesName: 'Sari Wulandari', total: 420000000, status: 'Open', createdAt: '', updatedAt: '' },
  { id: 'so-006', no: 'SO.SYN-26.0043', customerId: 'c-007', customerName: 'PT Pertamina', projectName: 'CCTV Refinery Security', date: '28/04/2026', deliveryDate: '10/05/2026', salesId: 'u-003', salesName: 'Budi Santoso', total: 930000000, status: 'Completed', createdAt: '', updatedAt: '' },
  { id: 'so-007', no: 'SO.SYN-26.0042', customerId: 'c-008', customerName: 'PT Garuda Indonesia', projectName: 'IP Phone & PABX System', date: '25/04/2026', deliveryDate: '08/05/2026', salesId: 'u-004', salesName: 'Dian Pratiwi', total: 215000000, status: 'Delivered', createdAt: '', updatedAt: '' },
  { id: 'so-008', no: 'SO.SYN-26.0041', customerId: 'c-009', customerName: 'PT Semen Indonesia', projectName: 'Network Infrastruktur Plant', date: '22/04/2026', deliveryDate: '18/05/2026', salesId: 'u-003', salesName: 'Budi Santoso', total: 685000000, status: 'Open', createdAt: '', updatedAt: '' },
  { id: 'so-009', no: 'SO.SYN-26.0040', customerId: 'c-010', customerName: 'PT Mandiri Sekuritas', projectName: 'Upgrade Jaringan Data Center', date: '18/04/2026', deliveryDate: '-', salesId: 'u-001', salesName: 'Rizky Ananda', total: 280000000, status: 'Cancelled', createdAt: '', updatedAt: '' },
  { id: 'so-010', no: 'SO.SYN-26.0039', customerId: 'c-011', customerName: 'PT XL Axiata', projectName: 'Fiber Optic Last Mile', date: '15/04/2026', deliveryDate: '02/05/2026', salesId: 'u-002', salesName: 'Sari Wulandari', total: 145000000, status: 'Completed', createdAt: '', updatedAt: '' },
];

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Open', label: 'Open' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function SalesOrderTable() {
  const { search, statusFilter, page, perPage, filtered, pageData, totalPages, handleSearch, handleStatusFilter, setPage, handlePerPageChange } = useTableFilter<SalesOrder>({
    data: MOCK_SO,
    searchFields: ['no', 'customerName', 'projectName', 'salesName'],
    statusField: 'status',
  });

  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari no. SO, pelanggan, proyek..."
        totalCount={filtered.length}
        countLabel="sales order"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onExport={() => toast.info('Export ke Excel')}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Buat Sales Order baru')}>
            <Plus size={14} /> Buat Sales Order
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. SO', 'Customer', 'Proyek', 'Tanggal', 'Tgl Kirim', 'Sales', 'Total', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-[13px]">Tidak ada data ditemukan</td></tr>
            ) : pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                <td className="erp-table-cell font-700 text-primary">{row.no}</td>
                <td className="erp-table-cell font-500">{row.customerName}</td>
                <td className="erp-table-cell text-muted-foreground max-w-[200px] truncate" title={row.projectName}>{row.projectName}</td>
                <td className="erp-table-cell text-muted-foreground">{row.date}</td>
                <td className="erp-table-cell text-muted-foreground">{row.deliveryDate}</td>
                <td className="erp-table-cell">{row.salesName}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.total)}</td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as SalesOrderStatus} size="sm" />
                </td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" onClick={() => toast.info(`Membuka ${row.no}`)}><Eye size={13} /></button>
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
