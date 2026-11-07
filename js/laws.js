// "Your version" physics. Each animation has a law: the equation shown at the
// top. If you edit it, the animation solves YOUR equation for the quantity it
// draws (law.solve), using the slider values for the other letters.
const prettyName = v => v.replace(/^theta/, 'θ').replace(/^gamma/, 'γ').replace(/^delta/, 'Δ').replace(/_(\w+)$/, '$1');

function compileLaw(text, law) {
  const tokens = lex(text);
  const at = tokens.findIndex(t => t.k === 'op' && t.v === '=');
  if (at < 0) throw new Error('It needs an = sign');
  const l = compile(tokens.slice(0, at)), r = compile(tokens.slice(at + 1));
  const vars = new Set([...l.vars, ...r.vars]);
  if (!vars.has(law.solve)) throw new Error(`Keep ${prettyName(law.solve)} in it, that's what the animation shows`);
  const extras = [...vars].filter(v => v !== law.solve && !law.known.includes(v)).sort();
  return { F: s => l.fn(s) - r.fn(s), extras };
}

// Find the value of law.solve that makes left = right (between lo and hi).
// Returns NaN when your equation has no answer there.
function solveLaw(sc, env, lo, hi, mode = 'log') {
  const name = sc.law.solve, base = {};
  (sc.extras || []).forEach(v => { base[v] = sc.params[v]; });
  Object.assign(base, env);
  const f = x => { base[name] = x; try { return sc.lawFn(base); } catch (e) { return NaN; } };
  let xs = [];
  if (mode === 'lin') for (let i = 0; i <= 400; i++) xs.push(lo + (hi - lo) * i / 400);
  else { // fine steps near zero, wide steps far out
    const top = Math.log10(Math.max(Math.abs(lo), Math.abs(hi))), pos = [];
    for (let k = -6; k <= top + 1e-9; k += 0.025) pos.push(10 ** k);
    xs = [...pos.filter(x => -x >= lo).map(x => -x).reverse(), 0, ...pos.filter(x => x <= hi)];
  }
  const roots = [];
  for (let i = 0; i < xs.length - 1; i++) {
    let a = xs[i], b = xs[i + 1], fa = f(a), fb = f(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
    if (fa === 0) { roots.push(a); continue; }
    if (fa * fb > 0) continue;
    const start = Math.max(Math.abs(fa), Math.abs(fb));
    for (let j = 0; j < 100; j++) {
      const m = (a + b) / 2, fm = f(m);
      if (!Number.isFinite(fm)) break;
      if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    if (Math.max(Math.abs(fa), Math.abs(fb)) <= start * 1e-6 + 1e-300) roots.push((a + b) / 2); // a real answer, not a jump
  }
  if (!roots.length) return NaN;
  const pos = roots.filter(r => r >= 0); // more than one answer: prefer the smallest positive one
  return pos.length ? Math.min(...pos) : Math.max(...roots);
}
