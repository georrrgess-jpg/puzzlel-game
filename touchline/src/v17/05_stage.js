/* ===================== v17 Phase 0: Stage housekeeping (both renderers need it) =====================
   - render scale (Stage.rs) now recovers when frames are fast again, with hysteresis;
   - a paused stage draws at most ~2 frames a second, but at once on resize, view-mode change, pause/resume and
     stage.requestDraw();
   - a stage stops drawing while its canvas is off-screen / display:none or the tab is hidden (it keeps stepping, so the
     match flow never stalls) and draws again the moment it is visible;
   - the start-screen demo (opts.demo) draws at most 30 fps and stops stepping and drawing while a modal, a drawer or
     the new-career form covers it, or once the start screen is gone;
   - the single-canvas preview loops (Fireworks, figurePreview, celebPreview, the kit lab's klFigLoop) stop their
     requestAnimationFrame loops while their canvas is removed, hidden or off-screen, and Fireworks stops when its run
     is over; each resumes when its canvas is visible again.
   Simulation stepping is untouched: same fixed 120 Hz step, same sub-step cap, presentation only. */

const v17RAF=window.requestAnimationFrame.bind(window);

/* ---------- canvas visibility: one shared IntersectionObserver. A canvas counts as visible until the observer has
   reported otherwise, so a new canvas always gets its first frame. ---------- */
const v17Vis=(()=>{ const seen=new WeakMap(); let io=null;
  const obs=()=>{ if(!io&&typeof IntersectionObserver!=='undefined') io=new IntersectionObserver(es=>{ let wake=false; for(const e of es){ if(!seen.has(e.target)) continue; const was=seen.get(e.target); seen.set(e.target,e.isIntersecting); if(e.isIntersecting&&was===false) wake=true; } if(wake) v17Sweep(); },{rootMargin:'64px'}); return io; };
  return {
    watch(el){ if(!el||seen.has(el)) return; seen.set(el,undefined); const o=obs(); if(o) o.observe(el); },
    unwatch(el){ if(!el||!seen.has(el)) return; seen.delete(el); if(io) io.unobserve(el); },
    on(el){ return !document.hidden&&!!el&&el.isConnected&&seen.get(el)!==false; } };
})();

/* ---------- parked loops: a loop with nothing to draw parks a check function here instead of spinning
   requestAnimationFrame. Checks run on every wake-up event (canvas scrolled into view, tab shown, modal closed) and
   on a slow 400 ms poll; a check returns false to stay parked, anything else removes it. ---------- */
const v17Parked=new Set(); let v17ParkT=0;
function v17Park(fn){ v17Parked.add(fn); if(!v17ParkT) v17ParkT=setTimeout(v17Sweep,400); }
function v17Sweep(){ if(v17ParkT){ clearTimeout(v17ParkT); v17ParkT=0; }
  for(const fn of [...v17Parked]){ let done=true; try{ done=fn()!==false; }catch(e){ console.warn(e); } if(done) v17Parked.delete(fn); }
  if(v17Parked.size) v17ParkT=setTimeout(v17Sweep,400); }

/* ---------- gated requestAnimationFrame for single-canvas loops whose frame callback is a private closure
   (figurePreview, celebPreview): v17WithRaf(v17Gate(cv), fn) runs fn with requestAnimationFrame routed through the
   gate, and so does every frame the loop schedules afterwards. While cv is hidden the next frame is parked; once cv
   leaves the DOM the loop is dropped. ---------- */
function v17WithRaf(req,fn,cv){ const prev=window.requestAnimationFrame; window.requestAnimationFrame=req;
  try{ return fn(); } finally{ window.requestAnimationFrame=prev; if(cv&&!cv.isConnected) v17Vis.unwatch(cv); } }
function v17Gate(cv){ v17Vis.watch(cv);
  const frame=cb=>ts=>v17WithRaf(req,()=>cb(ts),cv);
  const req=cb=>{ if(!cv.isConnected){ v17Vis.unwatch(cv); return 0; }
    if(v17Vis.on(cv)) return v17RAF(frame(cb));
    v17Park(()=>{ if(!cv.isConnected){ v17Vis.unwatch(cv); return true; } if(!v17Vis.on(cv)) return false; v17RAF(frame(cb)); return true; }); return 0; };
  return req; }

/* ===================== Stage ===================== */
const V17_STAGES=new Set();
function v17StageInit(st){
  /* an invisible render target (the Courier photo stage lives in a visibility:hidden box at left:-3000px) always draws */
  let target=false; try{ target=getComputedStyle(st.cv).visibility==='hidden'; }catch(e){}
  const V=st._v17={dirty:true,mode:st.mode,paused:st.paused,always:target,parked:false,drawn:false,fast:null,up:-1e9,down:-1e9,noUp:false,wake:null};
  if(!target) v17Vis.watch(st.cv); V17_STAGES.add(st); return V; }
/* the start-screen demo pauses whenever anything covers the start screen or it is no longer the current screen */
function v17DemoHeld(st){ if(App.C||App.modal||App.drawer) return true; const s=document.getElementById('start'); if(!s||!s.contains(st.cv)) return true;
  const m=document.getElementById('modal-root'); return !!(m&&m.firstElementChild); }
function v17StageWake(st){ if(!st.alive) return true; if(!st.cv.isConnected){ st.destroy(); return true; } if(st.demo&&v17DemoHeld(st)) return false;
  const V=st._v17; V.parked=false; V.dirty=true; st._ld=0; st.lastReal=Math.max(st.lastReal,performance.now()-st.t0-1000/60); st.raf=requestAnimationFrame(st.loop); return true; }
/* camera-preserving resize after a render-scale change (same as the v15 drop) */
function v17Rescale(st){ st._fn=0; st._fe=null; const cw=st.cam.w, cx=st.cam.x, tw=st.cam.tw; st.resize(); st.cam.w=cw; st.cam.tw=tw; st.cam.x=cx; }
/* adaptive render scale. fi = interval since the previous cadence draw (ms). Thresholds are relative to the nominal
   interval (60 fps, or 30 fps for the demo): slower than nominal+13.3 ms over 90 draws drops rs by 0.12 (floor 0.7), as
   in v15; faster than nominal+3.3 ms for 3 s raises it by 0.12 (cap 1). Never raise within 5 s of a drop; a drop within
   10 s of a raise ends raising for the rest of this stage's life. */
function v17RenderScale(st,ts,fi){ const V=st._v17; const nom=st.demo?1000/30:1000/60; const rs=st.rs||1;
  st._fe=st._fe==null?fi:st._fe*0.94+fi*0.06; st._fn=(st._fn||0)+1;
  if(st._fn>90&&st._fe>nom+13.3&&rs>0.72){ st.rs=Math.max(0.7,rs-0.12); if(ts-V.up<10000) V.noUp=true; V.down=ts; V.fast=null; v17Rescale(st); return; }
  if(st._fe<nom+3.3){ if(V.fast==null) V.fast=ts; } else V.fast=null;
  if(rs<1&&!V.noUp&&V.fast!=null&&st._fn>30&&ts-V.fast>=3000&&ts-V.down>=5000){ st.rs=Math.min(1,Math.round((rs+0.12)*100)/100); if(st.rs>0.97) st.rs=1; V.up=ts; V.fast=null; v17Rescale(st); } }

Stage.prototype.loop=function(ts){ if(!this.alive) return; if(!this.cv.isConnected){ this.destroy(); return; }
  const V=this._v17||v17StageInit(this);
  const real=ts-this.t0; const step=Math.min(50,Math.max(0,real-this.lastReal)); this.lastReal=real;
  const H=1000/120; let alpha=1; const hold=this.demo&&v17DemoHeld(this);
  if(this.paused||hold){ this.acc=0; }
  else { this.acc=(this.acc||0)+step; let n=0; while(this.acc>=H&&n<8){ this.keepPrev(); this.now+=H; this.update(H/1000); this.acc-=H; n++; } if(n===8) this.acc=0; alpha=this.acc/H; }
  if(this.mode!==V.mode||this.paused!==V.paused){ V.mode=this.mode; V.paused=this.paused; V.dirty=true; }
  if(this.paused||hold) V.fast=null; /* pause, hold or hidden time never counts toward a render-scale raise */
  if(hold&&V.drawn){ this._ld=0; V.parked=true; v17Park(V.wake||(V.wake=()=>v17StageWake(this))); return; } /* a held demo still paints its first frame */
  if(V.always||v17Vis.on(this.cv)){
    /* cadence: ~60 fps live, 30 fps for the demo, ~2 fps while paused; a dirty stage draws on this frame */
    const since=ts-(this._ld||0); const gap=this.paused?480:this.demo?31.5:15.5;
    if(V.dirty||since>=gap||since<0){ if(this._ld&&!V.dirty&&!this.paused) v17RenderScale(this,ts,Math.min(100,since)); V.dirty=false; this._ld=ts; V.drawn=true; this.drawLerp(alpha); }
  } else { this._ld=0; V.fast=null; }
  this.raf=requestAnimationFrame(this.loop); };

const v17_stageResize=Stage.prototype.resize;
Stage.prototype.resize=function(){ const r=v17_stageResize.apply(this,arguments); const V=this._v17;
  if(V){ V.dirty=true; /* resizing clears the canvas: a paused stage repaints now instead of on its next 2 fps tick */
    if((this.paused||(this.demo&&V.parked))&&this.alive&&(V.always||v17Vis.on(this.cv))){ V.dirty=false; this.drawLerp(1); } }
  return r; };
const v17_stageDestroy=Stage.prototype.destroy;
Stage.prototype.destroy=function(){ V17_STAGES.delete(this); const V=this._v17; if(V&&V.wake) v17Parked.delete(V.wake); if(this.cv) v17Vis.unwatch(this.cv); return v17_stageDestroy.apply(this,arguments); };
/* ask for a frame now (for anything that changes what a paused or idle stage shows) */
Stage.prototype.requestDraw=function(){ const V=this._v17; if(this.alive&&V) V.dirty=true; };

document.addEventListener('visibilitychange',()=>{ if(document.hidden) return; for(const st of V17_STAGES){ st._ld=0; if(st._v17) st._v17.dirty=true; } v17Sweep(); });
/* modals and drawers open and close through renderModal: re-check the parked start-screen demo at once */
const v17_renderModal=renderModal; renderModal=function(){ const r=v17_renderModal.apply(this,arguments); if(v17Parked.size) v17Sweep(); return r; };

/* ===================== preview loops ===================== */
const v17_figurePreview=figurePreview;
figurePreview=function(cv){ if(!cv||cv._fp) return v17_figurePreview.apply(this,arguments); const a=arguments; return v17WithRaf(v17Gate(cv),()=>v17_figurePreview.apply(this,a),cv); };
const v17_celebPreview=celebPreview;
celebPreview=function(cv){ if(!cv||cv._run) return v17_celebPreview.apply(this,arguments); const a=arguments; return v17WithRaf(v17Gate(cv),()=>v17_celebPreview.apply(this,a),cv); };

/* kit lab: one loop draws every [data-klfig]/[data-klclash] canvas; it parks while none of them is visible */
const v17_klFigLoop=klFigLoop; const v17KlCv=new Set();
const v17KlSel='[data-klfig],[data-klclash]';
const v17KlWake=()=>{ if(App.route!=='kits'){ for(const cv of v17KlCv) v17Vis.unwatch(cv); v17KlCv.clear(); return true; } if(App._klRun) return true; const cvs=[...document.querySelectorAll(v17KlSel)]; if(!cvs.length) return true;
  if(!cvs.some(cv=>v17Vis.on(cv))) return false; App._klRun=true; v17RAF(klFigLoop); return true; };
klFigLoop=function(){ if(App.route!=='kits'){ App._klRun=false; for(const cv of v17KlCv) v17Vis.unwatch(cv); v17KlCv.clear(); return; }
  for(const cv of v17KlCv) if(!cv.isConnected){ v17Vis.unwatch(cv); v17KlCv.delete(cv); }
  const cvs=[...document.querySelectorAll(v17KlSel)]; for(const cv of cvs) if(!v17KlCv.has(cv)){ v17KlCv.add(cv); v17Vis.watch(cv); }
  if(!cvs.some(cv=>v17Vis.on(cv))){ App._klRun=false; if(cvs.length) v17Park(v17KlWake); return; }
  return v17_klFigLoop.apply(this,arguments); };

/* trophy-ceremony fireworks: stop when the run is over (Celebrate again restarts it) or while the canvas is hidden */
/* parked check for an idle fireworks canvas: stop() once it leaves the DOM; resume a hidden (not finished) run when visible */
function v17FwWake(fw,V){ return ()=>{ if(!fw.alive||!fw.cv.isConnected){ fw.stop(); return true; } if(!V.idle) return true; if(V.done||!v17Vis.on(fw.cv)) return false; V.idle=false; fw.last=performance.now(); v17RAF(fw.loop); return true; }; }
const v17_fwLoop=Fireworks.prototype.loop, v17_fwRestart=Fireworks.prototype.restart, v17_fwStop=Fireworks.prototype.stop;
Fireworks.prototype.loop=function(now){ if(!this.alive||!this.cv.isConnected){ this.stop(); return; }
  const V=this._v17||(this._v17={idle:false,wake:null}); v17Vis.watch(this.cv);
  if(this.t>this.dur+4&&!this.rk.length&&!this.p.length&&!this.conf.length){ this.g.clearRect(0,0,this.W,this.H); V.idle=true; V.done=true; v17Park(V.wake||(V.wake=v17FwWake(this,V))); return; }
  if(!v17Vis.on(this.cv)){ V.idle=true; v17Park(V.wake||(V.wake=v17FwWake(this,V))); return; }
  return v17_fwLoop.call(this,now); };
Fireworks.prototype.restart=function(){ v17_fwRestart.apply(this,arguments); const V=this._v17; if(V&&V.idle&&this.alive&&this.cv.isConnected){ V.idle=false; V.done=false; this.last=performance.now(); v17RAF(this.loop); } };
Fireworks.prototype.stop=function(){ v17_fwStop.apply(this,arguments); const V=this._v17; if(V&&V.wake) v17Parked.delete(V.wake); v17Vis.unwatch(this.cv); };
