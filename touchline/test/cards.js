// v18.11 Player of the Match cards (src/v17/93_cards.js): one card per match of the user's school (every level, none for
// other schools), the best-rated player on the user's side, deterministic rarity rules, the same cards for the same seed,
// saved with the career (reload and backup), the Card Binder renders and filters, the reveal shows and can be skipped and
// closed, a live match's reveal leaves Continue clickable and the round results show the pack; no page errors.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
async function career(page,seed){ await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Card Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); }
const SIM=n=>{ const C=App.C; for(let i=0;i<n;i++){ simRound(C); try{ advance(C); }catch(e){} } };
(async()=>{ const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await career(page,'cards-t1');
  ok(await page.evaluate(()=>!App.C.cards||App.C.cards.list.length===0), 'a new career starts with an empty binder');
  await page.evaluate(()=>{ App.route='cards'; App.params={}; render(); });
  ok(await page.evaluate(()=>!!document.querySelector('.v1811c-empty')&&/binder is empty/i.test(document.body.innerText)), 'the empty binder shows its empty state');
  await page.evaluate(`(${SIM})(8)`);
  const R=await page.evaluate(()=>{ const C=App.C, u=C.userSid; const L=C.cards.list; const done=Object.values(C.fixtures).filter(f=>f.st==='d');
    const mine=done.filter(f=>f.h===u||f.a===u); const ids=new Set(L.map(c=>c.fid));
    const bad=[]; for(const c of L){ const f=C.fixtures[c.fid]; if(!f||(f.h!==u&&f.a!==u)) bad.push('notMine '+c.fid); const p=findPerson(C,c.pid); if(!p||p.sid!==u) bad.push('player '+c.pid);
      const lg=C.logs[c.fid]; const rows=lg.box[f.h===u?0:1]; const best=v1811cPick(rows); if(!best||best.pid!==c.pid) bad.push('notBest '+c.fid);
      if(rows.some(r=>r.gp!==0&&(r.rt||0)>c.rt)) bad.push('higher '+c.fid);
      const evs=(lg.ev||[]).filter(e=>e.t==='goal'&&e.pid===c.pid&&e.s===(f.h===u?0:1)); const th=f.h===u?f.ag:f.hg;
      const R2=v1811cRarity(best,{sty:evs.map(e=>e.sty||''),cs:th===0,finalWin:f.w===u&&f.lvl==='V'&&v1811cFinal(f),f,winner:c.feat==='Match winner'}); if(R2.rar!==c.rar) bad.push('rar '+c.fid+' '+R2.rar+' '+c.rar); }
    const lv={}; L.forEach(c=>lv[c.lvl]=(lv[c.lvl]||0)+1); const by={}; L.forEach(c=>by[c.rar]=(by[c.rar]||0)+1);
    return {n:L.length,mine:mine.length,uniq:ids.size,others:done.length-mine.length,bad,lv,by,sig:JSON.stringify(L.map(c=>[c.id,c.pid,c.rar,c.rt,c.feat]))}; });
  console.log(JSON.stringify({...R,sig:undefined}));
  ok(R.n>0&&R.n===R.mine&&R.uniq===R.n, `one card per match of the user's school (${R.n} cards, ${R.mine} matches, ${R.others} other matches carded: none)`);
  ok(R.lv.V>0&&R.lv.JV>0&&R.lv.MOD>0, `cards at every level (${JSON.stringify(R.lv)})`);
  ok(R.bad.length===0, 'each card is the best-rated player of the user\'s side, with the rarity the rules give'+(R.bad.length?': '+R.bad.slice(0,4).join(', '):''));
  /* the rules themselves */
  const T=await page.evaluate(()=>{ const r=(row,o)=>v1811cRarity({role:'ST',g:0,a:0,sv:0,...row},o).rar;
    return [r({g:3,rt:8.4}),r({g:1,rt:7.4},{sty:['bike']}),r({rt:9.8}),r({g:1,rt:7.1},{finalWin:true,f:{comp:'st',rd:2}}),r({rt:9.0}),r({g:2,rt:8.6}),r({g:1,rt:7.5},{sty:['scissor']}),r({role:'GK',sv:5,rt:8.0},{cs:true}),
      r({g:2,rt:8.2}),r({rt:7.8}),r({rt:7.7}),r({rt:5}),
      v1811cRarity({role:'ST',g:3,rt:9},{}).feat,v1811cRarity({role:'ST',g:1,rt:8},{sty:['bike']}).feat,v1811cRarity({role:'GK',g:0,rt:8},{cs:true}).feat]; });
  ok(JSON.stringify(T)===JSON.stringify(['legend','legend','legend','legend','gold','gold','gold','gold','silver','silver','bronze','bronze','Hat trick','Bicycle kick','Clean sheet']), 'rarity rules: hat trick / bicycle kick / 9.8 / final hero Legendary; 9.0 / brace 8.6 / scissor / keeper wall Gold; 7.8 Silver; else Bronze '+JSON.stringify(T));
  /* the same seed mints the same cards */
  { const p2=await b.newPage({viewport:{width:900,height:700}}); await career(p2,'cards-t1'); await p2.evaluate(`(${SIM})(8)`); const sig2=await p2.evaluate(()=>JSON.stringify(App.C.cards.list.map(c=>[c.id,c.pid,c.rar,c.rt,c.feat]))); await p2.close();
    ok(sig2===R.sig, 'the same seed mints the same cards'); }
  /* the binder */
  await page.evaluate(()=>{ App.route='cards'; App.params={}; render(); }); await page.waitForTimeout(200);
  const B=await page.evaluate(()=>{ const C=App.C; const L=C.cards.list; const n=document.querySelectorAll('.v1811c-grid .v1811c-gc').length; const newB=document.querySelectorAll('.v1811c-new').length;
    const tier=L.find(c=>c.rar!=='bronze')?L.find(c=>c.rar!=='bronze').rar:'bronze'; App.params={rar:tier}; render(); const cardsT=[...document.querySelectorAll('.v1811c-grid .v1811c-card')]; const allT=cardsT.every(e=>e.classList.contains('v1811c-r-'+tier));
    const pid=L[0].pid; const sel=document.querySelector('select[data-k="pid"]'); App.params={}; render(); const s2=document.querySelector('select[data-k="pid"]'); s2.value=pid; s2.dispatchEvent(new Event('change',{bubbles:true}));
    const nP=document.querySelectorAll('.v1811c-grid .v1811c-gc').length, wantP=L.filter(c=>c.pid===pid).length;
    App.params={yr:'1900'}; render(); const none=!!document.querySelector('.v1811c-empty.sm'); A.v1811cReset(); const back=document.querySelectorAll('.v1811c-grid .v1811c-gc').length;
    return {n,want:Math.min(L.length,V1811C.page),newB,tier,nT:cardsT.length,wantT:L.filter(c=>c.rar===tier).length,allT,nP,wantP,none,back,top:document.querySelectorAll('.v1811c-pc').length}; });
  console.log(JSON.stringify(B));
  ok(B.n===B.want&&B.newB>0, `the binder lists the cards (${B.n}), new ones marked`);
  ok(B.allT&&B.nT===B.wantT, `the rarity filter (${B.tier}: ${B.nT} of ${B.wantT})`);
  ok(B.nP===B.wantP&&B.nP>0, `the player filter through its select (${B.nP})`);
  ok(B.none&&B.back===B.n, 'a filter with no matches shows its empty state, and Clear filters brings the grid back');
  ok(B.top>0, 'counts per player ("Most cards")');
  await page.waitForTimeout(600); ok(await page.evaluate(()=>App.C.cards.list.every(c=>!c.nw)&&!navBadges(App.C).cards), 'opening the binder marks the cards seen and clears the nav badge');
  ok(await page.evaluate(()=>{ const t=TOPNAV.find(x=>x[0]==='squads'); return t[3].includes('cards')&&!!document.querySelector('.tn-dd [data-r="cards"]'); }), 'the binder is in the Squad menu');
  /* card detail */
  await page.click('.v1811c-grid .v1811c-gc'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>App.modal&&App.modal.type==='v1811cCard'&&!!document.querySelector('.v1811c-det .v1811c-card')), 'a card opens its detail view');
  await page.click('[data-a="v1811cFlip"]'); ok(await page.evaluate(()=>document.querySelector('.v1811c-det .v1811c-card').classList.contains('v1811c-flipped')), 'Flip card turns it over');
  await page.click('[data-a="v1811cStep"][data-d="1"]'); ok(await page.evaluate(()=>App.modal.ids.indexOf(App.modal.id)===1), 'Next steps through the filtered cards');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  /* player profile */
  ok(await page.evaluate(()=>{ const c=App.C.cards.list[0]; App.modal={type:'player',id:c.pid}; renderModal(); const el=document.querySelector('.v1811c-mini'); const k=App.C.cards.list.filter(x=>x.pid===c.pid).length; App.modal=null; renderModal(); return !!el&&el.querySelectorAll('.v1811c-gc').length===Math.min(6,k); }), 'the player profile shows his cards');
  /* the reveal: skip with Enter, close with Esc; click skips too */
  await page.evaluate(()=>{ App.route='office'; render(); v1811cOpen([App.C.cards.list[0]]); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>{ const r=document.querySelector('.v1811c-rv'); return !!r&&r.dataset.ph!=='done'&&!!r.querySelector('.v1811c-card'); }), 'the reveal opens and animates');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>{ const r=document.querySelector('.v1811c-rv'); const c=App.C.cards.list[0]; return r&&r.dataset.ph==='done'&&r.querySelector('.v1811c-rt b').textContent===c.rt.toFixed(1); }), 'Enter skips to the finished card with the final numbers');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400); ok(await page.evaluate(()=>!document.querySelector('.v1811c-rv')&&!App.modal), 'Esc closes it (and nothing else)');
  await page.evaluate(()=>v1811cOpen(App.C.cards.list.slice(0,2))); await page.waitForTimeout(200); await page.mouse.click(40,400); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>document.querySelector('.v1811c-rv').dataset.ph==='done'), 'a click skips');
  await page.click('[data-a="v1811cNext"]'); await page.waitForTimeout(100); ok(await page.evaluate(()=>/2 of 2/.test(document.querySelector('.v1811c-rv').innerText)), 'Next card shows the second card of a pack');
  await page.click('.v1811c-rv'); await page.click('[data-a="v1811cNext"]'); await page.waitForTimeout(400); ok(await page.evaluate(()=>!document.querySelector('.v1811c-rv')), 'Done closes the pack');
  /* reduced motion: shown at once */
  await page.evaluate(()=>{ PREFS.rm=true; v1811cOpen([App.C.cards.list[0]]); }); ok(await page.evaluate(()=>{ const r=document.querySelector('.v1811c-rv'); return r&&r.dataset.ph==='done'&&r.classList.contains('v1811c-rm'); }), 'reduced motion: no flip, the card fades in finished');
  await page.keyboard.press('Escape'); await page.evaluate(()=>{ PREFS.rm=false; });
  /* persistence: backup round trip and reload */
  ok(await page.evaluate(()=>{ const C=App.C; const d=JSON.parse(JSON.stringify(careerForSave(C))); const M=migrate(d); return M.cards&&M.cards.list.length===C.cards.list.length&&Object.keys(M.cards.lk).length>0; }), 'cards survive the backup format (careerForSave / migrate)');
  const nBefore=await page.evaluate(()=>App.C.cards.list.length); await page.evaluate(()=>saveNow()); await page.waitForTimeout(300); await page.reload(); await page.waitForTimeout(1000);
  if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); }
  ok(await page.evaluate(n=>!!App.C&&App.C.cards&&App.C.cards.list.length===n,nBefore), `cards persist through save and reload (${nBefore})`);
  /* a live match: the reveal opens over the pitch, Continue stays clickable, the results show the pack */
  await page.evaluate(()=>{ App.modal=null; renderModal(); App.route='office'; render(); });
  const before=await page.evaluate(()=>App.C.cards.list.length);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="pvSpeed"][data-v="8"]').catch(()=>{}); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(1200);
  for(let k=0;k<14;k++){ if(await page.$('#lv-cont')) break; if(await page.$('#lv-ht .htbox')){ await page.click('#ht-go').catch(()=>{}); await page.waitForTimeout(400); } await page.click('[data-a="liveSkip"][data-to="ft"]',{timeout:3000}).catch(()=>{}); await page.waitForTimeout(1500); }
  const fid=await page.evaluate(()=>App.live&&App.live.fid);
  let seen=false; for(let k=0;k<30&&!seen;k++){ seen=await page.evaluate(()=>!!document.querySelector('.live .v1811c-rv-in')); if(!seen) await page.waitForTimeout(200); }
  ok(seen, 'a live match ends with the card reveal over the pitch');
  ok(await page.evaluate(([b,fid])=>App.C.cards.list.length===b+1&&App.C.cards.list.some(c=>c.fid===fid),[before,fid]), 'the live match minted its card');
  await page.click('#lv-cont',{timeout:4000}).catch(e=>errs.push('continue blocked: '+e.message.split('\n')[0])); await page.waitForTimeout(1200);
  ok(await page.evaluate(()=>!App.live&&!document.querySelector('.v1811c-rv')&&App.modal&&App.modal.type==='results'), 'Continue works while the reveal is up and closes it');
  ok(await page.evaluate(fid=>{ const el=document.querySelector('.v1811c-pack'); return !!el&&!!el.querySelector(`[data-ids*="K${fid}"]`); },fid), 'the round results show the Player of the Match card');
  await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; renderModal(); });
  /* quick sim: the summary shows the pack and Open pack plays the reveal */
  await page.evaluate(()=>A.simAhead({dataset:{k:'round'}})); await page.waitForTimeout(600);
  ok(await page.evaluate(()=>App.modal&&App.modal.type==='simSummary'&&!!document.querySelector('.v1811c-pack')), 'the simulation summary shows the new card');
  await page.click('.v1811c-pbtn [data-a="v1811cPack"]'); await page.waitForTimeout(200); ok(await page.evaluate(()=>!!document.querySelector('body > .v1811c-rv')), 'Reveal card opens the reveal from the summary');
  await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>!document.querySelector('.v1811c-rv')&&App.modal&&App.modal.type==='simSummary'), 'closing the reveal leaves the summary open');
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
