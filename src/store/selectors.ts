import { useEffect, useMemo, useState } from 'react';
import { useStore } from './useStore';
import { VAULTS, VAULT_BY_ID } from '@/data/vaults';
import * as m from '@/lib/math';
import { usMarketStatus, type MarketStatus } from '@/lib/market';
import type { Vault } from '@/lib/types';

/** Live US market status (re-evaluated every 30s), honouring the demo override. */
export function useMarketStatus(): MarketStatus {
  const override = useStore((s) => s.marketOverride);
  const [status, setStatus] = useState<MarketStatus>(() => usMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(usMarketStatus()), 30_000);
    return () => clearInterval(id);
  }, []);
  return override === 'auto' ? status : override;
}

export interface UserDerived {
  connected: boolean;
  depositsUsd: number;
  costBasis: number;
  pnlUsd: number;
  pnlPct: number;
  lockedTide: number;
  lockedUsd: number;
  ratio: number;
  boost: number;
  pendingTide: number;
  hasPositions: boolean;
}

/** Everything personal that depends on the boost ratio — one source of truth. */
export function useUserDerived(): UserDerived {
  const connected = useStore((s) => s.connected);
  const user = useStore((s) => s.user);
  return useMemo(() => {
    const depositsUsd = m.totalDepositsUsd(user.positions, VAULT_BY_ID);
    const costBasis = m.totalCostBasis(user.positions);
    const lockedTide = m.lockedTide(user.locks);
    const lockedUsd = m.lockedUsd(user.locks);
    const pnlUsd = depositsUsd - costBasis;
    return {
      connected,
      depositsUsd,
      costBasis,
      pnlUsd,
      pnlPct: costBasis > 0 ? pnlUsd / costBasis : 0,
      lockedTide,
      lockedUsd,
      ratio: m.boostRatio(lockedUsd, depositsUsd),
      boost: m.boost(lockedUsd, depositsUsd),
      pendingTide: user.pendingTide,
      hasPositions: Object.keys(user.positions).length > 0,
    };
  }, [connected, user]);
}

export function useVaultApr(v: Vault) {
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  const d = useUserDerived();
  const tvl = m.effectiveTvl(v, tvlDelta);
  const userBoost = d.connected ? d.boost : 1;
  return { tvl, breakdown: m.aprBreakdown(v, tvl, userBoost), showBoost: d.connected && d.lockedTide > 0 && d.hasPositions };
}

export function useVaults() {
  const tvlDelta = useStore((s) => s.user.tvlDelta);
  return useMemo(() => VAULTS.map((v) => ({ vault: v, tvl: m.effectiveTvl(v, tvlDelta) })), [tvlDelta]);
}

/** Starts the 1s mining tick while connected. Mount once. */
export function usePendingTicker() {
  const connected = useStore((s) => s.connected);
  const tick = useStore((s) => s.tickPending);
  useEffect(() => {
    if (!connected) return;
    tick(Date.now());
    const id = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [connected, tick]);
}
