import * as D from './dsp.js';
import * as P from './plot.js';
import { PAPERS } from './papers.js';

const FS = 100;
const STAGES = ['W', 'N1', 'N2', 'N3', 'REM'];
const $ = s => document.querySelector(s);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const stColor = s => cssv(`--st-${s}`);
const imfColor = k => cssv(`--imf-${Math.min(k + 1, 8)}`);
const fmt = P.fmt;
const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); Object.assign(e, attrs); if (html) e.innerHTML = html; return e; };

const DATA = {};
const redraws = new Set(); // 主題/尺寸變動時重繪

// ---------------------------------------------------------------- 主題、目錄、進度
(function chrome() {
  $('#theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme !== 'light';
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    requestAnimationFrame(() => redraws.forEach(f => f()));
  });
  const secs = [...document.querySelectorAll('section.chapter')];
  const toc = $('#toc');
  secs.forEach((s, i) => toc.appendChild(el('li', {}, `<a href="#${s.id}"><span class="num">${String(i + 1).padStart(2, '0')}</span>${s.dataset.title}</a>`)));
  const links = [...toc.querySelectorAll('a')];
  const spy = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id)); });
  }, { rootMargin: '-20% 0px -70% 0px' });
  secs.forEach(s => spy.observe(s));
  const fade = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.fade').forEach(e => fade.observe(e));
  addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%'; }, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => redraws.forEach(f => f()), 120); });
})();

function segButtons(container, items, onPick, active) {
  container.innerHTML = '';
  items.forEach(it => {
    const b = el('button', { type: 'button' }, (it.color ? `<span class="dot" style="background:${it.color}"></span>` : '') + it.label);
    b.dataset.v = it.v;
    if (it.v === active) b.classList.add('active');
    b.addEventListener('click', () => { container.querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); onPick(it.v); });
    container.appendChild(b);
  });
}
const stageItems = () => STAGES.map(s => ({ v: s, label: s, color: stColor(s) }));
const epochSig = s => Float64Array.from(DATA.epochs.epochs[s].data);

// ---------------------------------------------------------------- 合成訊號（皆明確標示為合成）
function chirp(n = 3000) { const y = new Float64Array(n); for (let i = 0; i < n; i++) { const t = i / FS; y[i] = 30 * Math.sin(2 * Math.PI * (2 * t + (18 / 2) * t * t / 30)); } return y; }
function synthTwoTone(n = 1000) { const y = new Float64Array(n); for (let i = 0; i < n; i++) { const t = i / FS; y[i] = 20 * Math.sin(2 * Math.PI * 1.2 * t) + 8 * Math.sin(2 * Math.PI * 11 * t) + 1.5 * t; } return y; }
function synthIntermittent(n = 1000) {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    let v = Math.sin(2 * Math.PI * 1.5 * t);
    const inBurst = (t > 2 && t < 3) || (t > 5.5 && t < 6.5) || (t > 8 && t < 8.6);
    if (inBurst) v += 0.4 * Math.sin(2 * Math.PI * 14 * t);
    y[i] = v;
  }
  return y;
}

// ---------------------------------------------------------------- HERO：無限循環的 sifting 動畫
function hero() {
  const cv = $('#hero-canvas'); const cap = $('#hero-cap');
  const x = D.demean(epochSig('N2').slice(0, 1000));
  let gen = D.emdSteps(x, { sdThresh: 0.2 }), ev = null, last = 0, frame = null;
  const T = P.theme();
  function draw() {
    if (!ev) return;
    const series = []; const markers = [];
    if (ev.type === 'extrema' || ev.type === 'envelope' || ev.type === 'sift') {
      const h = frame.h; series.push({ y: h, color: T.text, width: 1.2 });
      if (frame.up) { series.push({ y: frame.up, color: cssv('--env-up'), width: 1.2 }); series.push({ y: frame.lo, color: cssv('--env-lo'), width: 1.2 }); series.push({ y: frame.mean, color: cssv('--env-mean'), width: 1.6 }); }
      if (ev.type === 'extrema') { frame.maxi.forEach(i => markers.push({ i, color: cssv('--env-up'), r: 2.5 })); frame.mini.forEach(i => markers.push({ i, color: cssv('--env-lo'), r: 2.5 })); }
    } else if (ev.type === 'imf') { series.push({ y: ev.imf, color: imfColor(ev.k), width: 1.4 }); }
    else if (ev.type === 'start-imf') { series.push({ y: ev.r, color: T.text, width: 1.2 }); }
    else if (ev.type === 'done') { series.push({ y: ev.residue, color: T.text2, width: 1.4 }); }
    P.linePlot(cv, { series, markers, height: 220, dx: 1 / FS, xLabel: '秒', yLabel: 'µV', symmetric: false, padL: 44 });
  }
  function step() {
    ev = gen.next().value;
    if (!ev) { gen = D.emdSteps(x, { sdThresh: 0.2 }); ev = gen.next().value; }
    if (ev.type === 'extrema') frame = { h: ev.h, maxi: ev.maxi, mini: ev.mini };
    if (ev.type === 'envelope') Object.assign(frame, { up: ev.up, lo: ev.lo, mean: ev.mean });
    if (ev.type === 'sift') frame = { h: ev.hNew };
    const txt = {
      'start-imf': () => `開始篩第 ${ev.k + 1} 個 IMF：目前的殘餘訊號`,
      'extrema': () => `IMF ${ev.k + 1} · 第 ${ev.iter + 1} 次篩選 · 找到 ${ev.maxi.length} 個極大、${ev.mini.length} 個極小`,
      'envelope': () => `IMF ${ev.k + 1} · 第 ${ev.iter + 1} 次篩選 · 三次樣條上包絡（紅）、下包絡（綠）、均值（黃）`,
      'sift': () => `IMF ${ev.k + 1} · 第 ${ev.iter + 1} 次篩選 · 減去均值 · SD = ${ev.sd.toFixed(3)}${ev.converged ? ' ＜ 0.2，收斂' : ''}`,
      'imf': () => `✓ 得到 IMF ${ev.k + 1}（篩了 ${ev.nSift} 次）`,
      'done': () => `殘餘（趨勢）· 共 ${ev.imfs.length} 個 IMF · 從頭再來`,
    }[ev.type]();
    cap.textContent = txt;
    draw();
    const wait = { 'start-imf': 900, extrema: 700, envelope: 900, sift: 700, imf: 1400, done: 2200 }[ev.type];
    setTimeout(() => requestAnimationFrame(step), wait);
  }
  step();
  redraws.add(draw);
}

// ---------------------------------------------------------------- S1：訊號 + 傅立葉頻譜
function s1() {
  let stage = 'N2', useChirp = false;
  const sig = $('#s1-sig'), spec = $('#s1-spec');
  segButtons($('#s1-stage'), stageItems(), v => { stage = v; draw(); }, stage);
  $('#s1-chirp').addEventListener('change', e => { useChirp = e.target.checked; draw(); });
  function draw() {
    const y = useChirp ? chirp() : D.demean(epochSig(stage));
    const color = useChirp ? cssv('--series-7') : stColor(stage);
    P.linePlot(sig, { series: [{ y, color, width: 1 }], height: 150, dx: 1 / FS, xLabel: '秒', yLabel: 'µV', hover: ({ i }) => (i >= 0 && i < y.length) ? `t = ${(i / FS).toFixed(2)} s<br>${y[i].toFixed(1)} µV` : '' });
    const { freqs, mag } = D.spectrum(y, FS, 30);
    P.linePlot(spec, { series: [{ y: mag, color, width: 1.2, fill: true }], height: 150, x0: 0, dx: freqs[1], xRange: [0, 30], xLabel: 'Hz', yLabel: '振幅', yPad: 0.1, xTicks: 10, yRange: [0, Math.max(...mag) * 1.1],
      bands: [{ x0: 0.5, x1: 4, color: 'rgba(128,128,128,.05)' }, { x0: 8, x1: 12, color: 'rgba(128,128,128,.05)' }, { x0: 12, x1: 15, color: 'rgba(128,128,128,.05)' }],
      hover: ({ x }) => `${x.toFixed(2)} Hz` });
    const e = DATA.epochs.epochs[stage];
    $('#s1-cap').innerHTML = useChirp ? '<b>合成示意訊號</b>：頻率從 2 Hz 線性升到 20 Hz 的 chirp（振幅固定 30 µV）。這不是腦波。'
      : `<b>${stage} 期</b>，受試者 SC4001E0 第 ${e.epoch_index} 個 epoch（錄影時鐘 ${e.clock}），人工判讀。相對頻帶功率（Welch）：δ ${(e.band_rel_power.delta * 100).toFixed(0)}%・θ ${(e.band_rel_power.theta * 100).toFixed(0)}%・α ${(e.band_rel_power.alpha * 100).toFixed(0)}%・σ ${(e.band_rel_power.sigma * 100).toFixed(0)}%・β ${(e.band_rel_power.beta * 100).toFixed(0)}%。灰底由左至右為 δ、α、σ 頻帶的常用範圍。`;
  }
  $('#s1-src').textContent = `資料：${DATA.epochs.meta.source}；導極 ${DATA.epochs.meta.channel}，${DATA.epochs.meta.fs} Hz。分期：${DATA.epochs.meta.scoring}。`;
  draw(); redraws.add(draw);
}

// ---------------------------------------------------------------- S2：Sifting 實驗室
const LAB = { sig: 'N2', win: 10, sd: 0.2, x: null, gen: null, ev: null, frame: null, imfs: [], residue: null, done: false };
function s2() {
  const main = $('#s2-main'), stack = $('#s2-stack'), stat = $('#s2-stat'), explain = $('#s2-explain');
  const items = [...stageItems(), { v: 'synth', label: '合成：兩正弦＋趨勢' }];
  segButtons($('#s2-stage'), items, v => { LAB.sig = v; reset(); }, LAB.sig);
  // 視窗長度切換
  const winSeg = el('div', { className: 'seg' });
  $('#s2-stage').after(winSeg);
  segButtons(winSeg, [{ v: 10, label: '前 10 秒' }, { v: 30, label: '整段 30 秒' }], v => { LAB.win = +v; reset(); }, 10);
  $('#s2-sd').addEventListener('input', e => { LAB.sd = +e.target.value; $('#s2-sdv').textContent = LAB.sd.toFixed(2); reset(); });
  $('#s2-next').addEventListener('click', next);
  $('#s2-auto-imf').addEventListener('click', () => { const k = LAB.ev ? LAB.ev.k : 0; do { next(true); } while (!LAB.done && !(LAB.ev.type === 'imf' && LAB.ev.k === k) && LAB.ev.type !== 'done'); render(); });
  $('#s2-auto-all').addEventListener('click', () => { while (!LAB.done) next(true); render(); });
  $('#s2-reset').addEventListener('click', reset);
  addEventListener('keydown', e => { if (e.code === 'Space' && !/input|textarea|button/i.test(document.activeElement.tagName) && isInView($('#playground'))) { e.preventDefault(); next(); } });

  function signal() { return LAB.sig === 'synth' ? synthTwoTone(LAB.win * FS) : D.demean(epochSig(LAB.sig).slice(0, LAB.win * FS)); }
  function reset() {
    LAB.x = signal(); LAB.gen = D.emdSteps(LAB.x, { sdThresh: LAB.sd }); LAB.ev = null; LAB.frame = null; LAB.imfs = []; LAB.residue = null; LAB.done = false;
    render(); s3();
  }
  function next(silent) {
    if (LAB.done) return;
    const ev = LAB.gen.next().value;
    if (!ev) { LAB.done = true; return; }
    LAB.ev = ev;
    if (ev.type === 'start-imf') LAB.frame = { h: ev.r };
    if (ev.type === 'extrema') LAB.frame = { h: ev.h, maxi: ev.maxi, mini: ev.mini };
    if (ev.type === 'envelope') Object.assign(LAB.frame, { up: ev.up, lo: ev.lo, mean: ev.mean });
    if (ev.type === 'sift') LAB.frame = { h: ev.hNew, sd: ev.sd, converged: ev.converged, prev: LAB.frame.h };
    if (ev.type === 'imf') LAB.imfs.push(ev.imf);
    if (ev.type === 'done') { LAB.residue = ev.residue; LAB.done = true; }
    if (!silent) render();
  }
  function render() {
    const T = P.theme(); const ev = LAB.ev; const f = LAB.frame;
    const series = [], markers = [];
    let title = '';
    if (!ev) { series.push({ y: LAB.x, color: T.text, width: 1.2 }); title = '原始訊號 X(t)'; }
    else if (ev.type === 'start-imf') { series.push({ y: ev.r, color: T.text, width: 1.2 }); title = ev.k === 0 ? '原始訊號 X(t)' : `殘餘 r${ev.k}(t) — 當作新的輸入`; }
    else if (ev.type === 'extrema') {
      series.push({ y: f.h, color: T.text, width: 1.2 }); title = `h（第 ${ev.iter + 1} 次篩選的輸入）與極值`;
      f.maxi.forEach(i => markers.push({ i, color: cssv('--env-up'), shape: 'tri-down' })); f.mini.forEach(i => markers.push({ i, color: cssv('--env-lo'), shape: 'tri-up' }));
    } else if (ev.type === 'envelope') {
      series.push({ y: f.h, color: T.text, width: 1.2, label: 'h' }, { y: f.up, color: cssv('--env-up'), width: 1.3, label: '上包絡' }, { y: f.lo, color: cssv('--env-lo'), width: 1.3, label: '下包絡' }, { y: f.mean, color: cssv('--env-mean'), width: 1.8, label: '均值 m' });
      title = '三次樣條包絡與其均值';
    } else if (ev.type === 'sift') {
      series.push({ y: f.prev, color: T.muted, width: 1, dash: [3, 3], label: '篩選前' }, { y: f.h, color: T.text, width: 1.3, label: '篩選後 h − m' });
      title = `相減後的新原型 · SD = ${ev.sd.toFixed(4)} ${ev.converged ? '＜' : '≥'} ${LAB.sd}`;
    } else if (ev.type === 'imf') { series.push({ y: ev.imf, color: imfColor(ev.k), width: 1.4 }); title = `IMF ${ev.k + 1}（篩了 ${ev.nSift} 次）`; }
    else if (ev.type === 'done') { series.push({ y: ev.residue, color: T.text2, width: 1.4 }); title = `殘餘 r（趨勢）· 極值不足，停止`; }
    P.linePlot(main, { series, markers, height: 220, dx: 1 / FS, xLabel: '秒', yLabel: 'µV', title });
    // steps 高亮
    const on = ev ? (ev.type === 'sift' ? (ev.converged ? 'check' : 'sift') : ev.type === 'start-imf' ? null : ev.type === 'done' ? null : ev.type) : null;
    document.querySelectorAll('#s2-steps .st').forEach(s => s.classList.toggle('on', s.dataset.k === on || (on === 'sift' && s.dataset.k === 'check' && false)));
    if (ev && ev.type === 'sift' && !ev.converged) document.querySelector('#s2-steps .st[data-k="check"]').classList.add('on');
    // 說明
    const ex = !ev ? '按「下一步」開始。第一步是找出所有局部極大值與極小值。' : {
      'start-imf': () => ev.k === 0 ? '從原始訊號開始。' : `把上一個 IMF 從訊號中扣掉，剩下的殘餘當成新的輸入，重新找極值。注意它比原訊號平滑——高頻已經被抽走了。`,
      'extrema': () => `▼ 是極大值（${f.maxi?.length} 個）、▲ 是極小值（${f.mini?.length} 個）。極值的數目決定了這個 IMF 的「尺度」：極值越密，IMF 頻率越高。`,
      'envelope': () => '極大值連成上包絡（紅）、極小值連成下包絡（綠）；兩者的平均（黃）代表「騎在振盪底下的局部趨勢」。注意兩端：沒有極值可依附的地方，樣條靠鏡射延拓撐著——這就是端點效應的來源。',
      'sift': () => ev.converged ? `SD = ${ev.sd.toFixed(4)} 低於門檻 ${LAB.sd}：連續兩次篩選幾乎沒差別，視為收斂。` : `把均值減掉，波形變得更對稱。SD = ${ev.sd.toFixed(4)} 仍高於門檻 ${LAB.sd}，要再篩一次：對這個新的 h 重新找極值。`,
      'imf': () => `這就是第 ${ev.k + 1} 個 IMF。它的頻率與振幅都可以隨時間變，但局部對稱、一次只有一種振盪。往下捲可以看它是否通過兩個 IMF 條件。`,
      'done': () => `殘餘的極值少於 3 個，無法再做包絡，分解結束。所有 IMF 加上殘餘會精確還原原訊號（見下一節的完備性檢查）。`,
    }[ev.type]();
    explain.innerHTML = ex;
    stat.innerHTML = ev ? `IMF <b>${LAB.imfs.length}</b> 個已抽出${ev.iter != null ? ` · 篩選 #<b>${ev.iter + 1}</b>` : ''}${LAB.done ? ' · <b>完成</b>' : ''}` : '';
    $('#s2-next').disabled = LAB.done; $('#s2-auto-imf').disabled = LAB.done; $('#s2-auto-all').disabled = LAB.done;
    renderStack();
  }
  function renderStack() {
    stack.innerHTML = '';
    if (!LAB.imfs.length && !LAB.residue) { stack.innerHTML = '<div class="skeleton">抽出的 IMF 會依序疊在這裡</div>'; return; }
    const T = P.theme();
    LAB.imfs.forEach((imf, k) => {
      const row = el('div', { className: 'rowi' });
      const mf = D.meanFreq(imf, FS); const st = D.stats(imf);
      row.appendChild(el('div', { className: 'lbl' }, `<span>IMF ${k + 1}</span><span>平均瞬時頻率 ${mf.toFixed(2)} Hz · 能量占比 ${(st.energy / D.stats(LAB.x).energy * 100).toFixed(1)}%</span>`));
      const c = el('canvas'); row.appendChild(c); stack.appendChild(row);
      P.linePlot(c, { series: [{ y: imf, color: imfColor(k), width: 1.1 }], height: 64, dx: 1 / FS, grid: false, yTicks: 2, symmetric: true });
    });
    if (LAB.residue) {
      const row = el('div', { className: 'rowi' });
      row.appendChild(el('div', { className: 'lbl' }, `<span>殘餘 r</span><span>趨勢</span>`));
      const c = el('canvas'); row.appendChild(c); stack.appendChild(row);
      P.linePlot(c, { series: [{ y: LAB.residue, color: T.text2, width: 1.1 }], height: 64, dx: 1 / FS, grid: false, yTicks: 2 });
    }
  }
  reset();
  redraws.add(render);
}
function isInView(node) { const r = node.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }

// ---------------------------------------------------------------- S3：IMF 條件檢查（用實驗室目前的訊號，完整分解）
function s3() {
  const x = LAB.x; const { imfs, residue } = D.emd(x, { sdThresh: LAB.sd });
  const tb = $('#s3-table tbody'); tb.innerHTML = '';
  const E = D.stats(x).energy;
  const n = x.length;
  imfs.forEach((imf, k) => {
    const ex = D.findExtrema(imf); const ne = ex.maxi.length + ex.mini.length; const zc = D.zeroCrossings(imf);
    const up = D.envelope(imf, ex.maxi, n), lo = D.envelope(imf, ex.mini, n);
    let mAbs = 0, amp = 0; if (up && lo) { for (let i = 100; i < n - 100; i++) { mAbs += Math.abs(0.5 * (up[i] + lo[i])); amp += 0.5 * (up[i] - lo[i]); } }
    const ratio = amp ? mAbs / amp : NaN;
    const ok = Math.abs(ne - zc) <= 1;
    tb.appendChild(el('tr', {}, `<td><span class="dot" style="background:${imfColor(k)}"></span> IMF ${k + 1}</td><td class="mono">${ne}</td><td class="mono">${zc}</td><td class="mono">${ne - zc}</td><td><span class="pill ${ok ? 'ok' : 'no'}">${ok ? '通過' : '差 >1'}</span></td><td class="mono">${isFinite(ratio) ? (ratio * 100).toFixed(1) + '%' : '—'}</td><td class="mono">${D.meanFreq(imf, FS).toFixed(2)} Hz</td><td class="mono">${(D.stats(imf).energy / E * 100).toFixed(1)}%</td>`));
  });
  tb.appendChild(el('tr', {}, `<td>殘餘 r</td><td class="mono">${(() => { const e = D.findExtrema(residue); return e.maxi.length + e.mini.length; })()}</td><td class="mono">${D.zeroCrossings(residue)}</td><td colspan="4" class="small">單調或極值不足，不再篩選</td><td class="mono">${(D.stats(residue).energy / E * 100).toFixed(1)}%</td>`));
  let err = 0; for (let i = 0; i < n; i++) { let s = residue[i]; for (const c of imfs) s += c[i]; err = Math.max(err, Math.abs(s - x[i])); }
  $('#s3-recon').textContent = err.toExponential(1);
  $('#s3-io').textContent = D.orthogonalityIndex(imfs, residue).toFixed(4);
  $('#s3-which').textContent = `訊號：${LAB.sig === 'synth' ? '合成' : LAB.sig + ' 期'}，${LAB.win} 秒，SD 門檻 ${LAB.sd}；包絡均值一欄是 |m| 的平均除以局部振幅（去除兩端各 1 秒）`;
}

// ---------------------------------------------------------------- S4：HHT 三種看法
function s4() {
  let stage = 'N2';
  segButtons($('#s4-stage'), stageItems(), v => { stage = v; draw(); }, stage);
  const stackEl = $('#s4-imfs');
  function draw() {
    const x = D.demean(epochSig(stage));
    const { imfs } = D.emd(x, { sdThresh: 0.2 });
    const T = P.theme();
    stackEl.innerHTML = '';
    const show = imfs.slice(0, 6);
    show.forEach((imf, k) => {
      const { amp } = D.instantaneous(imf, FS);
      const row = el('div', { className: 'rowi' });
      row.appendChild(el('div', { className: 'lbl' }, `<span>IMF ${k + 1}</span><span>${D.meanFreq(imf, FS).toFixed(2)} Hz</span>`));
      const c = el('canvas'); row.appendChild(c); stackEl.appendChild(row);
      const neg = Float64Array.from(amp, v => -v);
      P.linePlot(c, { series: [{ y: amp, color: T.muted, width: .8 }, { y: neg, color: T.muted, width: .8 }, { y: imf, color: imfColor(k), width: 1.1 }], height: 60, dx: 1 / FS, grid: false, yTicks: 2, symmetric: true });
    });
    const hs = D.hilbertSpectrum(imfs, FS, { fMax: 30, nF: 120, nT: 300 });
    // 輕微平滑（頻率方向）讓細線可見
    const g = smoothF(hs.grid, hs.nF, hs.nT, 1);
    P.heatmap($('#s4-hs'), g, { nF: hs.nF, nT: hs.nT, fMax: 30, duration: 30, height: 230, title: 'Hilbert 譜 H(ω, t)', xLabel: '秒', yLabel: 'Hz', hover: ({ x, px, py, state }) => { const f = (1 - (py - state.pad.t) / state.ph) * 30; return `t ≈ ${x.toFixed(1)} s · f ≈ ${f.toFixed(1)} Hz`; } });
    const st = D.stft(x, FS, { win: 200, hop: 10, nfft: 256, fMax: 30 });
    P.heatmap($('#s4-stft'), st.grid, { nF: st.nF, nT: st.nT, fMax: st.fMax, duration: 30, height: 230, title: '短時傅立葉時頻圖（2 s Hann）', xLabel: '秒', yLabel: 'Hz', hover: ({ x, py, state }) => { const f = (1 - (py - state.pad.t) / state.ph) * st.fMax; return `t ≈ ${x.toFixed(1)} s · f ≈ ${f.toFixed(1)} Hz`; } });
    const m = D.marginal(imfs, FS, { fMax: 30, df: 0.5 });
    const w = D.welch(x, FS, { nperseg: 256, fMax: 30 });
    const mN = normalize(m.power), wN = normalize(w.power);
    // 把 Welch 重取樣到 0.5 Hz 以便同圖
    P.linePlot($('#s4-marg'), { series: [{ y: mN, color: stColor(stage), width: 1.6, label: 'Hilbert 邊際譜' }, { y: resample(wN, w.freqs, 0.5, 60), color: T.text2, width: 1.2, dash: [4, 3], label: 'Welch 功率譜' }], height: 170, x0: 0.25, dx: 0.5, xRange: [0, 30], xLabel: 'Hz', yLabel: '歸一化', xTicks: 10, yRange: [0, 1.08], hover: ({ x }) => `${x.toFixed(1)} Hz` });
  }
  draw(); redraws.add(draw);
}
function normalize(a) { const m = Math.max(...a) || 1; return Float64Array.from(a, v => v / m); }
function resample(y, freqs, df, n) { const out = new Float64Array(n); for (let i = 0; i < n; i++) { const f = (i + 0.5) * df; let j = 0; while (j < freqs.length - 1 && freqs[j + 1] < f) j++; const t = (f - freqs[j]) / (freqs[j + 1] - freqs[j] || 1); out[i] = y[j] + (y[Math.min(j + 1, y.length - 1)] - y[j]) * Math.min(1, Math.max(0, t)); } return out; }
function smoothF(grid, nF, nT, r) { const out = new Float64Array(grid.length); for (let f = 0; f < nF; f++) for (let t = 0; t < nT; t++) { let s = 0, wsum = 0; for (let d = -r; d <= r; d++) { const ff = f + d; if (ff < 0 || ff >= nF) continue; const w = d === 0 ? 1 : 0.5; s += grid[ff * nT + t] * w; wsum += w; } out[f * nT + t] = s / wsum; } return out; }

// ---------------------------------------------------------------- S5：EEMD
function s5() {
  let src = 'synth', N = 30, eps = 0.2, busy = false;
  segButtons($('#s5-src'), [{ v: 'synth', label: '合成示意：慢波 + 間歇快波' }, { v: 'N2', label: '真實 N2 epoch' }], v => { src = v; drawEmd(); $('#s5-eemd').innerHTML = '<div class="skeleton">按「執行 EEMD」</div>'; }, 'synth');
  $('#s5-n').addEventListener('input', e => { N = +e.target.value; $('#s5-nv').textContent = N; });
  $('#s5-eps').addEventListener('input', e => { eps = +e.target.value; $('#s5-epsv').textContent = eps.toFixed(2); });
  $('#s5-run').addEventListener('click', run);
  const getX = () => src === 'synth' ? synthIntermittent(1000) : D.demean(epochSig('N2').slice(0, 1000));
  function stackInto(container, imfs, x, K = 4) {
    container.innerHTML = '';
    const E = D.stats(x).energy;
    imfs.slice(0, K).forEach((imf, k) => {
      const row = el('div', { className: 'rowi' });
      row.appendChild(el('div', { className: 'lbl' }, `<span>IMF ${k + 1}</span><span>${D.meanFreq(imf, FS).toFixed(2)} Hz · ${(D.stats(imf).energy / E * 100).toFixed(0)}%</span>`));
      const c = el('canvas'); row.appendChild(c); container.appendChild(row);
      P.linePlot(c, { series: [{ y: imf, color: imfColor(k), width: 1.1 }], height: 62, dx: 1 / FS, grid: false, yTicks: 2, symmetric: true });
    });
  }
  function drawEmd() {
    const x = getX(); const { imfs } = D.emd(x, { sdThresh: 0.2 });
    stackInto($('#s5-emd'), imfs, x);
    $('#s5-cap').innerHTML = src === 'synth'
      ? '<b>合成訊號</b>：1.5 Hz 正弦（振幅 1）加上三段 14 Hz 的短暫波包（振幅 0.4，各 0.6–1 秒）。原始 EMD 的 IMF 1 在有波包的地方是 14 Hz、沒有波包的地方卻抓到 1.5 Hz 的一部分——同一個 IMF 裡混了兩個差 10 倍的尺度，這就是模態混疊。EEMD 平均後，IMF 1 只剩波包（其餘時間趨近零），1.5 Hz 完整地落到後面的 IMF。'
      : '<b>真實 N2 epoch 前 10 秒</b>。真實腦波沒有「正確答案」，但可以觀察：EEMD 後各 IMF 的平均瞬時頻率是否更分開、同一 IMF 內的頻率是否更一致。也請注意 EEMD 的 IMF 相加不再精確等於原訊號（不完備）。';
  }
  async function run() {
    if (busy) return; busy = true; $('#s5-run').disabled = true;
    const x = getX(); const t0 = performance.now();
    const rng = D.seededRng(42);
    const n = x.length; const maxImf = 8;
    const sum = Array.from({ length: maxImf }, () => new Float64Array(n)); const cnt = new Int32Array(maxImf);
    let sd0 = D.stats(x).std;
    for (let t = 0; t < N; t++) {
      const y = new Float64Array(n); for (let i = 0; i < n; i++) y[i] = x[i] + eps * sd0 * D.gauss(rng);
      const { imfs, residue } = D.emd(y, { maxImf, sdThresh: 0.2 });
      for (let k = 0; k < maxImf; k++) { const s = k < imfs.length ? imfs[k] : k === imfs.length ? residue : null; if (!s) continue; for (let i = 0; i < n; i++) sum[k][i] += s[i]; cnt[k]++; }
      $('#s5-stat').innerHTML = `第 <b>${t + 1}</b> / ${N} 次`;
      if (t % 5 === 4) await new Promise(r => setTimeout(r, 0));
    }
    const imfs = []; for (let k = 0; k < maxImf; k++) { if (!cnt[k]) break; imfs.push(Float64Array.from(sum[k], v => v / cnt[k])); }
    stackInto($('#s5-eemd'), imfs, x);
    let rec = 0; for (let i = 0; i < n; i++) { let s = 0; for (const c of imfs) s += c[i]; rec = Math.max(rec, Math.abs(s - x[i])); }
    $('#s5-stat').innerHTML = `N = ${N}，ε = ${eps}，耗時 <b>${((performance.now() - t0) / 1000).toFixed(2)}</b> 秒 · 重建最大誤差 <b>${rec.toExponential(1)}</b>（EEMD 不完備）`;
    busy = false; $('#s5-run').disabled = false;
  }
  drawEmd(); $('#s5-eemd').innerHTML = '<div class="skeleton">按「執行 EEMD」</div>';
  redraws.add(drawEmd);
}

// ---------------------------------------------------------------- S6：整夜
function s6() {
  const N = DATA.night; const eps = N.epochs; const n = eps.length; const K = N.meta.n_imf_kept;
  const stages = eps.map(e => e.stage);
  const hours = n * 30 / 3600;
  const hf = t => `${Math.floor(t)}h`;
  const T = P.theme();
  const levels = ['W', 'REM', 'N1', 'N2', 'N3'];
  const tipFor = i => { const e = eps[i]; if (!e) return ''; return `epoch ${e.i} · <b>${e.stage}</b> · ${(i * 30 / 60).toFixed(0)} 分<br>IMF1–6 能量 ${e.e.map(v => (v * 100).toFixed(0) + '%').join(' / ')}<br>IMF1–3 平均頻率 ${e.f.slice(0, 3).map(v => v.toFixed(1)).join(' / ')} Hz`; };
  const hoverIdx = ({ x }) => tipFor(Math.min(n - 1, Math.max(0, Math.floor(x / hours * n))));
  function draw() {
    P.stepPlot($('#s6-hyp'), stages, { levels, height: 120, duration: hours, xFmt: hf, remColor: stColor('REM'), hover: hoverIdx });
    const rows = []; for (let k = 0; k < K; k++) rows.push(Float64Array.from(eps, e => e.e[k]));
    const rest = Float64Array.from(eps, e => Math.max(0, 1 - e.e.reduce((a, b) => a + b, 0)));
    // 平滑 5 個 epoch 讓趨勢可讀
    const sm = a => { const o = new Float64Array(a.length); for (let i = 0; i < a.length; i++) { let s = 0, c = 0; for (let d = -2; d <= 2; d++) { const j = i + d; if (j >= 0 && j < a.length) { s += a[j]; c++; } } o[i] = s / c; } return o; };
    P.stackedArea($('#s6-energy'), [...rows.map(sm), sm(rest)], { colors: [...Array.from({ length: K }, (_, k) => imfColor(k)), T.grid], height: 160, duration: hours, xFmt: hf, title: 'IMF 1（最淺）→ IMF 6（最深）能量占比，灰＝殘餘與更低階', hover: hoverIdx });
    P.linePlot($('#s6-freq'), { series: [0, 1, 2].map(k => ({ y: sm(Float64Array.from(eps, e => e.f[k])), color: imfColor(k * 2), width: 1.3, label: `IMF ${k + 1}` })), height: 150, dx: hours / n, xLabel: '小時', yLabel: 'Hz', yRange: [0, 30], hover: hoverIdx });
    // 各分期中位數
    const med = a => { const s = Float64Array.from(a).sort(); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
    const byStage = {}; STAGES.forEach(st => { byStage[st] = eps.filter(e => e.stage === st); });
    const stats = {}; STAGES.forEach(st => { stats[st] = { n: byStage[st].length, e: Array.from({ length: K }, (_, k) => med(byStage[st].map(e => e.e[k]))), f1: med(byStage[st].map(e => e.f[0])), f2: med(byStage[st].map(e => e.f[1])) }; });
    groupedBars($('#s6-bars'), stats, K);
    const low = st => stats[st].e.slice(3, 6).reduce((a, b) => a + b, 0), high = st => stats[st].e.slice(0, 2).reduce((a, b) => a + b, 0);
    $('#s6-bars-cap').innerHTML = `每個分期所有 epoch 的中位數（W n=${stats.W.n}、N1 n=${stats.N1.n}、N2 n=${stats.N2.n}、N3 n=${stats.N3.n}、REM n=${stats.REM.n}）。IMF 4–6（低頻）的能量占比：N3 <b>${(low('N3') * 100).toFixed(0)}%</b>、N2 ${(low('N2') * 100).toFixed(0)}%、N1 ${(low('N1') * 100).toFixed(0)}%、REM ${(low('REM') * 100).toFixed(0)}%、W ${(low('W') * 100).toFixed(0)}%；IMF 1–2（高頻）：W <b>${(high('W') * 100).toFixed(0)}%</b>、REM ${(high('REM') * 100).toFixed(0)}%、N3 ${(high('N3') * 100).toFixed(0)}%。`;
    $('#s6-energy-cap').innerHTML = `每個 30 秒 epoch 做一次 EMD（共 ${n} 個），IMF 1–6 的能量占原訊號能量的比例，5 個 epoch 移動平均。IMF 1 的加權平均瞬時頻率在 W 期中位數 <b>${stats.W.f1.toFixed(1)} Hz</b>、N3 期 <b>${stats.N3.f1.toFixed(1)} Hz</b>——同樣叫「IMF 1」，尺度會跟著訊號走，這正是自適應分解與固定頻帶最大的差別。`;
    // marginal
    const M = DATA.marginal; const fe = M.f_edges; const df = fe[1] - fe[0];
    P.linePlot($('#s6-marg'), { series: STAGES.map(st => ({ y: Float64Array.from(M.marginal[st], v => Math.log10(v + 1e-3)), color: stColor(st), width: 1.5, label: st })), height: 200, x0: fe[0] + df / 2, dx: df, xRange: [0, 30], xLabel: 'Hz', yLabel: 'log10(µV²)', xTicks: 10, hover: ({ x }) => `${x.toFixed(1)} Hz` });
    const peak = st => { const a = M.marginal[st]; let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return fe[k] + df / 2; };
    $('#s6-marg-cap').innerHTML = `各分期所有 epoch 的 Hilbert 邊際譜平均（對數座標）。峰值頻率：W ${peak('W')} Hz、N1 ${peak('N1')} Hz、N2 ${peak('N2')} Hz、N3 ${peak('N3')} Hz、REM ${peak('REM')} Hz。N3 在低頻的能量高出其他分期約 ${(Math.log10(M.marginal.N3[1] / M.marginal.W[1])).toFixed(1)} 個數量級（1 Hz 附近，N3 vs W）。`;
  }
  $('#s6-src').textContent = `分析視窗：epoch ${N.meta.window_epochs[0]}–${N.meta.window_epochs[1]}（共 ${n} 個 30 秒 epoch，${hours.toFixed(1)} 小時）。離線計算：scripts/prepare_data.py，與網頁端同一套 EMD 規則。`;
  draw(); redraws.add(draw);
}
function groupedBars(canvas, stats, K) {
  const T = P.theme(); const { ctx, w, h } = P.setupCanvas(canvas, 200);
  const pad = { l: 40, r: 8, t: 8, b: 26 }; const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  ctx.clearRect(0, 0, w, h);
  const gw = pw / STAGES.length, bw = (gw - 10) / K;
  ctx.font = `10.5px ${T.font}`; ctx.fillStyle = T.text2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, .25, .5, .75].forEach(v => { const y = pad.t + ph - v * ph; ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(pad.l, y + .5); ctx.lineTo(w - pad.r, y + .5); ctx.stroke(); ctx.fillText((v * 100) + '%', pad.l - 5, y); });
  STAGES.forEach((st, si) => {
    const x0 = pad.l + si * gw + 5;
    for (let k = 0; k < K; k++) { const v = stats[st].e[k]; const bh = v * ph / 0.75; ctx.fillStyle = imfColor(k); ctx.fillRect(x0 + k * bw + 1, pad.t + ph - bh, bw - 2, bh); }
    ctx.fillStyle = stColor(st); ctx.fillRect(x0, pad.t + ph + 6, gw - 10, 3);
    ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `600 11px ${cssv('--font-sans')}`; ctx.fillText(st, x0 + (gw - 10) / 2, pad.t + ph + 11);
  });
  ctx.strokeStyle = T.axis; ctx.beginPath(); ctx.moveTo(pad.l + .5, pad.t); ctx.lineTo(pad.l + .5, pad.t + ph + .5); ctx.lineTo(w - pad.r, pad.t + ph + .5); ctx.stroke();
  ctx.fillStyle = T.text2; ctx.font = `10px ${T.font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('每組由左至右 IMF 1 → 6', pad.l + 4, pad.t);
}

// ---------------------------------------------------------------- S7：文獻
function s7() {
  const box = $('#papers');
  const groups = [['method', '方法奠基'], ['staging', 'EEG 自動睡眠分期'], ['spindle', '睡眠紡錘波偵測'], ['tw', '台灣／黃鍔團隊：睡眠微結構與腦–心交互'], ['osa', '睡眠呼吸中止：ECG／HRV／血氧／呼吸']];
  function render(filter) {
    box.innerHTML = '';
    groups.forEach(([g, name]) => {
      if (filter !== 'all' && filter !== g) return;
      const list = PAPERS.filter(p => p.g === g).sort((a, b) => a.year - b.year);
      box.appendChild(el('div', { className: 'grp' }, `${name} <span class="small" style="font-family:var(--font-mono)">${list.length} 篇</span>`));
      const wrap = el('div', { className: 'papers' });
      list.forEach(p => {
        wrap.appendChild(el('article', { className: 'paper' }, `
          <div class="tag">${p.tag} · ${p.year}</div>
          <div class="title"><a href="https://doi.org/${p.doi}" target="_blank" rel="noopener">${p.title}</a></div>
          <div class="cite">${p.authors}. <i>${p.venue}</i>. doi:${p.doi}</div>
          <p class="sum">${p.sum}</p>
          ${(p.nums || []).map(nn => `<span class="num ${nn.flag ? 'flag' : ''}">${nn.t}${nn.flag ? ' ⚠ 轉述／待確認' : ''}</span>`).join('')}`));
      });
      box.appendChild(wrap);
    });
  }
  $('#lit-filter').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { $('#lit-filter').querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(b.dataset.v); }));
  render('all');
}

// ---------------------------------------------------------------- 方法區
function method() {
  const E = DATA.epochs.epochs;
  $('#method-epochs').innerHTML = STAGES.map(s => `<span class="dot" style="background:${stColor(s)}"></span> <b>${s}</b> epoch #${E[s].epoch_index}（${E[s].clock}，候選 ${E[s].n_candidates} 個）`).join('　');
  fetch('data/validation.json').then(r => r.ok ? r.json() : null).then(v => {
    if (!v) return;
    $('#method-xcheck').innerHTML = `同一個 ${v.epoch} epoch（${v.n} 點）分別以網頁端 JavaScript 與 Python 實作分解：IMF 數目 ${v.js_n_imf} vs ${v.py_n_imf}，前 ${v.compared} 個 IMF 逐點最大絕對差 <b>${v.max_abs_diff_uV.toExponential(2)} µV</b>（訊號標準差 ${v.signal_std_uV.toFixed(1)} µV）。檢查日期 ${v.date}。`;
  }).catch(() => {});
}

// ---------------------------------------------------------------- 啟動
(async function main() {
  const [epochs, night, marginal] = await Promise.all(['data/epochs.json', 'data/night.json', 'data/marginal.json'].map(u => fetch(u).then(r => r.json())));
  Object.assign(DATA, { epochs, night, marginal });
  hero(); s1(); s2(); s4(); s5(); s6(); s7(); method();
})().catch(err => { console.error(err); $('#hero-cap').textContent = '資料載入失敗：' + err.message; });
