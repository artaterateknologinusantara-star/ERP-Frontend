// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatRp(value: number, compact = false): string {
  if (value === 0) return 'Rp 0';
  if (compact) {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}Rb`;
  }
  return 'Rp ' + value.toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

export function formatRpOrDash(value: number): string {
  if (value === 0) return '—';
  return formatRp(value);
}

// ─── Date ─────────────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  if (!dateString || dateString === '-') return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  if (!dateString || dateString === '-') return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function isOverdue(dueDateString: string): boolean {
  if (!dueDateString || dueDateString === '-') return false;
  try {
    const due = new Date(dueDateString);
    return due < new Date();
  } catch {
    return false;
  }
}

// ─── Number ───────────────────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('id-ID');
}

// ─── String ───────────────────────────────────────────────────────────────────

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}
