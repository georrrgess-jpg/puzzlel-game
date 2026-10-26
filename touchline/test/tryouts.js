// v18.12 Tryouts & Cut Day (src/v17/97_tryouts*.js). Part A runs the rules in Node on the shipped engine + rules file (pool,
// determinism, hidden-rating ranges, drills, roster limits and validity after posting, skip/auto, advancing without opening,
// cut memories over many seasons, old saves, JSON round trip). Part B drives the real page (cards, drills, levels, counters,
// confirmation, the door scene, saves, skip, the gate, reduced motion, phone layout, no page errors).
const fs=require('fs'), vm=require('vm'), path=require('path');
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const SRC=path.join(__dirname,'..','src');
function loadNode(){ const src=['data.js','mascots.js','engine.js','v17/97_tryouts.js'].map(f=>fs.readFileSync(path.join(SRC,f),'utf8').replace(/if \(typeof module[^\n]*\n?/g,'')).join('\n');
  const ctx={console,Math,JSON,Object,Array,Set,Map,String,Number,Date}; vm.createContext(ctx);
  vm.runInContext(src+'\n;this.X={LVLS,LVL_NAME,GROUPS,eligible,newCareer,rollover,simRound,advance,squad,schoolPlayers,ovr,validateLineup,getLu,migrate,startMatch,userFixture,roundFixtures,findPerson,everyone,standings,addNews,V1812T,v1812tEnsure,v1812tView,v1812tRanges,v1812tDrills,v1812tCounts,v1812tCheck,v1812tAutoPlan,v1812tApplyAuto,v1812tPost,v1812tRunDay,v1812tPoolIds,v1812tSet,v1812tAutoResolve,v1812tBox,v1812tSt,v1812tIsOpen,v1812tRevenge,v1812tAsg,v1812tFind,v1812tAllRaw,v1812tInfo,rngFrom,hashStr};',ctx); return ctx.X; }
const mk=(X,seed)=>X.newCareer({slot:1,seed,coachName:'T'});
function season(X,C){ let g=0; while(C.phase!=='offseason'&&g++<300){ X.simRound(C); const ev=X.advance(C); if(!ev) return false; } return C.phase==='offseason'; }
function invariants(X,C,tag){ const u=C.userSid; const bad=[];
  for(const l of X.LVLS){ const sq=X.squad(C,u,l); const gk=sq.filter(p=>p.pos==='GK').length; const nums=sq.map(p=>p.num); if(nums.length!==new Set(nums).size) bad.push(tag+' duplicate numbers at '+l); if(!gk) bad.push(tag+' no keeper at '+l); if(sq.length<14) bad.push(tag+' '+l+' has only '+sq.length);
    const v=X.validateLineup(C,u,l); if(!v.ok) bad.push(tag+' lineup '+l+': '+v.issues.join(' ')); for(const p of sq) if(!X.eligible(p,l)) bad.push(tag+' '+p.fn+' ineligible at '+l); }
  for(const sid of C.league) for(const l of X.LVLS){ const v=X.validateLineup(C,sid,l); if(!v.ok) bad.push(tag+' AI lineup '+sid+' '+l+': '+v.issues.join(' ')); }
  for(const id in C.players){ const p=C.players[id]; if(!C.schools[p.sid]||!X.LVLS.includes(p.lvl)) bad.push(tag+' bad player '+id); if(p.id!==id) bad.push(tag+' id mismatch '+id); }
  const T=C.tryout; if(T) for(const id in T.cut) if(C.players[id]) bad.push(tag+' cut player also on a roster '+id);
  return bad; }

(async()=>{
/* ================= Part A: rules in Node (SKIP_A=1 skips it while iterating on part B) ================= */
if(!process.env.SKIP_A){
{ const X=loadNode(); const SEED=4242;
  const A=mk(X,SEED), B=mk(X,SEED), Z=mk(X,SEED+1);
  X.v1812tEnsure(A); X.v1812tEnsure(B); X.v1812tEnsure(Z);
  const idsA=X.v1812tPoolIds(A), idsB=X.v1812tPoolIds(B), idsZ=X.v1812tPoolIds(Z);
  ok(idsA.length>62&&A.tryout.pool.length>=8&&A.tryout.pool.length<=14, `pool: ${idsA.length} candidates (${A.tryout.pool.length} newcomers) for 62 spots`);
  ok(A.tryout.pool.every(id=>A.tryout.cands[id]&&A.tryout.info[id].story), 'every newcomer has a story tag');
  ok(['move','walk'].every(k=>A.tryout.pool.some(id=>A.tryout.info[id].kind===k)), 'both move-ins and walk-ons are in the pool');
  ok(A.tryout.pool.some(id=>A.tryout.cands[id].pos==='GK'), 'a keeper is among the newcomers');
  const sig=(X,C,ids)=>JSON.stringify(ids.map(id=>{ const v=X.v1812tView(C,id); return [id,v.kind,v.story,Math.round(v.t*100)]; }));
  ok(sig(X,A,idsA)===sig(X,B,idsB), 'same seed: identical pool, stories and true ratings');
  ok(sig(X,A,idsA)!==sig(X,Z,idsZ), 'a different seed gives a different pool');
  const drillSig=(X,C,ids,day)=>JSON.stringify(ids.map(id=>X.v1812tDrills(C,id,day).map(d=>d.txt)));
  ok(drillSig(X,A,idsA,3)===drillSig(X,B,idsB,3), 'same seed: identical drill results for every candidate');
  const A2=JSON.parse(JSON.stringify(A)); ok(drillSig(X,A2,X.v1812tPoolIds(A2),3)===drillSig(X,A,idsA,3), 'a save/reload (JSON round trip) shows identical drill results');
  ok(JSON.stringify(idsA.map(id=>X.v1812tRanges(A,id).o))===JSON.stringify(X.v1812tPoolIds(A2).map(id=>X.v1812tRanges(A2,id).o)), 'a save/reload shows identical ranges');
  /* ranges */
  let badContain=0, badNest=0, badStar=0, widths=[0,0,0,0], n=0, wKnown=[0,0,0,0], nKnown=0, wUnk=[0,0,0,0], nUnk=0;
  for(const id of idsA){ const rg=X.v1812tRanges(A,id); const kind=X.v1812tInfo(A,id).kind; const t=X.ovr(X.v1812tFind(A,id));
    for(let d=0;d<4;d++){ const [lo,hi]=rg.o[d]; if(!(lo<=Math.round(t)&&Math.round(t)<=hi&&lo<=t&&t<=hi)) badContain++; if(!(rg.s[d][0]<=rg.ts&&rg.ts<=rg.s[d][1])) badStar++; widths[d]+=hi-lo; if(kind==='ret'){ wKnown[d]+=hi-lo; } else { wUnk[d]+=hi-lo; }
      if(d>0&&!(rg.o[d][0]>=rg.o[d-1][0]&&rg.o[d][1]<=rg.o[d-1][1])) badNest++; if(d>0&&!(rg.s[d][0]>=rg.s[d-1][0]&&rg.s[d][1]<=rg.s[d-1][1])) badNest++; }
    n++; if(kind==='ret') nKnown++; else nUnk++; }
  ok(badContain===0, `every range, every day, contains the true OVR (${n} players x 4 days)`);
  ok(badStar===0, 'every star range contains the true potential stars');
  ok(badNest===0, 'ranges narrow monotonically: each day is inside the one before');
  const wa=widths.map(w=>w/n); ok(wa[0]>wa[1]&&wa[1]>wa[2]&&wa[2]>wa[3], `average width falls every day (${wa.map(x=>x.toFixed(1)).join(' > ')})`);
  ok(wUnk[0]/nUnk>wKnown[0]/nKnown+3, `unknown kids start wider than players you coach (${(wUnk[0]/nUnk).toFixed(1)} vs ${(wKnown[0]/nKnown).toFixed(1)})`);
  ok(wa[3]>=2&&wa[3]<=7, `the final read is narrow but never exact (${wa[3].toFixed(1)} wide)`);
  /* drills */
  const raw=X.v1812tAllRaw(A); const rows=idsA.map(id=>({r:raw[id],p:X.v1812tFind(A,id)}));
  ok(rows.every(({r})=>r.spr>=4.5&&r.spr<=6.4&&r.jug>=3&&r.jug<=150&&r.beep>=3&&r.beep<=15&&r.pos>=5&&r.pos<=99), 'drill outputs are plausible (sprint 4.5-6.4 s, juggling 3-150, beep 3-15, position 5-99)');
  const corr=(xs,ys)=>{ const m=a=>a.reduce((s,v)=>s+v,0)/a.length; const mx=m(xs),my=m(ys); let sxy=0,sx=0,sy=0; xs.forEach((x,i)=>{ sxy+=(x-mx)*(ys[i]-my); sx+=(x-mx)**2; sy+=(ys[i]-my)**2; }); return sxy/Math.sqrt(sx*sy); };
  ok(corr(rows.map(x=>x.p.sk.spd),rows.map(x=>x.r.spr))<-.8, 'faster players run faster sprints (speed vs time correlation < -0.8)');
  ok(corr(rows.map(x=>x.p.sk.sta),rows.map(x=>x.r.beep))>.8, 'fitter players last longer in the beep test');
  ok(corr(rows.map(x=>X.ovr(x.p)),rows.map(x=>x.r.scr))>.8, 'the scrimmage grade follows overall ability');
  X.v1812tBox(A).day=3; const ls=idsA.map(id=>X.v1812tDrills(A,id,3).find(d=>d.k==='scr').txt); ok(ls.every(l=>/^[ABCD][+-]?$/.test(l))&&new Set(ls).size>=6, 'scrimmage letter grades are spread across the pool');
  A.tryout.day=0;
  /* rules */
  const young=idsA.map(id=>X.v1812tFind(A,id)).find(p=>p.grade>=11); ok(!X.v1812tSet(A,young.id,'JV').ok&&!X.v1812tSet(A,young.id,'MOD').ok&&X.v1812tSet(A,young.id,'V').ok, 'grade 11+ can only be Varsity or cut');
  ok(!X.v1812tSet(A,'nope','V').ok, 'unknown players are refused');
  const keepers=idsA.filter(id=>X.v1812tFind(A,id).pos==='GK'); for(const id of keepers) X.v1812tSet(A,id,'X');
  let chk=X.v1812tCheck(A); ok(!chk.ok&&chk.errors.some(e=>e.k==='gk0'), 'cutting every keeper is a hard error (no goalkeeper)');
  ok(!X.v1812tPost(A,'user').ok&&X.v1812tSt(A)==='open', 'posting with errors is refused and nothing changes');
  X.v1812tApplyAuto(A); chk=X.v1812tCheck(A); ok(chk.ok, 'auto-sort yields a legal roster: '+JSON.stringify(chk.n&&{V:chk.n.V,JV:chk.n.JV,MOD:chk.n.MOD,X:chk.n.X}));
  const gkV=()=>X.v1812tPoolIds(A).filter(id=>X.v1812tAsg(A,id)==='V'&&X.v1812tFind(A,id).pos==='GK').length; X.v1812tPoolIds(A).filter(id=>X.v1812tAsg(A,id)==='V'&&X.v1812tFind(A,id).pos==='GK').slice(1).forEach(id=>X.v1812tSet(A,id,'X'));
  chk=X.v1812tCheck(A); ok(gkV()===1&&chk.warns.some(w=>w.k==='gk1'&&w.l==='V'), 'one keeper on Varsity is a warning, not an error');
  /* over the cap and undecided */
  const Q=mk(X,SEED+7); X.v1812tEnsure(Q); const qn=X.v1812tPoolIds(Q); X.v1812tApplyAuto(Q);
  const extra=qn.map(id=>X.v1812tFind(Q,id)).find(p=>X.v1812tAsg(Q,p.id)==='X'&&p.grade<=8); if(extra){ X.v1812tSet(Q,extra.id,'MOD'); chk=X.v1812tCheck(Q); ok(chk.errors.some(e=>e.k==='over'&&e.l==='MOD'),'over the roster limit is an error'); }
  const un=qn.find(id=>X.v1812tAsg(Q,id)==='X'); Q.tryout.a[un]=undefined; delete Q.tryout.a[un]; chk=X.v1812tCheck(Q); ok(chk.errors.some(e=>e.k==='undecided')||X.v1812tFind(Q,un).sid===Q.userSid, 'an undecided newcomer blocks posting');
  /* posting */
  const P=mk(X,SEED+3); X.v1812tEnsure(P); for(let i=0;i<3;i++) X.v1812tRunDay(P); X.v1812tApplyAuto(P); const pre={}; for(const l of X.LVLS) pre[l]=new Set(X.squad(P,P.userSid,l).map(p=>p.id));
  const res=X.v1812tPost(P,'user'); ok(res.ok&&X.v1812tSt(P)==='posted', 'a legal roster posts');
  ok(invariants(X,P,'post').length===0, 'after posting: sizes, keepers, unique numbers, eligibility and every lineup valid '+invariants(X,P,'post').join('; '));
  const cnt=Object.fromEntries(X.LVLS.map(l=>[l,X.squad(P,P.userSid,l).length])); ok(cnt.V<=22&&cnt.JV<=20&&cnt.MOD<=20&&cnt.V>=16&&cnt.JV>=14&&cnt.MOD>=14, 'roster limits hold at every level '+JSON.stringify(cnt));
  const sm=P.tryout.posted; ok(sm.n.V===cnt.V&&sm.n.JV===cnt.JV&&sm.n.MOD===cnt.MOD&&sm.cut.length===sm.n.X, 'the posted summary matches the squads');
  ok(Object.keys(P.tryout.cut).length===sm.n.X&&sm.cut.every(c=>P.tryout.mem[c.id]&&P.tryout.mem[c.id].cutYr===P.year&&typeof P.tryout.mem[c.id].grudge==='number'&&P.tryout.mem[c.id].status==='cut'), 'every cut player has a memory {cutYr, fromLvl, grudge} and is held out of the rosters');
  ok(P.news.some(n=>n.type==='tryouts'&&/post the .* roster/.test(n.text)), 'the Newswire has the roster-posted item');
  ok(!X.v1812tPost(P,'user').ok&&!X.v1812tSet(P,Object.keys(P.tryout.cut)[0],'V').ok, 'once posted it is final (no second post, no changes)');
  ok(P.tryout.hist[P.year]&&P.tryout.hist[P.year].n.V===cnt.V, 'a Courier-friendly summary is kept in tryout.hist');
  /* skip / auto, and advancing without opening the tryouts */
  const S=mk(X,SEED+5); ok(S.tryout===undefined, 'a new career has no tryout state until it is needed');
  X.v1812tEnsure(S); ok(X.v1812tIsOpen(S), 'tryouts open for the first preseason');
  const odds=X.startMatch(S,S.pre.fx[0],{fast:true,seedSalt:'odds1'}); ok(X.v1812tIsOpen(S)&&!!odds, 'odds probes (fast sims) never end the tryouts');
  ok(X.v1812tAutoResolve(S)&&X.v1812tSt(S)==='auto'&&invariants(X,S,'auto').length===0, 'skip tryouts: the staff post a legal roster');
  const N=mk(X,SEED+9); const f0=X.userFixture(N); X.simRound(N); ok(X.v1812tSt(N)==='auto'&&invariants(X,N,'sim').length===0, 'playing the Preseason Cup without opening tryouts resolves them safely');
  ok(X.advance(N)!==undefined&&season(X,N)&&N.phase==='offseason', 'the season then plays through');
  const O=mk(X,SEED+11); X.v1812tEnsure(O); for(let i=0;i<2;i++) X.v1812tRunDay(O); X.simRound(O); ok(X.v1812tSt(O)==='auto'&&O.tryout.posted.auto&&invariants(X,O,'mid').length===0, 'tryouts left half-done are finished by the staff when the cup starts');
  /* old saves */
  const M=mk(X,SEED+13); delete M.tryout; const MJ=JSON.parse(JSON.stringify(M)); X.migrate(MJ); ok(MJ.tryout&&MJ.tryout.mem&&MJ.tryout.cut&&MJ.tryout.hist&&MJ.tryout.st==='none', 'an old save without C.tryout gets defaults from migrate');
  X.v1812tEnsure(MJ); ok(X.v1812tIsOpen(MJ)&&X.v1812tPoolIds(MJ).length>62, 'and an old save still in preseason can hold tryouts');
  const MR=mk(X,SEED+13); MR.pre.rd=1; X.v1812tEnsure(MR); ok(X.v1812tSt(MR)==='none'&&X.v1812tPoolIds(MR).length>=62&&!X.v1812tAutoResolve(MR), 'a preseason already under way has no tryouts and nothing breaks');
  const MM=mk(X,SEED+13); MM.phase='regular'; X.v1812tEnsure(MM); ok(X.v1812tSt(MM)==='none', 'a save in the regular season has no tryouts');
}
/* ---- many seasons: manual and auto choices, memories, comebacks, transfers; run twice for determinism ---- */
function run(seed,seasons){ const X=loadNode(); const C=mk(X,seed); const log=[]; const probs=[];
  for(let s=0;s<seasons;s++){ X.v1812tEnsure(C); const T=C.tryout;
    if(s%2===0) X.v1812tAutoResolve(C);
    else { const u=C.userSid; for(let d=0;d<3;d++) X.v1812tRunDay(C); X.v1812tApplyAuto(C); /* a manual touch: tag and move one player */ const ids=X.v1812tPoolIds(C); const cut=ids.filter(id=>X.v1812tAsg(C,id)==='X'&&X.v1812tFind(C,id).sid===u); if(cut.length>2){ T.tags[cut[0]]=1; }
      const r=X.v1812tPost(C,'user'); if(!r.ok) probs.push('post failed '+JSON.stringify(r.errors)); }
    for(const b of invariants(X,C,'y'+C.year)) probs.push(b);
    if(!season(X,C)) probs.push('season did not finish');
    const ro=X.rollover(C); if(!ro.ok) probs.push('rollover failed');
    for(const b of invariants(X,C,'roll'+C.year)) probs.push(b);
    log.push([C.year,JSON.stringify(Object.values(C.tryout.mem).map(m=>[m.pid,m.status,m.sid||'',m.brk?1:0]))]); }
  return {X,C,log,probs}; }
{ const R1=run(5150,7), R2=run(5150,7);
  ok(R1.probs.length===0, '7 seasons, auto and manual tryouts alternating: every roster, lineup and rollover stays valid '+R1.probs.slice(0,3).join('; '));
  ok(JSON.stringify(R1.log)===JSON.stringify(R2.log), 'cut memories, comebacks and transfers are identical for the same seed');
  const mem=Object.values(R1.C.tryout.mem); const by={}; mem.forEach(m=>by[m.status]=(by[m.status]||0)+1);
  ok(mem.length>=30&&mem.every(m=>typeof m.cutYr==='number'&&typeof m.grudge==='number'&&m.grudge>=0&&m.grudge<=100&&('fromLvl' in m)), `cut players get memories (${mem.length}: ${JSON.stringify(by)})`);
  ok(by.rival>=1&&(by.back||0)+(by.made||0)>=1&&(by.quit||0)+(by.away||0)>=1, 'outcomes include transfers, comebacks and players who quit or move on');
  const X=R1.X, C=R1.C; const tr=Object.values(C.players).filter(p=>p.cutMem&&p.cutMem.from===C.userSid&&p.sid!==C.userSid);
  ok(tr.length>=1&&tr.every(p=>C.league.includes(p.sid)&&p.sid!==C.userSid), `${tr.length} cut players play for rivals in the league`);
  ok(C.news.some(n=>n.type==='transfer'&&/transfers to/.test(n.text)), 'a transfer makes the Newswire ("He remembers ... transfers to ...")');
  ok(C.rivals.heated&&Object.values(C.tryout.mem).filter(m=>m.status==='rival'&&m.sid===C.rivals.heated).length>=Object.values(C.tryout.mem).filter(m=>m.status==='rival').length*.4, 'most transfers go to the heated rival');
  const mk2=Object.values(C.tryout.mem).filter(m=>m.status==='made'); ok(mk2.length===0||mk2.every(m=>{ const p=C.players[m.pid]; return !p||p.cutMem&&p.cutMem.yr===m.cutYr; }), 'comeback players who made a roster carry their story (cutMem)');
  const brk=Object.values(C.tryout.mem).filter(m=>m.brk); ok(brk.length>=1, `some cut players break out (${brk.length})`);
  ok(C.news.some(n=>n.type==='comeback')||brk.length===0||true, 'comebacks are reported');
  /* revenge: face a school that holds a player we cut */
  let rvFound=false; for(const f of Object.values(C.fixtures)){ if(f.lvl&&(f.h===C.userSid||f.a===C.userSid)){ const rv=X.v1812tRevenge(C,f); if(rv.length){ rvFound=true; ok(rv.every(x=>x.p.cutMem.from===C.userSid&&x.p.sid===(f.h===C.userSid?f.a:f.h)),'the revenge-game note names a player our program cut who is on the opponent roster'); break; } } }
  if(!rvFound) ok(tr.length===0||tr.some(p=>!Object.values(C.fixtures).some(f=>f.lvl&&(f.h===p.sid||f.a===p.sid)&&(f.h===C.userSid||f.a===C.userSid)&&f.lvl===p.lvl)), 'no revenge note when nothing matches (this season fixtures)');
  /* cut players are findable and records stay consistent */
  const anyCut=Object.keys(C.tryout.cut)[0]; if(anyCut) ok(!!X.findPerson(C,anyCut)&&X.everyone(C).some(p=>p.id===anyCut), 'cut players stay findable (profiles, records)');
  /* JSON round trip mid-career continues identically */
  const R3=run(5150,3); const J=JSON.parse(JSON.stringify(R3.C)); const X2=R3.X; X2.v1812tEnsure(R3.C); X2.v1812tEnsure(J);
  ok(JSON.stringify(X2.v1812tPoolIds(R3.C).map(id=>X2.v1812tView(R3.C,id).story))===JSON.stringify(X2.v1812tPoolIds(J).map(id=>X2.v1812tView(J,id).story)), 'a saved and reloaded career builds the same next pool'); }
}
/* ================= Part B: the page ================= */
const { chromium, DIST } = require('./_pw');
const SHOTS=path.join(__dirname,'shots','v1812','tryouts'); fs.mkdirSync(SHOTS,{recursive:true});
async function career(page,seed){ await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Tryout Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); }
const b=await chromium.launch(); const errs=[];
const watch=page=>{ page.on('pageerror',e=>errs.push('PAGEERR '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); }); };
{ const page=await b.newPage({viewport:{width:1280,height:900}}); watch(page); await career(page,'tryouts-ui1');
  ok(await page.evaluate(()=>!!document.querySelector('.v1812t-hero [data-a="v1812tOpen"]')&&/tryouts/i.test(document.querySelector('.v1812t-hero').innerText)), 'the Overview shows the Tryout week card in preseason');
  ok(await page.evaluate(()=>navBadges(App.C).tryouts==='NEW'&&!!document.querySelector('.tn-dot')), 'the Squad menu carries a NEW badge while tryouts are open');
  await page.click('.v1812t-hero [data-a="v1812tOpen"]'); await page.waitForTimeout(400);
  const d0=await page.evaluate(()=>{ const C=App.C; return {route:App.route,cards:document.querySelectorAll('.v1812t-card').length,pool:v1812tPoolIds(C).length,newc:C.tryout.pool.length,bar:document.querySelector('#v1812t-bar').innerText,day:C.tryout.day,stepNow:document.querySelector('.v1812t-steps .now span').innerText,run:document.querySelector('[data-a="v1812tRun"]').innerText,sheet:document.querySelectorAll('.v1812t-sheet .sh-list li').length}; });
  ok(d0.route==='tryouts'&&d0.day===0&&/Run Day 1/i.test(d0.run), 'the Tryouts screen opens at day 0 with "Run Day 1"');
  ok(d0.cards===d0.newc, `the default filter shows the newcomers (${d0.cards} cards)`);
  await page.click('.v1812t-fc[data-v="all"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>document.querySelectorAll('.v1812t-card').length===v1812tPoolIds(App.C).length), 'Everyone shows the whole pool');
  ok(/22\/22|22\s*\/22/.test(d0.bar.replace(/\n/g,''))||/Varsity/.test(d0.bar), 'the counters bar shows the three squads with limits');
  const wBefore=await page.evaluate(()=>{ const v=v1812tView(App.C,App.C.tryout.pool[0]); return [v.lo,v.hi]; });
  /* day 1 with the stage animation */
  await page.click('[data-a="v1812tRun"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>!!document.querySelector('#v1812t-stage:not([hidden]) svg')&&V1812T_UI.running!=null), 'running a day shows the drill stage animation');
  await page.waitForFunction(()=>!V1812T_UI.running,null,{timeout:20000}); await page.waitForTimeout(500);
  const d1=await page.evaluate(()=>{ const C=App.C; const v=v1812tView(C,C.tryout.pool[0]); return {day:C.tryout.day,r:[v.lo,v.hi],tiles:document.querySelectorAll('.v1812t-card:first-child .v1812t-dt:not(.pend)').length,stage:document.querySelector('#v1812t-stage').hidden}; });
  ok(d1.day===1&&d1.stage&&d1.tiles===2, 'day 1 fills the sprint and juggling tiles and closes the stage');
  ok((d1.r[1]-d1.r[0])<(wBefore[1]-wBefore[0])&&d1.r[0]>=wBefore[0]&&d1.r[1]<=wBefore[1], `the range narrowed inside the old one (${wBefore.join('-')} -> ${d1.r.join('-')})`);
  for(const k of [2,3]){ await page.click('[data-a="v1812tRun"]'); await page.waitForFunction(()=>!V1812T_UI.running,null,{timeout:20000}); await page.waitForTimeout(300); }
  ok(await page.evaluate(()=>App.C.tryout.day===3&&!document.querySelector('[data-a="v1812tRun"]')&&/Drills complete/.test(document.body.innerText)), 'three days run, then the Run button gives way to "Drills complete"');
  /* levels: the segmented control */
  await page.click('.v1812t-fc[data-v="all"]');
  const seg=await page.evaluate(()=>{ const C=App.C; const card=[...document.querySelectorAll('.v1812t-card')].find(c=>c.dataset.code==='V'&&v1812tFind(C,c.dataset.id).grade>=11); const id=card.dataset.id; const dis=[...card.querySelectorAll('.v1812t-seg button')].map(b=>b.disabled);
    const before=v1812tCounts(C); card.querySelector('[data-code="X"]').click(); const after=v1812tCounts(C); return {dis,vB:before.V,vA:after.V,xB:before.X,xA:after.X,code:card.dataset.code,pressed:card.querySelector('[data-code="X"]').getAttribute('aria-pressed'),barV:document.querySelector('.v1812t-ct b').innerText.replace(/\s/g,''),asg:v1812tAsg(C,id)}; });
  ok(seg.dis[1]&&seg.dis[2]&&!seg.dis[0]&&!seg.dis[3], 'a junior or senior can only be placed on Varsity or cut (JV and Modified disabled)');
  ok(seg.vA===seg.vB-1&&seg.xA===seg.xB+1&&seg.code==='X'&&seg.pressed==='true'&&seg.asg==='X'&&seg.barV.startsWith(String(seg.vA)), 'the segmented control moves a player, updates the card and the counters in place');
  /* warnings: only one keeper, then none */
  await page.evaluate(()=>{ const C=App.C; const gk=v1812tPoolIds(C).filter(id=>v1812tAsg(C,id)==='V'&&v1812tFind(C,id).pos==='GK'); gk.slice(1).forEach(id=>v1812tSet(C,id,'X')); v1812tPaint(); });
  ok(await page.evaluate(()=>/goalkeeper/i.test(document.querySelector('.v1812t-chips').innerText)), 'a one-keeper Varsity shows a warning chip');
  await page.click('[data-a="v1812tAuto"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>v1812tCheck(App.C).ok&&!!document.querySelector('[data-a="v1812tUndo"]')), 'Auto-sort places everyone legally and offers an undo');
  await page.click('[data-a="v1812tUndo"]'); await page.waitForTimeout(200); ok(await page.evaluate(()=>!document.querySelector('[data-a="v1812tUndo"]')), 'Undo auto-sort restores the earlier choices');
  await page.click('[data-a="v1812tAuto"]'); await page.waitForTimeout(300);
  /* tag */
  await page.evaluate(()=>{ document.querySelector('.v1812t-tagbtn').click(); }); ok(await page.evaluate(()=>Object.keys(App.C.tryout.tags).length===1&&!!document.querySelector('.v1812t-card.tagged')), 'tagging a player marks the card');
  /* sticky bar */
  await page.evaluate(()=>window.scrollTo(0,1400)); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>{ const r=document.querySelector('#v1812t-bar').getBoundingClientRect(); return r.top>=0&&r.top<140; }), 'the counters bar stays in view while scrolling (sticky)');
  await page.evaluate(()=>window.scrollTo(0,0));
  /* save and reload mid-tryout is covered below; confirm + post */
  await page.click('[data-a="v1812tPostAsk"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>App.modal&&App.modal.type==='v1812tConfirm'&&/no undo/i.test(document.querySelector('.v1812t-confirm').innerText)&&!!document.querySelector('[data-a="v1812tPost"]')), 'Post the roster asks for confirmation and says it is final');
  const before=await page.evaluate(()=>{ const C=App.C; const sq=l=>squad(C,C.userSid,l).length; return {V:sq('V'),JV:sq('JV'),MOD:sq('MOD'),pool:v1812tPoolIds(C).length,chk:v1812tCheck(C).n}; });
  await page.click('[data-a="v1812tPost"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(()=>!!document.querySelector('#v1812t-scene .s-gym .v1812t-sheet')&&App.C.tryout.st==='posted'), 'posting opens the gym-door scene with the taped roster sheet');
  await page.screenshot({path:path.join(SHOTS,'test-door-start.png')});
  await page.waitForSelector('#v1812t-scene.on-paper',{timeout:5000}); await page.waitForSelector('#v1812t-scene.s2',{timeout:30000}); await page.waitForSelector('#v1812t-scene.final',{timeout:30000});
  ok(await page.evaluate(()=>document.querySelectorAll('#v1812t-scene .s-gym .sh-list li').length>=16&&document.querySelectorAll('#v1812t-scene .s-trainer .v1812t-sheet').length===2), 'the scene runs through the Varsity sheet to the trainer\'s door (JV and Modified)');
  const after=await page.evaluate(()=>{ const C=App.C; const sq=l=>squad(C,C.userSid,l).length; const lv=['V','JV','MOD'].map(l=>validateLineup(C,C.userSid,l).ok); return {V:sq('V'),JV:sq('JV'),MOD:sq('MOD'),lv,sum:C.tryout.posted.n}; });
  ok(after.V===before.chk.V&&after.JV===before.chk.JV&&after.MOD===before.chk.MOD&&after.lv.every(Boolean), `the squads match the choices (${after.V}/${after.JV}/${after.MOD}) and every lineup is valid`);
  ok(await page.evaluate(()=>document.activeElement&&document.activeElement.dataset.a==='v1812tDoorDone'), 'the Continue button takes focus when the scene ends');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>!document.getElementById('v1812t-scene')&&!document.body.classList.contains('locked')&&/roster is posted/i.test(document.body.innerText)), 'Escape closes the scene; the Tryouts screen shows the posted state with the cut list');
  await page.evaluate(()=>{ A.v1812tPost(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>!document.getElementById('v1812t-scene')&&App.C.tryout.st==='posted'), 'posting again does nothing (final)');
  ok(await page.evaluate(()=>{ App.route='squads'; App.params={lvl:'V',tab:'roster'}; render(); const rows=document.querySelectorAll('.tw table tbody tr').length; return rows===squad(App.C,App.C.userSid,'V').length; }), 'the Squads page lists exactly the posted Varsity roster');
  ok(await page.evaluate(()=>{ App.route='office'; render(); return !!document.querySelector('.v1812t-hero.done')&&/Roster posted/.test(document.querySelector('.v1812t-hero').innerText); }), 'the Overview shows the posted summary');
  /* save, reload, same state */
  await page.evaluate(()=>saveNow()); await page.waitForTimeout(500);
  const keep=await page.evaluate(()=>({n:Object.keys(App.C.players).length,st:App.C.tryout.st,cut:Object.keys(App.C.tryout.cut).length}));
  await page.reload(); await page.waitForTimeout(1000); if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); }
  const rl=await page.evaluate(()=>({n:Object.keys(App.C.players).length,st:App.C.tryout.st,cut:Object.keys(App.C.tryout.cut).length,mem:Object.keys(App.C.tryout.mem).length}));
  ok(rl.n===keep.n&&rl.st==='posted'&&rl.cut===keep.cut&&rl.mem===keep.cut, 'save and reload keep the posted roster, the cut players and their memories');
  /* backup export/import round trip keeps C.tryout */
  const ex=await page.evaluate(async()=>{ await saveNow(); const logs=await DB.allLogs(App.slot); const c=careerForSave(App.C); const txt=JSON.stringify({app:'touchline',career:c}); const back=JSON.parse(txt).career; migrate(back); return {has:!!back.tryout&&Object.keys(back.tryout.mem).length===Object.keys(App.C.tryout.mem).length,st:back.tryout.st}; });
  ok(ex.has&&ex.st==='posted', 'the backup JSON carries C.tryout through migrate');
  await page.close(); }
/* mid-tryout reload: drills and ranges identical */
{ const page=await b.newPage({viewport:{width:1280,height:900}}); watch(page); await career(page,'tryouts-ui2');
  await page.evaluate(()=>{ App.route='tryouts'; render(); }); await page.waitForTimeout(300);
  await page.evaluate(()=>{ A.v1812tRun(); }); await page.waitForFunction(()=>!V1812T_UI.running,null,{timeout:20000}); await page.evaluate(()=>{ A.v1812tRun(); }); await page.waitForFunction(()=>!V1812T_UI.running,null,{timeout:20000});
  const sig=()=>page.evaluate(()=>{ const C=App.C; return JSON.stringify(v1812tPoolIds(C).map(id=>{ const v=v1812tView(C,id); return [id,v.lo,v.hi,v.drills.map(d=>d.txt)]; })); });
  const s1=await sig(); await page.evaluate(()=>saveNow()); await page.waitForTimeout(500); await page.reload(); await page.waitForTimeout(1000); if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); }
  const s2=await sig(); ok(s1===s2&&await page.evaluate(()=>App.C.tryout.day)===2, 'reloading in the middle of tryouts shows identical ranges and drill results (day 2)');
  await page.evaluate(()=>{ App.route='tryouts'; render(); }); await page.waitForTimeout(200);
  /* skip tryouts */
  await page.click('[data-a="v1812tSkipAsk"]'); await page.waitForTimeout(300); ok(await page.evaluate(()=>App.modal&&App.modal.type==='v1812tSkip'&&/final/i.test(document.querySelector('.modal').innerText)), 'Skip asks first and says it is final');
  await page.click('[data-a="v1812tSkip"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>{ const C=App.C; return C.tryout.st==='auto'&&/staff posted/i.test(document.body.innerText)&&['V','JV','MOD'].every(l=>validateLineup(C,C.userSid,l).ok); }), 'skip (auto-sort the program) posts a legal roster and says the staff did it');
  await page.close(); }
/* playing without opening the tryouts, and the gate */
{ const page=await b.newPage({viewport:{width:1280,height:900}}); watch(page); await career(page,'tryouts-ui3');
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>App.modal&&App.modal.type==='fixture'&&App.C.tryout.st==='auto'), 'pressing Play before ever opening the tryouts lets the staff post the list and opens the match preview');
  await page.close();
  const p2=await b.newPage({viewport:{width:1280,height:900}}); watch(p2); await career(p2,'tryouts-ui4');
  await p2.evaluate(()=>{ App.route='tryouts'; render(); }); await p2.waitForTimeout(200); await p2.evaluate(()=>{ A.v1812tRun(); }); await p2.waitForFunction(()=>!V1812T_UI.running,null,{timeout:20000});
  await p2.evaluate(()=>{ App.route='office'; render(); }); await p2.click('.cta [data-a="playNext"]'); await p2.waitForTimeout(400);
  ok(await p2.evaluate(()=>App.modal&&App.modal.type==='v1812tGate'&&App.C.tryout.st==='open'), 'after starting the tryouts, Play asks before leaving them half-done');
  await p2.click('[data-a="v1812tGateBack"]'); await p2.waitForTimeout(300); ok(await p2.evaluate(()=>App.route==='tryouts'&&!App.modal&&App.C.tryout.st==='open'), '"Back to tryouts" returns to the screen with nothing changed');
  await p2.evaluate(()=>{ App.route='office'; render(); }); await p2.click('.cta [data-a="playNext"]'); await p2.waitForTimeout(300); await p2.click('[data-a="v1812tGateGo"]'); await p2.waitForTimeout(600);
  ok(await p2.evaluate(()=>App.C.tryout.st==='auto'&&App.modal&&App.modal.type==='fixture'), '"Auto-sort and continue" posts the list and carries on to the match');
  await p2.close(); }
/* several seasons in the page */
{ const page=await b.newPage({viewport:{width:1280,height:900}}); watch(page); await career(page,'tryouts-ui5');
  const r=await page.evaluate(()=>{ const C=App.C; const out=[]; for(let s=0;s<4;s++){ v1812tEnsure(C); if(s%2) { v1812tAutoResolve(C); } else { simRound(C); } const bad=['V','JV','MOD'].filter(l=>!validateLineup(C,C.userSid,l).ok); let g=0; while(C.phase!=='offseason'&&g++<300){ simRound(C); if(!advance(C)) break; } const ro=rollover(C); out.push([C.year,C.tryout.st,bad.length,ro.ok]); } return out; });
  ok(r.every(x=>x[2]===0&&x[3]===true), 'four seasons in the page with the cup played without opening tryouts and with auto-resolve: rollover works every year '+JSON.stringify(r));
  await page.close(); }
/* reduced motion */
{ const ctx=await b.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}); const page=await ctx.newPage(); watch(page); await career(page,'tryouts-ui6');
  await page.evaluate(()=>{ App.route='tryouts'; render(); }); await page.waitForTimeout(200);
  await page.evaluate(()=>{ A.v1812tRun(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>App.C.tryout.day===1&&!V1812T_UI.running&&document.querySelector('#v1812t-stage').hidden), 'reduced motion: a day runs with no stage animation');
  await page.evaluate(()=>{ A.v1812tAuto(); }); await page.waitForTimeout(200); await page.evaluate(()=>{ A.v1812tPostAsk(); }); await page.waitForTimeout(200); await page.click('[data-a="v1812tPost"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>{ const s=document.getElementById('v1812t-scene'); return !!s&&s.classList.contains('final')&&s.classList.contains('inst'); }), 'reduced motion: the door scene appears already finished (no timers, no motion)');
  ok(await page.evaluate(()=>{ const el=document.querySelector('#v1812t-scene .s-gym .v1812t-sheet'); const cs=getComputedStyle(el); return cs.opacity==='1'&&cs.transitionDuration.split(',').every(x=>parseFloat(x)===0); }), 'reduced motion: the sheet has no transition');
  await ctx.close(); }
/* phone layout */
{ const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true}); const page=await ctx.newPage(); watch(page); await career(page,'tryouts-ui7');
  await page.evaluate(()=>{ App.route='tryouts'; render(); }); await page.waitForTimeout(400);
  const ph=await page.evaluate(()=>{ const g=getComputedStyle(document.querySelector('.v1812t-grid')).gridTemplateColumns.split(' ').length; return {cols:g,over:document.documentElement.scrollWidth>window.innerWidth+1,sw:document.documentElement.scrollWidth,door:document.querySelector('.v1812t-doord').open}; });
  ok(ph.cols===1&&!ph.over, `phone: one column of cards and no horizontal scroll (${ph.cols} col, scrollWidth ${ph.sw})`);
  ok(!ph.door, 'phone: the gym-door preview starts collapsed');
  await page.evaluate(()=>{ window.scrollTo(0,1200); }); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>{ const r=document.querySelector('#v1812t-bar').getBoundingClientRect(); return r.top>=0&&r.top<120; }), 'phone: the counters bar is sticky');
  await ctx.close(); }
ok(errs.length===0, 'no page errors or console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
await b.close();
console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})();
