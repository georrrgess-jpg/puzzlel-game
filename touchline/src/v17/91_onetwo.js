/* ===================== v18.11: the give-and-go (one-two) (91) =====================
   Presentation only: engine.js, results, the events and their order are untouched.
   A plays a firm pass into a teammate B and is gone past his marker as it leaves his boot; B returns it first time (a quick
   wall pass: a short wind-up, no touch to settle) into A's path; A collects at full speed. The marker reacts late: he holds
   for a beat watching the ball, then turns and chases (the stage's trail chase, at normal pace, so A pulls clear).
   1. Goal sequences: an open-play goal whose engine sequence ends X pass > B pass > A shot (B != A, the pass 7-30 m from
      the shot) is shown as X > A > B > A for a deterministic share (v1811oPick: hash of minute, scorer, score, side), so live,
      replays, highlight clips and TouchlineTV show the same goal. The extra touch (X finds A, who plays it straight on) takes
      the place of B's settling dribble and A's give is first time, so the sequence spends about the time it did.
      Done by handing the base loop a sequence with A's give inserted (e.seq is restored at the first touch, before anything
      reads it again) and steering three of its calls: launch (firm give, wall-pass return, caption), dribble (no settling
      touch for A's give or B's lay-off) and windOf (the wall pass's short wind-up).
   2. Open play (live, 1x and 2x, minutes with no shot, offside or card in them, early in the minute so it fits the minute):
      now and then the carrier's dribble leg becomes a one-two with a teammate ahead of him; the ball ends with him, as the
      dribble would have left it.
   Goals shown with a one-two are tagged e.sty='onetwo' ("One-two finish") when 88 would show nothing special (no sty, or a
   plain driven or side-footed finish); simulated goals get the same pick in finishMatch. Caption 'ONE-TWO!', and a line on
   the goal's commentary. Lab scene 'onetwo'. Switch V1811O.on; forced: st._v1811oForce / V1811O.force.
   Globals: v1811o* / V1811O. */
const V1811O={on:true,force:false,pGoal:0.4,pOpen:0.3,log:[],n:{goal:0,open:0}};
function v1811oH(s){ return typeof v17h01==='function'?v17h01(s):(hashStr(String(s))%10007)/10007; }
function v1811oLog(o){ const L=V1811O.log; L.push(o); if(L.length>400) L.splice(0,L.length-400); }
const V1811O_NO=['pen','fk','corner','header','cross','break','solo'];
/* the shape: ... X pass, B pass, A shot (pure: the engine's seq only) */
function v1811oShape(e){ const q=e&&e.seq; if(!e||e.t!=='goal'||!Array.isArray(q)||q.length<3||V1811O_NO.includes(e.ty)) return null;
  const n=q.length, S=q[n-1], B=q[n-2], X=q[n-3]; if(!S||!B||!X||S.a!=='shot'||B.a!=='pass'||X.a!=='pass') return null;
  if(S.pid!==e.pid||B.pid===S.pid||X.pid===S.pid||X.pid===B.pid) return null;
  const d=Math.hypot((S.x-B.x)*0.68,(S.y-B.y)*1.05); if(d<7||d>30||S.y<64) return null; return {i:n-2,S,B,X}; }
function v1811oPick(e){ return !!v1811oShape(e)&&v1811oH(['o2',e.m,e.pid,Array.isArray(e.sc)?e.sc.join('-'):e.sc,e.s].join(':'))<V1811O.pGoal; }
/* a live position in seq coordinates (livePos inverted) */
function v1811oSeqPos(s,X,Y){ return s===0?{x:Y/68*100,y:X/105*100}:{x:(68-Y)/0.68,y:(105-X)/1.05}; }

if(typeof V188G!=='undefined'){ V188G.name.onetwo='One-two finish'; V188G.verb.onetwo='finished off a slick one-two'; V188G.pts.onetwo=1.5; }

/* the defender A beats: he steps up goal-side of A as the ball comes to him */
Stage.prototype.v1811oMarkUp=function(O){ const A=O.A, s=A.side, dir=s===0?1:-1; let M=O.M;
  if(!M){ let bd=1e9; for(const q of this.players.values()){ if(q.side===s||q.off||q.gk) continue; const d=Math.hypot(q.x-O.G.x,q.y-O.G.y); if(d<bd){ bd=d; M=q; } } if(bd>20) M=null; O.M=M; }
  if(M&&!M.chase){ M.trail=null; M.ov={x:clamp(O.G.x+dir*2.1,2,103),y:clamp(O.G.y-O.out*0.7,2,66)}; O.mov=M.ov; } };
/* A has played it into B: he goes (round the outside of his marker, then into the space beyond); the marker is late */
Stage.prototype.v1811oGo=function(O){ const st=this, A=O.A, M=O.M, s=A.side, dir=s===0?1:-1; O.relT=this.now; O.a0={x:A.x,y:A.y};
  const W1={x:clamp(A.x+dir*3.4,2,103),y:clamp(A.y+O.out*1.7,2,66)}; A.hurry=true; A.ov=W1; O.aov=W1;
  this.until(()=>!st._v1811o||st._v1811o!==O||Math.hypot(A.x-W1.x,A.y-W1.y)<1.4||A.ov!==W1, this.D(700)+200).then(()=>{ if(st._v1811o===O&&A.ov===W1&&O.R){ A.ov={x:O.R.x,y:O.R.y}; O.aov=A.ov; } });
  if(M){ const hold={x:M.x,y:M.y}; M.ov=hold; O.mov=hold; if(this.ball) this.look(M,O.B.x,O.B.y,this.D(400));
    this.wait(Math.max(120,this.D(300))).then(()=>{ if(st._v1811o!==O||M.ov!==hold) return; M.ov=null; O.mov=null; M.trail={p:A,ahead:-1.2,dy:-O.out*0.5}; O.trail=M.trail; O.lateT=st.now; }); }
  this.look(O.B,lerp(A.x,O.R?O.R.x:A.x,0.6),lerp(A.y,O.R?O.R.y:A.y,0.6),this.D(500)); };
Stage.prototype.v1811oClean=function(O){ if(!O) return; const A=O.A, M=O.M, B=O.B;
  if(M){ if(O.trail&&M.trail===O.trail) M.trail=null; if(O.mov&&M.ov===O.mov) M.ov=null; }
  if(A){ if(O.open) A.hurry=false; if(O.aov&&A.ov===O.aov&&O.open) A.ov=null; }
  if(B&&O.bov&&B.ov===O.bov) B.ov=null;
  if(this._v1811oWallP) this._v1811oWallP=null; if(O.seq0&&O.e&&O.e.seq!==O.seq0) O.e.seq=O.seq0; };
function v1811oRestore(O){ if(O&&O.seq0&&O.e&&O.e.seq!==O.seq0) O.e.seq=O.seq0; }

/* ---------- launch / dribble / windOf: the three moments ---------- */
const _v1811oLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ const O=this._v1811o; if(!O||!p||!opt||!opt.home||this.skip) { if(O) v1811oRestore(O); return _v1811oLaunch.apply(this,arguments); }
  v1811oRestore(O); const st=this;
  try{
    if(O.ph===0&&opt.home===O.A&&p!==O.B){ O.ph=1; this.v1811oMarkUp(O); if(O.Bs){ O.B.ov={x:O.Bs.x,y:O.Bs.y}; O.bov=O.B.ov; } O.A.hurry=true; O.A.ov={x:O.G.x,y:O.G.y};
      /* X waits a beat on the ball while A comes short and B gets up to be the wall (B's settling touch is not played) */
      const A=O.A, B=O.B, G=O.G, W=O.Bs; const ready=()=>Math.hypot(A.x-G.x,A.y-G.y)<3.5&&(!W||Math.hypot(B.x-W.x,B.y-W.y)<4);
      if(!ready()) return this.until(()=>ready()||this.own!==p, Math.max(250,this.D(800))).then(()=>{ O.waitMs=st.now-O.t0; return _v1811oLaunch.call(st,p,opt); }); }
    else if(O.ph<=1&&p===O.A&&opt.home===O.B){ O.ph=2; const or=opt.onRelease; O.bov=O.Bs?{x:O.Bs.x,y:O.Bs.y}:{x:O.B.x,y:O.B.y}; O.B.ov=O.bov;
      if(!O.M) this.v1811oMarkUp(O);
      opt={...opt,dur:opt.dur*0.84,h:Math.min(opt.h||0.2,0.3),hFn:null,onRelease:f=>{ try{ st.v1811oGo(O); }catch(e){} if(or) or(f); }};
      v1811oLog({k:"give",ax:+O.A.x.toFixed(1),bx:+O.B.x.toFixed(1),gx:+O.G.x.toFixed(1),bsx:O.Bs?+O.Bs.x.toFixed(1):null,a:O.A.pid,b:O.B.pid,m:O.M?O.M.pid:null,t:this.now,goal:!!O.e}); }
    else if(O.ph===2&&p===O.B&&opt.home===O.A){ O.ph=3; const or=opt.onRelease; this._v1811oWallP=p;
      opt={...opt,h:Math.min(opt.h||0.2,0.3),hFn:null,onRelease:f=>{ O.retT=st.now; O.ret=f; st.onCaption('ONE-TWO!','set'); st.hype=Math.max(st.hype||0,0.25); if(or) or(f); }};
      const r=_v1811oLaunch.call(this,p,opt); if(this._v1811oWallP===p) Promise.resolve(r).then(()=>{ if(st._v1811oWallP===p) st._v1811oWallP=null; },()=>{});
      return r; }
  }catch(e){ v1811oLog({k:'err',e:String(e)}); }
  return _v1811oLaunch.call(this,p,opt); };
const _v1811oWind=Stage.prototype.windOf;
Stage.prototype.windOf=function(kk){ const w=_v1811oWind.apply(this,arguments); if(this._v1811oWallP&&kk==='pass'){ this._v1811oWallP=null; return Math.min(w,this.D(45)); } return w; };
/* the return pass reaches A: where the ball is against his boot, and whether he is past his marker */
const _v1811oLand=Stage.prototype.land;
Stage.prototype.land=function(){ const f=this.fl, O=this._v1811o;
  if(O&&f&&O.ret===f&&!f.phys&&!this.skip){ try{ const A=O.A, ft=this.footOf(A), b=this.ball, M=O.M, dir=A.side===0?1:-1;
      O.got={d:Math.hypot(b.x-ft.x,b.y-ft.y),beyond:M?dir*(A.x-M.x):null,run:O.a0?Math.hypot(A.x-O.a0.x,A.y-O.a0.y):null,spd:(A.spd||0)/Math.max(1,this.spdMul||1),late:O.lateT!=null};
      V1811O.n[O.e?'goal':'open']++; v1811oLog({k:'got',a:A.pid,goal:!!O.e,...O.got,t:this.now}); }catch(e){} }
  return _v1811oLand.apply(this,arguments); };

const _v1811oDrib=Stage.prototype.dribble;
Stage.prototype.dribble=function(p,x,y,ms){ const O=this._v1811o;
  if(O){ v1811oRestore(O); if(!this.skip&&!O.open&&((p===O.A&&O.ph===1)||(p===O.B&&O.ph===2))) return Promise.resolve(); return _v1811oDrib.apply(this,arguments); }
  const PM=this._v1811oPM;
  if(PM&&PM.ok&&!this.skip&&p&&this.own===p&&!this.hands&&!p.gk&&!this.so&&!this.demo&&V1811O.on&&!this._v186gs){
    const force=this._v1811oForce||V1811O.force; const el=this.now-PM.start; const Z=V1811O.st||(V1811O.st={legs:0,early:0,roll:0,find:0}); Z.legs++; if(el<PM.W*0.6) Z.early++;
    /* never longer than the dribble leg it replaces may take (its own time cap), and only in the first half of the minute */
    if((force||Math.random()<V1811O.pOpen)&&el<PM.W*0.6){ Z.roll++; const pick=this.v1811oFind(p); if(pick) Z.find++; const cap=Math.max(this.D(ms||300)+300,this.eta(p,x,y,0.88)+250);
      if(pick&&this.v1811oEst(p,pick.B)<=cap){ V1811O.n.try=(V1811O.n.try||0)+1; return this.v1811oOpen(p,pick.B,pick.M,x,y,ms); } } }
  return _v1811oDrib.apply(this,arguments); };
/* a teammate 6-16 m ahead with a clear lane, and the opponent closest to the carrier as his marker */
Stage.prototype.v1811oFind=function(A){ const dir=A.side===0?1:-1; let B=null, bs=-1e9, M=null, md=1e9;
  for(const q of this.players.values()){ if(q===A||q.off||q.gk) continue;
    if(q.side===A.side){ const fx=dir*(q.x-A.x), d=Math.hypot(q.x-A.x,q.y-A.y); if(fx<2.5||d<5||d>18||Math.abs(q.y-A.y)>14||(dir*(q.x-52.5)>44)) continue; if(this.laneBlock(A,q)>1) continue; const sc=-Math.abs(d-10)+fx*0.3; if(sc>bs){ bs=sc; B=q; } }
    else { const d=Math.hypot(q.x-A.x,q.y-A.y); if(d<md){ md=d; M=q; } } }
  if(!B||!M||md>12) return null; return {B,M}; };
Stage.prototype.v1811oEst=function(A,B){ const d=Math.hypot(B.x-A.x,B.y-A.y); return this.D(340)*clamp(d/14,0.6,1.15)*0.84+this.windOf('pass')+Math.max(55,this.D(45))+this.D(360)*clamp(d/14,0.6,1.2)+60; };
/* open play: A gives, runs, takes the return in his stride and carries on along the leg */
Stage.prototype.v1811oOpen=async function(A,B,M,x,y,ms){ const dir=A.side===0?1:-1; const out=Math.sign(A.y-B.y)||1;
  const R={x:clamp(B.x+dir*4.5,3,102),y:clamp(B.y+out*3.2,3,65)};
  const O={open:true,A,B,M,X:null,e:null,ph:1,out,G:{x:A.x,y:A.y},R,t0:this.now}; this._v1811o=O; this.v1811oMarkUp(O);
  try{ const d=Math.hypot(B.x-A.x,B.y-A.y);
    await this.launch(A,{home:B,dur:this.D(340)*clamp(d/14,0.6,1.15),h:0.2});
    if(this.own!==B||this.skip||this._v1811o!==O) return;
    const d2=Math.hypot(A.x-B.x,A.y-B.y); await this.launch(B,{home:A,dur:this.D(360)*clamp(d2/14,0.6,1.2),h:0.15});
    if(this.own!==A||this.skip) return; A.hurry=false;
    const ex=clamp(A.x+dir*4,4,101), ey=clamp(lerp(A.y,y,0.3),3,65); this._v1811o=null; this.v1811oClean(O);
    await _v1811oDrib.call(this,A,ex,ey,Math.min(ms||300,260)); }
  finally{ if(this._v1811o===O) this._v1811o=null; this.v1811oClean(O); } };

/* ---------- goal sequences ---------- */
Stage.prototype.v1811oGoalOn=function(e){ if(!V1811O.on||this.so||this.demo||this.skip||!e||e.t!=='goal') return null;
  const sh=v1811oShape(e); if(!sh) return null; if(!(this._v1811oForce||V1811O.force)&&!v1811oPick(e)) return null;
  const A=this.pl(sh.S.pid), B=this.pl(sh.B.pid), X=this.pl(sh.X.pid); if(!A||!B||!X||A.off||B.off||A.gk||B.gk) return null; return sh; };
const _v1811oGoal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(e){ let O=null;
  try{ const sh=this.v1811oGoalOn(e); if(sh){ const s=e.s, dir=s===0?1:-1, A=this.pl(sh.S.pid), B=this.pl(sh.B.pid); const [sx,sy]=livePos(s,sh.S.x,sh.S.y);
      /* the wall (W) and the give (G) are set from where A and B are now: each goes about half way, W 9 m ahead of G */
      const shotX=sx-dir*7; const mx=(A.x+B.x)/2; let wx=mx+dir*4.5; if(dir*(wx-shotX)>0) wx=shotX; wx=clamp(wx,8,97); const gx=clamp(wx-dir*9,5,100);
      const wy=clamp(lerp(B.y,sy,0.25),6,62); let out=Math.sign(A.y-wy)||Math.sign(sy-wy)||1; const gy=clamp(wy+out*Math.max(5,Math.min(10,Math.abs(A.y-wy))),5,63); out=Math.sign(gy-wy)||out;
      const g=v1811oSeqPos(s,gx,gy);
      O={open:false,e,Bs:{x:wx,y:wy},A,B,X:this.pl(sh.X.pid),M:null,ph:0,G:{x:gx,y:gy},R:{x:sx,y:sy},out,seq0:e.seq,t0:this.now};
      const q=e.seq.slice(); q.splice(sh.i,0,{pid:sh.S.pid,x:g.x,y:g.y,a:'pass'}); e.seq=q; this._v1811o=O; } }catch(err){ O=null; v1811oLog({k:'err',e:String(err)}); }
  try{ return await _v1811oGoal.apply(this,arguments); }
  finally{ if(O){ if(this._v1811o===O) this._v1811o=null; this.v1811oClean(O); if(O.e.seq!==O.seq0) O.e.seq=O.seq0; } } };

/* ---------- open play in live minutes ---------- */
const _v1811oPM=Stage.prototype.playMinute;
Stage.prototype.playMinute=function(out,M,W){ const ok=!(out||[]).some(e=>e&&(e.t==='save'||e.t==='miss'||e.t==='offside'||e.t==='yellow'||e.t==='red'||e.t==='goal'))&&W>=700;
  const PM={start:this.now,W,ok:ok&&(!!this.relabel||!!this._v1811oForce)}; this._v1811oPM=PM; const r=_v1811oPM.apply(this,arguments);
  Promise.resolve(r).then(()=>{ if(this._v1811oPM===PM) this._v1811oPM=null; },()=>{ if(this._v1811oPM===PM) this._v1811oPM=null; }); return r; };
/* the playMinute start is after its tapOff: re-anchor the clock at the first leg */
const _v1811oTap=Stage.prototype.tapOff;
if(typeof _v1811oTap==='function') Stage.prototype.tapOff=function(){ const PM=this._v1811oPM; const r=_v1811oTap.apply(this,arguments); if(PM) Promise.resolve(r).then(()=>{ if(this._v1811oPM===PM&&!PM.tapped){ PM.tapped=1; PM.start=this.now; } },()=>{}); return r; };

/* ---------- names, tags, commentary ---------- */
if(typeof liveEmit==='function'){ const _v1811oLive=liveEmit;
  liveEmit=function(e){ try{ const st=App.live&&App.live.stage, O=st&&st._v1811o; if(st&&st.relabel&&!st.skip&&e&&e.t==='goal'&&O&&O.e===e&&O.ph>=3){ O.shown=1;
        if(e.sty==null){ const k=typeof st.v188gShown==='function'?st.v188gShown(e):''; if(!k||k==='drive'||k==='place') e.sty='onetwo'; } } }catch(err){}
    return _v1811oLive.apply(this,arguments); }; }
if(typeof feedPush==='function'){ const _v1811oFeed=feedPush;
  feedPush=function(e,quiet){ const r=_v1811oFeed.apply(this,arguments);
    try{ const L=typeof App!=='undefined'&&App.live, st=L&&L.stage, O=st&&st._v1811o; if(!quiet&&V1811O.on&&O&&O.e===e&&O.ph>=3&&e.t==='goal'&&L.feed&&L.feed[0]&&L.feed[0].cls==='goal'&&!L.feed[0].v1811o){
        L.feed[0].v1811o=1; const nm=typeof Px==='function'?esc(pname(Px(O.B.pid))):'his teammate'; L.feed[0].txt+=` A one-two with ${nm}, played first time into his path!`; } }catch(err){}
    return r; }; }
if(typeof finishMatch==='function'){ const _v1811oFinish=finishMatch;
  finishMatch=function(C,M){ try{ const f=C&&M&&C.fixtures[M.fid]; if(f&&f.st!=='d'&&M.ev) for(const e of M.ev){ if(e.t==='goal'&&e.sty==null&&v1811oPick(e)) e.sty='onetwo'; } }catch(err){}
    return _v1811oFinish.apply(this,arguments); }; }

/* ---------- the lab: a forced one-two into a goal, then one in open play ---------- */
LAB_SCENES.push(['onetwo','One-two (give-and-go)']);
const _v1811oLabRun=labRun;
labRun=function(scen){ const r=_v1811oLabRun.apply(this,arguments); if(scen!=='onetwo') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st; st._v1811oForce=true;
    const A=[...st.players.values()].filter(p=>p.side===0); const fw=A[9], wing=A[8], mid=A[7], cm=A[6]; let i=0;
    while(alive()){ const k=window.__v1811oOnly||(i%2?'open':'goal'); const top=(i>>1)%2===0; i++; st.zoomTo(0.55); st.cam.w=st.cam.tw;
      if(k==='goal'){ const e={s:0,pid:fw.pid,t:'goal',ty:'open',seq:[{pid:cm.pid,x:50,y:44,a:'pass'},{pid:mid.pid,x:top?44:56,y:70,a:'pass'},{pid:fw.pid,x:top?58:42,y:86,a:'shot'}],sc:[1,0],m:10+i};
        st.clipStart(e); await st.goalSequence(e); }
      else { st.cam.x=60; await st.gain(mid); if(!alive()) return; mid.x=mid.tx=48; mid.y=mid.ty=top?26:42; mid.ov=null; fw.ov={x:59,y:top?30:38}; fw.x=58; fw.y=top?30:38;
        const d=[...st.players.values()].find(q=>q.side===1&&!q.gk); for(const q of st.players.values()) if(q.side===1&&!q.gk&&q!==d) q.ov=null; if(d){ d.x=51; d.y=mid.y+(top?1:-1); d.ov=null; }
        await st.wait(st.D(300)); fw.ov=null; if(!alive()) return; const M=d||st.nearest(1,mid.x,mid.y);
        await st.v1811oOpen(mid,fw,M,mid.x+8,mid.y,300); await st.wait(st.D(500)); }
      if(!alive()) return; await st.wait(st.D(700)); } }); };
