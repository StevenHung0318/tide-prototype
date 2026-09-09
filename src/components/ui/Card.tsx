import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  children: ReactNode;
}

/** Flat panel with a hairline border. Deliberately no shadow, small radius. */
export function Card({ title, action, padded = true, className, children, ...rest }: Props) {
  return (
    <section {...rest} className={cx('bg-panel border border-line rounded-md', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-line">
          {title && <h3 className="display text-sm font-semibold text-ink">{title}</h3>}
          {action}
        </header>
      )}
      <div className={cx(padded && 'p-4')}>{children}</div>
    </section>
  );
}
