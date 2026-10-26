// v18.13 league balance (balanceLeague in engine.js), over 10 seeds x 7 seasons of full engine sims:
// the user's Varsity XI starts the career at 70-72; every season the other league schools sit at 65-72 with one or two at
// 70-72 and the rest 65-69; every third season exactly one of them (never the user) has a golden senior class rated about 85
// whose boost is on seniors only, and the next season that school is back in the league band; no drift over the years.
const E=require('./load');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const R={start:[],band:0,seasons:0,tops:{},gold:[],goldSen:true,revert:true,userGold:false,badGoldYears:0,mean:[]};
for(let i=0;i<10;i++){ const C=E.newCareer({name:'T',seed:'bal'+i,school:null}); R.start.push(Math.round(E.xiRating(C,C.userSid,'V'))); let lastGold=null;
  for(let y=0;y<7;y++){ const others=C.league.filter(s=>s!==C.userSid); const g=(C.golden||{})[C.year]; const rt=others.map(s=>({s,v:Math.round(E.xiRating(C,s,'V'))}));
    const rest=rt.filter(t=>t.s!==g); R.seasons++; if(rest.every(t=>t.v>=65&&t.v<=72)) R.band++; const nt=rest.filter(t=>t.v>=70).length; R.tops[nt]=(R.tops[nt]||0)+1;
    R.mean[y]=(R.mean[y]||0)+rest.reduce((a,t)=>a+t.v,0)/rest.length/10;
    if((C.seasonNo%3===0)!==!!g) R.badGoldYears++;
    if(g){ if(g===C.userSid) R.userGold=true; R.gold.push(Math.round(E.xiRating(C,g,'V'))); const lu=E.getLu(C,g,'V'); const xi=lu.slots.map(x=>C.players[x.pid]).filter(Boolean); const sen=xi.filter(p=>p.grade>=12);
      const avg=a=>a.reduce((s,p)=>s+E.ovr(p),0)/Math.max(1,a.length); const jr=E.squad(C,g,'V').filter(p=>p.grade<12); if(sen.length<8||avg(sen)<84||avg(jr)>72) R.goldSen=false; }
    if(lastGold){ const v=Math.round(E.xiRating(C,lastGold,'V')); if(v<65||v>72) R.revert=false; }
    let n=0; while(C.phase!=='offseason'&&n++<300){ try{ E.simRound(C); }catch(e){} try{ E.advance(C); }catch(e){} }
    lastGold=g||null; const rr=E.rollover(C); if(!rr||!rr.ok) break; } }
console.log(JSON.stringify(R));
ok(R.start.every(v=>v>=70&&v<=72), `the user's Varsity XI starts the career at 70-72 (${R.start.join(' ')})`);
ok(R.band===R.seasons, `every season the other schools sit at 65-72 (${R.band}/${R.seasons})`);
ok(Object.keys(R.tops).every(k=>k==='1'||k==='2'), `one or two of them at 70-72 each season (${JSON.stringify(R.tops)})`);
ok(R.gold.length===20&&R.badGoldYears===0&&!R.userGold, `one golden class every third season, never the user's school (${R.gold.length} in 70 seasons)`);
ok(R.gold.every(v=>v>=84&&v<=86), `golden classes rate about 85 (${R.gold.join(' ')})`);
ok(R.goldSen, 'the golden rating comes from the seniors; the rest of that roster stays at league level');
ok(R.revert, 'the season after, the golden school is back in the league band');
ok(Math.max(...R.mean)-Math.min(...R.mean)<1.5, `no drift: the league mean by season ${R.mean.map(v=>v.toFixed(1)).join(' ')}`);
console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0);
