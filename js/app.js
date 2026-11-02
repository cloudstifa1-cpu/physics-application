// Wires everything together: equation bar -> matcher -> scene -> canvas.
const $ = id => document.getElementById(id);
const eqInput = $('eq'), statusEl = $('status'), overlay = $('overlay');
const sceneCanvas = $('scene'), graphCanvas = $('graph'), graphStrip = $('graphStrip');
const keypad = $('keypad'), modeBtn = $('modeBtn');

const SCENES = { snell: SnellScene };
let scene = null, playing = true, time = 0, lastFrame = performance.now();

// ---------- canvas sizing (sharp on retina / iPad) ----------
function fit(canvas) {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  return { ctx, w: r.width, h: r.height };
}

// ---------- scenes ----------
function loadScene(s) {
  scene = s;
  scene.params = {};
  scene.sliders.forEach(d => scene.params[d.key] = d.value);
  $('sceneTitle').textContent = scene.title;
  graphStrip.hidden = !scene.graph;
  overlay.hidden = true;
  buildSliders();
  updateReadouts();
}

function buildSliders() {
  const box = $('sliders');
  box.innerHTML = '';
  scene.sliders.forEach(d => {
    const wrap = document.createElement('div');
    wrap.className = 'slider';
    wrap.innerHTML = `<label><span>${d.label}</span><output></output></label>
      <input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${scene.params[d.key]}" aria-label="${d.label}">`;
    const out = wrap.querySelector('output'), range = wrap.querySelector('input');
    const show = () => out.textContent = Number(scene.params[d.key]).toFixed(d.digits ?? 2) + (d.unit || '');
    range.addEventListener('input', () => { scene.params[d.key] = parseFloat(range.value); show(); updateReadouts(); });
    show();
    box.appendChild(wrap);
  });
}

function updateReadouts() {
  $('readouts').innerHTML = scene.readouts()
    .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
}

// ---------- equation handling ----------
function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function suggestionChips(list) {
  return list.slice(0, 3).map(r =>
    `<button type="button" class="chip" data-form="${escapeHtml(r.entry.form)}">${escapeHtml(r.entry.name)}</button>`).join('');
}

function run() {
  const text = eqInput.value.trim();
  if (!text) { statusEl.innerHTML = 'Type an equation above.'; return; }
  const ranked = matchLibrary(text);
  const best = ranked.find(r => r.score === 1);

  if (best && best.entry.scene) {
    loadScene(SCENES[best.entry.scene]);
    statusEl.innerHTML = `<span class="ok">Recognized:</span> ${best.entry.name} · ${best.entry.topic}`;
    return;
  }
  if (best) {
    statusEl.innerHTML = `<span class="ok">Recognized:</span> ${best.entry.name} · ${best.entry.topic} — <span class="warn">animation coming in a later phase</span>`;
    overlay.textContent = `${best.entry.name} is in the library, but its animation isn't built yet.`;
    overlay.hidden = false;
    return;
  }

  // Not in the library: graph it and suggest close matches.
  const close = ranked.filter(r => r.score >= 0.5);
  try {
    const plot = buildPlot(text);
    loadScene(makeGraphScene(plot, text));
    statusEl.innerHTML = `<span class="warn">Not in the library yet</span> — graphed as ${escapeHtml(plot.yName)} vs ${escapeHtml(plot.xName)}.`
      + (close.length ? ` Did you mean: ${suggestionChips(close)}` : '');
  } catch (err) {
    statusEl.innerHTML = `<span class="warn">Can't show this:</span> ${escapeHtml(err.message)}.`
      + (close.length ? ` Did you mean: ${suggestionChips(close)}` : '');
  }
}

function useForm(form) { eqInput.value = form; run(); }

statusEl.addEventListener('click', e => { const b = e.target.closest('[data-form]'); if (b) useForm(b.dataset.form); });
$('eqForm').addEventListener('submit', e => { e.preventDefault(); hidePad(); run(); });

// library list in the side panel
LIBRARY.forEach(entry => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${entry.name}<br><span style="font-family:Georgia,serif">${entry.form}</span></span>`
    + (entry.scene ? '<span class="live">Animated</span>' : '<span class="soon">Coming soon</span>');
  b.addEventListener('click', () => useForm(entry.form));
  $('library').appendChild(b);
});

// ---------- keyboard / math pad toggle ----------
const touch = matchMedia('(pointer: coarse)').matches;
let mathMode = touch; // tablets start on the math pad, laptops on the real keyboard

function setMode(math) {
  mathMode = math;
  eqInput.inputMode = math ? 'none' : 'text';
  modeBtn.textContent = math ? '⌨ Keyboard' : '∑ Math pad';
  modeBtn.classList.toggle('on', math);
  if (math) { showPad(); eqInput.focus(); } else { hidePad(); eqInput.blur(); eqInput.focus(); }
}
function showPad() { keypad.hidden = false; }
function hidePad() { keypad.hidden = true; }

modeBtn.addEventListener('pointerdown', e => e.preventDefault());
modeBtn.addEventListener('click', () => setMode(!mathMode));
eqInput.addEventListener('focus', () => { if (mathMode) showPad(); });
buildKeypad(keypad, eqInput, hidePad);

// ---------- playback ----------
$('playBtn').addEventListener('click', () => { playing = !playing; $('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play'; });
$('resetBtn').addEventListener('click', () => { time = 0; loadScene(scene); });
$('graphToggle').addEventListener('click', () => {
  const c = graphStrip.classList.toggle('collapsed');
  $('graphToggle').textContent = (c ? '▸' : '▾') + ' Graph';
});

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (playing) time += dt;
  if (scene) {
    const s = fit(sceneCanvas);
    scene.draw(s.ctx, s.w, s.h, time);
    if (scene.graph && !graphStrip.classList.contains('collapsed')) {
      const g = fit(graphCanvas);
      scene.graph(g.ctx, g.w, g.h);
    }
  }
  requestAnimationFrame(frame);
}

setMode(mathMode);
if (!touch) eqInput.blur();
run();
requestAnimationFrame(frame);
