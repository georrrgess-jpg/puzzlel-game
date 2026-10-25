/* Frame strips of a celebration (v18.10): a lab player is frozen at fixed times into it and drawn close up.
   node test/plan/celeb_strip.js <type> <2d|3d> <outPng> [stepMs] [endMs] */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const type=process.argv[2]||'backflip', rend=process.argv[3]||'2d', out=path.resolve(process.argv[4]||'/tmp/cel.png'), step=+(process.argv[5]||100), end=+(process.argv[6]||1300);
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const page=await b.newPage({viewport:{width:900,height:700},deviceScaleFactor:rend==='2d'?2:1}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  await page.evaluate(r=>{ PREFS.renderer=r; PREFS.plates=false; labRun('aerial'); },rend); await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:60000}); await page.waitForTimeout(1500);
  if(rend==='3d') await page.evaluate(()=>{ P3D_MODULES.push({name:'cel-cam',order:28,frame(P,st){ const p=window.__cp; if(!p) return; const y=window.__cy; const d=5.2; P.camera.fov=34; P.camera.updateProjectionMatrix(); P.camera.position.set(p.x+Math.cos(y)*d*0.25-Math.sin(y)*d,1.4,p.y+Math.sin(y)*d*0.25+Math.cos(y)*d); P.camera.lookAt(p.x,1.0,p.y); P.camera.updateMatrixWorld(); }}); });
  const box=await page.evaluate(()=>{ const c=document.querySelector('#anim-lab .lab-cv'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  const frames=[]; const tmp=out.replace(/\.png$/,'')+'_f'; let i=0;
  for(let T=0;T<=end;T+=step){ const pt=await page.evaluate(([type,T])=>{ const st=App.labSt; st.paused=true; for(const q of st.players.values()){ q.ov=null; q.vx=q.vy=0; q.spd=0; }
      const p=[...st.players.values()].find(q=>q.side===0&&!q.gk&&q.num!=null); window.__cp=p; p.x=52; p.y=40; p.vx=p.vy=0; p.spd=0; p.celeb=true; p.celebType=type; p.celebT=st.now-T; p.kickT=-9e9; p.jumpT=-9e9;
      if(T===0){ p.yaw=(type==='backflip'||type==='archer')?0.25:Math.PI/2-0.3; p.v1810yT=null; } window.__cy=type==='backflip'||type==='archer'?0.25:Math.PI/2-0.3;
      for(const q of st.players.values()) if(q!==p){ q.x=q.side?90:10; q.y=10+(q.num||0)*3; }
      st.focus={x:p.x,y:p.y}; st.zoomTo(0.3); st.cam.w=st.cam.tw; st.cam.x=p.x; p._pose=null; st.drawLerp&&st.drawLerp(1); const [x,y]=st.proj(p.x,p.y); return {x,y}; },[type,T]);
    await page.waitForTimeout(rend==='3d'?900:120); const f=tmp+String(i++).padStart(3,'0')+'.png';
    if(rend==='3d') await page.screenshot({path:f,clip:{x:box.x+box.w*0.3,y:box.y,width:box.w*0.4,height:box.h}});
    else await page.screenshot({path:f,clip:{x:Math.max(0,box.x+pt.x-160),y:Math.max(0,box.y+pt.y-330),width:320,height:380}});
    frames.push(f); }
  console.log(JSON.stringify({type,rend,frames:frames.length,errors:errs.slice(0,3)})); fs.writeFileSync(out+'.list',frames.join('\n')); await b.close(); })();
