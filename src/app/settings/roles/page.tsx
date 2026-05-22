import React from 'react';
import AppLayout from '@/components/AppLayout';
import SettingsModule from '../company/components/SettingsModule';

export default function SettingsRolesPage() {
  return (
    <AppLayout
      title="Role Management"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Settings' }, { label: 'Role Management' }]}
    >
      <SettingsModule activeTab="roles" />
    </AppLayout>
  );
}
