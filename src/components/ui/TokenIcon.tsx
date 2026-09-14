import { TOKEN_COLORS } from '@/data/vaults';
import { cx } from '@/lib/format';

export function TokenIcon({ symbol, size = 22, className }: { symbol: string; size?: number; className?: string }) {
  const color = TOKEN_COLORS[symbol] ?? '#6B7690';
  const letter = symbol.replace(/x$/, '').slice(0, 1);
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full font-display font-semibold text-white shrink-0', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.48, boxShadow: '0 0 0 2px #161E2E' }}
      title={symbol}
    >
      {letter}
    </span>
  );
}

export function TokenPair({ a, b, size = 22 }: { a: string; b: string; size?: number }) {
  return (
    <span className="inline-flex items-center" style={{ width: size * 1.7 }}>
      <TokenIcon symbol={a} size={size} className="relative z-10" />
      <TokenIcon symbol={b} size={size} className="-ml-2" />
    </span>
  );
}
