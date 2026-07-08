import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntryListItem {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceType: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
}

export interface JournalEntryDetail extends JournalEntryListItem {
  sourceId?: string;
  reversedByEntryId?: string;
  postedAt?: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export interface CreateOpeningBalanceLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface CreateOpeningBalanceRequest {
  date?: string;
  description?: string;
  lines: CreateOpeningBalanceLine[];
}

// ── Functions ──────────────────────────────────

export async function getJournalEntriesBySourceId(sourceId: string): Promise<JournalEntryListItem[]> {
  return api.getList<JournalEntryListItem>('/journal-entries', { sourceId, perPage: 10 })
    .then((res) => res.data);
}

export async function getJournalEntryDetail(id: string): Promise<JournalEntryDetail> {
  const res = await api.get<JournalEntryDetail>(`/journal-entries/${id}`);
  return res.data;
}

/** Cek Opening Balance yang sudah Posted sebelumnya — dipakai untuk peringatan anti-duplikasi. */
export async function getExistingPostedOpeningBalances(): Promise<JournalEntryListItem[]> {
  return api.getList<JournalEntryListItem>('/journal-entries', {
    sourceType: 'OpeningBalance',
    status: 'Posted',
    perPage: 5,
  }).then((res) => res.data);
}

export async function createOpeningBalance(payload: CreateOpeningBalanceRequest): Promise<JournalEntryDetail> {
  const res = await api.post<JournalEntryDetail>('/journal-entries/opening-balance', payload);
  return res.data;
}
