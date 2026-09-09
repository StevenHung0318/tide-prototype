import type { Vault } from '@/lib/types';
import { CONSTANTS } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { KV } from '@/components/ui/KeyValue';
import { fmtPct } from '@/lib/format';

export function StrategyCard({ vault: v }: { vault: Vault }) {
  const strategy = v.tier === 'Core' ? 'Market-hours aware CLMM' : v.tier === 'Turbo' ? 'Tight-range CLMM, hourly checks' : 'Narrow high-frequency CLMM';
  return (
    <Card title="Strategy">
      <KV
        rows={[
          { k: 'Strategy', v: strategy },
          { k: 'Target range', v: `±${Math.round(v.rangeWidthPct * 100)}%` },
          { k: 'Reset trigger', v: '30 min beyond band' },
          { k: 'Rebalances (30d)', v: String(v.rebalances30d) },
          { k: 'Performance fee', v: fmtPct(CONSTANTS.PERFORMANCE_FEE, 0) },
          { k: 'Withdrawal fee', v: fmtPct(CONSTANTS.WITHDRAWAL_FEE) },
        ]}
      />
      <p className="mt-3 text-xs text-ink-3">Fees and rewards are harvested daily and compounded into the position.</p>
    </Card>
  );
}
