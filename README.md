# EMD × 睡眠：把腦波拆回它自己的節奏

互動式網站，說明黃鍔院士的經驗模態分解（Empirical Mode Decomposition, EMD）與 Hilbert–Huang 轉換如何應用在睡眠腦波研究，並以 PhysioNet 公開的整夜 PSG 資料在瀏覽器裡即時執行 EMD。

線上版：https://chiayumd15.github.io/emd-sleep/

## 目錄

| 路徑 | 內容 |
|---|---|
| `site/` | 靜態網站（純 HTML/CSS/JS，無建置步驟）。`js/dsp.js` 為瀏覽器端 EMD／EEMD／Hilbert 譜實作 |
| `site/data/*.json` | 由 `scripts/prepare_data.py` 從 Sleep-EDF 產生的 epoch、整夜特徵與邊際譜 |
| `scripts/prepare_data.py` | 離線分析：讀 EDF、選 epoch、逐 epoch EMD/HHT 特徵 |
| `scripts/xcheck_js.mjs`、`scripts/xcheck_py.py` | JS 與 Python 兩套 EMD 的交叉驗證 |
| `docs/literature.md` | 27 篇文獻整理，每篇均以 Crossref／PubMed 核對 DOI |
| `docs/validation.md` | 交叉驗證結果 |

## 重跑資料

1. 下載 PhysioNet Sleep-EDF Expanded 的 SC4001 一夜（Open Data Commons Attribution License v1.0）：
   ```bash
   mkdir -p data/raw && cd data/raw
   curl -O https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001E0-PSG.edf
   curl -O https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001EC-Hypnogram.edf
   ```
2. 產生網站資料並交叉驗證：
   ```bash
   pip install numpy scipy pyedflib
   python3 scripts/prepare_data.py
   node scripts/xcheck_js.mjs && python3 scripts/xcheck_py.py
   ```
3. 本機預覽：`cd site && python3 -m http.server 8765`，開 http://localhost:8765/

## 演算法參數

依 Huang et al. 1998（Proc R Soc Lond A 454:903–995）：SD 停止準則 < 0.2（eq. 5.5）、單一 IMF 最多篩 50 次、自然三次樣條包絡、兩端各鏡射 2 個極值（端點處理為實作選擇，原文未規定）。

## 資料來源

- Kemp B et al. IEEE-BME 47(9):1185–1194 (2000). doi:10.1109/10.867928
- Goldberger AL et al. Circulation 101(23):e215–e220 (2000). doi:10.1161/01.CIR.101.23.e215
- https://physionet.org/content/sleep-edfx/1.0.0/

以 Claude Code 協作完成，所有內容經人工核對。
