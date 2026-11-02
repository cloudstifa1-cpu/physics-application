// Thermodynamics scenes (Phase 3): ideal gas, first law, specific heat.
const R_GAS = 8.314; // J/(mol·K)

// Color from cold blue (frac 0) to hot red (frac 1).
const tempColor = (frac, a = 1) => `hsla(${200 - 200 * Math.max(0, Math.min(1, frac))},100%,62%,${a})`;

// Bouncing particle gas inside a box of size W×H (pixels).
function makeGas() {
  const ps = [];
  return {
    hits: 0,
    step(dt, N, W, H, speed, pistonSide) {
      while (ps.length < N) ps.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * Math.PI * 2, s: 0.55 + Math.random() * 0.9 });
      ps.length = N;
      const r = 4;
      ps.forEach(p => {
        p.x += Math.cos(p.a) * speed * p.s * dt;
        p.y += Math.sin(p.a) * speed * p.s * dt;
        if (p.x < r) { p.x = r; p.a = Math.PI - p.a; }
        if (p.x > W - r) { p.x = W - r; p.a = Math.PI - p.a; if (pistonSide === 'right') this.hits++; }
        if (p.y < r) { p.y = r; p.a = -p.a; if (pistonSide === 'top') this.hits++; }
        if (p.y > H - r) { p.y = H - r; p.a = -p.a; }
      });
    },
    draw(ctx, ox, oy, color) {
      ctx.fillStyle = color;
      ps.forEach(p => { ctx.beginPath(); ctx.arc(ox + p.x, oy + p.y, 4, 0, Math.PI * 2); ctx.fill(); });
    },
  };
}

// Frame time helper: freezes when paused (t stops changing).
function frameDt(scene, t) {
  const dt = scene._t === undefined ? 0 : Math.max(0, Math.min(0.05, t - scene._t));
  scene._t = t;
  return dt;
}

function bigArrow(ctx, x1, y1, x2, y2, color, width) {
  line(ctx, x1, y1, x2, y2, color, width);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 8 + width;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x2 + Math.cos(a) * s * 0.6, y2 + Math.sin(a) * s * 0.6);
  ctx.lineTo(x2 + Math.cos(a + 2.4) * s, y2 + Math.sin(a + 2.4) * s);
  ctx.lineTo(x2 + Math.cos(a - 2.4) * s, y2 + Math.sin(a - 2.4) * s);
  ctx.closePath(); ctx.fill();
}

// ---------------- Ideal gas: PV = nRT ----------------
const GasScene = {
  id: 'gas',
  title: 'Ideal gas law',
  sliders: [
    { key: 'n', label: 'Amount n', min: 0.5, max: 4, step: 0.1, value: 1, unit: ' mol', digits: 1 },
    { key: 'T', label: 'Temperature T', min: 100, max: 800, step: 10, value: 300, unit: ' K', digits: 0 },
    { key: 'V', label: 'Volume V', min: 5, max: 50, step: 0.5, value: 24.5, unit: ' L', digits: 1 },
  ],
  params: {},
  gas: makeGas(),
  P() { const { n, T, V } = this.params; return n * R_GAS * T / V; }, // kPa when V is in liters

  readouts() {
    const { n, T } = this.params, P = this.P();
    return [
      ['Pressure P = nRT/V', fmt(P) + ' kPa'],
      ['In atmospheres', (P / 101.325).toFixed(2) + ' atm'],
      ['Molecules N = n·Nₐ', (n * 6.022e23).toExponential(2)],
      ['rms speed (N₂ gas)', Math.round(Math.sqrt(3 * R_GAS * T / 0.028)) + ' m/s'],
    ];
  },

  draw(ctx, w, h, t) {
    const dt = frameDt(this, t), { n, T, V } = this.params, P = this.P();
    const x0 = w * 0.07, top = h * 0.2, bot = h * 0.8, H = bot - top;
    const maxW = w * 0.66, W = maxW * V / 50;
    const hot = (T - 100) / 700;

    ctx.fillStyle = tempColor(hot, 0.14); ctx.fillRect(x0, top, W, H);
    this.gas.step(dt, Math.round(n * 30), W, H, 70 * Math.sqrt(T / 300), 'right');
    this.gas.draw(ctx, x0, top, tempColor(hot));

    // cylinder walls
    line(ctx, x0, top, x0 + maxW + 24, top, '#ffffff', 4);
    line(ctx, x0, bot, x0 + maxW + 24, bot, '#ffffff', 4);
    line(ctx, x0, top, x0, bot, '#ffffff', 4);

    // piston (flashes when hit) + rod
    const flash = Math.min(1, this.gas.hits / 6); this.gas.hits *= 0.85;
    ctx.fillStyle = `rgb(${150 + flash * 105},${160 + flash * 60},${175})`;
    ctx.fillRect(x0 + W, top + 2, 16, H - 4);
    line(ctx, x0 + W + 16, (top + bot) / 2, w * 0.82, (top + bot) / 2, '#cfd8e3', 6);

    // pressure gauge
    const gx = w - 60, frac = Math.min(1, P / 5400);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(gx, top, 26, H);
    ctx.fillStyle = tempColor(frac); ctx.fillRect(gx + 2, bot - (H - 4) * frac - 2, 22, (H - 4) * frac);
    label(ctx, 'P', gx + 13, top - 18, '#ffffff');
    label(ctx, fmt(P) + ' kPa', gx + 13, bot + 22, '#ffffff', 'center');

    label(ctx, `V = ${V.toFixed(1)} L`, x0 + W / 2, bot + 22, '#ffffff');
    label(ctx, `T = ${T} K   ·   n = ${n.toFixed(1)} mol`, x0, top - 22, '#ffffff', 'left');
  },

  // P–V isotherm for the current n and T
  graph(ctx, w, h) {
    const { n, T, V } = this.params, pMax = n * R_GAS * T / 5;
    const ax = axes(ctx, w, h, 5, 50, 0, pMax, 'V (L)', 'P (kPa)');
    ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let v = 5; v <= 50; v += 0.25) { const [x, y] = ax(v, n * R_GAS * T / v); v === 5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    const [x, y] = ax(V, this.P());
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  },
};

// ---------------- First law: ΔU = Q − W ----------------
// 1 mol of monatomic gas starting at 300 K, ~1 atm. W = work done BY the gas.
const FirstLawScene = {
  id: 'firstlaw',
  title: 'First law of thermodynamics',
  sliders: [
    { key: 'Q', label: 'Heat added Q (− = heat out)', min: -1000, max: 1000, step: 10, value: 600, unit: ' J', digits: 0 },
    { key: 'W', label: 'Work by gas W (− = work on gas)', min: -1000, max: 1000, step: 10, value: 200, unit: ' J', digits: 0 },
  ],
  params: {},
  gas: makeGas(),
  state() {
    const { Q, W } = this.params, dU = Q - W;
    const dT = dU / (1.5 * R_GAS);             // monatomic: U = 3/2 nRT, n = 1
    const V0 = R_GAS * 300 / 101.325;           // ≈ 24.6 L
    return { dU, dT, T0: 300, T1: 300 + dT, V0, V1: V0 + W / 101.325 };
  },

  readouts() {
    const s = this.state();
    return [
      ['Change in energy ΔU = Q − W', fmt(s.dU) + ' J'],
      ['Temperature', `300 K → ${s.T1.toFixed(1)} K`],
      ['Volume (≈1 atm)', `${s.V0.toFixed(1)} L → ${s.V1.toFixed(1)} L`],
      ['Gas', '1 mol, monatomic (U = 3/2 nRT)'],
    ];
  },

  draw(ctx, w, h, t) {
    const dt = frameDt(this, t), { Q, W } = this.params, s = this.state();
    // process plays over 4 s, holds 2 s, repeats
    const k = Math.min(1, (t % 6) / 4), e = k * k * (3 - 2 * k);
    const T = s.T0 + s.dT * e, V = s.V0 + (s.V1 - s.V0) * e;
    const hot = (T - 140) / 320;

    const bw = Math.min(w * 0.3, 260), cx = w * 0.32, left = cx - bw / 2;
    const yb = h * 0.78, gh = (V / 40) * h * 0.62, yTop = yb - gh;

    ctx.fillStyle = tempColor(hot, 0.14); ctx.fillRect(left, yTop, bw, gh);
    this.gas.step(dt, 45, bw, gh, 70 * Math.sqrt(Math.max(T, 20) / 300), 'top');
    this.gas.draw(ctx, left, yTop, tempColor(hot));
    line(ctx, left, h * 0.08, left, yb, '#ffffff', 4);
    line(ctx, left + bw, h * 0.08, left + bw, yb, '#ffffff', 4);
    line(ctx, left - 2, yb, left + bw + 2, yb, '#ffffff', 4);
    ctx.fillStyle = '#b8c2d0'; ctx.fillRect(left + 3, yTop - 16, bw - 6, 16);   // piston
    line(ctx, cx, yTop - 16, cx, yTop - 40, '#cfd8e3', 6);

    // heat arrows (in from flame, or out to cold)
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    if (Q !== 0) {
      const width = 2 + Math.abs(Q) / 1000 * 8, col = Q > 0 ? '#ff9f43' : '#4fc3ff';
      [-0.3, 0, 0.3].forEach(o => {
        const x = cx + o * bw, yA = h * 0.97, yB = yb + 10;
        ctx.globalAlpha = pulse;
        Q > 0 ? bigArrow(ctx, x, yA, x, yB, col, width) : bigArrow(ctx, x, yB, x, yA, col, width);
        ctx.globalAlpha = 1;
      });
      label(ctx, Q > 0 ? `Q = ${Q} J in` : `Q = ${-Q} J out`, left + bw + 14, yb + 30, col, 'left');
    }
    if (W !== 0) {
      const width = 2 + Math.abs(W) / 1000 * 8, col = '#4fc3ff', yP = yTop - 46;
      W > 0 ? bigArrow(ctx, cx, yP, cx, yP - 50, col, width) : bigArrow(ctx, cx, yP - 50, cx, yP, col, width);
      label(ctx, W > 0 ? `W = ${W} J by gas` : `W = ${-W} J on gas`, cx + 20, yP - 30, col, 'left');
    }

    // energy bars
    const bars = [['Q', Q, '#ff9f43'], ['W', W, '#4fc3ff'], ['ΔU', s.dU, '#ff8cf0']];
    const bx = w * 0.62, base = h * 0.5, scale = h * 0.18 / 1000, bwid = Math.min(60, w * 0.08);
    line(ctx, bx - 10, base, bx + bars.length * (bwid + 24), base, '#ffffff', 1.5);
    bars.forEach(([name, v, col], i) => {
      const x = bx + i * (bwid + 24), hgt = v * scale;
      ctx.fillStyle = col; ctx.fillRect(x, base - Math.max(hgt, 0), bwid, Math.abs(hgt));
      label(ctx, name, x + bwid / 2, base + (v >= 0 ? 18 : -18), '#ffffff');
      label(ctx, `${Math.round(v)} J`, x + bwid / 2, base - hgt + (v >= 0 ? -16 : 16), '#ffffff');
    });
    label(ctx, `T = ${T.toFixed(0)} K`, 16, 24, '#ffffff', 'left');
  },
};

// ---------------- Specific heat: Q = mcΔT ----------------
const HEAT_MATERIALS = [['Water', 4186], ['Aluminum', 900], ['Glass', 840], ['Iron', 450], ['Copper', 385]];

const HeatScene = {
  id: 'heat',
  title: 'Specific heat',
  sliders: [
    { key: 'mat', label: 'Material', min: 0, max: HEAT_MATERIALS.length - 1, step: 1, value: 0, names: HEAT_MATERIALS.map(m => m[0]) },
    { key: 'm', label: 'Mass m', min: 0.1, max: 5, step: 0.1, value: 1, unit: ' kg', digits: 1 },
    { key: 'Q', label: 'Heat added Q', min: 1, max: 200, step: 1, value: 50, unit: ' kJ', digits: 0 },
  ],
  params: {},
  calc() {
    const { mat, m, Q } = this.params, [name, c] = HEAT_MATERIALS[mat];
    const dT = Q * 1000 / (m * c);
    return { name, c, dT, T1: 20 + dT };
  },

  readouts() {
    const { m } = this.params, r = this.calc();
    const rows = [
      ['Specific heat c', `${r.c} J/(kg·K)`],
      ['ΔT = Q / (mc)', r.dT.toFixed(1) + ' K'],
      ['Temperature', `20 °C → ${r.T1.toFixed(1)} °C`],
      ['Heat per 1 °C (mc)', fmt(m * r.c) + ' J'],
    ];
    if (r.name === 'Water' && r.T1 > 100) rows.push(['Warning', '<span class="warn">Water boils at 100 °C — the formula stops working past that (phase change)</span>']);
    return rows;
  },

  draw(ctx, w, h, t) {
    const { m } = this.params, r = this.calc();
    const k = Math.min(1, (t % 6) / 4), Tnow = 20 + r.dT * k;   // heats over 4 s, holds 2 s
    const Tmax = Math.max(120, r.T1 * 1.1);
    const hot = (Tnow - 20) / (Tmax - 20);

    // block (or beaker of water), size grows with mass
    const size = Math.min(w * 0.3, h * 0.45) * Math.cbrt(m / 5) * 1.25, cx = w * 0.38, yb = h * 0.68;
    if (r.name === 'Water') {
      ctx.fillStyle = tempColor(hot, 0.55); ctx.fillRect(cx - size / 2, yb - size, size, size);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - size / 2 - 6, yb - size - 14); ctx.lineTo(cx - size / 2 - 6, yb); ctx.lineTo(cx + size / 2 + 6, yb); ctx.lineTo(cx + size / 2 + 6, yb - size - 14); ctx.stroke();
    } else {
      ctx.fillStyle = tempColor(hot, 0.85); ctx.fillRect(cx - size / 2, yb - size, size, size);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(cx - size / 2, yb - size, size, size);
    }
    label(ctx, `${r.name}, ${m.toFixed(1)} kg`, cx, yb - size - 30, '#ffffff');

    // burner + rising heat
    ctx.fillStyle = '#5a6578'; ctx.fillRect(cx - 70, h * 0.86, 140, 14);
    for (let i = 0; i < 5; i++) {
      const x = cx - 50 + i * 25, ph = (t * 0.8 + i * 0.2) % 1, y = h * 0.86 - ph * (h * 0.86 - yb);
      if (k < 1) { ctx.fillStyle = `rgba(255,159,67,${1 - ph})`; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
    }

    // thermometer
    const tx = w * 0.78, tTop = h * 0.12, tBot = h * 0.8, frac = (Tnow - 20) / (Tmax - 20);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(tx - 10, tTop, 20, tBot - tTop);
    ctx.fillStyle = '#ff5a4f';
    ctx.fillRect(tx - 7, tBot - (tBot - tTop) * frac, 14, (tBot - tTop) * frac);
    ctx.beginPath(); ctx.arc(tx, tBot + 14, 16, 0, Math.PI * 2); ctx.fill();
    label(ctx, `${Tnow.toFixed(1)} °C`, tx + 22, tBot - (tBot - tTop) * frac, '#ffffff', 'left');
    if (r.name === 'Water' && Tmax > 100) {
      const y = tBot - (tBot - tTop) * (80 / (Tmax - 20));
      ctx.setLineDash([5, 5]); line(ctx, tx - 30, y, tx + 14, y, '#ffb347', 1.5); ctx.setLineDash([]);
      label(ctx, 'boils', tx - 34, y, '#ffb347', 'right');
    }
  },

  // temperature vs heat for every material (current one bright)
  graph(ctx, w, h) {
    const { m, mat } = this.params, r = this.calc();
    const yMax = Math.max(120, Math.min(r.T1 * 1.2, 2000));
    const ax = axes(ctx, w, h, 0, 200, 20, yMax, 'Q (kJ)', 'T (°C)');
    HEAT_MATERIALS.forEach(([name, c], i) => {
      const qEnd = Math.min(200, (yMax - 20) * m * c / 1000);
      const [x1, y1] = ax(0, 20), [x2, y2] = ax(qEnd, 20 + qEnd * 1000 / (m * c));
      line(ctx, x1, y1, x2, y2, i === mat ? '#ffd54a' : 'rgba(255,255,255,.35)', i === mat ? 3 : 1.5);
      if (i !== mat) { ctx.font = '12px system-ui'; ctx.fillStyle = '#e8eef7'; ctx.textAlign = 'right'; ctx.fillText(name, x2 - 4, y2 + (y2 < 40 ? 12 : -6)); }
    });
    const { Q } = this.params;
    if (r.T1 <= yMax) { const [x, y] = ax(Q, r.T1); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
  },
};
