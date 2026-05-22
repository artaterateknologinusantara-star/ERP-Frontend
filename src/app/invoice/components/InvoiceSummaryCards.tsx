import React from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { Receipt, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const cards: SummaryCardData[] = [
  { id: 'inv-total', label: 'Total Invoice', value: '64', sub: 'Bulan ini', icon: <Receipt size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'inv-outstanding', label: 'Outstanding', value: 'Rp 4,2M', sub: 'Belum terbayar', icon: <Clock size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'inv-paid', label: 'Terbayar', value: 'Rp 12,8M', sub: 'Bulan ini', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600', trend: { value: 15, label: 'vs bulan lalu' } },
  { id: 'inv-overdue', label: 'Overdue', value: '7', sub: 'Perlu tindak lanjut', icon: <AlertCircle size={16} />, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
];

export default function InvoiceSummaryCards() {
  return <SummaryCards cards={cards} />;
}
