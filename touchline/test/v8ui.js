// v8 UI checks in Chromium: The Courier, TouchlineTV, celebrations tab, compare finder, Senior Night, menu
const { chromium } = require('./_pw');
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1280,height:860}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(600);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','V8 Coach'); await page.fill('#nc-seed','v8ui');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ for(let i=0;i<12;i++){ const f=userFixture(App.C); if(i>=5&&f&&isSeniorNight(App.C,f)) break; simRound(App.C); advance(App.C); } render(); });
  // The Courier
  await page.evaluate(()=>A.go({dataset:{r:'news'}})); await page.waitForTimeout(400);
  ok(await page.$('.np .np-head'), 'The Courier front page renders a headline');
  const head=await page.textContent('.np-head'); ok(/[A-Z]/.test(head)&&head.length>8, 'headline: '+head);
  await page.waitForTimeout(1500); ok(await page.$('.np-img.ready'), 'press photo is rendered from the broadcast engine');
  const n=await page.$$eval('select[data-k="ix"] option',o=>o.length); ok(n>=5, 'back issues are browsable ('+n+')');
  await page.click('[data-a="setParam"][data-k="ix"]'); await page.waitForTimeout(300); ok(await page.$('.np .np-head'), 'previous edition renders');
  // TouchlineTV
  await page.evaluate(()=>{ App.params.nv='tv'; App.params.ix=''; render(); }); await page.waitForTimeout(400);
  const cards=await page.$$('.tv-card'); ok(cards.length>=1&&cards.length<=5, 'TouchlineTV lists up to five plays ('+cards.length+')');
  await page.click('.tv-head [data-a="tvOpen"]'); await page.waitForTimeout(2500);
  const tv=await page.evaluate(()=>{ const cv=document.querySelector('#modal-root canvas[data-tv]'); return {has:!!cv, run:!!(cv&&cv._tv), lower:(document.querySelector('#tv-lower')||{}).textContent||''}; });
  ok(tv.has&&tv.run, 'the countdown plays on the broadcast stage'); ok(/#\d/.test(tv.lower), 'lower third names the play: '+tv.lower.trim().slice(0,60));
  await page.click('#modal-root [data-a="closeModal"]'); await page.waitForTimeout(300);
  // Celebrations tab
  const pid=await page.evaluate(()=>{ const C=App.C; const L=squad(C,C.userSid,'V').sort((a,b)=>celebUnlocked(C,b).length-celebUnlocked(C,a).length); return L[0].id; });
  await page.evaluate(id=>{ App.modal={type:'player',id,tab:'celeb'}; renderModal(); },pid); await page.waitForTimeout(600);
  const tiles=await page.$$('.cel-tile'); ok(tiles.length===10, 'ten celebrations are listed');
  const un=await page.evaluate(id=>celebUnlocked(App.C,App.C.players[id]),pid);
  const pick=un[un.length-1]; await page.click(`.cel-tile[data-cel="${pick}"]`); await page.waitForTimeout(300);
  ok(await page.evaluate(([id,c])=>App.C.players[id].cel===c&&celebFor(App.C,App.C.players[id])===c,[pid,pick]), 'equipping a celebration sticks ('+pick+')');
  const locked=await page.$('.cel-tile.locked'); if(locked){ await locked.click(); await page.waitForTimeout(200); ok(await page.evaluate(([id,c])=>App.C.players[id].cel===c,[pid,pick]), 'clicking a locked one only previews it'); }
  ok(await page.evaluate(()=>{ const cv=document.querySelector('canvas[data-celprev]'); return cv&&cv.width>0; }), 'celebration preview canvas is live');
  await page.evaluate(()=>{ App.modal=null; renderModal(); });
  // Compare finder
  await page.evaluate(()=>A.go({dataset:{r:'history',p:JSON.stringify({tab:'compare'})}})); await page.waitForTimeout(400);
  ok((await page.$$('.cmp-side .pcard')).length===2, 'both player cards are shown');
  const town=await page.evaluate(()=>Sx(App.C.league[2]).town);
  await page.selectOption('select[data-k="ta"]', await page.evaluate(()=>App.C.league[2])); await page.waitForTimeout(200);
  const rowsT=await page.$$eval('#cmp-res-a .cmp-row',r=>r.length); const grp=await page.$$eval('#cmp-res-a .cmp-grp',g=>g.map(x=>x.textContent.trim()));
  ok(rowsT>5 && grp.length===1 && grp[0].includes(town), 'team filter narrows the list to '+town);
  const nm=await page.evaluate(()=>{ const p=squad(App.C,App.C.league[2],'V')[3]; return p.ln; });
  await page.fill('.cmp-q[data-side="a"]', nm); await page.waitForTimeout(200);
  const hits=await page.$$eval('#cmp-res-a .cmp-row b',r=>r.map(x=>x.textContent)); ok(hits.length>=1 && hits.every(h=>h.toLowerCase().includes(nm.toLowerCase())), 'search finds '+nm);
  await page.click('#cmp-res-a .cmp-row'); await page.waitForTimeout(300); ok(await page.evaluate(n=>Px(App.params.pa).ln===n,nm), 'clicking a result puts him in slot A');
  await page.selectOption('select[data-k="sb"]','goals'); await page.waitForTimeout(150);
  const g=await page.$$eval('#cmp-res-b .cmp-row .mono',r=>r.slice(0,6).map(x=>parseInt(x.textContent))); ok(g.every((v,i)=>i===0||v<=g[i-1]), 'sort by goals is descending');
  // standings crests are on light badges
  await page.evaluate(()=>A.go({dataset:{r:'league'}})); await page.waitForTimeout(300); ok((await page.$$('table .tbadge')).length>=8, 'standings show badge-backed crests');
  // Senior Night
  await page.evaluate(()=>{ for(let i=0;i<20;i++){ const f=userFixture(App.C); if(f&&isSeniorNight(App.C,f)) break; if(App.C.phase!=='regular'){ break; } simRound(App.C); advance(App.C); } render(); });
  const isSN=await page.evaluate(()=>{ const f=userFixture(App.C); return !!f&&isSeniorNight(App.C,f); });
  if(isSN){ await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); ok(await page.$('.sn-chip'), 'match preview flags Senior Night');
    await page.click('[data-a="pvSpeed"][data-v="4"]').catch(()=>{}); await page.click('[data-a="kickoff"]'); await page.waitForSelector('.snight .sn-card',{timeout:15000}).catch(()=>{});
    ok(await page.$('.snight .sn-card'), 'Senior Night ceremony runs before kickoff');
    await page.click('[data-a="snSkip"]'); await page.waitForTimeout(800); ok(!(await page.$('.snight')), 'the ceremony can be skipped');
    ok(await page.evaluate(()=>!!App.C.seniorNights[App.C.year]), 'Senior Night is archived'); }
  else ok(true,'(Senior Night already passed in this seed)');
  console.log(errs.length? 'ERRORS\n'+errs.join('\n') : 'ERRORS none'); if(errs.length) process.exitCode=1;
  await browser.close();
})();
