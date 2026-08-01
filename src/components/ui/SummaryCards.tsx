import React from 'react';
import { SummaryCardData } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryCardsProps {
  cards: SummaryCardData[];
  cols?: 2 | 3 | 4 | 5;
}

export default function SummaryCards({ cards, cols = 4 }: SummaryCardsProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  }[cols];

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {cards.map((card) => (
        <div key={card.id} className="erp-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className={card.iconColor}>{card.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-500">{card.label}</p>
            <p className="text-2xl font-800 text-foreground font-tabular leading-tight">{card.value}</p>
            {card.sub && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{card.sub}</p>
            )}
            {card.trend && (
              <div className={`flex items-center gap-1 mt-0.5 text-xs font-600 ${card.trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {card.trend.value >= 0
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />}
                <span>{Math.abs(card.trend.value)}% {card.trend.label}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
