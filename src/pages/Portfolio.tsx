import { Link, useNavigate } from 'react-router-dom';
import { VAULT_BY_ID, vaultName } from '@/data/vaults';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { cx, fmtMultiplier, fmtPct, fmtPctSigned, fmtToken, fmtUsd, fmtUsdSigned } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useMarketStatus, useUserDerived, useVaultApr } from '@/store/selectors';
import { Stat, StatRow } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TokenPair } from '@/components/ui/TokenIcon';
import { RangeStatusBadge, TierBadge } from '@/components/ui/Badge';

export function Portfolio() {
  const d = useUserDerived();
  const connect = useStore((s) => s.connect);
  const connecting = useStore((s) => s.connecting);
  const positions = useStore((s) => s.user.positions);
  const navigate = useNavigate();

  if (!d.connected) {
    return (
      <EmptyState
        title="Connect your wallet to see your positions"
        body="Market data is public. Your tdLP balances, earnings and TIDE rewards appear here once connected."
        action={<Button onClick={() => connect()} loading={connecting}>Connect wallet</Button>}
      />
    );
  }

  const ids = Object.keys(positions);
  if (ids.length === 0) {
    return (
      <div className="space-y-5">
        <Summary />
        <EmptyState title="No positions yet" body="Deposit a single asset into any vault and your tdLP shows up here." action={<Link to="/"><Button>Explore markets</Button></Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Summary />
      <div className="flex items-center justify-between">
        <h1 className="display text-lg font-semibold">Positions</h1>
        <span className="text-xs text-ink-3 num">{ids.length} vault{ids.length > 1 ? 's' : ''}</span>
      </div>
      <div className="bg-panel border border-line rounded-md overflow-x-auto">
        <table className="w-full text-sm num min-w-[820px]">
          <thead>
            <tr className="text-xs text-ink-3 border-b border-line">
              <th className="text-left font-medium px-4 h-10">Pool</th>
              <th className="text-right font-medium px-3 h-10">tdLP balance</th>
              <th className="text-right font-medium px-3 h-10">Value</th>
              <th className="text-right font-medium px-3 h-10">Your APR</th>
              <th className="text-right font-medium px-3 h-10">7d earnings</th>
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
      <p className="text-xs text-ink-3">tdLP tokens are freely transferable. Staked tdLP keeps earning TIDE.</p>
    </div>
  );
}

function Summary() {
  const d = useUserDerived();
  const navigate = useNavigate();
  return (
    <StatRow>
      <Stat label="Total value" value={fmtUsd(d.depositsUsd, { compact: false })} sub={`Cost basis ${fmtUsd(d.costBasis, { compact: false })}`} />
      <Stat
        label="Net PnL"
        value={fmtUsdSigned(d.pnlUsd)}
        tone={d.pnlUsd > 0 ? 'up' : d.pnlUsd < 0 ? 'down' : 'default'}
        sub={d.costBasis > 0 ? fmtPctSigned(d.pnlPct) : '—'}
      />
      <Stat
        label="Pending TIDE"
        value={`${fmtToken(d.pendingTide, 2)} TIDE`}
        tone="tide"
        sub={`${fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })} · claim →`}
        onClick={() => navigate('/rewards')}
      />
      <Stat
        label="Your avg boost"
        value={fmtMultiplier(d.boost)}
        tone={d.boost > 1 ? 'tide' : 'default'}
        sub={d.lockedTide > 0 ? `${fmtToken(d.lockedTide, 0)} TIDE locked · ratio ${fmtPct(d.ratio)}` : 'Lock TIDE to boost up to ×1.5'}
      />
    </StatRow>
  );
}

function PositionRow({ id, onManage }: { id: string; onManage: () => void }) {
  const v = VAULT_BY_ID[id];
  const p = useStore((s) => s.user.positions[id]);
  const market = useMarketStatus();
  const { breakdown: b, showBoost } = useVaultApr(v);
  if (!v || !p) return null;
  const value = m.positionValue(p, v);
  const apr = showBoost ? b.yourApr : b.totalApr;
  const pnl = value - p.costBasis;
  return (
    <tr className="border-b border-line last:border-0 hover:bg-panel-2/60 cursor-pointer" onClick={onManage}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <TokenPair a={v.token0} b={v.token1} />
          <div>
            <div className="font-medium text-ink flex items-center gap-2">
              {vaultName(v)} <TierBadge tier={v.tier} />
            </div>
            <RangeStatusBadge status={m.rangeStatus(v, market)} className="mt-0.5" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="text-ink">{fmtToken(p.staked + p.unstaked, 1)}</div>
        <div className="text-2xs text-ink-3">
          <span className="text-tide">{fmtToken(p.staked, 1)} staked</span>
          {p.unstaked > 0 && <> · {fmtToken(p.unstaked, 1)} unstaked</>}
        </div>
      </td>
      <td className="px-3 py-3 text-right text-ink">{fmtUsd(value, { compact: false, cents: true })}</td>
      <td className="px-3 py-3 text-right">
        <div className={cx('font-medium', showBoost ? 'text-aqua' : 'text-ink')}>{fmtPct(apr)}</div>
        {showBoost && <div className="text-2xs text-ink-3">incl. {fmtMultiplier(b.boost)} boost</div>}
      </td>
      <td className="px-3 py-3 text-right text-up">+{fmtUsd(m.earnings7d(value, apr), { compact: false, cents: true })}</td>
      <td className={cx('px-3 py-3 text-right', pnl >= 0 ? 'text-up' : 'text-down')}>
        {fmtUsdSigned(pnl)}
        <div className="text-2xs opacity-70">{p.costBasis > 0 ? fmtPctSigned(pnl / p.costBasis) : ''}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onManage(); }}>
          Manage
        </Button>
      </td>
    </tr>
  );
}
