/* ===================== v18 3-D renderer: walkout camera and Courier photos (69) =====================
   1. Walkout. liveWalkout (ui_announcer.js) is wrapped, not rewritten: the wrapper opens v18WalkFocus and closes it in
      the done callback. The director (66) gets a 'walkout' preset whose pose reads v18WalkFocus, refreshed every frame
      from the announcer's own DOM (#lv-intro .walk class walk-them / walk-vs / walk-mine, "#wk-n" = "i of N announced",
      #pa-call "Head coach"), so the announcer's timing is untouched. Players stand where the stage put them
      (kickoffShape in openLive); the camera stands ~1.7 m high, 7-9 m off the called player, on the side they face,
      and creeps in while each name is called; between names it dollies along the team's line. When the walkout ends
      naturally a crane shot rises from the near touchline to the kick-off wide shot; skipping cuts (v18Cut) straight
      to the kick-off preset. Reduced motion: one static wide shot. While the 3-D walkout runs, #lv-intro gets
      .v18-wk3 so the overlay's opaque backdrop becomes a vignette over the real stadium (the VS card stays opaque).
   2. Photos. rendererFor('photo') follows 'live'. A photo stage's painter is built at tier C, its director holds the
      scorer close-up (ignoring the photo stage's st.rm), and the HUD canvas's toDataURL is overridden on that one
      canvas: render the 3-D scene, then draw GL + HUD into a 640x400 canvas and encode that, all in one task, so no
      preserveDrawingBuffer is needed. shootPhoto destroys the stage (and so the painter) right after, and photoPump
      shoots one photo at a time, so there is never more than one photo context. */

let v18WalkFocus=null;
const v18Photo={n:0,last:''};

/* the announcer's order for one side: keeper first, then by slot depth (the same sort as liveWalkout's team()) */
function v18WalkXI(L,i){ const C=App.C, S=L.M.sides[i]; if(!S) return [];
  return S.slots.map(s=>({s,p:C.players[s.pid]})).filter(x=>x.p).sort((a,b)=>(a.s.role==='GK'?-1:0)-(b.s.role==='GK'?-1:0)||a.s.y-b.s.y).map(x=>x.s.pid); }
/* refresh the focus from the walkout overlay; returns the focus or null */
function v18WalkRead(){ const F=v18WalkFocus; if(!F) return null; if(App.live!==F.L||!F.st.alive){ v18WalkFocus=null; return null; }
  if(F.crane) return F;
  const W=document.querySelector('#lv-intro .walk'); if(!W) return F;
  const u=F.L.M.user; let phase=W.classList.contains('walk-vs')?'vs':W.classList.contains('walk-mine')?'mine':W.classList.contains('walk-them')?'them':F.phase;
  if(phase==='mine'){ const c=W.querySelector('#pa-call'); if(c&&/head coach/i.test(c.textContent)) phase='coach'; }
  const side=phase==='them'?1-u:u; if(side!==F.side){ F.side=side; F.xi=v18WalkXI(F.L,side); }
  const m=/(\d+) of (\d+)/.exec((W.querySelector('#wk-n')||{}).textContent||''); const idx=m?(+m[1])-1:-1;
  const now=performance.now(); if(idx!==F.idx){ F.idx=idx; F.it=now; }
  if(phase!==F.phase){ const was=F.phase; F.phase=phase; F.pt=now; F.it=now; F.fresh=true; if(F.jump&&(was==='them'||was==='vs')){ F.jump=false; v18Cut(F.st); } }
  F.pid=idx>=0&&F.xi?F.xi[idx]||null:null; return F; }
/* the overlay class; while on, --v18-wx/wy/ww/wh give the stage's box inside #lv-intro (the backdrop stays opaque outside it) */
function v18WalkClass(on,st){ const el=document.getElementById('lv-intro'); if(!el) return; el.classList.toggle('v18-wk3',!!on);
  if(on&&st&&st.cv){ const a=el.getBoundingClientRect(), r=st.cv.getBoundingClientRect(); const v=[r.left-a.left,r.top-a.top,r.width,r.height].map(x=>Math.round(x)+'px');
    if(v.join()!==el._v18wb){ el._v18wb=v.join(); ['--v18-wx','--v18-wy','--v18-ww','--v18-wh'].forEach((k,i)=>el.style.setProperty(k,v[i])); } } }
/* the minimap is hidden while the walkout is framed (presentation only; restored when it ends) */
function v18WalkMini(F,hide){ if(!F) return; if(hide){ if(F.mini==null){ F.mini=F.st.minimap; F.st.minimap=false; } } else if(F.mini!=null){ F.st.minimap=F.mini; F.mini=null; } }
let v18WalkSeen=[]; /* the walkout presets this session went through, in order (for tests) */

const _v18Walkout=liveWalkout;
liveWalkout=function(done){ const L=App.live, st=L&&L.stage; if(!st){ return _v18Walkout.apply(this,arguments); }
  const now=performance.now(); const F=v18WalkFocus={L,st,phase:'intro',pt:now,it:now,side:-1,xi:null,idx:-1,pid:null,skip:false,jump:false,crane:0,fresh:true,e:null,t:null};
  const P=st._p3d; if(P&&!P.dead&&P.dir) P.dir.snap=true;
  return _v18Walkout.call(this,function(){ if(v18WalkFocus===F){
      v18WalkMini(F,false); if(F.skip||st.rm){ v18WalkFocus=null; v18Cut(st); } else { F.crane=performance.now(); F.phase='crane'; } }
    setTimeout(()=>{ if(!v18WalkFocus||v18WalkFocus.crane||v18WalkFocus.L!==L) v18WalkClass(false); },440);
    return done.apply(this,arguments); }); };
/* skip buttons: a tap during the opponents jumps to your XI (cut when the screen changes); "Skip all" or a tap during
   yours ends the walkout (cut to the kick-off preset) */
for(const k of ['liveIntroSkip','paSkipAll','paSkipThem']){ const f=A[k]; if(typeof f!=='function') continue;
  A[k]=function(){ const F=v18WalkFocus; if(F&&App.live===F.L&&!F.crane){ if(k==='paSkipAll'||(k==='liveIntroSkip'&&(F.phase==='mine'||F.phase==='coach'))) F.skip=true; else F.jump=true; } return f.apply(this,arguments); }; }

(function(){ const D=P3D_MODULES.find(m=>m.name==='director'); if(!D) return;
  const _pick=D.pick, _pose=D.pose;
  D.pick=function(P,st){
    if(P.kind==='photo'){ const sc=this.scorer(st); if(sc){ P.dir.cel=sc; return 'celeb'; } return _pick.call(this,P,st); }
    const F=P.kind==='live'?v18WalkRead():null;
    if(F&&F.st===st){ v18WalkClass(!F.crane,st);
      /* both presets are fully posed here (damped with real time in v18WalkPose, or a timed path for the crane), so the
         director snaps to them every frame: its cutAt is read before pick, so this applies from the next frame on */
      const m=F.crane?(performance.now()-F.crane<V18_CRANE_MS+400?'crane':null):'walkout';
      if(!m){ v18WalkFocus=null; return _pick.call(this,P,st); }
      v18WalkMini(F,m==='walkout'); if(v18WalkSeen[v18WalkSeen.length-1]!==m) v18WalkSeen.push(m);
      if(F.fresh){ F.fresh=false; F.e=null; } P.dir.cutAt=performance.now(); return m; }
    return _pick.call(this,P,st); };
  const V18_CRANE_MS=2000;
  const sm=x=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
  D.pose=function(P,st,mode,eye,tgt){
    if(mode==='walkout') return v18WalkPose(P,st,eye,tgt);
    if(mode==='crane'){ const F=v18WalkFocus; const u=sm(F?(performance.now()-F.crane)/V18_CRANE_MS:1);
      v18GantryPose(P,52.5,72,0.74,30,eye,tgt); const ex=eye.x, ey=eye.y, ez=eye.z, tx=tgt.x, tz=tgt.z;
      /* from low by the near touchline, left of halfway, up and round to the high wide shot */
      eye.set(34+(ex-34)*u, 2.2+(ey-2.2)*u+Math.sin(u*Math.PI)*6, 75+(ez-75)*u); tgt.set(52.5+(tx-52.5)*u, 1.2*(1-u), 34+(tz-34)*u); return 42+(30-42)*u; }
    return _pose.call(this,P,st,mode,eye,tgt); };
})();

/* the walkout pose: a slow, damped dolly kept on the focus (P.dir already damps on top of this) */
function v18WalkPose(P,st,eye,tgt){ const F=v18WalkFocus; if(!F||st.rm){ v18GantryPose(P,52.5,72,0.74,30,eye,tgt); return 30; }
  const now=performance.now(), dt=Math.min(0.5,F.lt?(now-F.lt)/1000:0.016), T=P.T; F.lt=now;
  const side=F.side<0?F.L.M.user:F.side, dir=side===0?1:-1;
  const pl=[...st.players.values()].filter(p=>p.side===side&&!p.off);
  let ex,ey,ez,tx,ty,tz,fov,om;
  if(F.phase==='vs'||!pl.length){ ex=52.5; ey=8.5; ez=68+17; tx=52.5; ty=0.5; tz=34; fov=36; om=2; }
  else { let ax=0, ay=0; for(const p of pl){ ax+=p.x; ay+=p.y; } ax/=pl.length; ay/=pl.length;
    const p=F.pid?st.players.get(F.pid):null;
    if(F.phase==='coach'){ ex=ax+dir*7; ey=3.2; ez=Math.min(ay+24,92); tx=ax+dir*2; ty=1; tz=ay; fov=40; om=1.2; }
    else if(p&&!p.off){ const k=Math.min(1,(now-F.it)/2600); /* a slow push-in while the name is called */
      ex=p.x+dir*(4.6-0.9*k); ey=1.7; ez=p.y+(6.2-1.2*k); tx=p.x; ty=1.25; tz=p.y; fov=34; om=F.phase==='them'?3:2.4; }
    else { /* the team intro: dolly along the line, keeper end to halfway */
      const xs=pl.map(p=>p.x); const x0=dir>0?Math.min(...xs):Math.max(...xs), x1=dir>0?Math.max(...xs):Math.min(...xs);
      const u=Math.max(0,Math.min(1,(now-F.pt)/5200)); const x=x0+(x1-x0)*(0.15+0.7*u);
      ex=x+dir*5.5; ey=1.7; ez=Math.min(ay+9,80); tx=x-dir*1.5; ty=1.15; tz=ay; fov=40; om=2; } }
  if(!F.e){ F.e={p:new T.Vector3(ex,ey,ez),v:new T.Vector3()}; F.t={p:new T.Vector3(tx,ty,tz),v:new T.Vector3()}; F.fov=fov; }
  else { v18DampV(F.e,{x:ex,y:ey,z:ez},om,dt); v18DampV(F.t,{x:tx,y:ty,z:tz},om*1.25,dt); F.fov+=(fov-F.fov)*Math.min(1,dt*2); }
  eye.copy(F.e.p); tgt.copy(F.t.p); return F.fov; }

/* ---------- Courier photos in 3-D ---------- */
const _v18AttachW=v18Attach;
v18Attach=function(st){ let kind='other'; try{ kind=v18KindOf(st); }catch(e){}
  if(kind!=='photo') return _v18AttachW.apply(this,arguments);
  const keep=PREFS.rtier; PREFS.rtier='C'; let P; try{ P=_v18AttachW.apply(this,arguments); } finally{ PREFS.rtier=keep; }
  if(P&&!P.dead){ v18Photo.n++; const hud=st.cv, enc=HTMLCanvasElement.prototype.toDataURL;
    hud.toDataURL=function(type,q){ const Q=st._p3d; if(!Q||Q.dead) return enc.call(this,type,q);
      try{ Q.render(); const out=document.createElement('canvas'); out.width=640; out.height=400; const g=out.getContext('2d');
        g.drawImage(Q.canvas,0,0,640,400); g.drawImage(this,0,0,640,400); const url=enc.call(out,type,q); v18Photo.last=url; return url; }
      catch(e){ console.warn('v18 photo',e); return enc.call(this,type,q); } }; }
  return P; };
