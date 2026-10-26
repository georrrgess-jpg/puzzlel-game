const { chromium, devices } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tapEl = async (page, sel) => { const b = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }, sel); if (!b) throw new Error('missing ' + sel); await page.touchscreen.tap(b[0], b[1]) };
(async () => {
  const browser = await chromium.launch();
  for (const name of (process.argv[2]?process.argv.slice(2):['Pixel 5', 'iPhone 13', 'iPhone SE', 'Galaxy S9+'])) {
    const ctx = await browser.newContext({ ...devices[name] });
    const page = await ctx.newPage();
    const errs = [], bad = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && !/fonts/.test(r.url())) bad.push(r.status() + ' ' + r.url()) });
    await page.goto('http://localhost:8765/');
    await sleep(1500);
    // claim the login reward by tapping
    if (await page.evaluate(() => document.querySelector('#modal').classList.contains('on'))) { await tapEl(page, '#modal .mbtns .btn'); await sleep(1300) }
    const tag = name.replace(/\W+/g, '');
    await page.screenshot({ path: `mob-${tag}-home.png` });
    await tapEl(page, '#playBtn'); await sleep(900);
    // how-to card for first level -> tap "Got it"
    if (await page.evaluate(() => document.querySelector('#modal').classList.contains('on'))) { await tapEl(page, '#modal .mbtns .btn:last-child'); await sleep(2200) }
    // solve level 1 using taps on hinted cells
    for (let i = 0; i < 30 && !(await page.evaluate(() => __game.cur.over)); i++) {
      await page.evaluate(() => { document.querySelectorAll('.hint').forEach(e => e.classList.remove('hint')); __game.cur.puz.hint() });
      const box = await page.evaluate(() => { const h = document.querySelector('#board .hint'); if (!h) return null; const r = h.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] });
      if (!box) break;
      await page.touchscreen.tap(box[0], box[1]); await sleep(250);
    }
    const won = await page.evaluate(() => __game.cur.over);
    await sleep(3500);
    await page.screenshot({ path: `mob-${tag}-win.png` });
    await page.reload(); await sleep(1500);
    const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { registered: !!r, controlled: !!navigator.serviceWorker.controller } });
    const overflow = await page.evaluate(() => { const h = document.querySelector('#home'); return { scrollW: document.documentElement.scrollWidth, vw: innerWidth, homeOverflowY: h.scrollHeight - h.clientHeight } });
    console.log(name, JSON.stringify({ viewport: devices[name].viewport, wonByTouch: won, sw, overflow, errors: errs, bad }));
    await ctx.close();
  }
  await browser.close();
})();
