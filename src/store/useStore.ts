import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Lock, TxKind, UserState } from '@/lib/types';
import { demoUserState, emptyUserState } from '@/data/demoUser';
import { VAULT_BY_ID } from '@/data/vaults';
import { CONSTANTS } from '@/lib/constants';
import * as m from '@/lib/math';
import type { ZapPreview, WithdrawPreview } from '@/lib/math';

export interface Toast {
  id: string;
  title: string;
  detail?: string;
  tone?: 'default' | 'tide' | 'up' | 'amber';
}

export type MarketOverride = 'auto' | 'open' | 'closed';

interface AppState {
  connected: boolean;
  connecting: boolean;
  initialized: boolean;
  user: UserState;
  /** Instant-claim forfeits added to this week's redistribution pool by the demo user. */
  forfeitsAdded: number;
  marketOverride: MarketOverride;
  toasts: Toast[];

  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  setMarketOverride: (o: MarketOverride) => void;

  deposit: (args: { vaultId: string; preview: ZapPreview; stake: boolean; spend: Array<{ token: string; amount: number }> }) => void;
  withdraw: (args: { vaultId: string; preview: WithdrawPreview }) => void;
  stakeAll: (vaultId: string) => void;
  claimInstant: () => number;
  claimLock: () => Lock | null;
  lockFromWallet: (amount: number) => Lock | null;
  unlock: (lockId: string) => void;
  acknowledgeDegen: () => void;
  tickPending: (now: number) => void;

  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const DAY = 86_400_000;

function record(user: UserState, kind: TxKind, label: string): UserState {
  return { ...user, history: [{ id: uid(), kind, at: Date.now(), label }, ...user.history].slice(0, 50) };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      connected: false,
      connecting: false,
      initialized: false,
      user: emptyUserState(),
      forfeitsAdded: 0,
      marketOverride: 'auto',
      toasts: [],

      connect: async () => {
        if (get().connected || get().connecting) return;
        set({ connecting: true });
        await new Promise((r) => setTimeout(r, 800));
        const s = get();
        set({
          connecting: false,
          connected: true,
          initialized: true,
          user: s.initialized ? { ...s.user, pendingUpdatedAt: Date.now() } : demoUserState(),
        });
      },

      disconnect: () => set({ connected: false }),

      reset: () => set({ connected: false, connecting: false, initialized: false, user: emptyUserState(), forfeitsAdded: 0, toasts: [] }),

      setMarketOverride: (o) => set({ marketOverride: o }),

      deposit: ({ vaultId, preview, stake, spend }) => {
        const v = VAULT_BY_ID[vaultId];
        if (!v) return;
        set((s) => {
          const balances = { ...s.user.balances };
          for (const sp of spend) balances[sp.token] = Math.max(0, (balances[sp.token] ?? 0) - sp.amount);
          const prev = s.user.positions[vaultId] ?? { staked: 0, unstaked: 0, costBasis: 0, depositedAt: Date.now() };
          const positions = {
            ...s.user.positions,
            [vaultId]: {
              ...prev,
              staked: prev.staked + (stake ? preview.tdlp : 0),
              unstaked: prev.unstaked + (stake ? 0 : preview.tdlp),
              costBasis: prev.costBasis + preview.inputUsd,
            },
          };
          const tvlDelta = { ...s.user.tvlDelta, [vaultId]: (s.user.tvlDelta[vaultId] ?? 0) + preview.netUsd };
          return { user: record({ ...s.user, balances, positions, tvlDelta }, 'deposit', `Deposited into ${v.token0}/${v.token1}`) };
        });
      },

      withdraw: ({ vaultId, preview }) => {
        const v = VAULT_BY_ID[vaultId];
        if (!v) return;
        set((s) => {
          const p = s.user.positions[vaultId];
          if (!p) return {};
          const total = p.staked + p.unstaked;
          const amt = Math.min(preview.tdlp, total);
          // unstaked first, then staked (one-click "Unstake & withdraw")
          const fromUnstaked = Math.min(p.unstaked, amt);
          const fromStaked = amt - fromUnstaked;
          const remaining = total - amt;
          const positions = { ...s.user.positions };
          if (remaining <= 1e-9) delete positions[vaultId];
          else {
            positions[vaultId] = {
              ...p,
              unstaked: p.unstaked - fromUnstaked,
              staked: p.staked - fromStaked,
              costBasis: p.costBasis * (remaining / total),
            };
          }
          const balances = { ...s.user.balances };
          for (const o of preview.outputs) balances[o.token] = (balances[o.token] ?? 0) + o.amount;
          // Withdrawal fee stays in the vault for remaining LPs.
          const tvlDelta = { ...s.user.tvlDelta, [vaultId]: (s.user.tvlDelta[vaultId] ?? 0) - preview.netUsd };
          return { user: record({ ...s.user, balances, positions, tvlDelta }, 'withdraw', `Withdrew ${v.receiptSymbol}`) };
        });
      },

      stakeAll: (vaultId) =>
        set((s) => {
          const p = s.user.positions[vaultId];
          if (!p || p.unstaked <= 0) return {};
          return {
            user: record(
              { ...s.user, positions: { ...s.user.positions, [vaultId]: { ...p, staked: p.staked + p.unstaked, unstaked: 0 } } },
              'stake',
              `Staked ${VAULT_BY_ID[vaultId]?.receiptSymbol ?? 'tdLP'}`,
            ),
          };
        }),

      claimInstant: () => {
        const s = get();
        const split = m.claimSplit(s.user.pendingTide);
        if (split.instant <= 0) return 0;
        set({
          forfeitsAdded: s.forfeitsAdded + split.forfeited,
          user: record(
            {
              ...s.user,
              pendingTide: 0,
              pendingUpdatedAt: Date.now(),
              balances: { ...s.user.balances, TIDE: (s.user.balances.TIDE ?? 0) + split.instant },
            },
            'claim',
            `Claimed ${Math.round(split.instant)} TIDE`,
          ),
        });
        return split.instant;
      },

      claimLock: () => {
        const s = get();
        const amount = s.user.pendingTide;
        if (amount <= 0) return null;
        const now = Date.now();
        const lock: Lock = { id: uid(), amount, lockedAt: now, unlockAt: now + CONSTANTS.LOCK_DAYS * DAY, redistributionEarned: 0 };
        set({
          user: record({ ...s.user, pendingTide: 0, pendingUpdatedAt: now, locks: [lock, ...s.user.locks] }, 'lock', `Locked ${Math.round(amount)} TIDE`),
        });
        return lock;
      },

      lockFromWallet: (amount) => {
        const s = get();
        const bal = s.user.balances.TIDE ?? 0;
        const amt = Math.min(amount, bal);
        if (amt <= 0) return null;
        const now = Date.now();
        const lock: Lock = { id: uid(), amount: amt, lockedAt: now, unlockAt: now + CONSTANTS.LOCK_DAYS * DAY, redistributionEarned: 0 };
        set({
          user: record(
            { ...s.user, balances: { ...s.user.balances, TIDE: bal - amt }, locks: [lock, ...s.user.locks] },
            'lock',
            `Locked ${Math.round(amt)} TIDE`,
          ),
        });
        return lock;
      },

      unlock: (lockId) =>
        set((s) => {
          const l = s.user.locks.find((x) => x.id === lockId);
          if (!l) return {};
          return {
            user: record(
              {
                ...s.user,
                locks: s.user.locks.filter((x) => x.id !== lockId),
                balances: { ...s.user.balances, TIDE: (s.user.balances.TIDE ?? 0) + l.amount + l.redistributionEarned },
              },
              'unlock',
              `Unlocked ${Math.round(l.amount)} TIDE`,
            ),
          };
        }),

      acknowledgeDegen: () => set((s) => ({ user: { ...s.user, degenAcknowledged: true } })),

      /** Live mining accrual: pending TIDE grows at the user's boosted rate. */
      tickPending: (now) =>
        set((s) => {
          if (!s.connected) return {};
          const dt = Math.min(Math.max(0, (now - s.user.pendingUpdatedAt) / 1000), 3600); // cap catch-up to 1h
          const deposits = m.totalDepositsUsd(s.user.positions, VAULT_BY_ID);
          const b = m.boost(m.lockedUsd(s.user.locks), deposits);
          const rate = m.pendingAccrualPerSecond(s.user.positions, VAULT_BY_ID, s.user.tvlDelta, b);
          return { user: { ...s.user, pendingTide: s.user.pendingTide + rate * dt, pendingUpdatedAt: now } };
        }),

      pushToast: (t) => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'tide-demo-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        connected: s.connected,
        initialized: s.initialized,
        user: s.user,
        forfeitsAdded: s.forfeitsAdded,
        marketOverride: s.marketOverride,
      }),
    },
  ),
);
