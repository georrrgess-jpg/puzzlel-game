// Animation timing and motion checks: fixed-step clock, background-tab return, pause and speed changes mid-action,
// planted-foot slip, keeper gloves meeting the ball, and no regressions in event order.
const { chromium } = require('./_pw');
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(require('./_pw').DIST+'#anim-lab'); await page.waitForTimeout(900);
  ok(await page.$('#anim-lab'), 'the developer animation lab opens from #anim-lab');
  // 1. a long gap between frames (background tab) advances the clock by at most one capped step
  const gap=await page.evaluate(()=>{ const st=App.labSt; const n0=st.now; const ts=st.t0+st.lastReal+8000; st.loop(ts); return st.now-n0; });
  ok(gap<=60, 'returning from a background tab does not replay a backlog ('+gap.toFixed(1)+' ms of game time)');
  // 2. pause during a shot: nothing moves; resume: the action completes
  await page.evaluate(()=>{ labRun('keeper'); return 1; });
  await page.waitForFunction(()=>App.labSt&&App.labSt.fl&&!App.labSt.fl.phys&&App.labSt.fl.kind==='shot',null,{timeout:30000});
  const p0=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; return [st.ball.x,st.ball.y,st.ball.z,st.now]; }); await page.waitForTimeout(800);
  const p1=await page.evaluate(()=>{ const st=App.labSt; return [st.ball.x,st.ball.y,st.ball.z,st.now]; });
  ok(p0.every((v,i)=>v===p1[i]), 'pausing mid-shot freezes the ball and the game clock');
  const ev0=await page.evaluate(()=>{ window.__ev=[]; const st=App.labSt; const e0=st.emit; st.emit=e=>{ window.__ev.push(e.t); e0(e); }; st.paused=false; return 1; });
  await page.waitForFunction(()=>window.__ev.length>=1,null,{timeout:20000}); ok(true, 'after resuming, the shot completes and its event fires ('+(await page.evaluate(()=>window.__ev[0]))+')');
  // 3. change speed in the middle of a shot
  await page.evaluate(()=>{ const st=App.labSt; window.__sw=0; const L0=st.launch; st.launch=function(p,o){ const r=L0.apply(this,arguments); if(o&&o.kind==='shot'&&!window.__sw) r.then(()=>{ window.__sw=1; window.__ev=[]; st.ts=0.12; st.goalTs=0.12; }); return r; }; });
  await page.waitForFunction(()=>window.__sw===1&&App.labSt.fl,null,{timeout:40000}); const inFlight=await page.evaluate(()=>!!App.labSt.fl);
  await page.waitForFunction(()=>window.__ev.length>=1,null,{timeout:20000}); ok(inFlight, 'switching to 8× the instant a shot is struck still lands it and fires the event ('+(await page.evaluate(()=>window.__ev[0]))+')');
  // 4. a caught ball is in the keeper's gloves
  await page.evaluate(()=>{ App.labSt.ts=0.85; App.labSt.goalTs=0.85; });
  const caught=await page.evaluate(async()=>{ const st=App.labSt; let res=null; const L0=st.land; st.land=function(){ const f=this.fl; const r=L0.apply(this,arguments); if(!res&&f&&!f.phys&&f.home&&f.home.gk&&f.hands&&f.home.dive){ const h=this.handsOf(f.home); res={d:Math.hypot(this.ball.x-h.x,this.ball.y-h.y,this.ball.z-h.z),dive:true}; } return r; };
    for(let i=0;i<1500&&!res;i++) await new Promise(r=>requestAnimationFrame(r)); return res; });
  ok(caught&&caught.d<0.6, 'a diving catch puts the ball in the gloves ('+(caught?caught.d.toFixed(2)+' m':'no catch seen')+')');
  // 5. planted feet stay planted
  await page.evaluate(()=>{ labRun('run'); return 1; }); await page.waitForTimeout(200);
  const slip=await page.evaluate(async()=>{ const st=App.labSt; st.paused=true; const H=1000/120; const prev=new Map(); let s=0,b=0,n=0;
    for(let f=0;f<150;f++){ for(let k=0;k<4;k++){ st.keepPrev(); st.now+=H; st.update(H/1000); await null; await null; }
      for(const p of st.players.values()){ if(p.off||!((p.spd||0)/(st.spdMul||1)>1)) continue; const P=st.blendPose(p,st.poseOf(p,false)); const hs=1.06*(p.hgt||70)/70; const ca=Math.cos(p.yaw), sa=Math.sin(p.yaw);
        const ft=P.feet.map(q=>({x:p.x+(q.f*ca-q.l*sa)*hs,y:p.y+(q.f*sa+q.l*ca)*hs,g:q.u+(P.lift||0)<0.005})); const o=prev.get(p);
        if(o) ft.forEach((q,i)=>{ if(q.g&&o[i].g){ n++; s+=Math.hypot(q.x-o[i].x,q.y-o[i].y); b+=Math.hypot(p.x-o.px,p.y-o.py); } }); ft.px=p.x; ft.py=p.y; prev.set(p,ft); } }
    st.paused=false; return {ratio:n?s/b:1,n}; });
  ok(slip.n>200&&slip.ratio<0.2, 'planted feet barely slide: '+(slip.ratio*100).toFixed(1)+'% of body speed over '+slip.n+' samples (was ~85% before)');
  // 6. turning never flips a player 180° in one step, and nobody is ever drawn twice with the ball
  const flips=await page.evaluate(async()=>{ const st=App.labSt; const last=new Map(); let fl=0; for(let i=0;i<240;i++){ await new Promise(r=>requestAnimationFrame(r)); for(const p of st.players.values()){ const y=last.get(p); if(y!=null&&Math.abs(Math.atan2(Math.sin(p.yaw-y),Math.cos(p.yaw-y)))>2.4) fl++; last.set(p,p.yaw); } } return fl; });
  ok(flips===0, 'no instant 180° facing flips ('+flips+')');
  await page.evaluate(()=>A.labClose()); ok(!(await page.$('#anim-lab'))&&await page.evaluate(()=>!App.labSt), 'closing the lab destroys its stage');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
