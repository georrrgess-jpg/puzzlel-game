// v18.19 Scenario Mode (src/v17/9j_scenario*.js).
// Every built-in scenario starts from its hand-built state (rebuilt squads, golden class, last-rated school, a real 9-0 start,
// a season-long injury, a believable title history); the rules are really enforced (editor, Manager Mode, directed results,
// difficulty, cards, call-ups, stadium tier, scouting points, one-loss-ends-it); medals evaluate correctly for forced bronze,
// silver, gold and failure; medals persist in PREFS and unlock the harder scenarios; challenge codes round-trip, catch typos and
// rebuild the exact same world; the builder makes a custom scenario; a scenario career saves, reloads and carries on as a
// normal career. Screenshots (desktop 1440 + phone 390) go to test/shots/v1819/.
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const OUT='test/shots/v1819/'; fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await page.goto(DIST); await page.waitForTimeout(900);

  /* ---------- menu entry and hub ---------- */
  await page.click('.v1819s-entry'); await page.waitForTimeout(400);
  const H=await page.evaluate(()=>({rows:document.querySelectorAll('.v1819s-li').length,locks:[...document.querySelectorAll('.v1819s-li.locked')].map(x=>x.dataset.id).join(','),
    start:!!document.querySelector('#v1819s-start'),med:document.querySelectorAll('.v1819s-detail .v1819s-medals li').length,rules:document.querySelectorAll('.v1819s-detail .v1819s-rules li').length,
    eyebrow:(document.querySelector('.v1819s-detail .v1819s-eyebrow')||{}).textContent||'',own:!!document.querySelector('#v1819s-buildbtn'),code:!!document.querySelector('#v1819s-code')}));
  console.log(JSON.stringify(H));
  ok(H.rows===6&&H.locks==='lastdance,underdog,defense'&&H.med===3&&H.rules>=2&&/Scenario 1 of 6/i.test(H.eyebrow)&&H.own&&H.code, 'main menu entry opens the hub: six scenarios, the three-star ones locked, medals, rules, Make your own and code entry');
  await page.waitForFunction(()=>document.querySelectorAll('.v1819s-detail .v1819s-squad:not(.v1819s-skel) .v1819s-pl').length===5,null,{timeout:15000});
  const sq=await page.evaluate(()=>({n:document.querySelectorAll('.v1819s-detail .v1819s-pl').length,line:document.querySelector('.v1819s-dline').textContent,crests:document.querySelectorAll('.v1819s-lcrest svg.crest').length}));
  ok(sq.n===5&&/fourteen freshmen.*rated \dth of \d/.test(sq.line), `the starting squad (top 5) and setup line come from the real world: "${sq.line}"`);
  await page.waitForFunction(()=>document.querySelectorAll('.v1819s-lcrest svg.crest').length===6,null,{timeout:20000}).catch(()=>{});
  ok(await page.evaluate(()=>document.querySelectorAll('.v1819s-lcrest svg.crest').length)===6, 'every scenario row gets its school crest as the worlds are built in the background');
  await page.keyboard.press('Tab'); await page.focus('#v1819s-li-streak'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>/The Streak/i.test(document.querySelector('#v1819s-dname').textContent)&&document.querySelector('#v1819s-li-streak').getAttribute('aria-pressed')==='true'), 'keyboard: Enter on a list row selects that scenario');
  await page.click('#v1819s-li-lastdance'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>{ const b=document.querySelector('#v1819s-start'); return b.disabled&&/Earn 1 more medal/.test(b.textContent); }), 'a locked scenario cannot be started from the list (Earn 1 more medal to unlock)');
  await page.screenshot({path:OUT+'desk_hub.png'});

  /* ---------- the six start states ---------- */
  const ST=await page.evaluate(()=>{ const out={}; const seed=424242;
    { const C=v1819sBuild({id:'rebuild',seed}); const u=C.userSid; const V=squad(C,u,'V'); out.rebuild={n:V.length,fr:V.filter(p=>p.grade===9).length,sr:V.filter(p=>p.grade===12).length,gk:V.filter(p=>p.pos==='GK').length,rank:C.scn.rank,n8:C.league.length,
      pot:Math.round(V.filter(p=>p.grade===9).reduce((a,p)=>a+p.pot-ovr(p),0)/14),tryout:C.tryout&&C.tryout.st,yr:C.tryout&&C.tryout.yr===C.year,valid:validateLineup(C,u,'V').ok,
      nums:['V','JV','MOD'].every(l=>{ const a=squad(C,u,l).map(p=>p.num); return new Set(a).size===a.length; }),jvgk:squad(C,u,'JV').some(p=>p.pos==='GK')}; }
    { const C=v1819sBuild({id:'lastdance',seed}); const u=C.userSid; const g=squad(C,u,'V').filter(p=>p.v1819g); out.lastdance={gold:g.length,sen:g.every(p=>p.grade===12),avg:Math.round(g.reduce((a,p)=>a+ovr(p),0)/g.length),rank:C.scn.rank,cards:C.settings.cards,susp:C.settings.suspensions,xi:Math.round(xiRating(C,u,'V'))}; }
    { const C=v1819sBuild({id:'underdog',seed}); const u=C.userSid; out.underdog={rank:C.scn.rank,n:C.league.length,tier:C.schools[u].stadium.tier,pres:C.schools[u].prestige,line:C.scn.line}; }
    { const C=v1819sBuild({id:'streak',seed}); const u=C.userSid; const t=standings(C,'V'); const me=t.find(r=>r.sid===u); const reg=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.comp==='reg'&&f.lvl==='V'&&f.st==='d');
      const mine=reg.filter(f=>f.h===u||f.a===u); let gf=0; for(const f of mine) gf+=f.h===u?f.hg:f.ag; let pg=0; for(const p of squad(C,u,'V')){ const b=seasonBucket(p,C.year,'V','reg'); if(b) pg+=b.g; }
      out.streak={phase:C.phase,md:C.md,w:me.w,d:me.d,l:me.l,p:me.p,all9:t.every(r=>r.p===9),mine:mine.length,won:mine.every(f=>f.w===u),dir:mine.some(f=>f.dir),logs:mine.every(f=>C.logs[f.id]&&C.logs[f.id].box[0].length===11),gf,pg,pre:C.pre.rd,directed:Object.keys(C.directed).length,live:C.scn.status,line:C.scn.line}; }
    { const C=v1819sBuild({id:'badbreak',seed}); const u=C.userSid; const S=C.scn; const p=C.players[S.inj.pid]; const lu=getLu(C,u,'V');
      out.badbreak={star:Math.round(ovr(p)),pos:p.pos,susp:p.susp,inXI:lu.slots.some(s=>s.pid===p.id),best:squad(C,u,'V').filter(q=>q.pos==='FWD').every(q=>ovr(q)<=ovr(p))};
      let g=0, played=false; while(C.md<4&&g++<20){ simRound(C); advance(C); } for(const f of Object.values(C.fixtures)){ const lg=C.logs[f.id]; if(lg&&lg.box.flat().some(r=>r.pid===p.id)) played=true; } out.badbreak.played=played; out.badbreak.susp2=p.susp; }
    { const C=v1819sBuild({id:'defense',seed}); const u=C.userSid; const s=C.schools[u]; const yr=C.year-1; const al=(C.scn.grads||[]).map(id=>C.alumni[id]).filter(Boolean);
      out.defense={hon:['State Champions','Regional Champions'].every(h=>s.honors.some(x=>x.yr===yr&&x.label===h)),grads:al.length,alHon:al.every(a=>a.honors.some(h=>h.label==='State Champions'&&h.yr===yr)),gradYr:al.every(a=>a.gradYr===yr),
        titles:C.coaches[s.coachId].titles,v:squad(C,u,'V').length,rank:C.scn.rank,news:C.news.some(n=>/defending/.test(n.text))};
      const prev=App.C; App.C=C; App.route='history'; try{ out.defense.hist=!!VIEWS.history(); out.defense.tour=!!VIEWS.tourneys(); App.route='school'; out.defense.school=/State Champions/.test(VIEWS.school()); }catch(e){ out.defense.err=String(e); } App.C=prev; }
    return out; });
  console.log(JSON.stringify(ST));
  const R=ST.rebuild; ok(R.n===18&&R.fr===14&&R.sr===4&&R.gk>=2&&R.rank>=7&&R.pot>=15&&R.valid&&R.nums&&R.jvgk&&R.tryout==='none'&&R.yr, `The Rebuild: 14 freshmen + 4 seniors on Varsity (${R.gk} keepers), rated ${R.rank}th, freshmen ~+${R.pot} potential, valid lineup, unique numbers, no tryouts this year`);
  const L=ST.lastdance; ok(L.gold===9&&L.sen&&L.avg>=83&&L.rank===1&&L.cards==='strict'&&L.susp, `Last Dance: a golden class of 9 seniors averaging ${L.avg}, XI ${L.xi} (1st); strict referees set`);
  const U=ST.underdog; ok(U.rank===U.n&&U.tier===1&&U.pres<=20&&new RegExp(`rated ${U.n}th of ${U.n}`).test(U.line), `Underdog Story: ${U.line}; Tier 1 stadium, prestige ${U.pres}`);
  const K=ST.streak; ok(K.phase==='regular'&&K.md===9&&K.w===9&&K.l===0&&K.d===0&&K.all9&&K.mine===9&&K.won&&!K.dir&&K.logs&&K.gf===K.pg&&K.pre===3&&K.directed===0&&K.live==='live', `The Streak: 9-0 after nine real rounds (every team has played 9), fixtures, logs and player goals agree (${K.gf}), no directed flags left; "${K.line}"`);
  const B=ST.badbreak; ok(B.star>=79&&B.pos==='FWD'&&B.best&&B.susp>=99&&!B.inXI&&!B.played&&B.susp2>=98, `Bad Break: the star striker (${B.star}) is out: not in the XI, never appears in four rounds of match logs`);
  const D=ST.defense; ok(D.hon&&D.grads===8&&D.alHon&&D.gradYr&&D.titles>=1&&D.v>=16&&D.news&&D.hist&&D.tour&&D.school&&!D.err, `Title Defense: last year's titles on the school, 8 graduated champions in the alumni, coach title, History/Tournament/School views render`);

  /* ---------- goal logic on synthetic facts ---------- */
  const G=await page.evaluate(()=>{ const F=(o)=>Object.assign({w:0,d:0,l:0,gp:0,stage:0,out:false,pos:null,n:8,lgN:14,lgDone:false,done:false},o); const e=(g,f)=>{ const r=v1819sSeasonGoal(g,F(f)); return (r.ok?'ok':r.dead?'dead':'open'); };
    return [e({k:'secwin'},{stage:1}),e({k:'secwin'},{out:true,lgDone:true}),e({k:'secfinal'},{stage:1}),e({k:'sec'},{stage:3}),e({k:'rgn'},{stage:3,out:true}),e({k:'stfinal'},{stage:6}),e({k:'st'},{stage:6,out:true}),
      e({k:'top',n:3},{pos:3,lgDone:true,gp:14}),e({k:'top',n:3},{pos:4,lgDone:true,gp:14}),e({k:'top',n:3},{pos:5,gp:7}),
      e({k:'winrec'},{w:8,l:2,gp:10}),e({k:'winrec'},{w:3,l:7,gp:10}),e({k:'winrec'},{w:5,l:5,d:4,gp:14,lgDone:true}),
      e({k:'unbeaten'},{w:13,d:1,gp:14,lgDone:true}),e({k:'unbeaten'},{w:9,l:1,gp:10}),e({k:'perfect'},{w:14,gp:14,lgDone:true}),e({k:'perfect'},{w:12,d:1,gp:13}),
      e({k:'and',of:[{k:'perfect'},{k:'sec'}]},{w:14,gp:14,lgDone:true,stage:3}),e({k:'and',of:[{k:'perfect'},{k:'sec'}]},{w:14,gp:14,lgDone:true,stage:2,out:true})].join(','); });
  ok(G==='ok,dead,open,ok,dead,ok,dead,ok,dead,open,ok,dead,dead,ok,dead,ok,dead,ok,dead', 'goal rules on synthetic seasons: knockout stages, top-N, above .500 (clinched / impossible), unbeaten, perfect, combined');

  /* ---------- forced outcomes: medals, endings, PREFS, unlocks ---------- */
  const F=await page.evaluate(async ()=>{ localStorage.clear(); PREFS.v1819s={}; savePrefs();
    const run=(id,seed,plan)=>{ const C=v1819sBuild({id,seed}); App.C=C; const S=C.scn; const u=C.userSid; let ko=0, g=0;
      while(S.status==='live'&&g++<400){ if(C.phase==='offseason'){ rollover(C); continue; } const uf=userFixture(C); let win=null;
        if(uf){ if(uf.comp==='reg') win=plan.reg(C,uf); else if(uf.comp!=='pre'){ win=ko<plan.ko; ko++; } }
        if(uf&&win!=null){ S.status='paused'; const opp=uf.h===u?uf.a:uf.h; C.directed[uf.id]={mode:'winner',winner:win?u:opp}; simRound(C); delete C.directed[uf.id]; uf.dir=false; S.status='live'; } else simRound(C);
        advance(C); }
      return {why:S.end&&S.end.why,res:S.end&&S.end.res,earned:Object.keys(S.earned).sort().join(''),missed:Object.keys(S.missed||{}).sort().join(''),yr:S.end&&S.end.yr,ph:S.end&&S.end.ph,pend:S.pend,code:S.rcode}; };
    const W=()=>true;
    const o={};
    o.ldNone=run('lastdance',11,{reg:W,ko:0}); o.ldB=run('lastdance',12,{reg:W,ko:3}); o.ldS=run('lastdance',13,{reg:W,ko:4}); o.ldG=run('lastdance',14,{reg:W,ko:7});
    o.prefs1=JSON.parse(JSON.stringify(v1819sP())); o.count1=v1819sMedalCount(); o.unl=V1819S_LIST.map(d=>d.id+':'+(v1819sUnlocked(d)?1:0)).join(',');
    const nerf=C=>{ for(const p of schoolPlayers(C,C.userSid)) shiftOvr(p,-45,'balanced'); v1819sRelu(C,C.userSid); };
    o.stLoss=run('streak',21,{reg:(C,f)=>{ nerf(C); return null; },ko:0}); o.stB=run('streak',22,{reg:(C,f)=>{ if(f.rd===12){ nerf(C); return null; } return true; },ko:0});
    { const C=v1819sBuild({id:'streak',seed:23}); App.C=C; const S=C.scn; const u=C.userSid; let g=0; while(S.status==='live'&&g++<60){ const uf=userFixture(C); if(uf&&uf.comp==='reg'&&C.md===11){ S.status='paused'; C.directed[uf.id]={mode:'score',hg:1,ag:1}; simRound(C); delete C.directed[uf.id]; S.status='live'; advance(C); continue; }
        if(uf&&(uf.comp==='reg'||uf.comp==='sec')){ S.status='paused'; C.directed[uf.id]={mode:'winner',winner:u}; simRound(C); delete C.directed[uf.id]; S.status='live'; } else simRound(C); advance(C); }
      o.stDraw={why:S.end&&S.end.why,res:S.end&&S.end.res,earned:Object.keys(S.earned).sort().join('')}; }
    o.rbG=run('rebuild',31,{reg:W,ko:3}); o.rbTime=run('rebuild',32,{reg:(C,f)=>false,ko:0});
    o.udB=run('underdog',41,{reg:W,ko:0});
    o.prefs=JSON.parse(JSON.stringify(v1819sP())); o.count=v1819sMedalCount(); o.unl2=V1819S_LIST.map(d=>d.id+':'+(v1819sUnlocked(d)?1:0)).join(',');
    o.ls=JSON.parse(localStorage.getItem(PREF_KEY)||'{}').v1819s; return o; });
  console.log(JSON.stringify(F));
  ok(F.ldNone.res===0&&F.ldNone.why==='settled'&&F.ldNone.ph==='sectionals'&&F.ldNone.missed==='bgs', 'Last Dance, out in round one: no medal, and the scenario ends right there (every medal settled)');
  ok(F.ldB.res===1&&F.ldB.earned==='b'&&F.ldB.ph==='states', 'Last Dance, Section title then a Regional loss: bronze');
  ok(F.ldS.res===2&&F.ldS.earned==='bs'&&F.ldS.ph==='states', 'Last Dance, Regional title then out at State: silver');
  ok(F.ldG.res===3&&F.ldG.earned==='bgs'&&F.ldG.why==='gold'&&/^TL-LAST-/.test(F.ldG.code), `Last Dance, State champions: gold, ending with a result code ${F.ldG.code}`);
  ok(F.count1===3&&F.prefs1.best.lastdance===3&&F.prefs1.med.lastdance.b&&F.prefs1.med.lastdance.g&&F.prefs1.runs.length===4, 'medals and the best result are recorded in PREFS across careers (4 runs, best gold)');
  ok(F.stLoss.why==='sudden'&&F.stLoss.res===0&&F.stB.why==='sudden'&&F.stB.res===0, 'The Streak: a league loss ends the scenario on the spot (round 10 or round 13), no medal');
  ok(F.stDraw.res===1&&F.stDraw.earned==='b', `The Streak: a draw keeps you unbeaten, so bronze but no 14-0 (${F.stDraw.why})`);
  ok(F.rbG.res===3&&F.rbG.yr===F.rbG.yr&&F.rbTime.res===0&&F.rbTime.why!=='gold', `The Rebuild: Section title in season one is gold; losing everything for two seasons ends with no medal (${F.rbTime.why}, ${F.rbTime.yr})`);
  ok(F.udB.res>=1&&/b/.test(F.udB.earned), `Underdog Story: winning the league is at least bronze (${F.udB.earned})`);
  ok(F.count>=8&&/defense:1/.test(F.unl2)&&/underdog:1/.test(F.unl2)&&F.ls&&F.ls.best&&F.ls.best.lastdance===3, `${F.count} medals unlock every scenario (${F.unl2}); stored in localStorage`);

  /* ---------- challenge codes ---------- */
  const CD=await page.evaluate(()=>{ const r={rt:true,bad:[],det:true};
    for(const d of V1819S_LIST){ for(const res of [null,{medal:2,w:11,d:2,l:1}]){ const c=v1819sEncode({id:d.id,seed:3141592653,res}); const o=v1819sDecode(c); if(o.err||o.id!==d.id||o.seed!==3141592653||JSON.stringify(o.res||null)!==JSON.stringify(res)) r.rt=false; } }
    const rnd=rngFrom(7); for(let i=0;i<40;i++){ const ru=V1819S_RULE_IDS.filter(()=>rnd()<.4); const md={}; for(const m of ['b','s','g']){ const k=V1819S_GOAL_IDS[Math.floor(rnd()*V1819S_GOAL_IDS.length)]; md[m]=V1819S_GOALS[k].n?{k,n:1+Math.floor(rnd()*7)}:{k}; }
      const def={n:"Coach's "+i,sc:Math.floor(rnd()*4),se:1+Math.floor(rnd()*3),ru,md}; const seed=Math.floor(rnd()*4294967295)>>>0; const c=v1819sEncode({def,seed}); const o=v1819sDecode(c);
      if(o.err||o.seed!==seed||JSON.stringify(o.def)!==JSON.stringify({sc:def.sc,se:def.se,ru:def.ru,md:def.md,n:def.n})) { r.rt=false; r.fail=c+' '+JSON.stringify(o); } }
    const c=v1819sEncode({id:'underdog',seed:99}); r.code=c; r.lower=!v1819sDecode(c.toLowerCase()).err; r.oh=!v1819sDecode(c.replace(/0/g,'O')).err;
    const body=c.split('-').slice(2).join('-'); let typos=0, caught=0; for(let i=0;i<body.length;i++){ if(body[i]==='-') continue; for(const ch of 'AZ7'){ if(ch===body[i]) continue; typos++; const t='TL-UNDR-'+body.slice(0,i)+ch+body.slice(i+1); if(v1819sDecode(t).err) caught++; } }
    r.typo=caught+'/'+typos; r.bad=[v1819sDecode(''),v1819sDecode('hello'),v1819sDecode('TL-ABCD-1234-5678'),v1819sDecode(c.slice(0,12)),v1819sDecode('TL-RBLD-'+body)].map(x=>x.err||'');
    const A=v1819sBuild(v1819sDecode(c)), B2=v1819sBuild(v1819sDecode(c)); const sig=C=>{ const u=C.userSid; return [C.schools[u].name,C.scn.rank,squad(C,u,'V').map(p=>p.fn+p.ln+Math.round(ovr(p)*10)).sort().join('|'),C.league.map(s=>Math.round(xiRating(C,s,'V')*10)).join(',')].join('#'); };
    r.det=sig(A)===sig(B2); const s1=v1819sBuild({id:'streak',seed:5}), s2=v1819sBuild({id:'streak',seed:5}); r.det2=JSON.stringify(standings(s1,'V'))===JSON.stringify(standings(s2,'V')); r.tag=/^TL-UNDR-[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/.test(c); return r; });
  console.log(JSON.stringify(CD));
  ok(CD.rt&&CD.tag, `codes round-trip for all six scenarios (with and without a result) and 40 random custom scenarios; format ${CD.code}`);
  ok(CD.lower&&CD.oh&&(+CD.typo.split('/')[0])/(+CD.typo.split('/')[1])>0.97, `codes forgive case and O/0, and catch single-character typos (${CD.typo})`);
  ok(CD.bad.every(Boolean)&&CD.bad.every(e=>!/undefined|NaN/.test(e)), 'friendly errors for empty, junk, unknown tag, truncated and mismatched-tag codes: '+CD.bad.join(' | '));
  ok(CD.det&&CD.det2, 'a code rebuilds the exact same world (same school, squad, ratings; The Streak gives the same 9-0 table)');

  /* ---------- UI: enter a code, build a custom one, start in slots, rules on the controls ---------- */
  await page.evaluate(()=>{ App.C=null; App.modal=null; render(); }); await page.waitForTimeout(500);
  await page.click('.v1819s-entry'); await page.waitForTimeout(300);
  await page.fill('#v1819s-code','TL-NOPE-1234'); await page.click('#v1819s-codego'); await page.waitForTimeout(200);
  const e1=await page.textContent('#v1819s-codeerr'); ok(/not a scenario/.test(e1), `a bad code shows a friendly inline error: "${e1}"`);
  await page.fill('#v1819s-code',CD.code.toLowerCase()); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>/Underdog/i.test(document.querySelector('#v1819s-dname').textContent)&&!!document.querySelector('.v1819s-chal')&&!document.querySelector('#v1819s-start').disabled), 'entering a code (lower case, Enter key) selects that exact scenario, unlocked, with a challenge banner');
  await page.click('#v1819s-buildbtn'); await page.waitForTimeout(300);
  await page.fill('#v1819s-bn','Friday Night Gauntlet'); await page.check('#v1819s-sc-2'); await page.check('#v1819s-se-1'); await page.uncheck('#v1819s-ru-tier1'); await page.check('#v1819s-ru-hard'); await page.check('#v1819s-ru-strict');
  await page.selectOption('#v1819s-md-b','top'); await page.waitForTimeout(100); await page.selectOption('#v1819s-mdn-b','5'); await page.selectOption('#v1819s-md-s','secwin'); await page.selectOption('#v1819s-md-g','rgn'); await page.waitForTimeout(200);
  const bc=await page.textContent('#v1819s-codeout');
  const bd=await page.evaluate(c=>v1819sDecode(c),bc);
  ok(/^TL-CUST-/.test(bc)&&bd.def&&bd.def.n==='Friday Night Gauntlet'&&bd.def.sc===2&&bd.def.se===1&&bd.def.ru.join()==='hard,strict'&&bd.def.md.b.k==='top'&&bd.def.md.b.n===5&&bd.def.md.g.k==='rgn', `the builder produces a code with the school, seasons, rules and medals: ${bc}`);
  await page.screenshot({path:OUT+'desk_build.png'});
  await page.click('#v1819s-bstart'); await page.waitForTimeout(300); await page.fill('#v1819s-coach','Test Coach'); await page.click('#v1819s-slot-2'); await page.waitForTimeout(1800);
  const CU=await page.evaluate(()=>{ const C=App.C; return {route:App.route,slot:App.slot,id:C.scn.id,name:C.scn.name,rank:C.scn.rank,n:C.league.length,diff:C.settings.difficulty,cards:C.settings.cards,coach:C.coaches[C.userCoachId].name,page:!!document.querySelector('.v1819s-hero'),goals:document.querySelectorAll('.v1819s-goal').length}; });
  ok(CU.route==='scenario'&&CU.slot===2&&CU.id==='custom'&&CU.name==='Friday Night Gauntlet'&&CU.rank===CU.n&&CU.diff==='hard'&&CU.cards==='strict'&&CU.coach==='Test Coach'&&CU.page&&CU.goals===3, 'starting the custom scenario: slot 2, weakest school, hard + strict set, coach name, lands on the Scenario page');
  /* rule locks */
  const RL=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; const p=squad(C,u,'V')[0]; const o0=JSON.stringify(p.sk); const r={};
    App.modal={type:'player',id:p.id,tab:'edit'}; renderModal(); r.editTab=!!document.querySelector('.modal [data-v="edit"]'); r.editForm=!!document.querySelector('#e-spd'); App.modal=null; renderModal();
    A.savePlayer({dataset:{id:p.id}}); r.same=JSON.stringify(p.sk)===o0;
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=true; cb.dataset.k='manager'; CH.setting(cb); r.manager=C.settings.manager;
    A.setParam({dataset:{k:'set_difficulty',v:'easy'},closest:()=>null}); r.diff=C.settings.difficulty; A.setParam({dataset:{k:'set_cards',v:'low'},closest:()=>null}); r.cards=C.settings.cards;
    const uf=userFixture(C); C.directed[uf.id]={mode:'winner',winner:uf.h===u?uf.a:uf.h}; const M=startMatch(C,uf.id,{}); r.directed=!M.forced&&!C.directed[uf.id];
    App.route='settings'; render(); r.setn=!!document.querySelector('.v1819s-setn'); App.route='scenario'; render(); return r; });
  ok(!RL.editTab&&!RL.editForm&&RL.same&&RL.manager===false&&RL.diff==='hard'&&RL.cards==='strict'&&RL.directed&&RL.setn, 'rules on the controls: no Edit tab or save, Manager Mode, difficulty and cards stay locked, directed results are dropped, Settings shows the locks');

  /* nocall, tier1, zeroscout on a live built-in: The Rebuild + Underdog in slot 1 via the API of the hub */
  const R2=await page.evaluate(async ()=>{ const r={}; const C=v1819sBuild({id:'underdog',seed:77}); App.C=C; App.slot=1; const u=C.userSid;
    const jv=squad(C,u,'JV').find(p=>p.grade>=10); A.promote({dataset:{id:jv.id,to:'V'}}); r.nocall=jv.lvl==='JV';
    let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); advance(C); } const K=campEnsure(C); r.camp=K&&K.pts; r.scout=campScout(C,K.prospects[0].p.id).ok;
    C.schools[u].stadium.tier=3; rollover(C); r.tier=C.schools[u].stadium.tier; r.live=C.scn.status; r.yr=C.year; return r; });
  ok(R2.nocall&&R2.camp===0&&R2.scout===false&&R2.tier===1&&R2.live==='live', 'Underdog rules: no call-ups to Varsity, summer camp opens with 0 scouting points, the stadium is back to Tier 1 after the off-season');

  /* scenario page + overview item + ceremony */
  const PG=await page.evaluate(()=>{ App.route='office'; render(); const item=document.querySelector('.v1819s-dec'); const r={item:!!item,itemTxt:item&&item.textContent.replace(/\s+/g,' ').trim()};
    App.route='scenario'; render(); r.yrs=document.querySelectorAll('.v1819s-yr').length; r.rules=document.querySelectorAll('.v1819s-rules li').length; r.nav=TOPNAV.some(t=>t[3].includes('scenario')); App.route='school'; render(); r.shelf=document.querySelectorAll('.v1819s-shelf .v1819s-shi').length; return r; });
  ok(PG.item&&/Underdog Story/.test(PG.itemTxt)&&PG.yrs===3&&PG.rules===4&&PG.nav&&PG.shelf===6, `in career: "This week" item ("${PG.itemTxt}"), a Scenario page with 3 seasons and 4 rules, a Competition menu entry, the coach's medal shelf`);
  await page.evaluate(async ()=>{ App.route='scenario'; await saveNow(); render(); }); await page.waitForTimeout(300); await page.screenshot({path:OUT+'desk_page.png'});
  await page.evaluate(()=>{ const C=App.C; const S=C.scn; S.earned.b={yr:C.year}; v1819sEnd(C,'time'); render(); }); await page.waitForTimeout(1500);
  const CE=await page.evaluate(()=>({m:App.modal&&App.modal.type,h:(document.querySelector('#v1819s-endh')||{}).textContent,code:(document.querySelector('.v1819s-endm #v1819s-codeout')||{}).textContent,pend:App.C.scn.pend}));
  ok(CE.m==='v1819sEnd'&&/Bronze medal/.test(CE.h)&&/^TL-UNDR-/.test(CE.code)&&CE.pend===false, `the ceremony opens by itself when the scenario ends: "${CE.h}" with a result code`);
  await page.waitForTimeout(1300); await page.screenshot({path:OUT+'desk_end.png'});
  await page.click('.v1819s-endm [data-a="closeModal"].pri'); await page.waitForTimeout(400);
  const AF=await page.evaluate(()=>{ const C=App.C; const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=true; cb.dataset.k='manager'; CH.setting(cb); const man=C.settings.manager; C.settings.manager=false;
    let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); advance(C); } const r=rollover(C); return {man,ok:r.ok,status:C.scn.status,modal:App.modal}; });
  ok(AF.man===true&&AF.ok&&AF.status==='done'&&!AF.modal, 'after the scenario the rules are lifted (Manager Mode can be turned on) and the career rolls into another season');

  /* ---------- save / reload ---------- */
  await page.evaluate(async ()=>{ App.C=null; App.modal=null; render(); }); await page.waitForTimeout(300);
  await page.click('.v1819s-entry'); await page.waitForTimeout(300); await page.click('#v1819s-li-rebuild'); await page.waitForTimeout(200);
  await page.waitForFunction(()=>!document.querySelector('#v1819s-start[aria-busy]'),null,{timeout:15000});
  const pre=await page.evaluate(()=>{ const D=V1819S_UI.drafts[v1819sKey(V1819S_UI.pick)]; return D.schools[D.userSid].name; });
  await page.click('#v1819s-start'); await page.waitForTimeout(400); await page.click('#v1819s-slot-2'); await page.waitForTimeout(200);
  const conf=await page.evaluate(()=>!!document.querySelector('.v1819s-confirm')&&/Replace/.test(document.querySelector('.v1819s-confirm').textContent));
  await page.click('#v1819s-keep'); await page.waitForTimeout(200); const kept=await page.evaluate(()=>!document.querySelector('.v1819s-confirm')&&App.modal&&App.modal.type==='v1819sHub');
  await page.screenshot({path:OUT+'desk_slot.png'});
  await page.click('#v1819s-slot-2'); await page.waitForTimeout(200); await page.click('#v1819s-replace'); await page.waitForTimeout(1800);
  const after=await page.evaluate(async ()=>{ const C=App.C; const r={name:C.schools[C.userSid].name,id:C.scn.id,slot:App.slot}; for(let i=0;i<2;i++){ simRound(C); advance(C); } queueSave(); await saveNow(); r.md=C.phase+C.md+C.pre.rd; const m=await DB.getMeta(); r.meta=m.find(x=>x.slot===2).school; return r; });
  ok(conf&&kept&&after.name===pre&&after.id==='rebuild'&&after.meta===pre, `starting into a filled slot asks first ("Keep it" cancels); Replace puts ${pre} (the exact previewed world) in slot 2`);
  await page.reload(); await page.waitForTimeout(1000);
  const RE=await page.evaluate(async ()=>{ await openSlot(2); const C=App.C; return {id:C.scn&&C.scn.id,status:C.scn&&C.scn.status,pre:C.pre.rd,hist:Object.keys(C.scn.hist||{}).length,medals:v1819sMedalCount(),best:v1819sP().best.lastdance,fair:v1819sHas(C,'fair')}; });
  ok(RE.id==='rebuild'&&RE.status==='live'&&RE.pre===2&&RE.fair&&RE.medals>=8&&RE.best===3, 'after a reload the scenario career reopens live where it was, rules active; medals survive the reload');
  ok(await page.evaluate(()=>{ const C=App.C; App.modal={type:'player',id:squad(C,C.userSid,'V')[0].id}; renderModal(); const r=!document.querySelector('.modal [data-v="edit"]'); App.modal=null; renderModal(); return r; }), 'the editor lock still applies after the reload');

  /* ---------- phone ---------- */
  const ph=await ctx.newPage(); await ph.setViewportSize({width:390,height:844}); ph.on('pageerror',e=>errs.push('phone: '+e.message));
  await ph.goto(DIST); await ph.waitForTimeout(1600); if(await ph.evaluate(()=>!!App.C)){ await ph.evaluate(async()=>{ await A.toSaves(); }); await ph.waitForTimeout(1600); } await ph.screenshot({path:OUT+'phone_menu.png'});
  await ph.click('.v1819s-entry'); await ph.waitForTimeout(400);
  await ph.waitForFunction(()=>document.querySelectorAll('.v1819s-detail .v1819s-squad:not(.v1819s-skel) .v1819s-pl').length===5,null,{timeout:15000}); await ph.waitForTimeout(300);
  await ph.screenshot({path:OUT+'phone_hub.png'});
  const pw=await ph.evaluate(()=>{ const m=document.querySelector('.v1819s-modal'); m.scrollTop=m.scrollHeight; return {doc:document.documentElement.scrollWidth,modal:m.scrollWidth-m.clientWidth}; }); await ph.waitForTimeout(200); await ph.screenshot({path:OUT+'phone_hub2.png'});
  await ph.click('#v1819s-buildbtn'); await ph.waitForTimeout(300); await ph.screenshot({path:OUT+'phone_build.png'}); const pw2=await ph.evaluate(()=>{ const m=document.querySelector('.v1819s-modal'); return m.scrollWidth-m.clientWidth; });
  await ph.evaluate(async ()=>{ App.modal=null; await openSlot(2); App.route='scenario'; render(); }); await ph.waitForTimeout(500); await ph.screenshot({path:OUT+'phone_page.png',fullPage:true});
  const pw3=await ph.evaluate(()=>document.documentElement.scrollWidth);
  await ph.evaluate(()=>{ App.route='office'; render(); }); await ph.waitForTimeout(400); await ph.screenshot({path:OUT+'phone_office.png',fullPage:true});
  await ph.evaluate(()=>{ const C=App.C; C.scn.earned.b={yr:C.year}; C.scn.earned.s={yr:C.year}; C.scn.earned.g={yr:C.year}; v1819sEnd(C,'gold'); render(); }); await ph.waitForTimeout(2600); await ph.screenshot({path:OUT+'phone_end.png'});
  const pw4=await ph.evaluate(()=>document.documentElement.scrollWidth);
  ok(pw.doc<=390&&pw.modal<=0&&pw2<=0&&pw3<=390&&pw4<=390, `phone 390: no sideways scroll (hub ${pw.doc}/${pw.modal}, builder ${pw2}, page ${pw3}, ceremony ${pw4})`);
  ok(!errs.length, 'no page errors or console errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0); })();
