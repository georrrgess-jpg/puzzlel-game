// v18.21 Summer Development (src/v17/9o_summer*.js).
// Budget and costs, eligibility (no seniors, GKs only for the academy, level rules), multipliers only in the offseason ('off'),
// the Elite ID Camp potential bump (rare, once, capped), the Summer report matches the real growth, history across summers,
// Suggest for me stays in budget, CPU parity and the balance table (same seed, season + rollover: V1821D.off vs the feature),
// migration of old / broken saves, determinism, the UI on desktop and phone (no sideways scroll), no page errors.
const { chromium, DIST } = require('./_pw');
/* v18.21 merge: the other development features are switched off so this test measures this feature alone (test/devbalance.js covers them together) */
const ISO="V1821D.only=new Set(['summer']); V1821C.off=V1821P.off=V1821M.off=V1821T.off=true;";
const fs=require('fs'); const SHOTS=__dirname+'/shots/v1821'; fs.mkdirSync(SHOTS,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.evaluate(ISO); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Summer Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  /* sim to the offseason; returns the season-start snapshot for the balance table */
  const toOff=page=>page.evaluate(()=>{ const C=App.C; const u=C.userSid; const st={}; for(const id in C.players){ const p=C.players[id]; if(C.schools[p.sid].ext) continue; st[id]={l:p.lvl,o:ovr(p),u:p.sid===u}; }
    let g=0; while(C.phase!=='offseason'&&g++<200){ const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    window.__st=st; return C.phase; });

  /* ================= rules, on one offseason ================= */
  const page=await mk('smr-t1');
  const ph=await toOff(page); ok(ph==='offseason','reached the offseason');
  const R1=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; const s=C.schools[u]; const pr0=s.prestige; const r={};
    r.bud=[50,74,75,99,100].map(x=>{ s.prestige=x; return v1821uBudget(C); }); s.prestige=1e3; r.cap=v1821uBudget(C); s.prestige=pr0; r.b0=v1821uBudget(C);
    r.costs=V1821U_K.map(k=>V1821U_P[k].cost).join(','); r.mult=V1821U_K.map(k=>V1821U_P[k].m).join(',');
    const ps=schoolPlayers(C,u); const sen=ps.find(p=>p.grade>=12); const gk=ps.find(p=>p.pos==='GK'&&p.grade<12); const out=ps.find(p=>p.pos!=='GK'&&p.grade<12);
    const v=ps.find(p=>p.lvl==='V'&&p.grade<12&&p.pos!=='GK'), jv=ps.find(p=>p.lvl==='JV'&&p.grade<12&&p.pos!=='GK'), md=ps.find(p=>p.lvl==='MOD'&&p.pos!=='GK');
    r.sen=V1821U_K.filter(k=>k!=='rest').every(k=>!v1821uOk(C,sen,k))&&!v1821uSet(C,sen.id,'speed').ok;
    r.gk=v1821uOk(C,gk,'gk')&&!v1821uOk(C,out,'gk');
    r.lv=[v1821uOk(C,v,'elite'),!v1821uOk(C,jv,'elite'),!v1821uOk(C,md,'elite'),v1821uOk(C,jv,'club'),v1821uOk(C,md,'club'),!v1821uOk(C,v,'club'),v1821uOk(C,md,'futsal'),v1821uOk(C,jv,'futsal'),!v1821uOk(C,v,'futsal'),v1821uOk(C,v,'speed'),v1821uOk(C,md,'speed')];
    /* spending: one program per player, the budget is a hard limit */
    v1821uClear(C); const vs=squad(C,u,'V').filter(p=>p.grade<12&&p.pos!=='GK'); r.s1=v1821uSet(C,vs[0].id,'elite').ok&&v1821uSet(C,vs[1].id,'elite').ok&&v1821uUsed(C)===8;
    r.s2=v1821uSet(C,vs[0].id,'speed').ok&&v1821uUsed(C)===6&&v1821uPlan(C).a[vs[0].id]==='speed';
    const t=v1821uSet(C,vs[2].id,'speed')&&v1821uSet(C,vs[3].id,'speed'); const t2=v1821uSet(C,vs[4].id,'speed'); r.s3=t.ok&&!t2.ok&&/Not enough points/.test(t2.why)&&v1821uUsed(C)===10&&v1821uLeft(C)===0;
    r.s4=v1821uSet(C,vs[2].id,'rest').ok&&v1821uUsed(C)===8&&!(vs[2].id in v1821uPlan(C).a);
    /* multipliers: only 'off', only in the offseason */
    const p0=vs[1]; const mo=v1821dMult(C,p0,'off'); const mt=v1821dMult(C,p0,'tick'); r.off=mo.parts.some(x=>x.k==='summer'&&x.m===1.45); r.tick=!mt.parts.some(x=>x.k==='summer');
    C.phase='regular'; r.inSeason=!v1821dMult(C,p0,'off').parts.some(x=>x.k==='summer'); C.phase='offseason';
    V1821D.off=true; r.coreOff=v1821dMult(C,p0,'off').m===1; V1821D.off=false;
    /* the bump: seeded chance about 15%, never above 99 */
    let hit=0; for(let i=0;i<2000;i++){ const rr=v1821dR(C,'smr','bump',C.year,'x'+i); if(rr()<V1821U.BUMP) hit++; } r.rate=hit/2000;
    /* the bump is capped: +1, once per player, never above 99 (forced to a 100% chance here) */
    { v1821uClear(C); const q=vs[5]; const pot=q.pot; q.pot=Math.round(ovr(q))+2; const p1=q.pot; v1821uSet(C,q.id,'elite'); const b0=V1821U.BUMP; V1821U.BUMP=1;
      v1821uPre(C); const a=q.pot-p1; v1821uPre(C); const c2=q.pot-p1; const w=vs[6]; const pw=w.pot; w.pot=99; v1821uSet(C,w.id,'elite'); v1821uPre(C); r.cap99=w.pot===99; w.pot=pw;
      V1821U.BUMP=b0; r.once=a===1&&c2===1; q.pot=pot; delete C.smr.bumps[q.id]; delete C.smr.bumps[w.id]; delete C.smr.cpu[C.year]; v1821uClear(C); }
    /* suggestions */
    v1821uSuggest(C); const P=v1821uPlan(C); const ids=Object.keys(P.a); r.sug={n:ids.length,used:v1821uUsed(C),bud:v1821uBudget(C),ok:ids.every(id=>v1821uOk(C,C.players[id],P.a[id])&&C.players[id].grade<12),
      young:ids.reduce((a,id)=>a+C.players[id].grade,0)/Math.max(1,ids.length), avg:ps.filter(p=>p.grade<12).reduce((a,p)=>a+p.grade,0)/ps.filter(p=>p.grade<12).length, ks:ids.map(id=>P.a[id]).join(',')};
    return r; });
  console.log(JSON.stringify(R1));
  ok(R1.bud.join(',')==='10,10,11,11,12'&&R1.cap===14, `budget = 10 + 1 per 25 prestige over 50, max 14 (prestige 50/74/75/99/100 -> ${R1.bud.join('/')}, huge -> ${R1.cap})`);
  ok(R1.costs==='4,2,2,2,1,0'&&R1.mult==='1.45,1.35,1.2,1.35,1.15,1', `costs ${R1.costs}; multipliers ${R1.mult}`);
  ok(R1.sen&&R1.gk&&R1.lv.every(Boolean), 'eligibility: seniors never; Goalkeeper Academy for GKs only; Elite ID Varsity only; Club JV/MOD; Futsal MOD/JV; Speed any level');
  ok(R1.s1&&R1.s2&&R1.s3&&R1.s4, 'one program per player (changing it refunds the old cost), the budget is a hard limit, Rest is free and clears the pick');
  ok(R1.off&&R1.tick&&R1.inSeason&&R1.coreOff, 'the multiplier appears only in the offseason growth (ctx off), not on matchdays, not in season, and not with the core switched off');
  ok(R1.rate>0.11&&R1.rate<0.19, `the Elite ID potential bump is rare (${(R1.rate*100).toFixed(1)}% seeded chance for players within 3 of their potential)`);
  ok(R1.once&&R1.cap99, 'the potential bump is capped: +1 once per player, never above 99');
  ok(R1.sug.used<=R1.sug.bud&&R1.sug.used>=R1.sug.bud-1&&R1.sug.ok&&R1.sug.n>=3&&R1.sug.young<=R1.sug.avg, `Suggest for me: ${R1.sug.n} players, ${R1.sug.used} of ${R1.sug.bud} points, all eligible, younger than average (grade ${R1.sug.young.toFixed(1)} vs ${R1.sug.avg.toFixed(1)}): ${R1.sug.ks}`);

  /* ================= UI in the offseason ================= */
  await page.evaluate(()=>{ v1821uClear(App.C); App.route='office'; App.params={}; render(); });
  await page.waitForTimeout(300);
  const U1=await page.evaluate(()=>{ const q=s=>document.querySelector(s); const dec=q('.v1821u-dec'); const r={dec:dec&&dec.textContent, badge:navBadges(App.C).dev};
    App.route='dev'; App.params={}; render(); const sum=[...document.querySelectorAll('.v1821d-sum')].find(x=>/Summer:/.test(x.textContent)); r.sum=sum&&sum.textContent.trim(); r.warn=sum&&sum.classList.contains('warn');
    const tab=[...document.querySelectorAll('.v1821d-tabs button')].find(x=>x.dataset.k==='summer'); r.tab=tab&&tab.textContent; return r; });
  ok(/Plan the summer: 10 of 10 points left/.test(U1.dec||'')&&U1.badge==='10', `This week item "${U1.dec&&U1.dec.slice(0,60)}"; nav badge ${U1.badge}`);
  ok(/Summer: 0 of 10 points used/.test(U1.sum||'')&&U1.warn&&/Summer\s*10/.test(U1.tab||''), `Overview chip "${U1.sum}"; tab "${U1.tab}" with a badge while points are unspent`);
  await page.click('[data-a="v1821dTab"][data-k="summer"]'); await page.waitForTimeout(300);
  const U2=await page.evaluate(()=>{ const q=s=>document.querySelectorAll(s); return {progs:q('.v1821u-prog').length,cells:q('.v1821u-cells i').length,form:(document.querySelector('.v1821u-form')||{}).textContent,lv:q('.v1821u-lv').length,rows:q('.v1821u-r').length,sel:q('.v1821u-r select').length,
    labels:[...q('.v1821u-r select')].every(s=>/Summer program for /.test(s.getAttribute('aria-label')||'')),eff:[...q('.v1821u-eff')].map(e=>e.textContent).join(' | '),sen:[...q('.v1821u-lh')].some(e=>/senior/.test(e.textContent)),
    noSen:[...q('.v1821u-r select')].every(s=>App.C.players[s.dataset.id].grade<12),gkOpt:[...q('.v1821u-r select')].every(s=>[...s.options].some(o=>o.value==='gk')===(App.C.players[s.dataset.id].pos==='GK'))}; });
  console.log(JSON.stringify(U2));
  ok(U2.progs===6&&U2.cells===10&&/Budget = 10 \+ 1 per 25 prestige over 50/.test(U2.form||''), 'Summer tab: six program cards, a 10-cell budget meter and the formula');
  ok(/\+45% offseason growth/.test(U2.eff)&&/\+35%/.test(U2.eff)&&/\+20%.*Pace & stamina/.test(U2.eff)&&/\+15%.*Passing/.test(U2.eff)&&/No change/.test(U2.eff)&&/15% chance of \+1 POT/.test(U2.eff), 'program cards show exact effects, costs and leans');
  ok(U2.lv===3&&U2.rows>20&&U2.sel===U2.rows&&U2.labels&&U2.noSen&&U2.gkOpt&&U2.sen, `roster grouped by level (${U2.rows} returning players, each with a labelled picker; the academy only offered to keepers; seniors listed as graduating)`);
  /* pick one with the select */
  const pid=await page.evaluate(()=>{ const s=[...document.querySelectorAll('.v1821u-r select')].find(s=>[...s.options].some(o=>o.value==='club')); return s.dataset.id; });
  await page.selectOption(`.v1821u-r select[data-id="${pid}"]`,'club'); await page.waitForTimeout(250);
  const U3=await page.evaluate(pid=>{ const C=App.C; const row=document.querySelector(`.v1821u-r select[data-id="${pid}"]`).closest('.v1821u-r'); const e=v1821uExp(C,C.players[pid],'club');
    return {k:v1821uPlan(C).a[pid],used:v1821uUsed(C),on:row.classList.contains('on'),txt:row.querySelector('.v1821u-exp').textContent,home:fmt1(e.home),w:fmt1(e.with),meter:(document.querySelector('.v1821u-mh')||{}).textContent}; },pid);
  ok(U3.k==='club'&&U3.used===2&&U3.on&&U3.txt.includes('+'+U3.home)&&U3.txt.includes('+'+U3.w)&&/2 of 10 points used/.test(U3.meter), `the picker sets the program; the row shows the expected gain (${U3.txt.trim()}) and the meter updates`);
  await page.click('[data-a="v1821uSuggest"]'); await page.waitForTimeout(300);
  const U4=await page.evaluate(()=>({used:v1821uUsed(App.C),on:document.querySelectorAll('.v1821u-r.on').length,xp:(document.querySelector('.v1821u-xp')||{}).textContent}));
  ok(U4.used>=9&&U4.on>=3&&/expected extra OVR/.test(U4.xp), `Suggest for me fills the budget (${U4.used} points, ${U4.on} players): ${U4.xp}`);
  await page.screenshot({path:SHOTS+'/summer_desktop.png',fullPage:false});
  await page.evaluate(()=>window.scrollTo(0,600)); await page.waitForTimeout(150); await page.screenshot({path:SHOTS+'/summer_desktop_roster.png'});
  await page.click('[data-a="v1821uClear"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>v1821uUsed(App.C)===0&&document.querySelectorAll('.v1821u-r.on').length===0), 'Clear empties the plan');

  /* Play: remind once when nothing is spent, never block */
  const RM=await page.evaluate(()=>{ const C=App.C; const y=C.year; A.playNext(); const m1=App.modal&&App.modal.type; const txt=(document.querySelector('.v1821u-modal')||{}).textContent||''; return {m1,txt,y,ph:C.phase}; });
  await page.waitForTimeout(500); await page.screenshot({path:SHOTS+'/summer_remind.png'});
  ok(RM.m1==='v1821uRemind'&&/10 summer points/.test(RM.txt)&&RM.ph==='offseason', 'Start next season with no points spent shows a reminder once (Start anyway / Plan / Suggest and start)');
  /* Suggest and start: the season starts with a plan; capture the growth for the report check */
  const REP=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; v1821uSuggest(C); const P=v1821uPlan(C); const plan={...P.a}; const yr=C.year;
    const pre={}, exp={}, home={}, h0={}; for(const p of schoolPlayers(C,u)){ pre[p.id]=ovr(p); h0[p.id]=p.h; exp[p.id]=v1821uExp(C,p,plan[p.id]||null); home[p.id]=v1821uOffGain(p,1); }
    const pot0={}; for(const id in plan) pot0[id]=C.players[id].pot;
    let fin=null; const _bl=balanceLeague; balanceLeague=function(C2){ if(!fin){ fin={}; for(const id in C2.players){ const p=C2.players[id]; const h=p.h; if(id in h0) p.h=h0[id]; fin[id]=ovr(p); p.h=h; } } return _bl.apply(this,arguments); };
    App.modal=null; A.playNext(); balanceLeague=_bl; const H=C.smr.hist[yr];
    const rows=H.rows.map(x=>({id:x.id,k:x.k,got:x.got,home:x.home,real:fin[x.id]-pre[x.id],ew:exp[x.id].with,eh:exp[x.id].home,bump:x.bump,dp:C.players[x.id]?C.players[x.id].pot-pot0[x.id]:0}));
    const rest=schoolPlayers(C,u).filter(p=>!plan[p.id]&&p.id in pre&&p.id in fin).map(p=>Math.abs((fin[p.id]-pre[p.id])-home[p.id]));
    const news=C.news.find(n=>/^Summer report/.test(n.text)); return {rows,yr,phase:C.phase,year:C.year,n:Object.keys(plan).length,rest:Math.max(...rest),news:news&&news.text,plan:C.smr.plan[yr],extra:H.extra,used:H.used}; });
  console.log(JSON.stringify({...REP,rows:REP.rows.slice(0,4)}));
  ok(REP.phase==='preseason'&&REP.year===REP.yr+1&&REP.rows.length===REP.n&&!REP.plan, `Suggest and start rolls over; the report lists all ${REP.n} players and the plan is dropped`);
  ok(REP.rows.every(x=>Math.abs(x.got-x.real)<0.011), 'Summer report: each player\'s OVR gain matches his real offseason growth (to 0.01)');
  ok(REP.rows.every(x=>Math.abs(x.home-x.eh)<0.011&&(x.bump||Math.abs(x.got-x.ew)<0.06)), 'the "at home" number is the offseason formula before rollover and the actual gain is what the tab predicted');
  ok(REP.rest<0.03, `players left home (height growth aside) grew exactly gain*0.52*clamp(gap/12,.2,1) (max diff ${REP.rest.toFixed(3)})`);
  ok(REP.rows.every(x=>x.dp===(x.bump?1:0)&&(!x.bump||x.k==='elite')), 'the potential bump only comes from Elite ID Camp and is +1');
  ok(/^Summer report: \d+ .* \+\d+\.\d OVR/.test(REP.news||''), `news: "${REP.news}"`);
  /* in season: summary chip and the report on the tab */
  await page.evaluate(()=>{ App.route='dev'; App.params={}; render(); }); await page.waitForTimeout(200);
  const U5=await page.evaluate(()=>{ const sum=[...document.querySelectorAll('.v1821d-sum')].find(x=>/Last summer/.test(x.textContent)); const tb=document.querySelector('.v1821d-tabs [data-k="summer"]'); const b=tb&&tb.querySelector('.v1821d-bd')?1:0; App.params={dtab:'summer'}; render();
    return {sum:sum&&sum.textContent.trim(),b,rep:document.querySelectorAll('.v1821u-rep tbody tr').length,sel:document.querySelectorAll('.v1821u-r select').length,top:(document.querySelector('.v1821u-top .chip')||{}).textContent,dec:!!document.querySelector('.v1821u-dec')}; });
  console.log(JSON.stringify(U5));
  ok(/Last summer: [+−]\d+\.\d OVR from camps/.test(U5.sum||'')&&!U5.b&&U5.rep===REP.n&&U5.sel===0&&/Opens after the season/.test(U5.top||''), `in season: chip "${U5.sum}", no badge, the tab shows the report (${U5.rep} rows) and no pickers`);
  await page.evaluate(()=>{ App.modal=null; renderModal(); window.scrollTo(0,0); }); await page.waitForTimeout(200); await page.screenshot({path:SHOTS+'/summer_desktop_inseason.png'});
  await page.evaluate(()=>{ document.querySelector('.v1821u-rep').scrollIntoView(); }); await page.waitForTimeout(150); await page.screenshot({path:SHOTS+'/summer_desktop_report.png'});
  await page.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); render(); }); await page.waitForTimeout(200); await page.screenshot({path:SHOTS+'/summer_desktop_report_gold.png'}); await page.evaluate(()=>{ PREFS.theme={preset:'night',custom:null}; applyTheme(); render(); });
  /* second summer: history */
  const H2=await page.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<200){ const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    const yr=C.year; const P=v1821uPlan(C); const r0=P.rem; A.playNext(); const m=App.modal&&App.modal.type; App.modal=null; renderModal();
    v1821uClear(C); const el=squad(C,C.userSid,'V').filter(p=>p.grade<12&&p.pos!=='GK'&&!C.smr.bumps[p.id]).slice(0,2); el[0].pot=Math.min(99,Math.round(ovr(el[0]))+2); const pot0=el.map(p=>p.pot);
    v1821uSet(C,el[0].id,'elite'); v1821uSet(C,el[1].id,'elite'); const b0=V1821U.BUMP; V1821U.BUMP=1; rollover(C); V1821U.BUMP=b0; App.route='dev'; App.params={dtab:'summer'}; render();
    const H=C.smr.hist[yr];
    const bump={d0:el[0].pot-pot0[0],d1:el[1].pot-pot0[1],far:pot0[1]-0,rec:C.smr.bumps[el[0].id]===yr,row:H.rows.find(x=>x.id===el[0].id).bump,ovrOk:Object.values(C.players).every(p=>ovr(p)<=p.pot+0.05)};
    return {bump,keys:Object.keys(C.smr.hist).join(','),yr,m,r0,hl:document.querySelectorAll('.v1821u-hl li').length,bumps:Object.keys(C.smr.bumps).length,bumpOk:Object.entries(C.smr.bumps).every(([id,y])=>C.players[id])}; });
  console.log(JSON.stringify(H2.bump));
  ok(H2.bump.d0===1&&H2.bump.rec&&H2.bump.row===1&&H2.bump.ovrOk, 'Elite ID Camp potential bump: +1 exactly, recorded once per player (shown in the report); nobody ends above his potential');
  ok(H2.keys.split(',').length===2&&H2.hl===2&&H2.m==='v1821uRemind', `history keeps every summer (${H2.keys}); Past summers lists them; the reminder came back for the new summer`);
  await page.close();

  /* ================= phone ================= */
  const ph2=await mk('smr-t1',{width:390,height:844}); await toOff(ph2);
  await ph2.evaluate(()=>{ v1821uSuggest(App.C); App.route='dev'; App.params={dtab:'summer'}; render(); }); await ph2.waitForTimeout(400);
  const PH=await ph2.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth,wide:[...document.querySelectorAll('.v1821u *')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.right>window.innerWidth+1)&&!e.closest('.v1821u-tw'); }).length,sel:(()=>{ const s=document.querySelector('.v1821u-r select'); return s?s.getBoundingClientRect().width:0; })()}));
  ok(PH.sw<=PH.iw&&PH.wide===0&&PH.sel>250, `phone: no sideways scroll (${PH.sw}/${PH.iw}), nothing sticks out, the picker is full width (${Math.round(PH.sel)}px)`);
  await ph2.screenshot({path:SHOTS+'/summer_phone.png'});
  await ph2.evaluate(()=>document.querySelector('.v1821u-ros').scrollIntoView()); await ph2.waitForTimeout(150); await ph2.screenshot({path:SHOTS+'/summer_phone_roster.png'});
  await ph2.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); window.scrollTo(0,0); render(); }); await ph2.waitForTimeout(200); await ph2.screenshot({path:SHOTS+'/summer_phone_gold.png'});
  await ph2.evaluate(()=>{ App.route='office'; App.params={}; v1821uClear(App.C); render(); }); await ph2.waitForTimeout(250);
  const PO=await ph2.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth,dec:!!document.querySelector('.v1821u-dec')}));
  ok(PO.sw<=PO.iw&&PO.dec, 'phone Overview shows the This week item without sideways scroll');
  await ph2.evaluate(()=>{ const d=document.querySelector('.v1821u-dec'); if(d) d.scrollIntoView({block:'center'}); }); await ph2.waitForTimeout(150); await ph2.screenshot({path:SHOTS+'/summer_phone_office_gold.png'});
  /* migration: broken and missing state, and a save round-trip */
  const MG=await ph2.evaluate(()=>{ const C=App.C; const r={};
    const a=JSON.parse(JSON.stringify(C)); a.smr={v:7,junk:1}; const A1=migrate(a)||a; r.bad=!A1.smr;
    const b2=JSON.parse(JSON.stringify(C)); delete b2.smr; const B=migrate(b2)||b2; r.none=!B.smr; App.C=B; App.route='dev'; App.params={dtab:'summer'}; let ok1=true; try{ render(); }catch(e){ ok1=false; } r.render=ok1&&!!document.querySelector('.v1821u-prog'); r.lazy=v1821uLeft(B)===v1821uBudget(B);
    const c=JSON.parse(JSON.stringify(C)); c.smr.plan={}; c.smr.plan[c.year]={a:{}}; delete c.smr.hist; const D=migrate(c)||c; r.fix=!!D.smr.hist&&typeof D.smr.bumps==='object'; App.C=C; render(); return r; });
  ok(MG.bad&&MG.none&&MG.render&&MG.lazy&&MG.fix, 'migration: a broken summer state is dropped, an old save without one renders and creates it lazily, missing parts are repaired');
  await ph2.close();

  /* ================= balance table and determinism ================= */
  const runMode=async(seed,mode)=>{ const p=await mk(seed); await toOff(p);
    const r=await p.evaluate(mode=>{ const C=App.C; const u=C.userSid; V1821D.off=mode==='off';
      const by=(k,l)=>squad(C,u,l).filter(p=>p.grade<12&&p.pot>ovr(p)&&v1821uOk(C,p,k)).sort((a,b)=>v1821uExp(C,b,k).home-v1821uExp(C,a,k).home);
      if(mode==='sug') v1821uSuggest(C);
      if(mode==='mod') for(const p of by('club','MOD')) v1821uSet(C,p.id,'club');
      if(mode==='jv') for(const p of by('club','JV')) v1821uSet(C,p.id,'club');
      if(mode==='v'){ for(const p of by('elite','V')) v1821uSet(C,p.id,'elite'); for(const p of by('speed','V')) if(!v1821uPlan(C).a[p.id]) v1821uSet(C,p.id,'speed'); }
      if(mode==='max'){ C.schools[u].prestige=99; for(const p of by('club','MOD')) v1821uSet(C,p.id,'club'); }
      const o={}; if(!V1821D.off){ const cp=v1821uCpu(C,C.year); let s=0,n=0; const per={}; for(const sid of C.league){ if(sid===u) continue; for(const p of schoolPlayers(C,sid)){ s+=v1821dMult(C,p,'off').m; n++; } per[sid]=Object.values(cp).length; }
        o.cpuM=s/n; const cnt={}; for(const id in cp){ const sid=C.players[id].sid; cnt[sid]=(cnt[sid]||0)+1; } o.cpuN=Object.values(cnt); o.cpuPts=Object.entries(cnt).map(([sid])=>Object.entries(cp).filter(([id])=>C.players[id].sid===sid).reduce((a,[,k])=>a+V1821U_P[k].cost,0)); o.cpuHash=JSON.stringify(cp); }
      o.used=v1821uUsed(C); o.bud=v1821uBudget(C);
      let fin=null; const _bl=balanceLeague; balanceLeague=function(C2){ if(!fin){ fin={}; for(const id in C2.players) fin[id]=ovr(C2.players[id]); } return _bl.apply(this,arguments); };
      rollover(C); balanceLeague=_bl; const st=window.__st; const agg={};
      for(const id in st){ if(!(id in fin)) continue; const k=(st[id].u?'U':'C')+st[id].l; const a=agg[k]||(agg[k]={s:0,n:0}); a.s+=fin[id]-st[id].o; a.n++; }
      for(const k in agg) o[k]=agg[k].s/agg[k].n; let h=0; for(const id in fin) h=(h*31+Math.round(fin[id]*1000))>>>0; o.hash=h; return o; },mode);
    await p.close(); return r; };
  const seed='777'; const M={}; for(const m of ['off','sug','sug2','mod','jv','v','max']) M[m]=await runMode(seed,m==='sug2'?'sug':m);
  const L=['V','JV','MOD']; const pct=(m,k)=>(M[m][k]/M.off[k]-1)*100;
  console.log('Balance (seed 777, per player, season + offseason; returning players by season-start level):');
  console.log('mode     | You V   You JV  You MOD | CPU V   CPU JV  CPU MOD | points');
  for(const m of ['off','sug','mod','jv','v','max']) console.log(`${m.padEnd(8)} | ${L.map(l=>M[m]['U'+l].toFixed(2).padStart(5)+(m==='off'?'  ':' '+(pct(m,'U'+l)>=0?'+':'')+pct(m,'U'+l).toFixed(1)+'%')).join(' ')} | ${L.map(l=>M[m]['C'+l].toFixed(2).padStart(5)+(m==='off'?'  ':' '+(pct(m,'C'+l)>=0?'+':'')+pct(m,'C'+l).toFixed(1)+'%')).join(' ')} | ${M[m].used}/${M[m].bud}`);
  const worst=Math.max(...['sug','mod','jv','v','max'].flatMap(m=>L.map(l=>pct(m,'U'+l))));
  const cpuW=Math.max(...['sug','mod','jv','v','max'].flatMap(m=>L.map(l=>Math.abs(pct(m,'C'+l)))));
  ok(worst<=10, `your school: at most +10% per-player yearly growth at any level, even with every point on one level (worst ${worst.toFixed(1)}%)`);
  ok(L.every(l=>pct('sug','U'+l)>0.5||M.sug.used===0||l==='V'), `Suggest for me helps (${L.map(l=>l+' '+pct('sug','U'+l).toFixed(1)+'%').join(', ')})`);
  ok(cpuW<3, `CPU growth within 3% of the baseline at every level (worst ${cpuW.toFixed(1)}%)`);
  ok(M.sug.cpuM<1.03&&M.sug.cpuN.every(n=>n>=3&&n<=4)&&M.sug.cpuPts.every(x=>x>=4&&x<=11), `CPU schools send 3-4 players (${M.sug.cpuN.join(',')}) using ${M.sug.cpuPts.join(',')} points; squad-wide average multiplier ${M.sug.cpuM.toFixed(4)}`);
  ok(M.sug.hash===M.sug2.hash&&M.sug.cpuHash===M.sug2.cpuHash, 'deterministic: the same seed gives the same CPU programs and the same ratings after rollover');
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAIL`:'ALL PASS'); process.exit(fails?1:0); })();
