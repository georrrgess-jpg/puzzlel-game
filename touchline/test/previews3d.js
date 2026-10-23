/* v18 3-D previews: with PREFS.renderer forced to '3d' the single-figure previews (appearance editor, celebration
   preview and tiles, kit lab cards and clash panes) are drawn by ONE shared WebGL renderer and copied into their own
   2-D canvases. Checks: previews draw non-empty pixels, exactly one extra live GL context exists while they run, the
   context is released when the previews leave the page, 'auto' stays 2-D on this software renderer, no page errors.
   Screenshots (deviceScaleFactor 2) go to test/shots/v18/previews/. Headless WebGL is software: no fps assertions. */
const { chromium, DIST } = require('./_pw'); const OUT=require('path').resolve(__dirname,'shots/v18/previews')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:860},deviceScaleFactor:2}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); if(m.type()==='warning'&&/v18/.test(m.text())) errs.push('warn: '+m.text()); });
  /* count every WebGL context the page creates and how many are still alive */
  await p.addInitScript(()=>{ const gc=HTMLCanvasElement.prototype.getContext; window.__gl=[]; HTMLCanvasElement.prototype.getContext=function(t,o){ const c=gc.call(this,t,o); if(c&&/webgl/.test(t)&&!window.__gl.includes(c)) window.__gl.push(c); return c; };
    window.__live=()=>window.__gl.filter(c=>!c.isContextLost()).length; });
  let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  /* fraction of a canvas's pixels that are opaque enough to be the figure / disc */
  const ink=sel=>p.evaluate(sel=>{ const cv=document.querySelector(sel); if(!cv||!cv.width) return -1; const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>200) n++; return n/(cv.width*cv.height); },sel);
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Preview Coach'); await p.fill('#nc-seed','pv3d');
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(()=>rendererFor('preview')==='2d'), "'auto' keeps previews 2-D on a software renderer");
  const pid=await p.evaluate(()=>{ const C=App.C; return squad(C,C.userSid,'V').find(q=>q.pos!=='GK').id; });
  /* 2-D baseline: the appearance editor under 'auto' makes no preview context */
  await p.evaluate(id=>{ App.modal={type:'player',id,tab:'look'}; renderModal(); },pid); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!V18PV.P), 'auto: no shared preview renderer is built');
  await p.evaluate(()=>{ App.modal=null; renderModal(); }); await p.waitForTimeout(300);
  const live0=await p.evaluate(()=>__live());
  await p.evaluate(()=>{ PREFS.renderer='3d'; });
  ok(await p.evaluate(()=>rendererFor('preview')==='3d'), "forced '3d' turns previews 3-D");
  /* appearance editor */
  await p.evaluate(id=>{ App.modal={type:'player',id,tab:'look'}; renderModal(); },pid); await p.waitForTimeout(4500);
  ok(await p.evaluate(()=>!!(V18PV.P&&!V18PV.P.dead)), 'appearance editor builds the shared preview renderer');
  const a1=await ink('canvas.lk-fig'); ok(a1>0.02, 'appearance preview draws pixels ('+a1.toFixed(3)+')');
  ok(await p.evaluate(n=>__live()-n,live0)===1, 'exactly one extra live GL context ('+await p.evaluate(()=>__live())+' live, '+live0+' before)');
  const fp=await p.$('.lk-stage'); if(fp) await fp.screenshot({path:OUT+'look.png'});
  await p.waitForTimeout(3000); if(fp) await fp.screenshot({path:OUT+'look-b.png'});
  /* celebrations tab: big preview + ten tiles, still one context */
  await p.evaluate(id=>{ App.modal={type:'player',id,tab:'celeb'}; renderModal(); },pid); await p.waitForTimeout(3500);
  const c1=await ink('canvas.cel-cv'); ok(c1>0.02, 'celebration preview draws pixels ('+c1.toFixed(3)+')');
  const t1=await ink('canvas.cel-mini'); ok(t1>0.02, 'celebration tile draws pixels ('+t1.toFixed(3)+')');
  ok(await p.evaluate(n=>__live()-n,live0)===1, 'still one extra live GL context with 11 preview canvases');
  const cs=await p.$('.cel-wrap'); if(cs) await cs.screenshot({path:OUT+'celeb.png'});
  /* kit lab */
  await p.evaluate(()=>{ App.modal=null; renderModal(); A.go({dataset:{r:'kits'}}); }); await p.waitForTimeout(4500);
  const k1=await ink('canvas[data-klfig]'); ok(k1>0.02, 'kit lab card draws pixels ('+k1.toFixed(3)+')');
  ok(await p.evaluate(n=>__live()-n,live0)===1, 'kit lab shares the same context');
  await p.screenshot({path:OUT+'kits.png'});
  const cl=await p.$('[data-klclash]'); if(cl){ await cl.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500); const pane=await p.evaluateHandle(()=>document.querySelector('[data-klclash]').closest('section,.card')||document.querySelector('[data-klclash]').parentElement); await pane.asElement().screenshot({path:OUT+'kits-clash.png'}); }
  /* leaving: the previews are gone, the shared context is released */
  await p.evaluate(()=>A.go({dataset:{r:'history'}})); await p.waitForTimeout(13000);
  ok(await p.evaluate(()=>!V18PV.P), 'shared preview renderer disposed after the previews left the page');
  ok(await p.evaluate(n=>__live()-n,live0)===0, 'no extra live GL context remains');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
