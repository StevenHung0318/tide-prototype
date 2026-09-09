import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { PROTOCOL } from '@/data/protocol';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { emissionsSeries } from '@/lib/series';
import { cx, fmtInt, fmtPct, fmtUsd } from '@/lib/format';
import { Stat, StatRow } from '@/components/ui/Stat';
import { Card } from '@/components/ui/Card';
import { KV } from '@/components/ui/KeyValue';
import { InfoDot } from '@/components/ui/Tooltip';

const TIDE = '#8B9CF7';
const AQUA = '#39D0C4';
const RAMP = ['#8B9CF7', '#6F80DA', '#5666B6', '#424E8F', '#323A69', '#252B4B'];

export function Flywheel() {
  const coverage = m.buybackCoverage(PROTOCOL.buybackThisWeekUsd, PROTOCOL.weeklyEmissionsUsd);
  const healthy = coverage >= 0.6;
  const weeks = useMemo(() => emissionsSeries(PROTOCOL.weeklyEmissionsUsd, PROTOCOL.buybackThisWeekUsd), []);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-lg font-semibold">$TIDE flywheel</h1>
          <p className="text-xs text-ink-3 mt-0.5">Token economy health, reported as-is. Buyback coverage below 60% is shown in amber.</p>
        </div>
      </div>

      <StatRow>
        <Stat label="TIDE price" value={`$${CONSTANTS.TIDE_PRICE.toFixed(3)}`} tone="tide" sub="Mock spot" />
        <Stat label="Market cap (circ.)" value={fmtUsd(m.circulatingMarketCap(PROTOCOL.circulatingTide))} sub={`${(PROTOCOL.circulatingTide / 1e6).toFixed(0)}M TIDE circulating`} />
        <Stat label="Lock rate" value={fmtPct(PROTOCOL.lockRate, 0)} sub="Share of claims choosing 60-day lock" />
        <Stat
          label={
            <span className="inline-flex items-center gap-1.5">
              Buyback coverage <InfoDot tip="This week's buybacks divided by the USD value of this week's emissions. ≥60% reads aqua; below that, amber." />
            </span>
          }
          value={fmtPct(coverage)}
          tone={healthy ? 'aqua' : 'amber'}
          sub={`${fmtUsd(PROTOCOL.buybackThisWeekUsd, { compact: false })} ÷ ${fmtUsd(PROTOCOL.weeklyEmissionsUsd, { compact: false })}`}
        />
      </StatRow>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <EmissionsChart weeks={weeks} />
          <FlywheelDiagram />
        </div>
        <div className="space-y-5">
          <Card title="This week">
            <KV
              rows={[
                { k: 'Emissions', v: <span className="text-tide">{fmtInt(PROTOCOL.weeklyEmissionsTide)} TIDE <span className="text-ink-3">({fmtUsd(PROTOCOL.weeklyEmissionsUsd, { compact: false })})</span></span> },
                { k: 'Protocol revenue', v: fmtUsd(PROTOCOL.lastWeekRevenueUsd, { compact: false }) },
                { k: 'Buyback executed', v: <span className="text-aqua">{fmtUsd(PROTOCOL.buybackThisWeekUsd, { compact: false })}</span> },
                { k: "Next week's emissions", v: <span className="text-ink-2 font-normal">announced Friday</span> },
              ]}
            />
            <p className="text-xs text-ink-3 mt-3">Half of buybacks fund the locker redistribution pool; the rest is burned.</p>
          </Card>
          <AllocationCard />
        </div>
      </div>
    </div>
  );
}

function EmissionsChart({ weeks }: { weeks: ReturnType<typeof emissionsSeries> }) {
  return (
    <Card
      title="Emissions vs buybacks"
      action={
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-sm" style={{ background: TIDE }} /> Emissions value</span>
          <span className="inline-flex items-center gap-1.5 text-ink-2"><span className="h-2 w-2 rounded-sm" style={{ background: AQUA }} /> Buybacks</span>
        </div>
      }
    >
      <p className="text-xs text-ink-3 -mt-1 mb-3">Weekly emissions are announced 7 days ahead and scale with protocol revenue.</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid stroke="#232E44" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#6B7690', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#232E44' }} />
            <YAxis tick={{ fill: '#6B7690', fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(n: number) => `$${Math.round(n / 1000)}K`} />
            <RTooltip
              cursor={{ fill: '#1C2638' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { emissionsUsd: number; buybacksUsd: number; coverage: number };
                return (
                  <div className="bg-panel-2 border border-line-2 rounded shadow-pop px-2.5 py-2 text-xs num">
                    <div className="text-ink-3 mb-1">{label}</div>
                    <div className="flex justify-between gap-4"><span className="text-tide">Emissions</span><span>{fmtUsd(p.emissionsUsd, { compact: false })}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-aqua">Buybacks</span><span>{fmtUsd(p.buybacksUsd, { compact: false })}</span></div>
                    <div className="flex justify-between gap-4 border-t border-line mt-1 pt-1"><span className="text-ink-2">Coverage</span><span className={p.coverage >= 0.6 ? 'text-aqua' : 'text-amber'}>{fmtPct(p.coverage)}</span></div>
                  </div>
                );
              }}
            />
            <Bar dataKey="emissionsUsd" fill={TIDE} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="buybacksUsd" fill={AQUA} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-8 gap-1 text-2xs num text-center">
        {weeks.map((w) => (
          <div key={w.week} className={cx(w.coverage >= 0.6 ? 'text-aqua' : 'text-amber')}>{fmtPct(w.coverage, 0)}</div>
        ))}
      </div>
      <div className="text-2xs text-ink-3 text-center mt-0.5">Buyback coverage by week</div>
    </Card>
  );
}

const NODES = [
  { id: 'deposits', label: 'Deposits', tip: 'Users zap single assets into vaults; TVL grows.' },
  { id: 'fees', label: 'Fees', tip: 'Vaults earn swap fees; 10% performance fee is protocol revenue.' },
  { id: 'buybacks', label: 'Buybacks + emissions budget', tip: 'Revenue buys TIDE on market and sets next week\'s emissions.' },
  { id: 'lockers', label: 'Locker rewards + boost demand', tip: 'Buybacks and forfeits flow to lockers; boosts make locking worth it.' },
  { id: 'back', label: 'More deposits', tip: 'Higher boosted APR attracts more TVL — and the loop repeats.' },
];

function FlywheelDiagram() {
  const [hover, setHover] = useState<string | null>(null);
  const cx0 = 260;
  const cy0 = 150;
  const r = 105;
  const pts = NODES.map((n, i) => {
    const a = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
    return { ...n, x: cx0 + r * Math.cos(a), y: cy0 + r * Math.sin(a) };
  });
  const active = pts.find((p) => p.id === hover);
  return (
    <Card title="How the flywheel turns">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="md:col-span-3">
          <svg viewBox="0 0 520 300" className="w-full h-auto" role="img" aria-label="Flywheel: Deposits to Fees to Buybacks and emissions budget to Locker rewards and boost demand to Deposits">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="#2E3B55" />
              </marker>
            </defs>
            {pts.map((p, i) => {
              const q = pts[(i + 1) % pts.length];
              const dx = q.x - p.x, dy = q.y - p.y;
              const len = Math.hypot(dx, dy);
              const ux = dx / len, uy = dy / len;
              const pad = 34;
              return <line key={p.id} x1={p.x + ux * pad} y1={p.y + uy * pad} x2={q.x - ux * pad} y2={q.y - uy * pad} stroke="#2E3B55" strokeWidth="1.5" markerEnd="url(#arr)" />;
            })}
            {pts.map((p) => (
              <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} className="cursor-help">
                <circle cx={p.x} cy={p.y} r="30" fill={hover === p.id ? '#1C2638' : '#161E2E'} stroke={hover === p.id ? AQUA : '#2E3B55'} strokeWidth="1.5" />
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={hover === p.id ? '#E6EBF5' : '#A6B0C3'} fontSize="10" fontFamily="Inter, system-ui">
                  {p.label.split(' + ').map((line, li, arr) => (
                    <tspan key={li} x={p.x} dy={li === 0 ? (arr.length > 1 ? -6 : 0) : 12}>
                      {li === 0 && arr.length > 1 ? `${line} +` : line}
                    </tspan>
                  ))}
                </text>
              </g>
            ))}
            <text x={cx0} y={cy0 - 6} textAnchor="middle" fill="#39D0C4" fontSize="12" fontFamily="Archivo, Inter" fontWeight="600">TIDE</text>
            <text x={cx0} y={cy0 + 10} textAnchor="middle" fill="#6B7690" fontSize="10" fontFamily="Inter">flywheel</text>
          </svg>
        </div>
        <div className="md:col-span-2 text-sm min-h-[88px]">
          {active ? (
            <div className="animate-fade-in">
              <div className="display font-semibold text-ink">{active.label}</div>
              <p className="text-ink-2 mt-1 leading-relaxed">{active.tip}</p>
            </div>
          ) : (
            <p className="text-ink-3 text-xs leading-relaxed">
              Hover a node. The loop only compounds when fees fund buybacks faster than emissions dilute — which is why coverage is the honest number on this page.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function AllocationCard() {
  const data = PROTOCOL.allocation.map((a, i) => ({ ...a, fill: RAMP[i] }));
  return (
    <Card title="Token allocation">
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="pct" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="#161E2E" strokeWidth={2} isAnimationActive={false}>
                {data.map((d) => <Cell key={d.label} fill={d.fill} />)}
              </Pie>
              <RTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { label: string; pct: number };
                  return <div className="bg-panel-2 border border-line-2 rounded shadow-pop px-2.5 py-1.5 text-xs num">{p.label}: {fmtPct(p.pct, 0)}</div>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 text-xs space-y-1.5 num">
          {data.map((d) => (
            <li key={d.label} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-ink-2"><span className="h-2 w-2 rounded-sm shrink-0" style={{ background: d.fill }} />{d.label}</span>
              <span className="text-ink font-medium">{fmtPct(d.pct, 0)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-ink-3 mt-3">No private sale. No public sale. Mining is the only way to earn TIDE.</p>
    </Card>
  );
}
