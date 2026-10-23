/* v18 stadium sheet: renders the 3-D pitch, stadium and crowd in the animation lab and a live match, in several weathers
   and on a phone, and prints draw calls / triangles per tier. Headless WebGL is software (a few fps): it renders single
   frames and waits; it never asserts frame rates. Output: test/shots/v18/stadium/ (git-ignored). Exit 1 on page errors.
   node test/stadium3d_sheet.js [all|lab|live|phone|tiers] */
const { chromium, DIST } = require('./_pw'); const OUT=require('path').resolve(__dirname,'shots/v18/stadium')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const what=process.argv[2]||'all'; const has=k=>what==='all'||what===k;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const info=page=>page.evaluate(()=>{ const s=(App.live&&App.live.stage)||App.labSt; const P=s&&s._p3d; if(!P) return null; const i=P.renderer.info; return {tier:P.tier.name,kind:P.kind,wx:P.wxKind,calls:i.render.calls,tris:i.render.triangles,geos:i.memory.geometries,tex:i.memory.textures,fans:P.crowd?P.crowd.n:0}; });
(async()=>{ const b=await chromium.launch(); const errs=[]; const watch=p=>{ p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='warning'&&/v18/.test(m.text())) errs.push('warn: '+m.text()); }); };
  /* ---------- animation lab at 2x ---------- */
  if(has('lab')){ const p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); watch(p);
    await p.goto(DIST+'#anim-lab'); await wait(900); await p.evaluate(()=>{ PREFS.renderer='3d'; PREFS.rtier='A'; });
    const box=await p.evaluate(()=>{ const r=document.querySelector('#anim-lab .lab-cv').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
    for(const sc of ['run','keeper','header']){ await p.evaluate(s=>{ setTimeout(()=>labRun(s),0); },sc); await wait(sc==='run'?3500:5000);
      await p.screenshot({path:OUT+`lab-${sc}.png`,clip:box}); console.log('lab',sc,JSON.stringify(await info(p))); }
    await p.close(); }
  /* ---------- live match at 1440x900 in several weathers, plus per-tier numbers ---------- */
  const live=async(vp,tag,opts)=>{ const p=await b.newPage(vp); watch(p);
    await p.goto(DIST); await wait(700); await p.evaluate(o=>{ PREFS.renderer='3d'; PREFS.rtier=o.tier||null; window.__wx={k:'clear',night:true}; const wf=weatherFor; weatherFor=f=>Object.assign({},wf(f),window.__wx); },opts);
    await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Coach'); await p.fill('#nc-seed','stadium3d');
    await p.click('[data-a="ncNext"]'); await wait(200); await p.click('[data-a="createCareer"]'); await wait(800);
    await p.evaluate(()=>{ try{ C.settings.walkout='off'; }catch(e){} });
    await p.click('.cta [data-a="playNext"], #tabbar [data-a="playNext"], [data-a="playNext"]'); await wait(500);
    await p.click('[data-a="kickoff"]'); await wait(800);
    for(let i=0;i<4;i++){ await p.click('#lv canvas, canvas',{force:true}).catch(()=>{}); await wait(250); }
    await wait(3000); return p; };
  const setWx=async(p,wx)=>{ await p.evaluate(w=>{ const s=App.live&&App.live.stage; if(s){ s.wx=w; s.wxp=null; } },wx); await wait(2600); };
  if(has('live')||has('tiers')){ const p=await live({viewport:{width:1440,height:900},deviceScaleFactor:1},'d',{tier:'A'});
    if(has('live')){ for(const [n,wx] of [['night',{k:'clear',night:true}],['clear',{k:'clear',night:false}],['golden',{k:'golden',night:false}],['rain',{k:'rain',night:false}]]){ await setWx(p,wx);
        await p.screenshot({path:OUT+`live-${n}.png`}); console.log('live',n,JSON.stringify(await info(p))); }
      await setWx(p,{k:'clear',night:true});
      /* a goal moment: hype up, so the stands erupt and the boards flash */
      await p.evaluate(()=>{ const s=App.live.stage; s.hype=1; if(s.popBulbs) s.popBulbs(); }); await wait(1500); await p.screenshot({path:OUT+'live-hype.png'}); console.log('live hype',JSON.stringify(await info(p))); }
    if(has('tiers')){ for(const t of ['A','B','C']){ await p.evaluate(t=>{ PREFS.rtier=t; const s=App.live.stage; if(s._p3d) s._p3d.dispose(); s._p3d=undefined; s.wx={k:'clear',night:true}; },t); await wait(3500);
        console.log('tier',t,JSON.stringify(await info(p))); await p.screenshot({path:OUT+`tier-${t}.png`}); } }
    await p.close(); }
  if(has('phone')){ const p=await live({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},'p',{});
    await p.screenshot({path:OUT+'phone-night.png'}); console.log('phone',JSON.stringify(await info(p)));
    await setWx(p,{k:'cloud',night:false}); await p.screenshot({path:OUT+'phone-cloud.png'}); console.log('phone cloud',JSON.stringify(await info(p))); await p.close(); }
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); await b.close(); process.exit(errs.length?1:0); })();
