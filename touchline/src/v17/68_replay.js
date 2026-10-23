/* ===================== v18 goal replays (ANIMATION_PLAN Phase 4.1), live matches only =====================
   Recording: from the start of a live goalSequence, after every simulation step, a snapshot of what the painters read
   (every mover's primitive fields plus dive/glide/ov, the ball, the flight, net, trail, curl and spin state, the clock) goes
   into a ~5 s ring buffer; it notes when the shot was struck and when the ball crossed the line, and stops 1.2 s later.
   Playback: before restartAfterGoal (that is, after the celebration) the match flow awaits the replay. While it plays the
   Stage loop does not step the simulation at all (no keepPrev, no clock, no update, so no waiter, timer of the stage or match
   clock moves); each frame applies the snapshot for the replay moment, draws, and restores every field it touched in the
   same synchronous task, so nothing outside the draw ever sees replay state. The window is from ~0.9 s before the strike to
   0.55 s after the goal, at 0.5x, with a dissolve in and out, a REPLAY bug, and the 3-D director's behind-the-goal camera
   (2-D: a tight framing on the ball). Tap or click the pitch, Skip, 4x/8x, pause and leaving the match all behave: skip
   ends it at once, pause holds it. Never at 4x/8x, while skipping, in shootouts, in the tactical view, or with
   PREFS.replays off (Settings > Match graphics). */
DEFAULT_PREFS.replays=true; if(!('replays' in PREFS)) PREFS.replays=true;

const V18_RP={keep:5200,after:1200,lead:900,tail:550,rate:0.5,dis:380};
const V18_RP_STAGE=['now','ball','own','hands','fl','inNet','bulge','flash','hype','shake','v17M','v17tr','v17bs','v17sq','trail','turf','offMark','focus','netD','headBall','setPiece','placed','poss','cush','_v17cf','_v17c','conf'];
function v18RpLive(st){ const L=typeof App!=='undefined'&&App.live; return !!(L&&L.stage===st&&st.cv&&st.cv.id==='lv-canvas'); }
function v18RpWant(st){ if(!v18RpLive(st)||!st.alive) return false; const L=App.live; if(PREFS.replays===false) return false;
  if(st.skip||st.so||L.skipping||L.done||st.mode==='tactical') return false; if((L.speed||1)>=4) return false; return true; }
const v18RpPrim=v=>v===null||v===undefined||typeof v==='number'||typeof v==='string'||typeof v==='boolean';
function v18RpObj(o,ref){ const s={}; for(const k in o){ const v=o[k]; if(v18RpPrim(v)) s[k]=v; else if(k==='dive'||k==='glide'||k==='ov') s[k]=ref?v:{...v}; } return s; }
const V18_RP_DEL={};
function v18RpMovers(st){ const a=[...st.players.values()]; if(st.ref) a.push(st.ref); if(st.ars) a.push(...st.ars); return a; }
function v18RpSnap(st){ const f=st.fl, nd=st.netD; return {now:st.now, m:v18RpMovers(st).map(o=>[o,v18RpObj(o)]),
  s:{now:st.now,ball:{...st.ball},own:st.own,hands:st.hands,fl:f?{...f,v:f.v?{...f.v}:f.v}:null,inNet:st.inNet,bulge:st.bulge,flash:st.flash,hype:st.hype,shake:st.shake,v17M:st.v17M,
    v17tr:st.v17tr?st.v17tr.slice():st.v17tr,v17bs:st.v17bs,v17sq:st.v17sq,trail:st.trail?st.trail.slice():st.trail,turf:st.turf?st.turf.map(q=>({...q})):st.turf,offMark:st.offMark,focus:st.focus,
    netD:nd?{0:{...nd[0]},105:{...nd[105]}}:nd,headBall:st.headBall,setPiece:st.setPiece,placed:st.placed,poss:st.poss,cush:st.cush,_v17cf:null,_v17c:null,conf:[]}}; }

/* recording */
const _v18rpGoal=Stage.prototype.goalSequence;
Stage.prototype.goalSequence=async function(e){ this._rb=v18RpLive(this)?{buf:[],h:0,ts:null,tg:null,stop:false,gx:e&&e.s===1?0:105,dir:e&&e.s===1?-1:1}:null;
  try{ return await _v18rpGoal.apply(this,arguments); } finally{ this._rb=null; } };
const _v18rpUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v18rpUpd.apply(this,arguments); const R=this._rb;
  if(R&&!R.stop&&!this.skip){ const B=R.buf; B.push(v18RpSnap(this));
    if(R.ts==null&&this.fl&&this.fl.kind==='shot') R.ts=this.now;
    if(R.tg==null&&this.inNet&&this.ball&&this.ball.ing!=null){ R.tg=this.now; R.side=Math.max(-1,Math.min(1,(34-this.ball.y)/4)); }
    if(R.tg!=null&&this.now>R.tg+V18_RP.after) R.stop=true;
    if(R.tg==null){ while(R.h<B.length&&B[R.h].now<this.now-V18_RP.keep) R.h++; if(R.h>240){ B.splice(0,R.h); R.h=0; } } }
  return r; };

/* the overlay: REPLAY bug, a skip hint, and a tap target */
function v18RpOverlay(st,on){ const host=st.cv.parentElement; if(!host) return null; let el=host.querySelector(':scope > .v18-rp');
  if(!on){ if(el){ el.classList.add('out'); setTimeout(()=>el.remove(),260); } return null; }
  if(el) el.remove(); el=document.createElement('div'); el.className='v18-rp'; el.setAttribute('role','button'); el.setAttribute('tabindex','-1'); el.setAttribute('aria-label','Goal replay. Tap to skip');
  const h=st.h||{}, a=st.a||{}; const R=st._rp; const T=R&&R.side0===1?a:h;
  el.innerHTML=`<div class="v18-rp-bug" style="--rpc:${(T&&T.c1)||'#d33'}"><i></i><b>REPLAY</b></div><div class="v18-rp-hint">Tap to skip</div>`; host.appendChild(el); return el; }
/* a dissolve: the frame being shown now, copied onto a canvas over the stage, fading out over what comes next */
function v18RpDissolve(st,ms){ const host=st.cv.parentElement; if(!host||st.rm) return; const P=st._p3d&&!st._p3d.dead?st._p3d:null;
  const c=document.createElement('canvas'); c.className='v18-dslv'; c.setAttribute('aria-hidden','true'); const dpr=Math.min(2,window.devicePixelRatio||1); c.width=Math.round(st.W*dpr); c.height=Math.round(st.H*dpr); c.style.width=st.W+'px'; c.style.height=st.H+'px';
  const g=c.getContext('2d'); try{ if(P) g.drawImage(P.canvas,0,0,c.width,c.height); g.drawImage(st.cv,0,0,c.width,c.height); }catch(e){ return; }
  host.appendChild(c); let a=null; try{ a=c.animate([{opacity:1},{opacity:0}],{duration:ms,easing:'ease-in-out',fill:'forwards'}); }catch(e){}
  const done=()=>c.remove(); if(a) a.onfinish=done; setTimeout(done,ms+120); }

/* draw one replay frame: apply the snapshot, draw, put every field back */
function v18RpDraw(st,Q,S,copy){ const sv={}; for(const k of V18_RP_STAGE) sv[k]=st[k]; const cam=st.cam, cx=cam.x, cw=cam.w, ctw=cam.tw;
  /* the live values of every field the snapshot will touch (by reference), and of every primitive field */
  const back=S.m.map(([o,s])=>{ const live=v18RpObj(o,true); for(const k in s) if(!(k in live)) live[k]=Object.prototype.hasOwnProperty.call(o,k)?o[k]:V18_RP_DEL; return [o,live]; });
  try{ for(const k of V18_RP_STAGE) if(k in S.s) st[k]=S.s[k];
    for(const [o,s] of S.m) Object.assign(o,s);
    if(!(st._p3d&&!st._p3d.dead)){ /* 2-D: a tight framing that follows the ball */ const b=st.ball; const tx=Math.max(cam.w*0.36,Math.min(105-cam.w*0.36,b.x+Q.dir*3)); Q.cx=Q.cx==null?tx:Q.cx+(tx-Q.cx)*0.12; cam.w=cam.tw=st.bw*0.62; cam.x=Math.max(cam.w*0.36,Math.min(105-cam.w*0.36,Q.cx)); }
    st.draw();
    if(copy) v18RpDissolve(st,V18_RP.dis); }
  finally{ for(const [o,live] of back){ for(const k of Object.keys(o)){ if(!(k in live)&&v18RpPrim(o[k])) delete o[k]; } for(const k in live){ if(live[k]===V18_RP_DEL) delete o[k]; else o[k]=live[k]; } }
    for(const k of V18_RP_STAGE) st[k]=sv[k]; cam.x=cx; cam.w=cw; cam.tw=ctw; } }

function v18RpEnd(st,why){ const Q=st._rp; if(!Q||Q.done) return; Q.done=true; Q.on=false;
  /* the last replay frame dissolves into the live picture; the director cuts to the restart under it */
  if(st.alive&&(why==='end'||why==='tap')&&!st.skip){ const S=Q.R.buf[Q.i]; if(S&&st.cv.isConnected){ const P=st._p3d; if(P&&!P.dead&&P.dir){ P.dir.noFade=true; } try{ Q.on=true; v18RpDraw(st,Q,S,true); }catch(e){} Q.on=false; const P2=st._p3d; if(P2&&!P2.dead&&P2.dir) P2.dir.snap=true; } }
  v18RpOverlay(st,false); if(Q.tapEl) Q.tapEl.removeEventListener('pointerdown',Q.tap,true);
  st._rp=null; st.acc=0; st.lastReal=performance.now()-st.t0; if(st.requestDraw) st.requestDraw(); App.v18Replays=(App.v18Replays||0)+1; Q.res(); }

async function v18Replay(st){ const R=st._rb; if(!R||R.tg==null||!v18RpWant(st)) return; const B=R.buf.slice(R.h); if(B.length<20) return;
  const ts=R.ts!=null?R.ts:R.tg-400; const t0=Math.max(B[0].now,ts-V18_RP.lead), t1=Math.min(B[B.length-1].now,R.tg+V18_RP.tail); if(t1-t0<300) return;
  let i=0; while(i<B.length-1&&B[i+1].now<=t0) i++;
  return new Promise(res=>{ const Q=st._rp={on:false,done:false,t:t0,t0,t1,i,R:{buf:B},res,gx:R.gx,dir:R.dir,side:R.side||0,side0:R.gx===105?0:1,fov:34};
    /* dissolve from the live picture into the first replay frame */
    try{ st.draw(); v18RpDissolve(st,V18_RP.dis); }catch(e){}
    Q.on=true; const el=v18RpOverlay(st,true); if(el){ Q.tapEl=el; Q.tap=e=>{ if(st.paused) return; e.preventDefault(); e.stopPropagation(); Q.skipTap=true; }; el.addEventListener('pointerdown',Q.tap,true); }
    const P=st._p3d; if(P&&!P.dead&&P.dir) P.dir.snap=true;
    st.acc=0; st.lastReal=performance.now()-st.t0; if(st.requestDraw) st.requestDraw(); }); }

/* the Stage loop while a replay plays: no simulation step, only replay frames */
const _v18rpLoop=Stage.prototype.loop;
Stage.prototype.loop=function(ts){ const Q=this._rp; if(!Q||!Q.on) return _v18rpLoop.apply(this,arguments);
  if(!this.alive){ v18RpEnd(this,'gone'); return; } if(!this.cv.isConnected){ v18RpEnd(this,'gone'); this.destroy(); return; }
  const real=ts-this.t0; const step=Math.min(50,Math.max(0,real-this.lastReal)); this.lastReal=real; this.acc=0;
  if(!this.paused) Q.t+=step*V18_RP.rate;
  if(Q.skipTap||!v18RpWant(this)||Q.t>=Q.t1){ v18RpEnd(this,Q.skipTap?'tap':'end'); this.raf=requestAnimationFrame(this.loop); return; }
  if(this.wx&&this.updWeather&&!this.paused) this.updWeather(step/1000);
  const B=Q.R.buf; while(Q.i<B.length-1&&B[Q.i+1].now<=Q.t) Q.i++;
  if(Q.tapEl) Q.tapEl.style.pointerEvents=this.paused?'none':'';
  const V=this._v17; if(!V||V.always||(typeof v17Vis==='undefined'||v17Vis.on(this.cv))){ const since=ts-(this._ld||0); if(since>=15.5||since<0){ this._ld=ts; v18RpDraw(this,Q,B[Q.i],false); } }
  this.raf=requestAnimationFrame(this.loop); };
const _v18rpCancel=Stage.prototype.cancel;
Stage.prototype.cancel=function(){ if(this._rp) v18RpEnd(this,'skip'); return _v18rpCancel.apply(this,arguments); };
const _v18rpDestroy=Stage.prototype.destroy;
Stage.prototype.destroy=function(){ if(this._rp) v18RpEnd(this,'gone'); return _v18rpDestroy.apply(this,arguments); };

/* the match flow waits for the replay between the celebration and the restart */
const _v18rpRestart=Stage.prototype.restartAfterGoal;
Stage.prototype.restartAfterGoal=async function(){ if(this._rb&&!this.skip){ try{ await v18Replay(this); }catch(e){ console.warn('v18 replay',e); if(this._rp) v18RpEnd(this,'gone'); } this._rb=null; }
  return _v18rpRestart.apply(this,arguments); };

/* Settings > Match graphics: the replay switch (next to the renderer choice) */
const _v18rpSettings=VIEWS.settings;
VIEWS.settings=function(){ const h=_v18rpSettings.apply(this,arguments); const i=h.indexOf('class="field v17-rend"'); const j=i<0?-1:h.indexOf('</div>',i); if(j<0) return h;
  const add=`<label class="toggle v18-rpset"><input type="checkbox" data-c="pref" data-k="replays" ${PREFS.replays!==false?'checked':''}> Goal replays in live matches</label>`+(typeof v18TierField==='function'?v18TierField():'');
  return h.slice(0,j+6)+add+h.slice(j+6); };
