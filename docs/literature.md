# EMD / HHT 在睡眠研究上的應用:文獻整理

> 整理日期:2026-09-19
> 查證方式:每篇均以 Crossref / PubMed E-utilities / Europe PMC / OpenAlex / Semantic Scholar API 或期刊頁面確認標題、作者、年份與 DOI。摘要重點以原始摘要為準;若數字來自後續文獻轉述,會特別註明。
> 縮寫:EMD = Empirical Mode Decomposition;EEMD = Ensemble EMD;CEEMDAN = Complete EEMD with Adaptive Noise;HHT = Hilbert–Huang Transform;HHSA = Holo-Hilbert Spectral Analysis;IMF = Intrinsic Mode Function;OSA = 阻塞型睡眠呼吸中止;HRV = 心率變異;CAP = Cyclic Alternating Pattern。

---

## 一、方法奠基論文

### 1. Huang NE, Shen Z, Long SR, Wu MC, Shih HH, Zheng Q, Yen NC, Tung CC, Liu HH (1998)
- **標題**:The empirical mode decomposition and the Hilbert spectrum for nonlinear and non-stationary time series analysis
- **期刊**:Proceedings of the Royal Society of London. Series A, 454(1971): 903–995
- **DOI**:[10.1098/rspa.1998.0193](https://doi.org/10.1098/rspa.1998.0193)
- **重點**:EMD/HHT 的原始論文。提出「篩選(sifting)」程序,把任意訊號自適應地分解成有限個本徵模態函數(IMF),每個 IMF 都能做出有物理意義的 Hilbert 轉換,進而得到瞬時頻率與 Hilbert 譜。核心貢獻是讓「瞬時頻率」對非線性、非平穩訊號有意義,不必像傅立葉那樣靠一堆假諧波去湊出波形變形。

### 2. Wu Z, Huang NE (2009)
- **標題**:Ensemble empirical mode decomposition: a noise-assisted data analysis method
- **期刊**:Advances in Adaptive Data Analysis, 1(1): 1–41
- **DOI**:[10.1142/S1793536909000047](https://doi.org/10.1142/S1793536909000047)
- **重點**:針對 EMD 最大的痛點「模態混疊(mode mixing)」,提出 EEMD:在原訊號上反覆加入有限振幅的白噪音、各自做 EMD,再對各次結果取系集平均。白噪音把 EMD 的二元濾波器組(dyadic filter bank)特性「撐開」,使不同尺度的成分落在該去的 IMF;平均後噪音互相抵消。代價是計算量增加 N 倍(通常 N = 100–1000),且分解不再嚴格「完備」(IMF 相加不等於原訊號)。

### 3. Torres ME, Colominas MA, Schlotthauer G, Flandrin P (2011)
- **標題**:A complete ensemble empirical mode decomposition with adaptive noise
- **會議**:2011 IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP), Prague, pp. 4144–4147
- **DOI**:[10.1109/ICASSP.2011.5947265](https://doi.org/10.1109/ICASSP.2011.5947265)
- **重點**:CEEMDAN 改成「逐階加噪」:每分解一階 IMF,就對剩下的殘差加入該階對應的噪音 IMF 再求下一階,保證所有 IMF 相加等於原訊號(重建誤差為數值零)。相較 EEMD,模態的頻譜分離更乾淨、篩選次數更少、計算成本更低。之後幾乎所有睡眠分期的「EMD 特徵」論文都沿用 EEMD 或 CEEMDAN。

### 4. Huang NE, Hu K, Yang ACC, Chang HC, Jia D, Liang WK, Yeh JR, Kao CL, Juan CH, Peng CK, Meijer JH, Wang YH, Long SR, Wu Z (2016)
- **標題**:On Holo-Hilbert spectral analysis: a full informational spectral representation for nonlinear and non-stationary data
- **期刊**:Philosophical Transactions of the Royal Society A, 374(2065): 20150206
- **DOI**:[10.1098/rsta.2015.0206](https://doi.org/10.1098/rsta.2015.0206)
- **重點**:黃鍔院士與中央大學/陽明團隊(楊靜修、梁偉光、葉家榮、阮啟弘、彭仲康等)提出 HHSA:對第一層 EMD 得到的 IMF 再取其包絡(振幅調變)做第二層 EMD,把「頻率調變(FM)」與「振幅調變(AM)」分別展開成二維譜(載波頻率 × 調變頻率)。傳統加法式譜分析(傅立葉、小波、甚至一階 HHT)只能表示加法過程,HHSA 能同時涵蓋加法與乘法(調變)過程,是分析跨頻率耦合(如睡眠中慢波相位調變紡錘波振幅)的天然工具。

---

## 二、睡眠應用論文

### A. 自動睡眠分期(EEG)

### 5. Li Y, Fan Y, Gu L, Tong Q (2009)
- **標題**:Sleep stage classification based on EEG Hilbert-Huang transform
- **會議**:2009 4th IEEE Conference on Industrial Electronics and Applications (ICIEA), pp. 3676–3681
- **DOI**:[10.1109/ICIEA.2009.5138842](https://doi.org/10.1109/ICIEA.2009.5138842)
- **重點**:最早期把 HHT 用於睡眠分期的論文之一。將 EEG 做 HHT,以有物理意義的瞬時頻率建立各睡眠期的「能量–頻率分布」作為特徵,再以最近鄰分類。560 個 EEG 樣本平均準確率 81.7%,證明 HHT 特徵可作為睡眠分期依據。

### 6. Hassan AR, Bhuiyan MIH (2016)
- **標題**:Automatic sleep scoring using statistical features in the EMD domain and ensemble methods
- **期刊**:Biocybernetics and Biomedical Engineering, 36(1): 248–255
- **DOI**:[10.1016/j.bbe.2015.11.001](https://doi.org/10.1016/j.bbe.2015.11.001)
- **重點**:Hassan 系列的第一篇。單通道 EEG 每 30 秒 epoch 做 EMD,對各 IMF 取統計動差(均值、變異數、偏態、峰度等)作為特徵,以 AdaBoost 系集分類。比較 Naive Bayes、判別分析、神經網路、kNN、SVM、LS-SVM、Bagging、AdaBoost 等 10 種分類器,系集法明顯勝出。Sleep-EDF 六/五/四/三/二類分期準確率(AdaBoost)為 **88.62% / 90.11% / 91.20% / 93.55% / 97.73%**,且 S1 偵測率優於多數既有方法。注意:文中的 κ 指峰度(kurtosis),論文並未報告 Cohen's κ;之前轉述的「κ 約 0.82」在原文找不到,已移除。(全文於 2026-09-19 經校內訂閱讀取。)

### 7. Hassan AR, Bhuiyan MIH (2016)
- **標題**:Computer-aided sleep staging using Complete Ensemble Empirical Mode Decomposition with Adaptive Noise and bootstrap aggregating
- **期刊**:Biomedical Signal Processing and Control, 24: 1–10
- **DOI**:[10.1016/j.bspc.2015.09.002](https://doi.org/10.1016/j.bspc.2015.09.002)
- **重點**:把 EMD 換成 CEEMDAN(解決模態混疊、保證完備)、分類器換成 Bagging。特徵仍是 IMF 的高階統計動差。首次把 CEEMDAN 用於睡眠分期。Sleep-EDF 六/五/四/三/二類分期準確率(Bagging)為 **86.89% / 90.69% / 92.14% / 94.10% / 99.48%**,對 S1 與 REM 的偵測率特別高(全文於 2026-09-19 經校內訂閱讀取)。被引用超過 270 次,是「EMD 特徵 + 系集學習做睡眠分期」路線最常被拿來當 baseline 的論文。

### 8. Hassan AR, Bhuiyan MIH (2017)
- **標題**:Automated identification of sleep states from EEG signals by means of ensemble empirical mode decomposition and random under sampling boosting
- **期刊**:Computer Methods and Programs in Biomedicine, 140: 201–210
- **DOI**:[10.1016/j.cmpb.2016.12.015](https://doi.org/10.1016/j.cmpb.2016.12.015)
- **重點**:用 EEMD 分解單通道 EEG、取 IMF 統計動差,並以 RUSBoost 處理睡眠期類別極度不平衡(S1、REM 樣本少)的問題。Sleep-EDF 上六類到二類分期準確率分別為 88.07%、83.49%、92.66%、94.23%、98.15%,對 S1 與 REM 的偵測率明顯優於其他分類器。

### 9. Liu C, Tan B, Fu M, Li J, Wang J, Hou F, Yang A (2021)
- **標題**:Automatic sleep staging with a single-channel EEG based on ensemble empirical mode decomposition
- **期刊**:Physica A: Statistical Mechanics and its Applications, 567: 125685
- **DOI**:[10.1016/j.physa.2020.125685](https://doi.org/10.1016/j.physa.2020.125685)
- **重點**:通訊作者含楊靜修(Albert C. C. Yang,HHSA 論文共同作者)。以 EEMD 分解單通道 EEG,從原訊號與各 IMF 擷取統計、時域與非線性特徵,用 XGBoost 分類,並在三個資料庫做 5-fold 交叉驗證:Sleep-EDF 四類/五類準確率 93.1% / 91.9%,DREAMS 86.4% / 83.4%,SHHS 87.5% / 85.8%。結論指出前額葉(prefrontal)導極效果最佳,適合做成額頭式穿戴裝置。

### 10. Huang Z, Ling BWK (2022)
- **標題**:Sleeping stage classification based on joint quaternion valued singular spectrum analysis and ensemble empirical mode decomposition
- **期刊**:Biomedical Signal Processing and Control, 71: 103086
- **DOI**:[10.1016/j.bspc.2021.103086](https://doi.org/10.1016/j.bspc.2021.103086)
- **重點**:先以 FFT 把 EEG 切成各頻帶波,再同時以四元數奇異譜分析(QSSA)與 EEMD 去雜訊、選成分擷取特徵,用 Bagging 分類。在 Sleep-EDF 與 Sleep-EDF Expanded 共 16 份記錄上(R&K 與 AASM 兩套標準、2–6 類問題)準確率高於既有方法。示範了 EEMD 作為「去雜訊/成分選擇」而非只當特徵來源的用法。

### 11. Huang Z, Ling BWK (2022)
- **標題**:Joint ensemble empirical mode decomposition and tunable Q factor wavelet transform based sleep stage classifications
- **期刊**:Biomedical Signal Processing and Control, 77: 103760
- **DOI**:[10.1016/j.bspc.2022.103760](https://doi.org/10.1016/j.bspc.2022.103760)
- **重點**:單通道 EEG 先 EEMD,取前兩個 IMF,再連同原訊號一起做可調 Q 因子小波轉換(TQWT)擷取特徵。五類/六類準確率:Sleep-EDF 84.46% / 80.73%,DREAMS Subjects 82.50% / 79.51%,Sleep-EDF Expanded-20 93.25% / 92.06%。是 EMD 與小波「互補」而非「取代」的典型做法。

### 12. Guo D, Thomas RJ, Liu Y, Shea SA, Lu J, Peng CK (2022)
- **標題**:Slow wave synchronization and sleep state transitions
- **期刊**:Scientific Reports, 12
- **DOI**:[10.1038/s41598-022-11513-0](https://doi.org/10.1038/s41598-022-11513-0)
- **重點**:彭仲康(Chung-Kang Peng)團隊。提出「叢集同步(cluster synchronization)」模型解釋慢波睡眠的湧現,並以 EMD 量化 EEG 慢波活動作為模型的定量證據;主張 NREM 本質上是「SWS / 非 SWS」的雙穩態過程,而非 R&K 式的 N1/N2/N3 三段線性劃分,並據此開發自動 SWS 分類演算法。對「該不該用 AASM 分期當金標準」提供了物理學觀點。

### B. 睡眠紡錘波(sleep spindle)偵測

### 13. Yang Z, Yang L, Qi D (2007)
- **標題**:Detection of Spindles in Sleep EEGs Using a Novel Algorithm Based on the Hilbert-Huang Transform
- **出處**:Wavelet Analysis and Applications (Applied and Numerical Harmonic Analysis 系列, Birkhäuser), pp. 543–559
- **DOI**:[10.1007/978-3-7643-7778-6_40](https://doi.org/10.1007/978-3-7643-7778-6_40)
- **重點**:最早用 HHT 偵測紡錘波的工作之一。以 EMD 把睡眠 EEG 分解成 IMF,計算高時頻解析度的 Hilbert 譜,在譜上定位 11–16 Hz 短暫爆發的紡錘波。摘要僅稱「偵測結果令人鼓舞」,未給出具體數字,屬概念驗證性質。

### 14. Causa L, Held CM, Causa J, Estévez PA, Perez CA, Chamorro R, Garrido M, Algarín C, Peirano P (2010)
- **標題**:Automated Sleep-Spindle Detection in Healthy Children Polysomnograms
- **期刊**:IEEE Transactions on Biomedical Engineering, 57(9): 2135–2146
- **DOI**:[10.1109/TBME.2010.2052924](https://doi.org/10.1109/TBME.2010.2052924)
- **重點**:結合 EMD、HHT 瞬時頻率/振幅與模糊邏輯,偵測並描述紡錘波特徵。用 56 份兒童整夜 PSG(27 訓練、10 驗證、19 測試)。全測試集敏感度 88.2%、特異度 89.7%、假陽性率 11.9%;僅看 N2 期則敏感度 92.2%、特異度 90.1%、假陽性率 8.9%,且不需要事先給定 hypnogram。

### 15. Liu MY, Huang A, Huang NE (2017)
- **標題**:Evaluating and Improving Automatic Sleep Spindle Detection by Using Multi-Objective Evolutionary Algorithms
- **期刊**:Frontiers in Human Neuroscience, 11: 261
- **DOI**:[10.3389/fnhum.2017.00261](https://doi.org/10.3389/fnhum.2017.00261)
- **重點**:黃鍔院士與中央大學黃詠暉(Adam Huang)團隊。用多目標演化演算法在 Pareto 前緣上比較各紡錘波偵測器,避免單一參數組造成的不公平比較。評估兩種 HHT 偵測器:Causa 的 HHT 法(d5)與黃團隊的「滾球篩選(rolling-ball sifting)帶通 EMD」(d6),F1 約 0.62–0.70;把 HHT 偵測器與傅立葉法混合(d7、d8)可達 F1 0.73–0.74,已接近人類專家間的 F1 0.75,高於非專家的 0.67。

### 16. Li Y, Song K, Zhang Y, Karray F (2024)
- **標題**:Method and system for automated detection of sleep spindles using a single EEG channels based TEO and EMD
- **期刊**:Expert Systems with Applications, 249: 123661
- **DOI**:[10.1016/j.eswa.2024.123661](https://doi.org/10.1016/j.eswa.2024.123661)
- **重點**:2024 年最新的 EMD 紡錘波偵測論文(全文於 2026-09-19 經校內訂閱讀取)。指出機器學習法依賴大量標記、無法精確標出起訖,門檻法又受固定門檻限制;提出 TEO-EMD:單通道 EEG(Cz-A1 或 C3-A1)以 0.5–30 Hz 帶通後,先用 Teager 能量算子(TEO)抓振幅突變並抑制白噪音,再對訊號做 EMD、取第一個 IMF 的上下包絡設自適應上下門檻(k = 1.9、times = 9,由掃描決定),候選段限 0.5–3 秒。資料為 DREAMS 紡錘波資料庫(8 位受試者,Zenodo 2650142),以專家標記為金標準:**準確率 91.83% ± 1.1%、敏感度 83.38% ± 9.32%、特異度 94.12% ± 3.46%**;同一資料上 Mölle 法敏感度 62.23%、Martin 法 72.76%、小波法 44.61%、純 EMD 法 78.74%,加上 TEO 後提升到 83.38%。論文未報 F1。作者自承電極假影與門檻參數選擇仍是待解問題。

### C. 睡眠微結構與腦–心交互(台灣/黃鍔團隊)

### 17. Yeh JR, Peng CK, Lo MT, Yeh CH, Chen SC, Wang CY, Lee PL, Kang JH (2013)
- **標題**:Investigating the interaction between heart rate variability and sleep EEG using nonlinear algorithms
- **期刊**:Journal of Neuroscience Methods, 219(2): 233–239
- **DOI**:[10.1016/j.jneumeth.2013.08.008](https://doi.org/10.1016/j.jneumeth.2013.08.008)
- **重點**:中央大學(葉家榮、彭仲康、羅孟宗、葉建宏、李柏磊)與北醫(康峻宏)合作。對 19 位健康女性 PSG,用 HHT 加上「遮罩訊號(masking signal)」解決模態混疊,把睡眠 EEG 拆成慢波與快波兩個振盪,再以 DFA 量化 HRV 的短期碎形特性。結果:慢波振盪的頻率特徵是 NREM 睡眠深度的良好指標,振幅特徵則能區分 REM 與 NREM;HHT 振幅與 HRV DFA 指標的相關,比傳統頻譜分析得到的更顯著。

### 18. Yeh CH, Shi W (2018)
- **標題**:Identifying Phase-Amplitude Coupling in Cyclic Alternating Pattern using Masking Signals
- **期刊**:Scientific Reports, 8: 2649
- **DOI**:[10.1038/s41598-018-21013-9](https://doi.org/10.1038/s41598-018-21013-9)
- **重點**:葉建宏提出「遮罩相位–振幅耦合(masking PAC, MPAC)」:以加遮罩訊號的 EMD 取代帶通濾波,抽出 δ 相位與 α/低 β 振幅來量化 CAP 各 A 亞型的跨頻率耦合。結果 A1 耦合最強、A3 最弱;淺睡比深睡耦合更強(p < 0.0001),不同生理狀況/疾病之間亦有顯著差異(p < 0.0001)。提出 δ–α/低β MPAC 可作為睡眠微結構的生物標記。

### 19. Lin C, Lo MT, Guilleminault C (2017)
- **標題**:Exploring the Abnormal Modulation of the Autonomic Systems during Nasal Flow Limitation in Upper Airway Resistance Syndrome by Hilbert–Huang Transform
- **期刊**:Frontiers in Medicine, 4: 161
- **DOI**:[10.3389/fmed.2017.00161](https://doi.org/10.3389/fmed.2017.00161)
- **重點**:羅孟宗與史丹佛 Guilleminault 合作。以 HHT 做「逐口呼吸(breath-by-breath)」解析度的 HRV(RR_HF、RR_LF、LF/HF)與 PPG 呼吸相關振盪分析,對 49 位上呼吸道阻力症候群(UARS)患者與 9 位對照,依食道壓與鼻氣流把每次呼吸分成四類。UARS 患者 N2 期副交感指標偏高(RR_HF 27.8 ± 18.2 vs 22.5 ± 11.12, p < 0.05);氣流受限且呼吸努力增加時副交感活性上升、LF/HF 下降(1.66 ± 0.80 vs 正常呼吸 1.93 ± 0.97, p < 0.05)。傳統 5 分鐘視窗的 FFT HRV 完全做不到這種時間解析度。

### D. 睡眠呼吸中止(OSA):ECG / HRV / 血氧 / 呼吸

### 20. Salisbury JI, Sun Y (2007)
- **標題**:Rapid screening test for sleep apnea using a nonlinear and nonstationary signal processing technique
- **期刊**:Medical Engineering & Physics, 29(3): 336–343
- **DOI**:[10.1016/j.medengphy.2006.05.013](https://doi.org/10.1016/j.medengphy.2006.05.013)
- **重點**:假設 OSA 可從白天短時間鼻壓訊號篩出。以 HHT 取前兩個 IMF,發現正常人的 Hilbert 譜集中在 1.5 Hz,OSA 風險越高譜越往高頻偏移,據此計算「呼吸中止百分比」。兩組資料:18 人(3 位 OSA)敏感度/特異度 100%/100%;16 位接受 PSG 者 85.7%/100%。

### 21. Mendez MO, Corthout J, Van Huffel S, Matteucci M, Penzel T, Cerutti S, Bianchi AM (2010)
- **標題**:Automatic screening of obstructive sleep apnea from the ECG based on empirical mode decomposition and wavelet analysis
- **期刊**:Physiological Measurement, 31(3): 273–289
- **DOI**:[10.1088/0967-3334/31/3/001](https://doi.org/10.1088/0967-3334/31/3/001)
- **重點**:直接比較 EMD 與小波在單導 ECG(RR 間期 + QRS 面積)OSA 篩檢上的表現,50 份記錄。逐分鐘分類準確率:小波 89%、EMD 85%,兩者合併 89%(顯示部分互補);在「病人 vs 健康人」層級兩法都達 100%。是少數正面對決 EMD vs 小波的睡眠論文。

### 22. Liu D, Yang X, Wang G, Ma J, Liu Y, Peng CK, Zhang J, Fang J (2012)
- **標題**:HHT based cardiopulmonary coupling analysis for sleep apnea detection
- **期刊**:Sleep Medicine, 13(5): 503–509
- **DOI**:[10.1016/j.sleep.2011.10.035](https://doi.org/10.1016/j.sleep.2011.10.035)
- **重點**:把 Thomas/Peng 的心肺耦合(CPC)技術從傅立葉改成 HHT:以 EMD 對 HRV 與 ECG 導出呼吸(EDR)做多解析度分解,時間/頻率解析度由原法提升到 8 秒 / 0.001 Hz。69 份 ECG 上,區分呼吸事件的 ROC AUC 0.79;主頻的時間變異度(TVDF)在不同 OSAHS 嚴重度組間有顯著差異(p < 0.001),且與 AHI 呈強負相關(r = −0.71)。

### 23. Schlotthauer G, Di Persia LE, Larrateguy LD, Milone DH (2014)
- **標題**:Screening of obstructive sleep apnea with empirical mode decomposition of pulse oximetry
- **期刊**:Medical Engineering & Physics, 36(8): 1074–1080
- **DOI**:[10.1016/j.medengphy.2014.05.008](https://doi.org/10.1016/j.medengphy.2014.05.008)
- **重點**:第一作者即 CEEMDAN 的共同提出者。對整夜 SpO2 做 EMD,血氧下降(desaturation)在特定 IMF 上呈現非常特定的波形,用簡單門檻與規則即可偵測,建構氧氣飽和度下降指數(ODI)。OSAHS 篩檢敏感度 0.838、特異度 0.855,優於標準的血氧下降偵測法。

### 24. Hassan AR, Haque MA (2016)
- **標題**:Computer-aided obstructive sleep apnea identification using statistical features in the EMD domain and extreme learning machine
- **期刊**:Biomedical Physics & Engineering Express, 2(3): 035003
- **DOI**:[10.1088/2057-1976/2/3/035003](https://doi.org/10.1088/2057-1976/2/3/035003)
- **重點**:把 Hassan 睡眠分期的 EMD 統計動差特徵套用到單導 ECG 的 OSA 逐分鐘辨識,分類器改用極限學習機(ELM),動機是穿戴式裝置只能用最少導程。資料為 PhysioNet apnea-ecg 35 位受試者(AHI 0–93.5),每 1 分鐘一段、100 Hz;取前 7 個 IMF 的均值、變異數、偏態、峰度共 28 個特徵,以 Kruskal–Wallis 檢定篩選後用 ELM(sigmoid、1189 個隱藏神經元)分類,隨機半分訓練/測試重複 20 次取平均。**準確率 83.77%、敏感度 85.20%、特異度 82.79%**、PPV 85.36%、NPV 81.22%;由逐分鐘結果估算 AHI 與專家標記的 Pearson r = 0.9987、平均絕對誤差 2.0。比較的 9 種分類器中 ELM 最高(AdaBoost 80.07%、Bagging 79.82%)。(全文於 2026-09-19 經校內訂閱讀取。)

### 25. Tripathy RK, Gajbhiye P, Acharya UR (2020)
- **標題**:Automated sleep apnea detection from cardio-pulmonary signal using bivariate fast and adaptive EMD coupled with cross time–frequency analysis
- **期刊**:Computers in Biology and Medicine, 120: 103769
- **DOI**:[10.1016/j.compbiomed.2020.103769](https://doi.org/10.1016/j.compbiomed.2020.103769)
- **重點**:從 ECG 導出心率與呼吸率兩條訊號,用「雙變量快速自適應 EMD(bivariate FA-EMD)」同步分解成成對 IMF,再以 Stockwell 轉換做跨時頻分析擷取特徵,SVM/隨機森林分類。10-fold 交叉驗證敏感度 82.27%、特異度 78.67%;跨受試者(subject-specific)驗證則降到 73.19% / 73.13%,誠實呈現了跨人泛化的落差。

### 26. Setiawan F, Lin CW (2022)
- **標題**:A Deep Learning Framework for Automatic Sleep Apnea Classification Based on Empirical Mode Decomposition Derived from Single-Lead Electrocardiogram
- **期刊**:Life (Basel), 12(10): 1509
- **DOI**:[10.3390/life12101509](https://doi.org/10.3390/life12101509)
- **重點**:成功大學林哲偉團隊。單導 ECG 先 EMD 產生 IMF 特徵,經鄰域成分分析(NCA)選特徵、SMOTE 處理不平衡,再分別以 1D/2D CNN 分類。PhysioNet Apnea-ECG 33 位受試者(平均 AHI 30.23/h;9,160 正常 + 6,019 呼吸中止片段):片段層級準確率 93.8%、敏感度 94.9%、特異度 92.7%(5-fold);受試者層級 LOSO 準確率 83.5%、敏感度 75.9%、特異度 88.7%。架構精簡,強調即時運算可行性。

### 27. Hu J, Yang L, Zhao X, Wei H, Zhao J, Li M (2025)
- **標題**:Application of spectral characteristics of electrocardiogram signals in sleep apnea
- **期刊**:Frontiers in Bioengineering and Biotechnology, 13: 1636011
- **DOI**:[10.3389/fbioe.2025.1636011](https://doi.org/10.3389/fbioe.2025.1636011)
- **重點**:以 EEMD 結合獨立成分分析(EEMD-ICA)去除單導 ECG 的低頻/高頻雜訊與基線飄移,再做時頻分析取頻譜特徵。PhysioNet Apnea-ECG 120 份記錄(60 OSA、60 對照,約 57,600 個一分鐘片段);重建訊號的最大瞬時頻率與 IMF7 特徵能量在 OSA 與正常組間差異顯著(p < 0.001)。隨機森林準確率 92.9%、敏感度 100%、特異度 86.6%,優於 SVM(87.5%)與 CNN(88.24%)。

---

## 三、主題脈絡總結

### 3.1 為什麼睡眠訊號天生是「非線性、非平穩」的
- **EEG**:整夜睡眠是一連串狀態切換(W → N1 → N2 → N3 → REM 反覆循環),每個狀態的主導節律不同(α → θ → 紡錘波/K 複合波 → δ 慢波),而且切換不是瞬間發生,還有 CAP 這種秒級的微結構起伏。紡錘波本身就是 0.5–2 秒、振幅先漲後消的「調變波包」,慢波則會調變紡錘波與快波的振幅(相位–振幅耦合)。這些都是乘法式(調變)而非加法式的過程,統計特性隨時間改變,也就是非平穩;波形不是正弦、頻率隨振幅改變,也就是非線性。
- **HRV**:睡眠中的自律神經是分期依賴的(NREM 副交感主導、REM 交感陣發),呼吸性竇性心律不整(RSA)又是心跳被呼吸「調變」的乘法過程;OSA 事件更是每 30–60 秒一次的心率減速–加速、血氧下降–回升的暫態,傳統 5 分鐘視窗 FFT 只能給一個平均值。
- **呼吸/血氧**:呼吸中止是間歇性、非週期性事件,鼻壓/胸腹帶/SpO2 都是事件驅動的暫態訊號,加上位移偽影,沒有平穩性可言。

### 3.2 EMD 相對傅立葉 / 小波的優勢
1. **自適應、無先驗基底**:傅立葉假設全域正弦、小波要選母小波與尺度;EMD 的「基底」(IMF)完全由資料本身的極值決定,不會把非正弦波形硬拆成一堆諧波。
2. **有意義的瞬時頻率**:IMF 滿足局部對稱條件,Hilbert 轉換後的瞬時頻率是逐點定義的,因此能做到「逐口呼吸」(Lin 2017)或「8 秒 / 0.001 Hz」(Liu 2012)這種傅立葉做不到的時頻解析度,不受測不準原理的視窗限制。
3. **對非平穩事件敏感**:呼吸中止造成的暫態會落在特定 IMF(Schlotthauer 2014 的 SpO2 desaturation 波形、Salisbury 2007 的 1.5 Hz 譜偏移),不需事先設計濾波器。
4. **自然的多尺度分解**:IMF 由高頻到低頻排列,對白噪音近似二元濾波器組,天然對應 EEG 的 β/σ/α/θ/δ 頻帶,所以 IMF 統計動差直接就能當睡眠分期特徵(Hassan 系列、Liu 2021)。

### 3.3 EMD 的限制
- **模態混疊(mode mixing)**:同一 IMF 內混入差異很大的尺度,或同一尺度被拆到不同 IMF;在間歇性訊號(紡錘波正是間歇的)上特別嚴重。這是 EEMD、CEEMDAN、遮罩訊號(Yeh 2013、Yeh & Shi 2018)、滾球篩選(Liu/Huang 2017)等改良的共同動機。
- **端點效應(end effect)**:三次樣條包絡在訊號兩端沒有極值可依附,會發散並向內污染;對 30 秒 epoch 這種短片段影響不小,實務上要加鏡像延拓或丟棄端點。
- **計算量**:EMD 本身是迭代篩選、無閉式解;EEMD 再乘上系集數(100–1000 次),CEEMDAN 雖然減少篩選次數但仍是 EMD 的數十至數百倍,整夜 PSG 多通道處理成本可觀。這也是為何 2020 年後有 FA-EMD(Tripathy 2020)、以及部分研究改用 VMD/同步壓縮等有數學基礎且較快的替代方法。
- **缺乏嚴格數學理論**:EMD 沒有唯一性與收斂性證明,結果依賴篩選停止準則與包絡插值法;IMF 的生理意義需要事後對應,不像頻帶有既定定義。
- **可重現性**:同一資料、不同實作(停止準則、噪音振幅、系集數)可能得到不同 IMF 數目與內容,跨研究比較需注意。

### 3.4 從 EMD → EEMD → CEEMDAN → HHSA 的演進邏輯
| 方法 | 年份 | 解決的問題 | 代價 |
|---|---|---|---|
| EMD (Huang 1998) | 1998 | 讓非線性非平穩訊號有可用的瞬時頻率 | 模態混疊、端點效應、無理論 |
| EEMD (Wu & Huang 2009) | 2009 | 用白噪音系集抑制模態混疊 | 計算量 ×N、不完備、殘留噪音 |
| CEEMDAN (Torres 2011) | 2011 | 逐階加噪,恢復完備性、減少篩選次數 | 仍需系集、仍有端點效應 |
| HHSA (Huang 2016) | 2016 | 對 IMF 包絡再做 EMD,把 AM 與 FM 分開展成二維譜,處理乘法(調變)過程 | 計算量再翻倍、結果維度高、解釋需訓練 |

睡眠研究對這條演進線的採用大致同步:2007–2010 年的紡錘波與 OSA 論文用原始 EMD/HHT;2013 年起黃鍔團隊用遮罩訊號、2016–2017 年 Hassan 系列用 CEEMDAN/EEMD 搭配系集學習;2020 年後則走向「EMD 作為前處理 + 深度學習」(Setiawan 2022、Hu 2025)或「EMD 與小波/TQWT 互補」(Huang & Ling 2022)。值得注意的是,截至本次查證,**尚未找到以 HHSA 直接分析睡眠 EEG(慢波–紡錘波耦合、CAP)並發表於期刊的論文**;HHSA 目前的生醫應用集中在麻醉 EEG、聽覺穩態反應、認知退化。以 HHSA 分析睡眠跨頻率調變,仍是一個尚未被填滿的缺口,也正是 Yeh & Shi 2018 用遮罩 EMD 做 PAC 所指向的方向。

---

## 四、查證備註
- 所有 DOI 均以 Crossref 或 PubMed 回傳的 metadata 確認;沒有任何 DOI 是推測的。
- 第 6、7、16、24 篇原本因出版社限制只能轉述或無數字;2026-09-19 已透過陽明交大校內訂閱讀取全文並以原文數字取代,其中第 6 篇原轉述的「Cohen's κ 約 0.82」在原文中不存在(文中 κ 為峰度),已刪除。
- 第 12 篇(Guo 2022)Scientific Reports 卷號為 12,文章編號未另行確認,以 DOI 為準。
