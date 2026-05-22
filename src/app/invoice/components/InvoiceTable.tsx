'use client';

import React from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { Eye, Edit2, Plus } from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types';

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-001', no: 'INV.SYN-26.0064', customerId: 'c-001', customerName: 'PT Telkom Indonesia', invoiceDate: '10/05/2026', dueDate: '09/06/2026', amount: 847500000, paid: 0, balance: 847500000, status: 'Sent', createdAt: '', updatedAt: '' },
  { id: 'inv-002', no: 'INV.SYN-26.0063', customerId: 'c-002', customerName: 'PT Bank Central Asia', invoiceDate: '09/05/2026', dueDate: '08/06/2026', amount: 312000000, paid: 156000000, balance: 156000000, status: 'Partial Paid', createdAt: '', updatedAt: '' },
  { id: 'inv-003', no: 'INV.SYN-26.0062', customerId: 'c-003', customerName: 'PT Astra International', invoiceDate: '08/05/2026', dueDate: '07/06/2026', amount: 1240000000, paid: 1240000000, balance: 0, status: 'Paid', createdAt: '', updatedAt: '' },
  { id: 'inv-004', no: 'INV.SYN-26.0061', customerId: 'c-004', customerName: 'PT Wijaya Karya', invoiceDate: '07/05/2026', dueDate: '06/06/2026', amount: 560000000, paid: 0, balance: 560000000, status: 'Overdue', createdAt: '', updatedAt: '' },
  { id: 'inv-005', no: 'INV.SYN-26.0060', customerId: 'c-006', customerName: 'PT PLN (Persero)', invoiceDate: '01/05/2026', dueDate: '31/05/2026', amount: 420000000, paid: 0, balance: 420000000, status: 'Draft', createdAt: '', updatedAt: '' },
  { id: 'inv-006', no: 'INV.SYN-26.0059', customerId: 'c-007', customerName: 'PT Pertamina', invoiceDate: '28/04/2026', dueDate: '28/05/2026', amount: 930000000, paid: 930000000, balance: 0, status: 'Paid', createdAt: '', updatedAt: '' },
  { id: 'inv-007', no: 'INV.SYN-26.0058', customerId: 'c-008', customerName: 'PT Garuda Indonesia', invoiceDate: '25/04/2026', dueDate: '25/05/2026', amount: 215000000, paid: 100000000, balance: 115000000, status: 'Partial Paid', createdAt: '', updatedAt: '' },
  { id: 'inv-008', no: 'INV.SYN-26.0057', customerId: 'c-009', customerName: 'PT Semen Indonesia', invoiceDate: '22/04/2026', dueDate: '22/05/2026', amount: 685000000, paid: 0, balance: 685000000, status: 'Overdue', createdAt: '', updatedAt: '' },
];

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Partial Paid', label: 'Partial Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Overdue', label: 'Overdue' },
];

export default function InvoiceTable() {
  const { search, statusFilter, page, perPage, filtered, pageData, totalPages, handleSearch, handleStatusFilter, setPage, handlePerPageChange } = useTableFilter<Invoice>({
    data: MOCK_INVOICES,
    searchFields: ['no', 'customerName'],
    statusField: 'status',
  });

  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari no. invoice, pelanggan..."
        totalCount={filtered.length}
        countLabel="invoice"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onExport={() => toast.info('Export ke Excel')}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Buat Invoice baru')}>
            <Plus size={14} /> Buat Invoice
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['No. Invoice', 'Customer', 'Tgl Invoice', 'Jatuh Tempo', 'Jumlah', 'Terbayar', 'Sisa', 'Status', 'Aksi'].map((h) => (
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
                <td className="erp-table-cell text-muted-foreground">{row.invoiceDate}</td>
                <td className={`erp-table-cell font-500 ${row.status === 'Overdue' ? 'text-red-600' : 'text-muted-foreground'}`}>{row.dueDate}</td>
                <td className="erp-table-cell font-700 font-tabular text-right">{formatRp(row.amount)}</td>
                <td className="erp-table-cell font-tabular text-right text-emerald-600">{row.paid > 0 ? formatRp(row.paid) : '—'}</td>
                <td className={`erp-table-cell font-700 font-tabular text-right ${row.balance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {row.balance > 0 ? formatRp(row.balance) : '—'}
                </td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as InvoiceStatus} size="sm" />
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
