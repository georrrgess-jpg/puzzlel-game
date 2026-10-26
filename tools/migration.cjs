// Save-migration test: loads the game with an old (pre-v3) save that has progress and removed-mode data, then checks
// what was kept, what restarted, that the welcome card shows once, and that quests / daily still work.
// Usage: NODE_PATH=$(npm root -g) node tools/migration.cjs
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 5'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const today = Math.floor(Date.now() / 864e5);
  await p.addInitScript(d => { if (!localStorage.getItem('endless-puzzle-pop-v1')) localStorage.setItem('endless-puzzle-pop-v1', JSON.stringify({ unlocked: 57, stars: { 1: 3, 2: 2, 56: 3 }, coins: 812, hints: 4, skips: 1, theme: 'ocean', owned: ['midnight', 'ocean'], xp: 40, plv: 7, streak: 3, milestone: 5, seen: { lights: true, rotate: true, flood: true },
    stats: { wins: 56, perfect: 30, types: { rotate: 9, flood: 8, lights: 10 }, bestStreak: 6, maxCombo: 9, daily: 3, spins: 2, nohint: 5, quests: 4, bestLogin: 3, coinsEarned: 900, hints: 2 },
    quests: { day: d, bonus: false, list: [{ k: 'type', n: 2, p: 'rotate', v: 0, claimed: false, r: 35 }] }, dchal: { last: -1, streak: 2, tday: d, tier: 9 }, login: { last: d, streak: 2 } })) }, today);
  await p.goto('http://localhost:' + PORT + '/'); await sleep(1500);
  const st = await p.evaluate(() => ({ ver: __game.S.ver, unlocked: __game.S.unlocked, stars: Object.keys(__game.S.stars).length, hints: __game.S.hints, plv: __game.S.plv, theme: __game.S.theme, owned: __game.S.owned, types: Object.keys(__game.S.stats.types), welcome: /Welcome/.test(document.querySelector('#modal').textContent) && document.querySelector('#modal').classList.contains('on'), quests: __game.S.quests.list.map(q => q.p) }));
  let fail = 0; const ck = (n, ok, d = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ' + d); if (!ok) fail++ };
  ck('version stamped', st.ver === 3);
  ck('level progress restarted', st.unlocked === 1 && st.stars === 0);
  ck('XP level, theme and owned themes kept', st.plv === 7 && st.theme === 'ocean' && st.owned.length === 2);
  ck('welcome gift (3 hints) granted', st.hints === 7, `(hints ${st.hints})`);
  ck('removed-mode stats cleared', st.types.length === 0);
  ck('quests regenerated without removed modes', st.quests.every(t => t == null || ['lights', 'tubes', 'threads', 'merge', 'blocks'].includes(t)), JSON.stringify(st.quests));
  ck('welcome card shown', st.welcome);
  await p.evaluate(() => document.querySelector('#modal .mbtns .btn').click()); await sleep(900);
  await p.reload(); await sleep(1300);
  ck('welcome card shown only once', !(await p.evaluate(() => /Welcome/.test(document.querySelector('#modal').textContent) && document.querySelector('#modal').classList.contains('on'))));
  await p.evaluate(() => { __game.closeModal(); __game.show('home'); document.querySelector('#tQuests').click() }); await sleep(500);
  ck('quests popup opens', await p.evaluate(() => /Daily Quests/.test(document.querySelector('#modal').textContent)));
  await p.evaluate(() => { __game.closeModal(); document.querySelector('#tDaily').click() }); await sleep(1000);
  ck('daily challenge starts with a current mode', await p.evaluate(() => !!__game.cur && __game.TYPES.includes(__game.cur.type)));
  ck('no page errors', !errs.length, errs.join('|'));
  console.log(fail ? fail + ' FAILED' : 'all passed'); await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
