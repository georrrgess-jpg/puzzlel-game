// v18.6 skill moves (src/v17/81_skills.js). Run from touchline/: node test/skills.js   (SKIP_LIVE=1 skips the two live matches)
// 1. picker: the level and the flair rating change the repertoire and how often a move is tried (Modified < JV < Varsity,
//    low < high flair); execution quality q; how far a defender bites.
// 2. lab, stepped deterministically in 2-D (seeded Math.random, fixed 120 Hz steps): every move occurs in its scene; the ball
//    stays within reach of a foot and never jumps (per-step motion beyond the carrier's own bounded); the touching foot is at the
//    ball at the move's touch; the defender reacts (sold: the lunge foot goes the wrong way; frozen; turned, and a big rating gap
//    makes him stumble); the carrier's path and the leg's end are identical with the moves on and off (no event timing change);
//    a Modified player performs the same move slower.
// 3. live (2x, same seed, moves on and off): identical engine event lists; moves happen; none at 4x; no page errors.
const { chromium } = require('./_pw'); const DIST=process.env.V186DIST||require('./_pw').DIST;
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); if(m.type()==='warning'&&/v18\.6/.test(m.text())) errs.push('warn: '+m.text()); });
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);

  /* ---------- 1. picker ---------- */
  const P=await page.evaluate(()=>{ let s=12345; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
    const sits=[]; for(const turn of [0.1,0.3,1.0,1.3,1.8,2.2,2.6,3.0]) for(const d of [1.6,2.4,3.4,5,null]) for(const sp of [2.5,4,5.5]) sits.push({turn,d,sp,n5:1});
    const run=(lvl,fl,n)=>{ const seen={}; let picks=0, tries=0; for(let i=0;i<n;i++){ const S=sits[i%sits.length]; tries++; const k=v186sPick(lvl,fl,S,rnd); if(k){ picks++; seen[k]=(seen[k]||0)+1; } } return {seen,rate:picks/tries}; };
    const o={MOD40:run('MOD',40,6000),JV65:run('JV',65,6000),V95:run('V',95,6000),V70:run('V',70,6000),JV51:run('JV',51,6000),MOD39:run('MOD',39,6000),MOD58:run('MOD',58,6000),V40:run('V',40,6000)};
    const share=(S,ks)=>{ let n=0,h=0; for(let i=0;i<8000;i++){ const k=v186sPick('V',90,S,rnd); if(k){ n++; if(ks.includes(k)) h++; } } return n?h/n:0; };
    o.sit={open:share({turn:0.2,d:2.4,sp:3.5,n5:1,vc:-1},['step1','step2']),crowd:share({turn:0.2,d:2.4,sp:3.5,n5:4,vc:-1},['step1','step2']),charge:share({turn:2.8,d:2.2,sp:3,n5:1,vc:3},['cruyff','drag']),calm:share({turn:2.8,d:2.2,sp:3,n5:1,vc:0},['cruyff','drag'])};
    o.rep={MOD40:v186sRepertoire('MOD',40),MOD55:v186sRepertoire('MOD',55),JV65:v186sRepertoire('JV',65),V95:v186sRepertoire('V',95)};
    o.q={MOD:v186sQ(70,'MOD'),JV:v186sQ(70,'JV'),V:v186sQ(70,'V'),lo:v186sQ(40,'V'),hi:v186sQ(90,'V')};
    o.bite={hi:v186sBite(96,48,1),mid:v186sBite(75,72,v186sQ(75,'V')),lo:v186sBite(45,85,v186sQ(45,'V'))}; return o; });
  const keys=o=>Object.keys(o.seen).sort().join(',');
  ok(Object.keys(P.MOD40.seen).every(k=>['feint','cut','drag'].includes(k))&&P.MOD40.rate>0, `Modified flair 40 only uses the feint, outside cut and drag-back (${keys(P.MOD40)})`);
  ok(P.rep.MOD55.includes('step1')&&!P.rep.MOD55.includes('chop')&&!P.rep.MOD55.includes('cruyff'), `Modified's best (55) add a stepover, never the chop or Cruyff (${P.rep.MOD55.join(',')})`);
  ok(P.JV65.seen.cruyff>0&&P.JV65.seen.chop>0&&P.JV65.seen.step1>0&&!P.JV65.seen.step2&&!P.JV65.seen.roll, `JV 65 adds the chop, Cruyff and stepover, not yet the double stepover or sole roll (${keys(P.JV65)})`);
  ok(['feint','step1','step2','roll','cut','chop','drag','cruyff'].every(k=>P.V95.seen[k]>0), `a Varsity star (95) uses the full set (${keys(P.V95)})`);
  ok(P.V95.rate>P.V70.rate&&P.V70.rate>P.JV51.rate&&P.JV51.rate>P.MOD39.rate, `moves are tried more often with level and flair: V95 ${P.V95.rate.toFixed(3)} > V70 ${P.V70.rate.toFixed(3)} > JV51 ${P.JV51.rate.toFixed(3)} > MOD39 ${P.MOD39.rate.toFixed(3)}`);
  ok(P.V40.rate<P.V95.rate*0.6, `low flair tries far fewer than high flair at the same level (V40 ${P.V40.rate.toFixed(3)} vs V95 ${P.V95.rate.toFixed(3)})`);
  ok(P.V95.rate<0.4, `moves stay special: even a Varsity star tries one on ${(P.V95.rate*100).toFixed(1)} % of fitting legs (cooldown on top)`);
  ok(P.sit.crowd<P.sit.open&&P.sit.charge>=P.sit.calm, `the situation shapes the choice: stepovers ${(P.sit.open*100).toFixed(0)} % in space vs ${(P.sit.crowd*100).toFixed(0)} % in a crowd; the Cruyff/drag-back against a charging defender ${(P.sit.charge*100).toFixed(0)} % vs ${(P.sit.calm*100).toFixed(0)} %`);
  ok(P.q.MOD<P.q.JV&&P.q.JV<P.q.V&&P.q.lo<P.q.hi, `execution quality: MOD ${P.q.MOD.toFixed(2)} < JV ${P.q.JV.toFixed(2)} < V ${P.q.V.toFixed(2)}; flair 40 ${P.q.lo.toFixed(2)} < 90 ${P.q.hi.toFixed(2)}`);
  ok(P.bite.hi>=0.9&&P.bite.lo<=0.3&&P.bite.mid>P.bite.lo&&P.bite.mid<P.bite.hi, `defender bite: 96 vs 48 ${P.bite.hi.toFixed(2)}, 75 vs 72 ${P.bite.mid.toFixed(2)}, 45 vs 85 ${P.bite.lo.toFixed(2)}`);

  /* ---------- 2. lab, stepped ---------- */
  await page.evaluate(()=>{ PREFS.renderer='2d'; labRun('none'); });
  await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>20,null,{timeout:20000}); await page.waitForTimeout(2500);
  const L=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; st.sfx=false; const H=1000/120; const R0=Math.random;
    const Pl=[...st.players.values()]; const A=Pl.filter(p=>p.side===0), B=Pl.filter(p=>p.side===1); const fw=A[9], def=B[3];
    const footW=(p,P,i)=>{ const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw), hs=1.06*(p.hgt||70)/70, F=P.feet[i]; return {x:p.x+(F.f*ca-F.l*sa)*hs, y:p.y+(F.f*sa+F.l*ca)*hs}; };
    const clear=q=>{ for(const k of Object.keys(q)) if(k.startsWith('v186')&&k!=='v186fl'&&k!=='v186lv'&&k!=='v186ds') q[k]=null; };
    function legRun(kind,on,cfg){ let s=777; Math.random=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
      try{ V186S.on=on; st._v186lab=true; st.demoCalm=false; st._v186R=null; st._v186leg=null; st._v186mt=null;
        st._v186force=on&&v186sKnows(kind,cfg.lv,cfg.fl)?kind:null;
        for(const q of Pl){ clear(q); q.chase=null; q.meet=null; q.trail=null; q.glide=null; q.trip=-9e9; q.slideT=-9e9; q.jumpT=-9e9; q.kickT=-9e9; q.v184=null; q.v184L=null; q.yawLock=null;
          if(q!==fw&&q!==def){ q.ov={x:q.gk?(q.side===0?2:103):(q.side===0?20+q.slot.y*0.1:88+q.slot.y*0.1),y:q.gk?34:q.slot.y*0.68}; q.x=q.ov.x; q.y=q.ov.y; q.vx=q.vy=0; } }
        fw.v186fl=cfg.fl; fw.v186lv=cfg.lv; def.v186ds=cfg.ds; def.v186lv=cfg.lv;
        const turn=!!V186S_MV[kind].turn;
        Object.assign(fw,{x:46,y:44,vx:0,vy:0,ph:0,yaw:0,face:1,spd:0,gv:0,acS:0,turnLean:0,ov:null,slow:false,_mv:false,_pose:null});
        Object.assign(def,{x:turn?57.5:60,y:44,vx:0,vy:0,yaw:Math.PI,face:-1,spd:0,gv:0,ov:turn?null:{x:59,y:44},_pose:null});
        st.own=fw; st.hands=false; st.fl=null; st.placed=false; st.headBall=null; st.cush=null; st.so=false; st.skip=false; st.ts=0.85; st.ball={x:46.5,y:44.05,z:0,spin:0};
        const rec={path:[],legEnd:[],kinds:{},ballBad:0,ballMax:0,reachMax:0,footMin:9,contact:null,react:null,lunge:0,trip:false,T:null,u1:false,abort:false,steps:0};
        const step=()=>{ const bx=st.ball.x, by=st.ball.y, px=fw.x, py=fw.y; st.keepPrev(); st.now+=H; st.update(H/1000); rec.steps++;
          rec.path.push([fw.x,fw.y]);
          if(on){ const k=fw.v186k; if(k){ rec.kinds[k]=1; if(rec.T==null) rec.T=fw.v186T; const C=v186sClock(st,fw); if(fw.v186ab!=null) rec.abort=true;
              if(C&&C.u>0){ const P=st.poseOf(fw); const b=st.ball; const d=Math.hypot((b.x-bx)-(fw.x-px),(b.y-by)-(fw.y-py)); if(d>rec.ballMax) rec.ballMaxU=+C.m.toFixed(2); rec.ballMax=Math.max(rec.ballMax,d); if(d>0.06) rec.ballBad++;
                const f0=footW(fw,P,0), f1=footW(fw,P,1); const fm=Math.min(Math.hypot(b.x-f0.x,b.y-f0.y),Math.hypot(b.x-f1.x,b.y-f1.y)); const wb=v186sBallPlan(fw,C.u,C.m)[2]; rec.footMin=Math.min(rec.footMin,fm); if(wb>0.5&&fm>rec.reachMax) rec.reachU=+C.m.toFixed(2); if(wb>0.5) rec.reachMax=Math.max(rec.reachMax,fm);
                const tu=v186sTouchU(fw); if(rec.contact==null&&C.m>=tu){ const i=v186sTouchFoot(fw); const f=footW(fw,P,i); rec.contact={d:Math.hypot(b.x-f.x,b.y-f.y),i,u:+C.u.toFixed(2)}; }
                if(C.u>=0.95) rec.u1=true; } }
            if(def.v186rT!=null){ if(!rec.react) rec.react={k:def.v186rk,t:def.v186rT,b:def.v186rb}; const t=st.now-def.v186rT; if(t>=0&&t<=Math.max(250,st.D(250))&&def.v186rk==='sold'){ const on1=st.poseOf(def); V186S.on=false; const off1=st.poseOf(def); V186S.on=true;
                const yaw=def.yaw==null?((def.face||1)>0?0:Math.PI):def.yaw; const side=Math.sin(def.v186rs-yaw)>=0?1:-1; const i=side>0?1:0; rec.lunge=Math.max(rec.lunge,(on1.feet[i].l-off1.feet[i].l)*side); }
              if(def.trip===def.v186rT) rec.trip=true; } } };
        const leg=(x,y,ms,n)=>{ st.dribble(fw,x,y,ms); let i=0; for(;i<n;i++){ step(); if(def.ov&&Math.hypot(fw.x-def.x,fw.y-def.y)<4.2&&!turn) def.ov=null; if(Math.hypot(fw.x-x,fw.y-y)<0.6) break; } rec.legEnd.push(rec.steps); };
        for(let i=0;i<30;i++) step();
        if(!turn) leg(70,44.5,2400,900);
        else { const ty=kind==='cut'?{x:58,y:36}:kind==='chop'?{x:47,y:38}:{x:44,y:44.3}; leg(54,44,900,400); leg(ty.x,ty.y,1600,600); }
        for(let i=0;i<60;i++) step();
        return rec; } finally{ Math.random=R0; V186S.on=true; } }
    const out={}; const V={fl:95,lv:'V',ds:50}, MOD={fl:40,lv:'MOD',ds:45};
    for(const k of ['feint','step1','step2','roll','cut','chop','drag','cruyff']){ const a=legRun(k,true,V), b=legRun(k,false,V); let dp=0; for(let i=0;i<Math.min(a.path.length,b.path.length);i++) dp=Math.max(dp,Math.hypot(a.path[i][0]-b.path[i][0],a.path[i][1]-b.path[i][1]));
      out[k]={ballMaxU:a.ballMaxU,reachU:a.reachU,kinds:Object.keys(a.kinds),u1:a.u1,abort:a.abort,ballBad:a.ballBad,ballMax:+a.ballMax.toFixed(3),reachMax:+a.reachMax.toFixed(2),contact:a.contact,react:a.react,lunge:+a.lunge.toFixed(2),trip:a.trip,T:a.T,dp,legs:a.legEnd.join('/')+' vs '+b.legEnd.join('/'),sameLegs:a.legEnd.join()===b.legEnd.join()&&a.path.length===b.path.length}; }
    for(const k of ['drag','cut','feint']){ const a=legRun(k,true,MOD); out['MOD_'+k]={kinds:Object.keys(a.kinds),T:a.T,react:a.react,ballBad:a.ballBad}; }
    const m=legRun('cruyff',true,MOD); out.MOD_cruyff={kinds:Object.keys(m.kinds)};
    return out; });
  for(const k of ['feint','step1','step2','roll','cut','chop','drag','cruyff']){ const r=L[k];
    ok(r.kinds.includes(k)&&r.u1&&!r.abort, `${k}: occurs in its lab scene and runs to the end`);
    ok(r.ballBad===0&&r.reachMax<0.9, `${k}: the ball stays within reach of a foot while the move carries it (farthest ${r.reachMax} m) and never jumps (largest step beyond his own ${r.ballMax} m)`);
    ok(r.contact&&r.contact.d<=0.3, `${k}: the touching foot is at the ball at the touch (${r.contact?r.contact.d.toFixed(2)+' m, foot '+r.contact.i+' at u '+r.contact.u:'no touch'})`);
    const want=V186S_REACT_T[k]; ok(r.react&&r.react.k===want, `${k}: the defender reacts (${r.react?r.react.k+' bite '+(+r.react.b).toFixed(2):'none'}; expected ${want})`);
    ok(r.dp<1e-6&&r.sameLegs, `${k}: the carrier's path and the leg's end are identical with the move on and off (max diff ${r.dp.toExponential(1)} m, legs end at steps ${r.legs})`); }
  ok(L.step1.lunge>=0.25&&L.step2.lunge>=0.25, `a sold defender's lunge foot goes the wrong way within 250 ms (step1 ${L.step1.lunge}, step2 ${L.step2.lunge} body units)`);
  ok(L.chop.trip&&L.cruyff.trip, `a turned defender with a big rating gap stumbles (chop ${L.chop.trip}, Cruyff ${L.cruyff.trip})`);
  ok(L.MOD_drag.kinds.includes('drag')&&L.MOD_drag.T>L.drag.T*1.25&&L.MOD_cut.T>L.cut.T*1.25, `Modified performs the same move slower (drag-back ${Math.round(L.MOD_drag.T)} vs ${Math.round(L.drag.T)} ms, cut ${Math.round(L.MOD_cut.T)} vs ${Math.round(L.cut.T)} ms)`);
  ok(L.MOD_feint.kinds.includes('feint')&&L.MOD_feint.react&&L.MOD_feint.react.b<0.5&&L.feint.react.b>0.9, `the same feint sells a 45 defender far less from a Modified 40 (bite ${L.MOD_feint.react?(+L.MOD_feint.react.b).toFixed(2):'-'}) than from a Varsity 95 (${(+L.feint.react.b).toFixed(2)})`);
  ok(!L.MOD_cruyff.kinds.length, `a Modified 40 never does a Cruyff turn, even when the lab asks (${L.MOD_cruyff.kinds.join(',')||'none'})`);
  console.log('  lab detail: '+JSON.stringify(Object.fromEntries(Object.entries(L).map(([k,v])=>[k,{T:v.T&&Math.round(v.T),c:v.contact&&+v.contact.d.toFixed(2),b:v.ballMax,bu:v.ballMaxU,r:v.reachMax,ru:v.reachU}]))));

  /* ---------- 2b. a solo goal's SKILL! moment becomes a named move at the beaten defender (real time) ---------- */
  const solo=await page.evaluate(async()=>{ const st=App.labSt; st.paused=false; st.sfx=false; V186S.solo=1; st._v186force=null; st._v186seq=null; const Pl=[...st.players.values()]; const A=Pl.filter(p=>p.side===0); const fw=A[9];
    fw.v186fl=95; fw.v186lv='V'; st._v186R=null; for(const q of Pl) q.ov=null; const caps=[]; st.onCaption=(t)=>caps.push(t); st.own=fw; st.hands=false; st.fl=null; st.placed=false; fw.x=40; fw.y=34; st.ball={x:40.5,y:34.05,z:0,spin:0};
    const before=(st._v186log||[]).length; const e={s:0,pid:fw.pid,t:'goal',ty:'solo',seq:[{pid:fw.pid,x:50,y:68,a:'run'},{pid:fw.pid,x:50,y:88,a:'shot'}],sc:[1,0],m:10};
    const g=st.goalSequence(e); const t0=performance.now(); while(performance.now()-t0<20000){ await new Promise(r=>setTimeout(r,100)); if(caps.length>=2||(st._v186log||[]).length>before) { await new Promise(r=>setTimeout(r,1500)); break; } }
    const log=(st._v186log||[]).slice(before); st.cancel(); await g.catch(()=>{}); V186S.solo=0.7; return {caps,log,cap0:st.onCaption===undefined}; });
  const names=Object.values(V186S_CAPS);
  ok(solo.caps.some(c=>names.includes(c))&&!solo.caps.includes('SKILL!')&&solo.log.length>0&&solo.log[0].def, `a solo goal names the move instead of the hurdle (captions ${solo.caps.join(' / ')}; move ${solo.log.map(x=>x.k+' at '+x.def).join(',')})`);

  /* ---------- 3. live: identical engine events with the moves on and off; moves happen; none at 4x ---------- */
  if(!process.env.SKIP_LIVE){
    const live=async(on,mins)=>{ const pg=await browser.newPage({viewport:{width:1280,height:800}}); pg.on('pageerror',e=>errs.push('live pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
      await pg.goto(DIST); await pg.waitForTimeout(600);
      await pg.click('[data-a="newCareerForm"][data-slot="1"]'); await pg.fill('#nc-name','Skills Coach'); await pg.fill('#nc-seed','skills186');
      await pg.click('[data-a="ncNext"]'); await pg.waitForTimeout(200); await pg.click('[data-a="createCareer"]'); await pg.waitForTimeout(800);
      await pg.evaluate(on=>{ V186S.on=on; const ev=window.__ev=[]; const E0=window.liveEmit; window.liveEmit=function(e){ if(e&&e.t) ev.push([e.t,e.m,e.pid||'',e.s,e.sc?e.sc.join('-'):''].join('|')); return E0.apply(this,arguments); }; },on);
      await pg.click('.cta [data-a="playNext"]'); await pg.waitForTimeout(400); await pg.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await pg.click('[data-a="kickoff"]');
      const t0=Date.now(); let mm=0;
      while(Date.now()-t0<150000){ mm=await pg.evaluate(()=>{ const L=App.live; return L&&L.M?L.M.min:(window.__ev.length?+window.__ev[window.__ev.length-1].split('|')[1]:0); }); if(mm>=mins) break; if(await pg.$('#lv-ht .htbox')) break; await pg.waitForTimeout(500); }
      const r=await pg.evaluate(()=>{ const st=App.live&&App.live.stage; return {ev:window.__ev.slice(),n:st?st._v186n||0:0,log:st?(st._v186log||[]).map(x=>x.k+(x.keep?'':'(read)')):[],min:App.live&&App.live.M?App.live.M.min:null}; });
      let fast=null; if(on){ await pg.click('[data-a="liveSpeed"][data-v="4"]').catch(()=>{}); await pg.waitForTimeout(800); const n0=await pg.evaluate(()=>App.live.stage._v186n||0); await pg.waitForTimeout(12000); const n1=await pg.evaluate(()=>App.live.stage._v186n||0); fast={n0,n1}; }
      await pg.close(); return {...r,fast,mm}; };
    const a=await live(true,22), b=await live(false,22);
    const upto=Math.min(a.mm,b.mm)-1; const cut=x=>x.ev.filter(s=>+s.split('|')[1]<=upto);
    console.log(`  live: on ${a.ev.length} events to minute ${a.mm}, off ${b.ev.length} to ${b.mm}; moves ${a.n}: ${a.log.join(' ')}`);
    ok(upto>=8&&cut(a).join('\n')===cut(b).join('\n')&&cut(a).length>0, `live 2x: the engine's events (type, minute, player, side, score) are identical with the moves on and off up to minute ${upto} (${cut(a).length} events)`);
    ok(a.n>0, `live 2x: moves happen in a real match (${a.n} in ${a.mm} minutes)`);
    ok(a.fast&&a.fast.n1===a.fast.n0, `live 4x: no moves start (${a.fast?a.fast.n1-a.fast.n0:'-'})`);
  }
  const gate=await page.evaluate(()=>{ const st=App.labSt; const p=[...st.players.values()].find(q=>q===st.own)||[...st.players.values()][9]; st.own=p; st.hands=false; st.fl=null; st.placed=false; const o={};
    st.rm=true; o.rm=v186sCan(st,p); st.rm=false; st.skip=true; o.skip=v186sCan(st,p); st.skip=false; st.ts=0.27; o.fast=v186sCan(st,p); st.ts=0.85; st.so=true; o.so=v186sCan(st,p); st.so=false; o.ok=v186sCan(st,p); return o; });
  ok(!gate.rm&&!gate.skip&&!gate.fast&&!gate.so&&gate.ok, `gating: no moves under reduced motion, skipping, 4x/8x or shootouts (${JSON.stringify(gate)})`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
const V186S_CAPS={feint:'BODY FEINT!',step1:'STEPOVER!',step2:'DOUBLE STEPOVER!',roll:'SOLE ROLL!'};
const V186S_REACT_T={feint:'freeze',step1:'sold',step2:'sold',roll:'sold',cut:'turned',chop:'turned',drag:'turned',cruyff:'turned'};
