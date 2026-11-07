/* ===================== v18.21 PRACTICE PLANNER =====================
   Each level (V, JV, MOD) gets a practice plan for every game week: an intensity and one session type.
   - Intensity: Light x0.85 growth and fresh legs (+0.006 match form), Standard nothing, Intense x1.2 growth but tired legs
     (-0.008, or -0.012 when the level's previous game week was Intense too; the Calendar's open week resets the legs).
   - Session: Technical (growth leans to passing / finishing), Tactical (+0.003 form, no growth change), Conditioning
     (leans to stamina / pace), Scrimmage (Varsity and JV together: +5% growth for the non-starters of both levels).
   - Growth effects are regular-season only (the core's 'tick'); preseason and postseason weeks keep only the form effects.
     The practice multiplier of one week is capped at V1821T.CAP (Intense + Scrimmage do not stack past +20%).
   - Weeks are keyed by fixture: P0-2 preseason, R0-13 league matchdays, S0-2 Sectionals, G Regional, T0-2 State.
   - State (lazy, on the career): C.prac = {v:1, def:{V:{i,s},JV,MOD}, yr:{[yr]:{ov:{[wk]:{[lvl]:{i,s}}}, log:{[wk]:{[lvl]:{i,s,b2b,fm,fid}}}}}}
     ov = per-week overrides; log = the plan frozen when that level's game kicked off (later edits never rewrite history).
   - Other schools: a seeded plan per (school, level, week) like an average coach: mostly Standard, about 12% Intense and 16%
     Light in the league (the growth and form averages cancel), and a taper (Light 45%) in knockout games.
   Identifiers v1821t / V1821T. */
const V1821T={ CAP:1.2, B2B:-0.012, SCRIM:1.05, off:false,
  INT:{ light:{l:'Light',g:0.85,f:0.006}, std:{l:'Standard',g:1,f:0}, int:{l:'Intense',g:1.2,f:-0.008} },
  SES:{ tech:{l:'Technical'}, tac:{l:'Tactical',f:0.003}, cond:{l:'Conditioning'}, scrim:{l:'Scrimmage'} },
  CPU:{ int:0.12, light:0.16, scrim:0.06, tac:0.10, cond:0.22 }, POST:{ light:0.45, tac:0.40 } };
const V1821T_IK=['light','std','int'], V1821T_SK=['tech','tac','cond','scrim'];
/* ---------- weeks ---------- */
function v1821tWk(f){ if(!f) return null; if(f.comp==='pre') return 'P'+f.rd; if(f.comp==='reg') return 'R'+f.rd; if(f.comp==='sec') return 'S'+f.rd; if(f.comp==='rgn') return f.lpo?null:'G'; if(f.comp==='st') return 'T'+f.rd; return null; }
function v1821tOrd(wk){ const n=+wk.slice(1)||0; return ({P:0,R:10,S:30,G:40,T:50}[wk[0]]||0)+n; }
const v1821tReg=wk=>!!wk&&wk[0]==='R';
const V1821T_POST=['S0','S1','S2','G','T0','T1','T2'];
function v1821tWkName(wk,short){ if(!wk) return ''; const n=+wk.slice(1)||0; const t=wk[0];
  if(t==='R') return short?`MD${n+1}`:`Matchday ${n+1}`; if(t==='P') return short?`Pre ${n+1}`:`Preseason Cup ${n+1}`;
  if(t==='S') return short?['Sec QF','Sec SF','Sec F'][n]:['Sectional quarterfinal','Sectional semifinal','Section final'][n];
  if(t==='G') return short?'Regional':'Regional final'; return short?['State QF','State SF','State F'][n]:['State quarterfinal','State semifinal','State final'][n]; }
/* the Calendar's open week (no league games between two matchdays) gives fresh legs: no back-to-back penalty after it */
const v1821tAfterRest=wk=>typeof V1819K!=='undefined'&&V1819K&&wk==='R'+V1819K.OPEN_AFTER;
/* ---------- state ---------- */
function v1821tS(C){ let P=C.prac; if(!P||typeof P!=='object'){ P=C.prac={v:1,def:{},yr:{}}; }
  if(!P.def) P.def={}; if(!P.yr) P.yr={}; for(const l of LVLS){ const d=P.def[l]; if(!d||!V1821T.INT[d.i]||!V1821T.SES[d.s]||(d.s==='scrim'&&l==='MOD')) P.def[l]={i:'std',s:'tech'}; }
  if(P.def.V.s==='scrim'&&P.def.JV.s!=='scrim') P.def.JV.s='scrim'; if(P.def.JV.s==='scrim'&&P.def.V.s!=='scrim') P.def.V.s='scrim';
  for(const y of Object.keys(P.yr)) if(+y<C.year-2) delete P.yr[y]; return P; }
function v1821tY(C,yr){ const P=v1821tS(C); const y=yr==null?C.year:yr; return P.yr[y]||(P.yr[y]={ov:{},log:{}}); }
/* ---------- the user's weeks (fixtures of one level this year, plus the postseason still ahead for Varsity) ---------- */
const V1821T_C={wk:new Map(),cpu:new Map(),key:''};
function v1821tCacheKey(C){ return [C.seed,C.year,C.phase,C.md,C.pre&&C.pre.rd,C.pre&&C.pre.skipped,C.post&&(C.post.cur||[]).join(',')].join('|'); }
function v1821tAlive(C,yr){ const u=C.userSid; for(const id in C.fixtures){ const f=C.fixtures[id]; if(f.yr===yr&&isKO(f.comp)&&!f.lpo&&f.st==='d'&&(f.h===u||f.a===u)&&f.w&&f.w!==u) return false; } return true; }
function v1821tWeeks(C,lvl,yr){ yr=yr==null?C.year:yr; const k=v1821tCacheKey(C); if(V1821T_C.key!==k){ V1821T_C.key=k; V1821T_C.wk.clear(); }
  const ck=lvl+'|'+yr; if(V1821T_C.wk.has(ck)) return V1821T_C.wk.get(ck);
  const u=C.userSid; const out=[];
  for(const id in C.fixtures){ const f=C.fixtures[id]; if(f.yr!==yr||f.lvl!==lvl||f.st==='x'||(f.h!==u&&f.a!==u)) continue; const wk=v1821tWk(f); if(wk) out.push({wk,f}); }
  out.sort((a,b)=>v1821tOrd(a.wk)-v1821tOrd(b.wk));
  if(lvl==='V'&&yr===C.year&&C.phase!=='offseason'&&C.phase!=='awards'&&v1821tAlive(C,yr)){ const last=out.length?v1821tOrd(out[out.length-1].wk):-1;
    for(const wk of V1821T_POST) if(v1821tOrd(wk)>last) out.push({wk,f:null,hyp:true}); }
  V1821T_C.wk.set(ck,out); return out; }
/* ---------- plans ---------- */
function v1821tUserPlan(C,lvl,wk,yr){ const Y=v1821tY(C,yr); const lg=Y.log[wk]&&Y.log[wk][lvl]; if(lg) return {i:lg.i,s:lg.s,src:'played'};
  const o=Y.ov[wk]&&Y.ov[wk][lvl]; const d=v1821tS(C).def[lvl]; let p=o?{i:o.i||d.i,s:o.s||d.s,src:'week'}:{i:d.i,s:d.s,src:'default'};
  if(p.s==='scrim'&&(lvl==='MOD'||!v1821tReg(wk))) p={...p,s:'tech'}; return p; }
function v1821tCpuPlan(C,sid,lvl,wk,yr){ const k=[C.seed,sid,lvl,wk,yr].join('|'); const c=V1821T_C.cpu.get(k); if(c) return c;
  const r=v1821dR(C,'prac',sid,lvl,yr,wk); const u=r(), v=r(); const T=V1821T.CPU, Q=V1821T.POST; let i='std', s='tech';
  if(wk[0]==='S'||wk[0]==='G'||wk[0]==='T'){ i=u<Q.light?'light':'std'; s=v<Q.tac?'tac':'tech'; }
  else { i=u<T.int?'int':u<T.int+T.light?'light':'std';
    const sc=v1821tReg(wk)&&lvl!=='MOD'&&v1821dR(C,'pracS',sid,yr,wk)()<T.scrim;
    s=sc?'scrim':v<T.tac?'tac':v<T.tac+T.cond?'cond':'tech'; }
  const p={i,s,src:'cpu'}; if(V1821T_C.cpu.size>6000) V1821T_C.cpu.clear(); V1821T_C.cpu.set(k,p); return p; }
function v1821tPlan(C,sid,lvl,wk,yr){ yr=yr==null?C.year:yr; return sid===C.userSid?v1821tUserPlan(C,lvl,wk,yr):v1821tCpuPlan(C,sid,lvl,wk,yr); }
/* the level's previous game week (for the back-to-back Intense rule) */
function v1821tPrev(C,sid,lvl,wk,yr){ yr=yr==null?C.year:yr;
  if(sid!==C.userSid){ if(!v1821tReg(wk)) return null; const n=+wk.slice(1); return n>0?'R'+(n-1):null; }
  const W=v1821tWeeks(C,lvl,yr); const o=v1821tOrd(wk); let best=null; for(const x of W){ if(v1821tOrd(x.wk)<o) best=x.wk; else break; } return best; }
function v1821tB2B(C,sid,lvl,wk,yr){ const p=v1821tPlan(C,sid,lvl,wk,yr); if(p.i!=='int'||v1821tAfterRest(wk)) return false; const pw=v1821tPrev(C,sid,lvl,wk,yr); return !!pw&&v1821tPlan(C,sid,lvl,pw,yr).i==='int'; }
/* the plan's match-form delta and growth multiplier (numbers the UI shows come from here) */
function v1821tFormOf(C,sid,lvl,wk,yr){ const p=v1821tPlan(C,sid,lvl,wk,yr); let d=V1821T.INT[p.i].f; if(p.i==='int'&&v1821tB2B(C,sid,lvl,wk,yr)) d=V1821T.B2B; if(p.s==='tac') d+=V1821T.SES.tac.f; return d; }
function v1821tScrimOn(C,sid,wk,yr){ return v1821tReg(wk)&&v1821tPlan(C,sid,'V',wk,yr).s==='scrim'&&v1821tPlan(C,sid,'JV',wk,yr).s==='scrim'; }
function v1821tStarter(C,p){ const lu=getLu(C,p.sid,p.lvl); return !!(lu&&lu.slots&&lu.slots.some(s=>s.pid===p.id)); }
function v1821tGrowOf(C,sid,lvl,wk,yr,starter){ if(!v1821tReg(wk)) return 1; const p=v1821tPlan(C,sid,lvl,wk,yr); let g=V1821T.INT[p.i].g;
  if(lvl!=='MOD'&&!starter&&v1821tScrimOn(C,sid,wk,yr)) g*=V1821T.SCRIM; return Math.min(g,V1821T.CAP); }
/* ---------- hooks into the development core ---------- */
v1821dMod('prac','Practice plan',(C,p,ctx)=>{ if(V1821T.off||ctx!=='tick'||C.phase!=='regular') return null; const sch=C.schools[p.sid]; if(!sch||sch.ext) return null;
  const g=v1821tGrowOf(C,p.sid,p.lvl,'R'+C.md,C.year,v1821tStarter(C,p)); return g===1?null:g; });
function v1821tFocusKey(C,p,base){ if(V1821T.off||!p||!C||C.phase!=='regular') return null; const sch=C.schools[p.sid]; if(!sch||sch.ext||p.pos==='GK') return null;
  const s=v1821tPlan(C,p.sid,p.lvl,'R'+C.md,C.year).s; if(s!=='tech'&&s!=='cond') return null;
  const b=base==null?(p.sid===C.userSid?C.training:sch.devFocus):base; if(b&&b!=='balanced'&&b!=='youth') return null;
  for(const fn of V1821D.focus){ if(fn===v1821tFocusFn) continue; try{ if(fn(C,p,base)) return null; }catch(e){} }
  return s==='tech'?(p.pos==='FWD'?'f_sho':'f_pas'):(p.pos==='FWD'?'f_spd':'f_sta'); }
function v1821tFocusFn(C,p,base){ return v1821tFocusKey(C,p,base); }
v1821dFocusFn(v1821tFocusFn);
v1821dMatch((C,f,sid,side)=>{ if(V1821T.off) return 0; const wk=v1821tWk(f); if(!wk||!C.schools[sid]) return 0; return v1821tFormOf(C,sid,f.lvl,wk,f.yr); });
/* ---------- freeze the user's plan when a real game kicks off ---------- */
function v1821tFreeze(C,f){ const u=C.userSid; if(!f||(f.h!==u&&f.a!==u)) return null; const wk=v1821tWk(f); if(!wk) return null; const Y=v1821tY(C,f.yr); const L=Y.log[wk]||(Y.log[wk]={});
  if(L[f.lvl]) return L[f.lvl]; const p=v1821tUserPlan(C,f.lvl,wk,f.yr); const b2b=v1821tB2B(C,u,f.lvl,wk,f.yr);
  L[f.lvl]={i:p.i,s:p.s,b2b:b2b?1:0,fid:f.id};
  L[f.lvl].fm=Math.round(v1821tFormOf(C,u,f.lvl,wk,f.yr)*10000)/10000; return L[f.lvl]; }
{ const _sm=startMatch; startMatch=function(C,fid,opts){ try{ if(!V1821T.off&&!(opts&&opts.fast)){ const f=C.fixtures[fid]; if(f&&f.st==='s') v1821tFreeze(C,f); } }catch(e){ console.warn('practice freeze',e); }
    return _sm.apply(this,arguments); }; }
/* ---------- season-end practice report (one news item) ---------- */
function v1821tTally(C,lvl,yr){ yr=yr==null?C.year:yr; const Y=v1821tY(C,yr); const t={light:0,std:0,int:0,b2b:0,n:0,rec:{light:[0,0,0],std:[0,0,0],int:[0,0,0]}};
  for(const wk in Y.log){ const x=Y.log[wk][lvl]; if(!x) continue; t[x.i]++; t.n++; if(x.b2b) t.b2b++; const f=C.fixtures[x.fid]; if(f&&f.st==='d'){ const u=C.userSid; const k=f.w===u?0:f.w?2:1; t.rec[x.i][k]++; } } return t; }
{ const _ad=advance; advance=function(C){ const ph=C&&C.phase; const r=_ad.apply(this,arguments);
    try{ if(!V1821T.off&&ph==='regular'&&C.phase==='sectionals'&&C.prac){ const Y=v1821tY(C); if(!Y.news){ Y.news=1; const t=v1821tTally(C,'V'); const L=C.dvx&&C.dvx.yr[C.year];
          const ex=L?LVLS.reduce((a,l)=>a+((L[l]&&L[l].parts.prac)||0),0):0;
          if(t.int+t.light>=3) addNews(C,'program',`Practice report: ${C.schools[C.userSid].town} Varsity went Intense ${t.int} time${t.int===1?'':'s'} and Light ${t.light} time${t.light===1?'':'s'} in league play; practice plans added ${ex>=0?'+':''}${fmt1(ex)} OVR across the program`,C.userSid); } } }catch(e){ console.warn('practice news',e); }
    return r; }; }
