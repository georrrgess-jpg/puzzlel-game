// Records each animation-lab scenario as a real motion clip: the stage is stepped on its own fixed clock and every frame is
// captured, so the clip shows true motion regardless of how fast the headless browser renders. Usage: node test/anim_lab.js OUTDIR [scene ...]
const { chromium } = require('./_pw');
const fs=require('fs'), path=require('path'), { execSync }=require('child_process');
const OUT=process.argv[2]||'/tmp/animlab'; const only=process.argv.slice(3);
const SCENES={run:[600,4200],receive:[400,3600],dribble:[300,5200],tackle:[300,3600],keeper:[300,7800],backpedal:[300,3800],crossing:[200,4000],aerial:[5200,6500],pens:[2600,9000],offside:[300,6500],throwin:[300,6500],corner:[200,7000],header:[100,5200],break:[100,6500]};
(async()=>{ fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:960,height:600}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
  await page.goto(require('./_pw').DIST+'#anim-lab'); await page.waitForTimeout(900);
  const report={};
  for(const [scen,[warm,len]] of Object.entries(SCENES)){ if(only.length&&!only.includes(scen)) continue;
    await page.evaluate(s=>{ labRun(s); return 1; },scen); await page.waitForTimeout(150);
    const res=await page.evaluate(async([warm,len])=>{ const st=App.labSt; st.paused=true; const H=1000/120; const frames=[]; const stats={maxJump:0,yawFlips:0,pairs:0,slip:0,slipN:0,body:0}; const slipPrev=new Map();
      const step=async ms=>{ for(let t=0;t<ms;t+=H){ if(st.keepPrev) st.keepPrev(); st.now+=H; st.update(H/1000); await null; await null; } };
      await step(warm); const prev=new Map(); let lastYaw=new Map();
      for(let f=0;f*33.33<len;f++){ await step(33.33); st.draw();
        for(const p of st.players.values()){ if(p.off) continue; const q=prev.get(p); if(q){ const d=Math.hypot(p.x-q[0],p.y-q[1]); if(d>stats.maxJump) stats.maxJump=d; } prev.set(p,[p.x,p.y]); const ly=lastYaw.get(p); if(ly!=null&&Math.abs(Math.atan2(Math.sin(p.yaw-ly),Math.cos(p.yaw-ly)))>2.4) stats.yawFlips++; lastYaw.set(p,p.yaw); }
        /* foot slip: a planted foot (on the ground in consecutive frames) should not move over the turf */
        for(const p of st.players.values()){ if(p.off||!((p.spd||0)/(st.spdMul||1)>1)) continue; const P=st.blendPose(p,st.poseOf(p,false)); const hs=1.06*(p.hgt||70)/70; const ca=Math.cos(p.yaw), sa=Math.sin(p.yaw);
          const ft=P.feet.map(f=>({x:p.x+(f.f*ca-f.l*sa)*hs,y:p.y+(f.f*sa+f.l*ca)*hs,g:f.u+(P.lift||0)<0.005})); const o=slipPrev.get(p);
          if(o) ft.forEach((f,i)=>{ if(f.g&&o[i].g){ stats.slipN++; stats.slip+=Math.hypot(f.x-o[i].x,f.y-o[i].y)/0.0333; stats.body+=Math.hypot(p.x-o.px,p.y-o.py)/0.0333; } });
          ft.px=p.x; ft.py=p.y; slipPrev.set(p,ft); }
        frames.push(st.cv.toDataURL('image/jpeg',0.82)); }
      stats.slipRatio=stats.slipN?stats.slip/Math.max(0.01,stats.body):null; return {frames,stats}; },[warm,len]);
    const dir=path.join(OUT,scen); fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
    res.frames.forEach((d,i)=>fs.writeFileSync(path.join(dir,`f${String(i).padStart(4,'0')}.jpg`),Buffer.from(d.split(',')[1],'base64')));
    execSync(`ffmpeg -y -loglevel error -framerate 30 -i ${dir}/f%04d.jpg -vf "scale=960:-2" -pix_fmt yuv420p ${OUT}/${scen}.mp4`);
    report[scen]={frames:res.frames.length,yawFlips:res.stats.yawFlips,plantedFootSlip:res.stats.slipRatio==null?null:+(res.stats.slipRatio*100).toFixed(1)+'% of body speed',samples:res.stats.slipN};
    console.log(scen,JSON.stringify(report[scen])); }
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); await browser.close(); })();
