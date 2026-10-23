/* ===================== v18.2 animation polish (71) =====================
   Presentation only: nothing here touches engine.js, results, events or their order. Each fix can be switched off
   through V18POL (test/polish.js measures before and after in one page).
   1. celeb: the 3-D celebration close-up leads the running scorer (the director's damped springs lag ~0.7 s behind a
      sprinting player) and, after the director has posed the camera, a stateless correction (module order 26, before
      the figures cull) turns the lens toward the scorer and widens it so his body and raised arms stay inside the
      middle ~68% of the frame. It is a continuous function of the frame, so it never jumps.
   2. crane: the walkout crane (69) no longer overlaps live play. In 3-D the kick-off tap (tapOff) waits for the crane
      to land on the wide shot (at most ~2.6 s, presentation timing only), and if anything is in flight while the crane
      still runs, the crane hands over to the director's normal blend instead of flying through the first pass.
   3. arms: 3-D elbows. 63_p3d_figures.js used the 2-D ik3 pole (-0.7,-0.5,sd*0.6) for every arm, which flares relaxed
      elbows outward. Low arms now take a pole that points back and only slightly out, so they hang beside the body;
      raised arms (celebrations, dives, throw-ins) and hands on hips keep the old pole, with a smooth blend between.
   4. pen: the penalty / shootout kicker strikes only once he has reached the ball: the strike's launch waits (in the
      stage's own clock) until he is within ~0.72 m, instead of kicking from ~0.95 m when penStrike's run-up wait ran out. */
const V18POL={celeb:true,crane:true,arms:true,pen:true,log:[]};
const V18P_CRANE_MS=2000;

/* ---------- 3. relaxed 3-D elbows ---------- */
v18ArmPole=function(a0,a1,a2,t0,t1,t2,sd,Q,p){ const o=V18_AP;
  if(!V18POL.arms||(Q&&(Q.act==='hips'||Q.act==='dive'))||(p&&p.dive)){ o[0]=-0.7; o[1]=-0.5; o[2]=sd*0.6; return o; }
  /* k = 0 for an arm hanging below the shoulder, 1 once the hand is near or above it */
  const dh=t1-a1; let k=(dh+0.42)/0.3; k=k<0?0:k>1?1:k*k*(3-2*k);
  o[0]=-0.95+0.25*k; o[1]=-0.12-0.38*k; o[2]=sd*(0.16+0.44*k); return o; };

/* ---------- 1. celebration close-up framing ---------- */
(function(){ const D=P3D_MODULES.find(m=>m.name==='director'); if(!D) return; const _pose=D.pose;
  D.pose=function(P,st,mode,eye,tgt){ const r=_pose.call(this,P,st,mode,eye,tgt);
    if(mode==='celeb'&&r!==false&&V18POL.celeb&&P.dir&&P.dir.cel){ const sc=P.dir.cel; const vx=sc.vx||0, vy=sc.vy||0; const v=Math.hypot(vx,vy);
      /* lead the springs by the scorer's velocity (critically damped lag ~ 2/omega), capped at 4.5 m */
      const ld=Math.min(0.72,4.5/Math.max(1e-3,v)); eye.x+=vx*ld; eye.z+=vy*ld*0.6; tgt.x+=vx*ld; tgt.z+=vy*ld;
      if(eye.z-tgt.z<6) eye.z=tgt.z+6; if(eye.z>76) eye.z=76; }
    return r; };
})();
function v18PolishScorerBox(P,sc,V){ /* max |NDC| over the scorer's body and raised arms */ let m=0, cx=0, cy=0;
  const pts=V18P_BOX; for(let i=0;i<pts.length;i+=3){ V.set(sc.x+pts[i],pts[i+1],sc.y+pts[i+2]).project(P.camera); m=Math.max(m,Math.abs(V.x),Math.abs(V.y)); }
  V.set(sc.x,1.1,sc.y).project(P.camera); cx=V.x; cy=V.y; return [m,cx,cy]; }
const V18P_BOX=[0,0.02,0, 0,2.3,0, 0.45,2.2,0.45, -0.45,2.2,-0.45, 0.5,1.3,-0.5, -0.5,1.3,0.5, 0.45,0.1,0.45, -0.45,0.1,-0.45];
P3D_MODULES.push({name:'polish',order:26,
  init(P){ const T=P.T; P._pol={V:new T.Vector3(),F:new T.Vector3(),L:new T.Vector3(),last:0}; },
  frame(P,st){ const Q=P._pol, Dd=P.dir; if(!Q||!Dd||!V18POL.celeb) return; if(Dd.mode!=='celeb'||!Dd.cel||Dd.w<0.05){ Q.last=0; return; }
    const cam=P.camera, sc=Dd.cel; if(!isFinite(sc.x)||!isFinite(sc.y)) return; cam.updateMatrixWorld(); const S=0.68;
    let b=v18PolishScorerBox(P,sc,Q.V); const wt=Math.min(1,Dd.w*1.5);
    /* turn toward the scorer's centre by the part of his offset beyond 0.18 of the half-frame */
    const off=Math.hypot(b[1],b[2]); if(off>0.18){ const k=wt*Math.min(1,(off-0.18)/off*1.15); cam.getWorldDirection(Q.F); const d=Math.hypot(sc.x-cam.position.x,1.1-cam.position.y,sc.y-cam.position.z);
      Q.L.copy(cam.position).addScaledVector(Q.F,d); Q.L.x+=(sc.x-Q.L.x)*k; Q.L.y+=(1.1-Q.L.y)*k; Q.L.z+=(sc.y-Q.L.z)*k; cam.lookAt(Q.L); cam.updateMatrixWorld(); b=v18PolishScorerBox(P,sc,Q.V); }
    /* widen the lens until the box fits */
    if(b[0]>S){ const t=Math.tan(cam.fov*Math.PI/360)*(1+(b[0]/S-1)*wt); cam.fov=Math.min(60,Math.atan(t)*360/Math.PI); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); b=v18PolishScorerBox(P,sc,Q.V); }
    Q.last=b[0]; },
  dispose(P){ P._pol=null; } });

/* ---------- 2. the walkout crane finishes before the kick-off pass ---------- */
function v18PolCraneOn(st){ const F=typeof v18WalkFocus!=='undefined'?v18WalkFocus:null; const P=st&&st._p3d;
  return !!(F&&F.crane&&F.st===st&&P&&!P.dead&&P.dir&&!st.rm&&performance.now()-F.crane<V18P_CRANE_MS); }
{ const _tap=Stage.prototype.tapOff;
  Stage.prototype.tapOff=async function(){ if(V18POL.crane&&this.pendingKick&&v18PolCraneOn(this)){ const t0=performance.now();
      await this.until(()=>!v18PolCraneOn(this), this.D(V18P_CRANE_MS)+600); V18POL.log.push({k:'craneHold',ms:Math.round(performance.now()-t0)}); }
    return _tap.apply(this,arguments); }; }
(function(){ const D=P3D_MODULES.find(m=>m.name==='director'); if(!D) return; const _pick=D.pick;
  D.pick=function(P,st){ const F=typeof v18WalkFocus!=='undefined'?v18WalkFocus:null;
    if(V18POL.crane&&F&&F.crane&&F.st===st&&P.kind==='live'&&(st.fl||st.own&&!st.pendingKick&&Math.hypot(st.ball.x-52.5,st.ball.y-34)>1.5)){
      /* play is live while the crane still flies: hand over to the director's blend (no snap) */
      v18WalkFocus=null; if(P.dir) P.dir.cutAt=0; V18POL.log.push({k:'craneCut',ms:Math.round(performance.now()-F.crane)}); try{ v18WalkClass(false); }catch(e){} }
    return _pick.call(this,P,st); };
})();

/* ---------- 4. the penalty kicker reaches the ball before he strikes it ---------- */
{ const _launch=Stage.prototype.launch;
  Stage.prototype.launch=function(p,o){ if(V18POL.pen&&p&&o&&o.kind==='shot'&&this.setPiece==='pen'&&!this.skip&&!p.gk){ const b=this.ball; const d=Math.hypot(p.x-b.x,p.y-b.y);
      if(d>0.72&&p.ov){ const me=this, a=arguments; V18POL.log.push({k:'penWait',d:+d.toFixed(2)});
        return this.until(()=>Math.hypot(p.x-b.x,p.y-b.y)<=0.72||Math.hypot(p.x-p.ov.x,p.y-p.ov.y)<0.08, this.eta(p,p.ov.x,p.ov.y)+400).then(()=>_launch.apply(me,a)); } }
    return _launch.apply(this,arguments); }; }
