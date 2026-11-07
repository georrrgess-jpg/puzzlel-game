// v18.21 combined balance: the four player-development features together (Coaching Staff, Player Plans + Mentors, Practice
// Planner, Summer Development) on the shared core. Same seed, one season plus rollover, average OVR gained per player by level
// (seniors measured just before they graduate), for your school and for the CPU league schools, in three runs:
//   off  = V1821D.off (the whole system off: the old game)
//   idle = everything on, you make no decisions (CPU schools use their staffs, plans, practice and summers)
//   max  = everything on and used hard: best staff for the budget, 3 plans per level, 3 mentor pairs, Intense + Scrimmage every
//          week, Suggest for me in the summer
// Gates: max adds at most +35% to your growth at any level; idle stays within -5%..+8%; CPU schools within -3%..+5%
// in every run. Growth is read from the core's ledger (each player's growth with and without the boosts, same game state).
const { chromium, DIST } = require('./_pw'); const LVLS=['V','JV','MOD'];
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const errs=[];
  const run=async(seed,mode)=>{ const pg=await b.newPage(); pg.on('pageerror',e=>errs.push(e.message)); await pg.goto(DIST); await pg.waitForTimeout(400);
    const r=await pg.evaluate(([seed,mode])=>{ V1821D.off=mode==='off'; V1821D.bookAll=true; const C=newCareer({slot:1,coachName:'Bal',seed,now:0}); App.C=C; const u=C.userSid;
      if(mode==='max'){
        const best=()=>{ const M=v1821cMkt(C); const S=v1821cS(C); const W=v1821cWeights(C); const bud=v1821cBudget(C);
          const opts=V1821C.ROLES.map(k=>[{k,q:S.u[k],keep:true},{k,q:null},...M.c.filter(q=>q.role===k&&!q.hired).map(q=>({k,q}))]);
          let bv=-1e9,bc=null; const rec=(i,acc,pay,val)=>{ if(pay>bud) return; if(i===4){ if(val>bv){bv=val;bc=acc.slice();} return; } for(const o of opts[i]){ acc.push(o); rec(i+1,acc,pay+(o.q?o.q.sal:0),val+W[o.k]*v1821cEff(o.q?o.q.r:V1821C.VOL)); acc.pop(); } };
          rec(0,[],0,0); for(const o of bc) if(!o.keep&&S.u[o.k]) v1821cRelease(C,o.k); for(const o of bc) if(!o.keep&&o.q) v1821cHire(C,o.q.id,3); };
        best();
        for(const l of LVLS) for(const c of v1821pCands(C,l).slice(0,3)) v1821pAdd(C,c.p.id);
        for(const s of v1821mSuggest(C,3)) v1821mPair(C,s.m.id,s.e.id);
        const P=v1821tS(C); P.def={V:{i:'int',s:'scrim'},JV:{i:'int',s:'scrim'},MOD:{i:'int',s:'tech'}};
      }
      const yr0=C.year; const s0={}; for(const id in C.players){ const p=C.players[id]; const sc=C.schools[p.sid]; if(sc&&!sc.ext&&C.league.includes(p.sid)) s0[id]=ovr(p); }
      let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); advance(C); }
      const reg=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.comp==='reg'&&f.lvl==='V'&&f.st==='d'&&(f.h===u||f.a===u)); const W=reg.filter(f=>f.w===u).length, L=reg.filter(f=>f.w&&f.w!==u).length;
      if(mode==='max'){ try{ v1821uSuggest(C); }catch(e){} }
      const lv={}; for(const id in s0) if(C.players[id]) lv[id]=[C.players[id].sid===u?'u':'c',C.players[id].lvl];
      const end={}; const _g=gradOutcome, _h=hofInduct; gradOutcome=function(r,p){ end[p.id]=ovr(p); return _g.apply(this,arguments); }; hofInduct=function(C2){ for(const id in s0) if(C2.players[id]&&end[id]==null) end[id]=ovr(C2.players[id]); return _h.apply(this,arguments); };
      try{ rollover(C); }finally{ gradOutcome=_g; hofInduct=_h; }
      const agg={}; for(const id in lv){ if(end[id]==null) continue; const k=lv[id].join(':'); const a=agg[k]||(agg[k]={s:0,n:0}); a.s+=end[id]-s0[id]; a.n++; }
      const out={}; for(const k in agg) out[k]=agg[k].s/agg[k].n; V1821D.off=false; V1821D.bookAll=false;
      const Y=(C.dvx&&C.dvx.yr[yr0])||{}; const led={}; for(const k of ['V','JV','MOD','cV','cJV','cMOD']){ const L=Y[k]; led[k]=L&&L.base>0?L.tot/L.base:1; }
      let maxM=0; for(const id in C.players){ const p=C.players[id]; if(p.plan) maxM=Math.max(maxM,v1821dMult(C,p,'tick').raw); }
      return {g:out,led,W,L,n:reg.length,maxM}; },[seed,mode]); await pg.close(); return r; };
  const rows=[]; let worstMax=0, idleLo=9, idleHi=0, cpuLo=9, cpuHi=0; let wIdle=0, wMax=0; const pc=r=>((r-1)*100).toFixed(1)+'%';
  for(const seed of ['devbal-1','devbal-2','devbal-3']){ const R={}; for(const m of ['off','idle','max']) R[m]=await run(seed,m);
    wIdle+=R.idle.W-R.idle.L; wMax+=R.max.W-R.max.L;
    for(const l of LVLS){ const i=R.idle.led[l], x=R.max.led[l], ci=R.idle.led['c'+l], cx=R.max.led['c'+l];
      rows.push(`${seed} ${l.padEnd(3)} | growth from boosts (ledger): you idle ${pc(i)} max ${pc(x)} | CPU idle ${pc(ci)} max ${pc(cx)} | realized OVR/player: you off ${R.off.g['u:'+l].toFixed(2)} idle ${R.idle.g['u:'+l].toFixed(2)} max ${R.max.g['u:'+l].toFixed(2)}, CPU off ${R.off.g['c:'+l].toFixed(2)} idle ${R.idle.g['c:'+l].toFixed(2)} max ${R.max.g['c:'+l].toFixed(2)}`);
      worstMax=Math.max(worstMax,x-1); idleLo=Math.min(idleLo,i); idleHi=Math.max(idleHi,i); cpuLo=Math.min(cpuLo,ci,cx); cpuHi=Math.max(cpuHi,ci,cx); }
    rows.push(`${seed} Varsity league W-L: off ${R.off.W}-${R.off.L} idle ${R.idle.W}-${R.idle.L} max ${R.max.W}-${R.max.L}; highest raw multiplier ${R.max.maxM.toFixed(2)}`); }
  console.log(rows.join('\n'));
  console.log('(Realized growth differs between runs because results, lineups and promotions diverge once ratings differ; the ledger compares each player with and without the boosts in the same game state.)');
  ok(worstMax<=0.35, `everything used hard adds at most +35% to your growth at any level (worst ${pc(1+worstMax)})`);
  ok(idleLo>=0.95&&idleHi<=1.08, `with no decisions your growth stays close to the old game (${pc(idleLo)} to ${pc(idleHi)})`);
  ok(cpuLo>=0.97&&cpuHi<=1.05, `CPU schools' growth from their own staffs, plans, practice and summers stays small (${pc(cpuLo)} to ${pc(cpuHi)})`);
  console.log(`info: Varsity league win margin over three seasons: max ${wMax}, idle ${wIdle} (too few games to judge; test/practice.js measures the cost of Intense practice over 20 seeds)`);
  ok(!errs.length, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?`${fails} FAILED`:'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
