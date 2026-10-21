const E=require('./load');
const assert=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
const C=E.newCareer({slot:2,seed:777});
C.phase='regular';
const uf=Object.values(C.fixtures).find(f=>f.comp==='reg'&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid));
// halftime pause & idempotent resume
{ const M=E.startMatch(C,uf.id,{halftime:true}); while(M.phase==='play') E.stepMatch(C,M);
  assert(M.phase==='ht'&&M.min===40,'halftime pauses at minute 40');
  const before=M.min; E.stepMatch(C,M); assert(M.min===before,'no events processed while at halftime');
  assert(E.resumeSecondHalf(M,'rally')===true,'proceed works'); assert(E.resumeSecondHalf(M,'rally')===false,'proceed is idempotent');
  const other=M.sides[1-M.user]; assert(other.speech==='none','opponent gets no speech'); E.runToEnd(C,M); assert(M.phase==='ft','match completes after halftime'); }
// determinism and surface invariance
{ const run=()=>{ const M=E.startMatch(C,uf.id,{}); E.runToEnd(C,M); return JSON.stringify([M.sc,M.ev.filter(e=>e.t==='goal').map(e=>[e.m,e.pid])]); };
  const a=run(); const st=C.schools[uf.h].stadium; st.surface = st.surface==='turf'?'grass':'turf'; st.ovr={marks:'multi',lights:'towers'}; const b=run(); assert(a===b,'stadium surface/cosmetic edits do not change seeded result');
  st.ovr=null; }
// speech effects across seeded batches (user perspective goal diff in 2nd half)
{ const res={};
  for(const sp of Object.keys(E.SPEECHES)){ let gd=0, gf=0, ga=0, n=300; for(let i=0;i<n;i++){ const M=E.startMatch(C,uf.id,{halftime:true,seedSalt:'sp'+i}); while(M.phase==='play') E.stepMatch(C,M); const h=[...M.sc]; E.resumeSecondHalf(M,sp); E.runToEnd(C,M); const u=M.user; gf+=M.sc[u]-h[u]; ga+=M.sc[1-u]-h[1-u]; } res[sp]=`2H for ${(gf/n).toFixed(2)} against ${(ga/n).toFixed(2)} diff ${((gf-ga)/n).toFixed(2)}`; }
  console.log(res);
  assert(new Set(Object.values(res)).size>4,'speeches alter second-half distributions'); }
// forced winners always win, stats reconcile
{ let ok=true; const fx=Object.values(C.fixtures).filter(f=>f.comp==='reg'&&f.rd===0);
  for(const f of fx){ C.directed[f.id]={mode:'winner',winner:f.a}; const M=E.startMatch(C,f.id,{}); E.runToEnd(C,M); E.finishMatch(C,M); const lg=C.logs[f.id]; const g=[0,1].map(i=>lg.box[i].reduce((a,r)=>a+r.g,0)); if(f.w!==f.a||g[0]!==f.hg||g[1]!==f.ag) ok=false; }
  assert(ok,'directed "away wins" always produces an away win with reconciled scorers');
  const f2=Object.values(C.fixtures).find(f=>f.comp==='reg'&&f.rd===1&&f.lvl==='V'); C.directed[f2.id]={mode:'score',hg:5,ag:2}; const M=E.startMatch(C,f2.id,{}); E.runToEnd(C,M); E.finishMatch(C,M); assert(f2.hg===5&&f2.ag===2,'manual 5-2 score respected');
  // knockout forced shootout winner
  const ko={...f2,id:'KO-T',comp:'sec',st:'s',hg:null,ag:null}; C.fixtures[ko.id]=ko; C.directed[ko.id]={mode:'score',hg:1,ag:1,soWinner:ko.a}; const K=E.startMatch(C,ko.id,{}); E.runToEnd(C,K); E.finishMatch(C,K); assert(ko.w===ko.a && ko.pk && ko.pk[1]>ko.pk[0],'manual knockout tie resolved by forced shootout winner '+JSON.stringify(ko.pk));
  const shooterGoals=C.logs[ko.id].box.flat().reduce((a,r)=>a+r.g,0); assert(shooterGoals===2,'shootout kicks are not counted as goals');
  delete C.fixtures[ko.id]; }
// legacy heavy-favorite rule
{ const strong=Object.values(C.fixtures).filter(f=>f.comp==='reg'&&f.lvl==='V'&&f.st==='s'&&(f.h===C.userSid||f.a===C.userSid));
  C.settings.legacyFav=true; let tested=0;
  for(const f of strong){ const P=E.simProbs(C,f.id,200); const u=f.h===C.userSid?0:1; const pu=u===0?P.h:P.a; if(pu<0.82) continue; tested++; let w=0,g=0,n=200; for(let i=0;i<n;i++){ const M=E.startMatch(C,f.id,{seedSalt:'lg'+i,preP:[P.h,P.a]}); E.runToEnd(C,M); if(M.sc[u]>M.sc[1-u]) w++; g+=M.sc[u]; } console.log(`legacy: base p=${(pu*100).toFixed(0)}% -> win ${(w/n*100).toFixed(0)}%, avg goals ${(g/n).toFixed(1)}`); if(tested>=2) break; }
  if(!tested){ // build a heavy favourite by boosting the user XI
    const lu=E.getLu(C,C.userSid,'V'); for(const s of lu.slots){ const p=C.players[s.pid]; for(const k in p.sk) p.sk[k]=Math.min(99,p.sk[k]+18); }
    const f=strong[0]; const P=E.simProbs(C,f.id,200); const u=f.h===C.userSid?0:1; const pu=u===0?P.h:P.a; let w=0,g=0,n=200; for(let i=0;i<n;i++){ const M=E.startMatch(C,f.id,{seedSalt:'lg'+i,preP:[P.h,P.a]}); E.runToEnd(C,M); if(M.sc[u]>M.sc[1-u]) w++; g+=M.sc[u]; } console.log(`legacy (boosted XI): base p=${(pu*100).toFixed(0)}% odds ${E.american(pu)} -> win ${(w/n*100).toFixed(0)}%, avg goals ${(g/n).toFixed(1)}`); }
  C.settings.legacyFav=false; }
// promotion cascade
{ const D=E.newCareer({slot:3,seed:4242}); const before={}; for(const l of E.LVLS) before[l]=E.squad(D,D.userSid,l).length;
  const jv=E.squad(D,D.userSid,'JV').find(p=>p.pos==='MID'); const res=E.promote(D,jv.id,'V');
  const after={}; for(const l of E.LVLS) after[l]=E.squad(D,D.userSid,l).length;
  assert(res.ok && after.V===before.V+1 && after.JV===before.JV && after.MOD===before.MOD,'JV->V promotion cascades: '+JSON.stringify(before)+' -> '+JSON.stringify(after));
  const ids=Object.keys(D.players); assert(new Set(ids).size===ids.length,'no duplicate players');
  const m=E.squad(D,D.userSid,'MOD')[0]; const r2=E.promote(D,m.id,'V'); assert(r2.ok && E.squad(D,D.userSid,'MOD').length===after.MOD,'MOD->V replenishes Modified');
  for(const l of E.LVLS) assert(E.validateLineup(D,D.userSid,l).ok,'lineup valid after promotions '+l);
  const gk=E.squad(D,D.userSid,'V').filter(p=>p.pos==='GK'); }
// formation validity
{ let ok=true; for(const f of Object.keys(E.FORMS)){ const lu=E.autoLineup(C,C.userSid,'V',f); const gks=lu.slots.filter(s=>s.role==='GK').length; const ids=lu.slots.map(s=>s.pid); if(gks!==1||ids.length!==11||new Set(ids).size!==11||ids.some(x=>!x)) ok=false; } assert(ok,'every formation auto-fills 1 GK + 10 outfield, no duplicates'); }
// three careers distinct
{ const a=E.newCareer({slot:1,seed:1}), b=E.newCareer({slot:2,seed:2}), c=E.newCareer({slot:3,seed:3}); const nm=x=>Object.values(x.schools).map(s=>s.name).sort().join('|'); assert(nm(a)!==nm(b)&&nm(b)!==nm(c),'three new saves generate distinct worlds'); }
