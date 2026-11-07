// v18.21 Practice Planner (src/v17/9n_practice*.js).
// Growth multipliers per intensity and level, the back-to-back Intense penalty (and the open-week reset), form deltas reaching
// M.sides[i].home, session effects (Technical / Conditioning focus, Tactical form, Scrimmage for Varsity + JV non-starters,
// the weekly cap), postseason weeks form only, the plan frozen at kick-off, defaults and overrides through save/reload, old
// saves, CPU parity, the balance table (growth and results per policy) with the win% trade-off, Light before big games,
// determinism, and the UI (tab, badge, Overview chip and This week item, match preview control) on desktop and phone.
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const OUT=__dirname+'/shots/v1821'; fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const LVLS=['V','JV','MOD']; const SEEDS=Array.from({length:20},(_,i)=>String(31+i));
(async()=>{ const b=await chromium.launch(); const errs=[]; const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Practice Coach'); await page.fill('#nc-seed','prac-t1');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900);

  /* ---------- multipliers, form, sessions ---------- */
  const U=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; let g=0; while(!(C.phase==='regular'&&C.md>=3)&&g++<40){ simRound(C); advance(C); }
    const Y=v1821tY(C); const wk='R'+C.md; const r={};
    const st=l=>{ const lu=getLu(C,u,l); const ids=new Set(lu.slots.map(s=>s.pid)); const ps=squad(C,u,l).filter(p=>p.plan&&p.pot>ovr(p)); return {s:ps.find(p=>ids.has(p.id)),b:ps.find(p=>!ids.has(p.id))}; };
    const part=(p,ctx)=>{ const M=v1821dMult(C,p,ctx||'tick'); const x=M.parts.find(q=>q.k==='prac'); return x?Math.round(x.m*1000)/1000:1; };
    const set=(l,i,s,w)=>{ (Y.ov[w||wk]||(Y.ov[w||wk]={}))[l]={i,s}; };
    r.g={}; for(const l of LVLS){ const P=st(l); r.g[l]={}; for(const i of ['light','std','int']){ set(l,i,'tech'); r.g[l][i]=[part(P.s),part(P.b)]; } set(l,'int','tech'); r.g[l].off=part(P.s,'off'); delete Y.ov[wk]; }
    /* scrimmage: V + JV non-starters +5%, starters unchanged, Intense + Scrimmage capped at x1.2, MOD cannot scrimmage */
    const V=st('V'), J=st('JV'), Mo=st('MOD'); set('V','std','scrim'); set('JV','std','scrim'); set('MOD','std','scrim');
    r.scrim={vS:part(V.s),vB:part(V.b),jB:part(J.b),mod:v1821tUserPlan(C,'MOD',wk).s}; set('V','int','scrim'); r.scrim.cap=part(V.b);
    set('V','std','scrim'); set('JV','std','tech'); r.scrim.half=part(V.b); delete Y.ov[wk];
    /* focus: Technical -> passing / finishing, Conditioning -> stamina / pace, nothing with a set training focus or for keepers */
    const mid=squad(C,u,'V').find(p=>p.pos==='MID'), fwd=squad(C,u,'V').find(p=>p.pos==='FWD'), gk=squad(C,u,'V').find(p=>p.pos==='GK'); const t0=C.training; C.training='balanced';
    set('V','std','tech'); r.f={tm:v1821dFocus(C,mid,'balanced'),tf:v1821dFocus(C,fwd,'balanced'),gk:v1821dFocus(C,gk,'balanced')};
    set('V','std','cond'); r.f.cm=v1821dFocus(C,mid,'balanced'); r.f.cf=v1821dFocus(C,fwd,'balanced'); r.f.att=v1821dFocus(C,mid,'attacking');
    set('V','std','tac'); r.f.tac=v1821dFocus(C,mid,'balanced'); C.training=t0; delete Y.ov[wk];
    /* form: Intense -8, Light +6, Tactical +3, back to back -12, the open week resets legs */
    const fx=userFixture(C); const side=fx.h===u?0:1; const fo=()=>{ App.odds.clear(); const M=startMatch(C,fx.id,{fast:true}); return {d:M.sides[side].v1821dForm||0,home:M.sides[side].home,o:M.sides[1-side].v1821dForm||0}; };
    const at0=attendance(C,fx); const base=side===0?at0.home:0;
    set('V','int','tech'); const a=fo(); set('V','light','tech'); const bb=fo(); set('V','std','tac'); const c=fo(); set('V','light','tac'); const d=fo(); delete Y.ov[wk]; const e=fo();
    r.form={int:a.d,light:bb.d,tac:c.d,lt:d.d,none:e.d,homeOk:Math.abs(a.home-(base+a.d))<1e-9&&Math.abs(d.home-(base+d.d))<1e-9,opp:a.o,oppExp:v1821tFormOf(C,side?fx.h:fx.a,'V',wk)};
    const nx='R'+(C.md+1); set('V','int','tech'); set('V','int','tech',nx); r.b2b=[v1821tFormOf(C,u,'V',wk),v1821tFormOf(C,u,'V',nx),v1821tB2B(C,u,'V',nx)];
    set('V','int','tech','R7'); set('V','int','tech','R8'); r.open=[typeof V1819K!=='undefined'?V1819K.OPEN_AFTER:null,v1821tFormOf(C,u,'V','R8')]; Y.ov={};
    /* CPU plans: seeded and fixed */
    const cs=C.league.find(s=>s!==u); r.cpu=JSON.stringify(v1821tCpuPlan(C,cs,'V','R5',C.year))===JSON.stringify((V1821T_C.cpu.clear(),v1821tCpuPlan(C,cs,'V','R5',C.year)));
    return r; });
  console.log(JSON.stringify(U));
  const G=U.g; ok(LVLS.every(l=>G[l].light[0]===0.85&&G[l].std[0]===1&&G[l].int[0]===1.2&&G[l].int[1]===1.2&&G[l].light[1]===0.85&&G[l].off===1), 'growth multiplier per level: Light x0.85, Standard x1, Intense x1.2 for V, JV and MOD (starters and bench); nothing in the offseason step');
  ok(U.scrim.vS===1&&U.scrim.vB===1.05&&U.scrim.jB===1.05&&U.scrim.cap===1.2&&U.scrim.mod==='tech'&&U.scrim.half===1, `Scrimmage: +5% for Varsity and JV non-starters, starters unchanged, Intense + Scrimmage capped at x1.2, needs both levels, MOD cannot scrimmage (${JSON.stringify(U.scrim)})`);
  ok(U.f.tm==='f_pas'&&U.f.tf==='f_sho'&&U.f.gk==='balanced'&&U.f.cm==='f_sta'&&U.f.cf==='f_spd'&&U.f.att==='attacking'&&U.f.tac==='balanced', `session focus: Technical passing/finishing, Conditioning stamina/pace, none for keepers, a set training focus wins, Tactical no focus (${JSON.stringify(U.f)})`);
  ok(Math.abs(U.form.int+0.008)<1e-9&&Math.abs(U.form.light-0.006)<1e-9&&Math.abs(U.form.tac-0.003)<1e-9&&Math.abs(U.form.lt-0.009)<1e-9&&U.form.none===0&&U.form.homeOk, `form reaches M.sides[i].home (S.v1821dForm): Intense ${U.form.int}, Light ${U.form.light}, Tactical ${U.form.tac}, Light+Tactical ${U.form.lt}`);
  ok(Math.abs(U.form.opp-U.form.oppExp)<1e-9, `the opponent gets its own seeded plan's form (${U.form.opp})`);
  ok(Math.abs(U.b2b[0]+0.008)<1e-9&&Math.abs(U.b2b[1]+0.012)<1e-9&&U.b2b[2]===true, 'two Intense weeks in a row: -0.008 then -0.012');
  ok(U.open[0]===8&&Math.abs(U.open[1]+0.008)<1e-9, 'the Calendar open week resets legs: Intense on matchday 9 after Intense on matchday 8 is only -0.008');
  ok(U.cpu, 'CPU plans are seeded (same plan after clearing the cache)');

  /* ---------- the plan is frozen at kick-off; growth booked in the ledger ---------- */
  const F=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; const Y=v1821tY(C); const wk='R'+C.md; Y.ov[wk]={V:{i:'int',s:'tech'},JV:{i:'light',s:'tac'}};
    const before=JSON.parse(JSON.stringify(C.dvx.yr[C.year])); simRound(C); const lg=JSON.parse(JSON.stringify(Y.log[wk]));
    v1821tS(C).def.V={i:'light',s:'cond'}; const after=v1821tUserPlan(C,'V',wk); A.v1821tSet({dataset:{l:'V',w:wk,k:'i',v:'std'}}); const after2=v1821tUserPlan(C,'V',wk);
    advance(C); const L=C.dvx.yr[C.year]; v1821tS(C).def.V={i:'std',s:'tech'};
    return {lg,after,after2,pv:(L.V.parts.prac||0)-((before.V.parts||{}).prac||0),pj:(L.JV.parts.prac||0)-((before.JV.parts||{}).prac||0),pm:(L.MOD.parts.prac||0)-((before.MOD.parts||{}).prac||0)}; });
  console.log(JSON.stringify(F));
  ok(F.lg.V.i==='int'&&F.lg.JV.i==='light'&&F.lg.JV.s==='tac'&&F.lg.MOD.i==='std'&&Math.abs(F.lg.JV.fm-0.009)<1e-9, 'each level\'s plan is frozen when its game kicks off (with its form)');
  ok(F.after.i==='int'&&F.after.src==='played'&&F.after2.i==='int', 'a played week cannot be changed by a new default or by the controls');
  ok(F.pv>0&&F.pj<0&&Math.abs(F.pm)<1e-9, `the growth ledger books the practice parts: Varsity +${F.pv.toFixed(3)}, JV ${F.pj.toFixed(3)}, MOD 0`);

  /* ---------- postseason: form only ---------- */
  const P=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; let g=0; while(C.phase==='regular'&&g++<30){ simRound(C); advance(C); }
    const r={ph:C.phase}; const fx=userFixture(C); if(!fx) return r; const wk=v1821tWk(fx); const Y=v1821tY(C); Y.ov[wk]={V:{i:'int',s:'scrim'}};
    const p=squad(C,u,'V').find(q=>q.plan&&q.pot>ovr(q)); const M=v1821dMult(C,p,'tick'); r.parts=M.parts.filter(x=>x.k==='prac').length; r.ses=v1821tUserPlan(C,'V',wk).s; r.foc=v1821dFocus(C,p,'balanced');
    const side=fx.h===u?0:1; const S=startMatch(C,fx.id,{fast:true}); r.form=S.sides[side].v1821dForm; r.wk=wk; Y.ov={}; return r; });
  console.log(JSON.stringify(P));
  ok(P.ph==='sectionals'&&P.parts===0&&P.ses==='tech'&&P.foc==='balanced'&&Math.abs(P.form+0.008)<1e-9, `postseason week ${P.wk}: Intense gives no growth (only the form cost), Scrimmage is not offered, no focus`);

  /* ---------- UI desktop ---------- */
  const UI=await page.evaluate(()=>{ const C=App.C; App.route='dev'; App.params={dtab:'practice'}; render(); const q=s=>document.querySelectorAll(s); const r={};
    r.tab=!!document.querySelector('.v1821d-tabs [data-k="practice"]')&&document.querySelector('.v1821d-tabs [data-k="practice"]').textContent.includes('Practice');
    r.cards=q('.v1821t-pl .v1821t-ints').length; r.ints=q('.v1821t-pl .v1821t-int').length; r.ses=q('.v1821t-pl .v1821t-ses').length; r.opp=q('.v1821t-opp svg').length; r.tiles=q('.v1821t-tile').length;
    r.txt=document.querySelector('.v1821t-pl').textContent; return r; });
  console.log(JSON.stringify({...UI,txt:UI.txt.slice(0,200)}));
  ok(UI.tab&&UI.cards>=1&&UI.ints===3*UI.cards&&UI.opp>=1&&UI.tiles>=3&&/×1\.2 growth|no growth outside/.test(UI.txt)&&/form/.test(UI.txt), `Practice tab: planner cards with intensity, sessions, the opponent crest and exact effects (${UI.cards} cards, ${UI.tiles} season tiles)`);
  await page.screenshot({path:OUT+'/practice_post_desktop.png',fullPage:true});

  /* a new season: badge, chip, This week item, preview control */
  const N=await page.evaluate(()=>{ const C=App.C; const u=C.userSid; let g=0; while(C.phase!=='offseason'&&g++<30){ simRound(C); advance(C); } rollover(C); g=0; while(C.phase==='preseason'&&g++<5){ simRound(C); advance(C); }
    /* walk to the first week before a big game */ let big=null; g=0; while(C.phase==='regular'&&g++<14){ const x=v1821tComing(C,'V'); if(x&&v1821tBig(C,x.f)){ big=x; break; } simRound(C); advance(C); }
    const r={big:big&&big.wk, pend:v1821tPending(C).length, sum:v1821tSummary(C)};
    App.route='dev'; App.params={dtab:'practice'}; render(); r.badge=(document.querySelector('.v1821d-tabs [data-k="practice"] .v1821d-bd')||{}).textContent||'';
    r.warn=document.querySelectorAll('.v1821t-pl.warn').length;
    App.params={}; render(); r.chip=[...document.querySelectorAll('.v1821d-sum')].map(x=>x.textContent).find(t=>/This week/.test(t))||'';
    App.route='office'; App.params={}; render(); const dec=document.querySelector('.v1821t-dec'); r.dec=dec?dec.textContent:'';
    if(dec){ dec.click(); r.decGo=App.route==='dev'&&App.params.dtab==='practice'; }
    return r; });
  console.log(JSON.stringify(N));
  ok(!!N.big&&N.pend>=1&&N.badge===String(N.pend)&&N.warn>=1, `before a big game (${N.big}) on defaults: the Practice tab shows badge ${N.badge} and the card is flagged`);
  ok(/^This week: V (Standard|Light|Intense) \+ \w+/.test(N.sum.t)&&N.sum.warn&&/This week: V/.test(N.chip), `summary chip on the Overview growth card: "${N.sum.t}" / "${N.sum.s}"`);
  ok(/go Light in practice\?/.test(N.dec)&&N.decGo, `a This week item on the Overview suggests Light ("${N.dec.replace(/\s+/g,' ').trim()}") and opens the Practice tab`);
  await page.evaluate(()=>{ App.route='office'; App.params={}; render(); }); await page.waitForTimeout(300); await page.screenshot({path:OUT+'/overview_desktop.png'});
  await page.evaluate(()=>{ App.route='dev'; App.params={dtab:'practice'}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(300); await page.screenshot({path:OUT+'/practice_desktop.png',fullPage:true});
  /* interact through the real controls */
  const I=await page.evaluate(()=>{ const C=App.C; const x=v1821tComing(C,'V'); const r={};
    document.querySelector(`.v1821t-pl [data-a="v1821tSet"][data-l="V"][data-w="${x.wk}"][data-k="i"][data-v="light"]`).click(); r.light=v1821tUserPlan(C,'V',x.wk); r.pend=v1821tPending(C).filter(p=>p.l==='V').length;
    document.querySelector(`.v1821t-pl [data-a="v1821tSet"][data-l="V"][data-w="${x.wk}"][data-k="s"][data-v="scrim"]`).click(); r.jv=v1821tUserPlan(C,'JV',x.wk).s; r.v=v1821tUserPlan(C,'V',x.wk).s;
    document.querySelector(`.v1821t-pl [data-a="v1821tSet"][data-l="JV"][data-w="${x.wk}"][data-k="s"][data-v="tac"]`).click(); r.unl=[v1821tUserPlan(C,'V',x.wk).s,v1821tUserPlan(C,'JV',x.wk).s];
    document.querySelector(`[data-a="v1821tReset"][data-l="V"][data-w="${x.wk}"]`).click(); r.reset=v1821tUserPlan(C,'V',x.wk);
    /* plan ahead: pick a future tile */ const t=[...document.querySelectorAll('button.v1821t-tile')].find(b=>b.dataset.w!==x.wk); t.click(); r.ahead=!!document.querySelector('.v1821t-ahead .v1821t-pl'); const aw=t.dataset.w;
    document.querySelector(`.v1821t-ahead [data-a="v1821tSet"][data-k="i"][data-v="int"]`).click(); r.aheadP=v1821tUserPlan(C,'V',aw); r.aw=aw;
    /* defaults */ document.querySelector('[data-a="v1821tDef"][data-l="MOD"][data-k="i"][data-v="int"]').click(); document.querySelector('[data-a="v1821tDef"][data-l="MOD"][data-k="s"][data-v="cond"]').click(); r.def=v1821tS(C).def.MOD;
    /* preview control */ App.modal={type:'fixture',id:x.f.id}; renderModal(); const pv=document.querySelector('.v1821t-pv'); r.pv=!!pv;
    if(pv){ pv.querySelector('[data-v="light"]').click(); r.pvP=v1821tUserPlan(C,'V',x.wk).i; r.pvStill=!!document.querySelector('.v1821t-pv .v1821t-int.on.i-light'); }
    return r; });
  console.log(JSON.stringify(I));
  ok(I.light.i==='light'&&I.light.src==='week'&&I.pend===0, 'choosing Light for this week makes a per-week override and clears the big-game badge for Varsity');
  ok(I.v==='scrim'&&I.jv==='scrim'&&I.unl[0]!=='scrim'&&I.unl[1]==='tac', 'Scrimmage sets Varsity and JV together; changing one away frees the other');
  ok(I.reset.src==='default'||I.reset.src==='week', 'Back to default works');
  ok(I.ahead&&I.aheadP.i==='int'&&I.aheadP.src==='week', `plan ahead from the season strip (${I.aw} set to Intense)`);
  ok(I.def.i==='int'&&I.def.s==='cond', 'saved default per level');
  ok(I.pv&&I.pvP==='light'&&I.pvStill, 'the match preview has a Varsity intensity control that sets this week\'s plan');
  await page.evaluate(()=>{ const m=document.querySelector('.v1821t-pv'); if(m) m.scrollIntoView({block:'center'}); }); await page.waitForTimeout(250); await page.screenshot({path:OUT+'/preview_desktop.png'});
  await page.evaluate(()=>{ App.modal=null; renderModal(); });

  /* ---------- save / reload ---------- */
  const SV=await page.evaluate(async()=>{ const C=App.C; queueSave(); await saveNow(); return {slot:App.slot,P:JSON.stringify(C.prac)}; });
  await page.reload(); await page.waitForTimeout(1000);
  const RL=await page.evaluate(async(slot)=>{ await openSlot(slot); const C=App.C; return {P:JSON.stringify(C.prac)}; },SV.slot);
  ok(RL.P===SV.P&&/"MOD":\{"i":"int","s":"cond"\}/.test(RL.P), 'defaults, per-week overrides and the played-week log survive save and reload');
  const OLD=await page.evaluate(()=>{ const C=App.C; delete C.prac; App.route='dev'; App.params={dtab:'practice'}; render(); const ok1=!!document.querySelector('.v1821t-pl'); simRound(C); advance(C); return ok1&&!!C.prac&&C.prac.def.V.i==='std'; });
  ok(OLD, 'an old save without practice state works (created lazily, Standard + Technical defaults)');

  /* ---------- phone + gold theme ---------- */
  const ph=await ctx.newPage(); await ph.setViewportSize({width:390,height:844}); ph.on('pageerror',e=>errs.push('phone: '+e.message));
  await ph.goto(DIST); await ph.waitForTimeout(1000); await ph.evaluate(async(slot)=>{ await openSlot(slot); App.route='dev'; App.params={dtab:'practice'}; render(); },SV.slot); await ph.waitForTimeout(400);
  const sw=await ph.evaluate(()=>[document.documentElement.scrollWidth,innerWidth,document.querySelectorAll('.v1821t-pl').length]);
  await ph.screenshot({path:OUT+'/practice_phone.png',fullPage:true});
  await ph.evaluate(()=>{ const x=v1821tComing(App.C,'V'); App.modal={type:'fixture',id:x.f.id}; renderModal(); }); await ph.waitForTimeout(300);
  await ph.evaluate(()=>{ const m=document.querySelector('.v1821t-pv'); if(m) m.scrollIntoView({block:'center'}); }); await ph.waitForTimeout(250); await ph.screenshot({path:OUT+'/preview_phone.png'});
  const sw2=await ph.evaluate(()=>{ const r=[document.documentElement.scrollWidth,innerWidth]; App.modal=null; renderModal(); App.route='office'; render(); return r; }); await ph.waitForTimeout(300);
  const sw3=await ph.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]); await ph.screenshot({path:OUT+'/overview_phone.png'});
  ok(sw[0]<=sw[1]&&sw2[0]<=sw2[1]&&sw3[0]<=sw3[1]&&sw[2]>=1, `phone 390: Practice tab, match preview and Overview have no sideways scroll (${sw}, ${sw2}, ${sw3})`);
  await ph.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); App.route='dev'; App.params={dtab:'practice'}; render(); }); await ph.waitForTimeout(300); await ph.screenshot({path:OUT+'/practice_phone_gold.png',fullPage:true});
  await page.evaluate(()=>{ PREFS.theme={preset:'gold',custom:null}; applyTheme(); App.route='dev'; App.params={dtab:'practice'}; render(); window.scrollTo(0,0); }); await page.waitForTimeout(300); await page.screenshot({path:OUT+'/practice_desktop_gold.png',fullPage:true});
  await page.evaluate(()=>{ PREFS.theme={preset:'night',custom:null}; applyTheme(); }); await ph.close();

  /* ---------- CPU parity: average multiplier and form over every CPU school, level and league week ---------- */
  const CP=await page.evaluate((seeds)=>{ let gs=0,gn=0,fs=0,fn=0,ks=0,kn=0; const byL={V:[0,0],JV:[0,0],MOD:[0,0]};
    for(const sd of seeds){ const C=newCareer({seed:sd}); const u=C.userSid; for(const sid of C.league){ if(sid===u) continue; for(const l of LVLS){ const lu=getLu(C,sid,l); const ids=new Set(lu.slots.map(s=>s.pid)); const ps=squad(C,sid,l);
          for(let md=0;md<14;md++){ const wk='R'+md; for(const p of ps){ const g=v1821tGrowOf(C,sid,l,wk,C.year,ids.has(p.id)); gs+=g; gn++; byL[l][0]+=g; byL[l][1]++; } fs+=v1821tFormOf(C,sid,l,wk,C.year); fn++; }
          for(const wk of V1821T_POST){ ks+=v1821tFormOf(C,sid,'V',wk,C.year); kn++; } } } }
    return {g:gs/gn,f:fs/fn,k:ks/kn,byL:Object.fromEntries(Object.entries(byL).map(([k,v])=>[k,v[0]/v[1]]))}; },['1','2','3','4','5','6','7','8','9','10','11','12']);
  console.log(JSON.stringify(CP));
  ok(Math.abs(CP.g-1)<0.03&&LVLS.every(l=>Math.abs(CP.byL[l]-1)<0.03)&&Math.abs(CP.f)<0.001, `CPU parity: average league-week growth multiplier ${CP.g.toFixed(4)} (V ${CP.byL.V.toFixed(4)}, JV ${CP.byL.JV.toFixed(4)}, MOD ${CP.byL.MOD.toFixed(4)}), average form ${(CP.f*1000).toFixed(2)} pts; knockout taper ${(CP.k*1000).toFixed(2)} pts`);

  /* ---------- balance: one season + rollover per seed and policy ---------- */
  const runs={};
  for(const pol of ['off','std','sens','int','light']){ runs[pol]=[];
    for(const sd of SEEDS){ runs[pol].push(await page.evaluate(([sd,pol])=>{ V1821D.off=pol==='off'; const C=newCareer({seed:sd}); const u=C.userSid;
      const setP=(l,wk,i,s)=>{ const Y=v1821tY(C); (Y.ov[wk]||(Y.ov[wk]={}))[l]={i,s}; };
      const policy=()=>{ if(pol==='off'||pol==='std') return; for(const l of LVLS){ const x=v1821tComing(C,l); if(!x) continue; const f=x.f; const big=v1821tBig(C,f);
          if(pol==='int') setP(l,x.wk,'int',l==='MOD'?'tech':'scrim'); else if(pol==='light') setP(l,x.wk,'light','tech');
          else { const opp=f.h===u?f.a:f.h; const d=xiRating(C,opp,l)-xiRating(C,u,l); const pw=v1821tPrev(C,u,l,x.wk); const pint=pw&&v1821tPlan(C,u,l,pw).i==='int';
            if(big) setP(l,x.wk,'light','tac'); else if(d<-2&&!pint) setP(l,x.wk,'int','tech'); else setP(l,x.wk,'std','tech'); } } };
      const start={}; for(const id in C.players){ const p=C.players[id]; if(C.schools[p.sid].ext) continue; start[id]={o:ovr(p),l:p.lvl,u:p.sid===u}; }
      let g=0,W=0,D=0,L=0,GF=0,GA=0,KW=0,KN=0; let cm=0,cw=0;
      while(C.phase!=='offseason'&&g++<60){ policy(); simRound(C);
        for(const f of roundFixtures(C)){ if(!f||f.lvl!=='V'||(f.h!==u&&f.a!==u)||f.comp==='pre') continue; const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; GF+=us; GA+=th; if(f.comp==='reg'){ if(us>th)W++; else if(us<th)L++; else D++; } else { KN++; if(f.w===u) KW++; } }
        if(C.phase==='regular'&&!V1821D.off) for(const id in C.players){ const p=C.players[id]; if(p.sid===u||!p.plan||C.schools[p.sid].ext) continue; const gap=p.pot-ovr(p); if(gap<=0) continue; const w=p.plan.gain*Math.min(1,Math.max(0.15,gap/12)); cm+=w*v1821dMult(C,p,'tick').m; cw+=w; }
        advance(C); }
      /* growth per player per year = in-season (realized) + the offseason growth step; league rebalancing at season start is left out (it is random per school and not development) */
      const agg={}; for(const id in start){ const s=start[id]; const p=C.players[id]; if(!p) continue; const gap=p.pot-ovr(p); const off=gap>0?Math.min(gap,p.plan.gain*0.52*Math.min(1,Math.max(0.2,gap/12))):0;
        const k=(s.u?'U':'C')+s.l; const a=agg[k]||(agg[k]={s:0,n:0}); a.s+=ovr(p)-s.o+off; a.n++; }
      const out={}; for(const k in agg) out[k]=agg[k].s/agg[k].n; const led=C.dvx&&C.dvx.yr[C.year]; const ex={}; for(const l of LVLS) ex[l]=led&&led[l]?(led[l].parts.prac||0):0;
      const hash=hashStr(Object.values(C.fixtures).filter(f=>f.yr===C.year).map(f=>f.id+f.hg+'-'+f.ag).sort().join('|'));
      rollover(C); V1821D.off=false; return {g:out,W,D,L,GF,GA,KW,KN,cm:cw?cm/cw:1,ex,hash}; },[sd,pol])); } }
  const avg=(pol,k)=>runs[pol].reduce((a,r)=>a+r.g[k],0)/runs[pol].length, sum=(pol,k)=>runs[pol].reduce((a,r)=>a+r[k],0);
  const pct=(pol,k)=>(avg(pol,k)/avg('off',k)-1)*100; const pts=pol=>(3*sum(pol,'W')+sum(pol,'D'))/(sum(pol,'W')+sum(pol,'D')+sum(pol,'L'));
  console.log('\npolicy   | you V   JV    MOD  (vs off)              | CPU V   JV    MOD  (vs off)               | CPU mult | league W-D-L  win%  pts/g  GF  GA | KO won');
  for(const pol of Object.keys(runs)){ const n=sum(pol,'W')+sum(pol,'D')+sum(pol,'L');
    console.log(`${pol.padEnd(8)} | ${['UV','UJV','UMOD'].map(k=>avg(pol,k).toFixed(2)).join('  ')} (${['UV','UJV','UMOD'].map(k=>(pct(pol,k)>=0?'+':'')+pct(pol,k).toFixed(1)+'%').join(' ')}) | ${['CV','CJV','CMOD'].map(k=>avg(pol,k).toFixed(2)).join('  ')} (${['CV','CJV','CMOD'].map(k=>(pct(pol,k)>=0?'+':'')+pct(pol,k).toFixed(1)+'%').join(' ')}) | ${(runs[pol].reduce((a,r)=>a+r.cm,0)/runs[pol].length).toFixed(4)} | ${sum(pol,'W')}-${sum(pol,'D')}-${sum(pol,'L')}  ${(100*sum(pol,'W')/n).toFixed(1)}%  ${pts(pol).toFixed(2)}  ${sum(pol,'GF')}  ${sum(pol,'GA')} | ${sum(pol,'KW')}/${sum(pol,'KN')}`); }
  const det=await page.evaluate(()=>{ const one=()=>{ const C=newCareer({seed:'4242'}); let g=0; const Y=v1821tY(C); Y.ov.R2={V:{i:'int',s:'scrim'},JV:{i:'int',s:'scrim'}}; Y.ov.R3={V:{i:'int',s:'tac'}}; while(C.phase!=='sectionals'&&g++<30){ simRound(C); advance(C); }
      return hashStr(Object.values(C.fixtures).map(f=>f.id+f.hg+'-'+f.ag).sort().join('|')+'|'+Object.values(C.players).map(p=>p.id+ovr(p).toFixed(4)).sort().join('|')); }; return [one(),one()]; });
  ok(det[0]===det[1], `deterministic: the same seed and plan give the same results and ratings (${det[0]})`);
  ok(['UV','UJV','UMOD'].every(k=>pct('int',k)>3&&pct('int',k)<=10.5), `all-Intense grows more: V ${pct('int','UV').toFixed(1)}%, JV ${pct('int','UJV').toFixed(1)}%, MOD ${pct('int','UMOD').toFixed(1)}% (budget +10%)`);
  ok(['UV','UJV','UMOD'].every(k=>pct('sens',k)<=10)&&['UV','UJV','UMOD'].every(k=>pct('std',k)<=1), `sensible use stays inside the budget: V ${pct('sens','UV').toFixed(1)}%, JV ${pct('sens','UJV').toFixed(1)}%, MOD ${pct('sens','UMOD').toFixed(1)}%`);
  ok(pts('int')<pts('std')&&sum('int','W')<=sum('std','W'), `...but loses more: all-Intense ${pts('int').toFixed(2)} pts/game (${sum('int','W')} W, GF ${sum('int','GF')}) vs Standard ${pts('std').toFixed(2)} (${sum('std','W')} W, GF ${sum('std','GF')})`);
  ok(['UV','UJV','UMOD'].every(k=>pct('light',k)<-3), `all-Light grows less: V ${pct('light','UV').toFixed(1)}%, JV ${pct('light','UJV').toFixed(1)}%, MOD ${pct('light','UMOD').toFixed(1)}%`);
  const cmAll=Object.keys(runs).filter(p=>p!=='off').map(p=>runs[p].reduce((a,r)=>a+r.cm,0)/runs[p].length);
  ok(cmAll.every(m=>Math.abs(m-1)<0.03)&&['CV','CJV','CMOD'].every(k=>Math.abs(pct('std',k))<3), `CPU growth: effective in-season multiplier ${cmAll.map(m=>m.toFixed(4)).join(', ')}; realized CPU growth vs off ${['CV','CJV','CMOD'].map(k=>pct('std',k).toFixed(1)+'%').join(' ')}`);
  /* expected win chance from simProbs: Intense, back to back, Light, and Light before big games */
  const W=await page.evaluate(()=>{ const out={std:[0,0],int:[0,0],b2b:[0,0],light:[0,0],bigS:[0,0],bigL:[0,0]};
    for(const sd of ['777','101']){ const C=newCareer({seed:sd}); const u=C.userSid; C.phase='regular'; C.md=0; const Y=v1821tY(C);
      const F=Object.values(C.fixtures).filter(f=>f.comp==='reg'&&f.lvl==='V'&&(f.h===u||f.a===u)).sort((a,b)=>a.rd-b.rd);
      for(const f of F){ const wk=v1821tWk(f); const pw=v1821tPrev(C,u,'V',wk); const big=!!v1821tBig(C,f); const add=(k,P)=>{ const w=f.h===u?P.h:P.a; out[k][0]+=w; out[k][1]+=3*w+P.d; out[k].n=(out[k].n||0)+1; };
        for(const pol of ['std','int','b2b','light']){ Y.ov={}; if(pol!=='std') Y.ov[wk]={V:{i:pol==='light'?'light':'int',s:'tech'}}; if(pol==='b2b'&&pw) Y.ov[pw]={V:{i:'int',s:'tech'}}; if(pol==='b2b'&&!pw) continue;
          const P=simProbs(C,f.id,300); add(pol,P); if(big&&(pol==='std'||pol==='light')) add(pol==='std'?'bigS':'bigL',P); } } Y.ov={}; }
    const R={}; for(const k in out) R[k]=out[k].n?{w:out[k][0]/out[k].n,p:out[k][1]/out[k].n,n:out[k].n}:null; return R; });
  console.log(JSON.stringify(W));
  ok(W.int.w<W.std.w&&W.b2b.w<W.int.w&&W.light.w>W.std.w, `expected win chance (simProbs, league games): Standard ${(W.std.w*100).toFixed(1)}%, Intense ${(W.int.w*100).toFixed(1)}%, back-to-back Intense ${(W.b2b.w*100).toFixed(1)}%, Light ${(W.light.w*100).toFixed(1)}%`);
  ok(W.bigL&&W.bigS&&W.bigL.w>W.bigS.w&&W.bigL.w-W.bigS.w<0.04, `Light before big games helps a little: ${(W.bigS.w*100).toFixed(1)}% -> ${(W.bigL.w*100).toFixed(1)}% win chance (${W.bigS.n} big games)`);

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAIL`:'ALL PASS'); process.exit(fails?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
