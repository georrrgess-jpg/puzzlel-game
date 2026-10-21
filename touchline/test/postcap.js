// v11.2: Regional and State opponents never have a Starting XI rating above 85; the user's team is never touched
const { chromium } = require('./_pw');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const page=await b.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message)); let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Cap'); await page.fill('#nc-seed','cap85'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const res=await page.evaluate(()=>{ const C=App.C; C.settings.difficulty='hard'; const out={max:0,n:0,yrs:0,userBefore:null,userAfter:null,uncapped:[]};
    const playAll=()=>{ for(const id in C.fixtures){ const f=C.fixtures[id]; if(f.st==='s'&&(f.h===C.userSid||f.a===C.userSid)){ try{ const M=startMatch(C,id,{}); runToEnd(C,M); finishMatch(C,M); }catch(e){} } } };
    for(let step=0;step<400&&out.yrs<4;step++){
      if(C.phase==='states'||C.phase==='regional'){ for(const id in C.schools){ const s=C.schools[id]; if(s.ext==='post'){ const r=xiRating(C,id,'V'); out.n++; if(r>out.max) out.max=r; } } }
      if(C.phase==='offseason'){ out.yrs++; try{ rollover(C); }catch(e){ out.err=String(e); break; } continue; }
      const fx=userFixture(C); if(fx){ const M=startMatch(C,fx.id,{}); runToEnd(C,M); finishMatch(C,M); }
      simRound(C); advance(C); }
    out.phase=C.phase;
    /* the user's team: buff it above 85 and make sure the cap never touches it */
    const u=C.userSid; squad(C,u,'V').forEach(p=>shiftOvr(p,30,'balanced')); out.userBefore=xiRating(C,u,'V'); capPostTeams(C); capTeam(C,u,85); out.userAfter=xiRating(C,u,'V');
    /* an old save with an uncapped State team is fixed on load */
    const t=genExt(C,95,'post','Section 1'); out.oldBefore=xiRating(C,t.id,'V'); migrate(C); out.oldAfter=xiRating(C,t.id,'V');
    return out; });
  console.log(JSON.stringify(res));
  ok(res.n>0, 'saw Regional/State opponents over '+res.yrs+' seasons on Hard ('+res.n+' samples)');
  ok(res.max<=85.05, 'no Regional or State team rates above 85 (highest '+res.max.toFixed(1)+')');
  ok(res.userBefore>85&&Math.abs(res.userAfter-res.userBefore)<1e-9, "the user's team is never capped ("+res.userBefore.toFixed(1)+')');
  ok(res.oldBefore>85&&res.oldAfter<=85.05, 'a State team from an older save is brought down to 85 on load ('+res.oldBefore.toFixed(1)+' -> '+res.oldAfter.toFixed(1)+')');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
