'use client';

import { useQuery } from '@tanstack/react-query';
import { approvalService } from '@/services/approval.service';
import { hasAnyApprovePermission } from '@/lib/permissions';

// Shared across Sidebar (nav badge) and Topbar (bell dropdown) — react-query dedupes the query key
// so both mounting at once only fires one request. Polled every 60s so the badge stays reasonably
// fresh without hammering the API; disabled entirely for accounts with no Approve permission
// anywhere (most accounts), since the endpoint would just return an empty list for them anyway.
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: approvalService.getPending,
    enabled: hasAnyApprovePermission(),
    refetchInterval: 60_000,
  });
}
