// v18.12 Tryouts & Cut Day: desktop and phone screenshots of every day, the stage, the door scene and the confirmation, in two themes.
// Usage (from touchline/): node test/plan/tryouts_shots.js [out-dir] [themes e.g. night,light] [views e.g. d,p]
const { chromium, DIST } = require('../_pw');
const fs=require('fs'), path=require('path');
const OUT=process.argv[2]||path.join(__dirname,'..','shots','v1812','tryouts'); fs.mkdirSync(OUT,{recursive:true});
const THEMES={night:{preset:'night',custom:null},gold:{preset:'gold',custom:null},crimson:{preset:'crimson',custom:null},light:{preset:null,custom:{bg:'#eef1f5',surface:'#ffffff',text:'#161b22',accent:'#c2410c',accent2:'#0f766e'}}};
const VIEWS={d:{w:1440,h:900,tag:'desk'},p:{w:390,h:844,tag:'phone'}};
const themes=(process.argv[3]||'night,light').split(','), views=(process.argv[4]||'d,p').split(',');
(async()=>{ const b=await chromium.launch();
  for(const th of themes) for(const vk of views){ const V=VIEWS[vk]; const ctx=await b.newContext({viewport:{width:V.w,height:V.h},deviceScaleFactor:1,hasTouch:vk==='p'}); const page=await ctx.newPage(); const errs=[];
    page.on('pageerror',e=>errs.push('PAGEERR '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
    const S=n=>page.screenshot({path:path.join(OUT,`${th}-${V.tag}-${n}.png`)});
    await page.goto(DIST); await page.waitForTimeout(500);
    await page.evaluate(t=>{ PREFS.theme=t; savePrefs(); },THEMES[th]);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach Rivera'); await page.fill('#nc-seed','tryouts-shots'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
    await page.evaluate(()=>{ applyTheme(); render(); }); await page.waitForTimeout(300);
    await S('00-overview');
    await page.click('.v1812t-hero [data-a="v1812tOpen"]'); await page.waitForTimeout(500); await S('01-day0');
    for(const day of [1,2,3]){
      await page.click('[data-a="v1812tRun"]'); await page.waitForTimeout(1300); await S(`0${day+1}a-day${day}-drill`);
      await page.waitForFunction(()=>!App.C||!document.querySelector('#v1812t-stage:not([hidden])'),null,{timeout:20000}); await page.waitForTimeout(1400); await S(`0${day+1}b-day${day}-results`);
    }
    // decide: auto-sort, then make a visible mess for the warnings (cut both Varsity keepers)
    await page.click('[data-a="v1812tAuto"]'); await page.waitForTimeout(400); await S('06-autosorted');
    await page.evaluate(()=>{ const C=App.C; const gk=v1812tPoolIds(C).filter(id=>v1812tAsg(C,id)==='V'&&v1812tFind(C,id).pos==='GK'); gk.forEach(id=>v1812tSet(C,id,'X')); App.params={tf:'gk'}; render(); }); await page.waitForTimeout(400); await S('07-warnings');
    await page.click('[data-a="v1812tAuto"]'); await page.waitForTimeout(400);
    await page.evaluate(()=>{ App.params={tf:'new'}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(300);
    await page.click('[data-a="v1812tPostAsk"]'); await page.waitForTimeout(500); await S('08-confirm');
    await page.click('[data-a="v1812tPost"]');
    for(const [ms,n] of [[900,'09a-door-paper'],[2400,'09b-door-names'],[3800,'09c-door-circles'],[5200,'09d-door-note']]){ await page.waitForTimeout(ms-(page._last||0)); page._last=ms; await S(n); }
    page._last=0; await page.waitForSelector('#v1812t-scene.s2',{timeout:20000}); await page.waitForTimeout(1500); await S('09e-trainer-door');
    await page.waitForSelector('#v1812t-scene.final',{timeout:20000}); await page.waitForTimeout(700); await S('09f-door-final');
    await page.click('[data-a="v1812tDoorDone"]'); await page.waitForTimeout(500); await S('10-posted');
    await page.evaluate(()=>{ App.route='office'; render(); window.scrollTo(0,0); }); await page.waitForTimeout(400); await S('11-overview-posted');
    console.log(th,V.tag,errs.length?errs.join(' | '):'no errors');
    await ctx.close(); }
  await b.close(); })();
