import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VAULT_BY_ID, TIER_CAPACITY, vaultName } from '@/data/vaults';
import * as m from '@/lib/math';
import { fmtPct, fmtUsd, cx } from '@/lib/format';
import { useMarketStatus, useVaultApr } from '@/store/selectors';
import { RangeStatusBadge, TierBadge } from '@/components/ui/Badge';
import { TokenPair } from '@/components/ui/TokenIcon';
import { Stat, StatRow } from '@/components/ui/Stat';
import { PriceRange } from '@/components/vault/PriceRange';
import { AprBreakdown } from '@/components/vault/AprBreakdown';
import { NavChart } from '@/components/vault/NavChart';
import { Button } from '@/components/ui/Button';

export function VaultDetail() {
  const { id = '' } = useParams();
  const v = VAULT_BY_ID[id];
  const market = useMarketStatus();
  if (!v) {
    return (
      <div className="text-sm text-ink-3">
        Vault not found. <Link to="/" className="text-aqua">Back to markets</Link>
      </div>
    );
  }
  return <VaultView vaultId={v.id} market={market} />;
}

function VaultView({ vaultId, market }: { vaultId: string; market: 'open' | 'closed' }) {
  const v = VAULT_BY_ID[vaultId];
  const { tvl, breakdown: b, showBoost } = useVaultApr(v);
  const status = m.rangeStatus(v, market);
  const cap = TIER_CAPACITY[v.tier];
  const fill = Math.min(1, tvl / cap);
  const [aprHover, setAprHover] = useState(false);

  return (
    <div className="space-y-6 max-w-[960px] mx-auto">
      <header className="flex flex-wrap items-center gap-3">
        <Link to="/explore" className="text-xs text-ink-3 hover:text-ink-2 mr-1">← Explore</Link>
        <TokenPair a={v.token0} b={v.token1} size={28} />
        <h1 className="display text-2xl font-semibold">{vaultName(v)}</h1>
        <TierBadge tier={v.tier} />
        <RangeStatusBadge status={status} />
        <Link to={`/?vault=${v.id}`} className="ml-auto"><Button>Deposit</Button></Link>
      </header>

      <StatRow cols={3}>
        <Stat label="TVL" value={fmtUsd(tvl)} />
        <div className="relative cursor-help" onMouseEnter={() => setAprHover(true)} onMouseLeave={() => setAprHover(false)}>
          <Stat
            label={showBoost ? 'Your APR' : 'APR'}
            value={fmtPct(showBoost ? b.yourApr : b.totalApr)}
            tone={showBoost ? 'aqua' : 'default'}
            sub={
              <>
                {fmtPct(b.feeApr)} fees + <span className="text-tide">{fmtPct(showBoost ? b.yourTideApr : b.baseTideApr)} TIDE</span>
                {showBoost && <span className="text-ink-3"> · ×{b.boost.toFixed(2).replace(/\.?0+$/, '')} boost</span>}
              </>
            }
          />
          {aprHover && (
            <div className="absolute left-0 top-full mt-1 z-40 w-72 bg-panel-2 border border-line-2 rounded-md shadow-pop p-3 animate-fade-in">
              <AprBreakdown vault={v} compact />
            </div>
          )}
        </div>
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

      <PriceRange vault={v} market={market} />
      <NavChart vault={v} />
    </div>
  );
}
