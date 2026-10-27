// v18.16 Family Ties (src/v17/9a_family*.js) and Quick Jump & Pins (9b_quickjump.js).
// Family: a new career seeds families at every league school and a legend at yours (Hall of Famer, number retired, father,
// little brother on your roster, a letter in the mailbox); relatives share a surname and a look, never a first name; the three
// answers do what they say (un-retire + faster growth + a shaky start that ends after 3 games / legacy patch that survives the
// off-season / keep it retired + prestige); each off-season brings brothers, cousins and sons of alumni to every school with
// numbers handed down; brothers who start together build chemistry; the screens (letter, Family Ties, profile strip, HoF wall,
// Overview card) render; it all survives a save and reload.
// Quick Jump: Ctrl K opens it, a search groups players / teams / pages / actions with the match highlighted, arrows + Enter open,
// Tab pins, ">" is actions only, Esc closes, G then a letter jumps; pins show in the Settings menu with a live line and a note,
// and survive a reload.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Fam Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const page=await mk('fam-t1');
  const S=await page.evaluate(()=>{ const C=App.C; const F=C.fam; const u=C.userSid; const m=F.mail[0]; const kid=m&&C.players[m.pid]; const leg=m&&F.elders[m.of]; const fam=kid&&v1816Fam(C,kid.id);
    const r={schools:C.league.filter(s=>Object.values(F.fams).some(f=>f.sid===s&&f.mem.length>1)).length,user:C.league.length};
    r.legend=!!(leg&&leg.legend&&kid&&kid.sid===u&&kid.ln===leg.ln&&(C.retired[u]||[]).some(x=>x.num===m.num&&x.pid===leg.id)&&!schoolPlayers(C,u).some(p=>p.num===m.num)&&m.status==='open');
    r.tree=fam?v1816Tree(C,fam.id).map(g=>g.ids.length).join(','):''; r.dad=fam&&fam.mem.some(id=>F.elders[id]&&F.elders[id].role==='father');
    let same=true, look=true, names=true; for(const f of Object.values(F.fams)){ const ps=f.mem.map(id=>v1816Person(C,id)).filter(Boolean); const fn=ps.map(p=>p.fn); if(new Set(fn).size!==fn.length) names=false;
      for(const id of f.mem){ const L=F.links[id]; if(!L||!L.of) continue; const p=C.players[id]; const R=v1816Person(C,L.of); if(!p||!R) continue; if(L.rel!=='cousin'&&p.ln!==R.ln) same=false; const a=lookOf(p), bb=lookOf(R.elder?{id:R.id,grade:12,look:R.look}:R); if(a.skin!==bb.skin) look=false; } }
    r.same=same; r.look=look; r.names=names; r.mid=m&&m.id; r.num=m&&m.num; r.kid=kid&&kid.id; return r; });
  console.log(JSON.stringify(S));
  ok(S.schools>=5, `families at ${S.schools} of the ${S.user} league schools from the start`);
  ok(S.legend&&S.dad&&/^1,2|^1,1,1|^1,/.test(S.tree), `your school's legend: a Hall of Famer with #${S.num} retired, his father, his little brother on your roster and a letter waiting (tree ${S.tree})`);
  ok(S.same&&S.look&&S.names, 'relatives share a surname (cousins sometimes not) and a look, and never a first name');

  /* screens */
  const U=await page.evaluate(mid=>{ const C=App.C; App.route='office'; App.params={}; render(); const ov=!!document.querySelector('.v1816-ovmail');
    App.modal={type:'v1816mail',id:mid}; renderModal(); const md={cards:document.querySelectorAll('.modal .v1816-fc').length,opts:document.querySelectorAll('.modal .v1816-opt').length,paper:/wore \d+/.test((document.querySelector('.v1816-paper')||{}).textContent||''),meters:document.querySelectorAll('.modal .v1816-mt').length};
    App.modal=null; renderModal(); App.route='families'; render(); const pg={trees:document.querySelectorAll('.v1816-tree').length,pairs:document.querySelectorAll('.v1816-pair').length,around:document.querySelectorAll('.v1816-around li').length};
    App.route='hof'; render(); const wall=!!document.querySelector('.v1816-wall .v1816-fc');
    const kid=C.fam.mail[0].pid; App.route='office'; render(); App.modal={type:'player',id:kid}; renderModal(); const strip=document.querySelectorAll('.modal .v1816-pstrip .v1816-chip').length; App.modal=null; renderModal();
    const nav=!!document.querySelector('[data-r="families"]')||NAV.some(n=>n[0]==='families'); return {ov,md,pg,wall,strip,nav}; },S.mid);
  console.log(JSON.stringify(U));
  ok(U.ov&&U.md.cards>=3&&U.md.opts===3&&U.md.paper&&U.md.meters===3, 'the Overview shows the letter; the mailbox has the family tree, the handwritten note, three choices and the legacy pressure meters');
  ok(U.pg.trees>=1&&U.pg.around>=3&&U.wall&&U.strip>=2&&U.nav, `Family Ties page (${U.pg.trees} trees, ${U.pg.pairs} pairs, ${U.pg.around} families around the league), HoF family wall, profile family strip, nav entry`);

  /* answer: let him wear it */
  const W=await page.evaluate(({mid,kid,num})=>{ const C=App.C; const p=C.players[kid]; const o0=ovr(p), g0=p.plan.gain; document.querySelector('body'); App.modal={type:'v1816mail',id:mid}; renderModal(); document.querySelector(`[data-a="v1816Pick"][data-c="wear"]`).click();
    const r={num:p.num===num,unret:!(C.retired[C.userSid]||[]).some(x=>x.num===num),gain:p.plan.gain/g0,drop:Math.round((ovr(p)-o0)*10)/10,shaky:C.fam.fx[kid].shaky&&C.fam.fx[kid].shaky.left,m:{...C.fam.meters[kid]},done:C.fam.mail[0].status};
    const lvl=p.lvl; let g=0; while(C.fam.fx[kid].shaky&&g++<60){ simRound(C); advance(C); } r.back=Math.round((ovr(p)-o0)*10)/10; r.after=!C.fam.fx[kid].shaky;
    App.modal=null; renderModal(); App.route='hof'; render(); r.note=/un-retired/.test(document.querySelector('.v1816-retnote')?.textContent||''); return r; },S);
  console.log(JSON.stringify(W));
  ok(W.done==='done'&&W.num&&W.unret&&W.gain>1.2&&W.drop<=-2.9, `"Let him wear it": he wears #${S.num}, the number comes off the wall, he grows faster (x${W.gain.toFixed(2)}) and starts shaky (${W.drop})`);
  ok(W.after&&W.back>-0.5, `the shaky start ends after three games (${W.back} from where he started)`);
  ok(W.m.sup>54&&W.m.team<71&&W.note, 'your support rises, the old guard grumbles, and the Hall of Fame notes the un-retired number');

  /* seasons: arrivals everywhere, chemistry, handed-down numbers */
  const A=await page.evaluate(()=>{ const C=App.C; const F=C.fam; const r={chem:0,yrs:[]}; for(let y=0;y<3;y++){ let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } r.chem=Math.max(r.chem,Object.values(F.chem).reduce((a,v)=>Math.max(a,v),0)); const before=Object.keys(F.links).length; rollover(C); r.yrs.push(Object.keys(F.links).length-before); }
    const arr=Object.entries(F.links).filter(([id,L])=>C.players[id]&&C.players[id].joined>2026&&L.of); r.rel=[...new Set(arr.map(([,L])=>L.rel))].sort().join(',');
    r.schools=new Set(arr.map(([id])=>C.players[id].sid)).size; r.together=v1816Pairs(C).filter(x=>C.players[x.o].sid!==C.userSid).length;
    r.handed=arr.filter(([id,L])=>{ const R=v1816Person(C,L.of); return R&&R.num===C.players[id].num; }).length; r.news=C.news.filter(n=>n.type==='family').length; return r; });
  console.log(JSON.stringify(A));
  ok(A.yrs.every(n=>n>=2)&&A.schools>=5&&A.together>=3, `every off-season new relatives arrive (${A.yrs.join(', ')}) at ${A.schools} schools; ${A.together} brother pairs share a roster at other schools`);
  ok(/brother/.test(A.rel)&&/son/.test(A.rel), `brothers, sons of alumni${/cousin/.test(A.rel)?' and cousins':''} (${A.rel}); ${A.handed} took a handed-down number; the Newswire carries ${A.news} family stories`);
  ok(A.chem>=3, `brothers who start together build chemistry (best pair this season: +${A.chem})`);

  /* the other two answers */
  const P2=await mk('fam-t2'); const PT=await P2.evaluate(()=>{ const C=App.C; const m=C.fam.mail[0]; const p=C.players[m.pid]; const pres=C.schools[C.userSid].prestige; v1816Choose(C,m.id,'patch');
    const r={wears:p.num===m.num,still:(C.retired[C.userSid]||[]).some(x=>x.num===m.num),pres:C.schools[C.userSid].prestige-pres};
    let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } rollover(C); r.kept=C.players[p.id]&&C.players[p.id].num===m.num; return r; });
  ok(PT.wears&&PT.still&&PT.pres===-2&&PT.kept, '"Patch and ceremony": he wears the number with a patch, it stays retired, the date costs prestige, and he keeps it through the off-season');
  const P3=await mk('fam-t3'); const KT=await P3.evaluate(()=>{ const C=App.C; const m=C.fam.mail[0]; const p=C.players[m.pid]; const pres=C.schools[C.userSid].prestige; const g0=p.plan.gain; v1816Choose(C,m.id,'keep'); return {num:p.num!==m.num,pres:C.schools[C.userSid].prestige-pres,slow:p.plan.gain<g0}; });
  ok(KT.num&&KT.pres===2&&KT.slow, '"Keep it retired": his own number, prestige +2, a slower start');

  /* Quick Jump */
  await page.evaluate(()=>{ App.route='office'; App.params={}; render(); }); await page.waitForTimeout(300);
  await page.keyboard.press('Control+k'); await page.waitForTimeout(300); const ln=await page.evaluate(()=>{ const C=App.C; return C.players[C.fam.mail[0].pid].ln; });
  await page.keyboard.type(ln.slice(0,4)); await page.waitForTimeout(250);
  const Q1=await page.evaluate(()=>({open:V1816Q.open,heads:[...document.querySelectorAll('.v1816q-h')].map(x=>x.textContent),hl:!!document.querySelector('.v1816q-r mark'),first:V1816Q.items[0]&&V1816Q.items[0].k}));
  ok(Q1.open&&Q1.hl&&Q1.heads[0]==='Players'&&Q1.first==='player', `Ctrl K opens Quick Jump; a search groups results (${Q1.heads.join(', ')}) with the match highlighted`);
  await page.keyboard.press('Tab'); await page.waitForTimeout(150); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const Q2=await page.evaluate(()=>({open:V1816Q.open,modal:App.modal&&App.modal.type,pins:App.C.qj.pins.map(p=>p.k)}));
  ok(!Q2.open&&Q2.modal==='player'&&Q2.pins[0]==='player', 'Tab pins the highlighted player; arrows move; Enter opens his profile and closes Quick Jump');
  await page.evaluate(()=>{ App.modal=null; renderModal(); }); await page.keyboard.press('Control+k'); await page.waitForTimeout(200); await page.keyboard.type('>sim'); await page.waitForTimeout(200);
  const Q3=await page.evaluate(()=>V1816Q.items.every(x=>x.k==='action')&&V1816Q.items.length>=1); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const Q4=await page.evaluate(()=>!V1816Q.open&&!document.querySelector('.v1816q-box'));
  ok(Q3&&Q4, '">" shows actions only; Esc closes');
  await page.keyboard.press('g'); await page.keyboard.press('p'); await page.waitForTimeout(400); const g=await page.evaluate(()=>App.route);
  ok(g==='statepoll', `G then P jumps to the State Poll (${g})`);
  await page.evaluate(()=>{ App.route='office'; render(); }); await page.hover('.tn-gear .tn-btn'); await page.waitForTimeout(450);
  const G=await page.evaluate(()=>({pins:document.querySelectorAll('.tn-gear .v1816q-pin').length,live:(document.querySelector('.tn-gear .v1816q-pin small')||{}).textContent||'',qj:!!document.querySelector('.tn-gear [data-a="v1816qOpen"]')}));
  ok(G.pins===1&&/OVR/.test(G.live)&&G.qj, `the pin shows in the Settings menu on every screen with a live line ("${G.live}")`);
  await page.fill('.tn-gear .v1816q-note','Try him at left wing'); await page.waitForTimeout(700);
  const R=await page.evaluate(()=>{ const C=App.C; const raw=JSON.parse(JSON.stringify(careerForSave(C))); const M=migrate(raw); return {note:M.qj&&M.qj.note,pins:M.qj&&M.qj.pins.length,fam:M.fam&&Object.keys(M.fam.fams).length===Object.keys(C.fam.fams).length,mail:M.fam&&M.fam.mail.length}; });
  ok(R.note==='Try him at left wing'&&R.pins===1&&R.fam&&R.mail>=1, 'pins, the coach’s note and every family survive a save and reload');

  /* phone */
  const ph=await mk('fam-t1',{width:390,height:844}); await ph.click('#q'); await ph.waitForTimeout(300); await ph.keyboard.type('lineup'); await ph.waitForTimeout(250);
  const PH=await ph.evaluate(()=>({open:V1816Q.open,sw:document.documentElement.scrollWidth,first:V1816Q.items[0]&&V1816Q.items[0].title}));
  ok(PH.open&&PH.sw<=390&&/Lineup/.test(PH.first||''), `on a phone the search icon opens Quick Jump and it fits (${PH.first})`);
  const mailPh=await ph.evaluate(()=>{ ph=0; const C=App.C; App.modal={type:'v1816mail',id:C.fam.mail[0].id}; renderModal(); return document.documentElement.scrollWidth; }).catch(()=>0);
  require('fs').mkdirSync(__dirname+'/shots/v1816',{recursive:true}); await ph.keyboard.press('Escape'); await ph.evaluate(()=>{ const C=App.C; App.modal={type:'v1816mail',id:C.fam.mail[0].id}; renderModal(); }); await ph.waitForTimeout(500); await ph.screenshot({path:__dirname+'/shots/v1816/mail_phone.png'});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
