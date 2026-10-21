// Matchday Center: watch and simulate games that are not yours, without disturbing your own match or the round
const { chromium } = require('./_pw');
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{ const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1280,height:860}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push('console '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(600);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Spec'); await page.fill('#nc-seed','spectate'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ for(let i=0;i<4;i++){ simRound(App.C); advance(App.C); } render(); });
  const md0=await page.evaluate(()=>App.C.md);
  await page.evaluate(()=>A.go({dataset:{r:'matchday'}})); await page.waitForTimeout(400);
  const n=await page.$$eval('.mc-game',g=>g.length); ok(n>=4, `Matchday Center lists the Varsity round (${n} games)`);
  ok(await page.$('.mc-game.mine'), 'your own match is marked and not watchable from here');
  ok(await page.$('.nav [class*="nbadge"]')!==null, 'the nav shows how many games are left to watch');
  // quick sim one game
  const fid1=await page.$eval('.mc-game:not(.mine):not(.fin) [data-a="specSim"]',b=>b.dataset.id);
  await page.click(`[data-a="specSim"][data-id="${fid1}"]`); await page.waitForTimeout(300);
  ok(await page.evaluate(id=>App.C.fixtures[id].st==='d'&&!!App.C.logs[id],fid1), 'Quick sim finishes that game with a full log');
  ok(await page.evaluate(m=>App.C.md===m,md0), 'the round has not advanced');
  // watch another one live at 8x
  const fid2=await page.$eval('.mc-game:not(.mine):not(.fin) [data-a="spectate"]',b=>b.dataset.id);
  await page.evaluate(()=>{ App.C.settings.speed=8; }); await page.click(`[data-a="spectate"][data-id="${fid2}"]`); await page.waitForTimeout(1500);
  ok(await page.evaluate(()=>!!App.live&&App.live.M.spectate&&App.live.M.user===-1), 'spectator broadcast opens with no user side');
  ok(!(await page.$('#lv-ctrl [data-a="liveTactics"]')), 'no tactics button while spectating');
  ok(await page.$('.spec-tag'), 'the broadcast is labelled as spectating');
  const t0=Date.now(); while(Date.now()-t0<180000){ if(await page.$('#lv-cont')) break; await page.waitForTimeout(500); }
  ok(await page.evaluate(id=>App.C.fixtures[id].st==='d',fid2), 'the watched game is final when the whistle goes');
  ok((await page.textContent('#lv-cont'))==='Back to Matchday Center', 'Continue returns to the Matchday Center');
  const score=await page.evaluate(id=>{ const f=App.C.fixtures[id]; return [f.hg,f.ag]; },fid2);
  await page.click('#lv-cont'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>App.route==='matchday'&&!App.live&&!App.C.live), 'back in the Matchday Center, nothing left running');
  ok(await page.evaluate(m=>App.C.md===m,md0), 'watching did not advance the round');
  // play your own match: the round completes and keeps the spectated results
  await page.evaluate(()=>{ const uf=userFixture(App.C); A.quickSim({dataset:{id:uf.id}}); }); await page.waitForTimeout(500);
  ok(await page.evaluate(m=>App.C.md===m+1,md0), 'playing your match completes the round');
  ok(await page.evaluate(([id,s])=>{ const f=App.C.fixtures[id]; return f.hg===s[0]&&f.ag===s[1]; },[fid2,score]), 'the watched result stands');
  ok(await page.evaluate(()=>Object.values(App.C.fixtures).filter(f=>f.comp==='reg'&&f.rd===App.C.md-1&&f.yr===App.C.year).every(f=>f.st==='d')), 'every game of the round is final');
  // sim all
  await page.evaluate(()=>{ App.modal=null; renderModal(); A.go({dataset:{r:'matchday'}}); }); await page.waitForTimeout(300);
  await page.click('[data-a="specSimAll"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>watchable(App.C).length===0&&!!userFixture(App.C)), 'Quick sim all leaves only your match');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); if(errs.length) process.exitCode=1; await browser.close(); })();
