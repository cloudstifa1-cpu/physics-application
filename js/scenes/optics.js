// Ray diagrams for thin lenses and curved mirrors (Phase 2).
// Same physics for both: 1/f = 1/dₒ + 1/dᵢ, m = −dᵢ/dₒ, hᵢ = m·hₒ.
// Sign rules: f > 0 converging lens / concave mirror; dᵢ > 0 real image.
function OpticsScene(kind) {
  const isLens = kind === 'lens';
  const RAY_COLORS = ['#ffd54a', '#4fc3ff', '#ff9f43'];
  const RAY_NAMES = isLens ? ['parallel ray', 'center ray', 'focal ray'] : ['parallel ray', 'vertex ray', 'focal ray'];
  const yAt = (L, dir, x) => L[1] + dir[1] * (x - L[0]) / dir[0];

  return {
    id: kind,
    title: isLens ? 'Thin lens' : 'Curved mirror',
    sliders: [
      isLens
        ? { key: 'f', label: 'Focal length f (+ converging, − diverging)', min: -40, max: 40, step: 1, value: 15, unit: ' cm', digits: 0 }
        : { key: 'R', label: 'Radius R (+ concave, − convex)', min: -60, max: 60, step: 2, value: 30, unit: ' cm', digits: 0 },
      { key: 'do', label: 'Object distance dₒ', min: 2, max: 60, step: 1, value: 35, unit: ' cm', digits: 0 },
      { key: 'ho', label: 'Object height hₒ', min: 2, max: 12, step: 1, value: 6, unit: ' cm', digits: 0 },
    ],
    params: {},

    optics() {
      const p = this.params;
      let f = isLens ? p.f : p.R / 2;
      if (Math.abs(f) < 1) f = f < 0 ? -1 : 1; // f = 0 has no meaning
      const d = p.do, h = p.ho, atF = d === f;
      const di = atF ? Infinity : 1 / (1 / f - 1 / d);
      const m = atF ? Infinity : -di / d;
      return { f, d, h, di, m, hi: m * h, atF };
    },

    readouts() {
      const o = this.optics();
      const type = isLens ? (o.f > 0 ? 'Converging' : 'Diverging') : (o.f > 0 ? 'Concave' : 'Convex');
      if (o.atF) return [
        ['Type', `${type}, f = ${fmt(o.f)} cm`],
        ['Image', '<span class="warn">None — object at focal point, rays leave parallel</span>'],
      ];
      const real = o.di > 0, upright = o.m > 0, size = Math.abs(o.m);
      return [
        ['Type', `${type}, f = ${fmt(o.f)} cm`],
        ['Image distance dᵢ', fmt(o.di) + ' cm'],
        ['Magnification m', fmt(o.m)],
        ['Image height hᵢ', fmt(o.hi) + ' cm'],
        ['Image', `${real ? 'Real' : 'Virtual'}, ${upright ? 'upright' : 'inverted'}, ${Math.abs(size - 1) < 0.01 ? 'same size' : size > 1 ? 'enlarged' : 'reduced'}`],
      ];
    },

    draw(ctx, w, hPx, t) {
      const o = this.optics();
      const s = Math.min(w / 150, hPx / 40);          // pixels per cm
      const cx = isLens ? w / 2 : w * 0.62, cy = hPx / 2;
      const P = (x, y) => [cx + x * s, cy - y * s];
      const xMin = -cx / s, xMax = (w - cx) / s;
      const Hpx = hPx * 0.42;

      line(ctx, 0, cy, w, cy, '#cfd8e3', 1.5); // optical axis

      // focal points
      const marks = isLens ? [[o.f, 'F′'], [-o.f, 'F'], [2 * o.f, '2F′'], [-2 * o.f, '2F']] : [[-o.f, 'F'], [-2 * o.f, 'C']];
      marks.forEach(([x, name]) => {
        const [px, py] = P(x, 0);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(name, px, py + 8);
      });

      // lens or mirror
      ctx.strokeStyle = '#a8e6ff'; ctx.lineWidth = 3;
      if (isLens) {
        line(ctx, cx, cy - Hpx, cx, cy + Hpx, '#a8e6ff', 3);
        const tip = o.f > 0 ? 10 : -10; // arrowheads out (converging) or in (diverging)
        [[cy - Hpx, 1], [cy + Hpx, -1]].forEach(([y, dir]) => {
          ctx.beginPath(); ctx.moveTo(cx - 9, y + tip * dir); ctx.lineTo(cx, y); ctx.lineTo(cx + 9, y + tip * dir); ctx.stroke();
        });
      } else {
        const bend = o.f > 0 ? -1 : 1; // concave edges curve toward the object
        ctx.beginPath();
        for (let y = -Hpx; y <= Hpx; y += 4) {
          const x = cx + bend * 22 * (y / Hpx) ** 2;
          y === -Hpx ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y);
        }
        ctx.stroke();
        for (let y = -Hpx; y <= Hpx; y += 14) { // hatching on the back
          const x = cx + bend * 22 * (y / Hpx) ** 2;
          line(ctx, x + 2, cy + y, x + 12, cy + y - 8, '#a8e6ff', 1);
        }
      }

      // object arrow
      arrow(ctx, P(-o.d, 0), P(-o.d, o.h), '#6dffa8', false);

      // principal rays
      const T = [-o.d, o.h], out = isLens ? 1 : -1;
      const rays = [
        { L: [0, o.h], dir: [out, -o.h / o.f] },
        { L: [0, 0], dir: [out, -o.h / o.d] },
      ];
      if (!o.atF) {
        const yL = -o.h * o.f / (o.d - o.f);
        if (Math.abs(yL) < Hpx / s * 1.3) rays.push({ L: [0, yL], dir: [out, 0] });
      }
      const xEnd = isLens ? xMax : xMin;
      const xImg = isLens ? o.di : -o.di;
      const virtual = !o.atF && o.di < 0;

      rays.forEach((r, i) => {
        const color = RAY_COLORS[i];
        const end = [xEnd, yAt(r.L, r.dir, xEnd)];
        const pts = [P(...T), P(...r.L), P(...end)];
        line(ctx, ...pts[0], ...pts[1], color, 2.5);
        line(ctx, ...pts[1], ...pts[2], color, 2.5);
        if (virtual && Math.abs(xImg) < 500) { // dashed trace-back to the virtual image
          ctx.setLineDash([6, 6]);
          line(ctx, ...pts[1], ...P(xImg, yAt(r.L, r.dir, xImg)), color, 1.5);
          ctx.setLineDash([]);
        }
        // moving light pulses along the ray
        const len1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const len2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
        for (let k = 0; k < 2; k++) {
          const u = ((t * 0.3 + k / 2 + i * 0.11) % 1) * (len1 + len2);
          const [x, y] = u < len1 ? lerp(pts[0], pts[1], u / len1) : lerp(pts[1], pts[2], (u - len1) / len2);
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
        }
      });

      // image arrow
      if (!o.atF && Math.abs(xImg) < 500) arrow(ctx, P(xImg, 0), P(xImg, o.hi), '#ff8cf0', virtual);

      // legend
      ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      RAY_NAMES.forEach((n, i) => {
        line(ctx, 16, hPx - 70 + i * 22, 40, hPx - 70 + i * 22, RAY_COLORS[i], 3);
        ctx.fillStyle = '#ffffff'; ctx.fillText(n, 48, hPx - 70 + i * 22);
      });
      ctx.fillStyle = '#6dffa8'; ctx.fillText('object', 16, 22);
      ctx.fillStyle = '#ff8cf0'; ctx.fillText(virtual ? 'image (virtual, dashed)' : 'image', 90, 22);
    },

    // image distance vs object distance
    graph(ctx, w, h) {
      const o = this.optics();
      const ax = axes(ctx, w, h, 0, 60, -80, 80, 'dₒ (cm)', 'dᵢ (cm)');
      const [, y0] = ax(0, 0);
      line(ctx, ax(0, 0)[0], y0, ax(60, 0)[0], y0, 'rgba(255,255,255,.5)', 1);
      if (o.f > 0 && o.f <= 60) {
        const [xa] = ax(o.f, 0), [, yt] = ax(0, 80), [, yb] = ax(0, -80);
        ctx.setLineDash([5, 5]); line(ctx, xa, yt, xa, yb, '#ffb347', 1.5); ctx.setLineDash([]);
      }
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2.5; ctx.beginPath();
      let pen = false;
      for (let d = 0.5; d <= 60; d += 0.25) {
        const di = 1 / (1 / o.f - 1 / d);
        if (!Number.isFinite(di) || Math.abs(di) > 80) { pen = false; continue; }
        const [x, y] = ax(d, di);
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
      }
      ctx.stroke();
      if (!o.atF && Math.abs(o.di) <= 80) {
        const [x, y] = ax(o.d, o.di);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
}

function arrow(ctx, [x1, y1], [x2, y2], color, dashed) {
  if (dashed) ctx.setLineDash([6, 5]);
  line(ctx, x1, y1, x2, y2, color, 3.5);
  ctx.setLineDash([]);
  const dir = Math.sign(y2 - y1) || 1;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x2, y2); ctx.lineTo(x2 - 8, y2 - 12 * dir); ctx.lineTo(x2 + 8, y2 - 12 * dir); ctx.closePath(); ctx.fill();
}
