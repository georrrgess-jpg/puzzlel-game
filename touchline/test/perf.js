/* Touchline performance harness (v17). A measurement, not a test: it always exits 0 and is not part of run_all.sh.
   Merges the v16 plan scripts (test/plan/perf.js, uiperf.js, startperf.js) into one run that prints ONE JSON line per
   profile:
     start   start screen: page fps over 3 s, demo-stage draws per second, SVG / <filter> counts; then the same with
             the new-career form open (formFps, formDraws over 2 s)
     live    live match (walkout off, intros skipped): page fps and stage draws per second over 8 s, mean drawLerp ms,
             update ms per drawn frame, long tasks (count, total ms) and the final render scale (rs)
     paused  stage draws per second while the live match is paused (3 s)
     routes  per route after simulating 6 rounds: render() ms cold + 3 warm, HTML KB, DOM nodes, SVG count, <filter> count
   Usage (from touchline/):
     node test/perf.js                     desktop 1440x900 dpr1, desktop 1440x900 dpr2, phone 390x844 dpr3 (isMobile)
     node test/perf.js --quick             desktop dpr1 only
     node test/perf.js --json out.json     also write the array of results to out.json
     node test/perf.js --dist path.html    measure another build (e.g. a saved copy of the previous dist)
   Headless Chromium renders in software here: compare ratios between builds, not absolute numbers. */
const { chromium, DIST } = require('./_pw');
const fs=require('fs'), path=require('path');
const argv=process.argv.slice(2); const has=k=>argv.includes(k); const arg=k=>{ const i=argv.indexOf(k); return i>=0?argv[i+1]:null; };
const URL=arg('--dist')?'file://'+path.resolve(arg('--dist')):DIST;
const PROFILES=[
  {profile:'desktop-1440x900@1',W:1440,H:900,dpr:1},
  {profile:'desktop-1440x900@2',W:1440,H:900,dpr:2},
  {profile:'phone-390x844@3',W:390,H:844,dpr:3,mobile:true}];
const r1=v=>Math.round(v*10)/10, r2=v=>Math.round(v*100)/100;

async function measure(browser,P){
  const ctx=await browser.newContext({viewport:{width:P.W,height:P.H},deviceScaleFactor:P.dpr,isMobile:!!P.mobile,hasTouch:!!P.mobile});
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  const out={profile:P.profile,W:P.W,H:P.H,dpr:P.dpr};
  try{
    await page.goto(URL); await page.waitForTimeout(1500);
    /* start screen: page frames and demo-stage draws over 3 s */
    out.start=await page.evaluate(()=>new Promise(res=>{ const st=App.menuShow; let draws=0; if(st){ const D=st.drawLerp; st.drawLerp=function(){ draws++; return D.apply(this,arguments); }; }
      let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<3000) requestAnimationFrame(f); else { if(st) delete st.drawLerp; res({fps:Math.round(n/3*10)/10,draws:Math.round(draws/3*10)/10,rs:st?(st.rs||1):null,svg:document.querySelectorAll('svg').length,filters:document.querySelectorAll('filter').length}); } }; requestAnimationFrame(f); }));
    /* the new-career form open over the start screen: page fps and demo draws over 2 s */
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.waitForTimeout(300);
    Object.assign(out.start,await page.evaluate(()=>new Promise(res=>{ const st=App.menuShow; let draws=0; if(st){ const D=st.drawLerp; st.drawLerp=function(){ draws++; return D.apply(this,arguments); }; }
      let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else { if(st) delete st.drawLerp; res({formFps:Math.round(n/2*10)/10,formDraws:Math.round(draws/2*10)/10}); } }; requestAnimationFrame(f); })));
    /* new career, then 6 simulated rounds so every view has data */
    await page.fill('#nc-name','Coach'); await page.fill('#nc-seed','animplan');
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    await page.evaluate(async()=>{ for(let i=0;i<6;i++){ try{ await A.simAhead({dataset:{k:'round'}}); }catch(e){} } App.modal=null; renderModal(); document.querySelectorAll('.ceremony').forEach(e=>e.remove()); });
    await page.waitForTimeout(300);
    out.routes=await page.evaluate(()=>{ const o={}; for(const r of Object.keys(VIEWS)){ try{ App.route=r; App.params={}; const t=[]; for(let i=0;i<4;i++){ const t0=performance.now(); render(); t.push(performance.now()-t0); }
        const app=document.getElementById('app'); o[r]={cold:Math.round(t[0]*10)/10,warm:t.slice(1).map(x=>Math.round(x*10)/10),kb:Math.round(app.innerHTML.length/1024),nodes:app.querySelectorAll('*').length,svg:app.querySelectorAll('svg').length,filters:app.querySelectorAll('filter').length}; }
      catch(e){ o[r]={err:String(e.message||e).slice(0,60)}; } } App.route='office'; App.params={}; render(); return o; });
    /* live match */
    await page.evaluate(()=>{ App.C.settings.walkout='off'; App.modal=null; renderModal(); });
    await page.locator('[data-a="playNext"]:visible').first().click(); await page.waitForTimeout(400);
    await page.locator('[data-a="kickoff"]:visible').first().click(); await page.waitForTimeout(800);
    for(let i=0;i<6;i++){ await page.click('#lv-canvas',{force:true}).catch(()=>{}); await page.waitForTimeout(250); }
    out.live=await page.evaluate(()=>new Promise(res=>{ const st=App.live.stage; let draw=0,upd=0,nd=0; const D0=st.drawLerp, U0=st.update;
      st.drawLerp=function(a){ const t=performance.now(); D0.call(this,a); draw+=performance.now()-t; nd++; }; st.update=function(d){ const t=performance.now(); U0.call(this,d); upd+=performance.now()-t; };
      let lt=0,ln=0; const po=new PerformanceObserver(l=>{ for(const e of l.getEntries()){ lt+=e.duration; ln++; } }); po.observe({entryTypes:['longtask']});
      let frames=0; const t0=performance.now(); const f=()=>{ frames++; if(performance.now()-t0<8000) requestAnimationFrame(f); else { po.disconnect(); delete st.drawLerp; delete st.update;
        res({fps:Math.round(frames/8*10)/10,draws:Math.round(nd/8*10)/10,drawMs:Math.round(draw/Math.max(1,nd)*100)/100,updMsPerFrame:Math.round(upd/Math.max(1,nd)*100)/100,longtasks:ln,longMs:Math.round(lt),rs:st.rs||1,stageW:st.W,stageH:st.H,stageDpr:Math.round(st.dpr*100)/100}); } }; requestAnimationFrame(f); }));
    /* paused live stage: draws per second */
    out.paused=await page.evaluate(()=>new Promise(res=>{ const L=App.live, st=L.stage; if(!L.paused) A.livePause(); if(!L.paused){ res({skipped:'could not pause'}); return; }
      let n=0; const D=st.drawLerp; setTimeout(()=>{ st.drawLerp=function(){ n++; return D.apply(this,arguments); }; setTimeout(()=>{ delete st.drawLerp; A.livePause(); res({draws:Math.round(n/3*10)/10}); },3000); },300); }));
  }catch(e){ out.error=String(e.message||e).split('\n')[0]; }
  if(errs.length) out.pageErrors=errs.slice(0,5);
  await ctx.close(); return out;
}

(async()=>{ const results=[]; let browser;
  try{ browser=await chromium.launch();
    for(const P of has('--quick')?PROFILES.slice(0,1):PROFILES){ const r=await measure(browser,P); results.push(r); console.log(JSON.stringify(r)); } }
  catch(e){ console.log(JSON.stringify({error:String(e.message||e).split('\n')[0]})); }
  finally{ if(browser) await browser.close().catch(()=>{}); }
  const jf=arg('--json'); if(jf){ try{ fs.writeFileSync(jf,JSON.stringify(results,null,1)); }catch(e){ console.log(JSON.stringify({error:'could not write '+jf})); } }
  process.exit(0); })();
