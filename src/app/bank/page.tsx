'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import FinanceSummaryCards from '../finance-reports/components/FinanceSummaryCards';
import FinanceCharts from '../finance-reports/components/FinanceCharts';
import { getBalances, AccountBalance } from '@/services/bank.service';
import { formatRp } from '@/lib/format';

const ACCOUNT_COLORS: Record<string, string> = {
  '1-1001': 'bg-slate-50 border-slate-200',
  '1-1002': 'bg-blue-50 border-blue-200',
  '1-1003': 'bg-amber-50 border-amber-200',
  '1-1004': 'bg-green-50 border-green-200',
};

export default function BankPage() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBalances()
      .then(setBalances)
      .catch(() => toast.error('Gagal memuat saldo rekening bank'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout
      title="Bank"
      breadcrumbs={[{ label: 'Finance' }, { label: 'Bank' }]}
    >
      <div className="space-y-5">
        <FinanceSummaryCards />
        <FinanceCharts />
        <div className="erp-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-700 text-foreground">Rekening Bank Perusahaan</h3>
            <Link href="/bank-reconciliation" className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-600">
              <RefreshCw size={12} /> Rekonsiliasi Bank
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat saldo...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {balances.map((acc) => (
                <div key={acc.accountId} className={`p-4 rounded-lg border ${ACCOUNT_COLORS[acc.accountCode] ?? 'bg-muted/30 border-border'}`}>
                  <p className="text-[13px] font-700 text-foreground">{acc.accountName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{acc.accountCode}</p>
                  <p className="text-xl font-800 text-foreground font-tabular mt-3">{formatRp(acc.balance)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Saldo GL per hari ini</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
