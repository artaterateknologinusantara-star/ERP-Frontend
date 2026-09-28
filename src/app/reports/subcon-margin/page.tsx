import React from 'react';
import AppLayout from '@/components/AppLayout';
import SubconMarginReport from './components/SubconMarginReport';

export default function SubconMarginReportPage() {
  return (
    <AppLayout
      title="Margin Subkontraktor"
      breadcrumbs={[{ label: 'Reports' }, { label: 'Margin Subkontraktor' }]}
    >
      <div className="space-y-5">
        <SubconMarginReport />
      </div>
    </AppLayout>
  );
}
