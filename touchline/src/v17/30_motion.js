/* ===== v17 · 30_motion: tab indicator without forced reflow, sim-ahead one fixture per task =====
   Pairs with 30_motion.css. Globals are prefixed v17. */

/* ---------- sliding tab indicator ----------
   Replaces tabIndicators (ui_v8.js). The old version measured the active tab synchronously inside render()
   (a forced layout), then forced a second style/layout with `void offsetWidth` to restart the transition, and
   animated width. Now: render() only tags the bar and seeds its previous position; one requestAnimationFrame
   per frame measures every queued bar (reads first, then writes, so at most one layout, the one the frame
   needs anyway) and sets --ti-x / --ti-s. CSS moves a fixed-width bar with translateX + scaleX. */
const V17_TI_BASE=72; /* must match the ::after width in 30_motion.css */
const v17TabQ=new Set(); let v17TabRaf=0;
function v17TabKey(tb){ return (tb.querySelector('.tab')||{}).dataset?.k||'t'; }
function v17TabSet(tb,p){ tb.style.setProperty('--ti-x',p.x+'px'); tb.style.setProperty('--ti-s',(p.w/V17_TI_BASE).toFixed(4)); tb.style.setProperty('--ti-y',p.y+'px'); tb.v17ti=p; }
tabIndicators=function(scope){
  scope.querySelectorAll('.tabs').forEach(tb=>{ if(!tb.querySelector('.tab.on')) return; tb.classList.add('tabs-ind');
    /* a freshly rendered bar starts where the previous one of the same group ended, so it can glide */
    if(!tb.v17ti){ const prev=TABPOS[v17TabKey(tb)]; if(prev) v17TabSet(tb,prev); }
    v17TabQ.add(tb); });
  if(v17TabQ.size&&!v17TabRaf) v17TabRaf=requestAnimationFrame(v17TabFlush); };
function v17TabFlush(){ v17TabRaf=0; const list=[...v17TabQ]; v17TabQ.clear(); const rm=reducedMotion();
  const reads=list.map(tb=>{ const on=tb.isConnected&&tb.querySelector('.tab.on'); return on?{x:on.offsetLeft,w:on.offsetWidth,y:on.offsetTop+on.offsetHeight}:null; });
  const still=[];
  list.forEach((tb,i)=>{ const r=reads[i]; if(!r) return; const cur=tb.v17ti; TABPOS[v17TabKey(tb)]=r;
    if(cur&&cur.x===r.x&&cur.w===r.w&&cur.y===r.y) return;
    /* glide only along the same row; first paint, a wrapped row or reduced motion jump */
    if(!(cur&&cur.y===r.y)||rm){ tb.classList.add('ti-still'); still.push(tb); }
    v17TabSet(tb,r); });
  /* the jump is committed by this frame's style pass; re-enable the transition on the next frame */
  if(still.length) requestAnimationFrame(()=>still.forEach(tb=>tb.classList.remove('ti-still'))); }

/* ---------- sim-ahead ----------
   Replaces A.simAhead (ui_v15.js). Every fixture simulation (the user's match, then each other fixture of the
   round in roundFixtures order, exactly what simRound does) is its own task, advance() runs in its own task,
   and the loop yields between them with scheduler.yield() (MessageChannel macrotask where unsupported; not
   setTimeout, which is clamped and throttled in background tabs). The engine calls, their order and their
   arguments are unchanged, so results are identical. The #simov bar is written at most once per frame.
   The closing render and the save run as separate tasks. A sim already running ignores further calls, and the
   single-round sim (which never had an overlay) gets an invisible input shield while it yields. */
const v17Yield=(()=>{ if(typeof scheduler!=='undefined'&&scheduler&&typeof scheduler.yield==='function') return ()=>scheduler.yield();
  const ch=new MessageChannel(); const q=[]; ch.port1.onmessage=()=>{ const r=q.shift(); if(r) r(); };
  return ()=>new Promise(r=>{ q.push(r); ch.port2.postMessage(0); }); })();
/* scheduler.yield() continuations outrank rendering, so a loop of them alone starves frames (measured: 3 frames
   in a 400 ms season sim). v17Pace() yields with scheduler.yield() while the current frame still has budget,
   and once ~12 ms of work have run it waits for the next frame to be painted (rAF, then a message posted from
   it runs after the paint). Hidden tabs never paint, so there it only yields; a 120 ms timer covers a tab that
   hides while waiting. */
const v17Post=(()=>{ const ch=new MessageChannel(); const q=[]; ch.port1.onmessage=()=>{ const f=q.shift(); if(f) f(); }; return f=>{ q.push(f); ch.port2.postMessage(0); }; })();
const v17NextPaint=()=>document.visibilityState==='hidden'?v17Yield():new Promise(r=>{ let done=false; const go=()=>{ if(done) return; done=true; clearTimeout(to); r(); }; const to=setTimeout(go,120); requestAnimationFrame(()=>v17Post(go)); });
const v17Pace=async()=>{ if(document.visibilityState==='hidden'||performance.now()-v17Pace.t<12){ await v17Yield(); return; }
  await v17NextPaint(); v17Pace.t=performance.now(); };
v17Pace.t=0;
const v17Sim={busy:false};
function v17SimPaint(S){ if(S.raf||!S.ov) return; S.raf=requestAnimationFrame(()=>{ S.raf=0; const ov=S.ov; if(!ov||!ov.isConnected) return;
  const i=ov.querySelector('.sv-bar i'); const p=S.p.toFixed(3); if(i&&i.style.getPropertyValue('--p')!==p) i.style.setProperty('--p',p);
  const l=ov.querySelector('.sv-l'); if(l&&l.textContent!==S.label) l.textContent=S.label; }); }
A.simAhead=async el=>{ if(v17Sim.busy) return; v17Sim.busy=true; try{ return await v17SimAhead(el); } finally{ v17Sim.busy=false; } };
async function v17SimAhead(el){
  const kind=el.dataset.k; App.simMenu=false; const C=App.C; const u=C.userSid; let n=0,w=0,d=0,l=0; const titles=[]; const t0=C.phase;
  let ov=document.getElementById('simov'); if(!ov&&kind!=='round'){ ov=document.createElement('div'); ov.id='simov'; ov.setAttribute('role','status'); ov.innerHTML='<div class="sv-box"><b>Simulating…</b><div class="sv-bar"><i></i></div><span class="sv-l"></span></div>'; document.body.appendChild(ov); }
  let shield=null; if(!ov){ shield=document.createElement('div'); shield.className='v17-simshield'; shield.setAttribute('aria-hidden','true'); document.body.appendChild(shield); }
  const total=kind==='regular'?16:kind==='season'?22:1; const S={ov,p:.04,label:'',raf:0}; v17Pace.t=performance.now();
  const tick=frac=>{ if(!ov) return; S.p=Math.min(.96,Math.max(.04,frac/total)); S.label=`${w}-${d}-${l} · ${phaseLabel(C)}`; v17SimPaint(S); };
  try{
    while(n<80&&C.phase!=='offseason'){
      if(kind==='regular'&&!['preseason','regular'].includes(C.phase)) break;
      const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M); if(uf.w===u) w++; else if(uf.w) l++; else d++; const tt=uf.w===u?(uf.comp==='sec'&&uf.rd===2?`Section ${C.section} Champions`:uf.comp==='rgn'?'Regional Champions':uf.comp==='st'&&uf.rd===2?'State Champions':null):null; if(tt) titles.push([tt,uf.id,C.year]);
        tick(n+.1); await v17Pace(); }
      /* simRound(C), one fixture per task */
      const fx=roundFixtures(C); let k=0;
      for(const f of fx){ k++; if(!f||f.st==='d') continue; const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); tick(n+.1+.85*k/fx.length); await v17Pace(); }
      const ev=advance(C); n++; if(!ev) break; if(kind==='round') break;
      tick(n); await v17Pace();
    }
  } catch(e){ if(ov) ov.remove(); if(shield) shield.remove(); throw e; }
  finally { if(S.raf){ cancelAnimationFrame(S.raf); S.raf=0; } S.ov=null; }
  App.odds.clear(); queueSave(); App.keepScroll=true;
  await v17Yield();
  if(ov) ov.remove(); if(shield) shield.remove();
  App.modal={type:'simSummary',n,w,d,l,from:t0,kind,titles:titles.map(t=>t[0])}; render();
  if(titles.length){ const [tt,fid,yr]=titles[titles.length-1]; showTrophy(tt,Sx(u),yr,{chips:titleChips(C,fid)}); }
  /* the save (an IndexedDB structured clone of the whole career) runs in its own task once the summary has been
     painted; queueSave above already scheduled it, saveNow runs it now and clears that timer */
  await v17NextPaint(); saveNow(); }
