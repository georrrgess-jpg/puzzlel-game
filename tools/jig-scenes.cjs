// Contact sheet of jigsaw pictures: renders puzzle numbers FROM..TO (or a list) as thumbnails with their titles.
// Usage: NODE_PATH=$(npm root -g) node tools/jig-scenes.cjs out.png 1-24 [--w=180] [--extra=path/to/subjects.js]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const out = process.argv[2], spec = process.argv[3] || '1-12';
const tw = +((process.argv.find(a => a.startsWith('--w=')) || '--w=180').slice(4));
const extra = process.argv.filter(a => a.startsWith('--extra=')).map(a => a.slice(8));
const nums = spec.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(spec.split('-').map(Number)) : spec.split(',').map(Number);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 6 * (tw + 8) + 8, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  const files = ['js/core.js', 'js/jig/art.js', ...['js/jig/subjects-a.js', 'js/jig/subjects-b.js'].filter(f => fs.existsSync(path.resolve(ROOT, f))), ...extra, 'js/jig/compose.js'];
  const scripts = files.map(f => `<script>${fs.readFileSync(path.resolve(ROOT, f), 'utf8').replace(/<\/script>/g, '<\\/script>')}</script>`).join('');
  await p.setContent(`<!doctype html><html><body style="margin:0;background:#1a1a2a;font:11px sans-serif;color:#fff"><div id="g" style="display:flex;flex-wrap:wrap;gap:8px;padding:8px"></div>${scripts}
  <script>window.T0=performance.now();const out=[];for(const n of ${JSON.stringify(nums)}){const t=performance.now();const r=JIGART.compose(n);const ms=performance.now()-t;out.push(n+' '+r.title+' | '+r.sub+' | side '+r.side+' | '+(r.svg.length/1024).toFixed(0)+'KB '+ms.toFixed(1)+'ms');
    const d=document.createElement('div');d.style.width='${tw}px';d.innerHTML='<img style="width:${tw}px;display:block;border-radius:8px" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(r.svg)+'"><div>#'+n+' '+r.title+'</div>';document.getElementById('g').appendChild(d)}
  window.OUT=out;window.VAR=JIGART.variety();</script></body></html>`);
  await p.waitForTimeout(800);
  console.log((await p.evaluate(() => window.OUT || [])).join('\n'));
  console.log('variety (biome x main x time):', await p.evaluate(() => window.VAR));
  const h = await p.evaluate(() => document.body.scrollHeight); await p.setViewportSize({ width: 6 * (tw + 8) + 8, height: Math.min(h, 12000) });
  await p.screenshot({ path: out, fullPage: true });
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
  await b.close();
})();
