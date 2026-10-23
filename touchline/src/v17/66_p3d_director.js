/* ===================== v18 3-D renderer: camera director (module order 25, ANIMATION_PLAN 3.7) =====================
   Order 25: after the core's camPose (which runs before every module) and before the figures (30), which frustum-cull
   against P.camera as it stands when they run, and the ball (40), whose streak faces the final camera.
   Runs after the core's camPose (the broadcast gantry pose from st.cam) and turns it into a directed broadcast:
   - main: the core pose, plus a gentle tilt toward play on the far side and a slight rise of the gantry for it;
   - kick-off: a wide, high establishing shot while the teams line up (st.pendingKick, or the ball on the centre spot with both
     teams in their own halves);
   - penalty / shootout: low, behind and to the side of the kicker, looking at the goal (st.so, or a penalty on the spot);
   - corner: a high angle from the near corner looking across the box;
   - celebration close-up: when st.hype > 0.6 after a goal, a pitch-side shot of the scorer (st.focus, or the player with
     p.celeb) at ~9 m, widening to ~12 m as the team arrives; it pulls back when the restart takes the focus away;
   - replay (68_replay.js sets st._rp): high behind the goal, following the ball.
   Every change of preset is a blend: a critically damped weight between the main pose and a special pose, and the special
   pose itself follows its target through critically damped springs (no overshoot, no jitter). Hard cuts happen only at
   natural breaks (restart after a goal, half time, shootout start) under a 120 ms fade through black (v18Cut), or under
   the replay's dissolves. st.shake becomes a small camera rotation. Reduced motion (st.rm): no shake, no close-ups.
   State lives on P.dir; nothing the simulation reads is written. */

/* critically damped follow (Unity's SmoothDamp form): stable at any frame time, never overshoots */
function v18Damp(x,v,tgt,om,dt){ const k=om*dt, e=1/(1+k+0.48*k*k+0.235*k*k*k); const ch=x-tgt, tmp=(v+om*ch)*dt; const nv=(v-om*tmp)*e; return [tgt+(ch+tmp)*e,nv]; }
function v18DampV(S,tgt,om,dt){ for(const c of ['x','y','z']){ const r=v18Damp(S.p[c],S.v[c],tgt[c],om,dt); S.p[c]=r[0]; S.v[c]=r[1]; } }

/* a fade through black on the stage host; the camera cuts at its darkest moment */
function v18Cut(st,ms){ const P=st&&st._p3d; if(!P||P.dead||!P.dir) return; ms=ms||120; const host=P.canvas.parentElement; if(!host) return;
  let el=host.querySelector(':scope > .v18-cut'); if(!el){ el=document.createElement('div'); el.className='v18-cut'; el.setAttribute('aria-hidden','true'); host.appendChild(el); }
  try{ el.animate([{opacity:0},{opacity:1,offset:0.5},{opacity:0}],{duration:ms,easing:'linear'}); }catch(e){}
  const D=P.dir; D.cutAt=performance.now()+ms/2; }

/* the wide gantry pose for an x centre and a width at the near touchline (same geometry as the core's wide branch) */
function v18GantryPose(P,x,w,elev,fov0,eye,tgt){ const cam=P.camera; const vf=fov0*Math.PI/180, hf=2*Math.atan(Math.tan(vf/2)*cam.aspect), below=vf/2*0.88;
  const dn=(w/2)/Math.tan(hf/2)/Math.cos(below); const cz=68+dn*Math.cos(elev), cy=dn*Math.sin(elev), pitch=elev-below;
  eye.set(x,cy,cz); tgt.set(x,0,cz-cy/Math.tan(pitch)); }

const V18_DIR={blend:2.4, pose:2.8, fov:2.6};
P3D_MODULES.push({name:'director',order:25,
  init(P){ const T=P.T; const V=()=>new T.Vector3();
    P.dir={mode:'main',w:0,wv:0,eye:{p:V(),v:V()},tgt:{p:V(),v:V()},fov:30,fv:0,fresh:true,snap:true,cutAt:0,goalT:-1e9,cel:null,cnrT:-1e9,
      by:34,byv:0,mainEye:V(),mainTgt:V(),sEye:V(),sTgt:V(),fwd:V(),e:V(),t:V(),sx:0}; },
  /* which preset the moment calls for */
  pick(P,st){ const D=P.dir, b=st.ball;
    if(st._rp&&st._rp.on) return 'replay';
    if(st.inNet&&st.flash>0.5) D.goalT=st.now;
    const live=st.mode!=='tactical';
    if(!live) return 'main';
    if(st.so) return 'pen';
    if(st.setPiece==='pen'&&(st.placed||(st.fl&&st.fl.kind==='shot')||(st.focus&&st.focus.y===34&&!st.focus.pid))) return 'pen';
    /* celebration close-up: entered at hype > 0.6 after a goal, held while the scorer has the focus */
    if(!st.rm&&st.now-D.goalT<20000){ const sc=this.scorer(st);
      if(sc&&(D.mode==='celeb'&&D.cel===sc||st.hype>0.6)){ D.cel=sc; return 'celeb'; } }
    D.cel=null;
    { const gx=b.x>52.5?105:0; const atFlag=Math.abs(b.x-gx)<1.8&&(b.y<1.8||b.y>66.2)&&(b.z||0)<0.4&&!st.fl;
      const f=st.fl, fromFlag=f&&f.from&&Math.abs(f.from.x-gx)<2.6&&(f.from.y<2.6||f.from.y>65.4);
      if(atFlag||fromFlag) D.cnrT=st.now;
      if(!st.inNet&&Math.abs(b.x-gx)<30&&st.now-D.cnrT<(st.D?st.D(2600):2600)) return 'corner'; }
    if(st.pendingKick&&!st.fl||this.kickoff(st)) return 'kickoff';
    return 'main'; },
  /* the ball resting on the centre spot with both teams in their own halves: a kick-off */
  kickoff(st){ const b=st.ball; if(st.fl||Math.hypot(b.x-52.5,b.y-34)>1.2||st.so) return false;
    for(const p of st.players.values()){ if(p.off) continue; if(p.side===0?p.x>53.2:p.x<51.8) return false; } return true; },
  scorer(st){ const f=st.focus; if(f&&f.pid&&f.celeb) return f; for(const p of st.players.values()) if(p.celeb&&p.celebType&&p.celebType!=='mob'&&!p.off) return p; return null; },
  /* the special pose for a preset (eye, target, fov); false for main */
  pose(P,st,mode,eye,tgt){ const b=st.ball, R=typeof V18_BALL_R==='number'?V18_BALL_R:0.18;
    if(mode==='kickoff'){ v18GantryPose(P,52.5,72,0.74,30,eye,tgt); return 30; }
    if(mode==='pen'){ const gx=st.so?105:(b.x>52.5?105:0), dir=gx===105?1:-1; const sx=st.so&&!st.placed&&!(st.fl&&st.fl.kind==='shot')?94:b.x, sy=st.so&&!st.placed?34:b.y;
      eye.set(sx-dir*10.5,1.75,sy+3.2); tgt.set(gx-dir*0.8,1.05,34); return 30; }
    if(mode==='corner'){ const gx=b.x>52.5?105:0, dir=gx===105?1:-1; eye.set(gx-dir*2.5,12.5,68+3.5); tgt.set(gx-dir*8.5,0.4,34); return 33; }
    if(mode==='celeb'){ const sc=P.dir.cel; if(!sc) return false; const gx=sc.side===0?105:0, dir=gx===105?1:-1; const late=sc.celebT!=null&&st.now-sc.celebT>(st.D?st.D(1100):1100);
      const back=late?11.2:8.6; eye.set(sc.x-dir*2.6,late?3.1:2.3,Math.min(sc.y+back,74)); if(eye.z-sc.y<6) eye.z=sc.y+6; tgt.set(sc.x,1.12,sc.y); return late?32:29; }
    if(mode==='replay'){ /* high behind the goal with a slow push-in; the lens tightens as the ball comes toward it */
      const Q=st._rp; const gx=Q.gx, dir=Q.dir; const u=Math.max(0,Math.min(1,(Q.t-Q.t0)/Math.max(1,Q.t1-Q.t0))); const d=Math.abs(b.x-gx);
      eye.set(gx+dir*(8.2-1.6*u),9.6-0.9*u,34+(Q.side||0)*3); tgt.set(b.x+(gx-b.x)*0.18,Math.max(0,b.z)+R,b.y+(34-b.y)*0.2); return 26+Math.min(10,d*0.3); }
    return false; },
  frame(P,st){ const D=P.dir; if(!D) return; const cam=P.camera, dt=Math.min(0.1,P.dt||0.016);
    /* 1. the core's main pose: eye, and where its view axis meets the grass */
    D.mainEye.copy(cam.position); cam.getWorldDirection(D.fwd); const dy=D.fwd.y<-0.05?D.fwd.y:-0.05; const L=Math.min(400,D.mainEye.y/-dy);
    D.mainTgt.copy(D.mainEye).addScaledVector(D.fwd,L); const fov0=cam.fov;
    /* main adjustments: far-side play tilts the frame toward it and lifts the gantry a little */
    const r0=v18Damp(D.by,D.byv,st.ball.y,1.3,dt); D.by=r0[0]; D.byv=r0[1];
    if(st.mode!=='tactical'){ const far=Math.max(0,Math.min(1,1-D.by/68)); D.mainEye.y+=far*2.2; D.mainTgt.z+=Math.max(-3,Math.min(3,(D.by-D.mainTgt.z)*0.12)); }
    /* 2. preset and its pose */
    const now=performance.now(); let snap=D.snap||D.fresh; if(D.cutAt&&now>=D.cutAt){ D.cutAt=0; snap=true; }
    const mode=this.pick(P,st); if(mode==='replay'&&D.mode!=='replay') snap=true; if(mode!=='replay'&&D.mode==='replay') snap=true;
    const want=this.pose(P,st,mode,D.e,D.t); const on=want!==false;
    if(on&&(D.w<0.02&&D.mode!==mode||snap)){ D.eye.p.copy(D.e); D.tgt.p.copy(D.t); D.eye.v.set(0,0,0); D.tgt.v.set(0,0,0); D.fov=want; D.fv=0; }
    else if(on){ const om=mode==='replay'?3.6:mode==='celeb'?2.6:V18_DIR.pose; v18DampV(D.eye,D.e,om,dt); v18DampV(D.tgt,D.t,mode==='replay'?5:om*1.2,dt); const r=v18Damp(D.fov,D.fv,want,V18_DIR.fov,dt); D.fov=r[0]; D.fv=r[1]; }
    D.mode=mode;
    const wt=on?1:0; if(snap){ D.w=wt; D.wv=0; } else { const r=v18Damp(D.w,D.wv,wt,V18_DIR.blend,dt); D.w=Math.max(0,Math.min(1,r[0])); D.wv=r[1]; }
    D.snap=false; D.fresh=false;
    /* 3. the final pose: main blended into the special pose (smoothstep on the weight) */
    const w=D.w*D.w*(3-2*D.w);
    if(w>0.0005){ cam.position.lerpVectors(D.mainEye,D.eye.p,w); D.e.lerpVectors(D.mainTgt,D.tgt.p,w); cam.up.set(0,1,0); cam.lookAt(D.e); const f=fov0+(D.fov-fov0)*w; if(Math.abs(cam.fov-f)>1e-4){ cam.fov=f; cam.updateProjectionMatrix(); } }
    else { cam.position.copy(D.mainEye); cam.lookAt(D.mainTgt); }
    /* 4. shake: a small, smooth rotation (no translation), never under reduced motion */
    const sh=st.rm?0:(st.shake||0); if(sh>0.01){ const t=now/1000; cam.rotateX((Math.sin(t*41)*0.6+Math.sin(t*23.7)*0.4)*0.0075*sh); cam.rotateY((Math.sin(t*37.3)*0.6+Math.sin(t*19.1)*0.4)*0.0065*sh); cam.rotateZ(Math.sin(t*29.9)*0.004*sh); } },
  dispose(P){ P.dir=null; } });

/* natural breaks: a hard cut under the fade (restart after a goal, half time, shootout start) */
const _v18dirRestart=Stage.prototype.restartAfterGoal;
Stage.prototype.restartAfterGoal=function(){ const P=this._p3d; if(P&&!P.dead&&P.dir&&!this.skip){ if(P.dir.noFade){ P.dir.noFade=false; P.dir.snap=true; } else v18Cut(this); } return _v18dirRestart.apply(this,arguments); };
const _v18dirHalf=Stage.prototype.halftime;
Stage.prototype.halftime=function(){ const r=_v18dirHalf.apply(this,arguments); v18Cut(this); return r; };
const _v18dirSo=Stage.prototype.shootoutSetup;
Stage.prototype.shootoutSetup=function(){ v18Cut(this); return _v18dirSo.apply(this,arguments); };
