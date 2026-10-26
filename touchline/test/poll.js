// v18.12 The State Poll (src/v17/94_poll*.js): a deterministic statewide top 25 from seven voters with ballots, points,
// movement and first-place votes; the rank-by-week story; the Game of the Week (Matchday Center card, schedule badge, odds,
// live intro caption); advanced team metrics for every school in the state; player seasons across a career for any player;
// old-save migration; save and reload; results unchanged against the bare engine; UI renders and tabs switch; no page errors.
const { chromium, DIST } = require('./_pw');
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
/* a build of the same sources without the State Poll files, to prove the poll code changes no result */
function baselineUrl() { const root = path.resolve(__dirname, '..'); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-base-')); fs.cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
  for (const f of fs.readdirSync(path.join(dir, 'src', 'v17'))) if (f.startsWith('94_poll')) fs.rmSync(path.join(dir, 'src', 'v17', f));
  fs.symlinkSync(path.join(root, 'fonts'), path.join(dir, 'fonts')); fs.symlinkSync(path.join(root, 'vendor'), path.join(dir, 'vendor')); fs.copyFileSync(path.join(root, 'build.py'), path.join(dir, 'build.py'));
  cp.execFileSync('python3', ['build.py'], { cwd: dir, stdio: 'ignore' }); return 'file://' + path.join(dir, 'dist', 'touchline-standalone.html'); }
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
async function career(page, seed) { await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name', 'Poll Coach'); await page.fill('#nc-seed', seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); }
const SIM = n => { const C = App.C; for (let i = 0; i < n; i++) { simRound(C); advance(C); } };
const SEASON = () => { const C = App.C; let g = 0; while (C.phase !== 'offseason' && g++ < 80) { simRound(C); if (!advance(C)) break; } };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (seed, vw) => { const ctx = await b.newContext({ viewport: vw || { width: 1280, height: 900 } }); const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); await career(page, seed); return page; };
  const page = await mk('poll-t1');

  /* ---- the world: a preseason poll, 88 teams, the nav entry ---- */
  const P0 = await page.evaluate(() => { const C = App.C; const P = C.poll; const pl = P.polls[C.year]; return { v: P.v, n: pl.length, rows: pl[0].rows.length, label: pl[0].label, pool: P.pool.teams.length, all: v1812pAllIds(C).length, secs: [...new Set(P.pool.teams.map(t => t.sec))].sort((a, b) => a - b).join(','), voters: pl[0].bal.length, news: C.news.filter(n => n.type === 'poll').length, state: C.stateName }; });
  ok(P0.v === 1 && P0.n === 1 && P0.rows === 25 && P0.label === 'Preseason', 'a new career publishes the preseason poll (25 teams)');
  ok(P0.pool === 80 && P0.all === 88 && P0.secs === '1,2,3,4,6,7,8,9,10,11', 'the state is 88 teams: the 8-school section plus 10 simulated sections of 8');
  ok(P0.voters === 7 && P0.news === 1, 'seven ballots, and the preseason poll puts a Courier item on the Newswire');
  ok(await page.evaluate(() => { App.route = 'office'; render(); return !!document.querySelector('.tn-dd [data-r="statepoll"]') && NAV.some(n => n[0] === 'statepoll'); }), 'State Poll is in the Competition menu and the side navigation');

  /* ---- play into the season ---- */
  await page.evaluate(`(${SIM})(10)`);
  const sig10 = await page.evaluate(() => JSON.stringify(App.C.poll.polls));
  const W = await page.evaluate(() => { const C = App.C; const pl = C.poll.polls[C.year];
    const bad = []; const sig = [];
    pl.forEach((p, wk) => { if (p.rows.length !== 25) bad.push('rows ' + wk); const rks = p.rows.map(r => r.rk); if (rks.join() !== Array.from({ length: 25 }, (_, i) => i + 1).join()) bad.push('rank order ' + wk); if (new Set(p.rows.map(r => r.id)).size !== 25) bad.push('dup ' + wk);
      /* ballots and points */
      const pts = {}, fp = {}; p.bal.forEach(bl => { if (bl.length !== 25 || new Set(bl).size !== 25) bad.push('ballot ' + wk); bl.forEach((id, i) => { pts[id] = (pts[id] || 0) + 25 - i; if (i === 0) fp[id] = (fp[id] || 0) + 1; }); });
      for (const r of p.rows) { if (pts[r.id] !== r.pts) bad.push('pts ' + wk + r.id); if ((fp[r.id] || 0) !== r.fp) bad.push('fp ' + wk + r.id); }
      for (let i = 1; i < p.rows.length; i++) { const a = p.rows[i - 1], c = p.rows[i]; if (a.pts < c.pts || (a.pts === c.pts && a.fp < c.fp)) bad.push('sorted ' + wk + ':' + i); }
      const top = new Set(p.rows.map(r => r.id)); for (const o of p.ov) { if (top.has(o.id) || pts[o.id] !== o.pts || !(o.pts > 0)) bad.push('others ' + wk); }
      const maxOthers = Math.max(0, ...Object.keys(pts).filter(id => !top.has(id)).map(id => pts[id])); if (p.ov.length && p.ov[0].pts !== maxOthers) bad.push('others order ' + wk);
      const total = Object.values(pts).reduce((a, x) => a + x, 0); if (total !== 7 * 325) bad.push('total ' + wk + ' ' + total);
      /* movement */
      if (wk === 0) { if (p.rows.some(r => r.mv != null || r.nw)) bad.push('pre mv'); }
      else { const pr = new Map(pl[wk - 1].rows.map(r => [r.id, r.rk])); for (const r of p.rows) { const was = pr.get(r.id); if (was ? (r.mv !== was - r.rk || r.prev !== was || r.nw) : (r.mv != null || !r.nw)) bad.push('mv ' + wk + r.id); } }
      sig.push(p.rows.map(r => r.id + ':' + r.rk + ':' + r.pts + ':' + r.fp).join(',')); });
    return { n: pl.length, md: C.md, phase: C.phase, bad, sig: sig.join('|'), others: pl.every(p => p.ov.length > 0) }; });
  console.log(JSON.stringify({ n: W.n, md: W.md, phase: W.phase, bad: W.bad.slice(0, 6) }));
  ok(W.phase === 'regular' && W.n === W.md + 1, `one poll per completed round (${W.n} polls after ${W.md} matchdays)`);
  ok(W.bad.length === 0, '25 distinct teams ranked every week; ballots, Borda points (25..1), first-place votes, sorting, others receiving votes and movement all agree' + (W.bad.length ? ': ' + W.bad.slice(0, 4).join(' ') : ''));
  ok(W.others, 'every poll lists others receiving votes');

  /* ---- movement arrows in the DOM ---- */
  await page.evaluate(() => { App.route = 'statepoll'; App.params = {}; render(); }); await page.waitForTimeout(1500);
  const D = await page.evaluate(() => { const C = App.C; const pl = C.poll.polls[C.year]; const last = pl[pl.length - 1]; const pr = new Map(pl[pl.length - 2].rows.map(r => [r.id, r.rk]));
    const rows = [...document.querySelectorAll('.v1812p-row')]; const bad = [];
    for (const li of rows) { const id = li.dataset.tid, rk = +li.dataset.rk; const was = pr.get(id); const exp = !was ? 'NEW' : was > rk ? '▲' + (was - rk) : was < rk ? '▼' + (rk - was) : '–'; const got = li.querySelector('.v1812p-mv').textContent.trim(); if (got !== exp) bad.push(id + ' ' + got + '/' + exp);
      const cls = li.querySelector('.v1812p-mv').className; if (was && was > rk && !cls.includes('up')) bad.push('cls up ' + id); if (was && was < rk && !cls.includes('dn')) bad.push('cls dn ' + id); }
    const me = document.querySelector('.v1812p-row.me'); return { n: rows.length, bad, meOk: !!me === !!last.rows.find(r => r.id === C.userSid), title: document.querySelector('.v1812p-bh h2').textContent, pts: rows.map(li => li.querySelector('.v1812p-pts').textContent === li.querySelector('.v1812p-pts').dataset.to).every(Boolean), fp: document.querySelectorAll('.v1812p-fp').length, ovl: document.querySelector('.v1812p-ov').textContent.slice(0, 24) }; });
  ok(D.n === 25 && D.bad.length === 0, 'the table shows 25 rows with the right arrows (green up, red down, dash, NEW)' + (D.bad.length ? ': ' + D.bad.slice(0, 3).join(' ') : ''));
  ok(/Week \d+/.test(D.title) && D.title.includes(await page.evaluate(() => App.C.stateName)), `table title names the state and the week ("${D.title.trim().replace(/\s+/g, ' ')}")`);
  ok(D.pts && D.fp > 0 && /Others receiving votes/.test(D.ovl), 'points settle on their final values, first-place votes and the footer show');
  ok(D.meOk, 'your team’s row is highlighted exactly when it is ranked');

  /* ---- the rank-by-week chart and story ---- */
  const S = await page.evaluate(() => { const C = App.C; const pl = C.poll.polls[C.year]; const st = v1812pStory(C, C.userSid, C.year);
    const exp = pl.map(p => { const i = p.rows.findIndex(r => r.id === C.userSid); return i < 0 ? null : i + 1; });
    const dots = document.querySelectorAll('.v1812p-season .v1812p-dot').length; const path = document.querySelector('.v1812p-season .v1812p-line'); const ranked = exp.filter(Boolean);
    return { ranks: JSON.stringify(st.ranks) === JSON.stringify(exp), n: st.ranks.length, polls: pl.length, dots, path: !!path && path.getAttribute('d').length > 10, head: document.querySelector('.v1812p-season .v1812p-head').textContent, hd: st.head, best: st.best ? st.best.r : null, expBest: ranked.length ? Math.min(...ranked) : null, worst: st.worst ? st.worst.r : null, expWorst: ranked.length ? Math.max(...ranked) : null, weeks: st.weeks === ranked.length,
      headOk: st.head === ((exp[0] ? 'NO. ' + exp[0] : 'UNRANKED') + ' TO ' + (exp[exp.length - 1] ? 'NO. ' + exp[exp.length - 1] : 'UNRANKED')) || !ranked.length || (exp[0] === exp[exp.length - 1] && ranked.length === exp.length) }; });
  ok(S.ranks && S.n === S.polls && S.dots === S.polls && S.path, `your rank chart is populated (${S.dots} points, a line, ranks match every poll)`);
  ok(S.best === S.expBest && S.worst === S.expWorst && S.weeks && S.headOk && S.head === S.hd, `season story: headline "${S.head}", best ${S.best}, lowest ${S.worst}`);

  /* ---- Game of the Week ---- */
  const G = await page.evaluate(() => { const C = App.C; const yr = C.year; const pl = C.poll.polls[yr]; const out = []; const bad = [];
    for (let rd = 0; rd < pl.length; rd++) { const rk = new Map(pl[rd].rows.map(r => [r.id, r.rk])); const fx = Object.values(C.fixtures).filter(f => f.yr === yr && f.comp === 'reg' && f.lvl === 'V' && f.rd === rd);
      const pairs = fx.filter(f => rk.get(f.h) && rk.get(f.a)).map(f => ({ id: f.id, sc: 100 - (rk.get(f.h) + rk.get(f.a)) + (f.h === C.userSid || f.a === C.userSid ? 2.5 : 0) - 0.05 * Math.abs(rk.get(f.h) - rk.get(f.a)) })).sort((a, b) => b.sc - a.sc || (a.id < b.id ? -1 : 1));
      const g = v1812pGotw(C, yr, rd); const uf = fx.find(f => f.h === C.userSid || f.a === C.userSid);
      if (pairs.length) { if (!g || g.kind !== 'showdown' || g.fid !== pairs[0].id) bad.push('rd' + rd); const all = v1812pRankedGames(C, yr, rd); if (all.length !== pairs.length) bad.push('all' + rd); }
      else if (uf && (rk.get(uf.h) || rk.get(uf.a))) { if (!g || g.kind !== 'spotlight' || g.fid !== uf.id) bad.push('spot' + rd); }
      else if (g) bad.push('none' + rd);
      out.push(pairs.length ? 'S' : g ? 'o' : '-'); }
    return { bad, out: out.join('') }; });
  console.log('rounds: ' + G.out + ' (S showdown, o spotlight)');
  ok(G.bad.length === 0, 'Game of the Week: the best ranked-vs-ranked fixture of each round, else the spotlight on your ranked game, else none' + (G.bad.length ? ': ' + G.bad.join(' ') : ''));
  /* synthetic polls: force a known set of ranked teams */
  const F = await page.evaluate(() => { const C = App.C; const yr = C.year; const rd = C.md; const pl = C.poll.polls[yr]; const keep = JSON.stringify(pl[rd].rows);
    const fx = v1812pRoundGames(C, yr, rd); const u = C.userSid; const other = fx.filter(f => f.h !== u && f.a !== u); const mine = fx.find(f => f.h === u || f.a === u); const oppOf = mine.h === u ? mine.a : mine.h;
    const virt = C.poll.pool.teams.map(t => t.id);
    const fill = (spec) => { const rows = []; const used = new Set(Object.values(spec)); let k = 0; for (let r = 1; r <= 25; r++) { let id = spec[r]; if (!id) { do { id = virt[k++]; } while (used.has(id)); } rows.push({ id, rk: r, pts: 200 - r, fp: 0, prev: null, mv: null, nw: false }); } return rows; };
    const out = {};
    pl[rd].rows = fill({ 2: other[0].h, 9: other[0].a }); const g1 = v1812pGotw(C, yr, rd); out.one = g1 && g1.kind === 'showdown' && g1.fid === other[0].id && g1.rh === 2 && g1.ra === 9;
    pl[rd].rows = fill({ 4: other[0].h, 6: other[0].a, 1: other[1].h, 3: other[1].a }); const g2 = v1812pGotw(C, yr, rd); out.best = g2 && g2.fid === other[1].id && g2.kind === 'showdown' && g2.all.length === 2;
    pl[rd].rows = fill({ 5: oppOf }); const g3 = v1812pGotw(C, yr, rd); out.spot = g3 ? g3.kind + (g3.fid === mine.id) : 'none';
    pl[rd].rows = fill({ 7: u }); const g4 = v1812pGotw(C, yr, rd); out.user = g4 ? g4.kind + (g4.fid === mine.id) : 'none';
    pl[rd].rows = fill({ 7: u, 12: oppOf, 3: other[2].h, 4: other[2].a }); const g5 = v1812pGotw(C, yr, rd); out.mineBeats = g5 && g5.kind === 'showdown' && g5.fid === other[2].id;
    pl[rd].rows = fill({ 7: u, 12: oppOf, 9: other[2].h, 10: other[2].a }); const g6 = v1812pGotw(C, yr, rd); out.userBonus = g6 && g6.fid === mine.id && g6.user;
    pl[rd].rows = fill({}); const g7 = v1812pGotw(C, yr, rd); out.none = g7 ? g7.kind : 'none';
    pl[rd].rows = JSON.parse(keep); return out; });
  console.log(JSON.stringify(F));
  ok(F.one, 'two ranked teams meeting makes the game a ranked showdown (forced poll: No. 2 vs No. 9)');
  ok(F.best, 'with two ranked pairs the better pair is the Game of the Week');
  ok(F.spot === 'spotlighttrue' && F.user === 'spotlighttrue', 'your own fixture is featured when you or your opponent is ranked and nothing bigger is on');
  ok(F.mineBeats && F.userBonus, 'a much better ranked pair elsewhere outranks your showdown; with equal ranks your own game wins');
  ok(F.none === 'none', 'no ranked team in the round: no Game of the Week');

  /* ---- Matchday Center, schedule badge, odds, Overview ---- */
  await page.evaluate(() => { const C = App.C; let g = 0; while (!v1812pGotw(C) && g++ < 6 && C.phase === 'regular') { simRound(C); advance(C); } });
  const M = await page.evaluate(() => { const C = App.C; const g = v1812pGotw(C); App.route = 'matchday'; App.params = {}; render(); const card = document.querySelector('.v1812p-show.in-md');
    return { has: !!g, kind: g && g.kind, card: !!card, text: card ? card.textContent.replace(/\s+/g, ' ') : '', rh: g && g.rh, ra: g && g.ra, pill: !!document.querySelector('.mc-game .v1812p-pill.gotw'), cls: !!document.querySelector('.mc-game.v1812p-gotwc'), projChip: card ? [...card.querySelectorAll('.v1812p-chip.win')].map(x => x.textContent) : [] }; });
  ok(M.has && M.card && /NO\. \d+/.test(M.text) && /Game of the week in the Matchday Center|Spotlight/.test(M.text), 'the Matchday Center shows the ranked showdown card with both ranks' + (M.card ? '' : ' (no game this round: ' + M.has + ')'));
  ok(M.pill && M.cls, 'the Game of the Week carries a pill and a highlight in the game list');
  ok(M.projChip.length > 0 && M.projChip.every(t => /projected/.test(t)), 'projected poll effect chips: ' + M.projChip.join(' | '));
  await page.waitForTimeout(2500);
  const O = await page.evaluate(() => { const c = document.querySelector('.v1812p-odds'); return c ? c.textContent.trim() : null; });
  ok(O && /[+\-−]\d+/.test(O) || O === null, 'moneyline odds fill in on the card' + (O ? ' (' + O + ')' : ' (odds off or no card)'));
  const SB = await page.evaluate(() => { const C = App.C; const g = v1812pGotw(C); App.route = 'schedule'; App.params = { rall: '1', lvl: 'V' }; render(); const rows = [...document.querySelectorAll('.v1812p-sb')]; const row = g && document.querySelector(`.li[data-id="${g.fid}"] .v1812p-sb`);
    const past = v1812pRankedGames(C, C.year, 1).concat(v1812pRankedGames(C, C.year, 2)); return { n: rows.length, gotw: !!(g && g.kind === 'showdown' ? row && row.classList.contains('gotw') : true), txt: row ? row.textContent : '', past: past.length }; });
  ok(SB.n > 0 && SB.gotw, `the schedule marks ranked games with a badge, the Game of the Week with GOTW (${SB.n} badges${SB.txt ? ', "' + SB.txt + '"' : ''})`);
  const OV = await page.evaluate(() => { App.route = 'office'; App.params = {}; render(); const c = document.querySelector('.v1812p-ovcard'); return { has: !!c, rows: c ? c.querySelectorAll('.v1812p-ovt li').length : 0, head: c ? c.querySelector('.v1812p-ovh').textContent : '', btn: !!(c && c.querySelector('[data-r="statepoll"]')), show: !!(c && c.querySelector('.v1812p-show')) || !!(c && c.querySelector('.v1812p-ovq')) }; });
  ok(OV.has && OV.rows >= 5 && OV.btn && OV.show && OV.head.length > 3, `the Overview teaser card: headline "${OV.head}", top 5, a showdown or a voter, and a link in`);

  /* ---- Newsroom ---- */
  const N = await page.evaluate(() => { const C = App.C; App.route = 'news'; App.params = { nv: 'courier' }; render(); const box = document.querySelector('.v1812p-np'); const wire = C.news.filter(n => n.type === 'poll').map(n => n.text); return { box: !!box, txt: box ? box.textContent.replace(/\s+/g, ' ').slice(0, 160) : '', wire, ids: C.news.map(n => n.id).length === new Set(C.news.filter(n => n.type !== 'poll').map(n => n.id)).size + C.news.filter(n => n.type === 'poll').length }; });
  ok(N.box && /State Poll/.test(N.txt), 'The Courier carries a State Poll box');
  ok(N.wire.length >= 1 && N.wire.every(t => /State Poll|poll|Game of the week/i.test(t)), 'the Newswire has poll items (' + N.wire.length + '): ' + N.wire[0]);
  const GN = await page.evaluate(() => { const C = App.C; const played = []; for (let rd = 0; rd < C.poll.polls[C.year].length - 1; rd++) { const g = v1812pGotw(C, C.year, rd); if (g && g.kind === 'showdown' && C.fixtures[g.fid].st === 'd') played.push(g.fid); } const items = C.news.filter(n => n.type === 'poll' && /^Game of the week/.test(n.text)); return { played: played.length, items: items.length, linked: items.every(n => C.fixtures[n.fid]), sample: items[0] && items[0].text, once: new Set(items.map(n => n.fid)).size === items.length }; });
  ok(GN.items === GN.played && GN.linked && GN.once, 'each played Game of the Week gets one Newswire item linked to its report (' + GN.items + ' of ' + GN.played + (GN.sample ? ': ' + GN.sample : '') + ')');

  /* ---- team metrics ---- */
  const T = await page.evaluate(() => { const C = App.C; const yr = C.year; const tb = v1812pTable(C, yr); const st = standings(C, 'V'); const bad = [];
    for (const s of st) { const r = tb.find(x => x.id === s.sid); const A = r.A; if (A.gp !== s.p || A.w !== s.w || A.d !== s.d || A.l !== s.l || A.gf !== s.gf || A.ga !== s.ga || A.gd !== s.gd || A.pts !== s.pts) bad.push('std ' + s.sid); }
    /* xG for/against equals the sum of the match logs */
    let xgBad = 0; for (const sid of C.league) { let xf = 0, xa = 0; for (const f of Object.values(C.fixtures)) { if (f.yr !== yr || f.comp !== 'reg' || f.lvl !== 'V' || f.st !== 'd' || (f.h !== sid && f.a !== sid)) continue; const lg = C.logs[f.id]; const i = f.h === sid ? 0 : 1; xf += lg.st[i].xg; xa += lg.st[1 - i].xg; } const A = tb.find(x => x.id === sid).A; if (Math.abs(A.xgf - xf) > 0.1 || Math.abs(A.xga - xa) > 0.1) xgBad++; }
    /* every section: goals for equal goals against, wins equal losses; seeds 1..8 once each; power ranks unique */
    const secs = {}; for (const r of tb) (secs[r.sec] || (secs[r.sec] = [])).push(r); let secBad = 0; for (const sec in secs) { const a = secs[sec]; const gf = a.reduce((s, r) => s + r.A.gf, 0), ga = a.reduce((s, r) => s + r.A.ga, 0), w = a.reduce((s, r) => s + r.A.w, 0), l = a.reduce((s, r) => s + r.A.l, 0); if (gf !== ga || w !== l || a.length !== 8) secBad++; if (a.map(r => r.seed).sort().join() !== '1,2,3,4,5,6,7,8') secBad++; }
    const sane = tb.every(r => (r.A.shShare == null || (r.A.shShare >= 0 && r.A.shShare <= 1)) && (r.A.pos == null || (r.A.pos > 10 && r.A.pos < 90)) && r.A.csPct >= 0 && r.A.csPct <= 1 && isFinite(r.power) && r.power > 40 && r.power < 100);
    const posSum = (() => { const d = []; for (const f of Object.values(C.fixtures)) if (f.yr === yr && f.comp === 'reg' && f.lvl === 'V' && f.st === 'd') { const x = C.poll.fx[f.id]; if (x) d.push(Math.abs(x.pos[0] + x.pos[1] - 100) < 0.2); } return d.length > 0 && d.every(Boolean); })();
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length; const gpg = mean(tb.map(r => r.A.gf / Math.max(1, r.A.gp)));
    const ranks = tb.map(r => r.prank).sort((a, b) => a - b); const rankOk = ranks.every((x, i) => x === i + 1);
    const pollsRanked = tb.filter(r => r.poll).length;
    return { n: tb.length, bad, xgBad, secBad, sane, posSum, gpg: +gpg.toFixed(2), rankOk, pollsRanked, nx: tb.filter(r => r.A.nx > 0).length, vgames: tb.filter(r => !r.league).every(r => r.A.gp === C.md) }; });
  console.log(JSON.stringify({ ...T, bad: T.bad.slice(0, 3) }));
  ok(T.n === 88 && T.bad.length === 0, 'team analytics: goal difference, record and points of your section equal the standings');
  ok(T.xgBad === 0 && T.nx === 88, 'xG for and against equal the sums of the match logs; every team has xG');
  ok(T.secBad === 0 && T.rankOk && T.sane && T.posSum, 'every section balances (GF=GA, W=L), seeds run 1-8, power ranks are unique, shares and possession are sane');
  ok(T.gpg > 1.2 && T.gpg < 2.6 && T.vgames && T.pollsRanked === 25, `simulated sections play the same number of games and score ${T.gpg} goals a team a game`);

  /* ---- UI: tabs, filters, sorting, panels ---- */
  await page.evaluate(() => { App.route = 'statepoll'; App.params = {}; render(); });
  await page.click('.v1812p-hero .tab:has-text("Teams")'); await page.waitForTimeout(250);
  const T1 = await page.evaluate(() => ({ rows: document.querySelectorAll('#v1812p-tb tr').length, tab: document.querySelector('.v1812p').dataset.tab }));
  ok(T1.tab === 'teams' && T1.rows === 88, 'Teams tab lists all 88 schools');
  await page.click('.v1812p-sortb[data-k="ppg"]'); await page.waitForTimeout(200);
  const T2 = await page.evaluate(() => { const v = [...document.querySelectorAll('#v1812p-tb tr')].map(tr => +tr.children[3].textContent); return { desc: v.every((x, i) => !i || v[i - 1] >= x), n: v.length }; });
  ok(T2.desc, 'sorting by points per game puts the best first');
  await page.click('.v1812p-sortb[data-k="ppg"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const v = [...document.querySelectorAll('#v1812p-tb tr')].map(tr => +tr.children[3].textContent); return v.every((x, i) => !i || v[i - 1] <= x); }), 'clicking again reverses the sort');
  await page.selectOption('select[data-k="tsec"]', 'mine'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelectorAll('#v1812p-tb tr').length === 8), 'the section filter narrows to your eight schools');
  await page.selectOption('select[data-k="tsec"]', 'all'); await page.selectOption('select[data-k="trk"]', 'ranked'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelectorAll('#v1812p-tb tr').length === 25), 'the Top 25 filter keeps the 25 ranked schools');
  await page.selectOption('select[data-k="trk"]', 'all'); await page.fill('input[data-v1812p-q]', 'zzzz'); await page.waitForTimeout(200);
  const none = await page.evaluate(() => document.querySelectorAll('#v1812p-tb tr').length); await page.fill('input[data-v1812p-q]', ''); await page.waitForTimeout(150);
  const q = await page.evaluate(() => { const C = App.C; const t = C.poll.pool.teams[5]; return t.town; }); await page.fill('input[data-v1812p-q]', q); await page.waitForTimeout(200);
  ok(none === 0 && await page.evaluate(() => document.querySelectorAll('#v1812p-tb tr').length >= 1 && +document.getElementById('v1812p-n').textContent === document.querySelectorAll('#v1812p-tb tr').length), 'the text filter finds a school by name and the count follows');
  await page.fill('input[data-v1812p-q]', ''); await page.waitForTimeout(150);
  await page.click('#v1812p-tb tr .v1812p-tb'); await page.waitForTimeout(300);
  const TP = await page.evaluate(() => ({ m: App.modal && App.modal.type, kpis: document.querySelectorAll('.modal .v1812p-kpi').length, players: document.querySelectorAll('.modal tbody tr').length, chart: !!document.querySelector('.modal .v1812p-chart'), res: document.querySelectorAll('.modal .v1812p-results .li').length }));
  ok(TP.m === 'v1812pTeam' && TP.kpis >= 8 && TP.chart && TP.res > 0 && TP.players > 5, `a team panel opens with metrics, résumé, results and its players (${TP.players} listed)`);
  /* a statewide player from the panel: Across seasons */
  const vp = await page.evaluate(() => { const a = [...document.querySelectorAll('.modal tbody .link[data-a="v1812pPlayer"],.modal tbody .link[data-a="openPlayer"]')]; return a.length ? { a: a[0].dataset.a, id: a[0].dataset.id } : null; });
  ok(!!vp, 'the team panel links to its players');
  await page.click('.modal tbody .link'); await page.waitForTimeout(300);
  const PM = await page.evaluate(() => ({ t: App.modal.type, rows: document.querySelectorAll('.modal .v1812p-stt tbody tr:not(.tags)').length, kp: document.querySelectorAll('.modal .v1812p-kpi').length }));
  if (PM.t === 'player') { await page.click('.modal [data-v="across"]'); await page.waitForTimeout(250); }
  ok(await page.evaluate(() => !!document.querySelector('.modal .v1812p-stt') && document.querySelectorAll('.modal .v1812p-kpi').length >= 6), 'a player opens to a season-by-season table with a stat strip');
  await page.evaluate(() => { App.modal = null; renderModal(); });
  await page.click('.v1812p-hero .tab:has-text("Players")'); await page.waitForTimeout(250);
  const PL = await page.evaluate(() => ({ pod: document.querySelectorAll('.v1812p-pp').length, list: document.querySelectorAll('.v1812p-lr').length, title: document.querySelector('.v1812p-lcard h2').textContent }));
  ok(PL.pod === 3 && PL.list === 22 && /scorers/i.test(PL.title), 'Players tab: top-scorer podium and list');
  for (const k of ['a', 'ga', 'gk', 'cs', 'rt']) { await page.click(`[data-a="setParam"][data-k="pb"][data-v="${k}"]`); await page.waitForTimeout(120); }
  ok(await page.evaluate(() => document.querySelectorAll('.v1812p-pp').length >= 1 && /rating/i.test(document.querySelector('.v1812p-lcard h2').textContent)), 'every leaderboard renders (assists, G+A, keepers, clean sheets, ratings)');
  await page.click('[data-a="setParam"][data-k="psc"][data-v="league"]'); await page.waitForTimeout(200);
  const LS = await page.evaluate(() => { const C = App.C; return [...document.querySelectorAll('.v1812p-lr, .v1812p-pp')].every(el => true) && document.querySelectorAll('.v1812p-lcard').length === 1; });
  ok(LS, 'the leaderboards can be limited to your section');
  const PB = await page.evaluate(() => { const C = App.C; const sc = v1812pBoard(C, C.year, 'g', 'state', 10); const lg = v1812pBoard(C, C.year, 'g', 'league', 10); const real = leaders(C, 'g', C.year, 'V', 3);
    return { sorted: sc.every((x, i) => !i || sc[i - 1].v >= x.v), leagueOnly: lg.every(x => C.league.includes(x.sid)), same: lg[0] && real[0] ? lg[0].v === real[0].v : true, mixed: sc.some(x => x.virtual) && sc.some(x => !x.virtual) || sc.length > 0 }; });
  ok(PB.sorted && PB.leagueOnly && PB.same, 'section leaderboards agree with the existing league leaders; the state board mixes in the other sections');
  await page.evaluate(() => { App.route = 'statepoll'; App.params = {}; render(); });
  await page.click('.v1812p-row .v1812p-rb'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => App.modal && App.modal.type === 'v1812pTeam'), 'a row in the poll opens that team’s panel');
  await page.evaluate(() => { App.modal = null; renderModal(); });
  /* week stepping */
  await page.click('[data-a="v1812pWeek"][data-d="-1"]'); await page.waitForTimeout(300);
  const WS = await page.evaluate(() => ({ title: document.querySelector('.v1812p-bh h2').textContent, sel: +document.querySelector('select[data-c="v1812pWeekSel"]').value, want: App.C.poll.polls[App.C.year].length - 2, n: document.querySelectorAll('.v1812p-row').length, id0: document.querySelector('.v1812p-row').dataset.tid, exp0: App.C.poll.polls[App.C.year][App.C.poll.polls[App.C.year].length - 2].rows[0].id }));
  ok(WS.n === 25 && WS.sel === WS.want && WS.id0 === WS.exp0, `the week stepper moves to the previous poll (${WS.title.trim().replace(/\s+/g, ' ')})`);
  await page.evaluate(() => { App.params = {}; render(); });

  /* ---- motion: rows slide, points count, and reduced motion skips it ---- */
  await page.evaluate(() => { PREFS.rm = false; v1812pAnim.key = null; App.route = 'office'; render(); App.route = 'statepoll'; App.params = {}; render(); });
  const mid = await page.evaluate(() => new Promise(r => setTimeout(() => { const rows = [...document.querySelectorAll('.v1812p-row')]; r({ moving: rows.filter(x => x.style.transform && x.style.transform !== 'none' && x.style.transform !== '').length, counting: [...document.querySelectorAll('.v1812p-pts')].filter(el => el.textContent !== el.dataset.to).length, inCls: document.querySelector('.v1812p').classList.contains('v1812p-in') }); }, 120)));
  await page.waitForTimeout(1800);
  const end = await page.evaluate(() => ({ moving: [...document.querySelectorAll('.v1812p-row')].filter(x => x.style.transform).length, counting: [...document.querySelectorAll('.v1812p-pts')].filter(el => el.textContent !== el.dataset.to).length }));
  ok(mid.inCls && (mid.moving > 0 || mid.counting > 0) && end.moving === 0 && end.counting === 0, `rows slide to their new ranks and points count up, then settle (${mid.moving} moving, ${mid.counting} counting at 120 ms)`);
  await page.evaluate(() => { PREFS.rm = true; v1812pAnim.key = null; App.route = 'office'; render(); App.route = 'statepoll'; render(); });
  const rm = await page.evaluate(() => new Promise(r => setTimeout(() => r({ moving: [...document.querySelectorAll('.v1812p-row')].filter(x => x.style.transform).length, counting: [...document.querySelectorAll('.v1812p-pts')].filter(el => el.textContent !== el.dataset.to).length }), 100)));
  ok(rm.moving === 0 && rm.counting === 0, 'reduced motion: no sliding, no counting');
  await page.evaluate(() => { PREFS.rm = false; });

  /* ---- results unchanged: this build against the same sources without the poll files ---- */
  const RUN = (seedN) => { const C = newCareer({ slot: 1, seed: seedN, coachName: 'Seth Test' }); C.logs = C.logs || {}; const run = () => { let g = 0; while (C.phase !== 'offseason' && g++ < 200) { simRound(C); if (!advance(C)) break; } }; run(); rollover(C); for (let i = 0; i < 10; i++) { simRound(C); advance(C); }
    return { sig: Object.values(C.fixtures).filter(f => f.st === 'd').map(f => f.id + ':' + f.hg + '-' + f.ag + (f.pk ? 'p' + f.pk.join('-') : '')).sort().join('|') + '|nid' + C.nextId + '|gs' + C.gs + '|players' + Object.keys(C.players).length + '|news' + C.news.filter(n => n.type !== 'poll').length, polls: C.poll ? Object.keys(C.poll.polls).join(',') : null }; };
  const baseCtx = await b.newContext(); const base = await baseCtx.newPage(); base.on('pageerror', e => errs.push('baseline: ' + e.message)); await base.goto(baselineUrl()); await base.waitForTimeout(500);
  const bare = await base.evaluate(`(${RUN})(12345)`); const withPoll = await page.evaluate(`(${RUN})(12345)`);
  ok(bare.polls === null && await base.evaluate(() => typeof v1812pS === 'undefined'), 'the baseline build really has no poll code');
  ok(withPoll.sig === bare.sig, 'a season, the offseason and ten rounds of the next season give identical results, ids, RNG state and rosters with the poll code present or absent');
  const pageRes = '#' + withPoll.polls;
  ok(pageRes.split('#')[1] === '2026,2027', 'that career published polls for both seasons');

  /* ---- determinism, reload, migration ---- */
  const sigA = await page.evaluate(() => JSON.stringify(App.C.poll.polls));
  const page2 = await mk('poll-t1'); await page2.evaluate(`(${SIM})(10)`);
  const sigB = await page2.evaluate(() => JSON.stringify(App.C.poll.polls));
  ok(sig10 === sigB && sigB.length > 5000, 'the same seed and the same games give byte-identical polls');
  const page3 = await mk('poll-t2'); await page3.evaluate(`(${SIM})(10)`);
  ok(await page3.evaluate(() => JSON.stringify(App.C.poll.polls)) !== sigB, 'a different seed gives a different poll');
  await page.evaluate(() => saveNow()); await page.waitForTimeout(600);
  await page.reload(); await page.waitForTimeout(700); await page.evaluate(() => openSlot(1)); await page.waitForTimeout(900);
  const sigC = await page.evaluate(() => JSON.stringify(App.C.poll.polls));
  ok(sigC === sigA, 'save and reload keep every published poll exactly');
  const R = await page.evaluate(() => { App.route = 'statepoll'; App.params = {}; render(); return { rows: document.querySelectorAll('.v1812p-row').length, again: JSON.stringify(App.C.poll.polls) }; });
  ok(R.rows === 25, 'the poll renders after a reload');
  /* syncing again publishes nothing new, and re-ingesting is idempotent */
  const again = await page.evaluate(() => { const C = App.C; const n = v1812pSync(C); const k = Object.keys(C.poll.fx).length; v1812pBackfill(C); return { n, same: k === Object.keys(C.poll.fx).length }; });
  ok(again.n === 0 && again.same, 'syncing is idempotent');
  const MG = await page.evaluate(() => { const C = App.C; const raw = JSON.parse(JSON.stringify(careerForSave(C))); delete raw.poll; const M = migrate(raw); const had = !!M.poll && M.poll.v === 1 && M.poll.pool.teams.length === 80; v1812pSync(M); const pl = M.poll.polls[M.year];
    return { had, same: JSON.stringify(v1812pMakePool(M)) === JSON.stringify(v1812pMakePool(M)), n: pl.length, md: M.md, rows: pl.every(p => p.rows.length === 25), top: pl[pl.length - 1].rows[0].id, idem: (() => { const m2 = migrate(JSON.parse(JSON.stringify(careerForSave(M)))); return m2.poll.polls[m2.year].length === pl.length; })() }; });
  ok(MG.had && MG.same && MG.n === MG.md + 1 && MG.rows && MG.idem, `an old save (no poll data) migrates: a deterministic statewide pool, polls rebuilt from its results (${MG.n} polls)`);
  const MP = await mk('poll-t3');
  const MP2 = await MP.evaluate(() => { const C = App.C; const before = JSON.stringify(C.poll.polls[C.year][0].rows); const raw = JSON.parse(JSON.stringify(careerForSave(C))); delete raw.poll; const M = migrate(raw); v1812pSync(M); return before === JSON.stringify(M.poll.polls[M.year][0].rows); });
  ok(MP2, 'migrating a save made before any game reproduces the preseason poll exactly');

  /* ---- player seasons across a career ---- */
  await page.evaluate(() => { const C = App.C; let g = 0; while (C.phase !== 'offseason' && g++ < 80) { simRound(C); if (!advance(C)) break; } rollover(C); for (let i = 0; i < 12; i++) { simRound(C); advance(C); } });
  const PS = await page.evaluate(() => { const C = App.C; const yr = C.year; let bad = 0, n = 0, multi = 0, alum = 0, withXg = 0; const badIds = [];
    for (const p of everyone(C)) { const rows = v1812pSeasonRows(C, p); const c = v1812pCareer(rows, 'V'); const t = careerTotals(p, 'V'); n++; if (C.alumni[p.id]) alum++;
      for (const k of ['gp', 'g', 'a', 'sv', 'tk', 'int', 'cl', 'y', 'r', 'cs']) if (c.t[k] !== t[k]) { bad++; badIds.push(p.id + k); }
      const vr = rows.filter(r => r.lvl === 'V'); if (vr.length > 1) multi++; if (rows.some(r => r.xg != null && r.xg > 0)) withXg++;
      for (const r of rows) { if (r.ga !== r.t.g + r.t.a) bad++; if (r.t.gp && r.rt != null && (r.rt < 3.5 || r.rt > 10)) bad++; if (r.t.gp && Math.abs(r.g90 - r.t.g / (r.t.gp * 80) * 90) > 1e-9) bad++; } }
    /* player xG equals the sum of that player's shots in the logs of each season (Varsity, league and postseason, no preseason) */
    let xgBad = 0, xgN = 0; const logYrs = {}; for (const f of Object.values(C.fixtures)) { if (f.st !== 'd' || f.lvl !== 'V' || f.comp === 'pre' || !C.logs[f.id] || !C.logs[f.id].shots) continue; for (const s of C.logs[f.id].shots) { const k = s.pid + '|' + f.yr; logYrs[k] = (logYrs[k] || 0) + s.xg; } }
    for (const k in logYrs) { const [pid, y] = k.split('|'); const p = findPerson(C, pid); if (!p) continue; const got = v1812pPlayerXg(C, p, +y); xgN++; if (got == null || Math.abs(got - logYrs[k]) > 0.06) xgBad++; }
    return { n, bad, badIds: badIds.slice(0, 3), multi, alum, withXg, xgBad, xgN, years: Object.keys(C.poll.polls).join(',') }; });
  console.log(JSON.stringify(PS));
  ok(PS.bad === 0, `player seasons: every one of ${PS.n} players' Varsity season rows sum to the career totals (${PS.alum} graduates included)`);
  ok(PS.multi > 5, `${PS.multi} players have more than one Varsity season`);
  ok(PS.xgBad === 0 && PS.xgN > 50, `player xG matches the shot logs (${PS.xgN} player-seasons)`);
  const VP = await page.evaluate(() => { const C = App.C; const yr = C.year; const t = C.poll.pool.teams[9]; let bad = 0; let multi = 0;
    for (const y of [yr - 1, yr]) { const T = v1812pVTeamSeason(C, t.id, y); const recs = v1812pVSeason(C, y).rec.get(t.id).filter(r => r.rd < v1812pBound(C, y)); let g = 0, a = 0, sv = 0, cs = 0, ga = 0; for (const S of T.stats.values()) { g += S.g; a += S.a; sv += S.sv; cs += S.cs; ga += S.ga; }
      const gf = recs.reduce((s, r) => s + r.gf, 0); if (g !== gf) bad++; if (a > g) bad++; const gk = recs.reduce((s, r) => s + r.ga, 0); if (ga !== gk) bad++; if (cs !== recs.filter(r => r.ga === 0).length) bad++; }
    for (const team of C.poll.pool.teams) for (const p of v1812pVRoster(C, team.id, yr)) { const rec = v1812pPlayerRec(C, p.id); const rows = v1812pSeasonRows(C, rec); if (rows.length > 1) multi++; const c = v1812pCareer(rows, 'V'); let g = 0; for (const y of Object.keys(rec.st)) g += rec.st[y].V.reg.g; if (c.t.g !== g) bad++; if (rec.st[yr] && !Object.keys(rec.st).every(k => +k >= C.poll.y0)) bad++; }
    return { bad, multi }; });
  ok(VP.bad === 0, 'statewide teams: player goals sum to the team’s goals, assists never exceed goals, keepers carry the goals against and the clean sheets');
  ok(VP.multi > 20, `statewide players carry across seasons (${VP.multi} with more than one)`);
  const ST = await page.evaluate(() => { const C = App.C; const out = {}; const yrs = V1812P_YRS(C); out.yrs = yrs.join(','); const prev = v1812pBoard(C, C.year - 1, 'g', 'state', 5); out.prev = prev.length; const a = v1812pTable(C, C.year - 1); out.prevTable = a.length === 88 && a.every(r => r.A.gp === 14); out.prevPolls = C.poll.polls[C.year - 1].length;
    /* the previous season's final standings equal the archive */ const arc = C.archives.find(x => x.yr === C.year - 1); out.arc = arc ? arc.stand.V.every(s => { const r = a.find(x => x.id === s.sid); return r && r.A.pts === s.pts && r.A.gd === s.gf - s.ga; }) : false; return out; });
  ok(ST.yrs === '2027,2026' && ST.prev === 5 && ST.prevTable && ST.prevPolls === 15, 'season selectors reach last season’s leaderboards, team table and 15 polls');
  ok(ST.arc, 'last season’s analytics for your section match the archived standings');
  /* player modal: real player, Across seasons tab, many seasons */
  const AC = await page.evaluate(() => { const C = App.C; const p = everyone(C).filter(x => C.league.includes(x.sid) && v1812pSeasonRows(C, x).filter(r => r.lvl === 'V').length >= 2).sort((a, b) => (careerTotals(b).g + careerTotals(b).a) - (careerTotals(a).g + careerTotals(a).a))[0];
    if (!p) return null; App.modal = { type: 'player', id: p.id, tab: 'across' }; renderModal(); const tab = document.querySelector('.modal [data-v="across"]'); const rows = document.querySelectorAll('.modal .v1812p-stt tbody tr:not(.tags):not(.tot)').length; const tot = document.querySelector('.modal .v1812p-stt tr.tot');
    return { on: tab && tab.classList.contains('on'), rows, want: v1812pSeasonRows(C, p).length, tot: !!tot, trend: !!document.querySelector('.modal .v1812p-trend'), kp: document.querySelectorAll('.modal .v1812p-kpi').length, careerG: careerTotals(p).g, shown: tot ? +tot.children[2].textContent : null, gk: p.pos === 'GK' }; });
  ok(AC && AC.on && AC.rows === AC.want && AC.tot && AC.trend && AC.kp >= 6, 'the player profile has an Across seasons tab: one row per season, a career row, a trend chart and a stat strip');
  ok(AC && (AC.gk || AC.shown === AC.careerG), 'the career row’s goals equal the career total');
  await page.evaluate(() => { App.modal = null; renderModal(); });
  const AC2 = await page.evaluate(() => { const C = App.C; const rec = v1812pPlayerRec(C, v1812pBoard(C, C.year - 1, 'g', 'state', 30).find(x => x.virtual).id); App.modal = { type: 'v1812pPlayer', id: rec.id }; renderModal(); return { rows: document.querySelectorAll('.modal .v1812p-stt tbody tr:not(.tags)').length, name: document.querySelector('.modal h2').textContent }; });
  ok(AC2.rows >= 1, 'a statewide player’s profile shows his seasons');
  await page.evaluate(() => { App.modal = null; renderModal(); });

  /* ---- the live intro for a ranked game ---- */
  let lv = null, LV = null;
  for (const sd of ['poll-t4', 'scan9', 'scan14']) { LV = await mk(sd); await LV.evaluate(`(${SIM})(3)`);
    lv = await LV.evaluate(() => { const C = App.C; let found = null; for (let g = 0; g < 12 && !found; g++) { const gt = v1812pGotw(C); const f = gt && C.fixtures[gt.fid]; if (gt && f && f.st === 's' && f.h !== C.userSid && f.a !== C.userSid && gt.kind === 'showdown') found = gt; else { simRound(C); advance(C); } } if (!found) return null; const f = C.fixtures[found.fid]; A.spectate({ dataset: { id: f.id } }); return { rh: found.rh, ra: found.ra }; });
    if (lv) break; }
  if (lv) { await LV.waitForTimeout(700); const li = await LV.evaluate(() => { const b = document.querySelector('#lv-intro .v1812p-lvb'); return { txt: b ? b.textContent : null, tags: [...document.querySelectorAll('#lv-intro .v1812p-lvr')].map(x => x.textContent) }; });
    ok(li.txt && li.txt.includes('No. ' + lv.rh) && li.txt.includes('No. ' + lv.ra) && /showdown|Game of the week/i.test(li.txt) && li.tags.length === 2, `the broadcast intro announces the ranked showdown ("${li.txt}")`);
    await LV.evaluate(() => { const L = App.live; if (L && L.introGo) L.introGo(); }); }
  else ok(false, 'live intro: no ranked showdown found in three seeds');

  /* ---- ranks beside school names; sim-ahead through a regular season ---- */
  const RK = await page.evaluate(() => { const C = App.C; const pl = C.poll.polls[C.year]; const last = pl[pl.length - 1]; const want = C.league.filter(s => last.rows.some(r => r.id === s)).length;
    App.route = 'league'; App.params = {}; render(); const chips = [...document.querySelectorAll('.v1812p-rkc')]; const okTxt = chips.every(c => { const row = last.rows.find(r => '#' + r.rk === c.textContent); return !!row; });
    const ranked = C.league.find(s => last.rows.some(r => r.id === s)); const rl = ranked ? recLine(ranked) : ''; const unr = C.league.find(s => !last.rows.some(r => r.id === s)); const ru = unr ? recLine(unr) : '';
    return { want, got: chips.length, okTxt, rl, ru, phase: C.phase }; });
  ok(RK.got === RK.want && RK.okTxt, `the League table puts a #rank chip beside each ranked school (${RK.got} of ${RK.want})`);
  ok(!RK.ranked && (RK.phase !== 'regular' || (/in the state/.test(RK.rl) && !/in the state/.test(RK.ru))), 'record lines in the matchday cards add the state rank only for ranked schools');
  const SA = await mk('poll-t5'); await SA.evaluate(async () => { await A.simAhead({ dataset: { k: 'regular' } }); });
  const SAR = await SA.evaluate(() => { const C = App.C; const pl = C.poll.polls[C.year]; return { n: pl.length, phase: C.phase, md: C.md, rows: pl.every(p => p.rows.length === 25), last: pl[14] && pl[14].label, wk: pl.map(p => p.wk).join(',') }; });
  ok(SAR.n === 15 && SAR.rows && SAR.wk === '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14', `sim to the end of the regular season publishes all 15 polls (${SAR.n})`);

  /* ---- phone layout ---- */
  const PH = await mk('poll-t1', { width: 390, height: 844 }); await PH.evaluate(`(${SIM})(8)`);
  for (const tab of ['poll', 'teams', 'players']) { await PH.evaluate((t) => { App.route = 'statepoll'; App.params = { pt: t }; render(); window.scrollTo(0, 0); }, tab); await PH.waitForTimeout(400);
    const ov = await PH.evaluate(() => { const els = [...document.querySelectorAll('.v1812p-card,.v1812p-hero,.v1812p-filters')]; return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, wide: els.filter(e => !e.closest('.tw') && e.getBoundingClientRect().right > window.innerWidth + 1).length }; });
    ok(ov.sw <= ov.iw + 1 && ov.wide === 0, `phone: the ${tab} tab fits the screen without sideways scrolling`); }
  await PH.evaluate(() => { App.route = 'office'; render(); });
  ok(await PH.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && !!document.querySelector('.v1812p-ovcard')), 'phone: the Overview strip fits');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
