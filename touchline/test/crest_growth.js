// v18.17 phase 1: Crest Studio (src/v17/9c_crest*.js) and the Growth Chart (9d_growth.js).
// Crest: your school keeps the classic shield until edited; every other school (league and State Poll) wears a seeded design,
// the same every time; the studio sets shape / field / emblem / ribbon, Trim tidies the ribbon, typing updates the preview with
// the cursor kept, Undo / Classic shield / Surprise me work; small crests drop the emblem, the ribbon shows from 64 px; every
// crest on a page has its own clip id; the PNG export is a real PNG; the design survives a save; the School page has the sign.
// Growth: every height on the page is a whole inch; "now + to go = projected" holds for every player; the curve passes through
// his height today and ends at his projected height; picking players and the level filter work; Player Development links in.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Crest Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const page=await mk('cg-t1');
  const D=await page.evaluate(()=>{ const C=App.C; const u=C.schools[C.userSid]; const o=C.schools[C.league.find(s=>s!==C.userSid)];
    const designs=C.league.filter(s=>s!==C.userSid).map(s=>v1817cSig(v1817cDef(C.schools[s]))); const vt=v1812pSchool(C,v1812pS(C).pool.teams[0].id);
    return {classic:!/v1817c/.test(crest(u,60)),other:/v1817c/.test(crest(o,60))||v1817cDef(o).fd==='classic',same:v1817cSig(v1817cDef(o))===v1817cSig(v1817cDef(o)),varied:new Set(designs).size,poll:!!v1817cDef(vt).sh};
  });
  ok(D.classic&&D.other&&D.same&&D.varied>=4&&D.poll, `your school keeps the classic shield; the other schools wear seeded designs (${D.varied} different among 7), the same every time; State Poll schools too`);
  await page.evaluate(()=>{ App.route='crest'; App.params={}; render(); }); await page.waitForTimeout(400);
  await page.click('[data-a="v1817Set"][data-k="sh"][data-v="hex"]'); await page.waitForTimeout(150);
  await page.click('[data-a="v1817Set"][data-k="fd"][data-v="chevron"]'); await page.waitForTimeout(150);
  const em=await page.evaluate(()=>{ const C=App.C; const u=C.schools[C.userSid]; return MASCOT_KEYS.find(k=>k!==u.mk); });
  await page.click(`[data-a="v1817Set"][data-k="em"][data-v="${em}"]`); await page.waitForTimeout(150);
  await page.fill('#v1817-rb','  est   1962!! '); await page.click('[data-a="v1817Trim"]'); await page.waitForTimeout(250);
  const S=await page.evaluate(()=>{ const u=App.C.schools[App.C.userSid]; return {c:{...u.crest},big:document.querySelector('#v1817-big').textContent,on:document.querySelectorAll('.v1817-opt.on').length,mascot:u.mk}; });
  ok(S.c.sh==='hex'&&S.c.fd==='chevron'&&S.c.em===em&&S.c.rb==='EST 1962'&&/EST 1962/.test(S.big)&&S.on===3&&S.mascot!==em, `the studio sets shape, field, emblem and ribbon (Trim gives "${S.c.rb}"); the school's mascot is untouched`);
  await page.click('#v1817-rb'); await page.keyboard.press('End'); await page.keyboard.type(' A'); await page.waitForTimeout(200);
  const T=await page.evaluate(()=>({focus:document.activeElement&&document.activeElement.id,big:document.querySelector('#v1817-big').textContent,score:!!document.querySelector('#v1817-live .v1817-sb .crest')}));
  ok(T.focus==='v1817-rb'&&/EST 1962 A/.test(T.big)&&T.score, 'typing in the ribbon updates the crest and the previews while the cursor stays');
  await page.click('[data-a="v1817Undo"]'); await page.waitForTimeout(200); const U1=await page.evaluate(()=>App.C.schools[App.C.userSid].crest.rb);
  await page.click('[data-a="v1817Surprise"]'); await page.waitForTimeout(200); const U2=await page.evaluate(()=>v1817cDef(App.C.schools[App.C.userSid]).fd);
  await page.click('[data-a="v1817Reset"]'); await page.waitForTimeout(200); const U3=await page.evaluate(()=>!App.C.schools[App.C.userSid].crest);
  ok(U1==='EST 1962'&&U2!=='classic'&&U3, 'Undo steps back, Surprise me picks a new design, Classic shield resets');
  const Z=await page.evaluate(()=>{ const C=App.C; const u=C.schools[C.userSid]; u.crest={sh:'round',fd:'split',em:u.mk,rb:'EST 1901'}; const sz={}; for(const n of [16,22,27,28,40,63,64,120,300]){ const h=crest(u,n); sz[n]={em:/translate\(1[378] /.test(h),rb:/EST 1901/.test(h)}; } return sz; });
  ok(!Z[16].em&&!Z[27].em&&Z[28].em&&Z[40].em&&!Z[63].rb&&Z[64].rb&&Z[300].rb, 'small crests drop the emblem (under 28 px) and keep the shape and field; the ribbon shows from 64 px');
  const I=await page.evaluate(()=>{ const bad=[]; for(const r of ['schedule','statepoll','crest','matchday','school']){ App.route=r; App.params={}; render(); const ids=[...document.querySelectorAll('clipPath')].map(c=>c.id); const dup=ids.length-new Set(ids).size; if(dup) bad.push(r+':'+dup); } return bad; });
  ok(I.length===0, 'every crest on a page has its own clip id'+(I.length?': '+I.join(', '):''));
  const P=await page.evaluate(async()=>{ const b=await v1817sPngBlob(App.C.schools[App.C.userSid],512); if(!b) return null; const a=new Uint8Array(await b.slice(0,8).arrayBuffer()); return {type:b.type,size:b.size,sig:[...a.slice(1,4)].map(c=>String.fromCharCode(c)).join('')}; });
  ok(P&&P.type==='image/png'&&P.sig==='PNG'&&P.size>2000, `the crest saves as a PNG (${P&&P.size} bytes)`);
  const R=await page.evaluate(()=>{ const C=App.C; const M=migrate(JSON.parse(JSON.stringify(careerForSave(C)))); App.route='school'; render(); return {saved:M.schools[C.userSid].crest&&M.schools[C.userSid].crest.sh==='round',sign:!!document.querySelector('.v1817-gate .v1817-sign .crest')}; });
  ok(R.saved&&R.sign, 'the design survives a save and reload; School & Stadium shows the "Home of the ..." sign');

  /* growth */
  await page.evaluate(()=>{ App.route='growth'; App.params={}; render(); }); await page.waitForTimeout(400);
  const G=await page.evaluate(()=>{ const C=App.C; const txt=document.querySelector('.v1817g').textContent; const dec=/\d+'\d+\.\d|\+\d+\.\d/.test(txt);
    const ft=s=>{ const m=/(\d)'(\d+)"/.exec(s); return m?(+m[1])*12+(+m[2]):null; }; let sum=true; const rows=[...document.querySelectorAll('.v1817g-row small')].map(x=>x.textContent);
    for(const t of rows){ const m=/^(\d'\d+") now · (\d'\d+") projected(?: · \+(\d+) in to go)?/.exec(t); if(!m){ sum=false; continue; } const n=ft(m[1]), p=ft(m[2]), g=m[3]?+m[3]:0; if(n+g!==p&&!(g===0&&p-n<=0)) sum=false; }
    const ids=v1817gSel(C); let curve=true; for(const id of ids){ const p=C.players[id]; if(Math.abs(v1817gH(p,p.age)-p.h)>1e-6||Math.abs(v1817gH(p,21)-p.ah)>0.01) curve=false; }
    const ends=[...document.querySelectorAll('.v1817g-end')].map(x=>x.textContent).sort().join(','), exp=ids.map(id=>v1817gFt(C.players[id].ah)).sort().join(',');
    return {dec,sum,rows:rows.length,curve,ends:ends===exp,lines:document.querySelectorAll('.v1817g-m').length,ids:ids.length}; });
  ok(!G.dec&&G.sum&&G.rows>=5, `every height is a whole inch, and now + to go = projected for all ${G.rows} players in Growth Watch`);
  ok(G.curve&&G.ends&&G.lines===G.ids&&G.ids===5, 'each curve passes through his height today and ends at his projected adult height (the labels match)');
  const first=await page.evaluate(()=>v1817gSel(App.C)[0]); await page.click(`.v1817g-row[data-id="${first}"]`); await page.waitForTimeout(250);
  const G2=await page.evaluate(id=>({n:v1817gSel(App.C).length,has:v1817gSel(App.C).includes(id)}),first);
  await page.click('.v1817g-side .seg button:nth-child(2)'); await page.waitForTimeout(250);
  const G3=await page.evaluate(()=>{ const C=App.C; return {lvl:App.params.gl,allV:v1817gSel(C).every(id=>C.players[id].lvl==='V'),rows:[...document.querySelectorAll('.v1817g-row')].every(r=>C.players[r.dataset.id].lvl==='V')}; });
  ok(G2.n===4&&!G2.has&&G3.lvl==='V'&&G3.allV&&G3.rows, 'tapping a player takes him off the chart; the Varsity filter narrows Growth Watch and the chart');
  const DV=await page.evaluate(()=>{ App.route='dev'; App.params={}; render(); return !!document.querySelector('.v1817g-cta[data-r="growth"]'); });
  ok(DV, 'Player Development links to the Growth Chart');
  const ph=await mk('cg-t1',{width:390,height:844}); const PW=await ph.evaluate(()=>{ const out={}; for(const r of ['crest','growth']){ App.route=r; App.params={}; render(); out[r]=document.documentElement.scrollWidth; } return out; });
  ok(PW.crest<=390&&PW.growth<=390, `both fit a phone (${JSON.stringify(PW)})`);
  require('fs').mkdirSync(__dirname+'/shots/v1817',{recursive:true}); await ph.evaluate(()=>{ App.route='crest'; render(); }); await ph.waitForTimeout(400); await ph.screenshot({path:__dirname+'/shots/v1817/crest_phone.png',fullPage:true});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
