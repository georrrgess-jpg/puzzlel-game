/* Records one v18.7 keeper action from the lab's 'keeper2' scene as close-up video frames (game stepped 1/30 s at a time) and a
   contact sheet: node test/plan/keeper_video.js <kick|react|star|claim|punch|punch1|throw|roll|starGoal> <2d|3d> <outDir> [q]
   -> outDir/f0000.png ... and outDir/sheet.png (every 2nd frame from 0.4 s before the action to its end). */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path'), cp=require('child_process');
const act=process.argv[2]||'claim', rend=process.argv[3]||'2d', OUT=path.resolve(process.argv[4]||'/tmp/keeper_video'), q=+(process.argv[5]||0.85); fs.mkdirSync(OUT,{recursive:true});
for(const f of fs.readdirSync(OUT)) if(/^(f|raw)\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT,f));
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const errs=[];
  const p=await b.newPage({viewport:{width:1100,height:640},deviceScaleFactor:rend==='3d'?1:2}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  await p.evaluate(([a,r,q])=>{ PREFS.renderer=r; PREFS.plates=false; window.__v187lab=[a]; window.__v187labQ=[q]; window.__clear=['throw','roll','kick','react','star','starGoal'].includes(a); labRun('keeper2'); },[act,rend,q]);
  await p.waitForFunction(()=>App.labSt&&App.labSt._v187kLab,null,{timeout:150000});
  await p.evaluate(()=>{ const c=document.querySelector('#anim-lab .lab-cv'); if(c) c.scrollIntoView({block:'center'}); });
  await p.evaluate(a=>{ const st=App.labSt; st.ts=0.85; const g=st.gkOf(1); window.__g=g; const W=window.__W={next:0,cap:false,log:[]}; const up=st.update;
    const on=()=>{ const D=g.dive, K=g.v187kd; if(a==='throw'||a==='roll') return !!(K&&K.k===a); if(a==='starGoal') return !!(g.v187sT0!=null||(D&&D.v187s)); const k=a==='punch1'?'punch':a; return !!(D&&D.k===k); };
    st.update=function(dt){ const r=up.call(this,dt); if(window.__clear){ const sg=Math.sign(this.proj(g.x,g.y+1)[1]-this.proj(g.x,g.y)[1])||1; for(const q of this.players.values()){ if(q!==g&&!q.ref&&q!==this.own&&!(this.fl&&this.fl.home===q)&&!(this.lastDist&&this.lastDist.to===q)&&Math.hypot(q.x-g.x,q.y-g.y)<7&&sg*(q.y-g.y)>-3){ q.y=g.y-sg*3.5; q.vx=0; q.vy=0; } } } /* video only: nobody stands between the camera and the keeper */ this.minimap=false; this.zoomTo(0.2); this.cam.w=this.cam.tw; this.cam.x=g.x-3; this.focus={x:g.x-3}; const pre=on()||(this.fl&&!this.fl.phys&&(this.fl.home===g||this.fl.kind==='shot'))||(this.own===g&&this.hands); if(pre) W.lastPre=this.now; if(this.now>=W.next&&this.now-(W.lastPre||-9e9)<600){ W.next=this.now+1000/30; this.paused=true; W.cap=true; W.log.push({now:this.now,on:on(),act:g._act}); } return r; }; },act);
  const frames=[]; let started=null, ended=null, seq=0; const t0=Date.now(), limit=rend==="3d"?900000:+(process.env.KV_LIMIT||240000);
  while(Date.now()-t0<limit){
    const w=await p.evaluate(()=>{ const W=window.__W, st=App.labSt; if(!W.cap) return null; W.cap=false; const g=window.__g; const [x,y]=st.proj(g.x,g.y); const r=st.cv.getBoundingClientRect(); const L=W.log[W.log.length-1]; return {x:r.left+x,y:r.top+y,now:L.now,on:L.on,act:L.act}; });
    if(!w){ await p.waitForTimeout(15); continue; }
    if(rend==='3d') await p.waitForTimeout(350);
    const cw=rend==='3d'?520:420, ch=rend==='3d'?420:340; const file=path.join(OUT,'raw'+String(seq++).padStart(6,'0')+'.png');
    await p.screenshot({path:file,clip:rend==='3d'?{x:290,y:110,width:cw,height:ch}:{x:Math.max(0,Math.min(1100-cw,w.x-cw/2)),y:Math.max(0,Math.min(640-ch,w.y-ch*0.72)),width:cw,height:ch}});
    frames.push({file,now:w.now,on:w.on,act:w.act});
    if(started==null&&w.on) started=w.now;
    if(started!=null&&ended==null&&!w.on) ended=w.now;
    if(ended!=null&&w.now>=ended+400) break;
    if(started==null&&frames.length>14){ const old=frames.shift(); try{ fs.unlinkSync(old.file); }catch(e){} }
    await p.evaluate(()=>{ App.labSt.paused=false; }); }
  const keep=frames.filter(f=>started!=null&&f.now>=started-420&&(ended==null||f.now<=ended+400));
  keep.forEach((f,i)=>fs.renameSync(f.file,path.join(OUT,'f'+String(i).padStart(4,'0')+'.png')));
  for(const f of fs.readdirSync(OUT)) if(/^raw\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT,f));
  fs.writeFileSync(path.join(OUT,'acts.json'),JSON.stringify(keep.map(f=>({now:Math.round(f.now),on:f.on,act:f.act}))));
  try{ cp.execFileSync('python3',['-c',`import sys,glob
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/f*.png'))[::2][:24]
if fs:
  im=[Image.open(f) for f in fs]; w,h=im[0].size; s=0.5; w2,h2=int(w*s),int(h*s); cols=6; rows=(len(im)+cols-1)//cols
  S=Image.new('RGB',(w2*cols,h2*rows),'black')
  for i,m in enumerate(im): S.paste(m.resize((w2,h2)),((i%cols)*w2,(i//cols)*h2))
  S.save(sys.argv[1]+'/sheet.png')`,OUT]); }catch(e){ console.log('sheet failed',e.message); }
  if(!keep.length) console.log(await p.evaluate(()=>{ const st=App.labSt, g=window.__g; return JSON.stringify({log:(document.querySelector('#lab-log')||{}).textContent,n:window.__W.log.length,now:st.now,own:st.own&&st.own.pid,fl:!!st.fl,dive:g.dive&&g.dive.k,gx:g.x,f:st._v187kforce,last:V187K.log&&V187K.log.slice(-3)}); }));
  console.log(JSON.stringify({act,rend,frames:keep.length,ms:started!=null&&ended!=null?Math.round(ended-started):null,errors:errs.slice(0,3)}));
  await b.close(); })();
