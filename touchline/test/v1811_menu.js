/* v18.11 main menu (src/v17/92_menu.js): every menu action is reachable, Enter starts or continues, Tab focus, delete confirm, sound toggle, reduced motion.
   node test/v1811_menu.js   (exit 1 on any failure) */
const { chromium, DIST } = require('./_pw');
const path=require('path'), fs=require('fs'); const OUT=path.join(__dirname,'shots','v1811','menu')+'/'; fs.mkdirSync(OUT,{recursive:true});
const pre=()=>{ try{ const k='touchline.prefs.v2'; const p=JSON.parse(localStorage.getItem(k)||'{}'); p.lastSlot=null; localStorage.setItem(k,JSON.stringify(p)); }catch(e){} };
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const ctx=await b.newContext({viewport:{width:1440,height:900}}); let p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(pre); await p.goto(DIST); await p.waitForTimeout(1500);
  const acts=await p.evaluate(()=>[...document.querySelectorAll('#start [data-a]')].map(e=>e.dataset.a+(e.dataset.slot||'')));
  for(const a of ['newCareerForm1','newCareerForm2','newCareerForm3','howTo','whatsNew','openTheme','importOpen','toggleSound']) ok(acts.includes(a),'menu has '+a);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok(await p.evaluate(()=>App.modal&&App.modal.type==='newCareer'),'Enter with no career opens the new-program form');
  await p.fill('#nc-name','Key Coach'); await p.fill('#nc-seed','menu2'); await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(2500);
  p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.addInitScript(pre); await p.goto(DIST); await p.waitForTimeout(2500);
  const acts2=await p.evaluate(()=>[...document.querySelectorAll('#start [data-a]')].map(e=>e.dataset.a+(e.dataset.slot||'')));
  for(const a of ['openSlot1','askDelete1','newCareerForm2','newCareerForm3']) ok(acts2.includes(a),'career menu has '+a);
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'after-desktop-focus.png'});
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.closest('#start')!==null),'Tab focuses menu controls');
  await p.click('[data-a="askDelete"][data-slot="1"]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>App.modal&&App.modal.type==='confirmDelete'),'delete opens the confirm dialog');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.evaluate(()=>{ App.modal=null; renderModal(); });
  await p.click('[data-a="toggleSound"]'); await p.waitForTimeout(200); ok(await p.evaluate(()=>PREFS.sound.on===false&&!!document.querySelector('#start .sndbtn.big')),'sound toggles and the button stays labelled');
  await p.click('[data-a="toggleSound"]');
  await p.evaluate(()=>{ document.activeElement&&document.activeElement.blur(); }); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); ok(await p.evaluate(()=>!!App.C),'Enter continues the latest career');
  /* reduced motion: no running animation from this unit */
  const rm=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}); const q=await rm.newPage(); await q.addInitScript(pre); await q.goto(DIST); await q.waitForTimeout(1200);
  const run=await q.evaluate(()=>document.getAnimations().filter(a=>{ const n=a.animationName||''; return n.startsWith('v1811m'); }).length); ok(run===0,'reduced motion: no v1811m animations ('+run+')');
  ok(!errs.length,'no page errors '+errs.join(' | ')); console.log(fails?'FAILED '+fails:'all passed'); await b.close(); process.exit(fails?1:0); })();
