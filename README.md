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

## 🧩 Jigsaw (its own endless track)

Jigsaw has its own tab, which opens once level 6 is cleared. Each puzzle is a brand-new illustrated picture, drawn in the
style of the Picture Pop cards and cut into a grid from 2×2 up to 5×5. The board fills most of a phone screen.

- **Play:** drag a piece onto another and they swap. You can also tap a piece, then tap a spot.
- **Locking:** two pieces that belong side by side lock together and move as one from then on.
- **Live preview:** while you drag, the pieces you would push aside slide out of the way, and the landing spot is outlined.
- **Groups never break:** pieces a group lands on make room around it whole, or the move is refused.
- **Help:** Peek (hold or tap) shows the finished picture; hints, Undo and Restart work as in levels.
- **Pictures:** made from parts. There are 18 biomes (meadow, mountains, coast, tropical island, lake, forest, desert,
  canyon, snow, farm, city, Zen garden, jungle, volcano, autumn woods, Candy Land, under the sea, outer space), up to 7
  times of day, and about 70 hand-drawn subjects (buildings, vehicles, animals, plants, sea creatures, space things).
  A main subject and a side subject are paired, and weather and details are added.
- **No repeats:** puzzle numbers walk through more than 15,000 distinct pictures before any combination comes back, and
  neighbouring puzzles never share a biome.
- **Album:** finished pictures fill an album, 12 to a page. A full page pays a bonus.
- **Progression:** jigsaws have their own stars, coins, XP, quests and trophies, and pay a little less per minute than
  levels, so neither track starves the other.

Every level is generated from its number, so levels never run out and always play the same. Every mode has hints, Undo,
a how-to card, and a built-in solver that guarantees each level can be finished. There are no timers and no game over.

## Game features

- **Stars and a star meter**: 1-3 stars per level; a live meter shows how many moves keep each star. Combos climb a musical scale.
- **Progress**: player XP and ranks, a 7-day login calendar, a date-seeded Daily Challenge with streaks, a Lucky Spin wheel,
  3 daily quests plus a bonus, 25 trophies, star-milestone chests, a world map with bonus levels.
- **Shop**: boosts, a deal of the day, 10 colour themes and 9 garden decorations that appear on your home screen.
- **Economy**: every price and reward is in the `ECON` table in `js/core.js`; `tools/economy-sim.cjs` simulates three
  kinds of player and checks the balance targets (about 20-32 coins per level, first theme around level 16, all themes around level 300).
- **Audio**: everything is synthesized with Web Audio, with no sound files. There are four original songs: a menu theme and
  three level songs that rotate as a playlist. Sound effects play in the key of the song that is on. Volume controls are in
  Settings, and M toggles the music.
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
- **Also at home on a computer**: in any landscape window from about 860x480, a desktop layout with a navigation rail, a two-column home and
  large boards (see v8 below). Keyboard: Z or U undo, H hint, R restart, M music, Esc back, Enter for a popup's main button.

## What's new in v8.2 (PC home after the concept art)
The PC home screen follows the concept art. The logo is centred on top, with the garden island floating beside it on
wide windows. The world card with PLAY sits in the middle, with the star chest under it. Daily and Quests are on the
left, Spin and Trophies on the right, either side of the card. Windows narrower than 1200 px drop the tiles' small
status lines. Short windows shrink the logo. The garden island shows from 1360 px wide.

## What's new in v8.1 (PC fixes, smoother Picture Pop)
**The PC layout now appears in real browser windows.** Windows are shorter than the screen: a 1280x720 laptop leaves
about 1280x577 for the page, and such windows used to get the phone layout, with tiny boards and a bottom tab bar. The
desktop layout now applies to any landscape window from about 860x480. It has compact versions for windows under 820
px and 640 px tall, and side columns that narrow with the window.

- **Home:** the logo and the garden share the top row. The world card with PLAY and the star chest sit on the left, the
  four tiles on the right. On short windows the garden steps aside. On big monitors everything grows.
- **Levels map:** the map gets the whole height, and the picked level's card sits at the side with a big PLAY button.
- **Jigsaw album:** shows the whole page at once, six cards to a row.
- **Sand Tubes:** the rack now fits the board. It tries one to four rows of equal length and keeps the biggest tubes
  that fit, so 8 tubes stand 4 + 4 (not 7 + 1) and 12 stand 6 + 6. Nothing spills off a short window. Tubes no longer
  shrink out of shape. This applies on phones too.
- **Narrow windows:** under 1100 px the key chips on the action buttons step aside. The tooltips still name the keys.
- **Checked:** `tools/matrix.cjs` also checks a 1280x577 laptop window and a 920x700 window.

**Picture Pop**, measured with the new `tools/pics-perf.cjs` (real drags of the solver's next swap):
- **Smoother dragging:** the tile in your hand, and the one leaning aside for it, get their own layers. Following the
  pointer no longer repaints the board. The board's position is read once per drag, not every frame. Stutters while
  dragging went from 4 to 0 on a phone with the CPU 6x slower, and from 8 to 0 on a desktop. Raster work fell by about
  45%. When a picture pops, stutters went from 15 to 6 (phone) and 11 to 4 (desktop).
- **More satisfying:**
  - Swapped tiles land with a little bounce.
  - When pieces of a 4-piece picture lock together they flash, sparkle where they meet and click, one note higher
    for each join.
  - The picked-up tile has a softly breathing ring.
  - On PC, tiles lift under the mouse.

## What's new in v8 (new soundtrack, PC layout, smoother Block Garden)
**A new soundtrack** (`js/music.js`): four composed songs played live by a small synthesized band. The band has an FM
electric piano, warm pads, bass, plucks, marimba, kalimba, bells, a flute-like lead and drums, mixed with a hall reverb,
a ping-pong delay, chorus and a sidechain pump.

| Song | Where | Style |
|---|---|---|
| Pop Parade | menus | F major, 108 bpm, bright and hooky |
| Garden Groove | levels | D major, 84 bpm, lo-fi swing with tape wobble and vinyl crackle |
| Brain Bounce | levels | B♭ major, 100 bpm, bossa bounce with a whistled tune |
| Starlight | levels | C major, 72 bpm, dreamy bells and flute |

- **Songs with sections:** each song has an intro, verses, a chorus or hook, and a bridge or breakdown, with drum fills,
  cymbal swells and risers. The level songs form a playlist that carries on from level to level and hands over on the
  bar line. Settings shows the song that is playing.
- **Music around popups and wins:** behind a popup the music sounds as if from the next room. It ducks under fanfares.
- **Rebuilt sound effects:** chimes, mallets, bells, wooden taps and stereo sweeps. Every one plays in the key of the
  current song, so a combo's rising notes and the win fanfare always fit the music.
- **Mix checks without speakers:** `tools/music-render.cjs` renders every song and effect offline. It checks that every
  bar adds up and that no held melody note rubs against its chord. It measures peaks, loudness and spectrum, and writes
  MP3 previews.

**PC layout** (`css/desktop.css`, from 1000 px wide):
- **Navigation:** a rail on the left replaces the bottom bar.
- **Home:** a two-column dashboard. The world card and PLAY are on one side, the garden and the four tiles on the other.
- **A level:** three columns. The stars, moves meter, tip and coach are on the left, a much larger board is in the
  middle, and Undo, Hint, Restart and Skip are on the right with their keyboard keys written on them.
- **Other screens:** the map has bigger level nodes, the shop shows four columns, and the jigsaw hub puts the next
  puzzle beside the album. Mouse users get hover feedback.
- **Checked:** `tools/matrix.cjs` now also checks a landscape tablet (1024x768) and 1366x768, 1440x900 and 1920x1080
  screens.

**Block Garden drag and drop**, measured with the new `tools/blocks-perf.cjs` (real touch drags on a phone with the CPU
6x slower):
- **Preview on its own layer:** the preview of where a block lands, and the bar over each line that will bloom, is drawn
  on its own layer. Following the finger no longer repaints the 64 glossy cells: raster work while dragging is down 86%,
  and paint per drag fell from about 4 ms to 0.3 ms.
- **No forced layouts on a drop:** a drop no longer forces two layouts of the page.
- **Meter marker on the GPU:** the moves meter's marker glides on the GPU. In every mode, each move used to make the HUD
  lay out and repaint for 0.4 s.
- **Lighter bloom sound:** a line bloom's sound builds a fraction of the audio nodes it did (about 150 before). Long
  tasks during blooms fell from 12 to 2 in the same test.

## What's new in v7.3 (smooth in every mode)
Measured with the new `tools/mode-perf.cjs`, a slow phone simulated with the CPU 6× slower at 2.75× pixel density
(stutter = a frame over 34 ms; "—" = not measured before):

| Mode | Playing moves, before → after | Finish and win card, before → after |
|---|---|---|
| Picture Pop | 32 fps, 18 stutters → 55 fps, 8 | 27 fps, 26 stutters → 43 fps, 18 |
| Sand Tubes | 35 fps, 27 stutters → 49 fps, 10 | 26 fps, 30 stutters → 38 fps, 17 |
| Arrow Escape | 37 fps, 20 stutters → 56 fps, 4 | 51 fps, 5 stutters → 48 fps, 7 (the same, within run-to-run noise) |
| Merge Bloom | 36 fps, 20 stutters → 54 fps, 5 | — → 47 fps, 6 |
| Block Garden | 45 fps, 14 stutters → 54 fps, 7 | — → 39 fps, 11 |
| Star Threads | 58 fps, 0 stutters → 59 fps, 0 | 29 fps, 35 stutters → 34 fps, 16 |
| Jigsaw | 37 fps, 21 stutters → 52 fps, 8 | — → 38 fps, 15 |

Opening a Picture Pop level went from a 692 ms freeze to a longest task of ~240 ms. The win card's opening went from
107 ms of blocked work to 14 ms.

- **Picture Pop draws each picture once:** each picture becomes an image, kept on the device, so this happens once.
  Tiles, the finished-picture overlay and the peek then show that image instead of every tile redrawing the whole
  scene. The first time, a tile shows a soft card back for a moment. The peek's hint is now a small card and two
  short lines, so it no longer wraps onto four lines on an iPhone SE.
- **Calmer background in a level:** the animated background is drawn once and holds still while you play any mode. It
  is behind the board and barely seen, but it cost every frame.
- **Cheaper particles:**
  - Every shape is drawn once per colour into a small sprite, and those for a win are made in a quiet moment after
    start-up.
  - Particles off screen are skipped.
  - Confetti uses 130 pieces instead of 180.
- **No re-measuring mid-animation:**
  - Sand Tubes measures the tubes before a pour, not after.
  - Arrow Escape measures the cell size once per board size.
  - Block Garden's tray redraws only the slots that changed.
  - Effects restart their animations without re-measuring the page.
  - The screen size is read once, not on every effect.
  - A popup focuses its button a frame later.
- **Shines on the GPU:** the shine on buttons and on a finished picture now slides on the GPU. Sliding it the old way
  made the page lay itself out on every frame.
- **Popups:** only the background scenery and the board pause behind a popup. Marking every element on the page made
  opening one restyle the whole page. Board loops (a hint pulsing, a finished constellation twinkling) wait under a
  popup and carry on when it closes.
- **Star Threads finish:** the light runs along the whole path in about a second, so it ends before the win card. The
  stars twinkle a few times and then hold still.

## What's new in v7.2 (Jigsaw on slower phones)
Measured with `tools/jig-perf.cjs`, a slow phone simulated with the CPU 6× slower at 2.75× pixel density:

| | before | after |
|---|---|---|
| Opening a puzzle from the gallery or the win card | 914 ms freeze, ~2 s blocked, 14 stutters | longest task ~100 ms, 3–4 stutters, 55 fps |
| Moving pieces | 54 fps, 5 stutters | 59 fps, 1–2 stutters |
| Dragging | 58 fps | 60 fps, no stutters |
| Opening the gallery | 634 ms freeze | longest task ~100–160 ms; on later visits every picture shows at once |

- **The board paints a bitmap:** a JPEG of the picture is made once at screen resolution, instead of every piece
  redrawing the SVG scene. It is a little softer on slower devices, which means far fewer pixels to draw.
- **Picture made ahead:** the next puzzle's picture is prepared while you look at the gallery or the win card, so the
  opening plays smoothly.
- **Cheaper cards:**
  - Each card is one styled box instead of three.
  - Seams switch at once (the light zip covers the moment) instead of animating on every frame.
  - Flashes, glows, shines and the progress bar run on the GPU.
  - Only pieces that actually changed are touched.
  - A drag is applied once per screen frame.
  - No code forces the browser to re-measure the page in the middle of an animation.
- **Album thumbnails** are made one at a time in quiet moments and kept between visits. A finished picture's thumbnail
  comes free from its board picture. The gallery cover is a tiny thumbnail stretched up, so it looks blurred without a
  blur filter.
- **Particles adapt:** when frames run slowly, effects let in fewer new particles (this helps every mode). The finish
  uses fewer bursts.
- **Lighter tiers:** low and medium graphics drop the opening spin, the drop shadow under a lifted group and the seam
  sparkles. The background animation pauses behind a jigsaw.

## What's new in v7.1 (Jigsaw feel)
- **Opening reveal:** each puzzle opens on the whole picture with a shine. It then cracks into cards that spin and fly to
  their shuffled spots. Tap to skip.
- **Drag feel:**
  - Pressing a piece lights up the whole group that will move.
  - A lifted group grows a little and leans with your swipe.
  - It lands with a small squash, and pushed-aside pieces glint as they settle.
- **Locks:**
  - A line of light zips along every new seam.
  - The lock chime climbs in pitch as the picture comes together.
  - Several locks in one move earn "Nice!", "Great!" or "Amazing!".
- **Progress strip:** a bar under the board shows how much of the picture is done, with cheers at halfway and at 80%.
- **Guidance:**
  - Hints show a finger dragging the piece to its spot.
  - The first puzzle shows the same finger until you make your first move.
- **Finish:**
  - A wave of light runs across the picture and sparkles circle the frame.
  - The finished picture flies off the board into the win card.
  - Back in the gallery, it stamps into its album slot.
  - The Continue button shows the next puzzle's piece count.
- **Space pictures:** now colourful all over (nebulas and the Milky Way), so their pieces are easy to tell apart.

## What's new in v7 (Jigsaw)
- **New: Jigsaw**, an endless picture-puzzle track with its own tab, gallery, album pages, quests and 4 trophies (see above).
- **Merge Bloom** plays on a wooden planter of soil beds instead of flat green squares.
- **Tests:** new regression checks J1–J6 cover unlocking, every grid size solving, locks never breaking under random play,
  drag preview, keeping an unfinished puzzle, album page bonuses and picture variety. The 6-device layout check now
  includes the Jigsaw hub, board and win card.

## What's new in v6 (worlds and difficulty)
- **Difficulty that keeps rising.** Before, every mode hit its hardest boards by about level 50. Now difficulty climbs smoothly up to about level 300, and new players get a gentler start.
- **Each 12-level world has a rhythm.** Two easy warm-ups, a steady build, a few breathers, and a 🔥 **World finale** as level 12.
- **World finales:**
  - marked with 🔥 on the map, the home card, the level panel and the level intro;
  - pay bonus coins;
  - clearing one the first time shows a **World complete** banner with a coin and hint reward.
- **The win card shows what's next.** The Continue button shows the next level's mode icon.
- **Economy rebalanced** around the new rewards (economy-sim passes).
- **New animated Levels background:** a moonlit enchanted valley with a castle, floating islands, a lake and glowing crystals. It moves with northern lights, twinkling and shooting stars, drifting clouds and mist, flowing waterfalls, lake shimmer and fireflies. Everything runs on cheap transform and opacity animations, and it goes still in low-graphics or reduced-motion mode.

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
- `js/perf.js`: quality tiers. `js/audio.js`: the audio engine and the sound effects. `js/music.js`: the songs and the band
  that plays them. `js/fx.js`: particles, animated background.
- `css/desktop.css`: the layout for computers and landscape tablets (loaded last).
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
| `matrix.cjs` | Six phones, a landscape tablet and three computer screens x every screen: scroll, off-screen controls, tap-target sizes |
| `perf.cjs [rate]` | fps and long tasks under CPU throttling (`GFX=high|med|low`) |
| `music-render.cjs [secs] [song ...] [--sfx] [--parts]` | Renders the songs and effects offline: notation and harmony checks, levels, spectrum, MP3 previews in `music-out/` |
| `pics-perf.cjs [phone\|desktop] [rate] [drags]` | Picture Pop under load: real drags of the solver's swaps, frame by frame |
| `blocks-perf.cjs [rate] [drags]` | Block Garden on a slow phone: real touch drags and drops, frame by frame, and what gets repainted |
| `mode-perf.cjs [rate] [mode ...]` | Every mode on a slow phone: opening, playing moves, finish and win card (fps, stutters, longest task) |
| `jig-perf.cjs [rate]` | Jigsaw on a slow phone: opening, moves, drags, the gallery |
| `economy-sim.cjs` | Economy targets for three player types |
| `migration.cjs` | An old save upgrades correctly |
| `regress.cjs [filter]` | Pass/fail checks for every fixed bug and the Picture Pop rules |

See `PLAN.md` (v2) and `PLAN-v3.md` (this update).
