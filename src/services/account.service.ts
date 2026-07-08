import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parentAccountId?: string;
  normalBalance: string;
  isControlAccount: boolean;
  createdAt: string;
  children: Account[];
}

// ── Functions ──────────────────────────────────

export async function getAccountTree(): Promise<Account[]> {
  const res = await api.get<Account[]>('/accounts');
  return res.data;
}

function flatten(nodes: Account[]): Account[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

/** Semua akun (flat, termasuk anak-anak dari tree), akun control (parent) dikecualikan secara default. */
export async function getFlatAccounts(includeControl = false): Promise<Account[]> {
  const tree = await getAccountTree();
  const flat = flatten(tree);
  return includeControl ? flat : flat.filter((a) => !a.isControlAccount);
}
