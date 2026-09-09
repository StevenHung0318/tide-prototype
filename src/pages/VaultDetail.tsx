import { Link, useParams, useSearchParams } from 'react-router-dom';
import { VAULT_BY_ID, TIER_CAPACITY, vaultName } from '@/data/vaults';
import * as m from '@/lib/math';
import { fmtPct, fmtUsd, cx } from '@/lib/format';
import { useMarketStatus, useVaultApr } from '@/store/selectors';
import { RangeStatusBadge, TierBadge } from '@/components/ui/Badge';
import { TokenPair } from '@/components/ui/TokenIcon';
import { Stat, StatRow } from '@/components/ui/Stat';
import { Card } from '@/components/ui/Card';
import { Collapsible } from '@/components/ui/Collapsible';
import { PriceRange } from '@/components/vault/PriceRange';
import { AprBreakdown } from '@/components/vault/AprBreakdown';
import { NavChart } from '@/components/vault/NavChart';
import { StrategyCard } from '@/components/vault/StrategyCard';
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

  return (
    <div className="space-y-5">
      <nav className="text-xs text-ink-3">
        <Link to="/" className="hover:text-ink-2">Markets</Link> <span className="mx-1">/</span> {vaultName(v)}
      </nav>

      <header className="flex flex-wrap items-center gap-3">
        <TokenPair a={v.token0} b={v.token1} size={28} />
        <h1 className="display text-2xl font-semibold">{vaultName(v)}</h1>
        <TierBadge tier={v.tier} />
        <RangeStatusBadge status={status} />
        <span className="text-xs text-ink-3 ml-auto num">Receipt token {v.receiptSymbol}</span>
      </header>

      <StatRow>
        <Stat label="TVL" value={fmtUsd(tvl)} sub={`${fmtPct(fill, 0)} of capacity`} />
        <Stat
          label={showBoost ? 'Your APR' : 'Total APR'}
          value={fmtPct(showBoost ? b.yourApr : b.totalApr)}
          tone={showBoost ? 'aqua' : 'default'}
          sub={
            <>
              {fmtPct(b.feeApr)} fees + <span className="text-tide">{fmtPct(showBoost ? b.yourTideApr : b.baseTideApr)} TIDE</span>
            </>
          }
        />
        <Stat label={`${v.receiptSymbol} price`} value={`$${v.pricePerShare.toFixed(4)}`} sub="Net asset value per token" tone={v.pricePerShare >= 1 ? 'default' : 'down'} />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-xs text-ink-3">Capacity</div>
          <div className="display num text-xl font-semibold truncate">
            {fmtUsd(tvl)} <span className="text-ink-3 text-sm font-normal">/ {fmtUsd(cap)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-line overflow-hidden mt-0.5">
            <div className={cx('h-full rounded-full transition-[width] duration-500', fill > 0.9 ? 'bg-amber' : 'bg-aqua')} style={{ width: `${fill * 100}%` }} />
          </div>
          <div className="text-2xs text-ink-3">Phase {v.tier === 'Core' ? 2 : 1} cap · raises as strategy proves out</div>
        </div>
      </StatRow>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <PriceRange vault={v} market={market} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="APR breakdown">
              <AprBreakdown vault={v} />
            </Card>
            <StrategyCard vault={v} />
          </div>
          <NavChart vault={v} />
          <Collapsible title={`About ${v.receiptSymbol}`}>
            <p>
              Your deposit mints {v.receiptSymbol}, a fungible token that appreciates as the vault earns. Transfer it, hold it, or stake it to mine
              TIDE. Withdraw anytime by redeeming {v.receiptSymbol}.
            </p>
            <p className="mt-2 text-ink-3 text-xs">
              1 {v.receiptSymbol} = ${v.pricePerShare.toFixed(4)} today. The price moves with fees earned, rebalancing outcomes and impermanent loss. It
              is never rebased; your token count only changes when you deposit or withdraw.
            </p>
          </Collapsible>
        </div>
        <div className="lg:sticky lg:top-[72px]">
          <DepositWithdrawPanel vault={v} initialTab={action === 'withdraw' ? 'withdraw' : 'deposit'} autoFocus={action === 'deposit'} />
        </div>
      </div>
    </div>
  );
}
