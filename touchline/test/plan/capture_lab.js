const fs=require('fs'); const LOG=require('path').resolve(__dirname,'../shots/plan/lab.log'); const log=s=>fs.appendFileSync(LOG,s+'\n');
const { chromium, DIST } = require('../_pw');
const OUT=require('path').resolve(__dirname,'../shots/plan/')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ fs.writeFileSync(LOG,'');
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); log('launched');
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900); log('loaded');
  const box=await page.evaluate(()=>{ const r=document.querySelector('#anim-lab .lab-cv canvas').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; }); log('box '+JSON.stringify(box));
  for(const sc of ['dribble','keeper','header','pens','tackle']){ await page.evaluate(s=>{ setTimeout(()=>labRun(s),0); },sc); log('ran '+sc); await page.waitForTimeout(2200);
    for(let i=0;i<3;i++){ await page.waitForTimeout(1300); await page.screenshot({path:OUT+`lab-${sc}-${i}.png`,clip:box,animations:'allow',caret:'initial',timeout:8000}).catch(e=>log('shot err '+e.message.slice(0,80))); log('shot '+sc+i); } }
  await browser.close(); log('closed'); })();
