/* v18: 3-D walkout camera and 3-D Courier photos, with PREFS.renderer forced to '3d' (software WebGL here: no fps checks).
   node test/walkout3d.js [noshots] — screenshots go to test/shots/v18/walkout/ */
const { chromium, DIST } = require('./_pw'); const fs=require('fs'); const OUT=require('path').resolve(__dirname,'shots/v18/walkout')+'/'; fs.mkdirSync(OUT,{recursive:true});
const SHOTS=process.argv[2]!=='noshots';
(async()=>{ const b=await chromium.launch(); let fails=0; const errs=[]; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const page=async(seed,w,h)=>{ const p=await b.newPage({viewport:{width:w||1100,height:h||700}}); p.on('pageerror',e=>errs.push(seed+': '+e.message));
    p.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push(seed+' console: '+m.text()); if(m.type()==='warning'&&/v18/.test(m.text())) errs.push(seed+' warn: '+m.text()); });
    /* a stand-in speech engine that "speaks" each line in 600 ms */
    await p.addInitScript(()=>{ const fake={ speaking:false, getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){}, speak(u){ setTimeout(()=>{ u.onstart&&u.onstart(); },20); setTimeout(()=>u.onend&&u.onend(),600); } };
      Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
    await p.goto(DIST); await p.waitForTimeout(500); await p.evaluate(()=>{ PREFS.renderer='3d'; PREFS.sound.on=true; });
    await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Walk Coach'); await p.fill('#nc-seed',seed);
    await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
    await p.evaluate(()=>{ App.C.settings.walkout='all'; App.C.settings.walk2=1; App.C.settings.senior='off'; App.C.settings.introBoth='both'; });
    return p; };
  const until=async(p,fn,ms,arg)=>{ try{ await p.waitForFunction(fn,arg,{timeout:ms,polling:150}); return true; }catch(e){ return false; } };
  const mode=p=>p.evaluate(()=>{ const P=App.live&&App.live.stage&&App.live.stage._p3d; return P&&P.dir?P.dir.mode:null; });
  const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:OUT+n+'.png'}); };

  /* ---------- 1. the full walkout ---------- */
  let p=await page('walk3d');
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  ok(await until(p,()=>!!document.querySelector('.walk'),25000), 'the walkout overlay appears');
  ok(await until(p,()=>{ const s=App.live.stage; return !!(s._p3d&&!s._p3d.dead&&s._p3d.dir); },15000), 'the live stage is on the 3-D painter');
  ok(await until(p,()=>{ const P=App.live.stage._p3d; return P&&P.dir&&P.dir.mode==='walkout'; },10000), 'the director switches to the walkout preset');
  ok(await p.evaluate(()=>document.getElementById('lv-intro').classList.contains('v18-wk3')&&getComputedStyle(document.querySelector('.walk')).backgroundColor==='rgba(0, 0, 0, 0)'), 'the overlay backdrop turns into a vignette over the stadium');
  await until(p,()=>{ const F=v18WalkFocus; return F&&F.phase==='them'&&F.pid; },20000);
  const f1=await p.evaluate(()=>{ const F=v18WalkFocus, st=App.live.stage, P=st._p3d, q=st.players.get(F.pid); const c=P.camera.position; return {side:F.side,user:App.live.M.user,pid:F.pid,ph:F.phase,d:Math.hypot(c.x-q.x,c.z-q.y),h:c.y}; });
  ok(f1.side===1-f1.user, 'the opponents are framed while they are announced ('+JSON.stringify(f1)+')');
  await p.waitForTimeout(1500); await shot(p,'1-them');
  ok(await until(p,()=>!!document.querySelector('.walk-vs'),60000), 'VS card'); await shot(p,'2-vs');
  ok(await until(p,()=>{ const F=v18WalkFocus; return F&&F.phase==='mine'&&F.idx>=3; },40000), 'your XI: the focus follows the announcer index');
  const f2=await p.evaluate(()=>{ const F=v18WalkFocus; return {side:F.side,user:App.live.M.user,idx:F.idx,pid:F.pid,first:F.xi[0]}; });
  ok(f2.side===f2.user&&f2.pid, 'your side is framed, player '+f2.idx+' '+f2.pid);
  /* once a call has been on for ~1.6 s the camera has dollied up to that player (software GL: a few fps, so allow lag) */
  await until(p,()=>{ const F=v18WalkFocus; return F&&F.phase==='mine'&&F.pid&&performance.now()-F.it>1600; },20000);
  const f1b=await p.evaluate(()=>{ const F=v18WalkFocus, st=App.live.stage, P=st._p3d, q=st.players.get(F.pid); const c=P.camera.position; return {d:Math.hypot(c.x-q.x,c.z-q.y),h:c.y}; });
  ok(f1b.d>3&&f1b.d<12&&f1b.h>1.2&&f1b.h<3, 'the camera stands near the called player at eye height (dist '+f1b.d.toFixed(1)+' m, height '+f1b.h.toFixed(2)+' m)');
  await shot(p,'3-mine-a'); await p.waitForTimeout(1600); await shot(p,'3-mine-b');
  ok(await until(p,()=>v18WalkFocus&&v18WalkFocus.phase==='coach',60000), 'the head coach call widens to the whole team'); await p.waitForTimeout(800); await shot(p,'4-coach');
  ok(await until(p,()=>v18WalkSeen.includes('crane'),20000), 'the natural end flies a crane shot for the kick-off');
  await shot(p,'5-crane');
  ok(await until(p,()=>{ const P=App.live.stage._p3d; return !v18WalkFocus&&P&&P.dir&&P.dir.mode!=='walkout'&&P.dir.mode!=='crane'; },15000), 'then the walkout preset ends ('+await mode(p)+')');
  ok(await p.evaluate(()=>!document.getElementById('lv-intro').classList.contains('v18-wk3')), 'the overlay class is removed');
  await p.waitForTimeout(800); await shot(p,'6-after'); await p.close();

  /* ---------- 2. skipping cuts back to the kick-off preset ---------- */
  p=await page('walk3s',390,800); /* phone-sized */
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  ok(await until(p,()=>{ const P=App.live&&App.live.stage&&App.live.stage._p3d; return P&&P.dir&&P.dir.mode==='walkout'&&document.querySelector('[data-a="paSkipAll"]'); },40000), 'skip run: walkout preset on');
  await p.waitForTimeout(2500); await shot(p,'7-phone-walkout');
  ok(await p.evaluate(()=>!App.live.stage.minimap), 'the minimap is hidden while the walkout is framed');
  const kicked=await p.evaluate(()=>!!App.live.stage.pendingKick);
  await p.evaluate(()=>A.paSkipAll()); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>!v18WalkFocus&&!!document.querySelector('#lv-stage .v18-cut, .v18-cut')), 'Skip all ends the walkout under a cut');
  ok(await until(p,(k)=>{ const P=App.live.stage._p3d; return P.dir.mode!=='walkout'&&P.dir.mode!=='crane'&&(!k||P.dir.mode==='kickoff'); },5000,kicked), 'the director is back on '+(kicked?'the kick-off preset':'its normal presets')+' ('+await mode(p)+')');
  ok(await p.evaluate(()=>App.live.stage.minimap!==false), 'and restored after');
  await p.waitForTimeout(600); await shot(p,'7-skipped'); await p.close();

  /* ---------- 3. a Courier front page with a 3-D photo ---------- */
  p=await page('walk3p',1280,860);
  await p.evaluate(()=>{ for(let i=0;i<4;i++){ simRound(App.C); advance(App.C); } render(); });
  await p.evaluate(()=>A.go({dataset:{r:'news'}}));
  ok(await until(p,()=>!!document.querySelector('.np-img.ready'),60000), 'the Courier photo is ready');
  const ph=await p.evaluate(()=>({n:v18Photo.n,len:(v18Photo.last||'').length,bg:(document.querySelector('.np-img.ready').style.backgroundImage||'').length,gl:document.querySelectorAll('canvas.v18-gl').length}));
  ok(ph.n>=1&&ph.len>5000&&ph.bg>5000, 'the photo was rendered by the 3-D painter ('+JSON.stringify(ph)+')');
  await p.waitForTimeout(3000);
  ok(await p.evaluate(()=>document.querySelectorAll('canvas.v18-gl').length===0), 'photo painters are disposed (no GL canvas left)');
  if(SHOTS){ const url=await p.evaluate(()=>v18Photo.last); fs.writeFileSync(OUT+'8-photo.jpg',Buffer.from(url.split(',')[1],'base64'));
    await p.evaluate(()=>document.querySelector('.np-img.ready').scrollIntoView({block:'center'})); await shot(p,'9-courier'); }
  await p.close();
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
