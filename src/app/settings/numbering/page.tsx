import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsNumberingPage() {
  return (
    <AppLayout
      title="Numbering Format"
      breadcrumbs={[{ label: 'Settings' }, { label: 'Numbering Format' }]}
    >
      <SettingsModule activeTab="numbering" />
    </AppLayout>
  );
}
