# Endless Puzzle Pop

An endless, relaxing puzzle game for phones. It runs in the browser: open `index.html` (no build step), or host the folder
(see "Play on your phone").

## The six modes

| Mode | What you do |
|---|---|
| 🏹 **Arrow Escape** | Tap a tile and it zips off the board the way its arrow points, unless another tile is in the way (then it bumps and comes back, costing a move). Clear the board in the right order. Boards come in shapes: squares, hearts, circles, diamonds and crosses. |
| ⏳ **Sand Tubes** | Scoop the top sand from a tube and pour it into another. Make every tube one colour. |
| ✨ **Star Threads** | Light up every thread of a constellation in one continuous path: press a star and slide along the threads. Each thread lights only once. |
| 🌸 **Merge Bloom** | Drag a plant onto its twin to grow the next stage. Seed → sprout → sapling → bud → flower → blossom → golden tree. |
| 🌱 **Block Garden** | Drag blocks from the tray onto the bed. Full rows and columns bloom away. Some levels are weed-pulling levels. |
| 🖼️ **Picture Pop** | Pictures are cut into tiles and shuffled on a grid. Swap tiles until a picture is whole: two halves side by side, or on harder levels four quarters as a 2×2 square. A finished picture pops into your gallery and new tiles drop in from the deck. 31 hand-made scenes: landscapes, animals, space, underwater, still life, architecture and abstract art. |

Every level is generated from its number, so levels never run out and always play the same. Every mode has hints, Undo,
a how-to card, and a built-in solver that guarantees each level can be finished. There are no timers and no game over.

## Game features

- **Stars and a star meter**: 1-3 stars per level; a live meter shows how many moves keep each star. Combos climb a musical scale.
- **Progress**: player XP and ranks, a 7-day login calendar, a date-seeded Daily Challenge with streaks, a Lucky Spin wheel,
  3 daily quests plus a bonus, 25 trophies, star-milestone chests, a world map with bonus levels.
- **Shop**: boosts, a deal of the day, 10 colour themes and 9 garden decorations that appear on your home screen.
- **Economy**: every price and reward is in the `ECON` table in `js/core.js`; `tools/economy-sim.cjs` simulates three
  kinds of player and checks the balance targets (about 20-32 coins per level, first theme around level 16, all themes around level 300).
- **Audio**: everything is synthesized with Web Audio: generative music (calm in play) and a full effects set, with volume controls.
- **Accessibility**: colour symbols, reduced-motion support, vibration and sound toggles, tap alternatives to dragging.
- Progress is saved in `localStorage`. Saves from older versions migrate automatically (levels restart, everything else is kept).

## Built for phones

- **Smooth on modest hardware**: graphics quality tiers (High / Medium / Battery saver, chosen automatically from the device
  and changeable in Settings), a cheap animated background that freezes during play, capped particles, no blur effects.
  Measured under 4x CPU throttling on the High tier: every screen and mode averages 50-60 fps (it was 12-20 before
  the v3 work). Battery saver is faster still.
- **Fits every phone**: boards size themselves from the free space; verified clean on iPhone SE (320x568), iPhone 8, iPhone 13,
  iPhone Pro Max, Galaxy 360 and Pixel 5 sizes.
- **Installable and offline**: add it to the home screen; a service worker caches the game.

## What's new in v5 (menu redesign)

- **Scenery**: each menu has its own static illustrated backdrop (twilight floating islands, crystal caves, a sunset
  lake), drawn once in SVG (`js/scenes.js`); the animated canvas background stands still behind them.
- **Bottom bar** for Home / Levels / Shop on every menu; coin chips have a + that opens the shop.
- **Home**: XP bar in the profile, a garden island with a "My Garden" sign and an Edit button (opens the shop's garden),
  a hero card with the world, level and mode of what is next and PLAY overlapping it, a star-chest bar.
- **Levels**: world tabs (done / here / locked) that jump to each world, big world titles with star counts, a
  "YOU ARE HERE" tag, and a level panel: tap a level to see it, tap again or press PLAY to play.
- **Shop**: Boosts / Themes / Garden tabs, the deal of the day as a hero card, two-column cards (three on wide screens)
  with full-width price buttons and a ringed Equipped theme.
- **Win card**: "LEVEL N COMPLETE", a coins | XP row (or "Coins already collected"), the XP bar with from → to, the
  star-chest progress, and a full-width "Continue to Level N+1".
- Styles live in `css/redesign.css` (loaded last). New regression checks N1-N3 cover the bar, the coin +, the garden
  Edit button, picking and playing levels, the world tabs, and the still background.

## What's new in v4.7 (polish and bug fixes)

- Audit: a 60-level bot session (memory, DOM and save size stay flat), random-input fuzzing of every mode (no errors, no
  stuck states), puzzle generation at levels up to 20,000, a duplicate-puzzle scan, and a save/reload round trip.
- Sand Tubes: a smooth first tube selection (no layer is built or repainted on the tap).
- Picture Pop: the solver scores each swap from the cells it touches, so hints and level setup do less work.
- Bigger boards on desktops and tablets (Sand Tubes, Arrow Escape, Picture Pop) and hover feedback for mouse users.
- The win card says "Your best stays ★★☆" on a replay that does not beat it; "New best!" gets its own little pop.
- New regression check: every mode puts a full board on screen on a phone and on a desktop.

## What's new in v4.5

- **Arrow Escape**: pressing a tile previews its path; the lane lights green to the edge, or red up to the tile in the
  way (which gets a red ring), before you let go.
- **Picture Pop**: while you drag a tile over another, that tile leans towards your tile's cell, previewing the swap;
  the pop sequence is shorter, so you can play on sooner.
- **Merge Bloom**: picking up or selecting a plant makes its matching twins glow.
- **Polish**: bright frosted toasts, the same quick press feedback on every tappable card, chip, tab and map level.
- **Lighter effects**: particles render at 1× (they are soft glows), Block Garden puts a flower on every other cleared
  cell, and Merge Bloom's neighbour ripple is one CSS animation per cell instead of a script call.

## What's new in v4.4

- **Picture Pop is easier to read**: every picture has its own frame colour on all its tiles; tapping (or dragging) a tile
  shows a peek of its whole picture with that tile's place outlined; scenes that look alike in every corner (Rose Window,
  Mosaic Fish, Paper Mountains) are only used as two halves; Tea Time and Sweet Cupcake got more detail (a clock, a
  painting, a shelf; bunting and hearts) so each corner is different.
- **Map**: a level you left part-way shows a small green ▶ badge.
- Updates now apply on their own (the service worker fetches fresh files when online and reloads once on an update).

## What's new in v4.3

- **Arrow Escape** replaces Lights Out (same place in the level rotation, so every other level keeps its mode). One tap per
  tile: a free tile squashes, then shoots off the board with a colour streak and a puff of particles; a blocked one slides
  up to the tile in its way, flashes and springs back while the other flinches. Quick clears chain into combos. Levels
  are built by placing each tile pointing somewhere clear at that moment, so every board can be cleared without a bump.
- **No more coloured circle** when a level opens or closes: the screen zooms in and fades instead.
- **Lucky Spin** is a detailed SVG carnival wheel: shaded segments, a gold rim with 24 chasing bulbs and studs, coin and
  prize icons, a stand. The spin winds up, blurs at speed, ticks the pointer and settles; the win flashes every bulb in
  the prize colour, lights the winning wedge and bursts a prize badge out of the hub.
- **Trophies**: a header medallion with a completion ring and the coins earned, a "closest to unlock" card, tabs by kind
  (Levels, Stars, Skill, Daily, Collect), unlocked trophies first with a shine and a NEW tag, then the nearest ones.
- **Brighter everywhere**: colour washes on every screen, frosted top bars, a violet popup card, tinted shop cards, lilac
  locked map levels, a gold coach pill and four candy toolbar buttons.

## What's new in v4.2

- **A brighter home screen**: colourful light washes behind the menu, candy-coloured Daily / Spin / Quests / Trophies tiles
  and Levels / Shop buttons with a solid 3D edge, a Next up card in the colour of the coming mode, a rainbow rim on PLAY,
  frosted chips and a violet star bar.
- **Pick up where you left off**: leaving a level (or closing the app) keeps it, Undo history included; PLAY then says
  "Continue level N". Restart still starts fresh.
- **The Next up card plays** the next level when tapped.

## What's new in v4.1

- **Picture Pop**, a sixth mode (it replaces the Vase Blast prototype): swap tiles on a grid to put pictures back together.
  Two-piece pictures first, four-piece (2×2) pictures on harder levels. 31 detailed SVG scenes in many styles, drawn in
  code at two sizes so every picture looks right as halves or quarters. Pieces of a 4-piece picture that already fit close
  the gap between them. A finished picture joins into one gold-framed image with a shine (and light rays on the High
  tier), sparkles and its name, then flies into the gallery while new tiles drop in from the deck; chains count as combos.
  The deck always deals whole pictures in order, so a level can always be finished, and a built-in solver sets the
  3-star move target and gives hints.
- **Sand Tubes fix**: on a selected tube the sand's top surface no longer lifts off the sand under it; it stays in place
  and glows together with the rest of the colour, and after a pour it settles flat.
- With six modes the level rotation changed: a level number may now be a different mode than before (stars already won are kept).

## What's new in v4

- **Bug fixes**: a hint is only charged when it is actually shown; Replay and Daily levels can no longer be farmed for rewards;
  the Lucky Spin pays when it starts (closing the popup mid-spin no longer loses the prize); the login bonus cannot be
  claimed twice; the Back button closes a popup instead of leaving the page; sand picked up in a tube no longer detaches,
  and every piece of the same colour lifts together; Star Threads is now a one-stroke constellation puzzle (press a star
  and slide along the threads).
- **Popups**: one layout where the buttons never cover the content (checked on six phone sizes), one-press buttons,
  Escape and a tap outside close it, queued popups wait their turn, the level-up and chest popups carry their own animation.
- **Play screen**: calmer header with a live star meter, a coach line that explains the next step, the toast moves out of
  the way of the toolbar, Restart asks first once 3 or more moves would be lost (hold the button to restart without asking), Undo dims when there is nothing to undo.
- **Menus**: the home screen shows your garden, the level map keeps its place and shows a "jump to current level" pill,
  locked worlds explain what unlocks them, the shop keeps its scroll position, settings are grouped.
- **Animations**: screen transitions and an iris into every level, a popup that fades out instead of vanishing, the world
  unlock sequence, coins that fly to the coin chip, an XP ring that fills, a spinning wheel that overshoots and settles,
  a calendar tile flip, achievement progress bars, a Lights Out wave and a moon when the last light goes out,
  Sand Tubes that drop in at level start and shake their head at an illegal pour, a lifted block that grows a little,
  plants that sway in Block Garden, and a Star Threads cue that shows where to start.
- **Offline updates**: the service worker fetches fresh files and shows "New version ready" when an update arrives.
- Details of every change, with what was measured, are in `PLAN-v4.md`.

## Play on your phone

The game is a mobile-first web app. Once it is hosted it can be installed to the home screen and works offline.

1. **Host it with GitHub Pages (one-time):** in the repo go to **Settings → Pages → Build and deployment**. Set
   **Source: Deploy from a branch**, pick the branch that has the game (for example `gh-pages`) and `/ (root)`, then **Save**.
   After a minute it is live at **https://georrrgess-jpg.github.io/puzzlel-game/**.
2. **Open that link on your phone.**
3. **Install it (optional):** iPhone (Safari): Share → **Add to Home Screen**. Android (Chrome): ⋮ → **Install app**.

`sw.js` caches the game for offline play. **Bump its `VERSION` whenever you change any game file**, so installed copies update.

## Code layout

- `index.html`; styles in `css/` (`style.css` base, then `menus.css`, `hud.css`, `modes/*.css`, `perf.css`, `mobile.css` override it).
- `js/core.js`: helpers, saves + migration, **ECON (economy)**, themes, level rotation and `registerMode()`.
- `js/perf.js`: quality tiers. `js/audio.js`, `js/fx.js`: sound, particles, animated background.
- `js/meta.js`: XP, quests, trophies, daily, spin, settings. `js/howto.js`: how-to demo helpers.
- `js/modes/`: `common.js` (shared helpers + the drag controller) and one file per mode: `arrows`, `tubes`, `threads`, `merge`, `blocks`, `pics` (its art is in `pics-art.js`).
- `js/screens.js`: home, map, shop. `js/ui.js`: game flow, popups, HUD.

## Adding a mode

Create `js/modes/<id>.js` that calls `registerMode(id, {name, icon, col, tip}, {goal, steps, demo})` and assigns
`MAKERS[id] = function({R, tier, level, board, api}) { ... return {snap, restore, hint, _bot, destroy?, begin?, goal?}; }`, add its CSS and
script tags (and the service worker file list). The level rotation, map, quests and daily challenge pick it up automatically.
Give it a `_bot()` so `tools/solve-all.cjs` can verify every tier. A mode whose stars are not move-based sets its own HUD with
`api.setInfo()`/`api.setStars()` and returns `goal`/`goalShort` text for the level banner.

## Test tools (`tools/`, need Playwright: `NODE_PATH=$(npm root -g) node tools/<name>.cjs`)

| Tool | What it checks |
|---|---|
| `shot.cjs` | Screenshots of any screen/mode/popup and auto-solves levels; prints page errors |
| `solve-all.cjs` | Every mode x a spread of difficulty tiers is solvable by its solver |
| `drag.cjs [W H]` | Real touch drags (CDP) in the three drag modes on a phone viewport |
| `matrix.cjs` | Six phone sizes x every screen: scroll, off-screen controls, tap-target sizes |
| `perf.cjs [rate]` | fps and long tasks under CPU throttling (`GFX=high|med|low`) |
| `economy-sim.cjs` | Economy targets for three player types |
| `migration.cjs` | An old save upgrades correctly |
| `regress.cjs [filter]` | Pass/fail checks for every fixed bug and the Picture Pop rules |

See `PLAN.md` (v2) and `PLAN-v3.md` (this update).
