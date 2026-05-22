import React from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { Users, TrendingUp, Star, Building2 } from 'lucide-react';

const cards: SummaryCardData[] = [
  { id: 'cust-total', label: 'Total Customer', value: '48', sub: 'Customer aktif', icon: <Users size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'cust-revenue', label: 'Revenue Customer', value: 'Rp 23,5M', sub: 'Sepanjang waktu', icon: <TrendingUp size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600', trend: { value: 5, label: 'vs bulan lalu' } },
  { id: 'cust-top', label: 'Top Customer', value: 'PT Telkom', sub: 'Revenue tertinggi', icon: <Star size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'cust-new', label: 'Customer Baru', value: '6', sub: 'Bulan ini', icon: <Building2 size={16} />, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
];

export default function CustomerSummaryCards() {
  return <SummaryCards cards={cards} />;
}
