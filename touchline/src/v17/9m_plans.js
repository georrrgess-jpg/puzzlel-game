/* ===================== v18.21 DEVELOPMENT PLANS + MENTORSHIP PROGRAM (engine side) =====================
   Both features plug into the development core (9k_dev.js): growth multipliers (v1821dMod) and per-player focus
   (v1821dFocusFn). No engine.js edits; state is created lazily on the career, so old saves need no migration.

   Development Plans (v1821p / V1821P)
   - Up to V1821P.SLOTS players per level (V, JV, MOD). A plan = {pid,lvl,foc,tgt,s0,md0,h[],st,hitMd}. foc is a single-skill
     focus key (f_sho ... f_gk), tgt an OVR target for the end of the regular season.
   - Effect: x1.15 growth on regular-season matchdays ('tick'), along the plan's focus. When all three slots at a level are
     used, every other player at that level grows x0.99 (split attention).
   - Hitting the target (displayed OVR >= target) gives news and +0.3 OVR once per player per season (never past potential).
   - Plans end when the regular season ends (advance wrapper), with a season summary and one news item.
   - A player who changes level keeps his plan if the new level has a free slot; otherwise it ends with a note.
   - CPU schools: 2 implicit plans per level (seeded among young high-potential players), same x1.15.
   State: C.v1821p = {v:1, yr:{[yr]:{plans:{V,JV,MOD}, rew:{pid:1}, done, sum, ended[], notes[]}}, cpu:{yr, by:{sid:{pid:foc}}}}

   Mentorship Program (v1821m / V1821M)
   - Up to 3 pairs: a Varsity 11th/12th grader mentors a JV or Modified player at least 8 OVR below him.
   - One in-season boost at a time: a mentee who is also on a Development Plan gets the plan's x1.15 on matchdays and the
     mentorship only in the offseason (keeps the two from compounding on one breakout player).
   - Mentee: x(1.08 + 0.05 same position group (0.025 next to it) + up to 0.05 by mentor OVR), cap 1.18, in 'tick' and 'off'
     (the offseason part scales with the share of the regular season the pair was together). His in-season growth leans
     toward the mentor's best skill (unless he is on a plan). Mentor: x0.97 in-season (time spent coaching).
   - Mentor graduates: farewell news and +0.4 OVR for the mentee once (applied before rollover's growth step).
   - CPU schools: 1-2 implicit pairs each, seeded per season.
   State: C.v1821m = {v:1, pairs:[{m,e,yr,md0}], hist:[{m,e,mn,en,yr,why}], cpu:{yr, by:{sid:[{m,e,b}]}}} */
const V1821P={ SLOTS:3, MULT:1.15, SPLIT:0.99, REWARD:0.3, MDS:14, LAST_MD:11, CPU_N:2, off:false };
const V1821M={ PAIRS:3, GAP:8, BASE:1.08, POS:0.05, QUAL:0.05, CAP:1.18, COST:0.97, FAREWELL:0.4, off:false };
const V1821P_SK={ f_sho:'sho', f_pas:'pas', f_def:'def', f_spd:'spd', f_sta:'sta', f_gk:'gk' };
const V1821P_KEYS=['f_sho','f_pas','f_def','f_spd','f_sta','f_gk'];
const v1821pOpenPh=C=>C&&(C.phase==='preseason'||C.phase==='regular');
/* ---------- plans: state ---------- */
function v1821pS(C){ const S=C.v1821p||(C.v1821p={v:1,yr:{},cpu:{yr:null,by:{}}}); if(!S.yr) S.yr={}; if(!S.cpu) S.cpu={yr:null,by:{}}; return S; }
function v1821pY(C,yr){ const S=v1821pS(C); const y=yr==null?C.year:yr; let Y=S.yr[y]; if(!Y){ Y=S.yr[y]={plans:{V:[],JV:[],MOD:[]},rew:{},done:false,sum:null,ended:[],notes:[]}; for(const k of Object.keys(S.yr)) if(+k<C.year-3) delete S.yr[k]; } for(const l of LVLS) if(!Y.plans[l]) Y.plans[l]=[]; return Y; }
/* read-only (no state created): the live plans of the current season, or null */
function v1821pLive(C){ const S=C.v1821p; const Y=S&&S.yr&&S.yr[C.year]; return Y&&!Y.done?Y:null; }
function v1821pOf(C,p){ const Y=v1821pLive(C); if(!Y||!p) return null; const L=Y.plans[p.lvl]; return L?L.find(x=>x.pid===p.id)||null:null; }
function v1821pAny(C,pid){ const Y=v1821pLive(C); if(!Y) return null; for(const l of LVLS){ const x=(Y.plans[l]||[]).find(q=>q.pid===pid); if(x) return x; } return null; }
function v1821pFull(C,lvl){ const Y=v1821pLive(C); return !!Y&&(Y.plans[lvl]||[]).length>=V1821P.SLOTS; }
/* ---------- plans: suggestions ---------- */
function v1821pSugFocus(p){ const w=OVR_W[p.pos]; if(p.pos==='GK') return 'f_gk'; const ks=Object.keys(w).filter(k=>k!=='h'&&w[k]>=0.12);
  ks.sort((a,b)=>(p.sk[a]-p.sk[b])||(w[b]-w[a])); return 'f_'+(ks[0]||'pas'); }
function v1821pTrainF(C,p){ return C.training==='youth'?(p.lvl==='V'?0.85:1.3):1; }
/* expected growth over the rest of the regular season with multiplier m (simulates the shrinking gap) */
function v1821pExpect(C,p,m,from){ if(!p.plan) return 0; const md0=from!=null?from:(C.phase==='preseason'?0:C.md); const n=Math.max(0,V1821P.MDS-md0); let cur=ovr(p), tot=0;
  for(let i=0;i<n;i++){ const gap=p.pot-cur; if(gap<=0) break; const a=Math.min(gap,p.plan.gain*0.034*v1821pTrainF(C,p)*1.05*clamp(gap/12,0.15,1)*m); cur+=a; tot+=a; } return tot; }
function v1821pTgtRange(C,p){ const c=R(ovr(p)); return {lo:c+1, hi:Math.min(p.pot,c+8)}; }
/* the player's growth multiplier from everything except plans, times the plan boost */
function v1821pMultWith(C,p){ let m=1; try{ for(const x of v1821dMult(C,p,'tick').parts) if(x.k!=='v1821p'&&x.k!=='v1821ps') m*=x.m; }catch(e){} return clamp(m*V1821P.MULT,V1821D.CAP[0],V1821D.CAP[1]); }
function v1821pSugTarget(C,p){ const rg=v1821pTgtRange(C,p); let e=v1821pExpect(C,p,v1821pMultWith(C,p));
  const yr0=p.ovr0&&p.ovr0[C.year]; if(C.phase==='regular'&&C.md>=3&&yr0!=null){ const rate=(ovr(p)-yr0)/C.md*1.15; e=(e+rate*Math.max(0,V1821P.MDS-C.md))/2; }
  return clamp(Math.round(ovr(p)+e+0.5),rg.lo,Math.max(rg.lo,rg.hi)); }
function v1821pCanPlan(C,p){ if(!p||p.sid!==C.userSid) return {ok:false,why:'Not your player.'}; if(!p.plan) return {ok:false,why:'No development profile yet.'};
  const rg=v1821pTgtRange(C,p); if(rg.hi<rg.lo) return {ok:false,why:'Already at his potential.'}; return {ok:true}; }
function v1821pCands(C,lvl){ const Y=v1821pLive(C); const on=new Set(Y?LVLS.flatMap(l=>Y.plans[l].map(x=>x.pid)):[]);
  return squad(C,C.userSid,lvl).filter(p=>!on.has(p.id)&&v1821pCanPlan(C,p).ok).map(p=>({p,ex:v1821pExpect(C,p,V1821P.MULT)-v1821pExpect(C,p,1),e:v1821pExpect(C,p,v1821pMultWith(C,p))})).sort((a,b)=>(b.ex-a.ex)||(a.p.id<b.p.id?-1:1)); }
/* ---------- plans: actions (engine side; UI calls these) ---------- */
function v1821pCanEdit(C){ if(!v1821pOpenPh(C)) return {ok:false,why:'Plans run through the regular season. New plans open next preseason.'};
  if(C.phase==='regular'&&C.md>V1821P.LAST_MD) return {ok:false,why:`New plans close after matchday ${V1821P.LAST_MD}.`}; return {ok:true}; }
function v1821pAdd(C,pid,foc,tgt){ const p=C.players[pid]; const e=v1821pCanEdit(C); if(!e.ok) return e; const c=v1821pCanPlan(C,p); if(!c.ok) return c;
  v1821pSync(C); const Y=v1821pY(C); if(v1821pAny(C,pid)) return {ok:false,why:`${pname(p)} already has a plan.`};
  const L=Y.plans[p.lvl]; if(L.length>=V1821P.SLOTS) return {ok:false,why:`All ${V1821P.SLOTS} ${LVL_NAME[p.lvl]} plan slots are in use.`};
  const rg=v1821pTgtRange(C,p); const t=clamp(Math.round(tgt||v1821pSugTarget(C,p)),rg.lo,rg.hi);
  const x={pid,lvl:p.lvl,foc:FOCUS_SHARE[foc]&&V1821P_SK[foc]?foc:v1821pSugFocus(p),tgt:t,s0:Math.round(ovr(p)*100)/100,md0:C.phase==='preseason'?0:C.md,h:[],st:'live',hitMd:null};
  L.push(x); return {ok:true,plan:x,msg:`${pname(p)} starts a ${V1821D_FOC[x.foc]} plan: target OVR ${t}.`}; }
function v1821pRemove(C,pid){ const Y=v1821pLive(C); if(!Y) return {ok:false}; for(const l of LVLS){ const i=Y.plans[l].findIndex(x=>x.pid===pid); if(i>=0){ Y.plans[l].splice(i,1); return {ok:true}; } } return {ok:false}; }
function v1821pSetFocus(C,pid,foc){ const x=v1821pAny(C,pid); if(!x||!V1821P_SK[foc]) return {ok:false}; x.foc=foc; return {ok:true}; }
/* the target can change until the plan's first matchday has been played */
function v1821pTgtLocked(C,x){ return x.h.length>0||x.st!=='live'; }
function v1821pSetTarget(C,pid,d){ const x=v1821pAny(C,pid); const p=C.players[pid]; if(!x||!p||v1821pTgtLocked(C,x)) return {ok:false}; const rg=v1821pTgtRange(C,p); x.tgt=clamp(x.tgt+d,rg.lo,Math.max(rg.lo,rg.hi)); return {ok:true,tgt:x.tgt}; }
/* status: hit / on track / behind (projects the pace so far to the end of the regular season) */
function v1821pStatus(C,x){ const p=C.players[x.pid]; if(x.st==='hit'||x.hitMd!=null) return {k:'hit',t:'Target hit'}; if(x.st==='miss') return {k:'miss',t:'Missed'}; if(x.st==='ended') return {k:'ended',t:'Ended'}; if(!p) return {k:'ended',t:'Ended'};
  const n=x.h.length; const left=Math.max(0,V1821P.MDS-(x.md0+n)); let proj;
  if(n<2) proj=ovr(p)+v1821pExpect(C,p,v1821pMultWith(C,p),x.md0+n); else proj=ovr(p)+(ovr(p)-x.s0)/n*left;
  const on=proj>=x.tgt-0.5; return {k:on?'on':'behind',t:n?(on?'On track':'Behind'):'Starts next matchday',proj}; }
function v1821pProg(C,x){ const p=C.players[x.pid]; const cur=p?ovr(p):x.end||x.s0; const span=Math.max(0.01,(x.tgt-0.5)-x.s0); return clamp((cur-x.s0)/span,0,1); }
/* keep plans consistent with where the players are (promotions, tryouts, leaving the program) */
function v1821pSync(C){ const Y=v1821pLive(C); if(!Y) return [];
  if(!v1821pOpenPh(C)){ v1821pClose(C); return []; }
  const notes=[];
  for(const l of LVLS){ for(const x of Y.plans[l].slice()){ const p=C.players[x.pid];
      if(!p||p.sid!==C.userSid){ Y.plans[l]=Y.plans[l].filter(q=>q!==x); x.st='ended'; x.why='Left the program'; Y.ended.push(x); continue; }
      if(p.lvl!==l){ const T=Y.plans[p.lvl]; Y.plans[l]=Y.plans[l].filter(q=>q!==x);
        if(T&&T.length<V1821P.SLOTS){ x.lvl=p.lvl; T.push(x); const t=`${pname(p)} keeps his ${V1821D_FOC[x.foc]} plan at ${LVL_NAME[p.lvl]}.`; notes.push(t); Y.notes.push({md:C.md,t}); }
        else { x.st='ended'; x.why=`Moved to ${LVL_NAME[p.lvl]}; no free plan slot there`; x.end=Math.round(ovr(p)*100)/100; Y.ended.push(x); const t=`${pname(p)}'s plan ended: he moved to ${LVL_NAME[p.lvl]}, where all ${V1821P.SLOTS} slots are in use.`; notes.push(t); Y.notes.push({md:C.md,t}); } } } }
  if(Y.notes.length>12) Y.notes.splice(0,Y.notes.length-12); return notes; }
function v1821pAfterTick(C){ const Y=v1821pLive(C); if(!Y||C.phase!=='regular') return;
  for(const l of LVLS) for(const x of Y.plans[l]){ const p=C.players[x.pid]; if(!p) continue; x.h.push(Math.round(ovr(p)*100)/100);
    if(x.hitMd==null&&R(ovr(p))>=x.tgt){ x.hitMd=C.md; x.st='hit'; let bonus=0;
      if(!Y.rew[p.id]){ Y.rew[p.id]=1; bonus=Math.max(0,Math.min(V1821P.REWARD,p.pot-ovr(p))); if(bonus>0.009) shiftOvr(p,bonus,x.foc); }
      x.bonus=Math.round(bonus*10)/10; addNews(C,'program',`${pname(p)} hits his development target: OVR ${x.tgt} on his ${V1821D_FOC[x.foc]} plan (${LVL_NAME[p.lvl]})${bonus>0.009?', earning a +0.3 bonus':''}`,C.userSid,{v1821p:1,pid:p.id}); } } }
function v1821pClose(C){ const S=C.v1821p; const Y=S&&S.yr&&S.yr[C.year]; if(!Y||Y.done) return; const res=[];
  for(const l of LVLS) for(const x of Y.plans[l]){ const p=C.players[x.pid]; x.end=p?Math.round(ovr(p)*100)/100:x.s0; if(x.hitMd==null) x.st='miss'; res.push(x); }
  Y.done=true; const hit=res.filter(x=>x.hitMd!=null).length; Y.sum={n:res.length,hit,md:C.md};
  if(res.length) addNews(C,'program',`Development plans wrap up for ${C.schools[C.userSid].town}: ${hit} of ${res.length} target${res.length>1?'s':''} hit`,C.userSid,{v1821p:2}); }
/* ---------- plans: CPU schools (implicit, seeded) ---------- */
function v1821pCpuPick(C){ const S=v1821pS(C); S.cpu={yr:C.year,by:{}};
  for(const sid of C.league){ if(sid===C.userSid) continue; const sch=C.schools[sid]; if(!sch||sch.ext) continue; const r=v1821dR(C,'p',C.year,sid); const by={};
    for(const l of LVLS){ const sq=squad(C,sid,l).filter(p=>p.plan&&p.pot-ovr(p)>=4); if(!sq.length) continue; const g0=Math.min(...sq.map(p=>p.grade));
      const top=sq.map(p=>({p,s:(p.pot-ovr(p))-(p.grade-g0)*3+r()*2})).sort((a,b)=>(b.s-a.s)||(a.p.id<b.p.id?-1:1)).slice(0,5);
      shuffle(r,top); top.slice(0,V1821P.CPU_N).forEach(t=>{ by[t.p.id]=v1821pSugFocus(t.p); }); }
    S.cpu.by[sid]=by; } return S.cpu; }
function v1821pCpu(C){ const S=v1821pS(C); return S.cpu.yr===C.year?S.cpu:v1821pCpuPick(C); }
/* ---------- mentors: state ---------- */
function v1821mS(C){ const S=C.v1821m||(C.v1821m={v:1,pairs:[],hist:[],cpu:{yr:null,by:{}}}); if(!S.pairs) S.pairs=[]; if(!S.hist) S.hist=[]; if(!S.cpu) S.cpu={yr:null,by:{}}; return S; }
const V1821M_ADJ={GK:{GK:1},DEF:{DEF:1,MID:0.5},MID:{MID:1,DEF:0.5,FWD:0.5},FWD:{FWD:1,MID:0.5}};
function v1821mBoost(C,m,e){ const pos=(V1821M_ADJ[m.pos]||{})[e.pos]||0; const qual=clamp((ovr(m)-66)/18,0,1);
  const parts={base:V1821M.BASE-1,pos:V1821M.POS*pos,qual:V1821M.QUAL*qual}; const v=Math.min(V1821M.CAP,1+parts.base+parts.pos+parts.qual); return {m:v,pos,parts}; }
/* the skill the mentee's growth leans toward: the mentor's best skill among those that count for the mentee's position */
function v1821mLean(m,e){ const w=OVR_W[e.pos]; let best=null; for(const k of Object.keys(w)){ if(k==='h'||w[k]<0.06) continue; if(!best||m.sk[k]>m.sk[best]) best=k; } return best?'f_'+best:null; }
function v1821mPairOf(C,p){ const S=C.v1821m; if(!S||!p) return null; if(p.sid===C.userSid) return S.pairs.find(x=>x.m===p.id||x.e===p.id)||null;
  const c=S.cpu&&S.cpu.yr===C.year&&S.cpu.by[p.sid]; return c?c.find(x=>x.m===p.id||x.e===p.id)||null:null; }
function v1821mCan(C,mid,eid,ignorePair){ const m=C.players[mid], e=C.players[eid]; const u=C.userSid;
  if(!m||!e||m.sid!==u||e.sid!==u) return {ok:false,why:'Both players must be in your program.'};
  if(m.lvl!=='V'||m.grade<11) return {ok:false,why:'A mentor must be a Varsity 11th or 12th grader.'};
  if(e.lvl==='V') return {ok:false,why:'A mentee plays JV or Modified.'};
  const gap=ovr(m)-ovr(e); if(gap<V1821M.GAP) return {ok:false,why:`A mentor needs to be at least ${V1821M.GAP} OVR above his mentee (${R(gap)} now).`};
  if(!ignorePair){ const S=v1821mS(C); if(S.pairs.some(x=>x.m===mid||x.e===mid)) return {ok:false,why:`${pname(m)} already mentors someone.`}; if(S.pairs.some(x=>x.e===eid||x.m===eid)) return {ok:false,why:`${pname(e)} already has a mentor.`};
    if(S.pairs.length>=V1821M.PAIRS) return {ok:false,why:`All ${V1821M.PAIRS} mentor pairs are in use.`}; }
  return {ok:true}; }
function v1821mCanEdit(C){ return v1821pOpenPh(C)?{ok:true}:{ok:false,why:'New pairs can be made in the preseason and the regular season.'}; }
function v1821mPair(C,mid,eid){ const e0=v1821mCanEdit(C); if(!e0.ok) return e0; v1821mSync(C); const c=v1821mCan(C,mid,eid); if(!c.ok) return c; const S=v1821mS(C);
  const x={m:mid,e:eid,yr:C.year,md0:C.phase==='preseason'?0:C.md}; S.pairs.push(x); const m=C.players[mid], e=C.players[eid]; const b=v1821mBoost(C,m,e);
  return {ok:true,pair:x,msg:`${pname(m)} now mentors ${pname(e)}: +${Math.round((b.m-1)*100)}% growth for ${e.fn}.`}; }
function v1821mUnpair(C,mid){ const S=v1821mS(C); const i=S.pairs.findIndex(x=>x.m===mid||x.e===mid); if(i<0) return {ok:false}; const x=S.pairs.splice(i,1)[0]; v1821mHist(C,x,'Unpaired'); return {ok:true}; }
function v1821mHist(C,x,why){ const S=v1821mS(C); const m=C.players[x.m]||C.alumni[x.m], e=C.players[x.e]||C.alumni[x.e]; S.hist.unshift({m:x.m,e:x.e,mn:m?pname(m):'',en:e?pname(e):'',yr:C.year,why}); if(S.hist.length>12) S.hist.length=12; }
/* share of the regular season this pair has been together (scales the offseason part of the boost) */
function v1821mShare(C,x){ if(!x.yr||x.yr<C.year) return 1; return clamp((V1821P.MDS-(x.md0||0))/V1821P.MDS,0,1); }
function v1821mSync(C){ const S=C.v1821m; if(!S||!S.pairs.length) return [];
  const notes=[]; for(const x of S.pairs.slice()){ const m=C.players[x.m], e=C.players[x.e]; let why=null;
    if(!m||m.sid!==C.userSid) why='Mentor left the program'; else if(!e||e.sid!==C.userSid) why='Mentee left the program';
    else if(m.lvl!=='V') why=`${pname(m)} left the Varsity`; else if(e.lvl==='V') why=`${pname(e)} joined the Varsity`;
    if(why){ S.pairs=S.pairs.filter(q=>q!==x); v1821mHist(C,x,why); notes.push(`Mentor pair ended: ${why}.`); } } return notes; }
/* suggested pairs: greedy best matches (boost, then size of the gap), no player twice */
function v1821mSuggest(C,n){ const S=v1821mS(C); const u=C.userSid; const busy=new Set(S.pairs.flatMap(x=>[x.m,x.e]));
  const ms=squad(C,u,'V').filter(p=>p.grade>=11&&!busy.has(p.id)); const es=[...squad(C,u,'JV'),...squad(C,u,'MOD')].filter(p=>!busy.has(p.id)&&p.plan&&p.pot-ovr(p)>=2);
  const all=[]; for(const m of ms) for(const e of es){ if(ovr(m)-ovr(e)<V1821M.GAP) continue; const b=v1821mBoost(C,m,e); const val=(b.m-1)*Math.min(e.pot-ovr(e),12)*(e.plan?e.plan.gain:1)*(v1821pAny(C,e.id)?0.5:1); all.push({m,e,b,val}); }
  all.sort((a,b)=>(b.val-a.val)||(a.m.id+a.e.id<b.m.id+b.e.id?-1:1)); const out=[]; const used=new Set();
  for(const x of all){ if(used.has(x.m.id)||used.has(x.e.id)) continue; used.add(x.m.id); used.add(x.e.id); out.push(x); if(out.length>=(n||3)) break; } return out; }
/* ---------- mentors: CPU schools ---------- */
function v1821mCpuPick(C){ const S=v1821mS(C); S.cpu={yr:C.year,by:{}};
  for(const sid of C.league){ if(sid===C.userSid) continue; const sch=C.schools[sid]; if(!sch||sch.ext) continue; const r=v1821dR(C,'m',C.year,sid); const n=r()<0.5?1:2;
    const ms=squad(C,sid,'V').filter(p=>p.grade>=11).sort((a,b)=>(ovr(b)-ovr(a))||(a.id<b.id?-1:1)).slice(0,6); shuffle(r,ms);
    const es=[...squad(C,sid,'JV'),...squad(C,sid,'MOD')].filter(p=>p.plan&&p.pot-ovr(p)>=4).sort((a,b)=>((b.pot-ovr(b))-(a.pot-ovr(a)))||(a.id<b.id?-1:1)).slice(0,8);
    const out=[]; const used=new Set(); for(const m of ms){ if(out.length>=n) break; const opts=es.filter(e=>!used.has(e.id)&&ovr(m)-ovr(e)>=V1821M.GAP); if(!opts.length) continue;
      const same=opts.filter(e=>(V1821M_ADJ[m.pos]||{})[e.pos]===1); const e=pick(r,same.length?same:opts); used.add(e.id); out.push({m:m.id,e:e.id,b:Math.round(v1821mBoost(C,m,e).m*1000)/1000}); }
    S.cpu.by[sid]=out; } return S.cpu; }
function v1821mCpu(C){ const S=v1821mS(C); return S.cpu.yr===C.year?S.cpu:v1821mCpuPick(C); }
/* ---------- growth multipliers ---------- */
v1821dMod('v1821p','Development plan',(C,p,ctx)=>{ if(V1821P.off||ctx!=='tick') return null;
  if(p.sid===C.userSid) return v1821pOf(C,p)?V1821P.MULT:null; const c=v1821pCpu(C).by[p.sid]; return c&&c[p.id]?V1821P.MULT:null; });
v1821dMod('v1821ps','Split attention (plans full)',(C,p,ctx)=>{ if(V1821P.off||ctx!=='tick'||p.sid!==C.userSid) return null; return v1821pFull(C,p.lvl)&&!v1821pOf(C,p)?V1821P.SPLIT:null; });
v1821dMod('v1821m','Mentorship',(C,p,ctx)=>{ if(V1821M.off) return null; let x;
  if(p.sid===C.userSid){ x=v1821mPairOf(C,p); if(!x||x.e!==p.id) return null; if(ctx==='tick'&&v1821pOf(C,p)) return null; const m=C.players[x.m]; if(!m) return null; const b=v1821mBoost(C,m,p).m; return ctx==='off'?1+(b-1)*v1821mShare(C,x):b; }
  const c=v1821mCpu(C).by[p.sid]; x=c&&c.find(q=>q.e===p.id); if(!x) return null; if(ctx==='tick'){ const pc=v1821pCpu(C).by[p.sid]; if(pc&&pc[p.id]) return null; } return x.b; });
v1821dMod('v1821mc','Mentoring time',(C,p,ctx)=>{ if(V1821M.off||ctx!=='tick') return null; if(p.sid===C.userSid){ const S=C.v1821m; return S&&S.pairs.some(x=>x.m===p.id)?V1821M.COST:null; }
  const c=v1821mCpu(C).by[p.sid]; return c&&c.some(q=>q.m===p.id)?V1821M.COST:null; });
/* ---------- skill focus ---------- */
v1821dFocusFn((C,p)=>{ if(V1821P.off) return null; if(p.sid===C.userSid){ const x=v1821pOf(C,p); return x?x.foc:null; } const S=C.v1821p; const c=S&&S.cpu&&S.cpu.yr===C.year&&S.cpu.by[p.sid]; return c&&c[p.id]||null; });
v1821dFocusFn((C,p)=>{ if(V1821M.off) return null; const x=v1821mPairOf(C,p); if(!x||x.e!==p.id) return null; const m=C.players[x.m]; return m?v1821mLean(m,p):null; });
/* ---------- wrappers ---------- */
{ const _dt=devTick; devTick=function(C){ try{ v1821pSync(C); v1821mSync(C); }catch(e){ console.warn('v1821p sync',e); } const r=_dt.apply(this,arguments); try{ v1821pAfterTick(C); }catch(e){ console.warn('v1821p tick',e); } return r; }; }
{ const _adv=advance; advance=function(C){ const ph=C&&C.phase; const ev=_adv.apply(this,arguments); try{ if(ph==='regular'&&C.phase!=='regular') v1821pClose(C); }catch(e){ console.warn('v1821p close',e); } return ev; }; }
{ const _ss=seasonStart; seasonStart=function(C){ const r=_ss.apply(this,arguments); try{ v1821pCpuPick(C); v1821mCpuPick(C); }catch(e){ console.warn('v1821p cpu',e); } return r; }; }
{ const _pr=promote; promote=function(C,pid){ const res=_pr.apply(this,arguments); try{ if(res&&res.ok){ const n=[...v1821pSync(C),...v1821mSync(C)]; if(n.length) res.msg=(res.msg?res.msg+' ':'')+n.join(' '); } }catch(e){ console.warn('v1821p promote',e); } return res; }; }
/* rollover: the farewell bonus goes in before the offseason growth step (so it counts toward last season); pairs whose mentor
   graduated end afterwards with news; mentees who reach the Varsity complete their pairing */
{ const _ro=rollover; rollover=function(C){ const fare=[];
    try{ if(C&&C.phase==='offseason'&&!(C.rolled&&C.rolled[C.year])){ v1821pClose(C); v1821mSync(C); const S=C.v1821m;
        if(S&&!V1821M.off) for(const x of S.pairs){ const m=C.players[x.m], e=C.players[x.e]; if(!m||!e||m.grade<12) continue; let bonus=x.fw===C.year?x.fwb||0:0;
          if(x.fw!==C.year){ x.fw=C.year; bonus=Math.max(0,Math.min(V1821M.FAREWELL,e.pot-ovr(e))); if(bonus>0.009) shiftOvr(e,bonus,v1821mLean(m,e)||'balanced'); x.fwb=Math.round(bonus*10)/10; }
          fare.push({x,mn:pname(m),en:pname(e),elvl:e.lvl,bonus}); } } }catch(e){ console.warn('v1821m farewell',e); }
    const r=_ro.apply(this,arguments);
    try{ if(r&&r.ok){ const S=C.v1821m; for(const f of fare){ if(S.pairs.includes(f.x)){ S.pairs=S.pairs.filter(q=>q!==f.x); }
          const h={m:f.x.m,e:f.x.e,mn:f.mn,en:f.en,yr:C.year-1,why:'Mentor graduated'}; S.hist.unshift(h); if(S.hist.length>12) S.hist.length=12;
          addNews(C,'program',`Farewell, mentor: ${f.mn} graduates, and ${f.en} carries on what he learned${f.bonus>0.009?' (+0.4 OVR)':''}`,C.userSid,{v1821m:1}); }
        v1821mSync(C); } }catch(e){ console.warn('v1821m rollover',e); }
    return r; }; }
