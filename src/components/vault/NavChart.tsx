import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import type { Vault } from '@/lib/types';
import { navSeries } from '@/lib/series';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Tabs';
import { cx, fmtPctSigned } from '@/lib/format';

type Window = '30D' | '7D';

export function NavChart({ vault: v }: { vault: Vault }) {
  const [win, setWin] = useState<Window>('30D');
  const all = useMemo(() => navSeries(v.id, v.pricePerShare, v.benchmarkLead), [v]);
  const data = win === '30D' ? all : all.slice(-7);
  const first = data[0];
  const last = data[data.length - 1];
  const tdlpRet = last.tdlp / first.tdlp - 1;
  const hodlRet = last.hodl / first.hodl - 1;
  const lead = tdlpRet - hodlRet;
  const yMin = Math.min(...data.map((d) => Math.min(d.tdlp, d.hodl)));
  const yMax = Math.max(...data.map((d) => Math.max(d.tdlp, d.hodl)));
  const pad = (yMax - yMin) * 0.25 || 0.005;

  return (
    <Card
      title="Performance"
      action={
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-3 text-xs num">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="h-0.5 w-3 bg-aqua" /> {v.receiptSymbol} <span className={tdlpRet >= 0 ? 'text-up' : 'text-down'}>{fmtPctSigned(tdlpRet, 2)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="h-0.5 w-3 border-t border-dashed border-ink-3" /> HODL 50/50 <span className={hodlRet >= 0 ? 'text-up' : 'text-down'}>{fmtPctSigned(hodlRet, 2)}</span>
            </span>
          </div>
          <Segmented<Window> size="sm" value={win} onChange={setWin} options={[{ value: '30D', label: '30D' }, { value: '7D', label: '7D' }]} />
        </div>
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#232E44" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7690', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#232E44' }}
              tickFormatter={(d: string) => d.slice(5).replace('-', '/')}
              minTickGap={28}
            />
            <YAxis
              domain={[yMin - pad, yMax + pad]}
              tick={{ fill: '#6B7690', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(n: number) => n.toFixed(3)}
            />
            <RTooltip
              cursor={{ stroke: '#2E3B55' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { tdlp: number; hodl: number };
                return (
                  <div className="bg-panel-2 border border-line-2 rounded shadow-pop px-2.5 py-2 text-xs num">
                    <div className="text-ink-3 mb-1">{label}</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-aqua">{v.receiptSymbol}</span>
                      <span>{p.tdlp.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-2">HODL 50/50</span>
                      <span>{p.hodl.toFixed(4)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="hodl" stroke="#6B7690" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="tdlp" stroke="#39D0C4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-end text-xs">
        <span className={cx('num font-medium', lead >= 0 ? 'text-up' : 'text-down')}>
          {lead >= 0 ? 'Outperforming' : 'Underperforming'} HODL by {fmtPctSigned(Math.abs(lead), 2).replace('+', '')}
        </span>
      </div>
    </Card>
  );
}
