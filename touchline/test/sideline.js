/* v18.4 Sideline camera and zoom levels (src/v17/74_sideline.js). PREFS.renderer is forced to '3d' (headless WebGL is
   software, ~4 fps: no fps is asserted). A live match at 1x is switched to Sideline with the real button and P.camera is
   sampled after every rendered frame: the ball projects inside the frame in >= 95 % of pure sideline frames (outside
   cuts, replays and the director's cutaways), no eye jump > 0.6 m or view turn > 8 degrees between two frames except at
   a cut, the eye stays between the near touchline (68) and the near rail (71.6) and never within 1 m of a player.
   Then a throw-in and a corner on the near side. Zoom: every level by the buttons, the keys and the wheel, each
   changing the camera (sideline fov, broadcast width), aria-disabled at the ends, one level per wheel notch, Tactical
   disables it, V cycles the three views, PREFS survive a reload; finally the same controls with PREFS.renderer='2d'.
   node test/sideline.js [shots]   (shots: screenshots to test/shots/v184/A/) */
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SHOTS=process.argv.includes('shots'); const OUT='test/shots/v184/A/'; if(SHOTS) fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const until=async(p,fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(250); } return false; };
const watch=(p,errs)=>{ p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/GL Driver/i.test(m.text())) errs.push('console: '+m.text()); }); };
async function startLive(p,seed,renderer){
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.evaluate(([r,t])=>{ PREFS.renderer=r; PREFS.rtier=t; PREFS.replays=true; PREFS.view='broadcast'; PREFS.zoom='normal'; savePrefs(); },[renderer,process.env.SL_TIER||'C']);
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Sideline Coach'); await p.fill('#nc-seed',seed);
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ App.C.settings.walkout='off'; App.C.settings.walk2=1; });
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  return until(p,()=>!!(App.live&&App.live.stage&&App.live.stage.alive),20000); }
/* per-frame camera samples, taken right after each 3-D render of the live stage */
const SAMPLER=()=>{ window.SLS=[]; if(window._slHooked) return; window._slHooked=true; const R=Painter3D.prototype.render;
  Painter3D.prototype.render=function(){ R.apply(this,arguments); try{ const P=this, st=P.st; if(P.kind!=='live'||!window.SLS) return; const c=P.camera, D=P.dir||{}, S=P._sl||{};
    c.updateMatrixWorld(); const V=new P.T.Vector3(st.ball.x,(st.ball.z||0)+0.11,st.ball.y).project(c); const f=new P.T.Vector3(); c.getWorldDirection(f);
    let near=99; for(const q of st.players.values()){ if(q.off) continue; near=Math.min(near,Math.hypot(c.position.x-q.x,c.position.z-q.y)); }
    const shotCut=!!window.SLCUT; window.SLCUT=false; SLS.push({sl:!!P._slOn,dm:D.mode,w:D.w||0,rp:!!(st._rp&&st._rp.on),cut:!!S.snapNow||shotCut,e:[c.position.x,c.position.y,c.position.z],f:[f.x,f.y,f.z],fov:c.fov,bx:V.x,by:V.y,bz:V.z,near,ball:[st.ball.x,st.ball.y,st.ball.z||0]}); }catch(e){} }; };
function judge(S){ const pure=s=>s.sl&&s.dm==='main'&&s.w<0.0005&&!s.rp; const P=S.filter(pure);
  const inF=P.filter(s=>Math.abs(s.bx)<=1&&Math.abs(s.by)<=1&&s.bz<1).length;
  let ej=0, aj=0, cuts=0; for(let i=1;i<S.length;i++){ const a=S[i-1], b=S[i]; if(!pure(a)||!pure(b)) continue; if(b.cut){ cuts++; continue; }
    ej=Math.max(ej,Math.hypot(b.e[0]-a.e[0],b.e[1]-a.e[1],b.e[2]-a.e[2])); const d=Math.max(-1,Math.min(1,a.f[0]*b.f[0]+a.f[1]*b.f[1]+a.f[2]*b.f[2])); aj=Math.max(aj,Math.acos(d)*180/Math.PI); }
  const zs=P.map(s=>s.e[2]), hs=P.map(s=>s.e[1]);
  return {n:S.length,pure:P.length,inFrame:P.length?inF/P.length:0,eyeJump:ej,turn:aj,cuts,zMin:Math.min(...zs),zMax:Math.max(...zs),hMin:Math.min(...hs),hMax:Math.max(...hs),near:Math.min(...P.map(s=>s.near))}; }
const f2=x=>+(+x).toFixed(2);
/* screenshots only: headless software GL draws ~1 frame a second, far behind a real camera; before a picture the stage is
   paused and the camera springs are stepped in camera time only (no rendering, no simulation), then one frame is drawn */
async function snap(p,file,stage){ await p.evaluate(async hl=>{ window.SLCUT=true; const st=hl?App.hl:App.live.stage; const P=st&&st._p3d; const was=st.paused; st.paused=true;
    if(P&&!P.dead){ const D=P3D_MODULES.find(m=>m.name==='director'), Q=P3D_MODULES.find(m=>m.name==='polish'); for(let i=0;i<70;i++){ P.dt=0.05; P.camPose(st); if(D) D.frame(P,st); if(Q&&P._pol) Q.frame(P,st); } P._t=performance.now(); }
    st._v184was=was; if(st.requestDraw) st.requestDraw(); },!!stage); await p.waitForTimeout(1600); await p.screenshot({path:OUT+file});
  await p.evaluate(hl=>{ const st=hl?App.hl:App.live.stage; st.paused=!!st._v184was; },!!stage); }

(async()=>{ const t0=Date.now(); const b=await chromium.launch();
  const p=await b.newPage({viewport:SHOTS?{width:1440,height:900}:{width:960,height:600}}); const errs=[]; watch(p,errs);
  ok(await startLive(p,'side84','3d'),'live match started');
  ok(await until(p,()=>{ const s=App.live.stage; return !!(s._p3d&&!s._p3d.dead&&s._p3d.kind==='live'); },20000),'live: the 3-D painter attaches');
  ok(await p.evaluate(()=>document.querySelectorAll('[data-a="liveView"]').length===3&&[...document.querySelectorAll('[data-a="liveView"]')].map(b=>b.textContent).join()==='Broadcast,Sideline,Tactical'),'control bar: Broadcast · Sideline · Tactical');
  ok(await p.evaluate(()=>/V camera · \+ − zoom · M sound/.test((document.querySelector('#lv-ctrl .kb')||{}).textContent||'')),'keyboard hint mentions + − zoom');
  await p.click('[data-a="liveSpeed"][data-v="1"]');
  await p.click('[data-a="liveView"][data-v="sideline"]');
  ok(await p.evaluate(()=>App.live.stage.mode==='sideline'&&PREFS.view==='sideline'&&document.querySelector('[data-a="liveView"][data-v="sideline"]').getAttribute('aria-pressed')==='true'),'Sideline button: stage mode, PREFS.view and aria-pressed');
  ok(await until(p,()=>!!App.live.stage._p3d._slOn,8000),'the 3-D sideline camera takes over (after the switch fade)');
  /* ---------- sampled live play ---------- */
  await p.evaluate(SAMPLER); await p.waitForTimeout(+process.env.SL_MS||(SHOTS?12000:26000));
  let S=await p.evaluate(()=>{ const s=SLS; window.SLS=null; return s; }); let J=judge(S);
  console.log('  samples',JSON.stringify({n:J.n,pure:J.pure,inFrame:f2(J.inFrame),eyeJump:f2(J.eyeJump),turn:f2(J.turn),cuts:J.cuts,z:[f2(J.zMin),f2(J.zMax)],h:[f2(J.hMin),f2(J.hMax)],near:f2(J.near)}));
  ok(J.pure>=(SHOTS?5:15),'enough pure sideline frames sampled ('+J.pure+')');
  ok(J.inFrame>=0.95,'the ball is inside the frame in >= 95 % of frames ('+(J.inFrame*100).toFixed(1)+' %)');
  ok(J.eyeJump<=0.6,'no per-frame eye jump > 0.6 m outside cuts (max '+f2(J.eyeJump)+' m)');
  ok(J.turn<=8,'no per-frame view turn > 8 degrees outside cuts (max '+f2(J.turn)+')');
  ok(J.zMin>68&&J.zMax<71.6,'the eye stays between the near touchline and the near rail (z '+f2(J.zMin)+'..'+f2(J.zMax)+')');
  ok(J.hMin>=1.75&&J.hMax<=2.1&&J.hMax-J.hMin<0.01,'standing height 1.75-2.1 m, never bobbing ('+f2(J.hMin)+'..'+f2(J.hMax)+')');
  ok(J.near>=1,'the eye is never within 1 m of a player (closest '+f2(J.near)+' m)');
  if(SHOTS) await snap(p,'d-sideline-normal.png');
  /* ---------- a throw-in and a corner on the near side ---------- */
  await p.evaluate(()=>{ App.live.paused=true; }); await until(p,()=>!App.live.busy,60000); await p.evaluate(()=>{ App.live.stage.paused=false; });
  await p.evaluate(SAMPLER);
  /* near-side throw-in: the taker holds the ball over his head on the near touchline */
  const thr=p.evaluate(async()=>{ const st=App.live.stage; st.skip=false; const o=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off); await st.gain(o); o.x=46; o.y=63; o.ov={x:47,y:64};
    await st.wait(st.D(300)); o.ov=null; await st.throwIn(); await st.wait(st.D(500)); return true; });
  await until(p,()=>{ const st=App.live.stage; return st.hands&&st.ball.y>67; },90000);
  const thrAt=await p.evaluate(()=>{ const st=App.live.stage, S=st._p3d._sl; return {eye:S.eye.toArray().map(v=>+v.toFixed(2)),ball:[+st.ball.x.toFixed(1),+st.ball.y.toFixed(1)],near:+S.near.toFixed(2)}; });
  if(SHOTS) await snap(p,'d-sideline-throwin.png');
  await thr;
  const cor=p.evaluate(async()=>{ const st=App.live.stage; st.skip=false; await st.cornerKick(0,1); await st.wait(st.D(900)); return true; });
  await until(p,()=>{ const st=App.live.stage; return !!st.fl; },90000);
  if(SHOTS) await snap(p,'d-sideline-corner.png');
  await cor; const thrW=thrAt;
  S=await p.evaluate(()=>{ const s=SLS; window.SLS=null; return s; }); J=judge(S);
  console.log('  set pieces',JSON.stringify({n:J.n,pure:J.pure,inFrame:f2(J.inFrame),eyeJump:f2(J.eyeJump),turn:f2(J.turn),z:[f2(J.zMin),f2(J.zMax)],near:f2(J.near),throwIn:thrW}));
  ok(J.pure>=(SHOTS?2:6)&&J.eyeJump<=0.6&&J.turn<=8,'throw-in and corner: no jumps (eye '+f2(J.eyeJump)+' m, turn '+f2(J.turn)+')');
  ok(J.zMin>68&&J.zMax<71.6&&J.near>=1,'throw-in and corner: the eye stays on the line, nobody within 1 m (closest '+f2(J.near)+' m)');
  ok(J.inFrame>=0.9,'throw-in and corner: the ball in frame ('+(J.inFrame*100).toFixed(1)+' %)');
  /* ---------- a goal in sideline view: the celebration close-up and the goal replay still play, then the sideline camera returns ---------- */
  const gl=await p.evaluate(async()=>{ const L=App.live, st=L.stage; L.speed=1; st.goalTs=GOAL_TS[1]; st.skip=false; st.paused=false; const sc=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off); const n0=App.v18Replays||0; const modes=[];
    const iv=setInterval(()=>{ const P=st._p3d; if(P&&P.dir){ const m=P.dir.mode; if(modes[modes.length-1]!==m) modes.push(m); } },60);
    await st.goalSequence({s:0,pid:sc.pid,t:'goal',ty:'open',seq:[{pid:sc.pid,x:50,y:84,a:'shot'}],m:L.M.min,sc:[1,0]}); await st.wait(st.D(1500)); clearInterval(iv);
    const P=st._p3d; return {n:(App.v18Replays||0)-n0,modes,slOn:!!P._slOn,mode:P.dir.mode,eye:P.camera.position.toArray().map(v=>+v.toFixed(1))}; });
  console.log('  goal',JSON.stringify(gl));
  ok(gl.modes.includes('replay')&&gl.n===1,'sideline goal: the goal replay plays ('+gl.modes.join(' > ')+')');
  ok(gl.modes.includes('celeb')||!!gl.modes.length&&gl.modes.includes('replay'),'sideline goal: the director cutaways run (celebration close-up '+(gl.modes.includes('celeb')?'seen':'not seen')+')');
  ok(gl.slOn&&gl.mode==='main'&&gl.eye[2]>68&&gl.eye[2]<71.6&&!gl.modes.includes('kickoff')&&!gl.modes.includes('corner')&&!gl.modes.includes('pen'),'sideline goal: back on the touchline afterwards, no kick-off / corner / penalty presets');
  /* ---------- zoom: buttons ---------- */
  const lvl=()=>p.evaluate(()=>PREFS.zoom);
  const fov=()=>p.evaluate(()=>{ const P=App.live.stage._p3d; return P._sl&&P._sl.fovT!=null?P._sl.fovT:P.camera.fov; }); /* the lens the sideline camera is easing toward */
  const settle=()=>p.waitForTimeout(1300);
  const seen={btn:new Set(),key:new Set(),wheel:new Set()}; let dirOk=true, lvOk=true;
  const step=async(how,fn,want)=>{ const f0=await fov(); const l0=await lvl(); await fn(); const l1=await lvl(); seen[how].add(l1); await settle(); const f1=await fov();
    const zi=['wide','normal','close','tight']; const exp=Math.sign(zi.indexOf(l0)-zi.indexOf(l1)); /* zoom in -> smaller fov */
    if(l1!==l0&&!(Math.sign(f1-f0)===exp&&Math.abs(f1-f0)>0.3)){ dirOk=false; console.log('  fov did not follow',how,l0,'->',l1,f2(f0),f2(f1)); }
    if(want&&l1!==want){ lvOk=false; console.log('  level',how,'expected',want,'got',l1); } };
  await p.evaluate(()=>{ App.live.stage.paused=false; });
  await step('btn',()=>p.click('[data-a="liveZoom"][data-v="-1"]'),'wide');
  ok(await p.evaluate(()=>document.querySelector('[data-a="liveZoom"][data-v="-1"]').getAttribute('aria-disabled')==='true'&&document.querySelector('[data-a="liveZoom"][data-v="1"]').getAttribute('aria-disabled')==='false'),'Wide: zoom out is aria-disabled, zoom in is not');
  if(SHOTS) await snap(p,'d-sideline-wide.png');
  await p.click('[data-a="liveZoom"][data-v="-1"]',{force:true}); ok(await lvl()==='wide','a click on a disabled end does nothing');
  for(const w of ['normal','close','tight']){ await step('btn',()=>p.click('[data-a="liveZoom"][data-v="1"]'),w); if(SHOTS&&w!=='normal') await snap(p,`d-sideline-${w}.png`); }
  ok(await p.evaluate(()=>document.querySelector('[data-a="liveZoom"][data-v="1"]').getAttribute('aria-disabled')==='true'&&document.querySelector('.v184-zl').textContent==='Tight'),'Tight: zoom in is aria-disabled, the label reads Tight');
  ok(seen.btn.size===4,'buttons reach every level ('+[...seen.btn]+')');
  /* ---------- keys ---------- */
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
  for(const [k,w] of [['-','close'],['-','normal'],['-','wide'],['=','normal'],['+','close'],['+','tight']]) await step('key',()=>p.keyboard.press(k),w);
  ok(seen.key.size===4,'keys - = + reach every level ('+[...seen.key]+')');
  /* ---------- wheel ---------- */
  const box=await p.evaluate(()=>{ const r=document.querySelector('#lv-stage').getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; }); await p.mouse.move(box[0],box[1]);
  for(const w of ['close','normal','wide']) await step('wheel',async()=>{ await p.mouse.wheel(0,120); await p.waitForTimeout(320); },w);
  /* two notches 0 ms apart (dispatched in one task, so the busy software-GL main thread cannot space them out) */
  const two=await p.evaluate(()=>{ const el=document.querySelector('#lv-canvas'); const r=[]; for(let i=0;i<2;i++){ const e=new WheelEvent('wheel',{deltaY:-120,bubbles:true,cancelable:true}); el.dispatchEvent(e); r.push(e.defaultPrevented); } return {z:PREFS.zoom,r}; });
  seen.wheel.add(two.z); await settle();
  ok(two.z==='normal'&&two.r[0]&&two.r[1],'two quick wheel notches inside the cooldown move one level and both are consumed '+JSON.stringify(two));
  await p.waitForTimeout(300);
  for(const w of ['close','tight']) await step('wheel',async()=>{ await p.mouse.wheel(0,-120); await p.waitForTimeout(320); },w);
  ok(seen.wheel.size===4,'the wheel reaches every level ('+[...seen.wheel]+')');
  ok(dirOk,'every level change moves the sideline lens the right way (fov)'); ok(lvOk,'every button press, key and wheel notch moved exactly one level');
  /* ---------- broadcast: the camera width ---------- */
  await p.click('[data-a="liveView"][data-v="broadcast"]'); await p.waitForTimeout(900);
  const bw=async()=>p.evaluate(()=>{ const s=App.live.stage; return {tw:s.cam.tw,w:s.cam.w,base:s.bw*s.zoom,k:s.v184K()}; });
  let wOk=true; const ks={}; for(const [d,w] of [[0,'tight'],[-1,'close'],[-1,'normal'],[-1,'wide']]){ if(d) await p.click(`[data-a="liveZoom"][data-v="${d}"]`); await p.waitForTimeout(1500); const r=await bw(); ks[w]=f2(r.tw/r.base);
    if(SHOTS) await snap(p,`d-broadcast-${w}.png`); if(await lvl()!==w) wOk=false; }
  console.log('  broadcast width factors',JSON.stringify(ks));
  ok(wOk&&ks.wide>ks.normal&&ks.normal>ks.close&&ks.close>ks.tight&&Math.abs(ks.normal-1)<0.01,'broadcast: each level sets the camera width (wide > normal = 1 > close > tight)');
  ok(await p.evaluate(()=>!App.live.stage._p3d._slOn),'broadcast: the gantry camera is back');
  /* ---------- tactical disables zoom; V cycles ---------- */
  await p.click('[data-a="liveView"][data-v="tactical"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>[...document.querySelectorAll('[data-a="liveZoom"]')].every(b=>b.getAttribute('aria-disabled')==='true')),'Tactical: both zoom buttons are aria-disabled');
  if(SHOTS) await p.screenshot({path:OUT+'d-tactical.png'});
  const z0=await lvl(); await p.click('[data-a="liveZoom"][data-v="1"]',{force:true}); await p.evaluate(()=>document.activeElement&&document.activeElement.blur()); await p.keyboard.press('+'); await p.mouse.move(box[0],box[1]); await p.mouse.wheel(0,-120); await p.waitForTimeout(300);
  ok(await lvl()===z0,'Tactical: button, key and wheel leave the zoom alone');
  const cyc=[]; for(let i=0;i<3;i++){ await p.keyboard.press('v'); await p.waitForTimeout(250); cyc.push(await p.evaluate(()=>App.live.stage.mode)); }
  ok(cyc.join()==='broadcast,sideline,tactical','V cycles Broadcast -> Sideline -> Tactical ('+cyc+')');
  /* ---------- PREFS survive a reload ---------- */
  await p.keyboard.press('v'); await p.keyboard.press('v'); await p.waitForTimeout(300); await p.click('[data-a="liveZoom"][data-v="1"]'); const keep=[await lvl(),await p.evaluate(()=>PREFS.view)];
  await p.reload(); await p.waitForTimeout(900);
  const back=await p.evaluate(()=>[PREFS.zoom,PREFS.view]);
  ok(back[0]===keep[0]&&back[1]===keep[1]&&keep[1]==='sideline','zoom level and view survive a reload ('+back+')');
  ok(errs.length===0,'3-D: no page errors '+JSON.stringify(errs.slice(0,3)));
  await p.close();
  /* ---------- phone ---------- */
  if(SHOTS){ const q=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const e2=[]; watch(q,e2);
    await startLive(q,'side84p','3d'); await until(q,()=>!!(App.live.stage._p3d),20000); await q.click('[data-a="liveView"][data-v="sideline"]'); await q.waitForTimeout(4000);
    await snap(q,'p-sideline.png'); const bar=await q.$('#lv-ctrl'); if(bar) await bar.screenshot({path:OUT+'p-controlbar.png'});
    await q.click('[data-a="liveZoom"][data-v="1"]'); await q.waitForTimeout(1000); await snap(q,'p-sideline-close.png');
    await q.click('[data-a="liveView"][data-v="broadcast"]'); await q.waitForTimeout(2500); await snap(q,'p-broadcast-close.png');
    const ov=await q.evaluate(()=>{ const c=document.querySelector('#lv-ctrl'); return document.documentElement.scrollWidth>innerWidth+1||(c&&c.scrollWidth>c.clientWidth+1); });
    ok(!ov,'phone 390 px: the control bar wraps without horizontal overflow'); ok(e2.length===0,'phone: no page errors '+JSON.stringify(e2.slice(0,3))); await q.close(); }
  /* ---------- 2-D ---------- */
  const c2=await b.newContext({viewport:{width:1200,height:800}}); const q=await c2.newPage(); const e3=[]; watch(q,e3);
  ok(await startLive(q,'side2d','2d'),'2-D: live match started');
  await q.click('[data-a="liveView"][data-v="sideline"]'); await q.waitForTimeout(800);
  const r2=await q.evaluate(()=>{ const s=App.live.stage; return {mode:s.mode,p3d:!!(s._p3d&&!s._p3d.dead),k:s.cam.tw/(s.bw*s.zoom)}; });
  ok(r2.mode==='sideline'&&!r2.p3d&&Math.abs(r2.k-0.72)<0.01,'2-D sideline: the broadcast drawing framed tighter (width x'+f2(r2.k)+')');
  await q.click('[data-a="liveZoom"][data-v="1"]'); await q.waitForTimeout(1500);
  const r3=await q.evaluate(()=>{ const s=App.live.stage; return {z:PREFS.zoom,k:s.cam.tw/(s.bw*s.zoom),w:s.cam.w/(s.bw*s.zoom)}; });
  ok(r3.z==='close'&&Math.abs(r3.k-0.72*0.78)<0.01&&r3.w<0.72,'2-D sideline: zoom in narrows the width and eases toward it ('+JSON.stringify({k:f2(r3.k),w:f2(r3.w)})+')');
  if(SHOTS) await q.screenshot({path:OUT+'d-2d-sideline-close.png'});
  await q.keyboard.press('v'); await q.waitForTimeout(400); await q.keyboard.press('-'); await q.keyboard.press('-'); await q.waitForTimeout(600);
  ok(await q.evaluate(()=>App.live.stage.mode==='tactical'&&PREFS.zoom==='close'),'2-D tactical: keys leave the zoom alone');
  await q.keyboard.press('v'); await q.waitForTimeout(1200); if(SHOTS) await q.screenshot({path:OUT+'d-2d-broadcast-close.png'});
  ok(await q.evaluate(()=>{ const s=App.live.stage; return s.mode==='broadcast'&&Math.abs(s.cam.tw/(s.bw*s.zoom)-0.78)<0.01; }),'2-D broadcast: the zoom factor applies');
  /* the goal-replay card in the match report: the same three views and the zoom control */
  await q.click('[data-a="liveSkip"][data-to="ft"]').catch(()=>{});
  if(await until(q,()=>!!document.querySelector('#ht-go'),5000)){ await q.click('#ht-go'); await q.waitForTimeout(600); await q.click('[data-a="liveSkip"][data-to="ft"]').catch(()=>{}); }
  await until(q,()=>!!document.querySelector('[data-a="liveReport"]'),60000);
  await q.click('[data-a="liveReport"]'); await q.waitForTimeout(700); await q.evaluate(()=>{ App.modal.tab='high'; renderModal(); }); await q.waitForTimeout(500);
  ok(await q.evaluate(()=>[...document.querySelectorAll('[data-a="hlView"]')].map(b=>b.textContent).join()==='Broadcast,Sideline,Tactical'&&!!document.querySelector('[data-a="hlZoom"]')),'replay card: Broadcast · Sideline · Tactical and a zoom control');
  await q.click('[data-a="hlView"][data-v="sideline"]'); const hz0=await q.evaluate(()=>PREFS.zoom); await q.click('[data-a="hlZoom"][data-v="1"]'); await q.waitForTimeout(300);
  ok(await q.evaluate(z=>PREFS.view==='sideline'&&PREFS.zoom!==z&&document.querySelector('.v184-hlc .v184-zl').textContent==='Tight'&&document.querySelector('[data-a="hlZoom"][data-v="1"]').getAttribute('aria-disabled')==='true',hz0),'replay card: view and zoom buttons work (Close -> Tight, + disabled at the end)');
  const rb=await q.$('[data-a="replayGoal"]'); if(rb){ await rb.click(); await q.waitForTimeout(2500); ok(await q.evaluate(()=>!!(App.hl&&App.hl.alive&&App.hl.mode==='sideline'&&App.hl.v184z&&Math.abs(App.hl.cam.tw/(App.hl.bw*App.hl.zoom)-0.72*0.6)<0.01)),'replay card: the replay stage plays in Sideline at the chosen zoom'); if(SHOTS) await q.screenshot({path:OUT+'d-2d-replaycard.png'}); }
  await q.click('[data-a="hlView"][data-v="tactical"]'); await q.waitForTimeout(200);
  ok(await q.evaluate(()=>[...document.querySelectorAll('[data-a="hlZoom"]')].every(b=>b.getAttribute('aria-disabled')==='true')),'replay card: Tactical disables zoom');
  ok(e3.length===0,'2-D: no page errors '+JSON.stringify(e3.slice(0,3)));
  await b.close(); console.log((fails?'FAILED '+fails:'ALL PASS')+' in '+Math.round((Date.now()-t0)/1000)+' s'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
