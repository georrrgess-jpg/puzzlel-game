// v11: Schedule Builder — pick Preseason Cup opponents, venues and a JV scrimmage
const { chromium } = require('./_pw');
const SHOTS=process.argv[2]||null;
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1366,height:860}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Sched Tester'); await page.fill('#nc-seed','schedule'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  ok(await page.$('.sb-banner'), 'the Office invites you to build the preseason schedule');
  ok(await page.$('.nav[data-r="presched"]'), 'Schedule Builder is in the navigation');
  await page.click('.sb-banner [data-a="go"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>App.route==='presched'), 'the banner opens the builder');
  ok((await page.$$('.sb-strip .sb-slot')).length===4, 'a strip with the scrimmage and three cup games');
  const pool=await page.$$('.sb-opp'); ok(pool.length===7, 'seven opponents to choose from ('+pool.length+')');
  const tags=await page.$$eval('.sb-opp .sb-tag',x=>[...new Set(x.map(e=>e.textContent))]); ok(tags.length>=3, 'opponents span difficulty tags: '+tags.join(', '));
  if(SHOTS) await page.screenshot({path:SHOTS+'/sched.png',fullPage:true});
  // choose a different opponent for game 1
  const before=await page.evaluate(()=>{ const f=App.C.fixtures[App.C.pre.fx[0]]; return f.h===App.C.userSid?f.a:f.h; });
  const pick=await page.$eval('.sb-opp:not(.on):not([disabled])',b=>b.dataset.id); await page.click(`.sb-opp[data-id="${pick}"]`); await page.waitForTimeout(250);
  const after=await page.evaluate(()=>{ const f=App.C.fixtures[App.C.pre.fx[0]]; return {opp:f.h===App.C.userSid?f.a:f.h,diff:f.diff}; });
  ok(after.opp===pick&&after.opp!==before&&after.diff, 'picking an opponent rewrites the fixture ('+after.diff+')');
  ok(await page.$eval(`.sb-opp[data-id="${before}"]`,b=>!b.disabled), 'the replaced opponent goes back into the pool');
  // a booked opponent can't be picked twice
  await page.click('.sb-slot[data-v="1"]'); await page.waitForTimeout(200);
  ok(await page.$eval(`.sb-opp[data-id="${pick}"]`,b=>b.disabled), 'an opponent already booked cannot be picked twice');
  // venues
  await page.click('[data-a="setParam"][data-k="sbv_"][data-v="showcase"]'); await page.waitForTimeout(200);
  const sc=await page.evaluate(()=>{ const f=App.C.fixtures[App.C.pre.fx[1]]; return {n:!!f.neutral,ven:f.ven,att:attendance(App.C,f)}; });
  ok(sc.n&&/District Stadium/.test(sc.ven)&&sc.att.neutral&&sc.att.home===0, 'Showcase is a neutral venue with no home edge ('+sc.ven+', '+sc.att.att+' fans)');
  await page.click('.sb-slot[data-v="2"]'); await page.waitForTimeout(200); await page.click('[data-a="setParam"][data-k="sbv_"][data-v="showcase"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>App.C.pre.fx.filter(id=>App.C.fixtures[id].neutral).length===1), 'only one game can be the showcase');
  await page.click('[data-a="setParam"][data-k="sbv_"][data-v="away"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>{ const f=App.C.fixtures[App.C.pre.fx[2]]; return f.a===App.C.userSid&&!f.neutral; }), 'Away puts you on the road');
  // auto-pick
  await page.click('[data-a="sbAuto"]'); await page.waitForTimeout(250);
  const auto=await page.evaluate(()=>App.C.pre.fx.map(id=>App.C.fixtures[id].diff));
  ok(new Set(auto).size>=2, 'Auto-pick builds a varied slate: '+auto.join(', '));
  // scrimmage
  const ovr0=await page.evaluate(()=>squad(App.C,App.C.userSid,'JV').reduce((t,p)=>t+ovr(p),0));
  await page.click('[data-a="sbScrim"]'); await page.waitForTimeout(300);
  ok(await page.$('.sb-scrim'), 'the JV scrimmage produces a report');
  const ovr1=await page.evaluate(()=>squad(App.C,App.C.userSid,'JV').reduce((t,p)=>t+ovr(p),0));
  ok(ovr1>ovr0, 'JV players get a small development bump');
  ok((await page.$$('.sb-scrim [data-a="promote"]')).length>=1, 'standouts can be moved up to Varsity');
  ok(!(await page.$('[data-a="sbScrim"]')), 'the scrimmage runs once');
  // lock
  await page.click('[data-a="sbLock"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>App.C.pre.locked&&App.route==='office'&&!document.querySelector('.sb-banner')), 'locking saves the schedule and returns to the Office');
  await page.evaluate(()=>{ App.route='presched'; render(); }); await page.waitForTimeout(200);
  ok(!(await page.$('.sb-opp:not([disabled])'))&&await page.$('[data-a="playNext"]'), 'a locked schedule is read-only');
  // the chosen fixtures are the ones played
  const played=await page.evaluate(()=>{ const C=App.C; const want=C.pre.fx.map(id=>{ const f=C.fixtures[id]; return f.h===C.userSid?f.a:f.h; }); for(let i=0;i<3;i++){ const f=userFixture(C); const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); simRound(C); advance(C); } const got=C.pre.fx.map(id=>{ const f=C.fixtures[id]; return f.h===C.userSid?f.a:f.h; }); return {same:JSON.stringify(want)===JSON.stringify(got),phase:C.phase,done:C.pre.fx.every(id=>C.fixtures[id].st==='d')}; });
  ok(played.same&&played.done&&played.phase==='regular', 'your chosen cup games are played, then the league begins');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
