/* ===================== v18.21 PLAYER DEVELOPMENT CORE =====================
   One place where every development feature plugs in, so their effects stack predictably and stay balanced.
   - Growth multipliers: V1821D.mods holds {k,label,fn(C,p,ctx)} where fn returns a multiplier (1 = no effect) or null.
     ctx = 'tick' (a regular-season matchday) or 'off' (the offseason growth inside rollover). The product of all of them is
     clamped to V1821D.CAP, then applied to that player's normal growth (it never raises potential, so nobody passes POT).
   - Per-player skill focus: V1821D.focus holds fn(C,p,base) returning a FOCUS_SHARE key or null (the first answer wins).
     New single-skill keys are added to FOCUS_SHARE: f_sho f_pas f_def f_spd f_sta f_gk.
   - Match form: V1821D.match holds fn(C,f,sid,side) returning a small strength delta for that side of a fixture (practice
     sharpness, for example). The sum is clamped to +-V1821D.FORM and added to the side's S.home, which scales attack and
     defence; it applies to fast odds runs too, so odds and results agree.
   - A ledger (C.dvx) records, for your school, how much growth each level got this season and how much of it came from
     each feature, for the Development hub.
   - Hub tabs: V1821D.tabs holds {id,label,order,render(C),summary(C)}; the core draws the tab bar on VIEWS.dev.
   With no feature registered every number is identical to before (devTick is a copy with the hook added).
   Identifiers v1821d / V1821D. */
const V1821D={ CAP:[0.75,1.6], FORM:0.02, mods:[], focus:[], match:[], tabs:[], off:false };
Object.assign(FOCUS_SHARE,{ f_sho:{sho:2.4,spd:1.1}, f_pas:{pas:2.4,sta:1.05}, f_def:{def:2.4}, f_spd:{spd:2.4,sta:1.1}, f_sta:{sta:2.4,spd:1.05}, f_gk:{gk:2.6} });
const V1821D_FOC={ f_sho:'Finishing', f_pas:'Passing', f_def:'Defending', f_spd:'Pace', f_sta:'Stamina', f_gk:'Goalkeeping' };
function v1821dMod(k,label,fn){ V1821D.mods=V1821D.mods.filter(m=>m.k!==k); V1821D.mods.push({k,label,fn}); }
function v1821dFocusFn(fn){ V1821D.focus.push(fn); }
function v1821dMatch(fn){ V1821D.match.push(fn); }
function v1821dTab(t){ V1821D.tabs=V1821D.tabs.filter(x=>x.id!==t.id); V1821D.tabs.push(t); V1821D.tabs.sort((a,b)=>(a.order||0)-(b.order||0)); }
/* the multiplier for one player now, with its parts */
function v1821dMult(C,p,ctx){ const parts=[]; let m=1;
  if(!V1821D.off) for(const M of V1821D.mods){ let v=null; try{ v=M.fn(C,p,ctx); }catch(e){ console.warn('dev mod '+M.k,e); } if(v!=null&&isFinite(v)&&Math.abs(v-1)>1e-9){ parts.push({k:M.k,label:M.label,m:v}); m*=v; } }
  const cm=clamp(m,V1821D.CAP[0],V1821D.CAP[1]); return {m:cm,raw:m,parts}; }
function v1821dFocus(C,p,base){ if(!V1821D.off) for(const fn of V1821D.focus){ try{ const k=fn(C,p,base); if(k&&FOCUS_SHARE[k]) return k; }catch(e){} } return base; }
/* a seeded random stream for a feature (career seed + keys), so choices for other schools are deterministic */
const v1821dR=(C,...k)=>rngFrom(hashStr([C.seed,'v1821d',...k].join('|')));
/* ---------- the ledger ---------- */
function v1821dLed(C,yr){ const X=C.dvx||(C.dvx={v:1,yr:{}}); const Y=X.yr[yr]||(X.yr[yr]={}); for(const l of LVLS) if(!Y[l]) Y[l]={base:0,tot:0,n:0,parts:{}}; return Y; }
function v1821dBook(C,p,lvl,base,amt,M,yr){ if(p.sid!==C.userSid) return; const L=v1821dLed(C,yr)[lvl]; if(!L) return; L.base+=base; L.tot+=amt; const extra=amt-base;
  if(Math.abs(extra)>1e-9&&M.parts.length){ const lt=M.parts.reduce((a,x)=>a+Math.log(x.m),0); for(const x of M.parts){ const sh=Math.abs(lt)>1e-9?Math.log(x.m)/lt:1/M.parts.length; L.parts[x.k]=(L.parts[x.k]||0)+extra*sh; } } }
function v1821dTrim(C){ const X=C.dvx; if(!X) return; for(const y of Object.keys(X.yr)) if(+y<C.year-2) delete X.yr[y]; }
/* ---------- devTick with the hook (otherwise identical to engine.js) ---------- */
devTick=function(C, frac, starters){
  const focus=C.training;
  for(const id in C.players){ const p=C.players[id]; if(!p.plan) continue; const sch=C.schools[p.sid]; if(!sch||sch.ext) continue;
    const user=p.sid===C.userSid;
    let f = user? (focus==='youth'?(p.lvl==='V'?0.85:1.3):1) : 1;
    if(user){ const vlu=getLu(C,p.sid,p.lvl); if(vlu&&vlu.strat==='youth'&&p.grade<=10&&starters&&starters.has(p.id)) f*=STRATS.youth.m.dev; }
    if(starters&&starters.has(p.id)) f*=1.1;
    const cur=ovr(p); const gap=p.pot-cur; if(gap<=0) continue;
    const base=Math.min(p.plan.gain*frac*f*clamp(gap/12,0.15,1),gap);
    const M=v1821dMult(C,p,'tick');
    const amt=Math.min(p.plan.gain*frac*f*clamp(gap/12,0.15,1)*M.m,gap);
    const fk=user?(focus==='youth'?'balanced':focus):sch.devFocus;
    shiftOvr(p, amt, M.parts.length||V1821D.focus.length?v1821dFocus(C,p,fk):fk);
    v1821dBook(C,p,p.lvl,base,amt,M,C.year);
  }
};
/* ---------- the offseason growth: scale each plan for the duration of rollover's growth step ---------- */
{ const _ro=rollover; rollover=function(C){ const scaled=[];
    try{ if(C&&C.phase==='offseason'&&!(C.rolled&&C.rolled[C.year])){ const yr=C.year;
        for(const id in C.players){ const p=C.players[id]; const sch=C.schools[p.sid]; if(!p.plan||!sch||sch.ext) continue; const gap=p.pot-ovr(p); if(gap<=0) continue;
          const M=v1821dMult(C,p,'off'); if(M.m===1&&p.sid!==C.userSid) continue;
          const base=Math.min(gap,p.plan.gain*0.52*clamp(gap/12,0.2,1)); const amt=Math.min(gap,p.plan.gain*M.m*0.52*clamp(gap/12,0.2,1));
          v1821dBook(C,p,p.lvl,base,amt,M,yr); if(M.m!==1){ scaled.push([p.plan,p.plan.gain]); p.plan.gain*=M.m; } } } }catch(e){ console.warn('dev offseason',e); }
    let r; try{ r=_ro.apply(this,arguments); } finally{ for(const [pl,g] of scaled) if(pl.gain!==g) pl.gain=g; }
    try{ v1821dTrim(C); }catch(e){} return r; }; }
/* ---------- match form ---------- */
{ const _sm=startMatch; startMatch=function(C,fid,opts){ const M=_sm.apply(this,arguments);
    try{ if(!V1821D.off&&V1821D.match.length&&M&&M.sides){ const f=C.fixtures[fid]; if(f) for(let i=0;i<2;i++){ const S=M.sides[i]; if(!S) continue; let d=0; for(const fn of V1821D.match){ try{ const v=fn(C,f,S.sid,i); if(v&&isFinite(v)) d+=v; }catch(e){} }
          d=clamp(d,-V1821D.FORM,V1821D.FORM); if(d){ S.home=(S.home||0)+d; S.v1821dForm=d; } } } }catch(e){ console.warn('dev form',e); }
    return M; }; }
/* the multiplier a level gets on average (for summaries), user school */
function v1821dLvlAvg(C,lvl,ctx){ const ps=squad(C,C.userSid,lvl).filter(p=>p.plan&&p.pot>ovr(p)); if(!ps.length) return {m:1,parts:{}}; let s=0; const parts={};
  for(const p of ps){ const M=v1821dMult(C,p,ctx||'tick'); s+=M.m; for(const x of M.parts){ const o=parts[x.k]||(parts[x.k]={label:x.label,sum:0,n:0}); o.sum+=x.m; o.n++; } }
  return {m:s/ps.length,parts}; }
