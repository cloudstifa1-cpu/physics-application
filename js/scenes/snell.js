// Snell's law scene: light ray crossing between two materials.
// The light pulse moves slower in the denser material (v = c / n).
const MATERIALS = [[1.00, 'air'], [1.33, 'water'], [1.47, 'oil'], [1.52, 'glass'], [1.77, 'sapphire'], [2.42, 'diamond']];
const materialName = n => (MATERIALS.find(([v]) => Math.abs(v - n) <= 0.02) || [])[1] || '';
const DEG = Math.PI / 180;

const SnellScene = {
  id: 'snell',
  title: "Snell's law",
  sliders: [
    { key: 'n1', label: 'n₁ (top)', min: 1, max: 2.5, step: 0.01, value: 1.00, digits: 2 },
    { key: 'n2', label: 'n₂ (bottom)', min: 1, max: 2.5, step: 0.01, value: 1.52, digits: 2 },
    { key: 'theta1', label: 'θ₁ (incoming angle)', min: 0, max: 89, step: 1, value: 40, unit: '°', digits: 0 },
  ],
  params: {},

  compute() {
    const { n1, n2, theta1 } = this.params;
    const r1 = theta1 * DEG;
    const s = n1 * Math.sin(r1) / n2;
    const tir = s > 1;
    const r2 = tir ? null : Math.asin(s);
    let R = 1; // Fresnel reflectance (unpolarized)
    if (!tir) {
      const ci = Math.cos(r1), ct = Math.cos(r2);
      const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2;
      const rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
      R = (rs + rp) / 2;
    }
    return { r1, r2, tir, R, crit: n1 > n2 ? Math.asin(n2 / n1) / DEG : null };
  },

  readouts() {
    const { n1, n2 } = this.params, c = this.compute();
    return [
      ['θ₂ (bent angle)', c.tir ? '<span class="warn">Total internal reflection</span>' : (c.r2 / DEG).toFixed(1) + '°'],
      ['Critical angle', c.crit === null ? 'none (n₁ ≤ n₂)' : c.crit.toFixed(1) + '°'],
      ['Light reflected', (c.R * 100).toFixed(1) + '%'],
      ['Speed top (v = c/n)', (1 / n1).toFixed(3) + ' c'],
      ['Speed bottom', (1 / n2).toFixed(3) + ' c'],
    ];
  },

  draw(ctx, w, h, t) {
    const { n1, n2 } = this.params, c = this.compute();
    const cx = w / 2, cy = h / 2, L = Math.min(w / 2, h / 2) * 0.88;

    // two materials, denser = more blue
    ctx.fillStyle = `rgba(70,150,255,${0.04 + (n1 - 1) * 0.22})`; ctx.fillRect(0, 0, w, cy);
    ctx.fillStyle = `rgba(70,150,255,${0.04 + (n2 - 1) * 0.22})`; ctx.fillRect(0, cy, w, h - cy);
    line(ctx, 0, cy, w, cy, '#ffffff', 2);
    ctx.setLineDash([8, 8]); line(ctx, cx, cy - L, cx, cy + L, '#cfd8e3', 1.5); ctx.setLineDash([]);

    const P0 = [cx - L * Math.sin(c.r1), cy - L * Math.cos(c.r1)];
    const PR = [cx + L * Math.sin(c.r1), cy - L * Math.cos(c.r1)];
    const P2 = c.tir ? null : [cx + L * Math.sin(c.r2), cy + L * Math.cos(c.r2)];

    // rays
    line(ctx, P0[0], P0[1], cx, cy, '#ffd54a', 3.5);
    ctx.globalAlpha = c.tir ? 1 : Math.max(0.2, Math.min(1, c.R * 4));
    line(ctx, cx, cy, PR[0], PR[1], '#ffd54a', c.tir ? 3.5 : 2);
    ctx.globalAlpha = 1;
    if (P2) line(ctx, cx, cy, P2[0], P2[1], '#ffd54a', 3.5);

    // moving light pulses: travel time in each material is proportional to n
    const out = P2 || PR, nOut = P2 ? n2 : n1;
    const T1 = n1, T2 = nOut, total = T1 + T2;
    for (let k = 0; k < 4; k++) {
      const u = ((t * 0.25 + k / 4) % 1) * total;
      const [x, y] = u < T1 ? lerp(P0, [cx, cy], u / T1) : lerp([cx, cy], out, (u - T1) / T2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }

    // angle arcs + labels
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6dffa8'; ctx.beginPath(); ctx.arc(cx, cy, 52, -Math.PI / 2 - c.r1, -Math.PI / 2); ctx.stroke();
    label(ctx, 'θ₁', cx + 74 * Math.cos(-Math.PI / 2 - c.r1 / 2), cy + 74 * Math.sin(-Math.PI / 2 - c.r1 / 2), '#6dffa8');
    if (P2) {
      ctx.strokeStyle = '#ff8cf0'; ctx.beginPath(); ctx.arc(cx, cy, 52, Math.PI / 2 - c.r2, Math.PI / 2); ctx.stroke();
      label(ctx, 'θ₂', cx + 74 * Math.cos(Math.PI / 2 - c.r2 / 2), cy + 74 * Math.sin(Math.PI / 2 - c.r2 / 2), '#ff8cf0');
    }

    ctx.textAlign = 'left';
    label(ctx, `n₁ = ${n1.toFixed(2)} ${materialName(n1)}`, 16, 28, '#ffffff', 'left');
    label(ctx, `n₂ = ${n2.toFixed(2)} ${materialName(n2)}`, 16, h - 18, '#ffffff', 'left');
    if (c.tir) label(ctx, 'Total internal reflection', w / 2, cy + 36, '#ffb347');
  },

  // θ₂ vs θ₁ for the current materials
  graph(ctx, w, h) {
    const c = this.compute(), { n1, n2, theta1 } = this.params;
    const ax = axes(ctx, w, h, 0, 90, 0, 90, 'θ₁ (°)', 'θ₂ (°)');
    ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2.5; ctx.beginPath();
    let started = false;
    for (let a = 0; a <= 90; a += 0.5) {
      const s = n1 * Math.sin(a * DEG) / n2;
      if (s > 1) break;
      const [x, y] = ax(a, Math.asin(s) / DEG);
      started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true;
    }
    ctx.stroke();
    if (c.crit !== null) {
      const [x] = ax(c.crit, 0), [, yTop] = ax(0, 90), [, yBot] = ax(0, 0);
      ctx.setLineDash([5, 5]); line(ctx, x, yTop, x, yBot, '#ffb347', 1.5); ctx.setLineDash([]);
    }
    if (!c.tir) {
      const [x, y] = ax(theta1, c.r2 / DEG);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    }
  },
};

// ---- shared drawing helpers (also used by graph.js) ----
function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function lerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
function label(ctx, text, x, y, color, align = 'center') {
  ctx.font = '600 18px system-ui, sans-serif'; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
// Draws axes and returns a function mapping data (x,y) -> pixels.
function axes(ctx, w, h, x0, x1, y0, y1, xLabel, yLabel) {
  const L = 64, R = 20, T = 30, B = 30;
  const map = (x, y) => [L + (x - x0) / (x1 - x0) * (w - L - R), h - B - (y - y0) / (y1 - y0) * (h - T - B)];
  ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#e8eef7';
  for (let i = 0; i <= 4; i++) {
    const xv = x0 + (x1 - x0) * i / 4, yv = y0 + (y1 - y0) * i / 4;
    const [gx] = map(xv, y0), [, gy] = map(x0, yv);
    line(ctx, gx, T, gx, h - B, 'rgba(255,255,255,.12)', 1);
    line(ctx, L, gy, w - R, gy, 'rgba(255,255,255,.12)', 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(fmt(xv), gx, h - B + 4);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(yv), L - 6, gy);
  }
  line(ctx, L, T, L, h - B, '#ffffff', 1.5);
  line(ctx, L, h - B, w - R, h - B, '#ffffff', 1.5);
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xLabel, w - R, h - B - 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(yLabel, L + 6, T - 2);
  return map;
}
function fmt(v) {
  const a = Math.abs(v);
  if (a < 1e-12) return '0'; // rounding noise like 4.4e-16
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) return v.toExponential(1);
  return Number(v.toFixed(a >= 100 ? 0 : 2)).toString();
}
