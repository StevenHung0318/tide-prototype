# Poolmigo — prototype

Automated liquidity vaults for less manual LP management, on Robinhood Chain. Internal alignment + investor demo build.
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
| Reset demo state | Click the **Poolmigo** wordmark 5 times within 2.5 s |
| Force US market status | `?market=closed` / `?market=open` / `?market=auto` (persists until changed) |
| Open the deposit modal on Explore | `/?deposit=tsla-usdc` |
| Open the claim modal on Explore | `/?claim=1` |
| Force a theme | `?theme=dark` / `?theme=light` (persists; header toggle does the same) |

State is persisted to `localStorage` under `poolmigo-demo-v1`.

## Where things live

| Path | What |
|---|---|
| `docs/` | PRD, mock-data spec and the build brief (source of truth) |
| `src/lib/constants.ts` | Protocol constants (§1 of the mock-data spec) |
| `src/lib/math.ts` | **All** derived numbers: APR, ranges, zap/withdraw previews, claim split |
| `src/lib/market.ts` | US market clock (America/New_York, weekdays 09:30–16:00 ET, holidays ignored) |
| `src/lib/series.ts` | Seeded NAV + emissions series |
| `src/data/` | Vaults, protocol figures, demo user |
| `src/store/useStore.ts` | zustand store (persisted) with deposit / withdraw / stake / claim / lock / unlock |
| `src/store/selectors.ts` | Derived hooks shared by Explore, Vault and Rewards |
| `src/components/deposit/DepositCard.tsx` | The deposit / withdraw card (Explore modal and vault page) |
| `src/components/vault/PriceRange.tsx` | Price chart with the LP range band (lightweight-charts) |
| `src/test/` | Consistency checks against the spec anchors and after every action |

## Brand

Follows the Poolmigo brand kit v1.0 (`brand-tokens.json`). Tailwind token *names* were kept from the original build so
components did not need to change; only the values did:

| Token | Value | Role |
|---|---|---|
| `deep` | `#FFF8EF` cream | page background, inset fields |
| `panel` / `panel-2` | `#FFFFFF` / `#F6EFE4` | cards / hover surfaces |
| `line` / `line-2` | `#DDD9D1` / `#C9C3B9` | borders |
| `ink` / `ink-2` / `ink-3` | `#302823` / `#625D57` / `#8F8981` | text, muted, quiet labels |
| `aqua` | `#244742` deep teal | primary actions, in-range, APR |
| `up` / `down` / `amber` | `#28614F` / `#A33832` / `#8B5A13` | success / negative / warning |
| `apricot` / `glass` | `#F3A66E` / `#7BB8B2` | character colours (decorative; apricot + ink for secondary CTAs) |
| `tide` | `#9A5A22` | PMG-denominated numbers — apricot darkened for text contrast (not in the kit) |

Type is Rubik (400 / 500 / 700) via Google Fonts with tabular numerals. Cards use a 16 px radius, buttons a 12 px radius,
and every action target is at least 36 px tall (44 px for primary CTAs). Wordmark SVGs and mascot crops live in `public/brand/`;
the mascot appears only in empty states, never inside data tables.

## Design tokens

Tailwind config is the token source: surfaces `deep` / `panel` / `line`, accent `aqua`, semantic `up` / `down` / `amber`,
token colour `tide`. Display type is Archivo, body and numerals are Inter with tabular figures on by default.
