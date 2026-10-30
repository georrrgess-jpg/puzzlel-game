// Device matrix: visits every screen, every mode and the main popups on six phone sizes and reports layout problems
// (horizontal scroll, controls outside the viewport, touch targets under 40px, popup buttons below the fold).
// Screenshots go to <outdir>/<device>/<screen>.png.
// Usage: NODE_PATH=$(npm root -g) node tools/matrix.cjs <outdir> [deviceFilter] [--quiet]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEVICES = {
  'iPhone-SE': { width: 320, height: 568, dpr: 2 }, 'iPhone-8': { width: 375, height: 667, dpr: 2 }, 'iPhone-13': { width: 390, height: 844, dpr: 3 },
  'iPhone-ProMax': { width: 430, height: 932, dpr: 3 }, 'Galaxy-360': { width: 360, height: 800, dpr: 3 }, 'Pixel-5': { width: 393, height: 851, dpr: 2.75 }
};
const out = process.argv[2] || 'matrix-out', filter = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null, quiet = process.argv.includes('--quiet');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch(); let total = 0;
  for (const [name, d] of Object.entries(DEVICES)) {
    if (filter && !name.includes(filter)) continue;
    const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true, userAgent: UA, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
    await page.goto('http://localhost:' + PORT + '/'); await sleep(1400);
    await page.evaluate(() => { const S = __game.S; S.coins = 3000; S.hints = 5; S.login.last = Math.floor(Date.now() / 864e5); S.welcome3 = false; for (const t of __game.TYPES) S.seen[t] = true; S.unlocked = 60; S.deco = ['sunflower', 'butterfly']; __game.closeModal() });
    const issues = [];
    const check = async (screen) => {
      const r = await page.evaluate(([screen]) => {
        const vw = innerWidth, vh = innerHeight, bad = [];
        const hs = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;
        if (hs) bad.push('horizontal scroll (' + document.documentElement.scrollWidth + ' > ' + vw + ')');
        const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05 };
        const inScroller = e => !!e.closest('.mapwrap,.shoplist,.card,#home,.achgrid,.qlist');
        const sel = 'button,.tool,.mtile,.iconbtn';
        document.querySelectorAll(sel).forEach(e => {
          if (!vis(e) || e.disabled && !e.matches('.node')) return;
          const r = e.getBoundingClientRect(), id = (e.id || e.className || e.tagName).toString().split(' ').slice(0, 2).join('.') + ' "' + (e.textContent || '').trim().slice(0, 14) + '"';
          const activeScreen = e.closest('.screen.active,#modal.on,#banners'); if (!activeScreen) return;
          if (e.matches('.node,.sw,.seg3 button,.bgs,.mg')) return;
          if (!inScroller(e) || e.closest('.mbtns,.toolbar')) {
            if (!e.closest('.wtabs') && (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1)) bad.push('outside viewport: ' + id + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom) + ']');
          }
          if ((r.width < 40 || r.height < 36) && !e.matches('.chip,.dot,.more')) bad.push('small target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + id);
        });
        if (screen.startsWith('play-')) {
          // the play header and HUD: one-line mode label, nothing colliding or truncated
          const ps = document.querySelector('#play .ptitle small');
          if (ps && (ps.scrollWidth > ps.clientWidth + 1 || ps.getBoundingClientRect().height > 26)) bad.push('mode label is truncated or wraps: "' + ps.textContent.trim() + '" (' + ps.scrollWidth + '/' + ps.clientWidth + ', h ' + Math.round(ps.getBoundingClientRect().height) + ')');
          const mt = document.querySelector('#hudInfo .mtx');
          if (mt && mt.children.length > 1) {
            const a = mt.children[0].getBoundingClientRect(), b2 = mt.children[1].getBoundingClientRect();
            if (a.right > b2.left - 1 && a.bottom > b2.top + 2 && b2.bottom > a.top + 2) bad.push('HUD text collides: "' + mt.textContent.trim() + '"');
          }
          const co = document.querySelector('#coach');
          if (co && co.textContent.trim() && co.scrollWidth > co.clientWidth + 1) bad.push('coach text is cut off: "' + co.textContent.trim() + '"');
          const hd = document.querySelector('#play .hud');
          if (hd && hd.getBoundingClientRect().right > vw + 1) bad.push('HUD wider than the screen');
        }
        if (screen === 'map') {
          // world banners: the one-line caption and the name must not be cut off
          document.querySelectorAll('.wbanner .wtx small').forEach(e => { if (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > 14) bad.push('world caption wraps or is cut: "' + e.textContent.trim() + '"') });
          document.querySelectorAll('.wbanner .wtx b').forEach(e => { if (e.scrollWidth > e.clientWidth + 1) bad.push('world name is cut off: "' + e.textContent.trim() + '"') });
        }
        const modal = document.querySelector('#modal.on .card');
        if (modal) { const b = modal.querySelector('.mbtns .btn:last-child'); if (b) { const r = b.getBoundingClientRect(); if (r.bottom > vh + 1) bad.push('popup main button below the fold (bottom ' + Math.round(r.bottom) + ' > ' + vh + ')') } }
        // popups: nothing may sit on top of a footer button, and body content must stay clear of the footer
        if (modal) {
          const foot = modal.querySelector('.mbtns'), body = modal.querySelector('.mbody');
          modal.querySelectorAll('.mbtns .btn').forEach(b => {
            const r = b.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (top && top !== b && !b.contains(top)) bad.push('button covered by another element: "' + b.textContent.trim().slice(0, 14) + '" under <' + top.tagName.toLowerCase() + ' class="' + String(top.className).slice(0, 24) + '">');
          });
          // visible text (clipped to the scrolling body when there is one) must not reach into the footer band
          if (foot) {
            const fr = foot.getBoundingClientRect(), clip = (body || modal).getBoundingClientRect();
            const tw = document.createTreeWalker(modal, NodeFilter.SHOW_TEXT);
            let n, hit = null;
            while ((n = tw.nextNode()) && !hit) {
              if (!n.textContent.trim() || foot.contains(n) || !n.parentElement || getComputedStyle(n.parentElement).visibility === 'hidden') continue;
              const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect();
              const x0 = Math.max(r.left, clip.left, fr.left), x1 = Math.min(r.right, clip.right, fr.right), y0 = Math.max(r.top, clip.top, fr.top), y1 = Math.min(r.bottom, clip.bottom, fr.bottom);
              if (x1 - x0 > 2 && y1 - y0 > 2) hit = n.textContent.trim().slice(0, 24);
            }
            if (hit) bad.push('popup text runs under its buttons: "' + hit + '"');
            const c = modal.getBoundingClientRect();
            if (c.bottom > vh + 1 || c.top < -1) bad.push('popup does not fit the screen [' + Math.round(c.top) + ',' + Math.round(c.bottom) + ']');
          }
        }
        return bad;
      }, [screen]);
      for (const m of r) issues.push(`  [${screen}] ${m}`);
    };
    const shot = async n => { if (!quiet) await page.screenshot({ path: path.join(dir, n + '.png') }) };
    const closeM = () => page.evaluate(() => __game.closeModal());
    const openAndCheck = async (label, fn) => { await closeM(); await fn(); await sleep(900); await check(label); await shot(label); };
    // menu screens
    for (const s of ['home', 'map', 'shop']) { await closeM(); await page.evaluate(s => __game.show(s), s); await sleep(1000); await check(s); await shot(s) }
    // each mode: intro banner gone, mid-play
    const types = await page.evaluate(() => __game.TYPES);
    for (const t of types) {
      await closeM();
      await page.evaluate(t => { let n = 1; while (__game.typeFor(n) !== t) n++; __game.startLevel(n) }, t); await sleep(2800);
      await page.evaluate(() => { const p = __game.cur.puz; if (p._bot) p._bot(); else { p.hint(); const h = document.querySelector('#board .hint,#board [data-h="1"]'); if (h) h.click() } }); await sleep(600);
      await check('play-' + t); await shot('play-' + t);
      // how-to card
      await page.evaluate(() => document.querySelector('#helpBtn').click()); await sleep(700); await check('howto-' + t); await shot('howto-' + t); await closeM();
    }
    // popups
    await openAndCheck('settings', () => page.evaluate(() => { __game.show('home'); document.querySelector('#settingsBtn').click() }));
    await openAndCheck('quests', () => page.evaluate(() => document.querySelector('#tQuests').click()));
    await openAndCheck('trophies', () => page.evaluate(() => document.querySelector('#tTrophy').click()));
    await openAndCheck('spin', () => page.evaluate(() => document.querySelector('#tSpin').click()));
    await openAndCheck('profile', () => page.evaluate(() => document.querySelector('#profileBtn').click()));
    await openAndCheck('login', () => page.evaluate(() => { __game.S.login.last = -1; showLogin() }));
    // win card: solve level 1
    await closeM(); await page.evaluate(() => { __game.S.login.last = Math.floor(Date.now() / 864e5); __game.startLevel(1) }); await sleep(2500);
    for (let i = 0; i < 12 && !(await page.evaluate(() => __game.cur.over)); i++) { await page.evaluate(() => { const p = __game.cur.puz; p.hint(); const h = document.querySelector('#board .hint'); if (h) h.click() }); await sleep(250) }
    await sleep(3800); await check('win'); await shot('win');
    console.log((issues.length ? '✗ ' : '✓ ') + name.padEnd(14) + `${d.width}x${d.height}` + (issues.length ? '  ' + issues.length + ' issue(s)' : '  clean') + (errs.length ? '  PAGE ERRORS: ' + errs.join(' | ') : ''));
    issues.forEach(i => console.log(i)); total += issues.length + errs.length;
    await ctx.close();
  }
  console.log(total ? `\n${total} issue(s)` : '\nall devices clean');
  await browser.close(); srv.close();
})();
