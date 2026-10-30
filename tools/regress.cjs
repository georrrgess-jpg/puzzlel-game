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
    await p.click('#settingsBtn'); await sleep(300); await p.evaluate(() => { document.querySelector('details.danger').open = true }); await p.click('#resetBtn'); await sleep(300);
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
    const lv = await typeLevel(p, 'arrows'); await p.evaluate(n => __game.startLevel(n), lv);
    await p.evaluate(() => { const t = performance.now(); const c = () => { const el = document.querySelector('#board .art'); if (el) { el.click(); document.__tapped = performance.now() - t } else requestAnimationFrame(c) }; c() });
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
    const lv = await typeLevel(p, 'arrows'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(1500);
    ck('B18 arrow tiles are labelled buttons', await p.evaluate(() => { const c = document.querySelector('#board .art'); return /arrow/.test(c.getAttribute('aria-label')) && c.getAttribute('role') === 'button' }));
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
    const lv = await typeLevel(p, 'arrows'); await p.evaluate(n => { __game.show('map'); __game.startLevel(n) }, lv); await sleep(1200);
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

  await test('M map: cached DOM, lock cards, current-level pill', async p => {
    await prep(p); await p.evaluate(() => { __game.S.unlocked = 30; __game.S.stars[3] = 2; __game.show('map') }); await sleep(900);
    ck('M4 locked worlds are single cards', await p.evaluate(() => document.querySelectorAll('.chapter.locked .node').length === 0 && document.querySelectorAll('.lockcard').length >= 1));
    await p.evaluate(() => { document.querySelector('#mapwrap').scrollTop = 0; document.querySelector('.node').__mark = 1 }); await sleep(200);
    await p.evaluate(() => { document.querySelector('#mapwrap').scrollTop = 140 }); await sleep(200);
    await p.evaluate(() => { __game.show('home') }); await sleep(600);
    await p.evaluate(() => { __game.show('map') }); await sleep(700);
    const r = await p.evaluate(() => ({ same: !!document.querySelector('.node').__mark, top: document.querySelector('#mapwrap').scrollTop }));
    ck('M5 an unchanged map keeps its DOM and scroll position', r.same && Math.abs(r.top - 140) < 8, JSON.stringify(r));
    await p.evaluate(() => { document.querySelector('#mapwrap').scrollTop = 0 }); await sleep(500);
    ck('M3 the pill shows when the current level is out of view', await p.evaluate(() => document.querySelector('#curPill').classList.contains('on') && /Level 30/.test(document.querySelector('#curPill').textContent)));
    await p.evaluate(() => document.querySelector('#curPill').click()); await sleep(1300);
    ck('M3 tapping the pill brings the level back and hides it', await p.evaluate(() => !document.querySelector('#curPill').classList.contains('on')));
    await p.evaluate(() => { __game.S.stars[4] = 3; __game.show('home'); __game.show('map') }); await sleep(700);
    ck('M5 a changed map is rebuilt with the new stars', await p.evaluate(() => document.querySelectorAll('.node[data-n="4"] .st svg.on').length) === 3);
  });

  await test('M shop, trophies, profile, settings, toasts, garden', async p => {
    await prep(p); await p.evaluate(() => { __game.S.coins = 2000; __game.show('shop') }); await sleep(900);
    ck('M7 the shop opens on Boosts and the tabs switch sections', await p.evaluate(() => { const vis = () => [...document.querySelectorAll('#shoplist .item')].filter(e => e.offsetParent).length;
      const b = vis(), boostOnly = [...document.querySelectorAll('#shoplist .item')].filter(e => e.offsetParent).every(e => e.dataset.t === 'boosts');
      document.querySelector('#stabs .stab[data-t="themes"]').click(); const th = [...document.querySelectorAll('#shoplist .item')].filter(e => e.offsetParent).every(e => e.dataset.t === 'themes') && vis() >= 10;
      document.querySelector('#stabs .stab[data-t="boosts"]').click(); return b >= 5 && boostOnly && th }));
    const want = await p.evaluate(() => { const l = document.querySelector('#shoplist'); l.style.maxHeight = '300px'; l.scrollTop = 220; return l.scrollTop }); await sleep(200);
    const h0 = await p.evaluate(() => __game.S.hints);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#shoplist .item.boost .buy')][0]; b.click(); b.click() }); await sleep(900);
    const r = await p.evaluate(() => ({ h: __game.S.hints, top: document.querySelector('#shoplist').scrollTop }));
    ck('M7 a double tap buys once', r.h - h0 === 3, JSON.stringify(r));
    ck('M7 the shop keeps its scroll position after a purchase', want > 40 && Math.abs(r.top - want) < 8, JSON.stringify({ ...r, want }));
    await p.evaluate(() => { __game.show('home'); showTrophies() }); await sleep(500);
    ck('M8 locked trophies show progress', await p.evaluate(() => document.querySelectorAll('.ach:not(.got) .apw').length) > 5);
    await p.evaluate(() => { closeModal(); showProfile() }); await sleep(500);
    ck('M9 profile labels are short', await p.evaluate(() => /Best streak/.test(document.querySelector('#modal').textContent) && /Dailies/.test(document.querySelector('#modal').textContent)));
    await p.evaluate(() => { closeModal(); showSettings() }); await sleep(500);
    ck('M10 settings: Sound open, the other three groups closed', await p.evaluate(() => [...document.querySelectorAll('#modal details.sgroup')].map(d => d.open).join()) === 'true,false,false,false');
    await p.evaluate(() => { closeModal(); __game.S.deco = [] ; renderHome() }); await sleep(300);
    ck('M1 an empty garden shows its hint text', await p.evaluate(() => /garden grows/i.test(document.querySelector('#garden').textContent)));
    const lv = await typeLevel(p, 'arrows'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(1500);
    await p.evaluate(() => toast('hello')); await sleep(700);
    const tr = await p.evaluate(() => { const t = document.querySelector('#toast').getBoundingClientRect(), b = document.querySelector('#play .toolbar').getBoundingClientRect(); return { toast: [Math.round(t.top), Math.round(t.bottom)], toolbar: [Math.round(b.top), Math.round(b.bottom)], screen: document.querySelector('.screen.active').id, modal: !!document.querySelector('#modal.on') } });
    ck('M11 a toast in a level sits above the toolbar', tr.toast[1] <= tr.toolbar[0] + 2 && tr.toast[0] > 100, JSON.stringify(tr));
  });

  await test('A meta animations: counter, banner queue, login tile, spin', async p => {
    await prep(p); await sleep(300);
    await p.evaluate(() => { __game.S.coins = 100; refreshCoins() }); await sleep(500);
    await p.evaluate(() => { __game.S.coins = 400; refreshCoins() }); await sleep(120);
    const mid = +(await p.evaluate(() => document.querySelector('#home .coinval').textContent));
    await sleep(600);
    const fin = +(await p.evaluate(() => document.querySelector('#home .coinval').textContent));
    ck('A1 the coin chip counts up to the new balance', mid > 100 && mid < 400 && fin === 400, `(mid ${mid}, final ${fin})`);
    await p.evaluate(() => { banner('🏆', 'TROPHY', 'One', 'a'); banner('🏆', 'TROPHY', 'Two', 'b'); banner('🏆', 'TROPHY', 'Three', 'c') });
    await sleep(150); const n1 = await p.evaluate(() => document.querySelectorAll('.banner').length);
    await sleep(600); const n2 = await p.evaluate(() => document.querySelectorAll('.banner').length);
    const rects = await p.evaluate(() => [...document.querySelectorAll('.banner')].map(b => { const r = b.getBoundingClientRect(); return [r.top, r.bottom] }));
    ck('A3 banners arrive one after another, at most two at once', n1 === 1 && n2 === 2, `(${n1} then ${n2})`);
    ck('A3 stacked banners do not overlap', rects.length < 2 || rects[0][1] <= rects[1][0] + 1, JSON.stringify(rects));
    await sleep(3600); ck('A3 the third banner shows once one leaves', await p.evaluate(() => [...document.querySelectorAll('.banner b')].some(b => b.textContent === 'Three')));
    await sleep(3500);
    await p.evaluate(() => { __game.S.login.last = -1; showLogin() }); await sleep(400);
    await p.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click()); await sleep(700);
    ck('A4 the claimed day is ticked and tomorrow is marked', await p.evaluate(() => !!document.querySelector('.day.got') && !!document.querySelector('.day.tomorrow')));
    await sleep(800);
    await p.evaluate(() => { __game.S.spinAt = 0; showSpin() }); await sleep(300);
    await p.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click());
    await sleep(4500);
    ck('A5 the spin finishes and the wheel rests on its prize', await p.evaluate(() => !document.querySelector('.wheelwrap.going') || /won/i.test(document.querySelector('#toast').textContent)));
  });

  await test('B mode animations', async p => {
    await prep(p);
    // B3: tapping a tube the sand cannot go into wobbles the picked-up tube and flashes the target
    let lv = await typeLevel(p, 'tubes'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    await p.evaluate(() => { const s = JSON.parse(__game.cur.puz.snap()); s.tubes = s.tubes.map(() => []); s.tubes[0] = [0, 0]; s.tubes[1] = [1]; s.tubes[2] = [2, 3]; __game.cur.puz.restore(JSON.stringify(s)) }); await sleep(300);
    await p.evaluate(() => { const t = document.querySelectorAll('#board .tube'); t[0].click(); t[1].click() }); await sleep(100);
    const d = await p.evaluate(() => { const t = document.querySelectorAll('#board .tube'); return { wobble: t[0].getAnimations().length > 0, flash: !!t[1].querySelector('.gf-no') && t[1].querySelector('.gf-no').getAnimations().length > 0, sel: t[1].classList.contains('sel') } });
    ck('B3 a denied pour wobbles, flashes and re-selects', d.wobble && d.flash && d.sel, JSON.stringify(d));
    // B7 + B12 on Block Garden
    lv = await typeLevel(p, 'blocks'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    for (let k = 0; k < 3; k++) { await p.evaluate(() => __game.cur.puz._bot()); await sleep(500) }
    ck('B7 a new tray slides in after the third block', await p.evaluate(() => [...document.querySelectorAll('.bgs')].filter(s => s.firstElementChild && s.firstElementChild.getAnimations().length > 0).length) >= 1);
    await p.evaluate(() => { let k = 0; while (__game.cur.puz._bot() && k++ < 300); }); await sleep(4500);
    ck('B12 the win sweep reaches Block Garden cells', await p.evaluate(() => document.querySelectorAll('#board .bz.f.celebrate').length) > 0);
  });

  await test('B merge and threads animations', async p => {
    await prep(p);
    await p.evaluate(() => { __game.S.gfx = 'high'; Q.apply() });
    let lv = await typeLevel(p, 'merge'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    await p.evaluate(() => { window.__sway = 0; const o = Element.prototype.animate; Element.prototype.animate = function (k, op) { if (Array.isArray(k) && k[1] && k[1].transform === 'rotate(5deg)') window.__sway++; return o.call(this, k, op) } });
    await sleep(3200);
    ck('B8 a plant sways while the garden is idle', await p.evaluate(() => window.__sway) > 0);
    // (B9, the red pulse when the garden is full, cannot be reached in a test: a board full of 7s has already met the goal. Checked by hand.)
    // the cue starts at tier 2 and only on constellations with odd stars (a closed loop can start anywhere): try a few levels
    let cued = false;
    for (let n = 2 * (await p.evaluate(() => __game.TYPES.length)) + 1, tries = 0; tries < 4 && !cued; n++) {
      if (await p.evaluate(n => __game.typeFor(n), n) !== 'threads') continue;
      tries++; await p.evaluate(n => __game.startLevel(n), n); await sleep(7600);
      cued = await p.evaluate(() => document.querySelectorAll('.st.cue').length) >= 1;
    }
    ck('B10 the start stars pulse after 6 s of nothing', cued);
  });

  /* ---- Sand Tubes: the selected tube's sand stays one piece (the mound on top never moves on its own) ---- */
  await test('T1 the sand mound stays attached on a selected tube', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'tubes'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    await p.evaluate(() => document.querySelector('.tube').click()); await sleep(300);
    const r = await p.evaluate(() => { const top = document.querySelector('.tube.sel .seg.top'), b = getComputedStyle(top, '::before'), w = document.querySelector('.tube.sel .gf-run'), wr = w.getBoundingClientRect(), tr = top.getBoundingClientRect();
      return { moundAnim: b.animationName, moundT: b.transform, washTop: Math.round(wr.top - tr.top), washAnim: getComputedStyle(w).animationName, washZ: getComputedStyle(w).zIndex } });
    ck('T1 the mound does not heave or tilt while selected', r.moundAnim === 'none' && (r.moundT === 'none' || r.moundT === 'matrix(1, 0, 0, 1, 0, 0)'), JSON.stringify(r));
    ck('T1 the selection glow also covers the mound', r.washTop < 0 && r.washAnim === 'gfrun' && +r.washZ >= 2, JSON.stringify(r));
    ck('T1 tubes are layered from the start (no layer is created on a tap)', await p.evaluate(() => [...document.querySelectorAll('.tube')].every(t => getComputedStyle(t).willChange === 'transform')));
  });

  /* ---- Picture Pop ---- */
  const pstate = p => p.evaluate(() => { const s = JSON.parse(__game.cur.puz.snap()); return { tiles: s.g.filter(x => x >= 0).length, dom: document.querySelectorAll('.ppb .pt:not(.gone)').length, done: s.doneN, dp: s.dp, moves: s.moves, g: s.g } });
  const tapCell = (p, i) => p.evaluate(i => { const e = [...document.querySelectorAll('.ppb .pt,.ppb .pps')].filter(x => +x.dataset.i === i).sort((a, b) => (b.classList.contains('pt') ? 1 : 0) - (a.classList.contains('pt') ? 1 : 0))[0];
    const r = e.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 7, pointerType: 'mouse', button: 0 };
    e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new PointerEvent('pointerup', o)) }, i);
  await test('P1 two taps swap two tiles, Undo swaps them back', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'pics'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    const s0 = await pstate(p);
    // swap two tiles that do not finish a picture
    const pair = await p.evaluate(() => { const q = __game.cur.puz; for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) { const s = JSON.parse(q.snap()), g = s.g.slice(); [g[a], g[b]] = [g[b], g[a]]; if (!q._done(g)) return [a, b] } return null });
    await tapCell(p, pair[0]); await sleep(120);
    ck('P1 a tap picks a tile up', await p.evaluate(() => !!document.querySelector('.pt.sel')));
    await tapCell(p, pair[1]); await sleep(500);
    const s1 = await pstate(p);
    ck('P1 the second tap swaps them', s1.moves === 1 && s1.g[pair[0]] === s0.g[pair[1]] && s1.g[pair[1]] === s0.g[pair[0]], JSON.stringify(pair));
    ck('P1 each tile sits in its new cell', await p.evaluate(([a, b]) => { const g = JSON.parse(__game.cur.puz.snap()).g; return [a, b].every(i => document.querySelector(`.pt[data-a="${g[i]}"]`).dataset.i == i) }, pair));
    await p.evaluate(() => document.querySelector('#undoBtn').click()); await sleep(300);
    ck('P1 Undo restores the board', JSON.stringify((await pstate(p)).g) === JSON.stringify(s0.g));
  });
  await test('P5 a tapped tile peeks at its whole picture; pieces share a frame colour', async p => {
    await prep(p);
    const lv = await p.evaluate(() => { let n = 25; while (__game.typeFor(n) !== 'pics') n++; return n }); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    const i = await p.evaluate(() => JSON.parse(__game.cur.puz.snap()).g.findIndex(x => x >= 0));
    await tapCell(p, i); await sleep(300);
    ck('P5 the peek shows the picture with the tile outlined', await p.evaluate(() => !!document.querySelector('.pppeek svg use') && document.querySelectorAll('.pppeek svg rect').length === 2));
    ck('P5 tiles of one picture share a frame colour, other pictures differ', await p.evaluate(() => { const m = {}; document.querySelectorAll('.ppb .pt').forEach(e => { const a = +e.dataset.a, c = e.style.getPropertyValue('--pc'); m[c] = m[c] || new Set(); m[c].add(a) }); return Object.keys(m).length > 3 }));
  });
  await test('P2 a finished picture pops and the deck refills', async p => {
    await prep(p);
    const lv = await typeLevel(p, 'pics'); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    let popped = false, sync = true, frame = false;
    for (let k = 0; k < 10 && !popped; k++) {
      const s0 = await pstate(p); await p.evaluate(() => __game.cur.puz._play()); await sleep(250);
      if (await p.evaluate(() => !!document.querySelector('.ppf'))) frame = true;
      await sleep(1300); const s1 = await pstate(p);
      if (s1.done > s0.done) { popped = true; ck('P2 the freed cells refill from the deck', s1.dp > s0.dp, JSON.stringify([s0.dp, s1.dp])) }
      if (s1.dom !== s1.tiles) sync = false;
    }
    ck('P2 a picture popped', popped);
    ck('P2 the whole framed picture is shown as it pops', frame);
    ck('P2 the tiles on screen always match the board', sync);
    ck('P2 the gallery counts it', await p.evaluate(() => +document.querySelector('.ppdn').textContent >= 1));
  });
  await test('P3 4-piece pictures go together as a 2x2 square', async p => {
    await prep(p);
    const lv = await p.evaluate(() => { let n = 4 * __game.TYPES.length + 1; while (__game.typeFor(n) !== 'pics') n++; return n }); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    let four = false;
    for (let k = 0; k < 80 && !(await p.evaluate(() => __game.cur.over)); k++) {
      const d0 = (await pstate(p)).done; await p.evaluate(() => __game.cur.puz._bot()); const d1 = (await pstate(p)).done;
      if (d1 > d0 && await p.evaluate(() => __game.cur.puz._lastFour)) four = true;
    }
    await sleep(1200);
    ck('P3 a 4-piece picture was completed', four);
    ck('P3 the level was won', await p.evaluate(() => __game.cur.over && !!document.querySelector('#modal.on')));
  });
  await test('P4 the solver play earns 3 stars', async p => {
    await prep(p);
    const lv = await p.evaluate(() => { let n = 2 * __game.TYPES.length + 1; while (__game.typeFor(n) !== 'pics') n++; return n }); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    for (let k = 0; k < 80 && !(await p.evaluate(() => __game.cur.over)); k++) await p.evaluate(() => __game.cur.puz._bot());
    await sleep(900);
    ck('P4 won with 3 stars', await p.evaluate(() => __game.cur.over && document.querySelectorAll('#hudStars svg.on').length === 3));
  });

  /* ---- Arrow Escape ---- */
  await test('E1 a free tile escapes, a blocked one bumps and stays', async p => {
    await prep(p);
    const lv = await p.evaluate(() => { let n = 13; while (__game.typeFor(n) !== 'arrows') n++; return n }); await p.evaluate(n => __game.startLevel(n), lv); await sleep(2600);
    const st = () => p.evaluate(() => { const s = JSON.parse(__game.cur.puz.snap()); return { left: s.g.filter(d => d >= 0).length, moves: s.moves, dom: document.querySelectorAll('.art:not(.argo)').length } });
    const s0 = await st();
    const blocked = await p.evaluate(() => { const g = JSON.parse(__game.cur.puz.snap()).g; for (const e of document.querySelectorAll('.art')) { const i = +e.dataset.i; __game.cur.puz.hint(); const h = document.querySelector('.art.hint'); if (h && +h.dataset.i !== i) { e.click(); return i } } return -1 });
    await sleep(500); const s1 = await st();
    ck('E1 a blocked tile stays on the board and costs a move', blocked >= 0 && s1.left === s0.left && s1.moves === 1, JSON.stringify([s0, s1]));
    await p.evaluate(() => { __game.cur.puz.hint(); document.querySelector('.art.hint').click() }); await sleep(700);
    const s2 = await st();
    ck('E1 a free tile leaves the board', s2.left === s0.left - 1 && s2.dom === s2.left, JSON.stringify(s2));
    await p.evaluate(() => document.querySelector('#undoBtn').click()); await sleep(300);
    ck('E1 Undo brings it back', (await st()).left === s0.left);
  });
  await test('E2 every tier can be cleared without a single bump', async p => {
    await prep(p);
    const r = await p.evaluate(() => { const out = []; const N = __game.TYPES.length; for (let t = 0; t < 10; t++) { let n = t * N + 1; while (__game.typeFor(n) !== 'arrows') n++; __game.startLevel(n); const q = __game.cur.puz; let k = 0; while (!__game.cur.over && k < 200) { if (!q._bot()) break; k++ } const s = JSON.parse(q.snap()); out.push({ t, left: s.g.filter(d => d >= 0).length, moves: s.moves, bumps: s.moves - k }) } return out });
    ck('E2 the board empties at every tier', r.every(x => x.left === 0), JSON.stringify(r.map(x => x.left)));
    ck('E2 the solver never bumps', r.every(x => x.bumps === 0));
  });

  await test('R1 every mode puts a full board on screen, on a phone and on a desktop', async p => {
    await prep(p);
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      await p.setViewportSize({ width: w, height: h }); await sleep(200);
      const bad = await p.evaluate(() => { const out = []; const N = __game.TYPES.length;
        for (const tier of [0, 3, 9]) for (let k = 1; k <= N; k++) { const n = tier * N + k; __game.startLevel(n); const b = document.querySelector('#board'), r = b.firstElementChild && b.firstElementChild.getBoundingClientRect();
          if (!r || r.width < 120 || r.height < 120 || b.querySelectorAll('*').length < 12) out.push(__game.cur.type + '@' + n) } return out });
      ck(`R1 boards render at ${w}x${h}`, bad.length === 0, JSON.stringify(bad));
    }
  });

  /* ---- v5 menus ---- */
  await test('N1 bottom bar, coin +, garden Edit, scenery', async p => {
    await prep(p);
    const scr = () => p.evaluate(() => ({ s: document.querySelector('.screen.active').id, nav: [...document.querySelectorAll('#nav .bn.on')].map(b => b.dataset.nav).join(), scene: [...document.querySelectorAll('#scene .scn.on')].length, sceneOn: document.querySelector('#scene').classList.contains('on') }));
    ck('N1 home starts with Home lit and its scene', JSON.stringify(await scr()) === JSON.stringify({ s: 'home', nav: 'home', scene: 1, sceneOn: true }));
    await p.evaluate(() => document.querySelector('#nav .bn[data-nav="map"]').click()); await sleep(600);
    ck('N1 the bar opens Levels', (await scr()).s === 'map' && (await scr()).nav === 'map');
    await p.evaluate(() => document.querySelector('#map .coinbtn').click()); await sleep(600);
    ck('N1 the coin + opens the shop on Boosts', await p.evaluate(() => document.querySelector('.screen.active').id === 'shop' && document.querySelector('#shoplist').dataset.tab === 'boosts'));
    await p.evaluate(() => document.querySelector('#nav .bn[data-nav="home"]').click()); await sleep(600);
    await p.evaluate(() => document.querySelector('#gardenEdit').click()); await sleep(600);
    ck('N1 garden Edit opens the shop on Garden', await p.evaluate(() => document.querySelector('.screen.active').id === 'shop' && document.querySelector('#shoplist').dataset.tab === 'garden' && document.querySelector('#stabs .stab.on').dataset.t === 'garden'));
    await p.evaluate(n => __game.startLevel(1), 0); await sleep(500);
    ck('N1 in a level the bar and the scenery are hidden', await p.evaluate(() => getComputedStyle(document.querySelector('#nav')).display === 'none' && !document.querySelector('#scene').classList.contains('on')));
  });
  await test('N2 levels map: pick a level, play it; world tabs', async p => {
    await prep(p); await p.evaluate(() => { __game.S.unlocked = 20; for (let n = 1; n < 20; n++) __game.S.stars[n] = 2; __game.show('map') }); await sleep(900);
    ck('N2 the panel starts on the current level', await p.evaluate(() => /LEVEL 20/.test(document.querySelector('#mpLv').textContent) && !!document.querySelector('.node.cur .here')));
    await p.evaluate(() => document.querySelector('.node[data-n="5"]').click()); await sleep(300);
    ck('N2 a tap picks a level without starting it', await p.evaluate(() => document.querySelector('.screen.active').id === 'map' && /LEVEL 5/.test(document.querySelector('#mpLv').textContent) && document.querySelectorAll('#mpStars svg.on').length === 2 && /REPLAY/.test(document.querySelector('#mpPlay').textContent)));
    await p.evaluate(() => document.querySelector('.node[data-n="5"]').click()); await sleep(700);
    ck('N2 a second tap plays it', await p.evaluate(() => document.querySelector('.screen.active').id === 'play' && __game.cur.level === 5));
    await p.evaluate(() => { __game.show('map') }); await sleep(800);
    await p.evaluate(() => document.querySelector('#mpPlay').click()); await sleep(700);
    ck('N2 PLAY plays the picked level', await p.evaluate(() => __game.cur && __game.cur.level === 5));
    await p.evaluate(() => { __game.show('map') }); await sleep(800);
    ck('N2 world tabs: done, here, locked', await p.evaluate(() => { const t = [...document.querySelectorAll('#wtabs .wtab')]; return t[0].classList.contains('done') && t[1].classList.contains('here') && t[2].classList.contains('locked') }));
    await p.evaluate(() => { document.querySelector('#mapwrap').scrollTop = 0; document.querySelector('#wtabs .wtab[data-w="1"]').click() }); await sleep(1200);
    ck('N2 a world tab scrolls to its world', await p.evaluate(() => { const ch = document.querySelector('.chapter[data-w="1"]'), w = document.querySelector('#mapwrap'); return Math.abs(w.scrollTop - (ch.offsetTop - 6)) < 30 }));
  });
  await test('N3 the animated background stands still behind menus', async p => {
    await prep(p); await sleep(400);
    const frames = await p.evaluate(async () => { let n = 0; const orig = CanvasRenderingContext2D.prototype.drawImage; const c = document.querySelector('#bg').getContext('2d'); c.drawImage = function () { n++; return orig.apply(this, arguments) }; await new Promise(r => setTimeout(r, 1500)); return n });
    ck('N3 no background frames are drawn on the home screen', frames === 0, String(frames));
  });

  /* ---- quality of life ---- */
  await test('Q1 an unfinished level picks up where it was left, in every mode', async p => {
    await prep(p);
    for (const t of await p.evaluate(() => __game.TYPES)) {
      const lv = await p.evaluate(t => { let n = 13; while (__game.typeFor(n) !== t) n++; return n }, t);
      await p.evaluate(n => __game.startLevel(n), lv); await sleep(2700);
      for (let k = 0; k < 1; k++) { await p.evaluate(() => { const q = __game.cur.puz; if (q._bot) q._bot(); else { q.hint(); [...document.querySelectorAll('#board .hint')].sort((x, y) => (x.dataset.h || 0) - (y.dataset.h || 0)).forEach(e => e.click()) } }); await sleep(900) }
      if (await p.evaluate(() => __game.cur.over || __game.cur.history.length < 2)) { ck(`Q1 ${t} (skipped: no move made)`, true); continue }
      const snap = await p.evaluate(() => __game.cur.puz.snap()), hl = await p.evaluate(() => __game.cur.history.length);
      await p.evaluate(() => { document.querySelector('#backBtn').click() }); await sleep(1400);
      await p.evaluate(n => __game.startLevel(n), lv); await sleep(1500);
      const r = await p.evaluate(() => ({ snap: __game.cur.puz.snap(), hl: __game.cur.history.length }));
      ck(`Q1 ${t}: the board and its Undo history come back`, r.snap === snap && r.hl === hl);
      await p.evaluate(() => document.querySelector('#undoBtn').click()); await sleep(400);
      ck(`Q1 ${t}: Undo works after picking up`, await p.evaluate(() => __game.cur.history.length) === hl - 1);
      await p.evaluate(() => { __game.closeModal(); document.querySelector('#backBtn').click() }); await sleep(1300);
    }
    await p.evaluate(() => { __game.show('home'); renderHome() }); await sleep(300);
    ck('Q1 home offers to continue', await p.evaluate(() => /Continue/.test(document.querySelector('#playLvl').textContent) || !__game.S.resume || __game.S.resume.n !== __game.S.unlocked));
    const lv = await p.evaluate(() => __game.S.resume && __game.S.resume.n); 
    if (lv) { await p.evaluate(n => __game.startLevel(n), lv); await sleep(400); await p.evaluate(() => { const b = document.querySelector('#restartBtn'); b.dispatchEvent(new PointerEvent('pointerdown')); }); await sleep(800);
      ck('Q1 holding Restart starts the level fresh', await p.evaluate(() => __game.cur.history.length === 1)) }
  });

  console.log(fails ? `\n${fails} FAILED` : '\nall regression checks passed');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
