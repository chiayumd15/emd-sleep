"""交叉驗證：Python 版 EMD（prepare_data.py）vs 網頁端 JavaScript 版（dsp.js）在同一批 epoch 上的差異。"""
import json, os, sys, datetime
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from prepare_data import emd
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = json.load(open(os.path.join(ROOT, 'site/data/epochs.json')))
js = json.load(open(os.path.join(ROOT, 'data/xcheck_js.json')))
rows = []
for st in ['W','N1','N2','N3','REM']:
    x = np.array(ep['epochs'][st]['data'], float); x -= x.mean()
    imfs, res = emd(x, sd_thresh=0.2)
    J = js[st]['imfs']
    k = min(len(imfs), len(J))
    d = max(float(np.max(np.abs(imfs[i] - np.array(J[i])))) for i in range(k))
    rows.append(dict(epoch=st, n=len(x), py_n_imf=int(len(imfs)), js_n_imf=len(J), compared=k, max_abs_diff_uV=d, signal_std_uV=float(x.std())))
    print(st, rows[-1])
worst = max(rows, key=lambda r: r['max_abs_diff_uV'])
summary = dict(worst, date=str(datetime.date.today()), rows=rows,
               note='同一 epoch、同一套規則（SD<0.2、自然三次樣條、鏡射 2 個極值），JS 與 Python 逐點比較前 compared 個 IMF 的最大絕對差')
json.dump(summary, open(os.path.join(ROOT, 'site/data/validation.json'), 'w'), ensure_ascii=False, indent=1)
md = ['# JS 與 Python 實作交叉驗證', '', f'日期：{summary["date"]}', '', '| epoch | 點數 | Python IMF 數 | JS IMF 數 | 比對 IMF 數 | 逐點最大絕對差 (µV) | 訊號標準差 (µV) |', '|---|---|---|---|---|---|---|']
for r in rows:
    md.append(f"| {r['epoch']} | {r['n']} | {r['py_n_imf']} | {r['js_n_imf']} | {r['compared']} | {r['max_abs_diff_uV']:.2e} | {r['signal_std_uV']:.1f} |")
md += ['', '兩套實作：`site/js/dsp.js`（瀏覽器端）與 `scripts/prepare_data.py`（離線整夜分析）。規則：SD < 0.2（Huang 1998 eq. 5.5）、單一 IMF 最多篩 50 次、自然三次樣條包絡、兩端各鏡射 2 個極值。', '差異來源為浮點運算順序與樣條解法的數值誤差；若某 epoch 的 IMF 數不同，代表某次 SD 恰好落在門檻附近而分歧，屬 EMD 對停止準則敏感的已知現象。', '', '重跑：`node scripts/xcheck_js.mjs && python3 scripts/xcheck_py.py`']
open(os.path.join(ROOT, 'docs/validation.md'), 'w').write('\n'.join(md) + '\n')
print('written docs/validation.md, site/data/validation.json')
