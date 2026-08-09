import React from 'react';
import AppLayout from '@/components/AppLayout';
import LabaRugiReport from './components/LabaRugiReport';

export default function LabaRugiPage() {
  return (
    <AppLayout
      title="Laba Rugi"
      breadcrumbs={[{ label: 'Accounting' }, { label: 'Laba Rugi' }]}
    >
      <div className="space-y-5">
        <LabaRugiReport />
      </div>
    </AppLayout>
  );
}
