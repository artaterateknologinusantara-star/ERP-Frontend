import React from 'react';
import SummaryCards from '@/components/ui/SummaryCards';
import { SummaryCardData } from '@/types';
import { ShoppingBag, Truck, CheckCircle, Clock } from 'lucide-react';

const cards: SummaryCardData[] = [
  { id: 'po-total', label: 'Total PO', value: '19', sub: 'Bulan ini', icon: <ShoppingBag size={16} />, iconBg: 'bg-blue-50', iconColor: 'text-primary' },
  { id: 'po-ordered', label: 'Ordered', value: '11', sub: 'Menunggu pengiriman', icon: <Clock size={16} />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { id: 'po-partial', label: 'Partial Receive', value: '4', sub: 'Sebagian diterima', icon: <Truck size={16} />, iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
  { id: 'po-completed', label: 'Completed', value: '4', sub: 'Selesai bulan ini', icon: <CheckCircle size={16} />, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
];

export default function PurchaseOrderSummaryCards() {
  return <SummaryCards cards={cards} />;
}
