/* ===================== v18.19 SEASON CALENDAR (core) =====================
   The season mapped onto real dates for C.year, and the one open week.
   - Dates: week 1 starts on Labor Day (first Monday of September). Preseason Cup: Saturday two weeks before, then Tuesday and
     Friday of the week before. League: matchdays on Tuesday and Friday (rd 0 = Tuesday of week 1), with ONE OPEN WEEK after
     matchday 8 (week 5, late September / early October). Sectionals Tue/Fri of week 9 and Tue of week 10, the Regional final
     Saturday of week 10, State quarterfinals Thursday and semifinals Saturday of week 11, the State final Saturday of week 12.
   - seasonDate(C,f) is the single source of truth for a game's date and kickoff: {y,m,d,dow,time,label,dn}. weatherFor()'s kick
     time and the Gameday Graphics' day/time read it.
   - School events (picture day, booster night, homecoming week, in-service day, Halloween, senior night, report cards,
     Thanksgiving, the banquet) are seeded per career + year. Homecoming is real: the Friday home game that week gets a 30%
     bigger crowd and a little extra home advantage (both inside startMatch, so odds, sims and live games agree).
   - The open week: C.cal.ow[year] = {pick, locked, done, res}. It resolves exactly once, when the season passes it: the first
     real (non-odds) match of matchday 9 resolves it with the pick (Rest and Recover if nothing was picked). Play shows the
     planner first if nothing is locked in. Temporary rating shifts live in C.cal.fx and are undone by a finishMatch wrapper.
   Identifiers v1819k / V1819K. */
const V1819K={ OPEN_AFTER:8, OPEN_WK:5,
  DOW:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], DOWL:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  MON:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  MONL:['January','February','March','April','May','June','July','August','September','October','November','December'],
  SLOT:{ pre:[[-1,5],[0,1],[0,4]], sec:[[9,1],[9,4],[10,1]], rgn:[[10,5]], st:[[11,3],[11,5],[12,5]] },
  memo:new Map() };
/* ---------- day numbers (days since 1970-01-01, UTC) ---------- */
function v1819kDn(y,m,d){ return Math.round(Date.UTC(y,m,d)/864e5); }
function v1819kYmd(dn){ const D=new Date(dn*864e5); return {y:D.getUTCFullYear(),m:D.getUTCMonth(),d:D.getUTCDate(),dow:D.getUTCDay()}; }
function v1819kLabor(y){ const dn=v1819kDn(y,8,1); return dn+((8-v1819kYmd(dn).dow)%7); }
function v1819kWk(y,k){ return v1819kLabor(y)+7*(k-1); }
function v1819kRegWk(rd){ return rd<V1819K.OPEN_AFTER?1+Math.floor(rd/2):2+Math.floor(rd/2); }
function v1819kRegDn(y,rd){ return v1819kWk(y,v1819kRegWk(rd))+(rd%2?4:1); }
function v1819kOpenDn(y){ return v1819kWk(y,V1819K.OPEN_WK); }
function v1819kFxDn(f){ if(!f) return null; const y=f.yr; if(f.comp==='reg') return v1819kRegDn(y,f.rd); const T=V1819K.SLOT[f.comp]; if(!T) return null; const s=T[Math.max(0,Math.min(f.rd||0,T.length-1))]; return v1819kWk(y,s[0])+s[1]; }
function v1819kSeasonEnd(y){ return v1819kWk(y,12)+5; }
function v1819kFmt(dn,o){ const t=v1819kYmd(dn); o=o||{}; return `${o.long?V1819K.DOWL[t.dow]:V1819K.DOW[t.dow]}, ${V1819K.MON[t.m]} ${t.d}`; }
const _v1819kWx=weatherFor;
function v1819kTime(f,dow){
  if(f.lvl==='JV') return dow===6?'11:00 AM':'4:30 PM'; if(f.lvl==='MOD') return dow===6?'9:30 AM':'3:45 PM';
  let w={night:true,k:'clear'}; try{ w=_v1819kWx(f)||w; }catch(e){}
  if(w.night) return dow===2?'6:30 PM':'7:00 PM'; if(w.k==='golden') return '5:30 PM'; return dow===6||dow===0?'1:00 PM':'4:00 PM'; }
/* THE date of a game. Other features call this when it exists. */
function seasonDate(C,f){ if(!f||!f.yr) return null; const dn=v1819kFxDn(f); if(dn==null) return null; const t=v1819kYmd(dn); const time=v1819kTime(f,t.dow);
  return {y:t.y,m:t.m,d:t.d,dow:t.dow,time,dn,label:`${V1819K.DOW[t.dow]}, ${V1819K.MON[t.m]} ${t.d} · ${time}`}; }
/* keep the existing displays on the same clock */
weatherFor=function(f){ const w=_v1819kWx.apply(this,arguments); try{ if(w&&f&&f.yr&&App.C){ const sd=seasonDate(App.C,f); if(sd) w.kick=sd.time; } }catch(e){} return w; };
if(typeof v1812gWhen==='function'){ const _w=v1812gWhen; v1812gWhen=function(f){ try{ const sd=f&&App.C&&seasonDate(App.C,f); if(sd) return [V1819K.DOW[sd.dow].toUpperCase(),sd.time]; }catch(e){} return _w.apply(this,arguments); }; }

/* ---------- state ---------- */
function v1819kS(C){ let S=C.cal; if(!S||S.v!==1) S=C.cal={v:1,ow:{},fx:[],show:{game:1,open:1,ev:1,riv:1},hc:{}}; for(const k of ['ow','hc']) if(!S[k]) S[k]={}; if(!S.fx) S.fx=[]; if(!S.show) S.show={game:1,open:1,ev:1,riv:1}; return S; }
function v1819kOW(C,yr){ yr=yr||C.year; const S=v1819kS(C); let O=S.ow[yr];
  if(!O){ O=S.ow[yr]={pick:null,locked:false,done:false,res:null};
    /* an old save that is already past the open week: it never happened this year */
    if(yr===C.year&&(['sectionals','regional','states','awards','offseason'].includes(C.phase)||(C.phase==='regular'&&C.md>V1819K.OPEN_AFTER))){ O.done=true; O.legacy=true; } }
  return O; }
function v1819kPending(C){ if(!C||C.phase!=='regular'||C.md<V1819K.OPEN_AFTER) return false; return !v1819kOW(C).done; }
function v1819kUpcoming(C){ if(!C) return false; if(!(C.phase==='preseason'||C.phase==='regular')) return false; if(C.phase==='regular'&&C.md>V1819K.OPEN_AFTER) return false; return !v1819kOW(C).done; }
function v1819kToday(C){ const y=C.year; if(C.phase==='offseason'||C.phase==='awards') return v1819kSeasonEnd(y)+1; if(v1819kPending(C)) return v1819kOpenDn(y);
  const f=userFixture(C)||roundFixtures(C).find(Boolean); const dn=f&&v1819kFxDn(f); if(dn!=null) return dn;
  if(C.phase==='preseason') return v1819kWk(y,-1)+5; return v1819kWk(y,1); }

/* ---------- the friendly opponent: a real State Poll school from outside the league, close to your level ---------- */
function v1819kFriendlyOpp(C){ const O=v1819kOW(C); if(O.opp) return O.opp; let o=null;
  try{ if(typeof v1812pS==='function'){ const P=v1812pS(C); const my=v1812pRating(C,C.userSid,C.year);
      const L=P.pool.teams.map(t=>({t,d:Math.abs(v1812pRating(C,t.id,C.year)-my)})).sort((a,b)=>a.d-b.d||(a.t.id<b.t.id?-1:1)).slice(0,6);
      const r=rngFrom(hashStr(C.seed+'|v1819kfr|'+C.year)); const t=L[Math.floor(r()*L.length)].t; o={id:t.id,town:t.town,name:t.name,sec:t.sec,R:v1812pRating(C,t.id,C.year)}; } }catch(e){ o=null; }
  if(!o) o={id:null,town:'Section 6 Select',name:'a Section 6 select side',sec:6,R:70};
  O.opp=o; return o; }
function v1819kOppSchool(C,o){ try{ if(o&&o.id&&typeof v1812pSchool==='function'){ const s=v1812pSchool(C,o.id); if(s) return s; } }catch(e){} return {id:'v1819kx',town:o?o.town:'Friendly',name:o?o.name:'Friendly',mk:'eagles',mascot:'',c1:'#5a6b80',c2:'#d9dee6',virtual:true}; }

/* ---------- the four options ---------- */
const V1819K_OPTS=[
  {k:'rest',ico:'🛌',t:'Rest and Recover',d:'Feet up, ice baths, early nights. Fresh legs for the run-in.',tags:[['Fitness ++','g'],['Morale +','g'],['No development this week','r']],fx:'Whole Varsity squad +1.2 for the next 2 games'},
  {k:'friendly',ico:'⚽',t:'Friendly',d:'A road friendly against a State Poll school from outside the section. Your bench gets real minutes.',tags:[['Bench development +','g'],['Match sharpness','g'],['Small knock risk','r']],fx:'Non-starters develop; one player may pick up a knock'},
  {k:'clinic',ico:'🎯',t:'Skills Clinic',d:'Three double sessions on your training focus, with the JV and Modified squads joining in.',tags:[['Training ×2','g'],['Every level','g'],['Tired legs','r']],fx:'Your training focus counts double this week'},
  {k:'dayout',ico:'🎳',t:'Team Day Out',d:'Bowling, pizza and the varsity bus to the lake. Nobody talks about soccer.',tags:[['Team spirit ++','g'],['Boost next 3 games','g'],['No training','r']],fx:'Varsity and JV +0.8 for their next 3 games'} ];
function v1819kOpt(k){ return V1819K_OPTS.find(o=>o.k===k)||V1819K_OPTS[0]; }
function v1819kBoost(C,ps,amt,games,why){ const L=v1819kS(C).fx; const out=[];
  for(const p of ps){ if(!p) continue; const o0=ovr(p); shiftOvr(p,amt,'balanced'); const real=ovr(p)-o0; if(Math.abs(real)<0.01) continue; L.push({pid:p.id,amt:Math.round(real*1000)/1000,left:games,lvl:p.lvl,why}); out.push(p.id); }
  return out; }
function v1819kTick(C,f){ const S=v1819kS(C); if(!S.fx.length) return; const u=C.userSid; if(f.h!==u&&f.a!==u) return;
  for(const e of S.fx){ const p=C.players[e.pid]; const lv=p?p.lvl:e.lvl; if(lv!==f.lvl) continue; e.left--; if(e.left<=0&&p) shiftOvr(p,-e.amt,'balanced'); }
  S.fx=S.fx.filter(e=>e.left>0&&C.players[e.pid]); }
function v1819kUndoAll(C){ const S=v1819kS(C); for(const e of S.fx){ const p=C.players[e.pid]; if(p) shiftOvr(p,-e.amt,'balanced'); } S.fx=[]; }
function v1819kPois(r,m){ const L=Math.exp(-m); let k=0,p=1; do{ k++; p*=r(); }while(p>L&&k<9); return k-1; }
const V1819K_FX={
  rest(C,r){ const sq=squad(C,C.userSid,'V'); v1819kBoost(C,sq,1.2,2,'rest'); return {lines:[`Fresh legs: all ${sq.length} Varsity players +1.2 for the next 2 games`,'No development this week'],ps:sq.map(p=>({pid:p.id,d:1.2,tmp:2}))}; },
  friendly(C,r){ const u=C.userSid; const o=v1819kFriendlyOpp(C); const lu=getLu(C,u,'V'); const xi=new Set((lu&&lu.slots||[]).map(s=>s.pid));
    const bench=squad(C,u,'V').filter(p=>!xi.has(p.id)).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)); const ps=[];
    for(const p of bench){ const gap=p.pot-ovr(p); if(gap<=0) continue; const amt=Math.min(gap,0.35+r()*0.45); const o0=ovr(p); shiftOvr(p,amt,'balanced'); const d=ovr(p)-o0; if(d>0.01) ps.push({pid:p.id,d:Math.round(d*10)/10}); }
    let my=70; try{ my=xiRating(C,u,'V'); }catch(e){} const lam=x=>clamp(1.35+x*0.07,0.35,3.2); const gf=v1819kPois(r,lam(my-o.R)), ga=v1819kPois(r,lam(o.R-my));
    let knock=null; if(r()<0.35){ const pool=bench.length?bench:squad(C,u,'V'); const p=pool[Math.floor(r()*pool.length)]; if(p){ v1819kBoost(C,[p],-2,2,'knock'); knock=p.id; } }
    const res=gf>ga?'W':gf<ga?'L':'D';
    const lines=[`Friendly at ${o.town}: ${res==='W'?'won':res==='L'?'lost':'drew'} ${gf}-${ga}`,`${ps.length} bench players got 80 minutes and developed`]; if(knock) lines.push(`${pname(C.players[knock])} took a knock: −2 for the next 2 games`);
    return {lines,ps,opp:o,gf,ga,r:res,knock}; },
  clinic(C,r){ const u=C.userSid; const focus=C.training||'balanced'; const ps=[];
    for(const p of schoolPlayers(C,u)){ if(!p.plan) continue; const gap=p.pot-ovr(p); if(gap<=0) continue; let f=focus==='youth'?(p.lvl==='V'?0.85:1.3):1;
      const amt=Math.min(gap,p.plan.gain*0.136*f*clamp(gap/12,0.15,1)); const o0=ovr(p); shiftOvr(p,amt,focus==='youth'?'balanced':focus); const d=ovr(p)-o0; if(d>0.005) ps.push({pid:p.id,d:Math.round(d*100)/100}); }
    ps.sort((a,b)=>b.d-a.d); const nm=(typeof TRAINING!=='undefined'&&TRAINING[focus])||focus;
    return {lines:[`Double sessions on ${nm}: ${ps.length} players improved`,ps[0]?`Biggest jump: ${pname(C.players[ps[0].pid])} +${ps[0].d.toFixed(2)}`:'Nobody had room to grow'],ps,focus}; },
  dayout(C,r){ const u=C.userSid; const sq=[...squad(C,u,'V'),...squad(C,u,'JV')]; v1819kBoost(C,sq,0.8,3,'dayout');
    const pl=['bowling','go-karts','the lake','mini golf','laser tag']; const where=pl[Math.floor(r()*pl.length)];
    return {lines:[`A day at ${where}: team spirit is sky-high`,`Varsity and JV +0.8 for their next 3 games`],ps:sq.filter(p=>p.lvl==='V').map(p=>({pid:p.id,d:0.8,tmp:3})),where}; } };
function v1819kResolve(C,why){ const O=v1819kOW(C); if(O.done) return O; const k=V1819K_FX[O.pick]?O.pick:'rest'; O.auto=!O.pick; O.pick=k; O.done=true;
  const r=rngFrom(hashStr(C.seed+'|v1819k|'+C.year+'|'+k)); let res; try{ res=V1819K_FX[k](C,r); }catch(e){ console.warn('open week',e); res={lines:['The week passed quietly'],ps:[]}; }
  O.res=res; O.when=why||'auto'; const town=(C.schools[C.userSid]||{}).town||'The team';
  const txt={rest:`Open week: ${town} rest and recover. ${res.lines[0]}.`,friendly:`Open week: ${town} play a friendly at ${res.opp?res.opp.town:'a Section 6 side'} (${res.r} ${res.gf}-${res.ga}). ${res.lines[1]}.`,clinic:`Open week: ${town} run a skills clinic. ${res.lines[0]}.`,dayout:`Open week: ${town} take a team day out. ${res.lines[0]}.`}[k];
  addNews(C,'program',txt+(O.auto?' (No plan was locked in, so the coaches gave everyone the week off.)':''),C.userSid,{v1819k:k});
  try{ if(App&&App.odds) App.odds.clear(); }catch(e){}
  return O; }

/* ---------- homecoming: a Friday home game in weeks 3-8 (not the open week) ---------- */
function v1819kHomecoming(C,yr){ yr=yr||C.year; const key=C.seed+'|'+yr+'|'+C.userSid+'|hc'; const m=V1819K.memo.get(key); if(m) return m;
  const r=rngFrom(hashStr(C.seed+'|v1819khc|'+yr)); const u=C.userSid; const fx=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.comp==='reg'&&f.lvl==='V'&&f.h===u);
  const wks=[6,7,4,3,8]; let best=null; const order=wks.map(w=>({w,k:r()+(w===6||w===7?0:0.6)})).sort((a,b)=>a.k-b.k).map(x=>x.w);
  for(const w of order){ const rd=w<V1819K.OPEN_WK?2*(w-1)+1:2*(w-2)+1; const f=fx.find(x=>x.rd===rd); if(f){ best={wk:w,fid:f.id}; break; } }
  if(!best) best={wk:6,fid:null};
  if(fx.length) V1819K.memo.set(key,best); return best; }
/* ---------- school events, seeded per career and year ---------- */
function v1819kEvents(C,yr){ yr=yr||C.year; const r=rngFrom(hashStr(C.seed+'|v1819kev|'+yr)); const W=k=>v1819kWk(yr,k); const out=[];
  const ev=(k,dn,ico,t,tip,o)=>out.push({kind:'ev',k,dn,ico,t,tip,...(o||{})});
  ev('school',W(1)+2,'🎒','First day of school','Lockers, schedules and a pep talk in the gym. Informational.');
  const pic=W(2+Math.floor(r()*2))+2+Math.floor(r()*2); ev('picture',pic,'📸','Picture day','Team and individual photos before practice. Wear the home kit. Informational.');
  let bn=W(2+Math.floor(r()*3))+3; if(bn===pic) bn+=7; ev('booster',bn,'🍝','Booster night','The Booster Club pasta dinner in the cafeteria. Parents, players and a raffle. Informational.');
  const hc=v1819kHomecoming(C,yr); const hcf=hc.fid&&C.fixtures[hc.fid];
  ev('homecoming',W(hc.wk),'👑','Homecoming week',hcf?`Spirit week ends with the Friday home game against ${Sx(hcf.a).town}: a 30% bigger crowd and a little extra home advantage.`:'Spirit week, the dance and the parade. Informational this year (no Friday home game).',{dn2:W(hc.wk)+4,bar:1,fid:hc.fid});
  ev('inservice',W(6+Math.floor(r()*2)),'✏️','In-service day','No classes: teachers are in training. Practice moves to the morning. Informational.');
  ev('halloween',v1819kDn(yr,9,31),'🎃','Halloween','Costumes in the hallways. Informational.');
  ev('report',W(9+Math.floor(r()*2))+3,'📝','Report cards','First-quarter grades go home. Informational.');
  try{ const sn=seniorNightFixture(C,yr); if(sn&&(yr!==C.year||seniorsOf(C).length)) ev('senior',v1819kFxDn(sn),'🌹','Senior night',`Your seniors are honored before the last home game, against ${Sx(sn.a).town}.`,{fid:sn.id}); }catch(e){}
  { const nov1=v1819kDn(yr,10,1); const th=nov1+((4-v1819kYmd(nov1).dow+7)%7)+21; ev('thanks',th,'🦃','Thanksgiving','No school Thursday and Friday. Informational.'); }
  ev('banquet',v1819kSeasonEnd(yr)+1,'🏆','Awards banquet','End-of-season banquet: letters, captains for next year, the coach\'s speech. Informational.');
  return out.sort((a,b)=>a.dn-b.dn); }
/* ---------- everything on the calendar for one level ---------- */
function v1819kItems(C,yr,lvl){ yr=yr||C.year; lvl=lvl||'V'; const u=C.userSid; const out=[];
  const fx=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.lvl===lvl&&(f.h===u||f.a===u)&&(lvl==='V'||f.comp==='reg'));
  const days=new Set();
  for(const f of fx){ const sd=seasonDate(C,f); if(!sd) continue; days.add(sd.dn); out.push({kind:'game',dn:sd.dn,f,sd,riv:f.comp!=='pre'&&!!isRivalry(C,f.h,f.a),heated:f.comp!=='pre'&&isRivalry(C,f.h,f.a)==='heated'}); }
  if(lvl==='V'){ const P=[['sec',0,'Sectionals begin'],['sec',2,'Section final'],['rgn',0,'Regional final'],['st',0,'State quarterfinals'],['st',1,'State semifinals'],['st',2,'State final']];
    for(const [c,rd,t] of P){ const dn=v1819kFxDn({yr,comp:c,rd}); if(!days.has(dn)) out.push({kind:'post',dn,comp:c,rd,t}); } }
  const O=yr===C.year?v1819kOW(C,yr):(v1819kS(C).ow[yr]||{done:true});
  out.push({kind:'open',dn:v1819kOpenDn(yr),dn2:v1819kOpenDn(yr)+4,O});
  if(O.pick==='friendly'&&lvl==='V'&&!O.legacy) out.push({kind:'friendly',dn:v1819kOpenDn(yr)+2,O,opp:O.res&&O.res.opp||v1819kFriendlyOpp(C)});
  for(const e of v1819kEvents(C,yr)) out.push(e);
  return out.sort((a,b)=>a.dn-b.dn||(a.kind==='game'?-1:1)); }

/* ---------- hooks ---------- */
{ const _sm=startMatch; startMatch=function(C,fid,opts){
    try{ const f=C&&C.fixtures[fid]; if(f&&!(opts&&opts.fast)&&f.yr===C.year&&C.phase==='regular'&&f.comp==='reg'&&f.rd>=V1819K.OPEN_AFTER&&!v1819kOW(C).done) v1819kResolve(C,'auto'); }catch(e){ console.warn('open week',e); }
    const M=_sm.apply(this,arguments);
    try{ const f=C.fixtures[fid]; if(f&&f.comp==='reg'&&f.lvl==='V'&&f.h===C.userSid&&f.yr===C.year){ const hc=v1819kHomecoming(C,f.yr); if(hc.fid===f.id){ M.att=Math.round((M.att||0)*1.3); if(M.sides[0]) M.sides[0].home=Math.min(0.04,(M.sides[0].home||0)+0.012); M.v1819kHc=true; } } }catch(e){}
    return M; }; }
{ const _fm=finishMatch; finishMatch=function(C,M){ const f=C.fixtures[M.fid]; const was=f&&f.st; const out=_fm.apply(this,arguments);
    try{ if(f&&was!=='d'&&f.st==='d'){ v1819kTick(C,f);
        if(M.v1819kHc&&!M.fast){ const S=v1819kS(C); if(!S.hc[f.yr]){ S.hc[f.yr]=f.id; const u=C.userSid; addNews(C,'program',`Homecoming: ${(f.att||0).toLocaleString()} pack the stands as ${Sx(u).town} ${f.w===u?'beat':f.w?'fall to':'draw with'} ${Sx(f.a).town}, ${f.hg}-${f.ag}`,u,{fid:f.id}); } } } }catch(e){ console.warn('calendar',e); }
    return out; }; }
{ const _ad=advance; advance=function(C){ const ev=_ad.apply(this,arguments); try{ if(ev&&C.phase!=='regular'&&C.phase!=='preseason'){ const O=v1819kOW(C); if(!O.done&&!O.legacy) v1819kResolve(C,'auto'); } }catch(e){} return ev; }; }
{ const _ro=rollover; rollover=function(C){ try{ v1819kUndoAll(C); }catch(e){} return _ro.apply(this,arguments); }; }
{ const _mg=migrate; migrate=function(raw){ const C=_mg.apply(this,arguments); try{ if(C&&C.league&&C.fixtures){ v1819kS(C); v1819kOW(C); } }catch(e){} return C; }; }
