// v18.7 more goalkeeper actions (src/v17/85_keeper.js): kick saves, reaction saves, the one-on-one star (and star blocks),
// high claims and punches from corners, overarm throws and roll-outs after a catch.
// A. 2-D lab 'keeper2', every action forced: it happens; at contact the drawn glove / fist / boot is close to the ball centre;
//    the ball never passes through his torso on the way in; a punch sends the ball out of the box; a claim ends with the ball
//    held; throws and rolls leave from the throwing hand and reach the receiver; the save is announced one flight after the strike.
// B. 3-D lab: the drawn 3-D glove / fist / boot is close to the ball centre at contact (kick, react, claim, punch).
// C. live match (2-D, 2x): the new actions show up on their own; every engine event of the match is emitted by the stage, once,
//    in the engine's order (none dropped to the end-of-minute flush), the final score is the engine's; no page errors.
// Usage: node test/keeper2.js [sections, default ABC]   (close-up frames in test/shots/v187/keeper2/)
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const OUT='test/shots/v187/keeper2/'; fs.mkdirSync(OUT,{recursive:true});
const SEC=(process.argv[2]||'ABC').toUpperCase();
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  const errs=[];
  const open=async(mode,vp)=>{ const page=await browser.newPage({viewport:vp||{width:1100,height:640}});
    page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1])); await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
    await page.evaluate(m=>{ try{ PREFS.renderer=m; PREFS.plates=false; }catch(e){} },mode); return page; };
  /* the lab scene with hooks: pause at each keeper contact (and at each throw/roll release), measure, resume */
  const start=async(page,list,qs,ts)=>{ await page.evaluate(([list,qs,ts])=>{ window.__v187lab=list; window.__v187labQ=qs; App.labTs=ts; V187K.log=[]; window.__C=[]; window.__T=[]; window.__E=[]; window.__pend=0; labRun('keeper2'); },[list,qs,ts]);
    await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0&&App.labSt._v187kLab,null,{timeout:60000});
    await page.evaluate(()=>{ const c=document.querySelector('#anim-lab .lab-cv'); if(c) c.scrollIntoView({block:'center'}); });
    await page.evaluate(()=>{ const st=App.labSt; st.ts=App.labTs; st.goalTs=App.labTs;
      const E0=st.emit; st.emit=function(e){ const g=this.gkOf(1); window.__E.push({t:e.t,now:this.now,how:e._how,k7:e._v187k||null,inHands:!!(this.own&&this.own.gk&&this.hands),rel:window.__rel}); return E0.apply(this,arguments); };
      const mine=D=>D&&D.k&&V187K_MINE[D.k];
      const L0=st.land; st.land=function(){ const f=this.fl; const g=f&&!f.phys&&f.home&&f.home.gk&&f.hands?f.home:null; const r=L0.apply(this,arguments);
        if(g&&mine(g.dive)){ window.__cur={k:g.dive.k,lim:g.dive.lim,out:g.dive.out,star:!!g.dive.v187s,dur:f.dur,t0:f.t0,now:this.now,gap:window.__gap==null?9:window.__gap}; window.__gap=null; this.paused=true; window.__pend='c'; }
        const dl=this.lastDist; if(f&&!f.phys&&dl&&f.home===dl.to&&f.t0>=dl.t){ window.__T.push({k:dl.k,reached:this.own===dl.to,from:window.__rf,d:dl.d}); this.lastDist=null; }
        return r; };
      let lastFl=null; const U0=st.update; st.update=function(dt){ const r=U0.apply(this,arguments); const f=this.fl, g=this.gkOf(1);
        if(f&&f!==lastFl){ lastFl=f; if(!f.phys&&f.kind==='shot') window.__rel=f.t0;
          const dl=this.lastDist; if(!f.phys&&dl&&f.home===dl.to&&f.t0>=dl.t&&g){ const is3=v186kIs3D(this), P=g._pose, R=v186kBR(this), H=v186kHand(g,P,1,is3), b=f.from; window.__rf={dh:Math.hypot(H.x-b.x,H.y-b.y,H.z-(b.z+R)),z:b.z,act:g._act}; this.paused=true; window.__pend='t'; } }
        /* the ball on its way in never passes through his torso (or head) */
        if(g&&mine(g.dive)&&f&&!f.phys&&(f.home===g||f.kind==='shot')&&this.now>=g.dive.t){ const u=(this.now-f.t0)/f.dur; if(u<0.9&&g._pose){ const is3=v186kIs3D(this), R=v186kBR(this), b=this.ball, c={x:b.x,y:b.y,z:b.z+R}; const S=v186kSegs(g,g._pose,is3); const [a,bb,th]=S[S.length-1]; const gap=v186kSegD(c,a,bb)-th-R; window.__gap=Math.min(window.__gap==null?9:window.__gap,gap); } }
        return r; }; }); };
  const measure=async(page,shot)=>{ await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const R=await page.evaluate(()=>{ const st=App.labSt, g=st.gkOf(1), D=g.dive, P=g._pose, is3=v186kIs3D(st), Rb=v186kBR(st), b=st.ball, c={x:b.x,y:b.y,z:b.z+Rb}; const lim=D?D.lim:2;
      const pts=lim===2||lim===5?[v186kHand(g,P,0,is3),v186kHand(g,P,1,is3)]:lim>=3?[v187kFoot(g,P,lim-3,is3)]:[v186kHand(g,P,lim,is3)];
      const d=Math.min(...pts.map(h=>Math.hypot(h.x-c.x,h.y-c.y,h.z-c.z))); const W=window.__w3; let d3=null;
      if(W){ const H=lim>=3&&lim<=4?[[W[6],W[8],W[7]],[W[15],W[17],W[16]]][lim-3]:null; const HS=[[W[24],W[26],W[25]],[W[33],W[35],W[34]]]; const pp=H?[H]:lim===2||lim===5?HS:[HS[lim]]; d3=Math.min(...pp.map(h=>Math.hypot(h[0]-c.x,h[1]-c.y,h[2]-c.z))); }
      const cv=st.cv.getBoundingClientRect(); const [x,y,k]=st.proj(g.x,g.y,0); return {...window.__cur,d,d3,act:g._act,z:+c.z.toFixed(2),x:cv.left+x,y:cv.top+y,kk:k,cl:cv.left,ct:cv.top,W:cv.width,H:cv.height,is3}; });
    if(shot&&R.is3) await page.screenshot({path:shot}).catch(()=>{});
    else if(shot){ const w=Math.min(R.W,Math.max(240,R.kk*6)), h=Math.min(R.H,Math.max(180,R.kk*4.2)); await page.screenshot({path:shot,clip:{x:Math.max(R.cl,R.x-w/2),y:Math.max(R.ct,R.y-h*0.78),width:w,height:h}}).catch(()=>{}); }
    await page.evaluate(()=>{ window.__pend=0; App.labSt.paused=false; }); return R; };
  const TH={hand:0.35,fist:0.4,foot:0.42};
  const lim2txt=l=>l>=3&&l<=4?'boot':l===5?'fists':l===2?'gloves':'glove';

  /* ---------------- A. 2-D lab ---------------- */
  if(SEC.includes('A')){ const page=await open('2d');
    const LIST=['kick','react','star','claim','punch','punch1','throw','roll','starGoal'];
    await start(page,LIST,[0.85,0.3],0.85); const C=[]; const t0=Date.now(); let nShot=0;
    while(Date.now()-t0<300000){ const w=await page.waitForFunction(()=>window.__pend,null,{timeout:120000}).then(h=>h.jsonValue()).catch(()=>null); if(!w) break;
      if(w==='t'){ await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); const T=await page.evaluate(()=>App.labSt.lastDist&&App.labSt.lastDist.k); await page.screenshot({path:OUT+`2d_rel_${T}_${nShot++}.png`,clip:await page.evaluate(()=>{ const st=App.labSt, g=st.gkOf(1), cv=st.cv.getBoundingClientRect(); const [x,y,k]=st.proj(g.x,g.y,0); const w=Math.max(240,k*6), h=Math.max(180,k*4.2); return {x:Math.max(cv.left,cv.left+x-w/2),y:Math.max(cv.top,cv.top+y-h*0.78),width:w,height:h}; })}).catch(()=>{}); await page.evaluate(()=>{ window.__pend=0; App.labSt.paused=false; }); continue; }
      const R=await measure(page,OUT+`2d_${String(C.length).padStart(2,'0')}_${await page.evaluate(()=>window.__cur&&window.__cur.k)}.png`); C.push(R);
      const done=await page.evaluate(()=>{ const T=window.__T, L=V187K.log; return T.some(x=>x.k==='throw')&&T.some(x=>x.k==='roll')&&L.some(x=>x.k==='starPre')&&window.__E.filter(e=>e.t==='goal').length>=1; });
      const kinds=new Set(C.map(c=>c.k+(c.k==='punch'?c.lim:''))); if(done&&kinds.size>=7&&C.length>=LIST.length+4) break; }
    await page.evaluate(()=>{ window.__v187labIdle=1; });
    const X=await page.evaluate(()=>({T:window.__T,E:window.__E,L:V187K.log.slice(-400)}));
    const has=k=>C.filter(c=>c.k===k);
    for(const k of ['kick','react','star','claim','punch']) ok(has(k).length>0, `2-D: the ${k} happens in the lab (${has(k).length})`);
    ok(C.some(c=>c.k==='punch'&&c.lim===5)&&C.some(c=>c.k==='punch'&&c.lim<2), '2-D: both a two-fisted and a one-fisted punch');
    for(const c of C){ const th=c.lim>=3&&c.lim<=4?TH.foot:c.lim===5?TH.fist:TH.hand; ok(c.d<th, `2-D ${c.k}: drawn ${lim2txt(c.lim)} ${c.d.toFixed(2)} m from the ball centre at contact (< ${th}; act ${c.act}, ball centre z ${c.z})`); }
    for(const c of C) ok(c.gap>-0.03, `2-D ${c.k}: the ball never goes through his body on the way in (closest torso gap ${c.gap.toFixed(2)} m)`);
    ok(C.every(c=>c.act==='gk'+c.k||c.k==='star'&&c.act==='gkstar'), '2-D: the drawn act is the kind\'s own at contact ('+[...new Set(C.map(c=>c.k+':'+c.act))].join(', ')+')');
    const po=X.L.filter(x=>x.k==='punchOut'); ok(po.length>0&&po.every(x=>Math.abs(x.to.x-(105))>15), 'punches go out of the box ('+po.map(x=>(105-x.to.x).toFixed(0)+' m').join(', ')+')');
    const claims=X.E.length; ok(X.L.some(x=>x.k==='claim'), 'a claim is staged from a corner');
    const thr=X.T.filter(t=>t.k==='throw'), rol=X.T.filter(t=>t.k==='roll');
    ok(thr.length>0&&thr.every(t=>t.reached), `throws reach the receiver (${thr.filter(t=>t.reached).length}/${thr.length})`);
    ok(rol.length>0&&rol.every(t=>t.reached), `rolls reach the receiver (${rol.filter(t=>t.reached).length}/${rol.length})`);
    ok(X.T.every(t=>t.from&&t.from.dh<0.4), 'throws and rolls leave from the throwing hand ('+X.T.map(t=>t.k+' '+(t.from?t.from.dh.toFixed(2):'?')).join(', ')+')');
    ok(thr.every(t=>t.from&&t.from.z>1.5)&&rol.every(t=>t.from&&t.from.z<0.3), 'the throw is released overhead, the roll at the turf ('+X.T.map(t=>t.k+' z '+(t.from?t.from.z.toFixed(2):'?')).join(', ')+')');
    ok(X.L.some(x=>x.k==='starPre')&&X.L.some(x=>x.arm&&x.star), 'one-on-ones: he spreads in the star before the shot and the next action starts from it');
    const sv=X.E.filter(e=>e.t==='save'&&e.k7&&e.rel!=null); const tim=sv.map(e=>{ const c=C.find(c=>c.t0===e.rel); return c?e.now-(c.t0+c.dur):null; }).filter(x=>x!=null);
    ok(tim.length>0&&tim.every(x=>x>=-1&&x<70), 'saves are announced at contact, one flight after the strike, within a frame ('+tim.map(x=>x.toFixed(0)).join(', ')+' ms after arrival)');
    ok(sv.every(e=>e.inHands||e.how!=='catch'), 'a caught save is announced with the ball in his hands');
    ok(X.E.filter(e=>e.t==='save'&&e.k7).every(e=>e.how===e.k7||e.how==='tip'), 'the commentary tag names the new save ('+[...new Set(X.E.filter(e=>e.k7).map(e=>e.k7+':'+e.how))].join(', ')+')');
    await page.close(); }

  /* ---------------- B. 3-D lab ---------------- */
  if(SEC.includes('B')){ const page=await open('3d',{width:560,height:350});
    const LIST=['kick','react','claim','punch'];
    await page.evaluate(()=>{ const F0=window.v18FigDraw; window.v18FigDraw=function(P,st,p){ const r=F0.apply(this,arguments); if(p&&p.gk&&p.dive&&p.dive.k&&P&&P._fig) window.__w3=Array.from(P._fig.s.slice(0,45)); return r; }; });
    await start(page,LIST,[0.85],0.3); const C=[]; const t0=Date.now();
    while(C.length<LIST.length&&Date.now()-t0<480000){ const w=await page.waitForFunction(()=>window.__pend,null,{timeout:300000}).then(h=>h.jsonValue()).catch(()=>null); if(!w) break;
      if(w==='t'){ await page.evaluate(()=>{ window.__pend=0; App.labSt.paused=false; }); continue; }
      await page.evaluate(()=>{ window.__w3=null; }); await page.waitForFunction(()=>window.__w3,null,{timeout:60000}).catch(()=>{});
      C.push(await measure(page,OUT+`3d_${String(C.length).padStart(2,'0')}_${await page.evaluate(()=>window.__cur&&window.__cur.k)}.png`)); }
    await page.evaluate(()=>{ window.__v187labIdle=1; });
    ok(C.length===LIST.length, '3-D: every kind reached contact ('+C.length+'/'+LIST.length+')');
    for(const c of C){ const th=c.lim>=3&&c.lim<=4?TH.foot:0.4; ok(c.d3!=null&&c.d3<th&&c.d<th, `3-D ${c.k}: drawn 3-D ${lim2txt(c.lim)} ${c.d3==null?'none':c.d3.toFixed(2)} m from the ball centre (solve ${c.d.toFixed(2)} m)`); }
    await page.close(); }

  /* ---------------- C. live match ---------------- */
  if(SEC.includes('C')){ const page=await browser.newPage({viewport:{width:1100,height:700}}); page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
    await page.goto(DIST); await page.waitForTimeout(500);
    await page.evaluate(()=>{ try{ PREFS.renderer='2d'; }catch(e){} });
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Keeper Coach'); await page.fill('#nc-seed','keeper187');
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    await page.evaluate(()=>{ V187K.log=[]; const A=window.__lv={outs:[],em:[],flushed:0,saves:[]};
      const S0=window.stepMatch; window.stepMatch=function(){ const out=S0.apply(this,arguments); A.outs.push(...out); return out; };
      let fl=false; const FP=window.flushPending; window.flushPending=function(){ fl=true; try{ return FP.apply(this,arguments); } finally{ fl=false; } };
      const E0=window.liveEmit; window.liveEmit=function(e){ const L=App.live, P=L&&L.pending; const dup=P&&P.done.has(e); if(!dup){ A.em.push(e); if(fl) A.flushed++; if(fl&&['goal','save','miss'].includes(e.t)) A.flushedShot=(A.flushedShot||0)+1; const st=L&&L.stage; if(st&&e.t==='save') A.saves.push({inHands:!!(st.own&&st.own.gk&&st.hands),loose:!!(st.fl&&st.fl.phys),k:e._v186k,k7:e._v187k||null}); } return E0.apply(this,arguments); }; });
    await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
    await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
    const t0=Date.now(); while(Date.now()-t0<420000){ if(await page.$('#lv-ht .htbox')) await page.click('#ht-go').catch(()=>{}); if(await page.$('#lv-cont')) break; await page.waitForTimeout(400); }
    const R=await page.evaluate(()=>{ const A=window.__lv, L=V187K.log; const key=e=>e.t+'|'+(e.pid||'')+'|'+(e.m!=null?e.m:'');
      const outs=A.outs, em=A.em, eset=new Set(em); const shotT=e=>['goal','save','miss'].includes(e.t); const so=outs.filter(shotT), se=em.filter(shotT);
      let same=em.length===eset.size&&outs.every(e=>eset.has(e))&&em.every(e=>outs.includes(e))&&so.length===se.length&&so.every((e,i)=>se[i]===e);
      const firstDiff=(()=>{ for(let i=0;i<Math.max(so.length,se.length);i++) if(so[i]!==se[i]) return [so[i]&&key(so[i]),se[i]&&key(se[i])]; const miss=outs.find(e=>!eset.has(e)); return miss?['missing',key(miss)]:null; })();
      const kinds={}; for(const x of L){ const k=x.arm||(x.k&&['claim','punch','throw','roll','starPre'].includes(x.k)?x.k:null); if(k) kinds[k]=(kinds[k]||0)+1; }
      return {same,nOut:outs.length,nEm:em.length,nShot:so.length,firstDiff,flushedShot:A.flushedShot||0,kinds,saves:A.saves,score:App.live&&App.live.view.sc,engine:App.live&&App.live.M.sc,done:!!(App.live&&App.live.done)}; });
    console.log('live sample:',JSON.stringify(R.kinds),'saves',R.saves.length,'score',JSON.stringify(R.score));
    ok(R.done, 'live: the match ran to full time');
    ok(R.same, `live: every engine event is emitted once and the ${R.nShot} goals, saves and misses in the engine's order (${R.nEm}/${R.nOut}${R.firstDiff?' first diff '+JSON.stringify(R.firstDiff):''})`);
    ok(R.flushedShot===0, 'live: no goal, save or miss left to the end-of-minute flush ('+R.flushedShot+')');
    ok(JSON.stringify(R.score)===JSON.stringify(R.engine), 'live: the score shown is the engine\'s');
    ok(R.saves.every(s=>s.inHands||s.loose), 'live: every save is announced with the ball in his hands or parried loose');
    const n=Object.keys(R.kinds).length; ok(n>=1, `live: the new actions happen on their own (${n} kinds: ${JSON.stringify(R.kinds)})`);
    await page.close(); }

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
