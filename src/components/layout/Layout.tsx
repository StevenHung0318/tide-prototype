import { Outlet, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './Header';
import { ToastHost } from '@/components/ui/Toast';
import { usePendingTicker } from '@/store/selectors';
import { useStore } from '@/store/useStore';

export function Layout() {
  usePendingTicker();
  // Demo control: ?market=open|closed|auto forces the US market status.
  const [params] = useSearchParams();
  const setOverride = useStore((s) => s.setMarketOverride);
  useEffect(() => {
    const m = params.get('market');
    if (m === 'open' || m === 'closed' || m === 'auto') setOverride(m);
  }, [params, setOverride]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1280px] px-4 md:px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 h-12 flex items-center justify-between text-2xs text-ink-3">
          <span>Tide · LP auto-rebalance vaults on Robinhood Chain · Prototype, mock data only</span>
          <span>Water Labs</span>
        </div>
      </footer>
      <ToastHost />
    </div>
  );
}
