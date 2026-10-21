const { chromium } = require('./_pw');
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:W,height:H}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Sq'); await page.fill('#nc-seed','hornets'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>A.go({dataset:{r:'squads'}})); await page.waitForTimeout(400); await page.screenshot({path:`test/shots/sq-${tag}-1.png`});
  await page.click('#pitch .tok >> nth=9'); await page.waitForTimeout(300); await page.screenshot({path:`test/shots/sq-${tag}-2-sel.png`});
  // drag the first bench card onto token 3
  await page.$eval('.bcard',e=>e.scrollIntoView({block:'center'})); await page.waitForTimeout(200); const card=await page.$('.bcard >> nth=0'); const cb=await card.boundingBox(); const tok=await page.$('#pitch .tok >> nth=3'); const tb=await tok.boundingBox();
  const before=await page.evaluate(()=>getLu(App.C,App.C.userSid,'V').slots[3].pid);
  await page.mouse.move(cb.x+20,cb.y+20); await page.mouse.down(); await page.mouse.move(cb.x+60,cb.y+40,{steps:5}); await page.mouse.move(tb.x+tb.width/2,tb.y+20,{steps:12}); await page.screenshot({path:`test/shots/sq-${tag}-3-drag.png`}); await page.mouse.up(); await page.waitForTimeout(300);
  const after=await page.evaluate(()=>getLu(App.C,App.C.userSid,'V').slots[3].pid);
  console.log('bench drag changed slot:', before!==after);
  await page.click('[data-a="pickForm"][data-f="4-2-3-1"]'); await page.waitForTimeout(300); await page.click('[data-a="tacPreset"][data-k="press"]'); await page.waitForTimeout(300);
  await page.screenshot({path:`test/shots/sq-${tag}-4-form.png`,fullPage:true});
  const sw=await page.evaluate(()=>document.documentElement.scrollWidth); console.log('scrollWidth',sw);
  console.log(errs.join('\n')||'no errors'); await browser.close(); })();
