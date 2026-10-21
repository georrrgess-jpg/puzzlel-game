// Calibration: do preview probabilities (same engine, separate seeds) match observed outcomes?
const E=require('./load');
const buckets={};
let n=0;
for(let c=0;c<6;c++){
  const C=E.newCareer({slot:1,seed:1000+c});
  C.phase='regular';
  const fx=Object.values(C.fixtures).filter(f=>f.comp==='reg'&&f.lvl==='V').slice(0,28);
  for(const f of fx){
    const P=E.simProbs(C,f.id,200);
    // observe with many different match seeds (actual match RNG is fid-seeded; salt to sample)
    for(let k=0;k<30;k++){
      const M=E.startMatch(C,f.id,{seedSalt:'obs'+k}); E.runToEnd(C,M);
      const fav = P.h>=P.a? 0:1; const p=Math.max(P.h,P.a);
      const b=Math.min(9,Math.floor(p*10)); buckets[b]=buckets[b]||{pred:0,won:0,drew:0,n:0};
      buckets[b].pred+=p; buckets[b].n++; if(M.sc[fav]>M.sc[1-fav]) buckets[b].won++; if(M.sc[0]===M.sc[1]) buckets[b].drew++; n++;
    }
  }
}
console.log('favorite win calibration (n='+n+' matches)');
for(const b of Object.keys(buckets).sort()){ const x=buckets[b]; const obs=x.won/x.n; const se=Math.sqrt(obs*(1-obs)/x.n); console.log(`pred ${(x.pred/x.n*100).toFixed(1)}%  observed ${(obs*100).toFixed(1)}% ±${(1.96*se*100).toFixed(1)}  draws ${(x.drew/x.n*100).toFixed(0)}%  n=${x.n}`); }
console.log('odds examples', E.american(0.75), E.american(0.25), E.american(0.30), E.american(0.33), E.american(0.95));
