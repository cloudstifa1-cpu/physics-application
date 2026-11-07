// Gravity as curved spacetime (general relativity), shown as a sheet that a
// mass sinks into. Distances are in Schwarzschild radii: rₛ = 2GM/c² ≈ 2.95 km per sun.
const GravityScene = {
  id: 'gravity',
  title: 'Gravity and spacetime curvature',
  sliders: [
    { key: 'M', label: 'Mass of the black hole', min: 1, max: 30, step: 1, value: 10, unit: ' suns', digits: 0 },
    { key: 'x', label: 'Orbit distance r', min: 1.5, max: 20, step: 0.1, value: 6, unit: ' × rₛ', digits: 1 },
  ],
  params: {},

  orbit(t) { // current distance; inside 3 rₛ there is no stable orbit, so it spirals in
    const { x } = this.params;
    return x >= 3 ? x : x - ((t * 0.3) % 1) * (x - 1);
  },

  readouts() {
    const { M, x } = this.params, rs = 2.95 * M;
    return [
      ['Schwarzschild radius rₛ = 2GM/c²', fmt(rs) + ' km'],
      ['Orbit distance', fmt(rs * x) + ' km'],
      ['Clock rate in orbit √(1 − rₛ/r)', (Math.sqrt(1 - 1 / x) * 100).toFixed(1) + '% of a far-away clock'],
      ['Escape speed', Math.sqrt(1 / x).toFixed(3) + ' c'],
      ['Orbit', x < 3 ? '<span class="warn">Too close: no stable orbit inside 3 rₛ, it spirals in</span>' : 'Stable'],
    ];
  },

  draw(ctx, w, h, t) {
    const { M } = this.params, u0 = this.orbit(t);
    const narrow = w < 500;
    const U = 20, cx = w / 2, cy = h * 0.3 + (narrow ? 40 : 0), R = Math.min(w * 0.47, h * 1.05), sc = R / U, tilt = 0.4;
    const depth = h * (0.14 + 0.36 * M / 30);                     // heavier mass = deeper well
    const z = u => depth / Math.sqrt(1 + (u / 1.6) ** 2);
    const P = (u, a) => [cx + u * sc * Math.cos(a), cy + u * sc * Math.sin(a) * tilt + z(u)];
    const path = (pts, color, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    };
    const ring = u => Array.from({ length: 73 }, (_, i) => P(u, i * Math.PI / 36));

    // the spacetime sheet: rings and spokes
    [1.5, 2, 3, 4, 5, 6, 8, 10, 12, 14, 17, 20].forEach(u => path(ring(u), 'rgba(79,195,255,.55)', 1.2));
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12;
      path(Array.from({ length: 77 }, (_, i) => P(1 + i * 0.25, a)), 'rgba(79,195,255,.55)', 1.2);
    }
    // last stable orbit (3 rₛ)
    ctx.setLineDash([6, 5]); path(ring(3), '#ffb347', 2); ctx.setLineDash([]);
    // chosen orbit
    ctx.setLineDash([3, 6]); path(ring(this.params.x), 'rgba(255,213,74,.7)', 1.5); ctx.setLineDash([]);

    // orbiting object: behind the hole first, in front after
    const a0 = t * 1.3 * Math.pow(6 / u0, 1.5);
    const obj = () => {
      for (let k = 6; k >= 1; k--) {                     // short trail
        const [px, py] = P(u0, a0 - k * 0.07);
        ctx.fillStyle = `rgba(255,213,74,${0.12 * (7 - k) / 6})`;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      }
      const [px, py] = P(u0, a0);
      ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    };
    const behind = Math.sin(a0) < 0;
    if (behind) obj();
    // black hole: event horizon at 1 rₛ
    const hz = ring(1);
    ctx.fillStyle = '#000000'; ctx.beginPath(); hz.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.fill();
    path(hz, '#ff8cf0', 2.5);
    if (!behind) obj();

    // labels and clocks
    label(ctx, `Far-away clock: ${Math.floor(t)} ticks`, 16, 22, '#ffffff', 'left');
    label(ctx, `Clock in orbit: ${Math.floor(t * Math.sqrt(1 - 1 / u0))} ticks`, 16, 46, '#ffd54a', 'left');
    const [hx, hy] = P(1, Math.PI / 2);
    label(ctx, 'event horizon', hx, hy + 18, '#ff8cf0');
    const [sx, sy] = P(3, Math.PI * 0.85);
    if (!narrow) label(ctx, 'last stable orbit (3 rₛ)', sx - 10, sy + 16, '#ffb347', 'right');
    label(ctx, narrow ? 'More mass = deeper curve' : 'More mass = deeper curve = stronger gravity', w / 2, h - 16, '#ffffff');
  },

  graph(ctx, w, h) {
    const ax = axes(ctx, w, h, 1, 20, 0, 1, 'r / rₛ', 'clock rate');
    curve(ctx, ax, 1, 20, u => Math.sqrt(1 - 1 / u), '#ffd54a');
    ctx.setLineDash([5, 5]); line(ctx, ...ax(3, 0), ...ax(3, 1), '#ffb347', 1.5); ctx.setLineDash([]);
    dot(ctx, ...ax(this.params.x, Math.sqrt(1 - 1 / this.params.x)));
  },
};
