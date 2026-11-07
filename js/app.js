// Wires everything together: equation bar -> matcher -> scene -> canvas.
const $ = id => document.getElementById(id);
const eqInput = $('eq'), statusEl = $('status'), overlay = $('overlay');
const sceneCanvas = $('scene'), graphCanvas = $('graph'), graphStrip = $('graphStrip');
const keypad = $('keypad'), modeBtn = $('modeBtn');

const SCENES = { gravity: GravityScene, snell: SnellScene, lens: OpticsScene('lens'), mirror: OpticsScene('mirror'),
  gas: GasScene, firstlaw: FirstLawScene, heat: HeatScene,
  spacetime: SpacetimeScene, energy: EnergyScene, veladd: VelAddScene };
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
  time = 0; scene._t = undefined; // restart animations from the beginning
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
    const show = () => out.textContent = d.names ? d.names[scene.params[d.key]] : Number(scene.params[d.key]).toFixed(d.digits ?? 2) + (d.unit || '');
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
    enterScene(best.entry.scene);
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
    enterStage(null, null);
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

// ---------- home screen + topic navigation ----------
const homeEl = $('home'), stageEl = $('stage'), aspectsNav = $('aspects');
let currentTopic = null;

function showHome() {
  scene = null; currentTopic = null;
  homeEl.hidden = false; stageEl.hidden = true; graphStrip.hidden = true; aspectsNav.hidden = true;
  overlay.hidden = true; hidePad();
  statusEl.innerHTML = 'Pick a topic below, or type an equation above.';
  window.scrollTo(0, 0);
}

// Show the animation area, with the topic's aspect buttons if it belongs to a topic.
function enterStage(topic, aspect) {
  currentTopic = topic;
  homeEl.hidden = true; stageEl.hidden = false;
  aspectsNav.hidden = false;
  aspectsNav.innerHTML = '<button type="button" data-home>← Topics</button>'
    + (topic ? `<span class="tname">${topic.name}</span>` + byName(topic.aspects).map(a =>
      `<button type="button" data-aspect="${escapeHtml(a.name)}" class="${a === aspect ? 'on' : ''}">${a.name}</button>`).join('')
      // phones get one drop-down menu instead of a pile of buttons
      + `<select class="aspect-select" aria-label="Choose what to show">${byName(topic.aspects).map(a =>
        `<option value="${escapeHtml(a.name)}"${a === aspect ? ' selected' : ''}>${a.name}</option>`).join('')}</select>` : '');
}
aspectsNav.addEventListener('change', e => {
  const a = currentTopic && currentTopic.aspects.find(x => x.name === e.target.value);
  if (a) openAspect(currentTopic, a);
});
function enterScene(sceneId) { const [t, a] = findAspect(sceneId); enterStage(t, a); loadScene(SCENES[sceneId]); }

function openAspect(topic, aspect) {
  eqInput.value = aspect.eq;
  enterStage(topic, aspect);
  loadScene(SCENES[aspect.scene]);
  statusEl.innerHTML = `<span class="ok">${topic.name}</span> · ${aspect.name}`;
}

aspectsNav.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if ('home' in b.dataset) return showHome();
  const a = currentTopic && currentTopic.aspects.find(x => x.name === b.dataset.aspect);
  if (a) openAspect(currentTopic, a);
});
document.querySelector('.brand').addEventListener('click', showHome);

byName(TOPICS).forEach(t => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'topic';
  b.innerHTML = `<b>${t.name}</b><span>${t.blurb}</span>`
    + (t.aspects.length ? `<span class="count">${t.aspects.length} animations →</span>` : '<span class="soon">Coming soon</span>');
  b.addEventListener('click', () => { if (t.aspects.length) openAspect(t, byName(t.aspects)[0]); });
  $('topics').appendChild(b);
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

// ---------- install + offline ----------
// The offline cache (sw.js) only exists in the release build (dist/).
// Checks for a new version on open and whenever the app comes back to the
// screen; when one arrives, a bar offers a one-tap update (no refresh button needed).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install, not an update
    $('updateBar').hidden = false;
  });
  $('updateBtn').addEventListener('click', () => location.reload());
}

const installBtn = $('installBtn');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvent = null;

window.addEventListener('beforeinstallprompt', e => { // Chrome / Edge on laptops and Android
  e.preventDefault(); installEvent = e; installBtn.hidden = false;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
if (isIOS && !standalone) installBtn.hidden = false; // Safari has no install prompt; show how instead

installBtn.addEventListener('click', async () => {
  if (installEvent) {
    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = null; installBtn.hidden = true;
  } else if (isIOS) {
    overlay.innerHTML = 'To install on iPad: tap the Share button <b>⬆</b> in Safari, then <b>Add to Home Screen</b>.<br><br><button type="button" id="closeTip">Got it</button>';
    overlay.hidden = false;
    $('closeTip').onclick = () => { overlay.hidden = true; };
  }
});

setMode(mathMode);
hidePad(); eqInput.blur();
eqInput.value = '';
showHome();
requestAnimationFrame(frame);
