// v18.21 Coaching Staff (src/v17/9l_staff*.js).
// Four assistant roles (JV, Modified, Goalkeeper, Strength & Conditioning) multiply growth by 1+(rating-60)/250 (+2% when the
// specialty matches the training focus, capped at +12% per player); a staff budget of 100 + prestige; a seeded hiring market
// per window; hire / release / renew; rollover experience, expiring contracts and rare poaching; CPU schools get seeded staff
// recentred on 60 (parity). Checks: budget, hiring, multipliers by role and level, GK coach only on GKs, the S&C focus, rollover,
// CPU parity, the balance table (baseline vs staffed sensibly), old-save migration, determinism, the UI on desktop and phone.
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SHOTS=__dirname+'/shots/v1821'; fs.mkdirSync(SHOTS,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Staff Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(150); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); return page; };
  const page=await mk('staff-1');

  /* ---------- initial state, budget, determinism ---------- */
  const I=await page.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const u=S.u;
    const C2=newCareer({seed:C.seed,name:'X'}); const S2=v1821cS(C2); const m1=v1821cMkt(C), m2=v1821cMkt(C2);
    const C3=newCareer({seed:C.seed+'-other',name:'X'}); const m3=v1821cMkt(C3);
    const strip=S=>JSON.stringify(V1821C.ROLES.map(k=>S.u[k]&&[S.u[k].nm,S.u[k].r,S.u[k].sp,S.u[k].sal,S.u[k].end]));
    const per={}; for(const k of V1821C.ROLES) per[k]=m1.c.filter(q=>q.role===k).length;
    return {filled:['JV','MOD','SC'].every(k=>u[k]&&u[k].r>=40&&u[k].r<=90), gkVac:u.GK===null, oneEnds:['JV','MOD','SC'].some(k=>u[k].end===C.year),
      bud:v1821cBudget(C), pres:C.schools[C.userSid].prestige, pay:v1821cPay(C), same:strip(S)===strip(S2)&&JSON.stringify(m1.c)===JSON.stringify(m2.c)&&JSON.stringify(S.cpu)===JSON.stringify(S2.cpu), diff:JSON.stringify(m1.c.map(q=>q.nm))!==JSON.stringify(m3.c.map(q=>q.nm)),
      per, key:m1.k, sal:[40,45,60,75,90].map(v1821cSal), eff:[40,60,90].map(r=>+(1+v1821cEff(r)).toFixed(3)), anyHigh:V1821C.ROLES.every(k=>m1.c.some(q=>q.role===k&&q.r>=70)), salUp:m1.c.every(q=>q.sal>0) }; });
  console.log(JSON.stringify(I));
  ok(I.filled&&I.gkVac&&I.oneEnds, 'a new career inherits JV, Modified and S&C assistants (one contract ends this season); the Goalkeeper Coach role is vacant');
  ok(I.bud===100+I.pres&&I.pay<=I.bud, `staff budget = 100 + prestige (${I.bud}); payroll $${I.pay}k fits`);
  ok(I.eff.join()==='0.92,1,1.12'&&I.sal[0]<I.sal[2]&&I.sal[2]<I.sal[3]&&I.sal[3]<I.sal[4], `multiplier 40/60/90 = ${I.eff.join(' / ')}; salary rises with rating (${I.sal.join(', ')})`);
  ok(Object.values(I.per).every(n=>n>=3&&n<=4)&&I.anyHigh&&/pre$/.test(I.key), `market: 3-4 candidates per role (${JSON.stringify(I.per)}), at least one rated 70+ in each`);
  ok(I.same&&I.diff, 'determinism: same seed gives the same staff, market and CPU staff; another seed differs');

  /* ---------- multipliers by role and level ---------- */
  const M=await page.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const u=C.userSid; const orig=JSON.parse(JSON.stringify(S.u)); const mk=(r,sp)=>({id:'t'+r+sp,nm:'Test Coach',r,sp,sal:10,since:C.year,end:C.year+1,yrs:0,hue:0});
    C.training='balanced'; S.u.JV=mk(80,'attacking'); S.u.MOD=mk(40,'attacking'); S.u.SC=mk(90,'sc_pace'); S.u.GK=mk(70,'gk_stop');
    const one=(l,gk)=>squad(C,u,l).find(p=>(p.pos==='GK')===gk); const m=p=>+v1821cMultFor(C,p).toFixed(4); const dm=p=>+v1821dMult(C,p,'tick').m.toFixed(4);
    const r={jv:m(one('JV',false)), mod:m(one('MOD',false)), v:m(one('V',false)), jvgk:m(one('JV',true)), modgk:m(one('MOD',true)), vgk:m(one('V',true)), core:dm(one('JV',false)), off:+v1821dMult(C,one('JV',false),'off').m.toFixed(4)};
    S.u.GK=mk(90,'gk_stop'); r.jvOut2=m(one('JV',false)); r.modgk2=m(one('MOD',true));
    S.u.GK=null; r.modgkVol=m(one('MOD',true)); r.jvOut3=m(one('JV',false));
    C.training='attacking'; r.jvSpec=m(one('JV',false)); C.training='balanced';
    S.u.JV=null; r.jvVol=m(one('JV',false));
    const cpuP=Object.values(C.players).find(p=>p.sid!==u&&C.schools[p.sid]&&!C.schools[p.sid].ext&&p.lvl==='JV'&&p.pos!=='GK'); const o=S.cpu.s[cpuP.sid]; r.cpu=m(cpuP); r.cpuExp=+(1+v1821cEff(o.JV)).toFixed(4);
    /* S&C focus: Varsity outfield only, only with Balanced training */
    const vp=one('V',false), vg=one('V',true), jp=one('JV',false);
    r.fV=v1821dFocus(C,vp,'balanced'); r.fG=v1821dFocus(C,vg,'balanced'); r.fJ=v1821dFocus(C,jp,'balanced'); r.fAtt=v1821dFocus(C,vp,'attacking'); S.u.SC.sp='sc_sta'; r.fSta=v1821dFocus(C,vp,'balanced');
    V1821C.off=true; r.offNull=v1821dMult(C,vp,'tick').parts.length===0; V1821C.off=false;
    S.u=orig; return r; });
  console.log(JSON.stringify(M));
  ok(M.jv===1.08&&M.mod===0.92&&M.v===1.12&&M.core===1.08&&M.off===1.08, `role multipliers: JV coach 80 -> JV ×${M.jv}, Modified coach 40 -> MOD ×${M.mod}, S&C 90 -> Varsity ×${M.v}; the core sees the same in tick and off`);
  ok(M.jvgk===1.12&&Math.abs(M.modgk-0.92*1.04)<1e-3&&M.vgk===1.12, `a goalkeeper gets his level coach and the GK coach (JV GK ×${M.jvgk} capped at +12%, MOD GK ×${M.modgk})`);
  ok(M.jvOut2===M.jv&&M.jvOut3===M.jv&&M.modgk2>M.modgk&&Math.abs(M.modgkVol-0.92*0.94)<1e-3, 'the GK coach changes goalkeepers only (outfield players unchanged when he is upgraded or released)');
  ok(Math.abs(M.jvSpec-1.10)<1e-3&&Math.abs(M.jvVol-0.94)<1e-3, `specialty matching the training focus adds 2% (×${M.jvSpec}); a vacant role means a volunteer at 45 (×${M.jvVol})`);
  ok(Math.abs(M.cpu-M.cpuExp)<1e-3, `CPU players use their school's seeded staff (×${M.cpu})`);
  ok(M.fV==='f_spd'&&M.fG==='balanced'&&M.fJ==='balanced'&&M.fAtt==='attacking'&&M.fSta==='f_sta'&&M.offNull, 'S&C specialty leans Varsity outfield growth to pace/stamina only under Balanced training; never keepers, JV, or another focus; V1821C.off switches it all off');

  /* ---------- budget, hiring, releasing, windows ---------- */
  const H=await page.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const r={};
    const keep=JSON.parse(JSON.stringify(S.u)); const mkt=v1821cMkt(C); const bud=v1821cBudget(C);
    const mk=(r,sal)=>({id:'b'+r,nm:'Big Spender',r,sp:'attacking',sal,since:C.year,end:C.year+1,yrs:0,hue:0});
    S.u={JV:mk(85,bud-30),MOD:null,GK:null,SC:null}; const exp=mkt.c.filter(q=>q.role==='GK'&&q.sal>30).sort((a,b)=>b.sal-a.sal)[0]; const cheap=mkt.c.filter(q=>q.role==='GK'&&q.sal<=30).sort((a,b)=>a.sal-b.sal)[0];
    r.over=exp?v1821cHire(C,exp.id,2):{ok:false,msg:'n/a'}; r.payAfterOver=v1821cPay(C);
    r.fit=cheap?v1821cHire(C,cheap.id,2):{ok:true}; r.gk=S.u.GK&&S.u.GK.nm===(cheap&&cheap.nm); r.gkEnd=S.u.GK&&S.u.GK.end===C.year+1; r.gone=!v1821cMkt(C).c.some(q=>q.id===(cheap&&cheap.id)&&!q.hired);
    r.again=cheap?v1821cHire(C,cheap.id,1):{ok:false};
    r.badLen=v1821cHire(C,mkt.c.find(q=>q.role==='MOD').id,5);
    const before=v1821cPay(C); r.rel=v1821cRelease(C,'JV'); r.freed=before-v1821cPay(C); r.jvVac=S.u.JV===null;
    r.nowOver=exp?v1821cHire(C,exp.id,3):{ok:true}; r.payOk=v1821cPay(C)<=bud;
    /* replacing a coach in the same role counts his salary as freed */
    const jvA=mkt.c.filter(q=>q.role==='JV'&&!q.hired); const a=v1821cHire(C,jvA[0].id,1); const b2=jvA[1]&&v1821cHire(C,jvA[1].id,1); r.repl=a.ok&&(!b2||(b2.ok&&S.u.JV.nm===jvA[1].nm&&/released/.test(b2.msg)));
    const ph=C.phase; C.phase='regular'; r.closedHire=v1821cHire(C,mkt.c[0].id,1); r.closedRel=v1821cRelease(C,'GK'); r.closedMkt=v1821cMkt(C); C.phase=ph;
    S.u=keep; return r; });
  console.log(JSON.stringify(H));
  ok(!H.over.ok&&/budget/i.test(H.over.msg)&&H.fit.ok&&H.gk&&H.gkEnd&&H.gone&&!H.again.ok, `budget enforced (${H.over.msg}); a cheaper coach is hired with a 2-season contract and leaves the market`);
  ok(!H.badLen.ok&&H.rel.ok&&H.freed>0&&H.jvVac&&H.nowOver.ok&&H.payOk, `contracts are 1-3 seasons; releasing frees $${H.freed}k, which then pays for the expensive keeper coach`);
  ok(H.repl, 'hiring into a filled role releases the old coach and counts his salary as freed');
  ok(!H.closedHire.ok&&!H.closedRel.ok&&H.closedMkt===null, 'during the season the market is closed: no hiring or releasing');

  /* ---------- a season, renewals, rollover ---------- */
  const R=await page.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const yr=C.year; const r={};
    S.u.JV.end=yr; S.u.MOD.end=yr; S.u.SC.end=yr+2; const k0=v1821cMkt(C).k; const names0=v1821cMkt(C).c.map(q=>q.nm).join();
    const r0={JV:S.u.JV.r,MOD:S.u.MOD.r,SC:S.u.SC.r}; const y0={JV:S.u.JV.yrs,MOD:S.u.MOD.yrs,SC:S.u.SC.yrs};
    let g=0; while(C.phase!=='offseason'&&g++<300){ const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M);} simRound(C); advance(C); }
    r.phase=C.phase; const mo=v1821cMkt(C); r.offKey=mo&&mo.k!==k0; r.offNew=mo&&mo.c.map(q=>q.nm).join()!==names0;
    r.dec=v1821cDecisions(C).map(d=>d.k+':'+d.t).sort().join(','); r.badge=v1821cBadge(C);
    /* make the JV coach willing for the test by finding his answer; renew whoever is willing, leave the other */
    const wJV=v1821cWilling(C,S.u.JV), wMOD=v1821cWilling(C,S.u.MOD); r.w=[wJV,wMOD];
    const ren=wJV?'JV':wMOD?'MOD':null; const other=ren==='JV'?'MOD':'JV'; r.ren=ren;
    if(ren){ const before=S.u[ren].sal; const ask=v1821cAsk(S.u[ren]); r.renew=v1821cRenew(C,ren,2); r.renSal=S.u[ren].sal===ask&&ask>before; r.renEnd=S.u[ren].end===yr+2; }
    r.otherNm=S.u[other].nm; r.otherWill=v1821cWilling(C,S.u[other]);
    const nNews=C.news.length; const ids={JV:S.u.JV.id,MOD:S.u.MOD.id,SC:S.u.SC.id};
    rollover(C); r.yr=C.year===yr+1; r.phase2=C.phase;
    r.exp=['SC',...(ren?[ren]:[])].every(k=>S.u[k]&&S.u[k].id===ids[k]&&S.u[k].r-r0[k]>=1&&S.u[k].r-r0[k]<=3&&S.u[k].yrs===y0[k]+1);
    const news=C.news.slice(0,C.news.length-nNews+5).map(n=>n.text).filter(t=>t.includes(r.otherNm)); r.otherNews=news[0]||'';
    const oc=S.u[other]; r.otherOut=oc?(oc.id===ids[other]&&oc.end===C.year&&/re-signs/.test(r.otherNews)):( /leaves/.test(r.otherNews));
    r.lost=S.lost.length; const mp=v1821cMkt(C); r.preKey=mp&&mp.k===C.year+'pre'; r.preNew=mp&&mp.c.map(q=>q.nm).join()!==(mo&&mo.c.map(q=>q.nm).join());
    r.cpuYr=S.cpu.yr===C.year; r.pot=Object.values(C.players).every(p=>ovr(p)<=p.pot+0.05);
    r.ledger=!!(C.dvx&&C.dvx.yr[yr]&&C.dvx.yr[yr].JV.parts.staff!=null);
    return r; });
  console.log(JSON.stringify(R));
  ok(R.phase==='offseason'&&R.offKey&&R.offNew, 'the offseason opens a fresh market (new key, new candidates)');
  ok(/JV:(expiring|leaving)/.test(R.dec)&&/MOD:(expiring|leaving)/.test(R.dec)&&/GK:vacant/.test(R.dec)&&R.badge===3, `decisions in the offseason: ${R.dec} (badge ${R.badge})`);
  ok(!R.ren||(R.renew.ok&&R.renSal&&R.renEnd), `renewal at a new, higher salary through ${'+2 seasons'} (${R.ren?R.renew.msg:'nobody willing'})`);
  ok(R.yr&&R.phase2==='preseason'&&R.exp, 'rollover: coaches who served the season gain +1 to +3 rating and a year of experience');
  ok(R.otherOut, `an unrenewed contract ends: he re-signs for one season at a new salary or leaves, with news ("${R.otherNews}")`);
  ok(R.preKey&&R.preNew&&R.cpuYr, 'the preseason market is refreshed again and CPU staff is rolled to the new season');
  ok(R.pot&&R.ledger, 'nobody passes his potential; the growth ledger books the staff share');

  /* ---------- poaching ---------- */
  const P=await page.evaluate(()=>{ const C0=App.C; const C=JSON.parse(JSON.stringify(C0)); const S=v1821cS(C); const yr=C.year-1;
    S.u.JV={id:'pX',nm:'Star Assistant',r:84,sp:'attacking',sal:60,since:yr,end:yr+1,yrs:2,hue:1}; S.u.MOD=S.u.MOD||{id:'pY',nm:'Okay Assistant',r:60,sp:'youth',sal:20,since:yr,end:yr+3,yrs:1,hue:2}; S.u.MOD.r=60;
    const keep=V1821C.POACH; V1821C.POACH=0; const C2=JSON.parse(JSON.stringify(C)); v1821cAfterRoll(C2,yr,true); const none=!!C2.stf.u.JV;
    const C3=JSON.parse(JSON.stringify(C)); v1821cAfterRoll(C3,yr,false); const weak=!!C3.stf.u.JV;
    V1821C.POACH=1; v1821cAfterRoll(C,yr,true); V1821C.POACH=keep;
    const n=C.news.find(x=>/hire away/.test(x.text)); return {none,weak,gone:!S.u.JV,mod:!!S.u.MOD,news:n&&n.text,lost:S.lost.some(x=>x.why==='poach'&&x.nm==='Star Assistant')}; });
  console.log(JSON.stringify(P));
  ok(P.none&&P.weak&&P.gone&&P.mod&&P.lost&&/Star Assistant/.test(P.news||''), `poaching: only after a strong season, only good coaches (75+), with news ("${P.news}")`);

  /* ---------- CPU parity ---------- */
  const Q=await page.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const u=C.userSid; const sids=v1821cCpuSids(C); const avg={}; for(const k of V1821C.ROLES) avg[k]=+(sids.reduce((a,s)=>a+S.cpu.s[s][k],0)/sids.length).toFixed(2);
    const lv={}; for(const l of LVLS){ const ps=Object.values(C.players).filter(p=>p.sid!==u&&C.league.includes(p.sid)&&p.lvl===l); lv[l]=+(ps.reduce((a,p)=>a+v1821cMultFor(C,p),0)/ps.length).toFixed(4); }
    const spread=Math.max(...sids.map(s=>S.cpu.s[s].JV))-Math.min(...sids.map(s=>S.cpu.s[s].JV));
    /* five more seasons of CPU rolls stay centred */
    const C2=JSON.parse(JSON.stringify(C)); const S2=v1821cS(C2); const means=[]; for(let i=0;i<5;i++){ C2.year++; v1821cS(C2); means.push(+(sids.reduce((a,s)=>a+S2.cpu.s[s].GK,0)/sids.length).toFixed(2)); }
    return {avg,lv,spread,means}; });
  console.log(JSON.stringify(Q));
  ok(Object.values(Q.avg).every(v=>Math.abs(v-60)<0.3)&&Q.spread>5, `CPU staff: each role averages 60 across the league (${JSON.stringify(Q.avg)}) with real spread between schools (${Q.spread.toFixed(1)})`);
  ok(Object.values(Q.lv).every(v=>Math.abs(v-1)<0.02)&&Q.means.every(v=>Math.abs(v-60)<0.3), `CPU average multiplier per level ${JSON.stringify(Q.lv)}; stays centred over later seasons (${Q.means.join(', ')})`);
  await page.close();

  /* ---------- balance measurement ---------- */
  const run=async(seed,mode)=>{ const pg=await mk(seed); const r=await pg.evaluate((mode)=>{ const C=App.C; const u=C.userSid; V1821D.off=mode==='off';
      /* a sensible manager: best staff for the budget, weighting each role by the growth it touches (exhaustive over the market) */
      const best=()=>{ const M=v1821cMkt(C); const S=v1821cS(C); const W=v1821cWeights(C); const bud=v1821cBudget(C);
        const opts=V1821C.ROLES.map(k=>[{k,q:S.u[k],keep:true},{k,q:null},...M.c.filter(q=>q.role===k&&!q.hired).map(q=>({k,q}))]);
        let bv=-1e9,bc=null; const rec=(i,acc,pay,val)=>{ if(pay>bud) return; if(i===4){ if(val>bv){bv=val;bc=acc.slice();} return; } for(const o of opts[i]){ acc.push(o); rec(i+1,acc,pay+(o.q?o.q.sal:0),val+W[o.k]*v1821cEff(o.q?o.q.r:V1821C.VOL)); acc.pop(); } };
        rec(0,[],0,0); for(const o of bc) if(!o.keep&&S.u[o.k]) v1821cRelease(C,o.k); for(const o of bc) if(!o.keep&&o.q){ const h=v1821cHire(C,o.q.id,3); if(!h.ok) throw new Error(h.msg); } return bc.map(o=>o.k+' '+(o.q?o.q.r:45)).join(', '); };
      let plan=''; if(mode==='well') plan=best();
      /* the ceiling: four rated-90 coaches regardless of budget */
      if(mode==='max'){ const S=v1821cS(C); for(const k of V1821C.ROLES) S.u[k]={id:'mx'+k,nm:'Max Coach',r:90,sp:V1821C_SPECS[k][0],sal:0,since:C.year,end:C.year+3,yrs:0,hue:0}; plan='all four rated 90'; }
      const st={}; for(const id in C.players){ const p=C.players[id]; if(C.schools[p.sid].ext) continue; st[id]={l:p.lvl,o:ovr(p),u:p.sid===u}; }
      let g=0; while(C.phase!=='offseason'&&g++<300){ const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M);} simRound(C); advance(C); }
      if(mode==='well') plan+=' / offseason: '+best();
      /* snapshot right after the offseason growth (the first graduation), so seniors count too */
      let fin=null; const _go=gradOutcome; gradOutcome=function(){ if(!fin){ fin={}; for(const id in C.players) fin[id]=ovr(C.players[id]); } return _go.apply(this,arguments); };
      rollover(C); gradOutcome=_go; V1821D.off=false;
      const d={}; for(const id in st){ if(id in fin) d[id]=[(st[id].u?'U':'C')+st[id].l,fin[id]-st[id].o]; } return {plan,d}; },mode); await pg.close(); return r; };
  const table=[]; let worst=0, cpuWorst=0;
  for(const seed of ['777','staff-bal-2','staff-bal-3']){ const off=await run(seed,'off'), on=await run(seed,'on'), well=await run(seed,'well');
    /* average over the same players in every run (players present at the season start and at the offseason growth) */
    const avg=(R,k)=>{ let t=0,n=0; for(const id in off.d){ if(off.d[id][0]!==k||!R.d[id]||!on.d[id]||!well.d[id]) continue; t+=R.d[id][1]; n++; } return t/Math.max(1,n); };
    for(const l of ['V','JV','MOD']){ const row={seed,l,uOff:avg(off,'U'+l),uOn:avg(on,'U'+l),uWell:avg(well,'U'+l),cOff:avg(off,'C'+l),cOn:avg(on,'C'+l),cWell:avg(well,'C'+l)}; table.push(row);
      worst=Math.max(worst,row.uWell/row.uOff-1); cpuWorst=Math.max(cpuWorst,Math.abs(row.cWell/row.cOff-1),Math.abs(row.cOn/row.cOff-1)); }
    console.log(`seed ${seed}: sensible staff = ${well.plan}`); }
  { const off=await run('777','off'), mx=await run('777','max'); const avg=(R,k)=>{ let t=0,n=0; for(const id in off.d){ if(off.d[id][0]!==k||!R.d[id]) continue; t+=R.d[id][1]; n++; } return t/Math.max(1,n); };
    const lv=['V','JV','MOD'].map(l=>avg(mx,'U'+l)/avg(off,'U'+l)-1); console.log('ceiling (seed 777, four 90s, no budget): '+lv.map((x,i)=>['V','JV','MOD'][i]+' '+(x*100).toFixed(1)+'%').join(', '));
    ok(lv.every(x=>x<=0.13)&&lv.some(x=>x>0.08), 'the unaffordable ceiling (four rated-90 coaches cost $376k; the budget tops out at $199k) stays near the +12% per-player cap (lineup knock-on effects add a few tenths)'); }
  console.log('seed        level  you:off  you:as-is  you:staffed (delta)   CPU:off  CPU:staffed (delta)');
  for(const t of table) console.log(`${t.seed.padEnd(11)} ${t.l.padEnd(5)} ${t.uOff.toFixed(2).padStart(7)} ${t.uOn.toFixed(2).padStart(9)} ${t.uWell.toFixed(2).padStart(9)} (${((t.uWell/t.uOff-1)*100).toFixed(1).padStart(5)}%) ${t.cOff.toFixed(2).padStart(9)} ${t.cWell.toFixed(2).padStart(9)} (${((t.cWell/t.cOff-1)*100).toFixed(1).padStart(5)}%)`);
  ok(worst<=0.12, `staffing well adds at most +12% to your per-player yearly growth at any level (worst ${(worst*100).toFixed(1)}%)`);
  ok(table.some(t=>t.uWell>t.uOff*1.02), 'staffing well is a real edge at some level (more than +2%)');
  ok(cpuWorst<0.03, `CPU growth stays within 3% of baseline (worst ${(cpuWorst*100).toFixed(1)}%)`);

  /* ---------- UI ---------- */
  const shots=async(pg,name,theme)=>{ if(theme) await pg.evaluate(t=>{ PREFS.theme={preset:t,custom:null}; applyTheme(); render(); },theme); await pg.waitForTimeout(250); await pg.screenshot({path:`${SHOTS}/staff_${name}.png`,fullPage:false}); };
  const ui=await mk('staff-ui');
  const U=await ui.evaluate(()=>{ App.route='office'; App.params={}; render(); const dec=document.querySelector('.v1821c-dec'); const decT=dec&&dec.textContent;
    App.route='dev'; App.params={}; render(); const bar=document.querySelector('.v1821d-tabs [data-k="staff"]'); const badge=bar&&bar.querySelector('.v1821d-bd'); const chip=[...document.querySelectorAll('.v1821d-sum')].find(x=>x.dataset.k==='staff');
    App.params={dtab:'staff'}; render(); const q=s=>document.querySelectorAll(s);
    return {decT,tab:!!bar&&/Staff/.test(bar.textContent),badge:badge&&badge.textContent,chip:chip&&chip.textContent,warn:chip&&chip.classList.contains('warn'),roles:q('.v1821c-role').length,vac:q('.v1821c-role.vac').length,bar:!!document.querySelector('.v1821c-bar'),
      cands:q('.v1821c-cand').length,fx:[...q('.v1821c-role .v1821c-fx')].map(e=>e.textContent),hire:q('[data-a="v1821cHire"]').length,sel:q('.v1821c-len select').length}; });
  console.log(JSON.stringify(U));
  ok(U.decT&&/Goalkeeper Coach role is vacant/.test(U.decT), `This week item on the Overview: "${(U.decT||'').trim()}"`);
  ok(U.tab&&U.badge==='1'&&U.chip&&/Goalkeeper Coach role is vacant/.test(U.chip)&&U.warn, `Staff tab with badge ${U.badge}; growth card chip "${U.chip}"`);
  ok(U.roles===4&&U.vac===1&&U.bar&&U.cands>=12&&U.fx.every(t=>/(JV|Modified|Goalkeeper|Varsity) growth [+−±]\d+%/.test(t))&&U.sel===U.cands, `four role cards (${U.fx.join(' | ')}), budget bar, ${U.cands} candidates each with a contract length`);
  await ui.evaluate(()=>{ App.route='office'; App.params={}; render(); const e=document.querySelector('.v1821c-dec'); if(e) e.scrollIntoView({block:'center'}); }); await shots(ui,'desktop_office');
  await ui.evaluate(()=>{ App.route='dev'; App.params={}; render(); const e=document.querySelector('.v1821d-sums'); if(e) e.scrollIntoView({block:'center'}); }); await shots(ui,'desktop_chip');
  await ui.evaluate(()=>{ App.route='dev'; App.params={dtab:'staff'}; render(); window.scrollTo(0,0); });
  await shots(ui,'desktop_dark');
  await ui.evaluate(()=>{ const e=document.querySelector('.v1821c-mkt'); if(e) window.scrollTo(0,e.getBoundingClientRect().top+window.scrollY-80); }); await shots(ui,'desktop_market'); await ui.evaluate(()=>window.scrollTo(0,0));
  /* hire through the UI: the best affordable keeper coach */
  const id=await ui.evaluate(()=>{ const b=[...document.querySelectorAll('#v1821c-m-GK [data-a="v1821cHire"]:not([disabled])')][0]; return b&&b.dataset.id; });
  await ui.selectOption(`#v1821c-len-${id}`,'3'); await ui.click(`[data-a="v1821cHire"][data-id="${id}"]`); await ui.waitForTimeout(250);
  const U2=await ui.evaluate(()=>{ const C=App.C; const S=v1821cS(C); const chip=v1821cSummary(C); return {gk:!!S.u.GK, end:S.u.GK&&S.u.GK.end===C.year+2, vac:document.querySelectorAll('.v1821c-role.vac').length, chip:chip.t, badge:v1821cBadge(C)}; });
  ok(U2.gk&&U2.end&&U2.vac===0&&/^Staff: /.test(U2.chip)&&U2.badge==='', `hired from the page with a 3-season contract; the chip now reads "${U2.chip}"`);
  await ui.click('[data-a="v1821cRel"][data-k="MOD"]'); await ui.waitForTimeout(200); const modal=await ui.evaluate(()=>(document.querySelector('.modal')||{}).textContent||'');
  await ui.click('[data-a="v1821cRelYes"]'); await ui.waitForTimeout(250); const rel=await ui.evaluate(()=>v1821cS(App.C).u.MOD===null&&document.querySelectorAll('.v1821c-role.vac').length===1);
  ok(/frees \$\d+k/.test(modal)&&/−6%/.test(modal)&&rel, 'Release asks first (salary freed, growth effect in numbers) and leaves a vacancy');
  await ui.evaluate(()=>{ App.params={dtab:'staff',srole:'MOD'}; render(); }); const filt=await ui.evaluate(()=>document.querySelectorAll('.v1821c-grp').length===1&&!!document.getElementById('v1821c-m-MOD'));
  ok(filt, 'the market filters by role');
  await ui.evaluate(()=>{ App.params={dtab:'staff'}; render(); window.scrollTo(0,0); });
  await shots(ui,'desktop_gold','gold');
  await ui.evaluate(()=>{ PREFS.theme={preset:'dark',custom:null}; applyTheme(); render(); });
  /* the offseason page: renewals */
  await ui.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); advance(C); } App.route='dev'; App.params={dtab:'staff'}; render(); window.scrollTo(0,0); });
  const O=await ui.evaluate(()=>({renew:document.querySelectorAll('.v1821c-renew').length, exp:v1821cDecisions(App.C).length, open:/Offseason/.test((document.querySelector('.v1821c-open')||{}).textContent||'')}));
  ok(O.renew>=1&&O.open, `offseason: ${O.renew} contract renewal block(s), market open`);
  await shots(ui,'desktop_offseason');
  const midScroll=await ui.evaluate(()=>{ const C=App.C; return document.documentElement.scrollWidth<=window.innerWidth; });
  await ui.close();
  /* phone */
  const ph=await mk('staff-ui',{width:390,height:844});
  const PH=await ph.evaluate(()=>{ App.route='dev'; App.params={dtab:'staff'}; render(); const r={pre:document.documentElement.scrollWidth<=window.innerWidth};
    const over=[...document.querySelectorAll('.v1821c-role,.v1821c-cand,.v1821c-top')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).length; r.over=over; return r; });
  await shots(ph,'phone_dark'); await ph.evaluate(()=>{ const e=document.getElementById('v1821c-m-JV'); if(e) e.scrollIntoView(); }); await shots(ph,'phone_market');
  await shots(ph,'phone_gold','gold');
  const PH2=await ph.evaluate(()=>{ PREFS.theme={preset:'dark',custom:null}; applyTheme(); const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); advance(C); } App.route='dev'; App.params={dtab:'staff'}; render(); window.scrollTo(0,0); return document.documentElement.scrollWidth<=window.innerWidth; });
  await shots(ph,'phone_offseason');
  ok(PH.pre&&PH.over===0&&PH2&&midScroll, 'phone 390 px (preseason and offseason) and desktop: no sideways scroll');

  /* ---------- old save ---------- */
  const OS=await ph.evaluate(async()=>{ const C=App.C; delete C.stf; await saveNow(); App.C=null; await openSlot(1); const C2=App.C; const had=!!C2.stf;
    App.route='dev'; App.params={dtab:'staff'}; render(); const S=C2.stf; const okR=document.querySelectorAll('.v1821c-role').length===4;
    const before=JSON.stringify(S); const C3=migrate(JSON.parse(JSON.stringify(C2))); const idem=JSON.stringify(C3.stf)===before;
    return {had,created:!!S&&S.v===1,okR,idem,phase:C2.phase}; });
  console.log(JSON.stringify(OS));
  ok(OS.created&&OS.okR&&OS.idem, `an old save without staff loads (${OS.phase}); staff is created lazily and the page renders; migrate is idempotent`);
  await ph.close();

  ok(errs.length===0, `no page errors${errs.length?': '+errs.slice(0,3).join(' | '):''}`);
  await b.close(); console.log(fails?`${fails} FAIL`:'ALL PASS'); process.exit(fails?1:0); })();
