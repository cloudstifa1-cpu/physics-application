// Workbench: write your own equations. Every letter becomes a slider (with a
// play button that sweeps it), later lines can use results of earlier lines,
// and the graph redraws live. Drag on the graph to read values.
const WB_COLORS = ['#ffd54a', '#4fc3ff', '#ff8cf0', '#6dffa8'];
const WB_START = {
  lines: ['y1 = A sin(k x − w t)', 'y2 = A sin(k x + w t)', 's = y1 + y2'],
  xVar: 'x', xr: [-10, 10], params: { A: 1, k: 1, w: 1, t: 0 }, ranges: { t: [0, 10] }, playing: { t: true },
};

const Workbench = {
  id: 'workbench', title: 'Workbench', sliders: [], params: {},
  lines: [], xVar: 'x', xr: [-10, 10], ranges: {}, playing: {}, phase: {}, ui: {},
  parsed: [], cands: [], free: [], probe: 0, yr: null, key: '',

  load() {
    if (this.loaded) return;
    this.loaded = true;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('physics-workbench')); } catch (e) { /* storage off */ }
    const s = saved && Array.isArray(saved.lines) && saved.lines.length ? saved : WB_START;
    this.lines = [...s.lines]; this.xVar = s.xVar || 'x'; this.xr = s.xr || [-10, 10];
    this.params = { ...(s.params || {}) }; this.ranges = { ...(s.ranges || {}) }; this.playing = { ...(s.playing || {}) };
  },
  save() {
    try {
      localStorage.setItem('physics-workbench', JSON.stringify({
        lines: this.lines, xVar: this.xVar, xr: this.xr, params: this.params, ranges: this.ranges, playing: this.playing }));
    } catch (e) { /* storage off */ }
  },

  // "y = expr" -> named result; anything else -> plot (left − right), zero = solution
  parseLine(src) {
    const tokens = lex(src);
    const at = tokens.findIndex(t => t.k === 'op' && t.v === '=');
    if (at < 0) { const c = compile(tokens); return { out: null, fn: c.fn, vars: c.vars }; }
    const L = tokens.slice(0, at), R = tokens.slice(at + 1);
    if (L.length === 1 && L[0].k === 'id') { const c = compile(R); return { out: L[0].v, fn: c.fn, vars: c.vars }; }
    const l = compile(L), r = compile(R);
    return { out: null, implicit: true, fn: s => l.fn(s) - r.fn(s), vars: new Set([...l.vars, ...r.vars]) };
  },

  analyze() {
    this.parsed = this.lines.map(src => {
      try { return { ok: true, ...this.parseLine(src) }; }
      catch (e) { return { ok: false, err: src.trim() ? e.message : 'Empty: type an equation' }; }
    });
    const outs = new Set(this.parsed.filter(p => p.ok && p.out).map(p => p.out));
    const used = new Set();
    this.parsed.forEach(p => p.ok && p.vars.forEach(v => used.add(v)));
    this.cands = [...used].filter(v => !outs.has(v)).sort();
    if (!this.cands.includes(this.xVar)) this.xVar = this.cands.includes('x') ? 'x' : this.cands.includes('t') ? 't' : (this.cands[0] || 'x');
    this.free = this.cands.filter(v => v !== this.xVar);
    this.free.forEach(v => {
      if (!this.ranges[v]) this.ranges[v] = v === 't' ? [0, 10] : [-10, 10];
      if (this.params[v] === undefined) this.params[v] = v === 't' ? 0 : 1;
    });
  },

  evalAt(x) {
    const env = { ...this.params, [this.xVar]: x };
    return this.parsed.map(p => {
      if (!p.ok) return NaN;
      let v;
      try { v = p.fn(env); } catch (e) { v = NaN; }
      if (p.out) env[p.out] = v;
      return v;
    });
  },

  // ---------- side panel ----------
  mount(box) {
    this.load(); this.key = ''; this.yr = null;
    box.innerHTML = `<div class="wb-tools"><button type="button" class="mode"></button></div>
      <div id="wbLines"></div>
      <button type="button" id="wbAdd">+ Add equation</button>
      <div class="wb-axis"><span>Across the bottom:</span><select id="wbX" aria-label="Letter across the bottom"></select>
        <span id="wbXR"></span><button type="button" data-xs="0.1">÷10</button><button type="button" data-xs="10">×10</button></div>
      <h3>Letters</h3><div id="wbVars"></div>`;
    const mode = box.querySelector('.mode');
    mode.textContent = mathMode ? '⌨ Keyboard' : '∑ Math pad';
    mode.classList.toggle('on', mathMode);
    mode.addEventListener('pointerdown', e => e.preventDefault());
    mode.addEventListener('click', () => setMode(!mathMode));
    box.querySelector('#wbAdd').addEventListener('click', () => {
      if (this.lines.length >= 4) return;
      this.lines.push(''); this.renderLines(); this.refresh();
      const ins = box.querySelectorAll('#wbLines input'); ins[ins.length - 1].focus();
    });
    box.querySelector('#wbX').addEventListener('change', e => {
      this.xVar = e.target.value;
      if (this.ranges[this.xVar]) this.xr = [...this.ranges[this.xVar]];
      this.refresh();
    });
    box.querySelectorAll('[data-xs]').forEach(b => b.addEventListener('click', () => {
      this.xr = this.xr.map(v => v * +b.dataset.xs); this.yr = null; this.refresh();
    }));
    this.renderLines(); this.refresh();

    const cv = document.getElementById('scene');
    if (!cv._wb) {
      cv._wb = true;
      const probe = e => {
        if (scene !== this || !this.map) return;
        const r = cv.getBoundingClientRect(), m = this.map;
        this.probe = m.x0 + (e.clientX - r.left - 64) / (r.width - 84) * (m.x1 - m.x0);
        updateReadouts();
      };
      cv.addEventListener('pointerdown', probe);
      cv.addEventListener('pointermove', e => { if (e.buttons) probe(e); });
    }
  },

  renderLines() {
    const box = document.getElementById('wbLines');
    box.innerHTML = '';
    this.lines.forEach((src, i) => {
      const row = document.createElement('div');
      row.className = 'wb-line';
      row.innerHTML = `<span class="swatch" style="background:${WB_COLORS[i]}"></span>`
        + `<input data-math type="text" spellcheck="false" autocomplete="off" aria-label="Equation ${i + 1}">`
        + (this.lines.length > 1 ? `<button type="button" aria-label="Remove equation ${i + 1}">✕</button>` : '');
      const inp = row.querySelector('input');
      inp.value = src;
      inp.inputMode = mathMode ? 'none' : 'text';
      inp.addEventListener('input', () => { this.lines[i] = inp.value; this.yr = null; this.refresh(); });
      inp.addEventListener('focus', () => setTimeout(() => inp.scrollIntoView({ block: 'nearest' }), 60));
      const del = row.querySelector('button');
      if (del) del.addEventListener('click', () => { this.lines.splice(i, 1); this.yr = null; this.renderLines(); this.refresh(); });
      const err = document.createElement('div');
      err.className = 'wb-err';
      box.append(row, err);
    });
  },

  refresh() {
    this.analyze();
    document.querySelectorAll('#wbLines .wb-err').forEach((el, i) => {
      const p = this.parsed[i];
      el.textContent = p && !p.ok ? p.err : '';
    });
    const sel = document.getElementById('wbX');
    if (sel) sel.innerHTML = (this.cands.length ? this.cands : [this.xVar])
      .map(v => `<option${v === this.xVar ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
    const xr = document.getElementById('wbXR');
    if (xr) xr.textContent = `${fmt(this.xr[0])} to ${fmt(this.xr[1])}`;
    const add = document.getElementById('wbAdd');
    if (add) add.hidden = this.lines.length >= 4;
    const key = this.free.join(',');
    if (key !== this.key) { this.key = key; this.renderVars(); }
    this.save();
    updateReadouts();
  },

  renderVars() {
    const box = document.getElementById('wbVars');
    box.innerHTML = '';
    this.ui = {};
    if (!this.free.length) { box.innerHTML = '<p>No letters to slide yet.</p>'; return; }
    this.free.forEach(v => {
      const d = document.createElement('div');
      d.className = 'slider';
      d.innerHTML = `<label><span>${escapeHtml(v)}</span><output></output></label>
        <div class="wb-row"><input type="range" aria-label="${escapeHtml(v)}">
        <button type="button" data-play aria-label="Play ${escapeHtml(v)}"></button>
        <button type="button" data-s="0.1">÷10</button><button type="button" data-s="10">×10</button></div>`;
      const range = d.querySelector('input'), out = d.querySelector('output'), play = d.querySelector('[data-play]');
      const sync = () => {
        const [a, b] = this.ranges[v];
        range.min = Math.min(a, b); range.max = Math.max(a, b); range.step = Math.abs(b - a) / 400;
        range.value = this.params[v];
        out.textContent = fmt(this.params[v]);
        play.textContent = this.playing[v] ? '⏸' : '▶';
        play.classList.toggle('on', !!this.playing[v]);
      };
      range.addEventListener('input', () => {
        this.params[v] = parseFloat(range.value); this.playing[v] = false;
        sync(); this.save(); updateReadouts();
      });
      play.addEventListener('click', () => {
        this.playing[v] = !this.playing[v];
        const [a, b] = this.ranges[v], frac = (this.params[v] - a) / (b - a || 1);
        this.phase[v] = v === 't' ? frac : frac / 2;
        sync(); this.save();
      });
      d.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
        this.ranges[v] = this.ranges[v].map(x => x * +b.dataset.s);
        const [lo, hi] = [Math.min(...this.ranges[v]), Math.max(...this.ranges[v])];
        this.params[v] = Math.min(Math.max(this.params[v], lo), hi);
        sync(); this.save(); updateReadouts();
      }));
      this.ui[v] = { sync };
      sync();
      box.appendChild(d);
    });
  },

  readouts() {
    if (!this.parsed.length) return [];
    const vals = this.evalAt(this.probe);
    return this.parsed.map((p, i) => [
      `<span style="color:${WB_COLORS[i]}">●</span> ${p.out ? escapeHtml(p.out) : `line ${i + 1}${p.implicit ? ' (left − right)' : ''}`} at ${escapeHtml(this.xVar)} = ${fmt(this.probe)}`,
      !p.ok ? '<span class="warn">fix this line</span>' : Number.isFinite(vals[i]) ? fmt(vals[i]) : 'undefined',
    ]);
  },

  // ---------- the live graph ----------
  draw(ctx, w, h, t) {
    const dt = frameDt(this, t);
    for (const v of this.free) {
      if (!this.playing[v]) continue;
      const [a, b] = this.ranges[v];
      this.phase[v] = (this.phase[v] || 0) + dt / 6;               // one sweep every 6 s
      const f = v === 't' ? this.phase[v] % 1 : tri(this.phase[v]); // time runs forward, others bounce
      this.params[v] = a + f * (b - a);
      if (this.ui[v]) this.ui[v].sync();
    }
    if (dt && (this._ro === undefined || Math.abs(t - this._ro) > 0.15)) { this._ro = t; updateReadouts(); }

    const [x0, x1] = this.xr, N = 400, cols = this.parsed.map(() => []);
    for (let i = 0; i <= N; i++) this.evalAt(x0 + (x1 - x0) * i / N).forEach((y, j) => cols[j].push(y));
    const all = cols.flat().filter(Number.isFinite).sort((a, b) => a - b);
    let lo = -1, hi = 1;
    if (all.length) {
      lo = all[Math.floor(all.length * 0.02)]; hi = all[Math.ceil(all.length * 0.98) - 1];
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    }
    // y-axis grows at once but shrinks gently, so it doesn't jitter while things move
    if (!this.yr) this.yr = [lo, hi];
    this.yr = [lo < this.yr[0] ? lo : this.yr[0] + (lo - this.yr[0]) * 0.05,
               hi > this.yr[1] ? hi : this.yr[1] + (hi - this.yr[1]) * 0.05];
    const [y0, y1] = this.yr;
    this.map = { x0, x1 };
    const ax = axes(ctx, w, h, x0, x1, y0, y1, this.xVar, '');
    if (y0 < 0 && y1 > 0) line(ctx, ...ax(x0, 0), ...ax(x1, 0), 'rgba(255,255,255,.6)', 1.5);
    if (Math.min(x0, x1) < 0 && Math.max(x0, x1) > 0) line(ctx, ...ax(0, y0), ...ax(0, y1), 'rgba(255,255,255,.6)', 1.5);

    const [cl, ct] = ax(x0, y1), [cr, cb] = ax(x1, y0);
    ctx.save(); ctx.beginPath(); ctx.rect(cl, ct, cr - cl, cb - ct); ctx.clip();
    cols.forEach((ys, j) => {
      ctx.strokeStyle = WB_COLORS[j]; ctx.lineWidth = 3; ctx.beginPath();
      let pen = false, prev = null;
      ys.forEach((y, i) => {
        if (!Number.isFinite(y) || (prev !== null && Math.abs(y - prev) > 3 * (y1 - y0))) { pen = false; prev = Number.isFinite(y) ? y : null; return; }
        const [px, py] = ax(x0 + (x1 - x0) * i / N, y);
        pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; prev = y;
      });
      ctx.stroke();
    });
    // probe line + dots
    if (!Number.isFinite(this.probe)) this.probe = (x0 + x1) / 2;
    this.probe = Math.min(Math.max(this.probe, Math.min(x0, x1)), Math.max(x0, x1));
    const [px] = ax(this.probe, 0);
    line(ctx, px, ct, px, cb, 'rgba(255,255,255,.4)', 1);
    this.evalAt(this.probe).forEach((y, j) => {
      if (!Number.isFinite(y)) return;
      const [qx, qy] = ax(this.probe, y);
      ctx.fillStyle = WB_COLORS[j]; ctx.beginPath(); ctx.arc(qx, qy, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // legend
    ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this.parsed.forEach((p, j) => {
      const txt = (this.lines[j] || '').slice(0, 34) + (p.ok ? '' : '  (fix this line)');
      const y = 44 + j * 22, tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(11,15,22,.85)'; ctx.fillRect(70, y - 10, tw + 12, 20);
      ctx.fillStyle = WB_COLORS[j]; ctx.fillText(txt, 76, y);
    });
    if (!this.parsed.some(p => p.ok)) label(ctx, 'Type an equation in the box', w / 2, h / 2, '#ffffff');
  },
};
