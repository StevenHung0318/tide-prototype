# Tide Prototype — Claude Code 主指令

你是這個專案的前端工程師 + 產品設計師。請完整讀完本檔與同目錄的兩份文件後再動工：

1. `PRD-tide-prototype.md` — 頁面、流程、元件、狀態的完整規格（單一事實來源）
2. `MOCK-DATA-SPEC.md` — 資料模型、mock 數據與**全站數字一致性規則**（違反一致性規則視為 bug）

## 專案背景（一段話）

Tide 是 Robinhood Chain 上的 LP auto-rebalance vault 產品：散戶一鍵（單邊資產即可）存入 vault，vault 自動管理 Uniswap CLMM 倉位（rebalance / 複投 / 美股休市感知），存款憑證是 fungible receipt token（tdLP），質押 tdLP 可挖平台幣 $TIDE。$TIDE 有「即領 50% / 鎖 60 天領 100%」的 claim 機制、鎖倉挖礦 boost、協議收入回購注入鎖倉分紅池。這個 prototype 的用途是**內部團隊對齊 + 投資人/生態夥伴 demo**，不接真鏈。

## 目標與範圍

- 產出一個可 `npm i && npm run dev` 直接跑起來的 SPA prototype
- **純前端 + mock data**：不接錢包 SDK、不接 RPC、不引入任何 web3 套件。「Connect Wallet」是假的（點擊後進入已連線狀態，顯示假地址 `0x7a3f…9d21`）
- 所有互動（存款、提款、質押、claim、鎖倉）都要**真的改動本地狀態**並在全站反映（portfolio、rewards、餘額同步更新），這樣 demo 才有說服力
- 狀態用 zustand 管理，persist 到 localStorage（加一個 header 內隱藏的 reset 入口：點 logo 5 次重置 demo 狀態）

## 技術棧（固定，不要替換）

- Vite + React 18 + TypeScript
- Tailwind CSS
- zustand（含 persist middleware）
- recharts（圖表）
- react-router-dom（路由）
- 不用元件庫（shadcn 等都不要）；元件自建，維持設計一致性

## 設計方向（刻意的選擇，請遵守）

**基調**：專業資管產品的骨架 × 新鏈 degen 的能量。參考感受是「Bloomberg terminal 的資訊密度 + 現代 DeFi 的清爽」，不是 meme casino。

- **色彩（dark theme only）**：
  - 底色 `#0E1420`（深墨藍，不是純黑）；面板 `#161E2E`；邊框 `#232E44`
  - 主 accent `#39D0C4`（水色/aqua — Water Labs 水系品牌延伸），用於主 CTA、in-range 狀態、品牌元素
  - 輔助語意色：正向/收益 `#4ADE80`、負向 `#F87171`、警示/休市狀態 `#F5B14C`（琥珀）
  - $TIDE 代幣專屬色 `#8B9CF7`（淡靛藍）— 所有挖礦/代幣相關數字用這個色，讓「哪些收益是幣本位」一眼可辨
- **字體**：display/標題用 `Archivo`（Google Fonts，緊湊有技術感），內文與所有數字用 `Inter`。**所有數字必須開 tabular figures（`font-variant-numeric: tabular-nums`）**——這是金融產品的基本盤，表格數字才會對齊
- **禁止**清單：不要 all-caps 小標籤、不要每個卡片都同樣圓角同樣陰影的 SaaS 套件感、不要進場動畫滿天飛（動效只用在回應用戶操作：展開、確認、數字滾動）、不要漸層裝飾
- **一個記憶點**：Vault 詳情頁的 Price Range 視覺化（PRD §3.2）是全站最重要的自訂元件，把設計火力集中在這裡，其他地方保持克制
- 響應式做到 tablet 即可（demo 場景是筆電投影），mobile 不強求完美但不能爆版

## UI 文案

介面文案一律**英文**（這是對外 demo 的加密產品），語氣直白、sentence case、動詞明確（按鈕寫 "Deposit USDC" 不寫 "Submit"）。PRD 內已提供關鍵文案，未提供的由你按同樣語氣補齊。

## 建置順序（依此順序 commit，每步可獨立驗收）

1. 專案腳手架 + 設計 token（Tailwind config）+ 全域 layout（header / nav / 假錢包 / US market status badge）
2. Mock data 層 + zustand store（先把 `MOCK-DATA-SPEC.md` 的資料與衍生計算函式全部實作並寫 unit-level 的一致性檢查）
3. Markets 頁
4. Vault 詳情頁（含 Price Range 元件、NAV chart、APR breakdown）
5. Deposit / Withdraw 流程（含 one-click zap 預覽）
6. Portfolio 頁
7. Rewards / Claim center（claim 二選一、鎖倉列表、boost 計算器）
8. Flywheel 儀表板
9. 全站走查：數字一致性核對（照 `MOCK-DATA-SPEC.md` 的 checklist 逐條驗）、空狀態、responsive

## 驗收標準（完成後自我檢查並回報）

- [ ] 未連線錢包時所有頁面可瀏覽，個人數據區顯示引導性空狀態
- [ ] 存入 → Markets/Portfolio/Rewards 三處的個人數據同步正確變化
- [ ] One-click deposit 預覽的 zap split、預估 tdLP、滑點顯示齊全且數學正確
- [ ] 每個 vault 的 APR breakdown 展開後：fee APR + TIDE APR ×（個人 boost）的加總 = 顯示的總 APR
- [ ] Claim 頁二選一的兩個結果數字正確（即領 = pending × 50%，鎖倉 = pending × 100%）
- [ ] Boost 計算器改變鎖倉量時，所有相關 vault 的「Your APR」即時聯動
- [ ] Price Range 元件正確反映 in-range / out-of-range / defensive（休市防禦）三種狀態
- [ ] US market status badge 依真實時間（America/New_York，平日 9:30–16:00 ET）顯示 Open/Closed，並與 Core vault 的 defensive 狀態聯動
- [ ] `npm run build` 無錯誤

開始前如對規格有疑問，先列出問題再動工；規格未覆蓋的細節，以「專業資管產品會怎麼做」為判斷基準自行決定並在完成回報中列出你做的決定。
