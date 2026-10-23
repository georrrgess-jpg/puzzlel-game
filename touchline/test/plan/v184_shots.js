/* v18.4 visual pass: live match in 3-D on desktop and phone, two themes each, Broadcast / Sideline at all four zooms, Tactical,
   and the control bar -> test/shots/v184/final/.  node test/plan/v184_shots.js [d|p|both] */
const { chromium, DIST } = require('../_pw'); const OUT=require('path').resolve(__dirname,'../shots/v184/final')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const which=process.argv[2]||'both';
(async()=>{ const b=await chromium.launch(); const errs=[];
  const runs=[[1440,900,'d',1,false,'night'],[1440,900,'d',1,false,'titanium'],[390,844,'p',2,true,'night'],[390,844,'p',2,true,'gold']].filter(r=>which==='both'||r[2]===which);
  for(const [w,h,tag,dpr,mob,theme] of runs){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:mob,hasTouch:mob}); p.on('pageerror',e=>errs.push(tag+theme+': '+e.message));
    await p.goto(DIST); await p.waitForTimeout(2500);
    await p.evaluate(t=>{ PREFS.renderer='3d'; PREFS.view='broadcast'; PREFS.zoom='normal'; PREFS.theme={preset:t,custom:null}; savePrefs(); applyTheme(); },theme);
    await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Coach'); await p.fill('#nc-seed','v184'); await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(1000);
    await p.evaluate(()=>{ App.route='office'; render(); try{ C.settings.walkout='off'; }catch(e){} });
    await p.click('.cta [data-a="playNext"], [data-a="playNext"]'); await p.waitForTimeout(500); await p.click('[data-a="kickoff"]'); await p.waitForTimeout(900);
    for(let i=0;i<6;i++){ await p.click('canvas',{force:true}).catch(()=>{}); await p.waitForTimeout(250); }
    await p.waitForTimeout(6000);
    const tag2=tag+'-'+theme;
    const shot=async name=>{ await p.screenshot({path:OUT+`${tag2}-${name}.png`}); };
    const view=async v=>{ await p.click(`[data-a="liveView"][data-v="${v}"]`); await p.waitForTimeout(3500); };
    const step=async d=>{ const e=await p.$(`[data-a="liveZoom"][data-v="${d}"][aria-disabled="false"]`); if(!e) return false; await e.click(); await p.waitForTimeout(3000); return true; };
    const zl=async()=>p.evaluate(()=>PREFS.zoom);
    await shot('broadcast-normal');
    if(tag==='d'&&theme==='night'){ while(await step(-1)); await shot('broadcast-'+await zl()); while(await step(1)) await shot('broadcast-'+await zl()); while(await zl()!=='normal'&&await step(-1)); }
    await view('sideline'); await shot('sideline-'+await zl());
    while(await step(-1)); await shot('sideline-'+await zl());
    while(await step(1)) await shot('sideline-'+await zl());
    await view('tactical'); await shot('tactical');
    const bar=await p.$('#lv-ctrl, .lv-ctrl, [data-a="livePause"]'); if(bar){ const bb=await p.evaluate(()=>{ const e=document.querySelector('[data-a="livePause"]'); const c=e&&e.parentElement; if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.left,y:r.top,width:r.width,height:r.height}; }); if(bb&&bb.width>0) await p.screenshot({path:OUT+`${tag2}-controls.png`,clip:{x:Math.max(0,bb.x-4),y:Math.max(0,bb.y-4),width:Math.min(w,bb.width+8),height:bb.height+8}}); }
    await view('sideline');
    await p.close(); }
  console.log(errs.join('\n')||'no errors'); await b.close(); })();
