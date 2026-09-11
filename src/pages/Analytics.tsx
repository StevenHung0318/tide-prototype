import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from 'recharts';
import { PROTOCOL } from '@/data/protocol';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { emissionsSeries } from '@/lib/series';
import { useStore } from '@/store/useStore';
import { cx, fmtInt, fmtPct, fmtPctSigned, fmtUsd } from '@/lib/format';
import { Segmented } from '@/components/ui/Tabs';

const TIDE = '#8B9CF7';
const AQUA = '#39D0C4';
const RAMP = ['#8B9CF7', '#6F80DA', '#5666B6', '#424E8F', '#323A69', '#252B4B'];
type Window = 'week' | 'all';

export function Analytics() {
  const [win, setWin] = useState<Window>('week');
  const forfeitsAdded = useStore((s) => s.forfeitsAdded);
  const weeks = useMemo(() => emissionsSeries(PROTOCOL.weeklyEmissionsUsd, PROTOCOL.buybackThisWeekUsd), []);
  const last = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const sum = (k: 'emissionsUsd' | 'buybacksUsd') => weeks.reduce((a, w) => a + w[k], 0);

  const emissions = win === 'week' ? last.emissionsUsd : sum('emissionsUsd');
  const buybacks = win === 'week' ? last.buybacksUsd : sum('buybacksUsd');
  const coverage = m.buybackCoverage(buybacks, emissions);
  const emissionsTide = win === 'week' ? PROTOCOL.weeklyEmissionsTide : PROTOCOL.weeklyEmissionsTide * weeks.length;

  const forfeits = PROTOCOL.redistribution.fromForfeits + forfeitsAdded;
  const pool = forfeits + PROTOCOL.redistribution.fromBuybacks;
  const updated = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date());

  return (
    <div className="space-y-6 max-w-[1080px] mx-auto">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-2xl font-semibold">Protocol analytics</h1>
            <p className="text-sm text-ink-2 mt-1">Onchain reporting for Tide vaults on Robinhood Chain.</p>
            <p className="text-2xs text-ink-3 mt-2">Updated {updated} · latest complete week highlighted</p>
          </div>
          <Segmented<Window> size="sm" value={win} onChange={setWin} options={[{ value: 'week', label: 'This week' }, { value: 'all', label: '8 weeks' }]} />
        </div>
        <Tiles>
          <Tile label="Emissions" value={fmtUsd(emissions, { compact: false })} tone="tide" sub={`${fmtInt(emissionsTide)} TIDE`} />
          <Tile label="Buybacks" value={fmtUsd(buybacks, { compact: false })} tone="aqua" sub={win === 'week' ? <Delta v={last.buybacksUsd / prev.buybacksUsd - 1} /> : 'Across the last 8 weeks'} />
          <Tile label="Buyback coverage" value={fmtPct(coverage)} tone={coverage >= 0.6 ? 'aqua' : 'amber'} sub="Buybacks ÷ emissions · target 60%" />
        </Tiles>
      </Panel>

      <Panel>
        <h2 className="display text-lg font-semibold">Buyback and lock</h2>
        <Tiles>
          <Tile
            label="Locker pool this week"
            value={`${fmtInt(pool)} TIDE`}
            tone="tide"
            sub={fmtUsd(pool * CONSTANTS.TIDE_PRICE, { compact: false })}
            rows={[
              ['From instant-claim forfeits', `${fmtInt(forfeits)} TIDE`],
              ['From buybacks', `${fmtInt(PROTOCOL.redistribution.fromBuybacks)} TIDE`],
            ]}
          />
          <Tile label="Lock rate" value={fmtPct(PROTOCOL.lockRate, 0)} sub="of claims choose the 60-day lock" rows={[['Locked supply', `${fmtInt(PROTOCOL.totalLockedTide)} TIDE`]]} />
          <Tile
            label="Market cap"
            value={fmtUsd(m.circulatingMarketCap(PROTOCOL.circulatingTide))}
            sub={`${(PROTOCOL.circulatingTide / 1e6).toFixed(0)}M TIDE circulating`}
            rows={[
              ['TIDE price', `$${CONSTANTS.TIDE_PRICE.toFixed(3)}`],
              ['Sales', 'None · mining only'],
            ]}
          />
        </Tiles>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarCard title="Emissions" total={fmtUsd(sum('emissionsUsd'), { compact: false })} data={weeks} k="emissionsUsd" color={TIDE} />
        <BarCard title="Buybacks" total={fmtUsd(sum('buybacksUsd'), { compact: false })} data={weeks} k="buybacksUsd" color={AQUA} />
      </div>

      <Allocation />
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="bg-panel border border-line rounded-lg p-5 md:p-6 space-y-5">{children}</section>;
}

function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 bg-deep border border-line rounded-md md:divide-x divide-y md:divide-y-0 divide-line">{children}</div>;
}

function Tile({ label, value, sub, tone, rows }: { label: string; value: string; sub?: ReactNode; tone?: 'tide' | 'aqua' | 'amber'; rows?: Array<[string, string]> }) {
  const color = tone === 'tide' ? 'text-tide' : tone === 'aqua' ? 'text-aqua' : tone === 'amber' ? 'text-amber' : 'text-ink';
  return (
    <div className="p-5">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cx('display num text-4xl font-semibold mt-2 leading-none', color)}>{value}</div>
      {sub && <div className="text-xs text-ink-2 mt-2 num">{sub}</div>}
      {rows && (
        <dl className="mt-4 pt-3 border-t border-line space-y-1.5 text-xs num">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Delta({ v }: { v: number }) {
  return <span className={v >= 0 ? 'text-up' : 'text-down'}>{fmtPctSigned(v)} from prior week</span>;
}

function BarCard({ title, total, data, k, color }: { title: string; total: string; data: ReturnType<typeof emissionsSeries>; k: 'emissionsUsd' | 'buybacksUsd'; color: string }) {
  const now = Date.now();
  const labelled = data.map((w, i) => ({ ...w, date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(now - (data.length - 1 - i) * 7 * 86_400_000)) }));
  const lastIdx = data.length - 1;
  return (
    <section className="bg-panel border border-line rounded-lg p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="display text-md font-semibold">{title}</h3>
        <span className="text-sm text-ink-2 num">{total} <span className="text-ink-3 text-xs">8 weeks</span></span>
      </div>
      <div className="h-44 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={labelled} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
            <XAxis dataKey="date" tick={{ fill: '#6B7690', fontSize: 11 }} tickLine={false} axisLine={false} ticks={[labelled[0].date, labelled[4].date, labelled[lastIdx].date]} />
            <RTooltip
              cursor={{ fill: '#1C2638' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { date: string; emissionsUsd: number; buybacksUsd: number };
                return (
                  <div className="bg-panel-2 border border-line-2 rounded shadow-pop px-2.5 py-1.5 text-xs num">
                    <div className="text-ink-3">Week of {p.date}</div>
                    <div className="text-ink font-medium">{fmtUsd(p[k], { compact: false })}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey={k} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {labelled.map((_, i) => (
                <Cell key={i} fill={color} fillOpacity={i === lastIdx ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Allocation() {
  const data = PROTOCOL.allocation.map((a, i) => ({ ...a, fill: RAMP[i] }));
  return (
    <section className="bg-panel border border-line rounded-lg p-5 flex flex-wrap items-center gap-6">
      <div className="h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="pct" nameKey="label" innerRadius={36} outerRadius={54} paddingAngle={2} stroke="#161E2E" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.label} fill={d.fill} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-[240px]">
        <h3 className="display text-md font-semibold">Token allocation</h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs num">
          {data.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-ink-2"><span className="h-2 w-2 rounded-sm shrink-0" style={{ background: d.fill }} />{d.label}</span>
              <span className="text-ink">{fmtPct(d.pct, 0)}</span>
            </li>
          ))}
        </ul>
        <p className="text-2xs text-ink-3 mt-2">No private or public sale. Mining is the only way to earn TIDE.</p>
      </div>
    </section>
  );
}

