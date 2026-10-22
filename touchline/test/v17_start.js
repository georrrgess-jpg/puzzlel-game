/* v17 start screen (ANIMATION_PLAN Phase 1 step 1): the parade is a cached canvas strip (no live SVG filters), every running
   animation on the start screen moves only transform/opacity, nothing that sits over the demo canvas carries a filter, blend or
   backdrop blur, the strip is reused on re-render, and reduced motion stops the parade, the beam sway and the glint.
   node test/v17_start.js   (exit 1 on any failure) */
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
/* runs in the page before the app: start on the menu (no auto-open of the last career), optionally with the in-game reduced-motion setting */
const noSlot=rm=>{ try{ const k='touchline.prefs.v2'; const p=JSON.parse(localStorage.getItem(k)||'{}'); p.lastSlot=null; p.rm=!!rm; localStorage.setItem(k,JSON.stringify(p)); }catch(e){} };
const audit=()=>{ const start=document.getElementById('start'); const inStart=e=>e&&start.contains(e);
  const bad=[]; for(const a of document.getAnimations()){ const el=a.effect&&a.effect.target; if(!inStart(el)) continue;
    for(const kf of a.effect.getKeyframes()) for(const p of Object.keys(kf)) if(!['offset','easing','composite','computedOffset','transform','opacity'].includes(p)) bad.push((a.animationName||a.transitionProperty||'?')+':'+p); }
  const moving=document.getAnimations().filter(a=>inStart(a.effect&&a.effect.target)&&a.playState==='running').map(a=>a.effect.target);
  const fx=[...start.querySelectorAll('*')].filter(e=>{ const s=getComputedStyle(e); return e.getClientRects().length&&(s.backdropFilter!=='none'||(s.webkitBackdropFilter&&s.webkitBackdropFilter!=='none')||s.mixBlendMode!=='normal'); }).map(e=>e.className);
  const movingFx=moving.filter(e=>{ const s=getComputedStyle(e); return s.filter!=='none'; }).map(e=>e.className);
  return {bad:[...new Set(bad)], fx, movingFx, filters:document.querySelectorAll('filter').length}; };
(async()=>{ const browser=await chromium.launch(); const errs=[];
  /* 1. fresh start screen, desktop */
  let ctx=await browser.newContext({viewport:{width:1440,height:900}}); let page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(noSlot,false); await page.goto(DIST);
  await page.waitForFunction(()=>document.querySelector('.v17-parade.v17-ready'),null,{timeout:8000}).catch(()=>{});
  let r=await page.evaluate(()=>({ready:!!document.querySelector('.v17-parade.v17-ready'), cells:document.querySelectorAll('.v17-parade .parade-in i').length, tiles:(document.getElementById('v17-pstrip')||{}).textContent?document.getElementById('v17-pstrip').textContent.split('data:image/png').length-1:0,
    anim:getComputedStyle(document.querySelector('.v17-parade .parade-in')).animationName, beam:getComputedStyle(document.querySelector('.beam.b1')).filter, glint:!!document.querySelector('.v17-glint'), shine:[...document.querySelectorAll('.logo-word:not(.v17-glint) span')].some(s=>/shine/.test(getComputedStyle(s).animationName))}));
  ok(r.ready,'parade strip is ready within 8 s'); ok(r.cells===72,'parade has 72 cells (2 x 36), got '+r.cells); ok(r.tiles===6,'strip is shown from 6 PNG tiles, got '+r.tiles);
  ok(r.anim==='v17parade','parade track runs the transform animation'); ok(r.beam==='none','beams carry no filter'); ok(r.glint&&!r.shine,'logo has the glint copy and no background-position shine');
  await page.waitForTimeout(1500); let a=await page.evaluate(audit);
  ok(a.filters===0,'no SVG <filter> on the fresh start screen, got '+a.filters); ok(!a.bad.length,'running start-screen animations only touch transform/opacity '+(a.bad.join(',')));
  ok(!a.fx.length,'no backdrop-filter or blend mode on the start screen '+a.fx.join(',')); ok(!a.movingFx.length,'no animated element carries a filter '+a.movingFx.join(','));
  const x1=await page.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('.v17-parade .parade-in')).transform).m41); await page.waitForTimeout(700);
  const x2=await page.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('.v17-parade .parade-in')).transform).m41); ok(x2<x1,'parade scrolls left ('+x1.toFixed(1)+' -> '+x2.toFixed(1)+')');
  /* 2. re-render reuses the cached strip */
  r=await page.evaluate(async()=>{ const t=v17ParadeStrip.tiles; await renderStart(); return {same:v17ParadeStrip.tiles===t, ready:!!document.querySelector('.v17-parade.v17-ready')}; });
  ok(r.same&&r.ready,'re-render reuses the strip and shows it at once');
  /* 3. with a saved career: card and hero mascots are images, still no filters */
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Strip'); await page.fill('#nc-seed','v17start'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
  await page.goto(DIST); await page.waitForFunction(()=>document.querySelector('.v17-parade.v17-ready'),null,{timeout:8000}).catch(()=>{}); await page.waitForTimeout(1800);
  a=await page.evaluate(audit); r=await page.evaluate(()=>({imgs:document.querySelectorAll('#start img.v17-mimg').length, hero:!!document.querySelector('.cont-hero')}));
  ok(r.hero&&r.imgs>=3,'career cards and hero use mascot images ('+r.imgs+')'); ok(a.filters===0,'no SVG <filter> with a saved career, got '+a.filters); ok(!a.bad.length&&!a.movingFx.length,'career start screen animations are compositor-only '+a.bad.join(',')+a.movingFx.join(','));
  await ctx.close();
  /* 4. phone */
  ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}); page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(noSlot,false); await page.goto(DIST); await page.waitForFunction(()=>document.querySelector('.v17-parade.v17-ready'),null,{timeout:8000}).catch(()=>{});
  r=await page.evaluate(()=>({dpr:v17ParadeStrip.dpr, sw:document.documentElement.scrollWidth})); ok(r.dpr===2,'phone strip drawn at devicePixelRatio 2'); ok(r.sw<=390,'no horizontal overflow on the phone ('+r.sw+')');
  await ctx.close();
  /* 5. reduced motion (the in-game setting) */
  ctx=await browser.newContext({viewport:{width:1440,height:900}}); page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(noSlot,true); await page.goto(DIST); await page.waitForTimeout(1500);
  r=await page.evaluate(()=>({rm:document.body.classList.contains('rm'), parade:getComputedStyle(document.querySelector('.v17-parade .parade-in')).animationName, beam:getComputedStyle(document.querySelector('.beam.b1')).animationName, glint:getComputedStyle(document.querySelector('.v17-glint')).display}));
  ok(r.rm&&r.parade==='none'&&r.beam==='none'&&r.glint==='none','reduced motion: no parade scroll, no beam sway, no glint '+JSON.stringify(r));
  await ctx.close();
  ok(!errs.length,'no page errors '+errs.join(' | '));
  await browser.close(); console.log(fails?fails+' failed':'all passed'); process.exit(fails?1:0); })();
