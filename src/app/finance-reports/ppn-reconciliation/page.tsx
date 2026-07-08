import React from 'react';
import AppLayout from '@/components/AppLayout';
import PpnReconciliationReport from './components/PpnReconciliationReport';

export default function PpnReconciliationPage() {
  return (
    <AppLayout
      title="Rekapitulasi PPN"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Accounting' }, { label: 'Rekapitulasi PPN' }]}
    >
      <div className="space-y-5">
        <PpnReconciliationReport />
      </div>
    </AppLayout>
  );
}
