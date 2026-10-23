/* ===================== v18.6 B1 dribbling skill moves (81) =====================
   Presentation only: engine.js, results, events and their timing are untouched. A move never changes the carrier's path or
   speed (the stage still steers him to the dribble leg's target at the same pace), adds no await, and only dresses what the
   stage already does: the body (feet, hands, lean, hip height, roll, head) through the poseOf layer, the ball through the
   carry target (footOf while a move runs, dribLead faded out), and the nearest defender's reaction (pose, plus a short
   planted or wrong-footed step through the detour hook, which no event waits on).
   Moves: body feint, single and double stepover, sole roll (straight, when a defender stands ahead within ~3 m), outside cut,
   inside chop, drag-back and Cruyff turn (when the leg turns the carrier through 0.9-3.1 rad). Who does what: a flair rating
   built from the engine's skills (there is no dribbling attribute), the level's repertoire (Modified knows the feint, cut and
   drag-back, a stepover only for its best; JV adds the chop, Cruyff and the double stepover; Varsity stars do everything) and
   a chance per leg that grows with flair and the level, with a cooldown per player. Lower ratings perform them slower (longer
   settle), with a smaller sell, less hip drop, wider arms, a wobbling ball and a heavy last touch.
   Straight moves are locked to the stride: they start when the fake foot begins its swing, so the stepover circle, the wide
   landing and the go touch fall on real steps; planted feet are pinned to the turf (world anchors) so nothing skates.
   Defenders: sold (lunges the wrong way: stepovers, roll), frozen (a feint stops him dead), turned (chop, Cruyff, drag-back,
   cut; a big rating gap makes him stumble). Only when the engine's next touch lets the carrier keep the ball; otherwise the
   defender reads it (barely reacts) and his tackle follows as before.
   State is primitive fields on the movers (v186*), so the goal replays (68, 76) show the moves.
   Switch: V186S.on. Tuning: V186S.rate (chance multiplier), V186S.bite (defender steps). Lab: 'skills' and 'skillsmod'. */
const V186S={on:true, rate:0.6, bite:true, cool:3500, minTs:0.45};
const V186S_LV={V:1,JV:0.85,MOD:0.7};
const V186S_MV={
  feint:{nc:1.75,trig:2.7,turn:0,min:{V:0,JV:0,MOD:0},w:1.0,go:0.5,cap:'BODY FEINT!'},
  step1:{nc:1.75,trig:3.0,turn:0,min:{V:55,JV:55,MOD:52},w:1.25,go:0.5,cap:'STEPOVER!'},
  step2:{nc:2.25,trig:3.4,turn:0,min:{V:70,JV:68,MOD:null},w:0.9,go:1.0,cap:'DOUBLE STEPOVER!'},
  roll:{nc:1.75,trig:2.6,turn:0,min:{V:72,JV:70,MOD:null},w:0.8,go:0.5,cap:'SOLE ROLL!'},
  cut:{T:340,turn:1,min:{V:0,JV:0,MOD:30},w:1.0,cap:'OUTSIDE CUT!'},
  chop:{T:440,turn:1,min:{V:45,JV:45,MOD:null},w:1.0,cap:'INSIDE CHOP!'},
  drag:{T:500,turn:1,min:{V:40,JV:40,MOD:40},w:0.9,cap:'DRAG-BACK!'},
  cruyff:{T:540,turn:1,min:{V:60,JV:62,MOD:null},w:1.0,cap:'CRUYFF TURN!'}};
const V186S_KINDS=Object.keys(V186S_MV);
const V186S_REACT={feint:'freeze',step1:'sold',step2:'sold',roll:'sold',cut:'turned',chop:'turned',drag:'turned',cruyff:'turned'};

/* ---------- ratings (own helper: the engine's skills; lab overrides p.v186fl / p.v186ds / p.v186lv) ---------- */
function v186sPx(p){ try{ return p&&typeof Px==='function'&&typeof App!=='undefined'&&App.C?Px(p.pid):null; }catch(e){ return null; } }
function v186sFlair(P){ const s=P.sk||{}, tr=P.tr||{}; const pb={FWD:4,MID:2,DEF:-6,GK:-30}[P.pos]||0;
  return clamp(0.42*(s.spd||50)+0.36*(s.pas||50)+0.22*(s.sho||50)+pb+1.2*(tr.score||0)+0.6*(tr.assist||0),5,99); }
function v186sDsk(P){ const s=P.sk||{}, tr=P.tr||{}; return clamp(0.6*(s.def||50)+0.25*(s.spd||50)+0.15*(s.sta||50)+1.5*(tr.defend||0)+(P.pos==='DEF'?3:0),5,99); }
function v186sQ(flair,lvl){ return clamp((flair-25)/65,0,1)*(V186S_LV[lvl]||1); }
function v186sLvl(st,p,P){ if(p&&p.v186lv) return p.v186lv; let lv=null;
  try{ if(typeof App!=='undefined'&&App.C&&App.C.fixtures&&st&&st.T){ const f=App.C.fixtures[st.T.id]; if(f&&f.lvl) lv=f.lvl; } }catch(e){}
  if(!lv&&P&&P.lvl) lv=P.lvl; return lv==='JV'||lv==='MOD'?lv:'V'; }
function v186sRate(st,p){ let M=st._v186R; if(!M) M=st._v186R=new Map(); let r=M.get(p); if(r) return r;
  const P=v186sPx(p); const flair=p.v186fl!=null?p.v186fl:P?v186sFlair(P):60, dsk=p.v186ds!=null?p.v186ds:P?v186sDsk(P):55; const lvl=v186sLvl(st,p,P);
  r={flair,dsk,lvl,q:v186sQ(flair,lvl)}; M.set(p,r); return r; }
/* how far a defender bites: the carrier's flair against his defending, times the fake's amplitude */
function v186sBite(flair,dsk,q){ return clamp(0.55+(flair-dsk)/45,0.12,1)*(0.55+0.45*q); }

/* ---------- the pure picker (unit-tested): repertoire by level and flair, situation fit, chance per leg ---------- */
function v186sKnows(k,lvl,flair){ const m=V186S_MV[k].min[lvl]; return m!=null&&flair>=m; }
function v186sRepertoire(lvl,flair){ return V186S_KINDS.filter(k=>v186sKnows(k,lvl,flair)); }
/* S: {turn (rad between his heading and the leg), d (defender ahead, m, or null), sp (real speed m/s), n5 (opponents within 5 m)} */
function v186sFits(k,S){ const t=S.turn, d=S.d;
  switch(k){ case 'feint': return t<0.5&&d!=null&&d<6;
    case 'step1': return t<0.5&&d!=null&&d<6&&S.sp<5.6;
    case 'step2': return t<0.5&&d!=null&&d<6&&S.sp<5.0;
    case 'roll': return t<0.5&&d!=null&&d<4.5&&S.sp<4.6;
    case 'cut': return t>=0.9&&t<1.6;
    case 'chop': return t>=1.5&&t<2.4;
    case 'drag': return t>2.2;
    case 'cruyff': return t>2.3&&d!=null&&d<4.5; }
  return false; }
function v186sChance(lvl,q,turn){ return ({V:0.45,JV:0.32,MOD:0.2}[lvl]||0.3)*(0.35+0.65*q)*V186S.rate*(turn?0.8:1); }
/* returns a move kind or null; force (lab) skips the chance roll and the situation (but not the repertoire) */
function v186sPick(lvl,flair,S,rnd,force){ rnd=rnd||Math.random; const q=v186sQ(flair,lvl);
  if(force){ return v186sKnows(force,lvl,flair)||lvl==='lab'?force:null; }
  const C=v186sRepertoire(lvl,flair).filter(k=>v186sFits(k,S)); if(!C.length) return null;
  if(rnd()>=v186sChance(lvl,q,S.turn>=0.9)) return null;
  /* the fancier the move, the more it is the star's choice */
  const W=C.map(k=>{ const m=V186S_MV[k], mn=m.min[lvl]||0; return m.w*(0.4+q)*(1+Math.max(0,flair-mn)/40)*(k==='feint'||k==='cut'?1.6-q:1); });
  let s=W.reduce((a,b)=>a+b,0)*rnd(); for(let i=0;i<C.length;i++){ s-=W[i]; if(s<=0) return C[i]; } return C[C.length-1]; }

/* ---------- small helpers ---------- */
const v186sSm=(a,b,x)=>smooth((x-a)/(b-a));
/* a bump that rises over [a,b] and falls over [c,d] */
const v186sBump=(x,a,b,c,d)=>x<=a||x>=d?0:x<b?smooth((x-a)/(b-a)):x<=c?1:1-smooth((x-c)/(d-c));
const v186sAng=a=>Math.atan2(Math.sin(a),Math.cos(a));
const v186sYaw=p=>p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw;
function v186sHs(st,p){ return (v184Is3D(st)?0.92:1.06)*(p.hgt||70)/70; }
function v186sBR(st){ return v184Is3D(st)?(typeof V18_BALL_R==='number'?V18_BALL_R:0.176):0.11; }
/* gait duty factor (fraction of a cycle a foot is planted), as poseOf computes it for running forward */
function v186sDuty(st,p){ const sp=st.spdMul||1, real=(p.spd||0)/Math.max(1,sp); const G=gaitOf(Math.min(9,p.gv!=null?p.gv:real),sp); return clamp(Math.min(0.68,G.L/G.cw),0.22,0.68); }
function v186sLab(st){ return typeof App!=='undefined'&&App.labSt===st; }
/* may this carrier start a move at all (gating per the design: speed, skip, reduced motion, shootouts, keepers, demo, lab) */
function v186sCan(st,p){ if(!V186S.on||!p||st.rm||st.skip||st.so||st.demo||st.ts<V186S.minTs||st.hands||st.placed||st.fl||st.own!==p||p.gk||p.off||p.slow||p.celeb||p.glide) return false;
  if(v186sLab(st)&&!st._v186lab) return false;
  for(const q of st.players.values()) if(q.chase===p) return false;
  return true; }
/* nearest opponent ahead of a heading (keeper only inside his box), as {q,d} */
function v186sAhead(st,p,hx,hy){ let best=null, bd=1e9; for(const q of st.players.values()){ if(q.side===p.side||q.off||q.ref) continue;
    if(q.gk&&!(Math.abs(q.x-(q.side===0?0:105))<16.5&&Math.abs(q.y-34)<20.2)) continue;
    const dx=q.x-p.x, dy=q.y-p.y, d=Math.hypot(dx,dy); if(d<0.05||d>8) continue; if((dx*hx+dy*hy)/d<0.4) continue; if(d<bd){ bd=d; best=q; } }
  return best?{q:best,d:bd}:null; }
function v186sN5(st,p){ let n=0; for(const q of st.players.values()){ if(q.side!==p.side&&!q.off&&!q.ref&&Math.hypot(q.x-p.x,q.y-p.y)<5) n++; } return n; }

/* ---------- which touch comes next: does the engine let the carrier keep the ball after this leg? ---------- */
const _v186sPM=Stage.prototype.playMinute;
Stage.prototype.playMinute=function(out,M,W){ try{ const t=(M&&M.touch||[]).map(x=>this.pl(x.pid)).filter(p=>p&&!p.off).map(p=>p.pid);
    const o=(out||[]).filter(e=>e.t==='offside'), s=(out||[]).filter(e=>e.t==='save'||e.t==='miss'); const nx=(o[0]||s[0]); this._v186mt={t,i:0,nx:nx?nx.s:null}; }catch(e){ this._v186mt=null; }
  const r=_v186sPM.apply(this,arguments); const me=this._v186mt; Promise.resolve(r).then(()=>{ if(this._v186mt===me) this._v186mt=null; },()=>{}); return r; };
const _v186sGoal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=function(e){ this._v186mt=null; const solo=!!(e&&e.ty==='solo'), st=this; let oc=null;
  if(solo&&V186S.on){ oc=this.onCaption; this.onCaption=function(t,k){ if(t==='SKILL!'){ const n=v186sSolo(st,e); if(n) t=n; } return oc.apply(this,arguments.length>1?[t,k]:[t]); }; }
  const r=_v186sGoal.apply(this,arguments); if(oc){ const back=()=>{ if(st.onCaption!==oc) st.onCaption=oc; }; Promise.resolve(r).then(back,back); } return r; };
/* a solo goal's "SKILL!" moment: with probability 0.7 a named straight move from his repertoire replaces the hurdle */
function v186sSolo(st,e){ if(!v186sAllowedSolo(st)) return null; const now=st.now; let pl=null, beat=null;
  for(const q of st.players.values()){ if(q.side===e.s&&q.jumpT===now) pl=q; if(q.side!==e.s&&q.slideT===now) beat=q; }
  if(!pl||!beat) return null; const R=v186sRate(st,pl); const C=v186sRepertoire(R.lvl,R.flair).filter(k=>!V186S_MV[k].turn);
  if(!C.length||Math.random()>=0.7) return null; const k=st._v186force&&C.includes(st._v186force)?st._v186force:C[Math.floor(Math.random()*C.length)];
  pl.jumpT=-9e9; beat.slideT=-9e9; pl.v186pend=k; pl.v186pd=beat.pid; return V186S_MV[k].cap; }
function v186sAllowedSolo(st){ return V186S.on&&!st.rm&&!st.skip&&!st.so&&!st.demo&&st.ts>=V186S.minTs&&!(v186sLab(st)&&!st._v186lab); }

/* ---------- the dribble leg: remembered, never awaited differently ---------- */
const _v186sDrib=Stage.prototype.dribble;
Stage.prototype.dribble=function(p,x,y,ms){ const T=this._v186mt; let keep=true;
  if(T&&p){ const i=T.i++; const nx=T.t[i+1]; if(nx!=null){ const q=this.pl(nx); keep=!q||q.side===p.side; } else if(T.nx!=null) keep=T.nx===p.side; }
  this._v186leg={p,x,y,ms,t0:this.now,on:false,keep}; return _v186sDrib.apply(this,arguments); };

/* the leg has begun (p.ov is its target): decide */
function v186sLegStart(st,L){ const p=L.p, now=st.now; L.arm=null;
  if(p.v186k||!v186sCan(st,p)) return;
  const pend=p.v186pend; p.v186pend=null; const force=st._v186force||null;
  if(!pend&&!force&&now-(p.v186last!=null?p.v186last:-9e9)<st.D(V186S.cool)) return;
  const R=v186sRate(st,p); const mv=Math.hypot(p.vx||0,p.vy||0); const h=mv>0.8?Math.atan2(p.vy,p.vx):v186sYaw(p);
  const tg=Math.atan2(L.y-p.y,L.x-p.x), da=v186sAng(tg-h), turn=Math.abs(da); const hx=Math.cos(h), hy=Math.sin(h);
  const A=v186sAhead(st,p,turn<0.9?Math.cos(tg):hx,turn<0.9?Math.sin(tg):hy); const sp=(p.spd||0)/Math.max(1,st.spdMul||1);
  const S={turn,d:A?A.d:null,sp,n5:v186sN5(st,p)};
  let k=null;
  if(pend){ k=pend; }
  else if(force){ const m=V186S_MV[force]; if(m&&(m.turn?turn>=0.9:turn<0.9)) k=force; }
  else k=v186sPick(R.lvl,R.flair,S);
  if(!k) return;
  const M=V186S_MV[k]; let def=A?A.q:null; if(pend&&p.v186pd){ const b=st.pl(p.v186pd); if(b) def=b; p.v186pd=null; }
  if(M.turn){ const sc=Math.sign(da)||(def?Math.sign((def.x-p.x)*-hy+(def.y-p.y)*hx)||1:1);
    v186sBegin(st,p,k,{y0:h,side:sc,def,keep:L.keep,R}); return; }
  /* straight: armed until the defender is within trigger distance (and the leg is long enough), then locked to the stride */
  L.arm={k,def:def?def.pid:null,pend:!!pend,R};
  if(pend) v186sTrigger(st,L); }
/* geometry: which side the carrier passes the defender on (go side), as + = his left */
function v186sGoSide(p,q,tx,ty){ const ax=q.x-p.x, ay=q.y-p.y, bx=tx-p.x, by=ty-p.y; const c=ax*by-ay*bx, n=Math.hypot(ax,ay)*Math.hypot(bx,by)||1;
  return Math.abs(c/n)>0.08?Math.sign(c):0; }
function v186sTrigger(st,L){ const p=L.p, a=L.arm; if(!a) return; L.arm=null; const now=st.now;
  const def=a.def?st.pl(a.def):null; const yaw=v186sYaw(p);
  /* the next foot to swing, unless geometry says which side he goes */
  const Dd=v186sDuty(st,p); const c01=(((p.ph||0)/(2*Math.PI))%1+1)%1; const toSw=i=>((Dd-((c01+(i?0.5:0))%1))%1+1)%1;
  const g0=def?v186sGoSide(p,def,L.x,L.y):0; const w=x=>x>0.92?0:x; /* a foot that has only just left the ground: start now */
  /* the stepping foot: the fake-side foot (the go-side foot for a double); geometry picks the side unless the other foot is much sooner */
  const first=(sg)=>{ const iF=sg>0?0:1; return a.k==='step2'?1-iF:iF; };
  let sg=g0||(w(toSw(0))<w(toSw(1))?(a.k==='step2'?-1:1):(a.k==='step2'?1:-1));
  if(a.pend||!g0||Math.abs(g0)<1){ if(w(toSw(first(-sg)))+0.3<w(toSw(first(sg)))) sg=-sg; }
  let dly=w(toSw(first(sg)));
  const rem=Math.hypot(L.x-p.x,L.y-p.y)-0.6, G=gaitOf(Math.max(1,(p.spd||0)/Math.max(1,st.spdMul||1)),st.spdMul||1), mc=V186S_MV[a.k].go+0.72*(1-Dd);
  if(!a.pend&&rem<G.cw*(dly+mc+0.12)){ const o=w(toSw(first(-sg))); if(rem>=G.cw*(o+mc+0.12)){ sg=-sg; dly=o; } else return; }
  v186sBegin(st,p,a.k,{y0:yaw,side:-sg,def,keep:L.keep,R:a.R,ph0:(p.ph||0)+dly*2*Math.PI,Dd}); }

/* ---------- start / end ---------- */
function v186sBegin(st,p,k,o){ const M=V186S_MV[k], R=o.R||v186sRate(st,p), q=R.q, now=st.now;
  p.v186k=k; p.v186t0=now; p.v186y0=o.y0; p.v186sf=o.side; p.v186q=q; p.v186ab=null; p.v186bf0=null; p.v186bl0=null; p.v186sold=0; p.v186tc=0;
  p.v186tt=0; p.v186A0x=null; p.v186A0y=null; p.v186A1x=null; p.v186A1y=null; p.v186keep=o.keep!==false; p.v186def=o.def?o.def.pid:null;
  p.v186bite=o.def?v186sBite(R.flair,v186sRate(st,o.def).dsk,q):0;
  if(M.turn){ p.v186T=st.D(M.T*(1.3-0.45*q)); p.v186ph0=null; p.v186nc=0; p.v186dd=0.5; }
  else { p.v186ph0=o.ph0; p.v186dd=o.Dd; p.v186nc=M.nc+0.4*(1-q); const sp=Math.max(1.5,(p.spd||0)/Math.max(1,st.spdMul||1)); const G=gaitOf(sp,st.spdMul||1);
    p.v186T=Math.max(st.D(700),1000*G.cw*(p.v186nc+1)/Math.max(0.5,p.spd||sp)); }
  st._v186n=(st._v186n||0)+1; (st._v186log||(st._v186log=[])).push({k,pid:p.pid,t:now,q:+q.toFixed(2),fl:R.flair,lvl:R.lvl,keep:p.v186keep,def:p.v186def,bite:+p.v186bite.toFixed(2)}); if(st._v186log.length>200) st._v186log.shift();
  if(v186sLab(st)&&typeof labLog==='function') labLog(`${(V186S_MV[k].cap||k).replace('!','')} · flair ${Math.round(R.flair)} (${R.lvl}) · q ${q.toFixed(2)} · bite ${p.v186bite.toFixed(2)}`); }
function v186sEnd(p,now){ p.v186k=null; p.v186last=now; p.v186A0x=p.v186A0y=p.v186A1x=p.v186A1y=null; p.v186bf0=p.v186bl0=null; }
/* move clock: u in [0,1] (and m, in stride cycles, for the straight moves). Straight moves follow the stride phase, with a time
   floor so a carrier who stops still finishes; turn moves run on stage time. */
function v186sClock(st,p){ const now=st.now; if(!p.v186k) return null; const M=V186S_MV[p.v186k];
  if(M.turn){ const u=(now-p.v186t0)/Math.max(1,p.v186T); return {u,m:u}; }
  const nc=p.v186nc||M.nc; let m=((p.ph||0)-p.v186ph0)/(2*Math.PI); const mt=(now-p.v186t0)/Math.max(1,p.v186T)*(nc+1)-1; if(mt>m) m=mt;
  return {u:m/nc,m}; }
/* envelope of the whole layer (in over the first 12 %, out over the last 15 %, or 80 ms after an abort) */
function v186sEnv(st,p,u){ let w=u<=0?0:u>=1?0:smooth(u/0.12)*(1-smooth((u-0.85)/0.15)); if(p.v186ab!=null) w*=1-smooth((st.now-p.v186ab)/Math.max(40,st.D(80))); return w; }

/* ---------- the plan of each move: ball path (metres in the yaw0 frame, from the body centre) ---------- */
/* returns [f,l,wb]: wb = how much the move owns the ball (the rest is the live carry) */
function v186sBallPlan(p,u,m){ const k=p.v186k, sf=p.v186sf, sg=-sf, q=p.v186q, A=0.55+0.45*q, Dd=p.v186dd||0.5; const f0=p.v186bf0, l0=p.v186bl0;
  if(f0==null) return [0,0,0]; const wob=0.12*(1-q)*Math.sin(m*Math.PI*2.2);
  let f=f0, l=l0, wx=0;
  if(!V186S_MV[k].turn){ const go=V186S_MV[k].go, mc=go+0.72*(1-Dd); const ride=0.46+0.04*q;
    const a=v186sSm(0,clamp(0.25+0.6*(f0-ride),0.25,0.6),m); f=lerp(f0,ride,a); l=lerp(l0,0,a)+wob*a;
    if(k==='roll'){ const ms=0.5*(1-Dd), me=1-Dd; const r=v186sSm(ms,me,m); l+=sg*0.28*r; f-=0.04*r; }
    const g=v186sSm(mc,mc+0.22,m); const heavy=0.3*(1-q)*(q<0.5?1:0.4); f+=(0.2+heavy)*g; l+=sg*(k==='roll'?0.14:0.3)*A*g;
    wx=v186sSm(mc+0.25,(p.v186nc||1.75),m); }
  else { const sc=sf;
    if(k==='cut'){ const a=v186sSm(0,0.3,u), c=v186sSm(0.38,0.58,u); f=lerp(f0,0.5,a)+0.12*c; l=lerp(l0,0,a)*(1-c)+sc*0.36*A*c+wob*a*(1-c); wx=v186sSm(0.6,1,u); }
    else if(k==='chop'){ const a=v186sSm(0,0.3,u), c=v186sSm(0.32,0.6,u); f=lerp(lerp(f0,0.62,a),0.3,c); l=lerp(lerp(l0,0,a),sc*0.34,c)+wob*a*(1-c); wx=v186sSm(0.6,1,u); }
    else if(k==='drag'){ const a=v186sSm(0,0.24,u), c=v186sSm(0.28,0.6,u); f=lerp(lerp(f0,0.52,a),0.04,c); l=lerp(lerp(l0,0,a),-0.02*sc,c); wx=v186sSm(0.62,1,u); }
    else if(k==='cruyff'){ const a=v186sSm(0,0.32,u), c1=v186sSm(0.34,0.62,u), c2=v186sSm(0.58,0.76,u); f=lerp(lerp(lerp(f0,0.52,a),0.05,c1),-0.18,c2); l=lerp(lerp(lerp(l0,-0.02*sc,a),0.24*sc,c1),0.28*sc,c2); wx=v186sSm(0.72,1,u); } }
  return [f,l,smooth(u/0.1)*(1-wx)]; }

/* the carry target: the move's ball point, handed back to the live foot point */
const _v186sFoot=Stage.prototype.footOf;
Stage.prototype.footOf=function(p){ const o=_v186sFoot.apply(this,arguments);
  if(!p||!p.v186k||p.v186bf0==null||this.own!==p||this.hands||this.placed||this.fl) return o;
  const C=v186sClock(this,p); if(!C||C.u<=0) return o; const B=v186sBallPlan(p,C.u,C.m); let w=B[2]*(p.v186ab!=null?1-smooth((this.now-p.v186ab)/Math.max(40,this.D(80))):1); if(!(w>0)) return o;
  const ca=Math.cos(p.v186y0), sa=Math.sin(p.v186y0); const x=p.x+B[0]*ca-B[1]*sa, y=p.y+B[0]*sa+B[1]*ca; return {x:lerp(o.x,x,w), y:lerp(o.y,y,w), z:o.z}; };
const _v186sLead=Stage.prototype.dribLead;
Stage.prototype.dribLead=function(o,sp,dt,now){ const r=_v186sLead.apply(this,arguments); if(!o||!o.v186k||o.v186bf0==null) return r;
  const C=v186sClock(this,o); if(!C||C.u<=0) return r; const B=v186sBallPlan(o,C.u,C.m); return r*(1-clamp(B[2],0,1)); };

/* ---------- per step: legs, triggers, clocks, sells, anchors, aborts ---------- */
function v186sStep(st){ const now=st.now, L=st._v186leg;
  if(L&&!L.on){ const p=L.p; if(st.own===p&&p.ov&&p.ov.x===L.x&&p.ov.y===L.y){ L.on=true; v186sLegStart(st,L); } else if(now-L.t0>6000) st._v186leg=null; }
  if(L&&L.on&&L.arm){ const p=L.p; if(st.own!==p||!p.ov||p.ov.x!==L.x||p.ov.y!==L.y||!v186sCan(st,p)) L.arm=null;
    else { if(!L.arm.def){ const mv=Math.hypot(p.vx||0,p.vy||0); const tg=Math.atan2(L.y-p.y,L.x-p.x); const A=v186sAhead(st,p,Math.cos(tg),Math.sin(tg)); if(A&&A.d<V186S_MV[L.arm.k].trig+1.5) L.arm.def=A.q.pid; }
      const def=L.arm.def?st.pl(L.arm.def):null; const d=def?Math.hypot(def.x-p.x,def.y-p.y):0; const M=V186S_MV[L.arm.k];
      const rem=Math.hypot(L.x-p.x,L.y-p.y)-0.6; const sp=Math.max(1,(p.spd||0)/Math.max(1,st.spdMul||1)); const G=gaitOf(sp,st.spdMul||1);
      /* the ball close to his feet (not out ahead from the last touch) */
      const yw=v186sYaw(p), bfw=(st.ball.x-p.x)*Math.cos(yw)+(st.ball.y-p.y)*Math.sin(yw);
      if(rem<G.cw*(M.go+0.62)) L.arm=null; else if((def&&d<=M.trig&&bfw<0.82)||L.arm.pend) v186sTrigger(st,L); } }
  for(const p of st.players.values()){ if(!p.v186k) continue; const C=v186sClock(st,p); if(!C) continue; const u=C.u, M=V186S_MV[p.v186k];
    /* abort: lost the ball, a strike, a tackle closing in (unless nearly done), skipping, a speed change */
    if(p.v186ab==null){ let ab=st.own!==p||st.hands||st.placed||!!st.fl||st.skip||st.rm||st.ts<V186S.minTs||p.off;
      if(!ab&&u<0.7){ for(const q of st.players.values()) if(q.chase===p){ ab=true; break; } }
      const kt=now-(p.kickT||-9e9); if(kt>=0&&kt<(p.kickW||0)+(p.kickF||260)) ab=true;
      if(ab) p.v186ab=now; }
    if(p.v186ab!=null&&now-p.v186ab>Math.max(40,st.D(80))){ v186sEnd(p,now); continue; }
    if(u>=1){ v186sEnd(p,now); continue; }
    if(u<0) continue;
    if(p.v186bf0==null&&st.own===p){ const b=st.ball, ca=Math.cos(p.v186y0), sa=Math.sin(p.v186y0), dx=b.x-p.x, dy=b.y-p.y; p.v186bf0=clamp(dx*ca+dy*sa,0.2,1.3); p.v186bl0=clamp(-dx*sa+dy*ca,-0.5,0.5); }
    /* yaw: hold the old heading through the setup of a turn, then face the new way */
    if(M.turn&&p.v186ab==null){ const hold=p.v186k==='cut'?0.3:p.v186k==='chop'?0.32:0.5; const L2=st._v186leg;
      if(u<hold){ p.yawLock=p.v186y0; p.yawLockT=now+40; }
      else if(!p.v186tc&&L2&&L2.p===p){ p.v186tc=1; if(p.v186k==='drag'||p.v186k==='cruyff') st.look(p,L2.x,L2.y,st.D(420)); } }
    /* pinned feet: when a plant begins, the foot's spot on the turf is kept */
    v186sPlants(st,p,C);
    /* touches: sound at each contact */
    const tc=v186sTouchU(p); if(tc!=null&&!p.v186tt&&C.m>=tc){ p.v186tt=1; st.snd('touch'); }
    if(tc!=null&&C.m<tc) p.v186tt=0;
    /* the sell: the defender reacts at the move's sell moment */
    if(!p.v186sold&&p.v186def&&C.m>=v186sSellM(p)){ p.v186sold=1; const q=st.pl(p.v186def); if(q) v186sReact(st,p,q); } } }
const _v186sUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v186sUpd.apply(this,arguments); if(V186S.on){ try{ v186sStep(this); }catch(e){ if(!this._v186err){ this._v186err=1; console.warn('v18.6 skills',e); } } } return r; };

/* which foot makes the move's touch on the ball */
function v186sTouchFoot(p){ const k=p.v186k, sf=p.v186sf; if(!k) return null; if(!V186S_MV[k].turn) return sf>0?0:1; return k==='cut'?(sf>0?1:0):(sf>0?0:1); }
/* when (in the move clock's m) the go touch / sell happen */
function v186sTouchU(p){ const k=p.v186k, M=V186S_MV[k], Dd=p.v186dd||0.5; if(!M.turn) return M.go+0.72*(1-Dd);
  return k==='cut'?0.4:k==='chop'?0.4:k==='drag'?0.3:0.46; }
function v186sSellM(p){ const k=p.v186k, Dd=p.v186dd||0.5; if(k==='step1'||k==='feint') return 1-Dd; if(k==='step2') return 1.5-Dd; if(k==='roll') return 0.75*(1-Dd);
  return k==='cut'?0.45:k==='chop'?0.45:k==='drag'?0.55:0.5; }

/* ---------- the defender's reaction ---------- */
function v186sReact(st,p,q){ const now=st.now; if(q.chase||q.glide||q.off||q.gk) return; if(Math.hypot(q.x-p.x,q.y-p.y)>5) return;
  const k=p.v186k; let kind=p.v186keep?V186S_REACT[k]:'read'; const b=p.v186keep?p.v186bite:0.15;
  if(kind==='turned'&&k==='cut'&&Math.hypot(q.x-p.x,q.y-p.y)>3.2) return;
  const y0=p.v186y0, sf=p.v186sf;
  /* the wrong way, in world terms: the fake side of the carrier (sold, frozen), or the way he was running (turned: momentum) */
  const ang=kind==='turned'?Math.atan2(q.vy||0,q.vx||0):y0+sf*Math.PI/2;
  q.v186rT=now; q.v186rk=kind; q.v186rs=Math.hypot(q.vx||0,q.vy||0)<0.3&&kind==='turned'?y0+Math.PI:ang; q.v186rb=b; q.v186rx=q.x; q.v186ry=q.y; q.v186rp=p.pid;
  q.v186rd=st.D(kind==='turned'?420:kind==='freeze'?420:460);
  if(kind==='turned'&&b>0.8&&!v186sTackling(q,now)) q.trip=now; }
function v186sTackling(p,now){ const a=t=>t==null?1e9:now-t; return Math.min(a(p.v18slT),a(p.v18icT),a(p.v18pkT),a(p.v18shT),a(p.slideT))<1100; }
/* the defender's step: planted (sold, frozen) or carried on by his momentum (turned), never while chasing or told where to stand */
const _v186sDetour=Stage.prototype.detour;
Stage.prototype.detour=function(p){ const w=_v186sDetour.apply(this,arguments); if(w||p.v186rT==null||!V186S.bite) return w;
  const t=this.now-p.v186rT; if(t<0||t>(p.v186rd||400)) return w; if(p.chase||p.ov||p.meet||p.trail||p.glide||p===this.own||p.v186rk==='read') return w;
  const b=p.v186rb||0, ca=Math.cos(p.v186rs), sa=Math.sin(p.v186rs); const st=p.v186rk==='sold'?0.35+0.75*b:p.v186rk==='turned'?0.4+0.7*b:0.12*b;
  return {x:clamp(p.v186rx+ca*st,1,104), y:clamp(p.v186ry+sa*st,1,67)}; };

/* ---------- pinned feet ---------- */
/* plan of the planted feet: [foot, m0 (pinned from), m1 (released at), f, l] in body units, for the current move */
function v186sPlantPlan(p,i){ const k=p.v186k, sf=p.v186sf, Dd=p.v186dd||0.5, sd=i?1:-1; const A=0.55+0.45*(p.v186q||0);
  if(k==='step1'||k==='feint'||k==='roll'){ const iF=sf>0?1:0; if(i!==iF) return null; return [1-Dd,1.0]; }
  if(k==='step2'){ const iF=sf>0?1:0; if(i===iF) return [1.5-Dd,1.5]; return [1-Dd,1.0]; }
  const sc=sf, iS=k==='cut'?(sc>0?0:1):(sc>0?1:0); if(i!==iS) return null;
  return k==='cut'?[0.14,0.62]:k==='chop'?[0.12,0.62]:k==='drag'?[0.12,0.62]:[0.14,0.72]; }
function v186sPlants(st,p,C){ for(const i of [0,1]){ const pl=v186sPlantPlan(p,i); if(!pl) continue; const kx='v186A'+i+'x', ky='v186A'+i+'y';
    if(C.m>=pl[0]&&C.m<pl[1]&&p[kx]==null){ const r=v186sFootPlan(st,p,i,pl[0]+1e-4,null); const t=r&&r.t?r.t:r; if(!t||!isFinite(t.f)) continue; const yaw=v186sYaw(p), ca=Math.cos(yaw), sa=Math.sin(yaw), hs=v186sHs(st,p);
      p[kx]=p.x+(t.f*ca-t.l*sa)*hs; p[ky]=p.y+(t.f*sa+t.l*ca)*hs; } } }

/* ---------- the carrier's feet ---------- */
/* stepover circle for foot i landing on side s (=its own side), progress s01 over its swing; ball (bf,bl) and radius rb in body units */
function v186sOver(s01,base,bf,bl,rb,s,A){ const K=[[0,base.f,base.u,base.l],[0.35,bf-rb*0.5,rb*1.6+0.05,bl-s*(rb+0.07)],[0.56,bf+rb+0.07,rb*2+0.05,bl-s*0.02],[0.78,bf+rb*0.5,rb*1.4,bl+s*(rb+0.1)],[1,bf-0.04,0,bl+s*(rb+0.18+0.1*A)]];
  return v186sKey(K,s01); }
function v186sKey(K,x){ if(x<=K[0][0]) return {f:K[0][1],u:K[0][2],l:K[0][3]}; for(let j=1;j<K.length;j++){ if(x<=K[j][0]){ const a=K[j-1], b=K[j], t=smooth((x-a[0])/(b[0]-a[0])); return {f:lerp(a[1],b[1],t),u:lerp(a[2],b[2],t),l:lerp(a[3],b[3],t)}; } }
  const e=K[K.length-1]; return {f:e[1],u:e[2],l:e[3]}; }
/* the go touch: the foot comes across to the inside of the ball and pushes it out with its outside toward side s */
function v186sPush(s01,base,ball,rb,s,ctc){ const c={f:ball.f-0.02,u:0.05,l:ball.l-s*(rb+0.05)};
  const K=[[0,base.f,base.u,base.l],[0.5,ball.f-0.16,0.11,ball.l-s*(rb+0.07)],[0.72,c.f,c.u,c.l],[0.9,ball.f+0.04,0.06,ball.l+s*0.02]]; const t=v186sKey(K,s01);
  return t; }
/* a foot target in body units for foot i at move time (m or u), or null for the base gait; base: the base pose's foot */
function v186sFootPlan(st,p,i,m,base){ const k=p.v186k, sf=p.v186sf, sg=-sf, Dd=p.v186dd||0.5, A=0.55+0.45*(p.v186q||0), sd=i?1:-1;
  const hs=v186sHs(st,p), rb=v186sBR(st)/hs; const B=base||{f:0.02,u:0,l:sd*0.1};
  /* the ball in body units (for contacts) */
  const b=st.ball; const bb=v184Body(p,b.x,b.y,st); const ball={f:bb[0],l:bb[1]};
  const pin=(pl)=>{ const ax=p['v186A'+i+'x'], ay=p['v186A'+i+'y']; if(ax==null) return null; const r=v184Body(p,ax,ay,st); return {f:clamp(r[0],-0.75,0.8),u:0,l:clamp(r[1],-0.6,0.6)}; };
  const iF=sf>0?1:0, iG=1-iF;
  if(!V186S_MV[k].turn){ const sw=a=>(m-a)/(1-Dd);
    /* the fake foot: stepover / wide feint step / sole roll, pinned on landing, released in its next swing */
    const over=(a,side)=>{ const s=sw(a); if(s<0) return null; if(s<1){ let t;
        if(k==='feint'){ t={f:lerp(B.f,ball.f-0.18,smooth(s)),u:B.u+0.04*Math.sin(Math.PI*s),l:lerp(B.l,side*(0.2+0.14*A),smooth(s))}; }
        else if(k==='roll'&&a===0){ if(s<0.5) t=v186sKey([[0,B.f,B.u,B.l],[0.5,ball.f-0.03,rb*2-0.02,ball.l]],s); else t={f:ball.f-0.04,u:rb*2-0.02-0.03*v186sSm(0.5,1,s),l:ball.l+sd*0.0}; if(s>0.85) t={f:lerp(t.f,ball.f-0.2,v186sSm(0.85,1,s)),u:t.u*(1-v186sSm(0.85,1,s)),l:lerp(t.l,ball.l-sg*0.16,v186sSm(0.85,1,s))}; }
        else t=v186sOver(s,B,ball.f,ball.l,rb,side,A);
        return {t,w:smooth(Math.min(1,s/0.22))}; }
      return 'land'; };
    const release=(a)=>{ const s=sw(a); if(s<0||s>=1) return null; const P=pin()||null; if(!P) return null; const w=1-smooth(s/0.7); return {t:{f:P.f,u:0.06*Math.sin(Math.PI*Math.min(1,s/0.7)),l:P.l},w}; };
    const landT=(side,first)=>k==='feint'?{f:ball.f-0.18,u:0,l:side*(0.2+0.14*A)}:(k==='roll'&&first)?{f:ball.f-0.2,u:0,l:ball.l-sg*0.16}:{f:ball.f-0.04,u:0,l:ball.l+side*(rb+0.18+0.1*A)};
    const pinned=(side,first)=>{ const P=pin(); return {t:P||landT(side,first),w:1}; };
    const push=(a)=>{ const s=sw(a); if(s<0||s>=1) return null; const P0=pin(); const S0=P0||B; let t=v186sPush(s,S0,ball,rb,sg); const toBase=v186sSm(0.82,1,s); t={f:lerp(t.f,B.f,toBase),u:lerp(t.u,B.u,toBase),l:lerp(t.l,B.l,toBase)};
      return {t,w:P0?1:smooth(Math.min(1,s/0.25))}; };
    let r=null;
    if(k==='step1'||k==='feint'||k==='roll'){
      if(i===iF){ const o=over(0,sd); if(o==='land'){ r=m<1.0?pinned(sd,true):release(1.0); } else r=o; }
      else r=push(0.5); }
    else if(k==='step2'){
      if(i===iG){ const o=over(0,sd); if(o==='land'){ r=m<1.0?pinned(sd,false):push(1.0); } else r=o; }
      else { const o=over(0.5,sd); if(o==='land'){ r=m<1.5?pinned(sd,false):release(1.5); } else r=o; } }
    if(!r) return base?null:B; if(!base) return r.t; return r; }
  /* turn moves (m is u here) */
  const u=m, sc=sf;
  if(k==='cut'){ const iC=sc>0?1:0; if(i!==iC){ const pl=[0.14,0.62]; if(u<pl[0]) return {t:{f:lerp(B.f,0.12,v186sSm(0,pl[0],u)),u:B.u*(1-v186sSm(0,pl[0],u)),l:lerp(B.l,-sc*0.17,v186sSm(0,pl[0],u))},w:1}; if(u<pl[1]) return pin()?{t:pin(),w:1}:{t:{f:0.12,u:0,l:-sc*0.17},w:1}; const P=pin(); return P?{t:P,w:1-v186sSm(pl[1],0.85,u)}:null; }
    const c={f:ball.f-0.04,u:0.06,l:ball.l-sc*(rb+0.05)}; const K=[[0,B.f,B.u,B.l],[0.25,ball.f-0.2,0.12,ball.l-sc*(rb+0.1)],[0.4,c.f,c.u,c.l],[0.55,ball.f+0.02,0.08,ball.l+sc*0.02],[0.85,B.f,B.u,B.l]];
    const t=v186sKey(K,u); if(!base) return t; return {t,w:1}; }
  if(k==='chop'){ const iR=sc>0?0:1; if(i!==iR){ if(u<0.12){ const a=v186sSm(0,0.12,u); return {t:{f:lerp(B.f,0.3,a),u:B.u*(1-a)+0.05*Math.sin(Math.PI*a),l:lerp(B.l,sc*0.22,a)},w:1}; } if(u<0.62){ const P=pin(); return {t:P||{f:0.3,u:0,l:sc*0.22},w:1}; } const P=pin(); return P?{t:P,w:1-v186sSm(0.62,0.88,u)}:null; }
    const pd=[-0.55,0.83*sc], gap=rb+0.06; const c={f:ball.f-pd[0]*gap,u:0.07,l:ball.l-pd[1]*gap};
    const K=[[0,B.f,B.u,B.l],[0.28,ball.f+rb+0.06,0.12,ball.l-sc*(rb+0.04)],[0.38,c.f,c.u,c.l]]; let t;
    if(u<0.38) t=v186sKey(K,u); else if(u<0.56) t=c; else t=v186sKey([[0.56,c.f,c.u,c.l],[0.86,B.f,B.u,B.l]],u);
    if(!base) return t; return {t,w:1}; }
  if(k==='drag'){ const iD=sc>0?0:1; if(i!==iD){ if(u<0.12){ const a=v186sSm(0,0.12,u); return {t:{f:lerp(B.f,-0.04,a),u:B.u*(1-a),l:lerp(B.l,sc*0.15,a)},w:1}; } if(u<0.62){ const P=pin(); return {t:P||{f:-0.04,u:0,l:sc*0.15},w:1}; } const P=pin(); return P?{t:P,w:1-v186sSm(0.62,0.88,u)}:null; }
    const top={f:ball.f-0.03,u:rb*2-0.03,l:ball.l}; let t;
    if(u<0.24) t=v186sKey([[0,B.f,B.u,B.l],[0.14,(B.f+top.f)/2,top.u+0.06,(B.l+top.l)/2],[0.24,top.f,top.u,top.l]],u);
    else if(u<0.58) t={f:top.f,u:top.u-0.04*v186sSm(0.3,0.58,u),l:top.l};
    else t=v186sKey([[0.58,top.f,top.u-0.04,top.l],[0.7,top.f-0.1,0.1,top.l+sd*0.06],[0.9,B.f,B.u,B.l]],u);
    if(!base) return t; return {t,w:1}; }
  if(k==='cruyff'){ const iK=sc>0?0:1; if(i!==iK){ if(u<0.14){ const a=v186sSm(0,0.14,u); return {t:{f:lerp(B.f,0.3,a),u:B.u*(1-a)+0.05*Math.sin(Math.PI*a),l:lerp(B.l,sc*0.17,a)},w:1}; } if(u<0.72){ const P=pin(); return {t:P||{f:0.3,u:0,l:sc*0.17},w:1}; } const P=pin(); return P?{t:P,w:1-v186sSm(0.72,0.92,u)}:null; }
    const pd=[-0.7,0.7*sc], gap=rb+0.06; const c={f:ball.f-pd[0]*gap,u:0.06,l:ball.l-pd[1]*gap}; let t;
    if(u<0.34) t=v186sKey([[0,B.f,B.u,B.l],[0.34,-0.42,0.38,-sc*0.1]],u);
    else if(u<0.46) t=v186sKey([[0.34,-0.42,0.38,-sc*0.1],[0.46,c.f,c.u,c.l]],u);
    else if(u<0.62) t=c;
    else t=v186sKey([[0.62,c.f,c.u,c.l],[0.92,B.f,B.u,B.l]],u);
    if(!base) return t; return {t,w:1}; }
  return base?null:B; }

/* ---------- the pose layer: carrier and defender ---------- */
const _v186sPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v186sPose.apply(this,arguments);
  if(isRef||!P||!p||!V186S.on||this.rm||!P.feet||!P.feet[0]||!P.feet[1]) return P;
  if(p.v186k) v186sPoseC(this,p,P); else if(p.v186rT!=null&&this.now-p.v186rT<(p.v186rd||420)) v186sPoseD(this,p,P);
  return P; };
function v186sPoseC(st,p,P){ if(P.act!=='loco'&&P.act!=='idle') return; if(v186sTackling(p,st.now)) return;
  const kt=st.now-(p.kickT||-9e9); if(kt>=0&&kt<(p.kickW||0)+(p.kickF||260)) return;
  const C=v186sClock(st,p); if(!C||C.u<=0||C.u>=1) return; const env=v186sEnv(st,p,C.u); if(!(env>0)) return;
  const k=p.v186k, M=V186S_MV[k], q=p.v186q||0, A=0.55+0.45*q, sf=p.v186sf, sg=-sf, Dd=p.v186dd||0.5, m=C.m, u=C.u; const F=P.feet, H=P.hands;
  for(const i of [0,1]){ const r=v186sFootPlan(st,p,i,M.turn?u:m,F[i]); if(!r||!r.t) continue; const w=clamp(r.w*env,0,1); if(!(w>0)) continue; const b=F[i];
    F[i]={f:lerp(b.f,r.t.f,w),u:Math.max(0,lerp(b.u,r.t.u,w)),l:lerp(b.l,r.t.l,w)}; }
  /* body: roll (+ = head to his right), hip height, lean, head */
  let roll=0, hip=0, lean=0, ht=0, tilt=0; const hipK=0.6+0.4*q, wide=0.1*(1-q);
  const hand=(i,f,uu,l,w)=>{ if(!(w>0)) return; const h=H[i]; H[i]={f:lerp(h.f,f,w),u:lerp(h.u,uu,w),l:lerp(h.l,l+(i?1:-1)*wide,w)}; };
  if(!M.turn){ const land=(k==='step2'?1.5:1)-Dd, go=M.go+0.72*(1-Dd);
    const sell=v186sBump(m,(k==='step2'?0.5:0)+0.05,land,land+0.08,go+0.05); const drive=v186sBump(m,go-0.05,go+0.12,go+0.3,p.v186nc||1.75);
    roll=-sf*(k==='roll'?0.06:k==='feint'?0.11:0.13)*A*sell+sf*0.07*drive; hip=-(k==='feint'?0.05:0.07)*hipK*sell; lean=0.04*sell+0.08*drive; ht=sf*0.32*sell-sf*0.16*drive; tilt=0.14*sell;
    if(k==='step2'){ const s0=v186sBump(m,0.05,1-Dd,1.02-Dd,0.62); roll+=sf*0.08*A*s0; ht-=sf*0.18*s0; }
    const iF=sf>0?1:0; hand(iF,0.12,1.02,(iF?1:-1)*(0.42+0.1*A),sell); hand(1-iF,0.16,1.12,(iF?-1:1)*0.2,sell*0.6); }
  else { const sc=sf;
    if(k==='cut'){ const s=v186sBump(u,0.1,0.35,0.55,0.85); roll=-sc*0.1*A*s; hip=-0.06*hipK*s; lean=0.04*s; ht=sc*0.3*s; tilt=0.12*s; hand(sc>0?0:1,0.1,1.2,(sc>0?-1:1)*0.5,s); }
    else if(k==='chop'){ const a=v186sBump(u,0,0.3,0.45,0.8), d=v186sBump(u,0.5,0.62,0.75,0.95); hip=-0.14*hipK*a; lean=lerp(0.1,-0.08,v186sSm(0,0.3,u))*a+0.12*d; roll=-sc*0.12*A*v186sBump(u,0,0.3,0.55,0.8); tilt=0.2*a; ht=sc*0.25*v186sBump(u,0.3,0.45,0.6,0.85);
      const iR=sc>0?0:1; hand(iR,0.1,1.25,(iR?1:-1)*0.55,a); hand(1-iR,-0.05,1.1,(iR?-1:1)*0.45,a); }
    else if(k==='drag'){ const a=v186sBump(u,0,0.25,0.6,0.85); lean=-0.12*a; hip=-0.08*hipK*a; tilt=0.3*v186sBump(u,0.1,0.3,0.55,0.75); roll=-sc*0.05*a; hand(0,0.25,1.15,-0.42,a); hand(1,0.25,1.15,0.42,a); }
    else if(k==='cruyff'){ const iK=sc>0?0:1; const fk=v186sBump(u,0,0.3,0.42,0.6); const hk=v186sBump(u,0.35,0.45,0.6,0.85);
      lean=-0.06*fk+0.06*hk; tilt=0.25*fk; roll=-sc*0.08*A*hk; hip=-0.06*hipK*hk-0.03*fk; ht=sc*0.3*hk;
      hand(1-iK,0.22,1.42,(iK?-1:1)*0.62,fk); hand(iK,-0.32,1.18,(iK?1:-1)*0.36,fk); hand(1-iK,0.1,1.2,(iK?-1:1)*0.5,hk*(1-fk)); } }
  P.hipU+=hip*env; P.lean+=lean*env; P.headTurn=(P.headTurn||0)+ht*env; P.headTilt=(P.headTilt||0)+tilt*env;
  /* the first-person replay camera sits in his head: no body roll for him there */
  const Q=st._rp; if(Q&&Q.two&&Q.cam==='eyes'&&Q.sc===p) roll=0;
  if(P.act==='idle') P.act='loco';
  P.v186rb=roll*env; P.v186rw=env; }
function v186sPoseD(st,p,P){ if(P.act!=='loco'&&P.act!=='idle') return; if(v186sTackling(p,st.now)) return;
  const t=st.now-p.v186rT, D=p.v186rd||420; const x=t/D; const w=smooth(x/0.18)*(1-smooth((x-0.62)/0.38)); if(!(w>0)) return;
  const kind=p.v186rk, b=p.v186rb||0, yaw=v186sYaw(p); const a=v186sAng(p.v186rs-yaw); const df=Math.cos(a), dl=Math.sin(a); const side=dl>=0?1:-1;
  const F=P.feet, H=P.hands; const set=(i,f,u,l,ww)=>{ const o=F[i]; F[i]={f:lerp(o.f,f,ww),u:Math.max(0,lerp(o.u,u,ww)),l:lerp(o.l,l,ww)}; };
  const hd=(i,f,u,l,ww)=>{ const o=H[i]; H[i]={f:lerp(o.f,f,ww),u:lerp(o.u,u,ww),l:lerp(o.l,l,ww)}; };
  /* the ball, for his eyes */
  const bb=v184Body(p,st.ball.x,st.ball.y,st); const look=clamp(Math.atan2(bb[1],Math.max(0.2,bb[0])),-0.9,0.9);
  let roll=0;
  if(kind==='sold'){ const i=side>0?1:0; set(i,0.06+df*0.22*b,0,side*(0.12+0.34*b),w); set(1-i,-0.04,0,-side*0.1,w*0.6); P.hipU-=0.1*b*w; P.lean-=0.05*w; roll=-side*0.15*b*w;
    hd(0,0.12,1.18,-0.5,w); hd(1,0.12,1.18,0.5,w); P.headTurn=(P.headTurn||0)+look*0.6*w; }
  else if(kind==='freeze'){ set(0,0.0,0,-0.19,w); set(1,0.04,0,0.19,w); P.hipU-=(0.05+0.05*b)*w; P.lean-=0.07*w; roll=-side*0.06*b*w; hd(0,0.16,1.12,-0.42,w); hd(1,0.16,1.12,0.42,w); P.headTurn=(P.headTurn||0)+look*0.5*w; }
  else if(kind==='turned'){ const c=v186sBump(x,0.05,0.3,0.55,0.85); const i=side>0?0:1; set(i,0.1,0.06,side*0.06,c*w); P.hipU-=0.06*w; P.lean-=0.05*w; roll=-Math.sign(look||1)*0.1*w; P.headTurn=(P.headTurn||0)+look*w; hd(0,0.1,1.15,-0.4,w*0.7); hd(1,0.1,1.15,0.4,w*0.7); }
  else { P.headTurn=(P.headTurn||0)+look*0.5*w; P.hipU-=0.03*w; }
  if(P.act==='idle') P.act='loco';
  P.v186rb=roll; P.v186rw=w; }

/* body roll: 2-D draws P.rot in the screen plane, 3-D (63) rolls about the body's forward axis, signed by vy for 'loco' poses;
   the blended rot is set here in the same call the painters read it in, so it never flickers */
const _v186sBlend=Stage.prototype.blendPose;
Stage.prototype.blendPose=function(p,P){ const Q=_v186sBlend.apply(this,arguments); if(!P||P.v186rw==null||!Q) return Q; const w=clamp(P.v186rw,0,1), rb=P.v186rb||0;
  let r; if(v184Is3D(this)) r=Q.act==='loco'?rb*((p.vy||0)>=0?1:-1):rb; else r=rb*Math.sin(v186sYaw(p));
  Q.rot=lerp(Q.rot||0,r,w); return Q; };

/* roster changes: ratings cache cleared */
const _v186sSides=Stage.prototype.setSides;
Stage.prototype.setSides=function(){ this._v186R=null; return _v186sSides.apply(this,arguments); };

/* ---------- lab: 'skills' (Varsity star against a 50 defender) and 'skillsmod' (Modified 40 against 45) ---------- */
LAB_SCENES.push(['skills','Skill moves (Varsity star)'],['skillsmod','Skill moves (Modified)']);
const V186S_LABSEQ=['feint','step1','step2','roll','cut','chop','drag','cruyff'];
const _v186sLabRun=labRun;
labRun=function(scen){ const r=_v186sLabRun.apply(this,arguments); if(scen!=='skills'&&scen!=='skillsmod') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    const P=[...st.players.values()]; const A=P.filter(p=>p.side===0), B=P.filter(p=>p.side===1); const fw=A[9], def=B[3];
    const star=scen==='skills'; st._v186lab=true; st.demoCalm=false; st._v186R=null;
    fw.v186fl=star?95:40; fw.v186lv=star?'V':'MOD'; def.v186ds=star?50:45; def.v186lv=star?'V':'MOD';
    /* everyone else out of the way, holding shape */
    for(const q of P){ if(q!==fw&&q!==def&&!q.gk){ q.ov={x:q.side===0?20+q.y*0.2:85+q.y*0.1,y:q.y}; } }
    let n=0; const seq=st._v186seq||V186S_LABSEQ;
    while(alive()){ const k=seq[n++%seq.length]; const known=v186sKnows(k,fw.v186lv,fw.v186fl); st._v186force=known?k:null; st._v186forceK=k; st.zoomTo(0.42); st.focus=null;
      await st.gain(fw); if(!alive()) return; fw.x=46; fw.y=44; fw.vx=0; fw.vy=0; fw.ov={x:47,y:44}; def.x=V186S_MV[k].turn?57.5:60; def.y=44; def.ov=null; def.vx=0; def.vy=0; def.v186rT=null; st.cam.x=58;
      await st.wait(st.D(500)); if(!alive()) return;
      if(!V186S_MV[k].turn){ def.ov={x:59,y:44}; const g=st.dribble(fw,70,44.5,2400); await st.until(()=>Math.hypot(fw.x-def.x,fw.y-def.y)<4.2,3000); def.ov=null; await g; }
      else { const ty=k==='cut'?{x:58,y:36}:k==='chop'?{x:47,y:38}:{x:44,y:44.3}; await st.dribble(fw,54,44,900); if(!alive()) return; await st.dribble(fw,ty.x,ty.y,1600); }
      if(!alive()) return; fw.ov={x:fw.x,y:fw.y}; await st.wait(st.D(900)); }
    st._v186force=null; }); };
