const { chromium, DIST } = require('../_pw');
(async()=>{ const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach'); await page.fill('#nc-seed','animplan');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  // sim a few rounds so views have data
  await page.evaluate(async()=>{ for(let i=0;i<6;i++){ try{ await A.simAhead({dataset:{k:'next'}}); }catch(e){} } });
  const r=await page.evaluate(()=>{ const out={}; for(const r of ['office','squads','schedule','league','school','settings','kits','matchday','dev']){ App.route=r; App.params={}; const t=[]; for(let i=0;i<4;i++){ const t0=performance.now(); render(); t.push(performance.now()-t0); } const html=document.getElementById('app').innerHTML.length; const nodes=document.getElementById('app').querySelectorAll('*').length; const svg=document.querySelectorAll('#app svg').length; const filt=document.querySelectorAll('#app filter').length; out[r]={ms:t.map(x=>+x.toFixed(1)),kb:Math.round(html/1024),nodes,svg,filters:filt}; } App.route='office'; render(); return out; });
  console.log(JSON.stringify(r,null,0));
  // scripting vs style/layout split for office using a long sync
  const split=await page.evaluate(()=>{ App.route='office'; const t0=performance.now(); const h=VIEWS.office(); const t1=performance.now(); document.getElementById('app').querySelector('.content')?.remove(); const t2=performance.now(); render(); const t3=performance.now(); void document.body.offsetHeight; const t4=performance.now(); return {viewHtmlMs:+(t1-t0).toFixed(1),renderMs:+(t3-t2).toFixed(1),forcedLayoutMs:+(t4-t3).toFixed(1)}; });
  console.log('office split', JSON.stringify(split));
  await browser.close(); })();
