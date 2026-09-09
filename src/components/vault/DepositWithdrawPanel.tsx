import { useEffect, useMemo, useState } from 'react';
import type { Vault } from '@/lib/types';
import { TOKEN_PRICES } from '@/data/vaults';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import { useStore } from '@/store/useStore';
import { useUserDerived, useVaultApr } from '@/store/selectors';
import { cx, fmtPct, fmtToken, fmtUsd } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AmountInput } from '@/components/ui/AmountInput';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { TokenIcon } from '@/components/ui/TokenIcon';

type Tab = 'deposit' | 'withdraw';
const TX_DELAY = 1500;

export function DepositWithdrawPanel({ vault: v, initialTab = 'deposit', autoFocus }: { vault: Vault; initialTab?: Tab; autoFocus?: boolean }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  return (
    <div className="bg-panel border border-line rounded-md">
      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'deposit', label: 'Deposit' },
          { value: 'withdraw', label: 'Withdraw' },
        ]}
        className="px-1"
      />
      <div className="p-4">{tab === 'deposit' ? <Deposit vault={v} autoFocus={autoFocus} /> : <Withdraw vault={v} />}</div>
      <PositionSummary vault={v} />
    </div>
  );
}

// ───────────────────────── Deposit ─────────────────────────

function Deposit({ vault: v, autoFocus }: { vault: Vault; autoFocus?: boolean }) {
  const connected = useStore((s) => s.connected);
  const connect = useStore((s) => s.connect);
  const balances = useStore((s) => s.user.balances);
  const degenAck = useStore((s) => s.user.degenAcknowledged);
  const acknowledgeDegen = useStore((s) => s.acknowledgeDegen);
  const deposit = useStore((s) => s.deposit);
  const pushToast = useStore((s) => s.pushToast);
  const { tvl } = useVaultApr(v);
  const d = useUserDerived();

  const singles = useMemo(() => Array.from(new Set(['USDC', v.token0, v.token1])), [v]);
  const dualKey = `${v.token0} + ${v.token1}`;
  const [asset, setAsset] = useState<string>('USDC');
  const [amount, setAmount] = useState('');
  const [amount1, setAmount1] = useState('');
  const [stake, setStake] = useState(true);
  const [busy, setBusy] = useState(false);
  const [degenOpen, setDegenOpen] = useState(false);
  const [ack, setAck] = useState(false);

  const isDual = asset === dualKey;
  const amt = Number(amount) || 0;
  const amt1 = Number(amount1) || 0;
  const bal = (t: string) => balances[t] ?? 0;

  const preview = useMemo(() => {
    if (isDual) return amt + amt1 > 0 ? m.dualPreview(v, amt, amt1, TOKEN_PRICES) : null;
    return amt > 0 ? m.zapPreview(v, tvl, asset, amt, TOKEN_PRICES) : null;
  }, [isDual, amt, amt1, v, tvl, asset]);

  const insufficient = connected && (isDual ? amt > bal(v.token0) || amt1 > bal(v.token1) : amt > bal(asset));
  const error = insufficient ? 'Insufficient balance' : null;
  const canSubmit = !!preview && preview.netUsd > 0 && !insufficient;

  // Boost after this deposit (deposits dilute the locked ratio).
  const boostAfter = connected && preview ? m.boost(d.lockedUsd, d.depositsUsd + preview.netUsd) : d.boost;

  const doDeposit = async () => {
    if (!preview) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    const spend = isDual
      ? [
          { token: v.token0, amount: amt },
          { token: v.token1, amount: amt1 },
        ]
      : [{ token: asset, amount: amt }];
    deposit({ vaultId: v.id, preview, stake, spend });
    setBusy(false);
    setAmount('');
    setAmount1('');
    const what = isDual ? `${fmtToken(amt)} ${v.token0} + ${fmtToken(amt1)} ${v.token1}` : `${fmtToken(amt)} ${asset}`;
    pushToast({ title: `Deposited ${what}${stake ? ' · Earning TIDE' : ''}`, detail: `Received ${fmtToken(preview.tdlp, 1)} ${v.receiptSymbol}`, tone: stake ? 'tide' : 'default' });
  };

  const onSubmit = () => {
    if (!connected) return connect();
    if (v.tier === 'Degen' && !degenAck) {
      setDegenOpen(true);
      return;
    }
    void doDeposit();
  };

  const ctaLabel = !connected ? 'Connect wallet' : isDual ? `Deposit ${v.token0} + ${v.token1}` : `Deposit ${asset}`;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-ink-3 mb-1.5">Deposit with</div>
        <div className="flex flex-wrap gap-1.5">
          {[...singles, dualKey].map((a) => (
            <button
              key={a}
              onClick={() => { setAsset(a); setAmount(''); setAmount1(''); }}
              className={cx(
                'h-7 px-2.5 rounded border text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                asset === a ? 'border-aqua text-ink bg-aqua/10' : 'border-line text-ink-2 hover:border-line-2',
              )}
            >
              {a !== dualKey && <TokenIcon symbol={a} size={14} />}
              {a}
            </button>
          ))}
        </div>
        {!isDual && <div className="text-2xs text-ink-3 mt-1.5">One-click zap: the vault swaps into both sides for you.</div>}
      </div>

      {isDual ? (
        <div className="space-y-2">
          <AmountInput value={amount} onChange={setAmount} token={v.token0} balance={connected ? bal(v.token0) : undefined} onMax={connected ? () => setAmount(String(bal(v.token0))) : undefined} error={connected && amt > bal(v.token0) ? 'Insufficient balance' : null} autoFocus={autoFocus} />
          <AmountInput value={amount1} onChange={setAmount1} token={v.token1} balance={connected ? bal(v.token1) : undefined} onMax={connected ? () => setAmount1(String(bal(v.token1))) : undefined} error={connected && amt1 > bal(v.token1) ? 'Insufficient balance' : null} />
        </div>
      ) : (
        <AmountInput
          value={amount}
          onChange={setAmount}
          token={asset}
          balance={connected ? bal(asset) : undefined}
          onMax={connected ? () => setAmount(String(bal(asset))) : undefined}
          error={error}
          hint={preview ? `≈ ${fmtUsd(preview.inputUsd, { compact: false, cents: true })}` : undefined}
          autoFocus={autoFocus}
        />
      )}

      {preview && (
        <div className="rounded border border-line bg-base p-3 text-xs num space-y-1.5 animate-fade-in">
          <div className="text-ink-3 font-medium">{isDual ? 'Deposit preview' : 'Auto-swap preview'}</div>
          {!isDual && (
            <>
              <div className="text-ink">{fmtToken(preview.inputAmount)} {preview.inputToken}</div>
              <div className="text-ink-2">
                → {preview.legs.map((l, i) => (
                  <span key={l.token}>
                    {i > 0 && ' + '}
                    {fmtToken(l.amount)} {l.token}
                  </span>
                ))}
                {preview.swapToken && preview.swapPrice && (
                  <span className="text-ink-3"> (swapped at ${preview.swapPrice >= 1 ? preview.swapPrice.toFixed(2) : preview.swapPrice.toPrecision(3)})</span>
                )}
              </div>
              <Line k="Price impact" v={fmtPct(preview.priceImpact, 2)} tone={preview.priceImpact > 0.01 ? 'text-amber' : undefined} />
              <Line k="Swap fee" v={`~${fmtUsd(preview.swapFeeUsd, { compact: false, cents: true })}`} />
            </>
          )}
          {isDual && preview.legs.map((l) => <Line key={l.token} k={l.token} v={`${fmtToken(l.amount)} · ${fmtUsd(l.usd, { compact: false, cents: true })}`} />)}
          <div className="border-t border-line my-1" />
          <div className="flex justify-between items-baseline">
            <span className="text-ink-2">You receive</span>
            <span className="text-ink font-semibold text-sm">{fmtToken(preview.tdlp, 1)} {v.receiptSymbol}</span>
          </div>
          <div className="text-ink-3 text-right">1 {v.receiptSymbol} = ${preview.pricePerShare.toFixed(4)}</div>
          {connected && d.lockedTide > 0 && Math.abs(boostAfter - d.boost) > 0.0005 && (
            <div className="border-t border-line pt-1.5 flex justify-between">
              <span className="text-ink-2">Boost after deposit</span>
              <span className="text-tide">
                ×{d.boost.toFixed(2)} → ×{boostAfter.toFixed(2)} <span className="text-ink-3">(ratio diluted)</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 rounded border border-line p-3">
        <div>
          <div className="text-sm font-medium text-ink">Stake to earn TIDE</div>
          <div className="text-xs text-ink-3 mt-0.5">Auto-stake your {v.receiptSymbol} to start mining TIDE immediately.</div>
        </div>
        <Toggle checked={stake} onChange={setStake} label="Stake to earn TIDE" tone="tide" />
      </div>

      <Button block size="lg" onClick={onSubmit} disabled={connected && !canSubmit} loading={busy}>
        {busy ? 'Confirming…' : ctaLabel}
      </Button>

      <Modal
        open={degenOpen}
        onClose={() => setDegenOpen(false)}
        title="Degen vault — read before depositing"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDegenOpen(false)}>Cancel</Button>
            <Button
              disabled={!ack}
              onClick={() => { acknowledgeDegen(); setDegenOpen(false); void doDeposit(); }}
            >
              I understand, deposit
            </Button>
          </>
        }
      >
        <p>Degen vaults run narrow, high-frequency ranges on volatile pairs. Higher fees, higher impermanent loss risk. Net value can underperform holding.</p>
        <label className="mt-4 flex items-start gap-2.5 cursor-pointer text-ink">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[#F5B14C]" />
          <span className="text-sm">I understand this vault can lose value versus holding the underlying tokens.</span>
        </label>
      </Modal>
    </div>
  );
}

// ───────────────────────── Withdraw ─────────────────────────

function Withdraw({ vault: v }: { vault: Vault }) {
  const connected = useStore((s) => s.connected);
  const connect = useStore((s) => s.connect);
  const position = useStore((s) => s.user.positions[v.id]);
  const withdraw = useStore((s) => s.withdraw);
  const pushToast = useStore((s) => s.pushToast);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<m.WithdrawMode>('usdc');
  const [busy, setBusy] = useState(false);

  const total = m.positionTdlp(position);
  const amt = Number(amount) || 0;
  const preview = amt > 0 ? m.withdrawPreview(v, amt, mode, TOKEN_PRICES) : null;
  const insufficient = connected && amt > total + 1e-9;
  const touchesStaked = !!position && amt > position.unstaked + 1e-9;

  const submit = async () => {
    if (!connected) return connect();
    if (!preview) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    withdraw({ vaultId: v.id, preview });
    setBusy(false);
    setAmount('');
    pushToast({
      title: `Withdrew ${fmtToken(amt, 1)} ${v.receiptSymbol}`,
      detail: `Received ${preview.outputs.map((o) => `${fmtToken(o.amount)} ${o.token}`).join(' + ')}`,
    });
  };

  if (connected && total <= 0) {
    return <div className="text-sm text-ink-3 py-6 text-center">No {v.receiptSymbol} to withdraw yet. Deposit first.</div>;
  }

  return (
    <div className="space-y-4">
      <AmountInput
        value={amount}
        onChange={setAmount}
        token={v.receiptSymbol}
        balance={connected ? total : undefined}
        balanceLabel="Your tdLP"
        onMax={connected ? () => setAmount(String(total)) : undefined}
        error={insufficient ? 'Insufficient balance' : null}
        hint={amt > 0 ? `≈ ${fmtUsd(amt * v.pricePerShare, { compact: false, cents: true })}` : undefined}
      />
      <div>
        <div className="text-xs text-ink-3 mb-1.5">Receive as</div>
        <div className="flex gap-1.5">
          {(
            [
              { k: 'usdc', label: 'USDC only' },
              { k: 'both', label: 'Both tokens' },
            ] as Array<{ k: m.WithdrawMode; label: string }>
          ).map((o) => (
            <button
              key={o.k}
              onClick={() => setMode(o.k)}
              className={cx('h-7 px-2.5 rounded border text-xs font-medium transition-colors', mode === o.k ? 'border-aqua text-ink bg-aqua/10' : 'border-line text-ink-2 hover:border-line-2')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {preview && (
        <div className="rounded border border-line bg-base p-3 text-xs num space-y-1.5 animate-fade-in">
          <div className="text-ink-3 font-medium">Withdrawal preview</div>
          <Line k="Redeem" v={`${fmtToken(preview.tdlp, 1)} ${v.receiptSymbol} · ${fmtUsd(preview.grossUsd, { compact: false, cents: true })}`} />
          <Line k={`Withdrawal fee ${fmtPct(CONSTANTS.WITHDRAWAL_FEE)}`} v={`-${fmtUsd(preview.feeUsd, { compact: false, cents: true })}`} />
          <div className="text-ink-3">Fee stays in the vault for remaining LPs.</div>
          <div className="border-t border-line my-1" />
          <div className="flex justify-between items-baseline">
            <span className="text-ink-2">You receive</span>
            <span className="text-ink font-semibold text-sm text-right">
              {preview.outputs.map((o) => (
                <div key={o.token}>{fmtToken(o.amount)} {o.token}</div>
              ))}
            </span>
          </div>
        </div>
      )}
      {touchesStaked && preview && <div className="text-xs text-ink-3">Part of this amount is staked. We'll unstake and withdraw in one transaction.</div>}
      <Button block size="lg" variant="secondary" onClick={submit} disabled={connected && (!preview || insufficient)} loading={busy}>
        {busy ? 'Confirming…' : !connected ? 'Connect wallet' : touchesStaked ? 'Unstake & withdraw' : 'Withdraw'}
      </Button>
    </div>
  );
}

// ───────────────────────── Position summary ─────────────────────────

function PositionSummary({ vault: v }: { vault: Vault }) {
  const connected = useStore((s) => s.connected);
  const position = useStore((s) => s.user.positions[v.id]);
  const stakeAll = useStore((s) => s.stakeAll);
  const pushToast = useStore((s) => s.pushToast);
  const { breakdown: b, showBoost } = useVaultApr(v);
  const [busy, setBusy] = useState(false);
  if (!connected || !position) return null;
  const total = m.positionTdlp(position);
  const value = m.positionValue(position, v);
  const apr = showBoost ? b.yourApr : b.totalApr;
  const onStake = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, TX_DELAY));
    stakeAll(v.id);
    setBusy(false);
    pushToast({ title: `Staked ${fmtToken(position.unstaked, 1)} ${v.receiptSymbol}`, detail: 'Now mining TIDE', tone: 'tide' });
  };
  return (
    <div className="border-t border-line p-4 text-sm num animate-fade-in">
      <div className="text-xs text-ink-3 mb-2">Your position</div>
      <div className="flex items-baseline justify-between">
        <span className="text-ink font-semibold">{fmtToken(total, 1)} {v.receiptSymbol}</span>
        <span className="text-ink">{fmtUsd(value, { compact: false, cents: true })}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-ink-3">
          {position.staked > 0 && <span className="text-tide">{fmtToken(position.staked, 1)} staked</span>}
          {position.staked > 0 && position.unstaked > 0 && ' · '}
          {position.unstaked > 0 && <span>{fmtToken(position.unstaked, 1)} unstaked</span>}
        </span>
        <span className="text-ink-2">Your APR {fmtPct(apr)}</span>
      </div>
      {position.unstaked > 0 && (
        <Button size="sm" variant="tide" className="mt-3" block onClick={onStake} loading={busy}>
          Stake {fmtToken(position.unstaked, 1)} {v.receiptSymbol} to earn TIDE
        </Button>
      )}
    </div>
  );
}

function Line({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-2">{k}</span>
      <span className={tone ?? 'text-ink'}>{v}</span>
    </div>
  );
}
