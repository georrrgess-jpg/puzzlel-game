const E=require('./load');
for(const boost of [1.5,3,4.5,6]){
  const C=E.newCareer({slot:2,seed:777}); C.phase='regular';
  const lu=E.getLu(C,C.userSid,'V'); for(const s of lu.slots){ const p=C.players[s.pid]; for(const k in p.sk) p.sk[k]=Math.min(99,p.sk[k]+boost); }
  const f=Object.values(C.fixtures).find(f=>f.comp==='reg'&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid));
  const P=E.simProbs(C,f.id,300); const u=f.h===C.userSid?0:1; const pu=u===0?P.h:P.a;
  for(const on of [false,true]){ C.settings.legacyFav=on; let w=0,g=0,n=400; const dist={}; for(let i=0;i<n;i++){ const M=E.startMatch(C,f.id,{seedSalt:'lg'+i,preP:[P.h,P.a]}); E.runToEnd(C,M); if(M.sc[u]>M.sc[1-u]) w++; g+=M.sc[u]; dist[M.sc[u]]=(dist[M.sc[u]]||0)+1; }
  console.log(`boost ${boost} base p=${(pu*100).toFixed(0)}% odds ${E.american(pu)} legacy=${on} win ${(w/n*100).toFixed(0)}% avg goals ${(g/n).toFixed(1)}`); }
}
