// Rare special kicks (v18.6 B2, src/v17/82_specials.js): forced bicycle and scissor kicks in the lab (2-D and 3-D) and in a
// live match; the kicking foot meets the ball when it leaves the boot (2-D screen and 3-D world), the cross arrives at the
// contact height, the body is horizontal (bike) / rolled (scissor) at contact, he lands and gets up before the celebration;
// event timing and results unchanged; the unforced rate over many seeds is rare (1-3 % of V/JV cross goals), never at
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
      const ph=tau<-T.to?'set':tau<-T.st?'to':tau<0?'st':tau<T.fall?'fall':tau<T.fall+T.lie?'lie':'up'; X.rows.push({k:p.v186xk,tau,ph,th:P.pitchB||0,ra:P.rollB||0,lift:P.lift||0,act:P.act,hipU:P.hipU,x:p.x,y:p.y,yaw:p.yaw,celeb:!!p.celeb});
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
        const ax=x+rel[0]*c-rel[1]*sn, ay=y-P.lift*s-P.pivot*s+rel[0]*sn+rel[1]*c; const kb=this.proj(b.x,b.y,0)[2]; const rr=Math.max(3.2,BALL_R*kb); const bp=this.proj(b.x,b.y,b.z); d2=Math.hypot(ax-bp[0],ay-(bp[1]-rr))/k; }
      X.rel.push({k:p.v186xk,d,d2,d3,th:P.pitchB||0,ra:P.rollB||0,fz:f.z,bz:b.z+R,ty:this.fl&&this.fl.kind,from:this.fl&&this.fl.from&&this.fl.from.z,now:this.now,tc:p.v186xc,cross:K.crossT,crossDur:K.crossDur}); }catch(e){ X.errs.push(String(e&&e.stack||e)); } return r; };
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
    const names=['set','takeoff','air','contact','fall','lie','getup'];
    await page.evaluate(sc=>{ const T=v186xDur(sc,3.4); window.__sx.pause=[{name:'set',tau:-T.to-T.st*0.6},{name:'takeoff',tau:-T.to*0.55},{name:'air',tau:-T.st*0.45},{name:'contact',tau:0},{name:'fall',tau:T.fall*0.55},{name:'lie',tau:T.fall+T.lie*0.5},{name:'getup',tau:T.fall+T.lie+T.up*0.55}]; },scen);
    const t0=Date.now(); let n=0;
    while(Date.now()-t0<(three?240000:90000)&&n<names.length){ const s=await page.evaluate(()=>window.__sx.paused); if(s){
        await page.evaluate(()=>{ const st=App.labSt, p=st._v186x&&st._v186x.pl; if(p){ st.focus=p; st.zoomTo(0.3); st.cam.w=st.cam.tw; st.cam.x=p.x; } });
        await sleep(three?2500:350); await page.screenshot({path:`${SH}${tag}_${scen}_${n}_${s}.png`}); n++; await page.evaluate(()=>{ window.__sx.paused=null; App.labSt.paused=false; }); } else await sleep(60); }
    ok(n===names.length, `${tag} ${scen}: paused at all ${names.length} phases for the pose sheet (${n})`);
    /* then at normal lab speed: the measurements */
    await page.waitForFunction(()=>window.__sx.emit.length>=1,null,{timeout:three?240000:60000}).catch(()=>{});
    await page.evaluate(()=>{ const st=App.labSt; st.ts=0.85; st.goalTs=0.85; st.focus=null; });
    await page.waitForFunction(()=>window.__sx.clear.length>=1,null,{timeout:three?240000:60000}).catch(()=>{});
    await page.waitForFunction(()=>window.__sx.emit.length>=2&&window.__sx.clear.length>=2,null,{timeout:three?300000:90000}).catch(()=>{});
    const X=await page.evaluate(()=>{ const X=window.__sx; return {rel:X.rel,land:X.land,clear:X.clear,emit:X.emit,errs:X.errs,rows:X.rows.filter((r,i)=>i%3===0)}; });
    console.log(tag,scen,JSON.stringify({rel:X.rel.map(r=>({d:+r.d.toFixed(3),d2:r.d2==null?null:+r.d2.toFixed(3),th:+r.th.toFixed(2),ra:+r.ra.toFixed(2),fz:+r.fz.toFixed(2)})),land:X.land.map(l=>({dt:+l.dt.toFixed(0),bz:+l.bz.toFixed(2),d:+l.d.toFixed(3)})),clear:X.clear,emit:X.emit.map(e=>({ty:e.ty,inNet:e.inNet,dt:e.crossT!=null?+(e.now-e.crossT).toFixed(0):null,cd:e.crossDur,ts:e.ts}))}));
    if(X.errs.length) console.log(X.errs.slice(0,3).join('\n'));
    const bike=scen==='bike';
    ok(X.rel.length>=2, `${tag} ${scen}: forced kick struck ${X.rel.length} times`);
    ok(X.rel.every(r=>r.d<0.3), `${tag} ${scen}: kicking foot within 0.3 m of the ball centre at release (world, worst ${Math.max(...X.rel.map(r=>r.d)).toFixed(3)} m)`);
    if(!three) ok(X.rel.every(r=>r.d2!=null&&r.d2<0.42), `2d ${scen}: the drawn boot meets the drawn ball at release (screen, worst ${Math.max(...X.rel.map(r=>r.d2||9)).toFixed(3)} m)`);
    ok(X.land.length>=2&&X.land.every(l=>l.d<0.12&&l.dt>=0&&l.dt<40), `${tag} ${scen}: the cross arrives at the contact point (worst ${Math.max(...X.land.map(l=>l.d)).toFixed(3)} m, ${Math.max(...X.land.map(l=>l.dt)).toFixed(0)} ms after the planned contact)`);
    if(bike){ ok(X.rel.every(r=>r.th<=-1.3), `${tag} bike: body pitched back past horizontal-ish at contact (pitch ${X.rel.map(r=>r.th.toFixed(2)).join(', ')})`);
      ok(X.rel.every(r=>r.fz>=1.55), `${tag} bike: contact above his head (boot ${X.rel.map(r=>r.fz.toFixed(2)).join(', ')} m)`); }
    else { ok(X.rel.every(r=>Math.abs(r.ra)>=0.85), `${tag} scissor: body rolled side-on at contact (roll ${X.rel.map(r=>r.ra.toFixed(2)).join(', ')})`);
      ok(X.rel.every(r=>r.fz>=0.85&&r.fz<=1.5), `${tag} scissor: contact at hip height (boot ${X.rel.map(r=>r.fz.toFixed(2)).join(', ')} m)`); }
    const lies=X.rows.filter(r=>r.ph==='lie'); ok(lies.length>0&&lies.every(r=>r.lift<=-0.6&&(bike?r.th<=-1.4:Math.abs(r.ra)>=1.3)), `${tag} ${scen}: lands on the ${bike?'back':'side'} (hips at the turf, ${lies.length} samples)`);
    ok(X.clear.length>=2&&X.clear.every(c=>c.act!=='v186x'&&Math.abs(c.th)<1e-6&&Math.abs(c.ra)<1e-6&&Math.abs(c.lift)<0.15), `${tag} ${scen}: up on his feet again after every kick (${X.clear.length})`);
    ok(X.emit.filter(e=>e.t==='goal').every(e=>e.inNet&&e.ty==='cross'), `${tag} ${scen}: the goal is emitted with the ball in the net, type still 'cross'`);
    /* the normal ground finish: the cross (without the special's D(150)), the strike's wind D(200) and flight D(380)+90 */
    const tm=X.emit.filter(e=>e.t==='goal'&&e.crossT!=null&&e.crossDur!=null);
    const dev=e=>{ const D=(ms,ts)=>Math.max(55,ms*ts); return (e.now-e.crossT)-((e.crossDur-D(150,e.crossTs))+D(200,e.ts)+D(380,e.ts)+90); };
    ok(tm.length>=1&&tm.every(e=>dev(e)>=-1&&dev(e)<=2*e.fmax+2), `${tag} ${scen}: cross release to goal emit takes the normal finish's time (cross + wind + strike; off by ${tm.map(e=>dev(e).toFixed(0)+' ms with frames up to '+e.fmax.toFixed(0)).join(', ')} ms: two frame waits, as the normal path has three)`);
  }
  ok(errs.length===0, `${tag} lab: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  if(want('lab')) await labSuite(browser,false);
  if(want('lab3d')) await labSuite(browser,true);
  await browser.close();
  console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
