import { useState } from 'react';
import * as m from '@/lib/math';
import { cx, fmtDate, fmtToken } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

/** Every lock as its own row with a countdown to unlock. */
export function LocksList() {
  const locks = useStore((s) => s.user.locks);
  const unlock = useStore((s) => s.unlock);
  const pushToast = useStore((s) => s.pushToast);
  const [busy, setBusy] = useState<string | null>(null);
  const now = Date.now();
  if (locks.length === 0) return null;
  const total = m.lockedTide(locks);

  const doUnlock = async (id: string, amount: number) => {
    setBusy(id);
    await new Promise((r) => setTimeout(r, 1500));
    unlock(id);
    setBusy(null);
    pushToast({ title: `Unlocked ${fmtToken(amount, 1)} TIDE`, tone: 'tide' });
  };

  return (
    <section className="bg-panel border border-line rounded-md overflow-x-auto">
      <div className="flex items-center justify-between px-4 h-10 border-b border-line">
        <h2 className="display text-sm font-semibold">Locked TIDE</h2>
        <span className="text-xs num text-tide">{fmtToken(total, 0)} TIDE</span>
      </div>
      <table className="w-full text-sm num min-w-[640px]">
        <thead>
          <tr className="text-xs text-ink-3 border-b border-line">
            <th className="text-left font-medium px-4 h-9">Amount</th>
            <th className="text-left font-medium px-3 h-9">Locked</th>
            <th className="text-left font-medium px-3 h-9">Unlocks</th>
            <th className="text-left font-medium px-3 h-9 w-[30%]">Countdown</th>
            <th className="px-4 h-9" />
          </tr>
        </thead>
        <tbody>
          {[...locks].sort((a, b) => a.unlockAt - b.unlockAt).map((l) => {
            const ready = m.isUnlockable(l, now);
            const left = m.lockDaysLeft(l, now);
            return (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink font-medium">
                  {fmtToken(l.amount, 1)} TIDE
                  {l.redistributionEarned > 0 && <span className="text-2xs text-up ml-2">+{fmtToken(l.redistributionEarned, 1)} earned</span>}
                </td>
                <td className="px-3 py-3 text-ink-2">{fmtDate(l.lockedAt)}</td>
                <td className="px-3 py-3 text-ink-2">{fmtDate(l.unlockAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-line overflow-hidden">
                      <div className={cx('h-full rounded-full', ready ? 'bg-up' : 'bg-tide')} style={{ width: `${m.lockProgress(l, now) * 100}%` }} />
                    </div>
                    <span className={cx('text-xs shrink-0', ready ? 'text-up' : 'text-ink-3')}>{ready ? 'Ready' : `${left}d left`}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {ready ? (
                    <Button size="sm" variant="tide" onClick={() => doUnlock(l.id, l.amount)} loading={busy === l.id}>
                      Unlock
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-3">Locked</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
