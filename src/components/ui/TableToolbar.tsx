'use client';

import React from 'react';
import { Search, Filter, Download } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface TableToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  totalCount: number;
  countLabel?: string;
  statusFilter?: string;
  onStatusFilter?: (value: string) => void;
  statusOptions?: FilterOption[];
  onExport?: () => void;
  actions?: React.ReactNode;
}

export default function TableToolbar({
  search,
  onSearch,
  searchPlaceholder = 'Cari...',
  totalCount,
  countLabel = 'data',
  statusFilter,
  onStatusFilter,
  statusOptions,
  onExport,
  actions,
}: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="erp-input pl-8 w-full"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Status filter */}
      {statusOptions && onStatusFilter && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground flex-shrink-0" />
          <select
            className="erp-input pr-8 min-w-[140px]"
            value={statusFilter}
            onChange={(e) => onStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Count */}
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {totalCount} {countLabel}
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        {onExport && (
          <button className="btn-secondary" onClick={onExport}>
            <Download size={14} /> Export
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
