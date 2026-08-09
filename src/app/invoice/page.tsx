import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import InvoiceSummaryCards from './components/InvoiceSummaryCards';
import InvoiceTable from './components/InvoiceTable';

export default function InvoicePage() {
  return (
    <AppLayout
      title="Invoice"
      breadcrumbs={[{ label: 'Sales' }, { label: 'Invoice' }]}
    >
      <div className="space-y-5">
        <InvoiceSummaryCards />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-600 text-muted-foreground">Daftar Invoice</h2>
          <Link
            href="/invoice/buat"
            className="btn-primary inline-flex items-center gap-1.5 text-sm no-underline"
          >
            <Plus size={14} /> Buat Invoice Baru
          </Link>
        </div>
        <InvoiceTable />
      </div>
    </AppLayout>
  );
}
