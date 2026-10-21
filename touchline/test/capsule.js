// v12: the Time Capsule. Freshman promises are sealed each fall, fit the player who wrote them, never repeat in a class,
// are judged against the real career at graduation, and are revealed in the Time Capsule room.
const { chromium } = require('./_pw');
const SHOTS=process.argv[2]||null;
(async()=>{ const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const page=await browser.newPage({viewport:{width:1360,height:900}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1])); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); if(m.type()==='warning'&&/capsule/.test(m.text())) errs.push('warn: '+m.text()); });
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Capsule'); await page.fill('#nc-seed','timecapsule'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  // 1. a new career seals the freshman class only
  const s1=await page.evaluate(()=>{ const C=App.C; const caps=Object.values(C.capsules||{}); const fr=Object.values(C.players).filter(p=>p.sid===C.userSid&&p.grade===9).map(p=>p.id).sort();
    const c=caps[0]; return {n:caps.length,cls:c&&c.cls,yr:C.year,st:c&&c.st,ids:c?c.notes.map(n=>n.pid).sort():[],fr,ks:c?c.notes.map(n=>n.k):[],txt:c?c.notes.every(n=>n.txt&&n.txt.length>8):false,news:C.news.some(x=>/seals its time capsule/.test(x.t||x.text||JSON.stringify(x)))}; });
  ok(s1.n===1&&s1.cls===s1.yr+3&&s1.st==='sealed', `a new career seals one capsule, for the freshmen (Class of ${s1.cls})`);
  ok(s1.ids.join()===s1.fr.join()&&s1.fr.length>0, `every freshman wrote exactly one note (${s1.fr.length})`);
  ok(new Set(s1.ks).size===s1.ks.length, 'no two freshmen in the class make the same kind of promise ('+s1.ks.join(', ')+')');
  ok(s1.txt, 'every note has its own written promise');
  ok(s1.news, 'the Newsroom reports the capsule being sealed');
  // 2. promises fit the player: position, potential, temperament, rival, numbers scaled to him
  const fit=await page.evaluate(()=>{ const C=App.C; const by={GK:{},DEF:{},MID:{},FWD:{}}; const bad=[]; const nByTier={}; let total=0, ps=0, rivalNamed=0, rivalK=0;
    const pool=Object.values(C.players).filter(p=>C.league.includes(p.sid)&&p.grade<=12);
    for(let k=0;k<40;k++){ const P=pool.slice(k*8,k*8+12); if(P.length<6) break; const save=C.capsules; C.capsules={};
      const cap=tcSeal(C,P.map(p=>p.id),C.year,false); C.capsules=save; if(!cap) continue;
      if(new Set(cap.notes.map(n=>n.k)).size!==cap.notes.length) bad.push('dup in class');
      for(const n of cap.notes){ total++; by[n.pos][n.k]=(by[n.pos][n.k]||0)+1; const T=TC_BY[n.k]; if(T.pos&&!T.pos.includes(n.pos)) bad.push(n.pos+' got '+n.k); if(n.ps) ps++;
        if(['beatriv','rivgoal','rivcs'].includes(n.k)){ rivalK++; if(n.txt.includes(Sx(C.rivals.heated).town)||n.txt.includes(Sx(C.rivals.heated).mascot)) rivalNamed++; }
        if(n.k==='goals'){ const t=tcTier(n.pot); (nByTier[t]||(nByTier[t]=[])).push(n.n); } } }
    const kinds=new Set(Object.values(by).flatMap(o=>Object.keys(o))).size;
    return {by,bad,kinds,total,ps,rivalNamed,rivalK,nByTier}; });
  ok(fit.bad.length===0, 'no position gets a promise that does not fit it (keepers never promise goal tallies, defenders never promise hat tricks)'+(fit.bad.length?' '+fit.bad.slice(0,4):''));
  ok(fit.kinds>=30, `${fit.kinds} different kinds of promise appear across ${fit.total} test freshmen`);
  ok(Object.keys(fit.by.GK).some(k=>['saves','shutouts','sosave','rivcs','gkgoal'].includes(k))&&!fit.by.GK.goals, 'keepers promise saves, shutouts and shootout heroics: '+Object.keys(fit.by.GK).join(', '));
  const mean=a=>a&&a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  console.log('   FWD promises:',JSON.stringify(fit.by.FWD)); ok(!fit.nByTier.star||!fit.nByTier.solid||mean(fit.nByTier.star)>mean(fit.nByTier.solid), 'goal targets scale with the player: high-potential strikers aim higher ('+Object.entries(fit.nByTier).map(([t,a])=>t+' ~'+Math.round(mean(a))).join(', ')+')');
  ok(fit.rivalK>0&&fit.rivalNamed===fit.rivalK, `rivalry promises name the real rival (${fit.rivalNamed}/${fit.rivalK})`);
  ok(fit.ps>0, `some notes carry a personal P.S. (${fit.ps}), some naming a classmate`);
  const det=await page.evaluate(()=>{ const C=App.C; const c=Object.values(C.capsules)[0]; const save=C.capsules; C.capsules={}; const again=tcSeal(C,c.notes.map(n=>n.pid),c.seal,false); C.capsules=save; return again.notes.map(n=>n.txt).sort().join('|')===c.notes.map(n=>n.txt).sort().join('|'); });
  ok(det, 'sealing is deterministic for a save: the same class always writes the same notes');
  // 3. sealed notes stay hidden; peek shows them without results
  await page.dispatchEvent('.tnav [data-r="capsule"]','click'); await page.waitForTimeout(400);
  ok(await page.$('.tcx-room')&&!(await page.$('.tcx-room .tcx-note')), 'the Time Capsule room opens with every note still sealed');
  await page.click('.tcx-jar [data-a="tcPeek"]'); await page.waitForTimeout(300);
  ok((await page.$$('.tcx-peek .tcx-note')).length===s1.fr.length&&!(await page.$('.tcx-peek .tcx-stamp')), 'Peek shows the sealed notes, without any results');
  if(SHOTS) await page.screenshot({path:SHOTS+'/tc-peek.png',fullPage:true});
  // 4. play four seasons: the class graduates and the capsule is judged against the real careers
  const sim=await page.evaluate(()=>{ const C=App.C; const cls=Object.values(C.capsules)[0].cls; let yrs=0;
    for(let step=0;step<3000&&C.year<=cls;step++){ if(C.phase==='offseason'){ rollover(C); yrs++; continue; } const fx=userFixture(C); if(fx){ const M=startMatch(C,fx.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    const cap=C.capsules[cls]; const tracked=Object.values(C.players).filter(p=>p.sid===C.userSid&&p.tc&&p.tc.w).length;
    /* tracking agrees with the box scores: anyone with varsity games has wins logged unless the team never won with him */
    const chk=Object.values(C.players).filter(p=>p.sid===C.userSid).map(p=>{ let gp=0; for(const y in p.st){ const v=p.st[y].V; if(v) for(const b of ['pre','reg','post']) if(v[b]) gp+=v[b].gp; } return {gp,w:(p.tc&&p.tc.w)||0}; }).filter(x=>x.gp>=10);
    const agree=chk.filter(x=>x.w>0).length/Math.max(1,chk.length);
    const later=Object.values(C.capsules).filter(c=>c.cls>cls).map(c=>c.cls);
    return {agree,nchk:chk.length,cls,yrs,st:cap.st,tally:cap.tally,notes:cap.notes.map(n=>({k:n.k,st:n.st,ev:n.ev,txt:n.txt,pos:n.pos})),tracked,later,year:C.year}; });
  console.log(sim.notes.map(n=>`   ${n.st.toUpperCase().padEnd(6)} ${n.pos} "${n.txt}" -> ${n.ev}`).join('\n'));
  ok(sim.st==='ready', `after ${sim.yrs} seasons the Class of ${sim.cls} graduates and its capsule is ready`);
  ok(sim.notes.every(n=>n.st&&n.ev), 'every promise has a verdict and the real career evidence behind it');
  const t=sim.tally; ok(Object.values(t).reduce((a,b)=>a+b,0)===sim.notes.length&&(t.yes+t.beyond)>0&&(t.no+t.close)>0, `a mix of outcomes: ${JSON.stringify(t)}`);
  ok(sim.tracked>3, `career moments are tracked live for your players (${sim.tracked} current players with wins logged)`);
  ok(sim.agree>=0.9, `win tracking agrees with the box scores (${Math.round(sim.agree*100)}% of ${sim.nchk} regulars have wins logged)`);
  ok(sim.later.length>=3, 'each new fall seals the next freshman class ('+sim.later.join(', ')+')');
  // 5. graduation day in the UI
  await page.evaluate(()=>{ App.route='office'; App.params={}; render(); }); await page.waitForTimeout(300);
  ok(await page.$('.tcx-banner'), 'the Office shows a graduation-day banner to open the capsule');
  ok(await page.evaluate(()=>!!document.querySelector('.nav[data-r="capsule"] .badge, .nav[data-r="capsule"] [class*="badge"]')||navBadges(App.C).capsule), 'the Time Capsule menu item carries a badge');
  if(SHOTS) await page.screenshot({path:SHOTS+'/tc-banner.png'});
  await page.click('.tcx-banner [data-a="go"]'); await page.waitForTimeout(400);
  ok(await page.$('[data-a="tcOpen"]'), 'the room shows the closed capsule and an Open button');
  await page.click('[data-a="tcOpen"]'); await page.waitForTimeout(600);
  ok(await page.$('.tcx-note.anim'), 'opening plays the reveal: notes fly out, stamps land one by one');
  await page.waitForTimeout(sim.notes.length*420+1800);
  const shown=await page.evaluate(()=>({n:document.querySelectorAll('.tcx-stage.open .tcx-note').length,stamps:[...document.querySelectorAll('.tcx-stage.open .tcx-stamp')].map(s=>s.textContent),st:App.C.capsules[Object.keys(App.C.capsules).sort()[0]].st,tally:!!document.querySelector('.tcx-tally')}));
  ok(shown.n===sim.notes.length&&shown.stamps.length===sim.notes.length&&shown.tally, `all ${shown.n} notes are shown with stamps (${[...new Set(shown.stamps)].join(', ')}) and a results tally`);
  ok(await page.evaluate(()=>!tcReady(App.C)&&!document.querySelector('.tcx-banner')), 'once opened, it stays opened (no banner, no badge)');
  if(SHOTS){ await page.screenshot({path:SHOTS+'/tc-open.png',fullPage:true}); }
  // 6. the player's own profile shows his note and verdict
  await page.click('.tcx-stage.open .tcx-note'); await page.waitForTimeout(400);
  ok(await page.$('.modal .tcx-mini .tcx-stamp'), "the graduate's profile shows his freshman promise and its stamp");
  await page.evaluate(()=>{ App.modal=null; renderModal(); });
  const cur=await page.evaluate(()=>{ const C=App.C; const cap=Object.values(C.capsules).find(c=>c.st==='sealed'); return cap.notes[0].pid; });
  await page.evaluate(id=>{ App.modal={type:'player',id}; renderModal(); },cur); await page.waitForTimeout(300);
  ok(await page.$('.modal .tcx-mini-lock'), "a current player's profile says his promise is sealed until graduation");
  await page.evaluate(()=>{ App.modal=null; renderModal(); });
  // 7. saves made before this feature: classes whose freshman year is inside the career are filled in, older ones are not
  const mig=await page.evaluate(()=>{ const C=App.C; const save=C.capsules; delete C.capsules; migrate(C); const got=Object.keys(C.capsules).map(Number).sort(); const start=C.year-(C.seasonNo-1); const back=Object.values(C.capsules).filter(c=>c.back);
    const okBack=back.every(c=>c.seal>=start&&c.notes.every(n=>!TC_BY[n.k].tc&&!TC_BY[n.k].sealOnly)); C.capsules=save; return {got,okBack,nBack:back.length}; });
  ok(mig.got.length>=3&&mig.okBack, `an older save gets capsules for its current classes (${mig.got.join(', ')}); back-filled notes only use promises the box scores can prove`);
  // 8. phone width
  await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>{ App.route='capsule'; App.params={}; render(); }); await page.waitForTimeout(400);
  const ov=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); ok(ov<=1, 'the Time Capsule room fits a phone screen ('+ov+' px overflow)');
  if(SHOTS) await page.screenshot({path:SHOTS+'/tc-mobile.png',fullPage:false});
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await browser.close(); process.exit(fails||errs.length?1:0);
})();
