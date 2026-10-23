// Ball touches (v18.4): in the lab's run, dribble and receive scenes, every dribble touch lands on the touching foot (ball within
// 0.35 m of that foot), sprinting touches alternate feet, the dribbled ball never rolls back toward the carrier or jumps, every
// strike meets the ball (kicking foot within 0.35 m of the ball when it leaves), and the page throws nothing.
const { chromium, DIST } = require('./_pw');
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900); if(process.env.V184OFF) await page.evaluate(()=>{ window.__off=1; }); if(process.env.DBG) await page.evaluate(()=>{ window.__dbg=1; });
  const all={touches:[],kicks:[],back:0,steps:0,maxStep:0,seq:[],pops:0,popN:0,popMax:0,slide:0,slideN:0};
  for(const scen of ['run','dribble','receive','tackle']){
    await page.evaluate(s=>{ try{ PREFS.renderer='2d'; if(window.__off) V184T.on=false; }catch(e){} labRun(s); return 1; },scen);
    await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:20000});
    await page.evaluate(()=>{ const st=App.labSt; const R=window.__tr={touches:[],kicks:[],back:0,steps:0,maxStep:0,seq:[]}; let prev=null, lastT=null, lastFl=null, lastOwn=null, lastM=null;
      const footW=(p,i)=>{ const Q=st.poseOf(p); const F=Q.feet[i]; const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw), hs=1.06*(p.hgt||70)/70;
        return {x:p.x+(F.f*ca-F.l*sa)*hs, y:p.y+(F.f*sa+F.l*ca)*hs}; };
      const process_env_dbg=!!window.__dbg; const prevF=new Map(); R.pops=0; R.popMax=0; R.popN=0; R.slide=0; R.slideN=0; let prevPlant=null;
      const feetOf=(p,on)=>{ const was=V184T.on; V184T.on=on; try{ const Q=st.poseOf(p); return Q.feet.map(F=>({f:F.f,u:F.u,l:F.l,act:Q.act})); } finally{ V184T.on=was; } };
      const U=Stage.prototype.update; st.update=function(dt){ if(this.own&&!this.hands) lastOwn=this.own; const r=U.call(this,dt);
        /* foot pops added by the touches layer: per-step change of a foot target beyond what the base pose does in the same step */
        const watch=new Set(); if(this.own&&!this.hands) watch.add(this.own); if(this.fl&&this.fl.home) watch.add(this.fl.home);
        for(const p of watch){ const on=feetOf(p,true), off=window.__off?on:feetOf(p,false); const pr=prevF.get(p);
          if(pr&&on[0].act!=='kick'&&pr.on[0].act!=='kick'){ for(const i of [0,1]){ const d1=Math.hypot(on[i].f-pr.on[i].f,on[i].u-pr.on[i].u,on[i].l-pr.on[i].l), d0=Math.hypot(off[i].f-pr.off[i].f,off[i].u-pr.off[i].u,off[i].l-pr.off[i].l);
            const ex=d1-d0; R.popN++; if(ex>0.08){ R.pops++; if(process_env_dbg){ const S=p.v184, c=(p.ph||0)/Math.PI-1.8; (R.dbg=R.dbg||[]).push({i,ex:+ex.toFixed(2),act:on[i].act,pact:pr.on[i].act,own:this.own===p,fl:!!(this.fl&&this.fl.home===p),tT:Math.round(this.now-(p.touchT||-9e9)),pre:S?+(S.next-c).toFixed(2):null,post:S?+(c-S.c0).toFixed(2):null,plant:!!p.plant,sp:+(Math.hypot(p.vx||0,p.vy||0)).toFixed(1),rem:this.fl?Math.round(this.fl.t0+this.fl.dur-this.now):null,bz:+(this.ball.z||0).toFixed(2),pon:[pr.on[i].f,pr.on[i].u,pr.on[i].l].map(v=>+v.toFixed(2)),on:[on[i].f,on[i].u,on[i].l].map(v=>+v.toFixed(2)),poff:[pr.off[i].f,pr.off[i].u,pr.off[i].l].map(v=>+v.toFixed(2)),off:[off[i].f,off[i].u,off[i].l].map(v=>+v.toFixed(2))}); } } R.popMax=Math.max(R.popMax,ex); } }
          prevF.set(p,{on,off}); }
        for(const p of [...prevF.keys()]) if(!watch.has(p)) prevF.delete(p);
        /* the standing foot holds its spot on the turf through a strike's contact */
        const k=lastOwn; if(k&&k.v184K&&k.v184K.k===k.kickT){ const kt=this.now-k.kickT, W=k.kickW||0; if(kt>W*0.7&&kt<W){ const Q=this.poseOf(k), F=Q.feet[0]; const yaw=k.yaw==null?((k.face||1)>0?0:Math.PI):k.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw), hs=1.06*(k.hgt||70)/70;
            const w={x:k.x+(F.f*ca-F.l*sa)*hs, y:k.y+(F.f*sa+F.l*ca)*hs}; if(prevPlant&&prevPlant.k===k.kickT){ R.slide=Math.max(R.slide,Math.hypot(w.x-prevPlant.x,w.y-prevPlant.y)); R.slideN++; } prevPlant={k:k.kickT,x:w.x,y:w.y}; } } const b=this.ball, o=this.own;
        if(o&&!this.hands&&!this.fl&&!this.placed){ const sp=Math.hypot(o.vx||0,o.vy||0);
          if(o.v184T!=null&&o.v184T!==lastT&&o.v184T===this.now){ lastT=o.v184T; const f=footW(o,o.v184F); const m=o.v184?o.v184.c0:null; R.touches.push({d:Math.hypot(b.x-f.x,b.y-f.y),sp,foot:o.v184F,gap:lastM!=null&&m!=null?m-lastM:null}); lastM=m; }
          if(prev&&prev.o===o&&sp>2&&Math.hypot(o.x-prev.px,o.y-prev.py)<sp*dt+0.3){ const ux=o.vx/sp, uy=o.vy/sp; const vb=((b.x-prev.x)*ux+(b.y-prev.y)*uy)/Math.max(1e-4,dt); if(vb<-0.6) R.back++; R.steps++; R.maxStep=Math.max(R.maxStep,Math.hypot(b.x-prev.x,b.y-prev.y)-sp*dt); }
          prev={x:b.x,y:b.y,o,px:o.x,py:o.y}; } else { prev=null; lastM=null; }
        if(this.fl&&this.fl!==lastFl&&this.fl.from&&!this.fl.hands){ lastFl=this.fl; const k=lastOwn; if(k&&k.kickK&&k.kickK!=='head'&&k.kickK!=='throw'&&k.kickK!=='punt'&&this.now-k.kickT<(k.kickW||0)+60){ const f=footW(k,1); R.kicks.push({d:Math.hypot(this.fl.from.x-f.x,this.fl.from.y-f.y),k:k.kickK,W:k.kickW,K:!!(k.v184K&&k.v184K.k===k.kickT),sp:Math.hypot(k.vx||0,k.vy||0),bd:Math.hypot(this.fl.from.x-k.x,this.fl.from.y-k.y)}); } }
        return r; }; });
    await page.waitForTimeout(scen==='receive'?14000:11000);
    const R=await page.evaluate(()=>window.__tr);
    for(const k of ['touches','kicks','seq']) all[k].push(...R[k]); all.back+=R.back; all.steps+=R.steps; all.maxStep=Math.max(all.maxStep,R.maxStep); all.pops=(all.pops||0)+R.pops; all.popN=(all.popN||0)+R.popN; all.popMax=Math.max(all.popMax||0,R.popMax); all.slide=Math.max(all.slide||0,R.slide); all.slideN=(all.slideN||0)+R.slideN;
    if(R.dbg) console.log(JSON.stringify(R.dbg.slice(0,12)));
    console.log(`  ${scen}: ${R.touches.length} touches, ${R.kicks.length} strikes, ${R.steps} carry steps`);
  }
  const T=all.touches, far=T.filter(t=>t.d>0.35);
  ok(T.length>=6, `dribble touches happen (${T.length})`);
  ok(far.length===0, `every touch lands on the touching foot (worst ${T.length?Math.max(...T.map(t=>t.d)).toFixed(2):'-'} m, ${far.length} over 0.35 m)`);
  let alt=0, pairs=0; for(let i=1;i<T.length;i++) if(T[i].gap===3){ pairs++; if(T[i].foot!==T[i-1].foot) alt++; }
  ok(pairs>0&&alt===pairs, `sprinting touches (every third step) alternate feet (${alt}/${pairs})`);
  ok(all.back<=Math.max(2,all.steps*0.01), `the carried ball never rolls back toward him (${all.back} of ${all.steps} steps)`);
  ok(all.maxStep<0.3, `the carried ball never jumps (largest step beyond his own ${all.maxStep.toFixed(3)} m)`);
  const K=all.kicks, kf=K.filter(k=>k.d>0.35); console.log('  strike distances: '+K.map(k=>k.k[0]+k.d.toFixed(2)+(k.d>0.3?JSON.stringify(k):'')).join(' '));
  ok(K.length>=2, `strikes seen (${K.length}: ${[...new Set(K.map(k=>k.k))].join(',')})`);
  ok(kf.length===0, `every strike meets the ball when it leaves (worst ${K.length?Math.max(...K.map(k=>k.d)).toFixed(2):'-'} m)`);
  ok(all.pops===0, `the touches layer adds no foot pops (steps where a foot target moves > 0.08 more than the base pose: ${all.pops} of ${all.popN}, worst ${(all.popMax||0).toFixed(3)})`);
  ok(all.slideN>0&&all.slide<0.03, `the standing foot holds its spot through a strike's downswing (worst ${(all.slide||0).toFixed(3)} m per step over ${all.slideN} steps)`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
