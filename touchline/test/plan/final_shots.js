/* final visual pass: title, office, schedule, live (desktop + phone), what's new -> test/shots/plan/final-*.png */
const { chromium, DIST } = require('../_pw'); const OUT=require('path').resolve(__dirname,'../shots/plan')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const [w,h,tag,dpr,mob] of [[1440,900,'d',1,false],[390,844,'p',2,true]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:mob,hasTouch:mob}); p.on('pageerror',e=>errs.push(tag+': '+e.message));
    await p.goto(DIST); await p.waitForTimeout(3500); await p.screenshot({path:OUT+`final-${tag}-start.png`});
    await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Coach'); await p.fill('#nc-seed','final'); await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(1000);
    await p.screenshot({path:OUT+`final-${tag}-office.png`});
    await p.evaluate(()=>{ App.route='schedule'; render(); }); await p.waitForTimeout(500); await p.screenshot({path:OUT+`final-${tag}-schedule.png`});
    await p.evaluate(()=>{ App.route='office'; render(); try{ C.settings.walkout='off'; }catch(e){} });
    await p.click('.cta [data-a="playNext"], [data-a="playNext"]'); await p.waitForTimeout(500); await p.click('[data-a="kickoff"]'); await p.waitForTimeout(900);
    for(let i=0;i<6;i++){ await p.click('canvas',{force:true}).catch(()=>{}); await p.waitForTimeout(250); }
    await p.waitForTimeout(9000); await p.screenshot({path:OUT+`final-${tag}-live.png`});
    await p.close(); }
  console.log(errs.join('\n')||'no errors'); await b.close(); })();
