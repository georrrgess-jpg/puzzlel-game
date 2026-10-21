const { chromium } = require('./_pw');
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d';
const S=n=>`test/shots/u3-${tag}-${n}.png`;
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:W,height:H}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,3).join('\n'))); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(2500);
  await page.screenshot({path:S('01-start')});
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Seth Morgan'); await page.fill('#nc-seed','hornets');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(300); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(1000);
  await page.screenshot({path:S('03-office'), fullPage:true});
  await page.evaluate(()=>A.go({dataset:{r:'squads'}})); await page.waitForTimeout(200);
  await page.click('[data-k="tab"][data-v="roster"]'); await page.click('[data-k="rv"][data-v="cards"]'); await page.waitForTimeout(300); await page.screenshot({path:S('05-cards')});
  await page.click('.pcard >> nth=2'); await page.waitForTimeout(300); await page.screenshot({path:S('06-profile')});
  await page.click('[data-a="modalTab"][data-v="look"]'); await page.waitForTimeout(700); await page.screenshot({path:S('07-look')});
  await page.click('[data-a="lookSet"][data-k="hair"][data-v="afro"]'); await page.click('[data-a="lookSet"][data-k="skin"][data-v="9"]'); await page.waitForTimeout(500); await page.screenshot({path:S('08-look-edit')});
  await page.click('[data-a="lookRandom"]'); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.evaluate(()=>A.go({dataset:{r:'post'}})); await page.waitForTimeout(500); await page.screenshot({path:S('09-post-pre'),fullPage:true});
  await page.evaluate(()=>A.simAhead({dataset:{k:'regular'}})); await page.waitForTimeout(900); await page.evaluate(()=>document.querySelectorAll('.ceremony').forEach(x=>x.remove())); await page.screenshot({path:S('09b-simsummary')}); await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; renderModal(); });
  await page.click('.cta [data-a="playNext"]').catch(()=>{}); await page.waitForTimeout(400);
  // simulate the last league round so the selection show appears
  for(let i=0;i<3;i++){ const ph=await page.evaluate(()=>App.C.phase); if(ph!=='regular'&&ph!=='preseason') break; await page.evaluate(()=>{ const f=userFixture(App.C); if(f){ const M=startMatch(App.C,f.id,{}); runToEnd(App.C,M); finishMatch(App.C,M); completeRound(f.id); } }); await page.waitForTimeout(400); }
  await page.evaluate(()=>document.querySelectorAll('.ceremony').forEach(x=>x.remove())); await page.screenshot({path:S('10-selection')});
  await page.evaluate(()=>{ App.modal=null; renderModal(); }); await page.evaluate(()=>A.go({dataset:{r:'post'}})); await page.waitForTimeout(500); await page.screenshot({path:S('11-post'),fullPage:true});
  await page.evaluate(()=>A.simAhead({dataset:{k:'round'}})); await page.waitForTimeout(500); await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; App.route='post'; render(); }); await page.waitForTimeout(400); await page.screenshot({path:S('12-post-r2'),fullPage:true});
  console.log(errs.join('\n')||'no errors'); await browser.close();
})();
