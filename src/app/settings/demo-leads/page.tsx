import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsDemoLeadsPage() {
  return (
    <AppLayout
      title="Demo Leads"
      breadcrumbs={[{ label: 'Settings' }, { label: 'Demo Leads' }]}
    >
      <SettingsModule activeTab="demo-leads" />
    </AppLayout>
  );
}
