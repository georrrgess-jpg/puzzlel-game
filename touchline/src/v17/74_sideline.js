/* ===================== v18.4 Sideline camera and zoom levels (74) =====================
   Presentation only: nothing here touches engine.js, the stage's simulation, results or events.
   1. Zoom levels. PREFS.zoom = 'wide' | 'normal' | 'close' | 'tight' (default normal, saved with savePrefs). Stages built
      with {uzoom:true} (the live match and the goal-replay card) multiply their camera width by Stage.v184K() where
      zoomTo and resize set it (ui_stage.js), so scripted framings (penalties, celebrations, set pieces) keep their relative
      zoom; a change only moves cam.tw, so it eases in through the stage's own zoom easing. Tactical ignores zoom.
      In 3-D the broadcast gantry reads cam.w as before; the sideline camera turns the level into its lens.
   2. Sideline view (st.mode 'sideline'). 2-D: the broadcast drawing framed tighter (V184_SL2D on the camera width).
      3-D: Painter3D.camPose is wrapped. The eye stands on the near touchline (stage y ~70.7, inside the near rail at
      71.6) at 2.0 m, a coach in the technical area or a substitute warming up, and looks across at the far side
      (dugouts, LED boards, main stand). It slides along the line after the play through a heavy critically damped
      spring (v18Damp), clamped to x 18..87, and never bobs. The head turns and tilts toward a smoothed ball point with a
      small lead toward the attack, through its own springs, rate-limited and kept so the ball stays inside the frame.
      Anything within ~3 m of the eye (a throw-in taker, the near assistant, a ball run out) makes it step back toward
      the rail and along the line through a faster spring. The director (66) then treats this pose as its 'main' pose:
      in sideline view its kick-off, corner and penalty presets are not used, the goal replay and the celebration
      close-up still play with their blends and fades, and its far-side gantry lift is skipped (P._slOn).
      Switching broadcast <-> sideline is a 120-180 ms fade-through-black cut (v18Cut); restarts and half time cut too.
      Reduced motion (st.rm): the camera holds still and cuts to a new framing when the ball nears the frame edge.
   State lives on P._sl; P._slOn says whether the current frame is a sideline frame. */

const V184_ZOOMS=[['wide','Wide',1.3,46],['normal','Normal',1,34],['close','Close',0.78,26],['tight','Tight',0.6,19]];
const V184_SL2D=0.72;
const V184_SL={z:70.7,zBack:71.32,h:2.0,x0:18,x1:87,omEye:0.8,omAvoid:3.4,omBall:3.2,omAim:2.6,omFov:3,rate:1.2,clear:3.6,limH:0.66,limV:0.6};
DEFAULT_PREFS.zoom='normal'; if(!V184_ZOOMS.some(z=>z[0]===PREFS.zoom)) PREFS.zoom='normal';

function v184ZoomIdx(){ const i=V184_ZOOMS.findIndex(z=>z[0]===PREFS.zoom); return i<0?1:i; }
function v184ZoomF(){ return V184_ZOOMS[v184ZoomIdx()][2]; }
/* the camera-width factor for a stage: user zoom (live stage and replay card only), tighter in 2-D sideline view */
Stage.prototype.v184K=function(){ if(!this.v184z||this.mode==='tactical') return 1; let k=v184ZoomF();
  if(this.mode==='sideline'&&!(this._p3d&&!this._p3d.dead)) k*=V184_SL2D; return k; };
/* re-apply the factor: eases through cam.tw, or snaps (a view switch) */
Stage.prototype.v184Zoom=function(snap){ if(!this.bw) return; this.cam.tw=this.bw*this.zoom*this.v184K(); if(snap) this.cam.w=this.cam.tw; if(this.requestDraw) this.requestDraw(); };

/* ---------- controls: markup, state and input ---------- */
function v184ZoomCtl(act,view){ const i=v184ZoomIdx(), off=view==='tactical', z=V184_ZOOMS[i];
  const dOut=off||i===0, dIn=off||i===V184_ZOOMS.length-1;
  return `<div class="seg v184-zoom${off?' v184-off':''}" role="group" aria-label="Zoom${off?' (not used in Tactical)':''}"><button type="button" data-a="${act}" data-v="-1" aria-label="Zoom out" aria-disabled="${dOut}" title="Zoom out (−)">−</button><span class="v184-zl" aria-live="polite" title="Zoom level">${off?'Fit':z[1]}</span><button type="button" data-a="${act}" data-v="1" aria-label="Zoom in" aria-disabled="${dIn}" title="Zoom in (+)">+</button></div>`; }
function v184ViewSeg(act,view){ return `<div class="seg" role="group" aria-label="Camera">${[['broadcast','Broadcast'],['sideline','Sideline'],['tactical','Tactical']].map(([k,l])=>`<button type="button" class="${view===k?'on':''}" data-a="${act}" data-v="${k}" aria-pressed="${view===k}">${l}</button>`).join('')}</div>`; }
const V184_VIEWS=['broadcast','sideline','tactical'];
function v184NextView(v){ const i=V184_VIEWS.indexOf(v||'broadcast'); return V184_VIEWS[(i<0?0:i+1)%V184_VIEWS.length]; }
/* a view switch on a stage: snap the width under the cut (2-D), the 3-D painter fades between broadcast and sideline */
function v184SetView(st,v){ if(!st) return; st.mode=v; st.bgTac=null; st.v184Zoom(true); if(st.requestDraw) st.requestDraw(); }
/* step the zoom level; returns true when it changed */
function v184StepZoom(d){ const view=PREFS.view||'broadcast'; if(view==='tactical') return false; const i=v184ZoomIdx(), j=Math.max(0,Math.min(V184_ZOOMS.length-1,i+d)); if(j===i) return false;
  PREFS.zoom=V184_ZOOMS[j][0]; savePrefs();
  for(const st of [App.live&&App.live.stage,App.hl]) if(st&&st.alive) st.v184Zoom(false);
  v184PaintZoom(); return true; }
/* refresh every zoom control on the page (the live bar is rebuilt by updateLive, the replay card in place) */
function v184PaintZoom(){ const ae=document.activeElement, fk=ae&&ae.dataset&&/Zoom$/.test(ae.dataset.a||'')?[ae.dataset.a,ae.dataset.v]:null;
  if(App.live&&typeof updateLive==='function') try{ updateLive(); }catch(e){}
  document.querySelectorAll('.v184-zoom').forEach(el=>{ const act=(el.querySelector('[data-a]')||{}).dataset; if(!act||act.a==='liveZoom') return;
    const w=document.createElement('div'); w.innerHTML=v184ZoomCtl(act.a,PREFS.view||'broadcast'); el.replaceWith(w.firstChild); });
  /* keep keyboard focus on the zoom button that was used (the bar is rebuilt) */
  if(fk&&!document.activeElement.isConnected||fk&&document.activeElement===document.body){ const b=document.querySelector(`[data-a="${fk[0]}"][data-v="${fk[1]}"]`); if(b) b.focus({preventScroll:true}); } }
/* the mouse wheel over the match canvas: one level per notch, with a short cooldown; the page scrolls at the ends */
const V184_WHEEL={t:0,dir:0};
document.addEventListener('wheel',e=>{ const t=e.target; if(!t||!t.closest||!t.closest('#lv-stage,.hl-stage')) return; if(App.modal&&!t.closest('.hl-stage')) return;
  const dy=e.deltaY||0; if(Math.abs(dy)<0.5||e.ctrlKey) return; const d=dy<0?1:-1, now=e.timeStamp||performance.now();
  const i=v184ZoomIdx(), can=(PREFS.view||'broadcast')!=='tactical'&&(d>0?i<V184_ZOOMS.length-1:i>0);
  if(now-V184_WHEEL.t<240&&V184_WHEEL.dir===d){ if(can) e.preventDefault(); return; }
  if(v184StepZoom(d)){ e.preventDefault(); V184_WHEEL.t=now; V184_WHEEL.dir=d; } },{passive:false});

/* ---------- the 3-D sideline camera ---------- */
const _v184CamPose=Painter3D.prototype.camPose;
Painter3D.prototype.camPose=function(st,opt){ const now=performance.now();
  const S=this._sl||(this._sl={shown:null,swAt:0,lastT:0,init:false,cuts:0,frames:0,e:{p:0,v:0},o:{x:0,vx:0,z:0,vz:0},b:{x:52.5,vx:0,z:34,vz:0},a:null,dir:null,fov:42,fv:0,eye:null,near:99});
  const m=st.mode==='sideline'&&!opt?'sideline':'broadcast';
  /* first frame, or back from the tactical board (no 3-D frame in between): adopt the view at once, as a cut */
  if(S.shown==null||S.tac){ if(S.shown!==m){ S.init=false; if(this.dir&&S.shown!=null) this.dir.snap=true; } S.shown=m; S.swAt=0; S.tac=false; }
  else if(m!==S.shown){ const P=this; if(!S.swAt){ v18Cut(st,170); S.swAt=now+85; if(P.dir) P.dir.cutAt=S.swAt; } if(now>=S.swAt){ S.shown=m; S.swAt=0; S.init=false; } }
  S.frames++;
  if(S.shown!=='sideline'){ this._slOn=false; return _v184CamPose.apply(this,arguments); }
  this._slOn=true; v184SidelinePose(this,st,S,now); };

function v184SidelinePose(P,st,S,now){ const T=P.T, cam=P.camera, C=V184_SL, b=st.ball, D=P.dir; const dt=Math.min(0.1,P.dt||0.016);
  if(!S.a){ S.a={p:new T.Vector3(),v:new T.Vector3()}; S.dir=new T.Vector3(); S.eye=new T.Vector3(); S.pe=new T.Vector3(); S.tmp=new T.Vector3(); S.q=new T.Vector3(); }
  const frozen=!!(st._rp&&st._rp.on); /* goal replay: the director films it; the sideline springs hold their state */
  let snap=!S.init||!!(D&&(D.fresh||D.snap||(D.cutAt&&now>=D.cutAt)));
  /* 1. the smoothed ball (x along the line, z across) and the point the eye aims at */
  const bx=isFinite(b.x)?b.x:52.5, bz=isFinite(b.y)?b.y:34, bh=Math.max(0,b.z||0);
  if(snap){ S.b.x=bx; S.b.z=bz; S.b.vx=0; S.b.vz=0; }
  else if(!frozen){ let r=v18Damp(S.b.x,S.b.vx,bx,C.omBall,dt); S.b.x=r[0]; S.b.vx=r[1]; r=v18Damp(S.b.z,S.b.vz,bz,C.omBall,dt); S.b.z=r[0]; S.b.vz=r[1]; }
  const o=st.own; const att=o&&!st.fl?(o.side===0?1:-1):0;
  const lead=Math.max(-6,Math.min(6,att*2.2+S.b.vx*0.3));
  /* aim a little above the play, more so for far play, so the action sits just below the middle with the far stand above */
  /* on tall frames (phones) the lens is opened up for width, so the head tilts a little down instead (less sky) */
  const ka=Math.max(0,Math.min(1,((cam.aspect||1.6)-1.05)/0.5));
  const ax=S.b.x+lead, az=S.b.z, ay=0.55+0.65*ka+Math.min(40,Math.hypot(ax-S.e.p,az-C.z))*0.028*ka+Math.min(4,bh)*0.5;
  /* 2. the eye: a heavy slide along the line after the play, never bobbing */
  const ex0=Math.max(C.x0,Math.min(C.x1,S.b.x+lead*0.6));
  if(snap){ S.e.p=ex0; S.e.v=0; } else if(!frozen){ const r=v18Damp(S.e.p,S.e.v,ex0,C.omEye,dt); S.e.p=r[0]; S.e.v=r[1]; }
  /* 3. clearance: anything within C.clear of the eye pushes it back toward the rail and along the line (faster spring) */
  let wantX=0, wantZ=0, near=99;
  if(!frozen){ const objs=[]; for(const p of st.players.values()) if(!p.off) objs.push(p); if(st.ref) objs.push(st.ref); for(const a of st.ars||[]) objs.push(a); objs.push(b);
    const zb=C.zBack-C.z; let close=0;
    for(const q of objs){ const d=Math.hypot(S.e.p-q.x,C.z-q.y); if(d<C.clear+1.2) close=Math.max(close,Math.min(1,(C.clear+1.2-d)/1.6)); }
    wantZ=zb*close*close*(3-2*close);
    for(let it=0;it<3;it++){ let push=0; const ex=S.e.p+wantX, ez=C.z+wantZ;
      for(const q of objs){ const dz=ez-q.y; if(Math.abs(dz)>=C.clear) continue; const need=Math.sqrt(C.clear*C.clear-dz*dz); const dx=ex-q.x; if(Math.abs(dx)>=need) continue;
        let s=Math.sign(dx); if(Math.abs(dx)<0.15) s=ex<52.5?1:-1; if(ex+s*(need-Math.abs(dx))>C.x1+4||ex+s*(need-Math.abs(dx))<C.x0-4) s=-s;
        const p=s*need-dx; if(Math.abs(p)>Math.abs(push)) push=p; }
      if(Math.abs(push)<1e-3) break; wantX+=push; } }
  if(snap){ S.o.x=wantX; S.o.vx=0; S.o.z=wantZ; S.o.vz=0; }
  else if(!frozen){ let r=v18Damp(S.o.x,S.o.vx,wantX,C.omAvoid,dt); S.o.x=r[0]; S.o.vx=r[1]; r=v18Damp(S.o.z,S.o.vz,wantZ,C.omAvoid,dt); S.o.z=r[0]; S.o.vz=r[1]; }
  const prevE=S.pe.copy(S.eye);
  let ex=Math.max(C.x0-4,Math.min(C.x1+4,S.e.p+S.o.x)), ez=Math.max(C.z-0.4,Math.min(C.zBack,C.z+S.o.z));
  /* a step never faster than a brisk walk, outside cuts */
  if(!snap&&S.init&&!st.rm){ const mv=Math.hypot(ex-prevE.x,ez-prevE.z), mx=Math.max(0.05,4.5*dt); if(mv>mx){ ex=prevE.x+(ex-prevE.x)*mx/mv; ez=prevE.z+(ez-prevE.z)*mx/mv; } }
  S.eye.set(ex,C.h,ez); cam.position.copy(S.eye); cam.up.set(0,1,0);
  for(const p of st.players.values()){ if(p.off) continue; const d=Math.hypot(ex-p.x,ez-p.y); if(d<near) near=d; } S.near=near;
  /* 4. the lens: the zoom level's field of view (vertical), opened up on narrow frames so the width never gets too tight */
  const zl=V184_ZOOMS[v184ZoomIdx()][3]; const asp=Math.max(0.5,cam.aspect||1.6); const hMin=2*Math.atan(Math.tan(zl*Math.PI/360)*1.45);
  let vf=zl*Math.PI/180; if(asp<1.45) vf=Math.min(70*Math.PI/180,2*Math.atan(Math.tan(hMin/2)/asp)); const fovT=vf*180/Math.PI; S.fovT=fovT;
  if(snap||st.rm){ S.fov=fovT; S.fv=0; } else { const r=v18Damp(S.fov,S.fv,fovT,C.omFov,dt); S.fov=r[0]; S.fv=r[1]; }
  if(Math.abs(cam.fov-S.fov)>1e-4){ cam.fov=S.fov; cam.updateProjectionMatrix(); }
  /* 5. the head: aim springs toward the ball point, then the ball is kept inside the frame and the turn rate is limited */
  const A=S.a; S.tmp.set(ax,ay,az);
  if(snap){ A.p.copy(S.tmp); A.v.set(0,0,0); } else if(!frozen){ v18DampV(A,S.tmp,C.omAim,dt); }
  const hv=S.fov*Math.PI/360, hh=Math.atan(Math.tan(hv)*asp);
  /* yaw / pitch of the aim and of the ball, seen from the eye */
  const yawOf=(x,z)=>Math.atan2(x-ex,ez-z), pitOf=(x,y,z)=>Math.atan2(y-C.h,Math.hypot(x-ex,z-ez));
  let ya=yawOf(A.p.x,A.p.z), pa=pitOf(A.p.x,A.p.y,A.p.z); const yb=yawOf(bx,bz), pb=pitOf(bx,bh+0.11,bz);
  if(!frozen){ const lh=hh*C.limH, lv=hv*C.limV; let dyw=yb-ya; if(dyw>lh) ya=yb-lh; else if(dyw<-lh) ya=yb+lh; let dp=pb-pa; if(dp>lv) pa=pb-lv; else if(dp<-lv) pa=pb+lv; }
  pa=Math.max(-0.33,Math.min(0.2,pa)); ya=Math.max(-1.45,Math.min(1.45,ya));
  /* write a clamped aim back into the spring so the springs carry on from where the head really is */
  const dist=Math.max(4,Math.hypot(A.p.x-ex,A.p.z-ez)); const nx=ex+Math.sin(ya)*dist, nz=ez-Math.cos(ya)*dist, ny=C.h+Math.tan(pa)*dist;
  if(!frozen&&!snap){ A.p.set(nx,ny,nz); }
  S.q.set(nx-ex,ny-C.h,nz-ez).normalize();
  /* reduced motion: hold the framing; cut to a new one when the ball nears the frame edge */
  if(st.rm&&S.init&&!snap){ const cy=Math.atan2(S.dir.x,-S.dir.z), cp=Math.asin(Math.max(-1,Math.min(1,S.dir.y)));
    let nearH=99; for(const p of st.players.values()) if(!p.off) nearH=Math.min(nearH,Math.hypot(prevE.x-p.x,prevE.z-p.y));
    if(Math.abs(yb-cy)<hh*0.7&&Math.abs(pb-cp)<hv*0.8&&Math.hypot(prevE.x-ex,prevE.z-ez)<3&&nearH>1.6){ S.near=nearH; S.q.copy(S.dir); cam.position.copy(prevE); S.eye.copy(prevE); } else { snap=true; } }
  else if(!snap&&S.init){ const ang=S.dir.angleTo(S.q), mx=C.rate*dt; if(ang>mx&&ang>1e-6){ const k=mx/ang; S.q.lerpVectors(S.dir,S.q,k).normalize(); } }
  S.dir.copy(S.q); if(snap) S.cuts++;
  S.init=true; S.snapNow=snap;
  cam.lookAt(S.tmp.copy(cam.position).addScaledVector(S.dir,40)); }

{ const _tac=Stage.prototype.drawTac; Stage.prototype.drawTac=function(){ const P=this._p3d; if(P&&P._sl) P._sl.tac=true; return _tac.apply(this,arguments); }; }
/* the director: in sideline view the kick-off, corner and penalty presets give way to the sideline camera (66 checks P._slOn) */
