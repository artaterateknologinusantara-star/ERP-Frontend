import React from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { ShoppingCart, CheckCircle, Truck, DollarSign } from 'lucide-react';

const cards: SummaryCardData[] = [
  { id: 'so-draft', label: 'Draft', value: '8', sub: 'Belum diproses', icon: <ShoppingCart size={16} />, iconBg: 'bg-slate-50', iconColor: 'text-slate-500' },
  { id: 'so-open', label: 'Open', value: '23', sub: 'Sedang berjalan', icon: <CheckCircle size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'so-delivered', label: 'Delivered', value: '15', sub: 'Sudah dikirim', icon: <Truck size={16} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { id: 'so-nilai', label: 'Nilai SO Bulan Ini', value: 'Rp 8,4M', sub: '47 SO selesai', icon: <DollarSign size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600', trend: { value: 8, label: 'vs bulan lalu' } },
];

export default function SalesOrderSummaryCards() {
  return <SummaryCards cards={cards} />;
}
