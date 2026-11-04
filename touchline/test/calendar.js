// v18.19 Season Calendar (src/v17/9h_calendar*.js).
// Dates: seasonDate() maps every game to a real date (Preseason Cup in late August, league games on Tuesday and Friday from the
// week of Labor Day, one open week, postseason in late October / November) and weatherFor / Gameday read the same clock.
// The page: month grid (7 columns, game chips with crest + "@ ABC", results coloured, rivalry fire, today highlighted, the open
// week band, the homecoming bar, school events with tooltips), week and list views, the legend chips filter and persist,
// JV / Modified, clicking a game opens its fixture. The open week: the planner (four options), Play shows it first, Lock it in
// applies the effect exactly once with news and real rating changes; sim-ahead / simRound loops auto-pick Rest and never break;
// temporary boosts are undone after their games; every option does what it says; homecoming gives a bigger crowd and a home
// boost; results stay deterministic per seed; old saves migrate; the phone layout never scrolls sideways.
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SHOTS=__dirname+'/shots/v1819'; fs.mkdirSync(SHOTS,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Cal Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const page=await mk('cal-t1');

  /* ---------- dates ---------- */
  const D=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; const F=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.lvl==='V'&&(f.h===u||f.a===u)&&f.comp==='reg').sort((a,b)=>a.rd-b.rd);
    const sd=F.map(f=>seasonDate(C,f)); const pre=C.pre.fx.map(id=>seasonDate(C,C.fixtures[id]));
    const lab=v1819kYmd(v1819kLabor(C.year)); const post=['sec','rgn','st'].map(c=>v1819kYmd(v1819kFxDn({yr:C.year,comp:c,rd:c==='rgn'?0:2})));
    const ow=v1819kOpenDn(C.year); const inOW=sd.filter(x=>x.dn>=ow&&x.dn<=ow+6).length;
    const wx=weatherFor(F[3]); const gd=typeof v1812gWhen==='function'?v1812gWhen(F[3]):null;
    return {n:sd.length,dows:sd.map(x=>x.dow).join(''),first:sd[0].label,lab,pre:pre.map(x=>[x.m,x.d,x.dow]),gap:sd[8].dn-sd[7].dn,post,inOW,mono:sd.every((x,i)=>!i||x.dn>sd[i-1].dn),keys:Object.keys(sd[0]).sort().join(','),kick:wx.kick===sd[3].time||wx.night,gd:gd&&gd[0]===V1819K.DOW[sd[3].dow].toUpperCase()&&gd[1]===sd[3].time,yr:C.year,
      jv:(()=>{ const j=Object.values(C.fixtures).find(f=>f.yr===C.year&&f.lvl==='JV'&&f.comp==='reg'&&f.rd===0); const s=seasonDate(C,j); return s.dn===sd[0].dn&&s.time!==sd[0].time; })()}; });
  console.log(JSON.stringify(D));
  ok(D.n===14&&D.dows==='25252525252525'&&D.mono&&D.keys.includes('dow')&&D.keys.includes('label')&&D.keys.includes('time'), `14 league games on Tuesdays and Fridays in order; seasonDate returns {y,m,d,dow,time,label} (first: ${D.first})`);
  ok(D.lab.m===8&&D.lab.dow===1&&D.lab.d<=7&&D.pre.every(p=>(p[0]===7&&p[1]>=20)||(p[0]===8&&p[1]<=5)), `week 1 starts on Labor Day (Sep ${D.lab.d}); the Preseason Cup is in late August (${D.pre.map(p=>(p[0]+1)+'/'+p[1]).join(', ')})`);
  ok(D.gap===11&&D.inOW===0, 'one open week after matchday 8: Friday to the next Tuesday is 11 days and no league game falls in it');
  ok(D.post.every(p=>p.m===10||(p.m===9&&p.d>=25)), `postseason in late October / November (Section final ${D.post[0].m+1}/${D.post[0].d}, Regional ${D.post[1].m+1}/${D.post[1].d}, State final ${D.post[2].m+1}/${D.post[2].d})`);
  ok(D.kick&&D.gd&&D.jv, 'weatherFor\'s kickoff and the Gameday Graphics day/time read the calendar; JV plays the same day earlier');

  /* ---------- the page ---------- */
  const P=await page.evaluate(()=>{ const C=App.C; let g=0; while(!(C.phase==='regular'&&C.md>=6)&&g++<40){ simRound(C); advance(C); }
    App.route='calendar'; App.params={cv:'month'}; render(); const q=s=>document.querySelectorAll(s);
    const today=v1819kToday(C); const tt=v1819kYmd(today); const inMonth=v1819kItems(C).filter(it=>it.kind==='game'&&v1819kYmd(it.dn).m===tt.m).length;
    const r={nav:TOPNAV.find(t=>t[0]==='schedule')[3].includes('calendar')&&TITLES.calendar==='Season Calendar',cols:getComputedStyle(document.querySelector('.v1819k-row')).gridTemplateColumns.split(' ').length,
      chips:q('.v1819k-day:not(.out) .v1819k-g').length,inMonth,today:q('.v1819k-day.today').length,todayDn:+(document.querySelector('.v1819k-day.today')||{dataset:{}}).dataset.dn===today,
      tag:/^(@|vs) [A-Z]{2,3}/.test((document.querySelector('.v1819k-g b')||{}).textContent||''),crest:!!document.querySelector('.v1819k-g svg'),
      res:[...q('.v1819k-g.rW small,.v1819k-g.rL small,.v1819k-g.rD small')].every(s=>/^[WDL] \d+-\d+/.test(s.textContent))&&q('.v1819k-g.rW,.v1819k-g.rL,.v1819k-g.rD').length>0,
      h2:(document.querySelector('.v1819k-ttl h2')||{}).textContent,side:!!document.querySelector('.v1819k-plan')&&q('.v1819k-opt').length===4,glance:q('.v1819k-glance .v1819k-pip').length,gh:(document.querySelector('.v1819k-gh span')||{}).textContent};
    /* rivalry and the open week band / homecoming bar: look at every month */
    let fire=0, band=0, bar=0, evs=0, tips=0; for(let m=7;m<=10;m++){ App.params.cm=String(m); render(); fire+=q('.v1819k-g.riv .v1819k-fire').length; band+=q('.v1819k-band').length; bar+=q('.v1819k-bar.k-homecoming').length; evs+=q('.v1819k-day:not(.out) .v1819k-ev').length; tips+=[...q('.v1819k-ev,.v1819k-bar')].filter(e=>(e.title||'').length>10).length; }
    r.fire=fire; r.band=band; r.bar=bar; r.evs=evs; r.tips=tips;
    const riv=v1819kItems(C).filter(it=>it.kind==='game'&&it.riv).length; r.riv=riv;
    App.params.cm='9'; render(); r.bandTxt=(document.querySelector('.v1819k-band')||{}).textContent||'';
    const E=v1819kEvents(C); r.ek=E.map(e=>e.k).join(','); r.hc=E.find(e=>e.k==='homecoming'); r.hcOk=r.hc&&r.hc.dn2-r.hc.dn===4&&v1819kYmd(r.hc.dn).dow===1; return r; });
  console.log(JSON.stringify({...P,hc:undefined}));
  ok(P.nav&&P.cols===7&&P.h2&&/\d{4}/.test(P.h2), `Season Calendar is in the Schedule menu; the month grid has 7 columns (${P.h2})`);
  ok(P.chips===P.inMonth&&P.tag&&P.crest&&P.res, `every game this month is a chip with the opponent crest and "@ ABC"/"vs ABC"; played games show coloured results (${P.chips} chips)`);
  ok(P.today===1&&P.todayDn, 'today\'s cell is highlighted (the date of the next game)');
  ok(P.fire===P.riv&&P.riv>0, `rivalry games carry a fire marker (${P.fire})`);
  ok(P.band===1&&/OPEN WEEK|Open week/i.test(P.bandTxt)&&/No league games/i.test(P.bandTxt), `the open week is a striped band labelled "${P.bandTxt.trim()}"`);
  ok(P.bar>=1&&P.hcOk&&['school','picture','booster','homecoming','inservice','halloween','report','thanks','banquet'].every(k=>P.ek.includes(k))&&P.evs>=7&&P.tips>=8, `school events with tooltips (${P.ek}); homecoming is a Mon-Fri bar`);
  ok(P.side&&P.glance===15&&/\d+–\d+–\d+ so far · \d+ games? to go/.test(P.gh||''), `the planner (4 options) and Season at a glance (14 pips + the open week ◆, "${P.gh}")`);
  await page.waitForTimeout(400); await page.evaluate(()=>{ delete App.params.cm; render(); }); await page.waitForTimeout(300);
  await page.screenshot({path:SHOTS+'/desktop_month.png'});

  /* legend filter, week, list, JV, clicking a game */
  const V=await page.evaluate(()=>{ const C=App.C; const q=s=>document.querySelectorAll(s); const r={};
    document.querySelector('[data-a="v1819kToggle"][data-k="game"]').click(); r.off=q('.v1819k-g').length===0&&C.cal.show.game===0;
    document.querySelector('[data-a="v1819kToggle"][data-k="game"]').click(); r.on=q('.v1819k-g').length>0;
    document.querySelector('[data-a="v1819kToggle"][data-k="ev"]').click(); r.evOff=q('.v1819k-ev').length===0; document.querySelector('[data-a="v1819kToggle"][data-k="ev"]').click();
    document.querySelector('[data-a="v1819kToggle"][data-k="riv"]').click(); r.rivOff=q('.v1819k-fire').length===0; document.querySelector('[data-a="v1819kToggle"][data-k="riv"]').click();
    const m0=document.querySelector('.v1819k-ttl h2').textContent; document.querySelector('[data-a="v1819kStep"][data-d="1"]').click(); r.next=document.querySelector('.v1819k-ttl h2').textContent!==m0; document.querySelector('[data-a="v1819kToday"]').click(); r.back=document.querySelector('.v1819k-ttl h2').textContent===m0;
    document.querySelector('[data-a="v1819kView"][data-v="week"]').click(); r.wcols=q('.v1819k-wcol').length; r.wtoday=q('.v1819k-wcol.today').length; r.wgame=q('.v1819k-wg').length;
    document.querySelector('[data-a="v1819kView"][data-v="list"]').click(); r.lgames=q('.v1819k-li.g').length; r.lopen=q('.v1819k-li.open').length; r.lev=q('.v1819k-li.ev').length; r.lnow=q('.v1819k-lnow').length;
    const ds=[...q('.v1819k-li')].map(x=>x.querySelector('.v1819k-ld b')); r.lmonths=[...q('.v1819k-lm')].map(h=>h.textContent).join(',');
    document.querySelector('[data-a="setParam"][data-k="clvl"][data-v="JV"]').click(); r.jv=q('.v1819k-li.g').length; r.jvKick=/JV/.test(document.querySelector('.v1819k-kick').textContent);
    document.querySelector('[data-a="setParam"][data-k="clvl"][data-v="V"]').click();
    const g=document.querySelector('.v1819k-li.g[data-a="openFixture"]'); const id=g.dataset.id; g.click(); r.modal=App.modal&&App.modal.type==='fixture'&&App.modal.id===id&&!!document.querySelector('#modal-root .modal'); App.modal=null; renderModal(); return r; });
  console.log(JSON.stringify(V));
  ok(V.off&&V.on&&V.evOff&&V.rivOff, 'the legend chips hide and show games, school events and rivalry markers (and the choice is saved on the career)');
  ok(V.next&&V.back, 'prev/next month and Today');
  ok(V.wcols===7&&V.wtoday===1&&V.wgame>=1, `week view: 7 day columns with game details (${V.wgame} game)`);
  ok(V.lgames===17&&V.lopen===1&&V.lev>=8&&V.lnow===1&&/August/.test(V.lmonths)&&/November/.test(V.lmonths), `list view: every game (3 preseason + 14 league), the open week, events and a "Today" line, August to November`);
  ok(V.jv===14&&V.jvKick, 'JV toggle shows the JV schedule (14 games)');
  ok(V.modal, 'clicking a game opens its fixture modal');
  await page.evaluate(()=>{ App.params={cv:'list'}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:SHOTS+'/desktop_list.png'});
  await page.evaluate(()=>{ App.params={cv:'week'}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:SHOTS+'/desktop_week.png'});

  /* ---------- Overview item ---------- */
  const OV=await page.evaluate(()=>{ App.route='office'; App.params={}; render(); const d=document.querySelector('.v1817o-items .v1819k-dec'); return {d:!!d,t:d&&d.textContent}; });
  ok(OV.d&&/open week/i.test(OV.t), `the Overview's "This week" row has the open-week item ("${(OV.t||'').trim().slice(0,60)}")`);

  /* ---------- the gate: Play at the open week shows the planner, Lock it in applies the friendly once ---------- */
  const G=await page.evaluate(()=>{ const C=App.C; let g=0; while(C.md<8&&g++<10){ simRound(C); advance(C); } const r={md:C.md,pend:v1819kPending(C),label:playLabel(C)};
    const u=C.userSid; const lu=getLu(C,u,'V'); const xi=new Set(lu.slots.map(s=>s.pid)); const bench=squad(C,u,'V').filter(p=>!xi.has(p.id)&&p.pot>ovr(p)+1); const b0={}; bench.forEach(p=>b0[p.id]=ovr(p));
    const xi0={}; squad(C,u,'V').filter(p=>xi.has(p.id)).forEach(p=>xi0[p.id]=ovr(p));
    A.playNext(); r.gate=App.modal&&App.modal.type==='v1819kPlan'&&!!document.querySelector('#modal-root .v1819k-opt'); r.stillMd=C.md===8&&!v1819kOW(C).done;
    r.lockDis=document.querySelector('#modal-root [data-a="v1819kLock"]').disabled;
    document.querySelector('#modal-root [data-a="v1819kPick"][data-k="friendly"]').click(); r.on=!!document.querySelector('#modal-root .v1819k-opt.on[data-k="friendly"]')&&/✓/.test(document.querySelector('#modal-root .v1819k-opt.on .v1819k-ck').textContent);
    const n0=C.news.filter(n=>n.v1819k).length; document.querySelector('#modal-root [data-a="v1819kLock"]').click();
    const O=v1819kOW(C); r.done=O.done&&O.pick==='friendly'&&!O.auto; r.news=C.news.filter(n=>n.v1819k).length-n0; r.newsTxt=(C.news.find(n=>n.v1819k)||{}).text;
    r.gain=bench.filter(p=>ovr(p)>b0[p.id]+0.2).length; r.bench=bench.length; r.xiSame=Object.keys(xi0).every(id=>Math.abs(ovr(C.players[id])-xi0[id])<0.01||C.cal.fx.some(e=>e.pid===id));
    r.recap=!!document.querySelector('#modal-root .v1819k-recap')&&/Friendly/.test(document.querySelector('#modal-root .v1819k-recap').textContent); r.opp=O.res.opp; r.state=!!(App.C.poll&&App.C.poll.pool&&App.C.poll.pool.teams.some(t=>t.id===O.res.opp.id))&&!C.league.includes(O.res.opp.id);
    v1819kResolve(C,'again'); r.once=C.news.filter(n=>n.v1819k).length-n0===1;
    document.querySelector('#modal-root [data-a="v1819kGo"]').click(); r.after=App.modal&&App.modal.type==='fixture';
    App.modal=null; renderModal(); App.route='calendar'; App.params={cv:'month',cm:String(v1819kYmd(v1819kOpenDn(C.year)).m)}; render(); r.frChip=!!document.querySelector('.v1819k-g.fr.rW,.v1819k-g.fr.rL,.v1819k-g.fr.rD'); r.band=/Friendly/.test((document.querySelector('.v1819k-band')||{}).textContent||'');
    return r; });
  console.log(JSON.stringify(G));
  ok(G.md===8&&G.pend&&G.label==='Plan the open week', 'at the open week the Play button reads "Plan the open week"');
  ok(G.gate&&G.stillMd&&G.lockDis, 'Play opens the planner first (nothing locked yet; Lock it in waits for a pick)');
  ok(G.on, 'the picked card is highlighted with a check');
  ok(G.done&&G.news===1&&G.recap&&G.once, `Lock it in plays the week out once: news ("${(G.newsTxt||'').slice(0,90)}...") and a recap; resolving again does nothing`);
  ok(G.gain>=Math.min(3,G.bench)&&G.xiSame&&G.state, `the friendly is against ${G.opp&&G.opp.town}, a State Poll school outside the league; ${G.gain} of ${G.bench} bench players developed, starters unchanged`);
  ok(G.after&&G.frChip&&G.band, 'Continue goes on to the matchday 9 preview; the calendar shows the friendly result in the open week');
  await page.evaluate(()=>{ App.route='calendar'; App.params={cv:'month'}; render(); App.modal={type:'v1819kPlan'}; renderModal(); }); await page.waitForTimeout(400);
  await page.screenshot({path:SHOTS+'/desktop_recap_modal.png'}); await page.evaluate(()=>{ App.modal=null; renderModal(); });

  /* ---------- sim loops: auto Rest, temporary boost undone after 2 games, never blocks ---------- */
  const page2=await mk('cal-t2');
  const R=await page2.evaluate(()=>{ const C=App.C; const u=C.userSid; let g=0; while(!(C.phase==='regular'&&C.md>=8)&&g++<40){ simRound(C); advance(C); }
    const p=squad(C,u,'V').sort((a,b)=>a.id<b.id?-1:1)[0]; const o0=ovr(p); const r={pend:v1819kPending(C)};
    simRound(C); advance(C); const O=v1819kOW(C); r.auto=O.done&&O.pick==='rest'&&O.auto; r.d1=ovr(p)-o0; r.fx=C.cal.fx.length; r.left=C.cal.fx[0]&&C.cal.fx[0].left;
    simRound(C); advance(C); r.d2=ovr(p)-o0; r.fx2=C.cal.fx.length; r.md=C.md;
    let k=0; while(C.phase!=='offseason'&&k++<60){ simRound(C); advance(C); } r.end=C.phase; r.news=C.news.filter(n=>n.v1819k).length; r.hcNews=C.news.filter(n=>/^Homecoming/.test(n.text)).length;
    return r; });
  console.log(JSON.stringify(R));
  ok(R.pend&&R.auto&&R.news===1, 'a plain simRound/advance loop resolves the open week itself (Rest and Recover, with news), once');
  ok(R.d1>1.0&&R.fx>=10&&R.left===1&&Math.abs(R.d2)<0.35&&R.fx2===0, `Rest: Varsity +1.2 for 2 games (${R.d1.toFixed(2)} after one, ${R.d2.toFixed(2)} after two: development only)`);
  ok(R.end==='offseason', 'the loop runs on to the end of the season');

  /* sim ahead (async) also passes the open week */
  const S=await page2.evaluate(async()=>{ const C=App.C; const p0=App.C.year; let res={}; const r=rollover(C); res.ro=r.ok; res.fx=C.cal.fx.length; let g=0; while(!(C.phase==='regular'&&C.md>=7)&&g++<40){ simRound(C); advance(C); }
    await A.simAhead({dataset:{k:'regular'}}); App.modal=null; renderModal(); const O=v1819kOW(C); res.done=O.done&&O.pick==='rest'; res.ph=C.phase; res.yr=C.year>p0; return res; });
  console.log(JSON.stringify(S));
  ok(S.ro&&S.fx===0&&S.yr&&S.done&&S.ph!=='regular', 'next season: a fresh open week; Sim ahead passes it (auto Rest) and finishes the regular season');

  /* ---------- every option does what it says (on copies of the career) ---------- */
  const E=await page.evaluate(()=>{ const C0=App.C; const out={}; const fresh=()=>{ const C=JSON.parse(JSON.stringify(C0)); C.cal.fx=[]; return C; };
    { const C=fresh(); const u=C.userSid; const before={}; schoolPlayers(C,u).forEach(p=>before[p.id]=ovr(p)); const res=V1819K_FX.clinic(C,rngFrom(1)); const up=schoolPlayers(C,u).filter(p=>ovr(p)>before[p.id]+0.01); out.clinic={n:up.length,lv:[...new Set(up.map(p=>p.lvl))].length,lines:res.lines[0],tmp:C.cal.fx.length}; }
    { const C=fresh(); const u=C.userSid; const v=squad(C,u,'V'), j=squad(C,u,'JV'); const b=[...v,...j].map(p=>ovr(p)); V1819K_FX.dayout(C,rngFrom(2)); const a=[...v,...j].map(p=>ovr(p)); out.dayout={up:a.filter((x,i)=>x-b[i]>0.7).length,n:a.length,fx:C.cal.fx.length,left:C.cal.fx[0].left};
      const f={h:u,a:'x',lvl:'V'}; for(let i=0;i<3;i++) v1819kTick(C,f); const fj={h:u,a:'x',lvl:'JV'}; for(let i=0;i<3;i++) v1819kTick(C,fj); const c=[...v,...j].map(p=>ovr(p)); out.dayout.back=c.every((x,i)=>Math.abs(x-b[i])<0.05)&&C.cal.fx.length===0; }
    { const C=fresh(); const u=C.userSid; const v=squad(C,u,'V'); const b=v.map(p=>ovr(p)); V1819K_FX.rest(C,rngFrom(3)); out.rest=v.filter((p,i)=>ovr(p)-b[i]>1.1).length===v.length; }
    let knocks=0; for(let s=0;s<12;s++){ const C=fresh(); const res=V1819K_FX.friendly(C,rngFrom(100+s)); if(res.knock) knocks++; } out.knocks=knocks; return out; });
  console.log(JSON.stringify(E));
  ok(E.clinic.n>=15&&E.clinic.lv>=2&&E.clinic.tmp===0, `Skills Clinic: the training focus counts double for every level (${E.clinic.lines})`);
  ok(E.dayout.up===E.dayout.n&&E.dayout.left===3&&E.dayout.back, `Team Day Out: Varsity and JV +0.8 for 3 games, then back to normal`);
  ok(E.rest, 'Rest and Recover: the whole Varsity squad +1.2');
  ok(E.knocks>=1&&E.knocks<=9, `the friendly has a small knock risk (${E.knocks} knocks in 12 seeded friendlies)`);

  /* ---------- homecoming: a bigger crowd and a little home boost ---------- */
  const H=await page.evaluate(()=>{ const C=App.C; const yr=C.year; const hc=v1819kHomecoming(C,yr); const f=C.fixtures[hc.fid]; if(!f) return {none:true};
    const base=attendance(C,f); const M=startMatch(C,f.id,{fast:true}); const sd=seasonDate(C,f); return {home:f.h===C.userSid,att:M.att/base.att,boost:M.sides[0].home-base.home,fri:sd.dow===5,inBar:sd.dn>=v1819kWk(yr,hc.wk)&&sd.dn<=v1819kWk(yr,hc.wk)+4}; });
  console.log(JSON.stringify(H));
  ok(H.home&&H.fri&&H.inBar&&H.att>1.25&&H.boost>0.01, `homecoming: the Friday home game that week draws ${Math.round((H.att-1)*100)}% more fans and gets +${(H.boost*100).toFixed(1)}% home advantage`);

  /* ---------- determinism per seed ---------- */
  const hashOf=async pg=>pg.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); } return Object.values(C.fixtures).filter(f=>f.yr===C.year).sort((a,b)=>a.id<b.id?-1:1).map(f=>f.id+f.hg+'-'+f.ag).join('|')+JSON.stringify(v1819kOW(C).res&&v1819kOW(C).res.lines); });
  const pa=await mk('cal-det'), h1=await hashOf(pa); await pa.close(); const pb=await mk('cal-det'), h2=await hashOf(pb); await pb.close();
  ok(h1===h2&&h1.length>200, 'same seed, same season: results and the open week are deterministic');

  /* ---------- old saves, save + reload ---------- */
  const M=await page.evaluate(()=>{ const C=App.C; const raw=JSON.parse(JSON.stringify(careerForSave(C))); const M1=migrate(raw); const r={kept:M1.cal&&M1.cal.ow[C.year]&&M1.cal.ow[C.year].pick==='friendly'&&M1.cal.ow[C.year].done,show:M1.cal.show.game===1};
    const old=JSON.parse(JSON.stringify(careerForSave(C))); delete old.cal; old.md=11; const M2=migrate(old); r.legacy=M2.cal.ow[old.year].done&&M2.cal.ow[old.year].legacy;
    const old2=JSON.parse(JSON.stringify(careerForSave(C))); delete old2.cal; old2.phase='regular'; old2.md=3; const M3=migrate(old2); r.fresh=!M3.cal.ow[old2.year].done;
    const keep=App.C; App.C=M2; App.route='calendar'; App.params={cv:'month'}; let ok2=true; try{ render(); App.params.cv='list'; render(); App.params.cv='week'; render(); }catch(e){ ok2=false; } r.render=ok2&&!document.querySelector('.v1819k-plan'); App.C=keep; render(); return r; });
  console.log(JSON.stringify(M));
  ok(M.kept&&M.show&&M.legacy&&M.fresh&&M.render, 'the plan survives a save and reload; old saves past the open week skip it, earlier ones get it; old saves render');

  /* ---------- phone ---------- */
  const ph=await mk('cal-t1',{width:390,height:844});
  const PH=await ph.evaluate(()=>{ const C=App.C; let g=0; while(!(C.phase==='regular'&&C.md>=8)&&g++<40){ simRound(C); advance(C); } App.route='calendar'; App.params={}; render(); const r={def:!!document.querySelector('.v1819k-v-list')};
    const sw={}; for(const v of ['month','week','list']){ App.params={cv:v}; render(); sw[v]=document.documentElement.scrollWidth; } r.sw=sw;
    App.params={cv:'month'}; render(); const cell=document.querySelector('.v1819k-day'); r.cellW=cell.getBoundingClientRect().width; r.chip=document.querySelector('.v1819k-g')?document.querySelector('.v1819k-g').getBoundingClientRect().width:0;
    App.modal={type:'v1819kPlan'}; renderModal(); r.msw=document.documentElement.scrollWidth; App.modal=null; renderModal(); return r; });
  console.log(JSON.stringify(PH));
  ok(PH.def&&Object.values(PH.sw).every(w=>w<=390)&&PH.msw<=390, `phone: List by default; month, week, list and the planner never scroll sideways (${JSON.stringify(PH.sw)})`);
  ok(PH.cellW>40&&PH.chip>0&&PH.chip<=PH.cellW, `phone month cells stay usable (${Math.round(PH.cellW)} px cells, ${Math.round(PH.chip)} px game chips)`);
  for(const v of ['month','list','week']){ await ph.evaluate(v=>{ App.params={cv:v}; render(); window.scrollTo(0,0); },v); await ph.waitForTimeout(350); await ph.screenshot({path:`${SHOTS}/phone_${v}.png`,fullPage:true}); }
  await ph.evaluate(()=>{ App.modal={type:'v1819kPlan'}; renderModal(); }); await ph.waitForTimeout(400); await ph.screenshot({path:SHOTS+'/phone_planner.png'});
  /* themes: a light custom theme still reads */
  await page.evaluate(()=>{ App.modal=null; renderModal(); App.route='calendar'; App.params={cv:'month',cm:'9'}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:SHOTS+'/desktop_october.png'});

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
