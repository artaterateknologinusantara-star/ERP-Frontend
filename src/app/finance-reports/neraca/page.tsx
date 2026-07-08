import React from 'react';
import AppLayout from '@/components/AppLayout';
import NeracaReport from './components/NeracaReport';

export default function NeracaPage() {
  return (
    <AppLayout
      title="Neraca"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Finance' }, { label: 'Neraca' }]}
    >
      <div className="space-y-5">
        <NeracaReport />
      </div>
    </AppLayout>
  );
}
