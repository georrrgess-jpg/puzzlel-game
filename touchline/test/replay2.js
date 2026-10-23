/* v18.5 two-angle goal replays (76_replay2.js). PREFS.renderer forced to '3d'; headless WebGL is software (~1-5 fps), so no
   fps or tight wall-clock is asserted: every check reads the frames the painter actually rendered (P._rp2.last, sampled after
   each render while the replay snapshot is applied).
   Checks: an open-play goal at 1x plays SCORER'S VIEW then BEHIND THE GOAL with their captions, App.v18Replays +1, match
   state unchanged; the first-person camera sits at the rendered scorer's head (xz within 0.25 m, y 1.45..2.5 m, near 0.12,
   pitch -36..21 degrees, no turn > 6 degrees or eye jump > 0.35 m between distinct snapshots), never inside another player,
   the scorer's head cluster is collapsed in his camera and not afterwards, near back to 0.3; the behind-goal eye is behind the
   goal line and in front of the boards (3.0..3.5 m, y 1.2..1.8), looking out; the ball is in frame in >= 90% of the frames
   of each pass from the strike; 2x plays both passes, 4x none; a tap in pass 1 ends the whole replay, Next angle jumps to
   pass 2; 2-D keeps today's single replay; header and penalty windows; One angle = today's high replay, Off = none, the
   Settings select; a goal in sideline view; no page errors.
   node test/replay2.js            (RP2_SHOTS=1 also writes screenshots to test/shots/v185/replay2/, RP2_W/RP2_H the viewport,
                                     RP2_THEME a theme preset, RP2_ONLY=shots to skip the measurements) */
const { chromium, DIST } = require('./_pw'); const fs=require('fs');
const W=+process.env.RP2_W||760, H=+process.env.RP2_H||480, TIER=process.env.RP2_TIER||'C', SHOTS=!!process.env.RP2_SHOTS, ONLY=process.env.RP2_ONLY||'', THEME=process.env.RP2_THEME||'';
const SHOTDIR='test/shots/v185/replay2/'; if(SHOTS) fs.mkdirSync(SHOTDIR,{recursive:true});
(async()=>{ const t0=Date.now(); const b=await chromium.launch(); const mobile=W<600;
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/GL Driver/i.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const until=async(fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(200); } return false; };
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.evaluate(([th,tier])=>{ PREFS.renderer='3d'; PREFS.rtier=tier; PREFS.replays=true; PREFS.rpAngles='two'; PREFS.view='broadcast'; PREFS.zoom='normal'; if(th){ if(!PRESETS.some(q=>q.k===th)) throw new Error('RP2_THEME: no theme preset '+th+' (presets: '+PRESETS.map(q=>q.k).join(' ')+')'); PREFS.theme={preset:th,custom:null}; try{ applyTheme(); }catch(e){} } savePrefs(); },[THEME,TIER]);
  if(THEME) console.log('  theme', THEME, 'computed --bg', await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()));
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','RP Coach'); await p.fill('#nc-seed','rp2angles');
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  ok(await until(()=>{ const s=App.live&&App.live.stage; return !!(s&&s._p3d&&!s._p3d.dead&&s._p3d.kind==='live'); },20000), 'live: the 3-D painter attaches');
  ok(await p.evaluate(()=>!!App.live.stage._p3d.mods.find(m=>m.name==='rpcam')), 'live: the rpcam module runs');
  await p.evaluate(()=>{ App.live.paused=true; }); await until(()=>!App.live.busy,60000);
  /* the sampler: after every render during a replay, the frame's camera, the scorer's rendered head, the nearest other
     player to the eye (from the applied snapshot), the ball in normalised device coordinates and the caption */
  await p.evaluate(()=>{ window.V185_RPDBG=true; window.RS=[]; window.RSHOT=null; const _r=Painter3D.prototype.render; Painter3D.prototype.render=function(){ const r=_r.apply(this,arguments);
    try{ const st=this.st, Q=st._rp, L=this._rp2&&this._rp2.last; if(Q&&Q.on&&L){ let md=99; const sc=Q.sc; for(const q of st.players.values()){ if(q===sc||q.off) continue; const d=Math.hypot(L.eye[0]-q.x,L.eye[2]-q.y); if(d<md) md=d; }
      const lt=document.querySelector('.v18-rp .v185-rp-lt:not([hidden]) b'); const nx=document.querySelector('.v18-rp .v185-rp-next');
      const fw=L.fwd, bx=st.ball.x, by=Math.max(0,st.ball.z||0)+V18_BALL_R, bz=st.ball.y; const front=(bx-L.eye[0])*fw[0]+(by-L.eye[1])*fw[1]+(bz-L.eye[2])*fw[2], bd=Math.hypot(bx-L.eye[0],by-L.eye[1],bz-L.eye[2]);
      /* occlusion: a drawn body (capsule r 0.3 m, his height) on the line from the lens to the ball */
      const H=Q.cam==='eyes'&&Q.trk&&Q.trk.hid?Q.trk.hid[Math.max(0,Math.min(Q.trk.n-1,Q.i))]:null; let occ=false; const ddx=bx-L.eye[0], ddz=bz-L.eye[2], dl=Math.hypot(ddx,ddz);
      if(dl>0.5) for(const q of st.players.values()){ if(q.off||(L.cam==='eyes'&&q===sc)||(H&&H.has(q))) continue; if(L.cam==='eyes'&&Math.hypot(q.x-L.eye[0],q.y-L.eye[2])<V185_RP.lens) continue; const ox=q.x-L.eye[0], oz=q.y-L.eye[2], t=(ox*ddx+oz*ddz)/dl; if(t<0.3||t>dl-0.35) continue;
        if(Math.abs(ox*ddz-oz*ddx)/dl<0.3){ const yr=L.eye[1]+(by-L.eye[1])*t/dl; if(yr<1.85*(q.hgt||70)/70) { occ=true; break; } } }
      RS.push({cam:L.cam,pass:L.pass,i:Q.i,now:L.now,eye:L.eye.slice(),fwd:L.fwd.slice(),near:L.near,fov:L.fov,ndc:L.ballNdc.slice(),front,bd,occ,head:L.head&&L.head.slice(),hid:L.hid,md,lt:lt?lt.textContent:'',nx:!!(nx&&!nx.hidden),ts:Q.ts,tg:Q.tg,two:!!Q.two,win:Q.win||null,gx:Q.gx,dir:Q.dir,crossT:Q.crossT==null?null:Q.crossT,rate:Q.rate||0.5});
      if(window.RSHOT) window.RSHOT(L,Q,st); } }catch(e){ console.warn('sampler',e); } return r; }; });
  /* the build-up before the replay is not drawn (software GL is slow; the replay is what is measured): the stage keeps
     stepping in real time, and drawing resumes for good the moment the replay starts */
  await p.evaluate(()=>{ const _on=v17Vis.on; v17Vis.on=el=>{ const st=App.live&&App.live.stage; if(window.NODRAW&&st&&el===st.cv){ if(st._rp) window.NODRAW=false; else return false; } return _on(el); }; });
  /* play one goal on the live stage; opts: speed, side, ty, seq builder; returns the result and the frames */
  const goal=async(o)=>p.evaluate(async o=>{ const L=App.live, st=L.stage; window.NODRAW=o.draw!==true; L.speed=o.speed||1; st.goalTs=GOAL_TS[L.speed]; st.skip=false; RS.length=0;
    const s=o.side||0; const pl=[...st.players.values()].filter(q=>q.side===s&&!q.gk&&!q.off); const sc=pl[pl.length-1], mate=pl[Math.max(0,pl.length-4)];
    const n0=App.v18Replays||0; let bug=false; const ob=new MutationObserver(()=>{ if(document.querySelector('.v18-rp-bug')) bug=true; }); ob.observe(document.getElementById('lv-stage'),{childList:true,subtree:true});
    const M0=JSON.stringify([L.M.sc,L.M.min,L.view.min]); const seq=o.ty==='header'?[{pid:mate.pid,x:10,y:84,a:'cross'},{pid:sc.pid,x:48,y:93,a:'shot'}]:o.ty==='pen'?[{pid:sc.pid,x:50,y:89,a:'setup'}]:o.ty==='long'?[{pid:sc.pid,x:40,y:70,a:'shot'}]:[{pid:sc.pid,x:50,y:84,a:'shot'}];
    const t=Date.now(); await st.goalSequence({s,pid:sc.pid,t:'goal',ty:o.ty||'open',seq,m:L.M.min,sc:[1,0]}); ob.disconnect();
    const P=st._p3d; return {n:(App.v18Replays||0)-n0,bug,same:M0===JSON.stringify([L.M.sc,L.M.min,L.view.min]),rp:!!st._rp,ms:Date.now()-t,frames:RS.slice(),
      after:P&&!P.dead?{near:P.camera.near,eye:P._rp2eye?1:0,last:P._rp2.last}:null}; },o);
  const seqOf=fr=>fr.reduce((a,f)=>{ if(a[a.length-1]!==f.cam) a.push(f.cam); return a; },[]);
  const capsOf=fr=>fr.reduce((a,f)=>{ if(f.lt&&a[a.length-1]!==f.lt) a.push(f.lt); return a; },[]);
  const inFrame=f=>f.front>0&&Math.abs(f.ndc[0])<=1&&Math.abs(f.ndc[1])<=1;
  /* frames with the ball within 1 m of the lens (on his forehead or boot at the contact) cannot frame it in any first-person
     camera; they are left out of the ball-in-frame counts */
  const pct=(fr)=>{ fr=fr.filter(f=>!(f.bd<1)); return fr.length?fr.filter(inFrame).length/fr.length:0; };
  const vis=(fr)=>{ fr=fr.filter(f=>!(f.bd<1)); return fr.length?fr.filter(f=>inFrame(f)&&!f.occ).length/fr.length:0; };
  const D=180/Math.PI;
  const eyesStats=fr=>{ const E=fr.filter(f=>f.cam==='eyes'); let dHead=0, yMin=9, yMax=0, pMin=90, pMax=-90, turn=0, jump=0, mdMin=99, hid=0, nearOk=true, prev=null;
    for(const f of E){ if(f.head) dHead=Math.max(dHead,Math.hypot(f.eye[0]-f.head[0],f.eye[2]-f.head[2])); yMin=Math.min(yMin,f.eye[1]); yMax=Math.max(yMax,f.eye[1]);
      const pi=Math.asin(Math.max(-1,Math.min(1,f.fwd[1])))*D; pMin=Math.min(pMin,pi); pMax=Math.max(pMax,pi); mdMin=Math.min(mdMin,f.md); hid=Math.max(hid,f.hid||0); if(Math.abs(f.near-0.12)>1e-6) nearOk=false;
      if(prev&&f.i!==prev.i){ const steps=Math.max(1,Math.abs(f.i-prev.i)); const c=f.fwd[0]*prev.fwd[0]+f.fwd[1]*prev.fwd[1]+f.fwd[2]*prev.fwd[2]; turn=Math.max(turn,Math.acos(Math.min(1,c))*D/steps); jump=Math.max(jump,Math.hypot(f.eye[0]-prev.eye[0],f.eye[1]-prev.eye[1],f.eye[2]-prev.eye[2])/steps); }
      prev=f; }
    const S=E.filter(f=>f.now>=f.ts&&f.now<=f.tg); return {n:E.length,dHead:+dHead.toFixed(3),yMin:+yMin.toFixed(2),yMax:+yMax.toFixed(2),pMin:Math.round(pMin),pMax:Math.round(pMax),turn:+turn.toFixed(2),jump:+jump.toFixed(3),mdMin:+mdMin.toFixed(2),hid,nearOk,ball:+pct(S).toFixed(2),vis:+vis(S).toFixed(2),nb:S.length,all:+pct(E).toFixed(2),allVis:+vis(E).toFixed(2)}; };
  const goalStats=fr=>{ const G=fr.filter(f=>f.cam==='goal'&&f.pass===2); let dx0=9, dx1=-9, y0=9, y1=0, back=true;
    for(const f of G){ const dx=f.dir*(f.eye[0]-f.gx); dx0=Math.min(dx0,dx); dx1=Math.max(dx1,dx); y0=Math.min(y0,f.eye[1]); y1=Math.max(y1,f.eye[1]); if(Math.sign(f.fwd[0])!==-f.dir) back=false; }
    const S=G.filter(f=>f.now>=f.ts); return {n:G.length,dx0:+dx0.toFixed(2),dx1:+dx1.toFixed(2),y0:+y0.toFixed(2),y1:+y1.toFixed(2),back,ball:+pct(S).toFixed(2),vis:+vis(S).toFixed(2),nb:S.length,all:+pct(G).toFixed(2),allVis:+vis(G).toFixed(2)}; };
  const brief=r=>JSON.stringify({n:r.n,bug:r.bug,same:r.same,rp:r.rp,s:Math.round(r.ms/1000),cams:seqOf(r.frames),caps:capsOf(r.frames)});

  /* RP2_ONLY=header|pen|long|open: one goal of that type, with a per-frame dump of the eyes pass from the strike (diagnostics) */
  if(['header','pen','long','open'].includes(ONLY)){ if(process.env.RP2_PRE) await goal({speed:4,ty:process.env.RP2_PRE}); const r=await goal({speed:1,ty:ONLY}); const D=180/Math.PI;
    for(const f of r.frames.filter(f=>f.now>=f.ts-100&&f.now<=f.tg+50)) console.log(f.cam, Math.round(f.now-f.ts), 'ndc', f.ndc.map(v=>+v.toFixed(2)).join(','), 'front', +f.front.toFixed(2), 'yaw', Math.round(Math.atan2(f.fwd[2],f.fwd[0])*D), 'pitch', Math.round(Math.asin(f.fwd[1])*D), 'fov', Math.round(f.fov), 'in', inFrame(f));
    console.log('  eyes', JSON.stringify(eyesStats(r.frames)), 'goal', JSON.stringify(goalStats(r.frames))); }
  else if(ONLY!=='shots'){
  /* ---------- 1-3. open play at 1x ---------- */
  let r=await goal({speed:1});
  ok(r.n===1&&r.bug&&r.same&&!r.rp, '1x open play: one replay, REPLAY bug, match state unchanged, st._rp cleared '+brief(r));
  ok(JSON.stringify(seqOf(r.frames))==='["eyes","goal"]', '1x: the camera sequence is exactly eyes > goal '+JSON.stringify(seqOf(r.frames)));
  const caps=capsOf(r.frames); ok(caps.length===2&&caps[0]==="SCORER'S VIEW"&&caps[1]==='BEHIND THE GOAL', '1x: lower-third captions SCORER\'S VIEW then BEHIND THE GOAL '+JSON.stringify(caps));
  ok(r.frames.some(f=>f.pass===1&&f.nx)&&!r.frames.some(f=>f.pass===2&&f.nx), '1x: the Next angle pill shows in pass 1 only');
  let es=eyesStats(r.frames); console.log('  eyes', JSON.stringify(es));
  ok(es.n>=8&&es.dHead<=0.25, 'eyes: the camera sits at the scorer\'s rendered head (xz within 0.25 m): '+es.dHead);
  ok(es.yMin>=1.45&&es.yMax<=2.5, 'eyes: eye height 1.45..2.5 m: '+es.yMin+'..'+es.yMax);
  ok(es.nearOk, 'eyes: near plane 0.12 in the eyes pass');
  ok(es.pMin>=-36&&es.pMax<=21, 'eyes: pitch within -36..21 degrees: '+es.pMin+'..'+es.pMax);
  ok(es.turn<=6&&es.jump<=0.35, 'eyes: no turn > 6 deg and no eye jump > 0.35 m per snapshot: '+es.turn+' deg, '+es.jump+' m');
  ok(es.mdMin>=0.3, 'eyes: never inside another player (nearest body axis '+es.mdMin+' m)');
  ok(es.nb>=3&&es.ball>=0.9, 'eyes: the ball is in frame in >= 90% of frames from the strike to the goal: '+es.ball+' of '+es.nb);
  console.log('  eyes: ball in frame over the whole pass (the run, head up toward goal, included): '+es.all+' of '+es.n);
  ok(es.vis>=0.9, 'eyes: the ball is in frame and not hidden behind a drawn body in >= 90% of frames from the strike to the goal: '+es.vis);
  ok(es.hid>=1, 'eyes: the scorer\'s head cluster is collapsed in his camera ('+es.hid+' instances)');
  ok(r.after&&Math.abs(r.after.near-0.3)<1e-6&&r.after.eye===0, 'after the replay: near 0.3 and no collapsed head '+JSON.stringify(r.after&&{near:r.after.near,eye:r.after.eye}));
  let gs=goalStats(r.frames); console.log('  goal', JSON.stringify(gs));
  ok(gs.n>=5&&gs.dx0>=3.0&&gs.dx1<=3.5, 'goal: the eye is behind the goal line and in front of the boards (3.0..3.5 m): '+gs.dx0+'..'+gs.dx1);
  ok(gs.y0>=1.2&&gs.y1<=1.8&&gs.back, 'goal: eye height 1.2..1.8 m, looking out at the pitch: '+gs.y0+'..'+gs.y1+' '+gs.back);
  ok(gs.nb>=3&&gs.ball>=0.9, 'goal: the ball is in frame in >= 90% of frames from the strike: '+gs.ball+' of '+gs.nb);
  ok(gs.all>=0.9, 'goal: the ball is in frame in >= 90% of all the frames of the pass: '+gs.all+' of '+gs.n);
  console.log('  goal: ball in frame and not behind a body, from the strike: '+gs.vis+', whole pass: '+gs.allVis);
  if(ONLY!=='first'){
  /* ---------- 4. speeds ---------- */
  r=await goal({speed:2,side:1}); const w2=r.frames.length?r.frames[0].win:null; const nom=w2?((w2[0][1]-w2[0][0])+(w2[1][1]-w2[1][0]))/(r.frames[0].rate*1000)+0.4:99;
  ok(r.n===1&&JSON.stringify(seqOf(r.frames))==='["eyes","goal"]'&&r.same, '2x: both passes play '+brief(r));
  ok(nom<=6, '2x: nominal length (windows / rate + dissolve) <= 6 s: '+nom.toFixed(2)+' s at rate '+(r.frames[0]||{}).rate);
  es=eyesStats(r.frames); gs=goalStats(r.frames); console.log('  2x eyes', JSON.stringify(es), 'goal', JSON.stringify(gs));
  ok(es.ball>=0.9&&gs.ball>=0.9&&es.dHead<=0.25&&es.mdMin>=0.3, '2x (other end): ball in frame in both passes, eye at the head, clear of other players');
  r=await goal({speed:4}); ok(r.n===0&&!r.bug&&r.same, '4x: no replay '+brief(r));
  /* ---------- 5. skip controls ---------- */
  const skip=async(how)=>{ await p.evaluate(()=>{ window.SEEN=[]; window.RSHOT=(L)=>{ SEEN.push(L.cam); }; });
    const run=goal({speed:1}); const saw=await until(()=>window.SEEN.includes('eyes')&&!!document.querySelector('.v18-rp'),180000); const tq=Date.now(); let t2=null;
    let tEnd=null; if(saw&&how==='tap'){ await p.click('.v18-rp',{force:true,position:{x:W/2,y:H/3}}).catch(()=>{}); if(await until(()=>!App.live.stage._rp,30000)) tEnd=Date.now()-tq; }
    if(saw&&how==='next'){ await p.click('.v185-rp-next').catch(e=>console.log('click',e.message)); const n0=await p.evaluate(()=>SEEN.length); if(await until(()=>SEEN.includes('goal'),30000)) t2=await p.evaluate(n0=>SEEN.slice(n0).indexOf('goal'),n0); }
    const rr=await run; await p.evaluate(()=>{ window.RSHOT=null; }); return {saw,r:rr,dt:tEnd==null?99999:tEnd,t2}; };
  let k=await skip('tap'); ok(k.saw&&k.r.n===1&&!seqOf(k.r.frames).includes('goal')&&k.dt<15000, 'skip: a tap in pass 1 ends the whole replay '+JSON.stringify({n:k.r.n,cams:seqOf(k.r.frames),ms:k.dt}));
  k=await skip('next'); ok(k.saw&&k.t2!=null&&k.t2<=2&&k.r.n===1&&JSON.stringify(seqOf(k.r.frames))==='["eyes","goal"]', 'Next angle: jumps to pass 2 (within '+k.t2+' rendered frames), one replay '+JSON.stringify({n:k.r.n,cams:seqOf(k.r.frames)}));
  /* ---------- 7-8. header and penalty ---------- */
  r=await goal({speed:1,ty:'header'}); es=eyesStats(r.frames); const f0=r.frames[0]||{};
  const ey=r.frames.filter(f=>f.cam==='eyes').map(f=>f.eye[1]); const stand=ey.length?ey.slice().sort((a,b)=>a-b)[Math.floor(ey.length*0.2)]:0, peak=ey.length?Math.max(...ey):0;
  ok(r.n===1&&JSON.stringify(seqOf(r.frames))==='["eyes","goal"]'&&f0.crossT!=null&&f0.win&&f0.win[0][0]<=f0.crossT, 'header: both passes, pass 1 starts at the cross '+JSON.stringify({cams:seqOf(r.frames),cross:f0.crossT,a0:f0.win&&f0.win[0][0]}));
  ok(peak>=stand+0.3, 'header: the eye rises with the leap (standing '+stand.toFixed(2)+', peak '+peak.toFixed(2)+')');
  ok(es.dHead<=0.25&&es.mdMin>=0.3&&es.ball>=0.9&&es.pMin>=-36&&es.pMax<=21, 'header: eye at the head, clear of others, ball in frame '+JSON.stringify(es));
  r=await goal({speed:1,ty:'pen'}); const fp=r.frames[0]||{}; es=eyesStats(r.frames); gs=goalStats(r.frames);
  ok(r.n===1&&JSON.stringify(seqOf(r.frames))==='["eyes","goal"]'&&fp.win&&fp.win[0][0]<=fp.ts-1200, 'penalty: both passes, pass 1 starts >= 1.2 s before the strike '+JSON.stringify({cams:seqOf(r.frames),lead:fp.win&&fp.ts-fp.win[0][0]}));
  ok(es.dHead<=0.25&&es.ball>=0.9&&gs.ball>=0.9, 'penalty: eye at the head, ball in frame in both passes '+JSON.stringify({es,gs}));
  r=await goal({speed:1,ty:'long'}); es=eyesStats(r.frames); gs=goalStats(r.frames);
  ok(r.n===1&&JSON.stringify(seqOf(r.frames))==='["eyes","goal"]'&&es.ball>=0.9&&gs.ball>=0.9&&es.mdMin>=0.3, 'long shot: both passes, ball in frame '+JSON.stringify({es,gs}));
  /* ---------- sideline view ---------- */
  await p.evaluate(()=>{ PREFS.view='sideline'; v184SetView(App.live.stage,'sideline'); }); await p.waitForTimeout(600);
  r=await goal({speed:1}); es=eyesStats(r.frames); gs=goalStats(r.frames);
  ok(r.n===1&&r.same&&JSON.stringify(seqOf(r.frames))==='["eyes","goal"]'&&es.ball>=0.9&&gs.ball>=0.9, 'sideline view: both passes play '+brief(r)+' '+JSON.stringify({eb:es.ball,gb:gs.ball}));
  ok(await until(()=>{ const P=App.live.stage._p3d; return !!(P&&P._slOn); },20000), 'sideline view: the sideline camera returns after the replay');
  await p.evaluate(()=>{ PREFS.view='broadcast'; v184SetView(App.live.stage,'broadcast'); }); await p.waitForTimeout(400);
  /* ---------- 9. preferences ---------- */
  await p.evaluate(()=>{ PREFS.rpAngles='one'; }); r=await goal({speed:1});
  const hiY=Math.min(...r.frames.map(f=>f.eye[1]));
  ok(r.n===1&&JSON.stringify(seqOf(r.frames))==='["goal"]'&&hiY>8&&!capsOf(r.frames).length, 'One angle: today\'s single high replay, no caption (eye y >= '+hiY.toFixed(1)+') '+brief(r));
  await p.evaluate(()=>{ PREFS.rpAngles='two'; PREFS.replays=false; }); r=await goal({speed:1});
  ok(r.n===0&&!r.bug, 'Off: no replay '+brief(r));
  await p.evaluate(()=>{ PREFS.replays=true; });
  const set=await p.evaluate(()=>{ const h=VIEWS.settings(); const d=document.createElement('div'); d.innerHTML=h; const s=d.querySelector('select[data-c="rpMode"]'); return {sel:!!s,opts:s?[...s.options].map(o=>o.textContent):[],val:s&&s.value,rp:/data-k="replays"/.test(h),box:!!d.querySelector('.v18-rpset')}; });
  ok(set.sel&&set.opts.join()==='Off,One angle,Two angles'&&set.val==='two'&&set.rp&&!set.box, 'Settings: Goal replays Off / One angle / Two angles '+JSON.stringify(set));
  const ch=await p.evaluate(()=>{ const s=document.createElement('select'); s.innerHTML='<option value="off">Off</option><option value="one">One</option><option value="two">Two</option>'; const o=[]; for(const v of ['off','one','two']){ s.value=v; CH.rpMode(s); o.push([PREFS.replays,PREFS.rpAngles]); } return o; });
  ok(JSON.stringify(ch)==='[[false,"two"],[true,"one"],[true,"two"]]', 'Settings: the select drives PREFS.replays and PREFS.rpAngles '+JSON.stringify(ch));
  /* ---------- 6. 2-D renderer ---------- */
  await p.evaluate(()=>{ PREFS.renderer='2d'; const s=App.live.stage; if(s._p3d) s._p3d.dispose(); s._p3d=undefined; }); await p.waitForTimeout(500);
  const r2=await p.evaluate(async()=>{ const L=App.live, st=L.stage; L.speed=1; st.goalTs=GOAL_TS[1]; st.skip=false; const sc=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off); const n0=App.v18Replays||0; const cams=new Set(); let cap=false;
    const iv=setInterval(()=>{ const Q=st._rp; if(Q&&Q.on) cams.add(Q.two?Q.cam:'goal'); const lt=document.querySelector('.v185-rp-lt:not([hidden])'); if(lt&&/SCORER/.test(lt.textContent)) cap=true; },30);
    await st.goalSequence({s:0,pid:sc.pid,t:'goal',ty:'open',seq:[{pid:sc.pid,x:50,y:84,a:'shot'}],m:L.M.min,sc:[1,0]}); clearInterval(iv); return {n:(App.v18Replays||0)-n0,cams:[...cams],cap,gl:!!st._p3d}; });
  ok(r2.n===1&&!r2.cams.includes('eyes')&&!r2.cap&&!r2.gl, '2-D: today\'s single replay, no scorer\'s view '+JSON.stringify(r2));
  await p.evaluate(()=>{ PREFS.renderer='3d'; }); } }

  /* ---------- screenshots (RP2_SHOTS=1) ---------- */
  if(SHOTS){ const tag=(process.env.RP2_TAG||((mobile?'phone':'desk')+(THEME?'-'+THEME:'')));
    await p.evaluate(()=>{ const s=App.live.stage; if(!s._p3d||s._p3d.dead){ s._v18off=false; s._p3d=undefined; } }); await until(()=>{ const s=App.live.stage; return !!(s._p3d&&!s._p3d.dead); },20000);
    for(const [ty,view] of [['open','broadcast'],['header','broadcast'],['pen','broadcast'],['long','sideline']]){ if(process.env.RP2_TYPES&&!process.env.RP2_TYPES.split(',').includes(ty)) continue;
      await p.evaluate(v=>{ A.liveView({dataset:{v}}); },view); await p.waitForTimeout(400);
      console.log('  view', view, JSON.stringify(await p.evaluate(()=>{ const P=App.live.stage._p3d; return {pref:PREFS.view,slOn:!!(P&&P._slOn),btn:[...document.querySelectorAll('[data-a="liveView"]')].filter(b=>b.classList.contains('on')||b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.v)}; })));
      /* pause the replay at chosen moments: early run, a touch, just after the strike, ball near the keeper; pass 2: strike, ball 3 m out, bulge */
      await p.evaluate(()=>{ window.SHOTQ=[]; window.SHOTN=0; window.RSHOT=(L,Q,st)=>{ if(st.paused||!Q.two) return; const ts=Q.ts, tg=Q.tg, b=st.ball, n=st.now; const marks=Q.pass===1?[['p1-early',Q.win[0][0]+120],['p1-mid',(Q.win[0][0]+ts)/2],['p1-strike',ts+100],['p1-keeper',tg-120]]:[['p2-strike',ts],['p2-3m',null],['p2-bulge',tg+200]];
        for(const [k,t] of marks){ if(SHOTQ.includes(k)) continue; const hit=t!=null?n>=t:Math.abs(b.x-Q.gx)<3.2&&n>=ts; if(hit){ SHOTQ.push(k); window.SHOTK=k; st.paused=true; return; } } }; });
      const run=goal({speed:1,ty}); const want=['p1-early','p1-mid','p1-strike','p1-keeper','p2-strike','p2-3m','p2-bulge']; const got=new Set();
      const end=Date.now()+300000; while(Date.now()<end){ const k=await p.evaluate(()=>{ const s=App.live.stage; return s.paused&&window.SHOTK?window.SHOTK:null; });
        if(k){ await p.waitForTimeout(700); if(process.env.RP2_DIAG) console.log(k, await p.evaluate(()=>{ const st=App.live.stage, P=st._p3d, L=P._rp2.last, Q=st._rp; return JSON.stringify({sc:Q.sc&&Q.sc.num,scSide:Q.sc&&Q.sc.side,eye:L.eye.map(v=>+v.toFixed(2)),head:L.head&&L.head.map(v=>+v.toFixed(2)),fwd:L.fwd.map(v=>+v.toFixed(2)),ndc:L.ballNdc.map(v=>+v.toFixed(2)),hid:L.hid,near:Q.R.buf[Q.i].m.filter(([o])=>o.num!=null).map(([o,q])=>[o.num,o.side,+Math.hypot(q.x-L.eye[0],q.y-L.eye[2]).toFixed(2)]).sort((a,b)=>a[2]-b[2]).slice(0,4)}); })); await p.screenshot({path:`${SHOTDIR}${tag}-${ty}-${k}.png`}); got.add(k); await p.evaluate(()=>{ window.SHOTK=null; App.live.stage.paused=false; }); }
        if(await p.evaluate(()=>!App.live.stage._rp&&window.SHOTQ.length>0)) break; await p.waitForTimeout(120); }
      const rr=await run; await p.evaluate(()=>{ window.RSHOT=null; App.live.stage.paused=false; }); console.log('shots', ty, view, [...got].join(' '), JSON.stringify(eyesStats(rr.frames.filter(f=>true))), JSON.stringify(goalStats(rr.frames))); }
    await p.evaluate(()=>{ A.liveView({dataset:{v:'broadcast'}}); }); }
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); if(errs.length) fails++;
  console.log((fails?fails+' FAILED':'ALL PASS')+' in '+Math.round((Date.now()-t0)/1000)+' s'); await b.close(); process.exit(fails?1:0); })();
