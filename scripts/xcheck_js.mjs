// 交叉驗證：用網頁端 dsp.js 對 epochs.json 的 N2 epoch 做 EMD，輸出 IMF 供 Python 比對
import { readFileSync, writeFileSync } from 'node:fs';
import { emd, demean } from '../site/js/dsp.js';
const ep = JSON.parse(readFileSync(new URL('../site/data/epochs.json', import.meta.url)));
const out = {};
for (const st of ['W','N1','N2','N3','REM']) {
  const x = demean(Float64Array.from(ep.epochs[st].data));
  const { imfs, residue } = emd(x, { sdThresh: 0.2 });
  out[st] = { imfs: imfs.map(a => Array.from(a)), residue: Array.from(residue) };
}
writeFileSync(new URL('../data/xcheck_js.json', import.meta.url), JSON.stringify(out));
console.log('ok', Object.fromEntries(Object.entries(out).map(([k,v]) => [k, v.imfs.length])));
