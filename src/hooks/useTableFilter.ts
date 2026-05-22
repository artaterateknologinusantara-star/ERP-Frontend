'use client';

import { useState, useMemo } from 'react';

type SortDir = 'asc' | 'desc';

interface UseTableFilterOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  statusField?: keyof T;
  defaultPerPage?: number;
  defaultSortKey?: keyof T;
  defaultSortDir?: SortDir;
}

export function useTableFilter<T extends object>({
  data,
  searchFields,
  statusField,
  defaultPerPage = 10,
  defaultSortKey,
  defaultSortDir = 'asc',
}: UseTableFilterOptions<T>) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const filtered = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchFields.some((field) => {
          const val = (row as Record<string, unknown>)[field as string];
          return typeof val === 'string' && val.toLowerCase().includes(q);
        })
      );
    }

    if (statusField && statusFilter !== 'Semua') {
      result = result.filter((row) => (row as Record<string, unknown>)[statusField as string] === statusFilter);
    }

    if (sortKey) {
      result.sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey as string];
        const bv = (b as Record<string, unknown>)[sortKey as string];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, statusFilter, statusField, sortKey, sortDir, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePageData = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handlePerPageChange = (value: number) => {
    setPerPage(value);
    setPage(1);
  };

  return {
    search,
    statusFilter,
    page,
    perPage,
    sortKey,
    sortDir,
    filtered,
    pageData: safePageData,
    totalPages,
    handleSearch,
    handleStatusFilter,
    handleSort,
    handlePerPageChange,
    setPage,
  };
}
