/* v18.11 cards: screenshots of the reveal (mid-flip and final), the binder, the card detail and the results pack, desktop and
   phone, in two themes. Usage: node test/plan/cards_shots.js [outdir]  (default test/shots/v1811/cards) */
const { chromium, DIST } = require('../_pw'); const fs=require('fs');
const OUT=process.argv[2]||'test/shots/v1811/cards'; fs.mkdirSync(OUT,{recursive:true});
const THEMES={night:{preset:'night'},light:{preset:null,custom:{bg:'#f3f0e8',surface:'#ffffff',text:'#1b1f25',accent:'#d97706',accent2:'#2563eb'}}};
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const [W,H,dev] of [[1440,900,'desktop'],[390,844,'phone']]) for(const th of Object.keys(THEMES)){
    const page=await b.newPage({viewport:{width:W,height:H}}); page.on('pageerror',e=>errs.push(dev+' '+th+' '+e.message));
    await page.goto(DIST); await page.waitForTimeout(400);
    await page.evaluate(t=>{ PREFS.theme=t; savePrefs(); },THEMES[th]); await page.reload(); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Card Coach'); await page.fill('#nc-seed','cards1');
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    const S=n=>`${OUT}/${dev}-${th}-${n}.png`;
    /* empty binder */
    await page.evaluate(()=>{ App.route='cards'; App.params={}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:S('binder-empty')});
    await page.evaluate(()=>{ const C=App.C; for(let i=0;i<14;i++){ simRound(C); try{ advance(C); }catch(e){} } V1811C.fresh=[]; });
    for(const tier of ['legend','gold','silver','bronze']){ if(dev==='phone'&&th==='light'&&tier!=='legend') continue; if(th==='light'&&tier==='bronze') continue;
      const id=await page.evaluate(t=>{ const L=App.C.cards.list.filter(c=>c.rar===t); const c=L[L.length-1]; if(!c) return null; App.route='office'; render(); v1811cOpen([c]); return c.id; },tier);
      if(!id) continue; await page.waitForTimeout(1500); await page.screenshot({path:S(`reveal-${tier}-flip`)}); await page.waitForTimeout(2300); await page.screenshot({path:S(`reveal-${tier}-final`)});
      await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    await page.evaluate(()=>{ App.route='cards'; App.params={}; render(); }); await page.waitForTimeout(500); await page.screenshot({path:S('binder')});
    if(dev==='desktop') await page.screenshot({path:S('binder-full'),fullPage:true});
    await page.evaluate(()=>{ App.params={rar:'gold'}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:S('binder-gold')});
    await page.evaluate(()=>{ App.params={}; render(); }); await page.waitForTimeout(200);
    await page.click('.v1811c-gc'); await page.waitForTimeout(1500); await page.screenshot({path:S('detail')});
    await page.evaluate(()=>{ App.modal=null; renderModal(); const C=App.C; const p=C.players[C.cards.list[C.cards.list.length-1].pid]; App.modal={type:'player',id:p.id}; renderModal(); }); await page.waitForTimeout(400);
    await page.evaluate(()=>{ const el=document.querySelector('.v1811c-mini'); if(el) el.scrollIntoView(); }); await page.screenshot({path:S('profile')});
    /* the results pack after a round */
    await page.evaluate(()=>{ App.modal=null; renderModal(); App.route='office'; render(); const C=App.C; const uf=userFixture(C); completeRound(uf?uf.id:null); }); await page.waitForTimeout(1600); await page.screenshot({path:S('results-pack')});
    await page.close(); }
  console.log(errs.length?errs.join('\n'):'no page errors'); await b.close(); })();
