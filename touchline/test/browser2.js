const { chromium } = require('./_pw');
const S=n=>`test/shots/v2-${n}.png`;
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,3).join('\n'))); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(600);
  await page.screenshot({path:S('01-start')});
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Seth Morgan'); await page.fill('#nc-seed','hornets');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(300);
  await page.click('[data-a="ncMascot"][data-k="bees"]'); await page.click('.swp >> nth=13'); await page.waitForTimeout(200);
  await page.screenshot({path:S('02-wizard')});
  await page.click('[data-a="createCareer"]'); await page.waitForTimeout(1000);
  await page.screenshot({path:S('03-office'), fullPage:true});
  await page.dispatchEvent('.tnav [data-r="squads"]','click'); await page.waitForTimeout(200); await page.screenshot({path:S('04-lineup')});
  await page.click('[data-k="tab"][data-v="roster"]'); await page.click('[data-k="rv"][data-v="cards"]'); await page.waitForTimeout(200); await page.screenshot({path:S('05-cards')});
  await page.click('.pcard >> nth=0'); await page.waitForTimeout(250); await page.screenshot({path:S('06-profile')}); await page.keyboard.press('Escape');
  await page.dispatchEvent('.tnav [data-r="school"]','click'); await page.waitForTimeout(200); await page.screenshot({path:S('07-school'),fullPage:true});
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(200);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500); await page.screenshot({path:S('08-preview'),fullPage:true});
  await page.click('[data-a="pvSpeed"][data-v="2"]'); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(3500);
  await page.screenshot({path:S('09-live-broadcast')});
  // wait for a goal banner
  for(let i=0;i<60;i++){ if(await page.$('.goalbanner')) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(500); await page.screenshot({path:S('10-goal'),});
  await page.waitForTimeout(1300); await page.screenshot({path:S('10b-celebrate')});
  await page.click('[data-a="liveView"][data-v="tactical"]'); await page.waitForTimeout(1200); await page.screenshot({path:S('11-tactical')});
  await page.click('[data-a="liveTab"][data-v="mom"]'); await page.click('[data-a="liveView"][data-v="broadcast"]');
  await page.click('[data-a="liveSpeed"][data-v="8"]');
  await page.waitForSelector('#lv-ht .htbox',{timeout:150000}); await page.screenshot({path:S('12-halftime')});
  await page.click('[data-a="htPick"][data-k="rally"]'); await page.click('#ht-go'); await page.waitForTimeout(1500);
  await page.click('[data-a="liveSkip"][data-to="ft"]'); await page.waitForTimeout(1500); await page.screenshot({path:S('13-ft')});
  await page.click('[data-a="liveContinue"]'); await page.waitForTimeout(800); await page.evaluate(()=>document.querySelectorAll('.ceremony').forEach(x=>x.remove()));
  await page.screenshot({path:S('14-results')});
  await page.click('.mfoot [data-a="openFixture"]'); await page.waitForTimeout(300); await page.click('[data-a="modalTab"][data-v="high"]'); await page.waitForTimeout(300);
  const rb=await page.$('[data-a="replayGoal"]'); if(rb){ await rb.click(); await page.waitForTimeout(1600); } await page.screenshot({path:S('15-replay')});
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // sim ahead to end of season
  await page.click('[data-a="simMenu"]'); await page.waitForTimeout(150); await page.screenshot({path:S('16-simmenu')});
  await page.click('[data-a="simAhead"][data-k="season"]'); await page.waitForTimeout(1500);
  await page.evaluate(()=>document.querySelectorAll('.ceremony').forEach(x=>x.remove()));
  await page.screenshot({path:S('17-simsummary')});
  const hasAN=await page.$('[data-a="awardsNight"]'); if(hasAN){ await hasAN.click(); await page.waitForTimeout(3500); await page.screenshot({path:S('18-awardsnight')}); }
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{ const C=App.C; const f=Object.values(C.fixtures).find(f=>f.comp==='st'&&f.rd===2); showTrophy('State Champions',Sx(C.userSid),C.year,{chips:titleChips(C,f.id)}); });
  await page.waitForTimeout(900); await page.screenshot({path:S('19-trophy-early')}); await page.waitForTimeout(2600); await page.screenshot({path:S('19-trophy')});
  await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); showTrophy('Section 5 Champions',Sx(App.C.userSid),App.C.year,{chips:['Final: 2–1 vs Easton']}); }); await page.waitForTimeout(3000); await page.screenshot({path:S('20-section-trophy')});
  await page.evaluate(()=>document.querySelectorAll('.ceremony').forEach(x=>x.remove()));
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(300); await page.screenshot({path:S('21-offseason'),fullPage:true});
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(700); console.log('after rollover', await page.evaluate(()=>[App.C.year,App.C.phase]));
  await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>{App.route='office';render();}); await page.waitForTimeout(300);
  await page.screenshot({path:S('22-mobile'),fullPage:true}); console.log('mobile scrollWidth', await page.evaluate(()=>document.documentElement.scrollWidth));
  await page.evaluate(()=>{ const uf=userFixture(App.C); startLive(uf.id,{ht:true,speed:2}); }); await page.waitForTimeout(3000); await page.screenshot({path:S('23-mobile-live')});
  console.log('ERRORS', errs.length? errs.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.error('TEST CRASH',e); process.exit(1); });
