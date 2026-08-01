'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, CheckCircle2, Package, FileText } from 'lucide-react';
import { quotationService } from '@/services/quotation.service';
import { getLowStockItems, LowStockItem } from '@/services/inventory.service';
import { getARStats, ARStats } from '@/services/finance.service';
import type { QuotationListItem } from '@/types';

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  desc: string;
  time: string;
  icon: React.ReactNode;
  href?: string;
}

const typeStyles: Record<string, string> = {
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  info:    'bg-blue-50 border-blue-200 text-blue-700',
};

export default function DashboardAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      quotationService.list({ perPage: 100 }),
      getLowStockItems(),
      getARStats(),
    ]).then(([qtRes, stockRes, arRes]) => {
      const list: Alert[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (qtRes.status === 'fulfilled') {
        const terkirim = (qtRes.value.data as Array<QuotationListItem & { validUntil?: string }>)
          .filter((q) => q.status === 'Terkirim' && q.isLatestRevision);
        terkirim.forEach((q) => {
          if (!q.validUntil) return;
          const expiry = new Date(q.validUntil);
          const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
          if (daysLeft <= 7 && daysLeft >= 0) {
            list.push({
              id: `exp-${q.id}`,
              type: daysLeft <= 2 ? 'warning' : 'info',
              title: `${q.no} ${daysLeft === 0 ? 'kadaluarsa hari ini' : `kadaluarsa ${daysLeft} hari lagi`}`,
              desc: `${q.customerName} — ${new Intl.NumberFormat('id-ID', { notation: 'compact', currency: 'IDR', style: 'currency' }).format(q.grandTotal)}`,
              time: daysLeft === 0 ? 'Hari ini' : `${daysLeft} hr lagi`,
              icon: <Clock size={14} />,
              href: '/riwayat-penawaran',
            });
          }
        });

        const expiredCount = terkirim.filter((q) => {
          if (!q.validUntil) return false;
          return new Date(q.validUntil) < today;
        }).length;
        if (expiredCount > 0) {
          list.push({
            id: 'qt-expired',
            type: 'warning',
            title: `${expiredCount} penawaran sudah kadaluarsa`,
            desc: 'Status masih Terkirim, perlu update atau follow-up',
            time: 'Perlu tindakan',
            icon: <FileText size={14} />,
            href: '/riwayat-penawaran',
          });
        }
      }

      if (stockRes.status === 'fulfilled') {
        stockRes.value.slice(0, 3).forEach((item: LowStockItem) => {
          list.push({
            id: `stock-${item.id}`,
            type: 'warning',
            title: `Stok menipis: ${item.name}`,
            desc: `${item.code} — ${item.stock.toLocaleString('id-ID')} ${item.uom} (min: ${item.minStock})`,
            time: `Kurang ${item.shortage.toLocaleString('id-ID')}`,
            icon: <Package size={14} />,
            href: '/warehouse',
          });
        });
      }

      if (arRes.status === 'fulfilled') {
        const ar = arRes.value as ARStats;
        if (ar.overdueCount > 0) {
          const overdueTotal = ar.overdue1to30 + ar.overdue31to60 + ar.overdue61to90 + ar.overdueOver90;
          list.push({
            id: 'ar-overdue',
            type: 'warning',
            title: `${ar.overdueCount} invoice AR overdue`,
            desc: `Outstanding overdue: Rp ${overdueTotal.toLocaleString('id-ID')}`,
            time: 'Perlu tindakan',
            icon: <AlertTriangle size={14} />,
            href: '/accounts-receivable',
          });
        }
      }

      if (list.length === 0) {
        list.push({
          id: 'all-good',
          type: 'success',
          title: 'Semua dalam kondisi baik',
          desc: 'Tidak ada peringatan aktif saat ini',
          time: 'Baru saja',
          icon: <CheckCircle2 size={14} />,
        });
      }

      setAlerts(list.slice(0, 6));
    }).finally(() => setLoading(false));
  }, []);

  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  return (
    <div className="erp-card shadow-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-700 text-foreground">Notifikasi & Peringatan</h3>
        {!loading && warningCount > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-700 px-2 py-0.5 rounded-full">{warningCount} aktif</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2.5 p-3 rounded-lg border ${typeStyles[alert.type]} ${alert.href ? 'cursor-pointer hover:opacity-90' : ''} transition-opacity`}
              onClick={() => alert.href && router.push(alert.href)}
            >
              <span className="mt-0.5 flex-shrink-0">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-600 leading-tight">{alert.title}</p>
                <p className="text-xs mt-0.5 opacity-80 truncate">{alert.desc}</p>
              </div>
              <span className="text-2xs font-500 opacity-70 flex-shrink-0 whitespace-nowrap">{alert.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
