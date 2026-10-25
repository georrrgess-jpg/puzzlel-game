// v18.10 celebrations (src/v17/90_celebs.js): the award-only celebrations stay locked until a player wins that award
// (MVP -> The Spin Jump, Goal Scorer of the Year -> The Archer, Playmaker of the Year -> The Conductor), unlock and
// make the Newswire when the awards are given out, and can then be chosen; every pose stays sane through the move (finite,
// feet never below the turf); the backflip turns a full 2*pi in the air, lands upright and is tucked mid-air; the spin
// turns a full circle; the goal sequence waits longer for the longer moves; no page errors.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Cel Coach'); await page.fill('#nc-seed','cel1');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const U=await page.evaluate(()=>{ const C=App.C; const ids=['spin','archer','conductor']; const all=Object.values(C.players);
    const r={defined:ids.every(id=>CELEB_BY[id]&&CELEB_BY[id].excl), lockedAll:all.every(p=>ids.every(id=>!celebHave(C,p,id)))};
    /* a full season, then the awards */
    let guard=0; while(C.phase!=='offseason'&&guard++<400){ try{ simRound(C); }catch(e){} try{ advance(C); }catch(e){} }
    const yr=Object.keys(C.awards).map(Number).sort().pop(); const A=C.awards[yr]; const W={spin:A&&A.list.mvp,archer:A&&A.list.scorer,conductor:A&&A.list.playmaker};
    r.phase=C.phase; r.won={}; r.others=true;
    for(const id of ids){ const w=W[id]; if(!w) continue; const p=C.players[w.pid]; r.won[id]={have:celebHave(C,p,id),news:C.news.some(n=>n.type==='celebration'&&n.pid===p.id&&n.cel===id),set:setCeleb(C,p.id,id)&&celebFor(C,p)===id};
      for(const q of all) if(q.id!==p.id&&celebHave(C,q,id)&&!(q.awards||[]).some(a=>a.k===CELEB_BY[id].req.v)) r.others=false; }
    return r; });
  console.log('unlock',JSON.stringify(U));
  ok(U.defined&&U.lockedAll, 'the three award celebrations exist and nobody has them at the start');
  ok(['spin','archer','conductor'].every(id=>U.won[id]&&U.won[id].have&&U.won[id].news&&U.won[id].set), `each award's winner unlocks his celebration, it makes the Newswire and can be chosen (${JSON.stringify(U.won)})`);
  ok(U.others, 'nobody without the award has them');
  /* poses through each move */
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900); await page.evaluate(()=>{ PREFS.renderer='2d'; labRun('aerial'); }); await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0,null,{timeout:60000});
  const P=await page.evaluate(()=>{ const st=App.labSt; st.paused=true; const p=[...st.players.values()].find(q=>q.side===0&&!q.gk); const out={};
    for(const type of ['backflip','spin','archer','conductor']){ const R={bad:0,minFoot:9,maxRot:0,landRot:null,tuck:0,yaw:[]}; p.yaw=0.25; p.v1810yT=null; p.celeb=true; p.celebType=type; p.vx=p.vy=0; p.spd=0; const t0=st.now; p.celebT=t0; const y0=p.yaw;
      for(let T=0;T<=2600;T+=20){ p.celebT=st.now-T; const Q=st.poseOf(p); const vals=[Q.hipU,Q.lean,Q.lift||0,Q.rot||0,...Q.feet.flatMap(f=>[f.f,f.u,f.l]),...Q.hands.flatMap(h=>[h.f,h.u,h.l])]; if(!vals.every(Number.isFinite)) R.bad++;
        R.minFoot=Math.min(R.minFoot,...Q.feet.map(f=>f.u)); R.maxRot=Math.max(R.maxRot,Math.abs(Q.rot||0)); if(type==='backflip'){ const D=st.D(1100); if(T>0.3*D&&T<0.75*D) R.tuck=Math.max(R.tuck,Math.min(Q.feet[0].u,Q.feet[1].u)); if(T>=1.0*D&&R.landRot==null) R.landRot=Math.abs(Q.rot||0); }
        if(type==='spin') R.yaw.push(v1810SpinAng(st,p)+(p.yaw-y0)); }
      if(type==='spin'){ R.spinMax=Math.max(...R.yaw); R.spinEnd=R.yaw[R.yaw.length-1]; delete R.yaw; } else delete R.yaw; out[type]=R; p.celeb=false; }
    out.hold={backflip:v1810Hold('backflip'),spin:v1810Hold('spin'),archer:v1810Hold('archer'),conductor:v1810Hold('conductor'),classic:v1810Hold('classic',1000)}; return out; });
  console.log('poses',JSON.stringify(P));
  ok(['backflip','spin','archer','conductor'].every(t=>P[t].bad===0&&P[t].minFoot>=0), 'every pose is finite and no foot goes below the turf');
  ok(P.backflip.maxRot>6.2&&P.backflip.landRot!=null&&(P.backflip.landRot<0.05||Math.abs(P.backflip.landRot-2*Math.PI)<0.05)&&P.backflip.tuck>0.45, `the backflip turns a full circle, lands upright and tucks mid-air (max ${P.backflip.maxRot.toFixed(2)} rad, landing ${(P.backflip.landRot||0).toFixed(2)}, feet up to ${P.backflip.tuck.toFixed(2)})`);
  ok(P.spin.spinMax>6.2&&Math.abs(P.spin.spinEnd)<0.01, `the spin jump turns a full circle in the air and lands facing where he started (max ${P.spin.spinMax.toFixed(2)} rad)`);
  ok(P.hold.spin>1000&&P.hold.archer>1000&&P.hold.conductor>1000&&P.hold.classic===1000&&P.hold.backflip===1250, `the teammates wait longer for the longer moves (${JSON.stringify(P.hold)})`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
