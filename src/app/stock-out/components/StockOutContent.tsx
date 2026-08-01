'use client';

import React, { useState } from 'react';
import StockOutSummaryCards from './StockOutSummaryCards';
import DeliveryOrderTable from './DeliveryOrderTable';

export default function StockOutContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-5">
      <StockOutSummaryCards refreshKey={refreshKey} />
      <DeliveryOrderTable refreshKey={refreshKey} onRefresh={refresh} />
    </div>
  );
}
