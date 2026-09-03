import React from 'react';
import Link from 'next/link';

export type BannerTone = 'blue' | 'amber' | 'orange' | 'green' | 'purple' | 'red' | 'gray';

const TONE_CLASS: Record<BannerTone, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-800',
  amber:  'bg-amber-50 border-amber-200 text-amber-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  green:  'bg-green-50 border-green-200 text-green-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  red:    'bg-red-50 border-red-200 text-red-800',
  gray:   'bg-gray-50 border-gray-200 text-gray-600',
};

interface WorkflowBannerProps {
  tone: BannerTone;
  icon: React.ReactNode;
  message: React.ReactNode;
  /** When set, renders a "label →" link after the message — the next-step pointer. */
  linkHref?: string;
  linkLabel?: string;
}

/**
 * Shared contextual "what to do next" banner for document workflows. Pair with WorkflowStepper.
 * The optional link is what makes a step actionable instead of just informational — e.g. sending
 * the user straight to the Purchase Order that still needs Goods Receipt.
 */
export default function WorkflowBanner({ tone, icon, message, linkHref, linkLabel }: WorkflowBannerProps) {
  return (
    <div className={`flex items-start gap-2.5 text-sm px-4 py-3 border rounded-lg ${TONE_CLASS[tone]}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>
        {message}
        {linkHref && (
          <Link href={linkHref} className="ml-2 font-600 underline hover:no-underline whitespace-nowrap">
            {linkLabel ?? 'Lihat →'}
          </Link>
        )}
      </span>
    </div>
  );
}
