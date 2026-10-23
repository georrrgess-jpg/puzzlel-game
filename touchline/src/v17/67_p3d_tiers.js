/* ===================== v18 3-D renderer: tier probe, diagnostics overlay, lab 2D/3D toggle (ANIMATION_PLAN 3.8, 3.9, Phase 5) =====================
   - Probe: under PREFS.renderer 'auto' with no stored tier, the first ~60 drawn frames of a 3-D stage (after 8 warm-up frames,
     paused time excluded) are timed; the median frame interval picks the tier: <= 21 ms keeps the starting tier, <= 30 ms one
     step down, slower goes to C, and slower than 42 ms at C gives up on 3-D for the session (not in the lab). The choice is stored
     in PREFS.rtier; a different tier rebuilds the painter. The core's run-time watchdog (P.watch) is unchanged.
   - Settings > Match graphics: "Re-test graphics speed" clears PREFS.rtier so the next 3-D stage probes again.
   - '#perf' in the address bar, or Shift+P: a diagnostics overlay for the visible stage, refreshed twice a second: renderer,
     tier, fps, draw ms (CPU time of a frame's drawing), draw calls, triangles, render scale, JS heap and GPU objects.
   - Animation lab: a 2D / 3D button in the top bar re-creates the current scene with the other renderer (lab only). */

/* ---------- per-frame timing (both renderers) ---------- */
const _v18tDrawLerp=Stage.prototype.drawLerp;
Stage.prototype.drawLerp=function(){ const t0=performance.now(); try{ return _v18tDrawLerp.apply(this,arguments); } finally{ const t1=performance.now(); const F=this._v18pf||(this._v18pf={n:0,ms:0,t:t1});
  F.n++; F.ms+=t1-t0; } };

/* ---------- the probe ---------- */
const V18_PROBE={warm:8,n:60};
const _v18tRender=Painter3D.prototype.render;
Painter3D.prototype.render=function(){ const t=performance.now(); const r=_v18tRender.apply(this,arguments); if(this.dead) return r;
  const st=this.st; const Q=this._probe||(this._probe={on:PREFS.renderer==='auto'&&!PREFS.rtier&&['live','lab','tv'].includes(this.kind),k:0,last:0,iv:[]});
  if(Q.on){ if(st.paused||document.hidden) Q.last=0; else { if(Q.last){ Q.k++; if(Q.k>V18_PROBE.warm) Q.iv.push(Math.min(250,t-Q.last)); } Q.last=t; }
    if(Q.iv.length>=V18_PROBE.n){ Q.on=false; v18ProbeDecide(this,Q.iv); } }
  return r; };
function v18ProbeDecide(P,iv){ const s=iv.slice().sort((a,b)=>a-b); const med=s[s.length>>1]; const order=['A','B','C']; let i=order.indexOf(P.tier.name); const i0=i;
  if(med>30) i=2; else if(med>21) i=Math.min(2,i+1);
  P.probe={median:Math.round(med*10)/10,from:order[i0],to:order[i]};
  if(i===2&&med>42&&P.kind!=='lab'){ PREFS.rtier='C'; savePrefs(); v18Off=true; P.st._v18off=true; P.dispose(); if(typeof toast==='function') toast('Switched to classic 2D graphics for speed'); return; }
  PREFS.rtier=order[i]; savePrefs(); if(i!==i0) P.rebuild(); }

/* ---------- Settings: re-test ---------- */
function v18TierField(){ const t=PREFS.rtier; return `<div class="row v18-tierset" style="gap:8px;align-items:center;flex-wrap:wrap"><button class="btn sm" data-a="v18Retest">Re-test graphics speed</button><span class="tiny muted">${t?`3-D detail level: ${esc(t)}`:'Measured on the next 3-D match'}</span></div>`; }
A.v18Retest=()=>{ PREFS.rtier=null; savePrefs(); v18Off=false; if(typeof toast==='function') toast('Graphics speed will be measured at the start of the next match'); if(App.route==='settings'&&typeof render==='function') try{ render(); }catch(e){} };

/* ---------- '#perf' overlay ---------- */
const v18Perf={el:null,iv:0};
function v18PerfStage(){ const L=typeof App!=='undefined'&&App.live; if(L&&L.stage&&L.stage.alive) return L.stage; if(App.labSt&&App.labSt.alive) return App.labSt;
  let best=null; for(const st of (typeof V17_STAGES!=='undefined'?V17_STAGES:[])){ if(!st.alive||!st.cv||!st.cv.isConnected) continue; if(!best||best.demo) best=st; } return best; }
function v18PerfTick(){ const el=v18Perf.el; if(!el) return; const st=v18PerfStage(); const now=performance.now(); const rows=[];
  if(!st){ rows.push(['stage','none']); }
  else { const P=st._p3d&&!st._p3d.dead?st._p3d:null; const F=st._v18pf||{n:0,ms:0,t:now}; const span=Math.max(1,now-F.t); const fps=F.n*1000/span, ms=F.n?F.ms/F.n:0; st._v18pf={n:0,ms:0,t:now};
    rows.push(['renderer',P?'3d':'2d'],['tier',P?P.tier.name+(P.probe?` (probe ${P.probe.median} ms)`:''):'-'],['fps',st.paused?'paused':fps.toFixed(1)],['draw ms',ms.toFixed(2)]);
    if(P){ const I=P.renderer.info; rows.push(['draw calls',I.render.calls],['triangles',I.render.triangles.toLocaleString()],['gpu geo/tex',I.memory.geometries+' / '+I.memory.textures],['camera',P.dir?P.dir.mode:'-']); }
    rows.push(['render scale',((st.rs||1)*(P?P.dpr:(st.dpr||1))).toFixed(2)+' ('+(st.rs||1).toFixed(2)+')'],['canvas',Math.round(st.W)+'x'+Math.round(st.H)]); }
  const m=performance.memory; if(m) rows.push(['js heap',(m.usedJSHeapSize/1048576).toFixed(1)+' MB']);
  el.innerHTML=`<b>#perf</b>`+rows.map(([k,v])=>`<div><span>${k}</span><i>${v}</i></div>`).join(''); }
function v18PerfShow(on){ if(on===undefined) on=!v18Perf.el; if(on&&!v18Perf.el){ const el=document.createElement('div'); el.id='v18-perf'; el.setAttribute('aria-hidden','true'); document.body.appendChild(el); v18Perf.el=el; v18PerfTick(); v18Perf.iv=setInterval(v18PerfTick,500); }
  else if(!on&&v18Perf.el){ clearInterval(v18Perf.iv); v18Perf.el.remove(); v18Perf.el=null; } }
document.addEventListener('keydown',e=>{ if(e.shiftKey&&(e.key==='P'||e.key==='p')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){ const t=e.target; if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; v18PerfShow(); } });
const v18PerfHash=()=>{ if(/(^|[#&,])perf\b/.test(location.hash.slice(1))) v18PerfShow(true); };
window.addEventListener('hashchange',v18PerfHash); setTimeout(v18PerfHash,350);

/* ---------- animation lab: 2D / 3D ---------- */
const _v18tRendererFor=rendererFor;
rendererFor=function(kind){ if(kind==='lab'&&App.v18LabR){ if(App.v18LabR==='2d') return '2d'; if(typeof THREE!=='undefined'&&v18GL().ok) return '3d'; } return _v18tRendererFor.apply(this,arguments); };
const _v18tLabRun=labRun;
labRun=function(scen){ App.v18LabScen=scen; const r=_v18tLabRun.apply(this,arguments); setTimeout(v18LabBtn,0); return r; };
const _v18tLabOpen=labOpen;
labOpen=function(){ const r=_v18tLabOpen.apply(this,arguments); v18LabBtn(); return r; };
function v18LabBtn(){ const top=document.querySelector('#anim-lab .lab-top'); if(!top) return; let b=top.querySelector('#v18-labr');
  if(!b){ b=document.createElement('button'); b.id='v18-labr'; b.className='btn sm v18-labr'; b.dataset.a='v18LabR'; b.title='Re-create this scene with the other renderer'; const x=top.querySelector('[data-a="labClose"]'); top.insertBefore(b,x||null); }
  const st=App.labSt; const cur=(App.v18LabR)||(st&&st._p3d&&!st._p3d.dead?'3d':rendererFor('lab')); b.innerHTML=`<span class="${cur==='2d'?'on':''}">2D</span> / <span class="${cur==='3d'?'on':''}">3D</span>`; b.setAttribute('aria-label',`Renderer: ${cur.toUpperCase()}. Switch`); }
A.v18LabR=()=>{ const st=App.labSt; const cur=App.v18LabR||(st&&st._p3d&&!st._p3d.dead?'3d':'2d'); App.v18LabR=cur==='3d'?'2d':'3d'; labRun(App.v18LabScen||'run'); };
