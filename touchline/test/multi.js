const E=require('./load');
const C=E.newCareer({slot:1,seed:99});
const t0=Date.now();
for(let s=0;s<5;s++){
  let g=0; while(C.phase!=='offseason'&&g++<200){ E.simRound(C); if(!E.advance(C)){ console.log('STUCK',C.phase); process.exit(1);} }
  const T=C.tourneys[C.year]; const tab=E.standings(C,'V'); const ui=tab.findIndex(t=>t.sid===C.userSid);
  const A=C.awards[C.year]; const ids=[...Object.values(A.list).map(a=>a.pid),...A.al1,...A.al2];
  console.log(C.year,'user pos',ui+1,'XI',E.xiRating(C,C.userSid,'V').toFixed(1),'| state champ',C.schools[T.stChamp].town,C.schools[T.stChamp].ext?'(ext)':'(league)','| awards unique',new Set(ids).size===ids.length);
  // regular-season single-season record excludes post: verify one player
  E.rollover(C);
  const sizes=E.LVLS.map(l=>E.squad(C,C.userSid,l).length).join('/'); const gk=E.LVLS.map(l=>E.squad(C,C.userSid,l).filter(p=>p.pos==='GK').length).join('/');
  console.log('   -> ',C.year,'sizes',sizes,'gks',gk,'save KB',(JSON.stringify({...C,logs:undefined}).length/1024|0),'logs KB',(JSON.stringify(C.logs).length/1024|0));
}
console.log('5 seasons ms',Date.now()-t0);
console.log('top season goals', E.seasonRecords(C,'g').slice(0,3).map(r=>[r.v,r.yr]));
console.log('top career goals', E.careerRecords(C,'g').slice(0,3).map(r=>r.v));
console.log('game record', (C.rec.game.g||[]).slice(0,3).map(r=>[r.v,r.yr,r.comp]));
console.log('user MOD top pots', E.squad(C,C.userSid,'MOD').map(p=>p.pot).sort((a,b)=>b-a).slice(0,5), 'cpu', E.squad(C,C.league.find(s=>s!==C.userSid),'MOD').map(p=>p.pot).sort((a,b)=>b-a).slice(0,5));
console.log('user V top ovr', E.squad(C,C.userSid,'V').map(p=>Math.round(E.ovr(p))).sort((a,b)=>b-a).slice(0,8));
console.log('facility news', C.news.filter(n=>n.type==='facility').map(n=>n.text));
