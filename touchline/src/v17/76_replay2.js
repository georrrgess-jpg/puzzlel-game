/* ===================== v18.5 two-angle goal replays (76) =====================
   Presentation only: nothing here touches engine.js or the simulation. The recorded clip of 68_replay.js (snapshots of
   every mover, the ball and the flight) plays twice in 3-D at 1x/2x:
   1. SCORER'S VIEW: a first-person camera at the scorer's eye height. The track is built once at replay start from the
      snapshots (his x, y, yaw, speed, leap): head position (lean and leap included, never the stride bob), a look point
      (ahead of him toward goal, pulled down onto the ball on touches, the cross for a header, the ball itself from the
      strike), then zero-phase smoothing (a forward-backward one-pole filter in game time), turn-rate and pitch clamps, so
      it never lurches. The camera uses the same snapshot index as the world (Q.i), so ball, legs and lens never judder
      against each other. His own head, hair, band and neck are collapsed in his camera (v18FigDraw wrap).
   2. a 380 ms dissolve, then BEHIND THE GOAL: a low camera just in front of the end boards, net and posts in the
      foreground, looking out at the scorer; the ball flies at the lens and the net bulges toward it (director pose wrap).
   Each pass has a lower-third caption; tap anywhere still skips the whole replay; a "Next angle" pill jumps to pass 2.
   Settings: Goal replays Off / One angle / Two angles (PREFS.replays stays the master switch; PREFS.rpAngles 'one' is
   exactly the v18 replay). 2-D, tactical, 4x/8x, shootouts and reduced motion are unchanged (68 decides).
   Hooks (wraps and global reassignments only; 66 and 68 are not edited): goalSequence (remembers the event), v18Replay
   (augments st._rp), v18RpEnd (pass 1 end -> pass 2), Stage.loop (Next angle, 2x rate), v18RpOverlay (caption + pill),
   the director's pose ('replay' + Q.cam 'goal'), a P3D module 'rpcam' (27, after director and polish, before the figures
   so culling uses the first-person camera), v18FigDraw (collapses the scorer's head cluster). Debug: P._rp2.last. */
DEFAULT_PREFS.rpAngles='two'; if(PREFS.rpAngles!=='one'&&PREFS.rpAngles!=='two') PREFS.rpAngles='two';

const V185_RP={L1:1100,Lrun:1900,Lpen:1500,L2x:800,tail1:300,lead2:350,tail2:550,rate2x:0.6,
  fwd:0.07,dn:0.02,tauA:0.18,tauB:0.06,tauE:0.10,yawR:150,yawH:280,pitR:120,pMin:-35,pMax:20,wRun:0.6,frame:22,look:260,lens:0.55,fov:52,fovMax:72,hFov:62,fovLong:38,near:0.12,hide:0.34,
  gEye:3.3,gH:1.45,gFov:40,clear:0.42,hMax:92,gHMax:100};
const V185_D2R=Math.PI/180;

/* the goal event, kept while the goal sequence (and so the replay before the restart) runs */
const _v185Goal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(e){ this._v185e=e?{pid:e.pid,ty:e.ty,s:e.s,seq:e.seq}:null;
  try{ return await _v185Goal.apply(this,arguments); } finally{ this._v185e=null; } };

function v185Idx(B,t){ let i=0; while(i<B.length-1&&B[i+1].now<=t) i++; return i; }
function v185Fields(S,sc){ const m=S.m; for(let k=0;k<m.length;k++) if(m[k][0]===sc) return m[k][1]; return null; }
const v185Cl=(v,a,b)=>v<a?a:v>b?b:v;
function v185Name(sc){ try{ const p=typeof Px==='function'?Px(sc.pid):null; if(p&&(p.ln||p.fn)) return (p.fn?String(p.fn).charAt(0)+'. ':'')+(p.ln||''); }catch(e){} return sc&&sc.num!=null&&sc.num!==''?'No. '+sc.num:''; }

/* ---------- the first-person track (once per replay, O(n)) ---------- */
function v185Track(st,Q,B,sc,meta){ const n=B.length; if(n<6) return null; const C=V185_RP, R=typeof V18_BALL_R==='number'?V18_BALL_R:0.18;
  const JD=Math.max(260,st.D(560)), ND=Math.max(130,st.D(280)), sm=Math.max(1,st.spdMul||1), gx=Q.gx, ts=Q.ts, tg=Q.tg;
  const hx=new Float32Array(n), hy=new Float32Array(n), hz=new Float32Array(n), yw=new Float32Array(n), pt=new Float32Array(n), tau=new Float32Array(n);
  const ex=new Float32Array(n), ey=new Float32Array(n), ez=new Float32Array(n), fv=new Float32Array(n), te=new Float32Array(n), yr=new Float32Array(n);
  let f0=null, lastY=null, lastP=0, found=0;
  for(let i=0;i<n;i++){ const S=B[i]; let f=v185Fields(S,sc); if(f) found++; else f=f0; if(!f){ continue; } f0=f;
    const s=0.92*(f.hgt||sc.hgt||70)/70; const yaw=f.yaw==null?((f.face||1)>0?0:Math.PI):f.yaw; const cy=Math.cos(yaw), sy=Math.sin(yaw);
    const jt=S.now-(f.jumpT!=null?f.jumpT:-9e9); const jump=jt>=0&&jt<JD; const lift=jump?Math.sin(jt/JD*Math.PI)*0.72:0;
    /* the body lean poseOf gives him: run (gait speed and acceleration), strike, leap, nod */
    const real=(f.spd||0)/sm; let lean=real>0.5?0.02+0.016*Math.min(9,f.gv!=null?f.gv:real)+v185Cl((f.acS||0)*0.012,-0.12,0.12):0;
    const kk=f.kickK, kt=S.now-(f.kickT!=null?f.kickT:-9e9), kW=f.kickW||0, kF=f.kickF||260;
    if(kk&&kk!=='head'&&kk!=='throw'&&kt>=0&&kt<kW+kF){ const big=kk==='shot'||kk==='loft'; if(kt<kW){ const q=kt/kW; lean=-0.06*q*q*(3-2*q)*(big?1:0.5); } else lean=(big?0.12:0.06)*Math.sin(Math.min(1,(kt-kW)/kF*1.6)*Math.PI); }
    if(jump){ const u=jt/JD; lean=0.3*Math.sin(v185Cl((u-0.35)/0.45,0,1)*Math.PI)-0.08*Math.sin(u*Math.PI); }
    /* the nod carries the head forward through the ball (the eye goes with it; the gaze does not dip) */
    const nt=S.now-(f.nodT!=null?f.nodT:-9e9); let tilt=jump?0.3*Math.sin(v185Cl((jt/JD-0.4)/0.4,0,1)*Math.PI):0; if(nt>=0&&nt<ND){ const w=Math.sin(nt/ND*Math.PI); lean+=0.22*w; tilt+=0.55*w; } te[i]=jump||(nt>=0&&nt<ND)?0.05:C.tauE;
    /* the running roll into a turn (poseOf: turnLean about the hips' pivot) moves the head sideways */
    const kick=(f.kickT!=null&&S.now-f.kickT>=0&&S.now-f.kickT<(f.kickW||0)+(f.kickF||260)); const ra=real>0.5&&!jump&&!kick?v185Cl(f.turnLean||0,-0.13,0.13)*((f.vy||0)>=0?1:-1):0;
    const fw=s*(0.02+tilt*0.05+1.03*Math.sin(lean)), lw=-s*1.63*Math.sin(ra); hx[i]=f.x+cy*fw-sy*lw; hy[i]=s*(0.8+1.03*Math.cos(lean)+lift); hz[i]=f.y+sy*fw+cy*lw;
    /* where he looks */
    const b=S.s.ball, fl=S.s.fl; const bx=b.x, bz=b.y, bh=Math.max(0,b.z||0)+R; let tx,ty,tz, framed=0;
    const dB=Math.hypot(bx-hx[i],bz-hz[i]);
    if(S.now>=tg&&lastY!=null){ yw[i]=lastY; pt[i]=lastP; tau[i]=C.tauB; continue; }
    if(S.now>=ts){ tx=bx; ty=bh; tz=bz; const k=v185Cl(1-(S.now-ts)/260,0,1); framed=k; tau[i]=C.tauB; }
    else { const cross=!!(fl&&fl.home===sc&&fl.kind!=='shot'&&(meta.head||(fl.h||0)>1.5));
      /* head up toward goal while he runs, a glance down onto the ball on touches, eyes on the ball for the strike */
      const wS=v185Cl(1-(ts-S.now)/C.look,0,1); let w=cross?1:Math.max(C.wRun*v185Cl((4.5-dB)/2.5,0,1),wS);
      let ax=hx[i]+cy*14, ay=0.25, az=hz[i]+sy*14; if(Math.abs(f.x-gx)<32){ ax+=(gx-ax)*0.4; ay+=(0.9-ay)*0.4; az+=(34-az)*0.4; }
      /* blend the directions (not the points), so a ball at his feet turns the head, and the pitch is framed below */
      const yA=Math.atan2(az-hz[i],ax-hx[i]), yB=Math.atan2(bz-hz[i],bx-hx[i]); let dy=dB<0.9?0:yB-yA; while(dy>Math.PI) dy-=2*Math.PI; while(dy<-Math.PI) dy+=2*Math.PI;
      const pA=Math.atan2(ay-hy[i],Math.hypot(ax-hx[i],az-hz[i])), pB=Math.atan2(bh-hy[i],Math.max(0.05,dB));
      /* a ball below him is framed low in the picture (not centred), and the head never drops below -20 degrees on the run */
      if(dB<1.2&&bh>hy[i]-0.7&&lastY!=null){ yw[i]=lastY; pt[i]=lastP; tau[i]=0.12; continue; } /* the cross arriving at his face: hold, never spin on a point at the lens */
      let y=yA+dy*w; if(cross&&wS>0){ let dg=Math.atan2(34-hz[i],gx-hx[i])-y; while(dg>Math.PI) dg-=2*Math.PI; while(dg<-Math.PI) dg+=2*Math.PI; y+=dg*0.45*wS; } /* a header: the head starts to turn toward goal as the cross arrives */
      const pB2=cross||pB>-8*V185_D2R?pB:Math.max((-20-15*wS)*V185_D2R,pB+C.frame*V185_D2R); const p=pA+(pB2-pA)*w;
      if(lastY!=null){ let d=y-lastY; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; yw[i]=lastY+d; } else yw[i]=y; pt[i]=p; lastY=yw[i]; lastP=p; tau[i]=cross?0.12:C.tauA; continue; }
    /* just off his boot or head the ball is too close to give a direction: aim where the shot is going */
    const to=fl&&fl.to&&dB<1.5?fl.to:null; if(!to&&dB<1.5&&lastY!=null){ yw[i]=lastY; pt[i]=lastP; continue; } const y=to?Math.atan2(to.y-hz[i],to.x-hx[i]):Math.atan2(tz-hz[i],tx-hx[i]);
    let p=to&&bh>hy[i]-0.6?Math.atan2((to.z||0)+R-hy[i],Math.max(0.05,Math.hypot(to.x-hx[i],to.y-hz[i]))):Math.atan2(ty-hy[i],Math.max(0.05,Math.hypot(tx-hx[i],tz-hz[i])));
    if(framed>0&&p<-10*V185_D2R) p+=Math.min(C.frame*V185_D2R,(-p-10*V185_D2R)*0.6)*framed;
    if(lastY!=null){ let d=y-lastY; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; yw[i]=lastY+d; } else yw[i]=y; pt[i]=p; lastY=yw[i]; lastP=p; }
  if(found<n*0.6) return null;
  /* zero-phase smoothing in game time: forward, then backward one-pole */
  const zp=(a,tf)=>{ for(let i=1;i<n;i++){ const dt=Math.max(1,B[i].now-B[i-1].now)/1000, k=1-Math.exp(-dt/tf(i)); a[i]=a[i-1]+(a[i]-a[i-1])*k; }
    for(let i=n-2;i>=0;i--){ const dt=Math.max(1,B[i+1].now-B[i].now)/1000, k=1-Math.exp(-dt/tf(i)); a[i]=a[i+1]+(a[i]-a[i+1])*k; } };
  const tA=i=>tau[i]||C.tauA, tE=i=>te[i]||C.tauE;
  zp(yw,tA); zp(pt,tA); zp(hx,tE); zp(hy,tE); zp(hz,tE);
  /* turn-rate and pitch clamps (game time) */
  for(let i=0;i<n;i++) pt[i]=v185Cl(pt[i],C.pMin*V185_D2R,C.pMax*V185_D2R);
  /* a header whips the head round to follow the ball to goal: a faster turn just around the contact */
  for(let i=0;i<n;i++) yr[i]=(meta.head&&B[i].now>ts-200&&B[i].now<ts+450?C.yawH:C.yawR)*V185_D2R;
  const rl=(a,r)=>{ for(let i=1;i<n;i++){ const m=(r||yr[i])*Math.max(1,B[i].now-B[i-1].now)/1000; a[i]=a[i-1]+v185Cl(a[i]-a[i-1],-m,m); }
    for(let i=n-2;i>=0;i--){ const m=(r||yr[i])*Math.max(1,B[i+1].now-B[i].now)/1000; a[i]=a[i+1]+v185Cl(a[i]-a[i+1],-m,m); } };
  rl(yw,0); rl(pt,C.pitR*V185_D2R);
  /* the eye: head centre, a little forward along the view heading and down; stepped out of anyone else's body */
  let shot=null; for(let i=0;i<n;i++){ const S=B[i]; if(S.now>=ts){ shot=S; break; } }
  const sd=shot?Math.abs(shot.s.ball.x-gx):0, long=sd>20;
  for(let i=0;i<n;i++){ const c=Math.cos(yw[i]), s=Math.sin(yw[i]); let X=hx[i]+c*C.fwd, Z=hz[i]+s*C.fwd; const Y=hy[i]-C.dn;
    for(const [o,f] of B[i].m){ if(o===sc||f.off||!isFinite(f.x)) continue; const dx=X-f.x, dz=Z-f.y, d=Math.hypot(dx,dz); if(d<C.clear&&Y<1.95*(f.hgt||70)/70){
      /* push straight away from his axis, but never more than 0.22 m from the scorer's head */
      const k=(C.clear-d)/(d||1e-3); let nx=X+dx*k, nz=Z+dz*k; const ox=nx-hx[i], oz=nz-hz[i], ol=Math.hypot(ox,oz); if(ol>0.22){ nx=hx[i]+ox*0.22/ol; nz=hz[i]+oz*0.22/ol; } X=nx; Z=nz; } }
    ex[i]=X; ey[i]=Y; ez[i]=Z; fv[i]=long&&B[i].now>ts?C.fov+(C.fovLong-C.fov)*v185Cl((B[i].now-ts)/350,0,1):C.fov; }
  /* the eye must not jump: smooth the clearance pushes a little (zero phase, short) */
  zp(ex,()=>0.05); zp(ez,()=>0.05);
  return {n,ex,ey,ez,yw,pt,fv,hx,hy,hz,long}; }

/* ---------- replay start: augment st._rp right after 68 creates it ---------- */
const _v185Replay=v18Replay;
v18Replay=function(st){ const R=st&&st._rb; const pr=_v185Replay.apply(this,arguments); const Q=st&&st._rp;
  if(Q&&!Q.done&&!Q._v185&&R){ Q._v185=true; try{ v185Setup(st,Q,R); }catch(e){ console.warn('v18.5 replay',e); Q.two=false; Q.cam='goal'; Q.pass=1; v185Caption(st,Q); } }
  return pr; };
function v185Setup(st,Q,R){ Q.two=false; Q.pass=1; Q.cam='goal'; Q.rate=V18_RP.rate; const B=Q.R.buf; const e=st._v185e;
  Q.tg=R.tg; Q.ts=R.ts!=null?R.ts:R.tg-400;
  /* the pill: Next angle steals its own taps from the overlay's skip handler (which captures on the overlay) */
  if(Q.tapEl&&Q.tap){ const t0=Q.tap; Q.tapEl.removeEventListener('pointerdown',t0,true);
    Q.tap=ev=>{ const b=ev.target&&ev.target.closest&&ev.target.closest('.v185-rp-next'); if(b){ ev.preventDefault(); ev.stopPropagation(); if(!st.paused&&Q.two&&Q.pass===1) Q.nextTap=true; return; } t0(ev); };
    Q.tapEl.addEventListener('pointerdown',Q.tap,true); }
  const P=st._p3d, gl=!!(P&&!P.dead); const sc=e?st.pl(e.pid):null; Q.sc=sc||null;
  if(!gl||PREFS.rpAngles==='one'||!e||!sc||sc.off||sc.side!==e.s){ v185Caption(st,Q); return; }
  const sp=(App.live&&App.live.speed)||1, b0=B[0].now, bE=B[B.length-1].now, ts=Q.ts, tg=Q.tg, ty=e.ty||'open';
  /* the first shot snapshot, and the cross that reached him (the run of snapshots whose flight is homing on him) */
  let k=B.findIndex(S=>S.now>=ts); if(k<0) k=B.length-1;
  /* the cross: the last flight homing on him before the shot (a short gap while he takes it is allowed), back to its start */
  const isX=S=>!!(S.s.fl&&S.s.fl.home===sc&&S.s.fl.kind!=='shot'); let j=k; while(j>0&&!isX(B[j-1])&&B[k].now-B[j-1].now<700) j--; if(j>0&&isX(B[j-1])){ while(j>0&&isX(B[j-1])) j--; } else j=k;
  const fk=B[k].s.fl, head=!!(fk&&(fk.head||fk.nod)); const crossT=j<k?B[j].now:null;
  let L=V185_RP.L1; if(ty==='break'||ty==='solo') L=V185_RP.Lrun; else if(ty==='pen') L=V185_RP.Lpen;
  let a0=ts-L; if(crossT!=null&&(head||ty==='header'||ty==='corner')) a0=Math.min(a0,crossT-300);
  if(sp>=2&&ty!=='pen') a0=Math.max(a0,Math.min(ts-V185_RP.L2x,crossT!=null?crossT-200:ts));
  a0=Math.max(b0,a0); const a1=Math.min(bE,tg+V185_RP.tail1); const c0=Math.max(b0,ts-V185_RP.lead2), c1=Math.min(bE,tg+V185_RP.tail2);
  if(a1-a0<300||c1-c0<300){ v185Caption(st,Q); return; }
  const trk=v185Track(st,Q,B,sc,{head,ty}); if(!trk){ v185Caption(st,Q); return; }
  Q.two=true; Q.cam='eyes'; Q.head=head; Q.crossT=crossT; Q.win=[[a0,a1],[c0,c1]]; Q.trk=trk; Q.t=Q.t0=a0; Q.t1=a1; Q.i=v185Idx(B,a0); Q.rate=sp>=2?V185_RP.rate2x:V18_RP.rate; Q.cams=['eyes'];
  if(gl&&P.dir) P.dir.snap=true; v185Caption(st,Q); }

/* ---------- pass 2 ---------- */
function v185Pass2(st,Q){ const B=Q.R.buf, S=B[Q.i];
  if(S&&st.cv.isConnected){ try{ v18RpDraw(st,Q,S,true); }catch(e){} }
  Q.pass=2; Q.cam='goal'; Q.nextTap=false; Q.t=Q.t0=Q.win[1][0]; Q.t1=Q.win[1][1]; Q.i=v185Idx(B,Q.t); if(Q.cams) Q.cams.push('goal');
  const P=st._p3d; if(P&&!P.dead&&P.dir) P.dir.snap=true; v185Caption(st,Q); if(st.requestDraw) st.requestDraw(); }
const _v185End=v18RpEnd;
v18RpEnd=function(st,why){ const Q=st&&st._rp;
  if(Q&&!Q.done&&why==='end'&&Q.two&&Q.pass===1&&st.alive&&!st.skip&&st.cv.isConnected&&st._p3d&&!st._p3d.dead&&v18RpWant(st)){ v185Pass2(st,Q); return; }
  return _v185End.apply(this,arguments); };
const _v185Loop=Stage.prototype.loop;
Stage.prototype.loop=function(ts){ const Q=this._rp;
  if(Q&&Q.on&&Q.two&&!Q.done){
    if(Q.nextTap){ Q.nextTap=false; if(Q.pass===1&&this.alive&&!this.skip&&this.cv.isConnected&&this._p3d&&!this._p3d.dead&&v18RpWant(this)) v185Pass2(this,Q); }
    /* 2x: a slightly faster replay (68 advances Q.t at its own rate; the difference is added here) */
    if(Q.rate&&Q.rate!==V18_RP.rate&&!this.paused){ const real=ts-this.t0; const step=Math.min(50,Math.max(0,real-this.lastReal)); Q.t+=step*(Q.rate-V18_RP.rate); } }
  return _v185Loop.apply(this,arguments); };

/* ---------- overlay: lower-third caption and the Next angle pill ---------- */
const _v185Ov=v18RpOverlay;
v18RpOverlay=function(st,on){ const el=_v185Ov.apply(this,arguments); if(!on||!el) return el;
  const lt=document.createElement('div'); lt.className='v185-rp-lt'; lt.setAttribute('aria-live','polite'); lt.hidden=true; el.appendChild(lt);
  const nx=document.createElement('button'); nx.type='button'; nx.className='v185-rp-next'; nx.hidden=true; nx.setAttribute('aria-label','Next replay angle'); nx.innerHTML='Next angle <span aria-hidden="true">›</span>';
  nx.addEventListener('click',ev=>{ ev.stopPropagation(); if(ev.detail===0){ const Q=st._rp; if(Q&&Q.two&&Q.pass===1&&!st.paused) Q.nextTap=true; } });
  el.appendChild(nx); return el; };
function v185Caption(st,Q){ const host=st.cv&&st.cv.parentElement; const el=host&&host.querySelector(':scope > .v18-rp'); if(!el) return;
  const lt=el.querySelector('.v185-rp-lt'), nx=el.querySelector('.v185-rp-next'); if(!lt) return;
  if(!Q.two){ lt.hidden=true; lt.innerHTML=''; if(nx) nx.hidden=true; return; }
  const T=Q.side0===1?st.a:st.h; const c=(T&&T.c1)||'#d33'; const nm=Q.pass===1&&Q.sc?v185Name(Q.sc):'';
  const t=Q.pass===1?"SCORER'S VIEW":'BEHIND THE GOAL';
  const nl=lt.cloneNode(false); nl.hidden=false; nl.style.setProperty('--rpc',c); nl.dataset.pass=String(Q.pass);
  nl.innerHTML=`<i></i><b>${t}</b>${nm?`<span>${esc(nm)}</span>`:''}`; lt.replaceWith(nl);
  if(nx) nx.hidden=Q.pass!==1; }

/* ---------- 3-D: the behind-the-goal pose (director) ---------- */
(function(){ const D=P3D_MODULES.find(m=>m.name==='director'); if(!D) return; const _pose=D.pose;
  D.pose=function(P,st,mode,eye,tgt){ const Q=st._rp; if(mode==='replay'&&Q&&Q.two&&Q.cam==='goal') return v185GoalPose(P,st,Q,eye,tgt); return _pose.apply(this,arguments); }; })();
function v185GoalPose(P,st,Q,eye,tgt){ const b=st.ball, R=typeof V18_BALL_R==='number'?V18_BALL_R:0.18, C=V185_RP; const gx=Q.gx, dir=Q.dir, sc=Q.sc;
  const by=isFinite(b.y)?b.y:34; eye.set(gx+dir*C.gEye,C.gH,34+v185Cl((by-34)*0.25,-1.4,1.4));
  if(st.now<Q.ts&&sc&&isFinite(sc.x)){ tgt.set(sc.x+(b.x-sc.x)*0.3,1.1+(Math.max(0,b.z||0)+R-1.1)*0.3,sc.y+(by-sc.y)*0.3); }
  else tgt.set(b.x,Math.max(0,b.z||0)+R,by);
  /* the lens: opened up on tall frames so the goal mouth still reads */
  const asp=Math.max(0.4,P.camera.aspect||1.6); let f=C.gFov; if(asp<1.3) f=Math.min(64,2*Math.atan(Math.tan(C.gFov*V185_D2R/2)*1.3/asp)/V185_D2R); else f=Math.min(f,2*Math.atan(Math.tan(C.gHMax*V185_D2R/2)/asp)/V185_D2R); return f; }

/* ---------- 3-D: the first-person camera (module order 27) ---------- */
P3D_MODULES.push({name:'rpcam',order:27,
  init(P){ P._rp2={last:null,nearSet:false,hid:0,head:null,v:new P.T.Vector3(),t:new P.T.Vector3()}; P._rp2eye=null; },
  frame(P,st){ const R=P._rp2; if(!R) return; const Q=st._rp, cam=P.camera, C=V185_RP;
    if(Q&&Q.on&&Q.two&&Q.cam==='eyes'&&Q.trk){ const K=Q.trk, i=Math.max(0,Math.min(K.n-1,Q.i)); const y=K.yw[i], p=K.pt[i];
      cam.position.set(K.ex[i],K.ey[i],K.ez[i]); cam.up.set(0,1,0); const cp=Math.cos(p); R.t.set(K.ex[i]+Math.cos(y)*cp*10,K.ey[i]+Math.sin(p)*10,K.ez[i]+Math.sin(y)*cp*10); cam.lookAt(R.t);
      /* the lens: 52 degrees vertical; on tall frames solve for ~62 horizontal, capped */
      const asp=Math.max(0.3,cam.aspect||1.6); let vf=K.fv[i]; if(asp<1){ vf=Math.min(C.fovMax,2*Math.atan(Math.tan(C.hFov*V185_D2R/2)/asp)/V185_D2R); if(K.long&&K.fv[i]<C.fov) vf*=K.fv[i]/C.fov; }
      /* very wide strips (a short stage): the horizontal angle stays under ~92 degrees, no fish-eye */
      else vf=Math.min(vf,2*Math.atan(Math.tan(C.hMax*V185_D2R/2)/asp)/V185_D2R);
      if(Math.abs(cam.fov-vf)>1e-4||cam.near!==C.near){ cam.fov=vf; cam.near=C.near; cam.updateProjectionMatrix(); } R.nearSet=true; P._rp2eye=Q.sc; }
    else { P._rp2eye=null; if(R.nearSet){ cam.near=0.3; cam.updateProjectionMatrix(); R.nearSet=false; } }
    if(Q&&Q.on){ cam.updateMatrixWorld(); const b=st.ball, Rb=typeof V18_BALL_R==='number'?V18_BALL_R:0.18; R.v.set(b.x,Math.max(0,b.z||0)+Rb,b.y).project(cam);
      const fw=new P.T.Vector3(); cam.getWorldDirection(fw);
      R.last={cam:Q.two?Q.cam:'goal',pass:Q.pass||1,i:Q.i,now:st.now,eye:[cam.position.x,cam.position.y,cam.position.z],fwd:[fw.x,fw.y,fw.z],near:cam.near,fov:cam.fov,ballNdc:[R.v.x,R.v.y,R.v.z],head:null,hid:0}; }
    else R.last=null; },
  dispose(P){ P._rp2=null; P._rp2eye=null; } });

/* ---------- the scorer's own head is not in his camera ---------- */
const _v185Fig=v18FigDraw;
v18FigDraw=function(P,st,p,kit,isRef){ const sc=P&&P._rp2eye; if(!sc||!P._fig) return _v185Fig.apply(this,arguments);
  /* nobody else is drawn with the lens inside or against his body */
  if(p!==sc){ const c=P.camera.position; if(p&&Math.hypot(p.x-c.x,p.y-c.z)<V185_RP.lens) return false; return _v185Fig.apply(this,arguments); }
  const F=P._fig, parts=F.parts; const n0=F._v185n&&F._v185n.length===parts.length?F._v185n:(F._v185n=new Int32Array(parts.length)); for(let i=0;i<parts.length;i++) n0[i]=parts[i].n;
  const r=_v185Fig.apply(this,arguments); const R=P._rp2; if(!r){ if(R&&R.last) R.last.hid=-1; return r; }
  const W=F.s, hx=W[42], hy=W[43], hz=W[44], nx=W[39], ny=W[40], nz=W[41], rr=V185_RP.hide*V185_RP.hide; let k=0;
  for(let i=0;i<parts.length;i++){ const pt=parts[i], im=pt.im; for(let j=n0[i];j<pt.n;j++){ const o=j*16; const x=im[o+12], y=im[o+13], z=im[o+14];
    if((x-hx)*(x-hx)+(y-hy)*(y-hy)+(z-hz)*(z-hz)<rr||(x-nx)*(x-nx)+(y-ny)*(y-ny)+(z-nz)*(z-nz)<rr){ for(const q of [0,1,2,4,5,6,8,9,10]) im[o+q]=0; k++; } } }
  if(R&&R.last){ R.last.hid=k; R.last.head=[hx,hy,hz]; } return r; };

/* ---------- Settings > Match graphics: Goal replays Off / One angle / Two angles ---------- */
CH.rpMode=el=>{ const v=el.value; if(v==='off') PREFS.replays=false; else { PREFS.replays=true; PREFS.rpAngles=v==='one'?'one':'two'; } savePrefs(); };
const _v185Settings=VIEWS.settings;
VIEWS.settings=function(){ const h=_v185Settings.apply(this,arguments); const i=h.indexOf('<label class="toggle v18-rpset">'); const j=i<0?-1:h.indexOf('</label>',i); if(j<0) return h;
  const cur=PREFS.replays===false?'off':PREFS.rpAngles==='one'?'one':'two';
  const sel=`<div class="field v185-rpset"><label class="lab" for="set-replays">Goal replays</label><select id="set-replays" data-c="rpMode" data-k="replays">${[['off','Off'],['one','One angle'],['two','Two angles']].map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select><span class="tiny muted">After a goal in live matches (3-D, 1x and 2x). Two angles: the scorer's view, then behind the goal.</span></div>`;
  return h.slice(0,i)+sel+h.slice(j+8); };
