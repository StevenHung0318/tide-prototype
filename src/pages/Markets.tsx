import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VAULTS, VAULT_BY_ID, vaultName } from '@/data/vaults';
import * as m from '@/lib/math';
import { cx, fmtPct, fmtToken, fmtUsd } from '@/lib/format';
import { CONSTANTS } from '@/lib/constants';
import type { Tier, Vault } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useUserDerived, useVaultApr } from '@/store/selectors';
import { Stat, StatRow } from '@/components/ui/Stat';
import { TokenPair } from '@/components/ui/TokenIcon';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Tabs';
import { AprBreakdown } from '@/components/vault/AprBreakdown';
import { DepositModal } from '@/components/deposit/DepositModal';
import { ClaimModal } from '@/components/rewards/ClaimModal';

type Filter = 'All' | Tier;

export function Markets() {
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const d = useUserDerived();
  const [filter, setFilter] = useState<Filter>('All');
  const [params, setParams] = useSearchParams();
  const depositVault = VAULT_BY_ID[params.get('deposit') ?? ''] ?? null;
  const claimOpen = params.get('claim') === '1';
  const locks = useStore((s) => s.user.locks);
  const lockedTide = m.lockedTide(locks);
  const nextUnlock = locks.length ? Math.min(...locks.map((l) => l.unlockAt)) : null;
  const unlockable = locks.some((l) => m.isUnlockable(l, Date.now()));
  const rows = useMemo(
    () =>
      VAULTS.filter((v) => filter === 'All' || v.tier === filter)
        .map((v) => ({ v, tvl: m.effectiveTvl(v, tvlDelta) }))
        .sort((a, b) => b.tvl - a.tvl),
    [filter, tvlDelta],
  );
  const showMine = d.connected && d.hasPositions;
  const positions = useStore((s) => s.user.positions);
  const now = Date.now();
  const totalFees = Object.entries(positions).reduce((a, [id, p]) => {
    const pv = VAULT_BY_ID[id];
    return pv ? a + m.feesEarned(m.positionValue(p, pv), pv.feeApr7d, p.depositedAt, now) : a;
  }, 0);

  return (
    <div className="space-y-6">
      {showMine ? (
        <StatRow>
          <Stat label="Your deposits" value={fmtUsd(d.depositsUsd, { compact: false })} />
          <Stat label="Fees earned" value={`+${fmtUsd(totalFees, { compact: false, cents: true })}`} tone="up" />
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Stat label="Pending TIDE" value={`${fmtToken(d.pendingTide, 2)} TIDE`} tone="tide" sub={fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })} />
            <Button size="sm" variant="tide" onClick={() => setParams({ claim: '1' })} disabled={d.pendingTide < 0.005}>Claim</Button>
          </div>
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Stat
              label="Locked TIDE"
              value={`${fmtToken(lockedTide, 0)} TIDE`}
              sub={nextUnlock ? (unlockable ? 'Ready to unlock' : `Next unlock in ${Math.max(0, Math.ceil((nextUnlock - Date.now()) / 86_400_000))}d`) : 'Lock rewards for 100%'}
            />
            {locks.length > 0 && (
              <Button size="sm" variant={unlockable ? 'tide' : 'secondary'} onClick={() => setParams({ claim: '1' })}>{unlockable ? 'Unlock' : 'View'}</Button>
            )}
          </div>
        </StatRow>
      ) : (
        <StatRow cols={2}>
          <Stat label="Total TVL" value={fmtUsd(m.totalTvl(VAULTS, tvlDelta))} />
          <Stat label="Fees earned (24h)" value={fmtUsd(m.dailyFees(VAULTS, tvlDelta), { compact: false })} />
        </StatRow>
      )}

      <div className="flex items-center justify-between gap-4">
        <h1 className="display text-lg font-semibold">Vaults</h1>
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
        <table className="w-full text-sm num min-w-[720px]">
          <thead>
            <tr className="text-xs text-ink-3 border-b border-line">
              <th className="text-left font-medium px-4 h-10">Pool</th>
              <th className="text-right font-medium px-3 h-10 w-[18%]">TVL</th>
              <th className="text-right font-medium px-3 h-10 w-[18%]">APR</th>
              {showMine && <th className="text-right font-medium px-3 h-10 w-[18%]">My deposit</th>}
              <th className="px-4 h-10 w-[14%]" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ v, tvl }) => (
              <VaultRow key={v.id} vault={v} tvl={tvl} showMine={showMine} onDeposit={() => setParams({ deposit: v.id })} />
            ))}
          </tbody>
        </table>
      </div>
      <DepositModal vault={depositVault} onClose={() => setParams({})} />
      <ClaimModal open={claimOpen} onClose={() => setParams({})} />
    </div>
  );
}

function VaultRow({ vault: v, tvl, showMine, onDeposit }: { vault: Vault; tvl: number; showMine: boolean; onDeposit: () => void }) {
  const navigate = useNavigate();
  const { breakdown: b } = useVaultApr(v);
  const position = useStore((s) => s.user.positions[v.id]);
  const [hover, setHover] = useState(false);
  const aprCell = useRef<HTMLTableCellElement>(null);
  const [pop, setPop] = useState<{ top: number; right: number } | null>(null);
  const onEnter = () => {
    const r = aprCell.current?.getBoundingClientRect();
    if (r) setPop({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setHover(true);
  };

  return (
    <tr
      className={cx('border-b border-line last:border-0 hover:bg-panel-2/60 transition-colors cursor-pointer', v.tier === 'Degen' && 'bg-amber/[0.035]')}
      onClick={() => navigate(`/vault/${v.id}`)}
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <TokenPair a={v.token0} b={v.token1} />
          <span className="font-medium text-ink">{vaultName(v)}</span>
        </div>
      </td>
      <td className="px-3 py-3.5 text-right text-ink">{fmtUsd(tvl)}</td>
      <td ref={aprCell} className="px-3 py-3.5 text-right" onMouseEnter={onEnter} onMouseLeave={() => setHover(false)}>
        <span className="display text-lg font-semibold text-ink">{fmtPct(b.totalApr)}</span>
        {hover &&
          pop &&
          createPortal(
            <div
              className="fixed z-40 w-72 bg-panel-2 border border-line-2 rounded-md shadow-pop p-3 text-left animate-fade-in"
              style={{ top: pop.top, right: pop.right }}
              onClick={(e) => e.stopPropagation()}
            >
              <AprBreakdown vault={v} compact />
            </div>,
            document.body,
          )}
      </td>
      {showMine && (
        <td className="px-3 py-3.5 text-right">
          {position ? (
            <>
              <div className="text-ink">{fmtUsd(m.positionValue(position, v), { compact: false })}</div>
              <div className="text-2xs text-up">+{fmtUsd(m.feesEarned(m.positionValue(position, v), v.feeApr7d, position.depositedAt, Date.now()), { compact: false, cents: true })} fees</div>
            </>
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-3.5 text-right">
        <Button size="sm" variant={v.tier === 'Degen' ? 'secondary' : 'primary'} onClick={(e) => { e.stopPropagation(); onDeposit(); }}>
          Deposit
        </Button>
      </td>
    </tr>
  );
}
