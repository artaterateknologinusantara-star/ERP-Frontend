'use client';

import React from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import TableToolbar from '@/components/ui/TableToolbar';
import TablePagination from '@/components/ui/TablePagination';
import { useTableFilter } from '@/hooks/useTableFilter';
import { formatRp } from '@/lib/format';
import { Eye, Edit2, Plus } from 'lucide-react';
import { Customer, ActiveStatus } from '@/types';

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c-001', code: 'CUST-001', name: 'PT Telkom Indonesia', industry: 'Telekomunikasi', contactPerson: 'Andi Wijaya', phone: '021-5001234', city: 'Jakarta', totalQuotations: 18, totalRevenue: 4200000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-002', code: 'CUST-002', name: 'PT Bank Central Asia', industry: 'Perbankan', contactPerson: 'Budi Hartono', phone: '021-5002345', city: 'Jakarta', totalQuotations: 12, totalRevenue: 1560000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-003', code: 'CUST-003', name: 'PT Astra International', industry: 'Otomotif', contactPerson: 'Citra Dewi', phone: '021-5003456', city: 'Jakarta', totalQuotations: 8, totalRevenue: 2480000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-004', code: 'CUST-004', name: 'PT Wijaya Karya', industry: 'Konstruksi', contactPerson: 'Doni Setiawan', phone: '021-5004567', city: 'Jakarta', totalQuotations: 6, totalRevenue: 1120000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-005', code: 'CUST-005', name: 'PT Indosat Ooredoo', industry: 'Telekomunikasi', contactPerson: 'Eka Putri', phone: '021-5005678', city: 'Jakarta', totalQuotations: 5, totalRevenue: 370000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-006', code: 'CUST-006', name: 'PT PLN (Persero)', industry: 'Energi', contactPerson: 'Fajar Nugroho', phone: '021-5006789', city: 'Jakarta', totalQuotations: 9, totalRevenue: 1890000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-007', code: 'CUST-007', name: 'PT Pertamina', industry: 'Energi', contactPerson: 'Gita Sari', phone: '021-5007890', city: 'Jakarta', totalQuotations: 7, totalRevenue: 2790000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-008', code: 'CUST-008', name: 'PT Garuda Indonesia', industry: 'Penerbangan', contactPerson: 'Hendra Kusuma', phone: '021-5008901', city: 'Jakarta', totalQuotations: 4, totalRevenue: 430000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-009', code: 'CUST-009', name: 'PT Semen Indonesia', industry: 'Manufaktur', contactPerson: 'Indah Permata', phone: '031-5009012', city: 'Surabaya', totalQuotations: 5, totalRevenue: 1370000000, status: 'Aktif', createdAt: '', updatedAt: '' },
  { id: 'c-010', code: 'CUST-010', name: 'PT Mandiri Sekuritas', industry: 'Keuangan', contactPerson: 'Joko Santoso', phone: '021-5010123', city: 'Jakarta', totalQuotations: 3, totalRevenue: 560000000, status: 'Tidak Aktif', createdAt: '', updatedAt: '' },
];

const STATUS_OPTIONS = [
  { value: 'Semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Tidak Aktif', label: 'Tidak Aktif' },
];

export default function CustomerTable() {
  const { search, statusFilter, page, perPage, filtered, pageData, totalPages, handleSearch, handleStatusFilter, setPage, handlePerPageChange } = useTableFilter<Customer>({
    data: MOCK_CUSTOMERS,
    searchFields: ['name', 'industry', 'city', 'code'],
    statusField: 'status',
  });

  return (
    <div className="erp-card">
      <TableToolbar
        search={search}
        onSearch={handleSearch}
        searchPlaceholder="Cari nama customer, industri, kota..."
        totalCount={filtered.length}
        countLabel="customer"
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statusOptions={STATUS_OPTIONS}
        onExport={() => toast.info('Export ke Excel')}
        actions={
          <button className="btn-primary" onClick={() => toast.info('Tambah Customer baru')}>
            <Plus size={14} /> Tambah Customer
          </button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/40">
              {['Kode', 'Nama Customer', 'Industri', 'Contact', 'Telepon', 'Kota', 'Penawaran', 'Total Revenue', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="erp-table-cell text-left text-muted-foreground font-600 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-muted-foreground text-[13px]">Tidak ada customer ditemukan</td></tr>
            ) : pageData.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 transition-colors group">
                <td className="erp-table-cell font-600 text-primary">{row.code}</td>
                <td className="erp-table-cell font-600">{row.name}</td>
                <td className="erp-table-cell text-muted-foreground">{row.industry}</td>
                <td className="erp-table-cell">{row.contactPerson}</td>
                <td className="erp-table-cell text-muted-foreground">{row.phone}</td>
                <td className="erp-table-cell text-muted-foreground">{row.city}</td>
                <td className="erp-table-cell text-center font-600">{row.totalQuotations}</td>
                <td className="erp-table-cell font-700 font-tabular text-right text-emerald-600">{formatRp(row.totalRevenue, true)}</td>
                <td className="erp-table-cell">
                  <StatusBadge status={row.status as ActiveStatus} size="sm" />
                </td>
                <td className="erp-table-cell">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors" onClick={() => toast.info(`Detail ${row.name}`)}><Eye size={13} /></button>
                    <button className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => toast.info(`Edit ${row.name}`)}><Edit2 size={13} /></button>
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
