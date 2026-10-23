# Touchline v18.6 design: simulation realism, ratings you can see, skill moves, rare special kicks, keeper saves

Written 2026-10-23 by three read-only design agents against the v18.4 build (v18.5's replays and plates were being built at the same
time; the plates already answer the request for a name plate on the carrier and his defender). File numbers at integration (the designs
below use provisional numbers): `78_ratings.js` and `79_realism.js` (Design A), `80_saves.js` (Design C), `81_skills.js` and
`82_specials.js` (Design B), so the skills and specials wrap after everything they build on. Scope cuts for the time budget are in the
"v18.6 execution plan" at the top of `ANIMATION_PLAN.md`.

# Design A (v18.6): simulation realism audit and ratings visibility

Presentation only. `engine.js` is not changed. Results, event order and RNG streams stay the same, so `sync`, `goalcap`, `postcap` and `v13_audit` must keep passing. The new files load after v18.5's `76_replay2` and `77_plates`.

The engine already makes rating gaps very large in the numbers. The stage reads no ratings at all, so on screen a 99 forward and a 50 defender move, touch, tackle and shoot the same way. The offside presentation is wrong at every speed, and both probes caught a flag against an onside player.

---

## 1. How it works today (verified)

### Engine offside (`src/engine.js:497-501`)
- Offsides use their own RNG stream, `rngFrom(hashStr(fid+':off:'+m))`, and only happen in minutes with no goal.
- Chance per minute is `0.05*clamp(0.7+(A-D)/60,.5,1.5)`.
- The pool is forwards (weight `3*spd/60`) and midfielders (weight `0.5*spd/60`).
- It emits `{m,t:'offside',s,pid}`. There is no position in the event; the stage invents everything shown.
- Node, 150 matches: **1.93 offsides per match**, 100 % of them forwards.

### Stage offside
- **Who runs what** (`ui_stage.js:372-373`): when `W>=700` it runs `offsideSeq`, otherwise `quickFlag`. `SPEED_MS={1:1500,2:780,4:400,8:200}` (`ui_live.js:6`), so 1x and 2x get the full sequence and **4x and 8x always get `quickFlag`**.
- **The offside line** (`offLine`, `:67-69`): the second-last opponent (keeper counted), the ball, or halfway, whichever is furthest forward. This is correct by law.
- **`offsideSeq`** (`:455-470`):
  - It computes `L` once at the start and sets the target `ox=L+dir*(1.4..3.0)`.
  - It waits at most `min(D(1000)+200, eta*1.3)`, then passes anyway. Nothing checks that the runner is beyond the line when the ball is played.
  - `onRelease` draws the freeze line at the line as it is *at the pass*, wherever the runner happens to be.
- **The line keeps moving** (`update`, `:797-810`):
  - Defenders aim at `base + (ball.x-52.5)*0.55 ± 4 m`, plus a ±1.2 m sine sway, so the back line drifts with the ball and with time.
  - A carrier with no `ov` keeps advancing (`:809`), which pushes the ball and the line forward.
  - Attackers holding shape are clamped onside at `OL-0.7` (`:807`).
- **`quickFlag`** (`:452`): flag, freeze line at `offLine`, whistle and emit. **The flagged player is never positioned.** Because of the clamp at `:807`, he is almost always onside.
- **Freeze line drawing:**
  - 2-D: `drawOffMark` (`:1021`, called from `58_look.js:240`), shown for `max(700, D(1500))`.
  - Tactical: `:903` clears it after a fixed 1500 stage-ms.
  - 3-D: `64_p3d_ball.js:100-104`.
  - It is one line, and every figure keeps moving while it shows.

### Evidence (Playwright, dist = merged v18.4)
- **Probe 1 (2x, seed `v186probe`):** the only call was an AM who started 9.6 m onside. He reached his target (0.0 m away) but was **1.66 m onside of the second-last defender when the ball was played**. The freeze line was drawn 1.66 m beyond him. The defenders had dropped 3–4.6 m during his run.
- **Probe 2 (4x, seed `v186probe2`):** a `quickFlag` at 31' was given against **the ball carrier himself, 2.4 m onside** (`{"m":-2.4,"own":true}`). In the screenshot (`.../scratchpad/v186/qf0.png`) the dashed line is clearly beyond his possession ring.

---

## 2. Offside fix: `src/v17/79_realism.js`, part 1

`Stage.prototype.offsideSeq` is replaced. It is a short rewrite and nothing else wraps it (grep confirms). The new sequence is used at **every speed**; `quickFlag` becomes only a last-resort fallback.

1. **Freeze the picture.**
   - The passer `o` holds the ball: `o.ov={x:o.x,y:o.y}`.
   - The defending back four hold their spots, or step up 1 m (an offside trap): `q.ov={x:q.x+dir*1,y:q.y}` for opponents whose `|x - L| < 6`.
   - Record them in `st._v186hold`. All `ov` are released in a `try/finally` on every exit path: skip, cancel, early return.
2. **Track the line while he runs.** The runner gets `p.ov.x = offLine(s)+dir*m` with `m = 1.2 + rand*1.4`.
   - A `79` `update` wrapper (pre-step) refreshes it each tick while `st._v186off` is set.
   - Wait until `dir*(p.x-offLine(s)) >= m-0.3 && dir*(p.x-ball.x) >= 0.5`. The timeout is `eta(p,...,1.3)*1.6+D(400)`.
   - The cap `D(1000)+200` is removed. At 4x/8x a minute may run long; at about 2 calls per match that is accepted and deliberate.
3. **Pass only when he is beyond the line.** The pass is released only if the condition holds at the instant of release. The check runs inside `onRelease`; if it fails there, it falls to step 5.
   - The runner keeps running onto the ball (`p.ov` 3 m further on, at goal side) instead of stopping, so at reception he is clearly beyond the line.
4. **Freeze line** (`offMark` is extended, never replaced):
   - `{x: offLine at release, ax: p.x at release, pid, t}`.
   - Wrap `drawOffMark` (2-D broadcast and sideline) and the tactical block at `:903` (wrap `drawTac`, harmonise its timeout to `max(700,D(1500))`). Draw:
     - the existing amber dashed defender line;
     - a solid red-white attacker line at `ax`;
     - a 2 px shaded band between the two lines.
   - 3-D: wrap the `offside(P,st,B)` method of `P3D_MODULES.find(m=>m.name==='ball')`. Create a second plane mesh lazily with `P.track`, at `m.ax`, with the same fade.
   - The hold from step 1 lasts until the whistle plus `D(360)`, so the lines stay true while they are visible.
5. **Fallback, no truthful picture possible** (`hands`, no teammate carrier, skip, timeout):
   - Emit the event with the flag, whistle and caption **but no freeze line**, and never claim a position.
   - Count these in `st._v186offStat` for the tests.
6. **Flagged player is the carrier** (`o===p`): today `gain(m)` plays him off to a teammate. Keep that, then run the step 1–3 sequence. This is the natural give-and-go.
7. **8x:** the same steps. The free-kick tail (fetch plus pass, `:466-470`) is skipped when `W<300`, as `quickFlag` does today.

---

## 3. Discrepancy sweep: ranked, all in `79_realism.js`

| # | Problem | Evidence | Fix |
|---|---|---|---|
| D1 | Onside players flagged | §1, both probes | §2 |
| D2 | **Throw-in given to the team that kicked it out** | `throwIn` (`:472-475`): the carrier kicks it over the line himself, then `side=Math.random()<0.65?1-s0:s0`. 35 % of throw-ins go to the team that put it out, with no deflection shown. Probe 1 saw it (`kicker 0 → poss 0`). | Wrap `throwIn`. Pick `side` first. If `side===s0` and an opponent is within 5 m: that opponent blocks it out (carrier's kick → `launch(null)` off the defender's shin → out). Otherwise force `side=1-s0`. Throw-ins are cosmetic, not engine events. |
| D3 | **Close-range misses ballooned** | The miss target at `:411` is `34±(4.2..6.8)` m or `z 2.75..3.75` at any distance. Tap-ins are 2–6 m out (engine `shotLoc` 94–98). Node: 0.53 tap-in misses per match. | Scale the miss by distance and finishing (R5). Under 9 m: just wide (`|y-34|` 3.95–4.6), scuffed over (z 2.6–2.95), or the existing woodwork chance. Never a goal-line block, because a block would have to be a corner and the engine has none. |
| D4 | **Header and free-kick saves/misses animated as open-play foot shots** | `shotSeq` (`:386-424`) special-cases only `pen`. Node: 17 % of non-goal shots (3.4 per match) are `header`/`corner` types, and 0.93 per match are `fk`. The report and shot map say "Header"/"Free kick". | Wrap `shotSeq`: <br>• `header`/`corner`/headed `cross`: a lofted cross from the widest teammate (the `goalSequence` pattern at `:515-520`, `head:true`, `jumpT` timing), then a `nod` launch at the keeper or the miss target. <br>• `fk`: `setupDeadBall(e,{pid,x,y,a:'setup'})` (`:646`), then the strike. <br>Coordinate with Design C, which owns the save branch. |
| D5 | **Miss and save commentary ignore what was shown** | `LINES.miss` is picked by hash (`ui_live.js:12`, `:91`); over/wide/post/bar is picked by `Math.random` (`:411`). A line can say "blazes it over" while the broadcast showed WIDE. | The stage tags `e._how` (`over`, `wide`, `post`, `bar`, `catch`, `parry`, `tip`) before `emit`. Wrap `feedPush` so tagged events pick a matching line. Untagged events (skip, flush) keep today's line. |
| D6 | **Possible goals from offside positions** (suspected, not measured: probe limit) | `goalSequence` (`:513-520`) sets the receiver's `ov` to the recorded spot and launches at once. Nothing keeps him onside at release. | Wrap `launch`. While `st._v186goal` is set (set by a `goalSequence` wrapper), on a forward pass to a teammate with `dir*(rx-offLine)>-0.3`: hold the receiver at `OL-0.6` (await up to `D(500)`), restore his `ov`, then release. **First implementation step: measure the violation rate** with probe-1-style instrumentation. |
| D7 | Tactical freeze line has a different lifetime | `:903` uses a fixed 1500 ms | Harmonised in §2.4 |

**Checked and fine:**
- Shot angles: in probe 1 the narrowest goal-mouth angle was 11.8° (from 31.7 m), and the stage caps shots at 29.5 m (`:394`).
- Save targets are inside the frame.
- Corner side is consistent with the deflection (`:405` → `cornerKick` `:486`).
- Defenders near the carrier are seldom static: 4 % of frames (143 of 3503).
- `sync.js` already covers ownership, the scorer striking the ball, and saves in hands.

---

## 4. Ratings visibility: `src/v17/78_ratings.js`

It loads before `79` and before Designs B and C, which read its helper.

### What the engine does (no tuning needed)
- Team strength from `eff` (`unitsFor` `:351-377`).
- Shot rate `tanh((A-D)/24)` (`:445`).
- Shooter pick `(sho/60)^2.2` (`:381-389`).
- Goal chance `exp((shQ-G)/55)` (`:452`).
- Touches weighted by `pas` (`:440`).
- Credited tackles weighted by `(def/60)^2` (`:418-422`).

Measured in Node (200 matches each, the user's striker):

| Case | Goals per match | Shots per match | Conversion | Touches per match |
|---|---|---|---|---|
| Baseline striker (OVR 73) | 0.86 | 4.6 | .19 | 6.7 |
| Striker 99 | 2.06 | 7.5 | .27 | 11.1 |
| Striker 99 vs all-50 defenders | 4.18 | 13.7 | .31 | 11.4 (team scores 7.1) |
| Striker 50 | 0.10 | 1.1 | .09 | 3.9 |

The engine outcome gap is already huge, so **no engine change is justified**.

### What the stage does
- It reads only `info.h` (height, used for body scale, `:59`).
- Everyone runs at `vmax=7.2·sp` with the same acceleration (`:823-826`).
- Everyone has the same dribble touch (`75`), the same tackle odds (`72_tackles.js:24` `Math.random()<0.1`), the same first touch, the same shot flight time and the same miss spread.

### Data source
`Px(pid)` (`ui_views.js:5`) → `findPerson` (`engine.js:1149`), which covers all schools plus alumni. Fields:
- `sk.spd, sta, sho, pas, def, gk` (range 5–99);
- `h` (height in inches; `hF` maps it to 30–99);
- `aggr` (5–99);
- `tr.score, assist, stop, defend` (0–10, set only in the editor);
- `pos`, `lvl`, `grade`; `ovr(p)` (`engine.js:50`).

Level medians for seed `v186probe`:

| Level | OVR median (p5–p95) | spd | sho | def |
|---|---|---|---|---|
| Varsity | 67 (58–78) | 64 | 58 | 61 |
| JV | 53 | — | — | — |
| Modified | 41 | 37 | 30 | 33 |

The Lab and the menu demo have no `Px` (`ui_sandbox.js:11`, `ui_stage.js:1371`), so they fall back to neutral.

### Helper
- Wrap `setSides` to fill a cache on each mover as primitive fields, so replays copy them (`68_replay.js:21` `v18RpObj` copies primitives):
  - `pace = spd`
  - `ctrl = .5·pas + .3·spd + .2·sho + 1.5·tr.assist`
  - `fin = sho + 2·tr.score`
  - `tkl = def + 2·tr.defend`
  - `str = .6·hF + .4·aggr`
  - `kp = gk + 2·tr.stop`
- Relative score `z(v) = clamp((v - median of the 22)/25, -1, 1)`; absolute score `a = clamp((v-25)/70, 0, 1)`.
- A test can override them by setting `p.v186r_*`.
- Export `v186Rat(st,p)` and `v186Duel(st,att,def)` → `{gap, outcome:'beat'|'held'|'none'}` for Design B (skill moves). Design C (keepers) reads `kp`.

### Effects
- **R1 Pace.** Wrap `v17want` (`55_body.js:93`): multiply by `k=1+0.12·z(pace)` when `urgent`, but not for refs, the shootout, placed balls or set-piece `ov`. Wrap `eta` to divide by `k`, so every `until` timeout stays consistent.
  - A 99 forward vs a 50 defender is about 1.12 vs 0.93: about 3 m of separation over 20 m.
- **R2 Take-ons.** Wrap `dribble` (`:357`).
  - Trigger: a goal-side opponent within 6 m and inside 70° of the carrier's path.
  - Probability of trying: `0.25+gap/80`, clamped to 0.1–0.7, where `gap = ctrl - tkl`.
  - Outcome: `beat` with probability `logistic(gap/10)`, otherwise `held`.
  - The carrier always keeps the ball, because the engine's touch list says so.
  - The move itself calls `st.v186Move(p,d,outcome)` if Design B defined it. Otherwise it is a simple shoulder-drop feint.
  - Defender reaction:
    - `beat`: `d.v186bT=now`. Bite lunge or turned hips (a pose wrapper in `poseOf` order after `75`), then speed ×0.35 for `D(500+300·(1-a(tkl)))`.
    - `held`: he jockeys at 1.5 m and the carrier checks back.
- **R3 Strength.** Wrap `v18tTake` (`72_tackles.js:17`). If `str(o)-str(p)>15`, set `o.trip=-9e9`: the carrier rides the challenge and stays on his feet.
- **R4 First touch.** Wrap `land` (`:216`). For a footed reception set `o.v186ftT=now` and `o.v186ftQ=.5·a(ctrl)+.25·(z+1)`. A level gap is wanted, so Modified players get heavier touches.
  - Wrap `dribLead` to add `(1-q)·0.9 m`, fading over `D(420)`.
  - The ball must stay within 1.3 m of the foot (`sync`'s far limit is 1.6 m).
- **R5 Shot technique.** Wrap `launch`, misses only (`kind==='shot' && !opt.home`). Sign and timing are kept so the keeper's dive stays in sync.
  - Wide miss: `|y-34| = 3.95 + (1-a(fin))·(1.2…4.5)`, scaled by distance (D3).
  - Over the bar: `z = 2.65 + (1-a(fin))·(0.3…2.5)`.
  - For saves and goals, export `v186ShotPace(st,p)` (0.88–1.1) for Design C, which must retime the dive.
- **R6 Defender reaction.** Same `v17want` wrapper. When the carrier's yaw changes by more than 0.8 rad within 250 ms, the presser's speed is multiplied by `0.55+0.45·a(tkl)` for `D(300)`: a poor defender is caught flat-footed. The presser's closing speed also gets `1+0.06·z(tkl)`.
- **R7 (optional, 15 min).** A small OVR chip on the v18.5 carrier and defender plates, if the owner wants the gap stated outright.

**Dependency on v18.5 plates:** the plates pick the defender by distance minus a goal-side bonus. The R2 defender is the same nearest goal-side presser, so the two agree. After a `beat`, the plate switching to the covering defender is the expected behaviour.

---

## 5. Edge cases
- **Renderers and views:** 2-D, 3-D (second offside mesh), Broadcast, Sideline and Tactical (freeze line in all three).
- **Speeds:**
  - 1x and 2x: full offside sequence.
  - 4x: full sequence, longer minute.
  - 8x: no free-kick tail.
- **Skip:** every wait short-circuits on `this.skip`. The `finally` releases holds and the event is still emitted.
- **Reduced motion:** lines are drawn, nothing else changes.
- **Lab:** the `offside` scene (`ui_sandbox.js:24`) uses the new sequence; with no `Px`, ratings are neutral.
- **Replays:** `offMark` is in `V18_RP_STAGE` and is captured by reference, so `ax` comes along. New per-player state is primitive fields.
- **Other cases:**
  - Shootouts and penalties: pace scaling is off.
  - Sent-off players (`p.off`) are excluded.
  - The keeper is counted in `offLine` and excluded from R1 and R2.
  - Clips (`this.clip`): the realism wrappers apply to live play only.

## 6. Performance
22 rating lookups per `setSides`. Per frame, an O(1) wrapper per mover plus one extra line or mesh. Negligible.

## 7. Tests
**`test/realism.js`:**
- **Offside:** a 2x live half, a 4x live half and 10 lab loops at 1x and 8x. For every call that shows a freeze line:
  - at release, `dir·(p.x - second-last defender) ≥ 0.5` and `dir·(p.x - ball.x) ≥ 0.5`, and he is in the attacking half;
  - `|offMark.x - offLine at release| < 0.05` and `offMark.ax === p.x`;
  - while the line is visible, the second-last defender stays within 0.3 m of it;
  - fallbacks (no line) are at most 10 % of calls.
- **Goal sequences:** forward passes to an offside receiver = 0.
- **Throw-ins:** the team that last touched the ball never takes the throw (0 violations).
- **Misses:** misses from under 9 m have `|to.y-34| ≤ 4.7` or `z ≤ 3.0`. Commentary category matches the caption (0 mismatches). Header-type non-goal shots end with a `head` kick kind.

**`test/ratings.js`** (lab stage, ratings overridden on the movers):
- Pace: a 30 m sprint, 99 vs 50: time ratio ≥ 1.15. Equal ratings: 1 ± 0.02.
- Take-ons, 40 trials: gap +40 → `beat` ≥ 60 % and the carrier keeps the ball 100 %; gap −40 → `beat` ≤ 10 %.
- First touch: `q=.95` → ball-to-foot within 400 ms ≤ 0.45 m; `q=.2` → ≥ 0.8 m and ≤ 1.4 m.
- Misses: `fin 95` → mean distance beyond the post ≤ 1.2 m; `fin 30` → ≥ 2.5 m.

**Gates:** `sync` (1x and 4x), `goalcap`, `postcap`, `v13_audit`, `touches`, `anim`, `kickoff`, `sideline`, `stage3d_smoke`, `replay`, `punt`, `plates`.

## 8. Screenshots to inspect
- The offside freeze frame 200 ms after release, showing both lines with the attacker clearly beyond: 2-D Broadcast, Sideline, Tactical, and forced 3-D.
- A 4x flag.
- A throw-in after a block.
- A 4-frame strip of a beaten defender.
- A heavy touch vs a clean touch.
- A tap-in miss and a header miss.
- Phone 390×844.

## 9. Risks
- Pace scaling changes choreography timing. Mitigated by wrapping `eta`, the ±12 % cap, and the `sync` loose/far counts.
- Line holds left set by mistake. Mitigated by `try/finally` and a test that no `ov` is left on defenders after each call.
- Overlap with Design B (dribble hook: A owns the hook, B supplies `v186Move`) and Design C (`shotSeq` save branch: C owns it, A's D4 cross/header and fk set-up must be coordinated with C).
- D6 is unmeasured.
- Longer offside minutes at 4x and 8x.

## 10. Estimate (one agent with Playwright)
| Part | Time |
|---|---|
| §2 offside, including 3-D line and lab | 1.25 h |
| D2, D3, D5 | 0.5 h |
| R1, R2 (fallback feint), R4, R5, R6 | 1.25 h |
| Tests and screenshots | 0.75 h |
| **Must tier** | **≈ 3.75 h** |
| Should tier: D4, D6, R3 | +1 h |

### Critical Files for Implementation
- /home/user/puzzlel-game/touchline/src/ui_stage.js (`offLine` :67, `playMinute` :364-383, `shotSeq` :386-424, `quickFlag`/`offsideSeq` :452-470, `throwIn` :472, `goalSequence` :502, `update` :762-840, `drawOffMark` :1021)
- /home/user/puzzlel-game/touchline/src/v17/72_tackles.js (`tackle`, `v18tTake`)
- /home/user/puzzlel-game/touchline/src/v17/55_body.js (`v17want` :93) and /home/user/puzzlel-game/touchline/src/v17/75_touches.js (`dribLead` :32)
- /home/user/puzzlel-game/touchline/src/v17/64_p3d_ball.js (3-D offside line :100) and /home/user/puzzlel-game/touchline/src/v17/68_replay.js (snapshot rules :16-21)
- /home/user/puzzlel-game/touchline/src/engine.js (read-only reference: offsides :497-501, `ovr` :50, player fields :74-99)

Probe scripts and screenshots are in /tmp/claude-0/-home-user-puzzlel-game/08a993b8-36ed-5fd4-b73c-2ed3d3a1cb95/scratchpad/v186/ (`load.js`, `rate2.js`, `ev.js`, `probe1.js`, `probe2.js`, `qf0.png`, `off0.png`).

---

# v18.6 Design B: dribbling skill moves and rare special kicks

The source was checked at 16:35–16:55 UTC on 2026-10-23 (branch `claude/new-session-miqhgk`, HEAD `3371e3c`; this is v18.4 plus the v18.5 plan, without the v18.5 code). I edited, built and committed nothing.

Scratch files are in `/tmp/claude-0/-home-user-puzzlel-game/08a993b8-36ed-5fd4-b73c-2ed3d3a1cb95/scratchpad/v186/`:
- `probe_b.js` and `probe_b_1x.json`: a Playwright live match.
- `eng_types.js`: a Node engine sample.
- `probe_lab.js`: the second Playwright probe. It gave no usable result (see §2).

## 1. How it works today (verified)

**Dribbling**
- `Stage.dribble(p,x,y,ms)` (`src/ui_stage.js:357`) does three things:
  - calls `gain` if needed;
  - sets `p.ov={x,y}`;
  - awaits `until(own!==p || dist<0.6, lim)`, where `lim = max(D(ms)+300, eta(p,x,y,0.88)+250)`.
- The path is a straight line to `ov`. The carrier's speed factor is 0.88 (`:825`).
- Where it is called from:
  - open-play legs, `dribble(p, x+dir*(3..8), y±3, 300)` (`:371`);
  - goal sequences (`:523`, `:527`, `:528`);
  - the lab (`src/ui_sandbox.js:10-33`).
- The ball is carried in `update` (`:775-788`): target = `footOf(o)` (0.5 m ahead along yaw, `:165`) plus `dribLead` along the velocity. It is steered with `k=dt*22`, capped at 1.1 m from the target and 1.4 m from the foot (`:785-786`, again at `:843`).
- v18.4 (`src/v17/75_touches.js`):
  - `dribLead` is stride-synced (`:32-56`): cadence `v184Cad`, peak `v184Peak`; the only modifier is "defender within 4 m → shorter".
  - The `poseOf` layer (`:91-144`) moves the touching foot onto the ball. `v184Body` (`:62`) converts world points to body units, with `hs` = 1.06 in 2-D and 0.92 in 3-D (× hgt/70) via `v184Is3D` (`:61`).
- **No input from ratings.** Touch cadence, lead and the pose depend only on speed and pressure.

**The only "skill" today**
- In `e.ty==='solo'` goals (`ui_stage.js:525-527`):
  1. Dribble to 40 %.
  2. `beat.slideT=now; pl.jumpT=now; onCaption('SKILL!')`.
- `jumpT` gives the attacker the header leap pose: `P.act='head'`, arms up (`:1132`).
- The defender gets the slide pose (72 `:81`).

**Defenders**
- `presser = nearest(1-side, ball)` every step (`:794`), with target `b.x ± 1.8` goal-side of the ball (`:810`). He never reacts to the carrier.
- Tackles (`v17/72_tackles.js:21-55`):
  - `p.chase=o; o.slow=true` (`:25`);
  - poke / shoulder / slide poses via `v18pkT`, `v18shT`, `v18slT` (`:77-103`).

**Turning**
- `turn()` (`:142-161`): yaw follows velocity at 8–11 rad/s × sp.
- `yawLock`/`look()` (`:162`) overrides it.
- A stopped carrier faces the attack direction (`:155`).

**Poses**
- `poseOf` (`:1081-1150`) uses body units `f/u/l` (+l = his left). Standing values: feet `f .02 u 0 l ±.1`, hands `f .03 u 1.0 l ±.27`, `hipU .8`.
- `P.rot` about `P.pivot`, plus `lift`, `lean`, `headTilt`, `headTurn`.
- The wrap chain is `55 → 70 → 72 → 73 → 75`.
- `blendPose` (`:1175-1182`):
  - feet are not smoothed while `act==='loco'` and no act change happened in the last `max(140, D(260))` ms;
  - any act change smooths all joints with k=15/s for 260 ms.
- 2-D `drawFigure` rotates `P.rot` in the screen plane (`:1199`).
- 3-D (`63_p3d_figures.js:374-376`) treats `rot` as:
  - a **pitch** only for `fall`, `trip` and celebrations `backflip`/`flag`;
  - a camera-signed roll for `loco` (`*sign(vy)`);
  - a body roll otherwise.

**Strikes and the goal finish**
- `launch` (`:184-210`):
  - `look(p,target)` (`:204`);
  - a square-up wait of up to `max(240, D(260))` if the turn is more than 0.6 rad and `kk!=='head'` (`:205`);
  - wind `windOf` (shot `D(200)`, head 0; `:181`, `:206`);
  - `opt.onRelease` runs after `release` has cleared `p.ov` (`:189`, `:196`).
- `flightTarget` (`:211`): `head` flights go to `headOf` (`:174`), others to `footOf`.
- `land` (`:217-222`):
  - `head` flights set `headBall`, and `update` then holds the ball at `headOf` (`:777`);
  - other lofted balls get `cush` and drop to the foot.
- `finish` (`:600-631`):
  - `header = headBall===pl || ball.z>1.2`;
  - durations `D(header?430:380)+90`;
  - `shownPre = relabel ? shownType(...)` (`:620`), and `e.ty` is overwritten after the strike. `shownType` returns `'header'` whenever `header` is true (`:757`).
- Cross goals (engine `SHOT_TYPES` `'cross'`, `engine.js:300`): the cross lands at the scorer's feet and he strikes from the ground.

**Replays**
- The snapshot copies every **primitive** field of each mover, plus `dive/glide/ov` (`68_replay.js:21-27`).
- `V18_RP.lead` and `rate` are globals read at `:74` and `:88`.

**Lab**
- `LAB_SCENES` plus `labRun` (`ui_sandbox.js:2-33`). Extension pattern: `70_punt.js:139-143`.

**Captions and commentary**
- `onCaption` is the instance callback for `#lv-cap`.
- `feedPush(e)` (`ui_live.js:87`) builds the goal line from `LINES.goal[e.ty]` (`:9`).

## 2. What is wrong or missing (evidence)

**Probe 1** (`probe_b.js`, 2-D live, seed `probe186`, Varsity, outfield OVR 65–81, 1x, 108 s of stage time = 18 match minutes):
- 19 dribble legs.
- **8 of 18** legs with a known heading began with a turn of more than 1.5 rad (1.78–3.09). These are reversals the stage handles by braking and swinging the ball round the foot at 0.5 m. There is no chop, drag-back or turn.
- **14 of 19** legs had a defender within 3 m in front of the carrier (minimum distance 0.28–1.99 m).
- A defender was within 3 m in front in **32 %** of all carrier steps. He runs into a backpedalling presser with no duel.
- Slack (`lim − duration`) was 7–338 ms. **All 5 legs under 60 ms were reversals.**
- Consequence: anything that slows the carrier would push legs into their timeouts. Moves must leave his path and speed untouched.

**Engine sample** (`eng_types.js`, Node, 40 rounds, 186 matches):

| Level | Goals per match | Cross goals | Solo goals | Headers |
|---|---|---|---|---|
| V | 3.81 | 37 (74 matches) | 26 | 19 |
| JV | 3.73 | 28 (56) | 17 | 19 |
| MOD | 3.89 | 29 (56) | 17 | 15 |

The flair composite (§5), outfield p10 / p50 / p90 / max:
- V: 56 / 71 / 86 / 95
- JV: 35 / 51 / 62 / 72
- MOD: 23 / 39 / 52 / 58

The median scorer of a V cross goal has flair 75. So ratings separate the levels on their own; level gating adds a hard limit on the repertoire.

**Probe 2** (`probe_lab.js`) was **inconclusive**: the lab's `run` loop kept steering the same player. I took no screenshots. The new lab scenes (§4.6) are the way to look.

**Missing**
1. No skill moves. Dribbling is identical for a 95-flair star and a 25-flair defender.
2. Defenders never get beaten visibly.
3. The solo "SKILL!" moment reads as a header leap.
4. No acrobatic finishes: cross goals are always struck from the ground.
5. The stage has no rating access: `defaultLookup` returns only `{num, look, h}` (`ui_stage.js:32`).
6. The 3-D painter cannot pitch a body horizontal for a new act (`63:375`).

## 3. User-facing result

- Ball carriers beat defenders with real moves:
  - body feint (shoulder drop);
  - outside cut;
  - inside chop;
  - drag-back;
  - Cruyff turn;
  - single and double stepover;
  - sole roll;
  - la croqueta (stars only);
  - elastico (rare, stars only).
- Moves happen at reversals and when squaring up to a defender in front.
- **Modified:** feint, cut and drag-back only (a stepover only for the very best). They are slower, with looser control.
- **JV:** adds the chop, Cruyff and stepovers.
- **Varsity stars:** everything, crisply and often. A 95 winger against a 50 centre-back visibly sends him the wrong way (a lunge, hips turned, a stumble). A 45 attacker against an 85 defender gets a small, ignored feint.
- Solo goals show a named move ("STEPOVER!", "CRUYFF TURN!", "ELASTICO!") instead of the hurdle, which is kept for about 30 % of them as "SKILL!".
- Rare showpiece finishes on cross goals: **bicycle kick** and **scissor volley**, about 2–6 % of V cross goals by high-flair players, so roughly one every 30 V matches. A **rabona** is the ultra-rare one (about 1.5 % of eligible open/solo goals by flair 88+).
- Each showpiece has full take-off, contact, landing and getting up, a caption, a commentary flourish and a slower replay. Results, events, their order and their timing do not change.

## 4. Files to add or wrap, and hooks

**Two units** (they can run in parallel; one agent each):
- `src/v17/79_skills.js`: moves.
- `src/v17/80_specials.js`: kicks.

Both must sort after `75_touches`, `77_plates` and any v18.6 Design A/C file that wraps `update`, `poseOf` or `dribble`. Renumber if A/C take 79/80.

All wrappers are **non-async pass-throughs** (`return prev.apply(this,arguments)`), so the promise chain and microtask order are unchanged.

### 4.1 Shared (B2 owns it, or whichever v18.6 unit lands first)

- **3-D body-axis hook.** Edit `63_p3d_figures.js` just after `:375`:
  `if(Q.rollB||Q.pitchB){ ra=Q.rollB||0; pa=ra?0:(Q.pitchB||0); }`
  - `rollB`: body roll about the forward axis; + = head to his right (−l).
  - `pitchB`: + = forward.
  - Pivot is `Q.pivot`.
  - Same precedent as 73's `bootT` hook.
  - Design C (keeper dives) will want the same fields. One owner, one edit.
- **2-D needs no `ui_stage.js` edit.** When `!v184Is3D(this)`, the v18.6 pose layers set `P.rot = rollB*sin(yaw) + pitchB*cos(yaw)`; the sign conventions were derived from `drawFigure :1199` and `63:378`.
- **Do not use `act==='loco'` with `P.rot`** for body rolls in 3-D: it is multiplied by `sign(vy)` (`63:375`), which flickers while running along x.

**Ratings**
- `v186Rate(st, p)` returns `{flair, dsk, lvl, q}`, cached in `st._v186R` (a Map) and cleared in a `setSides` wrapper. If Design A defines an accessor, use it.
- Sources:
  - `Px(p.pid)` when `typeof Px==='function' && App.C`;
  - otherwise lab overrides `p.v186fl` / `p.v186lv`;
  - otherwise `{flair 60, lvl 'V'}`.
- Level: `App.C.fixtures[st.T.id]?.lvl` (live, highlight cards, Wrapped). TouchlineTV (`T.id==='tv'`) falls back to the player's `lvl`.

### 4.2 `79_skills.js`: moves

| Hook | What it does |
|---|---|
| `dribble` wrap | Records `this._v186leg={p,x,y,ms,t0:now,on:false}` and calls through. It does **not** pre-gain, because the inner `gain` must run exactly once. |
| `update` wrap (after the original) | See below. |
| `footOf` wrap | When `p.v186k && own===p && !hands && !placed && !fl`: returns `p + R(yaw0)·off(u)` blended to the original by `wx(u)`. Otherwise the original. `update` already clamps against `footOf`, so the ball stays consistent. |
| `dribLead` wrap (after 75) | `r*(1-w)` while a move envelope `w` is active. 75's state keeps ticking, so there is no jump afterwards. |
| `poseOf` wrap (after 75) | The move layer for the carrier and the reaction layer for the sold defender. Skipped when `isRef`, `this.rm`, `P.act` is not `loco`/`idle`, or `kickT` is active (a strike takes over and the move blends out over 80 ms). |
| `detour` wrap (optional, `V186.bite`) | Only when the original returns null and `q.v186sold` is active, `q` has no `chase`/`ov`/`meet`/`trail`/`glide`, and `q` is not `own`. Returns `{x:q.tx+nx*b, y:q.ty+ny*b}`: a 0.6–1.2 m wrong-side step for about D(350). Defenders gate no `until` except tackles, and those are excluded. |
| Solo goals | A `goalSequence` wrap (e.ty `'solo'`) sets an instance `onCaption` that swaps `'SKILL!'` for the move name, restored in `finally`. On the second solo `dribble` call, where the beaten defender has `slideT===now`: with probability 0.7, reset `slideT` and `jumpT` to −9e9 and start the chosen move with that defender as the target. |
| Lab | `LAB_SCENES.push(['skills','Skill moves (Varsity star)'],['skillsmod','Skill moves (Modified)'])` and wrap `labRun` (pattern from 70). The scene cycles every move with `st._v186force=k`. Ratings come from `p.v186fl`/`p.v186lv` (V 95 vs a defender with `dsk` 50; MOD 40 vs 45). `labLog` shows the move name, flair and q. |

The `update` wrap:
- When `_v186leg.p.ov` equals `{x,y}`, the leg has started: compute `lim` and decide the move.
- It starts straight-line moves when the defender in front reaches the trigger distance.
- It aborts moves on a change of owner, any `q.chase===p`, a kick, `skip` or `ts<0.45`.

State fields: all state is stored as **primitives on the mover**, so replays reproduce it:
- carrier: `v186k` (kind), `v186t0`, `v186T` (duration, stage ms), `v186y0` (yaw0), `v186sf` (fake side ±1), `v186q`, `v186last`;
- defender: `v186sold` (time), `v186sd` (world lateral angle), `v186b` (bite), `v186sk` ('sold' | 'turned').

### 4.3 `80_specials.js`: kicks

| Hook | What it does |
|---|---|
| `goalSequence` wrap | Decides the special (§6) and sets `this._v186sk={pid, kind, e}`. Cleared in `finally`, after the replay, because `restartAfterGoal` awaits it inside `goalSequence`. |
| `launch` wrap | For the cross to the scorer (`opt.home.pid===sk.pid`, same side, `opt.h>2`): `opt={...opt, head:true, dur:opt.dur+this.windOf('shot'), onRelease:chain}`. The chained `onRelease` sets `pl.v186bk=kind`, `v186bt=now+f.dur` (contact time), `v186gs` (goal direction) and `v186kf`. The added `D(200)` means the special strike releases when the normal strike would have (it replaces the wind). |
| `headOf` wrap | Returns the special contact point while `p.v186bk` is set and `now ≤ v186bt + D(80)`. The cross homes in on it, and `update` holds the ball there (`headBall`, `:777`). |
| `finish` wrap | If `sk` matches and `headBall===pl`, runs `v186Finish` (below). Otherwise the original. A faithful copy of the non-pen/fk branch of `:600-631` with these edits: `shownPre=this.shownType(e,pl,false,d)` (so it stays `'cross'`); the kick sound is played by hand; `opt.onRelease` sets `pl.ov={x:pl.x,y:pl.y}` so he does not drift while lying on the ground. |
| `poseOf` wrap | Bike, scissor and rabona poses (§6). |
| `feedPush` wrap | When `e.t==='goal' && App.live.stage._v186sk?.e===e`: append `" What a bicycle kick!"` / `" A scissor-kick volley!"` / `" With a rabona!"` to the newest feed line. |
| `v18Replay` reassign (after 68/76) | For specials: set `V18_RP.lead=1400`, call, restore `lead` straight after the synchronous prologue (`68:74`); set `V18_RP.rate=0.35` and restore it when the promise settles. With v18.5's replay2, force a single behind-the-goal pass (`Q.two=false; Q.cam='goal'`), because the scorer's first-person view would whip 180° (yaw clamp 150°/s). **Verify 76's field names after the v18.5 merge.** |
| Lab | Scenes `bike`, `scissor`, `rabona`, forced with `st._v186force`. Cross goals as in the `header` scene (`ui_sandbox.js:30`) with `ty:'cross'`. |

`v186Finish` in more detail:
- the same `ty`/`tz`/`sTo`, keeper dive timing, `inNet`, `bulge`, `flash`, `hype`, `emit` and settle race as `finish`;
- `launch(pl,{to:sTo, dur:D(380)+90, h:0.25, kind:'shot', nod:true, onRelease})`. `nod` makes it `kk 'head'`: no wind and no square-up turn, so he can strike with his back to goal;
- right after `launch` returns (the release has already run synchronously), `look(pl, awayPoint, D(900))` puts back the facing that `launch :204` overrode;
- `snd('kick','shot',0.95)`;
- caption: `onCaption('BICYCLE KICK!'/'SCISSOR KICK!','set')` at contact.

## 5. Data sources and the derived ratings

**Fields that exist** (`engine.js:43-99`):
- `p.sk.{spd, sta, sho, pas, def, gk}` (5–99);
- `p.h` (inches), `p.pos` (GK/DEF/MID/FWD), `p.lvl`, `p.aggr`, `p.tr.{score, assist, stop, defend}` (0–10, editor only);
- `ovr(p)` uses `OVR_W`.
- On the mover: `slot.role`, `side`, `gk`, `hgt`.

**There is no dribbling attribute.** Define:
- `flair = clamp(0.42*spd + 0.36*pas + 0.22*sho + posB + 1.2*tr.score + 0.6*tr.assist, 5, 99)`, with `posB` = FWD +4, MID +2, DEF −6, GK −30.
- `dsk = clamp(0.6*def + 0.25*spd + 0.15*sta + 1.5*tr.defend + (DEF?3:0), 5, 99)`.
- `q = clamp((flair-25)/65, 0, 1) × {V:1, JV:0.85, MOD:0.7}[lvl]`.
- `bite = clamp(0.55 + (flair - dsk)/45, 0.12, 1) × A`, where `A = 0.55 + 0.45q` is the fake amplitude.

Example bites: 96 vs 48 gives 1.0; 75 vs 72 gives about 0.55; 45 vs 85 gives about 0.12.

## 6. Moves: choice, timing, keyframes

**Repertoire** (minimum flair per level; "—" means never):

| Move | V | JV | MOD | Situation |
|---|---|---|---|---|
| Body feint | 0 | 0 | 0 | straight, defender in front |
| Outside cut | 0 | 0 | 30 | turn 0.9–1.6 rad |
| Drag-back | 40 | 40 | 40 | turn > 2.2, or stop in front of a defender |
| Inside chop | 45 | 45 | — | turn 1.5–2.4 |
| Stepover (single) | 55 | 55 | 52 | straight, real speed < 5 m/s |
| Cruyff turn | 60 | 62 | — | turn > 2.3 and a defender within 4 m |
| Double stepover | 70 | 68 | — | straight, speed < 4.5 |
| Sole roll | 72 | 70 | — | straight, defender 1.5–3 m |
| La croqueta | 80 | — | — | straight, two or more opponents within 5 m |
| Elastico | 86 | — | — | straight, defender 2–3.5 m, weight 0.4 |

**When a move is chosen**
- At leg start, compute:
  - `turn` = the angle between the current velocity (or yaw) and the leg's target;
  - the defender in front: nearest opponent, keeper only inside his box, `cos > 0.4`, distance `d`;
  - space: the count of opponents within 5 m.
- Turn moves start at once. The stage brakes and turns over about 0.4 s (acceleration about 23 m/s² at 1x), and the move dresses that.
- Straight moves arm and start when `d ≤ 2.0–3.0 m` (depending on the move), and only if `dist(p, ov)/speed ≥ T/1000`, so the move ends before the leg does.
- Go side `sg` = the sign of the cross product of (carrier→defender) and (carrier→target). If it is near zero, pick at random. Fake side `sf = −sg`.

**Chance per leg**
- `p = base[lvl] × (0.35 + 0.65q) × V186.rate`, with base V 0.45, JV 0.32, MOD 0.20 (turn moves ×0.8).
- Cooldown: D(3500) per player.
- Never when: `rm`, `skip`, `ts < 0.45` (4x/8x), `so`, `hands`, `placed`, `p.gk`, any `q.chase===p`, `p.slow`, `demo` (except the lab).
- Moves use `Math.random`, cosmetic like the rest of the choreography.
- Specials use `hashStr([pid, m, sc, ty, 'v186'])`, so live, highlight cards and TV show the same finish.
- Expected at 1x (probe: about 1.05 legs per minute, 74 % with a front defender): about 25 moves per 80-minute V match for an average side, about 35 for a star side, about 12 JV, about 6 MOD.

**How Modified "executes worse"** (as q drops):
- duration `T × (1.3 − 0.45q)`;
- hip drop × (0.6 + 0.4q);
- arms wider (+0.1(1−q) l);
- ball wobble ±0.12(1−q) m lateral;
- a heavy last touch (ball +0.3(1−q) m);
- when q < 0.35, 25 % of moves end with a 0.1 m bobble.

**Keyframes**
- Durations are stage ms through `D()`.
- Envelope `w`: in over the first 12 %, out over the last 15 %, so poses and ball blend with the base.
- Ball offsets `(Δf, Δl)` are in **metres in the yaw0 frame, relative to the body centre** (the start value is `(0.5, 0)` = `footOf`). They are handed back to the live `footOf` by `wx(u)=smooth((u−0.6)/0.4)`.
- Feet and hands are in body units, shown for `sf`/`sc = +1` (left); mirror `l` for −1. F0 is the right foot (l<0), F1 the left.

1. **Body feint** (T 360)
   - u 0–0.45: `rollB −sf·0.10A` (shoulder dips to the fake side); `lean +0.06`; `hipU −0.05`; `headTurn sf·0.35`; fake-side hand `l +sf·0.12`, `u −0.1`; the swinging foot lands `l +sf·0.12`.
   - u 0.45–1: `rollB → +sf·0.06`; `headTurn → −sf·0.15`; at u 0.55 the outside of the go-side foot pushes the ball to Δ `(0.6, −sf·0.25A)`; `snd('touch')`.
   - Sell moment: u 0.3.
2. **Stepover**: stride-locked; `act` stays `loco`, so `blendPose` does not smooth the feet.
   - The next swing of the fake-side foot (gait swing phase `w` from `poseOf :1093`): `f −0.3 → 0.55` over the ball; `l +0.1 → −0.05` (across in front of the ball) `→ +0.38` (lands wide); `u` peak 0.22 at `w` 0.45.
   - At landing: `rollB −sf·0.12A`, `headTurn sf·0.3`, `hipU −0.06`.
   - The ball is not touched; it rides with the body.
   - The next stride's go-side foot uses its outside to push the ball to Δ `(0.65, −sf·0.4A)` over 120 ms.
   - Double stepover: two swings, alternating feet `sf` then `−sf`, then the go touch.
   - Sell moment: the landing of the fake foot.
3. **Outside cut** (T 300)
   - Turn-side foot at contact: `f 0.42, u 0.04, l +0.12`.
   - Ball `(0.5, 0) → (0.6, 0.35)`.
   - `rollB +0.10` (into the turn); `hipU −0.06`.
4. **Inside chop** (T 420; reaching foot F0, standing F1)
   - u 0–0.3 (plant and reach): F1 planted `f 0.30, l +0.22`; F0 `f 0.55→0.50, u 0.10, l −0.15→+0.05` (across in front of the ball); `hipU 0.8→0.66`; `lean 0.10→−0.08` (braking); `rollB +0.12`; `headTilt 0.2`; hands `(0.1, 1.25, −0.55)` and `(−0.05, 1.1, 0.45)`. Ball `(0.5, 0) → (0.62, 0)`.
   - u 0.3–0.55 (chop): F0 `f 0.50→0.15, l +0.05→+0.30` (inside of the foot); ball `→ (0.30, 0.35)`; `snd('touch')`.
   - u 0.55–1: `hipU →0.8`, `lean →+0.12` (drive out), hand-back to `footOf`.
   - The defender gets **turned** at u 0.45.
5. **Drag-back** (T 480)
   - u 0–0.3: `lean → −0.12`, `hipU 0.72`; F0 sole on the ball `f 0.49, u 0.13→0.20, l −0.06`; F1 planted `f −0.05, l +0.14`; ball `(0.5, 0) → (0.55, 0)`.
   - u 0.3–0.6: F0 `f 0.47 → −0.1`, `u 0.2 → 0.12` (the sole rolls over the top of the ball); ball `→ (0.05, −0.02)` (under him); `headTilt 0.3`; arms forward and out.
   - u 0.55: `look(p, reversed heading, D(500))` so the yaw flips cleanly.
   - u 0.6–1: steps round; hand-back.
6. **Cruyff turn** (T 520; kicking foot F0, standing F1)
   - u 0–0.35 (the fake): F0 `f 0.04 → −0.42, u 0 → 0.38` (the shot backswing); F1 planted `f 0.32, l +0.16`; hands as the kick (`:1125`); `headTilt 0.25`; ball `(0.5, 0) → (0.52, −0.02)`.
   - u 0.35–0.6: F0 swings through and hooks, `f −0.42 → 0.45, l −0.1 → +0.12, u 0.06`; ball `→ (0.15, 0.25) → (−0.15, 0.30)` (behind the standing leg); `rollB +0.08`; `hipU 0.74`.
   - u 0.55: `look(p, h0+π, D(500))`; pivot on F1; hand-back.
   - The defender is turned at u 0.5.
7. **Sole roll** (T 420)
   - F0 sole `f 0.45, u 0.20 → 0.16, l −0.02 → +0.25`; ball `→ (0.45, 0.30)`; `rollB −0.06`.
   - u 0.4–0.7: F1 outside `f 0.3 → 0.55, l 0.2 → 0.28`; ball `→ (0.70, 0.42)`; touch.
8. **La croqueta** (T 260)
   - The inside of F0 moves the ball `l 0 → +0.35` in 0.12 s; F1 pushes it on to `(0.65, 0.38)`.
   - `rollB +0.05 → −0.05`.
9. **Elastico** (T 300, F0)
   - u 0–0.35: outside of the foot, `l −0.05 → −0.30`; ball `Δl → −0.18` (the fake).
   - u 0.35–0.6: snap, `l −0.30 → +0.12`; ball `→ (0.6, 0.38)`.
   - `rollB −0.12 → +0.10`; `headTurn −0.3 → +0.2`.
   - Caption `ELASTICO!` at most once per D(300000).

**Defender reactions** (`poseOf` on the defender, D(450))
- **Sold:** lunge foot `l += side·0.3·bite`, `f +0.1`; `hipU −0.08·bite`; `rollB` toward the fake `0.14·bite`; arms out; `headTurn` toward the ball.
- **Turned:** crossover step (feet `l` cross by 0.15); `rollB 0.1`; `headTurn` follows the ball; `lean −0.05`. If bite > 0.8, add a stumble: set `q.trip=now` (the existing 420 ms trip pose, `:1140`).
- Optional `detour` bias as in §4.2.

**Interplay with v18.3 tackles**
- If a tackle starts mid-move, the move aborts unless u > 0.7.
- The slide, poke and shoulder poses keep priority: the layer skips players with `v18slT`/`v18pkT`/`v18shT` active, using the same `tackling` test as `75:97`.

**The ball never teleports**
- Offsets are smoothstep-continuous.
- `update`'s spring (time constant about 45 ms) and its 1.1 m / 1.4 m clamps still apply.
- The peak relative ball speed in these keyframes is about 4 m/s.

## 7. Special kicks

**Eligibility**
- `e.ty==='cross'` (bike and scissor only; this keeps the box-score type truthful under `relabel`).
- The scorer is at least 8 m from the goal line at his shot point (otherwise relabel says `'tapin'`).
- Varsity/JV, `goalTs ≥ 0.45`, not skipping, not `rm`.

**Probability:** `g(flair, min, max) = flair < min ? 0 : 0.3 + 0.7·clamp((flair−min)/(max−min))`.
- Bike: `0.05·g(·, 72, 95)`.
- Scissor: `0.07·g(·, 60, 90)`.
- Rabona: on `'open'`/`'solo'`/`'long'` goals, V only, `0.015·g(·, 88, 99)`; a pose-only change of the normal strike.
- So: V median cross scorer (flair 75): about 2 % bike and 4.5 % scissor. MOD: 0 (max flair 58). JV: scissor only for flair 60–72.

**Bicycle kick** (phases relative to contact `tc = v186bt`; times `D()`; kicking foot F1)

| Phase | Window | Pose |
|---|---|---|
| Set | tc−750..−380 | `yawLock` away from goal, tilted 30° toward the crosser, keeping `|cos yaw| ≥ 0.5` so the 2-D pitch reads; `hipU 0.74`; hands `(0, 1.3, ±0.45)`; `headTilt −0.3` (watching the ball). Hold `pl.ov` at his position from −380. |
| Take-off | −380..−200 | `lift 0→0.25`; `pitchB 0→−0.6`; `pivot 0.8`; F0 swings up `f 0.1→0.75, u 0→0.9`; F1 pushes off `f −0.05, u 0→0.15`; hands `(−0.1, 1.1, ±0.7)`; `headTilt −0.35`. |
| Scissor and contact | −200..0 | `pitchB −0.6→−1.45`; `lift →0.40`; F0 down `f 0.75→0.2, u 0.9→0.35`; F1 whips `f −0.05→0.82, u 0.15→1.10`; hands `(−0.25, 0.9, ±0.75)`; `headTilt −0.5`. |
| Fall | 0..+260 | `pitchB →−1.62`; `lift →0`; F1 `f →0.55, u →0.6`; hands to the turf `(−0.55, 0.4, ±0.55)`; `headTilt +0.2` (chin tucked); turf flecks. |
| Lie | +260..+420 | hold; feet `f 0.6, u 0.15`. |
| Get up | +420..+900 | `pitchB →0`; `rollB 0→0.4→0` (rolls to one side); `hipU 0.5→0.8`; feet `→` standing; hands push off. |

- Worked check: at contact the body-frame kick foot `(0.82, 1.10)`, with lift 0.40, pivot 0.8 and pitch −1.45, maps to `a2 = −0.20` (just goal-side of the hips) and `u = 2.05` units. That is about 1.89 m in 3-D and 2.17 m in 2-D. The hips are at about 1.1 m and the head at about 1.2 m, goal-side: the body is horizontal.
- `v186Contact` returns that point (world: `p + R(yaw)·(a2·S, 0)`, `z = 2.05·S − 0.11`, where `S` is the painter's scale) and is read live by `headOf`.
- The get-up ends at tc + D(900), before the celebration run (which starts at about tc + D(800) + 210). No speed penalty, so `celebrate`'s `until` is unaffected.

**Scissor kick**
- He faces the incoming cross. Goal side `gs`: `rollB = gs·θ`, θ 0→0.95 over −300..0; `lift 0.15`.
- The kicking foot (goal side): body frame `f 0.35, u 0.85, l gs·0.45`. The world contact is about 1.15 m (3-D) / 1.33 m (2-D), 0.3 m to the goal side.
- Lands on the hip and a hand: `rollB → gs·1.3` by +220, then up by +700.

**Rabona** (a pose layer during `kicking` when `p.v186rb===p.kickT`)
- F0 (standing) is planted on the far side of the ball (`l +0.08`).
- F1 backswing goes behind the standing leg: `f −0.30, u 0.30, l −0.25`.
- Contact: `f 0.3, l −0.05`. Follow-through: `f 0.55, u 0.5, l −0.35`.
- `lean −0.04`; arms wide.
- Same `kickT`/`kickW`, so timing is untouched. Caption `RABONA!`.

**Scorpion:** stretch goal only, not in scope; it needs a ball dropping behind the player.

**Timing**
- The cross gains `D(200)`, which replaces the strike's wind, so the special strike releases when the normal strike would have.
- The normal path may also add a square-up wait of up to `max(240, D(260))` (`:205`), so goal emits can be up to that much earlier. That is within the existing variance, and the order of events is unchanged.

## 8. Edge cases

- **2-D and 3-D:** one shared `poseOf`. Body axes go through `rollB`/`pitchB` (3-D hook) or a converted `P.rot` (2-D). Contact scales come from `v184Is3D`.
- **Broadcast and Sideline:** no camera changes. Tactical draws no figures, but moves still run (they are cheap).
- **Speeds:** moves only at `ts ≥ 0.45`; specials only at `goalTs ≥ 0.45`. 4x/8x and skipping use the plain path. `skip` makes `launch` land at once, so `v186Finish` falls back to the original.
- **Reduced motion:** no moves and no specials.
- **Replays:** all state is primitive fields on movers (`68:21`), so 2-D/3-D replays show the move and the kick.
- **v18.5 replay2:** a single behind-the-goal pass for specials.
- **v18.5 plates:** carrier and defender tags fit the duel well. The plate anchor ignores `pitchB` (it uses `jumpLift`), so during a bike the tag floats at standing height for up to D(560) before it hides at the strike. Acceptable, or 77 can read `v186bk`.
- **Lab and demo:** `demo` stages (the menu) get no moves. Lab scenes force moves.
- **TouchlineTV and highlight cards:** specials are deterministic from the hash and use `Px` ratings. Moves are random.
- **Keepers:** never.
- **Red-carded player** (`off`): never.
- **Shootouts:** never.
- **Kick starting mid-move:** blend out over 80 ms.

## 9. Performance

- Per update step: one leg check plus at most one nearest-opponent scan (about 22 distance checks) while a straight move is armed.
- Per `poseOf` call: an early return (a field check) unless the player is moving or sold.
- No allocations in hot paths. Reuse arrays as `v184Body` does.
- Targets: the `poseOf` wrapper averages under 0.02 ms; the `update` wrapper under 0.05 ms per step.

## 10. Tests

New `test/skills.js` (2-D lab plus one live match; add it to `run_all.sh`):

1. **Engine untouched.** Live seed at 2x with `V186.on` true and false: identical `(t, m, pid, s, sc)` event lists and final score. `sync`, `goalcap`, `postcap`, `v13_audit` pass.
2. **Path untouched.** Stub `Math.random` with a seeded PRNG in the lab and force each move. The carrier's per-step `x,y` track with and without the move differs by at most 1e-6 m. Leg duration ≤ `lim`.
3. **Ball continuity.** During moves, ball step per 120 Hz step ≤ carrier step + 0.06 m. The ball stays ≤ 1.4 m from `footOf`.
4. **Contact.** At each move-touch keyframe, the touching foot (body to world) is ≤ 0.30 m from the ball centre.
5. **Repertoire, from the pure `v186Pick`, 1000 draws each:**
   - MOD flair 40: only {feint, cut, dragback};
   - JV 65: includes cruyff, excludes elastico and croqueta;
   - V 95: elastico and croqueta at least once;
   - pick rate V95 > V70 > JV51 > MOD39;
   - mean q MOD < JV < V.
6. **Bite.**
   - `bite(96 vs 48) ≥ 0.9`; `bite(45 vs 85) ≤ 0.3`.
   - The sold defender's foot reaches `l` offset ≥ 0.25 units toward the fake within 250 ms.
   - A turned defender with bite > 0.8 gets `trip`.
7. **Bike (lab, forced).**
   - The shot launch has the scorer as `p`, `kind 'shot'`, `fromZ ≥ 1.5 m`.
   - At release, `pitchB ≤ −1.3` and the kick foot is ≤ 0.3 m from the ball.
   - The goal is emitted with `inNet` and the ball over the line.
   - Cross release to goal emit is within 1 step + 20 ms of the same scene with an unforced finish whose square-up wait is 0.
   - Scorer upright (`pitchB==0`, `hipU ≥ 0.75`) by `emit + D(420)`.
   - The relabelled `e.ty` stays `'cross'`.
8. **Scissor.** `|rollB| ≥ 0.8` at contact; contact z in 0.8–1.4 m. **Rabona:** at the end of the backswing, the kick foot's `l` < the standing foot's `l` − 0.05.
9. **Rates (Node unit on `v186SpecialPick`).** Over 20,000 hashed V cross goals at flair 75: bike in [1.5 %, 3 %], scissor in [3 %, 6 %]. MOD: 0. Same input gives the same pick.
10. **Gating.** A 60 s run at 4x, a skip and reduced motion each start 0 moves and 0 specials.
11. **Replay.** In a 2-D replay of a forced bike goal, `poseOf` at the strike snapshot gives `pitchB ≤ −1.3`.
12. **3-D smoke.** Forced 3-D lab `bike`: no page errors; `v18FigDraw` returns true for the scorer; the head world y at contact is < hip y + 0.4.
13. **Performance.** The wrapper averages from item §9 over 600 frames.

Also rerun: `touches`, `sync`, `anim`, `stage2`, `stage3d_smoke`, `stage3d`, `replay`, `punt`, `polish`, `kickoff`, `sideline`, plus v18.5's `plates` and `replay2`.

## 11. Screenshots to inspect

Lab at slow-mo (`labSlow`, ts 3.4), `zoomTo(0.35)`:
- every move at u = 0, .25, .5, .75 and 1, in 2-D and forced 3-D, Broadcast and Sideline;
- a MOD vs V chop pair (q 0.3 vs 1.0);
- a sold defender and a turned defender;
- bike in six frames (set, take-off, horizontal, contact, landing, get-up) in 2-D, 3-D and Sideline, plus a replay frame;
- scissor at contact and landing;
- rabona at backswing and contact;
- one phone frame (390×844) and one desktop frame per renderer.

Look for: no foot skating in stepovers, the ball at the foot at each touch, a horizontal body in 3-D, and correct pitch direction (head toward goal) for both teams in both renderers.

## 12. Risks

- **Foot skating** if the stepover swing loses sync with `p.ph`. Lock it to the gait phase; never change `act` while moving fast.
- **Wrap order and merge conflicts.** Design A/C may wrap `poseOf`/`update`/`dribble` too, and C will want the same `63:375` hook. One owner, file numbers above 77, and these files last.
- **yawLock in turn moves** fights `turn()` at reversals. Only set it at u 0.55, and never while kicking (`launch` sets its own).
- **Relabel.** The special path must call `shownType(...,false,...)`; test 7 asserts it.
- **v18.5 dependencies.** 76's `Q` field names for the single-pass override; 77's anchor during a bike.
- **`detour` hack.** Keep it behind `V186.bite`. Drop it if the reviewer objects: the poses alone still sell the move.
- **Frequency taste.** About 25 moves per V match may feel busy; `V186.rate` tunes it.
- **Headless.** Software GL (about 4 fps) cannot judge 3-D motion feel. Sheets will.

## 13. Time estimate (one agent with Playwright)

| Unit | Steps | Time |
|---|---|---|
| B1 skills (`79_skills.js`) | ratings and picker 35 m, scheduling and ball hooks 30 m, 9 move keyframe sets and reactions 75 m, solo-goal swap and lab 20 m, `test/skills.js` 35 m, sheets and tuning 30 m, suites 20 m | **about 4 h** |
| B2 specials (`80_specials.js`) | 63 hook and 2-D conversion 15 m, launch/headOf/finish wraps 35 m, bike, scissor and rabona poses 50 m, feed/caption/replay 20 m, lab 15 m, tests 30 m, sheets 25 m, suites 15 m | **about 3.25 h** |

- Run the two units in parallel worktrees: about 4 h of wall time, plus review and merge.
- To fit 3 hours: drop the sole roll, la croqueta, the elastico and the rabona. B1 is then about 3 h and B2 about 2.5 h.

### Critical Files for Implementation
- /home/user/puzzlel-game/touchline/src/ui_stage.js (`dribble` :357, `launch` :184-210, `flightTarget` :211, `land` :217-222, `finish` :600-631, `shownType` :757, ball carry `update` :775-788, presser :794/:810, `turn` :142-161, `footOf`/`headOf` :165/:174, `poseOf` :1081-1150, `blendPose` :1175, `drawFigure` rot :1199)
- /home/user/puzzlel-game/touchline/src/v17/75_touches.js (`dribLead` :32-56, `v184Is3D`/`v184Body` :61-63, `poseOf` layer :91-144)
- /home/user/puzzlel-game/touchline/src/v17/72_tackles.js (`tackle` :21-55, `chase` :25, tackle poses :77-103)
- /home/user/puzzlel-game/touchline/src/v17/63_p3d_figures.js (roll/pitch selection :374-376; one-line `rollB`/`pitchB` hook)
- /home/user/puzzlel-game/touchline/src/engine.js (`SKILLS`/`OVR_W`/`hF` :43-48, `genPlayer` :74-99, `SHOT_TYPES` :298-309) and /home/user/puzzlel-game/touchline/src/v17/68_replay.js (primitive snapshot :21-27, `V18_RP` :15/:74/:88)

---

# Design C: goalkeeper save variety (v18.6)

I checked everything below against `claude/new-session-miqhgk` (HEAD 3371e3c) between 16:52 and 17:10 UTC. I edited nothing. I ran one Node engine script and two Playwright probes; their scratch files and screenshots are in `/tmp/claude-0/-home-user-puzzlel-game/08a993b8-36ed-5fd4-b73c-2ed3d3a1cb95/scratchpad/v186/` (`saves.js`, `probe_gk.js`, `probe_gk3.js`, `gk_2d_0.png`, `gk_2d_0b.png`, `gk_2d_1.png`, `gk_3d_0.png`).

**Dependency on v18.5.** `76_replay2` (`v18/replay2`) and `77_plates` (`v18/plates`) do not touch keeper poses or `handsOf`. Two constraints follow:
- All new keeper state must live inside `p.dive`, or in primitive fields on the mover. The replay snapshot copies only primitives plus `dive`, `glide` and `ov`, and it copies them shallowly (`68_replay.js:21`).
- The plates' GK chip needs no change.

## 1. How it works today

**One save routine** (`shotSeq`, `ui_stage.js:386-414`)
- Target: `ty=34±2.6`, or `±2.8-3.3` when `e.cor` (:397-399).
- Parry: `parry=corner||(|ty-34|>1.2 && Math.random()<0.3)` (:400).
- Dive: `gk.dive={dir,t:now+wind+max(D(40), sdur-max(150,D(250))), catch:!parry}` and `gk.ov={x:gx-dir*0.8, y:ty}` (:402).
- Flight: `launch(p,{home:gk, hands:true, dur:D(340)+120})` (:403-404). The ball homes to the live `handsOf(gk)` through `flightTarget` (:202).
- Emit timing: the save is emitted with the ball in the hands (catch, or corner :404). For a parry it is emitted after `startFree` (:406, :408).
- After the emit: `wait(D(380)+120)`, then `cornerKick` (:410), `fetch` (:411) or `distribute` (:413).

**Dive pose and contact**
- Pose (`poseOf` :1136): one curve, `rot=±1.3*easeOut(t/240ms)`, pivot 0.55, `lift=sin·0.5`, both hands at (0.06, 2.45, ±0.14).
- The hand target is out of reach. Arm IK is 0.3 + 0.29 from a shoulder at (0, 1.5, ±0.21B) in both 2-D (:1205-1206) and 3-D (`63:391-392`), so the gloves stop at about u 2.09.
- While diving, `p._dv` is set every frame, and `:1143` re-stamps `p.upT`. When the dive clears, the roll-to-knee get-up runs for `max(260,D(650))` (:1145-1146). `50_smooth.js:51-53` re-times `upT` for interpolated draws.
- `handsOf` dive branch (:167-168): `x = p.x + sin(rot)*1.5*hs`, `z = (0.55 + cos(rot)*1.5 + lift)*hs` with `hs=1.06*h/70`. Only the x coordinate moves; y is just the keeper's y.
- `update` (:838) pushes the keeper so his gloves stay at or before x 104.72 (0.28 m off the line).
- Dive sound (:834) and landing turf (:852) fire for any `p.dive`.

**Facing**
- `turn` (:149) shows any dive three-quarters on: yaw 1.15 or π-1.15.
- 2-D rotates the whole figure in the screen plane (`drawFigure` :1199).
- 3-D rolls the body about its own forward axis (`63:374-379`, `ra=rot` for any act other than loco, fall or trip). Because the keeper faces the camera, the gloves travel along pitch x, not along the goal line.

**Other keeper moments**
- Misses: the keeper always dives at `to.y` (:419), including the 38% of misses that go over the bar or 4-7 m wide (:416-417).
- Goals (`finish` :618-619): a wrong-way dive 60% of the time, otherwise an offset so he falls short. The dive is cleared after 500 ms (:630).
- Penalties (`penStrike` :663-695): the keeper dives at contact (:687). `parry=Math.random()<0.5` (:684). There is a fist pump after a save. Shootouts use the same routine (:732).
- Corners (`cornerKick` :495): 40% of crosses are "CLAIMED". The ball homes to the standing hold height (z about 0.92). There is no leap.
- After a catch: `hold` pose (:1111), then `distribute`, which `70_punt.js:121-135` wraps to punt about 60% of the time. The punt pose skips while `p.dive` is set (`70_punt.js:117`).
- 3-D gloves: `63:424`. The dive arm pole is in `71_polish.js:21` (the old pole while `p.dive`).

**Lab and ratings**
- The lab `keeper` scene (`ui_sandbox.js:24`) runs save, save, miss through `shotSeq`. Lab pids `L00`/`L10` use a local lookup, so `Px` returns null.
- Ratings never reach the stage. Every keeper choice is `Math.random()`.

## 2. What is wrong (evidence)

1. **One identical save (verified).** In the 2-D lab probe, both catches met the ball at `(104.72, y, 0.95)`. The keeper was pushed back to x 103.28 by the :838 clamp. So every catch is at 0.95 m, on the goal line, whatever the shot. The two contact frames (`gk_2d_0.png`, `gk_2d_1.png`) show the same pose: flat, flying back toward his own net, with the ball at his head.

2. **An interception lunge hijacks every catch (bug, verified).**
   - The trigger `72_tackles.js:72` stamps `f.home.v18icT` for any flight from an opponent in its last 260 ms. That includes shots homing into the keeper's hands and corner claims.
   - `72_tackles.js:99-102` then replaces the arms with the outfield lunge for `max(240,D(420))` ms.
   - 2-D act sequence: `dive@2750 → intercept@2850 → dive@3192`, with the ball arriving at 3075. The act at contact is `intercept`.
   - 3-D: `intercept` from 2500, 42 ms after the dive starts. The nearest 3-D hand is at (103.92, 32.01, 1.17), the ball at (102.76, 32.10, 0.95). That is **1.18 m apart at the catch** (`gk_3d_0.png`).

3. **The dive is early (verified).** `dive.t` is computed before `launch`, which can first spend up to `max(240,D(260))` squaring the shooter up (:199-200).
   - Measured at 0.85 ts: shot released at 2658, dive started at 2725 (67 ms after release), ball in hands at 3075.
   - So the dive starts 350 ms before contact and he is fully stretched 110 ms early, lying in the air waiting. The comment at :618 says he should arrive "fully stretched as the ball arrives".

4. **3-D geometry is wrong.** `handsOf` uses the 2-D model (x only, scale 1.06). The 3-D figure rolls along its lateral axis, roughly (±0.91, ∓0.41), at scale 0.92. That mismatch is part of the 1.18 m in item 2.

5. **No height or placement variety, and no ratings.** Height comes from the hands, not the shot. The parry, wrong-way and claim shares are flat random numbers (:400, :619, :684, :495).

6. **Engine context available but unused.** Node run, 3 careers × 20 regular fixtures × 3 levels, 1,434 saves:

   | Level | Keeper `sk.gk` min / median / max |
   |---|---|
   | Varsity | 63 / 73 / 95 |
   | JV | 38 / 56 / 68 |
   | MOD | 35 / 44 / 55 |

   - Of the saves, 31-36% carry `cor`. Types: open 39%, long 17%, header 9%, cross 9%, corner 6%, fk 5%, solo 6%, tapin 5%, break 2%.
   - Save xG p10 / p50 / p90 = 0.045 / 0.105 / 0.263.
   - Saved headers are still shown as ground strikes: `shotSeq` has no header path. That overlaps Design A/B; this design only reads `e.ty`.

## 3. User-facing result

- Saves look different depending on where the shot goes.
  - At the keeper: a standing W-catch, or a crouching scoop of a ground shot.
  - Low and wide: a low diving scoop.
  - Mid-height, far: the full-stretch dive (fixed), ending in a diving catch to the chest, a fingertip tip round the post or a two-handed parry.
  - High: a tip over the bar.
  - One-on-ones: the keeper comes off his line and smothers at the forward's feet.
  - Close and low: a leg save. Point-blank: a reaction hand.
  - Corners: a real leap to claim.
- Goals and misses look different too: wrong-footed, late, beaten at full stretch, or rooted for top-corner strikes. On clearly wide or high misses he watches the ball go instead of diving.
- Ratings show.
  - A Varsity 85-90 keeper is set before the strike, moves first, catches most shots and dives cleanly.
  - A MOD 40 keeper is still moving when the ball is struck, parries or spills more, gets wrong-footed more often and gets up slower.
  - Better shooters place their shots nearer the corners, so they force more full-stretch saves.
- Results, events and emit moments are unchanged.

## 4. Data sources

- **Keeper strength:** the engine uses `G = eff(p,'GK') + 1.7*(p.tr.stop||0)` (`engine.js:361`).
  - `eff` is global (`engine.js:52`), and `OVR_W.GK = {gk:.72, pas:.06, spd:.07, h:.15}` (:43).
  - The stage reads the player with `Px(pid)` (`ui_views.js:5` → `findPerson` `engine.js:1149`), which gives `sk:{spd,sta,sho,pas,def,gk}`, `h` (inches), `tr:{score,assist,stop,defend}` (:77) and `pos`.
  - Quality: `q = clamp((G-35)/60, 0, 1)`. Typical medians: V 0.63, JV 0.35, MOD 0.15.
- **Shooter:** `shotQ = clamp((Px(e.pid).sk.sho-35)/60, 0, 1)`.
- **Where to cache it:** wrap `setSides`/`setKeeper` and store the primitive `p.v186q` on the mover.
  - Fallbacks: `st._v186q` (lab/tests), then 0.6. `Px` is null in the lab and the menu demo, and `App.C` can be missing.
  - If Design B adds a shared rating helper, call it instead. Do not declare a duplicate `const` (that is a build-killing SyntaxError); use a `function v186GkQ(st,p)` declaration.
- **Event fields used:** `e.t`, `e.ty`, `e.xg`, `e.sp`, `e.cor`, `e.gk`, `e.pid` (`engine.js:476-482`).

## 5. Save kinds

Conventions:
- Times are milliseconds at 1x, wrapped in `D()` with floors.
- `A` is the lead time from the start of the kind to the moment of contact. `uc` is the phase at contact.
- Body units match `poseOf` (Hs/Fs `f,u,l`). n = the body side the ball is on, f = the far side.
- Every hand target must stay within 0.59 of its shoulder, otherwise the IK clamps it.
- `p.dive = {dir, t, k, A, uc, s(side sign), q, out, tC}` is a new object per save and is never mutated after it is set.

| k (P.act) | When | A | Keyframes (0 → uc → 1) | Contact limb | Outcome | Ends with |
|---|---|---|---|---|---|---|
| `stand` (gkcatch) | \|dy\|<0.6, z 0.45-1.6 | 260 | Short step in (Fs0 f .10), hipU .68→.74, W-hands (0.42, uB, ±0.07) with uB from z, head tilted .15; after contact the ball is cradled to the chest (0.24, 1.22), lean .22 | Midpoint of the hands | Catch, or a q-based spill | Standing, `hold`; base get-up suppressed |
| `stand` high | \|dy\|<0.6, z>1.6, no cor | 280 | Hop (lift .12), hands overhead (0.25, 2.0, ±0.08) | Hands | Catch | Standing |
| `scoop` (gkscoop) | \|dy\|<0.8, z<0.35 | 300 | Long barrier: hipU→.42, lean→.95, one knee down Fs0 (−0.12, 0, −0.05), Fs1 (0.12, 0, 0.2), hands (0.55, 0.28, ±0.06), then scooped to the chest while standing | Hands | Catch | Standing |
| `lowdive` (gklow) | 0.8<\|dy\|<2.8, z<0.5 | 330 | 0-.25 side step (Fn l ±.45, hipU .62); .25-.6 rot→1.45, pivot .3, lift .15, both arms along the turf (0.25-0.35, 1.9-2.05); then flat; hands to chest (catch) or push out (parry) | Hands | Catch or parry | Base roll-to-knee |
| `dive` (dive) | \|dy\|≥1.6, z 0.5-1.8 | 300 | 0-.22 dip and near-foot side step; .22-.62 push-off (far leg long, near knee up), rot→R, lift sin·.5, hands (0.1, 2.08, ±0.12); R solves glove height = target z; flat land at rot 1.5. Variants: `diveCatch` pulls the hands to the chest by .8; `tip` uses the top hand only with a .12 flick, the other arm tucked; `parry` palms forward (f .25) | Hands, or the top hand for `tip` | Catch, parry, or corner (tip round the post) | Base get-up |
| `tipOver` (gktip) | `cor` and z≥1.9 (or a central `cor`) | 320 | 0-.3 drop step back, hipU .64; .3-.65 spring up and back: lift ≤.45, lean −.35, top hand (−0.05, 2.08, ±0.25), other arm out for balance, rot ±.35, head tilt −.4; land on the back foot, one stagger step | Top hand | Ball goes over the bar (`launch(null,{to:{x:gx+dir*1.6, z:2.9}})`), then the existing `cornerKick` | Standing |
| `smother` (gksmother) | `break`/`solo`/`tapin`, or xg≥0.25, shooter within 11 m, z<0.5 | 380 | Comes out early: `gk.ov` on the goal-to-shooter line, lerp(3,6,q) m off the line, `hurry`; 0-.4 set low (hipU .55, lean .35, arms wide and low); .4-.7 goes down sideways across the path (rot→1.4, pivot .2), arms forward; afterwards curls around the ball, knees up | Hands near the turf | Catch, or squirms loose 2-4 m (parry path) | Own get-up holding the ball, lerp(900,550,q) |
| `kick` (gkkick) | Shooter ≤14 m, z<0.45, 0.4<\|dy\|<1.3 | 200 | Weight on the far leg, near leg out sideways Fn (0.15, 0.18, ±0.7), arms flung out, rot ∓.25; then recover with a hop | Near boot (`handsOf` returns the boot during this kind) | Parry, or corner if `cor`; never a catch | Standing |
| `react` (gkreact) | Shooter ≤9 m or a header, z≥0.45 | 160 | A hand shoots out (0.25, uC, ±0.55), flinch (lean −.08, head tilt −.2), rot ±.2 | That hand | Parry or corner; catch only if q>0.8 | Standing |
| `claim` (gkclaim) | Corner claim (:495) | 420 | Two steps, one-foot take-off with the near knee up (Fn u .5), lift ≤.55, hands (0.18, 2.05, ±0.1); pulls the ball down, lands | Hands (z about 2.6) | Claim (unchanged) | Standing, `hold` |
| beaten `wrong`/`late`/`short` | Goals, near misses, woodwork | `dive` | `wrong`: the dive with dir flipped. `late`: starts at tC−0.4A, still going down as the ball passes. `short`: right way, full stretch at tC with the gloves 0.35-0.6 m short | none | Goal or miss | Base get-up |
| `rooted` (gkrooted) | `long`/`fk` goals, \|ty−34\|>2.4, z>1.5, 35% | - | Half step, head turns to follow, hands to the head 400 ms later | none | Goal | Standing |
| `watch` | Misses over the bar (z>2.5) or >1.2 m wide | - | `look()` tracks the ball, small side step, no dive; poor keepers (q<0.3) make a token late dive 30% of the time | none | Miss | Standing |

Stretch tier, to do only if there is time:
- `collapse`: a low shot near the body for low-q keepers; legs buckle, rot 1.2, pivot .05.
- `block`: star jump at point-blank range.
- `fumble`: a catch spills 0.6-1.2 m, then he falls on it and re-gathers.
- `punch`: on corners.
- Penalty styling: the existing catch/parry/goal outcomes shown with `diveCatch`/`parry`/`wrong`/`short`.

**Selection** (in the save path):
1. Pick the target first:
   - `ty = 34 + clampN(σ)` with `σ = lerp(1.0, 2.6, shotQ)`, limited to |ty−34|≤3.3; `cor` forces ≥2.6 or a high `tipOver`.
   - Height band weights by `e.ty`:

     | e.ty | low | mid | high |
     |---|---|---|---|
     | open / solo / cross | .40 | .35 | .25 |
     | long / fk | .20 | .40 | .40 |
     | header / corner | .25 | .55 | .20 |
     | tapin / break | .65 | .30 | .05 |

   - z is capped at 2.2 so the ball stays under the bar.
2. Choose the kind from `dy = ty − keeper y`, z, shooter distance and the type.
3. If the reach needed is more than `lerp(2.3, 3.2, q)` m, prefer `tip`/`parry` over a catch.
4. Catch probability by kind:

   | Kind | P(catch) |
   |---|---|
   | stand | .75+.23q |
   | scoop | .70+.28q |
   | lowdive | .30+.50q |
   | diveCatch (\|dy\|>2.2) | .15+.55q |
   | smother | .40+.50q |

   Otherwise the outcome is a parry.

**Timing:**
- Each kind is anchored to the real release with `opt.onRelease` (`ui_stage.js:196`): `tC = f.t0 + f.dur` and `t = tC − A·ts`.
- If the start would come before `release + react(q)` (react = `max(30, D(lerp(170,70,q)))`), he is late. The phases compress, so it reads as a scramble.
- Setting early: keepers with q≥0.5 get their `gk.ov` at the start of the sequence, so they arrive and set (`gkset` :1106) before the strike. Keepers with q<0.5 only get it at release, so they are still moving.
- Wrong-footed share on goals: `lerp(.68, .32, q)`. Late: `lerp(.22, .05, q)`.

**Facing:**
- 3-D: the keeper faces the shooter. Use `look(gk, shooter.x, shooter.y, ms through the get-up)`; `yawLock` has priority over the dive yaw (:147 before :149). Rolling about his forward axis then sends the gloves along the goal line.
- 2-D: keep the three-quarter yaw and the screen-plane roll for diving kinds. Standing kinds use `look()` in both renderers.

**Contact point** (one function `v186World(st, p, P, f, u, l)`, shared by `handsOf` and the tests):
- Clamp the hand target to 0.59 from the shoulder, after lean (`up()` as in :1196 and `63:385`).
- 2-D: replicate the screen-plane roll, which is a roll about pitch y. Let `sx = f·ca − l·sa`, `dyb = f·sa + l·ca`. Then:
  - `sx' = sx·cosr + (u−pv)·sinr`
  - `u' = −sx·sinr + (u−pv)·cosr + pv + lift`
  - World point: `(p.x + sx'·hs, p.y + dyb·hs, u'·hs)` with `hs = 1.06·h/70`.
  - This reproduces today's `handsOf` exactly: f .06, u 2.09, rot 1.3 gives 1.48 / 0.97. The depth term matches `proj`'s `DEP` (checked algebraically against `ui_stage.js:915` and :1194).
- 3-D (`v184Is3D(st)`, `75_touches.js:61`): replicate `bw` (`63:376-379`) with `S = 0.92·h/70`, roll about forward.
- Ball underside = contact height − ball radius (use `v184Off`/`V18_BALL_R` as `75_touches.js:66` does).
- Positioning: `gk.ov = target − Δ(kind at uc)`, clamped to the frame. The :838 line clamp still holds.

## 6. Files and hooks

New file `src/v17/80_saves.js` (renumber at integration if A/B take 78/79), behind `V186K = {on:true, ...}` switches. Plus `test/saves.js` and a lab scene.

1. **`setSides` / `setKeeper` wrappers:** set `p.v186q`.
2. **Outer `update` wrapper (runs before 72's):**
   - `if(f && f.hands && f.home && f.home.gk) f._v18ic = 1`. This stops the intercept stamp for shots and claims; outfield interceptions are unchanged.
   - Pre-set `p.diveSnd = 1` and `p._landT = 1` for standing kinds, so they get no whoosh and no turf.
   - Penalty styling (stretch tier): when `setPiece === 'pen'` and `gk.dive` has no `k`, replace it with a new object that carries a `k`.
3. **`shotSeq` wrapper:**
   - For `e.t === 'save' && e.ty !== 'pen' && gk && V186K.on`, run `v186Save(e)`. It copies the approach at :387-395 (comment it as mirroring those lines), then runs the new save branch.
   - Unchanged: flight duration `D(340)+120`, the emit points (in hands, or loose with `gk.dive` set), the `D(380)+120` wait and the `cornerKick` / `fetch` / `distribute` tails.
   - For misses, set `this._v186ctx = {k:'miss', e}` and call `prev`.
4. **`finish` wrapper:** `_v186ctx = {k:'goal', e}`, cleared in a `try/finally`.
5. **`launch` wrapper:**
   - On the first `kind 'shot'` launch with a context, rewrite `gk.dive`/`ov` to the beaten or watch kind, timed through `onRelease`.
   - `opt.home.gk && opt.hands && (opt.h||0) >= 3` means a claim: kind `claim`.
6. **`handsOf` wrapper (after `70_punt`'s):** if `p.gk && p.dive && p.dive.k && now >= p.dive.t`, return `v186World` for the contact limb, otherwise `prev`.
7. **`poseOf` wrapper (outermost):**
   - Early exit unless `p.gk && p.dive && p.dive.k`. Build P from the keyframes; this overrides 72's intercept as well.
   - For standing kinds, when `prev` returns `act 'getup'`, set `p.upT = -9e9` and use a 250 ms settle instead.
8. **`blendPose` wrapper:** for P with the `v186` flag, return P unblended once `D(60)` ms into the kind. Keyframe 0 equals the `gkset` pose, so there is no pop, and the drawn gloves equal the contact point. Today's 260 ms blend would lag the gloves behind the ball.
9. **Lab:**
   - `LAB_SCENES.push(['saves','Keeper: save variety'])` and wrap `labRun` (same pattern as `70_punt.js:139-144`). It cycles every kind with `st._v186force = {k, q}` for q in {0.15, 0.6, 0.92} and logs `kind · q`.
   - The existing `keeper` scene uses natural selection.
10. **Captions:** TIPPED OVER THE BAR, SMOTHERED, KICK SAVE, WHAT A SAVE! (q≥.75 at full stretch); existing captions otherwise.
11. **3-D:** no edits to `63`. The new acts take the roll path (`63:375`), and `71_polish.js:21` keeps the dive arm pole while `p.dive` is set.
12. **Docs:** a What's New entry in `ui_v8.js` and a section in `DEVELOPER_NOTES.md`.

## 7. Edge cases

- **2-D and 3-D:** the contact point depends on the renderer. Switching renderer mid-flight re-homes the ball (rare, harmless). In 3-D the get-up yaw lock must cover the get-up, so he doesn't snap to three-quarters.
- **Camera modes:**
  - Broadcast and Sideline: 2-D sideline is only a tighter framing of the same projection (`74_sideline.js:8`).
  - Tactical: no poses; the ball dot sits at the contact point.
- **Speeds:** D floors apply. At ts<0.3 prefer `stand`/`dive`/`scoop` (multi-phase kinds don't read at 4-8x). The corner tail only runs at ts≥0.45, as now.
- **Skip:** `launch` lands immediately and `onRelease` still fires. All state is in `p.dive`, which every reset path clears (:97, :106, :708, :747).
- **Reduced motion:** kinds still play (they carry information). Blending is already raw; turf is off; no extra shake.
- **Lab/demo pids:** q falls back to 0.6.
- **Replays:** goals carry the beaten kinds inside `p.dive`, which the snapshot copies. Never mutate a `dive` object after creating it.
- **Punt:** `70_punt.js:117` returns while `p.dive` is set; the punt starts after `dive=null`, as now.
- **Shootout and pens:** outcome mix unchanged.
- **TouchlineTV:** real pids, so q comes from the players.

## 8. Performance

- `poseOf` and `handsOf` exit early for everyone except a keeper mid-save. The keyframes cost about 25 lerps, about 20 µs per frame.
- No new allocations beyond the P objects `poseOf` already makes.
- `handsOf` runs once per update step during a homing flight.

## 9. Tests (`test/saves.js`) with concrete assertions

1. **2-D contact:** forced kinds in the lab `saves` scene at 1x. At `land`, the drawn contact limb (`v186World` on the blended `p._pose`, after the IK clamp) is within 0.35 m of the ball centre, and `p._act` equals the kind's act, never `intercept`. Run for all 12 core kinds.
2. **3-D contact:** wrap `window.v18FigDraw` as in `probe_gk3.js` and read `W[24..26]`, `W[33..35]` (hands) and `W[6..8]`, `W[15..17]` (ankles). The nearest one is within 0.40 m of the ball centre for `stand`, `dive`, `scoop` and `tipOver`. Allow 120 s on software GL.
3. **Timing:** full extension (phase `uc`) within ±40 ms of the ball's arrival, never more than 60 ms early. Baseline today: 110 ms early. Emit time minus release equals the flight duration ±1 step.
4. **Ratings:** 40 saves at q 0.92 against 40 at q 0.15 (8x).
   - Ball still in hands 300 ms after the emit: at least 0.65 against at most 0.40.
   - Mean reaction start at least 60 ms earlier for q 0.92.
   - Keeper set (`gkset`) at release in at least 70% against at most 40%.
5. **Variety:** 60 natural lab saves at q 0.6: at least 6 distinct kinds, none above 45%; contact z p10 < 0.35 m and p90 > 1.6 m.
6. **Goals:** forced `finish` with q 0.15 shows a wrong-way dive in at least 50% of 30; with q 0.9, at most 45%.
7. **Misses:** for over or wide-by-1.2 m misses at q≥0.5, no dive act in at least 80% of 20.
8. **Intercept fix:** `touches`/`polish` stay green. An outfield interception (lab `receive`/`tackle`) still shows `intercept`.
9. **No page errors;** a reduced-motion run (`emulateMedia`) completes.
10. **Regression suites:**
    - `test/sync.js`: it only prints JSON, so check the numbers by eye: `savesNotInHands` stays 0 and `loose` / `far` stay at today's level.
    - Also run `goalcap`, `postcap`, `v13_audit` (engine untouched), `anim` (glove check), `punt`, `shootout`, `kickoff`, `replay`, `stage3d_smoke`, `touches`, `polish`.

## 10. Screenshots to inspect

- Each core kind at contact and at +200 ms, in 2-D broadcast.
- `stand`, `dive`, `tipOver`, `smother` in 3-D broadcast and 3-D sideline.
- One phone 390×844 2-D catch.
- Tactical during a save.
- The lab `keeper` scene before and after, compared with `gk_2d_0.png` and `gk_3d_0.png`.
- A live 2x match: one save each at Varsity and MOD.

## 11. Risks

- **Copied approach code:** the copy in `v186Save` can drift from :387-395. Mitigation: comment it, and test 3.
- **Blend bypass:** may pop when the keeper is mid-run. Mitigation: a 60 ms crossfade.
- **Longer save sequences for poor keepers:** a parry or a spill needs a `fetch`. Event order and emit points are unchanged, but the broadcast takes a little longer; sim-ahead absorbs it. Report the mean save-sequence duration per level, before and after.
- **3-D yaw lock:** can fight `75_touches`' looks during the get-up. Verify by eye.
- **Shared `p.dive` state:** `sync.js:22` relies on `q.dive` being set at a parry emit. Every non-catch kind must keep `p.dive` truthy until after the emit.
- **Scope:** 12 core kinds is the main schedule risk; use the cut line below.

## 12. Estimate (one agent with Playwright)

| Step | Time |
|---|---|
| Scaffolding: q cache, intercept fix, `onRelease` timing, lab scene | 0:25 |
| Contact function, both renderers | 0:25 |
| 12 core kinds and their keyframes | 1:20 |
| Selection, save branch, goal / miss / claim hooks | 0:40 |
| `test/saves.js` and tuning the 2-D/3-D contact distances | 0:45 |
| Regression suites, serially | 0:30 |
| Screenshots and notes | 0:20 |
| **Total** | **about 4:25** |

Cut line at 3:00: drop `react`, `kick` and `claim` and all stretch-tier items. Keep `stand`, `scoop`, `lowdive`, `dive` / `diveCatch` / `tip` / `parry`, `tipOver`, `smother`, beaten `wrong` / `late` / `short`, `watch`, the rating mapping, the intercept and timing fixes, and tests 1, 3, 4, 5 and 10.

### Critical Files for Implementation
- `/home/user/puzzlel-game/touchline/src/ui_stage.js` (`shotSeq` :386-423, `handsOf` :166-170, `launch` :184-201, `finish` :600-631, `poseOf` keeper parts :1106-1146, `blendPose` :1175-1182, `update` :834-852)
- `/home/user/puzzlel-game/touchline/src/v17/72_tackles.js` (intercept stamp :72, pose :99-102)
- `/home/user/puzzlel-game/touchline/src/v17/63_p3d_figures.js` (roll / `bw` :374-392, gloves :424)
- `/home/user/puzzlel-game/touchline/src/v17/70_punt.js` (`handsOf`/`poseOf`/`distribute` wrappers, lab scene pattern :139-144)
- `/home/user/puzzlel-game/touchline/src/engine.js` (save event :476-482, keeper G :361, `OVR_W` :43, `eff` :52)
