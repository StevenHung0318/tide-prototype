# Tide — prototype

LP auto-rebalance vaults on Robinhood Chain. Internal alignment + investor demo build.
Pure front-end with mock data — no wallet SDK, no RPC, no web3 packages.

```bash
npm i
npm run dev        # http://localhost:5173
npm test           # vitest: spec anchors + cross-page consistency
npm run build      # tsc + vite build
```

## Demo controls

| Control | How |
|---|---|
| Connect the demo wallet | Click **Connect wallet** (800 ms fake load) or open any URL with `?wallet=demo` |
| Reset demo state | Click the **Tide** logo 5 times within 2.5 s |
| Force US market status | `?market=closed` / `?market=open` / `?market=auto` (persists until changed) |
| Open the deposit modal on Explore | `/?deposit=tsla-usdc` |

State is persisted to `localStorage` under `tide-demo-v1`.

## Where things live

| Path | What |
|---|---|
| `docs/` | PRD, mock-data spec and the build brief (source of truth) |
| `src/lib/constants.ts` | Protocol constants (§1 of the mock-data spec) |
| `src/lib/math.ts` | **All** derived numbers: APR, boost, ranges, zap/withdraw previews, claim split |
| `src/lib/market.ts` | US market clock (America/New_York, weekdays 09:30–16:00 ET, holidays ignored) |
| `src/lib/series.ts` | Seeded NAV + emissions series |
| `src/data/` | Vaults, protocol figures, demo user |
| `src/store/useStore.ts` | zustand store (persisted) with deposit / withdraw / stake / claim / lock / unlock |
| `src/store/selectors.ts` | Derived hooks — one boost value feeds Markets, Vault, Portfolio and Rewards |
| `src/components/deposit/DepositCard.tsx` | The deposit / withdraw card (Explore modal and vault page) |
| `src/components/vault/PriceRange.tsx` | Price chart with the LP range band (lightweight-charts) |
| `src/test/` | Consistency checks against the spec anchors and after every action |

## Design tokens

Tailwind config is the token source: surfaces `deep` / `panel` / `line`, accent `aqua`, semantic `up` / `down` / `amber`,
token colour `tide`. Display type is Archivo, body and numerals are Inter with tabular figures on by default.
