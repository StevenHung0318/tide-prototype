import { Link } from 'react-router-dom';
import type { Vault } from '@/lib/types';
import { useVaultApr } from '@/store/selectors';
import { fmtMultiplier, fmtPct, cx } from '@/lib/format';
import { InfoDot } from '@/components/ui/Tooltip';

interface Props {
  vault: Vault;
  compact?: boolean; // popover variant
  className?: string;
}

/**
 * APR breakdown — PRD §2.3. Shared by Markets hover popover and vault page.
 * Rows sum by construction (see aprBreakdown in lib/math).
 */
export function AprBreakdown({ vault, compact, className }: Props) {
  const { breakdown: b, showBoost } = useVaultApr(vault);
  const headline = showBoost ? b.yourApr : b.totalApr;
  return (
    <div className={cx('text-sm num', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-ink-2">Total APR</span>
        <span className={cx('display font-semibold', compact ? 'text-lg' : 'text-2xl')}>{fmtPct(b.totalApr)}</span>
      </div>
      <div className="my-2 border-t border-line" />
      <Row k="Fee APR (7d avg)" v={fmtPct(b.feeApr)} />
      <Row
        k={
          <span className="inline-flex items-center gap-1.5">
            TIDE rewards APR
            <InfoDot tip="Paid in TIDE. Claim 50% instantly or lock 60 days for the full amount." />
          </span>
        }
        v={fmtPct(b.baseTideApr)}
        tone="text-tide"
      />
      {showBoost && (
        <Row
          sub
          k="Your boost"
          v={
            <span className="text-tide">
              <span className="text-ink-3">{fmtMultiplier(b.boost)} →</span> {fmtPct(b.yourTideApr)}
            </span>
          }
        />
      )}
      <div className="my-2 border-t border-line" />
      {showBoost ? (
        <div className="flex items-baseline justify-between">
          <span className="text-ink font-medium">Your APR</span>
          <span className={cx('display font-semibold text-aqua', compact ? 'text-lg' : 'text-2xl')}>{fmtPct(headline)}</span>
        </div>
      ) : (
        <Link to="/rewards#boost" className="text-xs text-tide hover:underline inline-flex items-center gap-1">
          Lock TIDE to boost rewards up to 1.5x →
        </Link>
      )}
    </div>
  );
}

function Row({ k, v, tone, sub }: { k: React.ReactNode; v: React.ReactNode; tone?: string; sub?: boolean }) {
  return (
    <div className={cx('flex items-center justify-between py-1', sub && 'pl-3 text-xs')}>
      <span className={sub ? 'text-ink-3' : 'text-ink-2'}>{k}</span>
      <span className={cx('font-medium', tone ?? 'text-ink')}>{v}</span>
    </div>
  );
}
