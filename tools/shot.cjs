// Screenshot / smoke-test tool for Endless Puzzle Pop.
// Usage: NODE_PATH=$(npm root -g) node shot.cjs <outdir> <scenario> [scenario...]
// Env: W, H (viewport, default 400x860).
// Scenarios:
//   login        daily-reward modal on first load
//   home         home screen (login claimed)
//   map | shop   menu screens (shop with 1000 coins)
//   spin | spinning | quests | trophies | settings | profile   modals
//   howto:<type> how-to card for lights|tubes|rotate|slide|flood|memory
//   level:<n>    level n: shots at start (+600ms), after 1 hinted move, and after 2 more
//   win:<n>      solve level n with hints, shot win card at +1.2s and +3.5s
//   fail         run out of moves on a flood level, shot the fail card
//   daily        daily challenge board
// Prints every page error / console error at the end ("no errors" if none).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const scen = process.argv.slice(3);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = +process.env.W || 400, H = +process.env.H || 860;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()) });
  await page.goto('file:///home/user/puzzlel-game/index.html');
  await sleep(1300);
  const snap = async name => { const f = path.join(out, name + '.png'); await page.screenshot({ path: f }); console.log('saved', f) };
  const closeModal = () => page.evaluate(() => document.querySelector('#modal').classList.remove('on'));
  if (scen.includes('login')) await snap('login');
  if (await page.evaluate(() => document.querySelector('#modal').classList.contains('on'))) { await page.click('#modal .mbtns .btn'); await sleep(1400) }
  await page.evaluate(() => { const S = __game.S; S.coins = Math.max(S.coins, 1000); for (const t of ['lights','tubes','rotate','slide','flood','memory']) S.seen[t] = true; __game.show('home') });
  await sleep(500);
  const solve = async (n) => {
    const type = await page.evaluate(() => __game.cur.type);
    for (let steps = 0; steps < 500; steps++) {
      if (await page.evaluate(() => !__game.cur || __game.cur.over)) return true;
      if (type === 'memory') {
        if (await page.evaluate(() => __game.cur.puz._phase()) !== 'input') { await sleep(150); continue }
        const want = await page.evaluate(() => __game.cur.puz._expected()[__game.cur.puz._pos()]);
        await page.evaluate(w => document.querySelectorAll('#board .pad')[w].click(), want); await sleep(120); continue;
      }
      await hintMove(type);
    }
    return false;
  };
  const hintMove = async (type) => {
    await page.evaluate(() => { document.querySelectorAll('.hint').forEach(e => e.classList.remove('hint')); __game.cur.puz.hint() });
    await sleep(80);
    if (type === 'tubes') {
      await page.evaluate(() => { const a = document.querySelector('#board .tube[data-h="1"]'); if (a) a.click() }); await sleep(80);
      await page.evaluate(() => { const b = document.querySelector('#board .tube[data-h="2"]'); if (b) b.click() }); await sleep(250);
    } else if (type !== 'memory') {
      await page.evaluate(() => { const h = document.querySelector('#board .hint'); if (h) h.click() }); await sleep(160);
    }
  };
  for (const s of scen) {
    const [k, arg] = s.split(':');
    try {
      if (k === 'login') continue;
      if (k === 'home') { await closeModal(); await page.evaluate(() => __game.show('home')); await sleep(900); await snap('home') }
      else if (k === 'map' || k === 'shop') { await closeModal(); await page.evaluate(k => __game.show(k), k); await sleep(1000); await snap(k) }
      else if (['spin', 'spinning', 'quests', 'trophies', 'settings', 'profile'].includes(k)) {
        await closeModal(); await page.evaluate(() => __game.show('home')); await sleep(300);
        const sel = { spin: '#tSpin', spinning: '#tSpin', quests: '#tQuests', trophies: '#tTrophy', settings: '#settingsBtn', profile: '#profileBtn' }[k];
        await page.click(sel); await sleep(800);
        if (k === 'spinning') { await page.click('#modal .mbtns .btn:last-child'); await sleep(1800); await snap('spinning'); await sleep(5000); await snap('spin-result') }
        else await snap(k);
      }
      else if (k === 'howto') {
        await closeModal();
        await page.evaluate(t => { __game.S.seen[t] = false; const n = [1,2,3,4,5,6][['lights','tubes','rotate','slide','flood','memory'].indexOf(t)]; __game.startLevel(n) }, arg);
        await sleep(900); await snap('howto-' + arg);
        await page.evaluate(t => { __game.S.seen[t] = true }, arg); await closeModal();
      }
      else if (k === 'level') {
        await page.evaluate(n => __game.startLevel(+n), arg); await sleep(700);
        const type = await page.evaluate(() => __game.cur.type);
        await snap(`level${arg}-${type}-a`);
        if (type === 'memory') { await sleep(1500); await snap(`level${arg}-${type}-b`); await sleep(1500); await snap(`level${arg}-${type}-c`); continue }
        await hintMove(type); await sleep(120); await snap(`level${arg}-${type}-b`);
        await hintMove(type); await hintMove(type); await sleep(500); await snap(`level${arg}-${type}-c`);
      }
      else if (k === 'win') {
        await page.evaluate(n => __game.startLevel(+n), arg); await sleep(700);
        const ok = await solve(arg);
        console.log('level', arg, ok ? 'solved' : 'NOT SOLVED');
        await sleep(1200); await snap(`win${arg}-a`); await sleep(2300); await snap(`win${arg}-b`);
      }
      else if (k === 'fail') {
        await page.evaluate(() => __game.startLevel(5)); await sleep(700);
        for (let i = 0; i < 60; i++) {
          if (await page.evaluate(() => __game.cur.over)) break;
          await page.evaluate(i => { const b = [...document.querySelectorAll('#board .cbtn:not(.cur)')]; if (b.length) b[i % b.length].click() }, i);
          await sleep(60);
        }
        await sleep(1400); await snap('fail');
      }
      else if (k === 'daily') { await closeModal(); await page.evaluate(() => { __game.show('home'); document.querySelector('#tDaily').click() }); await sleep(900); await snap('daily') }
      else console.log('unknown scenario', s);
    } catch (e) { errors.push('scenario ' + s + ' failed: ' + e.message.split('\n')[0]) }
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
  await browser.close();
})();
