import { useMemo } from 'react';
import { ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import type { Vault } from '@/lib/types';
import * as m from '@/lib/math';
import type { MarketStatus } from '@/lib/market';
import { priceSeries } from '@/lib/series';
import { cx, fmtPct, fmtQuote, fmtRelativeDays } from '@/lib/format';
import { Tooltip } from '@/components/ui/Tooltip';

const AQUA = '#39D0C4';
const AMBER = '#F5B14C';
const RED = '#F87171';

interface Props {
  vault: Vault;
  market: MarketStatus;
}

/**
 * Price Range — TradingView-style: price over the last 7 days, the LP range as
 * a horizontal band, and the live price tagged on the right axis.
 */
export function PriceRange({ vault: v, market }: Props) {
  const g = m.rangeGeometry(v, market);
  const status = m.rangeStatus(v, market);
  const inBand = v.currentPrice >= g.lower && v.currentPrice <= g.upper;
  const data = useMemo(() => priceSeries(v.id, v.rangeCenter, v.currentPrice, v.rangeWidthPct), [v]);

  const tone = g.defensive ? AMBER : AQUA;
  const priceTone = inBand ? (g.defensive ? AMBER : AQUA) : RED;

  // Y domain: cover the band, the faint reset bands and the price path with breathing room.
  const [yMin, yMax] = useMemo(() => {
    const prices = data.map((d) => d.price);
    const lo = Math.min(g.resetLower, ...prices);
    const hi = Math.max(g.resetUpper, ...prices);
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }, [data, g]);

  const dayTick = (t: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(t));

  return (
    <section className="bg-panel border border-line rounded-md">
      <header className="flex items-center justify-between px-4 h-11 border-b border-line">
        <h3 className="display text-sm font-semibold">Price range</h3>
        {g.defensive ? (
          <Tooltip wide align="end" content="US equities can gap at the open. While the market is closed, Core vaults widen their range so a reopening gap is less likely to force a rebalance at a bad price.">
            <span className="inline-flex items-center gap-1.5 text-xs text-amber cursor-help">
              <span className="h-1.5 w-1.5 rounded-full bg-amber ring-2 ring-amber/25" />
              Defensive · US market closed
            </span>
          </Tooltip>
        ) : (
          <span className={cx('inline-flex items-center gap-1.5 text-xs', status === 'out' ? 'text-down' : 'text-ink-2')}>
            <span className={cx('h-1.5 w-1.5 rounded-full', status === 'out' ? 'bg-down' : 'bg-aqua')} />
            {status === 'out' ? 'Out of range' : 'In range'}
          </span>
        )}
      </header>

      <div className="h-64 pt-3 pr-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tickFormatter={dayTick}
              ticks={data.filter((_, i) => i % 24 === 0).map((d) => d.t)}
              tick={{ fill: '#6B7690', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#232E44' }}
            />
            <YAxis
              orientation="right"
              domain={[yMin, yMax]}
              tickFormatter={(n: number) => fmtQuote(n)}
              tick={{ fill: '#6B7690', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickCount={6}
            />
            {/* reset bands — faint */}
            <ReferenceArea y1={g.resetLower} y2={g.lower} fill={tone} fillOpacity={0.05} strokeOpacity={0} />
            <ReferenceArea y1={g.upper} y2={g.resetUpper} fill={tone} fillOpacity={0.05} strokeOpacity={0} />
            {/* LP range band */}
            <ReferenceArea y1={g.lower} y2={g.upper} fill={tone} fillOpacity={0.14} strokeOpacity={0} />
            <ReferenceLine y={g.upper} stroke={tone} strokeDasharray="4 4" strokeOpacity={0.9} label={{ value: `Upper ${fmtQuote(g.upper)}`, position: 'insideTopLeft', fill: tone, fontSize: 11, dy: -2 }} />
            <ReferenceLine y={g.lower} stroke={tone} strokeDasharray="4 4" strokeOpacity={0.9} label={{ value: `Lower ${fmtQuote(g.lower)}`, position: 'insideBottomLeft', fill: tone, fontSize: 11, dy: 2 }} />
            {/* live price tag on the axis */}
            <ReferenceLine y={v.currentPrice} stroke={priceTone} strokeOpacity={0.35} label={<PriceTag price={v.currentPrice} color={priceTone} />} />
            <RTooltip
              cursor={{ stroke: '#2E3B55', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { t: number; price: number };
                const inR = p.price >= g.lower && p.price <= g.upper;
                return (
                  <div className="bg-panel-2 border border-line-2 rounded shadow-pop px-2.5 py-1.5 text-xs num">
                    <div className="text-ink-3">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(p.t))}</div>
                    <div className="text-ink font-medium">{fmtQuote(p.price)} <span className={inR ? 'text-aqua' : 'text-down'}>{inR ? 'in range' : 'out of range'}</span></div>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="price" stroke="#E6EBF5" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {status === 'out' && (
        <div className="px-4 pb-3 text-xs text-down flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-down" />
          Out of range for 14 min · auto-rebalance at 30 min
        </div>
      )}
      {g.defensive && <div className="px-4 pb-3 text-xs text-ink-3">Normal range ±{Math.round(v.rangeWidthPct * 100)}% resumes at the US open.</div>}

      <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
        <Mini label="Range width" value={`±${Math.round(g.widthPct * 100)}%`} tone={g.defensive ? 'amber' : undefined} note={g.defensive ? `normally ±${Math.round(v.rangeWidthPct * 100)}%` : undefined} />
        <Mini label="Time in range (7d)" value={fmtPct(v.timeInRange7d, 0)} />
        <Mini label="Last rebalance" value={fmtRelativeDays(v.lastRebalanceDaysAgo)} />
      </div>
    </section>
  );
}

/** TradingView-style last-price tag drawn over the right axis. */
function PriceTag({ price, color, viewBox }: { price: number; color: string; viewBox?: { x: number; y: number; width: number; height: number } }) {
  if (!viewBox) return null;
  const x = viewBox.x + viewBox.width + 2;
  const y = viewBox.y;
  const text = fmtQuote(price);
  const w = Math.max(44, text.length * 7 + 12);
  return (
    <g>
      <rect x={x} y={y - 10} width={w} height={20} rx={3} fill={color} />
      <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0E1420" fontFamily="Inter, system-ui">
        {text}
      </text>
    </g>
  );
}

function Mini({ label, value, tone, note }: { label: string; value: string; tone?: 'amber'; note?: string }) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-2xs text-ink-3">{label}</div>
      <div className={cx('num text-sm font-semibold', tone === 'amber' ? 'text-amber' : 'text-ink')}>
        {value}
        {note && <span className="ml-1.5 text-2xs font-normal text-ink-3">{note}</span>}
      </div>
    </div>
  );
}
