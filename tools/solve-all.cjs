// Solvability sweep: for every mode and a spread of difficulty tiers, start the level and let the mode's own solver
// (puz._bot, or hints for tap modes) finish it. Prints moves used vs par thresholds and any failure.
// Usage: NODE_PATH=$(npm root -g) node tools/solve-all.cjs [tiers e.g. 0,1,2,4,6,9,14,25]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tiers = (process.argv[2] || '0,1,2,3,5,7,9,12,20,40').split(',').map(Number);
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 5'], serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:' + PORT + '/'); await sleep(1400);
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; __game.S.login.last = Math.floor(Date.now() / 864e5) });
  const types = await page.evaluate(() => __game.TYPES);
  let bad = 0;
  console.log('mode'.padEnd(9), 'tier level', 'result');
  for (const type of types) for (const tier of tiers) {
    const lvl = await page.evaluate(([t, tier]) => { const N = __game.TYPES.length; for (let n = tier * N + 1; n <= tier * N + N; n++) if (__game.typeFor(n) === t) return n; return null }, [type, tier]);
    if (!lvl) continue;
    const t0 = Date.now();
    const gen = await page.evaluate(n => { const t = performance.now(); __game.startLevel(n); return performance.now() - t }, lvl);
    await sleep(300);
    let steps = 0, ok = false;
    for (; steps < 700; steps++) {
      let st = await page.evaluate(() => { const c = __game.cur; if (!c) return 'gone'; if (c.over) return 'won'; const p = c.puz; if (p._bot) { const r = p._bot(); return r === false ? 'stuck' : 'ok' } p.hint(); const h = document.querySelector('#board [data-h="1"]') || document.querySelector('#board .hint'); if (!h) return 'nohint'; h.click(); const h2 = document.querySelector('#board [data-h="2"]'); if (h2) h2.click(); return 'ok' });
      if (st === 'stuck' || st === 'nohint') { for (let w = 0; w < 30 && st !== 'won'; w++) { await sleep(100); if (await page.evaluate(() => __game.cur && __game.cur.over)) st = 'won' } }   // a win may be waiting on its clear animation
      if (st === 'won') { ok = true; break }
      if (st !== 'ok') { console.log(type.padEnd(9), String(tier).padStart(3), String(lvl).padStart(5), 'FAIL', st, 'after', steps, 'steps'); bad++; break }
      if (steps % 4 === 3) await sleep(30);
    }
    if (ok) { const info = await page.evaluate(() => { const c = __game.cur; return { moves: document.querySelector('#hudInfo .mv') && document.querySelector('#hudInfo .mv').textContent, nx: document.querySelector('#hudInfo .nx') && document.querySelector('#hudInfo .nx').textContent } }); console.log(type.padEnd(9), String(tier).padStart(3), String(lvl).padStart(5), 'ok   ', 'moves', info.moves, '|', info.nx, '| generated in', gen.toFixed(0) + 'ms') }
    else if (steps >= 700) { console.log(type.padEnd(9), tier, lvl, 'FAIL too many steps'); bad++ }
    await sleep(60);
  }
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors', bad ? `| ${bad} FAILED` : '| all solvable');
  await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
