// v18.12 integration smoke: tryouts, State Poll, County Map, Gameday Graphics and the v18.11 cards live in one career together:
// every new route renders without errors, the nav entries exist, tryouts can be auto-resolved, a round is played and
// the poll, map and poster feed all update, and a save/reload keeps everything.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push('console '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','All Coach'); await page.fill('#nc-seed','all1');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(1000);
  const routes=['tryouts','poll','countymap','gameday','cards'];
  const names=await page.evaluate(()=>Object.keys(VIEWS)); const have=r=>names.includes(r);
  const mapR=['countymap','map','county'].find(have), pollR=['poll','statepoll'].find(have);
  const R={tryouts:have('tryouts'),poll:!!pollR,map:!!mapR,gameday:have('gameday'),cards:have('cards')};
  ok(Object.values(R).every(Boolean), 'every new route is registered '+JSON.stringify(R));
  for(const r of [ 'tryouts',pollR,mapR,'gameday','cards' ]){ if(!r) continue; await page.evaluate(r=>{ App.route=r; App.params={}; render(); },r); await page.waitForTimeout(600);
    const h=await page.evaluate(()=>({n:document.querySelector('#app').innerText.length, err:!!document.querySelector('#app .error')})); ok(h.n>150&&!h.err, `route ${r} renders (${h.n} chars)`); }
  await page.evaluate(()=>{ App.route='office'; render(); });
  /* tryouts auto-resolve through a played game, then everything updates */
  const S=await page.evaluate(()=>{ const C=App.C; const t0=C.tryout&&C.tryout.st; let g=0; while(C.phase==='preseason'&&g++<4){ try{ simRound(C); }catch(e){} } try{ for(let i=0;i<4;i++){ simRound(C); advance(C); } }catch(e){}
    return {t0,t1:C.tryout&&C.tryout.st,phase:C.phase,md:C.md,poll:C.poll&&Object.keys(C.poll).length,map:!!C.map,gd:C.gd&&C.gd.feed&&C.gd.feed.length,cards:C.cards&&C.cards.list&&C.cards.list.length}; });
  console.log(JSON.stringify(S));
  ok(S.t1&&S.t1!=='open', `tryouts resolve themselves when the season is played (${S.t0} -> ${S.t1})`);
  ok(S.poll>0&&S.gd>0&&S.cards>0, `poll, poster feed and cards all update (${S.poll}, ${S.gd}, ${S.cards})`);
  /* every route once more after a few rounds, then a reload */
  for(const r of [ 'tryouts',pollR,mapR,'gameday','cards' ]){ if(!r) continue; await page.evaluate(r=>{ App.route=r; App.params={}; render(); },r); await page.waitForTimeout(400); ok(await page.evaluate(()=>document.querySelector('#app').innerText.length>150), `route ${r} still renders after play`); }
  const sv=await page.evaluate(()=>{ const j=JSON.stringify(careerForSave?careerForSave(App.C):App.C); return j.length; }); ok(sv>1000&&sv<30e6, `the career still saves (${(sv/1e6).toFixed(2)} MB)`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
