const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','P'); await page.fill('#nc-seed','pausetest'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  await page.waitForTimeout(7000);
  const snap=()=>page.evaluate(()=>{ const L=App.live, st=L.stage; const ps=[...st.players.values()].slice(0,5).map(p=>p.x.toFixed(3)+','+p.y.toFixed(3)).join('|'); return {now:Math.round(st.now),ball:st.ball.x.toFixed(3)+','+st.ball.y.toFixed(3),ps,clock:document.querySelector('#lv-clock').textContent,min:L.M.min,feed:L.feed.length}; });
  await page.keyboard.press('Space'); await page.waitForTimeout(150);
  const a=await snap(); await page.waitForTimeout(3000); const b=await snap();
  await page.screenshot({path:'test/shots/pause.png'});
  console.log('paused frozen:', a.now===b.now && a.ball===b.ball && a.ps===b.ps && a.clock===b.clock && a.min===b.min && a.feed===b.feed, a.clock, b.clock);
  await page.keyboard.press('Space'); await page.waitForTimeout(3000); const c=await snap();
  console.log('resumed moving:', c.now>b.now+2000, c.ball!==b.ball, b.clock,'->',c.clock);
  // rapid toggling should not double-run the loop
  for(let i=0;i<6;i++){ await page.keyboard.press('Space'); await page.waitForTimeout(120); }
  await page.waitForTimeout(3000); const d=await snap(); console.log('after toggles', c.clock,'->',d.clock, 'busy', await page.evaluate(()=>App.live.busy));
  console.log(errs.join('\n')||'no errors'); await browser.close(); })();
