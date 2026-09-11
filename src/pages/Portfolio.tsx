import { Link, useNavigate } from 'react-router-dom';
import { VAULT_BY_ID, vaultName } from '@/data/vaults';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { cx, fmtMultiplier, fmtPct, fmtPctSigned, fmtToken, fmtUsd, fmtUsdSigned } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useUserDerived, useVaultApr } from '@/store/selectors';
import { Stat, StatRow } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TokenPair } from '@/components/ui/TokenIcon';
import { TierBadge } from '@/components/ui/Badge';

export function Portfolio() {
  const d = useUserDerived();
  const connect = useStore((s) => s.connect);
  const connecting = useStore((s) => s.connecting);
  const positions = useStore((s) => s.user.positions);
  const navigate = useNavigate();

  if (!d.connected) {
    return <EmptyState title="Connect your wallet to see your positions" action={<Button onClick={() => connect()} loading={connecting}>Connect wallet</Button>} />;
  }

  const ids = Object.keys(positions);
  if (ids.length === 0) {
    return (
      <div className="space-y-6">
        <Summary />
        <EmptyState title="No positions yet" action={<Link to="/"><Button>Explore vaults</Button></Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Summary />
      <h1 className="display text-lg font-semibold">Positions</h1>
      <div className="bg-panel border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm num min-w-[640px]">
          <thead>
            <tr className="text-xs text-ink-3 border-b border-line">
              <th className="text-left font-medium px-4 h-10">Pool</th>
              <th className="text-right font-medium px-3 h-10">Value</th>
              <th className="text-right font-medium px-3 h-10">Your APR</th>
              <th className="text-right font-medium px-3 h-10">PnL</th>
              <th className="px-4 h-10" />
            </tr>
          </thead>
          <tbody>
            {ids
              .map((id) => ({ id, value: m.positionValue(positions[id], VAULT_BY_ID[id]) }))
              .sort((a, b) => b.value - a.value)
              .map(({ id }) => <PositionRow key={id} id={id} onManage={() => navigate(`/vault/${id}`)} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary() {
  const d = useUserDerived();
  const navigate = useNavigate();
  return (
    <StatRow>
      <Stat label="Total value" value={fmtUsd(d.depositsUsd, { compact: false })} />
      <Stat label="Net PnL" value={fmtUsdSigned(d.pnlUsd)} tone={d.pnlUsd > 0 ? 'up' : d.pnlUsd < 0 ? 'down' : 'default'} sub={d.costBasis > 0 ? fmtPctSigned(d.pnlPct) : undefined} />
      <Stat
        label="Pending TIDE"
        value={`${fmtToken(d.pendingTide, 2)} TIDE`}
        tone="tide"
        sub={`${fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })} · Claim →`}
        onClick={() => navigate('/rewards')}
      />
      <Stat label="Boost" value={fmtMultiplier(d.boost)} tone={d.boost > 1 ? 'tide' : 'default'} />
    </StatRow>
  );
}

function PositionRow({ id, onManage }: { id: string; onManage: () => void }) {
  const v = VAULT_BY_ID[id];
  const p = useStore((s) => s.user.positions[id]);
  const { breakdown: b, showBoost } = useVaultApr(v);
  if (!v || !p) return null;
  const value = m.positionValue(p, v);
  const apr = showBoost ? b.yourApr : b.totalApr;
  const pnl = value - p.costBasis;
  const total = p.staked + p.unstaked;
  return (
    <tr className="border-b border-line last:border-0 hover:bg-panel-2/60 cursor-pointer" onClick={onManage}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <TokenPair a={v.token0} b={v.token1} />
          <div>
            <div className="font-medium text-ink flex items-center gap-2">
              {vaultName(v)} <TierBadge tier={v.tier} />
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {fmtToken(total, 1)} {v.receiptSymbol}
              {p.staked > 0 && <span className="text-tide"> · {p.unstaked > 0 ? `${fmtToken(p.staked, 1)} staked` : 'staked'}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 text-right text-ink">{fmtUsd(value, { compact: false, cents: true })}</td>
      <td className={cx('px-3 py-3.5 text-right font-medium', showBoost ? 'text-aqua' : 'text-ink')}>{fmtPct(apr)}</td>
      <td className={cx('px-3 py-3.5 text-right', pnl >= 0 ? 'text-up' : 'text-down')}>
        {fmtUsdSigned(pnl)} <span className="text-2xs opacity-70">{p.costBasis > 0 ? fmtPctSigned(pnl / p.costBasis) : ''}</span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onManage(); }}>
          Manage
        </Button>
      </td>
    </tr>
  );
}
