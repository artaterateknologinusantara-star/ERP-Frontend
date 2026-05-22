'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}

export default function TablePagination({
  page,
  totalPages,
  totalCount,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50],
}: TablePaginationProps) {
  const from = Math.min((page - 1) * perPage + 1, totalCount);
  const to = Math.min(page * perPage, totalCount);

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
      {/* Left: rows per page + count */}
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {onPerPageChange && (
          <>
            <span>Tampilkan</span>
            <select
              className="erp-input w-16 text-center"
              value={perPage}
              onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </>
        )}
        <span>
          {totalCount === 0
            ? 'Tidak ada data'
            : `${from}–${to} dari ${totalCount}`}
        </span>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={15} />
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-[13px]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 rounded text-[13px] font-500 transition-colors ${
                page === p
                  ? 'bg-primary text-primary-foreground font-700'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          className="p-1.5 rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
