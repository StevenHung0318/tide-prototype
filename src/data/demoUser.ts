import type { UserState } from '@/lib/types';
import { VAULT_BY_ID } from './vaults';

const DAY = 86_400_000;

/**
 * Demo wallet state loaded on first connect — MOCK-DATA-SPEC §5.
 * Cost basis is set so total Net PnL = +$412 (+3.4%).
 */
export function demoUserState(now = Date.now()): UserState {
  const tsla = VAULT_BY_ID['tsla-usdc'];
  const sui = VAULT_BY_ID['sui-tsla'];
  const tslaValue = 9_800 * tsla.pricePerShare; // ≈ 9,831
  const suiValue = 2_540 * sui.pricePerShare; // ≈ 2,567
  const total = tslaValue + suiValue; // ≈ 12,398
  const pnl = 412;
  const costTotal = total - pnl;
  return {
    balances: { USDC: 25_000, TSLAx: 8.2, TIDE: 3_400 },
    positions: {
      'tsla-usdc': { staked: 9_800, unstaked: 0, costBasis: (costTotal * tslaValue) / total, depositedAt: now - 41 * DAY },
      'sui-tsla': { staked: 2_540, unstaked: 0, costBasis: (costTotal * suiValue) / total, depositedAt: now - 19 * DAY },
    },
    pendingTide: 1_224,
    pendingUpdatedAt: now,
    locks: [
      {
        id: 'lock-demo-1',
        amount: 36_500,
        lockedAt: now - 22 * DAY,
        unlockAt: now + 38 * DAY,
        redistributionEarned: 38.2,
      },
    ],
    tvlDelta: {},
    degenAcknowledged: false,
    history: [],
  };
}

export function emptyUserState(now = Date.now()): UserState {
  return {
    balances: { USDC: 0, TSLAx: 0, TIDE: 0 },
    positions: {},
    pendingTide: 0,
    pendingUpdatedAt: now,
    locks: [],
    tvlDelta: {},
    degenAcknowledged: false,
    history: [],
  };
}
