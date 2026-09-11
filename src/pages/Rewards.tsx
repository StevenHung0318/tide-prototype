import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VAULTS, VAULT_BY_ID, vaultName } from '@/data/vaults';
import { PROTOCOL } from '@/data/protocol';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { cx, fmtDate, fmtInt, fmtMultiplier, fmtPct, fmtToken, fmtUsd } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useUserDerived } from '@/store/selectors';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

const TX_DELAY = 1500;
type Choice = 'now' | 'lock';

export function Rewards() {
  const d = useUserDerived();
  const connect = useStore((s) => s.connect);
  const connecting = useStore((s) => s.connecting);
  const locks = useStore((s) => s.user.locks);

  useEffect(() => {
    if (window.location.hash === '#boost') document.getElementById('boost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (!d.connected) {
    return <EmptyState title="Connect your wallet to see your rewards" action={<Button onClick={() => connect()} loading={connecting}>Connect wallet</Button>} />;
  }

  const nothing = !d.hasPositions && d.pendingTide <= 0 && locks.length === 0;

  return (
    <div className="space-y-6">
      {nothing ? <EmptyState title="No rewards yet" body="Stake tdLP in any vault to start mining TIDE." action={<Link to="/"><Button>Explore vaults</Button></Link>} /> : <PendingCard />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ActiveLocks />
        <BoostCard />
      </div>
    </div>
  );
}

// ───────────────────────── Pending / claim ─────────────────────────

function PendingCard() {
  const d = useUserDerived();
  const claimInstant = useStore((s) => s.claimInstant);
  const claimLock = useStore((s) => s.claimLock);
  const pushToast = useStore((s) => s.pushToast);
  const [choice, setChoice] = useState<Choice>('lock');
  const [busy, setBusy] = useState(false);
  const split = m.claimSplit(d.pendingTide);
  const unlockDate = new Date(Date.now() + CONSTANTS.LOCK_DAYS * 86_400_000);
  const empty = d.pendingTide < 0.005;

  const submit = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    if (choice === 'now') {
      const got = claimInstant();
      pushToast({ title: `Claimed ${fmtToken(got, 1)} TIDE`, tone: 'tide' });
    } else {
      const lock = claimLock();
      if (lock) pushToast({ title: `Locked ${fmtToken(lock.amount, 1)} TIDE for 60 days`, detail: `Unlocks ${fmtDate(lock.unlockAt)}`, tone: 'tide' });
    }
    setBusy(false);
  };

  return (
    <section className="bg-panel border border-line rounded-md p-5 md:p-6">
      <div className="text-xs text-ink-3">Pending rewards</div>
      <div className="display num text-4xl font-semibold text-tide mt-1">
        {fmtToken(d.pendingTide, 2)} <span className="text-2xl">TIDE</span>
        <span className="text-sm text-ink-2 font-normal ml-3">≈ {fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <OptionCard selected={choice === 'now'} onSelect={() => setChoice('now')} title="Claim now" amount={split.instant} note={<span className="text-ink-3">Get 50%. The rest goes to lockers.</span>} />
        <OptionCard selected={choice === 'lock'} onSelect={() => setChoice('lock')} title="Lock 60 days" amount={split.locked} note={<span className="text-up">Get 100% + a share of forfeits. Boosts your APR.</span>} highlight />
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-sm text-ink-2 num">
          {choice === 'lock' ? (
            <>Unlocks <span className="text-ink">{fmtDate(unlockDate)}</span></>
          ) : (
            <>You forfeit <span className="text-down">{fmtToken(split.forfeited, 1)} TIDE</span></>
          )}
        </div>
        <Button size="lg" variant="tide" className="min-w-56" onClick={submit} disabled={empty} loading={busy}>
          {busy ? 'Confirming…' : choice === 'now' ? `Claim ${fmtToken(split.instant, 1)} TIDE` : `Lock ${fmtToken(split.locked, 1)} TIDE`}
        </Button>
      </div>
    </section>
  );
}

function OptionCard({ selected, onSelect, title, amount, note, highlight }: { selected: boolean; onSelect: () => void; title: string; amount: number; note: React.ReactNode; highlight?: boolean }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cx('text-left rounded-md border p-4 transition-colors relative', selected ? 'border-tide bg-tide/[0.07]' : 'border-line hover:border-line-2 bg-deep')}
    >
      <div className="flex items-center justify-between">
        <span className="display text-sm font-semibold">{title}</span>
        <span className={cx('h-4 w-4 rounded-full border flex items-center justify-center', selected ? 'border-tide' : 'border-line-2')}>
          {selected && <span className="h-2 w-2 rounded-full bg-tide" />}
        </span>
      </div>
      <div className={cx('display num text-3xl font-semibold mt-3', selected ? 'text-tide' : 'text-ink')}>
        {fmtToken(amount, 1)} <span className="text-lg">TIDE</span>
      </div>
      <div className="text-xs mt-2">{note}</div>
      {highlight && <span className="absolute top-4 right-10 text-2xs text-tide/80">Recommended</span>}
    </button>
  );
}

// ───────────────────────── Locks ─────────────────────────

function ActiveLocks() {
  const locks = useStore((s) => s.user.locks);
  const unlock = useStore((s) => s.unlock);
  const pushToast = useStore((s) => s.pushToast);
  const forfeitsAdded = useStore((s) => s.forfeitsAdded);
  const [busy, setBusy] = useState<string | null>(null);
  const now = Date.now();
  const total = m.lockedTide(locks);
  const pool = PROTOCOL.redistribution.fromForfeits + forfeitsAdded + PROTOCOL.redistribution.fromBuybacks;

  const doUnlock = async (id: string, amount: number) => {
    setBusy(id);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    unlock(id);
    setBusy(null);
    pushToast({ title: `Unlocked ${fmtToken(amount, 1)} TIDE`, tone: 'tide' });
  };

  return (
    <Card title="Locked TIDE" action={locks.length > 1 ? <span className="text-sm num text-tide font-medium">{fmtToken(total, 0)} TIDE total</span> : undefined} padded={false}>
      {locks.length === 0 ? (
        <div className="p-6 text-sm text-ink-3 text-center">Nothing locked yet.</div>
      ) : (
        <ul className="divide-y divide-line">
          {[...locks].sort((a, b) => a.unlockAt - b.unlockAt).map((l) => {
            const progress = m.lockProgress(l, now);
            const left = m.lockDaysLeft(l, now);
            const ready = m.isUnlockable(l, now);
            return (
              <li key={l.id} className="px-4 py-3 text-sm num">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{fmtToken(l.amount, 1)} TIDE</span>
                  <span className="text-xs text-ink-3">{ready ? 'Ready to unlock' : `${left}d left`}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                  <div className={cx('h-full rounded-full', ready ? 'bg-up' : 'bg-tide')} style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-2xs text-ink-3">
                  <span>Unlocks {fmtDate(l.unlockAt)}</span>
                  {l.redistributionEarned > 0 && <span className="text-up">+{fmtToken(l.redistributionEarned, 1)} TIDE earned</span>}
                </div>
                {ready && (
                  <Button size="sm" variant="tide" className="mt-2" onClick={() => doUnlock(l.id, l.amount)} loading={busy === l.id}>
                    Unlock {fmtToken(l.amount + l.redistributionEarned, 1)} TIDE
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-line px-4 py-2.5 text-xs text-ink-3 num">
        Lockers share this week's pool of <span className="text-tide">{fmtInt(pool)} TIDE</span> from forfeits and buybacks.
      </div>
    </Card>
  );
}

// ───────────────────────── Boost ─────────────────────────

function BoostCard() {
  const d = useUserDerived();
  const walletTide = useStore((s) => s.user.balances.TIDE ?? 0);
  const positions = useStore((s) => s.user.positions);
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const lockFromWallet = useStore((s) => s.lockFromWallet);
  const pushToast = useStore((s) => s.pushToast);
  const [extra, setExtra] = useState(0);
  const [busy, setBusy] = useState(false);

  const neededTide = Math.max(0, m.lockedUsdForFullBoost(d.depositsUsd) - d.lockedUsd) / CONSTANTS.TIDE_PRICE;
  const sliderMax = Math.max(1_000, Math.ceil(Math.max(walletTide, neededTide * 1.2) / 100) * 100);
  const simBoost = m.boost(d.lockedUsd + extra * CONSTANTS.TIDE_PRICE, d.depositsUsd);
  const canLock = extra > 0 && extra <= walletTide;
  const full = d.ratio >= CONSTANTS.BOOST_FULL_RATIO;

  useEffect(() => setExtra((e) => Math.min(e, sliderMax)), [sliderMax]);

  const previewVaults = useMemo(() => {
    const ids = Object.keys(positions);
    return (ids.length ? ids.map((id) => VAULT_BY_ID[id]) : [VAULTS[0]]).filter(Boolean);
  }, [positions]);

  const doLock = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    const lock = lockFromWallet(extra);
    setBusy(false);
    setExtra(0);
    if (lock) pushToast({ title: `Locked ${fmtToken(lock.amount, 1)} TIDE for 60 days`, tone: 'tide' });
  };

  return (
    <Card id="boost" title="Boost">
      <div className="flex items-end justify-between gap-4">
        <div className="display num text-4xl font-semibold text-tide leading-none">{fmtMultiplier(d.boost)}</div>
        <div className={cx('text-xs num text-right', full ? 'text-ink-3' : 'text-amber')}>
          {full ? 'Full boost' : `Lock ${fmtToken(neededTide, 0)} more TIDE for ×1.5`}
          <div className="text-ink-3">Locked {fmtUsd(d.lockedUsd, { compact: false })} · Deposits {fmtUsd(d.depositsUsd, { compact: false })} · {fmtPct(d.ratio)}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-ink-2">Lock more TIDE</span>
          <span className="num text-ink">+{fmtToken(extra, 0)} <span className="text-ink-3">/ {fmtToken(walletTide, 0)} in wallet</span></span>
        </div>
        <input type="range" min={0} max={sliderMax} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} aria-label="Additional TIDE to lock" />
      </div>

      <div className="mt-4 rounded border border-line bg-deep p-3 text-sm num space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-ink-2">Boost</span>
          <span className="text-tide font-medium">{fmtMultiplier(d.boost)} → {fmtMultiplier(simBoost)}</span>
        </div>
        {previewVaults.map((v) => {
          const tvl = m.effectiveTvl(v, tvlDelta);
          const cur = m.aprBreakdown(v, tvl, d.boost).yourApr;
          const next = m.aprBreakdown(v, tvl, simBoost).yourApr;
          return (
            <div key={v.id} className="flex items-center justify-between">
              <span className="text-ink-2">{vaultName(v)} APR</span>
              <span className="font-medium">{fmtPct(cur)} → <span className={next > cur ? 'text-aqua' : 'text-ink'}>{fmtPct(next)}</span></span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={cx('text-xs', extra > walletTide ? 'text-down' : 'text-ink-3')}>
          {extra > walletTide ? 'Insufficient TIDE balance' : `Boost reaches ×1.5 when locked TIDE ≥ 10% of your deposits.`}
        </span>
        <Button variant="tide" disabled={!canLock} onClick={doLock} loading={busy}>
          {busy ? 'Confirming…' : extra > 0 ? `Lock ${fmtToken(extra, 0)} TIDE` : 'Lock TIDE'}
        </Button>
      </div>
    </Card>
  );
}
