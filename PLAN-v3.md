# Endless Puzzle Pop: v3 "Big Update" plan

**Status:** implemented (phases 0-7). See "Results" at the end.
**Builder:** a follow-up session runs it phase by phase, committing at the end of every phase.
**Target device:** phones first (iPhone SE 320×568 up to large Android/iPhone), so every decision below favours smooth touch play on mid- and low-end phones.

---

## 0. Decisions this plan assumes (confirm or change before building)

| # | Assumption | Why it matters |
|---|---|---|
| A1 | "Compass mode" = **Spin Lock**, "color connect mode" = **Colour Flood**, "sliding squares" = **Slide Tiles**. All three are removed. | Removal list |
| A2 | "Only keep sand tubes + lights", so **Echo Pads (memory) is removed too**. Final lineup: 2 kept + 3 new = **5 modes**. | If Echo Pads stays, the lineup is 6 and Phase 1 skips its removal |
| A3 | Sort Tubes gets a **sand restyle** to match how it's described: grainy coloured sand that pours as falling grains. The rules stay the same. | Visual work in Phase 4 |
| A4 | Old saves keep **coins, XP/level, themes, trophies, stats, hints, skips and login/daily streaks**. **Per-level stars and `unlocked` reset** because level N becomes a different puzzle. Returning players get a one-time "Welcome to v3" gift (200 coins + 3 hints) to soften the reset. | Save migration in Phase 1 |
| A5 | The three new modes are **Block Garden**, **Merge Bloom** and **Star Threads** (section 2). | Main build work |

---

## 1. Final mode lineup

| Mode | Status | One-line pitch | Main gesture |
|---|---|---|---|
| 💡 **Lights Out** | kept, polished | Turn every bulb off; each tap flips a pattern | tap |
| ⏳ **Sand Tubes** (was Sort Tubes) | kept, restyled | Pour coloured sand until every tube holds one colour | tap → tap |
| 🌱 **Block Garden** | NEW | Drag garden blocks onto the bed and fill rows/columns to clear them | drag |
| 🌸 **Merge Bloom** | NEW | Drag matching blooms together to grow the target flower | drag |
| ✨ **Star Threads** | NEW | Drag the stars until no threads cross and the constellation appears | drag |

The mix is deliberate: 2 tap modes and 3 drag modes, and every mode is readable in one second.
- Nothing needs timing or reflexes, so everything stays relaxing.
- There is no fail-by-timer anywhere.
- The only "stuck" states (Block Garden, Merge Bloom) always offer Undo / Shuffle instead of a game over.

---

## 2. The three new modes (full specs)

All three follow the existing maker contract in `js/ui.js` (`MAKERS[type]({R,tier,level,board,api})`). Each maker returns `snap / restore / hint` (plus optional `begin / destroy / noUndo`). Each one:
- generates deterministically from `R` so a level always plays the same;
- reports through `api.moves(m,s3,s2,limit)`, `api.good(el)` / `api.meh()`, `api.win(stars)` and `api.commit()`;
- has a how-to card in `js/howto.js` with a looping before/after demo;
- has a **built-in solver or greedy bot**, used to set par and power `hint()`, so the auto-test tool can solve it;
- gets one JS file and one CSS file (`js/modes/<mode>.js`, `css/modes/<mode>.css`, see Phase 1).

### 2.1 🌱 Block Garden (block-placement puzzle)

**Rules (shown in the how-to card)**
- Drag a block from the tray onto the garden bed.
- Fill a whole row or column to make it bloom and clear.
- Clear the goal number of lines.

**Board and pieces**
- Bed size by tier: 6×6 at tiers 0–1, 7×7 at tiers 2–4, 8×8 at tier 5+.
- Tray: 3 pieces at a time. When all 3 are placed, 3 more arrive.
- The piece sequence is fully seeded from `R`, so a level is reproducible.
- Shape pool unlocks by tier:
  - from the start: 1, 2 and 3 straight cells;
  - then L and corner shapes;
  - then T, S and 2×2;
  - then 4-long, 5-long and 3×3, from tier 6 onward.

**Goals**
- Early levels: clear N lines, with N rising from 3 to 12 by tier.
- From tier 3: some levels instead say "Clear all the 🌼 weeds". Pre-placed weed cells disappear only when their row or column clears. This adds variety.

**Moves, stars and solvability**
- Moves = pieces placed.
- At generation time a **greedy bot** plays the level: it tries every placement of every tray piece and scores lines cleared, then holes, then edge contact.
- Par = the bot's piece count. ★★★ = par + 2 + 20%, ★★ = par × 1.7 + 4.
- If the bot can't finish within 60 pieces, regenerate with the next seed offset. This is deterministic and capped at 20 tries.

**Stuck state**
- If no tray piece fits: "No room! ↩️ Undo or 🔀 Shuffle tray". Shuffle costs one hint or the hint price in coins.
- It's never a forced fail.

**Hint**
- The bot's best move shows as a pulsing ghost of that piece at its target cells, with the tray piece flashing (`hint` class).

**Touch feel (most important)**
- The dragged piece floats **~70px above the finger** so the finger never hides it, and scales up from tray size to cell size.
- A **snap ghost** shows where it will land: green if it fits, red outline if not.
- Rows or columns that *would* clear glow before you release.
- Release on an invalid spot springs the piece back to the tray with a soft "bonk".
- Haptic tick on a valid snap change, thump on place, double buzz on a clear.

**Visuals**
- Dark soil bed with a subtle grid.
- Pieces are glossy jelly blocks in the theme palette.
- Clearing a line makes the cells pop into a small burst of petals: CSS transform + opacity only, at most 12 particles per line.
- A combo (2+ lines at once) shows a "Double bloom!" float text.

**Audio:** soft wooden "tok" when placing; marimba chord on a clear that steps up the scale with combo; gentle chime when the goal is reached.

**Test hooks:** `hint()` marks the target piece with `.hint` and the target cell with `[data-h="1"]`. The shot tool taps the piece, then the cell (add a tap-to-select, tap-to-place fallback that is also an accessibility win). Expose `_bot()` for the auto-solver.

### 2.2 🌸 Merge Bloom (merge puzzle)

**Rules**
- Drag a bloom onto a matching one to merge them into the next stage.
- Grow the goal flower.

**Board**
- 4×4 at tiers 0–2, 5×5 after.
- Items climb an 8-stage chain: seed → sprout → leaf → bud → flower → blossom → bouquet → golden tree.
- Each stage is drawn as its own **SVG icon** in one consistent style. Don't use emoji; they look different on every phone.

**Spawning**
- After each merge, one new seed (sometimes a sprout at higher tiers) appears in the first empty cell of a **seeded cell order**, so the level is deterministic.

**Goal:** make 1 (later 2) items of stage G. G = 4 at tier 0, rising to 7 by tier 8 or so.

**Stars**
- Moves = merges.
- Par comes from a greedy bot that always merges the lowest pair, preferring pairs near the goal item.
- ★★★ = par + 2 + 20%, ★★ = par × 1.7 + 4.

**Stuck state:** the board is full with no pairs → "Board full! ↩️ Undo or ✂️ Prune". Prune removes the lowest item and costs one hint.

**Hint:** highlight the bot's next pair with `[data-h="1"]` and `[data-h="2"]`.

**Touch feel**
- The dragged item lifts and follows the finger with slight lag (lerp), and matching items wobble.
- Dropping on a match pulls the two together and plays a **bloom pop** (scale 0 → 1.15 → 1 with a ring) into the next stage.
- Tap-a-then-tap-b also works.

**Visuals:** a soft garden-tile board and gentle idle sway on plants (one shared CSS animation on the board, not one per item). Making the goal item triggers a sun-ray burst.

**Audio:** each stage has a pitch on the pentatonic scale, so merging up the chain plays a rising melody.

### 2.3 ✨ Star Threads (untangle puzzle)

**Rules**
- Drag the stars so no glowing threads cross.
- When every thread is clear, the constellation lights up.

**Generation (guaranteed solvable, classic "Planarity" method)**
1. Pick L random lines in general position.
2. Every intersection becomes a star, and consecutive intersections along a line become a thread. This graph is always planar, and the intersection positions *are* a solution.
3. Scramble by placing stars evenly on a circle in a shuffled order.

Size by tier: L = 4 (6 stars) at tiers 0–1, L = 5 (10 stars) at tiers 2–4, L = 6 (15 stars) at tiers 5–8, L = 7 (21 stars) after that.

**Win and stars**
- Win when the crossing count is 0, checked with an O(E²) segment test (21 stars ≈ 40 threads ≈ 1,600 checks, which is trivial).
- Moves = drags that moved a star more than 8px.
- ★★★ = stars + 2, ★★ = stars × 2 + 4.

**Hint:** pick a star that has a crossing thread and show a ghost dot at its position in the stored solution. To keep the ghost in view, scale the solution layout to fit the board.

**Feel**
- Threads that cross glow soft red; free threads glow gold.
- The crossing counter in the coach pill ticks down ("3 crossings left").
- Dragged stars get a soft trail.
- On win, the threads draw in with a stroke-dashoffset animation, the board fades to a night sky, and the constellation gets a name (seeded pick from a list such as "The Little Teapot" or "The Sleepy Fox").

**Rendering:** a single `<svg>` with `<line>` and `<circle>` elements. During a drag, update attributes in a rAF-throttled handler and re-test only the threads touching the dragged star.

**Audio:** a soft harp pluck when a thread becomes free; a shimmering pad when the whole constellation is solved.

---

## 3. Removal and restructure (Phase 1)

**1. Delete the four modes completely.**
- Delete `MAKERS.rotate`, `MAKERS.slide`, `MAKERS.flood` and `MAKERS.memory`.
- Delete their `INFO` entries (`js/core.js`), `HOWTO` entries (`js/howto.js`) and every CSS rule for them in `css/style.css`, `css/games-grid.css` and `css/games-fluid.css` (`.cell.rot`, `.dial`, `.slidebox`, `.tile`, `.floodgrid`, `.cbtn`, `.pads`, `.pad`, `.rdots`, …). Grep afterwards to confirm nothing references them.

**2. New file layout.** Plain `<script>` tags still, so there is still no build step.
```
js/modes/lights.js   css/modes/lights.css
js/modes/tubes.js    css/modes/tubes.css
js/modes/blocks.js   css/modes/blocks.css
js/modes/merge.js    css/modes/merge.css
js/modes/threads.js  css/modes/threads.css
js/modes/common.js   (shared helpers: drag controller, gfx.pulse/live, bots' utils)
```
Then remove `js/puzzles-grid.js`, `js/puzzles-fluid.js`, `css/games-grid.css` and `css/games-fluid.css`.

**3. Generalise the level rotation.**
- `TYPES = ['lights','tubes','blocks','merge','threads']`.
- **These hard-code 6 and must use `TYPES.length`:**
  - `bagOrder()`: `TYPES[5]` and the bag size;
  - `typeFor()`: `(n-1)%6` and `/6`;
  - `tierFor()`;
  - `dailyCfg()`: `% 6`;
  - the quest "type" param;
  - the shot-tool level map ("levels 1–6 = …").
- Levels 1–5 introduce each mode once, in order: lights, tubes, threads, merge, blocks (easiest first).

**4. Save migration.** Add `S.ver = 3` and run `migrateV3()` once:
- reset `stars`, `unlocked`, `milestone`, `streak` and `seen`;
- keep everything else;
- grant the welcome gift and show a one-time "Welcome to v3" card listing the new modes;
- remove deleted types from `stats.types`.
Achievement `all` ("every puzzle type") uses the new `TYPES`.

**5. Tooling.**
- Update `tools/shot.cjs` scenarios for the new modes (`howto:<type>`, `level:<n>`, `win:<n>` using each mode's hint/bot).
- Keep `tools/mobile.cjs`: device emulation over `python3 -m http.server`, touch taps, SW check.

---

## 4. Performance and smoothness (Phase 2, before building new modes)

### 4.1 Measure first

Add `tools/perf.cjs`, run it before and after this phase, and paste both tables into the phase commit.
- Playwright Chromium with **CDP CPU throttling at 4× and 6×** and a mobile viewport (Pixel 5 / iPhone SE).
- Records a rAF FPS counter plus `PerformanceObserver('longtask')` for these scenarios:
  - home idle 5s;
  - map scroll;
  - Lights tap ×10;
  - Tubes pour ×5;
  - win screen;
  - each new mode's drag.

**Targets at 4× throttle:**
- ≥ 55 fps average and ≥ 45 fps p5 in gameplay;
- no long task > 50 ms during an interaction;
- home idle at most 25% of a core.

### 4.2 Fixes, in order of expected payoff

1. **Graphics quality tiers.**
   - `html.q-high / q-med / q-low`, chosen automatically from the first 90 frames of average frame time, plus `navigator.hardwareConcurrency` and `deviceMemory`.
   - Settings option "Graphics: Auto / High / Battery saver".
   - Low tier: no canvas background animation (one static frame), DPR 1 canvases, no `backdrop-filter`, particles ÷3, fewer idle loops.
2. **Background canvas** (`js/fx.js` `BG`):
   - cap at 30 fps;
   - pre-render orbs and bokeh once into offscreen sprite canvases and `drawImage` them, instead of calling `createRadialGradient` every frame;
   - stop it completely while a level is being played on med/low (use a static snapshot);
   - stop it when the tab is hidden (already done) and while a modal covers it.
3. **Particles** (`burst` / `confetti` / `fountain`):
   - pool and reuse objects;
   - hard cap on live particles (high 220, med 140, low 60);
   - replace 'glow' shapes and `shadowBlur` with one pre-rendered glow sprite;
   - no `globalCompositeOperation='lighter'` on low.
4. **CSS cost.** There are 86 `infinite` animations, 26 `drop-shadow` filters, 6 `backdrop-filter`s and 6 `blur()`s.
   - Only the active screen and board may run infinite animations; the rest are `animation-play-state:paused` or removed.
   - Animate only `transform` and `opacity`. Move animated glows and shadows onto a pseudo-element and animate its opacity.
   - Swap `drop-shadow` filters on repeated elements for baked `box-shadow` or SVG shadows.
   - Add `contain: layout paint` on `#board`, `.card` and map chapters, plus `content-visibility:auto` on off-screen map chapters.
   - Use `will-change` only while dragging.
5. **JS hot paths.**
   - Tubes: patch the existing DOM instead of rebuilding `innerHTML` on every render.
   - Never call `getBoundingClientRect` inside per-frame or per-cell loops; cache rects on resize and on level start.
   - Home's 1-second `setInterval(renderHome)` updates only the two countdown text nodes.
   - Pointer drags use a shared `common.js` drag controller (pointer capture, rAF-coalesced moves, passive listeners).
6. **Fonts and offline.** Self-host Fredoka (woff2, latin subset) with `font-display:swap` and `<link rel=preload>`, so the first paint has no layout shift and it works offline. Precache the new files in `sw.js` and bump `VERSION`.
7. **Audio.**
   - On low tier, skip the reverb send for SFX.
   - Disconnect finished nodes (`onended`).
   - Keep the music scheduler at 30 ms and make sure it pauses with the tab.

---

## 5. Mobile UI and visual direction (Phase 6, applied throughout)

**Art direction: "cozy night garden"**
- Deep blue-violet night sky, soft bioluminescent accents and warm lantern golds.
- It ties the modes together: lights are lanterns, tubes hold sand, blocks and merge are a garden, threads are the sky.
- Same glossy-but-soft material language on every screen.
- One accent plus one secondary colour per theme, and no more than 2 glows visible on any element.

**Mobile rules (check every screen)**
- Safe areas on all edges (`env(safe-area-inset-*)`), including the Dynamic Island and the home indicator.
- Thumb zone: primary actions (PLAY, Next, toolbar) in the bottom 40%. Touch targets ≥ 44×44 px with ≥ 8 px gaps.
- No hover-only affordances.
- `overscroll-behavior:none` (no pull-to-refresh mid-drag), `-webkit-touch-callout:none`, `touch-action:none` on drag boards.
- Text ≥ 13px, with contrast checked against every theme.
- Popups always show their main button (sticky footer, already in place); add a swipe-down to close where it's safe.

**Device matrix** (screenshot every screen and mode with `tools/mobile.cjs`):

| Device | Viewport |
|---|---|
| iPhone SE | 320×568 |
| iPhone 8 | 375×667 |
| iPhone 13/14 | 390×844 |
| iPhone Pro Max | 430×932 |
| Galaxy | 360×800 |
| Pixel 5 | 393×851 |

Done means no horizontal scroll, no clipped buttons, and the board fully visible with the toolbar.

**Relaxing feel**
- Calmer default music in play.
- No red failure screens; "stuck" states are soft amber with a suggested fix.
- A gentle "breathe" idle animation on the board after 20s of inactivity, in place of a nagging toast. The free-hint nudge stays but is quieter.

---

## 6. Economy rebalance (Phase 5)

### 6.1 Where the economy stands now

| Source / sink | Current | Problem |
|---|---|---|
| Level clear | 10 + 10 per new star (≈40 for a first ★★★) + streak up to 20 | ≈ 50–60 a level, which is inflationary |
| Replay | 3 coins | fine |
| Star chests | 30 + 15·m | ok |
| Daily login | 25 → 150 (7-day) | ok |
| Quests | 35/50/65 + 100 bonus ≈ 250/day | high |
| Spin | free every 4h, EV ≈ 29 coins + items; extra spin costs 40 | ok |
| Trophies | 20–500 each, ≈ 3,400 total | fine as a one-off |
| Level-up | 20 + 5·L | grows without limit |
| **Hint** | 15 coins (≈ 1/3 of a level) | far too cheap, makes puzzles trivial |
| **Skip** | 60 | cheap |
| **Themes** | 150–600 | the whole shop is bought in ~40 levels, so there's nothing to save for |

### 6.2 Targets

- A normal player earns **≈ 20–30 coins per level** on average (all sources included).
- A hint costs about **1.5 levels** of earnings. Skips cost about 4 levels.
- **First theme around level 15–20. All themes around level 250+.**
- Free hints from login, spin and quests average **≈ 1 per 5 levels**.

### 6.3 Proposed values

| Item | New value | Notes |
|---|---|---|
| Clear | 8 + 6 per new star | first ★★★ = 26 |
| Replay | 2, only when stars improve | |
| Bonus level | ×2 (kept) | |
| 3★ streak bonus | +2 per step, cap 10 | |
| Quests | 25 / 35 / 45, bonus chest 60 + 1 hint | |
| Level-up | 15 + 3·L, capped at 120 | |
| Star chest | 25 + 10·m | |
| Hint | 40 (3 for 100, 10 for 300) | |
| Skip | 150 (token 120) | |
| Extra spin | 60 | |
| Spin wheel | 10/20/40/80/200 coins, 1–2 hints, skip | EV ≈ 30 |
| Themes | Ocean/Forest 400, Sunset/Aurora 700, Candy/Sakura 1,000, Lava/Noir 1,400, Galaxy 2,000 | |

**New coin sinks** that fit the relaxing tone and give long-term goals:
- **Sand palettes** for Sand Tubes and **bulb styles** for Lights Out: 300–900 each, 3 per mode.
- A **garden decoration** row on the home screen, bought piece by piece (800–2,500), which slowly fills the home background.

### 6.4 Verification

Add `tools/economy-sim.cjs`. It simulates three player profiles (casual: 60% ★★★, 1 hint per 6 levels; average; completionist) over 300 levels and 30 days of logins, spins and quests. It prints coins over time, levels-to-first-theme and levels-to-all-themes, and **asserts the targets in 6.2**. Tune the constants until it passes.

---

## 7. Lights Out and Sand Tubes polish (Phase 4)

**Lights Out**
- Lantern art pass (paper lanterns or glass bulbs that match the night-garden direction).
- Smoother flip: a single transform plus an opacity cross-fade; drop per-cell filter animation.
- Check the press-preview on touch, including what happens when a finger slides off.

**Sand Tubes**
- Grainy sand fill: an SVG noise pattern set once as a CSS mask; sand surfaces settle at a slight angle.
- The pour is a falling grain stream, using ≤ 40 pooled DOM grains or one small canvas over the two tubes.
- A soft "shhh" sand sound replaces the water glug.
- Patch tubes in place instead of re-rendering (perf).
- Difficulty stays as it is.

---

## 8. Addiction and retention touches (small, inside the phases above)

- Each new mode adds a quest type ("Clear 6 lines in Block Garden", "Grow a 🌻", "Solve a constellation").
- 5 new trophies, one per mode (e.g. "Green Thumb": grow a golden tree).
- Every new constellation solved is saved to a **Star Atlas** gallery (a light collection meta), viewable from the profile.
- Daily Challenge rotates across the 5 modes.
- The "Next up" card on home shows the next mode's mini-animated icon.

---

## 9. Schedule (phases, order and checkpoints)

Each phase ends with these steps, and the next phase starts only when they pass:
- `node --check` on every JS file;
- `tools/shot.cjs` smoke test with every mode solved and no errors;
- `tools/mobile.cjs` on 2 devices;
- commit, then push to `claude/intelligent-dijkstra-ezmh7r` **and** `gh-pages`.

| Phase | Work | Est. effort |
|---|---|---|
| 0 | Baseline: perf numbers (`tools/perf.cjs`), screenshots of every screen | 20 min |
| 1 | Remove 4 modes, new file layout, generalise TYPES, save migration v3, update tools | 45 min |
| 2 | Performance foundation (section 4), with before/after perf table | 75 min |
| 3a | **Star Threads** (simplest, proves the drag controller) | 60 min |
| 3b | **Merge Bloom** | 75 min |
| 3c | **Block Garden** (biggest) | 90 min |
| 4 | Lights Out + Sand Tubes polish (section 7) | 45 min |
| 5 | Economy constants + `economy-sim.cjs` passing (section 6) | 40 min |
| 6 | Mobile UI pass on the device matrix, art-direction consistency (section 5) | 60 min |
| 7 | Final QA: full matrix, perf re-run vs baseline, README/PLAN update, `sw.js` VERSION bump, artifact republish, push both branches | 30 min |

**Total:** about 9 hours of agent work. That's realistic for 2–3 sessions. If time is tight, the cut order is:
1. Star Atlas
2. garden decorations
3. the weed goals in Block Garden
4. the 4th Star Threads size tier

Never cut perf, mobile QA or solvability checks.

---

## 10. Definition of done

- [ ] Exactly 5 modes in rotation. No code, CSS or how-to text for the removed modes remains (grep clean).
- [ ] Every mode generates deterministically, is always solvable, and is solved by `tools/shot.cjs` via its hint/bot for levels across tiers 0, 3 and 8.
- [ ] Old saves migrate without errors. The welcome card shows once.
- [ ] Perf targets in 4.1 are met at 4× CPU throttle on Pixel 5 and iPhone SE emulation. The before/after table is recorded in the commit.
- [ ] Device matrix: no clipping or horizontal scroll, touch targets ≥ 44px, and all drag modes playable by touch only.
- [ ] `tools/economy-sim.cjs` passes.
- [ ] No console errors. Offline works (SW). `VERSION` bumped. README updated.
- [ ] Pushed to `claude/intelligent-dijkstra-ezmh7r` and `gh-pages`. The claude.ai artifact is republished.

---

## Results (as built)

Assumptions A1-A5 were used as written (Echo Pads removed, 5 modes, saves keep everything except per-level progress, welcome gift 200 coins + 3 hints).

| Phase | Outcome |
|---|---|
| 0 | `tools/perf.cjs` baseline at 4x CPU throttle: home 20 fps, map 20, lights 12, tubes 19, win 14, popup 12 |
| 1 | Four modes removed; `registerMode()`; level rotation follows `TYPES.length`; save migration v3 + welcome card |
| 2 | Quality tiers, half-resolution background, particle caps/pooling, popup-aware animation pausing, no blur, self-hosted font. Final: every screen/mode 52-60 fps avg, near-zero long tasks |
| 3 | Star Threads, Merge Bloom, Block Garden built with a shared drag controller; generators/bots verified on 1,600+ seeds and across tiers 0-40 |
| 4 | Sand Tubes (grain texture, grain streams, in-place updates). Lights Out kept its look; its per-tap layout thrash was removed in phase 2 |
| 5 | `ECON` table + simulator. The plan's numbers paid ~55 coins/level from all sources; scaled down to ~32. Added garden decorations as a long-term sink |
| 6 | Six-device matrix clean; boards size from free space; compact play screen; 42-44px touch targets |
| 7 | Final QA below |

Deviations from the plan, and why:
- **Economy**: the plan's prices (section 6.3) were too generous once quests, daily challenge, chests, level-ups, login and spin were counted;
  the simulator drove the final values (first 3-star clear = 18 coins, hint 40, skip 150, themes 400-2000).
- **Star Threads**: sizes are 6 / 10 / 15 stars up to tier 11 and 21 stars from tier 12 (the plan had 21 from tier 9).
- **Block Garden**: no "Shuffle tray" button; when nothing fits the game glows Undo (which is unlimited), so there is never a game over.
- **Merge Bloom**: no "Prune"; a guaranteed-pair rule makes dead ends impossible.
- **Lights Out**: no new lantern art; the existing glass-bulb look was kept and its rendering cost was cut.
- **Fonts**: the one variable Fredoka file covers every weight, so it is a single 29 KB download.

Known limits: performance numbers come from a GPU-less headless browser with CPU throttling, so they are pessimistic for real phones with
GPUs but are a fair relative measure; sound could not be listened to in the test environment.
