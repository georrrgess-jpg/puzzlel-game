// Regression checks for the bugs fixed in v4 (see PLAN-v4.md section 2). Every check has its own fresh page.
// Usage: NODE_PATH=$(npm root -g) node tools/regress.cjs [name-filter]      exit code 1 if anything fails
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const filter = process.argv[2];
let fails = 0;
const ck = (name, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); if (!ok) fails++ };
const prep = p => p.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; __game.S.login.last = today(); __game.S.welcome3 = false });
const typeLevel = (p, t) => p.evaluate(t => { let n = 1; while (__game.typeFor(n) !== t) n++; return n }, t);

(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  const test = async (name, fn, opts = {}) => {
    if (filter && !name.includes(filter)) return;
    const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    if (opts.init) await page.addInitScript(opts.init);
    await page.goto('http://localhost:' + PORT + '/'); await sleep(opts.boot || 1300);
    try { await fn(page) } catch (e) { ck(name, false, 'threw: ' + e.message.split('\n')[0]) }
    if (errs.length) ck(name + ': no page errors', false, errs.join(' | '));
    await ctx.close();
  };

  await test('B1 login double tap pays once', async p => {
    await sleep(700);   // the daily-reward popup queues itself on boot
    ck('B1 popup is the daily reward', await p.evaluate(() => document.querySelector('#modal.on h2')?.textContent === 'Daily Reward'));
    const c0 = await p.evaluate(() => __game.S.coins), pay = await p.evaluate(() => ECON.login[0].c || 0);
    await p.evaluate(() => { const b = document.querySelector('#modal .mbtns .btn:last-child'); b.click(); b.click(); b.click() });
    await sleep(900);
    ck('B1 paid exactly once', (await p.evaluate(() => __game.S.coins)) === c0 + pay, `(${c0} -> ${await p.evaluate(() => __game.S.coins)}, reward ${pay})`);
  });

  await test('B2 daily restart cannot be re-won', async p => {
    await prep(p);
    await p.evaluate(() => { const S = __game.S; S.dchal = { last: today() - 1, streak: 5, tday: -1 } });
    await p.evaluate(() => document.querySelector('#tDaily').click()); await sleep(1000);
    await p.evaluate(() => __game.api.win(3));
    const after1 = await p.evaluate(() => ({ coins: __game.S.coins, daily: __game.S.stats.daily, streak: __game.S.dchal.streak }));
    await p.evaluate(() => document.querySelector('#restartBtn').click()); await sleep(300);
    ck('B2 restart is ignored once the level is won', await p.evaluate(() => __game.cur.over === true));
    await p.evaluate(() => __game.startLevel(0, { daily: true })); await sleep(300);
    ck('B2 starting the daily again is refused', await p.evaluate(() => __game.cur.over === true), await p.evaluate(() => document.querySelector('#toast').textContent));
    await sleep(1500);
    const after2 = await p.evaluate(() => ({ coins: __game.S.coins, daily: __game.S.stats.daily, streak: __game.S.dchal.streak }));
    ck('B2 coins, daily count and streak are unchanged', JSON.stringify(after1) === JSON.stringify(after2) && after2.streak === 6, JSON.stringify([after1, after2]));
  });

  await test('B3 daily is booked to the day it started', async p => {
    await prep(p);
    await p.evaluate(() => document.querySelector('#tDaily').click()); await sleep(1000);
    const d0 = await p.evaluate(() => today());
    await p.evaluate(() => { const RD = Date; window.Date = class extends RD { constructor(...a) { a.length ? super(...a) : super(RD.now() + 864e5) } static now() { return RD.now() + 864e5 } } });
    await p.evaluate(() => __game.api.win(3)); await sleep(1500);
    const r = await p.evaluate(() => ({ last: __game.S.dchal.last, done: dailyDone(), today: today() }));
    ck('B3 booked to the start day', r.last === d0 && r.today === d0 + 1, JSON.stringify(r));
    ck('B3 the new day\'s daily is still open', r.done === false);
  });

  await test('B4 Enter never presses a destructive default', async p => {
    await prep(p); await p.evaluate(() => { __game.S.coins = 1234 });
    await p.click('#settingsBtn'); await sleep(300); await p.click('#resetBtn'); await sleep(300);
    ck('B4 reset popup focuses Cancel', await p.evaluate(() => /Cancel/.test(document.activeElement.textContent)));
    await p.evaluate(() => document.activeElement.blur());   // focus on the page: a bare Enter must do nothing here
    await p.keyboard.press('Enter'); await sleep(600);
    ck('B4 bare Enter does nothing in the reset popup', await p.evaluate(() => document.querySelector('#modal h2').textContent === 'Erase everything?' && __game.S.coins === 1234));
    await p.focus('#modal .mbtns .btn:first-child'); await p.keyboard.press('Enter'); await sleep(800);
    ck('B4 Enter on Cancel cancels', await p.evaluate(() => document.querySelector('#modal h2').textContent === 'Settings' && __game.S.coins === 1234 && !!localStorage.getItem(KEY)));
  });

  await test('B5 a won Block Garden level cannot be thrown away', async p => {
    await prep(p); await p.evaluate(() => { __game.S.coins = 500; __game.S.skips = 0; __game.S.hints = 2 });
    const lv = await typeLevel(p, 'blocks'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
    await p.evaluate(() => { let k = 0; while (__game.cur.puz._bot() && k++ < 300); });
    const locked = await p.evaluate(() => ({ locked: __game.cur.locked, over: __game.cur.over }));
    ck('B5 the level is locked while the win plays out', locked.locked === true && locked.over === false, JSON.stringify(locked));
    await p.evaluate(() => { for (const id of ['#hintBtn', '#skipBtn', '#restartBtn', '#backBtn', '#undoBtn']) document.querySelector(id).click() }); await sleep(200);
    ck('B5 no skip popup opened', await p.evaluate(() => !document.querySelector('#modal.on')));
    await sleep(3000);
    const r = await p.evaluate(lv => ({ stars: __game.S.stars[lv], wins: __game.S.stats.wins, coins: __game.S.coins, hints: __game.S.hints, level: __game.cur && __game.cur.level }), lv);
    ck('B5 the win was recorded and nothing was charged', r.stars >= 1 && r.wins === 1 && r.hints === 2 && r.coins >= 500, JSON.stringify(r));
  });

  await test('B6 a stale Sand Tubes hint timer leaves the next level alone', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'tubes'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
    for (let k = 0; k < 3; k++) { await p.evaluate(() => __game.cur.puz.hint()); await sleep(100); await p.evaluate(() => { const t = [...document.querySelectorAll('#board .tube')]; t.find(x => x.dataset.h === '1').click(); t.find(x => x.dataset.h === '2').click() }); await sleep(250) }
    await p.evaluate(() => __game.cur.puz.hint()); await sleep(200);
    await p.evaluate(() => document.querySelector('#restartBtn').click()); await sleep(300);
    await p.evaluate(() => { const m = document.querySelector('#modal.on'); if (m && /Restart/.test(m.textContent)) m.querySelector('.mbtns .btn:last-child').click() }); await sleep(3300);
    ck('B6 the fresh level still shows 0 moves', await p.evaluate(() => document.querySelector('#hudInfo .mv').textContent) === '0');
  });

  await test('B7 a hint that shows nothing is free', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'blocks'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
    await p.evaluate(() => { const s = JSON.parse(__game.cur.puz.snap()); const N = Math.sqrt(s.G.length); s.G = s.G.map((_, i) => ((i % N) + ((i / N) | 0)) % 2 ? 1 : 0); s.tray = [1, 1, 2]; __game.cur.puz.restore(JSON.stringify(s)); __game.S.hints = 0; __game.S.coins = 500 });
    await sleep(300); await p.evaluate(() => document.querySelector('#hintBtn').click()); await sleep(200);
    const r = await p.evaluate(() => ({ c: __game.S.coins, hinted: __game.cur.hinted, n: __game.S.stats.hints }));
    ck('B7 no coins taken, not marked as hinted', r.c === 500 && !r.hinted && r.n === 0, JSON.stringify(r));
    await p.evaluate(() => { __game.cur.puz.restore(__game.cur.history[0]) }); await sleep(300);
    await p.evaluate(() => document.querySelector('#hintBtn').click()); await sleep(200);
    ck('B7 a real hint still costs', await p.evaluate(() => __game.S.coins === 500 - ECON.hint.cost && __game.cur.hinted));
  });

  await test('B8 the spin prize is paid before the animation', async p => {
    await prep(p);
    await p.evaluate(() => document.querySelector('#tSpin').click()); await sleep(300);
    const b = await p.evaluate(() => ({ c: __game.S.coins, h: __game.S.hints, s: __game.S.skips }));
    await p.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click()); await sleep(600);
    const a = await p.evaluate(() => ({ c: __game.S.coins, h: __game.S.hints, s: __game.S.skips, spins: __game.S.stats.spins, ready: Date.now() >= __game.S.spinAt }));
    ck('B8 something was paid and the spin is used', a.c + a.h + a.s > b.c + b.h + b.s && a.spins === 1 && !a.ready, JSON.stringify([b, a]));
    await p.reload(); await sleep(1300);
    const r = await p.evaluate(() => ({ c: __game.S.coins, h: __game.S.hints, s: __game.S.skips }));
    ck('B8 the prize survived a reload mid-spin', r.c === a.c && r.h === a.h && r.s === a.s, JSON.stringify(r));
  });

  await test('B10 audio is revived by a tap after an interruption', async p => {
    await p.mouse.click(200, 400); await sleep(300);
    const s0 = await p.evaluate(() => AU.ctx && AU.ctx.state);
    if (s0 !== 'running') { ck('B10 (skipped: headless audio never ran)', true, String(s0)); return }
    await p.evaluate(() => AU.ctx.suspend()); await sleep(200);
    await p.mouse.click(200, 400); await sleep(400);
    ck('B10 running again after a tap', await p.evaluate(() => AU.ctx.state) === 'running');
  });

  await test('B11 the board ignores taps right after a level starts', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'lights'); await p.evaluate(n => __game.startLevel(n), lv);
    await p.evaluate(() => { const t = performance.now(); const c = () => { const el = document.querySelector('#board .cell'); if (el) { el.click(); document.__tapped = performance.now() - t } else requestAnimationFrame(c) }; c() });
    await sleep(1500);
    ck('B11 an immediate tap did not count as a move', await p.evaluate(() => document.querySelector('#hudInfo .mv').textContent) === '0');
  });

  await test('B12 boot popups wait their turn', async p => {
    await prep(p); await p.evaluate(() => { __game.S.login.last = -1; showSettings(); queueModal(() => { if (loginDue()) showLogin() }) });
    await sleep(1200);
    ck('B12 settings stays open', await p.evaluate(() => document.querySelector('#modal h2').textContent) === 'Settings');
    await p.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click()); await sleep(900);
    ck('B12 the queued reward shows after it closes', await p.evaluate(() => document.querySelector('#modal.on h2')?.textContent) === 'Daily Reward');
  });

  await test('B13 replaying a 3-star level does not farm', async p => {
    await prep(p); await p.evaluate(() => { __game.S.stars[1] = 3; __game.S.streak = 4 });
    const xp0 = await p.evaluate(() => __game.S.plv * 1e6 + __game.S.xp);
    await p.evaluate(() => __game.startLevel(1)); await sleep(500);
    await p.evaluate(() => __game.api.win(3)); await sleep(300);
    const r = await p.evaluate(() => ({ streak: __game.S.streak, xp: __game.S.plv * 1e6 + __game.S.xp }));
    ck('B13 streak untouched, little XP', r.streak === 4 && r.xp - xp0 <= Math.round(25 * .2) + 8, JSON.stringify(r));
  });

  await test('B14/B15/B16 saves, tabs and coin quests', async p => {
    await prep(p);
    await p.evaluate(() => { const o = { ...__game.S, coins: 777 }; localStorage.setItem(KEY, JSON.stringify(o)); window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: JSON.stringify(o) })) }); await sleep(300);
    ck('B14 another tab\'s save is taken over', await p.evaluate(() => __game.S.coins) === 777);
    await p.evaluate(() => { __game.S.quests = { day: today(), bonus: false, list: [{ k: 'coins', n: 80, p: null, v: 0, claimed: false, r: 10 }, { k: 'win', n: 3, p: null, v: 0, claimed: false, r: 10 }, { k: 'spin', n: 1, p: null, v: 0, claimed: false, r: 10 }] }; __game.S.login.last = -1; showLogin() });
    await sleep(300); await p.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click()); await sleep(900);
    ck('B16 login coins count for the coin quest', await p.evaluate(() => __game.S.quests.list[0].v) > 0);
    await p.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota') }; save() }); await sleep(200);
    ck('B15 a failed save warns once', await p.evaluate(() => /save/i.test(document.querySelector('#toast').textContent)));
  });

  await test('B18 dialog semantics and focus', async p => {
    await prep(p); await p.evaluate(() => document.querySelector('#profileBtn').focus());
    await p.evaluate(() => showSettings()); await sleep(300);
    ck('B18 the card is a modal dialog', await p.evaluate(() => { const c = document.querySelector('#modal .card'); return c.getAttribute('role') === 'dialog' && c.getAttribute('aria-modal') === 'true' }));
    ck('B18 focus moved into the popup', await p.evaluate(() => !!document.activeElement.closest('#modal')));
    await p.evaluate(() => closeModal()); await sleep(200);
    ck('B18 focus returned afterwards', await p.evaluate(() => document.activeElement.id) === 'profileBtn');
    const lv = await typeLevel(p, 'lights'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(1500);
    ck('B18 lights cells are labelled switches', await p.evaluate(() => { const c = document.querySelector('#board .cell'); return /row 1 column 1/.test(c.getAttribute('aria-label')) && c.hasAttribute('aria-pressed') }));
  });

  await test('P2 popups: backdrop tap, Escape and the Back button', async p => {
    await prep(p);
    await p.evaluate(() => showSettings()); await sleep(400);
    await p.mouse.click(6, 6); await sleep(500);
    ck('P2 tapping the dimmed backdrop closes Settings', await p.evaluate(() => !document.querySelector('#modal.on')));
    await p.evaluate(() => { __game.S.coins = 500; showSpin() }); await sleep(400);
    await p.keyboard.press('Escape'); await sleep(400);
    ck('P2 Escape closes the spin popup', await p.evaluate(() => !document.querySelector('#modal.on')));
    await p.evaluate(() => { __game.S.hints = 2; showSettings() }); await sleep(300);
    await p.evaluate(() => document.querySelector('#resetBtn').click()); await sleep(300);
    await p.mouse.click(6, 6); await sleep(300);
    ck('P2 the reset-confirm popup ignores backdrop taps', await p.evaluate(() => document.querySelector('#modal h2').textContent) === 'Erase everything?');
    await p.goBack().catch(() => {}); await sleep(500);
    ck('P2 Back on the reset-confirm goes back to Settings (page still here)', await p.evaluate(() => typeof __game !== 'undefined' && document.querySelector('#modal h2').textContent) === 'Settings');
    await p.goBack().catch(() => {}); await sleep(500);
    ck('P2 Back closes Settings', await p.evaluate(() => typeof __game !== 'undefined' && !document.querySelector('#modal.on')));
    // a level: Back leaves it for the map, then Back goes home
    const lv = await typeLevel(p, 'lights'); await p.evaluate(n => { __game.show('map'); __game.startLevel(n) }, lv); await sleep(1200);
    await p.goBack().catch(() => {}); await sleep(1500);
    ck('P2 Back in a level leaves it', await p.evaluate(() => typeof __game !== 'undefined' && document.querySelector('.screen.active').id) !== 'play');
    for (let k = 0; k < 3 && await p.evaluate(() => typeof __game !== 'undefined' && document.querySelector('.screen.active').id) !== 'home'; k++) { await p.goBack().catch(() => {}); await sleep(900) }
    ck('P2 Back from the map reaches home', await p.evaluate(() => typeof __game !== 'undefined' && document.querySelector('.screen.active').id) === 'home');
    await p.goBack().catch(() => {}); await sleep(800);
    ck('P2 Back on home really leaves the page', await p.evaluate(() => typeof __game === 'undefined').catch(() => true));
  });

  await test('P3-P8 play screen behaviour', async p => {
    await prep(p);
    // P3: the written instruction shows for the first 3 levels of a mode only
    const tl = await p.evaluate(() => { const out = []; for (let n = 1; out.length < 4; n++) if (__game.typeFor(n) === 'tubes') out.push(n); return out });
    const off = [];
    for (const n of tl) { await p.evaluate(n => __game.startLevel(n), n); await sleep(250); off.push(await p.evaluate(() => document.querySelector('#instr').classList.contains('off'))) }
    ck('P3 instruction shown for 3 levels, then hidden', JSON.stringify(off) === '[false,false,false,true]', JSON.stringify(off));
    // P5 / P7 / P8 on Block Garden
    const lv = await typeLevel(p, 'blocks'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(500);
    ck('P8 the first play of a level gets the full intro banner', await p.evaluate(() => !!document.querySelector('.lvintro:not(.slim)')));
    await sleep(2200);
    ck('P5 Undo looks idle before the first move', await p.evaluate(() => document.querySelector('#undoBtn').classList.contains('idle')));
    await p.evaluate(() => { for (let k = 0; k < 2; k++) __game.cur.puz._bot() }); await sleep(1700);
    ck('P5 Undo comes alive after a move', await p.evaluate(() => !document.querySelector('#undoBtn').classList.contains('idle')));
    await p.evaluate(() => document.querySelector('#restartBtn').click()); await sleep(300);
    ck('P7 restart with fewer than 3 moves restarts at once', await p.evaluate(() => !document.querySelector('#modal.on') && document.querySelector('#hudInfo .mv').textContent === '0'));
    ck('P8 a restart shows the slim chip, not the banner', await p.evaluate(() => !!document.querySelector('.lvintro.slim') && !document.querySelector('.lvintro:not(.slim)')));
    await sleep(2400);
    await p.evaluate(() => { for (let k = 0; k < 3; k++) { __game.cur.puz._bot() } }); await sleep(1700);
    const mv = await p.evaluate(() => +document.querySelector('#hudInfo .mv').textContent);
    await p.evaluate(() => document.querySelector('#restartBtn').click()); await sleep(300);
    ck('P7 restart with 3+ moves asks first', await p.evaluate(() => /Restart this level/.test(document.querySelector('#modal.on h2')?.textContent || '')), `(moves ${mv})`);
    await p.evaluate(() => document.querySelector('#modal .mbtns .btn:first-child').click()); await sleep(400);
    ck('P7 Keep playing keeps the board', await p.evaluate(() => +document.querySelector('#hudInfo .mv').textContent) === mv);
    const bb = await p.evaluate(() => { const r = document.querySelector('#restartBtn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] });
    await p.mouse.move(bb[0], bb[1]); await p.mouse.down(); await sleep(900); await p.mouse.up(); await sleep(500);
    ck('P7 holding Restart restarts without asking', await p.evaluate(() => !document.querySelector('#modal.on') && document.querySelector('#hudInfo .mv').textContent === '0'));
  });

  console.log(fails ? `\n${fails} FAILED` : '\nall regression checks passed');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
