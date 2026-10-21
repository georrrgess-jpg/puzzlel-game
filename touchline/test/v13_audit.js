// Measures the broadcast's football: full matches from the real engine, staged on the real Stage on a stepped clock
// (same code path as the live screen, much faster than real time). Works on any build, so old and new can be compared.
// Usage: node test/v13_audit.js FILE W MATCHES
const { chromium } = require('./_pw');
const FILE=process.argv[2]||require('./_pw').DIST.replace('file://',''), W=+(process.argv[3]||1500), N=+(process.argv[4]||3);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const page=await b.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+FILE); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Audit'); await page.fill('#nc-seed','v13audit'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(700);
  const res=await page.evaluate(async([W,N])=>{
    const C=App.C; const A={passes:0,ground:0,through:0,through2:0,lofted:0,toTeammate:0,offAtPass:0,offEvents:0,offStaged:0,quick:0,throwIns:0,throwPose:0,corners:0,headers:0,headKick:0,crossNod:0,brk:0,brkOk:0,arErr:0,arN:0,stageSecs:0,minutes:0,matches:0,emits:{},goals:0,brkD:[]};
    const offLineOf=(st,att)=>{ const xs=[]; for(const q of st.players.values()) if(q.side!==att&&!q.off) xs.push(q.x); if(att===0){ xs.sort((a,b)=>b-a); return Math.max(xs.length>1?xs[1]:105,st.ball.x,52.5); } xs.sort((a,b)=>a-b); return Math.min(xs.length>1?xs[1]:0,st.ball.x,52.5); };
    const host=document.createElement('div'); host.style.cssText='position:fixed;left:0;top:0;width:900px;height:520px;z-index:99999'; const cv=document.createElement('canvas'); host.appendChild(cv); document.body.appendChild(host);
    const P=Stage.prototype; const L0=P.launch;
    P.launch=function(p,o){ const st=this; st._kickSide=p?p.side:(o.home?1-o.home.side:st._kickSide); st._kickKind=o.kind||'pass'; st._kickHome=o.home||null; const prom=L0.call(this,p,o);
      if(p&&o.home&&o.home.side===p.side&&!(this.hands&&this.own===p&&p.gk)){ const H=o.home; const rel=()=>{ A.toTeammate++; const L=offLineOf(st,p.side); const off=p.side===0?H.x>L+0.2:H.x<L-0.2; if(off&&!H.offRun) A.offAtPass++; };
        const chk=setInterval(()=>{},1e9); clearInterval(chk); const f0=st.fl; const t0=st.now; st._relHook=st._relHook||[]; st._relHook.push({p,H,o,rel,t0}); }
      return prom; };
    const R0=P.update; P.update=function(dt){ R0.call(this,dt); const st=this; const f=st.fl;
      if(st._relHook&&st._relHook.length&&f&&!f.phys){ for(const h of st._relHook.splice(0)){ if(f.home===h.H){ h.rel(); A.passes++; if(f.ground) A.ground++; else A.lofted++; f._aud={hit:new Set()}; } } }
      if(f&&!f.phys&&f._aud&&f.ground&&st.ball.z<0.45){ for(const q of st.players.values()){ if(q.off||q===f.home||q.side===f.home.side) continue; if(Math.hypot(q.x-st.ball.x,q.y-st.ball.y)<0.75) f._aud.hit.add(q); } }
      if(f&&f._aud&&!f._done&&(st.now-f.t0)>=f.dur-1){ f._done=1; const n=f._aud.hit.size; if(n>=1) A.through++; if(n>=2) A.through2++; }
      /* any ball on the ground passing through an opponent of the side that played it (not his marker at the very end, not the keeper) */
      { const b=st.ball; const live=(f&&(f.phys||(st.now-f.t0)<f.dur*0.9&&(st.now-f.t0)>f.dur*0.08)); const ks=st._kickSide; const key=f?(f.phys?'loose':(f.kind||'pass')):null;
        if(live&&b.z<0.45&&ks!=null){ for(const q of st.players.values()){ if(q.off||q.side===ks||q===st._kickHome||q.gk) continue; if(Math.hypot(q.x-b.x,q.y-b.y)<0.6){ const id=(f.t0||0)+':'+q.pid; A.lowSeen=A.lowSeen||new Set(); if(!A.lowSeen.has(id)){ A.lowSeen.add(id); A.lowThrough=A.lowThrough||{}; A.lowThrough[key]=(A.lowThrough[key]||0)+1; } } } }
        if(f&&!f._cnt){ f._cnt=1; A.flights=A.flights||{}; A.flights[key]=(A.flights[key]||0)+1; } }
      if(st.ars){ for(const a of st.ars){ if(a.flag) continue; const L=Math.min(a.x1,Math.max(a.x0,offLineOf(st,a.att))); A.arErr+=Math.abs(a.x-L); A.arN++; } }
      for(const p of st.players.values()){ if(p.kickK==='throw'&&!p.gk&&st.now-p.kickT<20&&!p._tp){ p._tp=1; A.throwPose++; } if(p.kickK!=='throw') p._tp=0; } };
    if(P.throwIn){ const T0=P.throwIn; P.throwIn=function(){ A.throwIns++; return T0.apply(this,arguments); }; }
    if(P.cornerKick){ const K0=P.cornerKick; P.cornerKick=function(){ A.corners++; return K0.apply(this,arguments); }; }
    if(P.offsideSeq){ const O0=P.offsideSeq; P.offsideSeq=function(){ A.offStaged++; return O0.apply(this,arguments); }; }
    if(P.quickFlag){ const Q0=P.quickFlag; P.quickFlag=function(){ A.quick++; return Q0.apply(this,arguments); }; }
    if(P.breakaway){ const B0=P.breakaway; P.breakaway=async function(e,o,pl,X,Y){ A.brk++; const st=this; const dir=e.s===0?1:-1, gx=e.s===0?105:0;
        const defs=[...st.players.values()].filter(q=>q.side!==e.s&&!q.gk&&!q.off); st._brk={pl,defs,dir}; const r=await B0.apply(this,arguments); return r; }; }
    const F0=P.finish; P.finish=async function(e,pl){ const st=this; if(st._brk&&st._brk.pl===pl){ const {defs,dir}=st._brk; st._brk=null; /* at the shot: is he clear of every defender? */ const m=Math.min(...defs.map(q=>dir*(pl.x-q.x))); A.brkD.push(+m.toFixed(1)); if(m>0) A.brkOk++; } const head=st.headBall===pl||st.ball.z>1.2; const r=F0.apply(this,arguments); if(head){ A.headers++; } return r; };
    const K0=P.kickKind; P.kickKind=function(p,opt){ const k=K0.call(this,p,opt); if(opt&&opt.kind==='shot'&&this.ball.z>1.2&&this.own===p&&k!=='head') A.headKick++; return k; };
    const H=1000/120;
    for(let mi=0;mi<N;mi++){ const fx=userFixture(C); if(!fx) break; const f=C.fixtures[fx.id]; const M=startMatch(C,fx.id,{}); M.htOn=false;
      const st=new Stage(cv,{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:'broadcast',section:C.section,relabel:true,emit:e=>{ A.emits[e.t]=(A.emits[e.t]||0)+1; }});
      st.paused=true; st.setSides(M.sides); for(let i=0;i<2;i++) st.setKeeper(i,M.sides[i].gk); st.kickoffShape(0); st.snap();
      const step=async ms=>{ for(let t=0;t<ms;t+=H){ st.keepPrev(); st.now+=H; st.update(H/1000); await null; await null; } };
      const run=async p=>{ let done=false; p.then(()=>done=true,()=>done=true); let g=0; while(!done&&g<200000){ await step(H*4); g++; } };
      const t0=st.now; let guard=0;
      while(M.phase!=='ft'&&guard++<200){ if(M.phase==='ht'){ resumeSecondHalf(M,'none'); st.halftime(); }
        const out=stepMatch(C,M); A.minutes++; const goals=out.filter(e=>e.t==='goal'); A.offEvents+=out.filter(e=>e.t==='offside').length;
        if(out.some(e=>e.t==='so')||out.some(e=>e.t==='kick')) break;
        st.goalTs=W>=1500?1:W>=780?0.8:W>=400?0.55:0.4;
        if(goals.length){ st.skip=false; st.ts=Math.min(1.1,Math.max(0.12,W/1500)); for(const e of out.filter(e=>e.t==='save'||e.t==='miss')) await run(st.shotSeq(e)); for(const g of goals){ A.goals++; await run(st.goalSequence(g)); } }
        else await run(st.playMinute(out,M,W)); }
      A.stageSecs+=(st.now-t0)/1000; A.matches++; finishMatch(C,M); st.destroy(); simRound(C); advance(C); }
    host.remove(); return A; },[W,N]);
  delete res.lowSeen; res.arErrAvg=res.arN?+(res.arErr/res.arN).toFixed(2):null; delete res.arErr;
  res.throughPer100=+(res.through/Math.max(1,res.ground)*100).toFixed(1); res.offPassPct=+(res.offAtPass/Math.max(1,res.toTeammate)*100).toFixed(2); res.secsPerMatch=+(res.stageSecs/Math.max(1,res.matches)).toFixed(1);
  console.log(JSON.stringify(res)); console.log(errs.length?'ERRORS\n'+errs.slice(0,6).join('\n'):'ERRORS none'); await b.close(); })();
