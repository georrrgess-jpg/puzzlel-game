// v18.19 Pick'em Pool (src/v17/9i_pickem.js + .css).
// Picks open for Matchday 1 in the preseason; clicking Home / Draw / Away selects (amber) and clears; the exact score
// steppers set the score and the matching pick; a pick that contradicts the score clears it; the Overview's This week
// strip and the nav badge ask for picks; "Lock in my picks" confirms and freezes; the round freezes at its first kick-off
// (odds, crowd and pundit picks) and is scored exactly once when it closes, by the published rules (checked against an
// independent recount); no picks = 0 points; pundits are deterministic; results are identical with the feature switched
// off; the season ends with a Newswire story; winning gives +1 prestige and a pennant; old saves migrate; phone layout has
// no sideways scroll; screenshots in test/shots/v1819/.
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SH='test/shots/v1819/'; fs.mkdirSync(SH,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Pick Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const go=async(page,r,p)=>{ await page.evaluate(([r,p])=>{ App.route=r; App.params=p||{}; App.modal=null; renderModal(); render(); },[r,p]); await page.waitForTimeout(250); };
  const page=await mk('pick-t1');

  /* ---------- menu, page, open round ---------- */
  const M=await page.evaluate(()=>{ const g=TOPNAV.find(t=>t[0]==='league'); return {inLeague:g&&g[3].includes('pickem'),title:TITLES.pickem,view:typeof VIEWS.pickem,phase:App.C.phase,open:v1819pOpen(App.C)}; });
  ok(M.inLeague&&M.title==="Pick'em Pool"&&M.view==='function', 'the Pick\'em Pool is a page in the Competition menu');
  ok(M.phase==='preseason'&&M.open===0, 'picks for Matchday 1 are open during the preseason');
  await go(page,'office');
  const OV=await page.evaluate(()=>{ const b=document.querySelector('.v1817o-items .v1819p-dec'); return b?b.textContent:''; });
  ok(/Make your picks for Matchday 1/.test(OV)&&/0 of 4 picked/.test(OV), 'the Overview\'s This week strip says "Make your picks for Matchday 1"');
  const NB=await page.evaluate(()=>navBadges(App.C).pickem); ok(NB==='4', `the menu badge counts unpicked games (${NB})`);
  await go(page,'pickem'); await page.waitForTimeout(1500);
  const P0=await page.evaluate(()=>{ const g=[...document.querySelectorAll('.v1819p-game')]; const pct=g.map(x=>[...x.querySelectorAll('.v1819p-opt b')].map(b=>parseInt(b.textContent)));
    return {n:g.length,pct,sum:pct.every(a=>a.length===3&&a.reduce((s,v)=>s+v,0)===100),mine:document.querySelectorAll('.v1819p-game.mine').length,exact:document.querySelectorAll('.v1819p-exact').length,
      pill:(document.querySelector('.v1819p-pill')||{}).textContent,title:(document.querySelector('.v1819p-title')||{}).textContent,chips:document.querySelectorAll('.v1819p-chips span').length,
      lb:document.querySelectorAll('.v1819p-lb li').length,you:document.querySelectorAll('.v1819p-lb li.you').length,bars:document.querySelectorAll('.v1819p-bar').length,lockDis:document.querySelector('.v1819p-lockbtn').disabled}; });
  ok(P0.n===4&&P0.mine===1&&P0.exact===1, 'four Varsity game cards; your game is marked and carries the exact-score pick');
  ok(P0.sum, 'every game shows the crowd % for Home / Draw / Away, adding to 100 ('+JSON.stringify(P0.pct)+')');
  ok(/Round 1 picks/i.test(P0.title)&&/Locks (Tue|Fri|Mon|Wed|Thu|Sat|Sun) \d+:\d\d [AP]M/.test(P0.pill), `heading "${P0.title}" and the pill "${P0.pill}"`);
  ok(P0.chips===5&&P0.lb===6&&P0.you===1&&P0.bars===14, 'scoring chips, a leaderboard of you + 5 pundits, and 14 bars');
  ok(P0.lockDis, '"Lock in my picks" is disabled until there is a pick');
  await page.screenshot({path:SH+'pickem_open_desktop.png',fullPage:true});

  /* ---------- picking ---------- */
  const ids=await page.evaluate(()=>v1819pFx(App.C,App.C.year,0));
  await page.click(`.v1819p-opt[data-f="${ids[0]}"][data-k="h"]`); await page.waitForTimeout(150);
  let S=await page.evaluate(id=>({u:v1819pRound(App.C,App.C.year,0).u[id],on:document.querySelector(`.v1819p-opt.on[data-f="${id}"]`)?.dataset.k,bg:getComputedStyle(document.querySelector(`.v1819p-opt.on[data-f="${id}"]`)).backgroundColor,acc:getComputedStyle(document.body).getPropertyValue('--accent')}),ids[0]);
  ok(S.u==='h'&&S.on==='h', 'clicking Home picks it and highlights it');
  await page.click(`.v1819p-opt[data-f="${ids[0]}"][data-k="d"]`); await page.waitForTimeout(150);
  S=await page.evaluate(id=>({u:v1819pRound(App.C,App.C.year,0).u[id],n:document.querySelectorAll(`.v1819p-opt.on[data-f="${id}"]`).length,worth:document.querySelector(`.v1819p-game[data-f="${id}"] .v1819p-worth`).textContent}),ids[0]);
  ok(S.u==='d'&&S.n===1&&/Draw call: \+4 if right/.test(S.worth), 'switching to Draw moves the highlight; the card says "Draw call: +4 if right"');
  await page.click(`.v1819p-opt[data-f="${ids[0]}"][data-k="d"]`); await page.waitForTimeout(150);
  S=await page.evaluate(id=>v1819pRound(App.C,App.C.year,0).u[id]||null,ids[0]); ok(S===null, 'clicking the picked option again clears it');
  const dogInfo=await page.evaluate(()=>{ const C=App.C; const out=[]; for(const id of v1819pFx(C,C.year,0)){ const p=v1819pProbs(C,id,false); out.push({id,dog:v1819pDog(p)}); } return out; });
  const dg=dogInfo.find(x=>x.dog);
  if(dg){ await page.click(`.v1819p-opt[data-f="${dg.id}"][data-k="${dg.dog}"]`); await page.waitForTimeout(150);
    const w=await page.evaluate(id=>document.querySelector(`.v1819p-game[data-f="${id}"] .v1819p-worth`).textContent,dg.id); ok(/Upset call: \+3 and \+2 bonus if right/.test(w), 'picking the underdog shows "Upset call"'); }
  else ok(true,'(no underdog in this round to check the upset note)');
  /* exact score */
  const xf=await page.evaluate(()=>{ const C=App.C; return v1819pXf(C,v1819pFx(C,C.year,0)); });
  await page.click('[data-a="v1819pXs"][data-s="h"][data-d="1"]'); await page.waitForTimeout(120);
  await page.click('[data-a="v1819pXs"][data-s="h"][data-d="1"]'); await page.waitForTimeout(120);
  await page.click('[data-a="v1819pXs"][data-s="a"][data-d="1"]'); await page.waitForTimeout(120);
  S=await page.evaluate(xf=>{ const R=v1819pRound(App.C,App.C.year,0); return {xs:R.xs,u:R.u[xf],txt:[...document.querySelectorAll('.v1819p-step b')].map(b=>b.textContent).join('-')}; },xf);
  ok(S.xs&&S.xs.h===2&&S.xs.a===1&&S.u==='h'&&S.txt==='2-1', `the exact-score steppers set 2–1 and the pick follows (Home)`);
  await page.click(`.v1819p-opt[data-f="${xf}"][data-k="a"]`); await page.waitForTimeout(150);
  S=await page.evaluate(xf=>{ const R=v1819pRound(App.C,App.C.year,0); return {xs:R.xs,u:R.u[xf]}; },xf);
  ok(S.xs===null&&S.u==='a', 'picking Away clears the 2–1 score that contradicts it');
  await page.click('[data-a="v1819pXs"][data-s="a"][data-d="1"]'); await page.waitForTimeout(120);
  await page.click('[data-a="v1819pXs"][data-s="a"][data-d="1"]'); await page.waitForTimeout(120);
  await page.click('[data-a="v1819pXs"][data-s="h"][data-d="1"]'); await page.waitForTimeout(120);
  await page.click('[data-a="v1819pXs"][data-s="a"][data-d="-1"]'); await page.waitForTimeout(120);
  S=await page.evaluate(xf=>{ const R=v1819pRound(App.C,App.C.year,0); return {xs:R.xs,u:R.u[xf]}; },xf);
  ok(S.xs&&S.xs.h===1&&S.xs.a===1&&S.u==='d', 'stepping to 1–1 turns the pick into a Draw');
  for(const id of ids){ const has=await page.evaluate(id=>!!v1819pRound(App.C,App.C.year,0).u[id],id); if(!has){ await page.click(`.v1819p-opt[data-f="${id}"][data-k="h"]`); await page.waitForTimeout(120); } }
  const all=await page.evaluate(()=>v1819pPicked(App.C,App.C.year,0)); ok(all===4, 'all four games picked');
  await go(page,'office');
  const OV2=await page.evaluate(()=>{ const b=document.querySelector('.v1819p-dec'); return b?b.textContent:''; }); ok(/Picks in for Matchday 1/.test(OV2)&&/4 of 4/.test(OV2), 'the Overview item reads "Picks in" once all four are picked');
  await go(page,'pickem'); await page.waitForTimeout(400);
  await page.screenshot({path:SH+'pickem_picked_desktop.png',fullPage:true});
  const before=await page.evaluate(()=>JSON.stringify(v1819pRound(App.C,App.C.year,0).u));

  /* ---------- the lock modal ---------- */
  await page.click('[data-a="v1819pLock"]'); await page.waitForTimeout(250);
  const LM=await page.evaluate(()=>({m:!!document.querySelector('.modal .v1819p-ml'),items:document.querySelectorAll('.v1819p-ml li').length}));
  ok(LM.m&&LM.items===4, 'Lock in my picks asks for confirmation and lists the four picks');
  await page.screenshot({path:SH+'pickem_lock_modal.png'});
  await page.click('.modal [data-a="closeModal"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>!v1819pRound(App.C,App.C.year,0).lk), '"Keep editing" leaves the picks open');

  /* ---------- play the preseason, then round 1 ---------- */
  await page.evaluate(()=>{ const C=App.C; let g=0; while(C.phase==='preseason'&&g++<5){ simRound(C); advance(C); } App.route='pickem'; render(); });
  const st=await page.evaluate(()=>({ph:App.C.phase,md:App.C.md,fz:!!v1819pRound(App.C,App.C.year,0).fz,u:JSON.stringify(v1819pRound(App.C,App.C.year,0).u)}));
  ok(st.ph==='regular'&&st.md===0&&!st.fz&&st.u===before, 'the preseason Cup does not lock or touch league picks');
  await page.click('[data-a="v1819pLock"]'); await page.waitForTimeout(200); await page.click('[data-a="v1819pLockYes"]'); await page.waitForTimeout(250);
  const LK=await page.evaluate(()=>({lk:v1819pRound(App.C,App.C.year,0).lk,dis:[...document.querySelectorAll('.v1819p-opt')].every(b=>b.disabled),pill:document.querySelector('.v1819p-pill').textContent,btn:!!document.querySelector('[data-a="v1819pLock"]')}));
  ok(LK.lk===1&&LK.dis&&/Locked in/.test(LK.pill)&&!LK.btn, 'confirming locks the picks early: buttons disabled, "Locked in" pill');
  await page.evaluate(()=>{ const id=v1819pFx(App.C,App.C.year,0)[0]; A.v1819pPick({dataset:{f:id,k:'a'}}); });
  ok(await page.evaluate(()=>JSON.stringify(v1819pRound(App.C,App.C.year,0).u))===before, 'a locked pick cannot be changed');
  ok(await page.evaluate(()=>navBadges(App.C).pickem===undefined&&!(App.route='office',render(),document.querySelector('.v1819p-dec'))), 'once locked, the badge and the Overview item go away');
  /* freeze at the first real kick-off */
  const FZ=await page.evaluate(()=>{ const C=App.C; const uf=userFixture(C); const M=startMatch(C,uf.id,{}); const R=v1819pRound(C,C.year,0); const fz=!!R.fz; runToEnd(C,M); finishMatch(C,M); App.route='pickem'; render();
    return {fz,pp:R.fz&&Object.keys(R.fz.pp).length,pub:document.querySelectorAll('.v1819p-pp i').length,live:(document.querySelector('.v1819p-pill')||{}).textContent}; });
  ok(FZ.fz&&FZ.pp===5, 'the round freezes the moment its first game kicks off (odds, crowd and 5 pundit picks)');
  ok(FZ.pub===20&&/under way/.test(FZ.live), 'pundit picks are revealed under each game once the round is under way (20 icons)');
  await page.screenshot({path:SH+'pickem_live_desktop.png',fullPage:true});
  await page.evaluate(()=>{ const C=App.C; simRound(C); advance(C); App.route='pickem'; App.params={}; render(); });
  const SC=await page.evaluate(()=>{ const C=App.C; const R=v1819pRound(C,C.year,0); const fz=R.fz; const W=V1819P.PTS;
    const count=(picks,xs)=>{ let p=0,ok=0; for(const id of fz.fx){ const f=C.fixtures[id]; const o=f.hg>f.ag?'h':f.hg<f.ag?'a':'d'; const k=picks[id];
        if(k===o){ ok++; p+=o==='d'?W.draw:W.win+(fz.dogs[id]===k?W.upset:0); } if(id===fz.xf&&xs&&xs.h===f.hg&&xs.a===f.ag) p+=W.exact; } if(ok===fz.fx.length) p+=W.perfect; return p; };
    const exp={u:count(R.u,R.xs)}; for(const P of V1819P_PUNDITS) exp[P.id]=count(fz.pp[P.id].k,fz.pp[P.id].xs);
    const got={u:R.res&&R.res.u.pts}; for(const P of V1819P_PUNDITS) got[P.id]=R.res&&R.res.p[P.id].pts;
    const res1=JSON.stringify(R.res); v1819pSettle(C); v1819pSettle(C); advance(C);
    const board=v1819pBoard(C); return {exp,got,md:C.md,same:JSON.stringify(R.res)===res1,you:board.find(r=>r.you).pts,lb:document.querySelector('.v1819p-lb li.you .v1819p-pts b').textContent,
      past:document.querySelectorAll('.v1819p-rrow').length,bar:document.querySelector('.v1819p-bar .v1819p-bv').textContent,gap:document.querySelector('.v1819p-gap').textContent,open:document.querySelector('.v1819p-title').textContent}; });
  ok(SC.md===1&&JSON.stringify(SC.exp)===JSON.stringify(SC.got), 'round 1 is scored when it closes, matching an independent recount: '+JSON.stringify(SC.got));
  ok(SC.same, 'scoring happens exactly once (settling again changes nothing)');
  ok(+SC.lb===SC.you&&+SC.bar===SC.exp.u&&SC.past===4, 'leaderboard, bar chart and the Past rounds list show the round');
  ok(/You (are \d+ points? behind|lead|are level)/.test(SC.gap), `leaderboard line: "${SC.gap}"`);
  ok(/Round 2 picks/i.test(SC.open), 'Round 2 picks open next');

  /* ---------- skip two rounds (no picks), then pick the rest ---------- */
  const SK=await page.evaluate(()=>{ const C=App.C; for(let i=0;i<2;i++){ simRound(C); advance(C); } const r1=v1819pRound(C,C.year,1).res, r2=v1819pRound(C,C.year,2).res; return {a:r1&&r1.u.pts,b:r2&&r2.u.pts,ok:r1&&r1.u.ok}; });
  ok(SK.a===0&&SK.b===0&&SK.ok===0, 'rounds without picks score 0 and nothing breaks');
  const RS=await page.evaluate(()=>{ const C=App.C; let guard=0; while(C.phase==='regular'&&guard++<20){ const rd=v1819pOpen(C); const fx=v1819pFx(C,C.year,rd); const R=v1819pRound(C,C.year,rd);
      fx.forEach((id,j)=>{ const p=v1819pProbs(C,id,true); R.u[id]=p.h>=p.a?'h':'a'; }); simRound(C); advance(C); }
    const Y=v1819pYear(C,C.year); const scored=Object.values(Y.r).filter(R=>R.res).length; const news=C.news.filter(n=>/Pick'em Pool/.test(n.text)).map(n=>n.text);
    App.route='pickem'; App.params={}; render(); return {ph:C.phase,scored,done:Y.done,win:Y.win,news,closed:document.querySelector('.v1819p-title').textContent,best:(document.querySelector('.v1819p-best')||{}).textContent,bestBar:document.querySelectorAll('.v1819p-bar.best').length}; });
  ok(RS.ph==='sectionals'&&RS.scored===14&&RS.done, `all 14 rounds are scored by the end of the regular season`);
  ok(RS.news.length===1, 'the Newswire announces the pool winner: '+RS.news[0]);
  ok(/closed/i.test(RS.closed)&&/Best: \d+/.test(RS.best)&&RS.bestBar===1, 'the round card says the pool is closed; the chart shows "'+RS.best+'" with the best round highlighted');
  await page.evaluate(()=>{ window.scrollTo(0,0); }); await page.screenshot({path:SH+'pickem_season_desktop.png',fullPage:true});
  await page.click('.v1819p-rsel button:first-child'); await page.waitForTimeout(200);
  const PR=await page.evaluate(()=>({p:App.params.pr,sum:document.querySelector('.v1819p-rsum').textContent}));
  ok(String(PR.p)==='0'&&/Round 1:/.test(PR.sum), 'Past rounds: R1 shows what you picked, the results and the points');

  /* ---------- the reward ---------- */
  const RW=await page.evaluate(()=>{ const C=App.C; const yr=C.year+50; const P=v1819pS(C); const s=C.schools[C.userSid]; const pre=s.prestige;
    P.yrs[yr]={from:0,r:{},done:false,win:null}; for(let rd=0;rd<14;rd++){ const sc=(pts)=>({pts,ok:2,perfect:false,bd:{}}); const p={}; for(const x of V1819P_PUNDITS) p[x.id]=sc(1); P.yrs[yr].r[rd]={u:{},xs:null,lk:0,fz:{fx:[]},res:{u:sc(3),p}}; }
    v1819pSeasonEnd(C,yr); const t1=P.titles.includes(yr), pr1=s.prestige; v1819pSeasonEnd(C,yr); const pr2=s.prestige;
    const news=C.news[0].text; const st=v1819pStreak(P.yrs[yr],'you');
    delete P.yrs[yr]; P.titles=P.titles.filter(y=>y!==yr); s.prestige=pre; return {t1,d:pr1-pre,twice:pr2-pre,news,st}; });
  ok(RW.t1&&RW.d===1&&RW.twice===1&&/wins the Courier Pick'em Pool/.test(RW.news)&&/prestige \+1/.test(RW.news), 'winning the pool: a pennant, +1 prestige (once) and a Newswire story');
  ok(RW.st===14, 'the 🔥 streak counts rounds in a row with 2+ right calls');

  /* ---------- saves ---------- */
  const SV=await page.evaluate(()=>{ const C=App.C; const M=migrate(JSON.parse(JSON.stringify(careerForSave(C)))); const keep=M.pick&&M.pick.yrs[C.year]&&Object.keys(M.pick.yrs[C.year].r).length===14;
    const old=JSON.parse(JSON.stringify(careerForSave(C))); delete old.pick; const O=migrate(old); const bad=JSON.parse(JSON.stringify(careerForSave(C))); bad.pick={v:0}; const B=migrate(bad);
    return {keep,old:!O.pick,bad:!B.pick}; });
  ok(SV.keep&&SV.old&&SV.bad, 'picks survive a save and reload; an old save without the pool migrates cleanly');

  /* ---------- determinism and results ---------- */
  const run=async(off)=>{ const p=await mk('pick-det'); return p.evaluate(off=>{ V1819P.off=off; const C=App.C; let g=0; while(C.phase!=='sectionals'&&g++<30){ simRound(C); advance(C); }
      const res=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.st==='d').map(f=>f.id+':'+f.hg+'-'+f.ag).sort().join(',');
      const pp=off?null:JSON.stringify(Object.values(v1819pYear(C,C.year).r).map(R=>R.fz&&R.fz.pp)); V1819P.off=false; return {res,pp}; },off); };
  const A1=await run(false), A2=await run(true), A3=await run(false);
  ok(A1.res===A2.res&&A1.res.length>100, 'every match result is identical with the Pick\'em Pool switched off');
  ok(A1.pp===A3.pp&&A1.pp.length>100, 'pundit picks are deterministic (same seed, same picks)');

  /* ---------- phone ---------- */
  const ph=await mk('pick-t1',{width:390,height:844});
  await ph.evaluate(()=>{ const C=App.C; let g=0; while(C.phase==='preseason'&&g++<5){ simRound(C); advance(C); } for(let i=0;i<3;i++){ const rd=v1819pOpen(C); const fx=v1819pFx(C,C.year,rd); const R=v1819pRound(C,C.year,rd); fx.forEach((id,j)=>R.u[id]=['h','d','a'][(i+j)%3]); simRound(C); advance(C); }
    const rd=v1819pOpen(C); const fx=v1819pFx(C,C.year,rd); const R=v1819pRound(C,C.year,rd); R.u[fx[1]]='a'; App.route='pickem'; App.params={}; render(); });
  await ph.waitForTimeout(1600);
  const PH=await ph.evaluate(()=>{ const g=[...document.querySelectorAll('.v1819p-game')].map(e=>e.getBoundingClientRect()); return {sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,one:g.every(r=>Math.abs(r.left-g[0].left)<2),order:document.querySelector('.v1819p-board').getBoundingClientRect().top<document.querySelector('.v1819p-res').getBoundingClientRect().top}; });
  ok(PH.sw<=PH.cw&&PH.one, `phone: single-column cards, no sideways scroll (${PH.sw}/${PH.cw})`);
  ok(PH.order, 'phone: the leaderboard comes right after the picks');
  await ph.screenshot({path:SH+'pickem_phone.png',fullPage:true});
  await ph.screenshot({path:SH+'pickem_phone_top.png'});
  await ph.evaluate(()=>{ App.route='office'; render(); }); await ph.waitForTimeout(300);
  const wk=await ph.$('.v1817o-week'); if(wk) await wk.screenshot({path:SH+'pickem_overview_phone.png'});
  const pd=await mk('pick-t1'); await pd.evaluate(()=>{ App.route='office'; render(); }); await pd.waitForTimeout(400); const wk2=await pd.$('.v1817o-week'); if(wk2) await wk2.screenshot({path:SH+'pickem_overview_desktop.png'});
  for(const th of ['gold','crimson']){ await pd.evaluate(th=>{ const C=App.C; let g=0; while(C.phase==='preseason'&&g++<5){ simRound(C); advance(C); } A.preset({dataset:{k:th}}); App.route='pickem'; render(); window.scrollTo(0,0); },th); await pd.waitForTimeout(1500); await pd.screenshot({path:SH+`pickem_${th}.png`}); }
  await pd.evaluate(()=>A.preset({dataset:{k:'night'}}));

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
