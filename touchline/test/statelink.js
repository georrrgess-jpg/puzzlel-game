// v18.14 one state (src/v17/94_poll_zz_link.js, 94_poll_zz_awards.js): the poll is a top 50 of 120 schools with tiered programs;
// the Preseason Cup, Regional and State Tournament opponents are poll schools (name, colours, rating for the year, poll players by
// name); Regionals is the Section 6 champion; the other seven State places are the best-ranked section champions; the State
// Awards are given after the final from the statewide numbers (distinct winners, right positions, honors for league players,
// Newswire, Awards tab); the new leaderboards; an older pool upgrades without rewriting history; all deterministic.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1280,height:900}}); page.on('pageerror',e=>errs.push(e.message)); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Link Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); return page; };
  const page=await mk('link1');
  const W=await page.evaluate(()=>{ const C=App.C; const P=v1812pS(C); const T=P.pool.teams; const out={n:T.length,all:v1812pAllIds(C).length,top:v1812pLatest(C).rows.length};
    const bySec={}; T.forEach(t=>(bySec[t.sec]||(bySec[t.sec]=[])).push(t)); out.tiers=Object.values(bySec).every(a=>a.length===8&&a.filter(t=>t.tier==='power').length===1&&a.filter(t=>t.tier==='cont').length===1);
    out.secs=Object.keys(bySec).length;
    /* preseason: three poll schools, dressed */
    const S=C.v1814[C.year]; out.pre=S.pre.length; out.dress=C.pre.fx.every(fid=>{ const f=C.fixtures[fid]; const o=f.h===C.userSid?f.a:f.h; const s=C.schools[o]; const t=v1812pPoolMap(C).get(s.vid);
      if(!t||s.town!==t.town||s.name!==t.name||s.c1!==t.c1||s.mascot!==t.mascot) return false; if(Math.abs(xiRating(C,o,'V')-v1812pVR(C,t.id,C.year))>0.3) return false;
      const sq=squad(C,o,'V'); const named=sq.filter(p=>p.vpid); return named.length>=15&&named.every(p=>{ const q=v1812pParseVP(p.vpid); const v=v1812pVPlayer(C,q.vid,q.c,q.k); return v.fn===p.fn&&v.ln===p.ln&&v.pos===p.pos&&q.vid===t.id; }); });
    out.lastTier=(()=>{ const t=v1812pPoolMap(C).get(S.pre[2]); return t.tier; })();
    out.news=C.news.some(n=>/^Preseason Cup draw: /.test(n.text));
    return out; });
  console.log(JSON.stringify(W));
  ok(W.n===112&&W.all===120&&W.secs===14&&W.top===50, `a top 50 from 120 schools (${W.all}, ${W.secs} simulated sections)`);
  ok(W.tiers, 'every simulated section has one power program and one contender');
  ok(W.pre===3&&W.dress&&W.news, 'the Preseason Cup draws three poll schools: their name, colours, mascot, rating for the year and players by name and position; the draw makes the Newswire');
  ok(W.lastTier==='power'||W.lastTier==='cont', `the Cup's last game is against a power or a contender (${W.lastTier})`);

  /* a season: Regionals, States, the awards */
  const R=await page.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } const yr=C.year; const S=C.v1814[yr]; const out={};
    const sec6=v1814Table(C,yr,6); out.rgn=S.rgn===sec6[0].id; const T=C.tourneys[yr]; const rgnF=C.fixtures[T.rgn]; out.rgnSchool=C.schools[rgnF.a].vid===S.rgn;
    const pl=C.poll.polls[yr]; const last=pl[pl.length-1]; const rk=v1812pRankMap(last);
    const champs=V1812P.SECS.filter(s=>s!==6).map(s=>v1814Table(C,yr,s)[0].id); out.field=S.st.length===7&&S.st.every(v=>champs.includes(v))&&new Set(S.st).size===7;
    const worst=Math.max(...S.st.map(v=>rk.get(v)||999)); const left=champs.filter(v=>!S.st.includes(v)); out.best=left.every(v=>(rk.get(v)||999)>=worst);
    const stIds=T.st[0].flatMap(fid=>{ const f=C.fixtures[fid]; return [f.h,f.a]; }); out.st8=stIds.length===8&&stIds.filter(id=>C.schools[id].vid&&S.st.includes(C.schools[id].vid)).length===7;
    out.cap=stIds.every(id=>id===C.userSid||xiRating(C,id,'V')<=85.05); out.stR=stIds.map(id=>Math.round(xiRating(C,id,'V')));
    out.news=['Regional final','State Tournament field'].map(k=>C.news.some(n=>n.text.indexOf(k)===0));
    const A=C.poll.aw&&C.poll.aw[yr]; out.aw=!!A; if(A){ out.keys=Object.keys(A.list).sort().join(','); const L=A.list; out.pos=L.opoy&&['MID','FWD'].includes(L.opoy.pos)&&L.dpoy&&['DEF','MID'].includes(L.dpoy.pos)&&L.gk&&L.gk.pos==='GK';
      const ids=['poy','opoy','dpoy','gk','under'].map(k=>L[k]&&L[k].id).filter(Boolean); out.distinct=new Set(ids).size===ids.length;
      out.team=[A.team1,A.team2].every(t=>t.length===11&&t.filter(e=>e.pos==='GK').length===1&&t.filter(e=>e.pos==='DEF').length===4&&t.filter(e=>e.pos==='MID').length===3&&t.filter(e=>e.pos==='FWD').length===3)&&new Set([...A.team1,...A.team2].map(e=>e.id)).size===22;
      out.min=[...['poy','opoy','dpoy','gk','under'].map(k=>L[k]),...A.team1,...A.team2].filter(Boolean).every(e=>{ const x=v1812pLeaderPool(C,yr,'state').find(y=>y.id===e.id); return x&&x.s.gp>=V1814MIN; });
      out.under=!L.under||v1814Grade(C,{id:L.under.id,virtual:L.under.virtual},yr)<=10;
      const lg=[...['poy','opoy','dpoy','gk','under'].map(k=>[L[k],v1814Label(k)]),...A.team1.map(e=>[e,'All-State First Team']),...A.team2.map(e=>[e,'All-State Second Team'])].filter(([e])=>e&&!e.virtual);
      out.lg=lg.length; out.honors=lg.every(([e,l])=>{ const p=C.players[e.id]; return p&&p.honors.some(h=>h.yr===yr&&h.label===l); });
      out.coy=!!(L.coy&&L.coy.name&&L.coy.sid); out.awNews=C.news.some(n=>/is the \d+ .* Player of the Year/.test(n.text));
      out.again=JSON.stringify(v1814Compute(C,yr).list)===JSON.stringify(A.list); }
    App.route='statepoll'; App.params={pt:'awards'}; render(); out.ui={cards:document.querySelectorAll('.v1814-aw').length,pl:document.querySelectorAll('.v1814-pl').length,field:document.querySelectorAll('.v1814-field li').length,hero:!!document.querySelector('.v1814-hero')};
    return out; });
  console.log(JSON.stringify(R));
  ok(R.rgn&&R.rgnSchool&&R.news[0], 'Regionals is against the Section 6 champion, as that poll school; the Newswire names it');
  ok(R.field&&R.best&&R.st8&&R.news[1], 'the other seven State places go to the best-ranked section champions in the final poll; the Newswire lists the field');
  ok(R.cap, `State opponents stay at or below the 85 cap (${R.stR.join(' ')})`);
  ok(R.aw&&R.keys==='coy,dpoy,gk,opoy,poy,under', `the State Awards are given after the final (${R.keys})`);
  ok(R.pos&&R.distinct&&R.under&&R.min, 'winners play the right positions, nobody wins two player awards, the underclassman is a freshman or sophomore, everyone played enough games');
  ok(R.team, 'All-State First and Second Teams: 11 each in a 1-4-3-3, 22 different players');
  ok(R.honors&&R.coy&&R.awNews, `league winners get the honor on their profile (${R.lg} this season), there is a Coach of the Year and the Newswire carries it`);
  ok(R.again, 'the awards are deterministic');
  ok(R.ui.cards===6&&R.ui.pl===22&&R.ui.field===8&&R.ui.hero, `the Awards tab shows six awards, both All-State teams and the State Tournament field (${JSON.stringify(R.ui)})`);

  const HG=await page.evaluate(()=>{ const C=App.C; const p=squad(C,C.userSid,'V')[0]; const e={id:p.id,virtual:false,name:pname(p),sid:C.userSid,pos:p.pos,line:''}; const n0=C.news.length;
    v1814Give(C,{yr:C.year,list:{poy:e},fin:{},team1:[e],team2:[]}); return {h:p.honors.filter(h=>h.yr===C.year).map(h=>h.label).join('|'),news:C.news.slice(0,C.news.length-n0).map(n=>n.text)}; });
  ok(/State Player of the Year/.test(HG.h)&&/All-State First Team/.test(HG.h)&&HG.news.some(t=>/^State Awards for /.test(t)), `your players' state awards become honors and a Newswire line (${HG.h})`);
  /* races during a season, the leaderboards */
  const Q=await page.evaluate(()=>{ const C=App.C; rollover(C); for(let i=0;i<10;i++){ simRound(C); advance(C); } App.route='statepoll'; App.params={pt:'awards'}; render();
    const races=document.querySelectorAll('.v1814-race').length, rows=document.querySelectorAll('.v1814-race li').length;
    const boards={}; for(const k of ['tk','int','cl','def','sot','xg','svp','rt']){ const b=v1812pBoard(C,C.year,k,'state',5); boards[k]=b.length; }
    const int=v1812pBoard(C,C.year,'int','state',3); const lg=v1812pBoard(C,C.year,'int','league',3);
    return {races,rows,boards,intSorted:int.every((x,i)=>!i||int[i-1].v>=x.v),lgOnly:lg.every(x=>C.league.includes(x.sid))}; });
  console.log(JSON.stringify(Q));
  ok(Q.races===4&&Q.rows===20, 'mid-season the Awards tab shows the four award races, five deep');
  ok(Object.values(Q.boards).every(n=>n===5)&&Q.intSorted&&Q.lgOnly, 'tackles, interceptions, clearances, defensive actions, shots on target, xG, save % and rating leaderboards cover the state (and your section on its own)');

  /* an older pool (v18.12: 80 schools, no bases) upgrades: new sections, bases from next season, this season untouched */
  const U=await page.evaluate(()=>{ const C=App.C; const P=v1812pS(C); const old=P.pool.teams.filter(t=>t.sec<12).map(t=>{ const o={...t}; delete o.B; delete o.tier; return o; });
    P.pool={teams:old,sig:v1812pHash(old.map(t=>t.id+t.town+t.R).join(','))}; v1812pMem.cmp.clear(); v1812pMem.vr.clear();
    const id=old[5].id; let R=old[5].R; for(let y=P.y0+1;y<=C.year;y++){ const r=v1812pRng(C,'vr',id,y); R=0.72*R+0.28*70.2+gauss(r)*2; } const before=Math.round(v1812pClamp(R,56,85)*100)/100;
    const Q=v1812pS(C); return {n:Q.pool.teams.length,v14:Q.pool.v14,bY:Q.pool.bY===C.year+1,same:v1812pVR(C,id,C.year)===before,tiers:Q.pool.teams.every(t=>t.B!=null),ids:new Set(Q.pool.teams.map(t=>t.id)).size}; });
  console.log(JSON.stringify(U));
  ok(U.n===112&&U.ids===112&&U.v14&&U.bY&&U.tiers&&U.same, 'an older pool gains the four new sections and a base for every school from next season; this season’s ratings are unchanged');

  /* deterministic: the same seed draws the same opponents */
  const p2=await mk('link1'); const p3=await mk('link1');
  const D=await Promise.all([p2,p3].map(p=>p.evaluate(()=>JSON.stringify(App.C.v1814))));
  ok(D[0]===D[1], 'the same seed draws the same poll schools');

  /* phone */
  const ph=await mk('link2',{width:390,height:844}); await ph.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } App.route='statepoll'; App.params={pt:'awards'}; render(); }); await ph.waitForTimeout(700);
  const PH=await ph.evaluate(()=>({sw:document.documentElement.scrollWidth,cards:document.querySelectorAll('.v1814-aw').length}));
  ok(PH.sw<=392&&PH.cards===6, `the Awards tab fits a phone (${PH.sw}px)`);
  require('fs').mkdirSync(__dirname+'/shots/v1814',{recursive:true}); await ph.screenshot({path:__dirname+'/shots/v1814/awards_phone.png',fullPage:true}); await page.screenshot({path:__dirname+'/shots/v1814/races_desk.png',fullPage:true});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
