/* ===================== v18.22 BOOSTER FUND =====================
   The booster club raises money every year. You spend it two ways, for Varsity, JV and Modified alike:
   - Facilities (a whole program, permanent): Weight room, Film room, Training pitch, Youth academy. Each has levels 1-3; every level above 1
     adds growth to the levels it covers (V1821F.FAC). The facility multiplier is capped at V1821F.CAP.
   - Private coaching (specific players, one season): up to 3 players a season get x1.25 in-season growth. Not combined with a Player Plan.
   Funds: 10 to start, then 6 + prestige/20 (+2 for a Section title) after every season, at most 24 banked.
   Parity: league schools have seeded facilities (level 2 with a chance of prestige/500 each), so their average multiplier stays near 1.
   Uses the development core (9k_dev.js): v1821dMod, v1821dTab, the ledger. State: C.fnd = {v:1, funds, lv:{wr,fr,tp,ya}, pc:{yr,ids[]}, hist[]}.
   Identifiers v1821f / V1821F. */
const V1821F={ START:10, MAX:24, CAP:1.10, COACH:{cost:3, slots:3, m:1.25, lastMd:10}, UP:[0,0,6,10], off:false,
  FAC:[ {k:'wr',n:'Weight room',ico:'🏋️',lv:['V','JV','MOD'],pc:2.5,d:'Strength and speed work for every squad'},
        {k:'fr',n:'Film room',ico:'🎬',lv:['V','JV'],pc:3,d:'Video study for Varsity and JV'},
        {k:'tp',n:'Training pitch',ico:'🏟️',lv:['V','JV','MOD'],pc:2.5,d:'A better surface and more field time for every squad'},
        {k:'ya',n:'Youth academy',ico:'🌱',lv:['JV','MOD'],pc:3,d:'Age-group programs for JV and Modified'} ], cache:new Map() };
const V1821F_BY=Object.fromEntries(V1821F.FAC.map(f=>[f.k,f]));
function v1821fS(C){ let S=C.fnd; if(!S||typeof S!=='object'){ S=C.fnd={v:1,funds:V1821F.START,lv:{},pc:{yr:0,ids:[]},hist:[]}; }
  if(typeof S.funds!=='number'||!isFinite(S.funds)) S.funds=V1821F.START; if(!S.lv) S.lv={}; for(const f of V1821F.FAC) if(!(S.lv[f.k]>=1&&S.lv[f.k]<=3)) S.lv[f.k]=1;
  if(!S.pc||typeof S.pc!=='object') S.pc={yr:0,ids:[]}; if(!Array.isArray(S.pc.ids)) S.pc.ids=[]; if(!Array.isArray(S.hist)) S.hist=[]; return S; }
/* a league school's level in one facility: seeded, mostly 1 */
function v1821fCpuLv(C,sid,k){ const key=C.seed+'|'+sid+'|'+k; let v=V1821F.cache.get(key); if(v!=null) return v; const s=C.schools[sid]; const r=v1821dR(C,'fac',sid,k);
  v=r()<(s?s.prestige:50)/500?2:1; if(V1821F.cache.size>600) V1821F.cache.clear(); V1821F.cache.set(key,v); return v; }
function v1821fLv(C,sid,k){ return sid===C.userSid?v1821fS(C).lv[k]:v1821fCpuLv(C,sid,k); }
/* the multiplier from facilities for one player, with its parts */
function v1821fFacOf(C,p){ let m=1; const parts=[]; for(const f of V1821F.FAC){ if(!f.lv.includes(p.lvl)) continue; const l=v1821fLv(C,p.sid,f.k); if(l>1){ const x=1+(l-1)*f.pc/100; m*=x; parts.push({k:f.k,m:x}); } } return {m:Math.min(m,V1821F.CAP),parts}; }
v1821dMod('fund','Facilities',(C,p,ctx)=>{ if(V1821F.off) return null; const sch=C.schools[p.sid]; if(!sch||sch.ext||!C.league.includes(p.sid)) return null; const m=v1821fFacOf(C,p).m; return m>1?m:null; });
function v1821fCoached(C,p){ const S=C.fnd; return !!(S&&S.pc&&S.pc.yr===C.year&&S.pc.ids.includes(p.id)); }
v1821dMod('fundpc','Private coaching',(C,p,ctx)=>{ if(V1821F.off||ctx!=='tick'||p.sid!==C.userSid||!v1821fCoached(C,p)) return null; if(typeof v1821pOf==='function'&&v1821pOf(C,p)) return null; return V1821F.COACH.m; });
/* ---------- money ---------- */
function v1821fIncome(C){ const s=C.schools[C.userSid]; const T=C.tourneys&&C.tourneys[C.year-1]; return 6+Math.floor((s?s.prestige:50)/20)+(T&&T.secChamp===C.userSid?2:0); }
function v1821fCost(C,k){ const l=v1821fS(C).lv[k]; return l>=3?null:V1821F.UP[l+1]; }
function v1821fUp(C,k){ const S=v1821fS(C); const f=V1821F_BY[k]; if(!f) return {ok:false,msg:'Unknown facility.'}; const c=v1821fCost(C,k); if(c==null) return {ok:false,msg:f.n+' is already at level 3.'};
  if(S.funds<c) return {ok:false,msg:`You need ${c} funds for level ${S.lv[k]+1}; you have ${S.funds}.`}; S.funds-=c; S.lv[k]++; S.hist.unshift({yr:C.year,t:'up',k,l:S.lv[k],c}); if(S.hist.length>20) S.hist.length=20;
  addNews(C,'program',`The booster club funds ${S.lv[k]===2?'an upgraded':'a top-level'} ${f.n.toLowerCase()} at ${C.schools[C.userSid].town}`,C.userSid); return {ok:true,msg:`${f.n} is now level ${S.lv[k]}.`}; }
function v1821fCoachOpen(C){ return C.phase==='preseason'||(C.phase==='regular'&&C.md<=V1821F.COACH.lastMd); }
function v1821fCoachList(C){ const S=v1821fS(C); return S.pc.yr===C.year?S.pc.ids.filter(id=>C.players[id]&&C.players[id].sid===C.userSid):[]; }
function v1821fCanCoach(C,p){ const S=v1821fS(C); if(!p||p.sid!==C.userSid) return {ok:false,msg:'Not on your program.'}; if(!v1821fCoachOpen(C)) return {ok:false,msg:`Private coaching can be booked in the preseason and through matchday ${V1821F.COACH.lastMd+1}.`};
  if(v1821fCoachList(C).includes(p.id)) return {ok:false,msg:'Already booked this season.'}; if(v1821fCoachList(C).length>=V1821F.COACH.slots) return {ok:false,msg:`All ${V1821F.COACH.slots} private coaching slots are booked this season.`};
  if(S.funds<V1821F.COACH.cost) return {ok:false,msg:`Private coaching costs ${V1821F.COACH.cost} funds; you have ${S.funds}.`}; if(p.pot<=ovr(p)) return {ok:false,msg:'He has reached his potential.'};
  if(typeof v1821pOf==='function'&&v1821pOf(C,p)) return {ok:false,msg:'He is on a Player Plan, which already gives him a focused boost.'}; return {ok:true}; }
function v1821fCoach(C,pid){ const p=C.players[pid]; const c=v1821fCanCoach(C,p); if(!c.ok) return c; const S=v1821fS(C); if(S.pc.yr!==C.year) S.pc={yr:C.year,ids:[]}; S.pc.ids.push(pid); S.funds-=V1821F.COACH.cost;
  S.hist.unshift({yr:C.year,t:'pc',pid,c:V1821F.COACH.cost}); if(S.hist.length>20) S.hist.length=20; return {ok:true,msg:`${p.fn} ${p.ln} has a private coach for the season.`}; }
/* income after each season (rollover wrapper) */
{ const _ro=rollover; rollover=function(C){ const y0=C&&C.year; const r=_ro.apply(this,arguments);
    try{ if(C&&C.year===y0+1&&!V1821F.off&&!V1821D.off){ const S=v1821fS(C); if(!S.inc||S.inc<C.year){ const g=v1821fIncome(C); S.funds=Math.min(V1821F.MAX,S.funds+g); S.inc=C.year; S.hist.unshift({yr:C.year,t:'inc',c:g}); if(S.hist.length>20) S.hist.length=20; } } }catch(e){ console.warn('fund income',e); }
    return r; }; }
