/* v18 3-D renderer suite (PREFS.renderer forced to '3d'; headless WebGL is software, so no fps is ever asserted):
   lab attach / tactical / 2D-3D toggle / dispose over 5 open-close cycles, '#perf' overlay, a live match on 3-D: painter,
   tactical view, goal replay once at 1x and 2x and never at 4x (the match state is the same after it), context loss falls back
   to 2-D and the match goes on, skip to the end gives the engine's score, no page errors. node test/stage3d.js */
const { chromium, DIST } = require('./_pw');
(async()=>{ const t0=Date.now(); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:900,height:600}}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/GL Driver|WebGL/i.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const until=async(fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(250); } return false; };
  /* ---------- lab ---------- */
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900); await p.evaluate(()=>{ PREFS.renderer='3d'; setTimeout(()=>labRun('pens'),0); });
  ok(await until(()=>{ const P=App.labSt&&App.labSt._p3d; return !!(P&&!P.dead&&document.querySelector('canvas.v18-gl')); },8000), 'lab: the 3-D painter attaches');
  ok(await p.evaluate(()=>{ const P=App.labSt._p3d; return P.kind==='lab'&&!!P.ball3&&!!P.dir&&P.mods.some(m=>m.name==='ball')&&P.mods.some(m=>m.name==='director'); }), 'lab: ball and director modules are running');
  ok(await until(()=>App.labSt._p3d&&App.labSt._p3d.dir&&App.labSt._p3d.dir.mode==='pen',15000), 'lab pens: the director picks the penalty camera');
  await p.evaluate(()=>{ App.labSt.mode='tactical'; App.labSt.requestDraw(); }); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>document.querySelector('canvas.v18-gl').style.visibility==='hidden'), 'lab: tactical view hides the GL canvas');
  await p.evaluate(()=>{ App.labSt.mode='broadcast'; });
  ok(await p.evaluate(()=>!!document.querySelector('#v18-labr')), 'lab: 2D / 3D toggle in the top bar');
  await p.click('#v18-labr'); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>!App.labSt._p3d&&!document.querySelector('canvas.v18-gl')&&App.v18LabScen==='pens'), 'lab: toggle re-creates the scene in 2-D');
  await p.click('#v18-labr'); ok(await until(()=>!!(App.labSt._p3d&&!App.labSt._p3d.dead),6000), 'lab: toggle back to 3-D');
  await p.evaluate(()=>{ App.v18LabR=null; });
  for(let i=0;i<5;i++){ await p.evaluate(()=>A.labClose()); await p.waitForTimeout(150); await p.evaluate(()=>labOpen()); await until(()=>!!(App.labSt&&App.labSt._p3d),5000); }
  await p.evaluate(()=>A.labClose()); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.querySelectorAll('canvas.v18-gl').length===0&&document.querySelectorAll('canvas').length<=3), 'lab: 5 open/close cycles leave no GL canvases ('+await p.evaluate(()=>document.querySelectorAll('canvas').length)+' canvases)');
  /* ---------- #perf ---------- */
  await p.keyboard.press('Shift+P'); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>{ const e=document.querySelector('#v18-perf'); return !!e&&/renderer/.test(e.textContent)&&/fps/.test(e.textContent); }), "Shift+P shows the '#perf' overlay");
  await p.keyboard.press('Shift+P'); ok(await p.evaluate(()=>!document.querySelector('#v18-perf')), 'Shift+P hides it');
  /* ---------- live match on 3-D ---------- */
  await p.goto(DIST+'#perf'); await p.waitForTimeout(600); await p.evaluate(()=>{ PREFS.renderer='3d'; PREFS.replays=true; });
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','GL Coach'); await p.fill('#nc-seed','gl3d');
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  ok(await until(()=>{ const s=App.live&&App.live.stage; return !!(s&&s._p3d&&!s._p3d.dead&&s._p3d.kind==='live'); },15000), 'live: the 3-D painter attaches');
  ok(await p.evaluate(()=>{ const e=document.querySelector('#v18-perf'); return !!e&&/3d/.test(e.textContent); }), "live: '#perf' in the URL opens the overlay (renderer 3d)");
  await p.evaluate(()=>A.liveView({dataset:{v:'tactical'}})); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>{ const c=document.querySelector('#lv-stage canvas.v18-gl'); return !c||c.style.visibility==='hidden'; }), 'live: tactical view hides the GL canvas');
  await p.evaluate(()=>A.liveView({dataset:{v:'broadcast'}})); await p.waitForTimeout(500);
  /* stop the minute loop, then play goal sequences on the live stage directly (replays are a stage feature) */
  await p.evaluate(()=>{ App.live.paused=true; }); await until(()=>!App.live.busy,60000);
  const goal=async(speed)=>p.evaluate(async sp=>{ const L=App.live, st=L.stage; L.speed=sp; st.goalTs=GOAL_TS[sp]; st.skip=false; const sc=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off);
    const n0=App.v18Replays||0; let bug=false; const ob=new MutationObserver(()=>{ if(document.querySelector('.v18-rp-bug')) bug=true; }); ob.observe(document.getElementById('lv-stage'),{childList:true,subtree:true});
    const M0=JSON.stringify([L.M.sc,L.M.min,L.view.min]);
    await st.goalSequence({s:0,pid:sc.pid,t:'goal',ty:'open',seq:[{pid:sc.pid,x:50,y:84,a:'shot'}],m:L.M.min,sc:[1,0]}); ob.disconnect();
    return {n:(App.v18Replays||0)-n0,bug,same:M0===JSON.stringify([L.M.sc,L.M.min,L.view.min]),rp:!!st._rp}; },speed);
  let r=await goal(1); ok(r.n===1&&r.bug&&r.same&&!r.rp, 'live 1x: one replay with the REPLAY bug, match state untouched '+JSON.stringify(r));
    r=await goal(4); ok(r.n===0&&!r.bug&&r.same, 'live 4x: no replay '+JSON.stringify(r));
  /* tap to skip at 2x */
  const tap=p.evaluate(async()=>{ const L=App.live, st=L.stage; L.speed=2; st.goalTs=GOAL_TS[2]; const sc=[...st.players.values()].find(q=>q.side===1&&!q.gk&&!q.off); const n0=App.v18Replays||0;
    await st.goalSequence({s:1,pid:sc.pid,t:'goal',ty:'open',seq:[{pid:sc.pid,x:50,y:84,a:'shot'}],m:L.M.min,sc:[1,1]}); return (App.v18Replays||0)-n0; });
  const sawRp=await until(()=>!!document.querySelector('.v18-rp'),120000); const tq=Date.now(); if(sawRp) await p.click('.v18-rp',{force:true}).catch(()=>{});
  const n2=await tap; ok(sawRp&&n2===1&&Date.now()-tq<15000, 'live 2x: replay plays and a tap skips it');
  /* context loss: back to 2-D, the match continues */
  await p.evaluate(()=>{ const L=App.live; L.stage.skip=false; L.paused=false; L.speed=2; L.loopId=Math.random(); liveLoop(L.loopId); }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const P=App.live.stage._p3d; P.renderer.getContext().getExtension('WEBGL_lose_context').loseContext(); });
  await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>{ const s=App.live.stage; return !s._p3d&&!document.querySelector('#lv-stage canvas.v18-gl'); }), 'context loss: the stage falls back to 2-D');
  const m1=await p.evaluate(()=>App.live.view.min); const adv=await until(m=>App.live.view.min>m||App.live.M.phase==='ht',60000,m1);
  ok(adv, 'context loss: the match continues ('+m1+' -> '+await p.evaluate(()=>App.live.view.min)+')');
  /* skip to the end with 3-D forced again */
  await p.evaluate(()=>{ v18Off=false; const s=App.live.stage; s._v18off=false; s._p3d=undefined; });
  if(await p.evaluate(()=>App.live.M.phase==='ht')) await p.click('#ht-go').catch(()=>{});
  await p.waitForTimeout(800); await p.click('[data-a="liveSkip"][data-to="ft"]').catch(()=>{});
  if(await until(()=>!!document.querySelector('#ht-go'),4000)){ await p.click('#ht-go'); await p.waitForTimeout(600); await p.click('[data-a="liveSkip"][data-to="ft"]').catch(()=>{}); }
  ok(await until(()=>!!document.querySelector('#lv-cont'),60000), 'skip to end: full time');
  const fin=await p.evaluate(()=>{ const L=App.live, f=App.C.fixtures[L.fid]; return {view:L.view.sc,eng:L.M.sc,fx:[f.hg,f.ag],gl:!!(L.stage._p3d&&!L.stage._p3d.dead)}; });
  ok(JSON.stringify(fin.view)===JSON.stringify(fin.eng)&&JSON.stringify(fin.fx)===JSON.stringify(fin.eng), 'skip to end: final score is the engine score '+JSON.stringify(fin));
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log((fails?fails+' FAILED':'ALL PASS')+' in '+Math.round((Date.now()-t0)/1000)+' s'); await b.close(); process.exit(fails||errs.length?1:0); })();
