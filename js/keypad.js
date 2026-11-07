// On-screen math pad. Buttons use pointerdown + preventDefault so the
// equation box keeps focus (and the cursor position) while tapping.
const KEYS = [
  ['7', '8', '9', '/', 'sin', 'θ', '(', ')', 'n', 'x'],
  ['4', '5', '6', '*', 'cos', 'π', '^', '√', 'P', 'y'],
  ['1', '2', '3', '-', 'tan', 'Δ', '₁', '₂', 'V', 'T'],
  ['γ', '₀', '²', 'c', 'v', 'u', 'E', 'm', 'L', 't'],
  ['0', '.', '=', '+', '◀', '▶', '⌫', 'Clear', 'Done'],
];
const INSERT = { sin: 'sin ', cos: 'cos ', tan: 'tan ', '√': '√(', '*': ' · ', '=': ' = ', '+': ' + ', '-': ' − ' };

function buildKeypad(pad, input, onDone) {
  KEYS.flat().forEach(k => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = k;
    if (/^[a-zθπΔ√^₀₁₂²γ()]|sin|cos|tan/.test(k) && k.length < 4) b.className = 'fn';
    if (k === 'Done') b.className = 'wide primary';
    b.addEventListener('pointerdown', e => { e.preventDefault(); press(k); });
    pad.appendChild(b);
  });

  function press(k) {
    const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s, v = input.value;
    if (k === 'Done') return onDone();
    if (k === 'Clear') { input.value = ''; return place(0); }
    if (k === '◀') return place(Math.max(0, s - 1));
    if (k === '▶') return place(Math.min(v.length, e + 1));
    if (k === '⌫') {
      if (s !== e) { input.value = v.slice(0, s) + v.slice(e); return place(s); }
      if (s === 0) return;
      input.value = v.slice(0, s - 1) + v.slice(s); return place(s - 1);
    }
    const txt = INSERT[k] || k;
    input.value = v.slice(0, s) + txt + v.slice(e);
    place(s + txt.length);
  }
  function place(pos) { input.focus(); input.setSelectionRange(pos, pos); input.dispatchEvent(new Event('input')); }
}
