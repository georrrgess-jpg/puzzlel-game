/* Records a skill move from the lab's 'skills' scene as video frames: the game is stepped 1/30 s of game time at a time, a close-up
   round the carrier is captured at each step, and the frames from 0.8 s before the move to 0.8 s after it are kept.
   node test/plan/skills_video.js <move: step1|step2|roll|feint|cut|chop|drag|cruyff> <2d|3d> <outDir>  -> outDir/f0000.png ... */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const move=process.argv[2]||'step2', rend=process.argv[3]||'2d', OUT=path.resolve(process.argv[4]||'/tmp/skills_video'); fs.mkdirSync(OUT,{recursive:true});
for(const f of fs.readdirSync(OUT)) if(/^f\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT,f));
(async()=>{ const b=await chromium.launch(); const errs=[];
  const p=await b.newPage({viewport:{width:1100,height:640},deviceScaleFactor:2}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  await p.evaluate(([m,r])=>{ PREFS.renderer=r; PREFS.plates=false; window.__v186seq=[m]; labRun('skills'); },[move,rend]);
  await p.waitForFunction(()=>App.labSt&&App.labSt._v186lab,null,{timeout:150000});
  await p.evaluate(m=>{ const st=App.labSt; st._v186seq=[m]; const P=[...st.players.values()]; const fw=P.filter(q=>q.side===0)[9]; window.__fw=fw; st.focus=fw;
    const W=window.__W={next:0,cap:false,log:[]}; const up=st.update;
    st.update=function(dt){ const r=up.call(this,dt); this.focus=fw; this.minimap=false; this.zoomTo(0.2); this.cam.w=this.cam.tw; this.cam.x=fw.x; if(this.now>=W.next){ W.next=this.now+1000/30; this.paused=true; W.cap=true; W.log.push({now:this.now,k:fw.v186k||null}); } return r; }; },move);
  const frames=[]; let started=null, ended=null, seq=0; const t0=Date.now(), limit=rend==='3d'?1500000:400000;
  while(Date.now()-t0<limit){
    const w=await p.evaluate(()=>{ const W=window.__W, st=App.labSt; if(!W.cap) return null; W.cap=false; const fw=window.__fw; const [x,y]=st.proj(fw.x,fw.y); const r=st.cv.getBoundingClientRect(); const L=W.log[W.log.length-1]; return {x:r.left+x,y:r.top+y,now:L.now,k:L.k}; });
    if(!w){ await p.waitForTimeout(15); continue; }
    if(rend==='3d') await p.waitForTimeout(450);
    const cw=560, ch=440; const file=path.join(OUT,'raw'+String(seq++).padStart(6,'0')+'.png');
    await p.screenshot({path:file,clip:{x:Math.max(0,Math.min(1100-cw,w.x-cw/2)),y:Math.max(0,Math.min(640-ch,w.y-ch*0.8)),width:cw,height:ch}});
    frames.push({file,now:w.now,k:w.k});
    if(started==null&&w.k===move) started=w.now;
    if(started!=null&&ended==null&&w.k!==move) ended=w.now;
    if(frames.length>2000) { const old=frames.shift(); try{ fs.unlinkSync(old.file); }catch(e){} }
    if(ended!=null&&w.now>=ended+800) break;
    if(started==null&&frames.length>40){ const old=frames.shift(); try{ fs.unlinkSync(old.file); }catch(e){} }
    await p.evaluate(()=>{ App.labSt.paused=false; }); }
  const keep=frames.filter(f=>started!=null&&f.now>=started-800&&(ended==null||f.now<=ended+800));
  keep.forEach((f,i)=>fs.renameSync(f.file,path.join(OUT,'f'+String(i).padStart(4,'0')+'.png')));
  for(const f of fs.readdirSync(OUT)) if(/^raw\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT,f));
  console.log(JSON.stringify({move,rend,frames:keep.length,moveMs:started!=null&&ended!=null?Math.round(ended-started):null,errors:errs.slice(0,3)}));
  await b.close(); })();
