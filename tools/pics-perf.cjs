// Picture Pop under load: real drags (touch on a slow phone, or a mouse on a desktop window) of the solver's next swap,
// measured frame by frame: while the tile follows the pointer, and the 1.2 s after the drop (the swap, and a finished
// picture popping when one completes). Also what gets repainted and how much raster work it causes.
// Usage: NODE_PATH=$(npm root -g) node tools/pics-perf.cjs [phone|desktop] [cpuSlowdown=6] [drags=10]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const kind = process.argv[2] || 'phone', rate = +(process.argv[3] || 6), drags = +(process.argv[4] || 10), phone = kind === 'phone';
(async () => {
  await new Promise(r => srv.listen(0, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' } : { viewport: { width: 1440, height: 820 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + srv.address().port + '/'); await sleep(1500);
  await p.evaluate(() => { const g = __game; g.closeModal(); g.S.gfx = 'high'; g.S.unlocked = 400; g.S.login.last = today(); for (const t of g.TYPES) g.S.seen[t] = true });
  await p.evaluate(() => __game.startLevel(__game.levelFor('pics', 6))); await sleep(5000);   // the level's pictures are drawn by now
  await p.evaluate(() => { window.__f = []; let l = 0; const f = t => { if (l) __f.push([t, t - l]); l = t; requestAnimationFrame(f) }; requestAnimationFrame(f);
    window.__lt = []; new PerformanceObserver(o => { for (const e of o.getEntries()) __lt.push([e.startTime, e.duration]) }).observe({ entryTypes: ['longtask'] }) });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await browser.startTracing(p, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc'] });
  const down = (x, y) => phone ? cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }) : p.mouse.move(x, y).then(() => p.mouse.down());
  const move = (x, y) => phone ? cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }) : p.mouse.move(x, y);
  const up = () => phone ? cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) : p.mouse.up();
  const res = [];
  for (let d = 0; d < drags; d++) {
    const mv = await p.evaluate(() => { const c = __game.cur; return c.over || c.locked ? null : c.puz._plan() }); if (!mv) { await sleep(400); continue }
    const lift = phone ? 28 : 0, t0 = await p.evaluate(() => performance.now());
    await down(...mv.from);
    for (let i = 1; i <= 24; i++) { const k = i / 24; await move(mv.from[0] + (mv.to[0] - mv.from[0]) * k, mv.from[1] + (mv.to[1] + lift - mv.from[1]) * k); await sleep(16) }
    const t1 = await p.evaluate(() => performance.now()); await up(); await sleep(1300); const t2 = await p.evaluate(() => performance.now());
    res.push([t0, t1, t2, mv.pops]);
  }
  const buf = await browser.stopTracing();
  const { f, lt } = await p.evaluate(() => ({ f: __f, lt: __lt }));
  const sum = (a, b) => { const ft = f.filter(([t]) => t >= a && t < b).map(x => x[1]), avg = ft.reduce((x, y) => x + y, 0) / Math.max(1, ft.length);
    return { fps: 1000 / avg, st: ft.filter(x => x > 34).length, worst: Math.max(0, ...ft), lt: Math.max(0, ...lt.filter(([t]) => t >= a && t < b).map(x => x[1])) } };
  const agg = { drag: [], swap: [], pop: [] };
  for (const [t0, t1, t2, pops] of res) { agg.drag.push(sum(t0, t1)); (pops ? agg.pop : agg.swap).push(sum(t1, t2)) }
  console.log(`${kind}, CPU ${rate}x slower, ${res.length} drags`);
  const show = (k, a) => a.length && console.log(`${k.padEnd(16)} ${String(a.length).padStart(2)}x  fps ${Math.round(a.reduce((x, y) => x + y.fps, 0) / a.length)}  stutters ${a.reduce((x, y) => x + y.st, 0)}  worst frame ${Math.round(Math.max(...a.map(x => x.worst)))} ms  longest task ${Math.round(Math.max(...a.map(x => x.lt)))} ms`);
  show('while dragging', agg.drag); show('swap', agg.swap); show('swap + pop', agg.pop);
  const ev = JSON.parse(buf.toString()).traceEvents, main = new Set(ev.filter(e => e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain').map(e => e.pid + ':' + e.tid));
  const tot = {}; for (const e of ev) { if (e.ph !== 'X') continue; if (main.has(e.pid + ':' + e.tid) && ['UpdateLayoutTree', 'Layout', 'Paint', 'Commit', 'FunctionCall'].includes(e.name) || e.name === 'RasterTask') tot[e.name] = (tot[e.name] || 0) + e.dur / 1000 }
  const forced = ev.filter(e => main.has(e.pid + ':' + e.tid) && e.name === 'Layout' && e.args && e.args.beginData && e.args.beginData.stackTrace).length;
  console.log('ms: ' + Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', ') + ` | layouts forced by script: ${forced}`);
  if (errs.length) console.log('PAGE ERRORS ' + errs.join(' | '));
  await browser.close(); srv.close();
})();
