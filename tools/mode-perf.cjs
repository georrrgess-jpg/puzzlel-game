// Every puzzle mode on a slow phone: frame times, stutters and long main-thread tasks while a level opens, while moves
// play out (one every 0.65 s, like a quick player), and through the finish and the win card.
// Usage: NODE_PATH=$(npm root -g) node tools/mode-perf.cjs [cpuSlowdown=6] [mode ...] [--tier=6]   (GFX=high|med|low, default high)
// A "stutter" is a frame that took longer than 34 ms (two or more missed frames at 60 Hz).
// The solver that plays the moves is not something a player waits for, so its own thinking time is left out: the frame
// it runs in and any long task inside it are not counted (everything the move then shows on screen is).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), rate = +(args.find(a => /^\d+(\.\d+)?$/.test(a)) || 6);
const tier = +((args.find(a => a.startsWith('--tier=')) || '--tier=6').slice(7));
const want = args.filter(a => !/^\d/.test(a) && !a.startsWith('--'));
const GFX = process.env.GFX || 'high';
const stats = r => { const ft = r.ft.filter(x => x < 1000).sort((a, b) => a - b), avg = ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length);
  const lt = r.lt.filter(e => !r.bw.some(([a, b]) => e.s >= a - 2 && e.s <= b + 2)).map(e => e.d).sort((a, b) => b - a);
  return `${(1000 / avg).toFixed(0).padStart(3)} fps ${String(ft.filter(x => x > 34).length).padStart(3)} st ${String(Math.round(lt[0] || 0)).padStart(4)}ms` };
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  console.log(`CPU slowdown ${rate}x, 393x851 @2.75x, graphics=${GFX}, difficulty tier ${tier}`);
  console.log('mode      level |   opening (fps, stutters, longest task) |   playing moves                   |   finish + win card');
  const modes = want.length ? want : ['arrows', 'tubes', 'threads', 'merge', 'blocks', 'pics', 'jigsaw'];
  for (const mode of modes) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(g => { try { const k = 'endless-puzzle-pop-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.gfx = g; localStorage.setItem(k, JSON.stringify(s)) } catch (e) {} }, GFX);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:' + PORT + '/'); await sleep(1500);
    const lvl = await p.evaluate(([mode, tier]) => { const g = __game; g.closeModal(); g.S.unlocked = 400; g.S.login.last = today(); g.S.welcome3 = false; g.S.jig.intro = true;
      for (const t of [...g.TYPES, 'jigsaw']) g.S.seen[t] = true; return mode === 'jigsaw' ? 30 : g.levelFor(mode, tier) }, [mode, tier]);
    /* warm-up: one level opened and left, so one-time start-up work (audio, fonts) is not counted as this mode's */
    await p.evaluate(() => { __game.startLevel(2) }); await sleep(1800); await p.evaluate(() => { document.querySelector('#backBtn').click() }); await sleep(1200);
    await p.evaluate(() => { window.__rec = { on: false, ft: [], lt: [], bw: [], skip: false }; let last = 0; const f = t => { if (__rec.on && last && !__rec.skip) __rec.ft.push(t - last); __rec.skip = false; last = t; requestAnimationFrame(f) }; requestAnimationFrame(f);
      try { new PerformanceObserver(l => { if (__rec.on) for (const e of l.getEntries()) __rec.lt.push({ s: e.startTime, d: e.duration }) }).observe({ entryTypes: ['longtask'] }) } catch (e) {} });
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const start = () => p.evaluate(() => { __rec.on = true; __rec.ft = []; __rec.lt = []; __rec.bw = [] }), stop = () => p.evaluate(() => { __rec.on = false; return { ft: __rec.ft, lt: __rec.lt, bw: __rec.bw } });
    /* one solving step: the mode's own solver, or for tap modes its hint and a tap on what it points at */
    const step = () => p.evaluate(() => { const c = __game.cur; if (!c || c.over || c.locked) return false; const q = c.puz, t0 = performance.now(); __rec.skip = true;
      const done = r => { __rec.bw.push([t0, performance.now()]); return r };
      if (q._bot) return done(q._bot() !== false);
      q.hint(); const h = document.querySelector('#board [data-h="1"]') || document.querySelector('#board .hint'); if (!h) return done(false); h.click(); const h2 = document.querySelector('#board [data-h="2"]'); if (h2) h2.click(); return done(true) });
    await start(); await p.evaluate(([m, n]) => m === 'jigsaw' ? __game.startJig(n) : __game.startLevel(n), [mode, lvl]); await sleep(mode === 'jigsaw' ? 3600 : 2600); const open = await stop();
    await start(); for (let k = 0; k < 8; k++) { if (!(await step())) break; await sleep(650) } const play = await stop();
    for (let k = 0; k < 300 && !(await p.evaluate(() => __game.cur.over || __game.cur.locked)); k++) { const ok = await step(); if (!ok) await sleep(150) }
    await start(); await sleep(4200); const win = await stop();
    console.log(`${mode.padEnd(8)} ${String(lvl).padStart(6)} | ${stats(open).padEnd(38)} | ${stats(play).padEnd(33)} | ${stats(win)}${errs.length ? '  ERRORS ' + errs.join(' | ') : ''}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
})();
