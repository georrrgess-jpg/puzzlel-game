/* v18 smoke: the 3-D painter attaches when forced, renders without page errors, and the 2-D path is untouched */
const { chromium, DIST } = require('./_pw'); const OUT=require('path').resolve(__dirname,'shots/v18')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1100,height:700}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='warning'&&/v18/.test(m.text())) errs.push('warn: '+m.text()); });
  let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>rendererFor('live')==='2d'), 'auto picks 2-D on a software renderer');
  ok(await p.evaluate(()=>!App.labSt._p3d), 'the lab starts on the 2-D path');
  await p.evaluate(()=>{ PREFS.renderer='3d'; setTimeout(()=>labRun(window.__scene||'run'),0); }); await p.waitForTimeout(2500);
  const st=await p.evaluate(()=>{ const s=App.labSt, P=s&&s._p3d; return P?{kind:P.kind,tier:P.tier.name,gl:!!document.querySelector('canvas.v18-gl'),calls:P.renderer.info.render.calls,tris:P.renderer.info.render.triangles,mods:P.mods.map(m=>m.name)}:null; });
  ok(st&&st.gl, 'forced 3-D attaches a painter in the lab '+JSON.stringify(st));
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'smoke-lab.png'});
  await p.evaluate(()=>{ App.labSt.mode='tactical'; App.labSt.requestDraw&&App.labSt.requestDraw(); }); await p.waitForTimeout(800);
  ok(await p.evaluate(()=>document.querySelector('canvas.v18-gl').style.visibility==='hidden'), 'tactical view hides the 3-D canvas');
  await p.evaluate(()=>{ App.labSt.mode='broadcast'; }); await p.waitForTimeout(600);
  await p.evaluate(()=>A.labClose()); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.querySelector('canvas.v18-gl')), 'closing the lab disposes the 3-D canvas');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
