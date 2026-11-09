// v18.22 Booster Fund (src/v17/9p_fund*.js): funds and income, facility upgrades (cost, cap, coverage by level), private coaching
// (3 slots, window, plan exclusion, GK ok, expires), CPU parity, balance (the feature alone vs the system off, read from the ledger),
// old saves, determinism, the Facilities tab on desktop and phone.
const { chromium, DIST } = require('./_pw');
const ISO="V1821D.only=new Set(['fund','fundpc']); V1821C.off=V1821P.off=V1821M.off=V1821T.off=V1821U.off=true; V1822.off=true;";
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.evaluate(ISO); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Fund Coach'); await page.fill('#nc-seed',seed); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const p=await mk('fund-1');
  const A1=await p.evaluate(()=>{ const C=App.C; const u=C.userSid; const o={}; const S=v1821fS(C); o.start=S.funds; o.lv=Object.values(S.lv).join('');
    const pl=squad(C,u,'JV').find(x=>x.pot>ovr(x)+3); o.base=v1821dMult(C,pl,'tick').m; o.cost=[v1821fCost(C,'wr')]; const r1=v1821fUp(C,'wr'); o.up1=r1.ok&&S.lv.wr===2&&S.funds===4; o.afterWr=v1821dMult(C,pl,'tick').m;
    const r2=v1821fUp(C,'tp'); o.poor=!r2.ok&&S.funds===4; S.funds=30; v1821fUp(C,'wr'); o.l3=S.lv.wr===3&&S.funds===20; o.max=!v1821fUp(C,'wr').ok;
    S.funds=60; for(const k of ['wr','fr','tp','ya']){ v1821fUp(C,k); v1821fUp(C,k); } o.all3=Object.values(S.lv).join(''); const mv=v1821dMult(C,pl,'tick'); o.capped=mv.m<=V1821F.CAP+1e-9&&mv.raw>V1821F.CAP-1e-9; o.m=mv.m;
    const gv=squad(C,u,'V').find(x=>x.pos==='GK'); const v=squad(C,u,'V')[0]; o.cover=v1821fFacOf(C,{...v,lvl:'V'}).parts.map(x=>x.k).join(',')+'|'+v1821fFacOf(C,{...v,lvl:'MOD'}).parts.map(x=>x.k).join(',');
    S.funds=0; S.lv={wr:1,fr:1,tp:1,ya:1}; S.funds=9; const c=squad(C,u,'MOD').filter(x=>x.pot>ovr(x)+2); const g=squad(C,u,'V').filter(x=>x.pot>ovr(x)+1);
    o.c1=v1821fCoach(C,c[0].id).ok; o.mult=v1821dMult(C,c[0],'tick').m; o.offNone=v1821dMult(C,c[0],'off').m; o.c2=v1821fCoach(C,c[1].id).ok; o.c3=v1821fCoach(C,g[0].id).ok; o.left=S.funds; S.funds=9; o.c4=v1821fCoach(C,c[2].id); o.dup=!v1821fCoach(C,c[0].id).ok;
    return o; });
  console.log(JSON.stringify(A1));
  ok(A1.start===10&&A1.lv==='1111'&&Math.abs(A1.base-1)<1e-9, 'a new career starts with 10 funds, every facility at level 1 and no bonus');
  ok(A1.up1&&A1.poor&&A1.l3&&A1.max&&A1.afterWr>1, 'upgrades cost 6 (level 2) and 10 (level 3), need the funds, stop at level 3, and the bonus applies');
  ok(A1.all3==='3333'&&A1.capped&&Math.abs(A1.m-1.1)<1e-9, `all facilities at level 3 is capped at +10% (x${(A1.m||0).toFixed(3)})`);
  ok(A1.cover==='wr,fr,tp|wr,tp,ya', 'coverage: Varsity gets weight room, film room and pitch; Modified gets weight room, pitch and academy');
  ok(A1.c1&&A1.mult===1.25&&A1.offNone===1&&A1.c2&&A1.c3&&A1.left===0&&!A1.c4.ok&&/slots|funds/.test(A1.c4.msg)&&A1.dup, 'private coaching: x1.25 in-season only, three slots at 3 funds, a fourth or a repeat is refused');
  const A2=await p.evaluate(()=>{ const C=App.C; const u=C.userSid; const S=v1821fS(C); S.pc={yr:0,ids:[]}; S.funds=20; const o={}; const pl=squad(C,u,'V').find(x=>x.pot>ovr(x)+1);
    const pr=v1821pAdd(C,pl.id); o.onPlan=pr&&pr.ok!==false?(!v1821fCoach(C,pl.id).ok):'noplan'; const gk=squad(C,u,'V').find(x=>x.pos==='GK'&&x.pot>ovr(x)); o.gk=gk?v1821fCoach(C,gk.id).ok:'nogk';
    const sen=squad(C,u,'V').find(x=>x.pot<=ovr(x)); o.maxed=sen?!v1821fCoach(C,sen.id).ok:'none';
    S.pc={yr:0,ids:[]}; let gg=0; while(!(C.phase==='regular'&&C.md>=11)&&gg++<40){ simRound(C); advance(C); } o.closed=!v1821fCoach(C,squad(C,u,'JV').find(x=>x.pot>ovr(x)+1).id).ok&&!v1821fCoachOpen(C);
    return o; });
  console.log(JSON.stringify(A2));
  ok(A2.onPlan===true, 'a player on a Player Plan cannot also be booked for private coaching');
  ok(A2.gk===true&&A2.maxed!==false, 'goalkeepers can be coached; a player at his potential cannot');
  ok(A2.closed, 'booking closes after matchday 11');
  /* income and expiry */
  const A3=await p.evaluate(()=>{ const C=App.C; const u=C.userSid; const S=v1821fS(C); const y0=C.year; S.funds=5; S.pc={yr:y0,ids:squad(C,u,'V').slice(0,2).map(x=>x.id)}; const pre=S.pc.ids[0]; let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); }
    const exp=v1821fIncome({...C,year:C.year+1}); const r=rollover(C); return {ok:r&&r.ok,yr:C.year-y0,funds:S.funds,exp,expired:!v1821dMult(C,C.players[pre]||{},'tick').parts.some(x=>x.k==='fundpc'),inc:S.hist[0]&&S.hist[0].t==='inc'}; });
  ok(A3.ok&&A3.yr===1&&A3.funds===5+A3.exp&&A3.inc&&A3.exp>=7&&A3.exp<=12&&A3.expired, `after a season the booster club adds ${A3.exp} funds (6 + prestige/20, +2 for a Section title) and private coaching expires`);
  /* cap on banked funds */
  const A4=await p.evaluate(()=>{ const C=App.C; const S=v1821fS(C); S.funds=23; S.inc=0; let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); } rollover(C); return S.funds; });
  ok(A4===24, 'banked funds are capped at 24');
  /* old save, determinism */
  const A5=await p.evaluate(()=>{ const C=App.C; const raw=JSON.parse(JSON.stringify(careerForSave(C))); delete raw.fnd; const M=migrate(raw); const S=v1821fS(M); const bad=JSON.parse(JSON.stringify(careerForSave(C))); bad.fnd={funds:'x',lv:{wr:9}}; const B=migrate(bad); const S2=v1821fS(B); return {a:S.funds===10&&Object.values(S.lv).join('')==='1111',b:S2.funds===10&&S2.lv.wr===1}; });
  ok(A5.a&&A5.b, 'an old save (no fund) starts with 10 funds at level 1; a broken fund is repaired');
  await p.context().close();
  /* UI */
  const u1=await mk('fund-ui'); const U=await u1.evaluate(()=>{ App.route='dev'; App.params={dtab:'fund'}; render(); const d=document; const o={cards:d.querySelectorAll('.v1821f-fc').length,btn:!!d.querySelector('[data-a="v1821fUp"]'),rows:d.querySelectorAll('.v1821f-row').length,tab:!!d.querySelector('[data-k="fund"].on')};
    const b=d.querySelector('[data-a="v1821fUp"]'); A.v1821fUp({dataset:{k:'wr'}}); o.after=v1821fS(App.C).lv.wr; o.funds=d.querySelector('.v1821f-big').textContent; const bk=d.querySelector('[data-a="v1821fCoach"]:not([disabled])'); if(bk){ A.v1821fCoach({dataset:{id:bk.dataset.id}}); } o.booked=d.querySelectorAll('.v1821f-row .chip.acc').length; A.v1821fLvl({dataset:{k:'MOD'}}); o.mod=d.querySelectorAll('.v1821f-row').length;
    App.params={}; render(); o.chip=/Booster Fund/.test(d.body.textContent); return o; });
  console.log(JSON.stringify(U));
  ok(U.cards===4&&U.btn&&U.rows>5&&U.tab&&U.after===2&&U.funds==='4'&&U.mod>5&&U.chip, 'the Facilities tab shows four facilities, the player list, upgrades and bookings work, the Overview card shows the fund');
  await u1.screenshot({path:'test/shots/v1821/fund_overview.png'}).catch(()=>{});
  await u1.evaluate(()=>{ App.route='dev'; App.params={dtab:'fund'}; render(); window.scrollTo(0,0); }); await u1.waitForTimeout(500); await u1.screenshot({path:'test/shots/v1821/fund_desktop.png'});
  await u1.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); }); await u1.screenshot({path:'test/shots/v1821/fund_gold.png'}); await u1.context().close();
  const ph=await mk('fund-ui',{width:390,height:844}); const PW=await ph.evaluate(()=>{ App.route='dev'; App.params={dtab:'fund'}; render(); const a=document.documentElement.scrollWidth; return a; }); await ph.screenshot({path:'test/shots/v1821/fund_phone.png',fullPage:true}); ok(PW<=390, `phone: no sideways scroll (${PW}px)`); await ph.context().close();
  /* parity and balance: this feature alone vs the whole system off */
  const run=async(seed,mode)=>{ const pg=await b.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.goto(DIST); await pg.evaluate(ISO); await pg.waitForTimeout(300);
    const r=await pg.evaluate(([seed,mode])=>{ V1821D.off=mode==='off'; V1821D.bookAll=true; const C=newCareer({slot:1,coachName:'B',seed,now:0}); App.C=C; const u=C.userSid; const y0=C.year;
      if(mode==='max'){ const S=v1821fS(C); S.funds=24; for(const k of ['wr','tp','fr','ya']) v1821fUp(C,k); for(const l of ['JV','MOD','V']){ const x=squad(C,u,l).filter(q=>q.pot>ovr(q)).sort((a,b)=>(b.pot-ovr(b))-(a.pot-ovr(a)))[0]; v1821fCoach(C,x.id); } }
      let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); } rollover(C); V1821D.off=false; V1821D.bookAll=false;
      const Y=(C.dvx&&C.dvx.yr[y0])||{}; const led={}; for(const k of ['V','JV','MOD','cV','cJV','cMOD']){ const L=Y[k]; led[k]=L&&L.base>0?L.tot/L.base:1; } return led; },[seed,mode]); await pg.close(); return r; };
  const rows=[]; let worstU=0, cLo=9, cHi=0, idleDev=0;
  for(const seed of [301,302]){ const I=await run(seed,'idle'), M=await run(seed,'max');
    for(const l of ['V','JV','MOD']){ rows.push(`seed ${seed} ${l.padEnd(3)} | you idle ${((I[l]-1)*100).toFixed(1)}% max ${((M[l]-1)*100).toFixed(1)}% | CPU ${((I['c'+l]-1)*100).toFixed(1)}%`); worstU=Math.max(worstU,M[l]-1); idleDev=Math.max(idleDev,Math.abs(I[l]-1)); cLo=Math.min(cLo,I['c'+l]); cHi=Math.max(cHi,I['c'+l]); } }
  console.log(rows.join('\n'));
  ok(idleDev<0.005, `with no spending you grow as before (${(idleDev*100).toFixed(2)}% off)`);
  ok(worstU<=0.12&&worstU>=0.03, `spending everything in year one adds +3% to +12% growth at any level (worst ${(worstU*100).toFixed(1)}%)`);
  ok(cLo>=0.995&&cHi<=1.04, `CPU schools' facilities add ${((cLo-1)*100).toFixed(1)}% to ${((cHi-1)*100).toFixed(1)}% (parity)`);
  const D=await Promise.all([1,2].map(async()=>{ const pg=await b.newPage(); await pg.goto(DIST); await pg.evaluate(ISO); const h=await pg.evaluate(()=>{ const C=newCareer({slot:1,coachName:'D',seed:303,now:0}); App.C=C; const S=v1821fS(C); S.funds=24; v1821fUp(C,'wr'); v1821fUp(C,'ya'); v1821fCoach(C,squad(C,C.userSid,'JV')[0].id); let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); } return Object.keys(C.players).sort().map(id=>id+Object.values(C.players[id].sk).map(v=>v.toFixed(3)).join(',')).join('|').length+':'+Object.values(C.players).reduce((a,q)=>a+q.sk.sho+q.sk.spd,0).toFixed(3); }); await pg.close(); return h; }));
  ok(D[0]===D[1], 'deterministic: the same seed and the same spending give identical players');
  ok(!errs.length, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?`${fails} FAILED`:'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
