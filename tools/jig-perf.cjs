// Jigsaw performance on a slow phone: frame times, stutters and long main-thread tasks for the moments that matter.
// Usage: NODE_PATH=$(npm root -g) node tools/jig-perf.cjs [cpuSlowdown=6] [scenario ...]   (GFX=high|med|low, default high)
// Scenarios: play (PLAY from the gallery after it has been open a moment, and the opening reveal: the usual way in),
// next (Next puzzle from a win card), cold (a puzzle opened with nothing prepared: the worst case), drag (carry a piece
// around for 2.5 s), moves (8 real drags that lock pieces), win (the last move, the finish and the win card),
// hub (open the gallery on a full album page, nothing cached yet), hub2 (the same gallery opened a second time).
// A "stutter" is a frame that took longer than 34 ms (two or more missed frames at 60 Hz).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), rate = +(args.find(a => /^\d+(\.\d+)?$/.test(a)) || 6), want = args.filter(a => !/^\d/.test(a));
const GFX = process.env.GFX || 'high';
const ALL = ['play', 'next', 'cold', 'drag', 'moves', 'win', 'hub', 'hub2'];
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  console.log(`CPU slowdown ${rate}x, 393x851 @2.75x, graphics=${GFX}`);
  for (const sc of (want.length ? want : ALL)) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(g => { try { const k = 'endless-puzzle-pop-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.gfx = g; localStorage.setItem(k, JSON.stringify(s)) } catch (e) {} }, GFX);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:' + PORT + '/'); await sleep(1500);
    await p.evaluate(() => { const g = __game; g.closeModal(); g.S.unlocked = 20; g.S.jig.intro = true; g.S.seen.jigsaw = true; g.S.login.last = today(); g.S.welcome3 = false; for (let n = 1; n <= 23; n++) g.S.jig.stars[n] = 2; g.S.jig.next = 24 });
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    /* recorder: rAF frame gaps and long tasks between start() and stop() */
    await p.evaluate(() => { window.__rec = { on: false, ft: [], lt: [] }; let last = 0; const f = t => { if (__rec.on && last) __rec.ft.push(t - last); last = t; requestAnimationFrame(f) }; requestAnimationFrame(f);
      try { new PerformanceObserver(l => { if (__rec.on) for (const e of l.getEntries()) __rec.lt.push(e.duration) }).observe({ entryTypes: ['longtask'] }) } catch (e) {} });
    const start = () => p.evaluate(() => { __rec.on = true; __rec.ft = []; __rec.lt = [] });
    const stop = () => p.evaluate(() => { __rec.on = false; return { ft: __rec.ft, lt: __rec.lt } });
    const cellAt = c => p.evaluate(c => { const st = __game.cur.puz._state(), r = document.querySelector('.jgb').getBoundingClientRect(); return [r.left + (c % st.C + .5) * r.width / st.C, r.top + (Math.floor(c / st.C) + .5) * r.height / st.R] }, c);
    const dragMove = async () => { const m = await p.evaluate(() => { const q = __game.cur.puz, st = q._state(); for (let c = 0; c < st.N; c++) if (st.g[c] !== c) return { from: c, to: st.g[c] }; return null }); if (!m) return false;
      const [x0, y0] = await cellAt(m.from), [x1, y1] = await cellAt(m.to); await p.mouse.move(x0, y0); await p.mouse.down();
      for (let i = 1; i <= 14; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 14, y0 + (y1 - y0) * i / 14); await sleep(16) } await p.mouse.up(); await sleep(520); return true };
    let extra = '';
    if (sc === 'cold') { await start(); await p.evaluate(() => __game.startJig(30)); await sleep(3800) }
    else if (sc === 'play') { await p.evaluate(() => { __game.S.jig.next = 30; __game.startJig(29) }); await sleep(4200); await p.evaluate(() => { __game.closeModal(); __game.show('jig') }); await sleep(3500); await start(); await p.evaluate(() => document.querySelector('#jgPlay').click()); await sleep(3800) }
    else if (sc === 'next') { await p.evaluate(() => __game.startJig(29)); await sleep(4200); await p.evaluate(() => { const q = __game.cur.puz; for (let k = 0; k < 80 && !__game.cur.locked; k++) q._bot() }); await sleep(8000); await start(); await p.evaluate(() => document.querySelector('#modal .mbtns .btn.next').click()); await sleep(3800) }
    else {
      if (['drag', 'moves', 'win'].includes(sc)) { await p.evaluate(() => __game.startJig(30)); await sleep(4200) }
      if (sc === 'drag') { const [x, y] = await cellAt(12); await p.mouse.move(x, y); await p.mouse.down(); await start(); for (let i = 0; i < 150; i++) { const a = i / 18; await p.mouse.move(x + 110 * Math.cos(a), y + 140 * Math.sin(a)); await sleep(16) } await p.mouse.up(); await sleep(400) }
      if (sc === 'moves') { await start(); for (let k = 0; k < 8; k++) await dragMove() }
      if (sc === 'win') { await p.evaluate(() => { const q = __game.cur.puz; for (let k = 0; k < 60; k++) { const st = q._state(); if (st.links >= (st.C - 1) * st.R + st.C * (st.R - 1) - 2) break; q._bot() } }); await sleep(800); await start(); for (let k = 0; k < 4 && !(await p.evaluate(() => __game.cur.locked)); k++) await dragMove(); await sleep(4500) }
      if (sc === 'hub2') { await p.evaluate(() => __game.show('jig')); await sleep(9000); await p.evaluate(() => __game.show('home')); await sleep(1500) }
      if (sc === 'hub' || sc === 'hub2') { await start(); const t0 = await p.evaluate(() => performance.now()); await p.evaluate(() => { __game.show('jig') }); await sleep(3500); extra = ` | album pictures shown after ${await p.evaluate(t0 => { const im = [...document.querySelectorAll('#jgGrid img')]; return im.length && im.every(i => i.complete && i.naturalWidth) ? 'all loaded' : im.filter(i => i.complete && i.naturalWidth).length + '/' + im.length }, t0)}` }
    }
    const r = await stop(); const ft = r.ft.filter(x => x < 1000).sort((a, b) => a - b);
    const avg = ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length), p95 = ft[Math.floor(ft.length * .95)] || 0, stut = ft.filter(x => x > 34).length;
    const lt = r.lt.sort((a, b) => b - a);
    console.log(`${sc.padEnd(6)} avg ${(1000 / avg).toFixed(1).padStart(5)} fps | p95 ${p95.toFixed(0).padStart(3)}ms | stutters ${String(stut).padStart(3)} / ${ft.length} frames | worst ${(ft[ft.length - 1] || 0).toFixed(0).padStart(4)}ms | long tasks ${lt.length} (max ${(lt[0] || 0).toFixed(0)}ms, total ${lt.reduce((a, b) => a + b, 0).toFixed(0)}ms)${extra}${errs.length ? ' | ERRORS ' + errs.join(' | ') : ''}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
})();
