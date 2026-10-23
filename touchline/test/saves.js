// v18.6 keeper save variety (src/v17/80_saves.js).
// A. choice (in-page, no animation): each kind is chosen for the shots it should be (height band by shot type, placement by the
//    shooter's rating, close-range smothers, corners only tipped), the keeper's rating changes the mix (catch vs parry, wrong-footed
//    on goals), better keepers start their movement earlier.
// B. 2-D lab, forced kinds at 1x: at contact the drawn glove is within 0.35 m of the ball centre, the act is the kind's act (never
//    the outfield 'intercept'), full extension is reached as the ball arrives, the save is announced one flight after the release with
//    the ball in the gloves (or parried loose beside a diving keeper), the ball never goes through the keeper.
// C. 2-D natural saves at 4x: at least 5 kinds, none above 50 %, contact heights from the turf to above the head; beaten kinds never
//    on saves; a good keeper is set at the strike more often than a poor one.
// D. goals and misses: beaten dives on goals, the ball never passes through the keeper or his gloves; wide misses are watched.
// E. 3-D: the drawn 3-D glove is within 0.40 m of the ball centre at contact (stand, dive, tip over).
// F. reduced motion runs; no page errors anywhere.
// Usage: node test/saves.js [sections, e.g. ABCDEF]   (screenshots in test/shots/v186/saves/)
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const OUT='test/shots/v186/saves/'; fs.mkdirSync(OUT,{recursive:true});
const SEC=(process.argv[2]||'ABCDEF').toUpperCase();
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const pct=x=>(x*100).toFixed(0)+'%';
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  const errs=[];
  const open=async(mode,vp,rm)=>{ const page=await browser.newPage({viewport:vp||{width:1100,height:640}}); if(rm) await page.emulateMedia({reducedMotion:'reduce'});
    page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1])); await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
    await page.evaluate(m=>{ try{ PREFS.renderer=m; }catch(e){} },mode); return page; };
  /* start the lab saves scene with a list of [kind,outcome] and keeper ratings; install hooks that pause at each save contact */
  const start=async(page,list,qs,ts,pause)=>{ await page.evaluate(([list,qs,ts,pause])=>{ window.__v186lab=list; window.__v186labQ=qs; App.labTs=ts; V186K.log=[]; window.__S=[]; window.__E=[]; labRun('saves'); window.__pause=pause; },[list,qs,ts,pause]);
    await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:60000});
    await page.evaluate(()=>{ const st=App.labSt; st.ts=App.labTs; st.goalTs=App.labTs;
      const E0=st.emit; st.emit=function(e){ const g=this.gkOf(1); const b=this.ball; window.__E.push({t:e.t,now:this.now,inHands:!!(this.own&&this.own.gk&&this.hands),loose:!!(this.fl&&this.fl.phys&&!this.own&&g&&g.dive&&Math.hypot(g.x-b.x,g.y-b.y)<4),k:g&&g.dive&&g.dive.k}); return E0.apply(this,arguments); };
      const L0=st.land; st.land=function(){ const f=this.fl; const g=f&&!f.phys&&f.home&&f.home.gk&&f.hands?f.home:null; const r=L0.apply(this,arguments);
        if(g&&g.dive&&g.dive.k){ const D=g.dive; window.__S.push({k:D.k,out:D.out,q:D.q,now:this.now,tP0:D.tP0,rel:D.rel,dur:f.dur,t0:f.t0,bz:this.ball.z+v186kBR(this),minTorso:window.__mt==null?9:window.__mt}); window.__mt=null; if(window.__pause){ this.paused=true; window.__pend=1; } }
        return r; };
      window.__X=[]; let px=null; const U0=st.update; st.update=function(dt){ const r=U0.apply(this,arguments); const f=this.fl, g=this.gkOf(1);
        { const B=this.ball; if(px!=null&&px<105&&B.x>=105) window.__X.push({y:+B.y.toFixed(2),z:+B.z.toFixed(2),k:g&&g.dive&&g.dive.k,goal:!!this.inNet}); px=B.x; }
        if(f&&!f.phys&&g&&g.dive&&g.dive.k&&this.now>=g.dive.t&&(f.home===g||f.kind==='shot')){ const u=(this.now-f.t0)/f.dur; if(u<0.85||!f.home){ const is3=v186kIs3D(this); const P=this.v186kPose(g,g.dive); const [a,b]=v186kTorso(g,P,is3); const R=v186kBR(this), B=this.ball, c={x:B.x,y:B.y,z:B.z+R};
            const vx=b.x-a.x, vy=b.y-a.y, vz=b.z-a.z, L=vx*vx+vy*vy+vz*vz||1; const t=clamp(((c.x-a.x)*vx+(c.y-a.y)*vy+(c.z-a.z)*vz)/L,0,1); const d=Math.hypot(a.x+vx*t-c.x,a.y+vy*t-c.y,a.z+vz*t-c.z);
            let dh=9; if(!f.home){ for(const i of [0,1]){ const h=v186kHand(g,P,i,is3); dh=Math.min(dh,Math.hypot(h.x-c.x,h.y-c.y,h.z-c.z)); } } window.__mt=Math.min(window.__mt==null?9:window.__mt,d); window.__mh=Math.min(window.__mh==null?9:window.__mh,dh); } }
        return r; }; }); };
  /* at a paused contact: wait for a draw at the paused time, read the drawn pose's gloves against the ball */
  const contact=async(page,shot)=>{ await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const R=await page.evaluate(()=>{ const st=App.labSt, g=st.gkOf(1), D=g.dive, P=g._pose; const is3=v186kIs3D(st); const R=v186kBR(st), b=st.ball, c={x:b.x,y:b.y,z:b.z+R};
      const hs=[0,1].map(i=>v186kHand(g,P,i,is3)); const d=Math.min(...hs.map(h=>Math.hypot(h.x-c.x,h.y-c.y,h.z-c.z))); const W=window.__w3;
      let d3=null; if(W){ const H=[[W[24],W[26],W[25]],[W[33],W[35],W[34]]]; d3=Math.min(...H.map(h=>Math.hypot(h[0]-c.x,h[1]-c.y,h[2]-c.z))); }
      const cv=st.cv.getBoundingClientRect(); const [x,y,k]=st.proj(g.x,g.y,0);
      return {k:D.k,out:D.out,q:D.q,d,d3,act:g._act,z:c.z,x:cv.left+x,y:cv.top+y,kk:k,cl:cv.left,ct:cv.top,W:cv.width,H:cv.height,is3}; });
    if(shot&&R.is3) await page.screenshot({path:shot}).catch(()=>{});
    else if(shot){ const w=Math.min(R.W,Math.max(220,R.kk*5.5)), h=Math.min(R.H,Math.max(160,R.kk*3.8)); await page.screenshot({path:shot,clip:{x:Math.max(R.cl,R.x-w/2),y:Math.max(R.ct,R.y-h*0.78),width:w,height:h}}).catch(()=>{}); }
    await page.evaluate(()=>{ window.__pend=0; App.labSt.paused=false; }); return R; };

  /* ---------------- A. choice ---------------- */
  if(SEC.includes('A')){ const page=await open('2d');
    await page.evaluate(()=>{ window.__v186labIdle=1; }); await start(page,[['stand','catch']],[0.6],0.85,false);
    const A=await page.evaluate(()=>{ const st=App.labSt; const gk=st.gkOf(1), sh=[...st.players.values()].find(p=>p.side===0&&!p.gk); st._v186force=null; const keep=st._v186q;
      const run=(n,e,q,sq,x)=>{ st._v186q=q; const ks={}, outs={}; let spread=0, low=0, high=0; for(let i=0;i<n;i++){ st._v186force=sq!=null?{sq}:null; const P=st.v186kPlan(e,gk,sh,x||88,30); ks[P.k]=(ks[P.k]||0)+1; outs[P.out]=(outs[P.out]||0)+1; spread+=Math.abs(P.ty-34); if(P.z<0.35) low++; if(P.z>1.6) high++; } st._v186force=null; return {ks,outs,spread:spread/n,low:low/n,high:high/n}; };
      const N=600;
      const r={ open:run(N,{t:'save',ty:'open',s:0},0.6), tapin:run(N,{t:'save',ty:'tapin',s:0,xg:0.4},0.6,null,95), long:run(N,{t:'save',ty:'long',s:0},0.6), cor:run(N,{t:'save',ty:'open',s:0,cor:1},0.6),
        good:run(N,{t:'save',ty:'open',s:0},0.92), poor:run(N,{t:'save',ty:'open',s:0},0.15), shGood:run(N,{t:'save',ty:'open',s:0},0.6,0.95), shPoor:run(N,{t:'save',ty:'open',s:0},0.6,0.05) };
      const bk=q=>{ const c={}; for(let i=0;i<2000;i++){ const k=v186kBeatKind(q,'goal',{y:35,z:0.5}); c[k]=(c[k]||0)+1; } return c; };
      r.bkPoor=bk(0.15); r.bkGood=bk(0.9); r.wide=(()=>{ const c={}; for(let i=0;i<500;i++){ const k=v186kBeatKind(0.6,'miss',{y:34+5.6,z:0.3}); c[k]=(c[k]||0)+1; } return c; })();
      /* reaction: the kind's start (D.t) after the release, for one flight, by rating */
      const reac=q=>{ let s=0; for(let i=0;i<20;i++){ st._v186force={q,k:'dive',out:'catch'}; const f={t0:st.now,dur:st.D(340)+120,home:gk}; const M=st.v186kMake(gk,sh,'dive',{q,ty:31,z:1,out:'catch',set:{x:103.8,y:34}}); const D=st.v186kArm(gk,sh,M,f,null); s+=D.t-f.t0; gk.dive=null; } st._v186force=null; return s/20; };
      r.reGood=reac(0.92); r.rePoor=reac(0.15); st._v186q=keep; gk.ov=null; gk.yawLockT=0;
      /* the interception lunge (72_tackles): still stamped for an outfield interception, never for a shot into the keeper's hands */
      const ic=(home,hands)=>{ const fl0=st.fl, lp0=st.lastPass, own0=st.own; const t0=home.v18icT; st.own=null; st.lastPass={from:sh,to:home,h:0,fy:sh.y,t:st.now};
        st.fl={from:{x:home.x-6,y:home.y,z:0},home,hands,head:false,to:null,t0:st.now-300,dur:400,h:0.3,kind:hands?'shot':'pass',ground:!hands,cont:false,res:()=>{}};
        st.update(1/120); const got=home.v18icT!==t0&&home.v18icT===st.now; st.fl=fl0; st.lastPass=lp0; st.own=own0; return got; };
      const opp=[...st.players.values()].find(p=>p.side===1&&!p.gk); r.icOut=ic(opp,false); r.icGk=ic(gk,true); return r; });
    const sh=o=>Object.entries(o.ks).map(([k,v])=>k+' '+v).join(', ');
    ok((A.tapin.ks.smother||0)+(A.tapin.ks.scoop||0)+(A.tapin.ks.lowdive||0)>A.tapin.ks.dive*2&&(A.tapin.ks.smother||0)>0, 'tap-ins from close range are mostly smothered or saved low ('+sh(A.tapin)+')');
    ok(A.long.high>A.open.high&&A.long.low<A.open.low, 'long shots come in higher than open-play shots (high '+pct(A.long.high)+' vs '+pct(A.open.high)+', low '+pct(A.long.low)+' vs '+pct(A.open.low)+')');
    ok(Object.keys(A.cor.ks).every(k=>k==='tipOver'||k==='dive'||k==='lowdive')&&Object.keys(A.cor.outs).join()==='corner', 'a save that goes behind is always tipped over or round the post ('+sh(A.cor)+')');
    ok(!A.open.ks.wrong&&!A.open.ks.late&&!A.open.ks.short, 'beaten kinds are never chosen for saves');
    ok(Object.keys(A.open.ks).length>=5, 'open-play saves use at least five kinds ('+sh(A.open)+')');
    const all=new Set([...Object.keys(A.open.ks),...Object.keys(A.tapin.ks),...Object.keys(A.cor.ks),...Object.keys(A.long.ks)]); ok(all.size>=7, 'across shot types all seven save kinds appear ('+[...all].join(', ')+')');
    ok((A.open.ks.high||0)>0&&(A.open.ks.stand||0)>0&&(A.open.ks.scoop||0)>0&&(A.open.ks.lowdive||0)>0&&(A.open.ks.dive||0)>0, 'height and placement pick high / stand / scoop / low dive / dive');
    const cg=(A.good.outs.catch||0)/600, cp=(A.poor.outs.catch||0)/600; ok(cg>=0.65&&cp<=0.45, 'a good keeper catches more, a poor one parries more (catch '+pct(cg)+' at q .92 vs '+pct(cp)+' at q .15)');
    ok(A.shGood.spread>A.shPoor.spread+0.6, 'better shooters place it nearer the corners (mean |y-34| '+A.shGood.spread.toFixed(2)+' vs '+A.shPoor.spread.toFixed(2)+' m)');
    const wp=A.bkPoor.wrong/2000, wg=A.bkGood.wrong/2000; ok(wp>=0.5&&wg<=0.45, 'goals: a poor keeper is wrong-footed more ('+pct(wp)+' at q .15 vs '+pct(wg)+' at q .9)');
    ok((A.wide.watch||0)>=400, 'a miss well wide is watched, not dived at ('+JSON.stringify(A.wide)+')');
    ok(A.icOut&&!A.icGk, 'an outfield interception still lunges, a shot into the keeper\'s hands does not (outfield '+A.icOut+', keeper '+A.icGk+')');
    ok(A.rePoor-A.reGood>=40, 'a good keeper starts his movement earlier after the strike ('+A.reGood.toFixed(0)+' ms vs '+A.rePoor.toFixed(0)+' ms at 1x)');
    await page.close(); }

  /* ---------------- B. forced kinds, 2-D, 1x ---------------- */
  if(SEC.includes('B')){ const page=await open('2d');
    const LIST=[['stand','catch'],['high','catch'],['scoop','catch'],['lowdive','catch'],['dive','catch'],['dive','parry'],['dive','corner'],['tipOver','corner'],['smother','catch'],['lowdive','parry'],['stand','parry'],['smother','parry']];
    const ACT={stand:'gkcatch',high:'gkcatch',scoop:'gkscoop',lowdive:'gklow',dive:'dive',tipOver:'gktip',smother:'gksmother'};
    await start(page,LIST,[0.6],0.85,true); const C=[]; const t0=Date.now();
    while(C.length<LIST.length&&Date.now()-t0<600000){ const p=await page.waitForFunction(()=>window.__pend,null,{timeout:150000}).catch(()=>null); if(!p) break;
      const i=C.length; C.push(await contact(page,OUT+`2d_${String(i).padStart(2,'0')}_${LIST[i][0]}_${LIST[i][1]}.png`)); }
    await page.waitForTimeout(1500);
    const S=await page.evaluate(()=>window.__S), E=await page.evaluate(()=>window.__E.filter(e=>e.t==='save'));
    ok(C.length===LIST.length, 'every forced kind reached contact ('+C.length+'/'+LIST.length+')');
    for(const c of C) ok(c.d<0.35&&c.act===ACT[c.k], `${c.k} (${c.out}): drawn glove ${c.d.toFixed(2)} m from the ball centre at contact, act ${c.act}`);
    ok(C.every(c=>c.act!=='intercept'), 'no save shows the outfield interception lunge');
    const tim=S.map(s=>s.now-s.tP0); ok(S.length>0&&tim.every(d=>d>=-0.01&&d<=40), 'full extension is reached as the ball arrives (contact - arrival '+Math.min(...tim).toFixed(0)+'..'+Math.max(...tim).toFixed(0)+' ms)');
    const em=S.map((s,i)=>{ const e=E[i]; return e? e.now-s.t0-s.dur : null; }); const D0=await page.evaluate(()=>App.labSt.D(340)+120);
    ok(S.every(s=>Math.abs(s.dur-D0)<0.01)&&em.length>0&&em.every(x=>x!=null&&x>=-0.01&&x<=67), 'the flight lasts D(340)+120 as before and each save is announced in the frame the ball arrives (+'+em.map(x=>x==null?'-':x.toFixed(0)).join(',')+' ms)');
    ok(E.length>0&&E.every(e=>e.inHands||e.loose), 'saves are announced with the ball in the gloves or parried loose beside the diving keeper ('+E.map(e=>e.inHands?'H':e.loose?'L':'?').join('')+')');
    ok(S.every(s=>s.minTorso>0.25), 'the ball never goes through the keeper on its way to his gloves (closest to the torso '+Math.min(...S.map(s=>s.minTorso)).toFixed(2)+' m)');
    const X=await page.evaluate(()=>window.__X); ok(X.every(x=>Math.abs(x.y-34)>3.66+0.11||x.z>2.44), 'every deflection crosses the goal line outside the frame ('+X.map(x=>'y '+x.y+' z '+x.z).join('; ')+')');
    const zs=C.map(c=>c.z); ok(Math.min(...zs)<0.4&&Math.max(...zs)>1.7, 'contact heights range from the turf to above the head ('+Math.min(...zs).toFixed(2)+'..'+Math.max(...zs).toFixed(2)+' m)');
    await page.close(); }

  /* ---------------- C. natural saves, 2-D, 4x ---------------- */
  if(SEC.includes('C')){ const page=await open('2d');
    await page.evaluate(()=>{ window.__v186labIdle=1; }); await start(page,[['stand','catch']],[0.6],0.22,false);
    /* the in-page loop above only defines; run the saves in small batches so a slow machine cannot hang one evaluate */
    const runQ=async(q,n)=>{ const R=[]; for(let i=0;i<n;i++){ const r=await page.evaluate(async([q,i])=>{ const st=App.labSt; const fw=[...st.players.values()].filter(p=>p.side===0)[9]; const T=['open','open','long','header','cross','solo','tapin','fk','break'];
        st._v186q=q; st._v186force=null; await st.gain(fw); fw.x=84; fw.y=28+Math.random()*12; const ty=T[i%T.length]; const n0=V186K.log.length; const s0=window.__S.length;
        await st.shotSeq({s:0,pid:fw.pid,t:'save',ty,x:25+Math.random()*30,y:ty==='tapin'||ty==='break'?93:ty==='long'?72:80+Math.random()*8,cor:Math.random()<0.25?1:0,xg:ty==='tapin'||ty==='break'?0.4:0.1});
        const L=V186K.log.slice(n0).find(x=>x.pid&&x.pid[0]==='L'); const S=window.__S[s0]; await st.wait(st.D(200)); return L?{q,k:L.k,set:L.act0==='gkset',spd:L.spd,bz:S?S.bz:null,smo:L.k==='smother'}:null; },[q,i]).catch(e=>({err:String(e)})); if(r) R.push(r); } return R; };
    await page.evaluate(()=>{ window.__v186labIdle=1; }); await page.waitForTimeout(1500);
    const nat=await runQ(0.6,36); const ks={}; nat.forEach(r=>{ if(r.k) ks[r.k]=(ks[r.k]||0)+1; }); const n=nat.filter(r=>r.k).length;
    ok(n>=24, 'natural saves ran ('+n+')'+(nat.find(r=>r.err)?' '+nat.find(r=>r.err).err:''));
    ok(Object.keys(ks).length>=5&&Math.max(...Object.values(ks))/n<=0.5, 'natural saves use at least five kinds, none above half ('+Object.entries(ks).map(([k,v])=>k+' '+v).join(', ')+')');
    ok(!ks.wrong&&!ks.late&&!ks.short, 'no beaten dive on a save');
    const zs=nat.map(r=>r.bz).filter(z=>z!=null).sort((a,b)=>a-b); const p10=zs[Math.floor(zs.length*0.1)], p90=zs[Math.floor(zs.length*0.9)];
    ok(zs.length>10&&p10<0.4&&p90>1.5, 'contact heights spread (p10 '+(p10||0).toFixed(2)+' m, p90 '+(p90||0).toFixed(2)+' m)');
    const good=await runQ(0.92,12), poor=await runQ(0.15,12); const G2=good.filter(r=>r.k&&!r.smo), P2=poor.filter(r=>r.k&&!r.smo); const sg=G2.filter(r=>r.set).length/Math.max(1,G2.length), sp=P2.filter(r=>r.set).length/Math.max(1,P2.length);
    ok(sg>=0.7&&sp<=0.4, 'a good keeper is set when it is struck, a poor one is still moving ('+pct(sg)+' at q .92 vs '+pct(sp)+' at q .15)');
    await page.close(); }

  /* ---------------- D. goals and misses ---------------- */
  if(SEC.includes('D')){ const page=await open('2d');
    const LIST=[['goal','wrong'],['goal','short'],['goal','late'],['goal','wrong'],['miss','watch'],['goal','short']];
    await start(page,LIST,[0.4],0.85,false); const t0=Date.now();
    await page.evaluate(()=>{ const st=App.labSt; window.__G=[]; const L0=st.launch; st.launch=function(p,o){ const r=L0.apply(this,arguments); if(p&&o&&o.kind==='shot'&&o.to&&!o.home){ window.__mh=null; window.__mt=null; const self=this; r.then(()=>{ const g=self.gkOf(1); window.__G.push({k:g&&g.dive&&g.dive.k,mt:window.__mt,mh:window.__mh}); }); } return r; }; });
    await page.waitForFunction(n=>window.__G&&window.__G.length>=n,LIST.length,{timeout:420000}).catch(()=>{});
    const G=await page.evaluate(()=>window.__G); const evs=await page.evaluate(()=>window.__E);
    ok(G.length>=LIST.length, 'goals and misses ran ('+G.length+')');
    ok(G.slice(0,LIST.length).every((g,i)=>g.k===LIST[i][1]), 'beaten kinds and the watch are shown ('+G.map(g=>g.k).join(',')+')');
    ok(G.every(g=>g.mt==null||g.mt>0.3), 'the ball never passes through the keeper (closest to his torso '+Math.min(...G.map(g=>g.mt==null?9:g.mt)).toFixed(2)+' m)');
    ok(G.every(g=>g.mh==null||g.mh>0.12), 'nor through his gloves (closest '+Math.min(...G.map(g=>g.mh==null?9:g.mh)).toFixed(2)+' m)');
    await page.screenshot({path:OUT+'2d_goal_after.png'});
    await page.close(); }

  /* ---------------- E. 3-D contact ---------------- */
  if(SEC.includes('E')){ const page=await open('3d',{width:560,height:350});
    const LIST=[['stand','catch'],['dive','catch'],['tipOver','corner']];
    await page.evaluate(()=>{ const F0=window.v18FigDraw; window.v18FigDraw=function(P,st,p){ const r=F0.apply(this,arguments); if(p&&p.gk&&p.dive&&p.dive.k&&P&&P._fig) window.__w3=Array.from(P._fig.s.slice(0,45)); return r; }; });
    await start(page,LIST,[0.6],0.22,true); const C=[]; const t0=Date.now();
    while(C.length<LIST.length&&Date.now()-t0<1200000){ const p=await page.waitForFunction(()=>window.__pend,null,{timeout:400000}).catch(()=>null); if(!p) break;
      await page.evaluate(()=>{ window.__w3=null; }); await page.waitForFunction(()=>window.__w3,null,{timeout:60000}).catch(()=>{});
      const i=C.length; C.push(await contact(page,OUT+`3d_${String(i).padStart(2,'0')}_${LIST[i][0]}.png`)); }
    ok(C.length===LIST.length, '3-D: every kind reached contact ('+C.length+'/'+LIST.length+')');
    for(const c of C) ok(c.d3!=null&&c.d3<0.4&&c.d<0.4, `3-D ${c.k}: drawn 3-D glove ${c.d3==null?'none':c.d3.toFixed(2)} m from the ball centre (solve ${c.d.toFixed(2)} m)`);
    await page.close(); }

  /* ---------------- F. reduced motion ---------------- */
  if(SEC.includes('F')){ const page=await open('2d',null,true);
    await start(page,[['dive','catch'],['stand','parry']],[0.3],0.45,false);
    const done=await page.waitForFunction(()=>window.__S&&window.__S.length>=2,null,{timeout:180000}).then(()=>true).catch(()=>false);
    ok(done&&await page.evaluate(()=>App.labSt.rm===true||matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced motion: saves still play through');
    await page.close(); }

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
