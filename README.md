# Endless Puzzle Pop

An endless, relaxing puzzle game for phones. It runs in the browser: open `index.html` (no build step), or host the folder
(see "Play on your phone").

## The five modes

| Mode | What you do |
|---|---|
| 💡 **Lights Out** | Tap a square to flip it and its neighbours. Turn every light off. |
| ⏳ **Sand Tubes** | Scoop the top sand from a tube and pour it into another. Make every tube one colour. |
| ✨ **Star Threads** | Drag the stars until no glowing thread crosses another. The constellation lights up. |
| 🌸 **Merge Bloom** | Drag a plant onto its twin to grow the next stage. Seed → sprout → sapling → bud → flower → blossom → golden tree. |
| 🌱 **Block Garden** | Drag blocks from the tray onto the bed. Full rows and columns bloom away. Some levels are weed-pulling levels. |

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
  Measured under 4x CPU throttling: every screen and mode averages 52-60 fps (it was 12-20 before the v3 work).
- **Fits every phone**: boards size themselves from the free space; verified clean on iPhone SE (320x568), iPhone 8, iPhone 13,
  iPhone Pro Max, Galaxy 360 and Pixel 5 sizes.
- **Installable and offline**: add it to the home screen; a service worker caches the game.

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
- `js/modes/`: `common.js` (shared helpers + the drag controller) and one file per mode: `lights`, `tubes`, `threads`, `merge`, `blocks`.
- `js/screens.js`: home, map, shop. `js/ui.js`: game flow, popups, HUD.

## Adding a mode

Create `js/modes/<id>.js` that calls `registerMode(id, {name, icon, col, tip}, {goal, steps, demo})` and assigns
`MAKERS[id] = function({R, tier, level, board, api}) { ... return {snap, restore, hint, _bot, destroy?}; }`, add its CSS and
script tags (and the service worker file list). The level rotation, map, quests and daily challenge pick it up automatically.
Give it a `_bot()` so `tools/solve-all.cjs` can verify every tier.

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

See `PLAN.md` (v2) and `PLAN-v3.md` (this update).
