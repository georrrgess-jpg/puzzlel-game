/* ===================== v18.21 COACHING STAFF =====================
   Four assistant coaches under the head coach. Each has a name, a rating (40-90), a specialty, a salary and a contract.
   - Roles: JV Coach (every JV player), Modified Coach (every MOD player), Goalkeeper Coach (every GK at every level),
     Strength & Conditioning Coach (every Varsity player; his specialty leans growth toward pace or stamina through the
     development focus hook, only when no other focus applies and the team trains Balanced).
   - Effect: a growth multiplier 1 + (rating-60)/250 for each role that covers a player (40 = 0.92, 60 = 1.00, 90 = 1.12),
     +0.02 when the coach's specialty matches the team training focus. The product per player is capped at V1821C.CAP, so
     the staff can never add more than +12% to anyone. It applies to 'tick' and 'off' growth through v1821dMod('staff').
   - A vacant role is covered by a volunteer (rating 45, free, -6%).
   - Budget: 100 + school prestige per season ($k). Payroll may never exceed it when hiring or renewing.
   - Market: 3-4 seeded candidates per role, refreshed for each hiring window (preseason and offseason). Hiring and
     releasing happen only in those windows.
   - Rollover: +1..+3 rating per season served (seeded, max 90); contracts that end are re-signed at a new salary (if the
     coach is willing and it fits) or he leaves (news); after a strong season a good coach may be poached (rare, news).
   - Parity: every other league school has seeded staff ratings recentred each season to an average of exactly 60 per role,
     so their average multiplier stays ~1.00.
   State: C.stf (created lazily; safe for old saves). Identifiers v1821c / V1821C. */
const V1821C={ ROLES:['JV','MOD','GK','SC'], VOL:45, MIN:40, MAX:90, CAP:1.12, SPEC:0.02, MEAN:60, WILL:0.8, POACH:0.12, off:false };
const V1821C_ROLE={
  JV:{t:'JV Coach', s:'JV', who:'every JV player', fx:'JV growth'},
  MOD:{t:'Modified Coach', s:'Modified', who:'every Modified player', fx:'Modified growth'},
  GK:{t:'Goalkeeper Coach', s:'Goalkeeper', who:'every goalkeeper at every level', fx:'Goalkeeper growth'},
  SC:{t:'Strength & Conditioning Coach', s:'S&C', who:'every Varsity player', fx:'Varsity growth'} };
const V1821C_SPECS={ JV:['attacking','defending','possession','fitness','youth'], MOD:['attacking','defending','possession','fitness','youth'], GK:['gk_stop','gk_dist'], SC:['sc_pace','sc_sta'] };
const V1821C_SPN={ attacking:'Attacking play', defending:'Defending', possession:'Possession', fitness:'Fitness', youth:'Youth development', gk_stop:'Shot-stopping', gk_dist:'Distribution', sc_pace:'Pace', sc_sta:'Stamina' };
/* the team training focus (C.training) each specialty matches */
const V1821C_SPT={ attacking:'attacking', defending:'defending', possession:'possession', fitness:'fitness', youth:'youth', gk_stop:'defending', gk_dist:'possession', sc_pace:'fitness', sc_sta:'fitness' };
const v1821cR=(C,...k)=>v1821dR(C,'v1821c',...k);
function v1821cSal(r){ const x=Math.max(0,r-40); return Math.round(6+0.5*x+0.0252*x*x); }
function v1821cAsk(c){ return Math.max(c.sal+2,Math.round(v1821cSal(c.r)*1.08)); }
function v1821cBudget(C){ const s=C.schools[C.userSid]; return 100+Math.round((s&&s.prestige)||0); }
function v1821cPay(C){ const S=v1821cS(C); let t=0; for(const k of V1821C.ROLES) if(S.u[k]) t+=S.u[k].sal; return t; }
function v1821cEff(r){ return (r-V1821C.MEAN)/250; }
function v1821cMatch(C,c){ return !!(c&&C.training&&V1821C_SPT[c.sp]===C.training); }
/* growth effect of a role for your school (a fraction: 0.08 = +8%) */
function v1821cRoleEff(C,k){ const c=v1821cS(C).u[k]; if(!c) return v1821cEff(V1821C.VOL); return v1821cEff(c.r)+(v1821cMatch(C,c)?V1821C.SPEC:0); }
function v1821cRolesOf(p){ const out=[p.lvl==='JV'?'JV':p.lvl==='MOD'?'MOD':'SC']; if(p.pos==='GK') out.push('GK'); return out; }
function v1821cName(r){ const [f,l]=genName(r); return f+' '+l; }
function v1821cCoach(C,r,role,rating,o){ const sp=pick(r,V1821C_SPECS[role]); const rr=Math.round(clamp(rating,V1821C.MIN,V1821C.MAX));
  return Object.assign({id:'sc'+(hashStr(C.seed+'|'+role+'|'+r())%1e9).toString(36), nm:v1821cName(r), r:rr, sp, sal:v1821cSal(rr), since:C.year, end:C.year, yrs:0, hue:Math.floor(r()*360)},o||{}); }
/* ---------- state ---------- */
function v1821cS(C){ let S=C.stf;
  if(!S||!S.v){ S=C.stf={v:1,u:{},mkt:{k:null,c:[]},cpu:{yr:null,s:{}},lost:[]}; const r=v1821cR(C,'init');
    /* the program inherits three part-time assistants (average ~60, short contracts) and has never had a goalkeeper coach */
    ['JV','MOD','SC'].forEach((k,i)=>{ const c=v1821cCoach(C,r,k,60+gauss(r)*4.5,{end:C.year+(i===0?0:rint(r,0,1))}); c.yrs=rint(r,0,4); S.u[k]=c; }); S.u.GK=null; }
  if(S.cpu.yr!==C.year) v1821cCpuRoll(C,S);
  return S; }
function v1821cCpuSids(C){ return C.league.filter(s=>s!==C.userSid&&C.schools[s]&&!C.schools[s].ext); }
/* CPU staff: keep 75% of coaches (+1..3 experience), replace the rest, then recentre each role on 60 (parity) */
function v1821cCpuRoll(C,S){ const prev=S.cpu.s||{}; const r=v1821cR(C,'cpu',C.year); const out={}; const sids=v1821cCpuSids(C);
  for(const sid of sids){ const o={}; for(const k of V1821C.ROLES){ const old=prev[sid]&&prev[sid][k]; o[k]=(old!=null&&r()<0.75)?Math.min(V1821C.MAX,old+rint(r,1,3)):clamp(V1821C.MEAN+gauss(r)*9,V1821C.MIN,85); } out[sid]=o; }
  if(sids.length) for(const k of V1821C.ROLES) for(let it=0;it<4;it++){ const m=sids.reduce((a,s)=>a+out[s][k],0)/sids.length; const d=V1821C.MEAN-m; if(Math.abs(d)<0.05) break; for(const s of sids) out[s][k]=clamp(out[s][k]+d,V1821C.MIN,V1821C.MAX); }
  for(const s of sids) for(const k of V1821C.ROLES) out[s][k]=Math.round(out[s][k]*10)/10;
  S.cpu={yr:C.year,s:out}; }
/* ---------- the multiplier ---------- */
function v1821cMultFor(C,p){ const sch=C.schools[p.sid]; if(!sch||sch.ext) return null; const S=v1821cS(C); let m=1;
  if(p.sid===C.userSid){ for(const k of v1821cRolesOf(p)) m*=1+v1821cRoleEff(C,k); }
  else { const o=S.cpu.s[p.sid]; if(!o) return null; for(const k of v1821cRolesOf(p)) m*=1+v1821cEff(o[k]); }
  return Math.min(V1821C.CAP,m); }
v1821dMod('staff','Coaching staff',(C,p,ctx)=>V1821C.off?null:v1821cMultFor(C,p));
/* S&C specialty: Varsity outfield players lean toward pace or stamina, only when nothing else sets a focus */
function v1821cFocusFor(C,p,base){ if(V1821C.off||p.sid!==C.userSid||p.lvl!=='V'||p.pos==='GK') return null; const c=v1821cS(C).u.SC; if(!c) return null;
  const free=base==='balanced'||(base==null&&(C.training==='balanced'||C.training==='youth')); if(!free) return null; return c.sp==='sc_pace'?'f_spd':'f_sta'; }
{ const _vf=v1821dFocus; v1821dFocus=function(C,p,base){ const k=_vf.apply(this,arguments); if(k!==base) return k; try{ const z=v1821cFocusFor(C,p,base); if(z&&FOCUS_SHARE[z]) return z; }catch(e){} return k; }; }
/* ---------- hiring window and market ---------- */
function v1821cWin(C){ return C.phase==='offseason'?'off':C.phase==='preseason'?'pre':null; }
function v1821cMktKey(C){ const w=v1821cWin(C); return w?C.year+w:null; }
function v1821cMkt(C){ const S=v1821cS(C); const key=v1821cMktKey(C); if(!key) return null; if(S.mkt.k===key) return S.mkt;
  const r=v1821cR(C,'mkt',key); const c=[];
  for(const k of V1821C.ROLES){ const n=3+(r()<0.5?1:0); const rs=[]; for(let i=0;i<n;i++) rs.push(clamp(58+gauss(r)*11,42,90)); if(Math.max(...rs)<70) rs[0]=rint(r,70,84);
    rs.sort((a,b)=>b-a).forEach((x,i)=>{ const q=v1821cCoach(C,r,k,x); q.sal=Math.max(5,Math.round(q.sal*(0.9+r()*0.25))); q.role=k; q.id='m'+key+k+i; c.push(q); }); }
  S.mkt={k:key,c}; return S.mkt; }
function v1821cSince(C){ return C.phase==='offseason'?C.year+1:C.year; }
function v1821cHire(C,cid,yrs){ const w=v1821cWin(C); if(!w) return {ok:false,msg:'Coaches can only be hired in the preseason or offseason.'};
  const M=v1821cMkt(C); const q=M.c.find(x=>x.id===cid&&!x.hired); if(!q) return {ok:false,msg:'That candidate is no longer available.'};
  yrs=Math.round(+yrs||1); if(yrs<1||yrs>3) return {ok:false,msg:'Contracts run 1 to 3 seasons.'};
  const S=v1821cS(C); const cur=S.u[q.role]; const pay=v1821cPay(C)-(cur?cur.sal:0)+q.sal; const bud=v1821cBudget(C);
  if(pay>bud) return {ok:false,msg:`Over budget: payroll would be $${pay}k of $${bud}k.`};
  const since=v1821cSince(C); S.u[q.role]={id:q.id.replace(/^m/,'h'),nm:q.nm,r:q.r,sp:q.sp,sal:q.sal,since,end:since+yrs-1,yrs:0,hue:q.hue}; q.hired=true;
  return {ok:true,msg:`${q.nm} hired as ${V1821C_ROLE[q.role].t} through ${since+yrs-1}${cur?` (${cur.nm} released)`:''}.`}; }
function v1821cRelease(C,k){ if(!v1821cWin(C)) return {ok:false,msg:'Staff changes are made in the preseason or offseason.'}; const S=v1821cS(C); const c=S.u[k]; if(!c) return {ok:false,msg:'That role is already vacant.'};
  S.u[k]=null; return {ok:true,msg:`${c.nm} released. A volunteer covers the ${V1821C_ROLE[k].t} role.`}; }
/* contract renewals: offseason, final-year coaches who want to stay */
function v1821cExpiring(C,c){ return !!(c&&c.end<=C.year); }
function v1821cWilling(C,c){ return v1821cR(C,'will',c.id,C.year)()<V1821C.WILL; }
function v1821cRenew(C,k,yrs){ if(C.phase!=='offseason') return {ok:false,msg:'Contracts are renewed in the offseason.'}; const S=v1821cS(C); const c=S.u[k];
  if(!c||!v1821cExpiring(C,c)) return {ok:false,msg:'No contract to renew.'}; if(!v1821cWilling(C,c)) return {ok:false,msg:`${c.nm} has decided to move on.`};
  yrs=Math.round(+yrs||1); if(yrs<1||yrs>3) return {ok:false,msg:'Contracts run 1 to 3 seasons.'};
  const ask=v1821cAsk(c); const pay=v1821cPay(C)-c.sal+ask; const bud=v1821cBudget(C); if(pay>bud) return {ok:false,msg:`Over budget: payroll would be $${pay}k of $${bud}k.`};
  c.sal=ask; c.end=C.year+yrs; return {ok:true,msg:`${c.nm} re-signed through ${c.end} at $${ask}k a season.`}; }
/* decisions waiting (badge, This week) */
function v1821cDecisions(C){ const w=v1821cWin(C); if(!w) return []; const S=v1821cS(C); const out=[];
  for(const k of V1821C.ROLES){ const c=S.u[k]; if(!c) out.push({k,t:'vacant'}); else if(w==='off'&&v1821cExpiring(C,c)) out.push({k,t:v1821cWilling(C,c)?'expiring':'leaving'}); }
  return out; }
/* ---------- rollover ---------- */
function v1821cAfterRoll(C,yr,strong){ const S=v1821cS(C); const r=v1821cR(C,'roll',yr); const sch=C.schools[C.userSid];
  for(const k of V1821C.ROLES){ const c=S.u[k]; if(!c||c.since>yr) continue; c.yrs++; c.r=Math.min(V1821C.MAX,c.r+rint(v1821cR(C,'exp',yr,c.id),1,3)); }
  /* poaching after a strong season: rare, at most one, a long contract halves the risk */
  if(strong){ const cand=V1821C.ROLES.filter(k=>{ const c=S.u[k]; return c&&c.r>=75&&c.since<=yr&&c.end>yr; });
    for(const k of cand){ const c=S.u[k]; const p=V1821C.POACH*(c.end-yr>=2?0.5:1); if(r()<p){ const others=v1821cCpuSids(C); const to=others.length?C.schools[pick(r,others)]:null;
        S.u[k]=null; S.lost.push({yr,k,nm:c.nm,r:c.r,to:to?to.id:null,why:'poach'}); addNews(C,'program',`${to?to.name:'Another program'} hire away ${sch.town}'s ${V1821C_ROLE[k].t} ${c.nm} after a strong season`,C.userSid); break; } } }
  /* contracts that ran out: re-sign at a new salary if willing and affordable, otherwise he leaves */
  for(const k of V1821C.ROLES){ const c=S.u[k]; if(!c||c.end>yr) continue;
    const C0={...C,year:yr}; const will=v1821cWilling(C0,c); const ask=v1821cAsk(c); const fits=v1821cPay(C)-c.sal+ask<=v1821cBudget(C);
    if(will&&fits){ c.sal=ask; c.end=C.year; addNews(C,'program',`${V1821C_ROLE[k].t} ${c.nm} re-signs with ${sch.town} for one season at $${ask}k`,C.userSid); }
    else { S.u[k]=null; S.lost.push({yr,k,nm:c.nm,r:c.r,why:will?'budget':'left'}); addNews(C,'program',`${V1821C_ROLE[k].t} ${c.nm} leaves ${sch.town} as his contract runs out${will?' (no room in the staff budget)':''}`,C.userSid); } }
  if(S.lost.length>12) S.lost=S.lost.slice(-12);
  v1821cCpuRoll(C,S); }
{ const _ro=rollover; rollover=function(C){ let yr=null, strong=false;
    try{ if(C&&C.phase==='offseason'&&!(C.rolled&&C.rolled[C.year])&&!V1821C.off&&!V1821D.off){ yr=C.year; v1821cS(C); const tab=standings(C,'V',yr); const i=tab.findIndex(t=>t.sid===C.userSid); const T=C.tourneys&&C.tourneys[yr];
        strong=(i>=0&&i<=1)||!!(T&&T.secChamp===C.userSid); } }catch(e){ console.warn('staff pre-roll',e); }
    const res=_ro.apply(this,arguments);
    try{ if(yr!=null&&C.rolled&&C.rolled[yr]) v1821cAfterRoll(C,yr,strong); }catch(e){ console.warn('staff rollover',e); }
    return res; }; }
{ const _mg=migrate; migrate=function(C){ const r=_mg.apply(this,arguments); try{ if(C&&C.stf&&C.stf.v){ const S=C.stf; S.u=S.u||{}; S.mkt=S.mkt||{k:null,c:[]}; S.cpu=S.cpu||{yr:null,s:{}}; S.lost=S.lost||[]; } }catch(e){} return r; }; }
/* a sensible staff for a budget (used by the test script and the "Suggest" hint): best total value per $ */
function v1821cWeights(C){ const u=C.userSid; const n=l=>squad(C,u,l).filter(p=>p.pot>ovr(p)).length; const gk=Object.values(C.players).filter(p=>p.sid===u&&p.pos==='GK'&&p.pot>ovr(p)).length;
  /* roughly how much OVR a +1% on that role adds per season (players x typical yearly growth) */
  return {JV:n('JV')*4.2, MOD:n('MOD')*5, SC:n('V')*1.7, GK:gk*3.5}; }
