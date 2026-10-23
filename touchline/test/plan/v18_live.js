/* v18: a 3-D live match frame (night + clear), with players, stadium and crowd -> test/shots/v18/live-*.png */
const { chromium, DIST } = require('../_pw'); const OUT=require('path').resolve(__dirname,'../shots/v18')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d', wk=process.argv[5]||'night';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:W<600?2:1}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST); await p.waitForTimeout(500);
  await p.evaluate(wk=>{ PREFS.renderer='3d'; PREFS.rtier=null; const wf=weatherFor; weatherFor=function(f){ const w=wf.apply(this,arguments)||{}; return Object.assign({},w,{k:wk==='night'?'clear':wk,night:wk==='night'}); }; },wk);
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Coach'); await p.fill('#nc-seed','v18live'); await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(900);
  await p.evaluate(()=>{ try{ C.settings.walkout='off'; }catch(e){} }); await p.click('.cta [data-a="playNext"], [data-a="playNext"]'); await p.waitForTimeout(500); await p.click('[data-a="kickoff"]'); await p.waitForTimeout(1500);
  for(let i=0;i<4;i++){ await p.click('canvas.v18-hud, canvas',{force:true}).catch(()=>{}); await p.waitForTimeout(300); }
  for(let i=0;i<3;i++){ await p.waitForTimeout(6000); await p.screenshot({path:OUT+`live-${tag}-${wk}-${i}.png`}); }
  const info=await p.evaluate(()=>{ const s=App.live&&App.live.stage, P=s&&s._p3d; return P?{tier:P.tier.name,calls:P.renderer.info.render.calls,tris:P.renderer.info.render.triangles}:null; });
  console.log(JSON.stringify(info), errs.join('\n')||'no errors'); await b.close(); })();
