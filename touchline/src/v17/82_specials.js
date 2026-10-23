/* ===================== v18.6 B2: rare special kicks (82) =====================
   Presentation only: engine.js, results, the order of events and their timing are untouched. A goal finished from a cross
   is now and then (about 2 % of Varsity/JV cross goals, more for technically gifted scorers, never at Modified) shown as a
   BICYCLE KICK (back to goal, body horizontal, the ball struck over his head) or a SCISSOR KICK (side-on, body rolled away
   from goal, a hip-height side volley), with take-off, contact, landing on the back / side and getting up.
   - Choice (v186xDecide, pure part v186xPick): e.ty 'cross' with a cross delivered to the scorer at least 7 m from goal,
     goalTs >= 0.45 (1x, 2x, 4x), not reduced motion, skipping, shootouts or menu stages. The pick hashes (pid, minute, score,
     side), so live, highlight cards and TouchlineTV show the same finish. Ratings: v186xRate (own helper) reads Px:
     technique = 0.25 pace + 0.30 passing + 0.45 shooting + position + traits. Force: st._v186xForce or V186X.force
     ('bike' | 'scissor') for the lab and tests.
   - Timing: the cross is launched with head:true and D(150) longer, and the strike is a no-wind 'head' launch (D(430)+90),
     so the goal is emitted exactly when the normal ground finish (wind D(200), D(380)+90, no square-up) would have been.
   - Contact: headOf returns the kicking boot's contact point (from the pose itself, scaled for whichever painter draws),
     so the cross homes in on it and update holds it there; the pose clock holds at contact until the ball has left the
     boot (the release can come a few fixed steps after the landing), so foot and ball always meet at release.
   - Poses (v186xFrame): world-space keyframes (body units in his yaw frame) converted into the body frame of a pitched
     (bike) or rolled (scissor) body; 3-D reads P.pitchB / P.rollB through a one-expression hook in 63_p3d_figures.js, 2-D
     gets the same tilt as a screen rotation (P.rot). All state lives in primitive v186x* fields on the scorer, so the
     replays (68, 76) reproduce the move. Position and facing are scripted from take-off until he is off the turf.
   - Hooks (wraps only): goalSequence, launch, finish (shownType keeps 'cross'), headOf, update, poseOf, feedPush,
     goalBanner, v18Replay (two-angle replay: the scorer's view ends at take-off, so his camera never goes upside down or
     inside his own body; the behind-the-goal pass starts earlier and slows the kick down), Stage.loop (slow motion), the
     lab (scenes 'bike' and 'scissor'). Globals are prefixed v186x / V186X. */
/* @v186x-pure-begin: constants, helpers, ratings and the pick (no Stage, no DOM; test/specials.js runs this block in Node) */
const V186X={on:true,force:null,Kb:0.025,Ks:0.03,minTs:0.45,minD:7,slow:0.55,log:[]};
const V186X_MS={bike:{set:760,to:380,st:200,fall:320,lie:100,up:420},scissor:{set:620,to:300,st:130,fall:270,lie:90,up:400}};

const v186xCl=(v,a,b)=>v<a?a:v>b?b:v;
const v186xSm=t=>{ t=t<0?0:t>1?1:t; return t*t*(3-2*t); };
const v186xEo=t=>{ t=t<0?0:t>1?1:t; return 1-(1-t)*(1-t); };
const v186xAd=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function v186xLp(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function v186xBz(a,c,b,t){ const u=1-t; return [u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1],u*u*a[2]+2*u*t*c[2]+t*t*b[2]]; }

/* ---------- ratings (own helper) ---------- */
function v186xTech(P){ if(!P) return 50; const s=P.sk||{}; let f=0.25*(s.spd||50)+0.30*(s.pas||50)+0.45*(s.sho||50);
  f+=P.pos==='FWD'?4:P.pos==='MID'?1:P.pos==='DEF'?-8:P.pos==='GK'?-30:0; const t=P.tr||{}; f+=1.2*(t.score||0)+0.4*(t.assist||0); return v186xCl(f,5,99); }
function v186xRate(st,p){ if(!p) return null; if(p.v186xfl!=null) return {tech:p.v186xfl,lvl:p.v186xlv||'V'};
  let P=null; try{ P=typeof Px==='function'&&typeof App!=='undefined'&&App.C?Px(p.pid):null; }catch(e){ P=null; } if(!P) return null;
  let lvl=null; try{ const f=App.C.fixtures&&st&&st.T&&App.C.fixtures[st.T.id]; lvl=f&&f.lvl; }catch(e){} return {tech:v186xTech(P),lvl:lvl||P.lvl||'V'}; }
/* the chance of each finish: g rises from 0.25 at the threshold to 1 at the top of the range */
function v186xG(t,a,b){ return t<a?0:0.25+0.75*v186xCl((t-a)/(b-a),0,1); }
function v186xProb(tech,lvl){ if(lvl!=='V'&&lvl!=='JV') return {bike:0,scissor:0}; return {bike:V186X.Kb*v186xG(tech,74,96),scissor:V186X.Ks*v186xG(tech,62,92)}; }
/* pure pick for a cross goal: o = {tech, lvl, ty, pid, m, sc, s}; deterministic */
function v186xPick(o){ if(!o||o.ty!=='cross') return null; const q=v186xProb(o.tech,o.lvl); if(q.bike+q.scissor<=0) return null;
  const u=(hashStr(['v186x',o.pid,o.m,Array.isArray(o.sc)?o.sc.join('-'):o.sc,o.s].join('|'))%1000003)/1000003; return u<q.bike?'bike':u<q.bike+q.scissor?'scissor':null; }

/* @v186x-pure-end */
/* ---------- the decision, at the start of a goal sequence ---------- */
Stage.prototype.v186xDecide=function(e){
  if(!V186X.on||this.rm||this.skip||this.demo||this.so||!e||e.t!=='goal') return null;
  const seq=e.seq; if(!seq||seq.length<2) return null; const last=seq[seq.length-1], prev=seq[seq.length-2];
  if(last.a!=='shot'||prev.a!=='cross'||last.pid!==e.pid) return null;
  const pl=this.pl(e.pid); if(!pl||pl.off||pl.gk) return null;
  const X=livePos(e.s,last.x,last.y)[0], gx=e.s===0?105:0; if(Math.abs(X-gx)<V186X.minD) return null;
  const force=this._v186xForce||V186X.force; if(force) return {kind:force==='scissor'?'scissor':'bike',forced:true};
  if(this.goalTs<V186X.minTs||e.ty!=='cross') return null;
  const R=v186xRate(this,pl); if(!R) return null;
  const k=v186xPick({tech:R.tech,lvl:R.lvl,ty:e.ty,pid:e.pid,m:e.m,sc:e.sc,s:e.s}); return k?{kind:k}:null; };

const _v186xGoal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(e){ let K=null;
  try{ const d=this.v186xDecide(e); if(d) K=this._v186x={kind:d.kind,forced:!!d.forced,e,pid:e.pid,s:e.s,armed:false,struck:false,pl:null,tc:null,rel:null,ts:this.ts}; }catch(err){ K=null; }
  try{ return await _v186xGoal.apply(this,arguments); }
  finally{ if(K&&this._v186x===K) this._v186x=null; if(K&&K.pl&&K.pl.v186xk&&!(this._rp&&this._rp.on)) v186xClear(K.pl); } };

/* ---------- durations and the pose clock (stage ms; the stage speed is latched when the cross is struck) ---------- */
function v186xDur(kind,ts){ const M=V186X_MS[kind]||V186X_MS.bike, k=ts||1, d=ms=>Math.max(55,ms*k); return {set:d(M.set),to:d(M.to),st:d(M.st),fall:d(M.fall),lie:d(M.lie),up:d(M.up)}; }
/* ms from contact: negative before it, 0 while the ball is on the boot (not yet released), then ms since the release */
function v186xTau(st,p){ const r=p.v186xr; if(r!=null&&r>=0) return st.now-r; return Math.min(0,st.now-p.v186xc); }
function v186xClear(p){ p.v186xk=null; p.v186xc=null; p.v186xr=null; p.v186xs=null; p.v186xy0=null; p.v186xpx=null; p.v186xpy=null; p.v186xdx=null; p.v186xdy=null; p.v186xl=null; }

/* ---------- body frame <-> world (his yaw frame, body units: F forward, L to his left, H height above the turf) ----------
   The same whole-body transform the 3-D figures apply (63: lift, then roll or pitch about the pivot); 2-D draws the same tilt. */
function v186xInv(w,th,ra,lift,piv){ const pv=lift+piv; let a=w[0], c=w[1], b=w[2]-pv;
  if(ra){ const cr=Math.cos(ra), sr=Math.sin(ra); const c0=c*cr+b*sr; b=-c*sr+b*cr; c=c0; }
  else if(th){ const cp=Math.cos(th), sp=Math.sin(th); const a0=a*cp-b*sp; b=a*sp+b*cp; a=a0; }
  return {f:a,u:b+piv,l:c}; }
function v186xFwd(f,u,l,th,ra,lift,piv){ const pv=lift+piv; let a=f, b=u+lift-pv, c=l;
  if(ra){ const cr=Math.cos(ra), sr=Math.sin(ra); const c2=c*cr-b*sr; b=c*sr+b*cr; c=c2; }
  else if(th){ const cp=Math.cos(th), sp=Math.sin(th); const a2=a*cp+b*sp; b=-a*sp+b*cp; a=a2; }
  return [a,c,b+pv]; }

/* ---------- keyframes: the pose at tau (ms from contact), in world terms ----------
   returns {th (pitch, + forward), ra (roll, + head to his right), lift, feet:[w0,w1], hands:[w0,w1], tilt}; null before take-off */
function v186xFrame(p,tau,T){ const kind=p.v186xk; if(tau<-T.to) return null;
  const K=p.v186xf===1?1:0, N=1-K; const feet=[null,null], hands=[null,null]; let th=0, ra=0, lift=0, tilt=0;
  if(kind==='bike'){ const sd=K===1?1:-1; const C=[-0.1,0.06*sd,1.95];
    const hS=[[0.25,-0.45,1.25],[0.25,0.45,1.25]], hO=[[-0.15,-0.75,1.15],[-0.15,0.75,1.15]], hB=[[-0.45,-0.7,0.95],[-0.45,0.7,0.95]], hT=[[-0.3,-0.5,0.04],[-0.3,0.5,0.04]];
    const nUp=[0.5,-0.12*sd,1.2], nDn=[0.45,-0.12*sd,0.8], kLow=[-0.25,0.12*sd,0.45], kFol=[-0.25,0.1*sd,1.75], kLie=[0.62,0.12*sd,0.04], nLie=[0.55,-0.12*sd,0.04];
    if(tau<-T.st){ const u=(tau+T.to)/Math.max(1,T.to-T.st); th=-0.55*v186xSm(u); lift=0.22*v186xEo(u);
      feet[N]=v186xBz([0.05,-0.1*sd,0],[0.35,-0.12*sd,0.75],nUp,v186xSm(u));
      feet[K]=u<0.45?[-0.02,0.1*sd,0]:v186xLp([-0.02,0.1*sd,0],kLow,v186xSm((u-0.45)/0.55));
      for(const i of [0,1]) hands[i]=v186xLp(hS[i],hO[i],v186xSm(u)); tilt=-0.35-0.1*u; }
    else if(tau<0){ const u=(tau+T.st)/T.st; th=-0.55-0.8*v186xSm(u); lift=0.22+0.12*v186xEo(u);
      feet[N]=v186xLp(nUp,nDn,v186xSm(u)); feet[K]=v186xBz(kLow,[0.8,0.1*sd,1.3],C,Math.sin(u*Math.PI/2));
      for(const i of [0,1]) hands[i]=v186xLp(hO[i],hB[i],v186xSm(u)); tilt=-0.45-0.1*u; }
    else if(tau<T.fall){ const u=tau/T.fall; th=-1.35-0.15*v186xSm(u); lift=0.34-0.98*u*u;
      feet[K]=u<0.3?v186xLp(C,kFol,v186xSm(u/0.3)):v186xBz(kFol,[0.3,0.1*sd,1.2],kLie,v186xSm((u-0.3)/0.7));
      feet[N]=v186xLp(nDn,nLie,v186xSm(u)); for(const i of [0,1]) hands[i]=v186xLp(hB[i],hT[i],v186xSm(u/0.8)); tilt=-0.55+0.8*v186xSm(u/0.6); }
    else if(tau<T.fall+T.lie){ th=-1.5; lift=-0.64; feet[K]=kLie; feet[N]=nLie; hands[0]=hT[0]; hands[1]=hT[1]; tilt=0.25; }
    else { const u=v186xCl((tau-T.fall-T.lie)/T.up,0,1);
      if(u<0.5){ const s=v186xSm(u/0.5); th=-1.5+1.05*s; lift=-0.64+0.06*s; feet[K]=v186xLp(kLie,[0.5,0.12*sd,0.02],s); feet[N]=v186xLp(nLie,[0.45,-0.12*sd,0.02],s);
        hands[0]=v186xLp(hT[0],[-0.2,-0.42,0.04],s); hands[1]=v186xLp(hT[1],[-0.2,0.42,0.04],s); }
      else { const s=v186xSm((u-0.5)/0.5), s1=v186xSm(s*2), s2=v186xSm(s*2-1); th=-0.45*(1-s); lift=-0.58*(1-s);
        const n=v186xLp([0.45,-0.12*sd,0.02],[0.06,-0.1*sd,0],s1); n[2]+=0.12*Math.sin(Math.PI*s1); feet[N]=n;
        const k=v186xLp([0.5,0.12*sd,0.02],[0.06,0.1*sd,0],s2); k[2]+=0.12*Math.sin(Math.PI*s2); feet[K]=k;
        hands[0]=v186xLp([-0.2,-0.42,0.04],[0.04,-0.3,1.0],s); hands[1]=v186xLp([-0.2,0.42,0.04],[0.04,0.3,1.0],s); }
      tilt=0.25*(1-u); } }
  else { const g=p.v186xg||1; const C=[0.55,0.2*g,1.25]; const gi=g>0?1:0, fi=1-gi; /* goal-side and far hand */
    const kCock=[0.1,-0.15*g,0.55], kFol=[0.4,0.65*g,1.4], kLie=[0.45,0.25*g,0.12], sTuck=[-0.05,-0.05*g,0.3], sLie=[0.3,-0.15*g,0.05];
    const hS=[[0.2,-0.45,1.2],[0.2,0.45,1.2]], hG=[0.1,0.7*g,1.55], hF=[0.0,-0.7*g,0.7], hGl=[0.25,0.45*g,0.6], hFt=[0.15,-0.55*g,0.03];
    if(tau<-T.st){ const u=(tau+T.to)/Math.max(1,T.to-T.st); ra=g*0.5*v186xSm(u); lift=0.1*v186xEo(u);
      feet[N]=u<0.5?[0,-0.1*g,0]:v186xLp([0,-0.1*g,0],sTuck,v186xSm((u-0.5)/0.5));
      feet[K]=v186xBz([0.05,0.1*g,0],[-0.1,-0.05*g,0.35],kCock,v186xSm(u));
      hands[gi]=v186xLp(hS[gi],hG,v186xSm(u)); hands[fi]=v186xLp(hS[fi],hF,v186xSm(u)); tilt=-0.15+0.25*u; }
    else if(tau<0){ const u=(tau+T.st)/T.st; ra=g*(0.5+0.55*v186xSm(u)); lift=0.1-0.02*u;
      feet[N]=sTuck; feet[K]=v186xBz(kCock,[0.65,-0.25*g,1.15],C,Math.sin(u*Math.PI/2)); hands[gi]=hG; hands[fi]=hF; tilt=0.1; }
    else if(tau<T.fall){ const u=tau/T.fall; ra=g*(1.05+0.35*v186xSm(u)); lift=0.08-0.7*u*u;
      feet[K]=u<0.3?v186xLp(C,kFol,v186xSm(u/0.3)):v186xBz(kFol,[0.5,0.4*g,0.8],kLie,v186xSm((u-0.3)/0.7)); feet[N]=v186xLp(sTuck,sLie,v186xSm(u));
      hands[gi]=v186xLp(hG,hGl,v186xSm(u)); hands[fi]=v186xLp(hF,hFt,v186xSm(u/0.75)); tilt=0.1+0.1*u; }
    else if(tau<T.fall+T.lie){ ra=g*1.4; lift=-0.62; feet[K]=kLie; feet[N]=sLie; hands[gi]=hGl; hands[fi]=hFt; tilt=0.2; }
    else { const u=v186xCl((tau-T.fall-T.lie)/T.up,0,1);
      if(u<0.5){ const s=v186xSm(u/0.5); ra=g*(1.4-0.8*s); lift=-0.62+0.22*s; feet[K]=v186xLp(kLie,[0.3,0.15*g,0.02],s); feet[N]=v186xLp(sLie,[0.15,-0.12*g,0.02],s); hands[fi]=hFt; hands[gi]=v186xLp(hGl,[0.3,0.35*g,0.5],s); }
      else { const s=v186xSm((u-0.5)/0.5), s1=v186xSm(s*2), s2=v186xSm(s*2-1); ra=g*0.6*(1-s); lift=-0.4*(1-s);
        const k=v186xLp([0.3,0.15*g,0.02],[0.05,0.1*g,0],s1); k[2]+=0.1*Math.sin(Math.PI*s1); feet[K]=k;
        const n=v186xLp([0.15,-0.12*g,0.02],[0.04,-0.1*g,0],s2); n[2]+=0.1*Math.sin(Math.PI*s2); feet[N]=n;
        hands[fi]=v186xLp(hFt,[0.04,-0.3*g,1.0],s); hands[gi]=v186xLp([0.3,0.35*g,0.5],[0.04,0.3*g,1.0],s); }
      tilt=0.2*(1-u); } }
  return {th,ra,lift,feet,hands,tilt}; }

/* the painter's body-unit scale and ball radius for this stage (2-D: 1.06 and BALL_R; 3-D: 0.92 and V18_BALL_R) */
function v186xScale(st,p){ const d3=typeof v184Is3D==='function'?v184Is3D(st):!!(st&&st._p3d&&!st._p3d.dead); return {S:(d3?0.92:1.06)*(p.hgt||70)/70,R:d3?(typeof V18_BALL_R==='number'?V18_BALL_R:0.176):BALL_R,d3}; }
/* world point (metres, z up) of a yaw-frame body-unit point */
function v186xW(p,w,S){ const y=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, c=Math.cos(y), s=Math.sin(y); return {x:p.x+(w[0]*c-w[1]*s)*S,y:p.y+(w[0]*s+w[1]*c)*S,z:w[2]*S}; }
/* where the ball sits at contact: the kicking boot's contact point, the ball against the laces on the goal side */
Stage.prototype.v186xContact=function(p){ const T=v186xDur(p.v186xk,p.v186xts); const F=v186xFrame(p,0,T); if(!F) return null; const {S,R}=v186xScale(this,p);
  const K=p.v186xf===1?1:0, w=F.feet[K]; const yaw=p.v186xy!=null?p.v186xy:(p.yaw||0); const c=Math.cos(yaw), s=Math.sin(yaw);
  const ft={x:p.x+(w[0]*c-w[1]*s)*S,y:p.y+(w[0]*s+w[1]*c)*S,z:w[2]*S};
  let nx,ny,nz; if(p.v186xk==='bike'){ nx=-c*0.95; ny=-s*0.95; nz=0.3; } else { const g=p.v186xg||1; nx=-s*g*0.95+c*0.2; ny=c*g*0.95+s*0.2; nz=0.1; }
  const nl=Math.hypot(nx,ny,nz), off=R*0.75+0.03; return {x:ft.x+nx/nl*off,y:ft.y+ny/nl*off,z:Math.max(0,ft.z+nz/nl*off-R)}; };

/* ---------- the cross and the strike (launch) ---------- */
const _v186xLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ const K=this._v186x;
  if(!K||this.skip||!opt||this.rm) return _v186xLaunch.apply(this,arguments);
  try{
    /* the cross to the scorer: aimed at his boot's contact point, a little longer (the strike has no wind-up) */
    if(!K.armed&&opt.home&&opt.home.pid===K.pid&&p&&p!==opt.home&&p.side===opt.home.side&&(opt.h||0)>2&&!opt.hands&&!this.hands){
      const pl=opt.home, st=this, on0=opt.onRelease; K.armed=true; K.pl=pl;
      const gx=K.s===0?105:0, dir=K.s===0?1:-1; const at=pl.ov&&isFinite(pl.ov.x)?pl.ov:pl; const ca=Math.atan2(p.y-at.y,p.x-at.x); let yaw, gs=1, kf;
      if(K.kind==='bike'){ const away=dir>0?Math.PI:0; yaw=away+v186xCl(v186xAd(ca,away),-0.5,0.5); kf=Math.cos(yaw)>0?1:0; }
      else { const gy=Math.atan2(34-at.y,gx-at.x); const c1=gy+Math.PI/2, c2=gy-Math.PI/2; const c=Math.abs(v186xAd(ca,c1))<Math.abs(v186xAd(ca,c2))?c1:c2;
        yaw=c+v186xCl(v186xAd(ca,c),-0.35,0.35); gs=Math.sin(gy-yaw)>=0?1:-1; kf=gs>0?1:0; }
      yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
      const o2=Object.assign({},opt,{head:true,dur:opt.dur+this.D(150),onRelease:f=>{ if(on0) on0(f); pl.jumpT=-9e9;
        pl.v186xk=K.kind; pl.v186xs=st.now; pl.v186xc=st.now+f.dur; pl.v186xr=-1; pl.v186xts=st.ts; pl.v186xy=yaw; pl.v186xg=gs; pl.v186xf=kf; pl.v186xy0=null; pl.v186xpx=null; pl.v186xl=0; K.tc=pl.v186xc; K.ts=st.ts; }});
      return _v186xLaunch.call(this,p,o2); }
    /* the strike: off the boot at the contact point (a 'head' launch: no wind-up, no square-up turn), the kick sound, the caption */
    if(K.armed&&!K.struck&&K.pl&&p===K.pl&&opt.kind==='shot'&&p.v186xk&&this.headBall===p){ K.struck=true; const st=this, on0=opt.onRelease;
      const o2=Object.assign({},opt,{onRelease:f=>{ if(on0) on0(f); st.v186xRelease(p,K); }});
      const own=Object.prototype.hasOwnProperty.call(this,'snd'), s0=this.snd; let sw=false;
      this.snd=function(fn){ if(!sw&&fn==='trap'){ sw=true; return s0.call(this,'kick','shot',0.95); } return s0.apply(this,arguments); };
      try{ return _v186xLaunch.call(this,p,o2); } finally{ if(own) this.snd=s0; else delete this.snd; } }
  }catch(err){ if(typeof console!=='undefined') console.warn('v18.6 specials',err); }
  return _v186xLaunch.apply(this,arguments); };
Stage.prototype.v186xRelease=function(p,K){ p.v186xr=this.now; K.rel=this.now; p.ov={x:p.x,y:p.y}; this.hype=Math.max(this.hype,0.8);
  this.onCaption(K.kind==='bike'?'BICYCLE KICK!':'SCISSOR KICK!','set'); V186X.log.push({kind:K.kind,pid:p.pid,m:K.e&&K.e.m,tc:K.tc,rel:this.now,forced:K.forced}); if(V186X.log.length>40) V186X.log.shift(); };

/* the box score keeps saying what was shown: a cross (never 'header' for a ball met with the boot, never 'tapin') */
const _v186xFinish=Stage.prototype.finish;
Stage.prototype.finish=function(e,pl){ const K=this._v186x;
  if(!K||!K.armed||!pl||K.pl!==pl||!pl.v186xk||this.headBall!==pl||e!==K.e) return _v186xFinish.apply(this,arguments);
  const own=Object.prototype.hasOwnProperty.call(this,'shownType'), prev=this.shownType;
  this.shownType=function(e2,p2,header,d){ let t=prev.call(this,e2,p2,false,d); if(e2===K.e&&(t==='tapin'||t==='header')) t='cross'; return t; };
  const undo=()=>{ if(own) this.shownType=prev; else delete this.shownType; };
  let pr; try{ pr=_v186xFinish.apply(this,arguments); }catch(err){ undo(); throw err; }
  return Promise.resolve(pr).finally(undo); };

/* the cross homes in on the contact point, and update holds the ball there until the strike */
const _v186xHead=Stage.prototype.headOf;
Stage.prototype.headOf=function(p){ if(p&&p.v186xk&&!(p.v186xr>=0)&&p.v186xc!=null){ try{ const c=this.v186xContact(p); if(c) return c; }catch(e){} } return _v186xHead.apply(this,arguments); };
/* the top of his body through the move (head, or a boot raised above it, with the ball on it): the 2-D name plate sits above that, never on the kick (3-D plates use the solved head) */
const _v186xJump=Stage.prototype.jumpLift;
Stage.prototype.jumpLift=function(p){ const r=_v186xJump.apply(this,arguments); if(!p||!p.v186xk||p.v186xc==null) return r;
  try{ const F=v186xFrame(p,v186xTau(this,p),v186xDur(p.v186xk,p.v186xts)); if(!F) return r; const h=Math.max(v186xFwd(0.02,1.83,0,F.ra?0:F.th,F.ra,F.lift,0.8)[2],F.feet[0][2]+0.3,F.feet[1][2]+0.3); return r+(h-1.83)*v186xScale(this,p).S; }catch(e){ return r; } };

/* ---------- after every step: facing and position scripted through the move ---------- */
const _v186xUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v186xUpd.apply(this,arguments); const K=this._v186x; const p=K&&K.pl;
  if(p&&p.v186xk&&p.v186xc!=null) this.v186xStep(p); return r; };
Stage.prototype.v186xStep=function(p){ const now=this.now;
  if(this.skip||!this.alive||p.off||this.rm){ v186xClear(p); return; }
  const T=v186xDur(p.v186xk,p.v186xts), tc=p.v186xc, r=p.v186xr, tTO=tc-T.to, rd=r>=0?now-r:-1;
  if(r<0&&now>tc+4000){ v186xClear(p); return; }
  /* he turns into position while the ball is in the air (set), then holds that facing */
  if(now<tTO){ const s0=Math.max(p.v186xs,tc-T.set); if(now>=s0){ if(p.v186xy0==null) p.v186xy0=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw;
      const u=v186xSm((now-s0)/Math.max(1,(tTO-s0)*0.8)); p.yaw=p.v186xy0+v186xAd(p.v186xy,p.v186xy0)*u; p.face=Math.cos(p.yaw)>=0?1:-1; } }
  else if(rd<0||rd<T.fall+T.lie+T.up*0.5){ p.yaw=p.v186xy; p.face=Math.cos(p.yaw)>=0?1:-1; }
  /* from take-off until he is off the turf he stays where he jumped (carried on a little by his run-in) */
  if(now>=tTO&&(r<0||rd<T.fall+T.lie)){
    if(p.v186xpx==null){ p.v186xpx=p.x; p.v186xpy=p.y; const v=Math.hypot(p.vx||0,p.vy||0); const dd=Math.min(0.45,v*T.to/1000*0.5); p.v186xdx=v>0.05?p.vx/v*dd:0; p.v186xdy=v>0.05?p.vy/v*dd:0; if(!p.celeb) p.ov={x:p.x,y:p.y}; }
    const u=v186xEo((now-tTO)/Math.max(1,T.to)); p.x=p.v186xpx+p.v186xdx*u; p.y=p.v186xpy+p.v186xdy*u; p.vx=0; p.vy=0; p.spd=0;
    if(p.ov&&!p.celeb){ p.ov.x=p.x; p.ov.y=p.y; } }
  if(r>=0&&!p.v186xl&&rd>=T.fall*0.85){ p.v186xl=1; this.kickTurf(p.x,p.y,7,1.1); }
  /* done: up on his feet (a celebration that starts while he is still rising takes over from halfway up) */
  if(r>=0&&(rd>=T.fall+T.lie+T.up||(p.celeb&&rd>=T.fall+T.lie+T.up*0.5))) v186xClear(p); };

/* ---------- the pose ---------- */
const _v186xPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v186xPose.apply(this,arguments); if(isRef||!p||!p.v186xk||p.v186xc==null||!P||!P.feet||!P.hands) return P;
  try{ return this.v186xPose(p,P); }catch(e){ return P; } };
Stage.prototype.v186xPose=function(p,P){ const T=v186xDur(p.v186xk,p.v186xts), tau=v186xTau(this,p), now=this.now;
  const F=v186xFrame(p,tau,T);
  if(!F){ /* set: eyes up on the ball, arms out, a little crouch; the legs keep running */
    const s0=Math.max(p.v186xs!=null?p.v186xs:now,p.v186xc-T.set); if(now<s0) return P; const w=v186xSm((now-s0)/Math.max(1,(p.v186xc-T.to-s0)*0.5));
    const bike=p.v186xk==='bike', H=bike?[[0.25,1.25,-0.45],[0.25,1.25,0.45]]:[[0.2,1.2,-0.45],[0.2,1.2,0.45]];
    for(const i of [0,1]){ const h=P.hands[i]; P.hands[i]={f:lerp(h.f,H[i][0],w),u:lerp(h.u,H[i][1],w),l:lerp(h.l,H[i][2],w)}; }
    P.headTilt=lerp(P.headTilt||0,bike?-0.35:-0.15,w); P.hipU=lerp(P.hipU,0.76,w); return P; }
  const piv=0.8; P.act='v186x'; P.hipU=0.8; P.pivot=piv; P.lift=F.lift; P.lean=0; P.headTilt=F.tilt; P.headTurn=0; P.prop=null; P.bootT=null;
  for(const i of [0,1]){ P.feet[i]=v186xInv(F.feet[i],F.th,F.ra,F.lift,piv); P.hands[i]=v186xInv(F.hands[i],F.th,F.ra,F.lift,piv); }
  P.pitchB=F.ra?0:F.th; P.rollB=F.ra;
  if(typeof v184Is3D==='function'&&v184Is3D(this)) P.rot=0;
  else { /* 2-D: the body's tilted up-axis, projected the way drawFigure projects (depth squashed by DEP), as a screen rotation */
    const y=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, c=Math.cos(y), s=Math.sin(y); let Fu=0, Lu=0, Hu=1;
    if(F.ra){ Lu=-Math.sin(F.ra); Hu=Math.cos(F.ra); } else if(F.th){ Fu=Math.sin(F.th); Hu=Math.cos(F.th); }
    const X=Fu*c-Lu*s, Y=Fu*s+Lu*c; const k=this.proj(p.x,p.y)[2]; const DEP=this.depthK!=null?this.depthK:clamp((this.H*0.705/68)/Math.max(1,k),0.12,0.45);
    P.rot=Math.atan2(X,Hu-Y*DEP); }
  return P; };

/* world position (metres) of a foot of a pose, after the leg's reach (IK) and the whole-body tilt: for tests and debugging */
function v186xFootW(st,p,P,i){ const {S}=v186xScale(st,p); const ft=P.feet[i]; const B=({lean:.9,average:1,stocky:1.14})[(p.look&&p.look.build)||'average']||1; const sd=i?1:-1;
  const J=ik3([0,P.hipU,sd*0.09*B],[ft.f,ft.u+0.06,ft.l],0.43,0.43,[1,0.05,sd*0.12]); const t=J.t; const th=P.pitchB||0, ra=P.rollB||0;
  const w=v186xFwd(t[0],t[1]-0.06,t[2],th,ra,P.lift||0,P.pivot||0); return v186xW(p,w,S); }

/* ---------- commentary, the goal banner and the replays ---------- */
if(typeof feedPush==='function'){ const _v186xFeed=feedPush;
  feedPush=function(e,quiet){ const r=_v186xFeed.apply(this,arguments);
    try{ const L=typeof App!=='undefined'&&App.live, st=L&&L.stage, K=st&&st._v186x; if(!quiet&&e&&e.t==='goal'&&K&&K.e===e&&K.struck&&L.feed&&L.feed[0]&&L.feed[0].cls==='goal'&&!L.feed[0].v186x){
      L.feed[0].v186x=1; L.feed[0].txt+=' '+(K.kind==='bike'?'What a bicycle kick!':'A scissor-kick volley!'); } }catch(err){}
    return r; }; }
if(typeof goalBanner==='function'){ const _v186xBanner=goalBanner;
  goalBanner=function(e){ const r=_v186xBanner.apply(this,arguments);
    try{ const L=typeof App!=='undefined'&&App.live, st=L&&L.stage, K=st&&st._v186x; if(e&&K&&K.e===e&&K.struck){ const sub=document.querySelector('#lv-banner .gb-sub'); const nm=typeof GOAL_TYPE_NAME!=='undefined'&&GOAL_TYPE_NAME[e.ty];
      if(sub&&nm){ const k=esc(nm), i=sub.innerHTML.indexOf(k); if(i>=0) sub.innerHTML=sub.innerHTML.slice(0,i)+(K.kind==='bike'?'Bicycle kick':'Scissor kick')+sub.innerHTML.slice(i+k.length); } } }catch(err){}
    return r; }; }

/* the replay of a special: the scorer's view ends as he leaves the ground (his head would go upside down and his legs fill
   the lens), the behind-the-goal pass starts at the set, and the kick itself plays at 0.55x of the replay rate */
if(typeof v18Replay==='function'){ const _v186xReplay=v18Replay;
  v18Replay=function(st){ const pr=_v186xReplay.apply(this,arguments); try{ const Q=st&&st._rp, K=st&&st._v186x; if(Q&&!Q.done&&K&&K.struck&&K.pl&&K.tc!=null) v186xRpAdjust(st,Q,K); }catch(e){ if(typeof console!=='undefined') console.warn('v18.6 specials replay',e); } return pr; }; }
function v186xRpAdjust(st,Q,K){ const B=Q.R&&Q.R.buf; if(!B||!B.length) return; const T=v186xDur(K.kind,K.ts), tc=K.tc, rel=K.rel!=null?K.rel:tc, tTO=tc-T.to;
  Q.v186x={kind:K.kind,s0:tTO-T.st*0.5,s1:rel+T.fall,f:V186X.slow};
  if(!(Q.two&&Q.win&&Q.win.length===2&&typeof v185Idx==='function')) return;
  const b0=B[0].now; let a0=Q.win[0][0]; if(Q.crossT!=null) a0=Math.max(b0,Math.min(a0,Q.crossT-300)); const a1=Math.min(Q.win[0][1],tTO-10);
  const c0=Math.max(b0,Math.min(Q.win[1][0],tc-T.set*0.6)); Q.win[1]=[c0,Q.win[1][1]];
  if(Q.pass===1&&a1-a0>=400){ Q.win[0]=[a0,a1]; Q.t=Q.t0=a0; Q.t1=a1; Q.i=v185Idx(B,a0); }
  else { Q.pass=2; Q.cam='goal'; Q.t=Q.t0=c0; Q.t1=Q.win[1][1]; Q.i=v185Idx(B,c0); if(Q.cams) Q.cams=['goal']; if(typeof v185Caption==='function') v185Caption(st,Q); } }
const _v186xLoop=Stage.prototype.loop;
Stage.prototype.loop=function(ts){ const Q=this._rp;
  if(Q&&Q.on&&!Q.done&&Q.v186x&&!this.paused&&(!Q.two||Q.cam==='goal')){ const X=Q.v186x; if(Q.t>=X.s0&&Q.t<=X.s1){ const real=ts-this.t0; const step=Math.min(50,Math.max(0,real-this.lastReal));
      const rate=Q.two&&Q.rate?Q.rate:V18_RP.rate; Q.t-=step*rate*(1-X.f); } }
  return _v186xLoop.apply(this,arguments); };

/* ---------- the lab: forced bicycle kick and scissor volley from a cross ---------- */
LAB_SCENES.push(['bike','Bicycle kick (forced)'],['scissor','Scissor volley (forced)']);
const _v186xLabRun=labRun;
labRun=function(scen){ const r=_v186xLabRun.apply(this,arguments); if(scen!=='bike'&&scen!=='scissor') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    st._v186xForce=scen; const A=[...st.players.values()].filter(p=>p.side===0); const fw=A[9], wing=A[8]; let i=0;
    while(alive()){ st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=92; const top=i++%2===0;
      const e={s:0,pid:fw.pid,t:'goal',ty:'cross',seq:[{pid:wing.pid,x:top?10:90,y:85,a:'cross'},{pid:fw.pid,x:top?47:53,y:90,a:'shot'}],sc:[1,0],m:10};
      st.clipStart(e); await st.goalSequence(e); if(!alive()) return; await st.wait(st.D(700)); } }); };
