const E=require('./load');
const t0=Date.now();
const C=E.newCareer({slot:1,seed:12345,coachName:'Seth Test'});
console.log('gen ms',Date.now()-t0,'players',Object.keys(C.players).length,'state',C.stateName);
const sch=C.schools[C.userSid]; console.log('user',sch.name,sch.mascot,'XI',E.xiRating(C,C.userSid,'V').toFixed(1));
for(const sid of C.league) console.log(' ',C.schools[sid].name.padEnd(34),E.LVLS.map(l=>E.xiRating(C,sid,l).toFixed(1)).join(' / '));
let goals=0,matches=0,cards=0,reds=0,draws=0;
function playAll(){
  let guard=0;
  while(C.phase!=='offseason' && guard++<200){
    E.simRound(C);
    const ev=E.advance(C);
    if(!ev) { console.log('stuck',C.phase,C.md); break; }
  }
}
const t1=Date.now(); playAll(); console.log('season ms',Date.now()-t1);
for(const f of Object.values(C.fixtures)){ if(f.st!=='d') continue; matches++; goals+=f.hg+f.ag; if(f.hg===f.ag) draws++; const lg=C.logs[f.id]; cards+=lg.st[0].y+lg.st[1].y; reds+=lg.st[0].r+lg.st[1].r; }
console.log({matches,avgGoals:(goals/matches).toFixed(2),drawPct:(draws/matches*100).toFixed(1),yellowsPerMatch:(cards/matches).toFixed(2),reds});
const tab=E.standings(C,'V'); tab.forEach(t=>console.log(C.schools[t.sid].town.padEnd(18),t.p,t.w,t.d,t.l,t.gf,t.ga,t.pts, E.xiRating(C,t.sid,'V').toFixed(1)));
// invariants
let regCount=Object.values(C.fixtures).filter(f=>f.comp==='reg').length; console.log('reg fixtures',regCount);
const pairs=new Set(); for(const f of Object.values(C.fixtures)) if(f.comp==='reg'){ const k=f.lvl+f.h+'>'+f.a; if(pairs.has(k)) console.log('DUP',k); pairs.add(k); }
for(const lvl of E.LVLS){ const s=E.standings(C,lvl); const P=s.reduce((a,t)=>a+t.p,0), GF=s.reduce((a,t)=>a+t.gf,0), GA=s.reduce((a,t)=>a+t.ga,0); console.log(lvl,'games',P/2,'gf=ga',GF===GA); }
// goal reconciliation: every log's box goals equal the score
let bad=0; for(const f of Object.values(C.fixtures)){ if(f.st!=='d') continue; const lg=C.logs[f.id]; const g0=lg.box[0].reduce((a,r)=>a+r.g,0), g1=lg.box[1].reduce((a,r)=>a+r.g,0); const a0=lg.box[0].reduce((a,r)=>a+r.a,0); if(g0!==f.hg||g1!==f.ag||a0>g0) bad++; for(const side of [0,1]) for(const r of lg.box[side]) if(r.a&&r.g&&false) bad++; }
console.log('reconcile bad',bad);
const P=C.tourneys[C.year]; console.log('sec champ',C.schools[P.secChamp].town,'state champ',C.schools[P.stChamp].name,'ext?',!!C.schools[P.stChamp].ext);
const A=C.awards[C.year]; const ids=[...Object.values(A.list).map(a=>a.pid),...A.al1,...A.al2]; console.log('awards',Object.keys(A.list).length,'allleague',A.al1.length,A.al2.length,'unique',new Set(ids).size===ids.length);
for(const k in A.list){ const a=A.list[k]; const p=C.players[a.pid]; console.log('  ',k, p.fn,p.ln, C.schools[p.sid].town, a.v); }
const ro=E.rollover(C); console.log('rollover',ro.ok,'grads',ro.grads.length,'year',C.year,'players',Object.keys(C.players).length,'alumni',Object.keys(C.alumni).length);
console.log('second rollover idempotent?', E.rollover(C).ok===false);
for(const sid of C.league){ const s=E.LVLS.map(l=>{ const q=E.squad(C,sid,l); return q.length+'('+q.filter(p=>p.pos==='GK').length+'gk)'; }); console.log(' ',C.schools[sid].town.padEnd(16), s.join(' '), E.validateLineup(C,sid,'V').ok); }
const json=JSON.stringify({...C,logs:undefined}); const logs=JSON.stringify(C.logs); console.log('save KB',(json.length/1024).toFixed(0),'logs KB',(logs.length/1024).toFixed(0));
module.exports=C;
