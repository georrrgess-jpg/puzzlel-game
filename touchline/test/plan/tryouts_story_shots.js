// v18.12 Tryouts: the "remember" half. Plays a few seasons with the staff posting each list, then screenshots the next
// tryout pool (comebacks with their stories), the cut list history, a transferred player's profile, a revenge-game preview
// and the Newswire. Usage (from touchline/): node test/plan/tryouts_story_shots.js [out-dir] [theme]
const { chromium, DIST } = require('../_pw');
const fs=require('fs'), path=require('path');
const OUT=process.argv[2]||path.join(__dirname,'..','shots','v1812','tryouts'); fs.mkdirSync(OUT,{recursive:true});
const theme=process.argv[3]||'night';
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const [tag,w,h] of [['desk',1440,900],['phone',390,844]]){
    const ctx=await b.newContext({viewport:{width:w,height:h}}); const page=await ctx.newPage();
    page.on('pageerror',e=>errs.push('PAGEERR '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
    const S=n=>page.screenshot({path:path.join(OUT,`${theme}-${tag}-story-${n}.png`)});
    await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach Rivera'); await page.fill('#nc-seed','tryouts-story-9'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
    const info=await page.evaluate(()=>{ const C=App.C; let found=null;
      for(let s=0;s<6;s++){ v1812tEnsure(C); v1812tAutoResolve(C); let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); if(!advance(C)) break; }
        if(s<5) rollover(C); }
      /* now in the offseason of year 6; roll into year 7's preseason so the pool has comebacks */
      rollover(C); v1812tEnsure(C); App.odds.clear();
      const mem=Object.values(C.tryout.mem); const by={}; mem.forEach(m=>by[m.status]=(by[m.status]||0)+1);
      const tr=Object.values(C.players).find(p=>p.cutMem&&p.cutMem.from===C.userSid&&p.sid!==C.userSid);
      return {year:C.year,by,transfer:tr?tr.id:null,pool:C.tryout.pool.length,backs:Object.values(C.tryout.cands).filter(p=>p.tryKind==='back').length}; });
    console.log(tag,JSON.stringify(info));
    await page.evaluate(()=>{ PREFS.theme={preset:'night',custom:null}; applyTheme(); App.route='tryouts'; App.params={tf:'new'}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(600); await S('01-next-pool');
    await page.evaluate(()=>{ for(let i=0;i<3;i++) v1812tRunDay(App.C); v1812tApplyAuto(App.C); App.params={tf:'new'}; render(); }); await page.waitForTimeout(500);
    await page.evaluate(()=>{ const el=document.querySelector('.v1812t-kind.k-rem, .v1812t-kind.k-bk'); const card=el?el.closest('.v1812t-card'):document.querySelector('.v1812t-card'); card.scrollIntoView({block:'center'}); window.scrollBy(0,-120); }); await page.waitForTimeout(300); await S('02-comeback-card');
    await page.evaluate(()=>{ v1812tPost(App.C,'user'); App.params={}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(500);
    await page.evaluate(()=>{ const el=document.querySelector('.v1812t-mems'); if(el) el.scrollIntoView({block:'start'}); window.scrollBy(0,-110); }); await page.waitForTimeout(300); await S('03-where-are-they-now');
    if(info.transfer){ await page.evaluate(id=>{ App.modal={type:'player',id}; renderModal(); },info.transfer); await page.waitForTimeout(500); await S('04-transferred-player'); await page.evaluate(()=>{ App.modal=null; renderModal(); }); }
    /* a revenge game: a fixture against a school that holds a player we cut */
    const rv=await page.evaluate(()=>{ const C=App.C; for(const f of Object.values(C.fixtures)){ if(f.yr===C.year&&f.st==='s'&&f.lvl&&(f.h===C.userSid||f.a===C.userSid)){ const r=v1812tRevenge(C,f); if(r.length) return f.id; } } return null; });
    console.log(tag,'revenge fixture this season:',rv);
    if(rv){ await page.evaluate(id=>{ App.modal={type:'fixture',id}; renderModal(); },rv); await page.waitForTimeout(500); await S('05-revenge-preview'); await page.evaluate(()=>{ App.modal=null; renderModal(); }); }
    await page.evaluate(()=>{ App.route='news'; App.params={nv:'wire'}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(500); await S('06-newswire');
    await ctx.close(); }
  console.log(errs.length?errs.join(' | '):'no errors'); await b.close(); })();
