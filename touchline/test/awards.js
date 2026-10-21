const { chromium } = require('./_pw');
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:W,height:H}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Aw'); await page.fill('#nc-seed','awards9'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>A.simAhead({dataset:{k:'season'}})); await page.waitForTimeout(800);
  await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; renderModal(); A.go({dataset:{r:'awards'}}); }); await page.waitForTimeout(600);
  await page.screenshot({path:`test/shots/aw-${tag}-page.png`,fullPage:true});
  await page.evaluate(()=>A.awardsNight({dataset:{y:App.C.year}})); await page.waitForTimeout(3500); await page.screenshot({path:`test/shots/aw-${tag}-night.png`});
  console.log(await page.evaluate(()=>App.C.phase), errs.join('\n')||'no errors'); await browser.close(); })();
