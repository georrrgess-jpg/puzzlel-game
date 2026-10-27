// v18.17 phase 2: the Overview, decluttered (src/v17/9e_overview.js). The top row is unchanged (school, Starting XI, next match);
// "This week" holds the coach's decisions and the mailbox letter (the school card no longer carries them); the State Poll and
// Gameday Graphics sit side by side; "Around the program" is one card with tabs that switch in place and are remembered;
// Customize overview is still there; the page is much shorter; phones never scroll sideways; menus are grouped with labels,
// "More" is "Stories", and every page is still in a menu.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Ov Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);
    await page.evaluate(()=>{ const C=App.C; for(let i=0;i<6;i++){ simRound(C); advance(C); } App.route='office'; App.params={}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(600); return page; };
  const page=await mk('ov-t1');
  const L=await page.evaluate(()=>{ const g=document.querySelector('.ov-grid.v1817o-grid'); const r=s=>{ const e=document.querySelector(s); return e?e.getBoundingClientRect():null; };
    const t=r('.ov-team'), x=r('.ov-xi'), m=r('.ov-match'), w=r('.v1817o-week');
    return {grid:!!g,row:!!(t&&x&&m&&Math.abs(t.top-x.top)<2&&Math.abs(x.top-m.top)<2&&t.left<x.left&&x.left<m.left),below:!!(w&&w.top>m.bottom),
      dec:!document.querySelector('.ov-team .tc-dec'),items:document.querySelectorAll('.v1817o-week .dec').length,mail:!!document.querySelector('.v1817o-week .v1817o-mail[data-a="v1816Open"]'),oldMail:!!document.querySelector('.v1816-ovmail')}; });
  ok(L.grid&&L.row&&L.below, 'the top row is unchanged (school, Starting XI, next match) and "This week" sits right under it');
  ok(L.dec&&L.items>=2&&L.mail&&!L.oldMail, `"This week" holds the coach's decisions and the mailbox letter (${L.items} items); the school card no longer carries them`);
  await page.click('.v1817o-week .v1817o-mail'); await page.waitForTimeout(400); const M=await page.evaluate(()=>App.modal&&App.modal.type); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(M==='v1816mail', 'a "This week" item does what it says (the letter opens)');
  const S=await page.evaluate(()=>{ const p=document.querySelector('.v1817o-spot .v1812p-ovcard'), g=document.querySelector('.v1817o-spot .v1812g-off'); if(!p||!g) return null; const a=p.getBoundingClientRect(), c=g.getBoundingClientRect(); return {side:Math.abs(a.top-c.top)<2&&a.right<=c.left+1,w:Math.round(a.width/(a.width+c.width)*100)}; });
  ok(S&&S.side, `the State Poll and Gameday Graphics sit side by side (${S&&S.w}% / ${S&&100-S.w}%)`);
  const F=await page.evaluate(()=>{ const f=document.querySelector('.v1817o-feed'); const tabs=[...f.querySelectorAll('.v1817o-tabs button')]; const panels=[...f.querySelectorAll('.v1817o-panel')]; return {tabs:tabs.length,panels:panels.length,visible:panels.filter(p=>!p.hidden).length,cust:!!f.querySelector('[data-a="panelsOpen"]'),old:!!document.querySelector('.ov-more'),keys:tabs.map(t=>t.dataset.k)}; });
  ok(F.tabs>=5&&F.tabs===F.panels&&F.visible===1&&F.cust&&!F.old, `"Around the program" is one card with ${F.tabs} tabs, one panel showing, Customize overview kept`);
  const k=F.keys[2]; await page.click(`.v1817o-tabs [data-k="${k}"]`); await page.waitForTimeout(300);
  const T1=await page.evaluate(k=>{ const p=[...document.querySelectorAll('.v1817o-panel')].filter(x=>!x.hidden); return p.length===1&&p[0].dataset.k===k; },k);
  await page.evaluate(()=>{ App.route='league'; render(); App.route='office'; render(); }); await page.waitForTimeout(300);
  const T2=await page.evaluate(k=>{ const p=[...document.querySelectorAll('.v1817o-panel')].filter(x=>!x.hidden); return p.length===1&&p[0].dataset.k===k&&document.querySelector('.v1817o-tabs .on').dataset.k===k; },k);
  ok(T1&&T2, 'a tab switches the panel in place and is remembered when you come back');
  const H=await page.evaluate(()=>document.documentElement.scrollHeight);
  ok(H<2300, `the Overview is much shorter (${H} px at 1440 wide; it was about 3000)`);
  const N=await page.evaluate(()=>{ const labs=[...document.querySelectorAll('.tn-tab .tn-btn span:not(.tn-caret)')].map(s=>s.textContent); const secs=document.querySelectorAll('.tn-dd .tn-sec').length;
    const inMenus=new Set(TOPNAV.flatMap(t=>t[3])); const missing=Object.keys(VIEWS).filter(r=>TITLES[r]&&!inMenus.has(r)&&!/lab|sandbox|anim|test|wrapped/.test(r)); const dup=TOPNAV.flatMap(t=>t[3]).length-inMenus.size; return {labs,secs,missing,dup}; });
  ok(N.labs.includes('Stories')&&!N.labs.includes('More')&&N.secs>=6&&N.dup===0&&N.missing.length===0, `menus are grouped with ${N.secs} labels, "More" is "Stories", every page is in exactly one menu${N.missing.length?' (missing: '+N.missing.join(', ')+')':''}`);
  for(const w of [1240,1100,900]){ await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(150); const sw=await page.evaluate(()=>document.documentElement.scrollWidth); if(sw>w) errs.push('overflow at '+w+': '+sw); }
  const ph=await mk('ov-t1',{width:390,height:844}); const P=await ph.evaluate(()=>({sw:document.documentElement.scrollWidth,order:['.ov-match','.v1817o-week','.ov-xi'].map(s=>Math.round(document.querySelector(s).getBoundingClientRect().top))}));
  ok(P.sw<=390&&P.order[0]<P.order[1]&&P.order[1]<P.order[2], `phone: nothing scrolls sideways; the next match, then "This week", then the XI (${P.sw} px)`);
  require('fs').mkdirSync(__dirname+'/shots/v1817',{recursive:true}); await page.setViewportSize({width:1440,height:900}); await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:__dirname+'/shots/v1817/overview_desk.png',fullPage:true}); await ph.screenshot({path:__dirname+'/shots/v1817/overview_phone.png',fullPage:true});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
