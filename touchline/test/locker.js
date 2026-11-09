// v18.23 Locker Room & Personalities (src/v17/9q_locker*.js): stable seeded personalities, growth multipliers, chemistry and match
// form, weekly situations and their effects, quotes, parity, old saves, determinism, the page on desktop and phone.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Locker Coach'); await page.fill('#nc-seed',seed); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const p=await mk('locker-1');
  const A=await p.evaluate(()=>{ const C=App.C; const u=C.userSid; const o={}; const all=Object.values(C.players).filter(x=>C.schools[x.sid]&&!C.schools[x.sid].ext);
    const cnt={}; for(const x of all){ const k=v1822Pers(C,x).k; cnt[k]=(cnt[k]||0)+1; } o.cnt=cnt; o.kinds=Object.keys(cnt).length;
    V1822.cache.clear(); o.stable=all.slice(0,50).every(x=>v1822Pers(C,x).k===v1822Pers(C,x).k)&&(()=>{ const a=all.slice(0,50).map(x=>v1822Pers(C,x).k).join(); V1822.cache.clear(); return a===all.slice(0,50).map(x=>v1822Pers(C,x).k).join(); })();
    const gm=all.reduce((a,x)=>a+v1822Pers(C,x).g,0)/all.length; o.gm=gm; const capS=all.filter(x=>x.grade>=11), capY=all.filter(x=>x.grade<=9); o.capOld=capS.filter(x=>v1822Pers(C,x).k==='cap').length/capS.length; o.capYoung=capY.filter(x=>v1822Pers(C,x).k==='cap').length/Math.max(1,capY.length);
    const gr=all.find(x=>v1822Pers(C,x).k==='grind'&&x.sid===u&&x.pot>ovr(x)); o.grMult=gr?v1821dMult(C,gr,'tick').parts.find(q=>q.k==='pers').m:null;
    const cpu=C.league.filter(s=>s!==u); o.cpuChem=cpu.flatMap(s=>LVLS.map(l=>v1822Chem(C,s,l))); o.cpuMean=o.cpuChem.reduce((a,b)=>a+b,0)/o.cpuChem.length;
    const f=Object.values(C.fixtures).find(x=>x.comp==='pre'&&x.lvl==='V'); const M=startMatch(C,f.id,{fast:true}); const side=M.sides.findIndex(s=>s.sid===u); const ch=v1822Chem(C,u,'V'); o.form=[ch,M.sides[side].v1821dForm||0]; return o; });
  console.log(JSON.stringify(A));
  ok(A.kinds===8&&A.stable, 'every player has one of eight personalities, stable for the career');
  ok(Math.abs(A.gm-1)<0.01, `personalities are growth-neutral on average (x${A.gm.toFixed(4)})`);
  ok(A.capOld>A.capYoung, `captains are mostly upperclassmen (${(A.capOld*100).toFixed(0)}% of 11th-12th graders vs ${(A.capYoung*100).toFixed(0)}% of 9th and younger)`);
  ok(A.grMult===1.05, 'a Gym Rat grows 5% faster');
  ok(Math.abs(A.cpuMean)<1.5&&A.cpuChem.every(c=>c>=-6&&c<=6), `league chemistry is near neutral on average (${A.cpuMean.toFixed(2)}) and capped at ±6`);
  ok(Math.abs(A.form[1]-A.form[0]*0.0012)<1e-9||(A.form[0]===0&&A.form[1]===0), `chemistry reaches the match (chem ${A.form[0]} → form ${A.form[1]})`);
  /* a season: situations, choices, quotes */
  const B=await p.evaluate(()=>{ const C=App.C; const u=C.userSid; const o={ev:0,chose:0,news:0}; let moodSeen=false, pgSeen=false, g=0;
    while(C.phase!=='sectionals'&&g++<40){ const e=v1822Pending(C); if(e){ o.ev++; const S=C.lr; const i=o.ev%2; const E=V1822_EV[e.k]; const before=v1822Chem(C,u,e.lvl); const r=v1822Choose(C,i); if(r.ok) o.chose++; const c=E.ch[i]; if(c.mood&&v1822Mood(C,e.lvl)!==0) moodSeen=true; if(c.pm){ const p=C.players[e.pid]; const pt=v1821dMult(C,p,'tick').parts.find(q=>q.k==='lr'); if(pt&&pt.m===c.pm) pgSeen=true; } o.again=!v1822Choose(C,0).ok; }
      simRound(C); advance(C); }
    o.moodSeen=moodSeen; o.pgSeen=pgSeen; o.quotes=C.news.filter(n=>/^“/.test(n.text)).length; o.calls=C.news.filter(n=>/^Locker room:/.test(n.text)).length; o.log=C.lr.log.length;
    o.expired=(()=>{ C.lr.mood.V=[{d:2,until:C.md-1}]; return v1822Mood(C,'V')===0; })(); return o; });
  console.log(JSON.stringify(B));
  ok(B.ev>=2&&B.ev<=10&&B.chose===B.ev&&B.again, `a season brings ${B.ev} locker-room situations; each is decided once`);
  const PG=await p.evaluate(()=>{ const C=newCareer({slot:3,coachName:'P',seed:5150,now:0}); App.C=C; let g=0; while(C.phase!=='regular'&&g++<5){ simRound(C); advance(C); } const pl=squad(C,C.userSid,'JV').find(x=>x.pot>ovr(x)+2); v1822S(C).ev={yr:C.year,md:C.md,k:'grind',pid:pl.id,lvl:pl.lvl,done:false}; const r=v1822Choose(C,0); const pt=v1821dMult(C,pl,'tick').parts.find(q=>q.k==='lr'); simRound(C); advance(C); simRound(C); advance(C); simRound(C); advance(C); const after=v1821dMult(C,pl,'tick').parts.find(q=>q.k==='lr'); return {ok:r.ok,m:pt&&pt.m,after:!!after}; });
  ok(B.moodSeen&&PG.ok&&PG.m===1.25&&!PG.after, 'choices change squad mood, or one player\'s growth (Open the gym: x1.25 for 3 weeks, then it ends)');
  ok(B.quotes>=2&&B.calls===B.chose&&B.log===Math.min(12,B.chose)&&B.expired, `${B.quotes} postgame quotes and ${B.calls} locker-room calls reach the News; mood expires`);
  /* ignored situation passes */
  const Cx=await p.evaluate(()=>{ const C=newCareer({slot:2,coachName:'X',seed:4242,now:0}); App.C=C; let g=0, seen=null; while(C.phase!=='sectionals'&&g++<40){ const e=v1822Pending(C); if(e&&!seen){ seen=e.md; } simRound(C); advance(C); if(seen!=null&&C.md>seen) break; } return {seen,pending:!!(v1822Pending(C)&&v1822Pending(C).md===seen),mood:LVLS.reduce((a,l)=>a+v1822Mood(C,l),0)}; });
  ok(Cx.seen!=null&&!Cx.pending&&Cx.mood===0, 'an ignored situation passes after the next game with no effect');
  /* old save + determinism */
  const D=await p.evaluate(()=>{ const C=App.C; const raw=JSON.parse(JSON.stringify(careerForSave(C))); delete raw.lr; const M=migrate(raw); const s1=v1822S(M); const bad=JSON.parse(JSON.stringify(careerForSave(C))); bad.lr={mood:'x',pg:3,log:null}; const B2=migrate(bad); const s2=v1822S(B2); return {a:Array.isArray(s1.mood.V)&&!!v1822Pers(M,Object.values(M.players)[0]),b:Array.isArray(s2.mood.JV)&&typeof s2.pg==='object'&&Array.isArray(s2.log)}; });
  ok(D.a&&D.b, 'old saves work (no locker data) and a broken one is repaired');
  const det=await Promise.all([1,2].map(async()=>{ const pg=await b.newPage(); await pg.goto(DIST); const h=await pg.evaluate(()=>{ const C=newCareer({slot:1,coachName:'D',seed:9191,now:0}); App.C=C; let g=0; while(C.phase!=='sectionals'&&g++<40){ if(v1822Pending(C)) v1822Choose(C,0); simRound(C); advance(C); } return Object.values(C.fixtures).filter(f=>f.st==='d').map(f=>f.hg+'-'+f.ag).join(',')+'|'+C.news.length; }); await pg.close(); return h; }));
  ok(det[0]===det[1], 'deterministic: same seed and same calls give the same season');
  await p.close();
  /* UI */
  const u1=await mk('locker-ui'); const U=await u1.evaluate(()=>{ const C=App.C; let g=0; while(!v1822Pending(C)&&g++<20){ simRound(C); advance(C); } App.route='office'; App.modal=null; render(); const o={dec:!!document.querySelector('.v1822-dec'),badge:navBadges(C).locker==='1'};
    App.route='locker'; App.params={}; render(); o.ev=!!document.querySelector('.v1822-ev'); o.meters=document.querySelectorAll('.v1822-chem').length; o.groups=document.querySelectorAll('.v1822-grp').length; return o; });
  await u1.waitForTimeout(500); await u1.screenshot({path:'test/shots/v1821/locker_desktop.png'});
  const U2=await u1.evaluate(()=>{ A.v1822Choose({dataset:{i:'0'}}); const o={gone:!document.querySelector('.v1822-ev'),log:!!document.querySelector('.v1822-log')}; A.v1822Lvl({dataset:{k:'MOD'}}); o.mod=document.querySelectorAll('.v1822-p').length; const pid=squad(App.C,App.C.userSid,'V')[0].id; App.modal={type:'player',id:pid}; renderModal(); o.strip=!!document.querySelector('.v1822-pstrip .v1822-chip'); App.modal=null; renderModal(); App.route='dev'; App.params={}; render(); o.hub=/Personalities:/.test(document.body.textContent); App.params={dtab:'locker'}; render(); o.tab=!!document.querySelector('.v1822-chems'); return o; });
  await u1.evaluate(()=>{ App.route='dev'; App.params={}; render(); const pid=squad(App.C,App.C.userSid,'V')[0].id; App.modal={type:'player',id:pid}; renderModal(); }); await u1.waitForTimeout(500); await u1.screenshot({path:'test/shots/v1821/locker_card.png'});
  await u1.evaluate(()=>{ App.modal=null; renderModal(); PREFS.theme={preset:'crimson',custom:null}; applyTheme(); App.route='locker'; render(); window.scrollTo(0,0); }); await u1.waitForTimeout(400); await u1.screenshot({path:'test/shots/v1821/locker_crimson.png'});
  console.log(JSON.stringify([U,U2]));
  ok(U.dec&&U.badge&&U.ev&&U.meters===3&&U.groups>=4, 'a waiting situation shows on the Overview, the nav badge and the Locker Room, with three chemistry meters and personality groups');
  ok(U2.gone&&U2.log&&U2.mod>10&&U2.strip&&U2.hub&&U2.tab, 'deciding clears it and logs it; the level switch, player-card strip and Development hub all work');
  await u1.close();
  const ph=await mk('locker-ui',{width:390,height:844}); const PW=await ph.evaluate(()=>{ const C=App.C; let g=0; while(!v1822Pending(C)&&g++<20){ simRound(C); advance(C); } App.route='locker'; render(); return document.documentElement.scrollWidth; }); await ph.screenshot({path:'test/shots/v1821/locker_phone.png',fullPage:true}); ok(PW<=390, `phone: no sideways scroll (${PW}px)`); await ph.close();
  ok(!errs.length, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?`${fails} FAILED`:'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
