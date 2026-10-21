// Which halftime speech maximises expected points in which situation? (developer note source)
const E=require('./load');
const C=E.newCareer({slot:2,seed:777}); C.phase='regular';
const fixtures=Object.values(C.fixtures).filter(f=>f.comp==='reg'&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid));
const table={};
for(const f of fixtures.slice(0,10)){
  const P=E.simProbs(C,f.id,150); const u=f.h===C.userSid?0:1; const role=(u===0?P.h:P.a)>(u===0?P.a:P.h)?'favorite':'underdog';
  for(let i=0;i<120;i++){
    const M0=E.startMatch(C,f.id,{halftime:true,seedSalt:'s'+i,preP:[P.h,P.a]}); while(M0.phase==='play') E.stepMatch(C,M0);
    const d=M0.sc[u]-M0.sc[1-u]; const sit=role+' '+(d>0?'leading':d<0?'trailing':'level');
    const snap=JSON.stringify(M0);
    for(const sp of Object.keys(E.SPEECHES)){ const M=JSON.parse(snap); E.resumeSecondHalf(M,sp); E.runToEnd(C,M); const pts=M.sc[u]>M.sc[1-u]?3:M.sc[u]===M.sc[1-u]?1:0; const k=sit; table[k]=table[k]||{}; const t=table[k][sp]||(table[k][sp]={pts:0,n:0}); t.pts+=pts; t.n++; }
  }
}
for(const sit of Object.keys(table).sort()){ const row=Object.entries(table[sit]).map(([k,v])=>[k,v.pts/v.n,v.n]).sort((a,b)=>b[1]-a[1]); console.log(sit.padEnd(20), 'n='+row[0][2], row.map(([k,v])=>k+' '+v.toFixed(2)).join(' | ')); }
