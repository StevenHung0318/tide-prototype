import type { ReactNode } from 'react';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-line-2 rounded-md">
      <svg viewBox="0 0 48 24" className="h-6 w-12 text-aqua/60 mb-4" fill="none" aria-hidden>
        <path d="M2 16c5 0 6-6 12-6s7 6 12 6 6-6 12-6 6 6 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="display text-md font-semibold text-ink">{title}</div>
      {body && <p className="text-sm text-ink-2 mt-1.5 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
