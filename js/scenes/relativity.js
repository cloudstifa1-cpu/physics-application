// Special relativity scenes (Phase 5).
// Speeds are fractions of c (β = v/c). γ = 1/√(1 − β²).
const C_MS = 2.998e8;
const gammaOf = b => 1 / Math.sqrt(1 - b * b);

function drawShip(ctx, x, yc, L, H) {
  const body = L * 0.85, top = yc - H / 2 - 12, bot = yc + H / 2 + 12;
  ctx.fillStyle = '#16304d'; ctx.strokeStyle = '#a8e6ff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, top); ctx.lineTo(x + body, top); ctx.lineTo(x + L, yc);
  ctx.lineTo(x + body, bot); ctx.lineTo(x, bot); ctx.closePath();
  ctx.fill(); ctx.stroke();
}
function lightClock(ctx, xc, yc, H) { // two mirrors of a light clock
  line(ctx, xc - 16, yc - H / 2, xc + 16, yc - H / 2, '#ffffff', 3);
  line(ctx, xc - 16, yc + H / 2, xc + 16, yc + H / 2, '#ffffff', 3);
}
const tri = ph => { ph = ph % 1; return ph < 0.5 ? ph * 2 : 2 - ph * 2; }; // 0→1→0 bounce

// ---------- Time dilation + length contraction (light clock on a moving ship) ----------
const SpacetimeScene = {
  id: 'spacetime',
  title: 'Time dilation and length contraction',
  sliders: [
    { key: 'v', label: 'Ship speed v', min: 0, max: 0.99, step: 0.01, value: 0.6, unit: ' c', digits: 2 },
    { key: 'L0', label: 'Ship rest length L₀', min: 20, max: 100, step: 1, value: 60, unit: ' m', digits: 0 },
    { key: 't0', label: 'Time passed on ship Δt₀', min: 1, max: 50, step: 1, value: 10, unit: ' yr', digits: 0 },
  ],
  params: {},

  readouts() {
    const { v, L0, t0 } = this.params, g = gammaOf(v);
    return [
      ['Lorentz factor γ', g.toFixed(3)],
      ['Earth time Δt = γΔt₀', fmt(g * t0) + ' yr'],
      ['Ship length seen L = L₀/γ', fmt(L0 / g) + ' m'],
      ['Speed', Math.round(v * C_MS / 1000).toLocaleString() + ' km/s'],
      ['Ship clock rate', (100 / g).toFixed(1) + '% of Earth clock'],
    ];
  },

  draw(ctx, w, h, t) {
    const { v, L0 } = this.params, g = gammaOf(v);
    const rowH = h / 2, H = Math.min(90, rowH * 0.42);
    const T0 = 1.4, cpx = 2 * H / T0, T = g * T0;   // light-clock periods: at rest, moving
    const shipLen = Math.max(70, (L0 / 100) * w * 0.45), Lm = shipLen / g;
    const span = w + Lm, start = w * 0.3 + Lm;
    const xAt = tau => ((tau * v * cpx + start) % span) - Lm;   // left edge of moving ship
    const lap = tau => Math.floor((tau * v * cpx + start) / span);

    line(ctx, 0, rowH, w, rowH, '#3d4a5e', 1.5);

    // --- top: moving ship, seen from Earth ---
    const y1 = rowH * 0.56, xs = xAt(t);
    drawShip(ctx, xs, y1, Lm, H);
    lightClock(ctx, xs + Lm * 0.42, y1, H);
    // photon zigzag (its path as Earth sees it)
    ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2.5; ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= 80; k++) {
      const tau = t - 1.5 * T + 1.5 * T * k / 80;
      if (tau < 0 || lap(tau) !== lap(t)) { pen = false; continue; }
      const px = xAt(tau) + Lm * 0.42, py = y1 + H / 2 - tri(tau / T) * H;
      pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true;
    }
    ctx.stroke();
    dot(ctx, xs + Lm * 0.42, y1 + H / 2 - tri(t / T) * H);
    // contracted length marker
    const yl = y1 + H / 2 + 26;
    line(ctx, xs, yl, xs + Lm, yl, '#ff8cf0', 2);
    label(ctx, `L = ${fmt(L0 / g)} m`, xs + Lm / 2, yl + 16, '#ff8cf0');
    label(ctx, 'Moving ship, seen from Earth', 16, 22, '#ffffff', 'left');
    label(ctx, `ship clock ticks: ${Math.floor(t / T)}`, w - 16, 22, '#ffd54a', 'right');

    // --- bottom: the same ship at rest ---
    const y2 = rowH + rowH * 0.56, xr = w / 2 - shipLen / 2;
    drawShip(ctx, xr, y2, shipLen, H);
    lightClock(ctx, xr + shipLen * 0.42, y2, H);
    const pr = [xr + shipLen * 0.42, y2 + H / 2 - tri(t / T0) * H];
    line(ctx, pr[0], y2 - H / 2, pr[0], y2 + H / 2, 'rgba(255,213,74,.5)', 2);
    dot(ctx, ...pr);
    const yl2 = y2 + H / 2 + 26;
    line(ctx, xr, yl2, xr + shipLen, yl2, '#6dffa8', 2);
    label(ctx, `L₀ = ${L0} m`, xr + shipLen / 2, yl2 + 16, '#6dffa8');
    label(ctx, 'Same ship at rest', 16, rowH + 22, '#ffffff', 'left');
    label(ctx, `Earth clock ticks: ${Math.floor(t / T0)}`, w - 16, rowH + 22, '#ffd54a', 'right');
  },

  graph(ctx, w, h) {
    const ax = axes(ctx, w, h, 0, 1, 1, 8, 'v / c', 'γ');
    curve(ctx, ax, 0, 0.99, b => gammaOf(b), '#ffd54a');
    dot(ctx, ...ax(this.params.v, gammaOf(this.params.v)));
  },
};

// ---------- E = mc² and relativistic kinetic energy ----------
const EnergyScene = {
  id: 'energy',
  title: 'Mass–energy',
  sliders: [
    { key: 'm', label: 'Mass m', min: 0.1, max: 100, step: 0.1, value: 1, unit: ' g', digits: 1 },
    { key: 'v', label: 'Speed v', min: 0, max: 0.99, step: 0.01, value: 0.8, unit: ' c', digits: 2 },
  ],
  params: {},

  readouts() {
    const { m, v } = this.params, kg = m / 1000, E0 = kg * C_MS ** 2, g = gammaOf(v);
    const tnt = E0 / 4.184e9;
    return [
      ['Rest energy E = mc²', E0.toExponential(2) + ' J'],
      ['As TNT', tnt >= 1000 ? fmt(tnt / 1000) + ' kilotons' : fmt(tnt) + ' tons'],
      ['US homes powered for a year', fmt(E0 / 3.78e10)],
      ['Total energy E = γmc²', (g * E0).toExponential(2) + ' J'],
      ['Kinetic (γ − 1)mc²', ((g - 1) * E0).toExponential(2) + ' J'],
      ["Newton's ½mv²", (0.5 * kg * (v * C_MS) ** 2).toExponential(2) + ' J'],
    ];
  },

  draw(ctx, w, h, t) {
    const { m, v } = this.params, g = gammaOf(v);
    // moving particle with streak
    const y = h * 0.2, x0 = 30, run = w - 60, x = x0 + ((t * v * 0.35) % 1) * run;
    if (v > 0) {
      ctx.strokeStyle = 'rgba(255,213,74,.5)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(Math.max(x0, x - v * 160), y); ctx.lineTo(x, y); ctx.stroke();
    }
    const r = 8 + 10 * Math.cbrt(m / 100);
    ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    label(ctx, `${m.toFixed(1)} g at ${v.toFixed(2)} c`, 16, h * 0.2 - r - 22, '#ffffff', 'left');

    // energy bars in units of mc²
    const bars = [['Rest energy mc²', 1, '#6dffa8'], ['Kinetic (relativity)', g - 1, '#ffd54a'], ["Kinetic (Newton's guess)", 0.5 * v * v, '#4fc3ff']];
    const max = Math.max(...bars.map(b => b[1]), 1), bx = 16, bw = w - 140;
    bars.forEach(([name, val, col], i) => {
      const by = h * 0.42 + i * Math.min(70, h * 0.17);
      label(ctx, name, bx, by, '#ffffff', 'left');
      ctx.fillStyle = col; ctx.fillRect(bx, by + 14, Math.max(2, bw * val / max), 22);
      label(ctx, `${val.toFixed(3)} mc²`, bx + Math.max(2, bw * val / max) + 8, by + 25, '#ffffff', 'left');
    });
    if (v > 0.5) label(ctx, 'Above ~0.5c, Newton badly underestimates the energy', w / 2, h - 18, '#ffb347');
  },

  graph(ctx, w, h) {
    const ax = axes(ctx, w, h, 0, 1, 0, 6, 'v / c', 'KE / mc²');
    curve(ctx, ax, 0, 0.99, b => gammaOf(b) - 1, '#ffd54a');
    ctx.setLineDash([6, 5]); curve(ctx, ax, 0, 0.99, b => 0.5 * b * b, '#4fc3ff'); ctx.setLineDash([]);
    dot(ctx, ...ax(this.params.v, gammaOf(this.params.v) - 1));
  },
};

// ---------- Relativistic velocity addition ----------
const VelAddScene = {
  id: 'veladd',
  title: 'Velocity addition',
  sliders: [
    { key: 'v', label: 'Ship speed v (from Earth)', min: 0, max: 0.99, step: 0.01, value: 0.6, unit: ' c', digits: 2 },
    { key: 'u', label: 'Probe speed u (from ship)', min: 0, max: 0.99, step: 0.01, value: 0.6, unit: ' c', digits: 2 },
  ],
  params: {},
  res() { const { u, v } = this.params; return (u + v) / (1 + u * v); },

  readouts() {
    const { u, v } = this.params, r = this.res();
    return [
      ['Probe speed from Earth w', r.toFixed(3) + ' c'],
      ["Newton's guess u + v", (u + v).toFixed(2) + ' c' + (u + v >= 1 ? ' <span class="warn">(faster than light)</span>' : '')],
      ['Formula', 'w = (u + v) / (1 + uv/c²)'],
    ];
  },

  draw(ctx, w, h, t) {
    const { u, v } = this.params, r = this.res();
    const narrow = w < 500, x0 = narrow ? 24 : Math.min(170, w * 0.32), cpx = (w - x0 - 20) / 4, tau = t % 5;
    const lanes = [['Light (c)', 1, '#ffffff'], ['Probe (true)', r, '#ff8cf0'], ["Newton's guess", u + v, '#4fc3ff'], ['Ship', v, '#a8e6ff']];
    lanes.forEach(([name, s, col], i) => {
      const y = h * (0.18 + i * 0.2);
      line(ctx, x0, y, w - 10, y, 'rgba(255,255,255,.15)', 1);
      narrow ? label(ctx, name, x0 + 8, y - 20, col, 'left') : label(ctx, name, 14, y, col, 'left');
      const x = x0 + s * cpx * Math.min(tau, 4);
      if (i === 3) { drawShip(ctx, x - 40, y, 50, 14); return; }
      line(ctx, x0, y, Math.min(x, w - 10), y, col, i === 2 ? 1.5 : 3);
      if (x > w - 10) { label(ctx, 'off the chart ▶', w - 14, y - 18, col, 'right'); return; }
      if (i === 2) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); }
    });
    line(ctx, x0, h * 0.08, x0, h * 0.86, '#6dffa8', 2);
    label(ctx, 'launch', narrow ? x0 - 6 : x0, h * 0.93, '#6dffa8', narrow ? 'left' : 'center');
  },

  graph(ctx, w, h) {
    const { v, u } = this.params;
    const ax = axes(ctx, w, h, 0, 1, 0, 2, 'u / c', 'w / c');
    ctx.setLineDash([5, 5]);
    line(ctx, ...ax(0, 1), ...ax(1, 1), '#ffb347', 1.5);
    curve(ctx, ax, 0, 0.99, x => x + v, '#4fc3ff');
    ctx.setLineDash([]);
    curve(ctx, ax, 0, 0.99, x => (x + v) / (1 + x * v), '#ff8cf0');
    dot(ctx, ...ax(u, this.res()));
  },
};

function dot(ctx, x, y) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
function curve(ctx, ax, a, b, f, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200, [px, py] = ax(x, f(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
}
