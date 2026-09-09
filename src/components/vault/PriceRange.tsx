import { useMemo, useState } from 'react';
import type { Vault } from '@/lib/types';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import type { MarketStatus } from '@/lib/market';
import { cx, fmtPct, fmtQuote, fmtRelativeDays } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  vault: Vault;
  market: MarketStatus;
}

/**
 * Price Range — the signature component (PRD §2.2).
 * Horizontal price axis; LP band, reset bands, live price line. HTML-positioned
 * so the band can animate its width when a Core vault flips to defensive mode.
 */
export function PriceRange({ vault: v, market }: Props) {
  const g = m.rangeGeometry(v, market);
  const status = m.rangeStatus(v, market);
  const inBand = v.currentPrice >= g.lower && v.currentPrice <= g.upper;
  const [hoverReset, setHoverReset] = useState<null | 'lo' | 'hi'>(null);

  // Axis domain is fixed to the *widest* (defensive) geometry so toggling
  // between modes moves the band, not the axis.
  const domain = useMemo(() => {
    const wide = m.rangeGeometry(v, 'closed');
    const base = v.tier === 'Core' ? wide : g;
    const half = Math.max(
      base.widthPct + CONSTANTS.RESET_BAND_PCT + 0.1,
      Math.abs(v.currentPrice - v.rangeCenter) / v.rangeCenter + CONSTANTS.RESET_BAND_PCT + 0.08,
    );
    return { min: v.rangeCenter * (1 - half), max: v.rangeCenter * (1 + half) };
  }, [v, g]);

  const x = (price: number) => ((price - domain.min) / (domain.max - domain.min)) * 100;
  const pct = (a: number, b: number) => ({ left: `${x(a)}%`, width: `${x(b) - x(a)}%` });
  const priceX = Math.min(99, Math.max(1, x(v.currentPrice)));

  const ticks = useMemo(() => {
    const n = 6;
    return Array.from({ length: n + 1 }, (_, i) => domain.min + ((domain.max - domain.min) * i) / n);
  }, [domain]);

  const tone = g.defensive ? 'amber' : 'aqua';
  const bandFill = g.defensive ? 'bg-amber/25 border-amber/70' : 'bg-aqua/20 border-aqua/70';
  const resetFill = g.defensive ? 'bg-amber/10' : 'bg-aqua/10';
  const priceTone = inBand ? (g.defensive ? 'bg-amber' : 'bg-aqua') : 'bg-down';
  const priceText = inBand ? (g.defensive ? 'text-amber' : 'text-aqua') : 'text-down';
  const deviation = (v.currentPrice - v.rangeCenter) / v.rangeCenter;

  return (
    <section className="bg-panel border border-line rounded-md">
      <header className="flex items-center justify-between px-4 h-11 border-b border-line">
        <div className="flex items-center gap-3">
          <h3 className="display text-sm font-semibold">Price range</h3>
          <span className="text-xs text-ink-3 num">
            {v.token0} priced in {v.token1}
          </span>
        </div>
        {g.defensive ? (
          <Tooltip
            wide
            align="end"
            content="US equities can gap at the open. While the market is closed, Core vaults widen their range so a reopening gap is less likely to push the position out of range and force a rebalance at a bad price."
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-amber cursor-help">
              <span className="h-1.5 w-1.5 rounded-full bg-amber ring-2 ring-amber/25" />
              Defensive range — US market closed
            </span>
          </Tooltip>
        ) : (
          <span className={cx('inline-flex items-center gap-1.5 text-xs', status === 'out' ? 'text-down' : 'text-ink-2')}>
            <span className={cx('h-1.5 w-1.5 rounded-full', status === 'out' ? 'bg-down' : 'bg-aqua')} />
            {status === 'out' ? 'Out of range' : 'In range'}
          </span>
        )}
      </header>

      <div className="px-4 pt-6 pb-3">
        <div className="relative h-[132px] select-none">
          {/* price label */}
          <div
            className={cx('absolute -top-1 -translate-x-1/2 transition-[left] duration-500 ease-out z-20', priceText)}
            style={{ left: `${priceX}%` }}
          >
            <div className={cx('rounded border px-1.5 py-0.5 text-xs num font-semibold bg-panel whitespace-nowrap', inBand ? (g.defensive ? 'border-amber/60' : 'border-aqua/60') : 'border-down/60')}>
              {fmtQuote(v.currentPrice)}
              <span className="text-ink-3 font-normal ml-1">now</span>
            </div>
          </div>

          {/* band region */}
          <div className="absolute inset-x-0 top-8 h-14">
            {/* reset bands */}
            <div
              className={cx('absolute inset-y-0 rounded-l transition-all duration-500 ease-out', resetFill, hoverReset === 'lo' && 'brightness-150')}
              style={pct(g.resetLower, g.lower)}
              onMouseEnter={() => setHoverReset('lo')}
              onMouseLeave={() => setHoverReset(null)}
            />
            <div
              className={cx('absolute inset-y-0 rounded-r transition-all duration-500 ease-out', resetFill, hoverReset === 'hi' && 'brightness-150')}
              style={pct(g.upper, g.resetUpper)}
              onMouseEnter={() => setHoverReset('hi')}
              onMouseLeave={() => setHoverReset(null)}
            />
            {/* LP range band */}
            <div className={cx('absolute inset-y-0 border-x transition-all duration-500 ease-out', bandFill)} style={pct(g.lower, g.upper)}>
              <div className={cx('absolute inset-x-0 top-1/2 -translate-y-1/2 h-px', g.defensive ? 'bg-amber/40' : 'bg-aqua/40')} />
              <span className={cx('absolute -top-5 left-0 -translate-x-1/2 text-2xs num whitespace-nowrap', g.defensive ? 'text-amber' : 'text-aqua')}>
                {fmtQuote(g.lower)}
              </span>
              <span className={cx('absolute -top-5 right-0 translate-x-1/2 text-2xs num whitespace-nowrap', g.defensive ? 'text-amber' : 'text-aqua')}>
                {fmtQuote(g.upper)}
              </span>
              <span className={cx('absolute -bottom-5 left-1.5 text-2xs whitespace-nowrap', g.defensive ? 'text-amber/80' : 'text-ink-3')}>
                LP range ±{Math.round(g.widthPct * 100)}%
              </span>
            </div>
            {hoverReset && (
              <div
                className="absolute -top-14 z-30 w-64 rounded bg-panel-2 border border-line-2 shadow-pop px-2.5 py-1.5 text-xs text-ink-2 animate-fade-in"
                style={{ left: hoverReset === 'lo' ? `${x(g.resetLower)}%` : undefined, right: hoverReset === 'hi' ? `${100 - x(g.resetUpper)}%` : undefined }}
              >
                If price stays beyond this band for 30 min, the vault rebalances to a new range.
              </div>
            )}
          </div>

          {/* price line */}
          <div className={cx('absolute top-6 h-[74px] w-px -translate-x-1/2 transition-[left] duration-500 ease-out z-10', priceTone)} style={{ left: `${priceX}%` }}>
            <span className={cx('absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full', priceTone)} />
          </div>

          {/* axis */}
          <div className="absolute inset-x-0 bottom-4 h-px bg-line-2" />
          {ticks.map((t, i) => (
            <div key={i} className="absolute bottom-0 -translate-x-1/2 text-2xs text-ink-3 num" style={{ left: `${x(t)}%` }}>
              <span className="block mx-auto h-1.5 w-px bg-line-2 mb-0.5" />
              {fmtQuote(t)}
            </div>
          ))}
        </div>

        {status === 'out' && (
          <div className="mt-2 text-xs text-down flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-down" />
            Price {v.currentPrice < g.lower ? 'below' : 'above'} range for 14 min — auto-rebalance triggers at 30 min beyond the reset band.
          </div>
        )}
        {g.defensive && (
          <div className="mt-2 text-xs text-ink-3">
            Normal range ±{Math.round(v.rangeWidthPct * 100)}% resumes at the US open. Price sits {deviation >= 0 ? '+' : ''}
            {(deviation * 100).toFixed(1)}% from the range centre.
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
        <Mini label="Range width" value={`±${Math.round(g.widthPct * 100)}%`} tone={tone} defensiveNote={g.defensive ? `normally ±${Math.round(v.rangeWidthPct * 100)}%` : undefined} />
        <Mini label="Time in range (7d)" value={fmtPct(v.timeInRange7d, 0)} />
        <Mini label="Last rebalance" value={fmtRelativeDays(v.lastRebalanceDaysAgo)} />
      </div>
    </section>
  );
}

function Mini({ label, value, tone, defensiveNote }: { label: string; value: string; tone?: 'aqua' | 'amber'; defensiveNote?: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-2xs text-ink-3">{label}</div>
      <div className={cx('num text-sm font-semibold', tone === 'amber' ? 'text-amber' : 'text-ink')}>
        {value}
        {defensiveNote && <span className="ml-1.5 text-2xs font-normal text-ink-3">{defensiveNote}</span>}
      </div>
    </div>
  );
}
