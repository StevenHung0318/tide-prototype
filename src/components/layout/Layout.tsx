import { Outlet, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './Header';
import { ToastHost } from '@/components/ui/Toast';
import { usePendingTicker } from '@/store/selectors';
import { useStore } from '@/store/useStore';

export function Layout() {
  usePendingTicker();
  // Demo controls (URL params): ?market=open|closed|auto forces the US market status.
  const [params] = useSearchParams();
  const setOverride = useStore((s) => s.setMarketOverride);
  const connect = useStore((s) => s.connect);
  useEffect(() => {
    const m = params.get('market');
    if (m === 'open' || m === 'closed' || m === 'auto') setOverride(m);
    // Demo control: ?wallet=demo connects the demo wallet on load.
    if (params.get('wallet') === 'demo') void connect();
  }, [params, setOverride, connect]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1280px] px-4 md:px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6 h-12 flex items-center justify-between text-2xs text-ink-3">
          <span>Tide on Robinhood Chain · Prototype with mock data</span>
          <span>Water Labs</span>
        </div>
      </footer>
      <ToastHost />
    </div>
  );
}
