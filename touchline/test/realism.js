// Simulation realism and visible ratings (v18.6 A, src/v17/78_ratings.js + 79_realism.js).
// Offside: in the Lab at 1x/2x/4x/8x (2-D broadcast, Tactical, sideline) and in live matches over several seeds at 8x, 4x, 2x
// and 1x, every call that draws a freeze frame has the flagged runner beyond the second-last defender (keeper counted), the
// ball and halfway at the instant the pass is released (margins reported); the defender line is drawn at the line as it
// was at release and the attacker line at the runner; the second-last defender stays within 0.3 m of the drawn line while it
// is on screen; no hold is left behind; calls with no picture (no freeze line) stay rare.
// Throw-ins: the team that last touched the ball never takes it (a blocked ball goes to the kicker's team).
// Misses: from under 9 m just wide (|y-34| <= 4.7) or just over (z <= 3.0); captions and commentary agree (e._how).
// Ratings (Lab, overridden on the movers): pace 99 vs 50 shows in sprint times; ball control shows in the first touch;
// take-on gaps show in beat rates and who ends goal-side; finishing shows in how far misses go.
// No page errors. Usage: node test/realism.js [lab|live|all]   (QUICK=1: fewer live runs)
const { chromium, DIST } = require('./_pw');
const part=process.argv[2]||'all', QUICK=!!process.env.QUICK;
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const SHOTS='test/shots/v186/realism/';
const allOff=[], allThr=[], allMiss=[], allDev=[]; let leaks=0, capMis=0, capN=0, fb=0, calls=0;
const errs=[];
async function newPage(b,w,h){ const page=await b.newPage({viewport:{width:w||1100,height:h||640}}); page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1])); return page; }
const MON=()=>{ /* runs in the page: monitors freeze lines, holds and captions */
  const A=window.__rz={dev:{},leak:0,leakD:[],cap:[],capMis:0};
  const O=Stage.prototype.offsideSeq; Stage.prototype.offsideSeq=async function(e){ const r=await O.call(this,e); const s=e.s;
    const left=[...this.players.values()].filter(q=>q.side!==s&&q.ov&&!q.off&&!q.gk); if(left.length){ A.leak++; A.leakD.push(left.map(q=>q.pid)); } return r; };
  /* D6: forward passes to a teammate inside a goal sequence: is the receiver onside when it is played? */
  A.gp=[]; let inGoal=0; const GS=Stage.prototype.goalSequence; Stage.prototype.goalSequence=async function(){ inGoal++; try{ return await GS.apply(this,arguments); } finally{ inGoal--; } };
  const LA=Stage.prototype.launch; Stage.prototype.launch=function(p,o){ const st=this; if(inGoal&&p&&o&&o.home&&o.home.side===p.side&&!o.hands&&!st.so&&st.setPiece!=='corner'){ const q=o.home, dir=p.side===0?1:-1, R=o.onRelease;
      o=Object.assign({},o,{onRelease:f=>{ if(dir*(q.x-p.x)>0.5) A.gp.push(+(dir*(q.x-st.offLine(p.side))).toFixed(2)); if(R) return R(f); }}); return LA.call(this,p,o); }
    return LA.apply(this,arguments); };
  let lastShot=null; const SH=Stage.prototype.shotSeq; Stage.prototype.shotSeq=async function(e){ lastShot=e; try{ return await SH.apply(this,arguments); } finally{ lastShot=null; } };
  const capHow={'HEADED OVER':'over','HEADED WIDE':'wide','OVER THE BAR':'over','WIDE':'wide','OFF THE POST!':'post','OFF THE BAR!':'bar','SAVED':'catch','PARRIED!':'parry','TIPPED AROUND THE POST':'tip'};
  const tick=()=>{ const st=(App.live&&App.live.stage)||App.labSt||window.__lab; if(st&&st.alive){
      if(!st.__capW){ st.__capW=1; const oc=st.onCaption; st.onCaption=function(t,k){ if(lastShot&&k==='shot'&&capHow[t]){ A.cap.push({t,how:lastShot._how}); if(lastShot._how&&lastShot._how!==capHow[t]) A.capMis++; } return oc.apply(this,arguments); }; }
      const m=st.offMark; if(m&&m.v186&&st.now-m.t>=0&&st.now-m.t<Math.max(700,st.D(1500))-40){ const d=Math.abs(v186rDefLine(st,m.s)-m.x); const k=m.t.toFixed(0); A.dev[k]=Math.max(A.dev[k]||0,d); } }
    requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
const goalPass=[];
async function collect(page){ const r=await page.evaluate(()=>({off:V186R.log.off,thr:V186R.log.thr,miss:V186R.log.miss,A:window.__rz}));
  goalPass.push(...(r.A.gp||[]));
  allOff.push(...r.off); allThr.push(...r.thr); allMiss.push(...r.miss); allDev.push(...Object.values(r.A.dev)); leaks+=r.A.leak; capMis+=r.A.capMis; capN+=r.A.cap.length;
  if(r.A.leak) console.log('  holds left after a call:',JSON.stringify(r.A.leakD)); return r; }

async function labOffside(b,speed,mode,n){ const page=await newPage(b); await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(800);
  await page.evaluate(MON);
  await page.evaluate(m=>{ PREFS.renderer='2d'; labRun('offside'); },mode); await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0);
  await page.click(`[data-a="labSpeed"][data-v="${speed}"]`);
  await page.evaluate(m=>{ const st=App.labSt; if(m==='tactical') st.mode='tactical'; if(m==='sideline'){ st.mode='sideline'; } },mode);
  const t0=Date.now(); let shot=0;
  while(Date.now()-t0<90000){ const k=await page.evaluate(()=>V186R.log.off.length); if(k>=n) break;
    const m=await page.evaluate(()=>{ const st=App.labSt; return st&&st.offMark&&st.offMark.v186?st.now-st.offMark.t:null; });
    if(m!=null&&m>150&&!shot){ await page.screenshot({path:`${SHOTS}lab_${mode}_${speed}x.png`}); shot=1; }
    await page.waitForTimeout(80); }
  const r=await collect(page); console.log(`  lab ${speed}x ${mode}: ${r.off.length} calls`); await page.close(); }

async function labRatings(b){ const page=await newPage(b); await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ PREFS.renderer='2d'; labRun('run'); }); await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0);
  const R=await page.evaluate(async()=>{ const st=App.labSt; App.labSt=null; /* the scene loop stops; the stage keeps running */
    await st.wait(1500); st.ts=0.85; const P=[...st.players.values()]; const a=P.find(p=>p.pid==='L02'), c=P.find(p=>p.pid==='L03');
    const out={};
    /* R1 pace: a 30 m sprint from a standstill */
    const race=async(pa,pc)=>{ a.v186r_pace=pa; c.v186r_pace=pc; for(const [p,y] of [[a,6],[c,10]]){ p.x=20; p.y=y; p.vx=p.vy=0; p.ov={x:20,y}; p._px=null; }
      await st.wait(500); const t0=st.now; let ta=null, tc=null, a5=null, c5=null; a.ov={x:50,y:6}; c.ov={x:50,y:10};
      await st.until(()=>{ if(a5==null&&a.x>=25) a5=st.now-t0; if(c5==null&&c.x>=25) c5=st.now-t0; if(ta==null&&a.x>=49.4) ta=st.now-t0; if(tc==null&&c.x>=49.4) tc=st.now-t0; return ta!=null&&tc!=null; },8000);
      return {ta,tc,a5,c5}; };
    out.gap=await race(99,50); out.eq=await race(70,70); a.ov=c.ov=null; a.v186r_pace=c.v186r_pace=null;
    /* R2 take-ons: the decision, 40 tries each way, and two dribbles each way */
    const fw=P.find(p=>p.pid==='L09'), df=P.find(p=>p.pid==='L12'); const feint0=V186R.feint; V186R.feint='force'; /* the fallback feint is measured even when a skill-move module owns the dribble */
    const duel=async(ctrl,tkl,n)=>{ fw.v186r_pace=df.v186r_pace=60; fw.v186r_ctrl=ctrl; df.v186r_tkl=tkl; let tries=0, beats=0;
      for(let i=0;i<n;i++){ fw.x=60; fw.y=34; df.x=64; df.y=34; df.ov=df.chase=null; fw.v186fT=null; st.own=fw; st.hands=false; st.fl=null; st.placed=false;
        const T=v186rTakeOn(st,fw,72,34); if(T){ tries++; if(T.beat) beats++; } df.v186bT=null; df.v186dT=null; df.kickT=-9e9; }
      return {tries,beats}; };
    out.duelHi=await duel(95,40,60); out.duelLo=await duel(40,95,60);
    const run=async(ctrl,tkl)=>{ fw.v186r_ctrl=ctrl; df.v186r_tkl=tkl; let past=0, n=0, beat=0; st.demoCalm=false;
      for(let i=0;i<6;i++){ st.fl=null; st.own=fw; st.hands=false; fw.ov={x:58,y:34}; df.ov={x:63.5,y:34}; await st.until(()=>dist2(fw,fw.ov)<0.4&&dist2(df,df.ov)<0.4,3000); fw.v186fT=null; df.ov=null;
        const k0=V186R.log.feint.length; await st.dribble(fw,70,34,900); const f=V186R.log.feint[k0]; if(!f) continue; n++; if(f.beat) beat++; if(fw.x>df.x+0.3) past++; }
      fw.ov=null; st.demoCalm=true; return {n,beat,past}; };
    /* R6 positioning: how close a pressing defender gets to a carrier who stands still */
    const press=async(tkl)=>{ df.v186r_tkl=tkl; st.demoCalm=false; st.fl=null; st.own=fw; st.hands=false; fw.ov={x:60,y:34}; df.ov={x:66,y:36}; await st.until(()=>dist2(fw,fw.ov)<0.4&&dist2(df,df.ov)<0.4,3000); df.ov=null; await st.wait(1600);
      let s=0,n=0; for(let i=0;i<20;i++){ s+=dist2(fw,df); n++; await st.wait(40); } fw.ov=null; st.demoCalm=true; return +(s/n).toFixed(2); };
    out.pressHi=await press(95); out.pressLo=await press(30);
    out.runHi=await run(99,30); out.runLo=await run(30,99); fw.v186r_ctrl=df.v186r_tkl=null; V186R.feint=feint0;
    /* R4 first touch: the same pass received by a poor and a clean controller */
    const mid=P.find(p=>p.pid==='L07'); const touch=async(ctrl)=>{ mid.v186r_pace=60; mid.v186r_ctrl=ctrl; const pk=[];
      for(let i=0;i<4;i++){ st.fl=null; st.own=fw; st.hands=false; fw.ov={x:48,y:30}; mid.ov={x:62,y:40}; await st.until(()=>dist2(fw,fw.ov)<0.5&&dist2(mid,mid.ov)<0.5,4000); await st.wait(300);
        await st.launch(fw,{home:mid,dur:st.D(520),h:0.2}); const t0=st.now; let mx=0; await st.until(()=>{ if(st.own===mid&&!st.fl){ const f=st.footOf(mid); mx=Math.max(mx,Math.hypot(st.ball.x-f.x,st.ball.y-f.y)); } return st.now-t0>Math.max(140,st.D(420)); },3000); pk.push(+mx.toFixed(2)); }
      mid.ov=fw.ov=null; return pk; };
    out.ftLo=await touch(20); out.ftHi=await touch(95); mid.v186r_ctrl=mid.v186r_pace=null;
    /* R5 + D3: misses by finishing and distance */
    const sh=P.find(p=>p.pid==='L08'); const miss=(fin,dist,how)=>{ sh.v186r_pace=60; sh.v186r_fin=fin; const r=[]; for(let i=0;i<60;i++){ sh.x=105-dist; sh.y=34; st.ball.x=sh.x+0.5; st.ball.y=34; const sg=i%2?1:-1;
        const to=how==='wide'?{x:105.4,y:34+sg*(4.2+Math.random()*2.6),z:0.3}:{x:105.4,y:34,z:2.75+Math.random()}; const e={t:'miss'}; v186rMiss(st,sh,to,e); r.push(how==='wide'?Math.abs(to.y-34):to.z); } return r; };
    const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
    out.miss={hiWide:mean(miss(95,20,'wide'))-3.66, loWide:mean(miss(30,20,'wide'))-3.66, hiOver:mean(miss(95,20,'over')), loOver:mean(miss(30,20,'over')),
      closeWide:Math.max(...miss(30,5,'wide')), closeOver:Math.max(...miss(30,5,'over'))};
    sh.v186r_fin=sh.v186r_pace=null;
    return out; });
  await page.close(); return R; }

async function labThrow(b,n){ const page=await newPage(b); await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ PREFS.renderer='2d'; labRun('throwin'); }); await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0);
  await page.click('[data-a="labSpeed"][data-v="2"]');
  /* every other throw-in, an opponent stands within 3 m of the man who kicks it out (the block case) */
  await page.evaluate(()=>{ const st=App.labSt; let i=0; const T=st.throwIn; st.throwIn=function(){ const o=this.own; if(o&&(i++%2===0)){ const q=[...this.players.values()].find(p=>p.side!==o.side&&!p.gk); q.x=o.x+1.6; q.y=o.y+1.2; q.ov=null; q._px=null; } return T.apply(this,arguments); }; });
  const t0=Date.now(); let shot=0;
  while(Date.now()-t0<90000){ const k=await page.evaluate(()=>V186R.log.thr.length); if(k>=n) break;
    if(!shot&&await page.evaluate(()=>V186R.log.thr.some(t=>t.block))){ await page.waitForTimeout(250); await page.screenshot({path:`${SHOTS}lab_throwin_block.png`}); shot=1; }
    await page.waitForTimeout(100); }
  const r=await collect(page); console.log(`  lab throw-ins: ${r.thr.length} (${r.thr.filter(t=>t.block).length} blocked)`); await page.close(); }

async function live(b,speed,seed,secs,view){ const page=await newPage(b,1280,800); await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Realism'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(v=>{ PREFS.walkout=false; PREFS.replays=false; PREFS.renderer='2d'; PREFS.view=v; },view||'broadcast'); await page.evaluate(MON);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
  await page.click(`[data-a="pvSpeed"][data-v="${speed}"]`).catch(()=>{}); await page.click('[data-a="kickoff"]');
  const t0=Date.now(); let shot=0;
  while(Date.now()-t0<secs*1000){ if(await page.$('#lv-ht .htbox')) await page.click('#ht-go').catch(()=>{}); if(await page.$('#lv-cont')) break;
    if(!shot){ const m=await page.evaluate(()=>{ const st=App.live&&App.live.stage; return st&&st.offMark&&st.offMark.v186?st.now-st.offMark.t:null; });
      if(m!=null&&m>120){ await page.screenshot({path:`${SHOTS}live_${seed}_${speed}x_${view||'broadcast'}.png`}); shot=1; } }
    await page.waitForTimeout(200); }
  const st=await page.evaluate(()=>({min:App.live&&App.live.M.min,stat:App.live&&App.live.stage&&App.live.stage._v186offStat}));
  const r=await collect(page); if(st.stat){ calls+=st.stat.calls; fb+=st.stat.fb; }
  console.log(`  live ${seed} ${speed}x ${view||'broadcast'}: to ${st.min}', ${r.off.length} calls (${JSON.stringify(st.stat)}), ${r.thr.length} throw-ins, ${r.miss.length} misses, ${((Date.now()-t0)/1000).toFixed(0)} s`);
  await page.close(); }

(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  require('fs').mkdirSync(SHOTS,{recursive:true});
  if(part==='lab'||part==='all'){
    const R=await labRatings(b); console.log('  ratings',JSON.stringify(R));
    const g=R.gap, q=R.eq; ok(g.ta&&g.tc&&g.tc/g.ta>=1.12, `pace 99 vs 50 over 30 m: ${g.ta} vs ${g.tc} ms (ratio ${(g.tc/g.ta).toFixed(3)}); first 5 m ${g.a5} vs ${g.c5} ms`);
    ok(q.ta&&q.tc&&Math.abs(q.tc/q.ta-1)<0.03, `equal pace runs level (${q.ta} vs ${q.tc} ms)`);
    ok(R.duelHi.tries>=15&&R.duelHi.beats/R.duelHi.tries>=0.85, `take-on, control 95 vs tackling 40: tries ${R.duelHi.tries}/60, beats ${R.duelHi.beats}`);
    ok(R.duelLo.tries<=20&&R.duelLo.beats/Math.max(1,R.duelLo.tries)<=0.15, `take-on, control 40 vs tackling 95: tries ${R.duelLo.tries}/60, beats ${R.duelLo.beats}`);
    ok(R.runHi.n>0&&R.runHi.past>=Math.ceil(R.runHi.beat*0.6)&&(R.runLo.n===0||R.runLo.past<=R.runLo.n-R.runLo.beat), `dribbles past a defender: strong dribbler ${R.runHi.past}/${R.runHi.n} (beat ${R.runHi.beat}), weak ${R.runLo.past}/${R.runLo.n} (beat ${R.runLo.beat})`);
    ok(R.pressLo-R.pressHi>=0.35, `a good tackler presses tighter: tackling 95 stands ${R.pressHi} m from the carrier, tackling 30 ${R.pressLo} m`);
    const mL=Math.max(...R.ftLo), mH=Math.max(...R.ftHi), avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
    ok(avg(R.ftLo)-avg(R.ftHi)>=0.35&&mL<=1.4, `first touch: control 20 runs ${avg(R.ftLo).toFixed(2)} m off the foot (max ${mL}), control 95 ${avg(R.ftHi).toFixed(2)} m (max ${mH})`);
    const M=R.miss; ok(M.hiWide<=1.2&&M.loWide>=2.0, `wide misses from 20 m: finishing 95 ${M.hiWide.toFixed(2)} m beyond the post, finishing 30 ${M.loWide.toFixed(2)} m`);
    ok(M.loOver>M.hiOver+0.4, `over the bar from 20 m: finishing 95 z ${M.hiOver.toFixed(2)}, finishing 30 z ${M.loOver.toFixed(2)}`);
    ok(M.closeWide<=4.7&&M.closeOver<=3.0, `misses from 5 m stay close: widest ${M.closeWide.toFixed(2)} (|y-34|), highest z ${M.closeOver.toFixed(2)}`);
    for(const [sp,mode,n] of [[1,'broadcast',2],[2,'sideline',2],[4,'tactical',2],[8,'broadcast',3]]) await labOffside(b,sp,mode,n);
    await labThrow(b,4);
  }
  if(part==='live'||part==='all'){
    const runs=QUICK?[[8,'v186probe',200],[4,'v186probe2',200]]:[[8,'v186probe',260],[8,'realism-b',260],[4,'v186probe2',260],[2,'realism-c',150,'sideline'],[1,'realism-d',120]];
    for(const [sp,seed,secs,view] of runs) await live(b,sp,seed,secs,view);
  }
  const lines=allOff.filter(o=>o.mL!=null), fbs=allOff.filter(o=>o.fb), nCalls=lines.length+fbs.length;
  const mins=k=>lines.length?Math.min(...lines.map(o=>o[k])):NaN;
  console.log(`  offside calls with a freeze line: ${lines.length}; margins at release (min / mean): defender ${mins('mD').toFixed(2)} / ${(lines.reduce((s,o)=>s+o.mD,0)/Math.max(1,lines.length)).toFixed(2)} m, ball ${mins('mB').toFixed(2)} m, halfway ${mins('half').toFixed(1)} m; by speed ${JSON.stringify(lines.reduce((m,o)=>{ const k=o.ts>=0.7?'1x':o.ts>=0.35?'2x':o.ts>=0.18?'4x':'8x'; m[k]=(m[k]||0)+1; return m; },{}))}`);
  console.log(`  fallbacks (no line): ${fbs.length} ${JSON.stringify(fbs.map(o=>o.fb))}`);
  ok(lines.length>=8, `offside calls with a freeze line seen (${lines.length})`);
  ok(lines.every(o=>o.mD>=0.5&&o.mB>=0.5&&o.half>0), `every flagged runner is beyond the second-last defender and the ball at release (worst ${mins('mD').toFixed(2)} / ${mins('mB').toFixed(2)} m)`);
  ok(lines.every(o=>Math.abs(o.markX-o.lineX)<0.05&&o.ax===o.px), 'the defender line is drawn at the line at release and the attacker line at the runner');
  ok(allDev.length>0&&Math.max(...allDev)<=0.3, `the second-last defender stays on the drawn line while it shows (worst ${allDev.length?Math.max(...allDev).toFixed(3):'-'} m over ${allDev.length} lines)`);
  ok(fbs.filter(o=>!o.skip).length<=Math.max(1,Math.floor(nCalls*0.1)), `calls without a picture stay rare (${fbs.length} of ${nCalls})`);
  ok(leaks===0, `no hold is left on a defender after a call (${leaks})`);
  const thrBad=allThr.filter(t=>t.side===t.kicker&&!t.block);
  ok(allThr.length>0&&thrBad.length===0&&(part!=='lab'||allThr.some(t=>t.block)), `throw-ins: the team that put it out never takes it unblocked (${allThr.length} throw-ins, ${allThr.filter(t=>t.block).length} blocked, ${thrBad.length} wrong)`);
  const close=allMiss.filter(m=>m.d<9); ok(close.every(m=>m.how==='post'||m.how==='bar'||Math.abs(m.y-34)<=4.7||m.z<=3.0), `close-range misses stay close (${close.length}: ${close.map(m=>m.how+' '+(m.how==='over'?m.z:m.y)).join(', ')})`);
  ok(capMis===0, `miss and save captions match the commentary category (${capN} checked, ${capMis} mismatched)`);
  const gpOff=goalPass.filter(m=>m>0.2); console.log(`  goal-sequence forward passes: ${goalPass.length}, receiver beyond the line at release: ${gpOff.length} ${JSON.stringify(gpOff)}`);
  if(part!=='lab') ok(gpOff.length===0, `goal sequences: no forward pass to an offside receiver (${gpOff.length} of ${goalPass.length})`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0); })();
