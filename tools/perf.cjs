// Frame-rate / long-task benchmark under CPU throttling (a stand-in for a mid-range phone).
// Usage: NODE_PATH=$(npm root -g) node tools/perf.cjs [throttle=4] [scenario ...]
// Starts its own static server on :8766. Scenarios: home map lights tubes win modal   (default: all)
// Output: one row per scenario: avg fps, p5 fps (slowest 5% of frames), long tasks (>50ms), worst frame ms.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d) } });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const throttle = /^\d+$/.test(args[0] || '') ? +args.shift() : 4;
const want = args.length ? args : ['home', 'map', 'lights', 'tubes', 'win', 'modal'];
(async () => {
  await new Promise(r => srv.listen(8766, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 5'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://localhost:8766/'); await sleep(1500);
  await page.evaluate(() => { document.querySelector('#modal').classList.remove('on'); const S = __game.S; S.coins = 5000; for (const t of Object.keys(S.seen)) S.seen[t] = true; for (const t of ['lights', 'tubes', 'blocks', 'merge', 'threads']) S.seen[t] = true; S.unlocked = 40; S.login.last = Math.floor(Date.now() / 864e5) });
  await page.evaluate(() => {
    window.__perf = { frames: [], long: 0, on: false };
    let last = performance.now();
    (function f(t) { if (window.__perf.on) window.__perf.frames.push(t - last); last = t; requestAnimationFrame(f) })(last);
    try { new PerformanceObserver(l => { if (window.__perf.on) window.__perf.long += l.getEntries().filter(e => e.duration > 50).length }).observe({ entryTypes: ['longtask'] }) } catch (e) { }
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const measure = async (name, fn, ms = 4000) => {
    await page.evaluate(() => { window.__perf.frames = []; window.__perf.long = 0; window.__perf.on = true });
    const t0 = Date.now(); await fn(); const rest = ms - (Date.now() - t0); if (rest > 0) await sleep(rest);
    const r = await page.evaluate(() => { window.__perf.on = false; return { f: window.__perf.frames.slice(3), long: window.__perf.long } });
    const f = r.f.length ? r.f : [999], tot = f.reduce((a, b) => a + b, 0), sorted = [...f].sort((a, b) => b - a);
    const p5 = sorted[Math.floor(sorted.length * .05)] || sorted[0];
    console.log(name.padEnd(8), 'avg', (1000 * f.length / tot).toFixed(1).padStart(5), 'fps | p5', (1000 / p5).toFixed(1).padStart(5), 'fps | long tasks', String(r.long).padStart(2), '| worst', sorted[0].toFixed(0) + 'ms');
  };
  const tapHint = async () => {
    await page.evaluate(() => { document.querySelectorAll('.hint').forEach(e => e.classList.remove('hint')); __game.cur.puz.hint() }); await sleep(60);
    await page.evaluate(() => { const h = document.querySelector('#board .hint'); if (h) h.click() });
  };
  console.log(`CPU throttle ${throttle}x, Pixel 5 viewport`);
  for (const s of want) {
    try {
      if (s === 'home') { await page.evaluate(() => __game.show('home')); await sleep(800); await measure('home', async () => { }, 5000) }
      if (s === 'map') { await page.evaluate(() => __game.show('map')); await sleep(900); await measure('map', async () => { for (let i = 0; i < 10; i++) { await page.evaluate(y => document.querySelector('#mapwrap').scrollBy(0, y), 160); await sleep(250) } }, 3500) }
      if (s === 'lights' || s === 'tubes') {
        const lvl = s === 'lights' ? 1 : 2;
        await page.evaluate(n => __game.startLevel(n), lvl); await sleep(2500);
        await measure(s, async () => { for (let i = 0; i < 8; i++) { if (await page.evaluate(() => __game.cur.over)) break; await tapHint(); await sleep(s === 'tubes' ? 500 : 250) } }, 5000);
      }
      if (s === 'win') { await page.evaluate(() => __game.startLevel(1)); await sleep(2500); await measure('win', async () => { for (let i = 0; i < 20; i++) { if (await page.evaluate(() => __game.cur.over)) break; await tapHint(); await sleep(150) } }, 6000) }
      if (s === 'modal') { await page.evaluate(() => { document.querySelector('#modal').classList.remove('on'); __game.show('home') }); await sleep(500); await measure('modal', async () => { await page.evaluate(() => document.querySelector('#tQuests').click()) }, 3000) }
    } catch (e) { console.log(s, 'FAILED', e.message.split('\n')[0]) }
  }
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
  await browser.close(); srv.close();
})();
