# Touchline — handoff for continued development

Touchline is a single-file HTML high-school soccer manager (multi-season careers, seeded match engine, animated broadcast
matches, 36 original mascots). This document is for the next developer or coding agent picking the project up.
Read it first, then `DEVELOPER_NOTES.md` (per-version engineering notes, architecture, design decisions).

## 1. Build, run, test

```
python3 build.py                 # src/ -> dist/touchline.html (artifact build) and dist/touchline-standalone.html
open dist/touchline-standalone.html   # or any browser; no server needed
npm i playwright                 # once; tests drive headless Chromium (see test/_pw.js)
sh test/run_all.sh               # all 36 regression suites, one at a time -> "name exit-code", logs in test/logs/
node test/<name>.js              # one suite
```

- Python 3 (stdlib only) builds; Node 18+ with Playwright runs tests. No bundler, no npm dependencies in the game itself.
- The build is a plain concatenation: `<style>` = `src/style.css` + `src/style_v14.css` + `src/style_v15.css`, then one
  `"use strict"` `<script>` of the JS files in the order listed in `build.py`. Later files can override anything earlier.
- Fonts are embedded as base64 WOFF from `fonts/` (OFL licences alongside). There is no network request at runtime.
- `test/_pw.js` is a shim: it finds Playwright, ignores a Chromium path that doesn't exist on this machine (or honours
  `PW_CHROME=/path/to/chrome`), and exports `DIST`, the file URL of the standalone build. All test scripts use it.
- Tests run from the project root (`cd touchline`). Five suites are timing-sensitive (anim, announcer, kickoff, shootout,
  spectate, occasionally v8ui); they pass alone but can fail when run in parallel or on a slow machine. `run_all.sh` runs
  serially for that reason.
- `test/browser.js` is a stale end-to-end walkthrough that stops at the award ceremony overlay; it is not part of
  `run_all.sh`. Everything else is expected to pass.

## 2. Source map (build order)

| File | What it is |
|---|---|
| `src/data.js` | Name/town/mascot vocabularies, colour pairs, stadium tiers and names. |
| `src/names2.js` | v16: ~190 more towns, bigger name parts, honorees, saints, suffix pools, `genIdentity(r,used)` → `{town,name}`, 12 extra colour pairs. |
| `src/mascots.js` | The original 20 mascots: `MASCOT_LIST/KEYS/BY`, `mascotPalette`, `MASCOT_ART`, `MASCOT_DETAIL`, the outline/gloss filter, `mascotInner`, `mascotSVG`. |
| `src/mascots2.js` | v16: 16 more mascots, registered into the same tables. |
| `src/looks.js` | Player appearance and portrait SVG. |
| `src/engine.js` | Pure domain logic, no DOM: world generation, development, lineups, seeded match engine, odds, competitions, awards, records, rollover, migrations. |
| `src/ui_core.js` | App state, IndexedDB persistence, theme engine, procedural sound, crest and stadium SVG, icons. |
| `src/ui_views.js` | Shell `render()`, start screen, new-career form, most views (`VIEWS.*`), modal shell. |
| `src/ui_match.js` | Match preview, player profile modal, match report. |
| `src/ui_stage.js` | Broadcast/tactical canvas renderer (`Stage`), figures, officials, restarts, clips. |
| `src/ui_live.js`, `ui_fx.js`, `ui_features.js`, `ui_main.js` | Live match flow, trophies/effects, scouting camp & hall of fame, the action controller `A.*`. |
| `src/ui_v8.js` … `ui_sandbox.js` | Feature modules added per version (celebrations, Courier/TV, kits, wrapped, announcer, mixer, schedule builder, time capsule, animation lab). |
| `src/ui_polish.js` | v13: nav regrouping, phone tab bar, scroll-to-top. |
| `src/ui_v14.js` + `style_v14.css` | v14 design system: team-colour tokens, varsity patch, cuff stripes. |
| `src/ui_v15.js` + `style_v15.css` | v15: top navigation bar, dashboard Overview, idle-time odds, async sim-ahead. |
| `test/*.js` | Regression suites, screenshot sheets (`mascot_sheet*.js`, `portrait_sheet.js`), concept-art renderers (`concepts*.js`), audits (`v13_audit.js`, `calib.js`). |
| `concepts/` | Concept-art boards 01–41 rendered from the game's own assets. 35–41 are unbuilt ideas (see §6). |

## 3. How the code is wired (the things that bite)

- **One global scope.** Every function and `const` is global. Modules extend the game by *wrapping* globals rather than
  editing them: `const _prev=render; render=function(){ … _prev.apply(this,arguments) … }`. Commonly wrapped: `render`,
  `renderModal`, `applyTheme`, `VIEWS.office`, `MODALS.player`, `finishMatch`, `rollover`, `seasonStart`, `migrate`,
  `navBadges`, `A.go`. Keep doing this in new files appended to the build order; avoid editing old modules unless needed.
- **Controller.** Buttons carry `data-a="actionName"` (+ `data-*` args) and dispatch to `A.actionName(el, ev)`; inputs use
  `data-c`. Routing is `App.route` + `App.params`, then `render()`. Modals are `App.modal={type,…}` + `renderModal()`.
- **CSS cascade.** Three stylesheets, later wins; class names are global, so prefix new feature classes (past collisions:
  `.scrim`, `.tc-shelf` → renamed `tcx-`). Theme colours are CSS variables set by `applyTheme`; team colours are
  `--team`, `--team2`, `--team-hi`, `--team2-hi`, `--team-ink` set by `teamTokens()` (v14). Rule of thumb from the v14/v15
  redesign: team colour = identity and selection states; amber `--accent` = actions and live play only.
- **Much of the code is one statement per line, sometimes very long.** Never put a `//` comment mid-line inside such a
  line; use `/* */` or a new line.
- **Determinism.** Match results come from one seeded RNG stream (`rngFrom(hashStr(...))`); cosmetic streams are separate.
  Any change that touches `engine.js` match logic must keep `test/sync.js`, `goalcap.js`, `postcap.js` and the results
  hash in `test/v13_audit.js` passing. The broadcast (`ui_stage.js`) is presentation only and never affects results.
- **Persistence.** IndexedDB (`careers`, `logs`, `meta`), 3 save slots, lazy per-season logs; `localStorage` only for
  `PREFS`. Backup is JSON copy/paste. `migrate(C)` must stay idempotent; add migrations there when save shape changes.
- **Rendering.** `render()` rebuilds the whole shell + view as an HTML string each time (`innerHTML`). It is fast because
  odds are computed in idle time (`oddsFor(fid,lazy)` → `oddsSchedule`) and nothing heavy runs synchronously; keep it that
  way (measure with the pattern in §5).
- **Stage performance (v15).** Crowd rows are cached as image strips (`drawCrowdFast`), drawing is capped near 60 fps, DPR
  is capped at 1.5, and `this.rs` lowers render scale to 0.7 when frames stay slow. Flag-wavers and goal celebrations
  still draw live. If you add things to `drawBroadcast`, check they don't run per-fan per-frame.
- **Mascots.** Art is an SVG string in a `-2 -2 104 104` box with palette slots `C.P/S/Pd/Pl/Sd/Sl/W/O/skin`. Full-size
  marks get a per-instance filter (outline ring + gloss); `size<34` and crests under 60 px use the lite path. To add
  one: write `ART` + `DETAIL` entries and a `MASCOT_LIST` row (key, display name, alternate team names), then run
  `node test/mascot_sheet2.js all out.png` and look at it at all three sizes.
- **School names.** `genSchool` calls `genIdentity` when no town is passed; `s.town` is the short name used everywhere
  (scoreboards, tables), `s.name` the long one. Changing the generator changes which world a seed produces.

## 4. Conventions for every change (what the owner expects)

1. Rebuild (`python3 build.py`) and run the affected suites; before a release run `sh test/run_all.sh`.
2. Take screenshots and *look at them* — desktop 1440×900 and phone 390×844, and the Overview across the theme presets
   (night, gold, crimson, emerald, stealth, titanium, slate, flood, plus a light custom theme). The pattern used so far is a
   small Playwright script that creates a career with a fixed seed, sims a few rounds, then screenshots each `NAV` route.
3. Add a What's New entry: `MODALS.whatsNew` in `src/ui_v8.js` (newest first; `[emoji, title, text]`).
4. Add a version section at the top of `DEVELOPER_NOTES.md`: what changed, where, what was measured, what wasn't verified.
5. Be explicit in the summary about anything not visually verified or not tested on real devices.
6. Deliverables are `dist/touchline.html` (published as the owner's Claude artifact) and `dist/touchline-standalone.html`
   (opens locally). Publishing the artifact is done by the owner / the Claude.ai session, not from this repo.
7. Don't show long code dumps in chat progress updates; short one-line status updates are preferred.

## 5. Measuring performance (reuse these)

- Live match: wrap `Stage.prototype.drawLerp/update` to time them, start a match with walkout off, skip the intros
  (click the canvas a few times), then count frames and `PerformanceObserver('longtask')` for 8 s. v15 baseline in headless
  Chromium: ~41 fps at DPR 1, ~27 fps at DPR 2, ~0.36 s of long tasks per 8 s.
- Menus: time `render()` per route (`App.route=r; render()`), cold and warm. v15 baseline: Overview ~13 ms cold, every
  route under ~65 ms (squads and kits are the heaviest).
- Sim-ahead: `A.simAhead({dataset:{k:'season'}})` is async and yields every ~12 ms; worst main-thread stall ≈ 250 ms.

## 6. State of play and open threads

Done through v16: menu overhaul (v14), top-nav dashboard + performance (v15), 16 new mascots and a much wider school-name
generator (v16). All suites pass as of the v16 build.

Unbuilt ideas with finished concept boards (`concepts/35–41`, rendered by `test/concepts7.js`):
Report Card Day (grades/eligibility/study hall), The Booster Club (fundraising → stadium upgrades), The Stare-Down
(interactive penalties), Scouts in the Stands (college recruiting, highlight tapes, Signing Day), Winter Futsal League
(offseason 5v5), Challenge Codes (share a team as a code, play friends' programs offline), The Postgame Presser
(press-conference choices → morale, rivalry heat, Courier headlines). Earlier boards 01–34 are all implemented.

Known gaps / follow-ups:
- Substitutions, injuries and fatigue are intentionally absent (engine design).
- No server, accounts or cross-device sync.
- `test/browser.js` needs updating past the award-ceremony overlay (low value; `browser2.js` covers most of it).
- The adaptive render scale has only been exercised in headless Chromium; verify on a real low-end laptop / Chromebook and
  a high-refresh monitor.
- Mascot picker and start-screen parade now show 36 filtered SVGs; fine in headless (start screen ~15 fps vs ~9 before
  the filters were added), untested on weak hardware.
- Concept boards and `test/shots` are large (50 MB / 100 MB+); regenerate rather than commit if you add version control.

## 7. Quick orientation commands

```
grep -n "^VIEWS\.\|^MODALS\.\|^A\.[a-zA-Z]* *=" src/*.js | cut -c1-80     # every view, modal and action
grep -n "^function " src/engine.js | cut -c1-80                          # engine entry points
node test/mascot_sheet2.js all /tmp/mascots.png                          # all 36 mascots at three sizes
node test/concepts7.js 37                                                 # re-render one concept board
```
