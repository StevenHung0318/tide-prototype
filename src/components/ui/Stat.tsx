import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

interface Props {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'tide' | 'up' | 'down' | 'amber' | 'aqua';
  size?: 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const tones = {
  default: 'text-ink',
  tide: 'text-tide',
  up: 'text-up',
  down: 'text-down',
  amber: 'text-amber',
  aqua: 'text-aqua',
};

export function Stat({ label, value, sub, tone = 'default', size = 'md', className, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'flex flex-col gap-1 text-left min-w-0',
        onClick && 'cursor-pointer group',
        className,
      )}
    >
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cx('display num font-semibold truncate', size === 'lg' ? 'text-3xl' : 'text-xl', tones[tone], onClick && 'group-hover:underline decoration-1 underline-offset-4')}>{value}</div>
      {sub && <div className="text-xs text-ink-2 num">{sub}</div>}
    </Tag>
  );
}

/** Horizontal row of stats separated by hairlines (PRD §1.1). */
export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'grid grid-cols-2 md:grid-cols-4 bg-panel border border-line rounded-md divide-x divide-line [&>*]:px-4 [&>*]:py-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
