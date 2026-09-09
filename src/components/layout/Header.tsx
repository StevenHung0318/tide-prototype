import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MarketBadge } from './MarketBadge';
import { WalletButton } from './WalletButton';
import { useStore } from '@/store/useStore';
import { cx } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Markets' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/rewards', label: 'Rewards' },
  { to: '/flywheel', label: 'Flywheel' },
];

export function Header() {
  const reset = useStore((s) => s.reset);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const clicks = useRef<number[]>([]);

  // Hidden demo reset: 5 clicks on the logo within 2.5s.
  const onLogo = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 2500), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      reset();
      pushToast({ title: 'Demo state reset', detail: 'Wallet disconnected, positions restored to defaults.', tone: 'amber' });
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-base/90 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 h-14 flex items-center gap-6">
        <button onClick={onLogo} className="flex items-center gap-2 select-none" aria-label="Tide">
          <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
            <rect width="32" height="32" rx="6" fill="#161E2E" />
            <path d="M4 20c3 0 4-3 7-3s4 3 7 3 4-3 7-3 3 3 3 3" fill="none" stroke="#39D0C4" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 13c3 0 4-3 7-3s4 3 7 3 4-3 7-3 3 3 3 3" fill="none" stroke="#39D0C4" strokeWidth="2.5" strokeLinecap="round" opacity=".45" />
          </svg>
          <span className="display text-lg font-semibold tracking-tight">Tide</span>
        </button>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cx('h-8 px-3 rounded text-sm font-medium inline-flex items-center transition-colors', isActive ? 'text-ink bg-panel-2' : 'text-ink-3 hover:text-ink-2')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <MarketBadge />
          <span className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-line text-xs text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-up" />
            Robinhood Chain
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
