const { chromium } = require('./_pw');
const seed=process.argv[2]||'goalshots', tag=process.argv[3]||'g', W=+(process.argv[4]||1280), H=+(process.argv[5]||800);
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:+(process.argv[6]||1)});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Shot Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="pvSpeed"][data-v="1"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  await page.waitForTimeout(3600); await page.screenshot({path:`test/shots/v3-${tag}-play.png`});
  const t0=Date.now(); let n=0;
  while(Date.now()-t0<200000 && n<16){
    const z=await page.evaluate(()=>App.live&&App.live.stage? App.live.stage.zoom : 1);
    if(z<0.9){ await page.screenshot({path:`test/shots/v3-${tag}-goal${String(n).padStart(2,'0')}.png`}); n++; await page.waitForTimeout(220); }
    else await page.waitForTimeout(120);
  }
  console.log('shots',n, errs.join('\n')); await browser.close();
})();
