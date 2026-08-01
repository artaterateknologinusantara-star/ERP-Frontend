import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SalesOrderSummaryCards from './components/SalesOrderSummaryCards';
import SalesOrderTable from './components/SalesOrderTable';

export default function SalesOrderPage() {
  return (
    <AppLayout
      title="Sales Order"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Sales' }, { label: 'Sales Order' }]}
    >
      <div className="space-y-5">
        <SalesOrderSummaryCards />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-600 text-muted-foreground">Daftar Sales Order</h2>
          <Link
            href="/sales-order/buat"
            className="btn-primary inline-flex items-center gap-1.5 text-sm no-underline"
          >
            <Plus size={14} /> Buat SO Baru
          </Link>
        </div>
        <SalesOrderTable />
      </div>
    </AppLayout>
  );
}
