import React from 'react';
import { XCircle } from 'lucide-react';

export interface WorkflowStep {
  label: string;
}

interface WorkflowStepperProps {
  /** Small uppercase label above the steps, e.g. "Progress SO", "Progress PR". */
  title: string;
  steps: WorkflowStep[];
  /** Index into `steps` of the currently-active step. Steps before it render as done. */
  currentStep: number;
  /** When true, renders a single cancelled banner instead of the step row. */
  cancelled?: boolean;
  cancelledLabel?: string;
}

/**
 * Shared step-progress visualization for document workflows (SO, PR, PO, ...). Keeping this in
 * one place is what makes "Progress SO" / "Progress PR" / etc. look and behave the same way
 * across modules instead of each detail page reinventing its own stepper.
 */
export default function WorkflowStepper({
  title, steps, currentStep, cancelled, cancelledLabel,
}: WorkflowStepperProps) {
  if (cancelled) {
    return (
      <div className="erp-card flex items-center gap-2 text-sm text-red-600 border border-red-200 bg-red-50">
        <XCircle size={15} />
        <span className="font-600">{cancelledLabel ?? 'Dokumen telah dibatalkan'}</span>
      </div>
    );
  }

  return (
    <div className="erp-card">
      <p className="text-[10px] font-600 text-muted-foreground uppercase tracking-wider mb-3">{title}</p>
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center shrink-0">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 transition-all',
                  done ? 'bg-green-500 text-white' :
                  active ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-1' :
                    'bg-muted text-muted-foreground',
                ].join(' ')}>
                  {done ? '✓' : idx + 1}
                </div>
                <span className={[
                  'text-[10px] mt-1 text-center leading-tight whitespace-nowrap',
                  done ? 'text-green-600 font-500' :
                  active ? 'text-primary font-600' :
                    'text-muted-foreground',
                ].join(' ')}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={[
                  'flex-1 h-0.5 mx-1 mb-4',
                  idx < currentStep ? 'bg-green-400' : 'bg-muted',
                ].join(' ')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
