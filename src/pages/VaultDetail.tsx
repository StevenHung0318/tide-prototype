import { Link, useParams, useSearchParams } from 'react-router-dom';
import { VAULT_BY_ID, TIER_CAPACITY, vaultName } from '@/data/vaults';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { fmtPct, fmtUsd, cx } from '@/lib/format';
import { useMarketStatus, useVaultApr } from '@/store/selectors';
import { RangeStatusBadge, TierBadge } from '@/components/ui/Badge';
import { TokenPair } from '@/components/ui/TokenIcon';
import { Stat, StatRow } from '@/components/ui/Stat';
import { Card } from '@/components/ui/Card';
import { Collapsible } from '@/components/ui/Collapsible';
import { KV } from '@/components/ui/KeyValue';
import { PriceRange } from '@/components/vault/PriceRange';
import { AprBreakdown } from '@/components/vault/AprBreakdown';
import { NavChart } from '@/components/vault/NavChart';
import { DepositWithdrawPanel } from '@/components/vault/DepositWithdrawPanel';

export function VaultDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const v = VAULT_BY_ID[id];
  const market = useMarketStatus();
  if (!v) {
    return (
      <div className="text-sm text-ink-3">
        Vault not found. <Link to="/" className="text-aqua">Back to markets</Link>
      </div>
    );
  }
  return <VaultView vaultId={v.id} market={market} action={params.get('action')} />;
}

function VaultView({ vaultId, market, action }: { vaultId: string; market: 'open' | 'closed'; action: string | null }) {
  const v = VAULT_BY_ID[vaultId];
  const { tvl, breakdown: b, showBoost } = useVaultApr(v);
  const status = m.rangeStatus(v, market);
  const cap = TIER_CAPACITY[v.tier];
  const fill = Math.min(1, tvl / cap);
  const strategy = v.tier === 'Core' ? 'Market-hours aware range' : v.tier === 'Turbo' ? 'Tight range, hourly checks' : 'Narrow, high-frequency range';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link to="/" className="text-xs text-ink-3 hover:text-ink-2 mr-1">← Markets</Link>
        <TokenPair a={v.token0} b={v.token1} size={28} />
        <h1 className="display text-2xl font-semibold">{vaultName(v)}</h1>
        <TierBadge tier={v.tier} />
        <RangeStatusBadge status={status} />
      </header>

      <StatRow cols={3}>
        <Stat label="TVL" value={fmtUsd(tvl)} />
        <Stat label={showBoost ? 'Your APR' : 'APR'} value={fmtPct(showBoost ? b.yourApr : b.totalApr)} tone={showBoost ? 'aqua' : 'default'} />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-xs text-ink-3">Capacity</div>
          <div className="display num text-xl font-semibold truncate">
            {fmtUsd(tvl)} <span className="text-ink-3 text-sm font-normal">/ {fmtUsd(cap)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-line overflow-hidden mt-1">
            <div className={cx('h-full rounded-full transition-[width] duration-500', fill > 0.9 ? 'bg-amber' : 'bg-aqua')} style={{ width: `${fill * 100}%` }} />
          </div>
        </div>
      </StatRow>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <PriceRange vault={v} market={market} />
          <NavChart vault={v} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card title="APR breakdown">
              <AprBreakdown vault={v} />
            </Card>
            <Collapsible title="How it works">
              <KV
                rows={[
                  { k: 'Strategy', v: strategy },
                  { k: 'Range', v: `±${Math.round(v.rangeWidthPct * 100)}%` },
                  { k: 'Rebalances (30d)', v: String(v.rebalances30d) },
                  { k: 'Performance fee', v: fmtPct(CONSTANTS.PERFORMANCE_FEE, 0) },
                  { k: 'Withdrawal fee', v: fmtPct(CONSTANTS.WITHDRAWAL_FEE) },
                  { k: `${v.receiptSymbol} price`, v: `$${v.pricePerShare.toFixed(4)}` },
                ]}
              />
              <p className="mt-3 text-xs text-ink-3">
                Your deposit mints {v.receiptSymbol}, a token that grows in value as the vault earns. Stake it to mine TIDE. Redeem it anytime.
              </p>
            </Collapsible>
          </div>
        </div>
        <div className="lg:sticky lg:top-[72px]">
          <DepositWithdrawPanel vault={v} initialTab={action === 'withdraw' ? 'withdraw' : 'deposit'} autoFocus={action === 'deposit'} />
        </div>
      </div>
    </div>
  );
}
