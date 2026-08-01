'use client';

import React, { useState } from 'react';
import StockInSummaryCards from './StockInSummaryCards';
import StockInTable from './StockInTable';

export default function StockInContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-5">
      <StockInSummaryCards refreshKey={refreshKey} />
      <StockInTable refreshKey={refreshKey} onStockIn={refresh} />
    </div>
  );
}
