const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await page.goto(require('./_pw').DIST);
  await page.waitForTimeout(500);
  await page.screenshot({path:'test/shots/01-start.png'});
  await page.click('[data-a="newCareerForm"][data-slot="1"]');
  await page.fill('#nc-name','Seth Morgan'); await page.fill('#nc-seed','touchline');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
  await page.screenshot({path:'test/shots/02-office.png', fullPage:true});
  for(const r of ['squads','dev','schedule','league','records','post','awards','history','tourneys','news','school','settings']){
    await page.click(`.nav[data-r="${r}"]`); await page.waitForTimeout(150);
    if(['squads','school','league'].includes(r)) await page.screenshot({path:`test/shots/03-${r}.png`, fullPage:true});
  }
  // roster tab + sort + multi-sort
  await page.dispatchEvent('.tnav [data-r="squads"]','click'); await page.click('[data-k="tab"][data-v="roster"]'); await page.click('th[data-k="pot"]'); await page.click('th[data-k="grade"]',{modifiers:['Shift']}); await page.waitForTimeout(100);
  await page.screenshot({path:'test/shots/04-roster.png'});
  // drag a token
  await page.click('[data-k="tab"][data-v="lineup"]'); await page.waitForTimeout(100);
  const tok=await page.$('#pitch .tok[data-slot="9"]'); const b=await tok.boundingBox(); await page.mouse.move(b.x+b.width/2,b.y+20); await page.mouse.down(); await page.mouse.move(b.x+b.width/2-60,b.y+60,{steps:6}); await page.mouse.up(); await page.waitForTimeout(150);
  const form=await page.textContent('.card h3'); console.log('after drag:',form);
  // player profile
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(100);
  await page.click('[data-a="openPlayer"] >> nth=0'); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/05-player.png'});
  await page.click('[data-a="modalTab"][data-v="edit"]').catch(()=>{}); await page.waitForTimeout(100); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // play: preseason -> preview -> kickoff at 8x with halftime
  await page.click('.top [data-a="playNext"]'); await page.waitForTimeout(400);
  await page.screenshot({path:'test/shots/06-preview.png', fullPage:true});
  await page.click('[data-a="pvSpeed"][data-v="8"]'); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(2500);
  await page.screenshot({path:'test/shots/07-live.png'});
  await page.waitForSelector('#lv-ht .htbox',{timeout:20000}); await page.screenshot({path:'test/shots/08-halftime.png'});
  await page.click('[data-a="htPick"][data-k="push"]'); await page.click('#ht-go'); await page.waitForTimeout(300);
  console.log('ht gone:', await page.$('#lv-ht .htbox')===null);
  await page.click('[data-a="liveSkip"][data-to="ft"]'); await page.waitForTimeout(400);
  await page.screenshot({path:'test/shots/09-ft.png'});
  await page.click('[data-a="liveContinue"]'); await page.waitForTimeout(600);
  await page.screenshot({path:'test/shots/10-results.png'});
  await page.click('.mfoot [data-a="openFixture"]'); await page.waitForTimeout(300);
  for(const t of ['box','shots','heat','high','lineups']){ await page.click(`[data-a="modalTab"][data-v="${t}"]`); await page.waitForTimeout(120); if(t==='shots'||t==='high') await page.screenshot({path:`test/shots/11-report-${t}.png`}); }
  await page.click('[data-a="replayGoal"]').catch(()=>console.log('no goals to replay')); await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  // skip remaining preseason, quick-sim the whole regular season via the UI play button + quick sim
  await page.evaluate(()=>A.skipPre());
  for(let i=0;i<14;i++){ await page.evaluate(()=>{ const f=userFixture(App.C); if(f){ A.quickSim({dataset:{id:f.id}}); } else A.playNext(); App.modal=null; renderModal(); }); }
  await page.dispatchEvent('.tnav [data-r="post"]','click'); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/12-post.png', fullPage:true});
  for(let i=0;i<12 && await page.evaluate(()=>App.C.phase!=='offseason');i++){ await page.evaluate(()=>{ const f=userFixture(App.C); if(f) A.quickSim({dataset:{id:f.id}}); else A.playNext(); App.modal=null; renderModal(); document.querySelectorAll('.ceremony').forEach(x=>x.remove()); }); }
  console.log('phase', await page.evaluate(()=>App.C.phase));
  await page.dispatchEvent('.tnav [data-r="awards"]','click'); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/13-awards.png', fullPage:true});
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/14-offseason.png', fullPage:true});
  await page.click('.top [data-a="playNext"]'); await page.waitForTimeout(600);
  console.log('after rollover', await page.evaluate(()=>[App.C.year,App.C.phase,Object.keys(App.C.alumni).length]));
  await page.dispatchEvent('.tnav [data-r="history"]','click'); await page.click('[data-k="tab"][data-v="yearbook"]'); await page.waitForTimeout(300); await page.screenshot({path:'test/shots/15-yearbook.png', fullPage:true});
  await page.dispatchEvent('.tnav [data-r="records"]','click'); await page.waitForTimeout(150); await page.screenshot({path:'test/shots/16-records.png'});
  // theme drawer
  await page.dispatchEvent('.tnav [data-r="settings"]','click'); await page.click('[data-a="openTheme"]'); await page.click('[data-a="preset"][data-k="crimson"]'); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/17-theme.png'});
  await page.keyboard.press('Escape');
  // reload persistence
  await page.reload(); await page.waitForTimeout(1200);
  console.log('after reload', await page.evaluate(()=>App.C?[App.C.year,App.C.phase,Object.keys(App.C.logs).length]:'no career'));
  // mobile
  await page.setViewportSize({width:390,height:844}); await page.click('[data-a="burger"]').catch(()=>{}); await page.keyboard.press('Escape'); await page.evaluate(()=>{document.body.classList.remove('navopen'); App.route='office'; render();}); await page.waitForTimeout(200);
  await page.screenshot({path:'test/shots/18-mobile-office.png', fullPage:true});
  const ow=await page.evaluate(()=>document.documentElement.scrollWidth); console.log('mobile scrollWidth',ow);
  await page.evaluate(()=>{App.route='squads';App.params={};render();}); await page.waitForTimeout(200); await page.screenshot({path:'test/shots/19-mobile-squads.png', fullPage:true});
  console.log('mobile squads scrollWidth', await page.evaluate(()=>document.documentElement.scrollWidth));
  console.log('ERRORS', errs.length? errs.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.error('TEST CRASH',e); process.exit(1); });
