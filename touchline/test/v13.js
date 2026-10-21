// v13: genuine highlight clips, real headers, real breakaways, officials. Replays every recorded goal of a simulated
// season through the real Stage on a stepped clock and checks how each one starts, how headers and breakaways play out.
const { chromium } = require('./_pw');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const page=await b.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','V13'); await page.fill('#nc-seed','v13clips'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(700);
  const R=await page.evaluate(async()=>{ const C=App.C;
    for(let i=0;i<500&&C.phase!=='offseason';i++){ const fx=userFixture(C); if(fx){ const M=startMatch(C,fx.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    const goals=[]; for(const fid in C.logs){ const lg=C.logs[fid]; if(!lg.lu||!lg.ev) continue; lg.ev.filter(e=>e.t==='goal'&&e.seq).forEach(e=>goals.push({fid,e})); }
    const host=document.createElement('div'); host.style.cssText='position:fixed;left:0;top:0;width:900px;height:520px;z-index:99999'; const cv=document.createElement('canvas'); host.appendChild(cv); document.body.appendChild(host);
    const H=1000/120; const out={n:0,kickoffStart:0,firstOk:0,firstN:0,setPieceOk:0,setPieceN:0,head:{n:0,crossKicked:0,nod:0,high:0,apex:0},brk:{n:0,onside:0,clear:0,gkOut:0,d:[]},goalsOk:0,types:{}};
    const byType={}; for(const g of goals){ (byType[g.e.ty]||(byType[g.e.ty]=[])).push(g); }
    const pick=[]; for(const t in byType) pick.push(...byType[t].slice(0,t==='break'||t==='header'||t==='corner'?12:4));
    for(const {fid,e} of pick){ const f=C.fixtures[fid], lg=C.logs[fid]; out.types[e.ty]=(out.types[e.ty]||0)+1;
      const st=new Stage(cv,{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:'broadcast',minimap:false,section:C.section}); st.paused=true; st.restartAfterGoal=async()=>{};
      st.setSides(lg.lu.map(L=>({slots:L.slots,off:{}}))); lg.lu.forEach((L,j)=>{ const g=L.slots.find(s=>s.role==='GK'); if(g) st.setKeeper(j,g.pid); });
      const L=[]; const L0=st.launch.bind(st); st.launch=(p,o)=>{ const rec={pid:p&&p.pid,kk:p?st.kickKind(p,o):null,home:o.home&&o.home.pid,kind:o.kind,z:st.ball.z,now:st.now}; L.push(rec);
        const or=o.onRelease; o.onRelease=fl=>{ rec.rel=st.now; rec.relZ=st.ball.z; rec.lift=p?st.jumpLift(p):0; rec.home&&(rec.homeOff=o.home?st.isOffside(o.home):null); if(or) or(fl); }; return L0(p,o); };
      let brkInfo=null; const B0=st.breakaway.bind(st); st.breakaway=async(e2,o,pl,X,Y)=>{ brkInfo={pl}; return B0(e2,o,pl,X,Y); };
      const F0=st.finish.bind(st); st.finish=async(e2,pl)=>{ if(brkInfo&&brkInfo.pl===pl){ const s=e2.s, dir=s===0?1:-1, gx=s===0?105:0; const defs=[...st.players.values()].filter(q=>q.side!==s&&!q.gk&&!q.off); brkInfo.m=Math.min(...defs.map(q=>dir*(pl.x-q.x))); const gk=st.gkOf(1-s); brkInfo.gk=gk?Math.abs(gk.x-gx):0; } return F0(e2,pl); };
      st.clipStart(e); const seq=e.seq; const f0=seq[0];
      if(st.pendingKick||(Math.hypot(st.ball.x-52.5,st.ball.y-34)<0.6&&!(f0.x===50&&f0.y===50))) out.kickoffStart++;
      const done={v:false}; st.goalSequence(e).then(()=>done.v=true,()=>done.v=true);
      for(let k=0;k<6000&&!done.v;k++){ for(let j=0;j<4;j++){ st.keepPrev(); st.now+=H; st.update(H/1000); await null; await null; } }
      const firstL=L.find(x=>x.pid);
      if(f0.a==='corner'||f0.a==='setup'){ out.setPieceN++; if(firstL&&firstL.pid===f0.pid&&!L.some(x=>x.kk==='pass'&&x.now<firstL.now)) out.setPieceOk++; }
      else { out.firstN++; if(firstL&&firstL.pid===f0.pid) out.firstOk++; }
      if(st.inNet) out.goalsOk++;
      if(e.ty==='header'||e.ty==='corner'){ const fin=[...L].reverse().find(x=>x.pid===e.pid&&x.kind==='shot'); const cross=L.find(x=>x.home===e.pid);
        if(fin&&cross&&cross.relZ!=null&&fin.z>1.2){ out.head.n++; if(cross.kk!=='head') out.head.crossKicked++; if(fin.kk==='head') out.head.nod++; if(fin.relZ>1.4) out.head.high++; if(fin.lift>0.3) out.head.apex++; } }
      if(e.ty==='break'&&brkInfo){ out.brk.n++; const tb=L.find(x=>x.home===brkInfo.pl.pid); if(tb&&tb.homeOff===false) out.brk.onside++; if(brkInfo.m>0) out.brk.clear++; if(brkInfo.gk>2.5) out.brk.gkOut++; out.brk.d.push(+(brkInfo.m||0).toFixed(1)); }
      st.destroy(); out.n++; }
    host.remove(); return out; });
  console.log(JSON.stringify(R));
  ok(R.n>=20, `replayed ${R.n} real goals: ${JSON.stringify(R.types)}`);
  ok(R.kickoffStart===0, 'no highlight starts from a kickoff');
  ok(R.firstOk===R.firstN&&R.firstN>0, `open-play clips start with the recorded first player on the ball (${R.firstOk}/${R.firstN})`);
  ok(R.setPieceOk===R.setPieceN&&R.setPieceN>0, `set-piece clips start at the set piece, taken by the recorded taker, no invented build-up (${R.setPieceOk}/${R.setPieceN})`);
  ok(R.goalsOk===R.n, `every replayed goal ends in the net (${R.goalsOk}/${R.n})`);
  ok(R.head.n>0&&R.head.crossKicked===R.head.n, `the cross is kicked by the crosser, not headed (${R.head.crossKicked}/${R.head.n})`);
  ok(R.head.nod===R.head.n, `headed goals are headers: a nod, no kick wind-up (${R.head.nod}/${R.head.n})`);
  ok(R.head.high===R.head.n&&R.head.apex>=R.head.n*0.8, `the ball leaves his head in the air (${R.head.high}/${R.head.n}), at the top of a timed leap (${R.head.apex}/${R.head.n})`);
  ok(R.brk.n>0&&R.brk.onside===R.brk.n, `breakaways: the runner is onside when the through ball is played (${R.brk.onside}/${R.brk.n})`);
  ok(R.brk.clear>=R.brk.n*0.9, `breakaways: he is clear of every defender when he shoots (${R.brk.clear}/${R.brk.n}, margins ${R.brk.d.join(', ')} m)`);
  ok(R.brk.gkOut>=R.brk.n*0.9, `breakaways: the keeper comes off his line (${R.brk.gkOut}/${R.brk.n})`);
  console.log(errs.length?'ERRORS\n'+errs.slice(0,8).join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
