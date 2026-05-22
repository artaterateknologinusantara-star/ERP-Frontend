import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventorySummaryCards from '../item-master/components/InventorySummaryCards';
import ItemMasterTable from '../item-master/components/ItemMasterTable';

export default function WarehousePage() {
  return (
    <AppLayout
      title="Warehouse"
      breadcrumbs={[{ label: 'SynteraERP' }, { label: 'Inventory' }, { label: 'Warehouse' }]}
    >
      <div className="space-y-5">
        <InventorySummaryCards />
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4">Daftar Gudang</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Gudang Jakarta', address: 'Jl. Industri No. 12, Jakarta Utara', manager: 'Budi Santoso', capacity: '500 m²', items: 248, status: 'Aktif' },
              { name: 'Gudang Surabaya', address: 'Jl. Rungkut Industri No. 8, Surabaya', manager: 'Rizky Ananda', capacity: '300 m²', items: 64, status: 'Aktif' },
              { name: 'Gudang Bandung', address: 'Jl. Cimahi Industri No. 5, Bandung', manager: 'Sari Wulandari', capacity: '200 m²', items: 0, status: 'Tidak Aktif' },
            ]?.map((wh) => (
              <div key={wh?.name} className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[13px] font-700 text-foreground">{wh?.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${wh?.status === 'Aktif' ? 'status-disetujui' : 'status-draft'}`}>{wh?.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{wh?.address}</p>
                <p className="text-xs text-muted-foreground mt-1">Manager: {wh?.manager}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div><p className="text-xs text-muted-foreground">Kapasitas</p><p className="text-[13px] font-600">{wh?.capacity}</p></div>
                  <div className="text-right"><p className="text-xs text-muted-foreground">Total Item</p><p className="text-[13px] font-600">{wh?.items}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ItemMasterTable />
      </div>
    </AppLayout>
  );
}
