import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from '../finance-reports/components/FinanceSummaryCards';
import FinanceCharts from '../finance-reports/components/FinanceCharts';

export default function BankPage() {
  return (
    <AppLayout
      title="Bank"
      breadcrumbs={[{ label: 'Finance' }, { label: 'Bank' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <FinanceCharts />
        <div className="erp-card shadow-card">
          <h3 className="text-[13px] font-700 text-foreground mb-4">Rekening Bank Perusahaan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { bank: 'Bank BCA', account: '123-456-7890', name: 'PT Syntera Teknologi Indonesia', balance: 1240000000, color: 'bg-blue-50 border-blue-200' },
              { bank: 'Bank Mandiri', account: '098-765-4321', name: 'PT Syntera Teknologi Indonesia', balance: 850000000, color: 'bg-amber-50 border-amber-200' },
              { bank: 'Bank BNI', account: '567-890-1234', name: 'PT Syntera Teknologi Indonesia', balance: 320000000, color: 'bg-green-50 border-green-200' },
            ]?.map((acc) => (
              <div key={acc?.bank} className={`p-4 rounded-lg border ${acc?.color}`}>
                <p className="text-[13px] font-700 text-foreground">{acc?.bank}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{acc?.account}</p>
                <p className="text-xs text-muted-foreground">{acc?.name}</p>
                <p className="text-xl font-800 text-foreground font-tabular mt-3">Rp {acc?.balance?.toLocaleString('id-ID')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Saldo tersedia</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
