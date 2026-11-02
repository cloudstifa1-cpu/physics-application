// Fallback scene: plots any single-unknown equation as a curve.
function makeGraphScene(plot, sourceText) {
  return {
    id: 'graph',
    title: 'Graph',
    sliders: [
      { key: 'center', label: `Center (${plot.xName})`, min: -50, max: 50, step: 0.5, value: 0, digits: 1 },
      { key: 'span', label: 'Zoom (half-width)', min: 0.5, max: 100, step: 0.5, value: 10, digits: 1 },
    ],
    params: {},
    readouts() {
      const x = this.params.center, y = plot.f(x);
      return [
        ['Equation', sourceText],
        [`${plot.yName} at ${plot.xName} = ${fmt(x)}`, Number.isFinite(y) ? fmt(y) : 'undefined'],
      ];
    },
    draw(ctx, w, h) {
      const { center, span } = this.params, x0 = center - span, x1 = center + span;
      const xs = [], ys = [];
      for (let i = 0; i <= 600; i++) { const x = x0 + (x1 - x0) * i / 600; xs.push(x); ys.push(plot.f(x)); }
      const finite = ys.filter(Number.isFinite).sort((a, b) => a - b);
      let y0 = -1, y1 = 1;
      if (finite.length) {
        y0 = finite[Math.floor(finite.length * 0.03)]; y1 = finite[Math.floor(finite.length * 0.97)];
        if (y0 === y1) { y0 -= 1; y1 += 1; }
        const pad = (y1 - y0) * 0.1; y0 -= pad; y1 += pad;
      }
      const ax = axes(ctx, w, h, x0, x1, y0, y1, plot.xName, plot.yName);
      ctx.strokeStyle = '#4fc3ff'; ctx.lineWidth = 3; ctx.beginPath();
      let pen = false, prevY = null;
      xs.forEach((x, i) => {
        const y = ys[i];
        const jump = prevY !== null && Math.abs(y - prevY) > (y1 - y0) * 2; // break at asymptotes
        if (!Number.isFinite(y) || jump) { pen = false; prevY = Number.isFinite(y) ? y : null; return; }
        const [px, py] = ax(x, Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), y)));
        pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; prevY = y;
      });
      ctx.stroke();
      const yc = plot.f(center);
      if (Number.isFinite(yc) && yc >= y0 && yc <= y1) {
        const [px, py] = ax(center, yc);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
}
