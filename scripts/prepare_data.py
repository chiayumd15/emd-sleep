#!/usr/bin/env python3
"""
從 PhysioNet Sleep-EDF Expanded (sleep-cassette, SC4001E0) 擷取網站所需的真實資料。

輸出（皆為靜態 JSON，前端直接載入）：
  data/epochs.json        各睡眠分期各一段 30 秒 EEG Fpz-Cz（100 Hz，單位 µV）
  data/night.json         整夜 hypnogram + 每個 epoch 的 EMD/HHT 特徵（IMF 能量比、平均瞬時頻率）
  data/marginal.json      各分期的 Hilbert 邊際譜（0.5–30 Hz）

資料來源：
  Kemp B, Zwinderman AH, Tuk B, Kamphuisen HAC, Oberyé JJL. Analysis of a sleep-dependent
  neuronal feedback loop: the slow-wave microcontinuity of the EEG. IEEE-BME 47(9):1185-1194 (2000).
  Goldberger AL et al. PhysioBank, PhysioToolkit, and PhysioNet. Circulation 101(23):e215–e220 (2000).
  https://physionet.org/content/sleep-edfx/1.0.0/   (Open Data Commons Attribution License v1.0)

EMD 實作依 Huang et al. 1998 (Proc R Soc Lond A 454:903–995) 的 sifting 程序：
  極值 → 三次樣條上下包絡 → 均值 → 相減，重複到 SD < 0.2（原文 eq. 5.5，建議 0.2–0.3）。
  端點採鏡射延拓（Rilling, Flandrin & Gonçalvès 2003 的常見作法），原文並未規定端點處理方式。
與 site/js/dsp.js 為同一套規則，方便前後端互相驗證。
"""
import json, os, sys
import numpy as np
import pyedflib
from scipy.interpolate import CubicSpline
from scipy.signal import hilbert, welch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data', 'raw')
OUT = os.path.join(ROOT, 'site', 'data')
os.makedirs(OUT, exist_ok=True)

PSG = os.path.join(RAW, 'SC4001E0-PSG.edf')
HYP = os.path.join(RAW, 'SC4001EC-Hypnogram.edf')
FS = 100
EPOCH = 30
N = FS * EPOCH

# ---------------------------------------------------------------- EMD (與 JS 版一致)
def find_extrema(x):
    d = np.diff(x)
    # 處理平台：把 0 差分視為延續前一個符號
    s = np.sign(d)
    for i in range(1, len(s)):
        if s[i] == 0:
            s[i] = s[i - 1]
    ds = np.diff(s)
    maxi = np.where(ds < 0)[0] + 1
    mini = np.where(ds > 0)[0] + 1
    return maxi, mini


def envelope(x, idx, n):
    """鏡射延拓兩個極值後做自然三次樣條，回傳長度 n 的包絡。"""
    if len(idx) < 2:
        return None
    xi = list(idx)
    yi = list(x[idx])
    # 左端鏡射
    l = [2 * 0 - xi[1], 2 * 0 - xi[0]] if xi[0] != 0 else [2 * 0 - xi[1]]
    lv = [yi[1], yi[0]] if xi[0] != 0 else [yi[1]]
    r = [2 * (n - 1) - xi[-1], 2 * (n - 1) - xi[-2]] if xi[-1] != n - 1 else [2 * (n - 1) - xi[-2]]
    rv = [yi[-1], yi[-2]] if xi[-1] != n - 1 else [yi[-2]]
    X = np.array(l[::-1] + xi + r, dtype=float) if False else np.array(sorted(zip(l + xi + r, lv + yi + rv)))
    xs, ys = X[:, 0], X[:, 1]
    xs, ui = np.unique(xs, return_index=True)
    ys = ys[ui]
    cs = CubicSpline(xs, ys, bc_type='natural')  # 與 site/js/dsp.js 的 naturalSpline 一致
    return cs(np.arange(n))


def sift_once(h):
    n = len(h)
    maxi, mini = find_extrema(h)
    up = envelope(h, maxi, n)
    lo = envelope(h, mini, n)
    if up is None or lo is None:
        return None, None
    m = 0.5 * (up + lo)
    return h - m, m


def emd(x, sd_thresh=0.2, max_sift=50, max_imf=10):
    x = np.asarray(x, dtype=float)
    r = x.copy()
    imfs = []
    for _ in range(max_imf):
        maxi, mini = find_extrema(r)
        if len(maxi) + len(mini) < 3:
            break
        h = r.copy()
        for k in range(max_sift):
            h_new, m = sift_once(h)
            if h_new is None:
                break
            sd = np.sum((h - h_new) ** 2) / (np.sum(h ** 2) + 1e-12)
            h = h_new
            if sd < sd_thresh:
                break
        imfs.append(h)
        r = r - h
    return np.array(imfs), r


def inst_freq(imf, fs=FS):
    a = hilbert(imf)
    amp = np.abs(a)
    ph = np.unwrap(np.angle(a))
    f = np.gradient(ph) * fs / (2 * np.pi)
    return amp, f


# ---------------------------------------------------------------- 讀檔
def load():
    f = pyedflib.EdfReader(PSG)
    labels = f.getSignalLabels()
    ch = labels.index('EEG Fpz-Cz')
    eeg = f.readSignal(ch)
    assert int(f.getSampleFrequency(ch)) == FS
    start = f.getStartdatetime()
    f.close()

    h = pyedflib.EdfReader(HYP)
    on, du, la = h.readAnnotations()
    h.close()
    n_ep = len(eeg) // N
    stages = np.array(['?'] * n_ep, dtype=object)
    mapping = {'Sleep stage W': 'W', 'Sleep stage 1': 'N1', 'Sleep stage 2': 'N2',
               'Sleep stage 3': 'N3', 'Sleep stage 4': 'N3', 'Sleep stage R': 'REM'}
    for o, d, l in zip(on, du, la):
        if l not in mapping:
            continue
        a, b = int(o // EPOCH), int((o + d) // EPOCH)
        stages[a:min(b, n_ep)] = mapping[l]
    return eeg, stages, start, labels


def band_powers(seg):
    fr, p = welch(seg, fs=FS, nperseg=256)
    bands = {'delta': (0.5, 4), 'theta': (4, 8), 'alpha': (8, 12), 'sigma': (12, 15), 'beta': (15, 30)}
    tot = np.trapezoid(p[(fr >= 0.5) & (fr <= 30)], fr[(fr >= 0.5) & (fr <= 30)])
    return {k: float(np.trapezoid(p[(fr >= lo) & (fr < hi)], fr[(fr >= lo) & (fr < hi)]) / tot) for k, (lo, hi) in bands.items()}


def pick_epochs(eeg, stages, lo=0, hi=None):
    """每個分期挑一段「典型」epoch：位於 ≥3 個 epoch 的連續段中央，且相對頻帶功率最接近該分期中位數。"""
    picks = {}
    n_ep = len(stages)
    hi = n_ep if hi is None else hi
    for st in ['W', 'N1', 'N2', 'N3', 'REM']:
        cands = []
        for i in range(max(1, lo), min(n_ep - 1, hi)):
            if stages[i] != st:
                continue
            # 連續段長度
            j = i
            while j > 0 and stages[j - 1] == st:
                j -= 1
            k = i
            while k < n_ep - 1 and stages[k + 1] == st:
                k += 1
            if k - j + 1 < 3 or i in (j, k):
                continue
            seg = eeg[i * N:(i + 1) * N]
            if np.ptp(seg) > 400 or np.std(seg) < 2:  # 排除明顯雜訊/斷線
                continue
            cands.append((i, band_powers(seg)))
        if not cands:
            continue
        keys = ['delta', 'theta', 'alpha', 'sigma', 'beta']
        M = np.array([[c[1][k] for k in keys] for c in cands])
        med = np.median(M, axis=0)
        # W 選 alpha 相對高、N2 選 sigma 相對高一點的（仍在典型範圍內）以便肉眼辨識
        d = np.linalg.norm(M - med, axis=1)
        order = np.argsort(d)
        best = order[0]
        if st == 'N2':
            top = order[:max(5, len(order) // 10)]
            best = top[np.argmax(M[top, keys.index('sigma')])]
        if st == 'W':
            top = order[:max(5, len(order) // 3)]
            best = top[np.argmax(M[top, keys.index('alpha')])]
        i = cands[best][0]
        picks[st] = {'epoch_index': int(i), 'band_rel_power': {k: round(v, 4) for k, v in cands[best][1].items()},
                     'n_candidates': len(cands)}
    return picks


def main():
    eeg, stages, start, labels = load()
    n_ep = len(stages)
    print('channels:', labels, 'epochs:', n_ep, 'start:', start)
    sleep_idx = np.where(stages != 'W')[0]
    sleep_idx = sleep_idx[stages[sleep_idx] != '?']
    first, last = int(sleep_idx.min()), int(sleep_idx.max())
    a = max(0, first - 60)   # 入睡前 30 分鐘
    b = min(n_ep, last + 61)  # 醒來後 30 分鐘
    print('analysis window epochs', a, b, 'stage counts:', {s: int(np.sum(stages[a:b] == s)) for s in ['W', 'N1', 'N2', 'N3', 'REM', '?']})

    # ---- 1. 代表性 epoch
    picks = pick_epochs(eeg, stages, a, b)  # 只從分析視窗（關燈前 30 分鐘～醒來後 30 分鐘）挑
    epochs = {}
    for st, info in picks.items():
        i = info['epoch_index']
        seg = eeg[i * N:(i + 1) * N]
        epochs[st] = dict(info, t0_sec=i * EPOCH, clock=str((start + np.timedelta64(i * EPOCH, 's')).time()) if False else None,
                          data=[round(float(v), 2) for v in seg])
    # 時鐘時間
    import datetime as dt
    for st in epochs:
        epochs[st]['clock'] = (start + dt.timedelta(seconds=epochs[st]['t0_sec'])).strftime('%H:%M:%S')
    meta = {
        'source': 'PhysioNet Sleep-EDF Database Expanded v1.0.0, sleep-cassette, SC4001E0-PSG.edf / SC4001EC-Hypnogram.edf',
        'license': 'Open Data Commons Attribution License v1.0',
        'channel': 'EEG Fpz-Cz', 'fs': FS, 'unit': 'uV', 'epoch_sec': EPOCH,
        'scoring': 'Rechtschaffen & Kales (1968) 人工判讀；本站將 S3+S4 合併為 N3、S1→N1、S2→N2、R→REM',
        'selection': '只從分析視窗（入睡前 30 分鐘～最後醒來後 30 分鐘）內挑；每個分期取位於 ≥3 個 epoch 連續段中央、相對頻帶功率最接近該分期中位數的 epoch（W 在前 1/3 候選中偏好 alpha 較高者、N2 在前 1/10 候選中偏好 sigma 較高者，以利辨識），見 scripts/prepare_data.py',
        'recording_start': start.strftime('%Y-%m-%d %H:%M:%S'),
    }
    json.dump({'meta': meta, 'epochs': epochs}, open(os.path.join(OUT, 'epochs.json'), 'w'), separators=(',', ':'))
    print('epochs.json', {k: (v['epoch_index'], v['clock'], v['band_rel_power']) for k, v in epochs.items()})

    # ---- 2. 整夜 EMD/HHT 特徵 + 3. 分期邊際譜
    fbins = np.arange(0.5, 30.01, 0.5)
    marg = {s: np.zeros(len(fbins) - 1) for s in ['W', 'N1', 'N2', 'N3', 'REM']}
    cnt = {s: 0 for s in marg}
    night = []
    K = 6
    for i in range(a, b):
        st = stages[i]
        seg = eeg[i * N:(i + 1) * N].astype(float)
        seg = seg - seg.mean()
        imfs, res = emd(seg)
        tot = np.sum(seg ** 2) + 1e-12
        e, fq = [], []
        for k in range(K):
            if k < len(imfs):
                amp, f = inst_freq(imfs[k])
                w = amp ** 2
                e.append(float(np.sum(imfs[k] ** 2) / tot))
                fq.append(float(np.sum(w * np.clip(f, 0, 50)) / (np.sum(w) + 1e-12)))
                if st in marg and np.ptp(seg) < 400:
                    hh, _ = np.histogram(np.clip(f, 0, 60), bins=fbins, weights=w)
                    marg[st] += hh
            else:
                e.append(0.0)
                fq.append(0.0)
        if st in cnt and np.ptp(seg) < 400:
            cnt[st] += 1
        night.append({'i': int(i), 'stage': str(st), 'n_imf': int(len(imfs)),
                      'e': [round(v, 4) for v in e], 'f': [round(v, 2) for v in fq],
                      'rms': round(float(np.std(seg)), 2)})
        if (i - a) % 200 == 0:
            print(f'  epoch {i - a}/{b - a}', flush=True)
    json.dump({'meta': dict(meta, window_epochs=[a, b], n_imf_kept=K,
                            note='每個 30 秒 epoch 做 EMD，e[k]=IMF(k+1) 能量佔原訊號能量比；f[k]=以振幅平方加權的平均瞬時頻率(Hz)'),
               'epochs': night}, open(os.path.join(OUT, 'night.json'), 'w'), separators=(',', ':'))
    for s in marg:
        if cnt[s]:
            marg[s] = marg[s] / cnt[s]
    json.dump({'meta': dict(meta, note='各分期所有 epoch 的 Hilbert 邊際譜平均（IMF1–6 的瞬時振幅平方，依瞬時頻率 0.5 Hz 分箱累加），單位 uV^2', n_epochs=cnt),
               'f_edges': [float(v) for v in fbins],
               'marginal': {s: [round(float(v), 3) for v in marg[s]] for s in marg}},
              open(os.path.join(OUT, 'marginal.json'), 'w'), separators=(',', ':'))
    print('done. n_epochs per stage used in marginal:', cnt)


if __name__ == '__main__':
    main()
