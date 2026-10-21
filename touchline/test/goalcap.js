// The user's team scores at most 6 goals in a regular-season game (live, quick sim and Manager Mode); preseason and
// postseason games are not capped, and opponents are never capped.
const { chromium } = require('./_pw');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const page=await b.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message)); let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Cap'); await page.fill('#nc-seed','goalcap'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const r=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; C.settings.difficulty='easy';
    const boost=()=>{ for(const p of Object.values(C.players)) if(p.sid===u) shiftOvr(p,40,'balanced'); };
    boost(); const out={reg:[],pre:[],post:[],oppMax:0,dir:null}; let yrs=0;
    /* Manager Mode: a directed 9-0 in a regular-season game */
    const regFx=Object.values(C.fixtures).find(f=>f.comp==='reg'&&f.lvl==='V'&&(f.h===u||f.a===u)); C.directed[regFx.id]={mode:'score',hg:regFx.h===u?9:0,ag:regFx.a===u?9:0};
    for(let i=0;i<4000&&yrs<2;i++){ if(C.phase==='offseason'){ rollover(C); yrs++; boost(); continue; }
      const fx=userFixture(C); if(fx){ const M=startMatch(C,fx.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    for(const f of Object.values(C.fixtures)){ if(f.st!=='d'||(f.h!==u&&f.a!==u)) continue; const us=f.h===u?f.hg:f.ag, them=f.h===u?f.ag:f.hg; const k=f.comp==='reg'?'reg':f.comp==='pre'?'pre':'post'; out[k].push(us); }
    for(const f of Object.values(C.fixtures)) if(f.st==='d'&&f.comp==='reg'&&f.h!==u&&f.a!==u) out.oppMax=Math.max(out.oppMax,f.hg,f.ag);
    const d=C.fixtures[regFx.id]; out.dir=d.h===u?d.hg:d.ag;
    return out; });
  const mx=a=>a.length?Math.max(...a):0; const six=r.reg.filter(g=>g===6).length;
  console.log(JSON.stringify({regGames:r.reg.length,regMax:mx(r.reg),regSixes:six,preMax:mx(r.pre),postMax:mx(r.post),preGames:r.pre.length,postGames:r.post.length,dir:r.dir}));
  ok(r.reg.length>=20&&mx(r.reg)<=6, `regular season: your team never scores more than 6 (${r.reg.length} games, highest ${mx(r.reg)}, ${six} games stopped at 6)`);
  ok(six>0, 'the cap actually bites: an overpowered team hits 6 and is held there');
  ok(mx(r.pre)>6||mx(r.post)>6, `preseason and postseason are not capped (highest ${mx(r.pre)} preseason, ${mx(r.post)} postseason)`);
  ok(r.dir===6, `Manager Mode: a directed 9 is recorded as 6 in the regular season (${r.dir})`);
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
