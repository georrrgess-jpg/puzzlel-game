// v18.15 UI polish (src/v17/99_ui.js, 99_ui.css): the top bar fits every width from 320 to 1920 px with any Play label (no
// sideways page scroll, Play and Settings on screen), phone is one header row; search collapses to an icon and expands on focus,
// "/" focuses it and Escape clears it; opening a page staggers in, re-rendering the same page does not replay it; a menu closes
// after a pick; the phone side menu closes on a tap outside and on Escape; modals leave with a short exit and then close; toasts
// dismiss on tap; a back-to-top button shows on long pages; empty states carry an icon; phone standings keep Pts on screen.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async vw=>{ const page=await b.newPage({viewport:vw}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','UI Coach'); await page.fill('#nc-seed','ui1815');
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const page=await mk({width:1366,height:860});

  /* the top bar fits */
  const bad=[]; let phoneH=0;
  for(const label of ['Play preseason game','Play Sectional Final vs Long Town','Start next season']){
    await page.evaluate(l=>{ window.__pl=l; playLabel=()=>window.__pl; render(); },label);
    for(const w of [320,360,390,480,640,800,900,901,1000,1100,1180,1221,1280,1340,1366,1440,1480,1536,1600,1700,1920]){ await page.setViewportSize({width:w,height:860});
      const r=await page.evaluate(()=>{ const g=document.querySelector('.tn-gear'); const c=document.querySelector('.cta'); const h=document.querySelector('header.top'); return {sw:document.documentElement.scrollWidth,hs:h.scrollWidth-h.clientWidth,h:Math.round(h.getBoundingClientRect().height),ctaR:Math.round(c.getBoundingClientRect().right),gearR:g&&getComputedStyle(g).display!=='none'?Math.round(g.getBoundingClientRect().right):0}; });
      if(r.sw>w||r.hs>1||r.ctaR>w||r.gearR>w) bad.push(label.slice(0,10)+'@'+w+' '+JSON.stringify(r)); if(w<=900) phoneH=Math.max(phoneH,r.h); } }
  ok(bad.length===0, 'the top bar fits every width from 320 to 1920 px with any Play label: no sideways scroll, Play and Settings on screen'+(bad.length?': '+bad.slice(0,3).join(' | '):''));
  ok(phoneH<=64, `phone keeps the top bar to one row (${phoneH} px)`);
  await page.evaluate(()=>{ playLabel=window.playLabel0||playLabel; }); await page.setViewportSize({width:1366,height:860}); await page.evaluate(()=>{ delete window.__pl; location.reload; });

  /* search */
  const S0=await page.evaluate(()=>Math.round(document.querySelector('#q').getBoundingClientRect().width));
  await page.mouse.move(10,400); await page.keyboard.press('/'); await page.waitForTimeout(350);
  const S1=await page.evaluate(()=>({focus:document.activeElement&&document.activeElement.id,w:Math.round(document.querySelector('#q').getBoundingClientRect().width)}));
  await page.keyboard.type('ja'); await page.waitForTimeout(300); const res=await page.evaluate(()=>document.querySelectorAll('#sres .sres button').length);
  await page.keyboard.press('Escape'); await page.waitForTimeout(350); const S2=await page.evaluate(()=>({v:document.querySelector('#q').value,focus:document.activeElement&&document.activeElement.id,w:Math.round(document.querySelector('#q').getBoundingClientRect().width),res:document.querySelectorAll('#sres .sres').length}));
  ok(S0<=44&&S1.focus==='q'&&S1.w>=300&&res>0, `search is an icon (${S0} px) that "/" focuses and opens (${S1.w} px, ${res} results)`);
  ok(S2.v===''&&S2.focus!=='q'&&S2.w<=44&&S2.res===0, 'Escape clears the search, closes the results and collapses it');

  /* views: stagger on open, nothing on a same-page render */
  const V=await page.evaluate(()=>{ App.route='league'; App.params={}; render(); const a=document.querySelector('#content').classList.contains('enter'); const anim=getComputedStyle(document.querySelector('#content').children[0]).animationName;
    App.params={tab:'leaders'}; render(); const c=document.querySelector('#content'); const b2=c.classList.contains('enter'); const anim2=getComputedStyle(c.children[0]).animationName; return {a,anim,b2,anim2}; });
  ok(V.a&&V.anim==='v1815in'&&!V.b2&&V.anim2==='none', `opening a page staggers in (${V.anim}); switching a tab on the same page does not replay it (${V.anim2})`);

  /* menus close after a pick */
  await page.evaluate(()=>{ App.route='office'; App.params={}; render(); }); await page.waitForTimeout(300);
  await page.hover('.tn-tab.has-dd:nth-child(4) .tn-btn'); await page.waitForTimeout(450);
  const M0=await page.evaluate(()=>getComputedStyle(document.querySelector('.tn-tab.has-dd:nth-child(4) .tn-dd')).visibility);
  await page.click('.tn-tab.has-dd:nth-child(4) .tn-dd [data-r="records"]'); await page.waitForTimeout(350);
  const M1=await page.evaluate(()=>({route:App.route,vis:getComputedStyle(document.querySelector('.tn-tab.has-dd:nth-child(4) .tn-dd')).visibility}));
  await page.mouse.move(700,600); await page.waitForTimeout(100); const M2=await page.evaluate(()=>document.body.classList.contains('v1815-ddshut'));
  ok(M0==='visible'&&M1.route==='records'&&M1.vis==='hidden'&&!M2, 'a menu opens on hover, closes after a pick (even with the pointer still on it) and works again once the pointer leaves');

  /* modal exit */
  await page.evaluate(()=>{ const C=App.C; const p=squad(C,C.userSid,'V')[0]; App.modal={type:'player',id:p.id}; render(); }); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(60); const X0=await page.evaluate(()=>({out:!!document.querySelector('.scrim.v1815-out'),open:!!document.querySelector('.modal')}));
  await page.waitForTimeout(260); const X1=await page.evaluate(()=>({modal:App.modal,dom:!!document.querySelector('.modal')}));
  ok(X0.out&&X0.open&&X1.modal===null&&!X1.dom, 'a modal plays a short exit, then closes');
  const RE=await page.evaluate(()=>{ const C=App.C; const p=squad(C,C.userSid,'V')[0]; App.modal={type:'player',id:p.id}; render(); renderModal(); const sc=document.querySelector('.scrim'); return getComputedStyle(sc.querySelector('.modal')).animationName; });
  ok(RE==='none', 'redrawing the same modal does not replay its pop');
  await page.evaluate(()=>{ App.modal=null; render(); });

  /* toast */
  await page.evaluate(()=>toast('Hello from the test')); await page.waitForTimeout(500); await page.click('#toast'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>document.getElementById('toast').hidden), 'a toast dismisses on tap');

  /* back to top */
  await page.evaluate(()=>{ App.route='squads'; App.params={}; render(); window.scrollTo(0,2400); }); await page.waitForTimeout(400);
  const T0=await page.evaluate(()=>document.getElementById('v1815-top').classList.contains('on')&&window.scrollY>900);
  await page.click('#v1815-top'); await page.waitForTimeout(1200); const T1=await page.evaluate(()=>({y:window.scrollY,on:document.getElementById('v1815-top').classList.contains('on')}));
  ok(T0&&T1.y<50&&!T1.on, 'a back-to-top button appears on a long page and takes you up');

  /* empty states */
  const E=await page.evaluate(()=>{ App.route='tourneys'; App.params={}; render(); const e=document.querySelector('#content div.empty'); if(!e) return null; const s=getComputedStyle(e,'::before'); return {img:s.backgroundImage.indexOf('svg')>0,w:s.width}; });
  ok(E&&E.img&&E.w==='46px', 'empty states carry an icon');

  /* phone */
  const ph=await mk({width:390,height:844});
  const P=await ph.evaluate(()=>{ App.route='league'; App.params={}; render(); const t=document.querySelector('.view-league .tw table'); const pts=[...t.querySelectorAll('thead th')].find(th=>th.textContent==='Pts'); const r=pts.getBoundingClientRect(); return {right:Math.round(r.right),fits:t.getBoundingClientRect().width<=t.parentElement.getBoundingClientRect().width+1}; });
  ok(P.fits&&P.right<=390, `phone standings keep Pts on screen (${P.right} px)`);
  await ph.click('[data-a="burger"]'); await ph.waitForTimeout(400); const D0=await ph.evaluate(()=>document.body.classList.contains('navopen'));
  await ph.mouse.click(370,420); await ph.waitForTimeout(350); const D1=await ph.evaluate(()=>document.body.classList.contains('navopen'));
  await ph.click('[data-a="burger"]'); await ph.waitForTimeout(300); await ph.keyboard.press('Escape'); await ph.waitForTimeout(300); const D2=await ph.evaluate(()=>document.body.classList.contains('navopen'));
  ok(D0&&!D1&&!D2, 'the phone side menu closes on a tap outside it and on Escape');
  await ph.click('#q'); await ph.waitForTimeout(350); const Q=await ph.evaluate(()=>{ const r=document.querySelector('#q').getBoundingClientRect(); return {l:Math.round(r.left),w:Math.round(r.width)}; });
  ok(Q.w>=340&&Q.l>=0, `phone search opens across the top bar (${Q.w} px)`);
  const routes=await ph.evaluate(()=>Object.keys(VIEWS).filter(r=>!/lab|sandbox|anim|test|wrapped/.test(r))); const wide=[];
  for(const r of routes){ const sw=await ph.evaluate(r=>{ App.route=r; App.params={}; App.modal=null; render(); return document.documentElement.scrollWidth; },r); if(sw>390) wide.push(r+':'+sw); }
  ok(wide.length===0, `no page scrolls sideways on a phone (${routes.length} pages)`+(wide.length?': '+wide.join(', '):''));
  require('fs').mkdirSync(__dirname+'/shots/ui19/after',{recursive:true}); await ph.evaluate(()=>{ App.route='league'; render(); }); await ph.waitForTimeout(500); await ph.screenshot({path:__dirname+'/shots/ui19/after/league_p.png'});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
