# MOCK-DATA-SPEC — Tide Prototype

> 目的：讓全站數字**互相一致、可被推導**。Demo 時最容易被戳破的就是 A 頁和 B 頁數字對不上。以下衍生規則必須以純函式實作（`src/lib/math.ts`），所有頁面共用同一套計算，不允許在元件裡各自硬編數字。

## 1. 全域常數

```ts
export const CONSTANTS = {
  TIDE_PRICE: 0.042,            // USD
  PERFORMANCE_FEE: 0.10,
  WITHDRAWAL_FEE: 0.001,
  INSTANT_CLAIM_RATIO: 0.5,     // 即領拿 50%
  LOCK_DAYS: 60,
  BOOST_MAX: 1.5,
  BOOST_FULL_RATIO: 0.10,       // 鎖倉價值 ≥ 存款 10% 時滿 boost
  WEEKLY_EMISSIONS_TIDE: 1_000_000,
};
```

## 2. Vault 清單（6 個）

| id | pair | tier | tvl | feeApr7d | 排放權重 | rangeWidthPct | pricePerShare | 備註 |
|---|---|---|---|---|---|---|---|---|
| tsla-usdc | TSLAx/USDC | Core | $4,200,000 | 14.2% | 30% | ±18% | 1.0032 | 預設示範 vault |
| nvda-usdc | NVDAx/USDC | Core | $3,100,000 | 12.8% | 25% | ±18% | 1.0041 | |
| hood-usdc | HOODx/USDC | Core | $1,800,000 | 19.5% | 15% | ±20% | 1.0018 | |
| tsla-nvda | TSLAx/NVDAx | Turbo | $950,000 | 26.4% | 12% | ±10% | 0.9987 | 輕微跑輸，展示誠實 |
| sui-tsla | SUI/TSLAx | Turbo | $720,000 | 31.0% | 10% | ±10% | 1.0105 | |
| dogtsla-usdc | DOGTSLA/USDC | Degen | $410,000 | 88.6% | 8% | ±5% | 0.9612 | meme×幣股;淨值明顯低於1,配合風險確認 |

- 現價與區間：每個 vault 定一個 `currentPrice` 與區間上下界，`tsla-usdc` 設定為 in-range（現價略偏上半區），`dogtsla-usdc` 設定為 out-of-range（展示紅色狀態）。TSLAx 現價用 $425.80。
- Capacity：Core 全部 cap $10M，Turbo $3M，Degen $1M。

## 3. 衍生計算規則（一致性核心）

```
週排放給某 vault 的 TIDE = WEEKLY_EMISSIONS_TIDE × 排放權重
TIDE APR (base) = (該 vault 週排放 × TIDE_PRICE × 52) / staked TVL
  → prototype 簡化:staked TVL = vault TVL × 0.85（假設 85% 已質押）

boost(locked$, deposit$) = 1 + 0.5 × min( (locked$/deposit$) / BOOST_FULL_RATIO, 1 )
  // 無鎖倉 = 1.0;鎖倉達存款10% = 1.5,線性內插

Your TIDE APR = base TIDE APR × boost
Total APR（未連線/無鎖倉顯示）= feeApr7d + base TIDE APR
Your APR = feeApr7d + Your TIDE APR
```

**驗算錨點**（實作後必須逐條核對，誤差只允許捨入）：
- tsla-usdc 週排放 = 300,000 TIDE = $12,600；staked TVL = $3.57M → base TIDE APR = 12,600×52/3,570,000 ≈ **18.4%**；Total APR ≈ 14.2 + 18.4 = **32.6%**
- 示範用戶（§5）在 tsla-usdc 的 boost = 1.5 → Your TIDE APR ≈ 27.5%，Your APR ≈ **41.7%**

## 4. Protocol / Flywheel 數據

```
本週排放: 1,000,000 TIDE = $42,000
上週協議收入: $17,300
本週已回購: $8,600  → Buyback coverage = 8,600 / 42,000 ≈ 20.5%
  → 顯示為琥珀色(<60%),Flywheel 頁如實呈現;8 週序列讓 coverage 從 ~8% 逐步爬到 20.5%(排放固定、收入隨 TVL 成長)
鎖倉選擇率 lock rate: 58%
Redistribution pool 本週: 48,200 TIDE(31,400 來自即領罰沒 + 16,800 來自回購)
  → 罰沒一致性:本週已 claim 的排放中選擇即領的部分 × 50% ≈ 31,400,數字對得上即可
流通市值: 已流通 ≈ 74M TIDE × $0.042 ≈ $3.1M
```

8 週 Emissions vs Buybacks 序列（bar chart 用）：emissions 每週 $38–42K 微幅波動；buybacks 從 $3.2K 平滑爬到 $8.6K。

## 5. 示範用戶狀態（連線錢包後的預設倉位）

讓 demo 一連線就有故事可講：

```
錢包餘額: 25,000 USDC / 8.2 TSLAx / 3,400 TIDE(未鎖)
既有倉位:
  tsla-usdc: 9,800 tdLP-TSLA(全部 staked),價值 ≈ $9,831
  sui-tsla:  2,540 tdLP-SUITSLA(staked),價值 ≈ $2,567
  → Total value ≈ $12,398;Net PnL 設 +$412(+3.4%)
Pending TIDE: 1,224(≈ $51.4)
Active locks: 一筆 36,500 TIDE,已鎖 22 天(剩 38 天),累計分紅 +38.2 TIDE
  → locked value ≈ $1,533;ratio = 1,533/12,398 ≈ 12.4% ≥ 10% → boost ×1.5
```

用戶操作後所有數字按 §3 規則重算——deposit 會改變 deposit$，進而可能拉低 boost ratio，這個聯動要真實發生（demo 亮點：存更多錢 → boost 稍降 → Rewards 頁提示可加鎖）。

## 6. 圖表序列

- **NAV chart（每 vault 30 天）**：`pricePerShare` 從 1.0 平滑走到表列現值；`HODL benchmark` 用相關但更波動的序列，Core vault 讓 tdLP 線小幅領先（+0.2~0.4%），tsla-nvda 與 dogtsla 讓 benchmark 領先（誠實展示）。序列可用 seeded 函式生成，重點是形狀可信：有波動、無鋸齒狀跳點。
- **價格顯示**：TSLAx $425.80 / NVDAx $118.40 / HOODx $52.10 / SUI $3.85 / DOGTSLA $0.00184 / USDC $1.00。

## 7. 一致性 checklist（建置最後逐條驗）

- [ ] Markets 列表 APR = Vault 詳情 Total APR = breakdown 加總
- [ ] Portfolio 各倉位價值 = tdLP 數量 × pricePerShare，加總 = Total value
- [ ] Rewards 頁 boost = Portfolio 摘要 avg boost = 各 vault Your APR 使用的 boost
- [ ] Claim 二選一:即領數 = pending × 0.5,鎖倉數 = pending × 1.0
- [ ] Flywheel coverage = 本週回購 ÷ 本週排放市值,與四格數據一致
- [ ] Redistribution pool 兩個來源加總 = pool 總數
- [ ] 任何 deposit/withdraw/lock 操作後,上述全部仍然成立
