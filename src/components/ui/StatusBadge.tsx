import React from 'react';
import {
  QuotationStatus,
  SalesOrderStatus,
  InvoiceStatus,
  PurchaseRequestStatus,
  PurchaseOrderStatus,
  ExpenseStatus,
  ActiveStatus,
} from '@/types';

type AnyStatus =
  | QuotationStatus
  | SalesOrderStatus
  | InvoiceStatus
  | PurchaseRequestStatus
  | PurchaseOrderStatus
  | ExpenseStatus
  | ActiveStatus;

interface BadgeConfig {
  className: string;
  label: string;
}

const statusMap: Record<string, BadgeConfig> = {
  // Quotation
  Draft:        { className: 'status-draft',      label: 'Draft' },
  Terkirim:     { className: 'status-terkirim',   label: 'Terkirim' },
  Disetujui:    { className: 'status-disetujui',  label: 'Disetujui' },
  Ditolak:      { className: 'status-ditolak',    label: 'Ditolak' },
  Kadaluarsa:   { className: 'status-kadaluarsa', label: 'Kadaluarsa' },
  Direvisi:     { className: 'bg-orange-100 text-orange-700', label: 'Direvisi' },
  Selesai:      { className: 'status-selesai',              label: 'Selesai' },
  Superseded:   { className: 'status-superseded',          label: 'Superseded' },

  // Sales Order
  Open:         { className: 'status-terkirim',   label: 'Open' },
  Delivered:    { className: 'bg-teal-100 text-teal-700', label: 'Delivered' },
  Completed:    { className: 'status-disetujui',  label: 'Completed' },
  Cancelled:    { className: 'status-ditolak',    label: 'Cancelled' },

  // Invoice
  Sent:           { className: 'status-terkirim',             label: 'Sent' },
  'Partial Paid': { className: 'bg-amber-100 text-amber-700', label: 'Partial Paid' },
  PartialPaid:    { className: 'bg-amber-100 text-amber-700', label: 'Partial Paid' },
  Paid:           { className: 'status-disetujui',            label: 'Paid' },
  Overdue:        { className: 'status-ditolak',              label: 'Overdue' },

  // Purchase Request
  Submitted:    { className: 'status-terkirim',   label: 'Submitted' },
  Approved:     { className: 'status-disetujui',  label: 'Approved' },
  Rejected:     { className: 'status-ditolak',    label: 'Rejected' },
  Ordered:      { className: 'bg-violet-100 text-violet-700', label: 'Ordered' },

  // Purchase Order
  'Partial Receive': { className: 'bg-amber-100 text-amber-700', label: 'Partial Receive' },
  PartialReceive:    { className: 'bg-amber-100 text-amber-700', label: 'Partial Receive' },

  // Delivery Order
  Confirmed:    { className: 'bg-blue-100 text-blue-700',    label: 'Confirmed' },
  Returned:     { className: 'bg-orange-100 text-orange-700', label: 'Returned' },

  // Active status
  Aktif:        { className: 'status-disetujui',  label: 'Aktif' },
  'Tidak Aktif': { className: 'status-draft',     label: 'Tidak Aktif' },
};

interface StatusBadgeProps {
  status: AnyStatus | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusMap[status] ?? { className: 'status-draft', label: status };
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center font-600 rounded-full whitespace-nowrap ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
