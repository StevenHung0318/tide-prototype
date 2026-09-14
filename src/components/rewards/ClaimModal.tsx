import { useEffect, useState } from 'react';
import { PROTOCOL } from '@/data/protocol';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { cx, fmtDate, fmtInt, fmtToken, fmtUsd } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useUserDerived } from '@/store/selectors';
import { Button } from '@/components/ui/Button';

const TX_DELAY = 1500;
type Choice = 'now' | 'lock';

/** Claim pending TIDE (now at 50%, or lock 90 days for 100%) and manage locks. */
export function ClaimModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-16 overflow-y-auto" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-deep/80" onClick={onClose} />
      <div className="relative w-full max-w-[440px] animate-fade-in space-y-3">
        <button onClick={onClose} className="absolute -top-8 right-0 text-xs text-ink-3 hover:text-ink" aria-label="Close">Close ✕</button>
        <Claim onDone={onClose} />
        <Locks />
      </div>
    </div>
  );
}

function Claim({ onDone }: { onDone: () => void }) {
  const d = useUserDerived();
  const claimInstant = useStore((s) => s.claimInstant);
  const claimLock = useStore((s) => s.claimLock);
  const pushToast = useStore((s) => s.pushToast);
  const [choice, setChoice] = useState<Choice>('lock');
  const [busy, setBusy] = useState(false);
  const split = m.claimSplit(d.pendingTide);
  const empty = d.pendingTide < 0.005;

  const submit = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    if (choice === 'now') {
      const got = claimInstant();
      pushToast({ title: `Claimed ${fmtToken(got, 1)} TIDE`, tone: 'tide' });
    } else {
      const lock = claimLock();
      if (lock) pushToast({ title: `Locked ${fmtToken(lock.amount, 1)} TIDE for 90 days`, detail: `Unlocks ${fmtDate(lock.unlockAt)}`, tone: 'tide' });
    }
    setBusy(false);
    onDone();
  };

  return (
    <section className="bg-panel border border-line rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="display text-sm font-semibold">Pending rewards</h2>
        <span className="text-xs text-ink-3 num">TIDE ${CONSTANTS.TIDE_PRICE.toFixed(3)}</span>
      </div>
      <div className="display num text-3xl font-semibold text-tide leading-none">
        {fmtToken(d.pendingTide, 2)} <span className="text-lg">TIDE</span>
        <span className="text-sm text-ink-2 font-normal ml-2">≈ {fmtUsd(d.pendingTide * CONSTANTS.TIDE_PRICE, { compact: false, cents: true })}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Option selected={choice === 'now'} onSelect={() => setChoice('now')} title="Claim now" amount={split.instant} note="50% · rest goes to lockers" />
        <Option selected={choice === 'lock'} onSelect={() => setChoice('lock')} title="Lock 90 days" amount={split.locked} note="100% + share of forfeits" good />
      </div>
      <Button block size="lg" variant="tide" onClick={submit} disabled={empty} loading={busy}>
        {busy ? 'Confirming…' : empty ? 'Nothing to claim yet' : choice === 'now' ? `Claim ${fmtToken(split.instant, 1)} TIDE` : `Lock ${fmtToken(split.locked, 1)} TIDE`}
      </Button>
    </section>
  );
}

function Option({ selected, onSelect, title, amount, note, good }: { selected: boolean; onSelect: () => void; title: string; amount: number; note: string; good?: boolean }) {
  return (
    <button onClick={onSelect} aria-pressed={selected} className={cx('text-left rounded-md border px-3 py-2.5 transition-colors', selected ? 'border-tide bg-tide/[0.07]' : 'border-line hover:border-line-2 bg-deep')}>
      <div className="text-xs text-ink-2">{title}</div>
      <div className={cx('display num text-xl font-semibold mt-0.5', selected ? 'text-tide' : 'text-ink')}>{fmtToken(amount, 1)} <span className="text-xs font-normal">TIDE</span></div>
      <div className={cx('text-2xs mt-1', good ? 'text-up' : 'text-ink-3')}>{note}</div>
    </button>
  );
}

function Locks() {
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
    <section className="bg-panel border border-line rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="display text-sm font-semibold">Locked TIDE</h2>
        <span className="text-xs num text-tide">{fmtToken(total, 0)} TIDE</span>
      </div>
      {locks.length === 0 ? (
        <div className="text-xs text-ink-3">Nothing locked yet.</div>
      ) : (
        <ul className="divide-y divide-line -my-1">
          {[...locks].sort((a, b) => a.unlockAt - b.unlockAt).map((l) => {
            const ready = m.isUnlockable(l, now);
            return (
              <li key={l.id} className="py-2 text-xs num">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink font-medium">{fmtToken(l.amount, 1)} TIDE</span>
                  <span className="text-ink-3">
                    {ready ? 'Ready' : `${m.lockDaysLeft(l, now)}d left`}
                    {l.redistributionEarned > 0 && <span className="text-up"> · +{fmtToken(l.redistributionEarned, 1)} earned</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden">
                  <div className={cx('h-full rounded-full', ready ? 'bg-up' : 'bg-tide')} style={{ width: `${m.lockProgress(l, now) * 100}%` }} />
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
      <div className="text-2xs text-ink-3 num">Lockers share this week's pool of {fmtInt(pool)} TIDE from forfeits and buybacks.</div>
    </section>
  );
}
