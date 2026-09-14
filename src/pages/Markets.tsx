import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VAULTS, VAULT_BY_ID, vaultName } from '@/data/vaults';
import * as m from '@/lib/math';
import { cx, fmtPct, fmtToken, fmtUsd } from '@/lib/format';
import { CONSTANTS } from '@/lib/constants';
import type { Vault } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useUserDerived, useVaultApr } from '@/store/selectors';
import { Stat, StatRow } from '@/components/ui/Stat';
import { TokenPair } from '@/components/ui/TokenIcon';
import { BoostedApr } from '@/components/ui/BoostedApr';
import { Button } from '@/components/ui/Button';
import { AprBreakdown } from '@/components/vault/AprBreakdown';
import { DepositModal } from '@/components/deposit/DepositModal';
import { ClaimModal } from '@/components/rewards/ClaimModal';


export function Markets() {
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const d = useUserDerived();
  const [q, setQ] = useState('');
  const [params, setParams] = useSearchParams();
  const depositVault = VAULT_BY_ID[params.get('deposit') ?? ''] ?? null;
  const claimOpen = params.get('claim') === '1';
  const locks = useStore((s) => s.user.locks);
  const lockedTide = m.lockedTide(locks);
  const nextUnlock = locks.length ? Math.min(...locks.map((l) => l.unlockAt)) : null;
  const ready = locks.filter((l) => m.isUnlockable(l, Date.now()));
  const readyTide = ready.reduce((a, l) => a + l.amount + l.redistributionEarned, 0);
  const lockLine =
    lockedTide <= 0
      ? 'Nothing locked'
      : ready.length
        ? `${fmtToken(readyTide, 0)} TIDE ready to unlock`
        : `${fmtToken(lockedTide, 0)} TIDE locked · next unlock in ${Math.max(0, Math.ceil(((nextUnlock ?? 0) - Date.now()) / 86_400_000))}d`;
  const rows = useMemo(
    () =>
      VAULTS.filter((v) => vaultName(v).toLowerCase().replace(/\s/g, '').includes(q.toLowerCase().replace(/\s/g, '')))
        .map((v) => ({ v, tvl: m.effectiveTvl(v, tvlDelta) }))
        .sort((a, b) => b.tvl - a.tvl),
    [q, tvlDelta],
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
        <StatRow cols={3}>
          <Stat label="Your deposits" value={fmtUsd(d.depositsUsd, { compact: false })} />
          <Stat label="Fees earned" value={`+${fmtUsd(totalFees, { compact: false, cents: true })}`} tone="up" />
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Stat
              label="TIDE rewards"
              value={`${fmtToken(d.pendingTide, 2)} TIDE`}
              tone="tide"
              sub={
                <>
                  ≈ {fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })} <span className="text-ink-3">· {lockLine}</span>
                </>
              }
            />
            <Button size="sm" variant="tide" className="shrink-0" onClick={() => setParams({ claim: '1' })} disabled={d.pendingTide < 0.005}>Claim</Button>
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
        <div className="relative">
          <svg viewBox="0 0 16 16" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vaults"
            className="h-8 w-56 pl-8 pr-3 rounded bg-panel border border-line focus:border-line-2 outline-none text-sm placeholder:text-ink-3"
          />
        </div>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-3">No vaults match "{q}".</td>
              </tr>
            )}
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
        <BoostedApr value={fmtPct(b.totalApr)} className="display text-lg font-semibold" />
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
