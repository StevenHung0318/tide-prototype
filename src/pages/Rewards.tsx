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
import { KV } from '@/components/ui/KeyValue';
import { InfoDot } from '@/components/ui/Tooltip';

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
    return (
      <EmptyState
        title="Connect your wallet to see your rewards"
        body="Pending TIDE, active locks and your boost live here. Market data stays public."
        action={<Button onClick={() => connect()} loading={connecting}>Connect wallet</Button>}
      />
    );
  }

  const nothing = !d.hasPositions && d.pendingTide <= 0 && locks.length === 0;

  return (
    <div className="space-y-5">
      {nothing ? (
        <EmptyState title="No positions yet" body="Stake tdLP in any vault to start mining TIDE. Rewards accrue every second." action={<Link to="/"><Button>Explore markets</Button></Link>} />
      ) : (
        <PendingCard />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <ActiveLocks />
        <RedistributionCard />
      </div>
      <BoostCalculator />
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
      pushToast({ title: `Claimed ${fmtToken(got, 1)} TIDE`, detail: `${fmtToken(split.forfeited, 1)} TIDE forfeited to lockers`, tone: 'tide' });
    } else {
      const lock = claimLock();
      if (lock) pushToast({ title: `Locked ${fmtToken(lock.amount, 1)} TIDE for 60 days`, detail: `Unlocks ${fmtDate(lock.unlockAt)} · boost updated`, tone: 'tide' });
    }
    setBusy(false);
  };

  return (
    <section className="bg-panel border border-line rounded-md p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-ink-3 flex items-center gap-1.5">
            Pending rewards <InfoDot tip="Mined by your staked tdLP. Accrues continuously at your boosted TIDE APR." />
          </div>
          <div className="display num text-4xl font-semibold text-tide mt-1">
            {fmtToken(d.pendingTide, 2)} <span className="text-2xl">TIDE</span>
          </div>
          <div className="text-sm text-ink-2 num mt-0.5">≈ {fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })}</div>
        </div>
        <div className="text-xs text-ink-3 max-w-xs">
          Every claim is a choice: take half now, or lock the full amount for 60 days and share in what instant-claimers forfeit.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <OptionCard
          selected={choice === 'now'}
          onSelect={() => setChoice('now')}
          title="Claim now"
          amount={split.instant}
          sub="50% of your rewards"
          note={<span className="text-down">You forfeit {fmtToken(split.forfeited, 1)} TIDE to lockers</span>}
        />
        <OptionCard
          selected={choice === 'lock'}
          onSelect={() => setChoice('lock')}
          title="Lock 60 days"
          amount={split.locked}
          sub="Full amount + a share of forfeits"
          note={<span className="text-up">+ redistribution pool share while locked</span>}
          highlight
        />
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-sm text-ink-2 num">
          {choice === 'lock' ? (
            <>
              Unlocks <span className="text-ink">{fmtDate(unlockDate)}</span> · Locked TIDE also boosts your mining APR
            </>
          ) : (
            <>
              <span className="text-ink">{fmtToken(split.instant, 1)} TIDE</span> to your wallet now · {fmtToken(split.forfeited, 1)} TIDE to this week's redistribution pool
            </>
          )}
        </div>
        <Button size="lg" variant="tide" className="min-w-56" onClick={submit} disabled={empty} loading={busy}>
          {busy ? 'Confirming…' : choice === 'now' ? `Claim ${fmtToken(split.instant, 1)} TIDE` : `Lock ${fmtToken(split.locked, 1)} TIDE for 60 days`}
        </Button>
      </div>
    </section>
  );
}

function OptionCard({ selected, onSelect, title, amount, sub, note, highlight }: { selected: boolean; onSelect: () => void; title: string; amount: number; sub: string; note: React.ReactNode; highlight?: boolean }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'text-left rounded-md border p-4 transition-colors relative',
        selected ? 'border-tide bg-tide/[0.07]' : 'border-line hover:border-line-2 bg-base',
      )}
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
      <div className="text-xs text-ink-2 mt-1">{sub}</div>
      <div className="text-xs mt-2">{note}</div>
      {highlight && <span className="absolute top-3 right-10 text-2xs text-tide/80">Recommended</span>}
    </button>
  );
}

// ───────────────────────── Locks ─────────────────────────

function ActiveLocks() {
  const locks = useStore((s) => s.user.locks);
  const unlock = useStore((s) => s.unlock);
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState<string | null>(null);
  const now = Date.now();
  const total = m.lockedTide(locks);

  const doUnlock = async (id: string, amount: number) => {
    setBusy(id);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    unlock(id);
    setBusy(null);
    pushToast({ title: `Unlocked ${fmtToken(amount, 1)} TIDE`, tone: 'tide' });
  };

  return (
    <Card
      title="Active locks"
      action={<span className="text-xs text-ink-3 num">{fmtToken(total, 0)} TIDE · {fmtUsd(total * CONSTANTS.TIDE_PRICE, { compact: false })}</span>}
      padded={false}
    >
      {locks.length === 0 ? (
        <div className="p-6 text-sm text-ink-3 text-center">No locks yet. Lock rewards or wallet TIDE to boost your APR.</div>
      ) : (
        <ul className="divide-y divide-line">
          {[...locks].sort((a, b) => a.unlockAt - b.unlockAt).map((l) => {
            const progress = m.lockProgress(l, now);
            const left = m.lockDaysLeft(l, now);
            const ready = m.isUnlockable(l, now);
            return (
              <li key={l.id} className="px-4 py-3 text-sm num">
                <div className="flex items-center justify-between gap-3">
                  <span className="display font-semibold text-tide">{fmtToken(l.amount, 1)} TIDE</span>
                  <span className="text-xs text-up">+{fmtToken(l.redistributionEarned, 1)} TIDE from redistribution</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                  <div className={cx('h-full rounded-full', ready ? 'bg-up' : 'bg-tide')} style={{ width: `${progress * 100}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-2xs text-ink-3">
                  <span>Locked {fmtDate(l.lockedAt)}</span>
                  <span>{ready ? 'Unlocked' : `${left}d left`} · unlocks {fmtDate(l.unlockAt)}</span>
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
    </Card>
  );
}

// ───────────────────────── Redistribution ─────────────────────────

function RedistributionCard() {
  const forfeitsAdded = useStore((s) => s.forfeitsAdded);
  const forfeits = PROTOCOL.redistribution.fromForfeits + forfeitsAdded;
  const buybacks = PROTOCOL.redistribution.fromBuybacks;
  const pool = forfeits + buybacks;
  const d = useUserDerived();
  const share = PROTOCOL.totalLockedTide > 0 ? d.lockedTide / (PROTOCOL.totalLockedTide + d.lockedTide) : 0;
  return (
    <Card title="Redistribution pool">
      <div className="text-xs text-ink-3">This week's pool</div>
      <div className="display num text-3xl font-semibold text-tide mt-1">{fmtInt(pool)} TIDE</div>
      <KV
        className="mt-3"
        rows={[
          { k: 'From instant-claim forfeits', v: `${fmtInt(forfeits)} TIDE`, tone: 'text-ink' },
          { k: 'From protocol buybacks', v: `${fmtInt(buybacks)} TIDE`, tone: 'text-ink' },
        ]}
      />
      <p className="text-xs text-ink-3 mt-3">Distributed continuously to lockers, weighted by locked amount.</p>
      {d.lockedTide > 0 && (
        <p className="text-xs text-ink-2 mt-1 num">
          Your share of locked supply ≈ {fmtPct(share, 2)} → about <span className="text-tide">{fmtToken(pool * share, 1)} TIDE</span> this week.
        </p>
      )}
    </Card>
  );
}

// ───────────────────────── Boost calculator ─────────────────────────

function BoostCalculator() {
  const d = useUserDerived();
  const walletTide = useStore((s) => s.user.balances.TIDE ?? 0);
  const positions = useStore((s) => s.user.positions);
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const lockFromWallet = useStore((s) => s.lockFromWallet);
  const pushToast = useStore((s) => s.pushToast);
  const [extra, setExtra] = useState(0);
  const [busy, setBusy] = useState(false);

  const neededUsd = Math.max(0, m.lockedUsdForFullBoost(d.depositsUsd) - d.lockedUsd);
  const neededTide = neededUsd / CONSTANTS.TIDE_PRICE;
  const sliderMax = Math.max(1_000, Math.ceil(Math.max(walletTide, neededTide * 1.2) / 100) * 100);
  const simulatedLockedUsd = d.lockedUsd + extra * CONSTANTS.TIDE_PRICE;
  const simBoost = m.boost(simulatedLockedUsd, d.depositsUsd);
  const simRatio = m.boostRatio(simulatedLockedUsd, d.depositsUsd);
  const canLock = extra > 0 && extra <= walletTide;

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
    if (lock) pushToast({ title: `Locked ${fmtToken(lock.amount, 1)} TIDE for 60 days`, detail: `Unlocks ${fmtDate(lock.unlockAt)} · boost updated`, tone: 'tide' });
  };

  return (
    <Card id="boost" title="Boost calculator" action={<span className="text-xs text-ink-3">Boost scales up to ×1.5 when your locked TIDE is ≥10% of your deposit value.</span>}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          <Mini label="Locked TIDE value" value={fmtUsd(d.lockedUsd, { compact: false })} sub={`${fmtToken(d.lockedTide, 0)} TIDE`} />
          <Mini label="Your deposits" value={fmtUsd(d.depositsUsd, { compact: false })} />
          <Mini label="Ratio" value={fmtPct(d.ratio)} sub={d.ratio >= CONSTANTS.BOOST_FULL_RATIO ? 'At full boost' : `${fmtToken(neededTide, 0)} more TIDE for ×1.5`} tone={d.ratio >= 0.1 ? 'text-up' : 'text-amber'} />
          <div>
            <div className="text-xs text-ink-3">Boost</div>
            <div className="display num text-4xl font-semibold text-tide leading-none mt-1">{fmtMultiplier(d.boost)}</div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-ink-2">Lock more TIDE</span>
              <span className="num text-ink">
                +{fmtToken(extra, 0)} TIDE <span className="text-ink-3">· wallet {fmtToken(walletTide, 0)} TIDE</span>
              </span>
            </div>
            <input type="range" min={0} max={sliderMax} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} aria-label="Additional TIDE to lock" />
            <div className="flex justify-between text-2xs text-ink-3 num mt-1">
              <span>0</span>
              <span>{fmtToken(sliderMax, 0)}</span>
            </div>
          </div>

          <div className="rounded border border-line bg-base p-3 text-sm num space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-2">Boost</span>
              <span className="text-tide font-medium">
                {fmtMultiplier(d.boost)} → {fmtMultiplier(simBoost)} <span className="text-ink-3 text-xs">ratio {fmtPct(simRatio)}</span>
              </span>
            </div>
            {previewVaults.map((v) => {
              const tvl = m.effectiveTvl(v, tvlDelta);
              const cur = m.aprBreakdown(v, tvl, d.boost).yourApr;
              const next = m.aprBreakdown(v, tvl, simBoost).yourApr;
              return (
                <div key={v.id} className="flex items-center justify-between">
                  <span className="text-ink-2">Your APR on {vaultName(v)}</span>
                  <span className="font-medium">
                    {fmtPct(cur)} → <span className={next > cur ? 'text-aqua' : 'text-ink'}>{fmtPct(next)}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className={cx('text-xs', extra > walletTide ? 'text-down' : 'text-ink-3')}>
              {extra > walletTide ? 'Insufficient TIDE balance' : extra > 0 ? `Locks for ${CONSTANTS.LOCK_DAYS} days · unlocks ${fmtDate(Date.now() + CONSTANTS.LOCK_DAYS * 86_400_000)}` : 'Drag to simulate. Locking is optional.'}
            </span>
            <Button variant="tide" disabled={!canLock} onClick={doLock} loading={busy}>
              {busy ? 'Confirming…' : extra > 0 ? `Lock ${fmtToken(extra, 0)} TIDE` : 'Lock TIDE'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="display num text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className={cx('text-2xs num', tone ?? 'text-ink-3')}>{sub}</div>}
    </div>
  );
}
