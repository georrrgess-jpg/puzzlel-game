# Endless Puzzle Pop — "Big Update" plan

Goal: every part of the game gets an upgrade. That means a stunning main menu, much richer visuals and
animation, real sound design and music, clearer onboarding, and a layer of "one more level" meta
systems. All of it stays a no-build, open-`index.html` browser game.

Time box: 60 minutes. Work is ordered so the game stays playable after every step.

---

## 0. Structure (5 min)
- Split the 960-line single file into `index.html` + `css/style.css` + `js/{core,audio,fx,meta,puzzles,ui}.js`.
  These are still plain `<script>` tags, so there is no build step and it works from `file://`.
- Keep the existing save key, so players don't lose progress. New fields get deep defaults, and stats are migrated from old saves.
- Use a rounded "Fredoka" display font, falling back to system fonts when offline.

## 1. Main menu — "wow" first impression
- **Living background canvas** used on every screen. It draws drifting aurora orbs in theme colours,
  floating glossy puzzle pieces (tiles, stars, tubes, gems) with mouse/touch parallax, and twinkling sparkles.
  It calms down during gameplay so it doesn't distract.
- **Animated logo**: each letter of "PUZZLE POP" has its own colour and moves in a bouncing wave, with a glossy shine sweep.
- **Hero card**: "Next up" shows the coming puzzle type and its icon. There is a huge glossy pulsing PLAY button with a light sweep,
  plus a 🔥 streak pill.
- **Profile badge**: player level inside a circular XP ring, with the rank title (Novice → Cosmic).
- **Feature tiles** (Daily, Lucky Spin, Quests, Trophies) with red "ready!" notification dots and live countdowns.
- **Star-chest bar** with a chest that wiggles when you're close.

## 2. Audio — synthesized, zero asset files
- A Web Audio engine with master compressor, separate music and SFX buses, and a generated reverb impulse.
- **Generative background music**: lookahead sequencer playing a Cmaj7–Am7–Fmaj7–G progression. Layers are a warm pad,
  sub bass, plucked arpeggio, wandering pentatonic melody, soft kick/hat/clap.
  Two moods: *menu* (brighter, with drums) and *play* (calm lo-fi, filtered, sparse). The music ducks under fanfares.
- **New SFX set**: wood-block taps, bubbly flips, water "glug" pours (filtered noise + bubbles),
  ratchet clicks, swishes, coin "ka-ching", bell stars, fanfares, level-up arpeggio, chest burst,
  wheel ticks, gentle fail.
- **Combo notes**: each good move in a row plays the next note up a pentatonic scale, which feels very satisfying.
- Settings: separate Music and SFX toggles and volume sliders. Audio pauses when the tab is hidden.

## 3. Puzzle visuals — every board redone
- Shared: glass board panels, glossy 3D cells (highlight + depth), staggered pop-in entrances,
  tap ripples/shockwave rings, floating "Combo ×N" text, win cascade wave, shake on mistakes.
- **Lights Out**: lanterns with bloom glow and flicker. Flips ripple outward from the tapped cell (3D flip wave).
- **Spin Lock**: metallic dials with ring bezels. The arrow spins with a springy overshoot, and the dial glows green when locked.
- **Slide Tiles**: glossy candy tiles with a shine sweep on correct tiles, springy slides, **swipe support**.
- **Colour Flood**: flood spreads as a visible wave. Captured cells pop, and colour orbs are glossy buttons.
  "+N" gain previews appear on early levels as training wheels, and a % flooded progress bar is shown.
- **Sort Tubes**: real glass tubes with highlights and liquid shine. Selected tubes lift, colour droplets arc
  from tube to tube when pouring, and a cork pops onto completed tubes with a sparkle burst.
- **Echo Pads**: neon pads with symbols, shockwave rings when lit, and round-progress dots.

## 4. Easier & more intuitive
- **Star meter** in the HUD: a coloured bar shows the ★★★ / ★★ / ★ move zones and where you are, e.g. "★★★ within 6 moves".
- A clearer coach line (pill with icon). The free idle hint comes sooner on early levels (6s for levels 1–6).
- How-to cards get an animated pulsing "tap here" marker on the demo.
- **Colour-blind symbols** option for tubes, flood and pads.
- Gentler difficulty: fewer starting lights/rotations, more flood moves, slower memory playback early, shorter early sequences.
- A near-miss message on the win screen ("Only 1 move from ★★★!") nudges replays.

## 5. Addictive meta-game
- **Player XP & levels** with rank titles. Every win gives XP, and level-ups pay coins (plus a skip token every 5 levels).
- **Daily login calendar**: 7-day escalating rewards. The streak resets if you miss a day.
- **Daily Challenge**: one date-seeded puzzle a day, harder than your current tier, with a big reward plus a streak bonus.
- **Lucky Spin wheel**: free every 4 hours, extra spins for coins, weighted prizes, ticking wheel audio.
- **Daily Quests**: 3 date-seeded quests (clear N levels, 3-star N, combos, a specific puzzle type,
  no-hint clears, spin, daily). Each pays a reward, and claiming all 3 gives a bonus chest.
- **Trophies**: 25 achievements with coin rewards and slide-in unlock banners.
- **Bonus levels**: every 10th level is golden and pays 2× coins.
- **Combo system** with best-combo tracking.
- **Profile/stats** sheet.
- **Levels map**: chapters of 12 named worlds, a winding dotted path connecting levels, gold bonus nodes, a pulsing current node.
- **Shop**: 4 new themes (Aurora, Lava, Sakura, Galaxy). Themes recolour the animated background too.
  There is also a hint bundle and a "deal of the day".

## 6. Win / fail screens
- A rotating light-ray burst, ribbon banner, stars slamming in with bell tones and bursts,
  a coin count-up, an XP bar fill with a LEVEL UP flash, and quest/trophy banners.
- The fail screen offers a retry and a hint.

## 7. Verification
- Headless Chromium (Playwright): load the page with zero console errors, screenshot the menu and every
  puzzle type, auto-solve one level of each type through the debug hook, and exercise the spin, quest, daily and settings flows.

## Later (beyond the 1-hour box)
- Real sampled instruments, an endless "Rush" time-attack mode, leaderboards, cloud save, PWA install/offline.
