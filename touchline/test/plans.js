// v18.21 Development Plans + Mentorship Program (src/v17/9m_plans.js, 9m_plans_ui.js, 9m_plans.css).
// Plans: 3 slots per level; the focus redirect raises the chosen skill more; x1.15 for plan players and x0.99 for the rest of a
// full level; target hit = news + one +0.3 reward per season (never past potential); plans end with the regular season with a
// summary; promotion keeps the plan when the new level has a slot, otherwise it ends with a note.
// Mentors: eligibility (Varsity 11-12, 8+ OVR gap, JV/MOD mentee, 3 pairs), mentee x1.08..1.18 in-season and offseason, mentor
// x0.97 in-season, graduation farewell once. CPU parity, the balance table (feature off vs on, same seed, season + rollover),
// old-save migration, determinism, and the UI on desktop and phone (clicks, no sideways scroll, no page errors).
// Screenshots in test/shots/v1821/.
const { chromium, DIST } = require('./_pw');
/* v18.21 merge: the other development features are switched off so this test measures this feature alone (test/devbalance.js covers them together) */
const ISO="V1821D.only=new Set(['v1821p','v1821ps','v1821m','v1821mc']); V1821C.off=V1821T.off=true;";
const fs=require('fs'); const SH='test/shots/v1821/'; fs.mkdirSync(SH,{recursive:true});
const LVLS=['V','JV','MOD']; let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const ctx=await b.newContext({viewport:vw||{width:1440,height:900}}); const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.evaluate(ISO); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Plan Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const go=async(page,r,p)=>{ await page.evaluate(([r,p])=>{ App.route=r; App.params=p||{}; App.modal=null; renderModal(); render(); },[r,p]); await page.waitForTimeout(250); };
  const page=await mk('plans-t1');

  /* ---------- registration ---------- */
  const T=await page.evaluate(()=>({tabs:V1821D.tabs.map(t=>[t.id,t.label,t.order].join(':')),mods:V1821D.mods.map(m=>m.k),foc:V1821D.focus.length,phase:App.C.phase,s:!!App.C.v1821p}));
  ok(T.tabs.includes('plans:Player Plans:20')&&T.tabs.includes('mentors:Mentors:30'), 'hub tabs: Player Plans (order 20) and Mentors (order 30)');
  ok(['v1821p','v1821ps','v1821m','v1821mc'].every(k=>T.mods.includes(k))&&T.foc>=2, 'four growth multipliers and two focus hooks are registered');

  /* ---------- slot limits ---------- */
  const SL=await page.evaluate(()=>{ const C=structuredClone(App.C); const out={};
    for(const l of LVLS){ const cs=v1821pCands(C,l); out[l]=cs.slice(0,4).map(c=>v1821pAdd(C,c.p.id).ok); }
    const any=v1821pCands(C,'V')[0]; out.dup=v1821pAdd(C,v1821pY(C).plans.V[0].pid).ok; out.full=v1821pFull(C,'JV'); return out; });
  ok(LVLS.every(l=>SL[l].join()==='true,true,true,false'), 'three plans per level; the fourth is refused ('+JSON.stringify(SL)+')');
  ok(SL.dup===false&&SL.full, 'a player cannot have two plans; a level with three plans is full');

  /* ---------- multipliers, focus redirect and trade-offs (one matchday on two copies of the same career) ---------- */
  const MX=await page.evaluate(()=>{ const base=App.C; base.phase='regular'; const A=structuredClone(base), B=structuredClone(base); base.phase='preseason';
    const l='JV'; const cs=v1821pCands(A,l); const p0=cs[0].p; const want=p0.pos==='DEF'?'f_pas':'f_def'; const sk=V1821P_SK[want];
    v1821pAdd(A,p0.id,want); v1821pAdd(A,cs[1].p.id); v1821pAdd(A,cs[2].p.id);
    const other=squad(A,A.userSid,l).find(p=>!v1821pAny(A,p.id)&&p.pot-ovr(p)>3);
    const m=v1821mSuggest(A,1)[0]; const mres=v1821mPair(A,m.m.id,m.e.id);
    const snap=(C,id)=>({o:ovr(C.players[id]),s:{...C.players[id].sk}});
    const ids=[p0.id,other.id,m.m.id,m.e.id]; const a0=ids.map(id=>snap(A,id)), b0=ids.map(id=>snap(B,id));
    devTick(A,0.034,new Set()); devTick(B,0.034,new Set());
    const d=(C,s0,id)=>ovr(C.players[id])-s0.o; const r=ids.map((id,i)=>d(A,a0[i],id)/d(B,b0[i],id));
    const mult=v1821dMult(A,A.players[m.e.id],'tick').m; const off=v1821dMult(A,A.players[m.e.id],'off');
    return {r,mult,off:off.m,sha:A.players[p0.id].sk[sk]-a0[0].s[sk],shb:B.players[p0.id].sk[sk]-b0[0].s[sk],foc:v1821dFocus(A,A.players[p0.id],'balanced'),want,mres:mres.ok,
      menteePlan:!!v1821pAny(A,m.e.id),lean:v1821dFocus(A,A.players[m.e.id],'balanced'),leanW:v1821mLean(A.players[m.m.id],A.players[m.e.id]),mentorM:v1821dMult(A,A.players[m.m.id],'tick').m}; });
  ok(Math.abs(MX.r[0]-1.15)<0.02, `plan player grows x${MX.r[0].toFixed(3)} on a matchday (x1.15)`);
  ok(MX.foc===MX.want&&MX.sha>MX.shb*1.5, `the focus redirect sends the growth into ${MX.want}: +${MX.sha.toFixed(3)} vs +${MX.shb.toFixed(3)} without a plan`);
  ok(Math.abs(MX.r[1]-0.99)<0.006, `with all three JV slots used, another JV player grows x${MX.r[1].toFixed(3)} (x0.99)`);
  ok(MX.mres&&Math.abs(MX.r[2]-0.97)<0.01&&Math.abs(MX.mentorM-0.97)<1e-9, `the mentor grows x${MX.r[2].toFixed(3)} in season (x0.97)`);
  ok(MX.mult>=1.08&&MX.mult<=1.18&&(MX.menteePlan||Math.abs(MX.r[3]/MX.mult-1)<0.03), `the mentee's multiplier is x${MX.mult.toFixed(3)} (1.08..1.18) and applies on matchdays (x${MX.r[3].toFixed(3)})`);
  ok(MX.off>1&&MX.off<=MX.mult+1e-9, `the offseason part is x${MX.off.toFixed(3)} (scaled by time paired)`);
  ok(MX.menteePlan||MX.lean===MX.leanW, `a mentee without a plan leans toward his mentor's best skill (${MX.lean})`);

  /* ---------- target hit: reward once, never past potential ---------- */
  const H=await page.evaluate(()=>{ const C=structuredClone(App.C); C.phase='regular'; C.md=2; const out={};
    const cs=v1821pCands(C,'JV'); const p=cs[0].p; const r=v1821pAdd(C,p.id); const x=r.plan; const n0=C.news.length;
    shiftOvr(p,(x.tgt-0.5)-ovr(p)+0.03,'balanced'); const o1=ovr(p); v1821pAfterTick(C); out.hit=x.hitMd!=null; out.bonus=x.bonus; out.d=ovr(p)-o1; out.news=C.news.length-n0; out.txt=C.news[0].text;
    v1821pAfterTick(C); out.news2=C.news.length-n0;
    v1821pRemove(C,p.id); const r2=v1821pAdd(C,p.id); shiftOvr(p,(r2.plan.tgt-0.5)-ovr(p)+0.03,'balanced'); const o2=ovr(p); v1821pAfterTick(C); out.bonus2=r2.plan.bonus; out.d2=ovr(p)-o2; out.hit2=r2.plan.hitMd!=null;
    const q=cs[1].p; q.pot=R(ovr(q))+1; const r3=v1821pAdd(C,q.id); shiftOvr(q,(q.pot-0.1)-ovr(q),'balanced'); v1821pAfterTick(C); out.cap=ovr(q)-q.pot; out.hit3=r3.plan.hitMd!=null; return out; });
  ok(H.hit&&H.bonus===0.3&&Math.abs(H.d-0.3)<0.03&&H.news===1&&/hits his development target/.test(H.txt), `hitting the target: news "${H.txt}" and +0.3 OVR`);
  ok(H.news2===1&&H.hit2&&H.bonus2===0&&Math.abs(H.d2)<0.01, 'the reward is paid once per player per season (a re-added plan earns no second bonus)');
  ok(H.hit3&&H.cap<=0.021, `the reward never lifts a player past his potential (${H.cap.toFixed(3)} vs POT)`);

  /* ---------- promotion keeps or ends the plan ---------- */
  const P=await page.evaluate(()=>{ const C=structuredClone(App.C); const out={};
    const j=v1821pCands(C,'JV').slice(0,2); j.forEach(c=>v1821pAdd(C,c.p.id)); const r=promote(C,j[0].p.id,'V'); out.kept=v1821pY(C).plans.V.some(x=>x.pid===j[0].p.id); out.msg1=r.msg;
    v1821pCands(C,'V').slice(0,2).forEach(c=>v1821pAdd(C,c.p.id)); out.vfull=v1821pY(C).plans.V.length; const r2=promote(C,j[1].p.id,'V');
    out.ended=v1821pY(C).ended.some(x=>x.pid===j[1].p.id&&/no free plan slot/.test(x.why)); out.msg2=r2.msg; out.notes=v1821pY(C).notes.length; out.stillJV=v1821pY(C).plans.JV.some(x=>x.pid===j[1].p.id); return out; });
  ok(P.kept&&/keeps his/.test(P.msg1), `a promoted plan player keeps his plan when the new level has a free slot ("${P.msg1}")`);
  ok(P.vfull===3&&P.ended&&!P.stillJV&&/plan ended/.test(P.msg2)&&P.notes>=2, `otherwise the plan ends with a note ("${P.msg2}")`);

  /* ---------- mentor eligibility ---------- */
  const E=await page.evaluate(()=>{ const C=structuredClone(App.C); const u=C.userSid; const V=squad(C,u,'V'), J=[...squad(C,u,'JV'),...squad(C,u,'MOD')];
    const young=V.find(p=>p.grade<11); const sen=V.filter(p=>p.grade>=11).sort((a,b)=>ovr(b)-ovr(a)); const top=sen[0];
    let cm=null, close=null; for(const m of sen) for(const e of J) if(!close&&ovr(m)-ovr(e)<8){ cm=m; close=e; } const far=J.filter(e=>ovr(top)-ovr(e)>=8);
    const out={young:young?v1821mCan(C,young.id,far[0].id).ok:false,close:close?v1821mCan(C,cm.id,close.id).why:'(none)',vMentee:v1821mCan(C,top.id,sen[1].id).ok};
    const s=v1821mSuggest(C,3); out.pairs=s.map(x=>v1821mPair(C,x.m.id,x.e.id).ok); out.n=s.length;
    const rest=V.filter(p=>p.grade>=11&&!C.v1821m.pairs.some(x=>x.m===p.id)).sort((a,b)=>ovr(b)-ovr(a))[0]; const e4=J.find(e=>rest&&ovr(rest)-ovr(e)>=8&&!C.v1821m.pairs.some(x=>x.e===e.id));
    out.fourth=rest&&e4?v1821mPair(C,rest.id,e4.id).why:'(none)';
    const g=sen.find(m=>J.some(e=>e.pos===m.pos&&ovr(m)-ovr(e)>=8)); const eS=J.find(e=>e.pos===g.pos&&ovr(g)-ovr(e)>=8); const eD=J.find(e=>e.pos!==g.pos&&V1821M_ADJ[g.pos][e.pos]==null&&ovr(g)-ovr(e)>=8);
    out.same=v1821mBoost(C,g,eS).m; out.diff=eD?v1821mBoost(C,g,eD).m:null; out.all=J.flatMap(e=>sen.map(m=>v1821mBoost(C,m,e).m)); return out; });
  ok(E.young===false, 'a Varsity player below 11th grade cannot mentor');
  ok(/at least 8 OVR/.test(E.close), `the mentor must be 8+ OVR above the mentee ("${E.close}")`);
  ok(E.vMentee===false, 'a Varsity player cannot be a mentee');
  ok(E.n===3&&E.pairs.every(Boolean)&&/All 3 mentor pairs/.test(E.fourth), `three suggested pairs pair in one click each; a fourth is refused ("${E.fourth}")`);
  ok(E.all.every(v=>v>=1.08-1e-9&&v<=1.18+1e-9)&&(E.diff==null||E.same>E.diff), `mentee boosts stay within 1.08..1.18; same position beats a different one (${E.same.toFixed(3)} vs ${E.diff&&E.diff.toFixed(3)})`);

  /* ---------- CPU parity picks ---------- */
  const CP=await page.evaluate(()=>{ const C=App.C; const p=v1821pCpu(C), m=v1821mCpu(C); const sids=C.league.filter(s=>s!==C.userSid);
    return {plans:sids.map(s=>Object.keys(p.by[s]||{}).length),lvls:sids.map(s=>LVLS.map(l=>Object.keys(p.by[s]).filter(id=>C.players[id].lvl===l).length).join('')),pairs:sids.map(s=>(m.by[s]||[]).length),
      valid:sids.every(s=>(m.by[s]||[]).every(x=>C.players[x.m].lvl==='V'&&C.players[x.m].grade>=11&&C.players[x.e].lvl!=='V'&&ovr(C.players[x.m])-ovr(C.players[x.e])>=8))}; });
  ok(CP.lvls.every(s=>s==='222'), 'every CPU school runs two implicit plans per level ('+CP.lvls.join(' ')+')');
  ok(CP.pairs.every(n=>n>=1&&n<=2)&&CP.valid, 'every CPU school runs one or two eligible mentor pairs ('+CP.pairs.join(' ')+')');

  /* ---------- UI: Player Plans tab ---------- */
  await go(page,'office');
  const OF=await page.evaluate(()=>{ const b=document.querySelector('.v1817o-items .v1821p-dec'); return b?b.textContent:''; });
  ok(/Set development plans/.test(OF), 'the Overview\'s This week strip asks to set development plans in the preseason');
  await go(page,'dev');
  const OV=await page.evaluate(()=>({sums:[...document.querySelectorAll('.v1821d-sum')].map(x=>x.textContent),bd:[...document.querySelectorAll('.v1821d-tabs button')].map(x=>x.textContent)}));
  ok(OV.sums.some(s=>/No player plans yet/.test(s))&&OV.sums.some(s=>/mentor pairs|Best match/.test(s)), 'the Overview growth card has a chip for each tab');
  ok(OV.bd.some(s=>/Player Plans9/.test(s))&&OV.bd.some(s=>/Mentors\d/.test(s)), 'the tab bar badges free slots in the preseason ('+OV.bd.join(' | ')+')');
  await page.click('.v1821d-tabs [data-k="plans"]'); await page.waitForTimeout(200);
  let U=await page.evaluate(()=>({lv:document.querySelectorAll('.v1821p-lvl').length,empty:document.querySelectorAll('.v1821p-empty').length,add:document.querySelectorAll('[data-a="v1821pAdd"]').length}));
  ok(U.lv===3&&U.empty===9&&U.add===9, 'three level cards with three free slots each, every slot with a suggested player');
  await page.screenshot({path:SH+'plans_empty_desktop.png',fullPage:true});
  const firstAdd=await page.evaluate(()=>document.querySelector('.v1821p-lvl [data-a="v1821pAdd"]').dataset.id);
  await page.click(`[data-a="v1821pAdd"][data-id="${firstAdd}"]`); await page.waitForTimeout(200);
  U=await page.evaluate(id=>({plan:!!v1821pAny(App.C,id),card:!!document.querySelector(`.v1821p-plan[data-pid="${id}"]`),foc:document.querySelectorAll(`.v1821p-plan[data-pid="${id}"] .v1821p-fb`).length}),firstAdd);
  ok(U.plan&&U.card&&U.foc>=3, 'clicking Add creates the plan and draws its card with the focus picker');
  const alt=await page.evaluate(id=>{ const x=v1821pAny(App.C,id); return [...document.querySelectorAll(`.v1821p-plan[data-pid="${id}"] .v1821p-fb`)].map(b=>b.dataset.k).find(k=>k!==x.foc); },firstAdd);
  await page.click(`.v1821p-plan[data-pid="${firstAdd}"] .v1821p-fb[data-k="${alt}"]`); await page.waitForTimeout(150);
  const t0=await page.evaluate(id=>v1821pAny(App.C,id).tgt,firstAdd);
  await page.click(`.v1821p-plan[data-pid="${firstAdd}"] [data-a="v1821pTgt"][data-d="1"]`); await page.waitForTimeout(150);
  U=await page.evaluate(id=>{ const x=v1821pAny(App.C,id); return {foc:x.foc,tgt:x.tgt,on:document.querySelector(`.v1821p-plan[data-pid="${id}"] .v1821p-fb.on`).dataset.k,tv:document.querySelector(`.v1821p-plan[data-pid="${id}"] .v1821p-tv`).textContent}; },firstAdd);
  ok(U.foc===alt&&U.on===alt, 'the focus picker changes the plan focus');
  ok(U.tgt===Math.min(t0+1,U.tgt)&&U.tv==='OVR '+U.tgt&&U.tgt>=t0, `the target stepper raises the target (${t0} → ${U.tgt})`);
  await page.click('[data-a="v1821pPick"][data-l="MOD"]'); await page.waitForTimeout(200);
  const pk=await page.evaluate(()=>({n:document.querySelectorAll('.v1821p-pr').length,id:document.querySelector('.v1821p-pr [data-a="v1821pAdd"]').dataset.id}));
  ok(pk.n>3, `"Choose a player" lists the Modified candidates (${pk.n})`);
  await page.screenshot({path:SH+'plans_pick_desktop.png'});
  await page.click(`.v1821p-pr [data-a="v1821pAdd"][data-id="${pk.id}"]`); await page.waitForTimeout(200);
  ok(await page.evaluate(id=>!!v1821pAny(App.C,id)&&!App.modal,pk.id), 'adding from the list closes it and creates the plan');
  /* fill the rest by the suggestions, then play into the season */
  await page.evaluate(()=>{ const C=App.C; for(const l of LVLS) while(v1821pY(C).plans[l].length<3){ const c=v1821pCands(C,l)[0]; if(!c) break; v1821pAdd(C,c.p.id); } render(); });
  await page.waitForTimeout(150);
  const SC=await page.evaluate(()=>({split:document.querySelectorAll('.v1821p-split').length,txt:(document.querySelector('.v1821p-split')||{}).textContent,bd:(document.querySelector('.v1821d-tabs [data-k="plans"] .v1821d-bd')||{}).textContent||''}));
  ok(SC.split===3&&/−1% growth/.test(SC.txt)&&SC.bd==='', `full levels show the trade-off ("${SC.txt}"); the badge clears`);
  await page.click('.v1821d-tabs [data-k="mentors"]'); await page.waitForTimeout(200);
  U=await page.evaluate(()=>({sug:document.querySelectorAll('.v1821m-sr').length,first:document.querySelector('.v1821m-sr [data-a="v1821mPair"]').dataset.m}));
  ok(U.sug===3, 'the Mentors tab suggests three pairs');
  await page.click(`.v1821m-sr [data-a="v1821mPair"][data-m="${U.first}"]`); await page.waitForTimeout(200);
  U=await page.evaluate(()=>({pairs:App.C.v1821m.pairs.length,cards:document.querySelectorAll('.v1821m-pair').length,fx:(document.querySelector('.v1821m-big')||{}).textContent}));
  ok(U.pairs===1&&U.cards===1&&/^\+1\d%$/.test(U.fx), `one click pairs them; the pair card shows the boost (${U.fx})`);
  /* manual pairing with the two selects */
  const man=await page.evaluate(()=>{ const s=v1821mSuggest(App.C,1)[0]; return s?{m:s.m.id,e:s.e.id}:null; });
  if(man){ await page.selectOption('select[data-k="v1821mM"]',man.m); await page.waitForTimeout(200); await page.selectOption('select[data-k="v1821mE"]',man.e); await page.waitForTimeout(200);
    const chk=await page.evaluate(()=>({t:document.querySelector('.v1821m-chk').textContent,dis:document.querySelector('.v1821m-man [data-a="v1821mPair"]').disabled}));
    ok(/Eligible/.test(chk.t)&&!chk.dis, `manual pairing checks the match ("${chk.t}")`);
    await page.click('.v1821m-man [data-a="v1821mPair"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(()=>App.C.v1821m.pairs.length)===2, 'the manual Pair button pairs them'); }
  else ok(false,'no second suggested pair for the manual test');
  await page.screenshot({path:SH+'mentors_desktop.png',fullPage:true});
  const un=await page.evaluate(()=>App.C.v1821m.pairs[1].m); await page.click(`[data-a="v1821mUnpair"][data-id="${un}"]`); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>App.C.v1821m.pairs.length===1&&App.C.v1821m.hist[0].why==='Unpaired'), 'Unpair ends a pair at any time');
  /* into the season */
  await page.evaluate(()=>{ const C=App.C; let g=0; while(!(C.phase==='regular'&&C.md>=6)&&g++<40){ simRound(C); advance(C); } App.params={dtab:'plans'}; render(); });
  await page.waitForTimeout(250);
  U=await page.evaluate(()=>{ const Y=v1821pY(App.C); const all=LVLS.flatMap(l=>Y.plans[l]); return {n:all.length,h:all.map(x=>x.h.length),st:[...document.querySelectorAll('.v1821p-st')].map(x=>x.textContent),bars:document.querySelectorAll('.v1821p-bar').length,spark:document.querySelectorAll('.v1821p-spark polyline').length,tl:document.querySelectorAll('[data-a="v1821pTgt"]').length}; });
  ok(U.h.every(n=>n>=5)&&U.st.every(s=>/On track|Behind|Target hit/.test(s))&&U.bars===U.n&&U.spark===U.n, `mid-season: each plan has a progress bar, a matchday trend and a status (${U.st.join(', ')})`);
  ok(U.tl===0, 'targets lock once the plan\'s first matchday is played');
  await page.screenshot({path:SH+'plans_mid_desktop.png',fullPage:true});
  const card=await page.evaluate(()=>{ const x=App.C.v1821m.pairs[0]; App.modal={type:'player',id:x.m}; renderModal(); const a=(document.querySelector('.v1821p-cnote.lead')||{}).textContent; App.modal={type:'player',id:x.e}; renderModal(); const b=(document.querySelector('.v1821p-cnotes')||{}).textContent; return {a,b}; });
  ok(/Leadership/.test(card.a)&&/Mentor to/.test(card.a)&&/−3%/.test(card.a), `the mentor's card has a leadership note ("${card.a}")`);
  ok(/Mentored by|Development plan/.test(card.b), 'the mentee\'s card shows his mentor or plan');
  await page.screenshot({path:SH+'player_card_desktop.png'});
  await page.evaluate(()=>{ App.modal=null; renderModal(); });
  /* end of the regular season */
  const END=await page.evaluate(()=>{ const C=App.C; let g=0; while(C.phase==='regular'&&g++<20){ simRound(C); advance(C); } const Y=v1821pY(C);
    const p=C.players[LVLS.flatMap(l=>Y.plans[l])[0].pid]; return {done:Y.done,sum:Y.sum,live:v1821pLive(C),news:C.news.filter(n=>n.v1821p===2).length,m:v1821dMult(C,p,'tick').parts.filter(x=>x.k==='v1821p').length,
      st:LVLS.flatMap(l=>Y.plans[l]).every(x=>x.st==='hit'||x.st==='miss'),edit:v1821pCanEdit(C).ok}; });
  ok(END.done&&END.sum&&END.sum.n>0&&END.st&&END.news===1&&!END.live&&END.m===0&&!END.edit, `plans end with the regular season: summary ${END.sum&&END.sum.hit}/${END.sum&&END.sum.n} hit, one news item, no more boost or new plans`);
  await go(page,'dev',{dtab:'plans'});
  ok(await page.evaluate(()=>!!document.querySelector('.v1821p-sum')&&document.querySelectorAll('.v1821p-sr').length>0), 'the Player Plans tab shows the season summary with hits and misses');
  await page.screenshot({path:SH+'plans_summary_desktop.png',fullPage:true});

  /* ---------- graduation farewell ---------- */
  const F=await page.evaluate(()=>{ const C=App.C; const S=v1821mS(C); S.pairs=[]; const u=C.userSid;
    const m=squad(C,u,'V').filter(p=>p.grade===12).sort((a,b)=>ovr(b)-ovr(a))[0]; const e=[...squad(C,u,'JV'),...squad(C,u,'MOD')].filter(x=>x.grade<=9&&ovr(m)-ovr(x)>=8&&x.pot-ovr(x)>2)[0];
    S.pairs.push({m:m.id,e:e.id,yr:C.year,md0:0}); let g=0; while(C.phase!=='offseason'&&g++<40){ simRound(C); advance(C); }
    const x=S.pairs[0]; const r=rollover(C); const r2=rollover(C);
    return {ok:r.ok,again:r2.ok,fwb:x.fwb,news:C.news.filter(n=>n.v1821m&&/Farewell, mentor/.test(n.text)).map(n=>n.text),pairs:S.pairs.length,hist:S.hist[0],mentee:!!C.players[e.id],gone:!C.players[m.id]}; });
  ok(F.ok&&F.gone&&F.mentee&&F.pairs===0&&F.hist.why==='Mentor graduated', 'a graduating mentor ends the pair');
  ok(F.news.length===1&&/\+0\.4 OVR/.test(F.news[0])&&F.fwb===0.4&&!F.again, `farewell news once with +0.4 for the mentee ("${F.news[0]}")`);
  const NS=await page.evaluate(()=>{ const C=App.C; const Y=v1821pY(C); return {yr:C.year,phase:C.phase,plans:LVLS.map(l=>Y.plans[l].length).join(''),cpu:v1821pCpu(C).yr===C.year&&v1821mCpu(C).yr===C.year,edit:v1821pCanEdit(C).ok,bd:v1821pBadge(C)}; });
  ok(NS.phase==='preseason'&&NS.plans==='000'&&NS.cpu&&NS.edit&&NS.bd===9, 'the new season starts with free plan slots (badge 9) and fresh CPU picks');

  /* ---------- migration of an old save ---------- */
  const MG=await page.evaluate(()=>{ const C=structuredClone(App.C); delete C.v1821p; delete C.v1821m; const M=migrate(C); const errs=[];
    const old=App.C; App.C=M; try{ for(const k of ['plans','mentors','overview']){ App.route='dev'; App.params={dtab:k}; render(); } App.route='office'; App.params={}; render(); }catch(e){ errs.push(e.message); }
    try{ let g=0; while(!(M.phase==='regular'&&M.md>=2)&&g++<10){ simRound(M); advance(M); } }catch(e){ errs.push(e.message); }
    App.C=old; render(); return {errs,cpu:!!(M.v1821p&&M.v1821p.cpu.yr===M.year)}; });
  ok(MG.errs.length===0&&MG.cpu, 'an old save without plan or mentor state renders both tabs and plays on (state created lazily)');

  /* ---------- balance: same seed, a season plus rollover, feature off vs on ---------- */
  const season=async(seed,use)=>{ const pg=await mk(seed); const r=await pg.evaluate(use=>{ const C=App.C; V1821D.skip=use?null:new Set(['v1821p','v1821ps','v1821m','v1821mc']); /* the other v18.21 features stay on: this isolates plans and mentors */ const u=C.userSid;
      if(use){ for(const l of LVLS) for(const c of v1821pCands(C,l).slice(0,3)) v1821pAdd(C,c.p.id); for(const s of v1821mSuggest(C,3)) v1821mPair(C,s.m.id,s.e.id); }
      const s0={}; for(const id in C.players){ const p=C.players[id]; const sc=C.schools[p.sid]; if(sc&&!sc.ext&&C.league.includes(p.sid)) s0[id]=ovr(p); }
      let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); }
      const lv={}; for(const id in s0) if(C.players[id]) lv[id]=[C.players[id].sid===u?'u':'c',C.players[id].lvl];
      const end={}; const _g=gradOutcome, _h=hofInduct; gradOutcome=function(r,p){ end[p.id]=ovr(p); return _g.apply(this,arguments); }; hofInduct=function(C2){ for(const id in s0) if(C2.players[id]&&end[id]==null) end[id]=ovr(C2.players[id]); return _h.apply(this,arguments); };
      try{ rollover(C); }finally{ gradOutcome=_g; hofInduct=_h; }
      const agg={}; for(const id in lv){ if(end[id]==null) continue; const k=lv[id].join(':'); const a=agg[k]||(agg[k]={s:0,n:0}); a.s+=end[id]-s0[id]; a.n++; }
      const out={}; for(const k in agg) out[k]=agg[k].s/agg[k].n;
      const h=Object.keys(C.players).sort().map(id=>id+Object.values(C.players[id].sk).map(v=>v.toFixed(4)).join(',')).join('|')+JSON.stringify(C.v1821p&&C.v1821p.yr)+JSON.stringify(C.v1821m&&C.v1821m.pairs);
      V1821D.skip=null; return {g:out,h:h.length+':'+[...h].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7)}; },use); await pg.context().close(); return r; };
  const rows=[]; let worstU=0, worstC=0;
  for(const seed of ['plans-bal-1','plans-bal-2']){ const A=await season(seed,false), B=await season(seed,true);
    for(const l of LVLS){ const ua=A.g['u:'+l], ub=B.g['u:'+l], ca=A.g['c:'+l], cb=B.g['c:'+l]; rows.push(`${seed} ${l.padEnd(3)} | you ${ua.toFixed(2)} → ${ub.toFixed(2)} (${((ub/ua-1)*100).toFixed(1)}%) | CPU ${ca.toFixed(2)} → ${cb.toFixed(2)} (${((cb/ca-1)*100).toFixed(1)}%)`);
      worstU=Math.max(worstU,ub/ua-1); worstC=Math.max(worstC,Math.abs(cb/ca-1)); }
    if(seed==='plans-bal-1'){ const B2=await season(seed,true); ok(B.h===B2.h, 'deterministic: the same seed and the same choices give identical players, plans and pairs'); } }
  console.log('Balance (per-player growth over a season + offseason, feature off → on):\n  '+rows.join('\n  '));
  ok(worstU<=0.08, `your school gains at most +8% at any level (worst +${(worstU*100).toFixed(1)}%)`);
  ok(worstC<0.03, `CPU growth changes by less than 3% (worst ${(worstC*100).toFixed(1)}%)`);

  /* ---------- phone + another theme ---------- */
  const ph=await mk('plans-t1',{width:390,height:844});
  await ph.evaluate(()=>{ const C=App.C; for(const l of LVLS) for(const c of v1821pCands(C,l).slice(0,2)) v1821pAdd(C,c.p.id); for(const s of v1821mSuggest(C,2)) v1821mPair(C,s.m.id,s.e.id); let g=0; while(!(C.phase==='regular'&&C.md>=4)&&g++<40){ simRound(C); advance(C); } });
  const sw=[]; for(const [k,f] of [['plans','plans_phone'],['mentors','mentors_phone'],['overview','overview_phone']]){ await go(ph,'dev',{dtab:k}); sw.push(await ph.evaluate(()=>document.documentElement.scrollWidth)); await ph.screenshot({path:SH+f+'.png',fullPage:true}); }
  await ph.evaluate(()=>{ App.modal={type:'v1821pPick',lvl:'JV'}; renderModal(); }); await ph.waitForTimeout(200); sw.push(await ph.evaluate(()=>document.documentElement.scrollWidth)); await ph.screenshot({path:SH+'pick_phone.png'});
  ok(sw.every(w=>w<=390), 'phone (390 px): no sideways scroll on Player Plans, Mentors, Overview or the picker ('+sw.join(',')+')');
  await ph.evaluate(()=>{ App.modal=null; renderModal(); PREFS.theme={preset:'gold',custom:null}; applyTheme(); }); await go(ph,'dev',{dtab:'plans'}); await ph.screenshot({path:SH+'plans_phone_gold.png',fullPage:true});
  await go(ph,'dev',{dtab:'mentors'}); await ph.screenshot({path:SH+'mentors_phone_gold.png',fullPage:true});
  await page.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); }); await go(page,'dev',{dtab:'plans'}); await page.evaluate(()=>{ const C=App.C; for(const l of LVLS) for(const c of v1821pCands(C,l).slice(0,2)) v1821pAdd(C,c.p.id); render(); });
  await page.screenshot({path:SH+'plans_desktop_gold.png',fullPage:true});
  const kb=await page.evaluate(()=>[...document.querySelectorAll('.v1821p-fb,[data-a="v1821pAdd"],[data-a="v1821pTgt"],[data-a="v1821pRm"]')].every(b=>b.tagName==='BUTTON'&&b.tabIndex>=0));
  ok(kb, 'every plan control is a keyboard-focusable button');

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAIL`:'ALL PASS'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
