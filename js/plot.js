// plot.js — 極簡 Canvas 繪圖工具（線圖、熱圖、階梯圖），支援 HiDPI、深淺色主題、hover 十字線
const css = (name, el = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();

export const theme = () => ({
  surface: css('--surface-1'),
  text: css('--text-primary'),
  text2: css('--text-secondary'),
  muted: css('--text-muted'),
  grid: css('--grid'),
  axis: css('--axis'),
  series: [1, 2, 3, 4, 5, 6, 7, 8].map(i => css(`--series-${i}`)),
  accent: css('--accent'),
  font: css('--font-mono') || 'ui-monospace, monospace',
});

export function setupCanvas(canvas, heightCss) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  const h = heightCss || canvas.clientHeight || 160;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

function niceStep(range, target = 5) {
  const raw = range / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / p;
  const s = r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10;
  return s * p;
}

export function fmt(v) {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1).replace(/\.0$/, '');
  if (Math.abs(v) >= 1) return v.toFixed(1).replace(/\.0$/, '');
  return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * 線圖
 * opts: { series:[{y, color, width, dash, alpha, label}], x0, dx, xRange, yRange, yPad,
 *         markers:[{i, color, r, shape}], height, xLabel, yLabel, grid, yTicks, xTicks, symmetric,
 *         bands:[{x0,x1,color}], hover(fn), title, hlines:[{y,color,dash}] }
 */
export function linePlot(canvas, opts) {
  const T = theme();
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 160);
  const pad = { l: opts.padL ?? 44, r: 10, t: opts.title ? 22 : 8, b: opts.xLabel ? 30 : 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const series = opts.series.filter(s => s && s.y);
  const n = Math.max(...series.map(s => s.y.length));
  const dx = opts.dx ?? 1, x0 = opts.x0 ?? 0;
  const xr = opts.xRange || [x0, x0 + (n - 1) * dx];
  let yr = opts.yRange;
  if (!yr) {
    let mn = Infinity, mx = -Infinity;
    for (const s of series) for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (!isFinite(v)) continue; if (v < mn) mn = v; if (v > mx) mx = v; }
    if (!isFinite(mn)) { mn = -1; mx = 1; }
    if (opts.symmetric) { const a = Math.max(Math.abs(mn), Math.abs(mx)) || 1; mn = -a; mx = a; }
    const padY = (mx - mn || 1) * (opts.yPad ?? 0.08);
    yr = [mn - padY, mx + padY];
  }
  const X = x => pad.l + (x - xr[0]) / (xr[1] - xr[0]) * pw;
  const Y = y => pad.t + (1 - (y - yr[0]) / (yr[1] - yr[0])) * ph;

  ctx.clearRect(0, 0, w, h);
  // bands
  for (const b of opts.bands || []) {
    ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), pad.t, X(b.x1) - X(b.x0), ph);
  }
  // grid + ticks
  ctx.font = `10.5px ${T.font}`; ctx.fillStyle = T.text2; ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  const ys = niceStep(yr[1] - yr[0], opts.yTicks || 4);
  for (let v = Math.ceil(yr[0] / ys) * ys; v <= yr[1] + 1e-9; v += ys) {
    const yy = Math.round(Y(v)) + 0.5;
    if (opts.grid !== false) { ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(Math.abs(v) < 1e-9 ? 0 : v), pad.l - 6, yy);
  }
  const xs = niceStep(xr[1] - xr[0], opts.xTicks || 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = Math.ceil(xr[0] / xs) * xs; v <= xr[1] + 1e-9; v += xs) {
    const xx = Math.round(X(v)) + 0.5;
    ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(xx, pad.t + ph); ctx.lineTo(xx, pad.t + ph + 4); ctx.stroke();
    ctx.fillStyle = T.text2; ctx.fillText(fmt(v), xx, pad.t + ph + 6);
  }
  // axes
  ctx.strokeStyle = T.axis; ctx.beginPath(); ctx.moveTo(pad.l + 0.5, pad.t); ctx.lineTo(pad.l + 0.5, pad.t + ph + 0.5); ctx.lineTo(w - pad.r, pad.t + ph + 0.5); ctx.stroke();
  // hlines
  for (const hl of opts.hlines || []) {
    ctx.save(); ctx.strokeStyle = hl.color || T.muted; ctx.setLineDash(hl.dash || [4, 4]); ctx.beginPath();
    ctx.moveTo(pad.l, Y(hl.y) + 0.5); ctx.lineTo(w - pad.r, Y(hl.y) + 0.5); ctx.stroke(); ctx.restore();
  }
  // labels
  if (opts.xLabel) { ctx.fillStyle = T.text2; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(opts.xLabel, pad.l + pw / 2, h - 2); }
  if (opts.yLabel) { ctx.save(); ctx.translate(10, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = T.text2; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
  if (opts.title) { ctx.fillStyle = T.text; ctx.font = `600 12px ${css('--font-sans')}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(opts.title, pad.l, 2); }
  // series
  ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t - 2, pw, ph + 4); ctx.clip();
  series.forEach((s, si) => {
    const color = s.color || T.series[si % 8];
    ctx.globalAlpha = s.alpha ?? 1;
    if (s.fill) {
      ctx.fillStyle = color; ctx.globalAlpha = s.fillAlpha ?? 0.15; ctx.beginPath();
      ctx.moveTo(X(x0), Y(0));
      for (let i = 0; i < s.y.length; i++) ctx.lineTo(X(x0 + i * dx), Y(s.y[i]));
      ctx.lineTo(X(x0 + (s.y.length - 1) * dx), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = s.alpha ?? 1;
    }
    ctx.strokeStyle = color; ctx.lineWidth = s.width ?? 1.5; ctx.setLineDash(s.dash || []);
    ctx.lineJoin = 'round';
    const step = Math.max(1, Math.floor(s.y.length / (pw * 3)));
    ctx.beginPath();
    for (let i = 0; i < s.y.length; i += step) {
      const px = X(x0 + i * dx), py = Y(s.y[i]);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);
  });
  ctx.globalAlpha = 1;
  for (const m of opts.markers || []) {
    const s = series[m.s || 0];
    const px = X(x0 + m.i * dx), py = Y(m.y ?? s.y[m.i]);
    ctx.fillStyle = m.color; ctx.strokeStyle = T.surface; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (m.shape === 'tri-down') { ctx.moveTo(px, py + 5); ctx.lineTo(px - 4.5, py - 3); ctx.lineTo(px + 4.5, py - 3); ctx.closePath(); }
    else if (m.shape === 'tri-up') { ctx.moveTo(px, py - 5); ctx.lineTo(px - 4.5, py + 3); ctx.lineTo(px + 4.5, py + 3); ctx.closePath(); }
    else ctx.arc(px, py, m.r || 3.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // legend
  const labeled = series.filter(s => s.label);
  if (labeled.length >= 2 || opts.legend) {
    ctx.font = `10.5px ${css('--font-sans')}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let lx = w - pad.r - 4;
    const items = labeled.map((s, i) => ({ s, i: series.indexOf(s) }));
    const widths = items.map(it => ctx.measureText(it.s.label).width + 18);
    lx -= widths.reduce((a, b) => a + b, 0);
    items.forEach((it, k) => {
      ctx.fillStyle = it.s.color || T.series[it.i % 8]; ctx.fillRect(lx, pad.t + 4, 10, 3);
      ctx.fillStyle = T.text2; ctx.fillText(it.s.label, lx + 14, pad.t + 5.5);
      lx += widths[k];
    });
  }
  const state = { X, Y, xr, yr, pad, pw, ph, w, h, x0, dx, series };
  canvas._plot = state;
  if (opts.hover) attachHover(canvas, opts.hover);
  return state;
}

function attachHover(canvas, fn) {
  if (canvas._hoverBound) { canvas._hoverFn = fn; return; }
  canvas._hoverBound = true; canvas._hoverFn = fn;
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  const move = e => {
    const st = canvas._plot; if (!st) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px < st.pad.l || px > st.w - st.pad.r || py < st.pad.t || py > st.pad.t + st.ph) { tip.hidden = true; return; }
    const xv = st.xr[0] + (px - st.pad.l) / st.pw * (st.xr[1] - st.xr[0]);
    const i = Math.round((xv - st.x0) / st.dx);
    const html = canvas._hoverFn({ i, x: xv, px, py, state: st });
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html; tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tw - 8) + 'px';
    tip.style.top = (e.clientY + 14) + 'px';
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
}

// 單色序列 colormap（surface → 深藍），可傳入自訂 stops
export function makeCmap(stops) {
  const parse = c => {
    c = (c || '').trim();
    let m = c.match(/#([0-9a-f]{6})/i);
    if (m) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    return [0, 0, 0];
  };
  const rgb = stops.map(parse);
  return t => {
    t = Math.min(1, Math.max(0, t)) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(t)), f = t - i;
    const a = rgb[i], b = rgb[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
}

/**
 * 熱圖：grid[fi*nT+ti]，fi=0 在底部
 * opts: { nF, nT, fMax, duration, height, log, gamma, title, xLabel, yLabel, vmax, cmapStops, hover }
 */
export function heatmap(canvas, grid, opts) {
  const T = theme();
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 200);
  const pad = { l: 44, r: 10, t: opts.title ? 22 : 8, b: opts.xLabel ? 30 : 18 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const { nF, nT } = opts;
  const stops = opts.cmapStops || [css('--heat-0') || T.surface, css('--heat-1'), css('--heat-2'), css('--heat-3'), css('--heat-4')];
  const cmap = makeCmap(stops);
  let vmax = opts.vmax;
  if (!vmax) { const sorted = Float64Array.from(grid).sort(); vmax = sorted[Math.floor(sorted.length * 0.995)] || 1; }
  const off = document.createElement('canvas'); off.width = nT; off.height = nF;
  const octx = off.getContext('2d');
  const img = octx.createImageData(nT, nF);
  const log = opts.log !== false, gamma = opts.gamma ?? 0.6;
  for (let fi = 0; fi < nF; fi++) for (let ti = 0; ti < nT; ti++) {
    let v = grid[fi * nT + ti] / vmax;
    v = log ? Math.log10(1 + 9 * Math.min(1, v)) : Math.pow(Math.min(1, v), gamma);
    const [r, g, b] = cmap(v);
    const p = ((nF - 1 - fi) * nT + ti) * 4;
    img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = opts.smooth ?? true;
  ctx.drawImage(off, pad.l, pad.t, pw, ph);
  // axes
  ctx.font = `10.5px ${T.font}`; ctx.fillStyle = T.text2; ctx.strokeStyle = T.axis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l + 0.5, pad.t); ctx.lineTo(pad.l + 0.5, pad.t + ph + 0.5); ctx.lineTo(w - pad.r, pad.t + ph + 0.5); ctx.stroke();
  const fs = niceStep(opts.fMax, 5);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let f = 0; f <= opts.fMax + 1e-9; f += fs) { const yy = pad.t + ph - f / opts.fMax * ph; ctx.fillText(fmt(f), pad.l - 6, yy); }
  const dur = opts.duration || nT;
  const ts = niceStep(dur, 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let t = 0; t <= dur + 1e-9; t += ts) { const xx = pad.l + t / dur * pw; ctx.fillText(fmt(t), xx, pad.t + ph + 6); }
  if (opts.xLabel) { ctx.textBaseline = 'bottom'; ctx.fillText(opts.xLabel, pad.l + pw / 2, h - 2); }
  if (opts.yLabel) { ctx.save(); ctx.translate(10, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
  if (opts.title) { ctx.fillStyle = T.text; ctx.font = `600 12px ${css('--font-sans')}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(opts.title, pad.l, 2); }
  // overlay lines (e.g. instantaneous frequency traces)
  if (opts.overlays) {
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
    for (const o of opts.overlays) {
      ctx.strokeStyle = o.color; ctx.lineWidth = o.width || 1; ctx.globalAlpha = o.alpha ?? 0.9; ctx.beginPath();
      const n = o.y.length; let pen = false;
      for (let i = 0; i < n; i++) {
        const f = o.y[i]; if (!(f >= 0 && f <= opts.fMax)) { pen = false; continue; }
        const px = pad.l + i / (n - 1) * pw, py = pad.t + ph - f / opts.fMax * ph;
        pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true;
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  canvas._plot = { pad, pw, ph, w, h, xr: [0, dur], yr: [0, opts.fMax], x0: 0, dx: dur / nT, X: x => pad.l + x / dur * pw, Y: y => pad.t + ph - y / opts.fMax * ph };
  if (opts.hover) attachHover(canvas, opts.hover);
}

/** 階梯圖（hypnogram） levels: 依序由上到下的類別名稱 */
export function stepPlot(canvas, cats, opts) {
  const T = theme();
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 120);
  const levels = opts.levels; // e.g. ['W','REM','N1','N2','N3']
  const pad = { l: 44, r: 10, t: 6, b: opts.xLabel ? 28 : 16 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const n = cats.length;
  const X = i => pad.l + i / n * pw;
  const Y = lv => pad.t + (lv + 0.5) / levels.length * ph;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `10.5px ${T.font}`; ctx.fillStyle = T.text2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  levels.forEach((lv, k) => { ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(pad.l, Y(k) + 0.5); ctx.lineTo(w - pad.r, Y(k) + 0.5); ctx.stroke(); ctx.fillText(lv, pad.l - 6, Y(k)); });
  // highlight band
  if (opts.highlight != null) { ctx.fillStyle = T.accent; ctx.globalAlpha = 0.25; ctx.fillRect(X(opts.highlight), pad.t, Math.max(2, pw / n), ph); ctx.globalAlpha = 1; }
  ctx.strokeStyle = opts.color || T.text; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
  let started = false;
  for (let i = 0; i < n; i++) {
    const k = levels.indexOf(cats[i]);
    if (k < 0) { started = false; continue; }
    const y = Y(k);
    if (!started) { ctx.moveTo(X(i), y); started = true; }
    else ctx.lineTo(X(i), y);
    ctx.lineTo(X(i + 1), y);
  }
  ctx.stroke();
  // REM emphasize
  if (opts.remColor) {
    ctx.strokeStyle = opts.remColor; ctx.lineWidth = 3;
    for (let i = 0; i < n; i++) if (cats[i] === 'REM') { ctx.beginPath(); ctx.moveTo(X(i), Y(levels.indexOf('REM'))); ctx.lineTo(X(i + 1), Y(levels.indexOf('REM'))); ctx.stroke(); }
  }
  // x ticks (hours)
  const dur = opts.duration || n; const ts = niceStep(dur, 8);
  ctx.fillStyle = T.text2; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let t = 0; t <= dur + 1e-9; t += ts) { const xx = pad.l + t / dur * pw; ctx.fillText(opts.xFmt ? opts.xFmt(t) : fmt(t), xx, pad.t + ph + 5); }
  if (opts.xLabel) { ctx.textBaseline = 'bottom'; ctx.fillText(opts.xLabel, pad.l + pw / 2, h - 1); }
  canvas._plot = { pad, pw, ph, w, h, xr: [0, dur], yr: [0, 1], x0: 0, dx: dur / n, X: t => pad.l + t / dur * pw, Y: () => 0 };
  if (opts.hover) attachHover(canvas, opts.hover);
}

/** 堆疊面積（IMF 能量比隨 epoch 變化） rows: array of Float arrays (each length n), 值為比例 */
export function stackedArea(canvas, rows, opts) {
  const T = theme();
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 140);
  const pad = { l: 44, r: 10, t: opts.title ? 22 : 6, b: opts.xLabel ? 28 : 16 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const n = rows[0].length;
  const X = i => pad.l + i / (n - 1) * pw;
  const Y = v => pad.t + (1 - v) * ph;
  ctx.clearRect(0, 0, w, h);
  const acc = new Float64Array(n);
  rows.forEach((r, k) => {
    ctx.fillStyle = opts.colors[k]; ctx.beginPath();
    for (let i = 0; i < n; i++) ctx.lineTo(X(i), Y(acc[i]));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(X(i), Y(acc[i] + r[i]));
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < n; i++) acc[i] += r[i];
  });
  if (opts.highlight != null) { ctx.fillStyle = T.text; ctx.globalAlpha = 0.6; ctx.fillRect(X(opts.highlight) - 1, pad.t, 2, ph); ctx.globalAlpha = 1; }
  ctx.font = `10.5px ${T.font}`; ctx.fillStyle = T.text2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 0.5, 1].forEach(v => ctx.fillText((v * 100) + '%', pad.l - 6, Y(v)));
  ctx.strokeStyle = T.axis; ctx.beginPath(); ctx.moveTo(pad.l + 0.5, pad.t); ctx.lineTo(pad.l + 0.5, pad.t + ph + 0.5); ctx.lineTo(w - pad.r, pad.t + ph + 0.5); ctx.stroke();
  const dur = opts.duration || n; const ts = niceStep(dur, 8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let t = 0; t <= dur + 1e-9; t += ts) { const xx = pad.l + t / dur * pw; ctx.fillText(opts.xFmt ? opts.xFmt(t) : fmt(t), xx, pad.t + ph + 5); }
  if (opts.title) { ctx.fillStyle = T.text; ctx.font = `600 12px ${css('--font-sans')}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(opts.title, pad.l, 2); }
  if (opts.xLabel) { ctx.fillStyle = T.text2; ctx.font = `10.5px ${T.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(opts.xLabel, pad.l + pw / 2, h - 1); }
  canvas._plot = { pad, pw, ph, w, h, xr: [0, dur], yr: [0, 1], x0: 0, dx: dur / n, X: t => pad.l + t / dur * pw, Y };
  if (opts.hover) attachHover(canvas, opts.hover);
}

/** 水平條（各 IMF 平均頻率之類的小圖） items:[{label, value, color}] */
export function hbar(canvas, items, opts) {
  const T = theme();
  const rowH = 18;
  const { ctx, w, h } = setupCanvas(canvas, items.length * rowH + 24);
  const pad = { l: 56, r: 40, t: 4, b: 18 };
  const pw = w - pad.l - pad.r;
  const max = opts.max || Math.max(...items.map(i => i.value)) * 1.1 || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `10.5px ${T.font}`; ctx.textBaseline = 'middle';
  items.forEach((it, k) => {
    const y = pad.t + k * rowH;
    ctx.fillStyle = T.text2; ctx.textAlign = 'right'; ctx.fillText(it.label, pad.l - 6, y + rowH / 2);
    ctx.fillStyle = it.color; ctx.fillRect(pad.l, y + 4, Math.max(1, it.value / max * pw), rowH - 8);
    ctx.fillStyle = T.text2; ctx.textAlign = 'left'; ctx.fillText(it.text ?? fmt(it.value), pad.l + it.value / max * pw + 5, y + rowH / 2);
  });
  ctx.strokeStyle = T.axis; ctx.beginPath(); ctx.moveTo(pad.l + 0.5, pad.t); ctx.lineTo(pad.l + 0.5, pad.t + items.length * rowH); ctx.stroke();
  if (opts.xLabel) { ctx.fillStyle = T.text2; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(opts.xLabel, pad.l + pw / 2, h - 1); }
}
