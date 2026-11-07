// Small safe math parser (no eval). Supports + - * / ^, parentheses,
// implicit multiplication (2x, 3(x+1)), functions and constants pi, e.
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sqrt: Math.sqrt, log: Math.log10, ln: Math.log, exp: Math.exp, abs: Math.abs,
};
const CONSTS = { pi: Math.PI, e: Math.E };

function lex(src) {
  const s = normalize(src), t = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i], rest = s.slice(i);
    if (/\s/.test(c)) { i++; continue; }
    let m;
    if ((m = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i))) { t.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if (/[A-Za-z]/.test(c)) {
      const f = Object.keys(FUNCS).sort((a, b) => b.length - a.length).find(w => rest.toLowerCase().startsWith(w));
      if (f) { t.push({ k: 'fn', v: f }); i += f.length; continue; }
      if ((m = rest.match(/^(theta\d*|gamma|delta[A-Za-z]\d*|pi|[A-Za-z]\d*)/))) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
    }
    if ('+-*/^(),='.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
    throw new Error(`Can't read "${c}"`);
  }
  // insert implicit multiplication
  const out = [];
  t.forEach((tok, j) => {
    const prev = out[out.length - 1];
    const prevEnds = prev && (prev.k === 'num' || prev.k === 'id' || (prev.k === 'op' && prev.v === ')'));
    const curStarts = tok.k === 'num' || tok.k === 'id' || tok.k === 'fn' || (tok.k === 'op' && tok.v === '(');
    if (prevEnds && curStarts) out.push({ k: 'op', v: '*' });
    out.push(tok);
  });
  return out;
}

// Compile tokens into a function of a variables object.
function compile(tokens) {
  let p = 0;
  const vars = new Set();
  const peek = () => tokens[p];
  const isOp = v => peek() && peek().k === 'op' && peek().v === v;
  const expect = v => { if (!isOp(v)) throw new Error(`Expected "${v}"`); p++; };

  function expr() {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[p++].v, a = left, b = term();
      left = op === '+' ? s => a(s) + b(s) : s => a(s) - b(s);
    }
    return left;
  }
  function term() {
    let left = unary();
    while (isOp('*') || isOp('/')) {
      const op = tokens[p++].v, a = left, b = unary();
      left = op === '*' ? s => a(s) * b(s) : s => a(s) / b(s);
    }
    return left;
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); return s => -a(s); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const base = call();
    if (isOp('^')) { p++; const ex = unary(); return s => Math.pow(base(s), ex(s)); }
    return base;
  }
  function call() {
    const tok = peek();
    if (tok && tok.k === 'fn') {
      p++;
      const f = FUNCS[tok.v];
      const arg = isOp('(') ? (p++, (() => { const a = expr(); expect(')'); return a; })()) : power();
      return s => f(arg(s));
    }
    return primary();
  }
  function primary() {
    const tok = tokens[p++];
    if (!tok) throw new Error('Equation ends too early');
    if (tok.k === 'num') return () => tok.v;
    if (tok.k === 'id') {
      if (tok.v in CONSTS) return () => CONSTS[tok.v];
      vars.add(tok.v);
      return s => s[tok.v];
    }
    if (tok.k === 'op' && tok.v === '(') { const a = expr(); expect(')'); return a; }
    throw new Error(`Unexpected "${tok.v}"`);
  }

  const fn = expr();
  if (p < tokens.length) throw new Error(`Unexpected "${tokens[p].v}"`);
  return { fn, vars };
}

// Make something plottable from any typed equation.
// "y = x^2" -> plot right side; "x^2 + 1" -> plot it. Needs exactly one unknown.
function buildPlot(src) {
  const tokens = lex(src);
  const eqAt = tokens.findIndex(t => t.k === 'op' && t.v === '=');
  let side = tokens, yName = 'y';
  if (eqAt >= 0) {
    const L = tokens.slice(0, eqAt), R = tokens.slice(eqAt + 1);
    if (L.length === 1 && L[0].k === 'id') { side = R; yName = L[0].v; }
    else if (R.length === 1 && R[0].k === 'id') { side = L; yName = R[0].v; }
    else { const l = compile(L), r = compile(R); return finish({ fn: s => l.fn(s) - r.fn(s), vars: new Set([...l.vars, ...r.vars]) }, 'left − right'); }
  }
  return finish(compile(side), yName);

  function finish(c, yLabel) {
    const vs = [...c.vars];
    if (vs.length === 0) throw new Error('No variable to graph');
    if (vs.length > 1) throw new Error(`More than one unknown (${vs.join(', ')}) — can't graph it as a single curve`);
    return { f: x => c.fn({ [vs[0]]: x }), xName: vs[0], yName: yLabel };
  }
}
