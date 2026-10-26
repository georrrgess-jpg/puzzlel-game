// Real touch-drag test for the drag modes (threads, merge, blocks) using CDP touch events on an emulated phone.
// Usage: NODE_PATH=$(npm root -g) node tools/drag.cjs [W H]      (default Pixel 5)
// For each mode: starts a level, asks the hint where to drag, performs the drag with a finger, and checks the move counted.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  const dev = process.argv[2] ? { viewport: { width: +process.argv[2], height: +process.argv[3] }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['Pixel 5'].userAgent } : devices['Pixel 5'];
  const ctx = await browser.newContext({ ...dev, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://localhost:' + PORT + '/'); await sleep(1400);
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; __game.S.login.last = Math.floor(Date.now() / 864e5) });
  const touch = async (x0, y0, x1, y1, steps = 14) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps, id: 1 }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(350);
  };
  const center = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }, sel);
  const moves = () => page.evaluate(() => { const m = document.querySelector('#hudInfo .mv'); return m ? +m.textContent : -1 });
  let fail = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + ' ' + extra); if (!ok) fail++ };
  const LIFT = 56;
  for (const type of ['threads', 'merge', 'blocks']) {
    const n = await page.evaluate(t => { let n = 1; while (__game.typeFor(n) !== t) n++; return n }, type);
    await page.evaluate(n => __game.startLevel(n), n); await sleep(2600);
    for (let round = 0; round < 3; round++) {
      const m0 = await moves();
      await page.evaluate(() => __game.cur.puz.hint()); await sleep(150);
      let from, to;
      if (type === 'threads') {
        from = await center('.st[data-h="1"]');
        to = await page.evaluate(() => { const c = document.querySelector('.tghost circle'), s = document.querySelector('.thsvg'), r = s.getBoundingClientRect(); return [r.left + (+c.getAttribute('cx')) / 100 * r.width, r.top + (+c.getAttribute('cy')) / 100 * r.height] });
      } else if (type === 'merge') {
        from = await center('.mg[data-h="1"]'); to = await center('.mg[data-h="2"]');
      } else {
        from = await center('.bgs[data-h="1"]');
        to = await page.evaluate(() => { const c = [...document.querySelectorAll('.bz.ht')].map(e => e.getBoundingClientRect()); const x0 = Math.min(...c.map(r => r.left)), x1 = Math.max(...c.map(r => r.right)), y0 = Math.min(...c.map(r => r.top)), y1 = Math.max(...c.map(r => r.bottom)); return [(x0 + x1) / 2, (y0 + y1) / 2] });
      }
      if (!from || !to) { check(`${type} round ${round}: hint targets`, false, JSON.stringify({ from, to })); break }
      if (await page.evaluate(() => __game.cur.over)) break;
      await touch(from[0], from[1], to[0], to[1] + LIFT);
      const m1 = await moves();
      check(`${type} round ${round}: finger drag counted a move`, m1 === m0 + 1, `(moves ${m0} -> ${m1})`);
    }
    // a drop in empty space must not move anything or break state
    const m2 = await moves();
    await touch(200, 120, 200, 140);
    check(`${type}: stray touch is harmless`, (await moves()) === m2);
    // undo works (unless the level was already won, which correctly disables it)
    if (await page.evaluate(() => __game.cur.over)) { console.log('PASS ' + type + ': level solved by finger drags (undo disabled after a win)'); continue }
    await page.evaluate(() => document.querySelector('#undoBtn').click()); await sleep(250);
    check(`${type}: undo reduces moves`, (await moves()) <= m2 - 1 || m2 === 0, `(moves ${m2} -> ${await moves()})`);
  }
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors');
  console.log(fail ? fail + ' FAILED' : 'all passed');
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
