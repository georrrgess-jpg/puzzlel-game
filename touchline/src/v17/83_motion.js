/* ===================== v18.7 A1: motion (83) =====================
   Presentation only: a gait / poseOf layer. Positions, speeds, the stride cadence (p.ph, which also times v18.4's dribble
   touches), event timing and results are unchanged; engine.js is untouched. Both renderers read the same pose.
   1. Running style. The gait's foot sweep L (so a planted foot still travels back at exactly the body's speed), the hip height,
      the bounce, the forward lean and the arm pump scale with the player's pace rating (v18.6's p.v186r_pace, absolute 25..95)
      and a little with his position (strikers and wingers lower, centre-backs more upright), and with how hard he runs (nothing
      at a walk, full from about 7 m/s): a fast player runs longer and lower with a bigger arm drive, a slow one shorter, higher
      and more upright. Players without ratings (the lab, the menu demo) run as before.
   2. Fatigue. From the 60th minute (of 80) to the 78th players tire: shorter stride, more upright and heavier (the hips sink, less
      flight, the head drops), a lower and smaller arm swing; standing, they slump a little and breathe harder. The engine's stamina
      (sk.sta, read once per setSides into p.v187m_sta) cuts it by up to 60 %; keepers tire least. The minute is App.live's for
      the live stage (else the last playMinute's), 0 elsewhere unless forced (V187M.minF, st.v187mMinF).
   3. Hands on knees. In a dead-ball moment (a held or placed ball, a set piece, a kick-off to come, a goal, a card, a raised flag)
      late in the game, a tired player standing idle sometimes steps his feet apart and bends over with his hands on his knees
      (chosen once per stoppage per player with a cosmetic hash; more likely the more tired he is); he straightens as soon as he
      moves or play goes on.
   4. Planted feet. A defender sold, frozen or turned by a skill move (81) no longer slides: a foot on the turf is pinned to its
      world spot (stored when it plants, turned back into body coordinates every frame); it steps (lifted, D(150)) when the pose
      lifts it, when the body has moved too far from it, or when it would cross under the other leg.
   5. Kick balance arm. The arm opposite the kicking leg no longer shoots out straight sideways: its hand is held 0.556 body units
      from the shoulder (the elbow bent about 38 degrees; the bend depends only on that distance, so it is the same in 2-D and 3-D),
      out to the side, forward and a little below the shoulder.
   Switches: V187M.style / tired / knees / pin / arm. Globals are prefixed v187m / V187M. */
const V187M={on:true,style:true,tired:true,knees:true,pin:true,arm:true,minF:null,err:null};
const V187M_B={lean:.9,average:1,stocky:1.14};
function v187mErr(e){ if(V187M.err) return; V187M.err=String(e&&e.stack||e); try{ console.error('v18.7 motion: '+V187M.err); }catch(x){} }

/* ---------- stamina, beside the v18.6 ratings (a primitive field, so replays copy it) ---------- */
const _v187mSides=Stage.prototype.setSides;
Stage.prototype.setSides=function(){ const r=_v187mSides.apply(this,arguments);
  try{ for(const p of this.players.values()){ let info=null; try{ if(typeof Px==='function'&&typeof App!=='undefined'&&App&&App.C&&!this.demo) info=Px(p.pid); }catch(e){ info=null; }
    const s=info&&info.sk?info.sk.sta:null; p.v187m_sta=s==null?null:Math.round(clamp(s,5,99)); } }catch(e){ v187mErr(e); }
  return r; };

/* ---------- the match minute ---------- */
const _v187mPM=Stage.prototype.playMinute;
Stage.prototype.playMinute=function(out,M,W){ if(M&&typeof M.min==='number') this.v187mMin=M.min; return _v187mPM.apply(this,arguments); };
function v187mMinute(st){ if(V187M.minF!=null) return V187M.minF; if(st.v187mMinF!=null) return st.v187mMinF;
  try{ const L=typeof App!=='undefined'&&App?App.live:null; if(L&&L.stage===st&&L.M&&typeof L.M.min==='number') return L.M.min; }catch(e){}
  return st.v187mMin||0; }

/* fatigue 0..1 */
function v187mTired(st,p){ if(!V187M.tired||!p||p.ar||st.demo) return 0; const m=v187mMinute(st); if(!(m>60)) return 0;
  const s=p.v187m_sta, a=s==null?0.5:clamp((s-25)/70,0,1); return smooth((m-60)/18)*(1-0.6*a)*(p.gk?0.35:1); }
/* running style -1 (slow, upright, short) .. 1 (fast, low, long); 0 without ratings */
function v187mStyle(st,p){ if(!V187M.style||!p||p.v186r_pace==null||p.gk) return 0; let z=(clamp((p.v186r_pace-25)/70,0,1)-0.5)*2;
  const r=p.slot&&p.slot.role; if(r==='ST'||r==='LW'||r==='RW') z+=0.12; else if(r==='CB') z-=0.12; return clamp(z,-1,1); }
/* gait speed (m/s, as poseOf) and how hard he runs: 0 at a jog of 2.2 m/s, 1 from 7 m/s */
function v187mRun(st,p){ const real=(p.spd||0)/Math.max(1,st.spdMul||1); const v=Math.min(9,p.gv!=null?p.gv:real); return [v,smooth((v-2.2)/4.8)]; }
/* [stride factor, swing-height factor] for the gait */
function v187mStrideK(st,p,sty,tf){ if(!sty&&!tf) return null; const r=v187mRun(st,p)[1]; return [(1+0.1*sty*r)*(1-0.15*tf*Math.max(r,0.35)),1-0.3*tf]; }

/* ---------- the gait: stride and swing factors of the figure whose pose is being solved (set only around poseOf and 81's duty) ---------- */
let V187M_G=null;
const _v187mGait=gaitOf;
gaitOf=function(v,sp){ const G=_v187mGait(v,sp); const k=V187M_G; if(k){ G.L*=k[0]; G.h*=k[1]; } return G; };
/* 81's duty factor (it plans a skill move's plants on the stride) sees the same stride as the pose */
if(typeof v186sDuty==='function'){ const _v187mDuty=v186sDuty;
  v186sDuty=function(st,p){ const o=V187M_G; try{ if(V187M.on&&p&&!st.rm) V187M_G=v187mStrideK(st,p,v187mStyle(st,p),v187mTired(st,p)); return _v187mDuty.apply(this,arguments); } finally{ V187M_G=o; } }; }

/* ---------- the pose layer (outermost poseOf wrapper) ---------- */
const _v187mPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){
  if(isRef||!V187M.on||!p||this.rm) return _v187mPose.apply(this,arguments);
  let sty=0, tf=0; try{ sty=v187mStyle(this,p); tf=v187mTired(this,p); }catch(e){ v187mErr(e); }
  const o=V187M_G; V187M_G=v187mStrideK(this,p,sty,tf); let P;
  try{ P=_v187mPose.apply(this,arguments); } finally{ V187M_G=o; }
  if(!P||!P.feet||!P.hands||!P.feet[0]||!P.feet[1]||!P.hands[0]||!P.hands[1]) return P;
  try{ v187mBody(this,p,P,sty,tf); if(V187M.pin) v187mPin(this,p,P); if(V187M.knees) v187mKnees(this,p,P,tf); if(V187M.arm) v187mArm(this,p,P); }catch(e){ v187mErr(e); }
  return P; };

/* 1 + 2: lean, hips, bounce, arms and head of a running (or standing) player */
function v187mBody(st,p,P,sty,tf){ if(!sty&&!tf) return; if(P.v186rw!=null) return; /* a skill move or a reaction owns the body */
  const Q=st._rp; if(Q&&Q.two&&Q.cam==='eyes'&&Q.sc===p) return; /* the first-person replay camera sits in his head */
  if(P.act==='loco'){ const [v,r]=v187mRun(st,p), rt=Math.max(r,0.35), zp=Math.max(0,sty);
    P.lean+=0.05*sty*r-0.045*tf*rt; P.hipU-=0.035*zp*r+0.03*tf;
    const l0=P.lift||0; P.lift=l0*(1-0.3*zp*r)*(1-0.45*tf); for(const F of P.feet) if(F.u<=0) F.u+=l0-P.lift; /* planted feet stay on the turf */
    P.headTilt=(P.headTilt||0)+0.1*tf;
    const aK=Math.max(0.35,(1+0.28*sty*r)*(1-0.5*tf)), u0=1.06+0.016*v;
    for(let i=0;i<2;i++){ const h=P.hands[i]; P.hands[i]={f:0.04+(h.f-0.04)*aK,u:u0+(h.u-u0)*aK+0.03*sty*r-0.07*tf,l:h.l}; } }
  else if(P.act==='idle'&&tf>0){ const br=Math.sin(st.now/330+(p.seed||0)*3);
    P.lean+=tf*(0.035+0.022*br); P.headTilt=(P.headTilt||0)+0.06*tf; P.hipU-=0.012*tf; for(let i=0;i<2;i++){ const h=P.hands[i]; P.hands[i]={f:h.f,u:h.u-0.03*tf,l:h.l}; } } }

/* 4: planted feet of a sold / frozen / turned defender stay on the turf */
function v187mPin(st,p,P){ const now=st.now;
  const on=p.v186rT!=null&&now-p.v186rT>=0&&now-p.v186rT<(p.v186rd||420)&&P.v186rw!=null&&!p.v186k&&(p.v186rk==='sold'||p.v186rk==='freeze'||p.v186rk==='turned');
  if(p.v187mPt!=null&&(now<p.v187mPt-1||now-p.v187mPt>300)){ p.v187mM0=0; p.v187mM1=0; } /* a jump in time (replay, off screen): start again */
  p.v187mPt=now; if(!on&&!p.v187mM0&&!p.v187mM1) return;
  const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw), hs=(v184Is3D(st)?0.92:1.06)*(p.hgt||70)/70;
  const SD=Math.max(90,st.D(150)), lift=P.lift||0;
  for(let i=0;i<2;i++){ const T=P.feet[i], sd=i?1:-1, K='v187m'+i; let m=p['v187mM'+i]||0;
    const wx=p.x+(T.f*ca-T.l*sa)*hs, wy=p.y+(T.f*sa+T.l*ca)*hs;
    if(m===1){ const B=v184Body(p,p[K+'x'],p[K+'y'],st);
      if(!on||T.u>0.03||Math.hypot(B[0],P.hipU-0.06,B[1]-sd*0.09)>0.83||B[1]*sd<-0.02||Math.hypot(B[0]-T.f,B[1]-T.l)>0.42){ m=2; p[K+'s']=now; } /* lifted, out of the leg's reach (0.86), crossing, or far off the pose */
      else P.feet[i]={f:B[0],u:T.u<=0?T.u:-lift,l:B[1]}; }
    if(m===2){ const s=(now-p[K+'s'])/SD;
      if(s>=1){ if(on&&T.u<=0.002){ m=1; p[K+'x']=wx; p[K+'y']=wy; } else m=0; }
      else { const e=smooth(s); const B=v184Body(p,lerp(p[K+'x'],wx,e),lerp(p[K+'y'],wy,e),st); P.feet[i]={f:B[0],u:Math.max(T.u,0)+0.06*Math.sin(Math.PI*s),l:B[1]}; } }
    else if(m===0&&on&&T.u<=0.002){ m=1; p[K+'x']=wx; p[K+'y']=wy; }
    p['v187mM'+i]=m; } }

/* 3: hands on knees at a late stoppage */
function v187mDead(st){ if(st.so||st.clip||st.demo) return false; const now=st.now;
  return !!(st.hands||st.placed||st.setPiece||st.pendingKick||st.inNet||(st.ref&&st.ref.card)||(st.ars&&st.ars.some(a=>a&&a.flag&&now-(a.flagT||0)<3000))); }
/* the knee of leg sd for hip height hu and foot F (the painters' leg solve) */
function v187mKneeOf(hu,F,sd,B){ const t=[F.f,F.u+0.06,F.l]; return ik3([0,hu,sd*0.09*B],t,0.43,0.43,v186LegPole(t[0],t[1],sd)).j; }
function v187mKnees(st,p,P,tf){ const now=st.now;
  if(st.v187mDt!==now){ st.v187mDt=now; if(v187mDead(st)){ if(st.v187mD0==null) st.v187mD0=now; st.v187mDl=now; } else if(st.v187mD0!=null&&now-st.v187mDl>Math.max(150,st.D(400))) st.v187mD0=null; }
  const idle=P.act==='idle', loco=P.act==='loco';
  if(idle){ if(p.v187mKi==null) p.v187mKi=now; } else p.v187mKi=null;
  let want=false; const key=st.v187mD0;
  if(key!=null&&tf>0.2&&!p.gk&&!p.off&&!p.celeb&&!p.sad&&!p.hipsHands&&p!==st.own&&p.v187mKi!=null){
    if(p.v187mKs!==key){ p.v187mKs=key; p.v187mKy=(hashStr(p.pid+':'+Math.round(key))%1000)/1000<0.42*tf?1:0; }
    want=!!p.v187mKy&&now-key>st.D(500)&&now-p.v187mKi>st.D(450); }
  const dt=p.v187mKt==null?0:clamp(now-p.v187mKt,0,100); p.v187mKt=now; let w=p.v187mKw||0;
  w=want?Math.min(1,w+dt/Math.max(220,st.D(800))):Math.max(0,w-dt/Math.max(120,st.D(260))); p.v187mKw=w;
  if(!(w>0)||!(idle||loco)) return;
  const B=V187M_B[(p.look||{}).build]||1, is3=v184Is3D(st);
  /* the bent-over stance: feet a little apart and ahead of the hips, hips down, back bent until the straight arms reach the knees */
  const sF=is3?0.17:0.22, sL=0.15, HU=is3?0.66:0.76;
  const b=smooth((w-0.3)/0.7);
  if(idle){ P.act='knees'; P.lift=0; P.rot=0;
    for(let i=0;i<2;i++){ const s=i?smooth((w-0.22)/0.45):smooth(w/0.45), F0=P.feet[i]; P.feet[i]={f:lerp(F0.f,sF,s),u:Math.max(0,F0.u)+(s>0&&s<1?0.05*Math.sin(Math.PI*s):0),l:lerp(F0.l,(i?1:-1)*sL,s)}; } }
  const hu=lerp(P.hipU,HU,b); P.hipU=hu;
  /* the hands rest on top of the thighs just above the knees of the full stance; the lean puts the shoulders an arm (0.57) from them */
  const Tt=is3?0.7:1.5-HU; let th=0; const H=[null,null];
  for(let i=0;i<2;i++){ const sd=i?1:-1; const kn=v187mKneeOf(HU,{f:sF,u:0,l:sd*sL},sd,B); H[i]=[lerp(0,kn[0],0.88),lerp(HU,kn[1],0.88)+0.075,kn[2]*0.95]; }
  { const a=H[1][0], bb=H[1][1]-HU, dl=0.21*B-Math.abs(H[1][2]), R2=0.57*0.57-dl*dl, rho=Math.hypot(a,bb); const c=(Tt*Tt+rho*rho-R2)/(2*Tt);
    th=clamp(Math.asin(clamp(c/rho,-1,1))-Math.atan2(bb,a),0.3,1.15); } /* 2-D: its torso stays at standing height and its shorts upright, so less bend and the hands just above the knees */
  const br=Math.sin(now/330+(p.seed||0)*3);
  P.lean=lerp(P.lean,th+0.025*br,b); P.headTilt=lerp(P.headTilt||0,-0.22,b);
  /* hand targets: 2-D leaves points below the hips where they are; 3-D carries them on the hips (u - (hipU - 0.8)) */
  const du=is3?hu-0.8:0; const bh=smooth((w-0.35)/0.65);
  for(let i=0;i<2;i++){ const h=P.hands[i]; P.hands[i]={f:lerp(h.f,H[i][0],bh),u:lerp(h.u,H[i][1]-du,bh),l:lerp(h.l,H[i][2],bh)}; }
  P.v187mK=w; }

/* 5: the kick's balance arm: bent at the elbow, forward and down instead of straight out to the side */
function v187mArm(st,p,P){ if(P.act!=='kick') return; const kk=p.kickK; if(!kk||kk==='head'||kk==='throw'||kk==='punt'||p.v186xk) return;
  const kt=st.now-(p.kickT||-9e9), W=p.kickW||0, Fd=p.kickF||260; if(kt<0||kt>=W+Fd) return;
  /* on the stage clock, a little ahead of the base pose's balance weight so that blendPose's smoothing has caught up by contact */
  const h=P.hands[0]; const w=kt<W?smooth(kt/Math.max(1,0.62*W)):1-smooth(((kt-W)/Fd-0.25)/0.75); if(!(w>0)) return;
  const B=V187M_B[(p.look||{}).build]||1; const df=0.35, du=-0.2, dl=-0.4, n=0.556/Math.hypot(df,du,dl);
  P.hands[0]={f:lerp(h.f,df*n,w),u:lerp(h.u,1.5+du*n,w),l:lerp(h.l,-0.21*B+dl*n,w)}; P.v187mA=w; }
/* blendPose eases every joint toward a new act over ~70 ms, which would leave the balance hand short of its target at contact: the
   blended hand is pulled onto the pose's by the same weight (continuous: none at the start of the kick, all of it while the arm is out) */
const _v187mBlend=Stage.prototype.blendPose;
Stage.prototype.blendPose=function(p,P){ const Q=_v187mBlend.apply(this,arguments); const w=P&&P.v187mA; if(!(w>0)||!Q||Q===P||!Q.hands||!Q.hands[0]||!P.hands[0]) return Q;
  const a=Q.hands[0], b=P.hands[0]; Q.hands=[{f:lerp(a.f,b.f,w),u:lerp(a.u,b.u,w),l:lerp(a.l,b.l,w)},Q.hands[1]]; return Q; };

/* ---------- lab: 'motion' - pace 95 beside pace 45 at the same speed, early and late; a late stoppage; a shot ---------- */
LAB_SCENES.push(['motion','Running styles, fatigue, hands on knees']);
const _v187mLabRun=labRun;
labRun=function(scen){ const r=_v187mLabRun.apply(this,arguments); if(scen!=='motion') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    const P=[...st.players.values()]; const A=P.filter(q=>q.side===0), Bs=P.filter(q=>q.side===1); const fast=A[9], slow=A[8], fw=A[10];
    for(const q of P){ q.v186r_pace=60; q.v187m_sta=60; } fast.v186r_pace=95; slow.v186r_pace=45; fast.v187m_sta=45; slow.v187m_sta=45;
    let n=0;
    while(alive()){ const late=n%2===1; n++; st.v187mMinF=late?78:10; labLog(late?"78': tired (stamina 45)":"10': fresh · pace 95 (top) vs pace 45 (bottom), same speed");
      st.zoomTo(0.42); st.focus=null; st.own=null; st.hands=false; st.placed=false; st.setPiece=null;
      for(const q of P){ if(q!==fast&&q!==slow&&!q.gk) q.ov={x:q.side===0?20+q.slot.y*0.15:88-q.slot.y*0.1,y:q.slot.y*0.68}; }
      fast.x=30; fast.y=30; slow.x=30; slow.y=36; fast.ov={x:30.2,y:30}; slow.ov={x:30.2,y:36}; st.cam.x=40; await st.wait(st.D(600)); if(!alive()) return;
      fast.ov={x:75,y:30}; slow.ov={x:75,y:36}; fast.hurry=slow.hurry=true; st.focus={x:52};
      await st.until(()=>fast.x>72&&slow.x>72,st.D(9000)); fast.hurry=slow.hurry=false; if(!alive()) return;
      if(late){ /* a late free kick: idle players catch their breath */ for(const q of P) if(!q.gk) q.ov={x:q.x,y:q.y}; st.setPiece='fk'; st.focus={x:66}; await st.wait(st.D(3600)); st.setPiece=null; if(!alive()) return; }
      await st.gain(fw); if(!alive()) return; fw.x=80; fw.y=34; await st.dribble(fw,86,33,700); if(!alive()) return;
      await st.shotSeq({s:0,pid:fw.pid,t:'miss',x:30,y:84}); await st.wait(st.D(900)); for(const q of P) q.ov=null; }
    st.v187mMinF=null; }); };
