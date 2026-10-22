# Touchline — animation overhaul plan

A step-by-step plan for the next coding agent. Goal: the match animation should look professional, coherent and
visually appealing, and every menu should feel fluid. Read `HANDOFF.md` and `CLAUDE.md` first; this document assumes
them. Everything here was measured on the v16 build on 2026-10-22 in headless Chromium (software rendering, so the
absolute numbers are pessimistic; compare relative changes, and re-measure on a real laptop and phone when you can).

Reproduce the baseline at any time:

```
python3 build.py
node test/plan/perf.js 1440 900 1        # live-match fps, draw/update ms, long tasks, menu render ms (args: W H dpr)
node test/plan/perf.js 390 844 3
node test/plan/startperf.js              # start-screen fps attribution (beams / parade / demo canvas / logo)
node test/plan/uiperf.js                 # per-route render ms, HTML KB, DOM nodes, SVG filters, after 6 sim rounds
node test/plan/capture_live.js 1440 900 d 1   # 21 live frames + preview + tactical  -> test/shots/plan/
node test/plan/capture_phone.js          # phone frames (390×844 @2x)
node test/plan/capture_lab.js            # 2× close-ups of 5 animation-lab scenes (dribble, keeper, header, pens, tackle)
```

Look at the frames in `test/shots/plan/` before changing anything, and keep them: they are the "before" pack for every
comparison sheet this plan asks for.

---

## 0. The decision: keep the simulation, replace the painter with a WebGL renderer, keep 2D as the fallback

### What exists (see `DEVELOPER_NOTES.md` and the map in §A)

The broadcast view (`src/ui_stage.js`, class `Stage`) is already split cleanly in two halves:

1. **Simulation and choreography**: a 120 Hz fixed-step `update()`, steering, the choreography primitives (pass, dribble,
   tackle, shot sequences, set pieces, celebrations), the ball flight model, the net springs, and the **pose solver**
   (`poseOf` → `blendPose` → `ik3`). The pose solver is fully three-dimensional: every joint is solved in the player's
   own frame (forward, up, lateral), then turned by his yaw. Only the last step flattens it.
2. **Painting**: `drawBroadcast`/`drawFigure`/`drawGoal`/crowd/weather, which push the 3-D joints through a fixed-tilt
   trapezoid camera (`proj`) and paint strokes and fills on a 2-D canvas.

The first half is good, deterministic and covered by 36 suites. The second half is the limit.

### Why the painter is the limit (evidence from the frames and numbers)

| Finding | Evidence |
|---|---|
| No real perspective. The camera is a fixed-tilt trapezoid: screen y is linear in depth, horizontal scale ramps 0.56→1.0, it pans only in x and zooms. Figures are orthographic inside themselves. Nothing ever foreshortens, the camera never tilts or dollies, replays are the same angle as live play. | `proj()` at `ui_stage.js:913`; `pr()` in `drawFigure`; `d-live-*.png`, `d-tactical.png` |
| No lighting model. Shadows are flat ellipses, shading is a fixed gradient per limb, the floodlight "pools" are soft green blobs painted on the turf that read as artefacts at 2× (`lab-keeper-1.png`, `lab-pens-1.png`). | `drawBroadcast` light pools; `drawFigure` shadow |
| Figures are paper-doll vectors: disc heads with dot eyes, stroke limbs, no volume or self-shadowing, hair as a cap. Fine at 20 px, thin at 60 px (`lab-dribble-1.png`, `lab-header-2.png`). | `drawFigure` 1182–1321 |
| The crowd is ~1,500 `fillRect`+`arc` dots, blocky at 2×, and only one stand exists (no near side, no ends). After a goal it is drawn live per fan for ~4.5 s. | `genCrowd`, `drawCrowdFast`, `d-live-05.png` |
| Everything is CPU work every frame: ~30 gradients, ~600 `proj` calls per goal net, text, clip regions, per-figure save/restore. | §A.7 |
| Measured: live match **26.6 fps at 1440×900 DPR 1** (draw 6.7 ms, 2.0 s of long tasks per 8 s, render scale auto-dropped to 0.76); **14 fps at DPR 2** (7.4 s of long tasks per 8 s). Phone 390×844: 54 fps. v15 notes quote 41 fps on a faster box. | `test/plan/perf.js` |

Each of these is either impossible or very expensive to fix in Canvas 2D, and each is what a GPU renderer does
natively: a perspective camera, directional light with shadow maps, volumetric characters, an instanced crowd with
thousands of fans in four stands, and drawing cost that no longer scales with the pixel count on the CPU.

### Why it is feasible here

- The pose solver already produces 3-D joints. A 3-D figure is **modelling**, not re-animating: capsules between the
  existing hip/knee/ankle/shoulder/elbow/hand points, a head on the existing neck, the existing yaw and lean.
- The simulation keeps running unchanged, so results, tests (`sync.js`, `goalcap.js`, `postcap.js`, the v13 audit hash)
  and the choreography stay exactly as they are. The renderer is presentation only, as the broadcast always was.
- three.js r186 minified with esbuild is **376 KB (92 KB gzip)**; the build is 1.35 MB today. Still one file, still no
  network at runtime. (`npm i three@0.186.1`, then `npx esbuild node_modules/three/build/three.module.js --minify
  --format=esm`; vendor the output and the MIT licence into `vendor/`.)
- WebGL2 is available in the headless test browser (software, slow), so the 3-D path can be smoke-tested in CI.

### What stays 2-D

The 2-D painter is not deleted. It remains the renderer for: no WebGL / context lost, `prefers-reduced-motion` and
`PREFS.rm`, a user toggle (`PREFS.renderer='2d'`), devices that fail the performance probe (§3.8), and, until Phase 4
migrates them, the Courier photo stage, TouchlineTV, Wrapped, the kit lab and the appearance preview. Phase 2 improves
the shared simulation, so the 2-D fallback gets better too.

### If the character gate fails

Phase 3.3 has a hard gate: the 3-D figure must look better than the 2-D vector at every size on the comparison sheet.
If after two honest attempts it does not, stop the 3-D track at 3.2 (stadium, pitch, lighting, camera, crowd in 3-D) and
keep the 2-D figures as camera-facing billboards drawn into a 2-D overlay projected by the 3-D camera. That hybrid still
removes every finding above except "paper-doll figures", and it is a legitimate shipping state.

---

## 1. Art direction (the "coherent" part)

Decide these once and write them at the top of `DEVELOPER_NOTES.md` under the new version. Every later step checks
against them.

- **Setting**: a high-school field on a Friday evening. Floodlit, a little mist in the beams at night; golden hour and
  overcast variants already exist in `wx` and must survive. Small stadium: one covered main stand, open bleachers on the
  far side and behind the goals, a scoreboard, a hanging video board, LED boards, dugouts. Not a 60,000-seat arena.
- **Look**: stylised, not photoreal. Flat-ish toon shading with one warm key light (floodlights) and a cool fill (sky),
  soft contact shadows, a thin dark outline on figures so they read at 20 px (this is what makes the 3-D figures match the
  mascot art and the existing 2-D vectors). Proportions: heads slightly large (1:6.5), simple faces, team-colour kits with
  the existing `paintKitPattern` designs as textures.
- **Motion principles**: ease-in/ease-out on everything (no linear lerps left anywhere), anticipation before strikes and
  jumps, follow-through after, weight shifts on turns, no teleports (every cut is a camera cut, never a player jump), the
  camera is a cameraman (damped, anticipates, never jitters, always frames the ball and the goal when it matters).
- **Colour**: the pitch is the only large green; team colours come from `--team*`; amber `--accent` only for live/action
  UI chrome, never painted into the scene except the real LED boards.
- **Typography in the scene**: Big Shoulders on boards and ribbons, JetBrains Mono for digits, as now.
- **Timing budget**: simulation 120 Hz fixed; draw ≤ 8 ms on a 2019 laptop at 1440×900, ≤ 12 ms on a 2021 mid phone at
  its native DPR; menus ≤ 16 ms per route render, warm; zero layout-property transitions.

---

## 2. Phase plan

Each phase is a shippable version (rebuild, suites, screenshots, What's New entry, `DEVELOPER_NOTES.md` section, as
`CLAUDE.md` requires). Phases are ordered so the user sees improvement early and the risky work is gated.

| Phase | Version | What the user gets | Gate |
|---|---|---|---|
| 0 | 17.0 | measurement harness, renderer switch, no visible change | numbers reproducible |
| 1 | 17.1 | **UI fluidity mini-update** (the explicit ask) | targets in §2.1 |
| 2 | 17.2 | smoother, more believable motion in the existing 2-D view | checklist in §2.2 |
| 3 | 18.0 | the 3-D broadcast renderer, 2-D fallback kept | gates in §2.3 |
| 4 | 18.1 | cinematics: replays, director cuts, walkout, TV/photos in 3-D | §2.4 |
| 5 | 18.2 | device QA, polish, release | §2.5 |

---

### Phase 0 — Foundations (one session)

1. **Perf harness in the repo.** Promote `test/plan/perf.js`, `uiperf.js`, `startperf.js` into one `test/perf.js` that
   prints a single JSON line per profile (desktop DPR 1, desktop DPR 2, phone) and exits 0; add `--json out.json`. Keep it
   out of `run_all.sh` (it is a measurement, not a test). Record the baseline in `DEVELOPER_NOTES.md`.
2. **Renderer switch.** Add `PREFS.renderer: 'auto'|'3d'|'2d'` (default `auto`) in `DEFAULT_PREFS` (`ui_core.js:10`) and
   a row in Settings → Appearance (`ui_views.js:610`). Nothing reads it yet except a `rendererFor()` helper that returns
   `'2d'` for everything until Phase 3.
3. **Stage housekeeping that both renderers need** (all in a new `src/ui_stage2.js` appended to the build, wrapping
   `Stage.prototype` methods; do not edit `ui_stage.js` where a wrapper will do):
   - Adaptive render scale scales **back up** when frames are fast again (`loop`, 855–862: it only ever drops).
   - A paused stage draws at most 2 fps (it currently redraws fully every frame while paused).
   - A stage whose canvas is off-screen or whose tab is hidden stops drawing (`IntersectionObserver` +
     `visibilitychange`); the start-screen demo in particular.
   - `Fireworks`, `figurePreview`, `celebPreview`, `klFigLoop` stop their rAF loops when done or hidden.
4. **Tests**: `test/stage2.js` (render scale recovers; paused stage idles; hidden stage idles). Run `run_all.sh`.

### Phase 1 — UI fluidity mini-update (one to two sessions)

Targets (headless numbers from the baseline; real devices will be better, the ratios are what matter):

| Metric | Baseline | Target |
|---|---|---|
| Start screen fps, 1440×900 | 7–9 | ≥ 30 headless (≥ 55 on a real GPU) |
| Any route `render()` warm | office 18–25 ms, squads 27–46, schedule 46–64, school 32–67, kits 46–60, league 29–40 | every route ≤ 20 ms warm, ≤ 40 ms cold |
| Route HTML | schedule 293 KB / 4,058 nodes / 184 SVG | ≤ 120 KB / ≤ 1,800 nodes on first paint |
| Transitions on `width`/`height`/`all` | 9 rules | 0 |
| Long tasks during sim-ahead | worst ≈ 250 ms | ≤ 50 ms |

Steps, in order of payoff:

1. **Start screen** (`ui_views.js` start view, `style.css` 360–420). Measured attribution: the two blurred `.beam`s cost
   ~4 fps, the demo canvas ~7 fps, the logo `shine`/`letterin` (background-position + `filter: blur`) ~7 fps, and the
   parade carries **72 SVG filters** (one per mascot instance).
   - Render the 36-mascot parade **once** into a single wide canvas strip (`mascotSVG` → `Image` → `drawImage`), and
     animate that strip with a transform. Zero live SVG filters on the start screen.
   - Replace the `.beam` blur with a pre-blurred radial gradient (CSS gradient, no `filter`), transform-only sway.
   - Logo shine: animate a `mask-image`/`background-position` on a pseudo-element without `filter`; drop `letterin`'s
     blur (opacity + translate only).
   - Demo stage: cap at 30 fps (`since>=33`), stop when a modal or the career form covers it, stop when the tab hides.
2. **Mascot SVG cache.** `mascotSVG(key,c1,c2,size)` is rebuilt for every render; cache the string by
   `key|c1|c2|size|lite`, and use the lite path (no filter) for anything under 60 px in tables and lists. Check the
   school view (40 filters) and the league table (10) fall to ≤ 4 filters each.
3. **Heavy routes.**
   - Schedule: render only the current and next 2 rounds expanded; earlier rounds collapsed (one row each) with
     `content-visibility:auto; contain-intrinsic-size` on each round card. Same treatment for `school` history and the
     kits gallery (render kit cards lazily as they scroll into view, `IntersectionObserver`).
   - Squads: the player rows build `portraitSVG` per row; cache per player id + look hash.
   - Keep `render()` whole-shell, but add a fast path: when `App.route` and the shell inputs are unchanged, replace only
     `.content` (`innerHTML` on the content node) and leave the top nav, tab bar and sidebar alone. Measure with
     `uiperf.js` before and after.
4. **Transitions on layout properties → transforms.** `.wb-track i`, `.possbar i`, `.sq-unit .bar i`, `.pro-know i`,
   `.walk-prog i`, `.tabs-ind::after`, `.sv-bar i` (width), `.pa-mic i` (height), `.sn-dot` (all). Use `transform:
   scaleX()` with `transform-origin:left` (bars) and translate+scale (tab indicator; `tabIndicators` in `ui_v8.js:335`
   should set `--x` and `--w` custom properties and let CSS do `transform`). The `#simov` progress bar: throttle updates
   to one per animation frame.
5. **Sim-ahead stalls**: `A.simAhead` (`ui_v15.js:132`) yields every ~12 ms but each chunk can still run 250 ms when a
   round contains full match sims; split per fixture and yield with `scheduler.yield?.()` or `setTimeout(0)`.
6. **Live screen DOM**: `renderFeed` rebuilds the whole feed; append new items only. `updateLive` already diffs the
   score; make the possession bar a transform. Tab switches (`A.liveTab`) must not touch the canvas.
7. **Touch feel**: `touch-action: manipulation` on buttons, `:active` feedback within 50 ms, passive listeners on scroll
   containers, `overscroll-behavior: contain` on the drawer and modals.
8. **Verify**: `uiperf.js`, `startperf.js`, screenshots desktop/phone across the theme presets (night, gold, crimson,
   emerald, stealth, titanium, slate, flood, light custom), the `v8ui`, `v13`, `ui3`, `features` suites. Add
   `test/ui_fluid.js` asserting the metric table above (headless thresholds).

### Phase 2 — Motion quality in the shared simulation (two sessions)

Renderer-agnostic work in `ui_stage2.js` (wrappers) with surgical edits in `ui_stage.js` only where a wrapper cannot
reach. The 2-D view ships these immediately; the 3-D renderer inherits them.

1. **Interpolate everything the eye tracks.** `drawLerp` interpolates x/y of players and the ball only. Add yaw (shortest
   arc), gait phase `ph`, `lift`, `lean`, `hipU`, and the camera `x`/`w`. Store previous values in `keepPrev`.
   Without this, at 26 fps with a 120 Hz sim every figure's facing and stride visibly stutters.
2. **Camera as a cameraman** (new `CamDirector` object owned by the Stage, replacing the two lines at `update()` "camera").
   - Critically-damped spring on x (and y/tilt in 3-D) with velocity feed-forward from the ball (look-ahead ∝ ball speed,
     capped), dead zone so a dribbler does not drag the frame every step.
   - Framing rules: open play shows ball + the nearest goal edge when within 35 m; set pieces frame kicker and goal;
     penalties and shootouts cut to a low behind-the-kicker angle (3-D) / tighter zoom (2-D); goal: hold the celebration
     at 0.66 then pull back for the restart.
   - Hard cuts only at natural breaks (restarts, replays, half time), with a 120 ms dip-to-black; never a hard cut in
     open play.
   - Reduced motion: no springs, no shake, straight follow.
3. **Ball.** Spin axis from velocity × up (so the ball rolls the way it travels; today the pentagons tumble on two fixed
   axes). Cosmetic curl on crosses and shots: bend the scripted path with a sideways offset ∝ `sin(πt)` toward the
   target (the target and timing are unchanged, so the engine result and `sync.js` are untouched). Squash on bounce,
   a motion-blur trail only above 18 m/s, ball shadow softens with height.
4. **Figures.** (a) hips rotate ahead of shoulders on turns (`turnLean` exists; add a hip yaw offset ±0.25 rad decaying
   over 200 ms); (b) head look-at: eyes on the ball unless celebrating; (c) kicks: 60 ms anticipation dip and a 120 ms
   recovery step after the follow-through; (d) landing from headers and dives compresses the knees for 100 ms; (e)
   arrival: decelerate into the target over the last 1.5 m instead of `want=min(v,d*2.6)` which still stops abruptly;
   (f) idle variety: three idle poses with per-seed selection so a line of defenders does not breathe in unison.
5. **Group moments.** Celebrations: teammates converge with staggered arrival (seeded), not all at once; the scorer's
   signature celebration gets a 1.5 s hold before the mob. Kick-off: a 400 ms "ready" beat with the referee's whistle
   arm. Full time: handshakes along the halfway line in 2 s, not instant dispersal.
6. **Verify**: extend `test/anim.js` (interpolated yaw never jumps > 0.3 rad per drawn frame; camera speed is continuous;
   foot-plant slip still < 20 %), `v13.js`, `sync.js`, `goalcap.js`, `postcap.js`, `v13_audit.js` hash unchanged.
   Capture `capture_lab.js` again and build a before/after sheet (`test/plan/sheet.py`, PIL is available) of the five
   scenes; it goes in the notes.

### Phase 3 — The 3-D broadcast renderer (four to six sessions; the core of this plan)

Architecture: a new `src/ui_stage3d.js` (after `ui_stage.js`) with class `Painter3D`. The `Stage` keeps its canvas for
HUD (minimap, captions, confetti, flash) as a transparent overlay; the WebGL canvas sits beneath it in `.lv-stage`.
`Stage.draw()` becomes: `if(this.p3d) this.p3d.render(this, alpha) else drawBroadcast(...)`, with `drawBroadcast` still
drawing the HUD part when `p3d` is on. `Painter3D` reads only public simulation state (players, ball, ref, ars, cam
target, hype, flash, shake, netD, wx, kits, looks) and never writes it.

3.1 **Scaffold**
   - `vendor/three.min.js`: three r186 bundled by esbuild as a minified IIFE with `--global-name=THREE`, tree-shaken to
     the classes the renderer imports (`vendor/three-entry.js` lists them; rebuild with
     `npx esbuild@0.27.3 vendor/three-entry.js --bundle --minify --format=iife --global-name=THREE --legal-comments=none
     --outfile=vendor/three.min.js`). Measured 2026-10-22: 602 KB minified / 152 KB gzip for a full renderer set (the
     WebGL renderer pulls in nearly all shader chunks; the whole library is 743 KB). MIT licence in
     `vendor/three-LICENSE`. `build.py` embeds it as its own `<script>` before the game script. Build size check:
     ≤ 2.1 MB (was 1.35 MB).
   - Headless findings (2026-10-22): WebGL2 works in the test Chromium via software rendering; a lit pitch with a 2048
     shadow map, 22 capsule figures and 6,000 instanced fans renders correctly at ~3.8 fps (170 draw calls, 103k
     triangles). So 3-D suites must force `PREFS.renderer='3d'` and a tier, and must not assert frame rates; the
     probe in headless correctly falls back to 2-D. `PCFSoftShadowMap` is removed in r186 (use `PCFShadowMap` or
     `VSMShadowMap`).
   - Axes: stage metres map to three.js as `x = X` (0..105 along the pitch), `z = Y` (0 = far touchline with the main
     stand, 68 = near touchline), `y = Z` (height). The broadcast camera sits behind and above the NEAR touchline
     (z ≈ 68 + 40, y ≈ 20 at zoom 1), looking toward the far stand at the stage's `cam.x`, exactly like today's view
     where the near touchline is the bottom of the screen.
   - `Painter3D(stage)`: renderer (`antialias` per tier, `powerPreference:'high-performance'`, pixel ratio ≤ 1.5 × rs),
     `PerspectiveCamera` (fov ~30°), scene, `DirectionalLight` with a shadow map covering the pitch, `HemisphereLight`
     fill, fog for the night mist. Context-lost handler falls back to 2-D in place.
   - Module contract (so pitch/stadium, figures, ball/effects, crowd and camera can be built in parallel files):
     `P3D_MODULES.push({name, order, init(P), frame(P, st, alpha), resize(P), dispose(P)})`. `P` is the Painter3D
     (`P.T` = THREE, `P.scene`, `P.camera`, `P.renderer`, `P.tier`, `P.st` = the Stage, `P.v3(X,Y,Z)` → `THREE.Vector3`,
     `P.track(obj)` registers geometries/materials/textures for disposal, `P.night`, `P.wx`). Modules only read
     simulation state. Each module lives in its own `src/v17/6x_p3d_*.js` file.
   - Camera mapping: `cam.w` (metres visible at the near touchline) → camera distance so `zoomTo` keeps working.
   - Gate: an empty lit pitch plane with markings renders at ≥ 55 fps on a laptop GPU; the live screen, TV, lab and
     Wrapped all still run on 2-D when `rendererFor()==='2d'`.

3.2 **Pitch and stadium**
   - Pitch: a plane with a procedurally generated `CanvasTexture` (stripes, wear, noise; generate at 2048×1365 once per
     stage), markings as a second texture layer, goal mouth wear. Normal variation via a small bump texture.
   - Goals: cylinder posts, nets as `LineSegments` whose vertices are displaced by the existing `netPoint` bulge from
     `netD` each frame (the 2-D net spring stays the source of truth).
   - Stadium: main stand (lower tier, hospitality boxes, upper tier, roof with downlights), open bleachers far side and
     behind both goals (so the end-camera angles in Phase 4 have something to look at), dugouts with the two coaches,
     scoreboard, hanging video board (a `CanvasTexture` updated at 4 Hz from `board()`), LED boards (texture scrolled
     by offset), four floodlight masts with sprite glows, corner flags (sine wave), end fences.
   - Weather/time: night/golden/overcast/rain/snow skies as gradient textures on a dome; rain/snow as a `Points` system
     in camera space; floodlight beams as additive cones at night.
   - Gate: screenshots in all four weather states at 1440×900 and 390×844 compared to the 2-D frames; the pitch reads as
     grass, lines are crisp at both sizes, no shadow acne, ≥ 50 fps laptop.

3.3 **Characters (the gated step)**
   - Build one procedural mannequin: capsule limbs between the solved joints (`legs[i].hip/knee/ank`,
     `arms[i].sh/el/hand` in body space, from a refactored `solveFigure(p)` extracted from `drawFigure` so both painters
     share it), a tapered torso (`LatheGeometry`), shorts, a head sphere with a simple face texture, hair meshes per
     `LOOK.hair` style (13 styles: a cap, a bun, locs as capsules, an afro sphere, etc.), boots, keeper gloves, wrist tape,
     headband. Materials: `MeshToonMaterial` with a 3-step gradient map plus an inverted-hull outline mesh
     (`BackSide`, scale 1.03, black). Kit: `paintKitPattern` rendered into a `CanvasTexture` per kit (cached per
     school), numbers on back and chest as part of that texture, collar and sleeve variants as texture regions.
   - Skin tones, builds (`lean/average/stocky` scale x/z), heights, from `looks.js` as now.
   - Prototype result (2026-10-22, `test/plan/proto_fig3d/`): driving capsule-and-sphere toon figures from the existing
     `poseOf`/`blendPose`/`ik3` output works. Running, a struck shot, a header jump, a keeper dive and a celebration all
     read correctly with real cast shadows, and at broadcast distance they already read better than the 2-D vectors.
     Up close they look like plain mannequins. What the module must add: shorts that stop mid-thigh with skin below,
     short sleeves with skin forearms, capsules sized so joints do not bead, a face (eyes, brows, nose, mouth, ears), the
     13 hair styles as meshes, boots with a sole and toe, shirt numbers, collar/trim, keeper gloves. Body units map to
     metres at about 0.92 × height/70 (head top ≈ 1.9 m for a 70-inch player); the slight exaggeration keeps players
     readable at broadcast distance.
   - Draw calls: one mesh per body part per figure (×2 for outlines) is ~1,700 draw calls for 27 figures, too many for
     weak GPUs. Render by PART instead: one `InstancedMesh` per part kind (thigh, shin, torso, head, hair style, boot …)
     across all figures, with per-instance colour (`instanceColor`) and, for patterned shirts/shorts/socks, a per-instance
     index into a small kit atlas (home, away, both keepers, officials) read in an `onBeforeCompile` patch; numbers as
     instanced quads from a digit atlas. Outline = the same instanced geometry drawn with a back-face material whose
     vertex shader pushes along the normal by a distance-scaled amount (constant screen thickness). That is ~40–60 draw
     calls for every figure on the pitch, and per-frame work is setting ~900 instance matrices.
   - Whole-body rotations: the 2-D painter rotates in the screen plane. In 3-D, `dive`, `airplane` and the run's
     `turnLean` roll about the body's forward axis; `fall`, `trip`, `backflip` and `flag` pitch about the lateral axis.
   - Per-frame update: one `Object3D` hierarchy per figure, joint positions set from the solver, limb capsules oriented
     with `lookAt`, yaw/lean/rot applied on the root (dives and backflips use `P.rot` about `P.pivot` exactly as now).
   - Shadows: cast and receive on the pitch plane.
   - **Gate** (hard): a sheet of the five lab scenes at 2× and the same scenes at phone size, 2-D vs 3-D side by side, plus
     a 36-figure "line-up" at 20 px, 40 px and 120 px. The 3-D must look better at every size to the user. If it does
     not after two attempts, fall back to the hybrid in §0.
   - Tests: `test/figures3d.js`: joint positions in 3-D match the 2-D solver within 1 cm; no NaNs across all poses
     (`poseOf` act list in §A.3); outline visible at 20 px (pixel probe).

3.4 **Ball**: sphere with a procedural panel texture, spin from Phase 2's axis, contact shadow, trail as a short
   `Line2` only on shots. Net interaction already handled by 3.2.

3.5 **Crowd**: `InstancedMesh` of a 12-triangle fan (body + head), ~6,000 instances across the four stands, per-instance
   colour (home/away/neutral mix, scarves), vertex-shader bounce driven by a `uHype` uniform and per-instance phase so a
   goal makes the whole ground jump with zero CPU work; flag-wavers as a second instanced mesh with a waving quad.
   Camera-flash sprites from `bulbs`. Gate: ≥ 55 fps laptop with the crowd on; crowd off on the phone tier if needed.

3.6 **Effects**: confetti as instanced quads, goal flash as a post tint, screen shake on the camera rig, floodlight
   flare sprites, turf flecks as small instanced quads. Reduced motion disables all of them.

3.7 **Camera director in 3-D** (extends Phase 2's `CamDirector`): broadcast (main), low-touchline (penalties,
   shootouts), behind-the-goal (corners, goal replays), reverse angle (replays), celebration close-up (scorer at 8 m).
   Smooth dolly and tilt between presets; cuts only at breaks. Minimap stays on the HUD canvas.

3.8 **Performance tiers and fallback**
   - On first 3-D stage creation run a 1-second probe (frame time at 720p); choose tier A (shadows 2048, crowd 6k,
     AA on), B (shadows 1024, crowd 2.5k, AA off), C (no shadows, crowd 1k, pixel ratio 1), or 2-D if the probe fails
     (< 24 fps) or WebGL2 is missing. Store in `PREFS.rtier` with a "re-test" button in Settings.
   - Adaptive: the existing frame-interval EMA drops a tier at run time; recovers one tier after 20 s of fast frames.
   - Memory: dispose geometries/textures/materials in `Painter3D.dispose()` from `Stage.destroy()`; prove no growth
     over 20 consecutive matches in `test/perf3d.js`.

3.9 **Tests and tooling**
   - `run_all.sh` keeps running every suite on the 2-D renderer (`PREFS.renderer='2d'` set by `_pw.js` via
     `localStorage` before load) so the deterministic suites are unaffected by software WebGL speed.
   - New serial suites: `stage3d.js` (scaffold renders, context-loss fallback, tier probe), `figures3d.js`,
     `perf3d.js`; a `--3d` flag for `capture_lab.js`/`capture_live.js` to produce the comparison packs.
   - Animation lab gets a 2-D/3-D toggle button (`ui_sandbox.js`).

Shipping state for 18.0: `renderer:auto` picks 3-D on tier A/B/C machines for the live match and the animation lab;
everything else still on 2-D.

### Phase 4 — Cinematics (two sessions)

1. **Goal replays**: after the celebration, 1.5 s dip, replay the `e.seq` clip from the reverse angle at 0.5× with the
   `REPLAY` bug, then the behind-the-goal angle for the finish, then cut back for the restart. Skippable with a tap.
   `clipStart` already builds the clip state.
2. **Walkout** (`ui_announcer.js`): the lineup walkout becomes a 3-D tunnel-to-pitch dolly with the DOM tokens overlaid;
   the existing skip logic stays.
3. **TouchlineTV, Courier photos, Wrapped, Hall of Fame, kit lab, appearance preview**: migrate to `Painter3D` with a
   `still:true` mode that renders one frame to a texture (`toDataURL` for the Courier, as now).
4. **Start-screen demo** on 3-D at tier A/B only, 30 fps cap; 2-D strip otherwise (Phase 1).
5. **Trophy ceremony** (`ui_fx.js`): fireworks as instanced particles in the 3-D scene behind the DOM `.ceremony`.

### Phase 5 — Device QA and release (one session, plus the user's own devices)

- Real-device matrix: a 2019 Intel laptop (integrated GPU), an M-series Mac, a Windows laptop with a 144 Hz screen, an
  iPhone 12-class and an Android mid-range phone, an iPad. For each: tier chosen, fps in open play and in a goal
  celebration, menu feel, battery note after a 20-minute match. The user runs these; the agent provides a one-tap
  diagnostics overlay (`#perf` in the address bar) that shows tier, fps, draw ms, memory.
- Theme sweep screenshots (all presets, desktop and phone) for every route; `v8ui`, `v13`, `ui3` and the new suites.
- `MODALS.whatsNew` entries for 17.x and 18.x; `DEVELOPER_NOTES.md` sections with what was measured and what was not
  verified; update `HANDOFF.md` §2 (new files), §3 (renderer wiring, tiers), §5 (new measuring commands).

---

## 3. Order of work for the next session (start here)

1. Read this file, `HANDOFF.md`, `DEVELOPER_NOTES.md` top section, `src/ui_stage.js` 760–876 and 913–1006, 1079–1321.
2. Run the reproduction commands at the top; look at `test/shots/plan/`.
3. Do Phase 0 and Phase 1 completely (they are the user's explicit "mini update" and they de-risk everything after).
   Ship as 17.1 with screenshots, What's New, notes, `run_all.sh` green.
4. Phase 2, ship as 17.2.
5. Phase 3 in the sub-step order given; stop at each gate and show the user the comparison sheet before continuing.

Keep progress messages to one line each. State plainly what was not verified on real hardware.

---

## A. Reference: map of everything that animates today

(Line numbers are in `src/ui_stage.js` unless stated; they will drift, use the names.)

### A.1 Stage pipeline
- `constructor` 35–51: players Map, `ref`, two ARs (`AR()` 41–42), `ball{x,y,z,spin}`, `cam{x,w,tw}`, `trail`, `flash`,
  `hype`, `shake`, `conf`, `bulbs`, `netD`, `waiters`, `ts`/`goalTs`, `now`, `zoom`; `genCrowd()`, `resize()`,
  rAF, ResizeObserver. `destroy()` 52.
- `loop(ts)` 855–862: 120 Hz fixed step, ≤ 8 sub-steps, real step clamped to 50 ms; draw only when ≥ 15.5 ms since the
  last draw; render-scale EMA drops `rs` by 0.12 to a floor of 0.7 and never recovers; paused still draws every frame.
- `resize()` 53: `dpr=min(1.5,DPR)*rs`; `bw=clamp(W/30,20,38)` metres at the near touchline; `cam.w=bw*zoom`.
- `keepPrev`/`drawLerp` 863–868: x/y of players/ref/ARs and the ball only; skipped for jumps > 3 m (ball 6 m).
- `draw()` 869–875: shake translate, `drawTac` or `drawBroadcast`, weather, flash, confetti.
- `update(dt)` 760–853: waiters, ball (free physics `stepFree` / scripted flight / carried), `updNet`, spin, trail,
  targets (chase/ov/trail/meet/gk/formation drift), offside hold, carrier/presser, AR tracking, ref, steering
  (`vmax=7.2*sp`), gait phase, acceleration lean, `turn()`, O(n²) separation, owner clamp, camera (two lines), crowd
  audio, decays, confetti/bulbs/turf, bulb spawns.
- `zoomTo(f)` 751: goal 0.82, celebrate 0.66, penalty 0.56/0.5, shootout 0.6, full time 0.9/1.1, menu 0.92, photo 0.32.
- Tactical mode `drawTac` 886–912 (cached background, discs + numbers). Minimap `drawMini` 1340–1345.

### A.2 Projection and environment
- `proj(X,Y,Z)` 913: `v=Y/68; k=(W/cam.w)*(0.56+0.44v); y=yF+(yN-yF)v - Zk` with `yF=.265H`, `yN=.97H`.
- `drawBroadcast` 914–1006, back to front: sky gradient; stand (steel, row lines, hospitality boxes with a `hashStr` per
  box per frame, fascia, scrolling LED ribbon with `measureText`); crowd (fast strips when `hype<=0.02`, else ~1,500
  live fans; ~50 flag-wavers always live); bulbs; roof, downlights, video board (gradient, text, scanlines); two
  floodlight masts (night: two radial gradients, one full-canvas, `lighter`); pitch (surround, 20 stripes, 40 checker
  polys, grass pattern, wear ellipses, 5 light-pool gradients, vignette, crest via `transform`); markings (~9 polylines,
  9 arcs × 41 points); LED boards (gradient each); `drawDugouts` (two coaches as full figures); `drawEndFence` × 2;
  far flags; goal back halves; y-sorted players/ball/ref/ARs/goal fronts; `drawOffMark`; `drawTurf`; near flags; minimap.
- Goals: `GF{y0:30.34,y1:37.66,H:2.44,DB:2,DT:1.2,ZB:1.9}`; `drawGoal` 1044–1066 (≈600 `netPoint` projections and 75
  strokes per visible goal); `netPhys` 239–255, `netContact`, `updNet` (spring `a''=-260a-9a'`), `woodwork` 256–259.
- Weather 876–885: rain 320 particles, snow 200, night overlay + two full-screen gradients, golden/cloud/fog gradients.

### A.3 Figures
- Body frame: hip 0.8, shoulders 1.5 (±0.21·B), neck 1.62, head 1.86 (r 0.165 s); thigh/shin 0.43; upper arm 0.30,
  forearm 0.29; `s=k*(hgt/70)*1.06`; build B 0.9/1/1.14.
- `ik3` 18–21 (two-bone with pole), `ik2` 22–23. `gaitOf` 27–28.
- `poseOf` 1079–1149 acts: loco/idle, gkset (+penalty bounce), hips, fist pump 1300 ms, hold, kick (wind-up 200/165/105,
  follow-through 340/260), dribble prod, throw, head (JD 560), nod 280, dive (240 ms to 1.3 rad), slide 520, trip 420,
  fall 1100, getup 650, sad, celeb. Officials: AR flag down/up/point, referee card.
- `celebPose` 1150–1171: mob, airplane, kneeslide (momentum glide), flag, shush, backflip, salute, heart, robot, badge,
  classic. `blendPose` 1173–1180 (15/s during the first 140–260 ms of an act, 60/s after).
- `drawFigure` 1182–1321: shadow, possession ring, depth-sorted legs/torso/head/arms; legs (thigh, sock patterns, shin
  guard, boot ellipse + stripe + studs), arms (sleeve variants, gloves, tape), shorts quad, torso quad with
  `paintKitPattern` (`ui_kits.js:102`), creases, collar, crest, numbers front/back/side, head (neck, hair back, ears,
  radial-gradient face, eyes/nose/mouth, hair front 13 styles, facial hair, headband, card). ~12 size thresholds.
- `turn()` 142–161 yaw priority: AR fixed, `yawLock`, glide, dive, celebration, incoming ball, jockey, velocity, owner
  faces goal, look at ball; rate 8–11 rad/s × sp.

### A.4 Ball
- `launch` 182–208 (run-up, square-up, wind-up, release) → `fl{from,to|home,t0,dur,h,kind,ground,aim}`; flight easing
  `flE` toward the live `flightTarget`; `land` 215–221; `stepFree` 226–238 (gravity, drag, bounce 0.5, friction, nets,
  woodwork, fences); dribble lead 774–785; spin cosmetic on two fixed axes; `drawBall` 1070–1073, `drawFootball`
  1348–1360 (12 pentagons, save/restore each).

### A.5 Choreography
- Driver `ui_live.js:127–169` (`animateMinute` → `soKick`/`shootoutSetup`/`shotSeq`+`goalSequence`+`cardSeq`/`playMinute`).
  Speeds `SPEED_MS{1:1500,2:780,4:400,8:200}`, `ts=clamp(W/1500,.12,1.1)`, `GOAL_TS{1:1,2:.8,4:.55,8:.4}`,
  `D(ms)=max(55,ms*ts)`.
- Timers `wait`/`until`/`cancel` 131–137 on the stage clock. Primitives: `gain` 314, `pass` 327, `tackle` 334, `fetch`
  348, `place` 355, `playMinute` 362, `stageSpace` 378, `shotSeq` 384, `quickFlag` 450, `offsideSeq` 453, `throwIn`
  470, `cornerKick` 484, `goalSequence` 500, `breakLine`/`breakaway` 536, `celebrate` 558, `restartAfterGoal` 583,
  `finish` 598, `penStrike` 661, `soArrange` 705, `soKick` 718, `fullTime` 742, `halftime` 750, `clipStart` 103.

### A.6 Animation outside the Stage
- Other stages: start-screen demo `startMenuShow` 1365–1381; match-report highlights `App.hl` (`ui_main.js:141`);
  TouchlineTV `tvStart` (`ui_v8.js:148`); Courier photos `shootPhoto` (`ui_v8.js:56`, off-screen 640×400 → JPEG);
  animation lab (`ui_sandbox.js`, 14 scenes); spectate (`ui_spec.js`).
- Single-figure rAF loops: `figurePreview` 1384–1401, `celebPreview` (`ui_v8.js:20`), kit lab `klFigLoop`
  (`ui_kits.js:216`). `Fireworks` (`ui_fx.js:41–60`) never self-stops while connected.
- Live DOM: `liveIntro`, goal banner, `bumpScore`, `#lv-stage.goalfx`, captions; announcer walkout
  (`ui_announcer.js:55–120`, absolute `left/top` tokens, width progress bar, 90 ms audio interval); section entrance
  `polishView` (`ui_v8.js:329`), `tabIndicators` (335, animates `width`); v15 `.tn-dd` dropdowns, `#simov` width bar.
- CSS: 65 `@keyframes` in `style.css` (list in the agent map: pulse, float ×2, fade, slidein, pop, capin, gbin, spinin,
  drop, cvin, sway/sway2 (blurred beams), letterin (blur), shine, fadeup ×2, slotin, parade 70 s, sweepl/r, rise, glow
  (infinite drop-shadow filter), turn, gbout, bump, feedin, lvi*, rays 40 s/24 s, ring (box-shadow), fadein, ftin, embers,
  sweep, npin, tvl, snsw (infinite blur), sncard, chshine, chbob, chnudge, sbpop, sbcap, ticker 60 s, sndbar, enterup,
  ripple, toastin, gflare, sobpop, wr*, pabar (height), pacall, paname, wflash, tokslam (brightness), vs*, tc*, polishIn,
  wbw). Layout-property transitions: 7 on `width`, 1 on `height`, 1 on `all` (listed in Phase 1 step 4). `.flip`
  references an undefined `flipin`.

### A.7 Hot spots measured
- Per frame: ~30 gradient objects (sky, band, board, vignette, 5 light pools, LED boards, masts, bulbs, one radial per
  figure face, 3 per close figure, ball); full-canvas `lighter` fills at night; text (ribbon, boards, crest, numbers);
  save/restore per figure/boot/head/pentagon/confetti; `proj` allocates an array per call (thousands per frame).
- Per step (120 Hz): O(n²) separation, `[...players]` spreads and filters, free-ball sub-steps up to 48.
- Crowd live per fan for ~4.5 s after every goal; flag-wavers always live.
- Baseline (headless, software): live 1440×900 DPR 1 → 26.6 fps, draw 6.7 ms, update 1.1 ms/step, long tasks 2.0 s/8 s,
  rs 0.76; DPR 2 → 14 fps, long tasks 7.4 s/8 s; phone 390×844 → 54 fps. Start screen 7–9 fps desktop, 23 phone.
  Menus warm (ms): office 18–25, squads 27–46, schedule 46–64, school 32–67, kits 46–60, league 29–40, settings 20–23,
  dev 26–34, matchday 8–17.
