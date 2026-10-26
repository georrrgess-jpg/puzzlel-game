// Economy simulator: plays three kinds of player (casual / average / completionist) for hundreds of levels using the
// REAL reward functions and prices from js/core.js (ECON), then asserts the balance targets.
// Usage: node tools/economy-sim.cjs [--verbose]
const vm = require('vm'), fs = require('fs'), path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8') +
  '\n;globalThis.__E={ECON,levelReward,dailyReward,levelUpReward,chestReward,xpNeed,xpForWin,msThreshold,THEMES};';
const ctx = { console, Math, JSON, Object, Array, Date, document: { querySelector: () => ({ content: '' }) }, window: {}, navigator: {}, matchMedia: () => ({ matches: false }), addEventListener() { }, setTimeout, clearTimeout };
vm.createContext(ctx); vm.runInContext(code, ctx);
const E = ctx.__E, ECON = E.ECON;
const verbose = process.argv.includes('--verbose');

/* expected value of one wheel spin, in coins / hints / skips */
const wsum = ECON.wheel.reduce((a, w) => a + w.w, 0);
const spinEV = { c: ECON.wheel.reduce((a, w) => a + (w.c || 0) * w.w, 0) / wsum, h: ECON.wheel.reduce((a, w) => a + (w.h || 0) * w.w, 0) / wsum, s: ECON.wheel.reduce((a, w) => a + (w.s || 0) * w.w, 0) / wsum };

const PROFILES = {
  casual: { levelsPerDay: 6, p3: .55, p2: .3, hintEvery: 5, spins: 2, daily: true, questMin: 6, replays: 0 },
  average: { levelsPerDay: 20, p3: .6, p2: .3, hintEvery: 6, spins: 3, daily: true, questMin: 8, replays: 2 },
  completionist: { levelsPerDay: 45, p3: .85, p2: .12, hintEvery: 12, spins: 5, daily: true, questMin: 8, replays: 8 }
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }

function simulate(name, P, maxLevels = 1500) {
  const R = rng(12345 + name.length);
  let coins = 0, hints = 2, skips = 0, xp = 0, plv = 1, level = 0, totalStars = 0, milestone = 0, streak = 0, loginDay = 0, dstreak = 0, day = 0;
  let earned = 0; const earnedBy = { levels: 0, streak: 0, daily: 0, chests: 0, levelups: 0, login: 0, spin: 0, quests: 0, replays: 0 };
  const themes = Object.entries(ECON.themes).filter(([, c]) => c > 0).sort((a, b) => a[1] - b[1]);
  const sinks = themes.map(t => t[1]).concat(ECON.deco.map(d => d.cost).sort((a, b) => a - b));   // themes first, then decorations
  let owned = 0, firstTheme = null, allThemes = null, everything = null, hintsUsed = 0, hintCoins = 0, coinsAt250 = null, coinsPerLevel = [];
  const add = (n, k) => { coins += n; earned += n; earnedBy[k] += n };
  const checkTheme = () => {
    while (owned < sinks.length && coins >= sinks[owned] + 40) { coins -= sinks[owned]; owned++; if (firstTheme === null) firstTheme = level; if (owned === themes.length) allThemes = level; if (owned === sinks.length) everything = level }
  };
  while (level < maxLevels && day < 3000) {
    day++;
    const l = ECON.login[loginDay % 7]; loginDay++; add(l.c || 0, 'login'); hints += l.h || 0; skips += l.s || 0;
    for (let k = 0; k < P.spins; k++) { add(spinEV.c, 'spin'); hints += spinEV.h; skips += spinEV.s }
    let levelsToday = 0;
    if (P.daily) { const st = R() < P.p3 ? 3 : 2; dstreak++; add(E.dailyReward(st, dstreak), 'daily'); totalStars += 0 }
    for (let i = 0; i < P.levelsPerDay && level < maxLevels; i++) {
      level++; levelsToday++;
      const r = R(), stars = r < P.p3 ? 3 : r < P.p3 + P.p2 ? 2 : 1, bonus = level % 10 === 0;
      streak = stars === 3 ? streak + 1 : 0;
      const rw = E.levelReward(0, stars, bonus, streak); add(rw.coins - rw.streakBonus, 'levels'); add(rw.streakBonus, 'streak');
      totalStars += stars;
      while (totalStars >= E.msThreshold(milestone)) { add(E.chestReward(milestone), 'chests'); milestone++ }
      xp += E.xpForWin(stars, false, bonus);
      while (xp >= E.xpNeed(plv)) { xp -= E.xpNeed(plv); plv++; add(E.levelUpReward(plv), 'levelups'); if (plv % ECON.lvlup.skipEvery === 0) skips++ }
      if (level % P.hintEvery === 0) { if (hints >= 1) hints--; else if (coins >= ECON.hint.cost) { coins -= ECON.hint.cost; hintCoins += ECON.hint.cost } hintsUsed++ }
      checkTheme();
      if (level === 250) coinsAt250 = coins;
    }
    // replays that improve a 2-star clear to 3
    for (let k = 0; k < P.replays; k++) { const rw = E.levelReward(2, 3, false, 0); add(rw.coins, 'replays') }
    // daily quests
    if (levelsToday >= P.questMin) { add(ECON.quest.rewards.reduce((a, b) => a + b, 0) + ECON.quest.bonus, 'quests'); hints += ECON.quest.bonusHints }
    checkTheme();
    coinsPerLevel.push(earned / Math.max(1, level));
  }
  const upTo = n => { // average earnings per level over the first n levels (re-run to n)
    return null;
  };
  return { name, level, days: day, earned, earnedBy, perLevel: earned / level, firstTheme, allThemes, everything, coinsAt250, hintsUsed, hintCoins, plv };
}

/* average per-level income over the first 300 levels, measured on its own run */
function avg300(name) { const r = simulate(name, PROFILES[name], 300); return r.perLevel }

const res = {}; for (const n of Object.keys(PROFILES)) res[n] = simulate(n, PROFILES[n]);
const a300 = {}; for (const n of Object.keys(PROFILES)) a300[n] = avg300(n);

console.log(`Wheel EV per spin: ${spinEV.c.toFixed(1)} coins, ${spinEV.h.toFixed(2)} hints, ${spinEV.s.toFixed(2)} skips`);
console.log('profile        coins/level(1-300)  1st theme @level  all themes @level  everything @level  coins@250  levels/day');
for (const n of Object.keys(PROFILES)) { const r = res[n]; console.log(n.padEnd(14), a300[n].toFixed(1).padStart(10), String(r.firstTheme).padStart(14), String(r.allThemes).padStart(17), String(r.everything).padStart(18), String(Math.round(r.coinsAt250)).padStart(10), String(PROFILES[n].levelsPerDay).padStart(9)) }
if (verbose) for (const n of Object.keys(PROFILES)) { console.log('\n' + n + ' income by source (% of total):'); const t = res[n].earned; for (const [k, v] of Object.entries(res[n].earnedBy)) console.log('  ' + k.padEnd(9), (100 * v / t).toFixed(0).padStart(3) + '%') }

let bad = 0;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + detail); if (!ok) bad++ };
const av = a300.average;
console.log('');
check('average player earns 20-32 coins per level', av >= 20 && av <= 32, `(${av.toFixed(1)})`);
for (const n of Object.keys(PROFILES)) { const hi = n === 'casual' ? 60 : 48; check(`${n}: income sane (14-${hi} per level; casual players log in daily but play few levels, so daily sources weigh more)`, a300[n] >= 14 && a300[n] <= hi, `(${a300[n].toFixed(1)})`) }
check('a hint costs about 1.2-2.2 levels of average income', ECON.hint.cost / av >= 1.2 && ECON.hint.cost / av <= 2.2, `(${(ECON.hint.cost / av).toFixed(2)} levels)`);
check('a skip costs about 3-7 levels of average income', ECON.skip.cost / av >= 3 && ECON.skip.cost / av <= 7, `(${(ECON.skip.cost / av).toFixed(2)} levels)`);
check('average player buys a first theme around level 12-35', res.average.firstTheme >= 12 && res.average.firstTheme <= 35, `(level ${res.average.firstTheme})`);
check('average player needs 250-700 levels for every theme (decorations take longer still)', res.average.allThemes >= 250 && res.average.allThemes <= 700, `(level ${res.average.allThemes})`);
check('nobody sits on a runaway pile of coins at level 250 (< 1500 unspent)', Object.values(res).every(r => r.coinsAt250 < 1500), `(${Object.entries(res).map(([k, r]) => k + ' ' + Math.round(r.coinsAt250)).join(', ')})`);
check('level reward for a first 3-star clear is 18-30 coins', E.levelReward(0, 3, false, 0).coins >= 18 && E.levelReward(0, 3, false, 0).coins <= 30, `(${E.levelReward(0, 3, false, 0).coins})`);
console.log(bad ? `\n${bad} check(s) failed` : '\nAll economy checks passed');
process.exit(bad ? 1 : 0);
