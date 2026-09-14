import { cx } from '@/lib/format';

/** Small marker that an APR includes TIDE rewards. */
export function TideBadge({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-tide/15 text-tide text-2xs font-medium leading-none align-middle', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-tide" />
      TIDE
    </span>
  );
}
