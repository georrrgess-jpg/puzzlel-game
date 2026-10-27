# Endless Puzzle Pop: v4 "Polish" plan (UI, bugs, animation)

**Status:** planned. Section 1 was prebuilt in the planning session (see "Prebuilt"). Everything else is for the builder.
**Builder:** a follow-up session runs it phase by phase and commits at the end of every phase.
**Target:** phones first (iPhone SE 320×568 up to 430×932), mid and low-end hardware.
**Scope:** no new modes and no economy changes. This update is about making everything that exists work reliably, read clearly and feel smooth.

---

## 0. Ground rules for the builder (read first)

**Codebase**
- Vanilla JS with no build step. Classic scripts share globals, loaded in `index.html` order: core → perf → audio → fx → meta → howto → modes/common → modes/* → screens → ui. `window.__game` exposes `S, TYPES, typeFor, startLevel, cur, show, api, closeModal` for tests.
- Each mode is `MAKERS[id]({R,tier,level,board,api})` returning `{snap,restore,hint,_bot,destroy}`. The harness `api` lives in `js/ui.js`: moves, good, meh, commit, win, flash, coach, setTip, stagger, over.

**Tools** (run with `NODE_PATH=$(npm root -g) node tools/X.cjs`; screenshots go to the scratchpad, never the repo)

| Tool | What it checks |
|---|---|
| `tools/matrix.cjs <out> [device] [--quiet]` | 6 phone sizes, every screen and popup: horizontal scroll, off-screen controls, small touch targets, popup buttons below the fold. **Phase 2 extends it to catch overlapping elements.** |
| `tools/solve-all.cjs` | Every mode at many tiers is solvable by its own bot |
| `tools/drag.cjs [W H]` | Real CDP finger drags for threads, merge and blocks |
| `GFX=high\|med\|low tools/perf.cjs 4 <scenarios>` | Frame rate under 4× CPU throttle. Budget: avg ≥ 55 fps, p5 ≥ 50 fps on `high`, no long task > 100 ms. Run 2–3 times; the p5 figure is noisy. |
| `tools/regress.cjs [filter]` | **Pass/fail regression checks for every fixed bug (B1–B18).** Added in Phase 1; it replaces the old `tools/repro/` scripts. Each check runs in a fresh page. |
| `tools/economy-sim.cjs` | Economy balance (must stay green; this plan does not touch ECON) |
| `tools/migration.cjs` | Save migration |
| `tools/shot.cjs <out> <scenario>` | Ad-hoc screenshots (`W`/`H` env for the viewport) |

**Rules**
- **Motion:** every new animation uses only `transform` and `opacity` (no animated `filter`, `box-shadow`, `width`, `top` or `left`). Use the WAAPI wrapper `wa()` from `js/modes/common.js`, which already no-ops under reduced motion. On `html.q-low` use the cheap variant or skip.
- **Service worker:** bump `VERSION` in `sw.js` (currently `pop-v10`) in every phase that changes a file it caches.
- **Commits:** one per phase, ending with the attribution lines from the session reminder. Push to `claude/intelligent-dijkstra-ezmh7r`, and also to `gh-pages` (`git push origin claude/intelligent-dijkstra-ezmh7r:gh-pages`). That's the user's phone link, and they have approved it.
- **Artifact:** republish https://claude.ai/artifact/WzPysEUUQhXB36Dj5Pxqyx with `file_path` `/home/user/puzzlel-game/index.html` and the changed files in `files`. If the publish is refused because a published file wasn't read, read it with `action:"read"` and `path`, then publish again.
- **Verifying:** after any visual change, look at the screenshots. The tools catch layout errors, not ugliness.

---

## 1. Prebuilt in the planning session (verify, do not rebuild)

These were judged too intricate to hand off, so they already exist. Phase 0 only checks they still work.

### 1.1 Screen transitions (`js/fx.js` `Trans`, `css/style.css` "screen transitions")
- **`show(id,{from,back})`** in `js/ui.js` runs through `Trans.go`. The old screen animates out while the new one animates in.
  - Going deeper (home → map → shop) slides forward; going back slides backward.
- **Entering a level:** `startLevel` is called from the Play button, a map node or the win card's Next. It plays an **iris**: a circle in the mode's colour grows from the tapped element and covers the screen, then opens onto the board.
- **Leaving a level** (← or "Levels") closes the iris back onto the map node of that level.
- **Fallbacks:** reduced motion and `q-low` use a plain 150 ms cross-fade.
- **Safety:**
  - Input is blocked during a transition (`Trans.busy`).
  - A transition can be interrupted by another `show()`; the newest one wins.
  - A safety timer always clears the overlay.
- **How to use it (builder):**
  - UI that enters a level calls **`playLevel(n, opts, fromEl)`**.
  - UI that leaves one calls **`playExit('map'|'home', fromEl)`**.
  - **`startLevel` stays instant**: tests and tools call it directly through `__game.startLevel`, and Restart uses it. Don't add transitions to `startLevel` itself.
  - `show(id, {back:true})` forces the backward slide direction.
  - Never toggle `.screen.active` by hand. Always go through `show()`, so the transition state stays consistent.
- **Timing:**
  - Iris: cover 280 ms, then 2 frames, then reveal 420 ms.
  - Slide: outgoing 170 ms, incoming 340 ms.
  - The screen briefly sits fully covered while the board builds; that's where the 100–170 ms frame goes (see section 9).
- **Repro timing:** `tools/repro/*` scripts that tap Daily wait 900 ms for this reason.

### 1.2 Popup close animation (`closeModal`)
- The card scales down and fades (180 ms) before the modal hides.
- `closeModal()` is still synchronous for callers: the state flips at once, and only the visual lags.
- Opening a popup during the fade cancels the fade.

### 1.3 Map "unlock" sequence (`js/screens.js` `playUnlock`)
- **When it plays:** on the first clear of the newest level (`onWin` sets the transient `pendingUnlock={n,stars}`, which is not saved), the next visit to the map plays:
  1. The map scrolls to the cleared node.
  2. Its stars stamp in one by one with a chime.
  3. The path to the next node draws itself.
  4. The next node's padlock shakes, then bursts into pieces.
  5. The node pops open in its mode colour, and the "current" beacon and pin appear.
- **Skipping:** a tap anywhere finishes it instantly.
- **When it doesn't play:** on Next, the player skips the map, so the sequence is dropped. It also doesn't play under reduced motion.

---

## 2. Bug fixes

These come from a code audit and the device matrix (section 9 has the evidence). Fix in this order. Each fix gets a regression check, either in an existing tool or a small script in the scratchpad.

> The full list with file:line references is in **section 9 (Audit findings)**. The table below is the work order.

Severity: 🔴 loses progress, money or rewards, or breaks a level · 🟠 noticeable misbehaviour · 🟡 minor or edge case.
"Repro" names the script in `tools/repro/` that shows the bug today; the fix should make it pass. Line numbers are approximate (taken at commit 52b680d).

| # | Sev | Bug | Where | Fix | Repro |
|---|---|---|---|---|---|
| B1 | 🔴 | **Login reward paid twice** on a double tap or held Enter: the Claim handler pays at once, but the popup stays 700 ms. | `js/meta.js` ~125 (`showLogin` claim fn) | At the top of the handler, `if(S.login.last===today())return;`, and disable the button on the first click. **General rule for every reward button** (claim, spin, buy, skip, quest claim): disable on the first click. | t1_login |
| B2 | 🔴 | **Daily challenge can be won repeatedly** with Restart (or R) in the 1 s before the win card. It pays again, counts `stats.daily` again, and resets the streak to 1. | `js/ui.js` `startLevel`, restart button, `onWin` daily branch | `startLevel` refuses a daily when `dailyDone()` (toast "Done for today"). In `onWin`, if `S.dchal.last===cur.dday`, give no reward and leave the streak alone. The Restart button is disabled once `cur.over`. | t2_daily |
| B3 | 🔴 | **A daily started before midnight and won after it** is booked to the new day: it uses up the new day's puzzle and breaks the streak. | `js/ui.js` `onWin` (`today()` at win time) | Store `cur.dday=today()` in `startLevel` for dailies and use it in `onWin`. | t8_midnight |
| B4 | 🔴 | **Enter/Space in a popup always presses the last button**, even with focus on Cancel. Settings → Reset → Tab to Cancel → Enter **erases all progress**. Space on a toggle presses Done. | `js/ui.js` keydown handler | If `document.activeElement` is inside the modal and is a button, input or `[role=switch]`, let the browser handle the key. Destructive popups (reset) set `o.noEnter`. | t7_enter |
| B5 | 🔴 | **Block Garden: a won level can be lost.** After the final placement, `api.win` waits 350–1250 ms for the bloom, but `cur.over` is still false, so Hint, Skip (charges 150 coins), Back and Restart still work and the win is thrown away. | `js/modes/blocks.js` ~153 | Add `api.lock()` to `js/ui.js`: it sets `cur.locked=true`, which blocks hint, skip, restart, undo and back. Blocks calls it the moment `finished=true`. **Do the same check in every mode with a delayed win:** threads (finish), merge (win is immediate, OK), tubes (immediate, OK). | t5_blockswin, t5b |
| B6 | 🔴 | **A stale Sand Tubes hint timer rewrites the next level's HUD** (moves meter and `cur.last`) 3.2 s after Restart, Back or Next. The idle nudge triggers it too. | `js/modes/tubes.js` hint (~239), no `destroy` | Keep the timer id; add `destroy(){clearTimeout(hintT)}`; guard `render()` with `if(!wrap.isConnected)return`. **Audit every mode for timers that outlive the level** (`grep -n setTimeout js/modes/*.js`) and check `isConnected` or a generation counter in each. | t3_tubes |
| B7 | 🟠 | **Hints are charged when no hint is shown** (Tubes "No way forward", Merge "No pairs", Blocks "No room"). It also sets `cur.hinted`, which spoils the "no hints" quest. | `js/ui.js` `useHint` and each mode's `hint()` | `hint()` returns `true` when it showed something. `useHint` charges and sets `hinted` only then. | t4_hintcharge, t4b |
| B8 | 🟠 | **The spin prize is lost if the app closes mid-spin** (the cooldown or cost is saved before the 4.6 s animation; the prize is only paid at its end). | `js/meta.js` ~160–173 `doSpin` | Pick the result and pay and save at the start; the animation only reveals it. | t6_spin |
| B9 | 🟠 | **The service worker can cache stale files**: `addAll` goes through the HTTP cache (GitHub Pages sets max-age 600), and the background refresh writes file by file outside `waitUntil`. The result can be a mixed old and new version. | `sw.js` | `c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))`; wrap the refresh in `e.waitUntil`; use network-first for navigations (`index.html`), with a cache fallback offline. Also add an "Update ready, tap to refresh" toast when a new worker takes control (`controllerchange`). | (manual: two deploys) |
| B10 | 🟠 | **Audio can stay silent on iOS** after backgrounding or a phone call: the gesture listeners are removed for good once audio first runs, and the `'interrupted'` state is never resumed. | `js/ui.js` `wakeUntilRunning`, `js/audio.js` `ok()`/`audio()` | Keep one passive `pointerdown` listener for good that calls `AU.ctx.resume()` whenever `state!=='running'` (cheap), and treat `'interrupted'` like `'suspended'`. On `visibilitychange` to visible, try a resume (it may need the next tap; that's fine). | (manual, iOS) |
| B11 | 🟠 | **A double tap on Next, Replay or Try again could hit the new board.** This is mostly fixed by the prebuilt iris, which blocks taps while it covers the screen. | `js/ui.js` | Check: during the iris, `.iris.on` has `pointer-events:auto`. Add a 250 ms input guard after `startLevel` anyway (`cur.t0`, and ignore board pointerdowns before `t0+250`). | (manual) |
| B12 | 🟠 | **Popups shown on boot collide**: the welcome card can replace a first-time how-to card (its "Got it" callback never runs, so the nudge never starts), and the login card can pop over a level. | `js/ui.js` last lines, `js/meta.js` | One popup queue: `queueModal(fn)` runs `fn` only when no modal is open and the active screen is home; otherwise it retries on the next `show('home')` or `closeModal`. Welcome, login, and level-up/trophy cards (where applicable) go through it. | (manual) |
| B13 | 🟡 | **Replaying a 3-starred level farms XP and the streak bonus.** | `js/ui.js` `onWin`, `js/core.js` `xpForWin` | When `prev===3`: XP × 0.2, no streak bonus, and don't extend the streak. Re-run `tools/economy-sim.cjs`. | — |
| B14 | 🟡 | **Two tabs overwrite each other's saves.** | `js/core.js` `save` | On the `storage` event for the save key, reload `S` and refresh the visible screen (or show "Updated in another tab"). | — |
| B15 | 🟡 | **Save failures are silent** (quota, private mode). | `js/core.js` `save` | On the first failure, toast "Can't save progress on this device (private mode?)". | — |
| B16 | 🟡 | **The "Collect N coins" quest only counts level coins.** | `js/ui.js` `emit('coins')` | Emit `coins` from login, spin, quest, trophy and level-up rewards as well. | — |
| B17 | 🟡 | **The Sand Tubes hint search blocks the main thread** (25k-node A*, also run by the idle nudge) on big boards. | `js/modes/tubes.js` | Cache the generation-time solution and advance it while the player follows it; only search again when they deviate, with a 6k-node cap first, then 25k. | perf.cjs tubes at tier 12+ |
| B18 | 🟡 | **Accessibility**: Lights cells lack labels and state; div cells can't be reached by keyboard; `#modal` lacks `role="dialog"`, `aria-modal` and focus handling; the idle nudge ignores keyboard players. | various | Add `role="dialog" aria-modal="true"` and move focus to the first button on open, then back on close. Add `aria-label` and `aria-pressed` on Lights cells. Reset the nudge on `keydown` too. Full keyboard play for the drag modes is out of scope. | — |
| B19 | 🟠 | **Popup buttons sit on top of the content** (Settings, How-to, Quests, Trophies; worst on SE). | `css/hud.css:375` | Section 3 (Phase 2). | matrix overlap check |
| B20 | 🟡 | **The play header wraps and the HUD is cramped at 320 px.** | `css/hud.css` `.ptitle`, `.hud` | Section 4, P1 and P2. | matrix + screenshots |


---

## 3. Popup (modal) layout system — Phase 2

**Problem (seen on every phone, worst on SE):**
- The sticky button row (`.card>.mbtns`, `css/hud.css:375`) sits **on top of** the content: Settings "Done" covers "Reset progress" and Quality, How-to "Got it" covers step 3, Trophies "Close" covers the last row, and Quests "Close" covers the 4th quest.
- The gradient behind the buttons is only partly opaque, so the content shows through and reads as overlapping text.

**Fix: one structure for every popup**
1. **Structure:** `openModal` renders `.card` as a flex column: `.mhead` (medal, kicker, h2), `.mbody` (everything else, `overflow:auto`, `min-height:0`) and `.mfoot` (the buttons).
   - The card has `max-height: calc(100dvh - 32px - safe areas)`.
   - Only `.mbody` scrolls. The footer is never on top of content: it is a normal flex item with a solid background and a 1px top hairline.
2. **Scroll hint:** when `.mbody` can scroll, show a soft fade at the bottom edge of the body (a `::after` on `.mbody` toggled by a `scrolled-end` class from one `scroll` listener). The fade disappears at the end of the list.
3. **Exceptions:** keep the win card's layout as it is (it's built to fit), but give it the same structure so the buttons never wrap onto three lines.
   - On ≤ 340 px, Levels and Replay become icon-plus-label buttons at 42 px tall, and Next takes the remaining width on the **same row**.
4. **Dismissing:** tapping the dimmed backdrop closes "informational" popups (settings, profile, quests, trophies, how-to, spin while not spinning) through their own close action. It never closes the win, fail, skip-confirm or reset-confirm popups.
   - Add `o.dismiss:true` to the `openModal` options of the first group.
5. **Android back button / swipe-back:** push a history state when a popup opens or a level starts. `popstate` closes the popup, or leaves the level (same as ←). Never navigate the page away.
6. **Matrix check:** extend `tools/matrix.cjs` with an **overlap check**. For every visible button inside `#modal.on`, test the topmost element at its centre (`document.elementFromPoint`); it must be the button or inside it. Also, no `.mbody` text element may intersect `.mfoot`.

**Done when:** `matrix.cjs` is clean on all 6 devices with the new overlap check, and the screenshots of settings, how-to (all 5), quests, trophies and win on iPhone-SE show nothing behind the buttons.

---

## 4. Play screen UI — Phase 3

| # | Problem (evidence) | Change |
|---|---|---|
| P1 | On 320–360 px the mode name under "Level N" wraps onto 2 lines ("Block / Garden"), which pushes the HUD down. | `.ptitle small`: `white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%`. Under 360 px, show only the icon and name (drop "· BONUS 2× coins", which the intro banner already says). |
| P2 | The star meter row is cramped at 320 px: "Moves 1★★★ within 14" collides. | Under 360 px, put "Moves N" on its own line above the bar and shorten the target to "★★★ ≤14". Check in `matrix.cjs` that `.hud` children don't overlap. |
| P3 | The instruction line (`#instr`) repeats the coach pill and takes 2–3 lines on every level (Star Threads: 3 lines plus a 2-line coach). | Show `#instr` only for the first **3 levels of each mode** (`S.seenN[type]` counter, saved), then hide it (the ? button still opens the how-to). The coach pill becomes the single source of live guidance. |
| P4 | Coach texts are too long for one line on small phones. | Rewrite to ≤ 34 characters each (table below). One line, `text-overflow:ellipsis` as a safety net. |
| P5 | Undo looks the same whether or not it can do anything. | Undo has a disabled look (40% opacity, no press bounce) when `history.length<2`. Refresh it after every `commit`/`restore`. |
| P6 | Free hints vs paid hints aren't obvious. | Hint badge: a number when free hints remain, a coin price when not. Add a gentle pulse on the hint button only when a free hint is available **and** the player has been idle 8 s (reuse the `resetNudge` timer). |
| P7 | Restart wipes progress with no warning mid-level. | If moves ≥ 3 and the level isn't over, Restart asks "Restart this level?" using the confirm popup style. Long-press Restart skips the question. |
| P8 | The level intro banner covers the board for 1.5 s on every level, which is slow when replaying. | Show the full banner the first time a level is played; on replays, show a slim 900 ms chip at the top instead. |

**Coach text table (P4)**

| Mode | State | New text |
|---|---|---|
| Sand Tubes | idle | 👆 Tap a tube to scoop sand |
| | selected, can pour | ✨ Tap a glowing tube |
| | selected, nowhere | 🚫 No room. Tap to put it down |
| | progress | 🧪 3/6 tubes sorted |
| Star Threads | start | 👆 Press a star, slide a thread |
| | drawing | ✨ 5 threads left |
| | dead end | 🌑 Dead end: Undo or tap a star |
| Lights Out | playing | 💡 3 lights on |
| Block Garden | idle | 🌱 Drag a block onto the bed |
| Merge Bloom | goal | 🌸 Grow a Bud |
| hints | any | 💡 Follow the glow |

Also fix the Lights Out tip, which reads as broken text ("flip it and [icon] the squares shown"). Change it to: "Tap a square: it and its pattern flip ([icon]). Turn every light off."

---

## 5. Menus, home, map, shop UI — Phase 4

| # | Screen | Problem | Change |
|---|---|---|---|
| M1 | Home | On tall phones (≥ 800 px) there is a dead band between the logo and the Next card. The garden decorations are 18 px emoji that nobody notices. | Make the garden a real strip: a 64 px soil bed (CSS gradient) with the decorations at 30 px, gently swaying (`transform:rotate`, q-low static). Distribute the remaining vertical space with `justify-content:space-evenly` on `.homemain` for heights ≥ 760. |
| M2 | Home | The tiles' red dots and "ready" rings don't say what's ready. | Keep the dots, but the sub-label already says "Free spin!" / "2 to claim!". Make the dot pulse once on arrival (not forever) and stop. |
| M3 | Map | After scrolling far, there's no way back to the current level. | A floating "▼ Level N" pill appears at the bottom when `.node.cur` is off-screen (IntersectionObserver). Tapping it smooth-scrolls there. |
| M4 | Map | A locked world just shows locked nodes. | Show the locked world banner with "Clear level X to unlock" and the world's colour, desaturated. Don't render its 12 nodes individually: one card with a big padlock is enough and halves the map's DOM. |
| M5 | Map | The map fully rebuilds on every visit (`renderMap` sets `innerHTML=''`), which costs about 15 ms and the scroll position. | Cache the DOM; on return only patch the nodes whose stars or lock state changed (keyed by `S.stars[n]` and `S.unlocked`). Keep the scroll position unless the unlock sequence moves it. |
| M6 | Shop | Long descriptions wrap to 3 lines on SE ("50% off today only!"). | Shorter copy (≤ 24 characters). On ≤ 340 px, hide the `small` description for Boost items and keep the name and price. |
| M7 | Shop | Buying gives a toast and a burst, then the whole list re-renders, which jumps the scroll. | Update only the bought row and the coin chips; fly coins from the chip to the item (reverse `flyCoins`). |
| M8 | Trophies | The grid scrolls under the Close button (fixed by Phase 2). Locked trophies all look the same. | Add a progress bar on each locked trophy (e.g. "37/50 levels"), using the counters `checkAch` already reads. |
| M9 | Profile | The tile labels "Best 3★ streak" and "Daily challenges" wrap on SE. | Shorter labels: "Best streak" and "Dailies". |
| M10 | Settings | A long scroll on SE. | Group into collapsible sections (Sound open, others closed) or two tabs, "Sound & play" and "Graphics & data". Reset sits at the very bottom behind a confirm (it already confirms; keep that). |
| M11 | Toasts | Toasts sit over the coach pill during play. | During play, show toasts just above the toolbar instead of the top. |

---

## 6. Animation polish — Phase 5 (meta) and Phase 6 (modes)

All of these are small, self-contained and safe to build. Each one lists where it goes and its timing.

### 6.1 Meta / menus (Phase 5)
| # | Animation | Spec |
|---|---|---|
| A1 | Coin chip bump | Whenever `S.coins` changes upward, the visible `.chip .coin` does a 260 ms scale(1.25) bounce and the number counts up over 400 ms (rAF, ease-out). Downward changes tick down without the bounce. |
| A2 | Quest claim | The claimed quest row's reward icons fly to the coin chip (reuse `flyCoins` with the row as the source). The row then collapses its height over 300 ms (transform scaleY plus opacity; then set display:none) and the "Finish all 3" bar fills one notch. |
| A3 | Trophy unlocked banner | The existing banner slides in from the top with a medal flip (rotateY 0 → 360 over 600 ms) and a ring burst. Stack queued banners 400 ms apart, never on top of each other (the audit screenshot shows two at once). |
| A4 | Daily login card | The claimed day's tile flips to a ✓ (rotateY, 400 ms), then coins fly to the chip. Tomorrow's tile gets a soft glow and "Tomorrow" label. |
| A5 | Spin wheel | Add tick sounds and a tiny pointer kick each time a segment passes the pointer (compute from the rotation angle in rAF). Ease out over 3.2 s with a slight overshoot and settle back (−4° then 0). |
| A6 | Home tiles | On returning home, tiles with something ready do one 400 ms "wiggle" (rotate ±4°), staggered 80 ms. Once per visit, not looping. |
| A7 | Star chest | When a milestone opens (`chest>0` in `onWin`), the win card's "Star chest opened" line gets a mini chest SVG whose lid flips open (rotate −110° about the hinge, 500 ms) with a coin fountain. Reuse the home chest SVG markup from `index.html`. |
| A8 | Level-up | The `lvup` line in the win card becomes a full-width ribbon that scales in from 0.6, with the new rank name and sparkles. On the home screen, the XP ring animates from the old value to the new one the next time home shows. |

### 6.2 Per mode (Phase 6)
| # | Mode | Animation | Spec |
|---|---|---|---|
| B1 | Lights Out | Tap ripple | The tapped cell emits a ring (CSS pseudo, scale 0.6 → 1.6, opacity 1 → 0, 350 ms). Affected cells flip with a 40 ms stagger outward from the tap instead of all at once. |
| B2 | Lights Out | All-dark finish | A "lights out" wave: each cell glows once in a diagonal sweep (opacity overlay, 50 ms stagger), then the board dims to night blue with a moon burst. |
| B3 | Sand Tubes | Invalid pour | Tapping a tube you can't pour into: the selected tube does a short "no" wobble (rotate ±6°, 260 ms) and the target flashes red briefly. Today it only plays a sound. |
| B4 | Sand Tubes | Level start | The sand settles in: each layer drops 6 px with a 30 ms stagger from bottom to top (transform only), replacing the plain tube pop-in. |
| B5 | Block Garden | Pick-up | The lifted tray piece scales to 1.08 with a drop shadow (`filter:drop-shadow` is fine here because it's a static value set once on the ghost, not animated). The empty slot shows a faint outline. |
| B6 | Block Garden | Invalid drop | The ghost flies back with a small shake at the end (already flies back; add ±4 px x-shake over the last 120 ms). |
| B7 | Block Garden | Tray refill | When all 3 slots are used, the new pieces slide in from the right with a 70 ms stagger and a soft pop. |
| B8 | Merge Bloom | Idle life | Every 2.5 s one random plant (q-high only) does a 600 ms sway (rotate ±5° about the bottom). Pause while dragging and while a popup is open. |
| B9 | Merge Bloom | Garden full | When no pairs remain, the board does a soft red pulse and the Undo button glows (today it's just a toast). |
| B10 | Star Threads | Start-star cue | On levels after the first two, if the player has been idle 6 s before starting, all odd-thread stars pulse once (a hint at where paths can start). |
| B11 | All drag modes | Snap feedback | When a drop lands, give a 40 ms haptic (`buzz(10)`) and a short "tok". Blocks and merge already do; threads should too (it uses pluck plus buzz 8: OK). Check all three are consistent. |
| B12 | All modes | Win sweep | `onWin` already adds `.celebrate` to `.cell,.tube,.cel`. Add the per-mode selectors (`.bz.f`, `.mg.full`, `.st`) so every mode gets the sweep. |

---

## 7. Phases (order, checkpoints, commits)

| Phase | Work | Checkpoint before committing |
|---|---|---|
| 0 | Baseline: run every tool and save the numbers in this file under "Results". Check the prebuilt section 1 on SE and 13 (enter and leave a level from map, home and win; open and close popups; first-clear unlock on the map). | All tools green; prebuilt items behave as described |
| 1 | Bug fixes from section 2 (all of 🔴 and 🟠, then 🟡 as time allows) | Each fix has a regression check; solve-all, drag and matrix green |
| 2 | Popup layout system (section 3) plus the matrix overlap check | Matrix clean on 6 devices **with** the new overlap check; SE screenshots reviewed |
| 3 | Play screen UI (section 4) | Matrix clean; screenshots of all 5 modes on SE and 13 reviewed |
| 4 | Menus UI (section 5) | Matrix clean; `perf.cjs map home` no worse than baseline |
| 5 | Meta animations (6.1) | perf budget met on high and low |
| 6 | Mode animations (6.2) | perf budget met per mode; solve-all and drag green |
| 7 | Final QA: the full tool run, a manual pass on SE and Pro Max screenshots, README "What's new", sw bump, push both branches, republish the artifact | Everything green |

---

## 8. Definition of done
- Every tool green: matrix (with the overlap check) on all 6 devices, solve-all, drag, migration, economy-sim.
- `perf.cjs 4` on `high` for every scenario: avg ≥ 55, p5 ≥ 50 (best of 3 runs), no long task over 100 ms. On `low`, avg ≥ 50.
- No popup has anything visible behind its buttons on SE.
- No text in the play header or HUD wraps unexpectedly at 320 px.
- Every 🔴/🟠 bug in section 2 is fixed with a regression check.
- Reduced motion: no transition or decorative animation runs; the game is fully playable.

---

## 9. Audit findings (evidence)

**Method (planning session):**
- `tools/matrix.cjs` screenshots of every screen and popup on iPhone-SE and iPhone-13, reviewed by eye.
- A separate code audit of all JS, with headless repros (scripts in `tools/repro/`).
- Videos of the new transitions (Playwright `recordVideo`, frames extracted with `ffmpeg`).

**Layout evidence (matrix screenshots):**
- iPhone-SE: the Settings "Done" button covers the Quality row. How-to "Got it" covers step 3 (Lights Out, Star Threads). Quests "Close" covers the 4th quest. Trophies "Close" covers the 4th row.
- iPhone-SE: the play header splits "Block / Garden", "Star / Threads", "Merge / Bloom" and "Sand / Tubes" over two lines. The HUD row runs "Moves 1★★★ within 14" together.
- iPhone-13: the Star Threads coach wraps onto 2 lines, and its tip is 3 lines. The Lights Out tip reads "flip it and [icon] the squares shown".
- Win popup: two "Trophy unlocked" banners stack on top of each other over the HUD.
- The current `matrix.cjs` reports "clean" for all of the above, which is why Phase 2 adds an overlap check.

**Transition performance (prebuilt, 4× CPU throttle, Pixel 5):**
- Enter level: avg 48–58 fps. Exit: 51–53. Slide: 51–53.
- The worst single frame (100–170 ms) is the board build or map rebuild, which runs while the iris fully covers the screen, so no motion is visible during it. M5 (map caching) shortens it.


---

## Results (filled in by the builder)

### Phase 0: baseline (commit 20afc42, Pixel 5 viewport, CPU 4× throttle)
- matrix: clean on all 6 devices (without the overlap check); solve-all: all solvable; drag, migration, economy-sim: pass.
- Prebuilt transitions, popup fade and map unlock verified on iPhone 13 and iPhone SE (screenshots and video frames).

| Scenario | high: avg / p5 / long tasks | low: avg / p5 / long tasks |
|---|---|---|
| home | 60.0 / 59.9 / 0 | 60.0 / 59.5 / 0 |
| map | 59.7 / 59.5 / 0 | 60.0 / 59.9 / 0 |
| **lights** | **43–48 / 20–30 / 3–9** | 54.3 / 30.0 / 2 |
| tubes | 59.6 / 59.9 / 0 | 59.4 / 59.9 / 0 |
| threads | 60.0 / 59.9 / 0 | 59.8 / 59.5 / 0 |
| merge | 57.0 / 59.5 / 0 | 59.6 / 59.5 / 0 |
| blocks | 56.8 / 30.1 / 0 | 58.6 / 59.5 / 0 |
| win | 55.0 / 30.0 / 1 | 57.0 / 59.5 / 1 |
| modal | 59.7 / 59.9 / 1 | 60.0 / 59.9 / 1 |

**Finding:** Lights Out on `high` misses the budget (avg ≥ 55). The same numbers appear on commit 52b680d, so the transition work did not cause it. It will be diagnosed and fixed at the start of Phase 6, before the Lights Out animations (B1, B2) are added.

**Small finding:** on 320 px the map world banner wraps "WORLD 1 · LEVELS 1–12" and truncates the world name ("Twilight Gr..."); handled with M4/M5 in Phase 4.

### Phase 1: bug fixes (done)
All of B1–B18 are fixed; B19 and B20 belong to Phases 2 and 3. `tools/regress.cjs` has 28 checks; it fails 22 of them on the old code and passes all on the new. The old `tools/repro/` scripts were folded into it and deleted.

Notes on how each was fixed, for whoever touches this next:
- **Popup buttons are one-press.** `openModal` disables a button the moment it is tapped; a handler that returns `false` re-arms it (the spin button does this when you can't afford a spin). This is the general fix behind B1, B11 and double-charged Skip.
- **`api.lock()`** (new): a mode calls it when a win is certain but still animating. It blocks Hint, Skip, Restart, Undo and Back. Block Garden uses it; the other modes win instantly.
- **`hint()` contract:** returns `false` when it shows nothing (then `useHint` charges nothing and doesn't mark the level as hinted). Any other return value, including `undefined`, counts as shown.
- **Dailies** are booked to `cur.dday`, the day they were started, and only once. `startLevel` refuses a daily that is already done.
- **Popup queue:** `queueModal(fn, delay)` (in `js/ui.js`) is how popups that open by themselves must be shown. It waits for the home screen with no popup open.
- **Keyboard:** the popup focuses its main button (Cancel for popups made with `noEnter:true`). Enter or Space on a focused control works natively; with nothing focused, Enter presses the main button unless the popup is `noEnter`.
- **Service worker (`pop-v12`):** installs with `cache:'reload'`; page loads are network-first (3.5 s timeout, then cache); other files are cache-first with a background refresh kept alive by `waitUntil`. Verified offline in headless Chromium. An update shows a "New version ready" toast.
- **Sand Tubes hints** follow the solution found at level generation (free), and only search again after the player deviates (6k nodes, then 25k). Even at tier 40 a search took under 10 ms in headless Chromium.
- **Not testable here:** B10 on a real iPhone (the headless check only covers suspend → tap → running); B9's two-deploy staleness case.
- Replaying a 3-star level now gives 20% XP and no streak bonus, and doesn't extend the streak (B13). `economy-sim` still passes (it doesn't model such replays).

### Phase 2: popup layout (done)
- **Structure:** `.card` is a flex column: `.mbody` (medal and content, the only part that scrolls), `.mfade` (the "more below" gradient, shown while the body can scroll) and `.mbtns` (a fixed footer). Padding comes from the `--cpx/--cpt/--cpb` variables so it can shrink on short screens. Deviation from the plan: the medal, kicker and title scroll with the content instead of being pinned (simpler and robust; the medal is hidden on short screens anyway).
- **Win card:** its rays and glow are moved out of the scrolling body into the card. On phones ≤ 400 px wide, Levels · Replay · Next share one row (Levels and Replay at 42 px, Next takes the rest).
- **Dismissing:** `openModal` options `dismiss` (tap on the dimmed backdrop) and `back` (Escape and the phone's Back button, which defaults to `dismiss`). Settings, profile, quests, trophies, spin and how-to dismiss; the win and fail popups use `back` to leave the level; the skip-confirm popup uses `back` to cancel; the reset-confirm popup uses `back` to return to Settings. None of those four ignore a backdrop tap.
- **Back button:** while a popup, a level, the map or the shop is open, one extra history entry stands guard (`syncGuard`). Back closes the popup, leaves the level or goes up to home; on the home screen it is passed on and really leaves. Verified with real `page.goBack()` navigation.
- **`tools/matrix.cjs`:** new popup checks: visible text must not run under the footer, buttons must not be covered, the card must fit the screen. On the previous commit it reports 7 problems on iPhone SE; now it reports none on all 6 devices.
- `tools/regress.cjs` gained 8 popup checks (36 in total).
- Perf: `modal` 60 fps. `win` measured 46–52 fps avg (baseline 55) because it plays a Lights Out level; the Lights Out frame-rate fix is scheduled for the start of Phase 6.

### Phase 3: play screen (done)
- **P1:** the mode label under "Level N" is one line (`white-space:nowrap` plus ellipsis). Under 360 px the "BONUS 2×" suffix is dropped; at ≤ 340 px the label also drops its emoji and the coin chip loses its slack, so "Block Garden" fits next to a 4-digit balance on a 320 px phone.
- **P2:** under 380 px the star target reads "★★★ ≤14" instead of "★★★ within 14", so "Moves N" and the target no longer collide.
- **P3:** `#instr` (the written instruction) is shown for the first 3 levels of each mode, then hidden (`S.seenN`, saved; restarts don't count). The ? button still opens the how-to.
- **P4:** every coach text is now ≤ 34 characters and the pill never wraps (`nowrap` plus ellipsis). The Lights Out tip was reworded.
- **P5:** Undo looks switched off (40% opacity, no press bounce) when there's nothing to undo; it stays tappable (a tap plays the "nothing to undo" sound).
- **P6:** the hint badge already showed a number or a price. New: after 8 s without a touch, the Hint button pulses gently if a free hint is available.
- **P7:** Restart asks "Restart this level?" when 3 or more moves would be lost. Holding the button for 0.65 s restarts without asking.
- **P8:** the full intro banner is shown the first time a level is played; replays and restarts get a slim 0.9 s chip.
- **Tools:** `matrix.cjs` now checks the play screens for a truncated or wrapping mode label, colliding HUD text and a cut-off coach text (clean on all 6 devices); `regress.cjs` has 9 more checks (45 in total).
- The Lights Out `high` frame-rate problem is still open (Phase 6, as planned).

### Phase 4: menus (done)
- **M1:** on phones ≥ 760 px tall the garden is a strip of soil with a grass line, with decorations at 32 px that sway; with none owned it shows "🌱 Your garden grows with Shop decorations". Shorter phones keep the compact row (hidden when empty). `.homemain` already used `space-evenly`.
- **M2:** the red "ready" dots pulse twice when home appears, then rest. (The ring around ready tiles was kept.)
- **M3:** a floating "▼ Level N" (or "▲") pill appears on the map while the current level is out of view (`IntersectionObserver`); tapping scrolls back.
- **M4:** a locked world is its banner plus one "Clear level N to unlock" card. The unlock sequence handles the world boundary: winning level 12 shakes and bursts the next world's lock card, then opens the world.
- **M5 (deviation):** instead of patching individual nodes, the map is rebuilt only when its signature (unlocked level, world count, a hash of all stars) changes. An unchanged map keeps its DOM and scroll position, which makes repeat visits free. A changed map is rebuilt (cheap now that locked worlds are single cards) and re-centres on the current level.
- **M6:** shorter shop copy ("50% off today", "Shows the next move"); at ≤ 340 px the description of Boost items is hidden (the "Best value" tag stays).
- **M7:** buying no longer replays the pop-in or jumps the scroll (`renderShop(true)`), coins fly from the balance chip to the item (`flyCoinsTo` in `js/fx.js`), and a double tap buys once.
- **M8:** locked trophies show a progress bar and `v/n` (`ACH_PROG`).
- **M9:** profile labels "Best streak" and "Dailies".
- **M10:** settings groups are native `<details>`: Sound open, Gameplay, Graphics and Danger zone closed.
- **M11:** inside a level, toasts sit just above the toolbar instead of over the coach pill.
- **Also fixed:** on 320 px the world banner keeps one line ("World 6 · 61–72", the word "Levels" is dropped) and the name has room; the matrix now checks world captions and names.
- **Bug found by the matrix:** the map pill's hidden slide-down offset created scrollable overflow in the map screen, so `scrollIntoView` nudged the whole screen up by 8 px (back button at y = −2). The offset is now inside the screen.
- **Perf:** `map` 58.6 fps, `modal` 59.6. `home` measured 44–55 fps on both this commit and the Phase 0 commit at the same time, so the dip is machine noise, not a regression. A/B against the Phase 0 commit when judging a menu change.
- `tools/regress.cjs` now has 12 more checks (57 in total).

### Phase 5: meta animations (done)
- **A1:** visible coin chips count to the new balance (0.4 s up with a 260 ms coin bump, 0.3 s down); hidden chips update at once. `refreshCoins()` in `js/ui.js` does it; `flyCoins` still calls it per arriving coin, and the same target is ignored.
- **A2 (deviation):** a claimed quest row pops (scale 1.045), its pip on the "Finish all 3" row pulses, and the coins fly to the chip. The row is not collapsed away: hiding finished quests would stop the player seeing what they have done.
- **A3:** banners queue: at most two on screen, each starting 0.4 s after the previous, with a medal flip and a ring burst; they stack vertically and never overlap.
- **A4:** the claimed day tile flips to a ✓ (rotateY, 420 ms), tomorrow's tile glows and reads "Tomorrow", and the popup stays up 1.1 s.
- **A5:** the wheel eases out for 3.2 s to 4° past its prize, then settles back onto it in 0.5 s (the pointer tick and sound per segment already existed).
- **A6:** ready home tiles wiggle once each (staggered 80 ms) when you arrive at home.
- **A7:** the win card's "Star chest opened" line carries a copy of the chest drawing (ids renamed `…w`); its lid swings open with a coin fountain.
- **A8:** the level-up line is a full-width shimmering ribbon that springs in; the home XP ring animates from its old value (all the way round, then from empty, after a level-up).
- `tools/regress.cjs` has 6 more checks (63 in total).
- **Perf (4× throttle, same machine state):** map 59.7, modal 59.6; home and win 53 on `high` (win plays Lights Out; see Phase 6); all scenarios ≥ 54 on `low` except Lights Out based ones.
