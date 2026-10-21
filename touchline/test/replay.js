const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','R'); await page.fill('#nc-seed','fullrun'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>A.simAhead({dataset:{k:'round'}})); await page.waitForTimeout(500);
  const fid=await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); const C=App.C; const f=Object.values(C.fixtures).find(f=>f.st==='d'&&(f.h===C.userSid||f.a===C.userSid)&&f.hg+f.ag>0); App.modal={type:'fixture',id:f.id,tab:'high'}; renderModal(); return f.id; });
  await page.waitForTimeout(500); await page.click('[data-a="replayGoal"] >> nth=0'); await page.waitForTimeout(2500); await page.screenshot({path:'test/shots/v3-replay.png'});
  await page.click('[data-a="replayGoal"] >> nth=0'); await page.waitForTimeout(300); await page.click('[data-a="replayGoal"] >> nth=0'); await page.waitForTimeout(4000); await page.screenshot({path:'test/shots/v3-replay2.png'});
  console.log(fid, errs.join('\n')||'no errors'); await browser.close(); })();
