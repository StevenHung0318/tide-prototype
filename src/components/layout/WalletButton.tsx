import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { DEMO_ADDRESS } from '@/lib/constants';
import { fmtToken, fmtUsd, shortAddress } from '@/lib/format';
import { CONSTANTS } from '@/lib/constants';
import { TokenIcon } from '@/components/ui/TokenIcon';

export function WalletButton() {
  const connected = useStore((s) => s.connected);
  const connecting = useStore((s) => s.connecting);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const balances = useStore((s) => s.user.balances);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!connected) {
    return (
      <Button size="sm" className="h-8" onClick={() => connect()} loading={connecting}>
        {connecting ? 'Connecting' : 'Connect wallet'}
      </Button>
    );
  }

  const tide = balances.TIDE ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2.5 rounded border border-line-2 bg-panel-2 text-xs num text-ink hover:border-ink-3 inline-flex items-center gap-2"
      >
        <span className="h-4 w-4 rounded-full bg-gradient-to-br from-aqua to-tide" />
        {shortAddress(DEMO_ADDRESS)}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-panel-2 border border-line-2 rounded-md shadow-pop p-3 animate-fade-in z-40">
          <div className="text-2xs text-ink-3 mb-2 num">{DEMO_ADDRESS.slice(0, 22)}…</div>
          <div className="divide-y divide-line text-sm">
            <Row token="TIDE" amount={tide} usd={tide * CONSTANTS.TIDE_PRICE} tide />
            <Row token="USDC" amount={balances.USDC ?? 0} usd={balances.USDC ?? 0} />
            <Row token="TSLAx" amount={balances.TSLAx ?? 0} usd={(balances.TSLAx ?? 0) * 425.8} />
          </div>
          <Button variant="secondary" size="sm" block className="mt-3" onClick={() => { disconnect(); setOpen(false); }}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ token, amount, usd, tide }: { token: string; amount: number; usd: number; tide?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="inline-flex items-center gap-2 text-ink-2">
        <TokenIcon symbol={token} size={18} />
        {token}
      </span>
      <span className="text-right">
        <span className={tide ? 'text-tide num font-medium' : 'num font-medium'}>{fmtToken(amount)}</span>
        <span className="block text-2xs text-ink-3 num">{fmtUsd(usd, { compact: false, cents: true })}</span>
      </span>
    </div>
  );
}
