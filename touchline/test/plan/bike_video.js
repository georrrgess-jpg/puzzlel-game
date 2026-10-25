/* Records a bicycle kick as video frames on a stepped clock (page.clock): every frame advances game time by exactly 1/30 s and
   is then screenshotted, so the clip plays at true speed however slowly software WebGL renders.
   node test/plan/bike_video.js lab  <2d|3d> <outDir> [view] [zoom]   - the lab's forced bicycle kick, ~5 s
   node test/plan/bike_video.js live <2d|3d> <outDir> [view] [zoom]   - a live career match: the first cross goal is a bicycle kick
                                                                         (forced); build-up, kick, celebration and the replay
   view: broadcast | sideline (default sideline), zoom: wide | normal | close | tight (default close)
   -> outDir/f00000.png ... ; then: ffmpeg -framerate 30 -i outDir/f%05d.png -pix_fmt yuv420p out.mp4 */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const mode=process.argv[2]||'lab', rend=process.argv[3]||'3d', OUT=path.resolve(process.argv[4]||'/tmp/bike_video'), view=process.argv[5]||'sideline', zoom=process.argv[6]||'close';
fs.mkdirSync(OUT,{recursive:true}); for(const f of fs.readdirSync(OUT)) if(/^f\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT,f));
const FPS=30, VW=1280, VH=720;
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const errs=[];
  const page=await b.newPage({viewport:{width:VW,height:VH}}); page.on('pageerror',e=>errs.push(e.message));
  await page.clock.install(); let n=0; let paused=false; const pause=async()=>{ if(paused) return; paused=true; const t=await page.evaluate(()=>Date.now()); await page.clock.pauseAt(t+3000); }; const shot=async(clip)=>{ await page.screenshot({path:path.join(OUT,'f'+String(n++).padStart(5,'0')+'.png'),clip}); };
  const step=async()=>{ await page.clock.runFor(1000/FPS); };
  if(mode==='lab'){
    await page.goto(DIST+'#anim-lab'); await pause(); await page.clock.runFor(1500);
    await page.evaluate(([r,v,z])=>{ const side=v==='side'; PREFS.renderer=r; PREFS.view=side?'broadcast':v; PREFS.zoom=z; PREFS.plates=!side; labRun('bike');
      /* 'side': a camera beside the scorer, square to his facing, 7 m away at hip height (fixed once he is in his set) */
      if(side&&r==='3d'){ const C={}; P3D_MODULES.push({name:'bike-side',order:28,frame(P,st){ const K=st._v186x, p=K&&K.pl; if(!p) return; const fresh=p.v186xc!=null&&C.tc!==p.v186xc;
          if(fresh){ C.tc=p.v186xc; C.x=p.x; C.y=p.y; C.yaw=p.v186xy!=null?p.v186xy:(p.yaw||0); } if(C.x==null) return; C.x+=(p.x-C.x)*0.12; C.y+=(p.y-C.y)*0.12; const y=C.yaw, sx=-Math.sin(y), sy=Math.cos(y), d=6.2;
          P.camera.fov=30; P.camera.updateProjectionMatrix(); P.camera.position.set(C.x+sx*d,1.25,C.y+sy*d); P.camera.lookAt(C.x,0.95,C.y); P.camera.updateMatrixWorld(); }}); }
      if(side&&r==='2d'){ const st=App.labSt; } },[rend,view,zoom]); await page.clock.runFor(3000);
    const box=await page.evaluate(()=>{ const c=document.querySelector('#anim-lab .lab-cv'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
    /* wait (stepping) until the cross is struck toward the scorer, record through the kick and his getting up */
    await page.evaluate(()=>{ window.__ff=true; const D0=Stage.prototype.drawLerp; Stage.prototype.drawLerp=function(){ if(window.__ff) return; return D0.apply(this,arguments); }; });
    let t=0; while(t++<2000){ await step(); if(await page.evaluate(()=>{ const st=App.labSt, K=st&&st._v186x; return !!(K&&K.armed&&!K.struck&&K.pl&&K.pl.v186xc==null); })) break; }
    await page.evaluate(()=>{ window.__ff=false; });
    let after=null, seen=false; for(let i=0;i<FPS*8;i++){ await step(); await shot(box); const s=await page.evaluate(()=>{ const st=App.labSt, K=st&&st._v186x; return {on:!!(K&&K.pl&&K.pl.v186xk)}; }); if(s.on) seen=true; if(seen&&!s.on&&after==null) after=i; if(after!=null&&i-after>FPS*0.8) break; } }
  else {
    await page.goto(DIST); await pause(); await page.clock.runFor(800);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Video Coach'); await page.fill('#nc-seed',process.env.SEED||'bike1');
    await page.click('[data-a="ncNext"]'); await page.clock.runFor(300); await page.click('[data-a="createCareer"]'); await page.clock.runFor(1200);
    /* the engine's own run of the user's next match: the first goal from a cross */
    const tgt=await page.evaluate(()=>{ const C=App.C; const f=userFixture(C); const cl=JSON.parse(JSON.stringify(C)); const od=oddsFor(f.id); const v=validateLineup(cl,cl.userSid,'V'); if(!v.ok) repairLineup(cl,cl.userSid,'V');
      const M=startMatch(cl,f.id,{halftime:false,preP:[od.h,od.a]}); runToEnd(cl,M); const g=M.ev.filter(e=>e.t==='goal'&&e.ty==='cross'); return g.length?{m:g[0].m,pid:g[0].pid,all:g.map(e=>e.m)}:null; });
    console.log('target',JSON.stringify(tgt)); if(!tgt){ console.log('no cross goal in this match; try another SEED'); await b.close(); return; }
    await page.evaluate(([r,v,z])=>{ PREFS.renderer=r; PREFS.view=v; PREFS.zoom=z; PREFS.replays=true; PREFS.plates=true;
      /* fast-forward without drawing (software WebGL would take minutes per match minute) */
      window.__ff=true; const D0=Stage.prototype.drawLerp; Stage.prototype.drawLerp=function(){ if(window.__ff) return; return D0.apply(this,arguments); }; },[rend,view,zoom]);
    await page.click('.cta [data-a="playNext"]'); await page.clock.runFor(600);
    await page.click('[data-a="pvSpeed"][data-v="8"]').catch(()=>{}); await page.click('[data-a="kickoff"]'); await page.clock.runFor(500);
    /* fast-forward at 8x to just before the target minute (half-time talk skipped), then 1x */
    await page.evaluate(m=>{ window.__tm=m; V186X.force=null; },tgt.m);
    let k=0; while(k++<20000){ await page.clock.runFor(250); if(await page.$('#lv-ht .htbox')) await page.click('#ht-go').catch(()=>{});
      const s=await page.evaluate(()=>{ const L=App.live; return L&&L.M?{min:L.M.min,cont:!!document.querySelector('#lv-cont')}:null; }); if(!s||s.cont) break; if(s.min>=tgt.m-1) break; }
    /* BOOST: the odds raised so the goal is a bicycle kick by the game's own decision (its reach check still applies), else forced */
    await page.evaluate(([f,boost])=>{ const L=App.live; V186X.force=boost?null:f; if(boost) V186X.Kb=50; const b=document.querySelector('[data-a="liveSpeed"][data-v="1"]'); if(b) b.click(); else if(L) L.speed=1; window.__ff=false; },[process.env.NOFORCE?null:'bike',!!process.env.BOOST]);
    /* step until the target goal's sequence starts, then record it all: build-up, the kick, the celebration and the replay */
    await page.evaluate(()=>{ window.__ff=true; });
    k=0; while(k++<20000){ await page.clock.runFor(100); const s=await page.evaluate(m=>{ const L=App.live, st=L&&L.stage; return {seq:!!(st&&st._v186x), min:L&&L.M&&L.M.min}; },tgt.m); if(s.seq) break; if(s.min>tgt.m+1) { console.log('missed the goal'); break; } }
    /* the build-up without drawing until the attack reaches the final third (a few seconds before the kick) */
    const third=+(process.env.THIRD||30); k=0; while(k++<3000){ await step(); if(await page.evaluate(third=>{ const st=App.live&&App.live.stage, K=st&&st._v186x; if(!K) return true; const gx=K.s===0?105:0; return !!(K.armed||(st.own&&st.own.side===K.s&&Math.abs(st.ball.x-gx)<third)); },third)) break; }
    for(let i=0;i<Math.round(FPS*(+process.env.LEAD||1.0));i++){ if(await page.evaluate(()=>{ const st=App.live&&App.live.stage, K=st&&st._v186x; return !K||K.armed; })) break; await step(); }
    await page.evaluate(()=>{ window.__ff=false; });
    const box=await page.evaluate(()=>{ const r=document.getElementById('lv-canvas').getBoundingClientRect(); return {x:Math.max(0,r.x),y:Math.max(0,r.y),width:Math.min(r.width,innerWidth),height:Math.min(r.height,innerHeight)}; });
    let endAt=null; for(let i=0;i<FPS*45;i++){ await step(); await shot(box); const s=await page.evaluate(()=>{ const L=App.live, st=L&&L.stage; return {rp:!!(st&&st._rp), sx:!!(st&&st._v186x), min:L&&L.M&&L.M.min}; });
      if(endAt==null&&i>FPS*6&&!s.rp&&!s.sx) endAt=i; if(endAt!=null&&i-endAt>FPS*1.2) break; } }
  const log=await page.evaluate(()=>typeof V186X==='object'?V186X.log.slice(-3):null).catch(()=>null);
  console.log(JSON.stringify({mode,rend,frames:n,log,errors:errs.slice(0,3)})); await b.close(); })();
