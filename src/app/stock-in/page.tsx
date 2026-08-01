import React from 'react';
import AppLayout from '@/components/AppLayout';
import StockInContent from './components/StockInContent';

export default function StockInPage() {
  return (
    <AppLayout
      title="Stock In"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Inventory' }, { label: 'Stock In' }]}
    >
      <StockInContent />
    </AppLayout>
  );
}
