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

// ── Functions ──────────────────────────────────

export async function getJournalEntriesBySourceId(sourceId: string): Promise<JournalEntryListItem[]> {
  return api.getList<JournalEntryListItem>('/journal-entries', { sourceId, perPage: 10 })
    .then((res) => res.data);
}

export async function getJournalEntryDetail(id: string): Promise<JournalEntryDetail> {
  const res = await api.get<JournalEntryDetail>(`/journal-entries/${id}`);
  return res.data;
}
