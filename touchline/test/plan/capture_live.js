const { chromium, DIST } = require('../_pw');
const OUT=require('path').resolve(__dirname,'../shots/plan/')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d', dpr=+(process.argv[5]||1);
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:dpr});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(600); await page.screenshot({path:OUT+`${tag}-00-start.png`});
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach'); await page.fill('#nc-seed','animplan');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ try{ C.settings.walkout='off'; }catch(e){} });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500); await page.screenshot({path:OUT+`${tag}-01-preview.png`});
  await page.click('[data-a="kickoff"]'); await page.waitForTimeout(800);
  for(let i=0;i<6;i++){ await page.click('#lv canvas, canvas',{force:true}).catch(()=>{}); await page.waitForTimeout(250); }
  const t0=Date.now(); let i=0;
  while(Date.now()-t0<42000){ await page.waitForTimeout(1500); i++; const st=await page.evaluate(()=>{ const s=App.live&&App.live.st; return s?{min:App.live.view&&App.live.view.min,hype:+s.hype.toFixed(2),cam:s.cam.w.toFixed(1),own:!!s.own,fl:!!s.fl,sc:App.live.view&&App.live.view.sc}:null; });
    await page.screenshot({path:OUT+`${tag}-live-${String(i).padStart(2,'0')}.png`}); console.log(i, JSON.stringify(st)); }
  // tactical mode if available
  await page.click('[data-a="liveMode"],[data-a="liveView"]',{timeout:1000}).catch(()=>{}); await page.waitForTimeout(800); await page.screenshot({path:OUT+`${tag}-tactical.png`});
  console.log(errs.join('\n')||'no errors'); await browser.close(); })();
