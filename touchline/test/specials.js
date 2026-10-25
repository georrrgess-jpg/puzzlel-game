// Rare special kicks (v18.6 B2, src/v17/82_specials.js): forced bicycle and scissor kicks in the lab (2-D and 3-D) and in a
// live match; the kicking foot meets the ball when it leaves the boot (2-D screen and 3-D world), the cross arrives at the
// contact height, the body is horizontal (bike) / rolled (scissor) at contact, he lands and gets up before the celebration;
// event timing and results unchanged; the unforced rate over many seeds (v18.8: about 10-28 % of V/JV cross goals), never at
// Modified, deterministic; gating (reduced motion, skipping, 8x); the 2-D replay shows the move; no page errors.
// Usage: node test/specials.js [lab|lab3d|live|rate|all]   (default all). Screenshots: test/shots/v186/specials/
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SH='test/shots/v186/specials/'; fs.mkdirSync(SH,{recursive:true});
const only=process.argv[2]||'all'; const want=k=>only==='all'||only===k;
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* in-page instrumentation of one lab stage: per-step orientation, the cross landing, the release, the get-up, the emit */
const INSTR=()=>{ const st=App.labSt; const X=window.__sx={rows:[],land:[],rel:[],clear:[],emit:[],cross:[],shots:0,pause:[],paused:null,errs:[]};
  const U=st.update; let had=null, lastK=null, landed=null;
  /* the frame interval: a release or an emit lands on the first frame after its step, as every stage wait does */
  X.fr=[]; let lf=performance.now(); const fl=()=>{ const t=performance.now(); X.fr.push(Math.min(67,t-lf)); if(X.fr.length>90) X.fr.shift(); lf=t; if(App.labSt===st) requestAnimationFrame(fl); }; requestAnimationFrame(fl);
  st.update=function(dt){ const r=U.call(this,dt); try{ const K=this._v186x, p=K&&K.pl;
    if(p&&p.v186xk&&p.v186xc!=null){ had=p; lastK=K; const P=this.poseOf(p); const T=v186xDur(p.v186xk,p.v186xts); const tau=v186xTau(this,p);
      const ph=tau<-T.to?'set':tau<-T.st?'to':tau<0?'st':tau<T.fall?'fall':tau<T.fall+T.lie?'lie':'up'; X.rows.push({k:p.v186xk,tau,ph,th:P.pitchB||0,ra:P.rollB||0,lift:P.lift||0,act:P.act,hipU:P.hipU,x:p.x,y:p.y,yaw:p.yaw,celeb:!!p.celeb,v:Math.hypot(p.vx||0,p.vy||0),vh:Math.atan2(p.vy||0,p.vx||0),sm:this.spd(),inSet:tau>=-T.set});
      if(this.headBall===p&&landed!==p.v186xc){ landed=p.v186xc; const c=this.v186xContact(p); const {R}=v186xScale(this,p); X.land.push({k:p.v186xk,dt:this.now-p.v186xc,bz:this.ball.z+R,cz:c.z+R,d:Math.hypot(this.ball.x-c.x,this.ball.y-c.y,this.ball.z-c.z)}); }
      if(X.pause.length&&tau>=X.pause[0].tau&&!X.paused){ X.paused=X.pause.shift().name; this.paused=true; } }
    if(K&&this.fl&&!this.fl.phys&&this.fl.home===K.pl&&this.fl!==X._fl){ X._fl=this.fl; K.crossRel=this.fl.t0; K.crossDur=this.fl.dur; }
    if(!(p&&p.v186xk&&p.v186xc!=null)&&had&&!had.v186xk){ const P=this.poseOf(had); X.clear.push({now:this.now,act:P.act,rot:P.rot||0,lift:P.lift||0,th:P.pitchB||0,ra:P.rollB||0,celeb:!!had.celeb,rel:lastK&&lastK.rel}); had=null; } }catch(e){ X.errs.push(String(e&&e.stack||e)); } return r; };
  const R0=st.v186xRelease; st.v186xRelease=function(p,K){ const r=R0.call(this,p,K); try{ const P=this.poseOf(p); const kf=p.v186xf===1?1:0; const f=v186xFootW(this,p,P,kf); const {R,d3}=v186xScale(this,p); const b=this.ball;
      const d=Math.hypot(f.x-b.x,f.y-b.y,f.z-(b.z+R));
      /* 2-D: the drawn ankle on screen against the drawn ball centre, in metres at the player's depth */
      let d2=null; if(!d3){ const [x,y,k]=this.proj(p.x,p.y); const s=k*((p.hgt||70)/70)*1.06; const yaw=p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw); const DEP=this.depthK!=null?this.depthK:clamp((this.H*0.705/68)/Math.max(1,k),0.12,0.45);
        const pr=([F,U2,L])=>[(F*ca-L*sa)*s,-U2*s+(F*sa+L*ca)*s*DEP]; const sd=kf?1:-1; const B=({lean:.9,average:1,stocky:1.14})[(p.look&&p.look.build)||'average']||1; const ft=P.feet[kf];
        const J=ik3([0,P.hipU,sd*0.09*B],[ft.f,ft.u+0.06,ft.l],0.43,0.43,[1,0.05,sd*0.12]); const q=pr(J.t); const rel=[q[0],q[1]+P.pivot*s]; const c=Math.cos(P.rot||0), sn=Math.sin(P.rot||0);
        const ax=x+rel[0]*c-rel[1]*sn, ay=y-P.lift*s-P.pivot*s+rel[0]*sn+rel[1]*c; const kb=this.proj(b.x,b.y,0)[2]; const rr=Math.max(3.2,BALL_R*kb); const bp=this.proj(b.x,b.y,b.z); d2=Math.hypot(ax-bp[0],ay-(bp[1]-rr))/k;
        /* the name plate's anchor (77, as drawn this frame) against the top of the ball */
        if(typeof v185PlAnchor==='function'){ const sv=[p._pose,p._poseT]; p._pose=P; p._poseT=this.now; const out={}; try{ v185PlAnchor(this,{},null,p,out); } finally{ p._pose=sv[0]; p._poseT=sv[1]; } X.plate=X.plate||[]; X.plate.push({y:out.y,ballTop:bp[1]-2*rr,ank:ay,s:k}); } }
      const {S}=v186xScale(this,p); const hd=v186xFwd(0.02,1.83,0,P.pitchB||0,P.rollB||0,P.lift||0,P.pivot||0), hp=v186xFwd(0,0.8,0,P.pitchB||0,P.rollB||0,P.lift||0,P.pivot||0);
      X.rel.push({k:p.v186xk,d,d2,d3,th:P.pitchB||0,ra:P.rollB||0,fz:f.z,headH:hd[2]*S,hipH:hp[2]*S,bz:b.z+R,ty:this.fl&&this.fl.kind,from:this.fl&&this.fl.from&&this.fl.from.z,now:this.now,tc:p.v186xc,cross:K.crossT,crossDur:K.crossDur}); }catch(e){ X.errs.push(String(e&&e.stack||e)); } return r; };
  /* 3-D: the scorer's figure is drawn through the special, and its solved head sits level with the hips at contact (bike) */
  if(typeof v18FigDraw==='function'&&!window.__v186xFig){ window.__v186xFig=1; const F0=v18FigDraw; v18FigDraw=function(P,st2,p){ const r=F0.apply(this,arguments); try{ const S2=window.__sx; if(S2&&p&&p.v186xk&&p.v186xc!=null&&st2===App.labSt){ S2.fig=(S2.fig||0)+(r?1:0); S2.figN=(S2.figN||0)+1;
    if(r&&P._fig&&!(p.v186xr>=0)&&st2.now>=p.v186xc){ const W=P._fig.s; S2.fig3={k:p.v186xk,head:W[43],pelvis:W[37]}; } } }catch(e){} return r; }; }
  const L0=st.launch; st.launch=function(p,o){ if(p&&o&&o.kind==='shot') X.shots++; return L0.call(this,p,o); };
  const E0=st.emit; st.emit=function(e){ const K=this._v186x; X.emit.push({t:e.t,ty:e.ty,now:this.now,inNet:!!this.inNet,over:Math.abs(this.ball.x-52.5)>52.5,crossT:K&&K.crossRel,crossDur:K&&K.crossDur,crossTs:K&&K.ts,rel:K&&K.rel,ts:this.ts,kind:K&&K.kind,fmax:Math.max(8.34,...X.fr)}); return E0.call(this,e); };
};

async function labRun(page,scen,three,shots){ await page.evaluate(([s,t])=>{ PREFS.renderer=t?'3d':'2d'; labRun(s); },[scen,three]);
  await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:20000}); await page.evaluate(INSTR); }

async function labSuite(browser,three){ const tag=three?'3d':'2d';
  const page=await browser.newPage({viewport:{width:1100,height:680}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  for(const scen of ['bike','scissor']){
    await labRun(page,scen,three);
    /* slow motion and close: pause at six phases for the pose sheet */
    await page.evaluate(()=>{ const st=App.labSt; st.ts=3.4; st.goalTs=3.4; const T=v186xDur('bike',3.4); window.__sx.pause=[]; });
    const names=three?['takeoff','air','contact','lie','getup']:['set','takeoff','air','contact','fall','lie','getup']; const sts=three?0.85:3.4;
    if(three) await page.evaluate(()=>{ const st=App.labSt; st.ts=0.85; st.goalTs=0.85; });
    await page.evaluate(([sc,ts,nm])=>{ const T=v186xDur(sc,ts); window.__sx.pause=[{name:'set',tau:-T.to-T.st*0.6},{name:'takeoff',tau:-T.to*0.55},{name:'air',tau:-T.st*0.45},{name:'contact',tau:0},{name:'fall',tau:T.fall*0.55},{name:'lie',tau:T.fall+T.lie*0.5},{name:'getup',tau:T.fall+T.lie+T.up*0.55}].filter(q=>nm.includes(q.name)); },[scen,sts,names]);
    const t0=Date.now(); let n=0;
    while(Date.now()-t0<(three?240000:90000)&&n<names.length){ const s=await page.evaluate(()=>window.__sx.paused); if(s){
        await page.evaluate(z=>{ const st=App.labSt, p=st._v186x&&st._v186x.pl; if(p){ st.focus=p; st.zoomTo(z); st.cam.w=st.cam.tw; st.cam.x=p.x; } },three?0.14:0.3);
        await sleep(three?2500:350); await page.screenshot({path:`${SH}${tag}_${scen}_${n}_${s}.png`}); n++; await page.evaluate(()=>{ window.__sx.paused=null; App.labSt.paused=false; }); } else await sleep(60); }
    ok(n===names.length, `${tag} ${scen}: paused at all ${names.length} phases for the pose sheet (${n})`);
    /* then at normal lab speed: the measurements */
    await page.waitForFunction(()=>window.__sx.emit.length>=1,null,{timeout:three?240000:60000}).catch(()=>{});
    await page.evaluate(()=>{ const st=App.labSt; st.ts=0.85; st.goalTs=0.85; st.focus=null; });
    await page.waitForFunction(()=>window.__sx.clear.length>=1,null,{timeout:three?240000:60000}).catch(()=>{});
    const loops=three?1:2; await page.waitForFunction(n=>window.__sx.emit.length>=n&&window.__sx.clear.length>=n,loops,{timeout:three?300000:90000}).catch(()=>{});
    const X=await page.evaluate(()=>{ const X=window.__sx; const ad=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)); const setR=X.rows.filter(r=>r.ph==='set'); const ends=[]; for(let i=0;i<X.rows.length-1;i++) if(X.rows[i].ph==='set'&&X.rows[i+1].ph!=='set') ends.push(X.rows[i].v/X.rows[i].sm);
      const crab=Math.max(0,...setR.filter(r=>r.inSet&&r.v>0.5*r.sm).map(r=>Math.abs(ad(r.yaw,r.vh))));
      return {rel:X.rel,land:X.land,clear:X.clear,emit:X.emit,errs:X.errs,fig:X.fig,figN:X.figN,fig3:X.fig3,rows:X.rows.filter((r,i)=>i%3===0),ends,crab,plate:X.plate||[]}; });
    console.log(tag,scen,JSON.stringify({rel:X.rel.map(r=>({d:+r.d.toFixed(3),d2:r.d2==null?null:+r.d2.toFixed(3),th:+r.th.toFixed(2),ra:+r.ra.toFixed(2),fz:+r.fz.toFixed(2)})),land:X.land.map(l=>({dt:+l.dt.toFixed(0),bz:+l.bz.toFixed(2),d:+l.d.toFixed(3)})),clear:X.clear,emit:X.emit.map(e=>({ty:e.ty,inNet:e.inNet,dt:e.crossT!=null?+(e.now-e.crossT).toFixed(0):null,cd:e.crossDur,ts:e.ts}))}));
    if(X.errs.length) console.log(X.errs.slice(0,3).join('\n'));
    const bike=scen==='bike';
    ok(X.rel.length>=loops, `${tag} ${scen}: forced kick struck ${X.rel.length} times`);
    if(three){ ok(X.figN>0&&X.fig===X.figN, `3d ${scen}: the scorer's 3-D figure is drawn through the move (${X.fig}/${X.figN} frames)`);
      if(bike) ok(X.fig3&&X.fig3.head<X.fig3.pelvis+0.4, `3d bike: at contact the 3-D head is level with the hips, not above them (head ${X.fig3?X.fig3.head.toFixed(2):'-'} m, pelvis ${X.fig3?X.fig3.pelvis.toFixed(2):'-'} m)`); }
    if(bike) ok(X.rel.every(r=>r.headH<r.hipH+0.4), `${tag} bike: horizontal at contact (head ${X.rel.map(r=>r.headH.toFixed(2)).join(', ')} m vs hips ${X.rel.map(r=>r.hipH.toFixed(2)).join(', ')} m)`);
    ok(X.rel.every(r=>r.d<0.3), `${tag} ${scen}: kicking foot within 0.3 m of the ball centre at release (world, worst ${Math.max(...X.rel.map(r=>r.d)).toFixed(3)} m)`);
    if(!three) ok(X.rel.every(r=>r.d2!=null&&r.d2<0.42), `2d ${scen}: the drawn boot meets the drawn ball at release (screen, worst ${Math.max(...X.rel.map(r=>r.d2||9)).toFixed(3)} m)`);
    ok(X.land.length>=loops&&X.land.every(l=>l.d<0.12&&l.dt>=0&&l.dt<40), `${tag} ${scen}: the cross arrives at the contact point (worst ${Math.max(...X.land.map(l=>l.d)).toFixed(3)} m, ${Math.max(...X.land.map(l=>l.dt)).toFixed(0)} ms after the planned contact)`);
    if(bike){ ok(X.rel.every(r=>r.th<=-1.3), `${tag} bike: body pitched back past horizontal-ish at contact (pitch ${X.rel.map(r=>r.th.toFixed(2)).join(', ')})`);
      ok(X.rel.every(r=>r.fz>=1.55), `${tag} bike: contact above his head (boot ${X.rel.map(r=>r.fz.toFixed(2)).join(', ')} m)`); }
    else { ok(X.rel.every(r=>Math.abs(r.ra)>=0.85), `${tag} scissor: body rolled side-on at contact (roll ${X.rel.map(r=>r.ra.toFixed(2)).join(', ')})`);
      ok(X.rel.every(r=>r.fz>=0.85&&r.fz<=1.5), `${tag} scissor: contact at hip height (boot ${X.rel.map(r=>r.fz.toFixed(2)).join(', ')} m)`); }
    ok(X.ends.length>=1&&X.ends.every(v=>v<0.6), `${tag} ${scen}: he eases off into the take-off (speed at take-off ${X.ends.map(v=>v.toFixed(2)).join(', ')} x top speed, below 0.6)`);
    ok(X.crab<1.0, `${tag} ${scen}: no crab-sprint in the set (facing within ${X.crab.toFixed(2)} rad of his run while above half speed, below 1.0)`);
    if(!three) ok(X.plate.length>=1&&X.plate.every(q=>q.y<q.ballTop&&q.y<q.ank), `2d ${scen}: the name plate rides above the ball and the boot at release (${X.plate.map(q=>((q.ballTop-q.y)/q.s).toFixed(2)+' m').join(', ')} above the ball)`);
    const lies=X.rows.filter(r=>r.ph==='lie'); ok(lies.length>0&&lies.every(r=>r.lift<=-0.6&&(bike?r.th<=-1.4:Math.abs(r.ra)>=1.3)), `${tag} ${scen}: lands on the ${bike?'back':'side'} (hips at the turf, ${lies.length} samples)`);
    ok(X.clear.length>=loops&&X.clear.every(c=>c.act!=='v186x'&&Math.abs(c.th)<1e-6&&Math.abs(c.ra)<1e-6&&Math.abs(c.lift)<0.15), `${tag} ${scen}: up on his feet again after every kick (${X.clear.length})`);
    ok(X.emit.filter(e=>e.t==='goal').every(e=>e.inNet&&e.ty==='cross'), `${tag} ${scen}: the goal is emitted with the ball in the net, type still 'cross'`);
    /* the normal ground finish: the cross (without the special's D(150)), the strike's wind D(200) and flight D(380)+90 */
    const tm=X.emit.filter(e=>e.t==='goal'&&e.crossT!=null&&e.crossDur!=null);
    const dev=e=>{ const D=(ms,ts)=>Math.max(55,ms*ts); return (e.now-e.crossT)-((e.crossDur-D(150,e.crossTs))+D(200,e.ts)+D(380,e.ts)+90); };
    ok(tm.length>=1&&tm.every(e=>dev(e)>=-1&&dev(e)<=2*e.fmax+2), `${tag} ${scen}: cross release to goal emit takes the normal finish's time (cross + wind + strike; off by ${tm.map(e=>dev(e).toFixed(0)+' ms with frames up to '+e.fmax.toFixed(0)).join(', ')} ms: two frame waits, as the normal path has three)`);
  }
  ok(errs.length===0, `${tag} lab: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

/* a live 2-D match at 2x (seed spx0): the first goal from a cross that the scorer can get under is forced as a bicycle kick,
   the next as a scissor kick; the goals so far are checked against the engine's own run of the same match (half-time talk none) */
async function liveSuite(browser){
  const page=await browser.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Spec Coach'); await page.fill('#nc-seed','spx0');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const pre=await page.evaluate(()=>{ PREFS.renderer='2d'; PREFS.replays=true; const C=App.C; const f=userFixture(C); const cl=JSON.parse(JSON.stringify(C)); const od=oddsFor(f.id); const v=validateLineup(cl,cl.userSid,'V'); if(!v.ok) repairLineup(cl,cl.userSid,'V');
    const M=startMatch(cl,f.id,{halftime:false,preP:[od.h,od.a]}); runToEnd(cl,M);
    return M.ev.filter(e=>e.t==='goal').map(e=>[e.m,e.pid,e.s,e.sc.join('-'),e.ty,(e.seq||[]).map(q=>q.a).join('>')]); });
  await page.evaluate(()=>{ const X=window.__lx={rel:[],goals:[],caps:[],rp:[],clear:[],errs:[]}; V186X.force='bike';
    const R0=Stage.prototype.v186xRelease; Stage.prototype.v186xRelease=function(p,K){ const r=R0.call(this,p,K); try{ const P=this.poseOf(p), kf=p.v186xf===1?1:0, f=v186xFootW(this,p,P,kf), {R}=v186xScale(this,p), b=this.ball;
        X.rel.push({k:K.kind,pid:p.pid,m:K.e.m,d:Math.hypot(f.x-b.x,f.y-b.y,f.z-(b.z+R)),th:P.pitchB||0,ra:P.rollB||0,fz:f.z}); V186X.force=K.kind==='bike'?'scissor':null; const [sx,sy,k]=this.proj(p.x,p.y); X.pz={k:K.kind,x:sx,y:sy,s:k}; this.paused=true; }catch(e){ X.errs.push(String(e)); } return r; };
    const U0=Stage.prototype.update; let had=null, hadK=null; Stage.prototype.update=function(dt){ const r=U0.apply(this,arguments); try{ const K=this._v186x;
        if(K&&K.pl&&K.pl.v186xk){ had=K.pl; hadK=K; } else if(had&&!had.v186xk){ X.clear.push({pid:had.pid,celeb:!!had.celeb,rd:hadK&&hadK.rel!=null?this.now-hadK.rel:null,kind:hadK&&hadK.kind}); had=null; } }catch(e){} return r; };
    const D0=Stage.prototype.draw; Stage.prototype.draw=function(){ const Q=this._rp; if(Q&&Q.on&&Q.v186x){ try{ const K=this._v186x, p=K&&K.pl; if(p&&p.v186xk){ const P=this.poseOf(p); X.rp.push({k:Q.v186x.kind,t:this.now,th:P.pitchB||0,ra:P.rollB||0,act:P.act}); } }catch(e){} } return D0.apply(this,arguments); };
    const E0=window.liveEmit; window.liveEmit=function(e){ const st=App.live&&App.live.stage, K=st&&st._v186x; const r=E0.apply(this,arguments);
      if(e.t==='goal'){ const sub=document.querySelector('#lv-banner .gb-sub'); X.goals.push({m:e.m,pid:e.pid,s:e.s,sc:e.sc.join('-'),ty:e.ty,inNet:!!(st&&st.inNet),sp:K&&K.struck?K.kind:null,banner:sub?sub.textContent:''}); } return r; };
    const C0=window.liveCaption; window.liveCaption=function(t,k){ X.caps.push(t); return C0.apply(this,arguments); }; });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
  await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  const t0=Date.now(); let shot=0;
  while(Date.now()-t0<720000){ if(await page.$('#lv-ht .htbox')){ await page.click('#ht-go').catch(()=>{}); await sleep(300); } if(await page.$('#lv-cont')) break;
    /* both specials struck, he is up, and that goal's sequence (replay included) is over */
    if(await page.evaluate(()=>{ const X=window.__lx, st=App.live&&App.live.stage; return X.rel.length>=2&&X.clear.length>=2&&st&&!st._v186x&&!st._rp; })) break;
    /* the stage pauses itself on the frame the ball leaves the boot: a close-up and a full frame, then it plays on */
    const z=await page.evaluate(()=>window.__lx.pz); if(z){ shot++; await sleep(300); const bb=await page.evaluate(()=>{ const r=document.getElementById('lv-canvas').getBoundingClientRect(); return {x:r.left,y:r.top}; });
      const w=Math.max(160,z.s*5.5), h=Math.max(130,z.s*4.4); await page.screenshot({path:`${SH}live_2d_${z.k}_contact.png`,clip:{x:Math.max(0,bb.x+z.x-w/2),y:Math.max(0,bb.y+z.y-h*0.8),width:w,height:h}}); await page.screenshot({path:`${SH}live_2d_${z.k}_frame.png`});
      await page.evaluate(()=>{ window.__lx.pz=null; App.live.stage.paused=false; }); } await sleep(100); }
  const R=await page.evaluate(()=>{ const L=App.live; const X=window.__lx; return {X,min:L.M.min,ev:L.M.ev.filter(e=>e.t==='goal').map(e=>[e.m,e.pid,e.s,e.sc.join('-')]),feed:L.feed.map(f=>f.txt).filter(t=>/bicycle|scissor/i.test(t))}; });
  console.log('live',JSON.stringify({rel:R.X.rel.map(r=>({...r,d:+r.d.toFixed(3)})),goals:R.X.goals,clear:R.X.clear,rp:R.X.rp.length,caps:R.X.caps.filter(c=>/KICK/.test(c)),feed:R.feed,errs:R.X.errs}));
  const preN=pre.filter(g=>g[0]<=R.min).map(g=>g.slice(0,4)); ok(R.ev.length>=2&&JSON.stringify(R.ev)===JSON.stringify(preN), `live: goals up to minute ${R.min} (minute, scorer, side, score) identical to the engine's own run of the match (${R.ev.length} goals: ${R.ev.map(g=>g[0]+"' "+g[3]).join(', ')})`);
  const kinds=R.X.rel.map(r=>r.k); ok(kinds.includes('bike')&&kinds.includes('scissor'), `live: a forced bicycle kick and a forced scissor kick were struck (${kinds.join(', ')})`);
  ok(R.X.rel.length>0&&R.X.rel.every(r=>r.d<0.3), `live: kicking foot within 0.3 m of the ball at release (${R.X.rel.map(r=>r.d.toFixed(3)).join(', ')} m)`);
  ok(R.X.rel.length>0&&R.X.rel.every(r=>r.k==='bike'?r.th<=-1.3:Math.abs(r.ra)>=0.85), `live: body horizontal / side-on at contact`);
  const sg=R.X.goals.filter(g=>g.sp); ok(sg.length>0&&sg.length===R.X.rel.length&&sg.every(g=>g.inNet&&g.ty==='cross'), `live: special goals emitted with the ball in the net and labelled 'cross' (${sg.map(g=>g.ty).join(', ')})`);
  ok(sg.length>0&&sg.every(g=>/Bicycle kick|Scissor kick/.test(g.banner)), `live: the goal banner names the finish (${sg.map(g=>g.banner).join(' | ')})`);
  ok(sg.length>0&&R.feed.length===sg.length, `live: a commentary line for each special (${R.feed.length})`);
  const cap=R.X.caps.filter(c=>c==='BICYCLE KICK!'||c==='SCISSOR KICK!'); ok(sg.length>0&&cap.length===sg.length, `live: caption at contact (${cap.join(', ')})`);
  ok(R.X.clear.length>=sg.length&&sg.length>0&&R.X.clear.every(c=>c.rd!=null), `live: he lands and gets up after each special (${R.X.clear.map(c=>c.kind+' '+Math.round(c.rd)+' ms after the strike'+(c.celeb?', the celebration already on':'')).join('; ')})`);
  const rb=R.X.rp.filter(r=>r.k==='bike'); ok(rb.length>0&&Math.min(...rb.map(r=>r.th))<=-1.3, `live 2-D replay: the bicycle kick is replayed with the body horizontal (${rb.length} frames, min pitch ${rb.length?Math.min(...rb.map(r=>r.th)).toFixed(2):'-'})`);
  ok(errs.length===0&&R.X.errs.length===0, `live: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

/* unforced: the rate over many seeds of engine matches (the pure pick the stage uses), Modified never, deterministic; gating */
async function rateSuite(browser){
  /* Node: the shipped engine (test/load.js) plays whole seasons; the pure block of 82_specials.js decides each cross goal */
  const E=require('./load.js'); const vm=require('vm'); const src=fs.readFileSync(require('path').join(__dirname,'../src/v17/82_specials.js'),'utf8');
  const blk=src.slice(src.indexOf('/* @v186x-pure-begin'),src.indexOf('/* @v186x-pure-end */')); const ctx={Math,Array,String,Number,Object,JSON,hashStr:E.hashStr}; vm.createContext(ctx);
  vm.runInContext(blk+';this.X={V186X,v186xTech,v186xProb,v186xPick};',ctx); const X=ctx.X;
  const R={n:{V:0,JV:0,MOD:0},k:{V:0,JV:0,MOD:0},bike:0,scissor:0,exp:0,expV:0,same:true,matches:0,seeds:0};
  for(let i=0;i<24;i++){ const C=E.newCareer({name:'T',seed:'v186rate'+i,school:null}); R.seeds++;
    for(let r=0;r<40;r++){ try{ E.simRound(C); try{ E.advance(C); }catch(e){} }catch(e){ break; } }
    for(const fid in C.logs){ const lg=C.logs[fid], f=C.fixtures[fid]; if(!lg||!lg.ev||!f) continue; R.matches++;
      for(const e of lg.ev){ if(e.t!=='goal'||e.ty!=='cross') continue; const P=C.players[e.pid]; if(!P) continue; const tech=X.v186xTech(P), o={tech,lvl:f.lvl,ty:'cross',pid:e.pid,m:e.m,sc:e.sc,s:e.s};
        const k=X.v186xPick(o); if(X.v186xPick(JSON.parse(JSON.stringify(o)))!==k) R.same=false; R.n[f.lvl]++; if(k){ R.k[f.lvl]++; R[k]++; } const q=X.v186xProb(tech,f.lvl); if(f.lvl!=='MOD') R.exp+=q.bike+q.scissor; if(f.lvl==='V') R.expV+=q.bike+q.scissor; } } }

  const page=await browser.newPage({viewport:{width:1000,height:700}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  const vj=R.n.V+R.n.JV, rate=(R.k.V+R.k.JV)/vj;
  console.log('rate',JSON.stringify({...R,rate:+(rate*100).toFixed(2),exp:+(R.exp/vj*100).toFixed(2),expV:+(R.expV/R.n.V*100).toFixed(2)}));
  ok(R.exp/vj>=0.12&&R.exp/vj<=0.26, `rate: the expected share (mean chance per V/JV cross goal) is ${(R.exp/vj*100).toFixed(2)} % (V ${(R.expV/R.n.V*100).toFixed(2)} %)`);
  ok(vj>=1000, `rate: ${vj} Varsity/JV cross goals from ${R.matches} engine matches over ${R.seeds} seeds`);
  ok(rate>=0.1&&rate<=0.28, `rate: specials on ${(rate*100).toFixed(2)} % of V/JV cross goals (expected ${(R.exp/vj*100).toFixed(2)} %; bike ${R.bike}, scissor ${R.scissor})`);
  ok(R.k.MOD===0&&R.n.MOD>0, `rate: never at Modified (${R.n.MOD} cross goals)`);
  ok(R.k.V/Math.max(1,R.n.V)>R.k.JV/Math.max(1,R.n.JV), `rate: Varsity scorers more often than JV (${R.k.V}/${R.n.V} vs ${R.k.JV}/${R.n.JV})`);
  ok(R.same, 'rate: the pick is deterministic (same goal, same finish)');
  /* gating on a lab stage, with the odds forced to 1 for a top scorer */
  await page.evaluate(()=>{ labRun('run'); }); await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0,null,{timeout:20000});
  const G=await page.evaluate(()=>{ const st=App.labSt; const A=[...st.players.values()].filter(p=>p.side===0); const fw=A[9]; fw.v186xfl=99; fw.v186xlv='V';
    const e={s:0,pid:fw.pid,t:'goal',ty:'cross',seq:[{pid:A[8].pid,x:10,y:85,a:'cross'},{pid:fw.pid,x:47,y:90,a:'shot'}],sc:[1,0],m:10}; const Kb=V186X.Kb; V186X.Kb=1; const o={};
    try{ st.goalTs=1; o.on=st.v186xDecide(e); st.goalTs=0.4; o.x8=st.v186xDecide(e); st.goalTs=1; st.rm=true; o.rm=st.v186xDecide(e); st.rm=false; st.skip=true; o.skip=st.v186xDecide(e); st.skip=false;
      fw.v186xlv='MOD'; o.mod=st.v186xDecide(e); fw.v186xlv='V'; o.hdr=st.v186xDecide({...e,ty:'header'}); o.near=st.v186xDecide({...e,seq:[e.seq[0],{...e.seq[1],y:96}]}); o.noX=st.v186xDecide({...e,seq:[{pid:A[8].pid,x:40,y:70,a:'pass'},e.seq[1]]});
      st.so=true; o.so=st.v186xDecide(e); st.so=false; } finally{ V186X.Kb=Kb; } return JSON.parse(JSON.stringify(o)); });
  console.log('gating',JSON.stringify(G));
  ok(G.on&&G.on.kind==='bike', 'gating: an eligible Varsity cross goal at 1x can be a special');
  ok(!G.x8&&!G.rm&&!G.skip&&!G.so, 'gating: never at 8x (goalTs 0.4), under reduced motion, while skipping or in a shootout');
  ok(!G.mod&&!G.hdr&&!G.near&&!G.noX, 'gating: never at Modified, for a header, inside 7 m or without a cross to the scorer');
  ok(errs.length===0, `rate/gating: no page errors${errs.length?' '+errs.join(' | '):''}`);
  await page.close(); }

/* the 3-D two-angle replay of a forced bicycle kick (as test/replay2.js does: the live match paused, one goal played on its
   stage, frames drawn only once the replay starts): the scorer's view ends before he leaves the ground, so his camera is
   never upside down or among his own legs; the behind-the-goal pass shows the whole kick, the contact pose included */
async function rp3dSuite(browser){
  const page=await browser.newPage({viewport:{width:760,height:480}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  page.on('console',m=>{ if(m.type()==='error'&&!/GL Driver|ERR_TUNNEL|Failed to load resource/i.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(600);
  await page.evaluate(()=>{ PREFS.renderer='3d'; PREFS.rtier='C'; PREFS.replays=true; PREFS.rpAngles='two'; PREFS.view='broadcast'; PREFS.zoom='normal'; savePrefs(); });
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','RP Coach'); await page.fill('#nc-seed','rp2angles');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="kickoff"]');
  await page.waitForFunction(()=>{ const s=App.live&&App.live.stage; return !!(s&&s._p3d&&!s._p3d.dead&&s._p3d.kind==='live'); },null,{timeout:60000});
  await page.evaluate(()=>{ App.live.paused=true; }); await page.waitForFunction(()=>!App.live.busy,null,{timeout:120000});
  await page.evaluate(()=>{ const _on=v17Vis.on; v17Vis.on=el=>{ const st=App.live&&App.live.stage; if(window.NODRAW&&st&&el===st.cv){ if(st._rp) window.NODRAW=false; else return false; } return _on(el); };
    window.V185_RPDBG=true; window.RF=[]; const _r=Painter3D.prototype.render; Painter3D.prototype.render=function(){ const r=_r.apply(this,arguments);
      try{ const st=this.st, Q=st._rp; if(Q&&Q.on){ const K=st._v186x, p=K&&K.pl; const P=p?st.poseOf(p):null; const cam=this.camera; cam.updateMatrixWorld(); const e=cam.matrixWorld.elements;
        RF.push({pass:Q.pass,cam:Q.cam,now:st.now,two:!!Q.two,v186x:!!Q.v186x,tc:K&&K.tc,ts:K&&K.ts,th:P?(P.pitchB||0):0,act:P&&P.act,upY:e[5],win:Q.win?JSON.parse(JSON.stringify(Q.win)):null,eye:[cam.position.x,cam.position.y,cam.position.z],px:p&&p.x,py:p&&p.y});
        /* hold two frames for the screenshots: the last of the scorer's view, and the contact from behind the goal */
        const tTO=K&&K.tc!=null?K.tc-Math.max(55,380*K.ts):null; if(tTO!=null&&!window.RSH1&&Q.cam==='eyes'&&st.now>=tTO-120){ window.RSH1='eyes'; st.paused=true; }
        if(!window.RSH2&&Q.cam==='goal'&&P&&(P.pitchB||0)<=-1.3){ window.RSH2='goal'; st.paused=true; } } }catch(err){} return r; }; });
  const RP=page.evaluate(async()=>{ const L=App.live, st=L.stage; window.NODRAW=true; L.speed=1; st.goalTs=GOAL_TS[1]; st.skip=false; V186X.force='bike';
    const pl=[...st.players.values()].filter(q=>q.side===0&&!q.gk&&!q.off); const sc=pl[pl.length-1], mate=pl[Math.max(0,pl.length-4)];
    const n0=App.v18Replays||0; const M0=JSON.stringify([L.M.sc,L.M.min,L.view.min]);
    const ev={s:0,pid:sc.pid,t:'goal',ty:'cross',seq:[{pid:mate.pid,x:10,y:85,a:'cross'},{pid:sc.pid,x:47,y:90,a:'shot'}],m:L.M.min,sc:[1,0]}; st.clipStart(ev); /* as a highlight starts it: everyone in shape round the move */
    await st.goalSequence(ev); V186X.force=null;
    return {n:(App.v18Replays||0)-n0,same:M0===JSON.stringify([L.M.sc,L.M.min,L.view.min]),log:V186X.log.slice(-1)[0]||null}; });
  for(const k of ['RSH1','RSH2']){ const t0=Date.now(); while(Date.now()-t0<240000){ const v=await page.evaluate(k=>window[k]&&App.live.stage.paused?window[k]:null,k); if(v){ await sleep(1500); await page.screenshot({path:`${SH}rp3d_${v}.png`}); await page.evaluate(()=>{ App.live.stage.paused=false; }); break; } await sleep(200); } }
  const R=await RP;
  const F=await page.evaluate(()=>RF);
  const eyes=F.filter(f=>f.two&&f.cam==='eyes'), goal=F.filter(f=>f.cam==='goal'); const f0=F.find(f=>f.tc!=null)||{}; const T=f0.ts!=null?{to:Math.max(55,380*f0.ts)}:{to:380};
  console.log('rp3d',JSON.stringify({n:R.n,same:R.same,log:R.log,frames:F.length,eyes:eyes.length,goal:goal.length,win:(F[F.length-1]||{}).win,eyesMax:eyes.length?Math.max(...eyes.map(f=>f.now)):null,tTO:f0.tc!=null?f0.tc-T.to:null,goalMinTh:goal.length?Math.min(...goal.map(f=>f.th)):null,minUp:F.length?Math.min(...F.map(f=>f.upY)):null}));
  await page.screenshot({path:`${SH}rp3d_after.png`});
  ok(R.n===1&&R.same, `3-D live: the forced bicycle kick goal is replayed once, match state untouched`);
  ok(F.length>0&&F.every(f=>f.v186x), `3-D replay: the special's replay window is set (${F.length} frames)`);
  ok(eyes.length>0&&goal.length>0, `3-D replay: both angles play (scorer's view ${eyes.length} frames, behind the goal ${goal.length})`);
  ok(eyes.length>0&&f0.tc!=null&&eyes.every(f=>f.now<f0.tc-T.to&&f.act!=="v186x"), `3-D replay: the scorer's view ends as he leaves the ground (last eyes frame ${eyes.length?(Math.max(...eyes.map(f=>f.now))-(f0.tc-T.to)).toFixed(0):'-'} ms after take-off; never in the kick's pose)`);
  ok(F.every(f=>f.upY>0.5), `3-D replay: the camera is never upside down (min up.y ${F.length?Math.min(...F.map(f=>f.upY)).toFixed(2):'-'})`);
  ok(goal.some(f=>f.th<=-1.3), `3-D replay: the behind-the-goal pass shows him horizontal (min pitch ${goal.length?Math.min(...goal.map(f=>f.th)).toFixed(2):'-'})`);
  ok(errs.length===0, `3-D replay: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  if(want('rate')) await rateSuite(browser);
  if(want('lab')) await labSuite(browser,false);
  if(want('live')) await liveSuite(browser);
  if(want('lab3d')) await labSuite(browser,true);
  if(want('rp3d')) await rp3dSuite(browser);
  await browser.close();
  console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
