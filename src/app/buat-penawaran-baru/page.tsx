import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import BuatPenawaranForm from './components/BuatPenawaranForm';

export default function BuatPenawaranBaruPage() {
  return (
    <AppLayout
      title="Buat Penawaran Baru"
      breadcrumbs={[
        { label: 'Penawaran' },
        { label: 'Riwayat Penawaran', href: '/riwayat-penawaran' },
        { label: 'Buat Penawaran Baru' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Memuat form penawaran...</div>}>
        <BuatPenawaranForm />
      </Suspense>
    </AppLayout>
  );
}
