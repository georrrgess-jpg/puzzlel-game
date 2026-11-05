// Block Garden on a slow phone: real touch drags of blocks onto the bed, measured frame by frame.
// For each drag: frames while the block follows the finger, and the second after it is dropped (the block lands, and
// lines bloom when one fills). Also where the main thread's time goes over the whole run.
// Usage: NODE_PATH=$(npm root -g) node tools/blocks-perf.cjs [cpuSlowdown=6] [drags=8]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rate = +(process.argv[2] || 6), drags = +(process.argv[3] || 8), LIFT = 56;
(async () => {
  await new Promise(r => srv.listen(0, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + srv.address().port + '/'); await sleep(1500);
  await p.evaluate(() => { const g = __game; g.closeModal(); g.S.gfx = 'high'; g.S.unlocked = 400; g.S.login.last = today(); for (const t of g.TYPES) g.S.seen[t] = true });
  await p.evaluate(() => __game.startLevel(2)); await sleep(1500); await p.evaluate(() => document.querySelector('#backBtn').click()); await sleep(1000);
  await p.evaluate(() => __game.startLevel(__game.levelFor('blocks', 5))); await sleep(2500);
  await p.evaluate(() => { window.__f = []; let l = 0; const f = t => { if (l) __f.push([t, t - l]); l = t; requestAnimationFrame(f) }; requestAnimationFrame(f);
    window.__lt = []; new PerformanceObserver(o => { for (const e of o.getEntries()) __lt.push([e.startTime, e.duration]) }).observe({ entryTypes: ['longtask'] }) });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await browser.startTracing(p, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  const res = [];
  for (let d = 0; d < drags; d++) {
    /* the solver picks a good move; the finger carries that block from its slot to the spot */
    const mv = await p.evaluate(() => { const c = __game.cur; if (c.over || c.locked) return null; const P = c.puz; const m = P._plan ? P._plan() : null; return m });
    if (!mv) break;
    const t0 = await p.evaluate(() => performance.now());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mv.sx, y: mv.sy, id: 1 }] });
    const steps = 24;
    for (let i = 1; i <= steps; i++) { const k = i / steps; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mv.sx + (mv.tx - mv.sx) * k, y: mv.sy + (mv.ty + LIFT - mv.sy) * k, id: 1 }] }); await sleep(16) }
    const t1 = await p.evaluate(() => performance.now());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(1300);
    const t2 = await p.evaluate(() => performance.now());
    res.push([t0, t1, t2, mv.lines]);
  }
  await sleep(300);
  const buf = await browser.stopTracing();
  const { f, lt } = await p.evaluate(() => ({ f: __f, lt: __lt }));
  const sum = (a, b) => { const ft = f.filter(([t]) => t >= a && t < b).map(x => x[1]), avg = ft.reduce((x, y) => x + y, 0) / Math.max(1, ft.length);
    return { fps: Math.round(1000 / avg), st: ft.filter(x => x > 34).length, worst: Math.round(Math.max(0, ...ft)), lt: Math.round(Math.max(0, ...lt.filter(([t]) => t >= a && t < b).map(x => x[1]))) } };
  console.log(`CPU ${rate}x slower, 393x851 @2.75x, high graphics, ${res.length} drags`);
  const agg = { drag: [], drop: [], bloom: [] };
  for (const [t0, t1, t2, lines] of res) { agg.drag.push(sum(t0, t1)); (lines ? agg.bloom : agg.drop).push(sum(t1, t2)) }
  const show = (k, a) => a.length && console.log(`${k.padEnd(18)} ${String(a.length).padStart(2)}x  fps ${Math.round(a.reduce((x, y) => x + y.fps, 0) / a.length)}  stutters ${a.reduce((x, y) => x + y.st, 0)}  worst frame ${Math.max(...a.map(x => x.worst))} ms  longest task ${Math.max(...a.map(x => x.lt))} ms`);
  show('while dragging', agg.drag); show('drop (no line)', agg.drop); show('drop + bloom', agg.bloom);
  const ev = JSON.parse(buf.toString()).traceEvents, main = new Set(ev.filter(e => e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain').map(e => e.pid + ':' + e.tid));
  const want = ['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Commit', 'Layerize', 'FunctionCall', 'EventDispatch', 'FireAnimationFrame', 'TimerFire', 'MajorGC', 'MinorGC', 'HitTest'], agg2 = {};
  for (const e of ev) { if (e.ph !== 'X' || !main.has(e.pid + ':' + e.tid) || !want.includes(e.name)) continue; agg2[e.name] = (agg2[e.name] || 0) + (e.dur || 0) / 1000 }
  console.log('main thread ms: ' + Object.entries(agg2).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', '));
  /* what gets repainted, and how long painting it took */
  const paints = ev.filter(e => e.name === 'Paint' && e.ph === 'X' && main.has(e.pid + ':' + e.tid) && e.args && e.args.data && e.args.data.clip);
  const by = {}; for (const e of paints) { const k = (e.args.data.nodeName || '?').slice(0, 40); by[k] = by[k] || [0, 0]; by[k][0]++; by[k][1] += e.dur / 1000 }
  console.log(`paints: ${paints.length}; by element (count, ms): ` + Object.entries(by).sort((a, b) => b[1][1] - a[1][1]).slice(0, 10).map(([k, v]) => `${k} ${v[0]}x ${v[1].toFixed(0)}ms`).join(' | '));
  const forced = ev.filter(e => main.has(e.pid + ':' + e.tid) && (e.name === 'Layout' || e.name === 'UpdateLayoutTree') && e.args && e.args.beginData && e.args.beginData.stackTrace).length;
  console.log('forced style/layout recalcs from script: ' + forced);
  if (errs.length) console.log('PAGE ERRORS ' + errs.join(' | '));
  await browser.close(); srv.close();
})();
