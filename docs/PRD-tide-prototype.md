# PRD — Tide Prototype Web App

> 本文件是 prototype 的單一事實來源。資料數值與計算規則見 `MOCK-DATA-SPEC.md`。

## 0. 資訊架構與全域元素

### 路由

| 路由 | 頁面 |
|---|---|
| `/` | Markets（LP 市場列表，預設頁） |
| `/vault/:id` | Vault 詳情（含 deposit/withdraw 面板） |
| `/portfolio` | 我的倉位 |
| `/rewards` | Rewards / Claim center |
| `/flywheel` | $TIDE Flywheel 儀表板 |

### Header（全站固定）

- 左：Tide logo + 主導航（Markets / Portfolio / Rewards / Flywheel）
- 右依序：
  1. **US Market status badge**：依真實時間（America/New_York）計算。開盤（平日 9:30–16:00 ET）顯示 aqua 圓點 + `US market open`；休市顯示琥珀圓點 + `US market closed`；hover tooltip：`Core vaults widen ranges while the US market is closed to protect LPs from reopening gaps.`
  2. 網路標識：`Robinhood Chain`（純標籤）
  3. 假錢包按鈕：未連線 `Connect wallet`；點擊 800ms 假載入後變成 `0x7a3f…9d21`（點擊展開：TIDE 餘額、USDC 餘額、Disconnect）

### 全域慣例

- 金額顯示：`$1,234,567` / `$12.4M`（>1M 縮寫）；token 數量最多 4 位小數
- 所有 APR 保留 1 位小數；$TIDE 相關數字一律用代幣色 `#8B9CF7`
- 交易類操作（deposit/withdraw/stake/claim/lock）點擊確認後：按鈕轉 spinner 1.5 秒 → 成功 toast（文案與按鈕動詞一致，如 `Deposited 5,000 USDC`）→ 狀態全站更新

---

## 1. Markets 頁

### 1.1 頁首摘要列（不做 hero，直接進資訊）

一行四格數據：`Total TVL` / `24h fees earned` / `$TIDE price` / `Weekly emissions`（數值取自 mock data 的 protocol 物件）。

### 1.2 Vault 列表

以表格呈現（不是卡片牆——這是資管產品）。欄位：

| 欄 | 內容 |
|---|---|
| Pool | 代幣對 icon pair + 名稱（如 `TSLAx / USDC`）+ tier 徽章 |
| Tier | `Core`（aqua 描邊）/ `Turbo`（靛藍描邊）/ `Degen`（琥珀描邊 + ⚠ icon） |
| TVL | vault TVL |
| APR | **總 APR 大字** + 下方小字拆解 `x.x% fees + xx.x% TIDE`；hover 展開完整 breakdown popover（見 §3.3，同一元件） |
| Range status | `In range`（aqua 點）/ `Out of range`(紅點) / `Defensive`（琥珀點，僅 Core 在休市時段） |
| My deposit | 已連線且有倉位才顯示金額，否則 `—` |
| 行尾 | `Deposit` 按鈕 → 進入 vault 詳情並直接展開 deposit 面板 |

排序預設 TVL 降序；tier 可篩選。Degen tier 的列有極淡琥珀底色暗示風險差異。

### 1.3 空狀態 / 未連線

列表照常顯示（市場數據公開），僅 My deposit 欄為 `—`。

---

## 2. Vault 詳情頁

版面：左側 2/3 為資訊區，右側 1/3 為 Deposit/Withdraw 面板（sticky）。

### 2.1 頁首

代幣對 + tier 徽章 + range status + 四格數據：`TVL` / `Total APR` / `pricePerShare`（標註 `tdLP-TSLA price`）/ `Capacity`（`$4.2M / $10M` 進度條——體現分階段 TVL cap 的設計）。

### 2.2 Price Range 元件（全站視覺記憶點，重點設計）

水平軸為價格，需呈現：

- **當前 LP 區間**：一段填色帶（aqua 半透明），標註上下界價格
- **當前市價**：一條垂直線 + 價格標籤，在區間內為 aqua、脫離區間為紅
- **Reset 觸發帶**：區間外側兩段更淡的色帶，tooltip：`If price stays beyond this band for 30 min, the vault rebalances to a new range.`
- **Defensive 模式**（Core vault 且美股休市時）：區間帶自動變寬並轉為琥珀色調，元件上方顯示 `Defensive range — US market closed`，tooltip 解釋開盤 gap 保護邏輯
- 元件下方三個小數據：`Range width ±18%` / `Time in range (7d) 94%` / `Last rebalance 2d ago`

這個元件要能講故事：demo 時指著它就能解釋「自動管區間 + 休市感知」兩個核心賣點。

### 2.3 APR breakdown 卡（與 Markets hover popover 共用元件）

```
Total APR                    38.2%
─────────────────────────────────
Fee APR (7d avg)             14.2%
TIDE rewards APR             24.0%   ← 代幣色
  Your boost           ×1.25 → 30.0%   ← 已連線且有鎖倉才顯示此行
─────────────────────────────────
Your APR                     44.2%
```

- 未連線：只顯示到 base TIDE APR，附一行 `Lock TIDE to boost rewards up to 1.5x →`（連到 /rewards 的 boost 區）
- TIDE rewards APR 行的 tooltip：`Paid in TIDE. Claim 50% instantly or lock 60 days for the full amount.`

### 2.4 Performance chart

recharts 折線圖，兩條線：`tdLP price (pricePerShare)` vs `HODL 50/50 benchmark`，30 天 mock 序列。上方切換 `30D / 7D`。**這是「淨值透明」原則的落地**，Core vault 的 mock 數據要讓 tdLP 線小幅跑贏 benchmark（見 MOCK-DATA-SPEC）。

### 2.5 Strategy 卡

鍵值列表：`Strategy: Market-hours aware CLMM` / `Target range ±18%` / `Reset trigger: 30 min beyond band` / `Rebalances (30d): 4` / `Performance fee 10%` / `Withdrawal fee 0.1%`。下方一句說明文案：`Fees and rewards are harvested daily and compounded into the position.`

### 2.6 About tdLP 摺疊區

解釋 receipt token：`Your deposit mints tdLP-TSLA, a fungible token that appreciates as the vault earns. Transfer it, hold it, or stake it to mine TIDE. Withdraw anytime by redeeming tdLP.`

---

## 3. Deposit / Withdraw 面板（vault 詳情頁右側）

Tab 切換 `Deposit` / `Withdraw`。

### 3.1 Deposit（核心：one-click 單邊存入）

1. **資產選擇**：三個選項 chip — `USDC`（預設）/ `TSLAx` / `USDC + TSLAx`（雙邊）。前兩者即 zap 模式
2. 金額輸入 + `Max`（用假餘額）
3. **Zap 預覽區**（單邊模式時顯示，金額輸入後即時計算）：
   ```
   Auto-swap preview
   5,000 USDC
   → 2,500 USDC + 5.87 TSLAx   (swapped at $425.80)
   Price impact        0.08%
   Swap fee            ~$3.75
   ─────────────────────────
   You receive          4,982.1 tdLP-TSLA
   1 tdLP-TSLA = $1.0032
   ```
4. **`Stake to earn TIDE` toggle（預設開）**：說明文案 `Auto-stake your tdLP to start mining TIDE immediately.`
5. CTA：`Deposit USDC`（金額未填時 disabled）。確認 → 假載入 → toast `Deposited 5,000 USDC · Earning TIDE`
6. 成功後面板下方出現 `Your position` 摘要（tdLP 數量、價值、staked 狀態）

### 3.2 Withdraw

1. tdLP 數量輸入 + `Max`；顯示等值美元
2. 收取資產選擇：`USDC only`（zap out）/ `Both tokens`
3. 預覽：收到數量、`Withdrawal fee 0.1% (stays in the vault for remaining LPs)`
4. 若 tdLP 在 staked 狀態，CTA 自動處理：`Unstake & withdraw`（一鍵，不讓用戶跑兩步）
5. Toast：`Withdrew 2,000 tdLP-TSLA`

---

## 4. Portfolio 頁

未連線：置中空狀態 `Connect your wallet to see your positions` + connect 按鈕。

已連線：

### 4.1 摘要列

`Total value` / `Net PnL`（金額 + %，正綠負紅）/ `Pending TIDE`（代幣色，點擊跳 /rewards）/ `Your avg boost`

### 4.2 倉位表

每個有倉位的 vault 一列：Pool、tdLP balance（含 staked/unstaked 拆分小字）、Value、你的 APR（含 boost）、7d earnings、行尾 `Manage` → vault 詳情。

### 4.3 tdLP 說明列

表格下方一行輕量提示：`tdLP tokens are freely transferable. Staked tdLP keeps earning TIDE.`

---

## 5. Rewards / Claim center（tokenomics UX 的主場）

### 5.1 Pending rewards 卡（頁面最上方，最大視覺權重）

- 大字 pending TIDE 數量 + 等值美元
- **二選一 claim UI（本頁核心互動）**：兩個並排選項卡，選中態明顯：

  | Claim now | Lock 60 days |
  |---|---|
  | 大字 `612 TIDE`（= pending × 50%） | 大字 `1,224 TIDE`（= pending × 100%） |
  | `50% of your rewards` | `Full amount + a share of forfeits` |
  | 小字（紅調）：`You forfeit 612 TIDE to lockers` | 小字（綠調）：`+ redistribution pool share while locked` |

- 下方動態說明行（依選擇變化）：選 Lock 時顯示 `Unlocks Nov 8, 2026 · Locked TIDE also boosts your mining APR`
- CTA 文案隨選擇變化：`Claim 612 TIDE` / `Lock 1,224 TIDE for 60 days`
- 完成後進入對應列表並更新全站狀態（鎖倉會即時改變 boost → vault APR 聯動）

### 5.2 Active locks 列表

每筆鎖倉一列：數量、鎖入日、解鎖日、倒數進度條、累計分紅（`+38.2 TIDE from redistribution`）。已到期的顯示 `Unlock` 按鈕。

### 5.3 Boost 計算器

- 顯示當前：`Locked TIDE value $1,530` / `Your deposits $12,400` / `Ratio 12.3%` / **`Boost ×1.5`**（大字）
- 一條 slider 模擬「再鎖多少」：拖動時即時重算 boost 與右側預覽 `Your APR on TSLAx/USDC: 44.2% → 47.8%`
- 規則提示：`Boost scales up to ×1.5 when your locked TIDE is ≥10% of your deposit value.`

### 5.4 Redistribution pool 卡

`This week's pool: 48,200 TIDE`，來源拆解兩行：`From instant-claim forfeits: 31,400` / `From protocol buybacks: 16,800`，說明：`Distributed continuously to lockers, weighted by locked amount.`

---

## 6. Flywheel 儀表板（/flywheel）

目的：對投資人/團隊一頁講清楚 token 經濟的健康度。**這頁是誠實原則的展示窗，數據好壞都照實呈現。**

### 6.1 頂部四格

`TIDE price $0.042` / `Market cap (circ.) $3.1M` / `Lock rate 58%`（鎖倉選擇率）/ **`Buyback coverage 41%`**（本週回購 ÷ 本週排放市值；<60% 琥珀色、≥60% aqua——不粉飾）

### 6.2 Emissions vs Buybacks 圖

recharts 雙序列 bar chart，8 週：每週 `Emissions value`（代幣色）vs `Buybacks`（aqua）。副標：`Weekly emissions are announced 7 days ahead and scale with protocol revenue.`

### 6.3 Flywheel 圖解

一張簡潔的循環示意（SVG 或排版實現，不需動畫）：`Deposits → Fees → Buybacks + Emissions budget → Locker rewards + Boost demand → Deposits`。每個節點 hover 顯示一句解釋。

### 6.4 This week 卡

鍵值列表：`Emissions: 1,000,000 TIDE ($42,000)` / `Protocol revenue: $17,300` / `Buyback executed: $8,600` / `Next week's emissions: announced Friday`。

### 6.5 Token allocation

甜甜圈圖：Community mining 50% / Team 15% / Treasury 15% / POL & liquidity 10% / Marketing 5% / Advisors 5%。旁註 `No private sale. No public sale. Mining is the only way to earn TIDE.`

---

## 7. 各狀態總表

| 情境 | 行為 |
|---|---|
| 未連線 | 市場數據全開放；個人區顯示引導空狀態 |
| 連線後無倉位 | Portfolio/Rewards 顯示 `No positions yet` + `Explore markets` CTA |
| 輸入超過餘額 | CTA disabled + 紅字 `Insufficient balance` |
| Degen vault 首次 deposit | 攔一步確認 modal：`Degen vaults run narrow, high-frequency ranges on volatile pairs. Higher fees, higher impermanent loss risk. Net value can underperform holding.` + checkbox 確認 |
| 休市時段瀏覽 Core vault | Range 元件進入 defensive 視覺 + header badge 聯動 |
