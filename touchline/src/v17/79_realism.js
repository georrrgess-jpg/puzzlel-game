/* ===================== v18.6 A: simulation realism =====================
   Presentation only: engine.js, results, event order and RNG streams are untouched.
   1. Offside (the engine emits {t:'offside',pid} with no position; the stage paints the picture):
      - the same sequence at every speed (playMinute no longer sends 4x/8x to quickFlag);
      - the passer holds the ball and the defending team holds its shape (the back line steps up a metre: the trap), so the line is
        still while the runner goes; the runner's target follows the live line each frame (line + 1.2..2.6 m);
      - the pass is played only when he is beyond the second-last defender (keeper counted), the ball and halfway; the
        check is repeated at the instant of release, and only then is the freeze frame drawn;
      - the freeze frame: the amber defender line at the line as it was at release, a solid red-and-white attacker line
        where he was at release, and a shaded band between them, in 2-D broadcast and sideline, Tactical and 3-D; the holds
        last while the lines are on screen and are released on every exit path (try/finally);
      - with no truthful picture (no carrier could be found, the ball was lost, timeout, skip) the call is shown with the
        flag, whistle and caption but no freeze line: the stage never claims a position it did not show.
   2. Throw-ins: never given to the team that put the ball out unless a visible block by an opponent sent it out.
   3. Misses: scaled by distance and the shooter's finishing (R5): a tap-in miss is just wide or scuffed just over, a poor
      finisher from range sprays it; over stays over and wide stays wide, so the caption and the keeper's dive still match.
   4. Commentary: miss and save lines match what the broadcast showed (e._how: over, wide, post, bar, catch, parry, tip;
      another unit may set e._how itself and it is honoured). Untagged events keep today's line. */

/* the second-last opponent of the attacking side (keeper counted), without the ball and halfway */
function v186rDefLine(st,att){ const xs=[]; for(const q of st.players.values()) if(q.side!==att&&!q.off) xs.push(q.x);
  if(xs.length<2) return att===0?105:0; xs.sort((a,b)=>att===0?b-a:a-b); return xs[1]; }

/* playMinute as before, with one change: offsides use the full sequence at every speed (it needs awaiting) */
Stage.prototype.playMinute=async function(out,M,W){
  const start=this.now; this.skip=false; this.ts=clamp(W/1500,0.12,1.1); this._v186W=W; await this.tapOff();
  const touch=(M.touch||[]).map(t=>this.pl(t.pid)).filter(p=>p&&!p.off);
  const shots=out.filter(e=>e.t==='save'||e.t==='miss'); const cards=out.filter(e=>e.t==='yellow'||e.t==='red');
  const fast=W<300;
  const seq = fast? touch.slice(-1) : touch;
  let n=0; for(const t of seq){ if(this.skip) break; if(n++>0 && this.now-start>W*0.55) break;
    const p=this.sensible(t); if(!p) continue; await this.gain(p); if(!fast){ const dir=p.side===0?1:-1; await this.dribble(p, clamp(p.x+dir*(3+Math.random()*5),4,101), clamp(p.y+(Math.random()-.5)*6,3,65), 300); } }
  const offs=out.filter(e=>e.t==='offside');
  for(const e of offs){ if(this.skip) break; if(V186R.on) await this.offsideSeq(e); else if(W>=700) await this.offsideSeq(e); else this.quickFlag(e); }
  for(const e of shots){ if(this.skip) break; await this.shotSeq(e); }
  for(const e of cards){ if(this.skip) break; await this.cardSeq(e); }
  if(!fast&&W>=700&&!this.skip&&!shots.length&&!offs.length&&!cards.length){ const o=this.own; if(o&&!this.hands&&!o.gk&&(o.y<9||o.y>59)&&Math.random()<0.42){ const near=[...this.players.values()].some(q=>!q.off&&!q.gk&&q!==o&&Math.hypot(q.x-o.x,q.y-(o.y<34?0:68))<11); if(near) await this.throwIn(); } }
  const left=W-(this.now-start); if(left>0) await this.wait(left);
};

/* the call without a picture: flag, whistle and caption, no freeze line */
function v186rOffFallback(st,R,why){ const S=st._v186offStat||(st._v186offStat={calls:0,lines:0,fb:0}); S.fb++;
  if(!st.skip){ const ar=st.arFor(R.e.s); if(ar){ ar.flag='up'; ar.flagT=st.now; } st.blow('pen'); }
  st.emit(R.e); if(!st.skip) st.onCaption('OFFSIDE','set');
  v186rLog('off',{pid:R.e.pid,fb:why,m:R.e.m,skip:!!st.skip,diag:R.diag||null}); }

/* release every position this call held (only those still holding our own target) */
function v186rOffRelease(st,R){ for(const [q,ov] of R.holds){ if(q.ov===ov) q.ov=null; } R.holds.clear();
  const p=R.p; if(p){ p.hurry=false; p.offRun=false; if(R.pov&&p.ov===R.pov) p.ov=null; }
  if(st._v186off===R) st._v186off=null; if(R.focus&&st.focus===R.focus) st.focus=null; }

Stage.prototype.offsideSeq=async function(e){ const st=this, p=this.pl(e.pid);
  if(!p||p.off||this.skip){ this.emit(e); return; }
  const S=st._v186offStat||(st._v186offStat={calls:0,lines:0,fb:0}); S.calls++;
  const R={e,p,s:e.s,dir:e.s===0?1:-1,holds:new Map(),m:1.2+Math.random()*1.4,released:false,pov:null,focus:null};
  try{ await v186rOffRun(st,R); } finally{ v186rOffRelease(st,R); } };

async function v186rOffRun(st,R){ const {e,p,s,dir}=R; const W=st._v186W||1500;
  const bad=()=>{ const o=st.own; return !o||o.side!==s||o===p||st.hands||o.gk||st.fl; };
  /* the ball is worked to a teammate behind the line first (a give-and-go when the flagged man had it) */
  if(bad()||dir*(st.ball.x-v186rDefLine(st,s))>-3){ const L0=v186rDefLine(st,s); const bx=(dir>0?Math.min(p.x,L0):Math.max(p.x,L0))-dir*14;
    const m=st.nearest(s,clamp(bx,6,99),lerp(p.y,34,0.3),true,p); if(m&&st.own!==m) await st.gain(m); }
  if(st.skip) return v186rOffFallback(st,R,'skip');
  if(bad()) return v186rOffFallback(st,R,'nopasser');
  const o=st.own;
  /* freeze the picture: the passer holds the ball, the back line holds (one metre up: the trap) */
  const hold=(q,x,y)=>{ const ov={x,y}; q.ov=ov; R.holds.set(q,ov); };
  hold(o,o.x,o.y); const L=st.offLine(s);
  /* the back line holds (a jockeying hold: a slow sideways sway, x fixed); a line camped on its own goal line pushes out
     further (a runner cannot be shown beyond it inside the six-yard box). Midfielders and the keeper keep moving with the
     shape; update() keeps them off the held line (a midfielder never drops deeper than it, the keeper never comes past it) */
  const gx=s===0?105:0, push=clamp(dir*(L-(gx-dir*8)),1,8), band=Math.max(6,push+2); R.sway=[]; R.free=[]; R.hold=hold;
  for(const q of st.players.values()){ if(q.side===s||q.off) continue; const ahead=dir*(L-q.x);
    if(!q.gk&&ahead<band){ q.chase=null; q.trail=null; q.meet=null; hold(q,clamp(q.x-dir*push,2,103),q.y); R.sway.push({q,ov:q.ov,y:q.y,ph:Math.random()*6.283}); }
    else R.free.push(q); }
  /* the runner goes for the line; update() keeps his target at the live line + m */
  const oy=clamp(lerp(p.y,34,0.25),6,62); p.chase=null; p.meet=null; p.trail=null;
  R.pov={x:clamp(st.offLine(s)+dir*R.m,3,102),y:oy}; p.ov=R.pov; p.hurry=true; p.offRun=true; st._v186off=R;
  /* on a narrow (phone) view the camera sits nearer the line so the runner is not cut off at the edge */
  R.focus={x:st.W<560&&st.cam&&st.cam.w?clamp(st.offLine(s)-dir*Math.min(8,st.cam.w*0.22),0,105):(o.x+R.pov.x)/2}; st.focus=R.focus;
  const ok=()=>dir*(p.x-st.offLine(s))>=R.m-0.3&&dir*(p.x-st.ball.x)>=0.5;
  /* settled: every held back-liner is on his mark (x only: the sway is sideways) and the second-last defender has stopped
     moving up or down the pitch (within 0.1 m for 150 ms) */
  let dlX=null, dlT=0; const settled=()=>{ for(const b of R.sway){ if(b.q.ov===b.ov&&Math.abs(b.q.x-b.ov.x)>0.3) return false; }
    const dl=v186rDefLine(st,s); if(dlX==null||Math.abs(dl-dlX)>0.1){ dlX=dl; dlT=st.now; return false; } return st.now-dlT>=Math.max(60,st.D(150)); };
  await st.until(()=>st.own!==o||(ok()&&settled()), st.eta(p,R.pov.x,R.pov.y,1.3)*1.6+st.D(400));
  if(st.skip) return v186rOffFallback(st,R,'skip');
  if(st.own!==o) return v186rOffFallback(st,R,'lost');
  if(!ok()){ R.diag={mL:+(dir*(p.x-st.offLine(s))).toFixed(2),m:+R.m.toFixed(2),mB:+(dir*(p.x-st.ball.x)).toFixed(2),toT:+Math.hypot(p.x-R.pov.x,p.y-R.pov.y).toFixed(2),tx:+R.pov.x.toFixed(1),settled:settled()}; return v186rOffFallback(st,R,'timeout'); }
  /* the pass: the call is made, and the freeze frame drawn, only if he is beyond the line at the instant it is played */
  const ar=st.arFor(s); const d=dist2(o,p); let rel=null;
  await st.launch(o,{home:p,dur:st.D(560)*clamp(d/18,0.6,1.5),h:st.passH(o,p,d),onRelease:()=>{ R.released=true;
    const Lr=st.offLine(s), dl=v186rDefLine(st,s); rel={mL:dir*(p.x-Lr),mD:dir*(p.x-dl),mB:dir*(p.x-st.ball.x),half:dir*(p.x-52.5),L:Lr,dl,bx:st.ball.x,px:p.x,py:p.y,t:st.now};
    if(ar){ ar.flag='up'; ar.flagT=st.now; }
    if(rel.mL>=0.5&&rel.mD>=0.5&&rel.mB>=0.5&&rel.half>0) st.offMark={x:Lr,ax:p.x,ay:p.y,pid:p.pid,s,t:st.now,v186:1};
    /* he carries on onto the ball */
    R.pov={x:clamp(p.x+dir*3,3,102),y:p.y}; p.ov=R.pov; }});
  const mk=st.offMark&&st.offMark.v186&&st.offMark.pid===p.pid&&rel?st.offMark:null;
  R.pov={x:p.x,y:p.y}; p.ov=R.pov; p.hurry=false;
  if(mk){ const S=st._v186offStat; if(S) S.lines++; st.blow('pen'); st.emit(e); st.onCaption('OFFSIDE','set');
    v186rLog('off',{pid:p.pid,m:e.m,W,ts:+st.ts.toFixed(3),mL:+rel.mL.toFixed(2),mD:+rel.mD.toFixed(2),mB:+rel.mB.toFixed(2),half:+rel.half.toFixed(1),markX:mk.x,lineX:rel.L,ax:mk.ax,px:rel.px,dl:rel.dl,bx:rel.bx}); }
  else { v186rOffFallback(st,R,rel?'release':'nolaunch'); if(rel) v186rLog('off',{pid:p.pid,relFail:{mL:+rel.mL.toFixed(2),mD:+rel.mD.toFixed(2),mB:+rel.mB.toFixed(2)}}); }
  const spot={x:clamp(p.x,4,101),y:clamp(p.y,3,65)};
  /* hold the picture while the lines are on screen */
  const end=mk?mk.t+Math.max(700,st.D(1500)):0; await st.wait(Math.max(st.D(360),end-st.now+20));
  if(st.own===p) st.own=null; st.ownLock={x:st.ball.x,y:st.ball.y};
  v186rOffRelease(st,R);
  if(st.skip||W<300) return;
  const df=st.nearest(1-s,spot.x,spot.y,true); if(!df) return;
  await st.fetch(df,false); if(st.own!==df) return; await st.wait(st.D(120));
  const m2=st.nearest(1-s,spot.x-dir*16,lerp(spot.y,34,0.4),true,df); if(m2) await st.pass(df,m2); }

/* the runner's target follows the line every frame while he waits for the pass */
const v186rUpdOff=Stage.prototype.update;
Stage.prototype.update=function(dt){ const R=this._v186off; if(R&&!R.released&&R.pov&&R.p.ov===R.pov) R.pov.x=clamp(this.offLine(R.s)+R.dir*R.m,3,102);
  if(R&&R.sway){ const w=6.283/Math.max(900,this.D(1600)); for(const b of R.sway){ if(b.q.ov===b.ov) b.ov.y=clamp(b.y+0.25*Math.sin(this.now*w+b.ph),1,67); } }
  const r=v186rUpdOff.apply(this,arguments);
  if(R&&R.free&&this._v186off===R){ try{ v186rOffKeep(this,R); }catch(err){} }
  return r; };
/* while a call is on: a free midfielder never drops deeper than the held back line, the keeper never comes past it */
function v186rOffKeep(st,R){ const dir=R.dir; let Ld=null; for(const b of R.sway){ if(b.q.off) continue; if(Ld==null||dir*(b.q.x-Ld)>0) Ld=b.q.x; } if(Ld==null) return;
  for(const q of R.free){ if(q.off) continue;
    const sv=R.soft&&R.soft.get(q); if(sv&&q.ov===sv) sv.x=q.gk?Ld+dir*2.4:Ld-dir*1.6; /* a soft hold follows the line */
    if(q.gk){ const g=dir*(q.x-Ld); if(g<2.2&&!q.ov){ R.hold(q,Ld+dir*2.4,q.y); (R.soft||(R.soft=new Map())).set(q,q.ov); } if(g<1.2){ q.x=Ld+dir*1.2; if(dir*(q.vx||0)<0) q.vx=0; } }
    else { const g=dir*(Ld-q.x); if(g<2&&!q.ov){ R.hold(q,Ld-dir*1.6,q.y); (R.soft||(R.soft=new Map())).set(q,q.ov); } if(g<1){ q.x=Ld-dir*1; if(dir*(q.vx||0)>0) q.vx=0; } } } }

/* ---------- the two-line freeze frame ---------- */
function v186rOffAlpha(st,m){ const t=(st.now-m.t)/Math.max(700,st.D?st.D(1500):1500); if(t>=1) return -1; return t<0.15?t/0.15:1-Math.max(0,(t-0.6)/0.4); }
const v186rDrawOff=Stage.prototype.drawOffMark;
Stage.prototype.drawOffMark=function(g){ const m=this.offMark; if(!m||m.ax==null) return v186rDrawOff.apply(this,arguments);
  const al=v186rOffAlpha(this,m); if(al<0){ this.offMark=null; return; }
  const a0=this.proj(m.x,0.2), a1=this.proj(m.ax,0.2), b1=this.proj(m.ax,67.8), b0=this.proj(m.x,67.8);
  g.save(); g.globalAlpha=al*0.26; g.fillStyle='#ff6a4d'; g.beginPath(); g.moveTo(a0[0],a0[1]); g.lineTo(a1[0],a1[1]); g.lineTo(b1[0],b1[1]); g.lineTo(b0[0],b0[1]); g.closePath(); g.fill(); g.restore();
  v186rDrawOff.apply(this,arguments);
  g.save(); g.globalAlpha=al*0.95; g.lineCap='round'; g.strokeStyle='#ffffff'; g.lineWidth=4.6; g.beginPath(); g.moveTo(a1[0],a1[1]); g.lineTo(b1[0],b1[1]); g.stroke();
  g.strokeStyle='#e5302a'; g.lineWidth=2.4; g.stroke(); g.restore(); };

/* Tactical: the same two lines and band, with the same lifetime as the broadcast (it used to clear after a fixed 1500 ms).
   They are painted where the original paints its line (under the referee, the players and the ball): for the length of
   the original call offMark reads as null and the first read paints them. */
function v186rTacLines(st,g,m,al){ const {s,ox,oy}=st.tacGeom(); const X=x=>ox+x*s, y0=oy, y1=oy+68*s;
  g.save();
  if(m.ax!=null){ g.globalAlpha=al*0.24; g.fillStyle='#ff6a4d'; g.fillRect(Math.min(X(m.x),X(m.ax)),y0,Math.abs(X(m.ax)-X(m.x)),y1-y0); }
  g.globalAlpha=al*0.9; g.strokeStyle='rgba(255,211,107,1)'; g.setLineDash([6,5]); g.lineWidth=2; g.beginPath(); g.moveTo(X(m.x),y0); g.lineTo(X(m.x),y1); g.stroke(); g.setLineDash([]);
  if(m.ax!=null){ g.strokeStyle='#ffffff'; g.lineWidth=4; g.beginPath(); g.moveTo(X(m.ax),y0); g.lineTo(X(m.ax),y1); g.stroke(); g.strokeStyle='#e5302a'; g.lineWidth=2; g.stroke(); }
  g.restore(); }
const v186rDrawTac=Stage.prototype.drawTac;
Stage.prototype.drawTac=function(g){ const m=this.offMark; if(!m) return v186rDrawTac.apply(this,arguments);
  const al=v186rOffAlpha(this,m); if(al<0){ this.offMark=null; return v186rDrawTac.apply(this,arguments); }
  const me=this; let drawn=false, set=false, nv=null;
  Object.defineProperty(this,'offMark',{configurable:true,enumerable:true,get(){ if(!drawn){ drawn=true; try{ v186rTacLines(me,g,m,al); }catch(err){} } return null; },set(v){ set=true; nv=v; }});
  try{ return v186rDrawTac.apply(this,arguments); }
  finally{ delete this.offMark; this.offMark=set?nv:m; if(!drawn) v186rTacLines(this,g,m,al); } };

/* 3-D: a second line (white edge, red core) at the attacker and a translucent band, faded like the defender line */
(function(){ if(typeof P3D_MODULES==='undefined') return; const M=P3D_MODULES.find(x=>x.name==='ball'); if(!M||!M.offside) return; const prev=M.offside;
  M.offside=function(P,st,B){ prev.apply(this,arguments); const m=st.offMark;
    const hide=()=>{ if(B.v186a){ B.v186a.visible=B.v186aW.visible=B.v186b.visible=false; } };
    if(!m||m.ax==null||typeof THREE==='undefined'){ hide(); return; } const al=v186rOffAlpha(st,m); if(al<0){ hide(); return; }
    if(!B.v186a){ const T=THREE; const lg=P.track(new T.PlaneGeometry(1,68));
      const mat=(c,add)=>P.track(new T.MeshBasicMaterial({color:c,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,blending:add?T.AdditiveBlending:T.NormalBlending}));
      B.v186b=new T.Mesh(lg,mat('#ff6a4d')); B.v186aW=new T.Mesh(lg,mat('#ffffff')); B.v186a=new T.Mesh(lg,mat('#e5302a'));
      [B.v186b,B.v186aW,B.v186a].forEach((x,i)=>{ x.rotation.x=-Math.PI/2; x.visible=false; x.renderOrder=1+i; x.frustumCulled=false; P.scene.add(x); }); }
    const w=Math.max(0.05,Math.abs(m.ax-m.x));
    B.v186b.position.set((m.x+m.ax)/2,0.014,34); B.v186b.scale.set(w,1,1); B.v186b.material.opacity=0.2*al; B.v186b.visible=true;
    B.v186aW.position.set(m.ax,0.017,34); B.v186aW.scale.set(0.26,1,1); B.v186aW.material.opacity=0.9*al; B.v186aW.visible=true;
    B.v186a.position.set(m.ax,0.019,34); B.v186a.scale.set(0.13,1,1); B.v186a.material.opacity=0.95*al; B.v186a.visible=true; }; })();

/* ---------- D2 throw-ins: the team that put it out never takes it, unless an opponent's block sent it out ---------- */
Stage.prototype.throwIn=async function(){ const o=this.own; if(!o||this.hands||o.gk||this.skip) return; const s0=o.side, d0=s0===0?1:-1; const far=o.y<34;
  let side=V186R.forceBlock?s0:Math.random()<0.65?1-s0:s0; let blk=null;
  if(side===s0){ let bd=5; for(const q of this.players.values()){ if(q.side===s0||q.off||q.gk) continue; const d=dist2(q,o); if(d<bd){ bd=d; blk=q; } } if(!blk) side=1-s0; }
  if(!V186R.on){ side=Math.random()<0.65?1-s0:s0; blk=null; }
  let tx, ty=far?-0.8:68.8;
  if(blk){ /* he tries to go past, the ball hits the defender's shin and runs out */
    const bf=this.footOf(blk); blk.ov={x:blk.x,y:blk.y}; this.look(blk,o.x,o.y,this.D(700));
    await this.launch(o,{to:{x:bf.x,y:bf.y,z:0.12},dur:this.D(150)+40,h:0.05,kind:'pass'}); if(this.skip){ blk.ov=null; return; }
    blk.kickT=this.now; blk.kickW=0; blk.kickK='pass'; blk.kickF=this.D(240); this.snd('tackle');
    tx=clamp(blk.x+d0*(0.5+Math.random()*2.5),6,99);
    await this.launch(null,{to:{x:tx,y:ty,z:0},dur:this.D(380)+60,h:0.3,kind:'pass'}); blk.ov=null; }
  else { tx=clamp(o.x+d0*(3+Math.random()*6),6,99); await this.launch(o,{to:{x:tx,y:ty,z:0},dur:this.D(460)+60,h:0.25,kind:'pass'}); }
  this.ownLock={x:this.ball.x,y:this.ball.y}; if(this.skip) return;
  v186rLog('thr',{kicker:s0,side,block:blk?blk.pid:null});
  const dir=side===0?1:-1; const ar=tx>52.5?this.ars[0]:this.ars[1];
  if(!this.nearest(side,tx,far?0:68,true)){ return; }
  if(ar){ ar.flag='point'; ar.pointDir=dir; ar.flagT=this.now; }
  this.onCaption(blk?'BLOCKED · THROW-IN':'THROW-IN','set');
  const thrower=this.nearest(side,tx,far?0:68,true); if(!thrower) return;
  const ly=far?-0.4:68.4; const mate=this.nearest(side,tx+dir*7,far?8:60,true,thrower);
  if(mate) mate.ov={x:clamp(tx+dir*(4+Math.random()*5),4,101),y:far?6+Math.random()*4:62-Math.random()*4};
  await this.fetch(thrower,true); if(this.own!==thrower){ if(mate) mate.ov=null; return; }
  await this.carry(thrower,tx,ly,380); this.look(thrower,tx+dir*5,34,this.D(900)); await this.wait(this.D(110));
  const to=mate||this.nearest(side,tx+dir*8,34,true,thrower); if(to&&!this.skip){ if(mate) await this.until(()=>dist2(mate,mate.ov)<1.8,this.D(450)+120); await this.pass(thrower,to,1.3); } if(mate) mate.ov=null; thrower.ov=null; };

/* ---------- D3 + R5: misses scaled by distance and finishing; D5: what was shown is recorded on the event ---------- */
const v186rShotSeq=Stage.prototype.shotSeq;
Stage.prototype.shotSeq=async function(e){ const miss=e&&e.t==='miss'&&e.ty!=='pen';
  if(!miss){ this._v186shown=e; try{ return await v186rShotSeq.apply(this,arguments); } finally{ if(this._v186shown===e) this._v186shown=null; } }
  if(miss&&V186R.on&&V186R.setMiss&&!this.skip&&!this.clip&&(e.ty==='header'||e.ty==='corner'||e.ty==='fk')){ const p=this.pl(e.pid);
    if(p&&!p.off&&!p.gk){ let done=false; try{ done=await v186rSetMiss(this,e,p); } finally{ if(this._v186miss===e) this._v186miss=null; if((this.setPiece==='fk'&&e.ty==='fk')||(this.setPiece==='corner'&&e.ty==='corner')) this.setPiece=null; } if(done) return; } }
  this._v186miss=e;
  try{ return await v186rShotSeq.apply(this,arguments); } finally{ if(this._v186miss===e) this._v186miss=null; } };

/* D4 (misses only; the save branch belongs to the keeper-saves unit): a missed header comes from a cross met with the head,
   a missed corner header from a corner kick, a missed free kick from a dead ball with a wall. Returns false (nothing shown yet) when the picture cannot be built. */
async function v186rSetMiss(st,e,p){ const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const gk=st.gkOf(1-s);
  const over=Math.random()<0.45, sg=Math.random()<0.5?-1:1; let to, cap;
  if(e.ty==='fk'){ const pt={pid:p.pid,a:'setup',x:e.x!=null?e.x:50,y:e.x!=null?clamp(e.y,72,82):76};
    await st.setupDeadBall(e,pt); if(st.skip||st.own!==p) return false;
    to=over?{x:gx+dir*0.4,y:34+(Math.random()-.5)*5,z:2.75+Math.random()*0.8}:{x:gx+dir*0.4,y:34+sg*(4.2+Math.random()*2),z:0.6+Math.random()*1.2};
    st._v186miss=e; if(gk) gk.dive={dir:Math.sign(to.y-gk.y)||1,t:st.now+st.windOf('shot')+Math.max(st.D(70),st.D(460)+140-Math.max(150,st.D(250)))};
    await st.launch(p,{to,dur:st.D(460)+140,h:1.3,kind:'shot',cont:true}); cap=e._how==='over'?'OVER THE BAR':e._how==='wide'?'WIDE':null; }
  else { let crosser=null, cw=-1; for(const q of st.players.values()){ if(q.side!==s||q===p||q.gk||q.off) continue; const w=Math.abs(q.y-34)-Math.abs(q.x-(gx-dir*20))*0.3; if(w>cw){ cw=w; crosser=q; } }
    if(!crosser) return false; const [hx,hy]=e.x!=null?livePos(s,e.x,clamp(e.y,88,95)):[gx-dir*8,34];
    if(e.ty==='corner'){ /* a corner header: from a corner kick, as a corner-header goal is shown */ const near=crosser.y<34;
      await st.setupCorner(e,{pid:crosser.pid,a:'corner',x:s===0?(near?2:98):(near?98:2),y:99}); if(st.skip||st.own!==crosser||st.hands) return false;
      p.ov={x:hx,y:hy}; p.chase=null; p.meet=null; }
    else { await st.gain(crosser); if(st.skip||st.own!==crosser||st.hands) return false; p.ov={x:hx,y:hy}; p.chase=null; p.meet=null;
      const wy=crosser.y<34?7:61; await st.dribble(crosser,clamp(gx-dir*15,4,101),wy,450); if(st.skip||st.own!==crosser) return false; }
    const df=st.nearest(1-s,hx,hy); if(df&&dist2(df,p)<9){ df.ov={x:hx+dir*0.9,y:hy+(hy<34?1.1:-1.1)}; }
    await st.until(()=>dist2(p,p.ov)<1.2, st.eta(p,hx,hy)+300); if(st.skip||st.own!==crosser) return false;
    const JD=Math.max(260,st.D(560)); p.jumpT=st.now+9e6; const dd=dist2(crosser,p);
    await st.launch(crosser,{home:p,head:true,dur:st.D(760)*clamp(dd/20,0.7,1.6),h:4.2,onRelease:f=>{ p.jumpT=st.now+f.dur-JD*0.5; }});
    if(st.skip||st.own!==p){ p.jumpT=-9e9; return true; }
    to=over?{x:gx+dir*0.4,y:34+(Math.random()-.5)*4,z:2.7+Math.random()*0.6}:{x:gx+dir*0.4,y:34+sg*(4.1+Math.random()*1.4),z:0.5+Math.random()*1.3};
    st._v186miss=e; if(gk) gk.dive={dir:Math.sign(to.y-gk.y)||1,t:st.now+Math.max(st.D(70),st.D(380)+120-Math.max(150,st.D(250)))};
    e._head=true; await st.launch(p,{to,dur:st.D(380)+120,h:0.3,kind:'shot',nod:true,cont:true}); cap=e._how==='over'?'HEADED OVER':e._how==='wide'?'HEADED WIDE':null; }
  st.setPiece=null; st.emit(e); if(cap) st.onCaption(cap,'shot'); st.clearStaged(); for(const q of st.players.values()) if(q.side===s&&q.ov&&!q.gk) q.ov=null;
  v186rLog('miss',{pid:p.pid,set:e.ty,how:e._how});
  await st.wait(st.D(260)); if(gk) gk.dive=null; await st.goalKick(1-s); return true; }

const v186rLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ const e=this._v186miss;
  if(e&&p&&opt&&opt.kind==='shot'&&!opt.home&&opt.to&&!this.skip){ this._v186miss=null; try{ v186rMiss(this,p,opt.to,e); }catch(err){} }
  /* D6: in a goal move, a forward pass is never played to a teammate beyond the line: he checks his run on the line first */
  if(this._v186goal&&V186R.on&&p&&opt&&opt.home&&opt.home.side===p.side&&!opt.hands&&!this.so&&!this.skip&&this.setPiece!=='corner'&&!(this.hands&&this.own===p)){
    const q=opt.home, s=p.side, dir=s===0?1:-1;
    if(dir*(q.x-p.x)>0.5&&dir*(q.x-this.offLine(s))>-0.3){ const keep=q.ov, me=this, a=arguments; const hold={x:clamp(this.offLine(s)-dir*0.6,3,102),y:q.y}; q.ov=hold;
      v186rLog('off',{goalHold:q.pid,m:+(dir*(q.x-this.offLine(s))).toFixed(2)});
      return this.until(()=>{ hold.x=clamp(me.offLine(s)-dir*0.6,3,102); return me.skip||dir*(q.x-me.offLine(s))<=-0.3; }, Math.max(150,this.D(600))).then(()=>{ if(q.ov===hold) q.ov=keep; return v186rLaunch.apply(me,a); }); } }
  return v186rLaunch.apply(this,arguments); };
const v186rGoalSeq=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(){ this._v186goal=(this._v186goal||0)+1; try{ return await v186rGoalSeq.apply(this,arguments); } finally{ this._v186goal--; } };

function v186rMiss(st,p,to,e){ const gx=p.side===0?105:0, b=st.ball; const d=Math.hypot(gx-b.x,34-b.y);
  const how=to.z>=2.6?'over':Math.abs(to.y-34)>=4.1?'wide':to.z>2.2?'bar':'post'; e._how=how; if(!V186R.on) return;
  const a=v186rA(st,p,'fin'), sg=Math.sign(to.y-34)||1; const y0=to.y, z0=to.z;
  let yL=null; if(how==='wide'){ const off=d<9? 4.05+Math.random()*0.55 : 3.95+(0.15+(1-a)*(0.95+Math.random()*3.3)+a*Math.random()*0.4)*clamp((d-6)/14,0.35,1);
    /* where it crosses the goal line (outside the post), then on along the same line to the target behind it */
    yL=34+sg*Math.min(off,8.5); const den=gx-b.x; to.y=Math.abs(den)>0.4?clamp(yL+(yL-b.y)*(to.x-gx)/den,34-14,34+14):yL; }
  else if(how==='over'){ to.z=d<9? 2.6+Math.random()*0.35 : 2.65+(0.1+(1-a)*(0.3+Math.random()*2.2))*clamp((d-6)/14,0.35,1); }
  const k=st.gkOf(1-p.side); if(k&&k.dive&&k.dive.t>st.now) k.dive.dir=Math.sign(to.y-k.y)||k.dive.dir;
  v186rLog('miss',{pid:p.pid,how,d:+d.toFixed(1),fin:p.v186r_fin,a:+a.toFixed(2),y:+(yL!=null?yL:to.y).toFixed(2),ty:+to.y.toFixed(2),z:+to.z.toFixed(2),y0:+y0.toFixed(2),z0:+z0.toFixed(2)}); }

/* the commentary line follows what was shown */
const V186R_LINES={
  over:['{p} blazes it over.','{p} leans back and sends it over the bar.','{p} gets under it and it sails over.'],
  wide:['{p} drags it wide.','{p} can only find the side netting.','{p} pulls it wide of the post.'],
  post:['{p} hits the post!','Off the post! {p} so close.','{p} rattles the upright.'],
  bar:['{p} smashes it against the bar!','Off the crossbar from {p}!','{p} rattles the bar.'],
  catch:['Strong hands from {g} to keep out {p}.','{g} gathers {p}\'s effort.','{g} gets down well to deny {p}.','{g} spreads himself and smothers it.'],
  parry:['{g} parries {p}\'s shot away.','Big stop from {g}! He beats it away.','{p} forces a fine save from {g}.'],
  tip:['{g} tips {p}\'s effort round the post.','Fingertip save from {g}! Round the post for a corner.','{g} at full stretch to turn it round the post.'],
  tipover:['{g} tips {p}\'s effort over the bar.','Fingertip save from {g}! Over for a corner.','{g} arches back and turns it over the bar.']};
V186R_LINES.hover=['{p} heads it over the bar.','{p} gets his head to it but it climbs over.','{p} rises well but nods it over.']; V186R_LINES.hwide=['{p} glances his header wide.','{p} heads it just wide of the post.','{p} can only steer his header wide.'];
V186R_LINES.smother=V186R_LINES.catch; V186R_LINES.dive=V186R_LINES.catch;
if(typeof feedPush==='function'){ const v186rFeedPush=feedPush;
  feedPush=function(e,quiet){ const L=App.live, n0=L&&L.feed?L.feed.length:0; const r=v186rFeedPush.apply(this,arguments);
    try{ /* a save another unit did not tag: read what the stage shows as it is announced (in the gloves, or pushed away) */
      const st=L&&L.stage; if(V186R.on&&e&&e.t==='save'&&!e._how&&st&&e.ty!=='pen'&&!quiet&&!L.skipping&&!st.skip&&st._v186shown===e){ const k=st.gkOf(1-e.s);
        e._how=(k&&e.cor)?(k.dive&&k.dive.k==='tipOver'?'tipover':'tip'):(k&&st.own===k&&st.hands)?'catch':'parry'; }
      if(V186R.on&&e&&e._how&&(e.t==='miss'||e.t==='save')&&L&&L.feed&&L.feed.length>n0&&V186R_LINES[e._how]){ const f=L.feed[0]; const key=e._head&&(e._how==='over'||e._how==='wide')?'h'+e._how:e._how;
        const P=id=>esc(pname(Px(id))); f.txt=pickLine(V186R_LINES[key],e.m+e.pid+(e.xg||0)+n0).replace('{p}',P(e.pid)).replace('{g}',e.gk?P(e.gk):'the keeper'); f.how=e._how; } }catch(err){}
    return r; }; }
