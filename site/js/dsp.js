// dsp.js — EMD / EEMD / Hilbert 轉換 / STFT 的純 JavaScript 實作
// 依 Huang et al. 1998 (Proc R Soc Lond A 454:903–995) 的 sifting 程序與 SD 停止準則（eq. 5.5）。
// 端點處理採鏡射極值延拓（Rilling, Flandrin & Gonçalvès 2003 之常見作法；原文未規定）。
// 與 scripts/prepare_data.py 使用同一套規則。

// ---------------------------------------------------------------- 極值
export function findExtrema(x) {
  const n = x.length;
  const s = new Int8Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const d = x[i + 1] - x[i];
    s[i] = d > 0 ? 1 : d < 0 ? -1 : 0;
  }
  for (let i = 1; i < n - 1; i++) if (s[i] === 0) s[i] = s[i - 1];
  const maxi = [], mini = [];
  for (let i = 1; i < n - 1; i++) {
    const ds = s[i] - s[i - 1];
    if (ds < 0) maxi.push(i);
    else if (ds > 0) mini.push(i);
  }
  return { maxi, mini };
}

export function zeroCrossings(x) {
  let c = 0;
  for (let i = 1; i < x.length; i++) {
    if ((x[i - 1] < 0 && x[i] >= 0) || (x[i - 1] > 0 && x[i] <= 0)) c++;
  }
  return c;
}

// ---------------------------------------------------------------- 自然三次樣條
// 回傳在整數座標 0..n-1 上取值的 Float64Array
export function naturalSpline(xs, ys, n) {
  const m = xs.length;
  if (m < 2) return null;
  if (m === 2) {
    const out = new Float64Array(n);
    const k = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    for (let i = 0; i < n; i++) out[i] = ys[0] + k * (i - xs[0]);
    return out;
  }
  const h = new Float64Array(m - 1);
  for (let i = 0; i < m - 1; i++) h[i] = xs[i + 1] - xs[i];
  // 解二階導數 M（Thomas 演算法）
  const a = new Float64Array(m), b = new Float64Array(m), c = new Float64Array(m), d = new Float64Array(m);
  b[0] = 1; b[m - 1] = 1;
  for (let i = 1; i < m - 1; i++) {
    a[i] = h[i - 1]; b[i] = 2 * (h[i - 1] + h[i]); c[i] = h[i];
    d[i] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]);
  }
  const cp = new Float64Array(m), dp = new Float64Array(m);
  cp[0] = c[0] / b[0]; dp[0] = d[0] / b[0];
  for (let i = 1; i < m; i++) {
    const w = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / w; dp[i] = (d[i] - a[i] * dp[i - 1]) / w;
  }
  const M = new Float64Array(m);
  M[m - 1] = dp[m - 1];
  for (let i = m - 2; i >= 0; i--) M[i] = dp[i] - cp[i] * M[i + 1];
  // 取值
  const out = new Float64Array(n);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const t = i;
    while (seg < m - 2 && t > xs[seg + 1]) seg++;
    const x0 = xs[seg], x1 = xs[seg + 1], hh = h[seg];
    const A = (x1 - t) / hh, B = (t - x0) / hh;
    out[i] = A * ys[seg] + B * ys[seg + 1] + ((A * A * A - A) * M[seg] + (B * B * B - B) * M[seg + 1]) * hh * hh / 6;
  }
  return out;
}

// 鏡射延拓兩個極值後建包絡
export function envelope(x, idx, n) {
  if (idx.length < 2) return null;
  const xs = [], ys = [];
  const first = idx[0], second = idx[1], last = idx[idx.length - 1], prev = idx[idx.length - 2];
  if (first !== 0) { xs.push(-second, -first); ys.push(x[second], x[first]); }
  else { xs.push(-second); ys.push(x[second]); }
  for (const i of idx) { xs.push(i); ys.push(x[i]); }
  if (last !== n - 1) { xs.push(2 * (n - 1) - last, 2 * (n - 1) - prev); ys.push(x[last], x[prev]); }
  else { xs.push(2 * (n - 1) - prev); ys.push(x[prev]); }
  return naturalSpline(xs, ys, n);
}

// ---------------------------------------------------------------- EMD（產生器：逐步事件，供互動視覺化）
// 事件：
//  {type:'start-imf', k, r}                      開始抽第 k 個 IMF，r 為目前殘餘
//  {type:'extrema', k, iter, h, maxi, mini}       找到極值
//  {type:'envelope', k, iter, up, lo, mean}       上下包絡與均值
//  {type:'sift', k, iter, hNew, sd, converged}    相減後的新原型與 SD
//  {type:'imf', k, imf, nSift}                    收斂，得到 IMF
//  {type:'done', imfs, residue}
export function* emdSteps(x, { sdThresh = 0.2, maxSift = 50, maxImf = 10 } = {}) {
  const n = x.length;
  let r = Float64Array.from(x);
  const imfs = [];
  for (let k = 0; k < maxImf; k++) {
    const ex = findExtrema(r);
    if (ex.maxi.length + ex.mini.length < 3) break;
    yield { type: 'start-imf', k, r: Float64Array.from(r) };
    let h = Float64Array.from(r);
    let nSift = 0;
    for (let iter = 0; iter < maxSift; iter++) {
      const { maxi, mini } = findExtrema(h);
      yield { type: 'extrema', k, iter, h: Float64Array.from(h), maxi, mini };
      const up = envelope(h, maxi, n), lo = envelope(h, mini, n);
      if (!up || !lo) break;
      const mean = new Float64Array(n);
      for (let i = 0; i < n; i++) mean[i] = 0.5 * (up[i] + lo[i]);
      yield { type: 'envelope', k, iter, up, lo, mean };
      const hNew = new Float64Array(n);
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        hNew[i] = h[i] - mean[i];
        num += (h[i] - hNew[i]) ** 2; den += h[i] * h[i];
      }
      const sd = num / (den + 1e-12);
      h = hNew; nSift = iter + 1;
      const converged = sd < sdThresh;
      yield { type: 'sift', k, iter, hNew: Float64Array.from(h), sd, converged };
      if (converged) break;
    }
    imfs.push(h);
    yield { type: 'imf', k, imf: h, nSift };
    const r2 = new Float64Array(n);
    for (let i = 0; i < n; i++) r2[i] = r[i] - h[i];
    r = r2;
  }
  yield { type: 'done', imfs, residue: r };
  return { imfs, residue: r };
}

export function emd(x, opts) {
  const it = emdSteps(x, opts);
  let ev;
  do { ev = it.next().value; } while (ev && ev.type !== 'done');
  return { imfs: ev.imfs, residue: ev.residue };
}

// ---------------------------------------------------------------- EEMD（Wu & Huang 2009）
// 加入 nTrials 次白噪音（標準差 = noiseStd × 原訊號標準差），各自 EMD 後逐階平均
export function eemd(x, { nTrials = 20, noiseStd = 0.2, maxImf = 8, sdThresh = 0.2, maxSift = 50, rng = Math.random, onProgress } = {}) {
  const n = x.length;
  let sd0 = 0; for (let i = 0; i < n; i++) sd0 += x[i] * x[i]; sd0 = Math.sqrt(sd0 / n);
  const sum = Array.from({ length: maxImf }, () => new Float64Array(n));
  const count = new Int32Array(maxImf);
  for (let t = 0; t < nTrials; t++) {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = x[i] + noiseStd * sd0 * gauss(rng);
    const { imfs, residue } = emd(y, { maxImf, sdThresh, maxSift });
    for (let k = 0; k < maxImf; k++) {
      const src = k < imfs.length ? imfs[k] : (k === imfs.length ? residue : null);
      if (!src) continue;
      const s = sum[k];
      for (let i = 0; i < n; i++) s[i] += src[i];
      count[k]++;
    }
    onProgress && onProgress(t + 1, nTrials);
  }
  const imfs = [];
  for (let k = 0; k < maxImf; k++) {
    if (!count[k]) break;
    const s = sum[k];
    for (let i = 0; i < n; i++) s[i] /= count[k];
    imfs.push(s);
  }
  return { imfs };
}

export function gauss(rng = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 可重現的亂數（mulberry32）
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- FFT
function fftRadix2(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci;
        const vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// 任意長度 FFT（Bluestein）
export function fft(reIn, imIn, inverse = false) {
  const n = reIn.length;
  const re = Float64Array.from(reIn), im = imIn ? Float64Array.from(imIn) : new Float64Array(n);
  if ((n & (n - 1)) === 0) { fftRadix2(re, im, inverse); return { re, im }; }
  let m = 1; while (m < 2 * n - 1) m <<= 1;
  const sign = inverse ? 1 : -1;
  const wr = new Float64Array(n), wi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const ang = sign * Math.PI * ((k * k) % (2 * n)) / n;
    wr[k] = Math.cos(ang); wi[k] = Math.sin(ang);
  }
  const ar = new Float64Array(m), ai = new Float64Array(m), br = new Float64Array(m), bi = new Float64Array(m);
  for (let k = 0; k < n; k++) {
    ar[k] = re[k] * wr[k] - im[k] * wi[k];
    ai[k] = re[k] * wi[k] + im[k] * wr[k];
  }
  br[0] = wr[0]; bi[0] = -wi[0];
  for (let k = 1; k < n; k++) { br[k] = br[m - k] = wr[k]; bi[k] = bi[m - k] = -wi[k]; }
  fftRadix2(ar, ai); fftRadix2(br, bi);
  for (let k = 0; k < m; k++) {
    const r = ar[k] * br[k] - ai[k] * bi[k];
    const i = ar[k] * bi[k] + ai[k] * br[k];
    ar[k] = r; ai[k] = i;
  }
  fftRadix2(ar, ai, true);
  const outR = new Float64Array(n), outI = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    outR[k] = ar[k] * wr[k] - ai[k] * wi[k];
    outI[k] = ar[k] * wi[k] + ai[k] * wr[k];
    if (inverse) { outR[k] /= n; outI[k] /= n; }
  }
  return { re: outR, im: outI };
}

// ---------------------------------------------------------------- Hilbert 轉換 → 解析訊號、瞬時振幅/頻率
export function analytic(x) {
  const n = x.length;
  const { re, im } = fft(x);
  const h = new Float64Array(n);
  h[0] = 1;
  if (n % 2 === 0) { h[n / 2] = 1; for (let i = 1; i < n / 2; i++) h[i] = 2; }
  else for (let i = 1; i <= (n - 1) / 2; i++) h[i] = 2;
  for (let i = 0; i < n; i++) { re[i] *= h[i]; im[i] *= h[i]; }
  return fft(re, im, true);
}

export function instantaneous(x, fs) {
  const n = x.length;
  const { re, im } = analytic(x);
  const amp = new Float64Array(n), phase = new Float64Array(n), freq = new Float64Array(n);
  for (let i = 0; i < n; i++) { amp[i] = Math.hypot(re[i], im[i]); phase[i] = Math.atan2(im[i], re[i]); }
  // unwrap
  for (let i = 1; i < n; i++) {
    let d = phase[i] - phase[i - 1];
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    phase[i] = phase[i - 1] + d;
  }
  for (let i = 0; i < n; i++) {
    const d = i === 0 ? phase[1] - phase[0] : i === n - 1 ? phase[n - 1] - phase[n - 2] : 0.5 * (phase[i + 1] - phase[i - 1]);
    freq[i] = d * fs / (2 * Math.PI);
  }
  return { amp, freq, phase };
}

// Hilbert 譜：時間 × 頻率 網格，累加各 IMF 的瞬時振幅平方
export function hilbertSpectrum(imfs, fs, { fMax = 30, nF = 120, nT = 300, weighted = true } = {}) {
  const n = imfs[0].length;
  const grid = new Float64Array(nF * nT);
  const perImf = [];
  for (const imf of imfs) {
    const { amp, freq } = instantaneous(imf, fs);
    perImf.push({ amp, freq });
    for (let i = 0; i < n; i++) {
      const f = freq[i];
      if (f < 0 || f >= fMax) continue;
      const fi = Math.floor(f / fMax * nF), ti = Math.floor(i / n * nT);
      grid[fi * nT + ti] += weighted ? amp[i] * amp[i] : amp[i];
    }
  }
  return { grid, nF, nT, fMax, perImf };
}

// 邊際譜：Hilbert 譜對時間積分
export function marginal(imfs, fs, { fMax = 30, df = 0.5 } = {}) {
  const nF = Math.round(fMax / df);
  const out = new Float64Array(nF);
  for (const imf of imfs) {
    const { amp, freq } = instantaneous(imf, fs);
    for (let i = 0; i < amp.length; i++) {
      const f = freq[i];
      if (f < 0 || f >= fMax) continue;
      out[Math.floor(f / df)] += amp[i] * amp[i];
    }
  }
  return { power: out, df };
}

// ---------------------------------------------------------------- STFT 時頻圖（對照組）
export function stft(x, fs, { win = 200, hop = 10, nfft = 256, fMax = 30 } = {}) {
  const n = x.length;
  const nFrames = Math.floor((n - win) / hop) + 1;
  const nF = Math.floor(fMax / (fs / nfft)) + 1;
  const grid = new Float64Array(nF * nFrames);
  const w = new Float64Array(win);
  for (let i = 0; i < win; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (win - 1));
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (let t = 0; t < nFrames; t++) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < win; i++) re[i] = x[t * hop + i] * w[i];
    fftRadix2(re, im);
    for (let f = 0; f < nF; f++) grid[f * nFrames + t] = re[f] * re[f] + im[f] * im[f];
  }
  return { grid, nF, nT: nFrames, fMax: nF * fs / nfft, win, hop };
}

// Welch 功率譜（Hann，50% 重疊）
export function welch(x, fs, { nperseg = 256, fMax = 30 } = {}) {
  const hop = nperseg / 2;
  const nSeg = Math.floor((x.length - nperseg) / hop) + 1;
  const w = new Float64Array(nperseg);
  let wsum = 0;
  for (let i = 0; i < nperseg; i++) { w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (nperseg - 1)); wsum += w[i] * w[i]; }
  const nF = Math.floor(fMax / (fs / nperseg)) + 1;
  const p = new Float64Array(nF);
  const re = new Float64Array(nperseg), im = new Float64Array(nperseg);
  for (let s = 0; s < nSeg; s++) {
    im.fill(0);
    let mu = 0; for (let i = 0; i < nperseg; i++) mu += x[s * hop + i]; mu /= nperseg;
    for (let i = 0; i < nperseg; i++) re[i] = (x[s * hop + i] - mu) * w[i];
    fftRadix2(re, im);
    for (let f = 0; f < nF; f++) p[f] += (re[f] * re[f] + im[f] * im[f]) / (fs * wsum) * (f === 0 ? 1 : 2);
  }
  for (let f = 0; f < nF; f++) p[f] /= nSeg;
  const freqs = Float64Array.from({ length: nF }, (_, i) => i * fs / nperseg);
  return { freqs, power: p };
}

// 頻譜（單次 FFT 振幅）
export function spectrum(x, fs, fMax = 30) {
  const n = x.length;
  const { re, im } = fft(x);
  const nF = Math.floor(fMax / (fs / n)) + 1;
  const mag = new Float64Array(nF), freqs = new Float64Array(nF);
  for (let f = 0; f < nF; f++) { mag[f] = 2 * Math.hypot(re[f], im[f]) / n; freqs[f] = f * fs / n; }
  return { freqs, mag };
}

// ---------------------------------------------------------------- 小工具
export function stats(x) {
  let s = 0, s2 = 0, mn = Infinity, mx = -Infinity;
  for (const v of x) { s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const n = x.length, mean = s / n;
  return { mean, std: Math.sqrt(Math.max(0, s2 / n - mean * mean)), min: mn, max: mx, energy: s2 };
}

export function demean(x) {
  const m = stats(x).mean;
  return Float64Array.from(x, v => v - m);
}

// 加權平均瞬時頻率（以振幅平方加權）
export function meanFreq(imf, fs) {
  const { amp, freq } = instantaneous(imf, fs);
  let num = 0, den = 0;
  for (let i = 0; i < amp.length; i++) { const w = amp[i] * amp[i]; num += w * Math.min(Math.max(freq[i], 0), fs / 2); den += w; }
  return num / (den + 1e-12);
}

// 正交性指標（Huang 1998 eq. 6.5）
export function orthogonalityIndex(imfs, residue) {
  const comps = [...imfs, residue];
  const n = comps[0].length;
  let tot = 0, cross = 0;
  for (let i = 0; i < n; i++) {
    let s = 0; for (const c of comps) s += c[i];
    tot += s * s;
    for (let a = 0; a < comps.length; a++) for (let b = a + 1; b < comps.length; b++) cross += comps[a][i] * comps[b][i];
  }
  return 2 * cross / (tot + 1e-12);
}
