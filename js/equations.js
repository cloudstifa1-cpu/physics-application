// Equation library + matcher. An equation is "recognized" when every
// required symbol appears, in any order, so rearranged forms still match
// (e.g. "sin θ2 = n1 sin θ1 / n2" matches Snell's law).
const LIBRARY = [
  { id: 'snell',    name: "Snell's law",         topic: 'Optics', form: 'n1 sin θ1 = n2 sin θ2', need: ['n1', 'n2', 'sin', 'theta1'], scene: 'snell' },
  { id: 'critical', name: 'Critical angle',      topic: 'Optics', form: 'sin θc = n2 / n1',      need: ['sin', 'thetac', 'n1', 'n2'], scene: 'snell' },
  { id: 'thinlens', name: 'Thin lens equation',  topic: 'Optics', form: '1/f = 1/do + 1/di',     need: ['f', 'do', 'di'], scene: 'lens' },
  { id: 'magnify',  name: 'Magnification',       topic: 'Optics', form: 'm = -di / do',          need: ['m', 'di', 'do'], scene: 'lens' },
  { id: 'mirror',   name: 'Mirror focal length', topic: 'Optics', form: 'f = R / 2',             need: ['f', 'R'], scene: 'mirror' },
  { id: 'idealgas', name: 'Ideal gas law',       topic: 'Thermo', form: 'PV = nRT',              need: ['P', 'V', 'n', 'R', 'T'] },
  { id: 'firstlaw', name: 'First law of thermodynamics', topic: 'Thermo', form: 'ΔU = Q − W',    need: ['deltaU', 'Q', 'W'] },
  { id: 'heat',     name: 'Specific heat',       topic: 'Thermo', form: 'Q = mcΔT',              need: ['Q', 'm', 'c', 'deltaT'] },
];

// Turn typed math into plain ASCII the matcher and parser understand.
function normalize(s) {
  return s
    .replace(/[₀-₉]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 48))
    .replace(/[θϑ]/g, 'theta').replace(/Δ/g, 'delta').replace(/π/g, 'pi')
    .replace(/[×·]/g, '*').replace(/[−–]/g, '-').replace(/÷/g, '/')
    .replace(/√/g, 'sqrt').replace(/²/g, '^2').replace(/³/g, '^3');
}

const FUNC_WORDS = ['arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan', 'sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'abs'];
const NAME_WORDS = ['pi', 'do', 'di', 'ho', 'hi']; // only when not followed by another letter

// Pull out symbol names: "n1 sin θ1" -> ["n1","sin","theta1"]
function symbols(input) {
  const s = normalize(input), out = [];
  let i = 0;
  while (i < s.length) {
    if (!/[A-Za-z]/.test(s[i])) { i++; continue; }
    const rest = s.slice(i), low = rest.toLowerCase();
    let m;
    if ((m = rest.match(/^theta(\d+|c(?![a-z]))?/i))) { out.push('theta' + (m[1] || '').toLowerCase()); i += m[0].length; continue; }
    if ((m = rest.match(/^delta([A-Za-z])(\d*)/))) { out.push('delta' + m[1] + m[2]); i += m[0].length; continue; }
    const f = FUNC_WORDS.find(w => low.startsWith(w));
    if (f) { out.push(f.replace(/^a(sin|cos|tan)$/, 'arc$1')); i += f.length; continue; }
    const w = NAME_WORDS.find(w => low.startsWith(w) && !/[A-Za-z]/.test(rest[w.length] || ''));
    if (w) { out.push(w); i += w.length; continue; }
    m = rest.match(/^[A-Za-z]\d*/);
    out.push(m[0]); i += m[0].length;
  }
  return out;
}

// Returns library entries ranked by how many required symbols are present.
function matchLibrary(input) {
  const have = new Set(symbols(input).map(t => t.replace(/^arc/, '')));
  return LIBRARY
    .map(e => ({ entry: e, score: e.need.filter(t => have.has(t)).length / e.need.length }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.need.length - a.entry.need.length);
}
