// v18.19 The Ladder (src/v17/9g_ladder*.js): three classes of eight (AAA above, your league AA, A below, the other two as State
// Poll sections); at the end of a season the top two move up, the bottom two drop, third plays sixth of the class above; each class
// has a champion; schools that join your league get full rosters, lineups and a coach and are fitted to the class band; schools
// that leave become poll schools in their new class; sections stay at eight; past standings and polls still read; your own
// playoff is a real match played from the Play button; old saves migrate; deterministic; the screens work on a phone.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const mk=async(seed,vw)=>{ const page=await b.newPage({viewport:vw||{width:1440,height:900}}); page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); }); await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Ladder Coach'); await page.fill('#nc-seed',seed);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(900); return page; };
  const page=await mk('lad-t1');
  const I=await page.evaluate(()=>{ const C=App.C, L=C.lad; const all=[...L.cls.AAA,...L.cls.AA,...L.cls.A]; const avg=c=>L.cls[c].reduce((a,id)=>a+v1819lRating(C,id,C.year),0)/8;
    return {n:[L.cls.AAA.length,L.cls.AA.length,L.cls.A.length].join(','),uniq:new Set(all).size,mine:L.mine,lg:L.cls.AA.every(id=>C.league.includes(id)),avg:[avg('AAA'),avg('AA'),avg('A')].map(x=>Math.round(x*10)/10),
      sec:L.cls.AAA.every(id=>v1812pSec(C,id)===V1819L.UP)&&L.cls.A.every(id=>v1812pSec(C,id)===V1819L.LO)}; });
  ok(I.n==='8,8,8'&&I.uniq===24&&I.mine==='AA'&&I.lg&&I.sec, 'three classes of eight: your league is Class AA, AAA and A are State Poll sections');
  ok(I.avg[0]>I.avg[1]+3&&I.avg[1]>I.avg[2]+3, `the classes differ in strength (AAA ${I.avg[0]}, AA ${I.avg[1]}, A ${I.avg[2]})`);
  const V=await page.evaluate(()=>{ App.route='ladder'; App.params={}; render(); const r={cls:document.querySelectorAll('.v1819l-cls').length,rows:document.querySelectorAll('.v1819l-cls.mine tbody tr').length,crests:document.querySelectorAll('.v1819l-cr').length,me:!!document.querySelector('.v1819l-cls.mine tr.me')};
    App.route='league'; App.params={}; render(); r.zones=document.querySelectorAll('tr[class*="v1819l-z-"]').length; r.chip=!!document.querySelector('.v1819l-chip'); r.menu=TOPNAV.find(t=>t[0]==='league')[3].includes('ladder'); return r; });
  ok(V.cls===3&&V.rows===8&&V.crests===16&&V.me&&V.zones===8&&V.chip&&V.menu, 'The Ladder page (three classes, your table, the other two as crests) and the zones on the League table; it is in the Competition menu');
  await page.click('.tn-tab:nth-child(4) .tn-btn').catch(()=>{});

  /* a season where you win the class: promotion */
  const P=await page.evaluate(()=>{ const C=App.C, u=C.userSid, L=C.lad; squad(C,u,'V').forEach(p=>shiftOvr(p,22,'balanced')); let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } squad(C,u,'V').forEach(p=>shiftOvr(p,-22,'balanced'));
    const H=L.hist[C.year]; const r={pos:H.tab.AA.findIndex(x=>x.id===u)+1,moves:H.moves.length,po:H.po.length,poDone:H.po.every(p=>p.w),champs:Object.keys(H.champ).length};
    const before={AAA:[...L.cls.AAA],AA:[...L.cls.AA],A:[...L.cls.A]}; const tabAAA=H.tab.AAA.map(x=>x.id); const leaving=before.AA.filter(id=>id!==u);
    const archive=standings(C,'V',C.year).map(t=>t.sid+':'+t.pts).join(); const yr=C.year;
    rollover(C); r.mine=L.mine; r.league=C.league.length; r.inLeague=C.league.includes(u);
    const exp=new Set(before.AAA); H.moves.filter(m=>m.from==='AAA').forEach(m=>exp.delete(m.id)); H.moves.filter(m=>m.to==='AAA').forEach(m=>exp.add(m.id));
    r.match=C.league.every(id=>exp.has(id))&&C.league.length===exp.size;
    r.squads=C.league.every(id=>squad(C,id,'V').length>=18&&squad(C,id,'JV').length>=14&&squad(C,id,'MOD').length>=14);
    r.lineups=C.league.every(id=>{ const v=validateLineup(C,id,'V'); return v&&v.ok!==false; }); r.coach=C.league.every(id=>C.coaches[C.schools[id].coachId]);
    const others=C.league.filter(id=>id!==u&&id!==(C.golden||{})[C.year]).map(id=>xiRating(C,id,'V')); r.band=[Math.min(...others),Math.max(...others)].map(x=>Math.round(x*10)/10);
    r.gone=leaving.filter(id=>!C.league.includes(id)).every(id=>!schoolPlayers(C,id).length&&v1812pSec(C,id)>0);
    const Pz=v1812pS(C); const secs={}; for(const t of Pz.pool.teams){ const s=v1819lSecAt(t,C.year); if(s&&!C.league.includes(t.id)) secs[s]=(secs[s]||0)+1; } r.secs=Object.values(secs).every(n=>n===8)&&Object.keys(secs).length===14;
    r.poll=v1812pAllIds(C).length; r.past=standings(C,'V',yr).map(t=>t.sid+':'+t.pts).join()===archive; try{ r.pastPoll=v1812pTable(C,yr).length; }catch(e){ r.pastPoll='ERR '+e.message; }
    r.flash=!!(L.flash&&L.flash.up&&L.flash.to==='AAA'); r.news=C.news.some(n=>/^The Ladder: /.test(n.text)); return r; });
  console.log(JSON.stringify(P));
  ok(P.pos===1&&P.moves>=8&&P.po===2&&P.poDone&&P.champs===3, 'the season closes: tables, two up and two down at each step, both playoffs played, a champion in every class');
  ok(P.mine==='AAA'&&P.inLeague&&P.league===8&&P.match, 'winning Class AA moves you up: your league is now Class AAA (the six who stayed plus the two promoted)');
  ok(P.squads&&P.lineups&&P.coach, 'every school that joined has full Varsity, JV and Modified rosters, a valid lineup and a coach');
  ok(P.band[0]>=69.4&&P.band[1]<=77.6, `the new league is fitted to the Class AAA band (${P.band.join(' to ')})`);
  ok(P.gone&&P.secs&&P.poll===120, 'the schools you left behind are State Poll schools now (their rosters cleared); every section still has eight; the poll still has 120 schools');
  ok(P.past&&P.pastPoll===120&&P.news&&P.flash, 'last season’s standings and poll table still read; the Newswire carries the moves; the promotion is announced');
  await page.evaluate(()=>{ App.route='office'; render(); }); await page.waitForTimeout(200);
  const SW=await page.evaluate(()=>{ const bad=[]; for(const r of ['ladder','league','statepoll','countymap','office','history','schedule','families','awards','records','school']){ try{ App.route=r; App.params={}; render(); if(document.querySelector('#content .error')) bad.push(r); }catch(e){ bad.push(r+': '+e.message); } } return bad; });
  ok(SW.length===0, 'every page renders after the move'+(SW.length?': '+SW.join(', '):''));

  /* your own promotion playoff: third place (sixth in the top class) */
  const Q=await page.evaluate(()=>{ const C=App.C, u=C.userSid, L=C.lad; let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); }
    const yr=C.year; delete L.hist[yr]; const _t=v1819lTable; v1819lTable=function(C2,c,y,b){ const rows=_t.apply(this,arguments); if(c!==L.mine) return rows; const me=rows.find(r=>r.id===u); const rest=rows.filter(r=>r!==me); rest.splice(L.mine==='AAA'?5:2,0,me); return rest; };
    let r={}; try{ L.mine==='AAA'?null:null; v1819lClose(C); } finally{ v1819lTable=_t; }
    const H=L.hist[yr]; const po=H.po.find(p=>p.fid); r.cls=L.mine; r.has=!!po; r.side=po?(po.up===u?'up':'dn'):null; r.label=playLabel(C); r.fix=po&&C.fixtures[po.fid]&&C.fixtures[po.fid].lpo; return r; });
  console.log(JSON.stringify(Q));
  ok(Q.has&&Q.fix&&Q.label==='Play promotion playoff', `finishing ${Q.cls==='AAA'?'sixth':'third'} (in ${Q.cls}) puts you in a playoff (${Q.side==='up'?'to move up':'to stay up'}): a real fixture, and the Play button plays it`);
  await page.evaluate(()=>{ App.route='ladder'; render(); }); await page.waitForTimeout(200);
  const card=await page.evaluate(()=>!!document.querySelector('.v1819l-po [data-a="v1819lPlay"]'));
  await page.click('.cta .play'); await page.waitForTimeout(600);
  const R=await page.evaluate(()=>{ const C=App.C, u=C.userSid, L=C.lad; const H=L.hist[C.year]; const po=H.po.find(p=>p.fid); const f=C.fixtures[po.fid];
    const r={modal:App.modal&&App.modal.type,done:f.st==='d',w:po.w,won:po.w===u,decided:!!f.w,label:playLabel(C)}; const cls=L.mine; App.modal=null; renderModal();
    rollover(C); const exp=po.w===u?po.hi:po.lo; r.after=L.mine; r.exp=exp; r.ok=L.cls[L.mine].includes(u)&&C.league.includes(u); return r; });
  console.log(JSON.stringify(R));
  ok(card&&R.modal==='v1819lRes'&&R.done&&R.decided&&R.label==='Start next season', 'the playoff card is on the Ladder; Play plays the match (extra time and penalties decide a draw) and shows the result; then Start next season returns');
  ok(R.ok&&R.after===R.exp, `the result decides your class next season (${R.won?'won':'lost'}: ${R.after})`);

  /* old saves */
  const M=await page.evaluate(()=>{ const C=App.C; const raw=JSON.parse(JSON.stringify(careerForSave(C))); delete raw.lad; const N=migrate(raw); return {v:N.lad&&N.lad.v,mine:N.lad&&N.lad.mine,n:N.lad&&[N.lad.cls.AAA.length,N.lad.cls.AA.length,N.lad.cls.A.length].join(','),lg:N.lad&&N.lad.cls.AA.every(id=>N.league.includes(id))}; });
  ok(M.v===1&&M.n==='8,8,8'&&M.lg, 'an older save gets the Ladder on load, with its league as Class AA');
  const K=await page.evaluate(()=>{ const C=App.C; const M=migrate(JSON.parse(JSON.stringify(careerForSave(C)))); return JSON.stringify(M.lad.cls)===JSON.stringify(C.lad.cls)&&M.lad.mine===C.lad.mine; });
  ok(K, 'the Ladder survives a save and reload');

  /* determinism */
  const d1=await mk('lad-det'), d2=await mk('lad-det'); const D=await Promise.all([d1,d2].map(p=>p.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } rollover(C); return JSON.stringify([C.lad.cls,C.lad.mine,C.league]); })));
  ok(D[0]===D[1], 'the same seed gives the same Ladder');
  /* relegation */
  const RL=await d1.evaluate(()=>{ const C=App.C, u=C.userSid, L=C.lad; const from=L.mine; squad(C,u,'V').forEach(p=>shiftOvr(p,-30,'balanced')); let g=0; while(C.phase!=='offseason'&&g++<400){ simRound(C); advance(C); } squad(C,u,'V').forEach(p=>shiftOvr(p,30,'balanced'));
    const pos=L.hist[C.year].tab[from].findIndex(x=>x.id===u)+1; rollover(C); return {from,pos,to:L.mine,others:C.league.filter(id=>id!==u&&id!==(C.golden||{})[C.year]).map(id=>Math.round(xiRating(C,id,'V')))}; });
  console.log(JSON.stringify(RL));
  ok(RL.pos>=7&&['AAA','AA','A'].indexOf(RL.to)===['AAA','AA','A'].indexOf(RL.from)+1&&Math.max(...RL.others)<=72.6, `finishing ${RL.pos}th drops you a class (${RL.from} to ${RL.to}) and the new league is fitted to its band`);

  /* phone */
  const ph=await mk('lad-t1',{width:390,height:844}); const PW=await ph.evaluate(()=>{ App.route='ladder'; render(); const a=document.documentElement.scrollWidth; App.route='league'; render(); return [a,document.documentElement.scrollWidth]; });
  ok(PW[0]<=390&&PW[1]<=390, `The Ladder and the League table fit a phone (${PW.join(', ')})`); const PT=await ph.evaluate(()=>{ App.route='ladder'; render(); const t=document.querySelector('.v1819l-cls.mine table'); return t.getBoundingClientRect().width<=t.parentElement.getBoundingClientRect().width+1; }); ok(PT, 'on a phone your class table keeps the points column on screen');
  require('fs').mkdirSync(__dirname+'/shots/v1819',{recursive:true}); await ph.evaluate(()=>{ App.route='ladder'; render(); }); await ph.waitForTimeout(300); await ph.screenshot({path:__dirname+'/shots/v1819/ladder_phone.png',fullPage:true});
  await page.evaluate(()=>{ App.route='ladder'; render(); window.scrollTo(0,0); }); await page.waitForTimeout(300); await page.screenshot({path:__dirname+'/shots/v1819/ladder_desk.png',fullPage:true});
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
