import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VAULTS, vaultName } from '@/data/vaults';
import { PROTOCOL } from '@/data/protocol';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { fmtInt, fmtPct, fmtUsd, cx } from '@/lib/format';
import type { Tier, Vault } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useMarketStatus, useUserDerived, useVaultApr } from '@/store/selectors';
import { Stat, StatRow } from '@/components/ui/Stat';
import { RangeStatusBadge, TierBadge } from '@/components/ui/Badge';
import { TokenPair } from '@/components/ui/TokenIcon';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Tabs';
import { AprBreakdown } from '@/components/vault/AprBreakdown';

type Filter = 'All' | Tier;

export function Markets() {
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const [filter, setFilter] = useState<Filter>('All');
  const rows = useMemo(
    () =>
      VAULTS.filter((v) => filter === 'All' || v.tier === filter)
        .map((v) => ({ v, tvl: m.effectiveTvl(v, tvlDelta) }))
        .sort((a, b) => b.tvl - a.tvl),
    [filter, tvlDelta],
  );
  const totalTvl = m.totalTvl(VAULTS, tvlDelta);
  const fees24h = m.dailyFees(VAULTS, tvlDelta);

  return (
    <div className="space-y-5">
      <StatRow>
        <Stat label="Total TVL" value={fmtUsd(totalTvl)} sub={`${VAULTS.length} vaults`} />
        <Stat label="24h fees earned" value={fmtUsd(fees24h, { compact: false })} sub="Compounded into positions" />
        <Stat label="$TIDE price" value={`$${CONSTANTS.TIDE_PRICE.toFixed(3)}`} tone="tide" sub={`Mcap ${fmtUsd(m.circulatingMarketCap(PROTOCOL.circulatingTide))} circ.`} />
        <Stat label="Weekly emissions" value={`${fmtInt(PROTOCOL.weeklyEmissionsTide)} TIDE`} tone="tide" sub={fmtUsd(PROTOCOL.weeklyEmissionsUsd, { compact: false })} />
      </StatRow>

      <div className="flex items-center justify-between gap-4">
        <h1 className="display text-lg font-semibold">LP vaults</h1>
        <Segmented<Filter>
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'All', label: 'All' },
            { value: 'Core', label: 'Core' },
            { value: 'Turbo', label: 'Turbo' },
            { value: 'Degen', label: 'Degen' },
          ]}
        />
      </div>

      <div className="bg-panel border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm num min-w-[860px]">
          <thead>
            <tr className="text-xs text-ink-3 border-b border-line">
              <th className="text-left font-medium px-4 h-10">Pool</th>
              <th className="text-left font-medium px-3 h-10">Tier</th>
              <th className="text-right font-medium px-3 h-10">TVL</th>
              <th className="text-right font-medium px-3 h-10">APR</th>
              <th className="text-left font-medium px-3 h-10">Range status</th>
              <th className="text-right font-medium px-3 h-10">My deposit</th>
              <th className="px-4 h-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ v, tvl }) => (
              <VaultRow key={v.id} vault={v} tvl={tvl} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-3">
        APRs are 7-day trailing fee yield plus TIDE emissions at the current price. Degen vaults run narrow ranges on volatile pairs and
        can underperform holding.
      </p>
    </div>
  );
}

function VaultRow({ vault: v, tvl }: { vault: Vault; tvl: number }) {
  const navigate = useNavigate();
  const market = useMarketStatus();
  const status = m.rangeStatus(v, market);
  const { breakdown: b, showBoost } = useVaultApr(v);
  const d = useUserDerived();
  const position = useStore((s) => s.user.positions[v.id]);
  const myValue = d.connected ? m.positionValue(position, v) : 0;
  const [hover, setHover] = useState(false);

  return (
    <tr
      className={cx('border-b border-line last:border-0 hover:bg-panel-2/60 transition-colors cursor-pointer', v.tier === 'Degen' && 'bg-amber/[0.035]')}
      onClick={() => navigate(`/vault/${v.id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <TokenPair a={v.token0} b={v.token1} />
          <div>
            <div className="font-medium text-ink">{vaultName(v)}</div>
            <div className="text-2xs text-ink-3">{v.receiptSymbol}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <TierBadge tier={v.tier} />
      </td>
      <td className="px-3 py-3 text-right text-ink">{fmtUsd(tvl)}</td>
      <td className="px-3 py-3 text-right relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div className={cx('display text-lg font-semibold leading-tight', showBoost ? 'text-aqua' : 'text-ink')}>
          {fmtPct(showBoost ? b.yourApr : b.totalApr)}
        </div>
        <div className="text-2xs text-ink-3">
          {fmtPct(b.feeApr)} fees + <span className="text-tide">{fmtPct(showBoost ? b.yourTideApr : b.baseTideApr)} TIDE</span>
        </div>
        {hover && (
          <div className="absolute right-0 top-full z-30 w-72 bg-panel-2 border border-line-2 rounded-md shadow-pop p-3 text-left animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <AprBreakdown vault={v} compact />
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <RangeStatusBadge status={status} />
      </td>
      <td className="px-3 py-3 text-right">
        {d.connected && position ? (
          <span className="text-ink">{fmtUsd(myValue, { compact: false })}</span>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Link to={`/vault/${v.id}?action=deposit`} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant={v.tier === 'Degen' ? 'secondary' : 'primary'}>
            Deposit
          </Button>
        </Link>
      </td>
    </tr>
  );
}
