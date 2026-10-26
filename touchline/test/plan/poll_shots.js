// Screenshot sheet for the State Poll (v18.12): desktop 1440x900 and phone 390x844, two themes, every surface.
// node test/plan/poll_shots.js [seed] [themes] -> test/shots/v1812/poll/<seed>-<theme>-<desktop|phone>-<name>.png
const { chromium, DIST } = require('../_pw'); const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '..', 'shots', 'v1812', 'poll'); fs.mkdirSync(OUT, { recursive: true });
const seed = process.argv[2] || 'scan9'; const themes = (process.argv[3] || 'night,gold').split(',');
const VIEWS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of themes) for (const [vn, vp] of Object.entries(VIEWS)) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: vn === 'phone' ? 2 : 1 }); const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message));
    await page.goto(DIST); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name', 'Poll Coach'); await page.fill('#nc-seed', seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    await page.evaluate(t => { PREFS.theme = t === 'light' ? { preset: null, custom: { bg: '#f3efe6', surface: '#ffffff', text: '#16212c', accent: '#c2410c', accent2: '#0f766e' } } : { preset: t, custom: null }; savePrefs(); applyTheme(); }, theme);
    const tag = `${seed}-${theme}-${vn}`; const shot = async (name, fn, wait, full, sel) => { await page.evaluate(fn); await page.waitForTimeout(wait || 1900); if (vn === 'phone' && sel) { await page.evaluate(q => { const el = document.querySelector(q); if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 70; window.scrollTo(0, y); } }, sel); await page.waitForTimeout(500); } await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full !== false && vn === 'desktop' }); };
    /* preseason, then mid-season */
    await shot('00-poll-preseason', () => { App.route = 'statepoll'; App.params = {}; render(); window.scrollTo(0, 0); });
    await page.evaluate(() => { const C = App.C; for (let i = 0; i < 11; i++) { simRound(C); advance(C); } });
    await shot('01-overview', () => { App.route = 'office'; App.params = {}; render(); window.scrollTo(0, 0); }, 1900, true, '.v1812p-ovcard');
    await shot('02-poll', () => { App.route = 'statepoll'; App.params = {}; App.modal = null; render(); window.scrollTo(0, 0); });
    await shot('03-teams', () => { App.route = 'statepoll'; App.params = { pt: 'teams' }; render(); window.scrollTo(0, 0); });
    await shot('04-players', () => { App.route = 'statepoll'; App.params = { pt: 'players' }; render(); window.scrollTo(0, 0); });
    await shot('05-matchday', () => { App.route = 'matchday'; App.params = {}; render(); window.scrollTo(0, 0); }, 1900, true, '.v1812p-show');
    await shot('06-schedule', () => { App.route = 'schedule'; App.params = { rall: '1' }; render(); window.scrollTo(0, 0); }, 1900, true, '.v1812p-sb.gotw');
    await shot('07-courier', () => { App.route = 'news'; App.params = { nv: 'courier' }; render(); window.scrollTo(0, 0); }, 1900, true, '.v1812p-np');
    await shot('08-team', () => { App.route = 'statepoll'; App.params = {}; const C = App.C; App.modal = { type: 'v1812pTeam', id: C.userSid }; render(); }, 1900, false);
    await shot('09-player-seasons', () => { const C = App.C; const g = v1812pBoard(C, C.year, 'g', 'league', 5).find(x => !x.virtual) || v1812pBoard(C, C.year, 'g', 'state', 1)[0]; App.modal = g.virtual ? { type: 'v1812pPlayer', id: g.id } : { type: 'player', id: g.id, tab: 'across' }; renderModal(); }, 1500, false);
    /* a live ranked game: the broadcast intro */
    const lv = await page.evaluate(() => { App.modal = null; renderModal(); const C = App.C; let found = null; for (let g = 0; g < 2 && !found; g++) { const gt = v1812pGotw(C); const f = gt && C.fixtures[gt.fid]; if (gt && f && f.st === 's' && f.h !== C.userSid && f.a !== C.userSid && gt.kind === 'showdown') found = gt; else if (g < 1) { simRound(C); advance(C); } } if (!found) return false; App.route = 'matchday'; render(); A.spectate({ dataset: { id: found.fid } }); return true; });
    if (lv) { await page.waitForTimeout(1300); await page.screenshot({ path: `${OUT}/${tag}-10-live-intro.png` }); }
    await ctx.close();
  }
  console.log('errors', errs); await b.close();
})();
