// Release build: joins all scripts into one minified, name-scrambled file,
// shrinks the CSS, and writes an offline-ready app to dist/.
// Run: npm install && npm run build
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { minify } from 'terser';

const root = new URL('..', import.meta.url).pathname;
const dist = root + 'dist/';
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

let html = readFileSync(root + 'index.html', 'utf8');

// JS: every <script src> in page order -> one file
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>\n?/g)].map(m => m[1]);
const joined = srcs.map(s => readFileSync(root + s, 'utf8')).join('\n;\n');
const { code } = await minify(`(()=>{${joined}})();`, {
  compress: { passes: 2 }, mangle: { toplevel: true }, format: { comments: false },
});
const jsHash = createHash('sha1').update(code).digest('hex').slice(0, 8);
writeFileSync(dist + `app.${jsHash}.js`, code);

// CSS: strip comments and extra whitespace
const css = readFileSync(root + 'style.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
const cssHash = createHash('sha1').update(css).digest('hex').slice(0, 8);
writeFileSync(dist + `style.${cssHash}.css`, css);

html = html
  .replace(/<script src="[^"]+"><\/script>\n?/g, '')
  .replace('</body>', `<script src="app.${jsHash}.js"></script>\n</body>`)
  .replace('href="style.css"', `href="style.${cssHash}.css"`)
  .replace(/>\s+</g, '><');
writeFileSync(dist + 'index.html', html);

cpSync(root + 'icons', dist + 'icons', { recursive: true });
cpSync(root + 'manifest.webmanifest', dist + 'manifest.webmanifest');

const files = ['./', 'index.html', `app.${jsHash}.js`, `style.${cssHash}.css`, 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const version = createHash('sha1').update(jsHash + cssHash + html).digest('hex').slice(0, 10);
writeFileSync(dist + 'sw.js', readFileSync(root + 'build/sw.template.js', 'utf8')
  .replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)));

console.log(`Built dist/ (version ${version}): ${(code.length / 1024).toFixed(1)} KB JS, ${(css.length / 1024).toFixed(1)} KB CSS`);
