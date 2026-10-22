const { chromium, DIST } = require('../_pw');
const OUT=require('path').resolve(__dirname,'../shots/plan/')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto(DIST); await page.waitForTimeout(700); await page.screenshot({path:OUT+'p-00-start.png'});
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach'); await page.fill('#nc-seed','animplan');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.screenshot({path:OUT+'p-01-office.png'});
  await page.evaluate(()=>{ try{ C.settings.walkout='off'; }catch(e){} });
  await page.click('.cta [data-a="playNext"], #tabbar [data-a="playNext"], [data-a="playNext"]'); await page.waitForTimeout(500); await page.screenshot({path:OUT+'p-02-preview.png'});
  await page.click('[data-a="kickoff"]'); await page.waitForTimeout(800);
  for(let i=0;i<6;i++){ await page.click('canvas',{force:true}).catch(()=>{}); await page.waitForTimeout(250); }
  for(let i=1;i<=8;i++){ await page.waitForTimeout(2500); await page.screenshot({path:OUT+`p-live-${i}.png`}); }
  await page.click('[data-a="liveMode"][data-v="tactical"], [data-v="tactical"]').catch(()=>{}); await page.waitForTimeout(700); await page.screenshot({path:OUT+'p-tactical.png'});
  await browser.close(); })();
