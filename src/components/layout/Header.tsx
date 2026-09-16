import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { WalletButton } from './WalletButton';
import { useStore } from '@/store/useStore';
import { cx } from '@/lib/format';

const NAV = [
  { to: '/', label: 'Earn' },
  { to: '/analytics', label: 'Analytics' },
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
      pushToast({ title: 'Demo reset', detail: 'Wallet disconnected. Positions restored to defaults.', tone: 'amber' });
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-deep/95 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 min-h-14 py-2 md:py-0 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button onClick={onLogo} className="flex items-center select-none py-2" aria-label="Poolmigo">
          <img src={`${import.meta.env.BASE_URL}brand/poolmigo-wordmark-dark.svg`} alt="Poolmigo" className="h-7 w-auto" draggable={false} />
        </button>
        <nav className="flex items-center gap-1 order-last w-full md:order-none md:w-auto overflow-x-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cx('h-9 px-3 rounded text-sm font-medium inline-flex items-center transition-colors', isActive ? 'text-ink bg-panel-2' : 'text-ink-2 hover:text-ink')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
