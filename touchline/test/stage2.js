// v17 Phase 0 stage housekeeping: render-scale recovery, paused/off-screen/hidden idling, start-screen demo cap,
// preview loops that stop with their canvas, the renderer preference. Run from touchline/: node test/stage2.js
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c){ fails++; process.exitCode=1; } };
const wait=ms=>new Promise(r=>setTimeout(r,ms));
/* page helpers: count calls of obj[name] (own wrapper, removed afterwards) */
const HELPERS=()=>{ window.T2={
  spy(obj,name){ const own=Object.prototype.hasOwnProperty.call(obj,name); const f=obj[name]; const s={n:0}; obj[name]=function(){ s.n++; return f.apply(this,arguments); }; s.off=()=>{ if(own) obj[name]=f; else delete obj[name]; }; return s; },
  count(obj,name,ms){ return new Promise(r=>{ const s=T2.spy(obj,name); setTimeout(()=>{ s.off(); r(s.n); },ms); }); },
  frames(ms){ return new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<ms) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }); },
  ctxCount(cv){ const g=cv.getContext('2d'); if(!g._t2){ const f=g.clearRect; g._t2={n:0}; g.clearRect=function(){ g._t2.n++; return f.apply(this,arguments); }; } return g._t2; },
  box(id,css){ let b=document.getElementById(id); if(b) b.remove(); b=document.createElement('div'); b.id=id; b.style.cssText='position:fixed;left:20px;top:20px;width:200px;height:220px;z-index:9999;'+(css||''); const cv=document.createElement('canvas'); cv.style.cssText='width:100%;height:100%;display:block'; b.appendChild(cv); document.body.appendChild(b); return cv; } }; };

(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(1200); await page.evaluate(HELPERS);

  /* ---------- renderer preference defaults ---------- */
  const pref0=await page.evaluate(()=>({p:PREFS.renderer,d:DEFAULT_PREFS.renderer,kinds:['live','lab','tv','photo','menu','preview'].map(k=>rendererFor(k))}));
  ok(pref0.p==='auto'&&pref0.d==='auto','PREFS.renderer defaults to auto ('+pref0.p+')');
  ok(pref0.kinds.every(k=>k==='2d'),'rendererFor() returns 2d for every kind ('+pref0.kinds.join(',')+')');

  /* ---------- render-scale policy (synthetic clock) ---------- */
  const pol=await page.evaluate(()=>{ const mk=rs=>({rs,demo:false,cam:{w:40,x:30,tw:40},_v17:{up:-1e9,down:-1e9,fast:null,noUp:false},resize(){ this.cam.w=this.cam.tw=99; this.cam.x=52.5; this.nres=(this.nres||0)+1; }});
    const run=(st,t,dur,fi,log)=>{ const end=t+dur; for(;t<end;t+=fi){ const before=st.rs; v17RenderScale(st,t,fi); if(log&&st.rs!==before) log.push([Math.round(t),before,st.rs]); } return t; };
    const out={};
    /* fast frames at rs .7 climb back to 1, one 0.12 step per ~3 s, camera preserved */
    let a=mk(0.7), L=[]; run(a,1000,2900,16.7,L); out.noEarly=a.rs===0.7; run(a,3900,9000,16.7,L); out.climb=L.map(x=>x[2]); out.climbT=L.map(x=>x[0]); out.cam=a.cam.w===40&&a.cam.x===30;
    /* slow frames drop as before (after 90 draws, 0.12, floor 0.7) */
    let b=mk(1); L=[]; let t=run(b,1000,4000,40,L); out.drop=L.map(x=>x[2]);
    /* fast right after a drop: no raise within 5 s of the drop */
    const tDrop=L.length?L[L.length-1][0]:t; let tt=run(b,t,4900-(t-tDrop),16.7,L); out.heldAfterDrop=b.rs===L[L.length-1][2]; run(b,tt,3000,16.7,L); out.raisedLater=b.rs>L.filter(x=>x[2]<x[1]).pop()[2];
    /* a raise followed by a drop within 10 s stops raising for good */
    let c=mk(0.7); L=[]; t=run(c,1000,3300,16.7,L); const r1=c.rs; t=run(c,t,4000,40,L); const d1=c.rs; t=run(c,t,30000,16.7,L); out.osc={r1,d1,end:c.rs,noUp:c._v17.noUp,changes:L.length};
    return out; });
  ok(pol.noEarly,'no raise before 3 s of fast frames');
  ok(pol.climb.join(',')==='0.82,0.94,1','fast frames raise rs 0.7 -> 0.82 -> 0.94 -> 1 ('+pol.climb.join(',')+' at '+pol.climbT.join(',')+' ms)');
  ok(pol.cam,'a render-scale change keeps the camera (cam.w, cam.x)');
  ok(pol.drop[0]===0.88,'slow frames still drop rs by 0.12 ('+pol.drop.join(',')+')');
  ok(pol.heldAfterDrop&&pol.raisedLater,'no raise within 5 s of a drop, raise after that');
  ok(pol.osc.r1===0.82&&pol.osc.d1===0.7&&pol.osc.end===0.7&&pol.osc.noUp&&pol.osc.changes===2,'raise then drop within 10 s: raising stops for the stage ('+JSON.stringify(pol.osc)+')');

  /* ---------- start-screen demo: 30 fps cap ---------- */
  const demo=await page.evaluate(async()=>{ const st=App.menuShow; if(!st) return null; document.querySelectorAll('.start-ui,.beam,.start-grain,.start-live,.start-bug').forEach(e=>e.style.display='none'); st.draw=function(){};
    await new Promise(r=>setTimeout(r,500)); const [d,f]=await Promise.all([T2.count(st,'drawLerp',3000),T2.frames(3000)]);
    document.querySelectorAll('.start-ui,.beam,.start-grain,.start-live,.start-bug').forEach(e=>e.style.display=''); return {draws:d/3,fps:f/3}; });
  ok(demo&&demo.draws<=32&&(demo.fps<40||demo.draws>=15),'demo stage draws at most 30 fps ('+(demo?demo.draws.toFixed(1)+' draws/s at '+demo.fps.toFixed(1)+' page fps'+(demo.fps<40?'; page too slow under load to exercise the cap':''):'no demo')+')');
  const t0=await page.evaluate(()=>App.menuShow.now);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.waitForTimeout(250);
  const held=await page.evaluate(async()=>{ const st=App.menuShow; const n0=st.now; const d=await T2.count(st,'drawLerp',1500); return {d,step:st.now-n0}; });
  ok(held.d===0&&held.step===0,'career form open: demo draws 0 and stops stepping ('+held.d+' draws, '+held.step.toFixed(0)+' ms stepped)');
  await page.click('.modal [data-a="closeModal"]'); await page.waitForTimeout(150);
  const back=await page.evaluate(async()=>{ const st=App.menuShow; const n0=st.now; const d=await T2.count(st,'drawLerp',1500); return {d,step:st.now-n0}; });
  ok(back.d>=5&&back.step>300,'demo resumes when the form closes ('+back.d+' draws, '+back.step.toFixed(0)+' ms stepped)');
  await page.evaluate(()=>A.whatsNew()); await page.waitForTimeout(250);
  const held2=await page.evaluate(()=>T2.count(App.menuShow,'drawLerp',1200));
  ok(held2===0,'any modal (What\'s new) holds the demo ('+held2+' draws)');
  await page.evaluate(()=>{ App.modal=null; renderModal(); }); await page.waitForTimeout(150);
  const back2=await page.evaluate(async()=>{ const st=App.menuShow; const n0=st.now; const d=await T2.count(st,'drawLerp',1500); return {d,step:Math.round(st.now-n0)}; });
  ok(back2.d>=2&&back2.step>100,'demo resumes after the modal closes ('+JSON.stringify(back2)+')');
  await page.evaluate(()=>A.openTheme()); await page.waitForTimeout(250);
  ok(await page.evaluate(()=>T2.count(App.menuShow,'drawLerp',1000))===0,'the theme drawer holds the demo too');
  await page.evaluate(()=>{ App.drawer=null; renderModal(); }); await page.waitForTimeout(150);
  ok(t0>0,'demo stage was running');

  /* ---------- new career; demo is gone with the start screen ---------- */
  await page.evaluate(()=>{ window.__oldDemo=App.menuShow; });
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Stage Two'); await page.fill('#nc-seed','stage2');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(()=>!window.__oldDemo.alive&&!v17Parked.has(window.__oldDemo._v17.wake)),'leaving the start screen destroys the demo stage (no parked check left)');
  await page.evaluate(()=>{ for(let i=0;i<3;i++){ simRound(App.C); advance(App.C); } App.modal=null; render(); });

  /* ---------- preview loops ---------- */
  const prev=await page.evaluate(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const p=Object.values(App.C.players).find(x=>x.sid===App.C.userSid); const out={};
    const cycle=async(name,cv,start)=>{ const c=T2.ctxCount(cv); start(); await sl(500); const a=c.n; await sl(600); const r={vis:c.n-a};
      cv.parentElement.style.top='3000px'; await sl(250); let b=c.n; await sl(800); r.off=c.n-b;
      cv.parentElement.style.top='20px'; await sl(250); b=c.n; await sl(600); r.back=c.n-b;
      cv.parentElement.style.display='none'; await sl(250); b=c.n; await sl(800); r.hidden=c.n-b;
      cv.parentElement.style.display='block'; await sl(250); b=c.n; await sl(600); r.back2=c.n-b;
      cv.parentElement.remove(); await sl(150); b=c.n; await sl(800); r.removed=c.n-b; out[name]=r; };
    await cycle('figurePreview',T2.box('t2-fp'),function(){ figurePreview(document.querySelector('#t2-fp canvas'),p); });
    await cycle('celebPreview',T2.box('t2-cp'),function(){ celebPreview(document.querySelector('#t2-cp canvas'),p,'classic'); });
    /* fireworks: run over -> stops; Celebrate again -> resumes; removed -> stops for good */
    const fcv=T2.box('t2-fw','width:300px;height:200px'); const fc=T2.ctxCount(fcv); const fw=new Fireworks(fcv,['#ff0000','#ffffff']);
    await sl(400); let b=fc.n; await sl(500); const fr={vis:fc.n-b};
    fcv.parentElement.style.display='none'; await sl(250); b=fc.n; await sl(700); fr.hidden=fc.n-b; fcv.parentElement.style.display='block'; await sl(250); b=fc.n; await sl(500); fr.back=fc.n-b;
    fw.t=fw.dur+5; fw.conf=[]; fw.rk=[]; fw.p=[]; await sl(250); b=fc.n; await sl(800); fr.over=fc.n-b;
    fw.restart(); await sl(150); b=fc.n; await sl(500); fr.again=fc.n-b;
    fcv.parentElement.remove(); await sl(150); b=fc.n; await sl(700); fr.removed=fc.n-b; fr.alive=fw.alive; out.Fireworks=fr;
    out.parked=v17Parked.size; return out; });
  for(const k of ['figurePreview','celebPreview']){ const r=prev[k];
    ok(r.vis>=5&&r.back>=5&&r.back2>=5,k+' animates while visible and resumes after off-screen/hidden ('+JSON.stringify(r)+')');
    ok(r.off===0&&r.hidden===0,k+' draws nothing while off-screen or display:none');
    ok(r.removed===0,k+' stops when its canvas is removed'); }
  const fr=prev.Fireworks;
  ok(fr.vis>=5&&fr.hidden===0&&fr.back>=4,'Fireworks idles while hidden and resumes ('+JSON.stringify(fr)+')');
  ok(fr.over===0&&fr.again>=4,'Fireworks stops when its run is over and Celebrate again restarts it');
  ok(fr.removed===0&&fr.alive===false,'Fireworks stops for good when its canvas is removed');
  ok(prev.parked===0,'no parked preview checks left behind ('+prev.parked+')');

  /* kit lab figures */
  await page.evaluate(()=>A.go({dataset:{r:'kits'}})); await page.waitForTimeout(600);
  const kl=await page.evaluate(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const cvs=[...document.querySelectorAll('[data-klfig],[data-klclash]')]; if(!cvs.length) return null;
    const r={n:cvs.length}; r.vis=await T2.count(window,'spotlightBg',600);
    const hide=v=>cvs.forEach(cv=>cv.style.display=v?'none':''); hide(true); await sl(300); r.hidden=await T2.count(window,'spotlightBg',800); r.run=App._klRun;
    hide(false); await sl(300); r.back=await T2.count(window,'spotlightBg',600);
    A.go({dataset:{r:'office'}}); await sl(300); r.away=await T2.count(window,'spotlightBg',600); return r; });
  ok(kl&&kl.vis>=5&&kl.back>=5,'kit lab figures animate and resume ('+JSON.stringify(kl)+')');
  ok(kl&&kl.hidden===0&&kl.run===false,'kit lab loop parks while none of its canvases is visible');
  ok(kl&&kl.away===0,'kit lab loop stops when leaving the kits page');

  /* Courier photo (an off-screen visibility:hidden render target) still renders a real frame */
  const photo=await page.evaluate(async()=>{ const C=App.C; const fid=Object.keys(C.logs).find(f=>{ const lg=C.logs[f]; return lg&&lg.lu&&lg.ev&&lg.ev.some(e=>e.t==='goal'); }); if(!fid) return null;
    const url=await shootPhoto(fid+':0'); const c=document.createElement('canvas'); c.width=640; c.height=400; const blank=c.toDataURL('image/jpeg',0.84); return {len:url.length,blank:blank.length}; });
  ok(!photo||photo.len>photo.blank*3,'off-screen Courier photo stage still draws ('+(photo?photo.len+' vs blank '+photo.blank:'no goal to shoot')+')');

  /* ---------- renderer preference: Settings row, persists across reload ---------- */
  await page.evaluate(()=>A.go({dataset:{r:'settings'}})); await page.waitForTimeout(300);
  const row=await page.evaluate(()=>{ const s=document.querySelector('#set-renderer'); const card=s&&s.closest('.card'); return s?{opts:[...s.options].map(o=>o.textContent),val:s.value,card:card&&card.querySelector('h3').textContent,label:document.querySelector('label[for="set-renderer"]').textContent}:null; });
  ok(row&&row.card==='Appearance'&&row.label==='Match graphics'&&row.opts.join('|')==='Auto (recommended)|Classic 2D'&&row.val==='auto','Settings > Appearance has the Match graphics row ('+JSON.stringify(row)+')');
  await page.selectOption('#set-renderer','2d'); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>PREFS.renderer==='2d'&&JSON.parse(localStorage.getItem(PREF_KEY)).renderer==='2d'),'choosing Classic 2D sets PREFS.renderer and saves it');
  await page.evaluate(()=>saveNow()); await page.reload(); await page.waitForTimeout(1000); await page.evaluate(HELPERS);
  ok(await page.evaluate(()=>PREFS.renderer==='2d'&&rendererFor('live')==='2d'),'renderer preference survives a reload');
  if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); } /* boot reopens the last slot by itself */
  await page.evaluate(()=>A.go({dataset:{r:'settings'}})); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>document.querySelector('#set-renderer').value==='2d'),'the Settings select shows the saved choice after reload');
  await page.selectOption('#set-renderer','auto'); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>PREFS.renderer==='auto'),'switching back to Auto works');

  /* ---------- live match: paused stage idles, off-screen and hidden stages stop drawing ---------- */
  await page.evaluate(()=>{ App.C.settings.walkout='off'; App.modal=null; App.route='office'; render(); });
  await page.locator('[data-a="playNext"]:visible').first().click(); await page.waitForTimeout(400);
  await page.locator('[data-a="kickoff"]:visible').first().click(); await page.waitForTimeout(800);
  for(let i=0;i<5;i++){ await page.click('#lv-canvas',{force:true}).catch(()=>{}); await page.waitForTimeout(200); }
  await page.waitForTimeout(800);
  const live=await page.evaluate(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const L=App.live, st=L.stage; const r={};
    r.playing=await T2.count(st,'drawLerp',1000);
    A.livePause(); r.isPaused=L.paused&&st.paused; await sl(300); r.paused3s=await T2.count(st,'drawLerp',3000);
    let s=T2.spy(st,'drawLerp'); st.resize(); r.resizeSync=s.n; s.off();
    /* time from a change to the next draw, measured right after a cadence draw (the 2 fps cadence alone would take ~480 ms) */
    const delay=async act=>{ const q=T2.spy(st,'drawLerp'); const n0=q.n; while(q.n===n0) await sl(4); const n1=q.n; const t=performance.now(); act(); while(q.n===n1&&performance.now()-t<1500) await sl(4); const d=performance.now()-t; q.off(); return Math.round(d); };
    r.modeDelay=await delay(()=>{ st.mode=st.mode==='tactical'?'broadcast':'tactical'; st.bgTac=null; });
    r.modeBack=await delay(()=>{ st.mode='broadcast'; st.bgTac=null; });
    r.reqDelay=await delay(()=>st.requestDraw());
    r.cadence=await delay(()=>{});
    s=T2.spy(st,'drawLerp'); A.livePause(); await sl(70); r.resumeDraw=s.n; s.off(); r.resumed=!L.paused&&!st.paused;
    await sl(300); r.after=await T2.count(st,'drawLerp',1000);
    /* off-screen: push the stage far below the fold (it keeps stepping) */
    const box=document.getElementById('lv-stage'); box.style.transform='translateY(6000px)'; await sl(300); let n0=st.now; r.off=await T2.count(st,'drawLerp',1500); r.offStep=st.now-n0;
    box.style.transform=''; await sl(150); r.onAgain=await T2.count(st,'drawLerp',1000);
    /* tab hidden */
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange')); await sl(150); r.hidden=await T2.count(st,'drawLerp',1200);
    delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); await sl(100); r.shown=await T2.count(st,'drawLerp',1000);
    r.rs=st.rs||1; return r; });
  ok(live.isPaused,'live match paused');
  ok(live.paused3s<=12,'paused live stage draws <= 4 per second ('+(live.paused3s/3).toFixed(1)+'/s; was every frame)');
  ok(live.resizeSync>=1,'paused stage repaints at once on resize');
  ok(live.modeDelay<300&&live.modeBack<300,'paused stage repaints at once on a broadcast/tactical switch ('+live.modeDelay+' / '+live.modeBack+' ms; idle cadence '+live.cadence+' ms)');
  ok(live.reqDelay<300,'stage.requestDraw() repaints a paused stage at once ('+live.reqDelay+' ms)');
  ok(live.cadence>=400,'without a change the paused cadence is ~2 fps ('+live.cadence+' ms)');
  ok(live.resumed&&live.resumeDraw>=1&&live.after>=4,'resume repaints at once and drawing continues ('+live.after+' draws/s)');
  ok(live.off===0&&live.offStep>500,'off-screen live stage draws 0/s and keeps stepping ('+live.off+' draws, '+Math.round(live.offStep)+' ms stepped)');
  ok(live.onAgain>=4,'it draws again as soon as it is back on screen ('+live.onAgain+'/s)');
  ok(live.hidden===0&&live.shown>=4,'hidden tab: no draws; visible again: drawing resumes ('+live.hidden+' / '+live.shown+')');

  /* ---------- real fast frames: rs climbs back after being forced low ---------- */
  const rec=await page.evaluate(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const st=App.live.stage; if(App.live.paused) A.livePause();
    st.draw=function(){}; st.rs=0.7; v17Rescale(st); const dpr0=st.dpr; const t0=performance.now();
    while(performance.now()-t0<18000&&(st.rs||1)<1) await sl(200); return {rs:st.rs,ms:Math.round(performance.now()-t0),dpr0,dpr:st.dpr}; });
  ok(rec.rs===1&&rec.dpr>rec.dpr0,'forced to 0.7, the live stage climbs back to rs 1 with fast frames ('+JSON.stringify(rec)+')');

  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); if(errs.length){ fails++; process.exitCode=1; }
  console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close();
})().catch(e=>{ console.log('FAIL crashed: '+e.message); process.exitCode=1; });
