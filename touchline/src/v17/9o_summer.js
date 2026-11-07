/* ===================== v18.21 SUMMER DEVELOPMENT =====================
   In the offseason (season over, before rollover) you send returning players to summer programs with a points budget.
   - Programs (V1821U_P): a cost, who may go, and an exact multiplier on that player's offseason growth through the core's
     'off' hook (v1821dMod 'summer'); some lean the growth to a skill (applied to the offseason shiftOvr only).
     Elite ID Camp can also raise a player's potential by 1 (seeded, rare, once per player, never above 99).
   - Budget: 10 points + 1 per 25 prestige over 50, at most 14. Unspent points are lost.
   - State C.smr = {v:1, plan:{[yr]:{a:{pid:k}, rem}}, cpu:{[yr]:{pid:k}}, hist:{[yr]:report}, bumps:{pid:yr}} (lazy).
     plan[yr] is the summer after season yr; rollover reads it, writes hist[yr] and drops it.
   - CPU schools: 3-4 seeded players each at programs worth about the same budget (v1821uCpu), built at rollover.
   - Measuring: the offseason growth step in engine rollover runs between archiveSeason() and the next standings();
     the wrappers below snapshot every player's OVR around it, so the report shows exactly what each player gained.
   Identifiers v1821u / V1821U. */
const V1821U={ BASE:10, MAX:14, STEP:25, FROM:50, BUMP:0.15, BUMPGAP:3, HIST:10, CPUN:[3,4], _ro:null, last:null, onGrown:null };
FOCUS_SHARE.v1821u_ss={spd:1.9,sta:1.7};
if(typeof V1821D_FOC!=='undefined') V1821D_FOC.v1821u_ss='Pace & stamina';
const V1821U_P={
  elite:{n:'Elite ID Camp',ico:'⭐',cost:4,m:1.45,lv:['V'],who:'Varsity only',foc:null,fl:'',bump:true,
    d:'A week in front of college coaches. Players within 3 of their potential have a 15% chance of +1 potential (once per career).'},
  club:{n:'Club Season',ico:'⚽',cost:2,m:1.35,lv:['JV','MOD'],who:'JV and Modified',foc:null,fl:'',d:'A summer of club games against older players.'},
  speed:{n:'Speed & Strength',ico:'🏋️',cost:2,m:1.2,lv:['V','JV','MOD'],who:'Any level',foc:'v1821u_ss',fl:'Pace & stamina',d:'Weight room and sprint work; growth goes mostly to speed and stamina.'},
  gk:{n:'Goalkeeper Academy',ico:'🧤',cost:2,m:1.35,lv:['V','JV','MOD'],gk:true,who:'Goalkeepers only',foc:'f_gk',fl:'Goalkeeping',d:'Specialist keeper coaching; growth goes mostly to goalkeeping.'},
  futsal:{n:'Futsal League',ico:'🥅',cost:1,m:1.15,lv:['MOD','JV'],who:'Modified and JV',foc:'f_pas',fl:'Passing',d:'Small-sided indoor games; growth goes mostly to passing.'},
  rest:{n:'Rest & Recover',ico:'🛋️',cost:0,m:1,lv:['V','JV','MOD'],who:'Anyone',foc:null,fl:'',d:'Stays home: normal offseason growth, no points.'}
};
const V1821U_K=['elite','club','speed','gk','futsal','rest'];
function v1821uS(C){ let S=C.smr; if(!S||S.v!==1||typeof S!=='object') S=C.smr={v:1,plan:{},cpu:{},hist:{},bumps:{}};
  for(const k of ['plan','cpu','hist','bumps']) if(!S[k]||typeof S[k]!=='object') S[k]={}; return S; }
function v1821uOpen(C){ return !!(C&&C.phase==='offseason'&&!(C.rolled&&C.rolled[C.year])); }
function v1821uBudget(C,sid){ const s=C.schools[sid||C.userSid]; const pr=s?s.prestige||0:0; return Math.min(V1821U.MAX,V1821U.BASE+Math.floor(Math.max(0,pr-V1821U.FROM)/V1821U.STEP)); }
function v1821uOk(C,p,k){ const P=V1821U_P[k]; if(!P||!p) return false; const s=C.schools[p.sid]; if(!s||s.ext) return false; if(p.grade>=12) return false;
  if(P.gk&&p.pos!=='GK') return false; return P.lv.includes(p.lvl); }
function v1821uPlan(C,yr){ const S=v1821uS(C); yr=yr==null?C.year:yr; return S.plan[yr]||(S.plan[yr]={a:{},rem:0}); }
/* drop entries whose player left or is no longer eligible (promotion, release) */
function v1821uPrune(C,yr){ const S=C.smr; const P=S&&S.plan[yr==null?C.year:yr]; if(!P) return; for(const id of Object.keys(P.a)){ const p=C.players[id]; if(!p||p.sid!==C.userSid||P.a[id]==='rest'||!v1821uOk(C,p,P.a[id])) delete P.a[id]; } }
function v1821uUsed(C,yr){ const S=C.smr; const P=S&&S.plan[yr==null?C.year:yr]; if(!P) return 0; let n=0; for(const id in P.a){ const p=C.players[id]; if(p&&p.sid===C.userSid&&v1821uOk(C,p,P.a[id])) n+=V1821U_P[P.a[id]].cost; } return n; }
function v1821uLeft(C){ return v1821uBudget(C)-v1821uUsed(C); }
function v1821uOf(C,p){ const S=C.smr; if(!S||!p) return null; const yr=C.year; const k=p.sid===C.userSid?(S.plan[yr]&&S.plan[yr].a[p.id]):(S.cpu[yr]&&S.cpu[yr][p.id]); return k&&V1821U_P[k]&&v1821uOk(C,p,k)?k:null; }
/* the growth multiplier: offseason only, for the summer that is about to be applied */
v1821dMod('summer','Summer programs',(C,p,ctx)=>{ if(ctx!=='off'||!v1821uOpen(C)) return null; const k=v1821uOf(C,p); return k?V1821U_P[k].m:null; });
/* the offseason growth formula (engine rollover) for a multiplier m */
function v1821uOffGain(p,m){ const gap=p.pot-ovr(p); if(gap<=0||!p.plan) return 0; return Math.min(gap,p.plan.gain*m*0.52*clamp(gap/12,0.2,1)); }
/* the multiplier from every other feature (what "at home" means), and the capped total with program k */
function v1821uOthers(C,p){ const M=v1821dMult(C,p,'off'); const mine=M.parts.find(x=>x.k==='summer'); return clamp(mine?M.raw/mine.m:M.raw,V1821D.CAP[0],V1821D.CAP[1]); }
function v1821uExp(C,p,k){ if(V1821D.off) return {home:v1821uOffGain(p,1),with:v1821uOffGain(p,1),m:1}; const mo=v1821uOthers(C,p); const P=V1821U_P[k||'rest']; const m=clamp(mo*(P?P.m:1),V1821D.CAP[0],V1821D.CAP[1]);
  return {home:v1821uOffGain(p,mo),with:v1821uOffGain(p,m),m:m/mo}; }
function v1821uSet(C,pid,k){ if(!v1821uOpen(C)) return {ok:false,why:'Summer programs open when the season is over.'}; const p=C.players[pid]; if(!p||p.sid!==C.userSid) return {ok:false,why:'Not one of your players.'};
  const P=v1821uPlan(C); v1821uPrune(C); if(!k||k==='rest'){ delete P.a[pid]; return {ok:true}; }
  if(!v1821uOk(C,p,k)) return {ok:false,why:`${pname(p)} can't go to ${V1821U_P[k]?V1821U_P[k].n:'that program'} (${V1821U_P[k]?V1821U_P[k].who:'unknown'}${p.grade>=12?'; seniors graduate':''}).`};
  const cur=P.a[pid]?V1821U_P[P.a[pid]].cost:0; const left=v1821uBudget(C)-v1821uUsed(C)+cur; if(V1821U_P[k].cost>left) return {ok:false,why:`Not enough points: ${V1821U_P[k].n} costs ${V1821U_P[k].cost}, ${left} left.`};
  P.a[pid]=k; return {ok:true}; }
function v1821uClear(C){ if(!v1821uOpen(C)) return; v1821uPlan(C).a={}; }
/* Suggested: best extra OVR per point, young players first on ties; one program per player, within the budget */
function v1821uSuggest(C){ if(!v1821uOpen(C)) return null; const P=v1821uPlan(C); P.a={}; let left=v1821uBudget(C); const pairs=[];
  for(const p of schoolPlayers(C,C.userSid)){ if(p.grade>=12||!p.plan||p.pot-ovr(p)<=0.5) continue;
    for(const k of V1821U_K){ if(k==='rest'||!v1821uOk(C,p,k)) continue; const e=v1821uExp(C,p,k); const x=e.with-e.home; if(x<=0.01) continue; pairs.push({p,k,x,s:x/V1821U_P[k].cost*(1+0.04*(12-p.grade))}); } }
  pairs.sort((a,b)=>b.s-a.s||a.p.grade-b.p.grade||(a.p.id<b.p.id?-1:1));
  for(const q of pairs){ if(left<=0) break; if(P.a[q.p.id]) continue; const c=V1821U_P[q.k].cost; if(c>left) continue; P.a[q.p.id]=q.k; left-=c; }
  return P; }
/* CPU schools: an average coach sends 3-4 players (seeded) to programs worth about the same budget */
function v1821uCpu(C,yr){ const S=v1821uS(C); if(S.cpu[yr]) return S.cpu[yr]; const out={};
  for(const sid of C.league){ if(sid===C.userSid) continue; const s=C.schools[sid]; if(!s||s.ext) continue; const r=v1821dR(C,'smr','cpu',yr,sid);
    let left=v1821uBudget(C,sid); const n=V1821U.CPUN[0]+(r()<0.5?1:0);
    const pool=schoolPlayers(C,sid).filter(p=>p.grade<12&&p.plan&&p.pot-ovr(p)>0).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0); shuffle(r,pool);
    let sent=0; for(const p of pool){ if(sent>=n||left<=0) break;
      const ks=['elite','club','gk','speed','futsal'].filter(k=>v1821uOk(C,p,k)&&V1821U_P[k].cost<=left); if(!ks.length) continue;
      /* a typical coach: the camp that fits the player's level, keepers to the academy, now and then the weight room */
      const pref=p.pos==='GK'&&ks.includes('gk')?'gk':p.lvl==='V'&&ks.includes('elite')?'elite':ks.includes('club')?'club':ks[0];
      const k=r()<0.25?ks[Math.floor(r()*ks.length)]:pref; out[p.id]=k; left-=V1821U_P[k].cost; sent++; } }
  return S.cpu[yr]=out; }
/* ---------- around the offseason growth step ---------- */
function v1821uSnap(C){ const o={}; for(const id in C.players){ const p=C.players[id]; const s=C.schools[p.sid]; if(s&&!s.ext) o[id]=ovr(p); } return o; }
{ const _as=archiveSeason; archiveSeason=function(C){ const R=V1821U._ro; if(R) R.depth=(R.depth||0)+1; let r; try{ r=_as.apply(this,arguments); } finally{ if(R){ R.depth--; if(!R.depth&&R.C===C){ R.arm=true; R.n=0; R.o0=v1821uSnap(C); } } } return r; }; }
{ const _st=standings; standings=function(C){ const R=V1821U._ro; if(R&&R.arm&&!R.depth&&R.C===C){ R.arm=false; if(R.n>0){ R.g0=R.o0; R.g1=v1821uSnap(C); } } return _st.apply(this,arguments); }; }
{ const _so=shiftOvr; shiftOvr=function(p,amt,focus){ const R=V1821U._ro; if(R&&R.arm&&p&&amt>0){ R.n++; const f=R.foc[p.id]; if(f&&FOCUS_SHARE[f]) return _so.call(this,p,amt,f); } return _so.apply(this,arguments); }; }
function v1821uPre(C){ const S=v1821uS(C); const yr=C.year; v1821uPrune(C,yr); const P=v1821uPlan(C,yr); const cpu=v1821uCpu(C,yr);
  const R={C,yr,foc:{},rows:[],bud:v1821uBudget(C),used:v1821uUsed(C,yr),home:0,n:0};
  const all=Object.assign({},cpu,P.a);
  for(const id in all){ const p=C.players[id]; if(!p) continue; const k=v1821uOf(C,p); if(!k) continue; const Pk=V1821U_P[k];
    const row=p.sid===C.userSid?{id,nm:pname(p),lvl:p.lvl,pos:p.pos,gr:p.grade,k,cost:Pk.cost,home:v1821uExp(C,p,k).home,pot:p.pot,bump:0}:null;
    if(Pk.bump&&p.pot<99&&p.pot-ovr(p)<=V1821U.BUMPGAP&&!S.bumps[id]){ const r=v1821dR(C,'smr','bump',yr,id); if(r()<V1821U.BUMP){ p.pot=Math.min(99,p.pot+1); S.bumps[id]=yr; if(row) row.bump=1; } }
    if(Pk.foc) R.foc[id]=Pk.foc; if(row) R.rows.push(row); }
  return R; }
function v1821uPost(C,R){ const S=v1821uS(C); const yr=R.yr; const g0=R.g0, g1=R.g1;
  for(const row of R.rows){ const got=g0&&g1&&row.id in g0&&row.id in g1?g1[row.id]-g0[row.id]:0; row.got=Math.round(got*1000)/1000; row.home=Math.round(row.home*1000)/1000; }
  R.rows.sort((a,b)=>LVLS.indexOf(a.lvl)-LVLS.indexOf(b.lvl)||(b.got-b.home)-(a.got-a.home));
  const extra=R.rows.reduce((a,x)=>a+x.got-x.home,0); const got=R.rows.reduce((a,x)=>a+x.got,0);
  S.hist[yr]={yr,bud:R.bud,used:R.used,rows:R.rows,extra:Math.round(extra*100)/100,got:Math.round(got*100)/100,bumps:R.rows.filter(x=>x.bump).length,seen:0};
  for(const y of Object.keys(S.hist).sort((a,b)=>b-a).slice(V1821U.HIST)) delete S.hist[y];
  for(const y of Object.keys(S.plan)) if(+y<=yr) delete S.plan[y];
  for(const y of Object.keys(S.cpu)) if(+y<=yr) delete S.cpu[y];
  for(const id of Object.keys(S.bumps)) if(!C.players[id]) delete S.bumps[id];
  V1821U.last={yr,g0,g1};
  const town=C.schools[C.userSid].town;
  if(R.rows.length) addNews(C,'program',`Summer report: ${R.rows.length} ${town} player${R.rows.length===1?'':'s'} went to summer programs and came back +${fmt1s(got)} OVR, ${extra>=0?'+':''}${fmt1s(extra)} more than staying home${S.hist[yr].bumps?`; ${S.hist[yr].bumps} raised his ceiling at Elite ID Camp`:''}`,C.userSid);
  else if(R.bud) addNews(C,'program',`${town} sent nobody to summer programs; ${R.bud} summer points went unused`,C.userSid);
}
function fmt1s(v){ return (Math.round(v*10)/10).toFixed(1); }
{ const _ro=rollover; rollover=function(C){ let R=null;
    try{ if(C&&C.userSid&&v1821uOpen(C)&&!V1821D.off) R=v1821uPre(C); }catch(e){ console.warn('summer pre',e); R=null; }
    V1821U._ro=R; let res;
    try{ res=_ro.apply(this,arguments); } finally{ V1821U._ro=null; }
    try{ if(R&&res&&res.ok){ v1821uPost(C,R); if(typeof V1821U.onGrown==='function') V1821U.onGrown(C,R); } }catch(e){ console.warn('summer post',e); }
    return res; }; }
{ const _mg=migrate; migrate=function(raw){ const C=_mg.apply(this,arguments); try{ const X=C||raw; if(X&&X.smr){ if(X.smr.v!==1||typeof X.smr!=='object') delete X.smr; else v1821uS(X); } }catch(e){} return C; }; }
