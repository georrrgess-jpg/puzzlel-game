/* ===================== v18.6 A: ratings you can see =====================
   Presentation only. The engine already turns rating gaps into results; until now the stage read no ratings at all, so a 99
   forward and a 50 defender ran, touched, duelled and shot the same way. This module reads each player's ratings once per
   setSides and lets the gap show on the stage:
   - R1 pace: an urgent run (chase, set target, the carrier, the presser) is up to 12 % faster or slower than the median of
     the 22 on the pitch; eta() is scaled the same way so every timeout still fits the run;
   - R2 take-ons (minimal fallback feint, switchable: V186R.feint): a carrier facing a goal-side defender within 6 m drops a
     shoulder; a better dribbler (ball control minus the defender's tackling) beats him more often: a beaten defender bites
     (a stab of the leg, hips turned) and is slowed for a moment; a defender who holds makes the carrier check back. The
     carrier always keeps the ball (the engine's touch list says so);
   - R4 first touch: a footed reception by a poor controller runs up to 0.9 m further off his foot and he steps onto it;
   - R6 defender reaction: when the carrier cuts sharply, a poor tackler pressing him is caught flat-footed for a moment;
     a good one closes a little faster.
   R5 (shot technique on misses) is in 79_realism.js with the close-range miss fix.
   Ratings live on each mover as primitive fields p.v186r_pace/ctrl/fin/tkl/str/kp (5-99), so replays copy them and a test
   can override them. A player with no record (the Lab, the menu demo) is neutral: none of the effects apply to him.
   Event timing, results and event order are untouched. */

const V186R={on:true,feint:true,setMiss:true,log:{off:[],thr:[],miss:[],feint:[],ft:[]}};
const V186R_K=['pace','ctrl','fin','tkl','str','kp'];
function v186rLog(k,o){ const L=V186R.log[k]; if(!L) return; L.push(o); if(L.length>400) L.shift(); }

/* raw ratings from a player record (sk 5-99, tr 0-10 editor traits, h in inches, aggr 5-99) */
function v186rRaw(info){ if(!info||!info.sk) return null; const sk=info.sk, tr=info.tr||{};
  const hf=info.h&&typeof hF==='function'?hF(info):60;
  return {pace:sk.spd||50, ctrl:0.5*(sk.pas||50)+0.3*(sk.spd||50)+0.2*(sk.sho||50)+1.5*(tr.assist||0), fin:(sk.sho||50)+2*(tr.score||0),
    tkl:(sk.def||50)+2*(tr.defend||0), str:0.6*hf+0.4*(info.aggr||50), kp:(sk.gk||30)+2*(tr.stop||0)}; }

function v186rFill(st){ const vals={}; for(const k of V186R_K) vals[k]=[];
  for(const p of st.players.values()){ let info=null;
    try{ if(typeof Px==='function'&&typeof App!=='undefined'&&App&&App.C&&!st.demo) info=Px(p.pid); }catch(e){ info=null; }
    const r=v186rRaw(info); for(const k of V186R_K){ if(r){ p['v186r_'+k]=Math.round(clamp(r[k],5,99)); vals[k].push(p['v186r_'+k]); } else p['v186r_'+k]=null; } }
  const med={}; for(const k of V186R_K){ const a=vals[k].sort((x,y)=>x-y); med[k]=a.length?a[a.length>>1]:60; } st._v186rMed=med; }

const v186rSetSides=Stage.prototype.setSides;
Stage.prototype.setSides=function(){ const r=v186rSetSides.apply(this,arguments); try{ v186rFill(this); }catch(e){} return r; };

/* does this mover carry ratings? */
function v186rHas(p){ return !!p&&p.v186r_pace!=null; }
/* relative score against the median of the 22: -1..1 */
function v186rZ(st,p,k){ const v=p&&p['v186r_'+k]; if(v==null) return 0; const m=st._v186rMed&&st._v186rMed[k]; return clamp((v-(m==null?60:m))/25,-1,1); }
/* absolute score: 0 (25 or lower) .. 1 (95 or higher); neutral 0.5 */
function v186rA(st,p,k){ const v=p&&p['v186r_'+k]; return v==null?0.5:clamp((v-25)/70,0,1); }
/* everything at once, for other units and tests */
function v186rRat(st,p){ const o={has:v186rHas(p)}; for(const k of V186R_K){ o[k]=p&&p['v186r_'+k]!=null?p['v186r_'+k]:60; o['z'+k]=v186rZ(st,p,k); o['a'+k]=v186rA(st,p,k); } return o; }
/* a take-on: ball control against tackling; beat with probability logistic(gap/10) */
function v186rDuel(st,att,def){ const g=(att&&att.v186r_ctrl!=null?att.v186r_ctrl:60)-(def&&def.v186r_tkl!=null?def.v186r_tkl:60);
  return {gap:g, pTry:clamp(0.25+g/80,0.1,0.7), pBeat:1/(1+Math.exp(-g/10))}; }

/* the stage is in live open play (not a shootout, a set piece, a highlight clip or the menu demo) */
function v186rLive(st){ return V186R.on&&!st.so&&!st.setPiece&&!st.clip&&!st.demo&&!st.skip; }

/* R1 + R6: the speed factor for one mover this frame */
function v186rK(st,p,urgent){ if(!urgent||!v186rLive(st)||p.ref||p.ar||p.gk||p.celeb||p.glide||p.offRun||p.off||!v186rHas(p)) return 1;
  if(st.placed&&st.own===p) return 1; const now=st.now;
  let k=1+0.12*v186rZ(st,p,'pace');
  if(p===st._v186rPres){ k*=1+0.06*v186rZ(st,p,'tkl'); const C=st._v186rCut; if(C&&now-C.t<Math.max(90,st.D(300))) k*=0.55+0.45*v186rA(st,p,'tkl'); }
  const bT=p.v186bT; if(bT!=null&&now-bT>=0&&now-bT<(p.v186bD||0)) k*=0.35;
  return k; }

const v186rWant=Stage.prototype.v17want;
Stage.prototype.v17want=function(p,v,d,sp,urgent){ const k=v186rK(this,p,urgent); if(k===1) return v186rWant.apply(this,arguments);
  return v186rWant.call(this,p,v*k,d,sp,urgent); };

/* eta (a timeout budget) follows the same factor, so a slower runner is never cut short */
const v186rEta=Stage.prototype.eta;
Stage.prototype.eta=function(p,x,y,mult){ const t=v186rEta.apply(this,arguments); if(!p||!v186rHas(p)||!v186rLive(this)) return t;
  const k=1+0.12*v186rZ(this,p,'pace'); return k>=1?t:(t-250)/k+250; };

/* per frame, before the steering: who presses the carrier, and did the carrier just cut sharply? */
function v186rPre(st){ const o=st.own&&!st.hands?st.own:null; st._v186rPres=null;
  if(!o||!v186rLive(st)||st.demoCalm){ st._v186rYH=null; return; }
  st._v186rPres=st.nearest(1-o.side,st.ball.x,st.ball.y);
  const now=st.now, y=st.yawOf(o); let H=st._v186rYH; if(!H||H.p!==o){ H=st._v186rYH={p:o,q:[]}; }
  H.q.push([now,y]); const win=Math.max(80,st.D(250)); while(H.q.length>2&&now-H.q[0][0]>win) H.q.shift();
  const y0=H.q[0][1]; if(Math.abs(Math.atan2(Math.sin(y-y0),Math.cos(y-y0)))>0.8&&(!st._v186rCut||now-st._v186rCut.t>Math.max(90,st.D(300)))){ st._v186rCut={t:now,p:o}; H.q=[[now,y]]; } }

/* R4: after the frame, a heavy first touch keeps the ball running on from the foot for a moment */
function v186rPost(st,dt){ const o=st.own; if(!o||st.fl||st.hands||st.placed||st.headBall===o||o.v186ftT==null) return;
  if(o.plant||(o.kickT||-9e9)>=o.v186ftT){ o.v186ftT=null; return; } /* he is already shaping to strike it: no heavy touch */
  const u=(st.now-o.v186ftT)/Math.max(140,st.D(420)); if(u<0||u>=1){ if(u>=1) o.v186ftT=null; return; }
  const ex=(1-o.v186ftQ)*0.9*(u<0.22?smooth(u/0.22):1-smooth((u-0.22)/0.78)); if(ex<0.01) return;
  const f=st.footOf(o), b=st.ball; let ux=o.v186ftDx, uy=o.v186ftDy; const mv=Math.hypot(o.vx||0,o.vy||0); if(mv>0.6){ ux=o.vx/mv; uy=o.vy/mv; }
  if(ux==null) return; const rx=b.x-f.x, ry=b.y-f.y; const along=rx*ux+ry*uy, px=rx-along*ux, py=ry-along*uy;
  const want=Math.min(1.3,Math.max(along,ex)); b.x=f.x+ux*want+px*0.6; b.y=f.y+uy*want+py*0.6;
  if(o.v186ftPk==null||want>o.v186ftPk) o.v186ftPk=want; }

const v186rUpd0=Stage.prototype.update;
Stage.prototype.update=function(dt){ try{ v186rPre(this); }catch(e){} const r=v186rUpd0.apply(this,arguments); if(V186R.on) v186rPost(this,dt); return r; };

/* R4: a footed reception records how clean the first touch is (0 heavy .. 1 clean) and the line the ball arrived on */
const v186rLand=Stage.prototype.land;
Stage.prototype.land=function(){ const f=this.fl; const r=v186rLand.apply(this,arguments);
  if(f&&!f.phys&&f.home&&!f.hands&&!f.head&&this.own===f.home&&!f.home.gk&&v186rHas(f.home)&&v186rLive(this)&&!this.rm){ const o=f.home;
    const q=clamp(0.5*v186rA(this,o,'ctrl')+0.25*(v186rZ(this,o,'ctrl')+1),0,1); const vx=this.lastVel?this.lastVel.x:0, vy=this.lastVel?this.lastVel.y:0, vl=Math.hypot(vx,vy);
    o.v186ftT=this.now; o.v186ftQ=q; o.v186ftPk=null; o.v186ftDx=vl>0.5?vx/vl:Math.cos(this.yawOf(o)); o.v186ftDy=vl>0.5?vy/vl:Math.sin(this.yawOf(o));
    v186rLog('ft',{pid:o.pid,q:+q.toFixed(2),ctrl:o.v186r_ctrl}); }
  return r; };

/* R2: the fallback take-on (switchable). Nothing happens when a skill-move module has claimed the dribble. */
function v186rTakeOn(st,p,x,y){ if(!V186R.feint||!v186rLive(st)||st.hands||st.own!==p||p.gk||!v186rHas(p)||st.rm) return null;
  if(typeof st.v186Move==='function'||st._v186skill) return null;
  const now=st.now; if(p.v186fT!=null&&now-p.v186fT<Math.max(400,st.D(1400))) return null;
  const dir=p.side===0?1:-1, hx=x-p.x, hy=y-p.y, hl=Math.hypot(hx,hy); if(hl<1.5) return null; let best=null, bd=6;
  for(const q of st.players.values()){ if(q.side===p.side||q.off||q.gk||q.ov||q.chase||!v186rHas(q)) continue; const dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy);
    if(d>=bd||d<0.8||dir*dx<0) continue; const c=(dx*hx+dy*hy)/(d*hl); if(c<Math.cos(70*Math.PI/180)) continue; best=q; bd=d; }
  if(!best) return null; const D=v186rDuel(st,p,best); if(Math.random()>=D.pTry) return null;
  const beat=Math.random()<D.pBeat; const side=((hx*(best.y-p.y)-hy*(best.x-p.x))>=0)?-1:1;
  p.v186fT=now; p.v186fS=side; best.v186dT=now; best.v186dS=side; best.v186dBeat=beat;
  if(beat){ best.v186bT=now+Math.max(60,st.D(160)); best.v186bD=Math.max(200,st.D(500+300*(1-v186rA(st,best,'tkl'))));
    best.kickT=now+Math.max(40,st.D(120)); best.kickW=0; best.kickK='pass'; best.kickF=st.D(260); st.look(best,p.x,p.y,st.D(500)); }
  v186rLog('feint',{att:p.pid,def:best.pid,gap:+D.gap.toFixed(1),beat,d:+bd.toFixed(2)});
  return {q:best,beat,side}; }

const v186rDribble=Stage.prototype.dribble;
Stage.prototype.dribble=function(p,x,y,ms){ let T=null; try{ if(this.own===p) T=v186rTakeOn(this,p,x,y); }catch(e){ T=null; }
  if(T&&!T.beat){ /* the defender holds his ground: he checks back and goes again shorter */ const dir=p.side===0?1:-1;
    x=clamp(p.x+(x-p.x)*0.35-dir*0.6,4,101); y=clamp(p.y+(y-p.y)*0.35+T.side*1.2,3,65); }
  return v186rDribble.call(this,p,x,y,ms); };

/* the feint and the bite as poses: a dropped shoulder for the carrier, a lunge with the hips turned for a beaten defender */
const v186rPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=v186rPose.apply(this,arguments); if(isRef||!P||this.rm) return P; const now=this.now;
  if(p.v186fT!=null){ const u=(now-p.v186fT)/Math.max(160,this.D(420)); if(u>=0&&u<1&&P.act!=='kick'){ const e=Math.sin(Math.PI*u); P.rot=(P.rot||0)+0.2*e*(u<0.5?p.v186fS:-p.v186fS); P.pivot=P.pivot||0.2; P.hipU-=0.05*e; P.lean+=0.05*e; } }
  if(p.v186dT!=null){ const u=(now-p.v186dT)/Math.max(200,this.D(p.v186dBeat?700:450)); if(u>=0&&u<1){ const e=Math.sin(Math.PI*Math.min(1,u*1.4))*(1-u*0.3);
      if(p.v186dBeat){ P.rot=(P.rot||0)+0.24*e*p.v186dS; P.pivot=P.pivot||0.2; P.hipU-=0.09*e; P.lean+=0.1*e; }
      else { P.hipU-=0.06*e; P.lean-=0.03*e; } } }
  return P; };

/* R3 strength: a much stronger carrier rides the challenge and stays on his feet (the ball still goes, as the engine says) */
const v186rTake=Stage.prototype.v18tTake;
Stage.prototype.v18tTake=function(p,o){ if(o&&p&&v186rHas(o)&&v186rHas(p)&&v186rLive(this)&&(o.v186r_str-p.v186r_str)>15&&o.trip===this.now){ o.trip=-9e9; o.v186ride=this.now; v186rLog('feint',{ride:o.pid,tkl:p.pid,gap:o.v186r_str-p.v186r_str}); }
  return v186rTake.apply(this,arguments); };
