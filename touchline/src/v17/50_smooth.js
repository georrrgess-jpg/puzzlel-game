/* ===================== v17 Phase 2 (part): smooth motion between simulation steps, and a cameraman =====================
   1. Interpolation. The simulation steps at a fixed 120 Hz and draws at 25-60 fps; Stage.drawLerp used to blend only
      x/y of the figures and the ball, so facing, stride, every time-based pose and the camera moved in visible
      steps. keepPrev now also remembers each mover's yaw, gait phase ph, gait speed gv, turnLean, acS and spd, the
      stage clock and the camera x/w; drawLerp draws at the in-between moment: yaw along the shortest arc, the rest
      linearly, now = prevNow + alpha * step (never earlier than the previous draw, so blendPose never sees a
      negative dt), and puts every value back exactly afterwards. Teleport guards: no blending over a > 3 m jump,
      a > 1.2 rad turn, a > pi stride phase step or a > 3 m camera cut. Reduced motion draws the raw step, as before.
      poseOf writes p.upT (getting up after a dive) during a draw and the steering reads it: a value stamped at the
      interpolated time is moved to the real step time, so draws never change the simulation.
   2. Camera (replaces the two "camera" lines at the end of update(); zoom easing toward cam.tw is unchanged).
      - target: this.focus.x when set, 92 in a shootout, else the ball + 4 m toward the attacked goal + a look-ahead
        of 0.4 s of (smoothed) ball speed, capped at 6 m;
      - within 35 m of a goal the target leans toward it so the goal mouth stays in view (never so far the ball
        leaves the middle 60 %);
      - a 3 m dead zone: while the target is within 3 m of the frame centre there is no pull, only damping, so a
        dribbler's touches do not tug the frame and a stopping ball does not make the camera swing back;
      - outside it, a critically damped spring (omega 4.5/s) toward the zone's edge with velocity feed-forward from
        the target's (smoothed) speed, so a steady run is tracked without lag or overshoot; the ball is never allowed
        past 42 % of the frame width from the centre; the same clamps as before (cam.w*0.36 from each goal line);
      - this.focus and shootouts frame their target exactly, with the same spring and no dead zone;
      - cuts: anything that sets cam.x / cam.w directly (snap(), restarts, replays, the lab, resize) is adopted at
        once with the spring at rest, and a ball teleport (> 8 m in one step) cuts straight to the new framing;
      - reduced motion (this.rm): plain first-order follow at 2.4/s (the old behaviour), no look-ahead, no spring.
   Presentation only: nothing the simulation reads is changed. */

const V17_SM_DT=1000/120;
const v17_smKeepPrev=Stage.prototype.keepPrev;
function v17SmKeep(o){ o._v17y=o.yaw; o._v17ph=o.ph; o._v17gv=o.gv; o._v17tl=o.turnLean; o._v17ac=o.acS; o._v17sp=o.spd; }
Stage.prototype.keepPrev=function(){ v17_smKeepPrev.apply(this,arguments);
  for(const p of this.players.values()) v17SmKeep(p); v17SmKeep(this.ref); for(const a of this.ars) v17SmKeep(a);
  this._v17pn=this.now; this._v17pc=[this.cam.x,this.cam.w]; };

const v17_smDrawLerp=Stage.prototype.drawLerp;
const v17SmL=(p,c,a)=>(typeof p==='number'&&typeof c==='number')?p+(c-p)*a:c;
Stage.prototype.drawLerp=function(a){
  const now=this.now;
  if(a>=0.999||this.rm||this._v17pn==null){ this._v17dn=now; return v17_smDrawLerp.apply(this,arguments); }
  const S=[]; const lerpMover=o=>{ if(o._px==null||o._v17y===undefined) return; const dx=o.x-o._px, dy=o.y-o._py; if(dx*dx+dy*dy>9) return;
    S.push(o,o.yaw,o.face,o.ph,o.gv,o.turnLean,o.acS,o.spd,o.upT);
    if(typeof o.yaw==='number'&&typeof o._v17y==='number'){ const d=Math.atan2(Math.sin(o.yaw-o._v17y),Math.cos(o.yaw-o._v17y)); if(Math.abs(d)<1.2){ o.yaw=o._v17y+d*a; o.face=Math.cos(o.yaw)>=0?1:-1; } }
    if(typeof o.ph==='number'&&typeof o._v17ph==='number'&&Math.abs(o.ph-o._v17ph)<Math.PI) o.ph=o._v17ph+(o.ph-o._v17ph)*a;
    o.gv=v17SmL(o._v17gv,o.gv,a); o.turnLean=v17SmL(o._v17tl,o.turnLean,a); o.acS=v17SmL(o._v17ac,o.acS,a); o.spd=v17SmL(o._v17sp,o.spd,a); };
  for(const p of this.players.values()) lerpMover(p); lerpMover(this.ref); for(const r of this.ars) lerpMover(r);
  /* the stage clock: between the previous step and this one, never behind the previous draw */
  let nI=now; const span=now-this._v17pn; if(span>0&&span<=2*V17_SM_DT+1e-6){ nI=this._v17pn+span*a; const dn=this._v17dn; if(dn!=null&&dn<=now&&nI<dn) nI=dn; }
  const c=this.cam, pc=this._v17pc, cx=c.x, cw=c.w; if(pc){ if(Math.abs(cx-pc[0])<3) c.x=pc[0]+(cx-pc[0])*a; if(Math.abs(cw-pc[1])<3) c.w=pc[1]+(cw-pc[1])*a; }
  this.now=nI;
  try{ return v17_smDrawLerp.apply(this,arguments); }
  finally{ this.now=now; c.x=cx; c.w=cw; this._v17dn=nI;
    for(let i=0;i<S.length;i+=9){ const o=S[i]; const upT=o.upT; o.yaw=S[i+1]; o.face=S[i+2]; o.ph=S[i+3]; o.gv=S[i+4]; o.turnLean=S[i+5]; o.acS=S[i+6]; o.spd=S[i+7];
      if(upT!==S[i+8]&&upT===nI) o.upT=now; /* stamped by poseOf during this draw: use the real step time */ }
    if(nI!==now) for(const p of this.players.values()) if(p.upT===nI) p.upT=now; } };

/* ---------- camera ---------- */
const V17_CAM={om:4.5,dead:3,look:0.4,lookMax:6,goal:35,edge:0.42,cut:8};
const v17_smUpdate=Stage.prototype.update;
Stage.prototype.update=function(dt){
  const c=this.cam, b=this.ball; let V=this._v17cam;
  /* anything that moved the camera since our last step (snap, a restart, a replay, the lab, resize) is a cut */
  const ext=!V||c.x!==V.x||c.w!==V.w; if(ext) V=this._v17cam={x:c.x,w:c.w,v:0,tp:null,tv:0,bv:0,bx:b.x};
  const r=v17_smUpdate.apply(this,arguments);
  if(!dt||dt<=0){ V.x=c.x; V.w=c.w; return r; }
  const w=c.w; const tele=Math.abs(b.x-V.bx)>V17_CAM.cut; const bvr=tele?0:(b.x-V.bx)/dt; V.bx=b.x;
  V.bv=tele?0:V.bv+(bvr-V.bv)*Math.min(1,dt*3);
  const free=!this.focus&&!this.so; let T;
  if(this.so) T=92; else if(this.focus) T=this.focus.x;
  else { T=b.x+(this.own?(this.own.side===0?4:-4):0); if(!this.rm) T+=clamp(V.bv*V17_CAM.look,-V17_CAM.lookMax,V17_CAM.lookMax); }
  const lo=w*0.36, hi=105-w*0.36;
  if(free){ /* near a goal, lean the frame toward it so the goal mouth stays in view, never losing the ball */
    const hw=w*0.62; for(const G of [0,105]){ const d=Math.abs(b.x-G); if(d>=V17_CAM.goal) continue; const k=smooth((V17_CAM.goal-d)/12); const need=G===105?G-(hw-5):G+(hw-5);
      T=G===105?Math.max(T,T+(need-T)*k):Math.min(T,T+(need-T)*k); }
    T=clamp(T,b.x-w*0.3,b.x+w*0.3); }
  T=clamp(T,lo,hi);
  /* target speed for the feed-forward (a jump of more than 1 m in one step is a new target, not motion) */
  const jump=V.tp==null||ext||tele||Math.abs(T-V.tp)>1; V.tv=jump?0:V.tv+((T-V.tp)/dt-V.tv)*Math.min(1,dt*6); V.tp=T;
  let x, A=T, tv=V.tv;
  /* dead zone: while the target is within 3 m of the frame centre there is no pull, only damping, so the camera
     settles where it is instead of swinging back; once the target leaves the zone the frame is pulled to its edge */
  if(free&&!this.rm){ const dz=V17_CAM.dead, e=T-V.x; if(Math.abs(e)<=dz){ A=V.x; tv=0; } else A=T-Math.sign(e)*dz; }
  if(!free) tv=0;
  if(tele){ x=T; V.v=0; }
  else if(this.rm){ x=V.x+(T-V.x)*Math.min(1,dt*2.4); V.v=0; }
  else { const om=V17_CAM.om; const acc=om*om*(A-V.x)+2*om*(tv-V.v); V.v+=acc*dt; x=V.x+V.v*dt; }
  if(free&&!tele){ /* the ball never leaves the frame */ const lim=w*V17_CAM.edge, off=b.x-x; if(Math.abs(off)>lim){ const s=Math.sign(off); x=b.x-s*lim; if(s*V.v<s*V.bv) V.v=V.bv; } }
  if(x<lo){ x=lo; if(V.v<0) V.v=0; } else if(x>hi){ x=hi; if(V.v>0) V.v=0; }
  c.x=x; V.x=c.x; V.w=c.w; return r; };
