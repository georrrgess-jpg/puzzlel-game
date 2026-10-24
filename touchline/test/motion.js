// v18.7 motion (src/v17/83_motion.js). Run from touchline/: node test/motion.js   (SKIP_LIVE=1 skips the live match)
// 1. running style: at the same speed a pace-95 player has a longer stride, more lean and a bigger arm pump than a pace-45 one,
//    and the cadence (p.ph) is the same; neutral players (no ratings) are unchanged.
// 2. fatigue: late in the game (78') the stride is shorter, the body more upright and lower, the arm swing smaller than at 10';
//    high stamina tires less.
// 3. hands on knees at a late stoppage (stepped lab, 2-D): some idle players bend over with the hands on the knees; none early,
//    none in open play; the hands reach the knees.
// 4. a sold defender's planted foot moves < 2 cm on the turf while planted (it slid before).
// 5. the kick's balance arm: elbow bend 30-45 degrees at contact (2-D and 3-D solve), was straight.
// 6. live (2x, minute forced to 78'): hands on knees happen at real stoppages; ratings and stamina are read; no page errors.
const { chromium } = require('./_pw'); const DIST=process.env.V187DIST||require('./_pw').DIST;
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  await page.evaluate(()=>{ PREFS.renderer='2d'; labRun('none'); });
  await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>20,null,{timeout:20000}); await page.waitForTimeout(1500);

  /* ---------- 1 + 2: gait numbers ---------- */
  const G=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; st.sfx=false; const Pl=[...st.players.values()]; const A=Pl.filter(p=>p.side===0); const a=A[9], b=A[8];
    const reset=p=>Object.assign(p,{knelt:false,kickT:-9e9,touchT:-9e9,jumpT:-9e9,slideT:-9e9,trip:-9e9,fallT:-9e9,celeb:false,sad:false,dive:null,v186k:null,v186rT:null,acS:0,turnLean:0,hgt:70,_pose:null,ov:null,chase:null});
    const stats=(p,v)=>{ reset(p); st.own=null; const sm=Math.max(1,st.spdMul||1); Object.assign(p,{spd:v*sm,gv:v,vx:v*sm,vy:0,yaw:0,face:1}); const hs=1.06*70/70; let s=0, lean=0, hip=0, a0=9, a1=-9, n=0;
      for(let k=0;k<96;k++){ p.ph=k/96*2*Math.PI; const P=st.poseOf(p); s=Math.max(s,Math.abs(P.feet[1].f-P.feet[0].f)*hs); lean+=P.lean; hip+=P.hipU; a0=Math.min(a0,P.hands[0].f); a1=Math.max(a1,P.hands[0].f); n++; }
      return {stride:+s.toFixed(3),lean:+(lean/n).toFixed(3),arm:+((a1-a0)*hs).toFixed(3),hip:+(hip/n).toFixed(3),cw:+gaitOf(v,st.spdMul||1).cw.toFixed(3)}; };
    const o={}; st.v187mMinF=10;
    a.v186r_pace=95; b.v186r_pace=45; a.v187m_sta=b.v187m_sta=50;
    o.fast=stats(a,6.5); o.slow=stats(b,6.5); o.fastJog=stats(a,2); o.slowJog=stats(b,2);
    a.v186r_pace=null; b.v186r_pace=null; o.neutral=stats(a,6.5); V187M.on=false; o.off=stats(a,6.5); V187M.on=true;
    /* fatigue */
    a.v186r_pace=70; a.v187m_sta=40; st.v187mMinF=10; o.early=stats(a,5.5); st.v187mMinF=78; o.late=stats(a,5.5); a.v187m_sta=95; o.lateFit=stats(a,5.5); a.v187m_sta=40;
    st.v187mMinF=60; o.min60=stats(a,5.5);
    /* standing, tired */
    reset(a); Object.assign(a,{spd:0,gv:0,vx:0,vy:0}); st.v187mMinF=10; const i0=st.poseOf(a); st.v187mMinF=78; const i1=st.poseOf(a); o.idle={lean0:+i0.lean.toFixed(3),lean1:+i1.lean.toFixed(3)};
    st.v187mMinF=null; a.v186r_pace=b.v186r_pace=null; a.v187m_sta=b.v187m_sta=null; return o; });
  console.log('  gait: '+JSON.stringify(G));
  ok(G.fast.stride>G.slow.stride*1.08, `same speed 6.5 m/s: pace 95 strides longer than pace 45 (${G.fast.stride} m vs ${G.slow.stride} m)`);
  ok(G.fast.lean>G.slow.lean+0.03&&G.fast.hip<G.slow.hip, `pace 95 runs lower and leans more (lean ${G.fast.lean} vs ${G.slow.lean} rad, hips ${G.fast.hip} vs ${G.slow.hip})`);
  ok(G.fast.arm>G.slow.arm*1.15, `pace 95 pumps his arms harder (hand travel ${G.fast.arm} m vs ${G.slow.arm} m)`);
  ok(G.fast.cw===G.slow.cw, `the cadence is unchanged (cycle length ${G.fast.cw} m for both: dribble touches keep their timing)`);
  ok(Math.abs(G.fastJog.stride-G.slowJog.stride)<0.02, `at a 2 m/s jog the styles hardly differ (${G.fastJog.stride} vs ${G.slowJog.stride} m)`);
  ok(JSON.stringify(G.neutral)===JSON.stringify(G.off), `a player without ratings runs as before (${JSON.stringify(G.neutral)})`);
  ok(G.late.stride<G.early.stride*0.92&&G.late.lean<G.early.lean-0.02&&G.late.arm<G.early.arm*0.8&&G.late.hip<G.early.hip, `78' vs 10' (stamina 40): stride ${G.late.stride} vs ${G.early.stride} m, lean ${G.late.lean} vs ${G.early.lean}, arm ${G.late.arm} vs ${G.early.arm} m, hips ${G.late.hip} vs ${G.early.hip}`);
  ok(G.lateFit.stride>G.late.stride&&G.lateFit.arm>G.late.arm, `stamina 95 tires less at 78' (stride ${G.lateFit.stride} vs ${G.late.stride} m, arm ${G.lateFit.arm} vs ${G.late.arm} m)`);
  ok(JSON.stringify(G.min60)===JSON.stringify(G.early), `no fatigue before the 60th minute`);
  ok(G.idle.lean1>G.idle.lean0, `standing late he slumps a little (lean ${G.idle.lean1} vs ${G.idle.lean0})`);

  /* ---------- 3: hands on knees at a late stoppage (stepped) ---------- */
  const K=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; const H=1000/120; const Pl=[...st.players.values()];
    const run=(min,dead,secs)=>{ st.v187mMinF=min; st.own=null; st.hands=false; st.placed=false; st.fl=null; st.inNet=null; st.pendingKick=null; st.setPiece=dead?'fk':null;
      for(const q of Pl){ Object.assign(q,{ov:{x:q.x,y:q.y},chase:null,meet:null,trail:null,glide:null,vx:0,vy:0,spd:0,gv:0,celeb:false,sad:false,kickT:-9e9,v187m_sta:40,v187mKw:0,v187mKt:null,v187mKs:null,v187mKi:null,_pose:null}); }
      st.v187mD0=null; let maxN=0; const pid=new Set(); let reach=0, short=0, rn=0, minLean=9; const frames=Math.round(secs*120);
      for(let f=0;f<frames;f++){ st.keepPrev(); st.now+=H; st.update(H/1000); let n=0;
        for(const q of Pl){ if(q.off) continue; const P=st.blendPose(q,st.poseOf(q)); if(P.act==='knees'&&P.v187mK>0.98){ n++; pid.add(q.pid);
          if(f===frames-1){ /* the hands as drawn (2-D) against the knees */ const B=V187M_B[(q.look||{}).build]||1; const lean=P.lean, cl=Math.cos(lean), sl=Math.sin(lean), hu=P.hipU; minLean=Math.min(minLean,lean);
            const up=(a,u,l)=>{ if(u<=hu) return [a,u,l]; const du=u-hu; return [a*cl+du*sl,hu+du*cl-a*sl,l]; };
            for(const i of [0,1]){ const sd=i?1:-1; const ft=P.feet[i]; const kn=ik3([0,hu,sd*0.09*B],[ft.f,ft.u+0.06,ft.l],0.43,0.43,v186LegPole(ft.f,ft.u+0.06,sd)).j; const hd=P.hands[i];
              const tg=up(hd.f,hd.u,hd.l); const J=ik3(up(0,1.5,sd*0.21*B),tg,0.3,0.29,[-0.7,-0.5,sd*0.6]); const hs=1.06*(q.hgt||70)/70; const d=Math.hypot(J.t[0]-kn[0],J.t[1]-kn[1],J.t[2]-kn[2])*hs; reach=Math.max(reach,d); short=Math.max(short,Math.hypot(J.t[0]-tg[0],J.t[1]-tg[1],J.t[2]-tg[2])*hs); rn++; } } } }
        maxN=Math.max(maxN,n); }
      st.setPiece=null; for(const q of Pl) q.ov=null; return {maxN,players:pid.size,reach:+reach.toFixed(3),short:+short.toFixed(3),rn,lean:+minLean.toFixed(2)}; };
    const o={late:run(78,true,3.5),early:run(10,true,3.5),open:run(78,false,3.5)};
    /* the 3-D solve of the same pose (its torso rides on the hips, so the arm reaches): the knees layer reads the renderer from st._p3d */
    const q=Pl.find(x=>x._v187k3==null&&!x.gk); const P2=st.poseOf(q); const p3=st._p3d; st._p3d={dead:false}; let r3=null;
    try{ q.v187mKw=1; q.v187mKt=st.now; q.v187mKy=1; q.v187mKs=st.v187mD0; const P=st.poseOf(q); const B=V187M_B[(q.look||{}).build]||1; const hu=P.hipU, cl=Math.cos(P.lean), sl=Math.sin(P.lean);
      const up2=(a,u,l)=>{ const du=u-0.8; return du<=0?[a,hu+du,l]:[a*cl+du*sl,hu+du*cl-a*sl,l]; }; let reach=0, short=0;
      for(const i of [0,1]){ const sd=i?1:-1; const ft=P.feet[i]; const kn=ik3([0,hu,sd*0.09*B],[ft.f,ft.u+0.06,ft.l],0.43,0.43,v186LegPole(ft.f,ft.u+0.06,sd)).j; const hd=P.hands[i]; const tg=up2(hd.f,hd.u,hd.l), s0=up2(0,1.5,sd*0.21*B);
        const J=ik3(s0,tg,0.3,0.29,v18ArmPole(s0[0],s0[1],s0[2],tg[0],tg[1],tg[2],sd,P,q).slice()); const hs=0.92*(q.hgt||70)/70; reach=Math.max(reach,Math.hypot(J.t[0]-kn[0],J.t[1]-kn[1],J.t[2]-kn[2])*hs); short=Math.max(short,Math.hypot(J.t[0]-tg[0],J.t[1]-tg[1],J.t[2]-tg[2])*hs); }
      r3={act:P.act,reach:+reach.toFixed(3),short:+short.toFixed(3),lean:+P.lean.toFixed(2)}; } finally{ st._p3d=p3; }
    o.three=r3; st.setPiece=null; st.v187mMinF=null; for(const x of Pl) x.v187m_sta=null; return o; });
  console.log('  knees: '+JSON.stringify(K));
  ok(K.late.players>=2&&K.late.players<=12, `late (78') free kick: ${K.late.players} idle players put their hands on their knees (at most ${K.late.maxN} at once)`);
  ok(K.early.players===0&&K.open.players===0, `none at 10' (${K.early.players}) and none in open play at 78' (${K.open.players})`);
  ok(K.three&&K.three.act==='knees'&&K.three.reach<0.12&&K.three.short<0.02, `3-D: the hands rest on the knees (hand to knee joint ${K.three&&K.three.reach} m, arm short of its target ${K.three&&K.three.short} m, lean ${K.three&&K.three.lean} rad)`);
  ok(K.late.rn>0&&K.late.reach<0.17, `2-D: the hands reach down to the knees (hand to knee joint at most ${K.late.reach} m; 2-D keeps the torso at standing height, so less bend: lean ${K.late.lean} rad, arm short by ${K.late.short} m)`);

  /* ---------- 4: the sold defender's planted foot (stepped, 2-D, same setup as test/skills.js) ---------- */
  const S=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; const H=1000/120; const R0=Math.random; const Pl=[...st.players.values()];
    const A=Pl.filter(p=>p.side===0), B=Pl.filter(p=>p.side===1); const fw=A[9], def=B[3];
    const clear=q=>{ for(const k of Object.keys(q)) if((k.startsWith('v186')||k.startsWith('v187m'))&&k!=='v186fl'&&k!=='v186lv'&&k!=='v186ds') q[k]=null; };
    const ankle=(p,P,i)=>{ const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw), hs=1.06*(p.hgt||70)/70; const sd=i?1:-1; const Bb=V187M_B[(p.look||{}).build]||1; const F=P.feet[i];
      const J=ik3([0,P.hipU,sd*0.09*Bb],[F.f,F.u+0.06,F.l],0.43,0.43,v186LegPole(F.f,F.u+0.06,sd)); return {x:p.x+(J.t[0]*ca-J.t[2]*sa)*hs,y:p.y+(J.t[0]*sa+J.t[2]*ca)*hs,u:F.u}; };
    function legRun(kind,pin){ let s=777; Math.random=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; V187M.pin=pin;
      try{ V186S.on=true; st._v186lab=true; st.demoCalm=false; st._v186R=null; st._v186leg=null; st._v186mt=null; st._v186sforce=kind; st.v187mMinF=10;
        for(const q of Pl){ clear(q); q.chase=null; q.meet=null; q.trail=null; q.glide=null; q.trip=-9e9; q.slideT=-9e9; q.jumpT=-9e9; q.kickT=-9e9; q.v184=null; q.v184L=null; q.yawLock=null; q._pose=null;
          if(q!==fw&&q!==def){ q.ov={x:q.gk?(q.side===0?2:103):(q.side===0?20+q.slot.y*0.1:88+q.slot.y*0.1),y:q.gk?34:q.slot.y*0.68}; q.x=q.ov.x; q.y=q.ov.y; q.vx=q.vy=0; } }
        fw.v186fl=95; fw.v186lv='V'; def.v186ds=50; def.v186lv='V';
        Object.assign(fw,{x:46,y:44,vx:0,vy:0,ph:0,yaw:0,face:1,spd:0,gv:0,acS:0,turnLean:0,ov:null,slow:false,_mv:false,_pose:null});
        Object.assign(def,{x:60,y:44,vx:0,vy:0,yaw:Math.PI,face:-1,spd:0,gv:0,ov:{x:59,y:44},_pose:null});
        st.own=fw; st.hands=false; st.fl=null; st.placed=false; st.headBall=null; st.cush=null; st.so=false; st.skip=false; st.ts=0.85; st.ball={x:46.5,y:44.05,z:0,spin:0}; st.setPiece=null;
        const segs=[[],[]], cur=[null,null]; let kind0=null, frames=0, maxV=0;
        const step=()=>{ st.keepPrev(); st.now+=H; st.update(H/1000); const P=st.blendPose(def,st.poseOf(def));
          if(def.v186rT!=null&&!kind0) kind0=def.v186rk; if(def.v186rT!=null) maxV=Math.max(maxV,Math.hypot(def.vx||0,def.vy||0));
          const act=def.v186rT!=null&&st.now-def.v186rT<(def.v186rd||420)&&P.v186rw!=null&&P.v186rw>=0.3;
          if(def.v186rT!=null&&st.now-def.v186rT<(def.v186rd||420)&&window.__tr) window.__tr.push([Math.round(st.now-def.v186rT),def.v187mM0,def.v187mM1,+P.feet[0].u.toFixed(3),+P.feet[1].u.toFixed(3),P.v186rw==null?null:+P.v186rw.toFixed(2)].join(','));
          for(const i of [0,1]){ const a=ankle(def,P,i); if(act&&a.u<=0.002){ if(!cur[i]){ cur[i]={x:a.x,y:a.y,n:0,d:0}; segs[i].push(cur[i]); } cur[i].n++; cur[i].d=Math.max(cur[i].d,Math.hypot(a.x-cur[i].x,a.y-cur[i].y)); if(i===0) frames++; } else cur[i]=null; } };
        const leg=(x,y,ms,n)=>{ st.dribble(fw,x,y,ms); for(let i=0;i<n;i++){ step(); if(def.ov&&Math.hypot(fw.x-def.x,fw.y-def.y)<4.2) def.ov=null; if(Math.hypot(fw.x-x,fw.y-y)<0.6) break; } };
        for(let i=0;i<30;i++) step(); leg(70,44.5,2400,900); for(let i=0;i<60;i++) step();
        const long=segs.map(L=>L.filter(g=>g.n>=4)); const worst=Math.max(0,...long.flat().map(g=>g.d));
        return {kind:kind0,segs:long.map(L=>L.map(g=>[g.n,+(g.d*100).toFixed(1)])),worst:+(worst*100).toFixed(2),frames,maxV:+maxV.toFixed(2)}; }
      finally{ Math.random=R0; V187M.pin=true; st._v186sforce=null; st.v187mMinF=null; } }
    window.__tr=[]; const on=legRun('step1',true); const tr=window.__tr; window.__tr=null; return {on,off:legRun('step1',false),feint:legRun('feint',true),tr}; });
  if(process.env.TRACE) console.log(S.tr.join(' | '));
  console.log('  planted feet: '+JSON.stringify(S));
  ok(S.on.kind==='sold'&&S.on.segs.flat().length>0, `the stepover sells the defender (${S.on.kind}); planted intervals of 4+ frames: ${S.on.segs.flat().length}`);
  ok(S.on.worst<2, `sold defender: a planted foot moves at most ${S.on.worst} cm on the turf while planted (pin off: ${S.off.worst} cm)`);
  ok(S.off.worst>S.on.worst, `the pin is what holds it (${S.off.worst} cm without it)`);
  ok(S.feint.kind!=='freeze'||S.feint.worst<2, `frozen defender (feint, ${S.feint.kind}): planted feet move at most ${S.feint.worst} cm`);

  /* ---------- 5: the kick's balance arm ---------- */
  const Ar=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; const H=1000/120; const Pl=[...st.players.values()]; const p=Pl.filter(q=>q.side===0)[9];
    const bend=(P,three)=>{ const B=V187M_B[(p.look||{}).build]||1; const lean=P.lean, cl=Math.cos(lean), sl=Math.sin(lean), hu=P.hipU;
      const up=three?(a,u,l)=>{ const du=u-0.8; return du<=0?[a,hu+du,l]:[a*cl+du*sl,hu+du*cl-a*sl,l]; }:(a,u,l)=>{ if(u<=hu) return [a,u,l]; const du=u-hu; return [a*cl+du*sl,hu+du*cl-a*sl,l]; };
      const h=P.hands[0]; const s0=up(0,1.5,-0.21*B), t=up(h.f,h.u,h.l); const pole=three?v18ArmPole(s0[0],s0[1],s0[2],t[0],t[1],t[2],-1,P,p).slice():[-0.7,-0.5,-0.6];
      const J=ik3(s0,t,0.3,0.29,pole); const u1=[s0[0]-J.j[0],s0[1]-J.j[1],s0[2]-J.j[2]], u2=[J.t[0]-J.j[0],J.t[1]-J.j[1],J.t[2]-J.j[2]];
      const c=(u1[0]*u2[0]+u1[1]*u2[1]+u1[2]*u2[2])/(Math.hypot(...u1)*Math.hypot(...u2)); const hand={f:J.t[0]-s0[0],u:J.t[1]-s0[1],l:J.t[2]-s0[2]};
      return {deg:180-Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI,hand,el:J.j[1]-s0[1]}; };
    const kick=(kk,W,F,on)=>{ V187M.arm=on; st.own=null; Object.assign(p,{x:50,y:34,vx:0,vy:0,spd:0,gv:0,yaw:0,face:1,ov:{x:50,y:34},chase:null,_pose:null,v186k:null,v186rT:null,celeb:false});
      for(let i=0;i<20;i++){ st.keepPrev(); st.now+=H; st.update(H/1000); st.blendPose(p,st.poseOf(p)); }
      p.kickT=st.now; p.kickW=W; p.kickF=F; p.kickK=kk; let at=null, lo=999, hi=-1, n=0, at3=null;
      while(st.now-p.kickT<W+F){ st.keepPrev(); st.now+=H; st.update(H/1000); const P=st.blendPose(p,st.poseOf(p)); const kt=st.now-p.kickT;
        if(at==null&&kt>=W){ at=bend(P,false); at3=bend(P,true); }
        if(P.v187mA>=0.95||(!on&&kt>=W*0.8&&kt<=W+F*0.3)){ const b=bend(P,false).deg; lo=Math.min(lo,b); hi=Math.max(hi,b); n++; } }
      V187M.arm=true; p.kickT=-9e9; return {deg:+at.deg.toFixed(1),deg3:+at3.deg.toFixed(1),hand:Object.fromEntries(Object.entries(at.hand).map(([k,v])=>[k,+v.toFixed(2)])),elbowBelowShoulder:+at.el.toFixed(2),lo:+lo.toFixed(1),hi:+hi.toFixed(1),n}; };
    return {shot:kick('shot',st.D(220),st.D(340),true),pass:kick('pass',st.D(140),st.D(260),true),loft:kick('loft',st.D(200),st.D(300),true),before:kick('shot',st.D(220),st.D(340),false)}; });
  console.log('  arm: '+JSON.stringify(Ar));
  for(const k of ['shot','pass','loft']){ const a=Ar[k]; ok(a.deg>=30&&a.deg<=45&&a.deg3>=30&&a.deg3<=45, `${k}: balance-arm elbow bend at contact ${a.deg} deg (3-D solve ${a.deg3} deg; before: ${Ar.before.deg} deg)`); }
  ok(Ar.shot.n>3&&Ar.shot.lo>=30&&Ar.shot.hi<=45, `shot: the bend stays ${Ar.shot.lo}-${Ar.shot.hi} deg while the arm is out (${Ar.shot.n} frames)`);
  ok(Ar.shot.hand.f>Ar.before.hand.f+0.08&&Ar.shot.hand.u<-0.12&&-Ar.shot.hand.l<-Ar.before.hand.l, `the hand comes forward and down instead of out to the side (forward ${Ar.shot.hand.f}, down ${-Ar.shot.hand.u}, out ${-Ar.shot.hand.l} body units from the shoulder; before forward ${Ar.before.hand.f}, down ${-Ar.before.hand.u}, out ${-Ar.before.hand.l}, bend ${Ar.before.lo}-${Ar.before.hi} deg)`);

  /* ---------- 6: live ---------- */
  if(!process.env.SKIP_LIVE){
    const pg=await browser.newPage({viewport:{width:1280,height:800}}); pg.on('pageerror',e=>errs.push('live pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
    pg.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('live console: '+m.text()); });
    await pg.goto(DIST); await pg.waitForTimeout(600);
    await pg.click('[data-a="newCareerForm"][data-slot="1"]'); await pg.fill('#nc-name','Motion Coach'); await pg.fill('#nc-seed','motion187');
    await pg.click('[data-a="ncNext"]'); await pg.waitForTimeout(200); await pg.click('[data-a="createCareer"]'); await pg.waitForTimeout(800);
    await pg.evaluate(()=>{ PREFS.renderer='2d'; V187M.minF=78; window.__kn={frames:0,pids:{},why:{}}; const P0=Stage.prototype.poseOf; Stage.prototype.poseOf=function(p,isRef){ const P=P0.apply(this,arguments);
      if(P&&P.act==='knees'&&P.v187mK>0.9&&App.live&&App.live.stage===this&&App.live.M&&App.live.M.min>=1){ /* after the walkout (minute 0 is never tired in a real match) */ const K=window.__kn; K.frames++; K.pids[p.pid]=1; const w=this.hands?'held':this.placed?'placed':this.setPiece?this.setPiece:this.pendingKick?'kickoff':this.inNet?'goal':this.ref&&this.ref.card?'card':'flag'; K.why[w]=(K.why[w]||0)+1; } return P; }; });
    await pg.click('.cta [data-a="playNext"]'); await pg.waitForTimeout(400); await pg.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await pg.click('[data-a="kickoff"]');
    const t0=Date.now(); while(Date.now()-t0<60000){ const k=await pg.evaluate(()=>Object.keys(window.__kn.pids).length); if(k>=3&&Date.now()-t0>25000) break; if(await pg.$('#lv-ht .htbox')) break; await pg.waitForTimeout(1000); }
    const R=await pg.evaluate(()=>{ const st=App.live&&App.live.stage; const ps=st?[...st.players.values()]:[]; return {kn:window.__kn,min:App.live&&App.live.M?App.live.M.min:null,rat:ps.filter(p=>p.v186r_pace!=null).length,sta:ps.filter(p=>p.v187m_sta!=null).length,n:ps.length,err:V187M.err}; });
    await pg.screenshot({path:'test/shots/v187_motion_live.png'}).catch(()=>{});
    await pg.close();
    console.log('  live: '+JSON.stringify(R));
    ok(R.n>0&&R.rat===R.n&&R.sta===R.n, `live: pace and stamina read for all ${R.n} players (${R.rat} paces, ${R.sta} staminas)`);
    ok(Object.keys(R.kn.pids).length>=1, `live 2x at a forced 78': hands on knees at real stoppages (${Object.keys(R.kn.pids).length} players, ${R.kn.frames} frames; ${JSON.stringify(R.kn.why)}) by minute ${R.min}`);
    ok(!R.err, `no error inside the motion layer (${R.err||'none'})`);
  }
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
