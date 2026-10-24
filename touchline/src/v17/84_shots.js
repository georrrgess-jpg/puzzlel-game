/* ===================== v18.7 A2: shooting and header variety (84) =====================
   Presentation only: engine.js, results, the order of events, flight targets and durations and every stage wait are
   unchanged (one exception keeps a total: the volley's cross is longer by exactly the strike's wind-up, and the strike then
   has none, as 82's specials do). Switch V187S.on; forced kinds for the lab and tests: st._v187sForce / V187S.force
   ('drive' | 'place' | 'chip' | 'toe' | 'outside' | 'volley') and st._v187hForce / V187S.hforce ('dive' | 'glance' | 'clear' | 'power').
   1. Strike techniques. Every shot from the feet picks one (kickKind wrapper, when the original launch has its final options):
      - driven (laces): big backswing with the heel up, toe pointed, knee over the ball, follow-through high, lands on the kicking foot
      - placed side-foot: knee and hip opened out (leg pole), toe up and ankle locked, short follow-through across, eyes down
      - chip: short backswing, the foot stabs down under the ball and stops, body leaning back, both arms up; the flight's arc
        rises (h) so it floats over and drops (goals and misses only; same target and duration)
      - toe-poke: no backswing (a small cock held), a quick jab at the end of the same wind-up, lunging forward
      - outside of the boot: knee and foot turned in, swing from inside to out, finish out wide; the drawn curl (55's v17curl)
        bends toward his kicking side
      - first-time volley (cross goals only): the cross arrives at shin or knee height (front volley: knee over it, foot at
        the laces; side-on volley: body rolled away, the leg swinging round), contact as the cross lands
      Choice: distance, the shot's height, the keeper off his line, first-time vs settled, and finishing p.v186r_fin (78):
      better finishers place, chip, bend and volley more; poorer ones toe-poke and blast. Pens and shootouts keep the old swing.
      The contact is 75's (the latched back of the ball, met at kickT + kickW); the standing foot stays 75's plant.
   2. Headers: diving headers (a low cross, the body launched flat, contact at about 0.6-0.8 m, landing on the chest, push-up),
      glancing flick-ons (a smaller leap, the head turned to steer the ball on, a skimming flight), defensive clearing headers
      (a big nod and neck snap, arms driven back, the clearance climbs higher) and the existing power header. Jump height
      scales with the player's height (jumpLift / headOf / the leap pose; 63 in about 0.76x, 78 in about 1.28x of the old leap).
   All per-player state is primitive v187* fields (replays copy them); every pose is bounded in time. Globals: v187s / V187S. */
const V187S={on:true,force:null,hforce:null,log:[]};
const V187S_TECH=['drive','place','chip','toe','outside','volley'];
const v187sSm=t=>{ t=t<0?0:t>1?1:t; return t*t*(3-2*t); };
const v187sLp=(a,b,t)=>a+(b-a)*t;
const v187sLP=(A,B,t)=>({f:A.f+(B.f-A.f)*t,u:A.u+(B.u-A.u)*t,l:A.l+(B.l-A.l)*t});
function v187sH01(s){ return typeof v17h01==='function'?v17h01(s):(hashStr(String(s))%10007)/10007; }
function v187sLog(o){ const L=V187S.log; L.push(o); if(L.length>800) L.splice(0,L.length-800); }
const v187s3D=st=>typeof v184Is3D==='function'?v184Is3D(st):!!(st&&st._p3d&&!st._p3d.dead);
function v187sS(st,p){ return (v187s3D(st)?0.92:1.06)*(p.hgt||70)/70; }
function v187sBR(st){ return v187s3D(st)?(typeof V18_BALL_R==='number'?V18_BALL_R:0.176):BALL_R; }
const v187sA=p=>Math.max(0,Math.min(1,((p&&p.v186r_fin!=null?p.v186r_fin:60)-25)/70));
/* the leap scales with his height (inches; 70 = the old fixed curve) */
function v187sLeap(p){ const h=p&&p.hgt||70; return Math.max(0.74,Math.min(1.3,1+(h-70)*0.035)); }
const v187sYaw=p=>p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw;
const v187sAd=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
/* the header kind in play for this player now (a stale one from an earlier header is ignored) */
function v187sHK(st,p){ return p&&p.v187hk&&p.v187hc!=null&&Math.abs(st.now-p.v187hc)<st.D(900)+300?p.v187hk:null; }
const v187sJK=k=>k==='glance'?0.85:k==='clear'?1.06:1;

/* @v187s-pure-begin: the pick (pure; o = {force,a,u,u2,d,gkOff,over,save,first,fk}) */
function v187sPick(o){ if(o.force&&o.force!=='volley'&&V187S_TECH.includes(o.force)) return o.force;
  const a=o.a, u=o.u, u2=o.u2;
  if(o.fk) return 'drive';
  if(o.d<7) return u<0.5-0.3*a?'toe':'place';
  if(!o.save&&o.d>=9&&o.d<=26&&a>0.25){ const pc=o.gkOff>2.5?0.45+0.35*a:o.over?0.3:0.05+0.08*a; if(u<pc) return 'chip'; }
  if(o.d>=10&&u2<0.08+0.14*a) return 'outside';
  if(o.d>=18) return 'drive';
  return u2<(o.first?0.5:0.3)+0.35*a?'place':'drive'; }
/* @v187s-pure-end */

/* ---------- body frame <-> world for a pitched (th, + forward) or rolled (ra, + head to his right) body, as 63 draws it ---------- */
function v187sInv(w,th,ra,lift,piv){ const pv=lift+piv; let a=w.f, c=w.l, b=w.u-pv;
  if(ra){ const cr=Math.cos(ra), sr=Math.sin(ra); const c0=c*cr+b*sr; b=-c*sr+b*cr; c=c0; }
  else if(th){ const cp=Math.cos(th), sp=Math.sin(th); const a0=a*cp-b*sp; b=a*sp+b*cp; a=a0; }
  return {f:a,u:b+piv,l:c}; }
function v187sFwd(f,u,l,th,ra,lift,piv){ const pv=lift+piv; let a=f, b=u+lift-pv, c=l;
  if(ra){ const cr=Math.cos(ra), sr=Math.sin(ra); const c2=c*cr-b*sr; b=c*sr+b*cr; c=c2; }
  else if(th){ const cp=Math.cos(th), sp=Math.sin(th); const a2=a*cp+b*sp; b=-a*sp+b*cp; a=a2; }
  return {f:a,l:c,u:b+pv}; }
/* 2-D: the tilted up-axis as a screen rotation (drawFigure rotates about the pivot), as 82 does */
function v187sRot2D(st,p,th,ra){ const y=v187sYaw(p), c=Math.cos(y), s=Math.sin(y); let Fu=0, Lu=0, Hu=1;
  if(ra){ Lu=-Math.sin(ra); Hu=Math.cos(ra); } else if(th){ Fu=Math.sin(th); Hu=Math.cos(th); }
  const X=Fu*c-Lu*s, Y=Fu*s+Lu*c; const k=st.proj(p.x,p.y)[2]; const DEP=st.depthK!=null?st.depthK:clamp((st.H*0.705/68)/Math.max(1,k),0.12,0.45);
  return Math.atan2(X,Hu-Y*DEP); }
function v187sTilt(st,p,P,th,ra,lift,piv){ P.pitchB=ra?0:th; P.rollB=ra; P.lift=lift; P.pivot=piv; P.rot=v187s3D(st)?0:v187sRot2D(st,p,th,ra); }
/* world point (metres, z up) of a yaw-frame body-unit point */
function v187sW(p,w,S,yaw){ const c=Math.cos(yaw), s=Math.sin(yaw); return {x:p.x+(w.f*c-w.l*s)*S,y:p.y+(w.f*s+w.l*c)*S,z:w.u*S}; }

/* the knee's aim for the kicking leg (open hip on a side-foot, turned in on the outside of the boot): set by the last
   poseOf, read by the leg IK that follows it in both painters */
let v187sLeg=null;
const _v187sPole=v186LegPole;
v186LegPole=function(f,u,sd){ const r=_v187sPole(f,u,sd); const L=v187sLeg; if(!L||sd!==1||!V187S.on) return r; const w=L.w;
  return [r[0]+(L.v[0]-r[0])*w,r[1]+(L.v[1]-r[1])*w,r[2]+(L.v[2]-r[2])*w]; };

/* ---------- 1. strike techniques ---------- */
/* b backswing (at sb of the wind-up), t top of the follow-through (at ut of it), r where the foot settles; bt toe angle
   (backswing, contact, top; + = toe down); ln lean (backswing, contact, top); dip of the hips at contact; arm targets
   (balance arm, other arm); eyes down; pole = the knee's aim; cu = contact height; jab = the swing accelerates late */
const V187S_K={
  drive:{sb:0.6,b:{f:-0.58,u:0.66,l:0.1},t:{f:0.82,u:1.12,l:0.02},ut:0.42,r:{f:0.22,u:0,l:0.08},bt:[0.45,1.0,0.75],ln:[-0.1,0.24,0.14],dip:0.08,arm:[{f:0.2,u:1.52,l:-0.74},{f:-0.4,u:1.22,l:0.44}],tilt:0.2,cu:0.09},
  place:{sb:0.6,b:{f:-0.3,u:0.24,l:0.3},t:{f:0.4,u:0.22,l:-0.06},ut:0.3,r:{f:0.06,u:0,l:0.06},bt:[0,-0.25,-0.18],ln:[0.03,0.1,0.06],dip:0.04,arm:[{f:0.22,u:1.3,l:-0.56},{f:-0.1,u:1.08,l:0.42}],tilt:0.34,pole:[0.3,0.05,0.95],cu:0.08},
  chip:{sb:0.62,b:{f:-0.36,u:0.34,l:0.08},t:{f:0.36,u:0.48,l:0.06},ut:0.2,r:{f:0.08,u:0,l:0.06},bt:[0.25,0.6,0.35],ln:[-0.03,-0.14,-0.1],dip:0.08,arm:[{f:0.16,u:1.62,l:-0.66},{f:0.12,u:1.52,l:0.62}],tilt:0.14,cu:0.04,low:0.08},
  toe:{sb:0.74,b:{f:-0.07,u:0.12,l:0.06},t:{f:0.62,u:0.2,l:0.06},ut:0.22,r:{f:0.1,u:0,l:0.06},bt:[0.1,-0.3,-0.2],ln:[0.1,0.26,0.16],dip:0.09,arm:[{f:0.34,u:1.2,l:-0.46},{f:0.16,u:1.04,l:0.4}],tilt:0.26,cu:0.1,jab:1},
  outside:{sb:0.6,b:{f:-0.42,u:0.44,l:-0.07},t:{f:0.5,u:0.62,l:0.38},ut:0.4,r:{f:0.14,u:0,l:0.14},bt:[0.35,0.85,0.6],ln:[-0.05,0.15,0.08],dip:0.05,arm:[{f:0.2,u:1.42,l:-0.64},{f:-0.26,u:1.14,l:0.38}],tilt:0.16,pole:[0.75,0.05,-0.6],cu:0.09,dl:0.03}};
const V187S_HOLD=0.08;
/* the flight's horizontal pace profile (flC) per technique: a driven ball keeps its pace, a side-foot one dies a little */
const V187S_C={drive:0.1,place:0.8,chip:0.45,toe:0.3,outside:0.25,volley:0.15};

/* a shot from the feet: pick the technique once, when the original launch reads its final options */
Stage.prototype.v187sShot=function(p,opt){ p.v187t=null; if(!V187S.on||this.rm||this.skip||this.so||this.setPiece==='pen'||p.gk) return;
  const b=this.ball, gx=p.side===0?105:0, d=Math.hypot(gx-b.x,34-b.y); const V=this._v187v; const vol=!!(V&&V.pl===p&&p.v187vk&&p.v187vc!=null&&p.v187vr==null);
  const save=!!(opt.hands||opt.home); const gk=this.gkOf(1-p.side); const gkOff=gk?Math.abs(gk.x-gx):0; const to=opt.to;
  const first=this.now-(p.v187rc==null?-9e9:p.v187rc)<Math.max(400,this.D(700)); const key=p.pid+'|'+(this._v187key||'')+'|'+Math.round(d*2);
  const force=this._v187sForce||V187S.force;
  const t=vol?'volley':v187sPick({force,a:v187sA(p),u:v187sH01('c'+key),u2:v187sH01('o'+key),d,gkOff,over:!!(to&&(to.z||0)>=2.6),save,first,fk:this.setPiece==='fk'});
  p.v187t=t; p.v187tT=this.now;
  let h0=null; if(t==='chip'&&!save){ const ch=Math.min(3.4,1.5+d*0.06), hf=opt.hFn, hb=opt.h||0; opt.h=Math.max(hb,ch); opt.hFn=()=>{ h0=hf?hf():hb; return Math.max(h0,ch); }; }
  const o0=opt.onRelease, st=this; opt.onRelease=function(f){ f.v187s=t; if(h0!=null) f.v187h0=h0; if(vol){ p.v187vr=st.now; } if(o0) return o0.apply(this,arguments); };
  v187sLog({k:'shot',t,pid:p.pid,d:+d.toFixed(1),fin:p.v186r_fin,save,first,gkOff:+gkOff.toFixed(1),h:+(opt.h||0).toFixed(2),W:opt.wind===0?0:this.windOf('shot'),now:Math.round(this.now)}); };

/* the kicking leg, standing foot, hips, lean and arms for a technique (a ground strike; 75 has already laid the contact) */
Stage.prototype.v187sKickPose=function(p,P){ const T=V187S_K[p.v187t]; if(!T) return; const now=this.now, kt=now-p.kickT, W=p.kickW||0, Fd=p.kickF||260; const F=P.feet, H=P.hands;
  const K=p.v184K&&p.v184K.k===p.kickT?p.v184K:null; const con={f:K?K.f:0.3,u:T.cu,l:(K?K.l:0.06)+(T.dl||0)}; const st0={f:0.04,u:0,l:0.06};
  let ft, bt, ln, lb, env, eyes;
  if(kt<W){ const s=kt/W; lb=v187sSm(s/0.5); eyes=v187sSm(s);
    if(s<T.sb){ const q=v187sSm(s/T.sb); ft=v187sLP(st0,T.b,q); bt=v187sLp(0,T.bt[0],q); ln=v187sLp(0,T.ln[0],q); env=0; }
    else { const q=(s-T.sb)/(1-T.sb), e=T.jab?q*q*q:q*q; ft=v187sLP(T.b,con,e); ft.u+=(T.low?-T.low:0.05)*Math.sin(Math.PI*q); if(ft.u<0.02) ft.u=0.02;
      bt=v187sLp(T.bt[0],T.bt[1],e); ln=v187sLp(T.ln[0],T.ln[1],e); env=e; P.v187b=1; } }
  else { const u=(kt-W)/Fd; lb=1-v187sSm(u); eyes=1-v187sSm(u/0.6);
    if(u<T.ut){ const q=v187sSm(Math.max(0,u-V187S_HOLD)/(T.ut-V187S_HOLD)); ft=v187sLP(con,T.t,q); /* the boot stays with the ball for an instant (the release lands on the first step after the wind-up) */ bt=v187sLp(T.bt[1],T.bt[2],q); ln=v187sLp(T.ln[1],T.ln[2],q); env=1-q; if(u<0.5) P.v187b=1; }
    else { const q=v187sSm((u-T.ut)/(1-T.ut)); ft=v187sLP(T.t,T.r,q); bt=v187sLp(T.bt[2],0,q); ln=v187sLp(T.ln[2],0,q); env=0; } }
  F[1]=ft; P.bootT=[null,bt]; P.lean=ln; P.hipU=0.8-T.dip*env; P.headTilt=(P.headTilt||0)*0.4+T.tilt*eyes;
  for(const i of [0,1]){ const A=T.arm[i], h=H[i]; H[i]={f:v187sLp(h.f,A.f,lb),u:v187sLp(h.u,A.u,lb),l:v187sLp(h.l,A.l,lb)}; }
  if(T.pole) v187sLeg={v:T.pole,w:Math.min(1,lb*1.4)};
  if(p.v187t==='toe') P.hipU-=0.04*lb; /* lunging: the standing knee bends */
  if(p.v187t==='drive'&&kt>=W){ /* the follow-through carries him onto the kicking foot: the standing heel lifts */ const u=(kt-W)/Fd; F[0]={f:F[0].f,u:F[0].u+0.08*Math.sin(Math.PI*Math.min(1,u*1.3)),l:F[0].l}; } };

/* ---------- the volley (cross goals): the cross is longer by the strike's wind-up and meets the boot as it lands ---------- */
/* contact keyframes in his yaw frame (body units): C contact, B backswing, T top, ra the body's roll (+ away from the ball) */
const V187S_V={
  front:{C:{f:0.48,u:0.34,l:0.1},B:{f:-0.32,u:0.6,l:0.1},T:{f:0.72,u:0.86,l:0.04},S:{f:-0.02,u:0,l:-0.12},ra:0,ln:[-0.04,-0.08,0.06],bt:[0.5,0.95,0.7],arm:[{f:0.12,u:1.46,l:-0.72},{f:0.02,u:1.42,l:0.7}],dir:[1,0]},
  side:{C:{f:0.3,u:0.38,l:0.42},B:{f:-0.36,u:0.5,l:0.5},T:{f:0.55,u:0.72,l:0.04},S:{f:0.02,u:0,l:-0.16},ra:0.42,ln:[0,0,0.04],bt:[0.4,0.85,0.6],arm:[{f:0.1,u:1.62,l:-0.8},{f:0.25,u:1.25,l:0.55}],dir:[0.75,-0.66]}};
/* where the ball sits at contact (its underside, metres): just beyond the boot along the swing */
Stage.prototype.v187sVolBall=function(p){ const V=V187S_V[p.v187vk]; if(!V) return null; const S=v187sS(this,p), R=v187sBR(this);
  const yaw=p.v187vc!=null&&this.now>=p.v187vc&&p.v187vy!=null?p.v187vy:v187sYaw(p), c=Math.cos(yaw), s=Math.sin(yaw); const w={f:V.C.f,u:V.C.u+0.06,l:V.C.l}; /* C is already in his yaw frame */
  const off=typeof v184Off==='function'?v184Off(this,p):R+0.07; const dx=V.dir[0]*c-V.dir[1]*s, dy=V.dir[0]*s+V.dir[1]*c;
  const fx=p.x+(w.f*c-w.l*s)*S, fy=p.y+(w.f*s+w.l*c)*S; return {x:fx+dx*off,y:fy+dy*off,z:Math.max(0,Math.min(0.46,w.u*S-R))}; };
/* ms from contact: negative before it, 0 while the ball is on the boot, then ms since the release */
function v187sVTau(st,p){ if(p.v187vr!=null) return st.now-p.v187vr; return Math.min(0,st.now-p.v187vc); }
Stage.prototype.v187sVolPose=function(p,P){ const V=V187S_V[p.v187vk]; if(!V) return false; const tau=v187sVTau(this,p), Wv=Math.max(80,p.v187vw||200), Fd=this.D(340);
  if(tau<-Wv*1.7||tau>Fd) return false; const F=P.feet, H=P.hands;
  let ft, bt, ln, lb, ra;
  if(tau<0){ const s=(tau+Wv*1.7)/(Wv*1.7); lb=v187sSm(s/0.4); ra=V.ra*v187sSm(s/0.6);
    if(s<0.6){ const q=v187sSm(s/0.6); ft=v187sLP({f:0.04,u:0,l:0.08},V.B,q); bt=v187sLp(0,V.bt[0],q); ln=v187sLp(0,V.ln[0],q); }
    else { const q=(s-0.6)/0.4, e=q*q; ft=v187sLP(V.B,V.C,e); ft.u+=0.06*Math.sin(Math.PI*q); bt=v187sLp(V.bt[0],V.bt[1],e); ln=v187sLp(V.ln[0],V.ln[1],e); P.v187b=1; } }
  else if(p.v187vr==null){ ft={...V.C}; bt=V.bt[1]; ln=V.ln[1]; lb=1; ra=V.ra; P.v187b=1; }
  else { const u=tau/Fd; lb=1-v187sSm(u); ra=V.ra*(1-v187sSm(u));
    if(u<0.4){ const q=v187sSm(Math.max(0,u-V187S_HOLD)/(0.4-V187S_HOLD)); ft=v187sLP(V.C,V.T,q); bt=v187sLp(V.bt[1],V.bt[2],q); ln=v187sLp(V.ln[1],V.ln[2],q); P.v187b=1; }
    else { const q=v187sSm((u-0.4)/0.6); ft=v187sLP(V.T,{f:0.08,u:0,l:0.08},q); bt=v187sLp(V.bt[2],0,q); ln=V.ln[2]*(1-q); } }
  P.act='kick'; P.lean=ln; P.hipU=0.8-0.05*lb; P.headTilt=0.22*lb; P.headTurn=0; P.bootT=[null,bt];
  const sf=v187sLP({f:0.02,u:0,l:-0.1},V.S,lb);
  F[1]=v187sInv(ft,0,ra,0,0.8); F[0]=v187sInv(sf,0,ra,0,0.8); if(F[0].u<0) F[0].u=0;
  for(const i of [0,1]){ const A=v187sInv(V.arm[i],0,ra,0,0.8), h=H[i]; H[i]={f:v187sLp(h.f,A.f,lb),u:v187sLp(h.u,A.u,lb),l:v187sLp(h.l,A.l,lb)}; }
  if(ra) v187sTilt(this,p,P,0,ra,0,0.8); else { P.rot=0; P.pitchB=0; P.rollB=0; }
  return true; };
/* the cross to a volleyer (goal context, a cross goal finished from the feet; never with an 82 special) */
Stage.prototype.v187sVolCross=function(p,H,opt){ const G=this._v187g; if(!G||G.vol||!G.e||G.e.ty!=='cross'||H.pid!==G.e.pid||this._v186x||H.gk) return opt;
  const seq=G.e.seq||[], last=seq[seq.length-1]; if(!last||last.a!=='shot'||last.pid!==H.pid) return opt;
  const force=this._v187sForce||V187S.force; let go=force==='volley'; if(!force) go=v187sH01('v'+H.pid+'|'+(this._v187key||''))<0.35+0.4*v187sA(H); if(!go) return opt;
  const gx=H.side===0?105:0, [X,Y]=livePos(G.e.s,last.x,last.y); const gd=Math.atan2(34-Y,gx-X), id=Math.atan2(Y-p.y,X-p.x);
  /* the ball arrives across him (from the wing): side-on; from in front or behind: a front volley */
  const ac=Math.abs(v187sAd(id,gd)); const kind=force==='volley'&&V187S.vkind?V187S.vkind:(ac>0.9&&ac<2.3&&v187sA(H)>0.3?'side':'front');
  const W=this.windOf('shot'); G.vol=H; this._v187v={pl:H,e:G.e,shot:false};
  H.v187vk=kind; H.v187vw=W; H.v187vc=null; H.v187vr=null; H.v187vy=gd; const st=this; const o0=opt.onRelease;
  v187sLog({k:'volcross',kind,pid:H.pid,W});
  return {...opt,dur:opt.dur+W,onRelease(f){ if(o0) o0.apply(this,arguments); H.v187vc=f.t0+f.dur; /* he shapes up toward the goal as it comes */ H.yawLock=Math.atan2(34-Y,gx-X); H.yawLockT=H.v187vc+st.D(900); }}; };

/* ---------- 2. headers ---------- */
const V187S_HD={dive:{to:300,fa:260,li:120,up:460}};
function v187sHDur(st){ const d=ms=>st.D(ms); return {to:d(300),fa:d(260),li:d(120),up:d(460)}; }
/* ms from the header's contact (the cross arriving): negative before, 0 until the ball leaves his head, then ms since */
function v187sHTau(st,p){ if(p.v187hr!=null&&p.v187hr>=p.v187hc-5) return st.now-p.v187hr; return Math.min(0,st.now-p.v187hc); }
/* the dive, in his yaw frame at take-off: th pitch, lift, feet and hands (world terms, body units) */
function v187sDiveFrame(tau,T){ if(tau<-T.to) return null; let th, lift, f0, f1, h0, h1, tilt=0;
  if(tau<-T.to*0.45){ const q=v187sSm((tau+T.to)/(T.to*0.55)); th=0.25*q; lift=-0.1*q; f0={f:0.08,u:0,l:-0.1}; f1={f:v187sLp(0.0,-0.2,q),u:0.12*q,l:0.1}; h0={f:-0.2,u:1.0,l:-0.32}; h1={f:-0.22,u:1.0,l:0.32}; tilt=-0.2*q; }
  else if(tau<0){ const q=v187sSm((tau+T.to*0.45)/(T.to*0.45)); th=v187sLp(0.25,1.3,q); lift=v187sLp(-0.1,-0.2,q);
    f0={f:v187sLp(0.08,-0.75,q),u:v187sLp(0,0.42,q),l:-0.1}; f1={f:v187sLp(-0.2,-0.8,q),u:v187sLp(0.12,0.5,q),l:0.1};
    h0={f:v187sLp(-0.2,0.85,q),u:v187sLp(1.0,0.55,q),l:-0.3}; h1={f:v187sLp(-0.22,0.85,q),u:v187sLp(1.0,0.55,q),l:0.3}; tilt=v187sLp(-0.2,-0.55,q); }
  else if(tau<T.fa){ const q=tau/T.fa, e=q*q; th=v187sLp(1.3,1.5,v187sSm(q)); lift=v187sLp(-0.2,-0.66,e);
    f0={f:-0.8,u:v187sLp(0.42,0.08,e),l:-0.1}; f1={f:-0.85,u:v187sLp(0.5,0.1,e),l:0.1}; h0={f:v187sLp(0.85,0.6,q),u:v187sLp(0.55,0.05,e),l:-0.32}; h1={f:v187sLp(0.85,0.6,q),u:v187sLp(0.55,0.05,e),l:0.32}; tilt=v187sLp(-0.55,-0.2,q); }
  else if(tau<T.fa+T.li){ th=1.5; lift=-0.66; f0={f:-0.8,u:0.08,l:-0.1}; f1={f:-0.85,u:0.1,l:0.1}; h0={f:0.6,u:0.05,l:-0.32}; h1={f:0.6,u:0.05,l:0.32}; tilt=-0.2; }
  else { const u=Math.min(1,(tau-T.fa-T.li)/T.up);
    if(u<0.5){ const s=v187sSm(u/0.5); th=v187sLp(1.5,0.7,s); lift=v187sLp(-0.66,-0.45,s); f0={f:v187sLp(-0.8,-0.3,s),u:0.05,l:-0.12}; f1={f:v187sLp(-0.85,0.15,s),u:v187sLp(0.1,0.05,s),l:0.12}; h0={f:v187sLp(0.6,0.5,s),u:0.04,l:-0.32}; h1={f:v187sLp(0.6,0.5,s),u:0.04,l:0.32}; tilt=-0.2*(1-s); }
    else { const s=v187sSm((u-0.5)/0.5); th=0.7*(1-s); lift=-0.45*(1-s); f0={f:v187sLp(-0.3,0.02,s),u:0,l:-0.1}; f1={f:v187sLp(0.15,0.04,s),u:0.08*Math.sin(Math.PI*s),l:0.1}; h0={f:v187sLp(0.5,0.03,s),u:v187sLp(0.04,1.0,s),l:-0.3}; h1={f:v187sLp(0.5,0.03,s),u:v187sLp(0.04,1.0,s),l:0.3}; } }
  return {th,lift,feet:[f0,f1],hands:[h0,h1],tilt}; }
/* which way he dives: at the goal mouth in 3-D; in 2-D straight along the pitch (a screen rotation can only show a dive across the screen) */
function v187sDiveYaw(st,p){ const gx=p.side===0?105:0; if(!v187s3D(st)) return gx>52?0:Math.PI; return Math.atan2(34-p.y,gx-p.x); }
/* the head's contact point (ball underside, metres) in the dive at contact */
Stage.prototype.v187sDiveBall=function(p){ const T=v187sHDur(this), F=v187sDiveFrame(0,T); const S=v187sS(this,p), R=v187sBR(this);
  const hd=v187sFwd(0.02,1.83,0,F.th,0,F.lift,0.8); const ax={f:Math.sin(F.th),u:Math.cos(F.th)}; const k=0.12+R/S;
  const yaw=p.v187hl&&p.v187hy!=null?p.v187hy:v187sDiveYaw(this,p); const c=Math.cos(yaw), s=Math.sin(yaw); const x0=p.v187hl?p.v187hx:p.x, y0=p.v187hl?p.v187hz:p.y;
  const o={x:x0+c*V187S_DT*S,y:y0+s*V187S_DT*S}; const w=v187sW(o,{f:hd.f+ax.f*k,l:0,u:hd.u+ax.u*k},S,yaw); w.z=Math.max(0,w.z-R); return w; };
/* how far the body travels (body units) from the take-off spot to contact, and on to the landing */
const V187S_DT=0.75, V187S_DL=1.1;
Stage.prototype.v187sDivePose=function(p,P){ const T=v187sHDur(this), tau=v187sHTau(this,p); if(tau>T.fa+T.li+T.up) return false; const F=v187sDiveFrame(tau,T); if(!F) return false;
  const piv=0.8; P.act='v187dive'; P.hipU=0.8; P.lean=0; P.headTilt=F.tilt; P.headTurn=0; P.bootT=null; P.prop=null;
  for(const i of [0,1]){ P.feet[i]=v187sInv(F.feet[i],F.th,0,F.lift,piv); P.hands[i]=v187sInv(F.hands[i],F.th,0,F.lift,piv); }
  v187sTilt(this,p,P,F.th,0,F.lift,piv); if(tau>-T.to*0.5&&tau<T.fa*0.5) P.v187b=1; return true; };
/* the glance and the clearing nod: what the nod window (the stage's ND) does to the head, neck, shoulders and arms */
Stage.prototype.v187sNodPose=function(p,P){ const ndT=this.now-(p.nodT||-9e9), ND=Math.max(130,this.D(280)); if(ndT<0||ndT>=ND) return; const w=Math.sin(ndT/ND*Math.PI);
  if(p.v187hk==='glance'){ P.headTilt=(P.headTilt||0)-0.38*w; P.lean=(P.lean||0)-0.12*w; P.headTurn=(p.v187hs||1)*0.62*w; const s=p.v187hs||1; P.hands[s>0?1:0]={f:0.15,u:1.55,l:s*0.62}; }
  else if(p.v187hk==='clear'){ const sn=Math.sin(Math.min(1,ndT/(ND*0.6))*Math.PI); P.headTilt=(P.headTilt||0)+0.5*sn; P.lean=(P.lean||0)+0.22*sn; P.hands[0]={f:-0.32,u:1.28,l:-0.46}; P.hands[1]={f:-0.32,u:1.28,l:0.46}; } };
/* the cross to a header: choose the header (a teammate attacking it, or an opponent clearing it) */
Stage.prototype.v187sHeadCross=function(p,H,opt){ const gx=p.side===0?105:0; let kind;
  const forced=this._v187hForce||V187S.hforce; const key=H.pid+'|'+(this._v187key||'')+'|'+Math.round(this.now/1000);
  if(H.side!==p.side) kind='clear';
  else { const u=v187sH01('h'+key); const id=Math.atan2(H.y-p.y,H.x-p.x), od=Math.atan2(34-H.y,gx-H.x); const ang=Math.abs(v187sAd(od,id)); const d=Math.hypot(gx-H.x,34-H.y);
    kind=u<(d>5&&d<14?0.2:0)?'dive':u<(ang<1.4?0.72:0.36)?'glance':'power';
    if(forced==='dive'||forced==='glance'||forced==='power') kind=forced; }
  if(forced==='clear'&&H.side!==p.side) kind='clear';
  H.v187hk=kind; H.v187hc=null; H.v187hr=null; H.v187hs=1; H.v187hy=null; const st=this, o0=opt.onRelease; let o={...opt};
  if(kind==='dive'){ o.h=Math.min(o.h||0,1.3); }
  o.onRelease=function(f){ if(o0) o0.apply(this,arguments); H.v187hc=f.t0+f.dur; if(kind==='dive'){ H.jumpT=-9e9; H.v187hl=0; H.v187hy=v187sDiveYaw(st,H); H.yawLock=H.v187hy; H.yawLockT=H.v187hc+st.D(1600); } };
  v187sLog({k:'head',kind,pid:H.pid,clear:H.side!==p.side}); return o; };

/* ---------- hooks ---------- */
const _v187sKK=Stage.prototype.kickKind;
Stage.prototype.kickKind=function(p,opt){ const kk=_v187sKK.apply(this,arguments);
  if(p&&opt&&V187S.on&&!this.rm){ try{ if(kk==='shot') this.v187sShot(p,opt);
    else if(kk==='head'&&p.v187hk&&p.v187hc!=null&&Math.abs(this.now-p.v187hc)<this.D(900)+300){ const st=this, o0=opt.onRelease; let h0=null;
      if(p.v187hk==='clear'&&opt.kind==='clear'){ h0=opt.h||0; opt.h=Math.max(h0,4.9); }
      if(p.v187hk==='glance'&&opt.kind==='shot'&&!opt.hFn){ h0=opt.h||0; opt.h=Math.min(h0,0.06); }
      opt.onRelease=function(f){ p.v187hr=st.now; f.v187hd=p.v187hk; if(h0!=null) f.v187h0=h0; if(o0) return o0.apply(this,arguments); }; } }catch(e){} }
  return kk; };

const _v187sLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){
  if(!p||!opt||!V187S.on||this.rm||this.skip||this.so) return _v187sLaunch.apply(this,arguments);
  let gl=null;
  try{ const H=opt.home;
    if(H&&opt.head&&!opt.hands&&H!==p&&!H.gk&&!opt.nod) opt=this.v187sHeadCross(p,H,opt);
    else if(H&&!opt.head&&!opt.hands&&!opt.nod&&H.side===p.side&&(opt.h||0)>2) opt=this.v187sVolCross(p,H,opt);
    else if(opt.kind==='shot'&&!opt.home&&!opt.nod){ const V=this._v187v; if(V&&V.pl===p&&!V.shot){ V.shot=true; opt={...opt,wind:0};
      /* facing well away from the target he would have to turn first: no volley then, the ball drops to his feet */
      if(p.v187vk&&p.v187vr==null&&opt.to&&Math.abs(v187sAd(Math.atan2(opt.to.y-p.y,opt.to.x-p.x),v187sYaw(p)))>0.55){ p.v187vk=null; p.v187vc=null; v187sLog({k:'volcancel',pid:p.pid,turn:1}); } } }
    if(opt.nod&&p.v187hk==='glance'&&p.v187hc!=null&&opt.to) gl=opt.to; }catch(e){}
  const r=_v187sLaunch.call(this,p,opt);
  if(gl){ try{ /* the glance: he keeps facing between the cross and where he steers it, the head turned toward the target */
    const L=this.lastPass, id=L&&L.to===p?Math.atan2(p.y-L.from.y,p.x-L.from.x):v187sYaw(p), od=Math.atan2(gl.y-p.y,gl.x-p.x);
    const mid=id+v187sAd(od,id)*0.5; p.yawLock=mid; p.yawLockT=this.now+this.D(600); p.v187hs=v187sAd(od,mid)>=0?1:-1; }catch(e){} }
  return r; };

/* the goal context (the event and a hash key for the picks, so live, highlights and TV show the same finish) */
const _v187sGoal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(e){ const G=this._v187g={e,vol:null}; const k0=this._v187key; this._v187key=e?[e.m,e.pid,Array.isArray(e.sc)?e.sc.join('-'):e.sc,e.s].join(':'):'';
  try{ return await _v187sGoal.apply(this,arguments); }
  finally{ if(this._v187g===G) this._v187g=null; const V=this._v187v; if(V&&V.e===e){ this._v187v=null; if(V.pl&&V.pl.v187vr==null) V.pl.v187vk=null; } this._v187key=k0; } };
const _v187sShotSeq=Stage.prototype.shotSeq;
Stage.prototype.shotSeq=async function(e){ const k0=this._v187key; this._v187key=e?[e.m,e.pid,e.t,e.s].join(':'):'';
  try{ return await _v187sShotSeq.apply(this,arguments); } finally{ this._v187key=k0; } };

/* the volleyer's ball: on the cross's way in it homes on the contact point, and sits there until it leaves his boot */
const _v187sFoot=Stage.prototype.footOf;
Stage.prototype.footOf=function(p){ const V=this._v187v; if(V&&p&&V.pl===p&&p.v187vk&&p.v187vr==null&&V187S.on){ try{ const c=this.v187sVolBall(p); if(c) return c; }catch(e){} } return _v187sFoot.apply(this,arguments); };
/* a dribble before the volley (he was not where the cross was going) cancels it: the ball drops to his feet */
const _v187sDrib=Stage.prototype.dribble;
Stage.prototype.dribble=function(p){ const V=this._v187v; if(V&&p&&V.pl===p&&p.v187vk&&p.v187vr==null){ p.v187vk=null; p.v187vc=null; v187sLog({k:'volcancel',pid:p.pid}); } return _v187sDrib.apply(this,arguments); };
const _v187sLand=Stage.prototype.land;
Stage.prototype.land=function(){ const f=this.fl; const r=_v187sLand.apply(this,arguments);
  try{ if(f&&!f.phys&&f.home&&!f.hands&&!f.head){ f.home.v187rc=this.now; const V=this._v187v; if(V&&V.pl===f.home&&f.home.v187vk){ if(this.cush&&this.cush.p===f.home) this.cush=null; f.home.v187vy=v187sYaw(f.home); } } }catch(e){}
  return r; };

/* the dive: the header's head is the cross's target; his body travels forward and his facing holds until he is up */
const _v187sHead=Stage.prototype.headOf;
Stage.prototype.headOf=function(p){ const r=_v187sHead.apply(this,arguments); if(!p||!V187S.on||(p.v186xk&&p.v186xc!=null)) return r;
  if(p.v187hk==='dive'&&p.v187hc!=null&&!(p.v187hr!=null&&p.v187hr>=p.v187hc-5)&&this.now>=p.v187hc-this.D(2000)){ try{ return this.v187sDiveBall(p); }catch(e){} }
  r.z+=1.66*((p.hgt||70)/70-1); return r; };
const _v187sJump=Stage.prototype.jumpLift;
Stage.prototype.jumpLift=function(p){ const v=_v187sJump.apply(this,arguments); if(!v||!V187S.on||!p) return v; return v*v187sLeap(p)*v187sJK(v187sHK(this,p))*((p.hgt||70)/70); };
const _v187sUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v187sUpd.apply(this,arguments);
  { /* the volley: from the landing to the strike the ball sits exactly on the contact point (no steering lag) */ const V=this._v187v, q=V&&V.pl;
    if(q&&V187S.on&&this.own===q&&!this.fl&&!this.hands&&q.v187vk&&q.v187vc!=null&&q.v187vr==null&&this.now>=q.v187vc){ if(q.v187vy!=null){ q.yaw=q.v187vy; q.face=Math.cos(q.yaw)>=0?1:-1; } const c=this.v187sVolBall(q); if(c){ this.ball.x=c.x; this.ball.y=c.y; this.ball.z=c.z; } } }
  if(V187S.on&&!this.rm) for(const p of this.players.values()){ if(p.v187hk!=='dive'||p.v187hc==null||p.v187hy==null) continue; const T=v187sHDur(this), tau=v187sHTau(this,p);
    if(tau<-T.to*0.45||tau>T.fa+T.li+T.up||p.celeb) continue; const S=v187sS(this,p); if(!p.v187hl){ p.v187hl=1; p.v187hx=p.x; p.v187hz=p.y; p.v187hy=v187sDiveYaw(this,p); }
    const q=tau<0?v187sSm((tau+T.to*0.45)/(T.to*0.45))*V187S_DT:V187S_DT+(V187S_DL-V187S_DT)*v187sSm(Math.min(1,tau/T.fa));
    const c=Math.cos(p.v187hy), s=Math.sin(p.v187hy); p.x=p.v187hx+c*q*S; p.y=p.v187hz+s*q*S; p.vx=0; p.vy=0; p.yaw=p.v187hy; p.face=c>=0?1:-1; if(p.ov&&!p.celeb) p.ov={x:p.x,y:p.y}; }
  return r; };

const _v187sPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v187sPose.apply(this,arguments); v187sLeg=null;
  if(isRef||!p||!P||!P.feet||!P.feet[0]||!P.feet[1]||!P.hands||!P.hands[0]||!P.hands[1]||this.rm||!V187S.on||p.celeb) return P;
  try{
    if(p.v187vk&&p.v187vc!=null&&this.v187sVolPose(p,P)) return P;
    if(p.v187hk==='dive'&&p.v187hc!=null&&p.v187hy!=null&&this.v187sDivePose(p,P)) return P;
    if(P.act==='kick'&&p.kickK==='shot'&&p.v187t&&V187S_K[p.v187t]&&p.kickT>=p.v187tT&&p.kickT-p.v187tT<4000) this.v187sKickPose(p,P);
    if(P.act==='head'){ const jt=this.now-(p.jumpT||-9e9), JD=Math.max(260,this.D(560)); if(jt>=0&&jt<JD){ const k=v187sLeap(p)*v187sJK(v187sHK(this,p)); P.lift=(P.lift||0)*k; } }
    const hk=v187sHK(this,p); if(hk==='glance'||hk==='clear') this.v187sNodPose(p,P);
  }catch(e){ if(!this._v187err){ this._v187err=1; if(typeof console!=='undefined') console.warn('v18.7 shots pose',e); } }
  return P; };
/* the strike's downswing, contact and early follow-through are drawn crisp (no easing toward the pose), so foot meets ball */
const _v187sBlend=Stage.prototype.blendPose;
Stage.prototype.blendPose=function(p,P){ const Q=_v187sBlend.apply(this,arguments); if(!P||!P.v187b||this.rm) return Q; p._pose=P; return P; };

/* the drawn curl (55): the outside of the boot bends it toward his kicking side, the side-foot gently the other way; a chip
   and a toe-poke fly straight */
if(typeof Stage.prototype.v17curl==='function'){ const _v187sCurl=Stage.prototype.v17curl;
  Stage.prototype.v17curl=function(){ const f=this.fl; if(f&&!f.phys&&f.v187s&&!f.home&&this._v17cf!==f&&V187S.on&&!this.rm){ /* goals and misses only: a shot into the keeper's hands keeps the old flight */ const t=f.v187s; const tg=f.aim||this.flightTarget(f);
      if(tg){ const dx=tg.x-f.from.x, dy=tg.y-f.from.y, d=Math.hypot(dx,dy)||1; let amt=0, sg=1;
        if(t==='outside'){ amt=Math.min(1.6,d*0.075); sg=1; } else if(t==='place'){ amt=Math.min(0.7,d*0.035); sg=-1; } else if(t==='drive'||t==='volley'){ amt=Math.min(0.5,d*0.02); sg=v17h01(Math.round(f.t0)+'d')<0.5?-1:1; }
        this._v17cf=f; this._v17c=amt>0.05?{nx:-dy/d*sg*amt,ny:dx/d*sg*amt}:null; } }
    return _v187sCurl.apply(this,arguments); }; }
const _v187sFlC=Stage.prototype.flC;
Stage.prototype.flC=function(f){ if(f&&f.v187s&&!f.home&&V187S_C[f.v187s]!=null&&V187S.on&&!this._v187nf) return V187S_C[f.v187s]; return _v187sFlC.apply(this,arguments); };
/* the ball goes on from the target (into the net, off the frame, bouncing on) exactly as before: the old pace and arc */
const _v187sFlVel=Stage.prototype.flVel;
Stage.prototype.flVel=function(f){ if(!f||(f.v187s==null&&f.v187h0==null)) return _v187sFlVel.apply(this,arguments); const h=f.h; this._v187nf=1; if(f.v187h0!=null) f.h=f.v187h0;
  try{ return _v187sFlVel.apply(this,arguments); } finally{ f.h=h; this._v187nf=0; } };

/* commentary: a word on the technique for goals */
const V187S_SAY={drive:'Driven in with the laces!',place:'Side-footed, picking his spot.',chip:'A delicate chip!',toe:'Toe-poked home!',outside:'Bent in with the outside of the boot!',volley:'Struck first time on the volley!',dive:'A brave diving header!',glance:'A glancing header!'};
if(typeof feedPush==='function'){ const _v187sFeed=feedPush;
  feedPush=function(e,quiet){ const r=_v187sFeed.apply(this,arguments);
    try{ const L=typeof App!=='undefined'&&App.live, st=L&&L.stage; if(!quiet&&V187S.on&&st&&e&&e.t==='goal'&&L.feed&&L.feed[0]&&L.feed[0].cls==='goal'&&!L.feed[0].v187&&!(st._v186x&&st._v186x.struck)){ const p=st.pl(e.pid);
      const k=p&&(p.v187hk&&p.v187hr!=null&&st.now-p.v187hr<3000&&(p.v187hk==='dive'||p.v187hk==='glance')?p.v187hk:p.v187t&&st.now-(p.v187tT||-9e9)<4000?p.v187t:null);
      if(k&&V187S_SAY[k]&&(k!=='drive'||v187sH01('say'+e.pid+e.m)<0.4)){ L.feed[0].v187=1; L.feed[0].txt+=' '+V187S_SAY[k]; } } }catch(err){}
    return r; }; }

/* ---------- the lab: every technique and header in turn (forced) ---------- */
const V187S_LAB={shots:['drive','place','chip','toe','outside','volley'],headers:['dive','glance','power','clear']};
LAB_SCENES.push(['shots','Shot techniques (each forced)'],['headers','Header variety (each forced)']);
const _v187sLabRun=labRun;
labRun=function(scen){ const r=_v187sLabRun.apply(this,arguments); if(!V187S_LAB[scen]) return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    const A=[...st.players.values()].filter(p=>p.side===0); const fw=A[9], wing=A[8], mid=A[7]; const L=V187S_LAB[scen]; let i=0;
    const only=window.__v187only; const SP={drive:[50,72],place:[40,86],chip:[56,80],toe:[50,95],outside:[30,82]};
    if(scen==='shots') for(const q of st.players.values()) if(q!==fw&&q!==wing&&!q.gk) q.off=true; /* a clear view of the striker */
    while(alive()){ const k=only||L[i%L.length]; const top=(i++>>1)%2===0; st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=90;
      if(scen==='shots'){ st._v187sForce=k; st._v187hForce=null;
        if(k==='volley'){ const e={s:0,pid:fw.pid,t:'goal',ty:'cross',seq:[{pid:wing.pid,x:top?10:90,y:84,a:'cross'},{pid:fw.pid,x:top?44:56,y:88,a:'shot'}],sc:[1,0],m:10+i};
          st.clipStart(e); { const [X,Y]=livePos(0,e.seq[1].x,e.seq[1].y); fw.x=fw.tx=X-5; fw.y=fw.ty=Y; fw.vx=fw.vy=0; fw.yaw=0; fw.face=1; } await st.goalSequence(e); }
        else { const [x,y]=SP[k]; const e={s:0,pid:fw.pid,t:'goal',ty:'open',seq:[{pid:fw.pid,x,y,a:'shot'}],sc:[1,0],m:10+i}; await st.gain(fw); if(!alive()) return; const [X,Y]=livePos(0,x,y); fw.x=X-6; fw.y=Y; await st.goalSequence(e); } }
      else { st._v187hForce=k; st._v187sForce=null;
        if(k==='clear'){ st.cam.x=95; await st.cornerKick(0,top?1:-1); }
        else { const e={s:0,pid:fw.pid,t:'goal',ty:'header',seq:[{pid:wing.pid,x:top?10:90,y:84,a:'cross'},{pid:fw.pid,x:top?46:54,y:k==='dive'?90:93,a:'shot'}],sc:[1,0],m:10+i}; st.clipStart(e); await st.goalSequence(e); } }
      if(!alive()) return; await st.wait(st.D(700)); } }); };
