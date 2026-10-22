/* frames of a cross, header goal and celebration in the animation lab (2x) -> test/shots/plan/goal-N.png */
const { chromium, DIST } = require('../_pw'); const OUT=require('path').resolve(__dirname,'../shots/plan')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(800);
  const box=await p.evaluate(()=>{ const r=document.querySelector('#anim-lab .lab-cv canvas').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
  await p.evaluate(()=>{ setTimeout(()=>labRun('header'),0); });
  for(let i=0;i<10;i++){ await p.waitForTimeout(1100); await p.screenshot({path:OUT+`goal-${i}.png`,clip:box}); }
  const st=await p.evaluate(()=>{ const s=App.labSt; return {hasM:!!(s&&s.v17M), now:Math.round(s.now)}; });
  console.log(JSON.stringify(st), errs.join('')||'no errors'); await b.close(); })();
