# Touchline v18.5 design: two-angle goal replays and player plates

Written 2026-10-23 by two read-only design agents against the code at v18.4 (before the merge; line numbers may have shifted a
little). File numbers: the replay feature is `src/v17/76_replay2.js`, the plates are `src/v17/77_plates.js`. The execution plan is the
"v18.5 execution plan" section at the top of `ANIMATION_PLAN.md`.

# v18.5 Feature 1: two-angle goal replays (design)

Everything below about current code I checked by reading it on 2026-10-23 at about 14:40 UTC. The branches I looked at are `claude/new-session-miqhgk` (HEAD `bdb8d82`), `v18/sideline` (`84db207`) and `v18/figures` (`2437281`). Anything I could not confirm is marked **verify**.

## 1. How it works today

**Recording** (`src/v17/68_replay.js`)
- `goalSequence` is wrapped at :30-32. It sets `st._rb={buf,h,ts,tg,stop,gx,dir}` when `v18RpWant(st)` is true, and clears it in `finally`.
- `update` is wrapped at :33-40. Every second step it pushes `v18RpSnap(st)` (":35 60 Hz is plenty").
  - `R.ts` is the first `st.fl.kind==='shot'`.
  - `R.tg` is the first `inNet && ball.ing!=null`. At that moment `R.side=clamp((34-ball.y)/4,-1,1)`.
  - Recording stops `after:1200` ms past `tg`. Before `tg`, the ring is trimmed to `keep:5200` ms.
- A snapshot (:24-27) is `{now, m:[[moverObj, primitiveFields(+dive/glide/ov)]], s:{ball, own, fl (shallow copy, so fl.home is still a live object reference), inNet, bulge, flash, netD, headBall, setPiece, placed, poss, conf:[] ...}}`.
- The `goalSequence` event `e` (that is, `pid`, `ty`, `s`) is **not** stored in `_rb`. `fl` does not carry the kicker: `launch` builds `f={from,home,hands,head,to,t0,dur,h,kind,cont,res}` at `ui_stage.js:192`, and a shot adds `nod:header` (`ui_stage.js:622`).

**Gating** (`v18RpWant`, :18-19)
- Live stage only: `cv.id==='lv-canvas'` (:17).
- Off when `PREFS.replays===false`, `st.skip`, `st.so`, `st.rm`, `L.skipping`, `L.done`, tactical view, or `L.speed>=4`.
- So 1x and 2x get replays. Reduced motion, shootouts, 4x/8x and tactical never do.

**Playback**
- `restartAfterGoal` is wrapped at :101-103 and awaits `v18Replay` (:73-81).
  - Window: `t0=max(buf0, ts-900)`, `t1=min(bufEnd, tg+550)`.
  - It creates `st._rp=Q={on,done,t,t0,t1,i,R:{buf},res,gx,dir,side,side0,fov:34}`.
  - It dissolves live into replay (`v18RpDissolve`, 380 ms, :49-53), adds the overlay (REPLAY bug, "Tap to skip", pointerdown, :43-47) and sets `P.dir.snap`.
- The `loop` wrapper (:84-94) does not step the simulation.
  - `Q.t += realStep*0.5`. The snapshot index `Q.i` only moves forward (:91).
  - Each draw goes through `v18RpDraw` (:56-65), which applies the snapshot, calls `st.draw()` and restores every field in the same task.
  - The replay ends through `v18RpEnd` (:67-71) on tap, end, skip or gone. On end it draws one last frame with a dissolve, sets `dir.noFade`, then increments `App.v18Replays` and resolves.
  - `cancel` and `destroy` end it (:95-98).
- **2-D:** `v18RpDraw` :61 uses a tight framing that follows the ball (`cam.w=bw*0.62`). That is the only 2-D treatment.
- Settings: the switch is added after `.v17-rend` (:106-109).

**Director** (`src/v17/66_p3d_director.js`)
- `pick` returns `'replay'` first whenever `st._rp.on` (:41).
- The `'replay'` pose (:69-71) is high behind the goal:
  - eye `(gx+dir*(8.2-1.6u), 9.6-0.9u, 34+side*3)`
  - target: the ball pulled 18 % toward the goal
  - fov `26+min(10, d*0.3)`
- Entering or leaving replay snaps (:82). The damping is `om` 3.6 on the eye and 5 on the target (:85).

**Camera stack**
- `camPose` runs in the core (`60_p3d_core.js:99`). The sideline camera on the branch also lives there; it has no `P3D_MODULES` entry and freezes its springs while `_rp.on` (`74_sideline.js:78`).
- Module order: director 25, polish 26 (celebration only, `71_polish.js:41`), figures 30 (frustum from `P.camera` at that moment, `63_p3d_figures.js:427-428`), ball 40.
- The camera near plane is 0.3 (`60_p3d_core.js:59`).

**Figures** (`63_p3d_figures.js`)
- Players are drawn in a loop that calls the global `v18FigDraw` (:434).
- `v18FigDraw` (:341) appends instances (`pt.n++`) to shared parts: `head`, `hair-*`, `band`, `neck`, `torso`, `num`, and so on (:296-303). Outline meshes share `instanceMatrix` (:294).
- Scale is `S=0.92*hgt/70` (:346). The head centre is at body-up `1.83` (:372). `yaw` is `p.yaw` or derived from `face` (:347).
- Header jump lift is `sin(u*PI)*0.72` over `JD=max(260,D(560))` from `p.jumpT` (`ui_stage.js:1132`).
- Replacing a global function from a later file is an existing pattern (`71_polish.js:20` does `v18ArmPole=function`).

**Geometry** for the behind-goal camera
- Goal: `GF={y0:30.34,y1:37.66,H:2.44,DB:2.0,DT:1.2}` (`ui_stage.js:14`). The net is 2.0 m deep at the base.
- End boards are at 3.6 to 3.85 m behind the line and 0.95 m tall. Photographers are at 2.9 m, y=24 and 44. Ball-stop poles are at 4.4 m (`62_p3d_stadium.js:142-148`).

**Facts relevant to edge cases**
- Goal types seen in `ui_stage.js`: `break, corner, fk, header, long, pen, solo, tapin`, plus open play.
- No own-goal event exists. A search for `og`, `owngoal` and "own goal" in `engine.js`, `ui_live.js` and `ui_match.js` found nothing.
- The match-report highlights (`A.replayGoal`, `ui_main.js:139`) draw on `#hl-canvas`, so `v18RpLive` is false there and they never replay.
- TouchlineTV (`ui_v8.js`) is not the live stage either (**verify** its canvas id is not `lv-canvas`).

**Test dependencies**
- `test/stage3d.js:47-57` expects `App.v18Replays` +1 per goal, the `.v18-rp-bug` to show, match state unchanged, no replay at 4x, and a tap to finish within 15 s.
- `test/sideline.js` (branch, :84-92) expects the director modes to include `'replay'` and excludes replays from its jump gate (:4).

## 2. User-facing behaviour (3-D, 1x/2x)

After the celebration, the same moment the replay plays today:

1. A dissolve (existing) into **pass 1, SCORER'S VIEW**. This is a first-person camera at the scorer's eye height, moving with his run, touches and strike. You see the ball at the bottom of the frame on touches, then leaving his boot and flying at the keeper and goal. Game-time window `[ts-L1, tg+300]` at 0.5x.
   - L1 is 1100 ms.
   - Breakaway and solo goals: 1900 ms.
   - Headers and corners: from the start of the cross to the scorer minus 300 ms.
   - Penalties: 1500 ms (run-up).
   - Every window is clamped to the start of the buffer.
2. A 380 ms dissolve (the existing `v18RpDissolve`) into **pass 2, BEHIND THE GOAL**. A low camera just in front of the end boards, net and posts in the foreground, looking out at the scorer. The ball flies at the lens and the net bulges toward it. Window `[ts-350, tg+550]` at 0.5x.
3. The existing end dissolve into the live restart.

Other behaviour:
- **Lower-third caption** in each pass, bottom-left: team colour bar `--rpc` with "SCORER'S VIEW · J. Smith", then "BEHIND THE GOAL". It slides in over 0.4 s and holds for the pass. The REPLAY bug stays top-left.
- **Skip:** tap or click anywhere ends the whole replay, exactly as today (the existing test relies on this). A small "Next angle ›" pill, bottom-right, shown only in pass 1, jumps to pass 2. Its pointerdown stops propagation so it does not end the replay. Skip / 4x / 8x / leaving the match end it, as today.
- **Typical length:** about 3.7 s + 0.4 s + 2.6 s, so about 6.7 s at 1x (today about 3.8 s). At 2x: L1 is capped at 800 ms and the rate is 0.6, about 4.5 s total.
- **Setting:** Settings > Match graphics, "Goal replays: Off · One angle · Two angles" (default Two). The existing `PREFS.replays` boolean stays the master switch. New `PREFS.rpAngles='two'|'one'`, where `'one'` is exactly today's replay.

## 3. Files and hooks

New `src/v17/76_replay2.js` and `76_replay2.css`. They sort after `74_sideline` and `75_touches`; use 77 for the possession plates feature. No edits to 66 or 68. Every hook is a wrapper or a global reassignment (the precedent is `71_polish.js:20`).

| Hook | What it does |
|---|---|
| `Stage.prototype.goalSequence` (outer wrapper) | `this._v185e={pid:e.pid, ty:e.ty, s:e.s}` before calling the inner function; clear it in `finally`. It is still set while `restartAfterGoal` awaits the replay. |
| `v18Replay` (reassign) | Call the original without awaiting. Its Promise executor creates `st._rp` synchronously, so augment `Q` right away: `two, pass:1, cam:'eyes', sc, win:[[a0,a1],[b0,b1]], trk`. Then set `Q.t=Q.t0=a0`, `Q.t1=a1`, reset `Q.i` by search, and return the promise. Two passes only if 3-D is live (`st._p3d && !dead`), `rpAngles!=='one'` and a scorer track could be built; otherwise `Q.cam='goal'` with today's window. |
| `v18RpEnd` (reassign) | If `why==='end' && Q.two && Q.pass===1 && st.alive && !st.skip && v18RpWant(st)`, switch to pass 2 instead of ending. Pass 2 does: last frame with dissolve via `v18RpDraw(st,Q,S,true)`, `Q.pass=2`, `cam='goal'`, `t0/t/t1` from `win[1]`, `Q.i=search`, `P.dir.snap=true`, swap the caption, hide the pill. Otherwise call the original. |
| `Stage.prototype.loop` (outer wrapper) | Only handles `Q.nextTap`: switch to pass 2 the same way, then call the inner loop. |
| `v18RpOverlay` (reassign) | After the original returns `el`, append `.v185-rp-lt` (caption) and `.v185-rp-next` (button) into it. |
| Director `pose` (wrap the method on `P3D_MODULES.find(m=>m.name==='director')` at load) | `mode==='replay' && Q.cam==='goal' && Q.two`: the low behind-goal pose (§4b). Otherwise the original. `D.mode` stays `'replay'`, so `sideline.js` and the director tests are unaffected. |
| New `P3D_MODULES` entry `{name:'rpcam', order:27}` | While `Q.on && Q.cam==='eyes'`, overwrite `P.camera` position, lookAt, fov and `near=0.12` from the precomputed track at `Q.i`. Otherwise restore `near=0.3` once (flag) and `updateProjectionMatrix`. It runs after the director (25) and polish (26) and before figures (30), so culling uses the FP camera. |
| `v18FigDraw` (reassign) | When `P._rp2eye` is set and `p===Q.sc`, record `n0` per part in `F.parts`, call the original, then collapse instances `[n0,n)` whose origin (`im[k+12..14]`) lies within 0.34 m of the head centre or the neck slot. Zeroing the 3x3 makes a degenerate, unrasterised instance. The test is by radius, not by part name, so new joint caps from `v18/figures` are covered. Outlines share the matrix. |
| `VIEWS.settings` (wrap after 68's wrapper) | Replace the `v18-rpset` checkbox markup with the 3-way select, or add the select next to it. |
| `ui_v8.js` `MODALS.whatsNew`, `DEVELOPER_NOTES.md` top section | Required by `CLAUDE.md`. |
| `test/run_all.sh` | Add `replay2.js`. |

## 4. Data and camera construction

**Resolving the scorer:** `sc = st.pl(st._v185e.pid)`. In each snapshot, find his fields with `S.m.find(([o])=>o===sc)`. Movers are rebuilt per snapshot (:23), so search each time, or cache the index and confirm `o===sc`. No scorer, `sc.off`, or `sc.side!==e.s` (the own-goal guard, not reachable today) means a single goal-only pass.

**Windows:** from `R.ts`, `R.tg` and the buffer (`Q.R.buf` is already trimmed).
- Cross start: the earliest snapshot in the run where `s.fl && s.fl.home===sc` immediately before the shot flight.
- `head = !!(fl.head || fl.nod)` on the first `kind==='shot'` snapshot.
- `ty` comes from `_v185e`.

### 4a. First-person track
Computed once at replay start: n of about 100-330 snapshots, 3 Float32Arrays, well under 1 ms.

Per snapshot:
- **Height:** `S=0.92*(hgt||70)/70`. Lift from `jumpT` uses the `ui_stage.js:1132` formula with `JD=max(260, st.D(560))`, read at replay start. The speed is the same one recorded under unless the user changes it mid-goal; acceptable. Head centre `H=(x, (1.83+lift)*S, y)`.
- **Look target:**
  - Before the strike: blend the ball (weight `clamp((5-dist)/3, 0, 1)`, so touches pull the gaze down onto the ball, matching `75_touches` "eyes down") with a point 14 m ahead along his yaw at 1.1 m. Within 32 m of goal, the ahead point is pulled 40 % toward the goal mouth `(gx, 1.2, 34)`.
  - Strike to goal line: the ball.
  - After `tg`: hold.
- **Eye:** `H` plus 0.10 m forward along the horizontal view heading, minus 0.02 m in height.
- **Smoothing (this is what prevents nausea):**
  - Express the view as yaw and pitch, unwrapped.
  - Forward-backward one-pole filter in game time (zero phase, no lag): τ 0.18 s on yaw/pitch, τ 0.10 s on the eye. After the strike, τ 0.06 s on the target so the ball stays framed.
  - Rate clamp: yaw ≤ 150°/s, pitch ≤ 90°/s game time (half that on screen at 0.5x).
  - As built (v18.5 replay2): pitch ≤ 120°/s game time (60°/s on screen at 0.5x), and yaw ≤ 280°/s for 650 ms around the strike, so the head can follow a header or a first-time finish to goal (at 90/150 the ball left the frame on headers). Not yet judged on moving video for comfort.
  - Pitch clamp [-35°, +20°]. No roll, no stride bob (only `x, y, lift` are used, never `hipU`).
- **Lens:**
  - Vertical fov 52°. Portrait or phone (aspect < 1): solve for a horizontal of about 62°, capped at 72° vertical.
  - Long shots (shot distance > 20 m): ease to 38° over 350 ms game time after the strike so the goal mouth reads.
  - Near plane 0.12 while in the eyes pass. The ball at his feet is about 1.6 m away, so it is visible.
- **Frame rate:** the camera uses `Q.i`, the same snapshot as the world. Interpolating only the camera would make the ball and his own legs judder against it, because snapshots are effectively 30 Hz on screen at 0.5x.
- **Own body:** the head, hair, band and neck cluster is collapsed. Legs and boots stay, so you see the boot meet the ball. Torso and arms stay, but the -35° pitch clamp keeps the lens out of the chest (**verify** in screenshots; if the torso clips, extend the radius to the torso slot).
- **Per goal type:**
  - **Header:** the eye rises with the leap. The gaze locks onto the cross from its start (ball weight forced to 1 while `fl.home===sc`). The nod (`nodT`) is ignored, so there is no snap downward.
  - **Volley:** same rule, the gaze follows the ball.
  - **Penalty:** the run-up from the spot behind the ball; the keeper dive is visible.
  - **Free kick:** the wall is in view and the ball curls over it.
  - **Deflection or in off the post** (`offPost`, `hitWood`): the target simply follows the ball. The 0.06 s τ plus the rate clamp absorb the kink.

### 4b. Behind-the-goal pose (director pose wrap, director damping kept)
- Eye `(gx+dir*3.3, 1.45, 34+clamp((ball.y-34)*0.25, -1.4, 1.4))`. That puts it outside the 2.0 m net, inside the boards at 3.6 m, and clear of the photographers at y 24/44.
- Target:
  - Before the strike: the scorer `(sc.x, 1.1, sc.y)`, 30 % toward the ball.
  - After the strike: the ball `(x, max(z,0)+R, y)`.
- fov 32° to 36°.
- **verify:** that the net bulge from `st.netD`/`bulge` (`61_p3d_pitch.js` around :113-171) stays more than 0.3 m from the eye, and that the net material renders from behind (DoubleSide).

## 5. Edge cases
- **2-D renderer:** no first-person is possible in the 2-D projection. 2-D stays exactly as today: one pass, tight ball framing, no lower-third. It gets the "BEHIND THE GOAL"-less caption only if wanted later. If the GL context is lost mid-replay, pass 2 is not started (the switch checks `_p3d`) and the replay ends normally.
- **Tactical view, reduced motion (`st.rm`), 4x/8x, `L.skipping`, shootouts (`st.so`), `PREFS.replays=false`:** no replay, unchanged through `v18RpWant`. A change of speed to 4x mid-replay ends it (:89).
- **2x:** shorter lead and rate 0.6 (§2).
- **Sideline view:** the replay is filmed by the director plus `rpcam`. The `74` springs are frozen while `_rp.on`, so it returns to the touchline afterwards. `D.mode` stays `'replay'`.
- **Pause:** `Q.t` holds (:88). The track is indexed by `Q.i`, so the camera holds too. The pill ignores taps while paused, like the overlay (:92).
- **Penalties in normal time:** both passes. `pick` returns `'replay'` before `'pen'` (:41 versus :45-46).
- **Own goals:** not modelled by the engine. Guarded with a goal-only pass.
- **Set pieces:** the corner-and-header window starts at the cross. A direct free kick works as described in §4a. If `R.ts` is null, the 68 fallback is `tg-400`.
- **Phone layout:** the lower-third is 12 px, at `bottom:10px; left:10px` inside `.v18-rp`. The pill is a 44 px tap target. **verify** that neither overlaps the v18.4 zoom control in the live bar.
- **Walkout:** unrelated; replays only happen after goals.
- **Match-report highlight and goal-replay cards** (`#hl-canvas`) and **TouchlineTV:** not live stages, so unchanged.
- **Timing and results:** the simulation does not step during a replay (68 design). Only wall time grows, and nothing is awaited by the engine. `sync.js` wraps `goalSequence` but does not depend on replay length.

## 6. Performance
- The track precompute is O(n) once.
- Per frame: one module (about 20 vector ops) plus the per-part `n0` loop for one figure (about 30 parts).
- The FP and low cameras see more of the main stand and crowd at depth. Crowd is instanced and the shadow map is fixed.
- Gate: frame time in pass 1 and pass 2 within 15 % of today's replay at tiers A and C (`#perf` overlay).
- No extra memory: the same 5.2 s buffer.

## 7. Tests: new `test/replay2.js`, modelled on `stage3d.js:44-57`

Debug hook: `P._rp2.last={cam, eye, tgt, head, near, fov, ballNdc}`, set by `rpcam` and the pose wrap.

1. **3-D 1x open-play goal:**
   - `App.v18Replays` goes up by 1.
   - The sampled `Q.cam` sequence is exactly `['eyes','goal']`.
   - Lower-third text "SCORER'S VIEW" then "BEHIND THE GOAL".
   - `JSON([M.sc, M.min, view.min])` unchanged; `st._rp` null afterwards.
2. **Eyes pass, per frame:**
   - `|eye.xz - head.xz| ≤ 0.25`.
   - `eye.y ∈ [1.45, 2.5]`.
   - `near === 0.12`.
   - Pitch ∈ [-36°, 21°].
   - No turn > 6° and no eye jump > 0.35 m between consecutive distinct snapshots.
   - Ball inside the frustum in ≥ 90 % of frames from `ts` to `tg`.
   - The scorer has ≥ 1 collapsed instance near the head; 0 after the replay.
   - `near === 0.3` after the replay.
3. **Goal pass:**
   - `dir*(eye.x-gx) ∈ [3.0, 3.5]`.
   - `eye.y ∈ [1.2, 1.8]`.
   - Camera forward x has sign `-dir`.
   - Ball in frame in ≥ 90 % of frames from the strike.
4. **Speeds:** 2x plays both passes in ≤ 6 s wall time. 4x: `n===0`, no `.v18-rp-bug`.
5. **Skip controls:** a tap in pass 1 ends the replay (`n===1`, `'goal'` never seen, < 15 s). Clicking `.v185-rp-next` gives `'goal'` within 500 ms and `n===1` at the end.
6. **2-D renderer:** `cam` never `'eyes'`, no `.v185-rp-lt` text "SCORER'S VIEW", `n===1`.
7. **Header goal** (`ty:'header'`, `seq:[{a:'cross'},{pid:sc,a:'shot'}]`): `Q.win[0][0] ≤ cross t0`; peak eye y ≥ standing + 0.3.
8. **Penalty goal** (`ty:'pen'`): both passes; pass 1 starts ≥ 1.2 s before `ts`.
9. **Preferences:** `PREFS.rpAngles='one'` gives today's replay (`cam==='goal'` only, high pose eye y > 8). `PREFS.replays=false` gives none. The Settings HTML contains the select.
10. **Regression:** `stage3d`, `sideline` (branch), `sync`, `goalcap`, `postcap`, `v13_audit`, `stage3d_smoke`, `walkout3d`, `polish`, `touches`.

## 8. Screenshots to inspect
Desktop 1440x900 and phone 390x844@2x; dark and light themes; tiers A and C.
- Pass 1:
  - early in the run
  - a touch, with the ball at the bottom of the frame
  - 100 ms after the strike
  - the ball near the keeper
- Pass 2:
  - at the strike (net and posts in the foreground, scorer framed)
  - ball 3 m out
  - the bulge
- Both captions and the pill.
- Header, penalty and long-shot variants.
- A goal in sideline view.
- 2-D replay, unchanged.
- Compare against `test/shots/plan/`.

## 9. Risks
- **Motion sickness and look:** mitigated by zero-phase smoothing, rate and pitch clamps, no bob, 0.5x playback and the skip pill. Judge from a screen recording, not only stills.
- **Clipping:**
  - The scorer's torso or arms at 0.12 near.
  - A defender within 0.5 m of the lens filling the frame.
  - The bulging net reaching the behind-goal eye.
  - All of these need checking from screenshots.
- **Merge drift with v18.4:** `v18/figures` changes the parts; the radius-based collapse is meant to absorb that. `74_sideline` changes the core camera. Build on top of the merged v18.4, not on HEAD.
- **Global reassignment:** relies on `v18Replay` and `v18RpEnd` being called by global name inside 68. They are, at :102 and :69/:89/:96/:98.
- **Replay length (about 6.7 s) may annoy players:** the 'One angle' setting and the 2x trim cover it.
- **Interpolation:** 30 Hz stepping stays as today. Interpolating the whole snapshot is out of scope.

## 10. Estimate
About 3 to 3.5 hours for an agent with Playwright: code 1.5 h, test suite 0.75 h, screenshot passes and tuning 0.75 h, regression suites, notes and What's New 0.5 h.

### Critical Files for Implementation
- /home/user/puzzlel-game/touchline/src/v17/68_replay.js
- /home/user/puzzlel-game/touchline/src/v17/66_p3d_director.js
- /home/user/puzzlel-game/touchline/src/v17/63_p3d_figures.js
- /home/user/puzzlel-game/touchline/src/ui_stage.js
- /home/user/puzzlel-game/touchline/test/stage3d.js

---

# v18.5 Feature 2: possession and defender plates (design)

Checked against the source at 14:38 UTC on 2026-10-23 (`src/` on the current branch, with `v18/sideline` read through git). I edited, built and ran nothing.

## 1. How it works today

**Roster data**
- `defaultLookup(pid)` (`src/ui_stage.js:32`) returns only `{num, look, h}`. It does not return a name or a position.
- `setSides` (`ui_stage.js:56-60`) builds `st.players`, a Map of pid to mover. Each mover has `pid, side, slot, x, y, num, look, hgt, gk (slot.role==='GK'), off, chase, celeb`.
- `setSides` is the only place that adds to `players` (grep for `players.set` finds only line 59), so substitutions go through it.
- Names come from `Px(id)=findPerson(App.C,id)` (`ui_views.js:5`, `engine.js:1149`), which has `fn`, `ln`, `num` and `pos`. `pname` is at `engine.js:105`.
- The Lab and the menu demo pass their own lookups with no names (`ui_sandbox.js:11`, `ui_stage.js:1371`).
- TouchlineTV builds a stage with the user's school on both sides (`ui_v8.js:149`). The highlight stage is `App.hl` (`ui_main.js:141`).

**Kits**
- `this.kits=kitsForSchools(T.h,T.a)` (`ui_stage.js:37`) gives `kits.team[side]` and `kits.gk[side]`, each with `shirt`, `num`, `dark` and `light`. The minimap already reads them (`ui_stage.js:1345`).

**Who has the ball**
- `st.own` is the mover in possession. `st.hands` is set for keeper holds and throw-ins. `st.poss` is the side.
- `own` is set in `gain()` (`ui_stage.js:356`) and when a flight lands (`:220`). It is cleared at launch (`:191`) and for free physics (`:226`).
- `st.fl` is the flight in progress: `f.home` is the intended receiver, `f.kind` is `'shot'` etc., `f.phys` means a loose ball.
- `st.placed` marks a set ball. `st.setPiece` is `'pen'`, `'fk'`, `'corner'` or null. `st.so` means shootout. `st.headBall` is the heading player.
- `st.inNet` is set when the ball enters the net. `p.celeb` is cleared in `restartAfterGoal` (`:587`). `st.ft` is set in `fullTime` (`:744`).

**Who is defending**
- Every frame `update()` picks `presser=this.nearest(1-carrier.side,b.x,b.y)` (`ui_stage.js:794`). That is the nearest outfield opponent, recomputed every frame with no hysteresis and not stored.
- It steers him to 1.8 m goal-side of the ball (`:810`).
- The v18.3 tackle sets `p.chase=o` while the tackler runs at the carrier (`v17/72_tackles.js:25`, cleared at `:27`, `:42`). This is the most reliable "engaging" signal available.

**Existing possession markers**
- 2-D: an ellipse under `own` (`ui_stage.js:1198`).
- 3-D: a ring under `own` (`v17/63_p3d_figures.js:440`).
- No name labels are drawn anywhere today.

**HUD and draw order**
- `draw()` (`ui_stage.js:871`) applies a shake translate, then calls `drawTac` or `drawBroadcast`, then weather, flash and confetti.
- `drawLerp` (`:866`) interpolates positions before `draw`.
- 2-D `drawBroadcast` ends with `drawMini` (`:1006`). The minimap rect is `w=min(170,W*0.22)`, `h=w*68/105`, `x0=W-w-10`, `y0=10`, plus 3 px padding (`:1342`).
- 3-D `drawBroadcast` (`v17/60_p3d_core.js:141-144`) clears the HUD, calls `P.render()` and then `drawMini`. `drawTac` hides the GL canvas (`:146`), so tactical is always drawn in 2-D.

**Coordinates**
- 2-D projection is `proj(X,Y,Z)` (`ui_stage.js:915`). Head height comes from `headOf` and `jumpLift` (`:173-174`).
- 3-D uses `P.camera` (PerspectiveCamera). The figures module calls `cam.updateMatrixWorld()` every frame (`63:430`). Axes are stage x→x, stage y→z, height→y (`60:11`).
- Tactical geometry is `tacGeom()` (`ui_stage.js:888`).

**Replays**
- `68_replay.js` draws a replay frame via `v18RpDraw` (`:56`), which applies a snapshot, draws and restores the fields in one task.
- `st._rp.on` marks a replay in progress (`:79`, `:85`). The REPLAY bug sits at left 14 px, top 12 px, 30 px tall (`68_replay.css:5`).
- The replay switch is added by wrapping `VIEWS.settings` after `class="field v17-rend"` (`68_replay.js:107`). Generic toggles go through `CH.pref` (`ui_main.js:169`).

**Other state the plates must respect**
- Walkout: `v18WalkFocus` (`69_walkout3d.js:17`) is non-null while it runs.
- Caption: DOM element `#lv-cap` at top 34%, centred (`style.css:318`). The scoreboard is the `<header class="bug">` above the canvas (`ui_live.js:62`), so it is not on the canvas.
- v18.4 adds `PREFS.zoom` and its `+`/`-` keys and wraps `camPose`/`drawTac` (`v18/sideline:74_sideline.js:25-66`, `:139`).
- Keys already in use: Space, Enter, Escape, Tab, V, M, Shift+P, `/`, the arrow keys, and `+`/`-`. **N is free.**

## 2. What the user sees

- Up to two broadcast-style tags. One is above the **ball carrier**. The other is above **the opponent engaging him**.
- **Carrier tag:** a number block in the shirt colour with the `kit.num` digit colour, then the SHORT NAME in white on dark glass (`rgba(8,12,16,.84)`), a 3 px team-colour underline, a small ball glyph, and a pointer down to the head.
- **Defender tag:** the same layout without the ball glyph, at 90% opacity and one step smaller, so the carrier always reads first.
- **Keepers** get a small "GK" chip in the place of the glyph.
- **Font:** the broadcast face used by the REPLAY bug (`"Big Shoulders Display","Arial Narrow"`, weight 800), uppercase, tracking .06em.
- **Size:** 13 px on desktop and 11 px minimum on phones. The size is fixed in CSS pixels, not scaled with the world, so it stays readable at Wide zoom.
- **Name:** the last name. If two players on the same team share it, use the initial and last name ("J. SMITH"). Truncate with an ellipsis at a maximum of 30% of the canvas width. With no name available (Lab, demo), show the number only.
- **Compact form:** number plus up to 7 characters, used when `W<520` or the projected player is shorter than 28 px.
- **Fades:** 180 ms in and 260 ms out, measured in real time. When the carrier changes, the old tag fades where it is and the new one fades in. There is no slide.

**Why canvas drawing on the HUD rather than a DOM overlay.** The HUD canvas is already on top in both renderers. Drawing there runs in the same tick as `drawLerp`, so tags never lag the figures. It costs no DOM layout per frame, it is caught by existing screenshots, it moves with the shake transform, and it is inside the replay's apply-draw-restore task, so it can be cleanly suppressed there. Accessibility is handled separately (section 8).

## 3. Files to add and wrap

**New file: `src/v17/77_plates.js`.** It loads after v18.4's `74_sideline.js` and `75_touches.js`, so it wraps the final `drawBroadcast` and `drawTac`. No CSS file is needed unless an accessibility node is added; that node would use the `.v185-` prefix in `77_plates.css`.

1. **Prefs.** `DEFAULT_PREFS.plates=true; if(!('plates' in PREFS)) PREFS.plates=true;`, following the `68_replay.js:13` pattern.
2. **Names, cached per stage.**
   - `Stage.prototype.v185Name(pid)` returns `{short, full, pos}` from `Px(pid)` when `typeof Px==='function' && App.C`, otherwise null.
   - It is cached in `st._plN`, a Map from pid to name.
   - Wrap `setSides` to rebuild the cache and the duplicate-surname set for each side, and to reset `st._pl`. Subs are covered because they come through `setSides`.
3. **State machine.** `v185Update(st, nowReal)`, run once per real draw. It is not run inside replays (section 4).
   - State lives on `st._pl={own, ownT, def, defT, chal, chalT, slots:Map(pid→{a, ax, ay, x, y, role}), t}`.
   - It only reads the stage's simulation fields and never writes them.
4. **Pick the defender.** `v185PickDef(st, carrier, cur, nowReal)` is a pure function so it can be tested (rules in section 4).
5. **Projection.** `v185Anchor(st, p)` returns the HUD point `{x, y, vis}` at head top, with `Z=1.95*(p.hgt/70)+st.jumpLift(p)`:
   - 3-D (`st._p3d && !dead && mode!=='tactical'`): a reused Vector3 kept as `P._plV`, not the shared `P._v`, set to `(p.x, Z, p.y)` and `.project(P.camera)`. Then `x=(n.x+1)/2*W`, `y=(1-n.y)/2*H`. Hide when `n.z>1` or the point is outside the frustum.
   - 2-D broadcast and sideline: `st.proj(p.x, p.y, Z)`.
   - Tactical: `tacGeom()` gives `ox+X*s`, `oy+Y*s-9`. Compact tags, no pointer.
6. **Layout.** `v185Layout(plates, obstacles, W, H)` returns the rects (section 5).
7. **Hooks.**
   - Wrap `Stage.prototype.drawBroadcast`: `prev.apply(this,arguments); this.v185Plates(g)`. Plates then draw after the 3-D clear, the render and the minimap.
   - Wrap `drawTac` in the same way.
   - Do not wrap `update`, `goalSequence` or other async methods. That keeps event timing and microtask order exactly as they are now.
8. **Setting.** Wrap `VIEWS.settings` with the same splice as `68_replay.js:107`. It inserts `<label class="toggle v185-plset"><input type="checkbox" data-c="pref" data-k="plates" …> Player name plates (ball carrier and defender)</label>` after the replay toggle, and `CH.pref` saves it.
9. **Key N.** Add a `keydown` listener. It ignores inputs, contenteditable elements and modifier keys, and works only when `App.live` or `App.hl` is open. It toggles `PREFS.plates`, calls `savePrefs()`, shows `toast('Name plates on'/'off')` and calls `requestDraw`. Add N to the keyboard hint and help next to V and M. Optionally add a small "Plates" button next to the v18.4 zoom control in the live bar; it is hidden on phones, where the Settings toggle remains.
10. **Docs.** A What's New entry in `src/ui_v8.js` `MODALS.whatsNew`, a v18.5 section in `DEVELOPER_NOTES.md`, and the file added to `build.py` if `src/v17/*` is not globbed there (check this).
11. **Shared helper for Feature 1.** Export `v185DrawPlate(g, x, y, info, kit, opts)` so the two-angle goal replay can reuse the look for a scorer tag.

## 4. Behaviour rules

**When plates are off entirely** (all slots fade out, no state update, nothing drawn):
- `PREFS.plates===false`, `st.demo`, or a stage kind of menu, photo, preview or other (use `v18KindOf` when 3-D; in 2-D use the same tests: `cv.id==='lv-canvas'`, `App.hl===st`, `T.id==='tv'`, `#anim-lab`).
- `st.skip`, `App.live.skipping`, `st.ft`, the walkout (`v18WalkFocus&&v18WalkFocus.st===st`) and half time (`st.own` is null).
- **During replays** (`st._rp&&st._rp.on`): return before updating. The replay state is not real time, and the replay restores the stage afterwards.
- **From the goal to the restart:** `st.inNet || any p.celeb` (22 checks per frame) until `restartAfterGoal` clears `celeb` and `kickoffShape` clears `inNet`. This also covers own goals, headed goals and long shots.

**Who gets the carrier tag:**
- `st.own` once it has been stable for 250 ms of real time, so one-touch passes at 8x do not flash.
- **Pass in flight** (`fl.home`, same side): the passer's tag fades. The receiver's tag fades in at 60% opacity ("incoming") once 50% of the flight duration has passed, and goes to full opacity on landing.
- **Interception** (`fl.home` on the other side): the same, in the other team's colours.
- **Shot** (`fl.kind==='shot'`): the shooter's tag holds for 700 ms after the strike, then fades. The defender's tag fades at the strike.
- **Loose ball** (`fl.phys`, `own` null): tags hold for 400 ms, then fade.

**Who gets the defender tag** (`v185PickDef`):
- **Candidates:** opponents of the carrier with `!off` and `!celeb`.
- **Goalkeepers:** a keeper is a candidate only when the carrier is inside the box he defends (`|x-gx|<16.5`, `13.85<y<54.15`), or when he is the closest opponent within 12 m (a one-on-one).
- **Score:** `d(carrier) − 3·[q.chase===own] − 1.2·[goal-side: between carrier and the defended goal]`. Nearest-to-ball goal-side matches the stage's own presser (`ui_stage.js:794`, `:810`), so the tagged player is the one visibly closing down.
- **Entering:** within 8 m, or 10 m if he is chasing the carrier.
- **Hysteresis:** keep the current defender while he is still eligible and within 11 m. A challenger replaces him only if his score beats the current one by 1.5 m continuously for 400 ms of real time. The exception: a challenger whose `chase===own` while the current defender's is not wins at once, because a committed tackle is the engagement.
- **First pick:** no waiting, but it is shown only after 250 ms of stability.
- **Nobody close:** after a 500 ms grace period, the defender tag fades out.
- **Turnover:** run the selection fresh. The old carrier usually becomes the new defender, which reads naturally.

**Set pieces:**
- Keeper holding (`hands && own.gk`): carrier tag with the GK chip, no defender.
- Throw-in (`hands && !gk`), corner, free kick, kickoff (`placed`): taker only.
- Penalties (`setPiece==='pen'`) and shootouts (`st.so`): taker and `gkOf(1-side)`, a "taker vs keeper" pairing shown from the moment the ball is placed until the strike.

**Paused:** opacities freeze. The paused loop redraws every 480 ms anyway.

## 5. Placement

- The anchor is the head top. The tag is centred above it with a 6 px gap and a pointer.
- Positions ease toward their target with a critically damped spring (about 14/s). Reduced motion snaps them instead.
- **Obstacles:**
  - The minimap rect when `st.minimap`, using the same formula as `drawMini`, plus 6 px.
  - `#lv-cap` when it has text: `getBoundingClientRect` relative to the canvas, cached for 250 ms.
  - The REPLAY bug area (moot, since plates are hidden during replays).
  - The v18.4 zoom control if it overlays the canvas (read its rect the same way).
- **Clamping:** clamp to the canvas inset by 6 px. If the anchor is off screen by more than 40 px, hide the defender tag. The carrier tag stays pinned to the edge with a chevron (relevant at Tight zoom and in the sideline view).
- **Avoiding each other:** if the two tags intersect, move the defender's tag (the lower-priority one) above or below the carrier's, whichever side has room, then sideways. Recheck the obstacles after each move, at most 3 passes. A tag that still cannot fit stays hidden rather than overlapping.
- **Sideline view (3-D):** near players are tall on screen, so clamping at the top may flip the tag to below the feet. The anchor is not world-scaled, so no special code is needed for any zoom level.
- **Tactical view:** tags sit beside the dots in compact form. The v18.4 zoom has no effect there.

## 6. Edge cases

| Case | Behaviour |
| --- | --- |
| 2-D renderer, or reduced motion (auto then picks 2-D) | `proj` path. Reduced motion: opacity changes only, 120 ms, no spring. |
| 2x, 4x | Normal behaviour. Dwell and fades are in real time, so they look the same at every speed. |
| 8x | Carrier tag only. The defender tag appears only if he has been stable for at least 600 ms. Speed is read from `(App.live.speed||1)`, as in `68_replay.js`. |
| Skipping, or Skip pressed | State reset, nothing drawn. |
| Headers | Receiver shown as incoming during the flight. `headBall` gets the carrier tag for 400 ms after contact. |
| Red card walking off | `off`, so not eligible. If he had the ball, the new `own` takes over (`ui_stage.js:445`). |
| Highlights / goal-replay cards (`App.hl`) | On, with the same goal-window hiding. Reset on `setSides`/`clipStart` for each clip. |
| TouchlineTV | On. Names come through `Px`; kits come from `kitMatchup` even though both teams are the same school. |
| Lab | On, number only. Useful for tests. |
| Phone | Compact tags, 11 px, maximum width 34% of W. |
| Font not yet loaded | Clear the width cache on `document.fonts` `loadingdone`. |

## 7. Performance

- Per frame: about 22 distance checks, at most 2 projections, at most 4 `fillText` calls and 2 rounded rects.
- Text widths are cached per pid, font and compact flag. No `shadowBlur`; a 1 px dark border is used instead.
- No allocations per frame (reused Vector3 and rect objects).
- Target: under 0.15 ms per frame. Measured in the test by timing the wrapper with `performance.now()`.

## 8. Accessibility

- Contrast: text `kit.num` on `kit.shirt` must have a WCAG contrast of at least 4.5. Otherwise use `#fff` or `#111`, whichever is better by luminance. The name segment is always white on dark glass.
- Team is never shown by colour alone: the ball glyph marks the carrier, the GK chip marks keepers, and the number is always present.
- Canvas tags are decorative. Add a visually hidden `<span class="v185-sr" role="status" aria-live="off">` inside `#lv-stage`, updated at most every 1.5 s on a carrier change ("Ball: 9 Smith, Pressed by: 4 Diaz"). It is readable on demand and never announced, because the commentary feed already announces play.
- Plates can be turned off with N or in Settings.

## 9. Tests: new `test/plates.js`

Harness: `_pw.js`, live match setup as in `test/replay.js` or `v18/sideline:test/sideline.js`. Add it to `run_all.sh`.

1. **Determinism.** The same seed with plates on and off gives an identical event list, score and goal minutes. `sync`, `goalcap`, `postcap` and `v13_audit` still pass.
2. **Carrier match.** In at least 95% of frames sampled at 1x where `own` has been set for 300 ms or more and there is no flight, the carrier tag's pid equals `st.own.pid`.
3. **Hysteresis (Lab stage, synthetic).** Carrier at (50,34). Defender A at 3.0 m and B at 3.2 m, B oscillating ±0.4 m at 2 Hz: at most one switch in 5 s. Move B to 1.0 m and hold: switches to B within 600 ms. Set `B.chase=own`: switches on the next frame. Move everyone beyond 8 m: defender tag opacity is 0 within 800 ms.
4. **Layout.** Over 600 frames each in Broadcast at all four zoom levels, Sideline and Tactical, at 1440x900 and 390x844: the two tag rects have zero intersection, neither intersects the minimap rect, and every rect is inside the canvas. Two players stacked at the same point give non-overlapping tags.
5. **Anchor accuracy.** In 2-D, the anchor is within 2 px of `st.proj(headTop)`. In 3-D, it is within 2 px of `Vector3.project` of the head and within 40 px horizontally of the figure.
6. **Hidden states.** Plates are hidden during `_rp.on`, from `inNet` until restart, with `PREFS.plates=false`, on demo stages, during the walkout, after `ft`, and while skipping.
7. **Penalty and shootout.** With `setPiece==='pen'` and `placed`, the tags are exactly {taker, gkOf(other side)}.
8. **Settings and key.** The Settings checkbox exists and toggles. N toggles, and the value survives a reload.
9. **Contrast.** The chosen text colour has contrast of at least 4.5 for `kitMatchup` over every school pair in a new career.
10. **Performance.** The wrapper's mean time is under 0.15 ms over 600 frames, with no page errors.

Also rerun: `stage2`, `stage3d_smoke`, `stage3d`, `replay`, `sideline`, `kickoff`, `polish`, `punt`, `shootout`, `touches`.

## 10. Screenshots to inspect

Desktop and phone, two themes:
- 3-D broadcast at Wide, Normal and Tight
- Sideline
- Tactical
- the 2-D renderer
- a carrier near the minimap corner
- two players stacked
- keeper holding
- throw-in
- penalty (taker vs keeper)
- a pass in flight (incoming tag)
- the highlight card
- TouchlineTV
- plates off
- 8x

## 11. Risks

- **Wrap order with v18.4.** The file must sort after `74_sideline.js` and `75_touches.js`. Recheck after the v18.4 merge, because `58_look.js:170` only replaces `drawBroadcast` while the v16 marker is still there.
- **3-D clears the HUD** at `60:143`, so plates must be drawn after the previous `drawBroadcast`, which this design does.
- **Replay restore.** Never write to stage fields. All plate state lives in `st._pl`, and replay frames are skipped.
- **Coordination with Feature 1.** Both features act in the goal-to-restart window. Plates stay hidden there, and Feature 1 can reuse `v185DrawPlate` for a scorer tag.
- **The stage's presser has no hysteresis** (`ui_stage.js:794`). The tagged defender can briefly differ from the player the stage is steering, which is acceptable for presentation.
- **Tag clutter in the sideline view** at Tight zoom on phones. Mitigated by the compact form and by hiding the defender tag when it cannot be placed.

## 12. Time estimate (agent with Playwright)

About 2.75 hours in total:

| Step | Time |
| --- | --- |
| Selection state machine and drawing | 50 min |
| Projection for 2-D, 3-D and tactical, plus layout and obstacles | 35 min |
| Settings, key N, accessibility node, docs and What's New | 20 min |
| `test/plates.js` | 45 min |
| Screenshot pass and polish | 25 min |
| Serial suite run (timing-sensitive) | 20 min |

### Critical Files for Implementation
- /home/user/puzzlel-game/touchline/src/ui_stage.js (`defaultLookup` :32, `setSides` :56, presser :794/:810, `proj` :915, `drawMini` :1342, `tacGeom` :888)
- /home/user/puzzlel-game/touchline/src/v17/60_p3d_core.js (`drawBroadcast` and `drawTac` wrappers :141-146, `Painter3D.camera`)
- /home/user/puzzlel-game/touchline/src/v17/68_replay.js (`_rp.on`, the `VIEWS.settings` splice pattern :107)
- /home/user/puzzlel-game/touchline/src/v17/72_tackles.js (`p.chase` engagement signal :25)
- /home/user/puzzlel-game/touchline/src/v17/77_plates.js (new)
