# Endless Puzzle Pop

An endless puzzle game that runs in the browser. Just open `index.html`; there is no build step.

- **Infinite levels**: every level is generated from its number, so levels never run out and always play the same.
  Levels are grouped into named worlds of 12 on a winding map. Every 10th level is a 👑 bonus level paying double coins.
- **6 puzzle types**: Lights Out, Sort Tubes, Spin Lock, Slide Tiles (tap or swipe), Colour Flood, Echo Pads (memory, with a reverse-order twist at higher levels).
- **Stars and a star meter**: 1–3 stars per level based on efficiency. A live meter shows the ★★★/★★/★ move zones.
- **Combos**: good moves in a row climb a musical scale and show combo pop-ups.
- **Meta-game**:
  - player XP and rank levels
  - a 7-day login calendar
  - a date-seeded Daily Challenge with streaks
  - a Lucky Spin wheel (free every 4h)
  - 3 daily quests plus a bonus chest
  - 25 trophies
  - star-milestone chests
  - a shop with boosts, a deal of the day and 10 colour themes
- **Audio**: all synthesized with Web Audio. That covers generative background music (menu and calm in-game moods) and a full SFX set, with separate volume controls.
- **Visuals**: an animated parallax background, glossy 3D boards, flip and ripple waves, particles, pour droplets and celebratory win screens.
- **Accessibility**: colour-blind symbols, reduced-motion support, and haptics and audio toggles.
- **Level intro**: a banner at the start of each level names the puzzle and states the ★★★ goal, plus your best result.
- **Keyboard (desktop)**: U or Ctrl+Z undo, H hint, R restart, Esc back, Enter or Space press the main popup button.
- Progress is saved in `localStorage`, and older saves are migrated automatically.

## Play on your phone

The game is a mobile-first web app. Once it's hosted it can be installed to the home screen and works offline.

1. **Host it with GitHub Pages (one-time):** in the repo go to **Settings → Pages → Build and deployment**. Set **Source: Deploy from a branch**, pick the branch that has the game (and `/ (root)`), then **Save**.
   After a minute it's live at **https://georrrgess-jpg.github.io/puzzlel-game/**.
2. **Open that link on your phone.**
3. **Install it (optional):**
   - **iPhone (Safari):** Share → **Add to Home Screen**.
   - **Android (Chrome):** ⋮ menu → **Install app** / **Add to Home screen**.

   It then opens full-screen with its own icon, and plays offline after the first visit.

`sw.js` caches the game for offline play. Bump its `VERSION` whenever you change game files, so installed copies update.

Code layout:
- `css/style.css` is the base. `css/menus.css`, `hud.css`, `games-grid.css` and `games-fluid.css` add per-area styling on top.
- `js/core.js`: helpers, saves, themes, level generation.
- `js/audio.js`, `js/fx.js`: sound and visual effects.
- `js/meta.js`: XP, quests, trophies, daily, spin, settings.
- `js/howto.js`: the how-to cards.
- `js/puzzles-grid.js`: Lights Out, Spin Lock, Slide Tiles.
- `js/puzzles-fluid.js`: Flood, Tubes, Echo Pads.
- `js/screens.js`: home, map, shop.
- `js/ui.js`: game flow, popups, HUD.

See `PLAN.md` for the update plan.
