import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from './components/SettingsModule';

export default function SettingsCompanyPage() {
  return (
    <AppLayout
      title="Company Profile"
      breadcrumbs={[{ label: 'Settings' }, { label: 'Company Profile' }]}
    >
      <SettingsModule activeTab="company" />
    </AppLayout>
  );
}
