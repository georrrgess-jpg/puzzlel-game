/* ===================== v18.19 SCENARIO MODE: definitions, setup, rules, medals, challenge codes (v1819s) =====================
   A scenario is a normal career that starts from a hand-built situation, with a goal over 1-3 seasons, a few rules that are
   really enforced while it is live, and three medals checked automatically. When the time limit is reached, gold is earned,
   no medal is reachable any more, or a "one loss ends it" rule fires, the scenario ends (ceremony in 9j_scenario_ui.js) and
   the career carries on as a normal one with the rules lifted.

   State on the career: C.scn = {v, id, tag, name, stars, seasons, y0, seed, rules[], medals{b,s,g}, def (custom only),
     line, status 'live'|'done', earned{b:{yr}}, missed{}, hist{yr:facts}, inj{pid,yr}, end{yr,why,res,rec}, pend, code}.
   Across careers: PREFS.v1819s = {med{id:{b,s,g}}, best{id:0-3}, runs[], cust{key:{name,best,code}}, coach}.

   Goals are season facts read from the fixtures (league W/D/L and finish, knockout wins: the postseason is sequential and a
   loss eliminates you, so "stage" = knockout wins this season: 1 a Sectionals win, 2 Section final, 3 Section title,
   4 Regional title, 6 State final, 7 State title). League size is read from C.league each season (never assumed 8).

   Challenge codes: TL-<TAG>-<base32 groups>. Bits: version 3, kind 3 (0-5 built-in, 6 custom), seed 32, result flag 1
   (+ medal 2, W/D/L 4+4+4), custom definition (school 2, seasons 2, rules 8, three medals x (goal 4 + n 3), name 5 + 6/char),
   then a 10-bit checksum. Crockford base32, so O/I/L typos are forgiven and case does not matter. */
const V1819S_RULES={
  fair:{t:'Fair play',d:'No player editor, no directed results and no Manager Mode while the scenario is live.',ic:'shield',always:true},
  zeroscout:{t:'Scouting points start at zero',d:'Summer camp opens with no points: no scouting reports, no invitations.',ic:'binoc'},
  tier1:{t:'Stadium stays Tier 1',d:'The Backyard Field. No facility upgrades until the scenario ends.',ic:'school'},
  hard:{t:'Hard difficulty, locked',d:'Rival programs develop faster and the postseason field is stronger.',ic:'flame'},
  nocall:{t:'No call-ups',d:'JV and Modified players cannot be promoted to Varsity during the season.',ic:'squads'},
  sudden:{t:'One loss ends it',d:'A league defeat ends the scenario on the spot.',ic:'alert'},
  strict:{t:'Strict referees',d:'Cards on strict and suspensions on, locked. A red card costs a game.',ic:'card'},
  nostar:{t:'Star out for the season',d:'Your best forward misses the whole first season.',ic:'cross'}
};
const V1819S_RULE_IDS=['zeroscout','tier1','hard','nocall','sudden','strict','nostar'];
const V1819S_KO={secwin:1,secfinal:2,sec:3,rgn:4,stfinal:6,st:7};
const V1819S_GOAL_IDS=['secwin','secfinal','sec','rgn','stfinal','st','top','topall','winrec','unbeaten','perfect'];
const V1819S_GOALS={
  secwin:{t:'Win a Sectionals game'}, secfinal:{t:'Reach the Section final'}, sec:{t:'Win the Section title'}, rgn:{t:'Win the Regional title'},
  stfinal:{t:'Reach the State final'}, st:{t:'Win the State title'},
  top:{t:n=>n===1?'Win the league':`Finish top ${n} in the league`,n:true}, topall:{t:n=>n>=7?'Finish above last place every season':n===1?'Win the league every season':`Finish top ${n} every season`,n:true},
  winrec:{t:'Finish the league above .500'}, unbeaten:{t:'Go unbeaten in the league'}, perfect:{t:'Win every league game'}
};
const V1819S_MEDALS=[['b','Bronze'],['s','Silver'],['g','Gold']];
const V1819S_LIST=[
  {id:'rebuild',tag:'RBLD',name:'The Rebuild',stars:2,seasons:2,unlock:0,kick:'Rescue a program',
    blurb:'Fourteen freshmen and four seniors on Varsity. Two seasons to make the bracket count.',
    rules:['nocall'],medals:{b:{k:'secwin'},s:{k:'secfinal'},g:{k:'sec'}}},
  {id:'lastdance',tag:'LAST',name:'Last Dance',stars:3,seasons:1,unlock:1,kick:'One shot',
    blurb:'A golden class of nine seniors. Win the State title this year, before they graduate.',
    rules:['strict'],medals:{b:{k:'sec'},s:{k:'rgn'},g:{k:'st'}}},
  {id:'underdog',tag:'UNDR',name:'Underdog Story',stars:3,seasons:3,unlock:2,kick:'Climb from the bottom',
    blurb:'Take over the lowest-rated school in the league. Three seasons, no shortcuts.',
    rules:['zeroscout','tier1','nocall'],medals:{b:{k:'top',n:5},s:{k:'secfinal'},g:{k:'sec'}}},
  {id:'streak',tag:'STRK',name:'The Streak',stars:2,seasons:1,unlock:0,kick:'Hold your nerve',
    blurb:'You start the season 9–0 with five rounds left. Stay unbeaten.',
    rules:['sudden'],medals:{b:{k:'unbeaten'},s:{k:'perfect'},g:{k:'and',of:[{k:'perfect'},{k:'sec'}]}}},
  {id:'badbreak',tag:'BRKE',name:'Bad Break',stars:2,seasons:1,unlock:0,kick:'Next man up',
    blurb:'Your star striker is out for the season. Find the goals somewhere else.',
    rules:['nostar'],medals:{b:{k:'winrec'},s:{k:'top',n:3},g:{k:'sec'}}},
  {id:'defense',tag:'DEFN',name:'Title Defense',stars:3,seasons:1,unlock:3,kick:'Defend the crown',
    blurb:'Last year you won State. Eight seniors graduated. Everybody wants a piece of the champs.',
    rules:['nocall'],medals:{b:{k:'rgn'},s:{k:'stfinal'},g:{k:'st'}}}
];
const V1819S_BY=Object.fromEntries(V1819S_LIST.map(d=>[d.id,d]));
const V1819S_SCHOOL=['Strongest school','An average school','Weakest school','The school you are dealt'];
const V1819S_TUNE={rebuild:{fr:[60,2.2],sr:[71.5,1.2]},lastdance:{gold:84.9},streak:{xi:74.6},badbreak:{star:82,xi:68.2},defense:{xi:80.6},underdog:{gap:0.5}};

function v1819sGoalText(g){ if(!g) return ''; if(g.k==='and') return g.of.map(v1819sGoalText).join(', and ').replace(/^(.)/,c=>c.toUpperCase()).replace(', and Win',' and win');
  const G=V1819S_GOALS[g.k]; if(!G) return ''; return typeof G.t==='function'?G.t(g.n||3):G.t; }
function v1819sGoalShort(g){ if(!g) return ''; if(g.k==='and'&&g.of.length===2&&g.of[0].k==='perfect'&&g.of[1].k==='sec') return 'Perfect league and the Section title'; return v1819sGoalText(g); }
function v1819sDef(id){ return V1819S_BY[id]||null; }
function v1819sYears(S){ const a=[]; for(let i=0;i<S.seasons;i++) a.push(S.y0+i); return a; }
function v1819sLive(C){ const S=C&&C.scn; return S&&S.status==='live'?S:null; }
function v1819sHas(C,rule){ const S=v1819sLive(C); return !!S&&(rule==='fair'||(S.rules||[]).includes(rule)); }
const v1819sOrd=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');

/* ---------- season facts ---------- */
function v1819sFacts(C,yr){
  const u=C.userSid; const F={yr,w:0,d:0,l:0,gp:0,gf:0,ga:0,stage:0,out:false,pos:null,n:C.league.length,lgN:Math.max(2,(C.league.length-1)*2),lgDone:false,done:false};
  const ko=[];
  for(const id in C.fixtures){ const f=C.fixtures[id]; if(f.yr!==yr||f.lvl!=='V'||f.st!=='d'||f.lpo||(f.h!==u&&f.a!==u)) continue; /* a Ladder playoff is not a postseason round */
    const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg;
    if(f.comp==='reg'){ F.gp++; F.gf+=us; F.ga+=th; if(f.w===u) F.w++; else if(f.w) F.l++; else F.d++; }
    else if(isKO(f.comp)) ko.push(f); }
  const ord={sec:0,rgn:1,st:2}; ko.sort((a,b)=>(ord[a.comp]-ord[b.comp])||(a.rd-b.rd));
  for(const f of ko){ if(f.w===u) F.stage++; else { F.out=true; break; } }
  F.done=yr<C.year||(yr===C.year&&(C.phase==='offseason'||C.phase==='awards'));
  F.lgDone=yr<C.year||(yr===C.year&&!['preseason','regular'].includes(C.phase));
  if(F.done) F.out=true;
  if(F.gp){ const t=standings(C,'V',yr); const i=t.findIndex(x=>x.sid===u); F.pos=i>=0?i+1:null; F.n=t.length; }
  if(F.lgDone) F.lgN=F.gp;
  return F; }
function v1819sFactsFor(C,S,yr){ if(yr===C.year||!S.hist||!S.hist[yr]){ const F=v1819sFacts(C,yr); if(yr<=C.year) (S.hist||(S.hist={}))[yr]=F; return F; } return S.hist[yr]; }
function v1819sStageName(n){ return ['Not yet','Won a Sectionals game','In the Section final','Section champions','Regional champions','State semifinal','In the State final','State champions'][n]||''; }

/* ---------- goals ---------- */
function v1819sSeasonGoal(g,F){
  const rem=Math.max(0,F.lgN-F.gp);
  if(V1819S_KO[g.k]){ const need=V1819S_KO[g.k]; const ok=F.stage>=need; const dead=!ok&&F.out;
    const prog=F.stage?v1819sStageName(F.stage):F.lgDone?(F.out?'Out in the first round':'Sectionals under way'):`Sectionals after matchday ${F.lgN}`;
    return {ok,dead,pct:Math.min(1,F.stage/need),prog}; }
  const rec=`${F.w}–${F.d}–${F.l}`;
  if(g.k==='top'||g.k==='topall'){ const n=g.n||3; const ok=F.lgDone&&F.pos!=null&&F.pos<=n; const dead=F.lgDone&&!ok;
    const pct=F.pos? clamp((F.n-F.pos+1)/Math.max(1,F.n-n+1),0,1):0;
    return {ok,dead,pct:ok?1:pct,prog:F.pos?`${v1819sOrd(F.pos)} of ${F.n}${F.lgDone?' (final)':` · ${rem} to play`}`:'League starts after the Preseason Cup'}; }
  if(g.k==='winrec'){ const ok=F.w>F.l+rem||(F.lgDone&&F.w>F.l); const dead=!ok&&F.w+rem<=F.l; return {ok,dead,pct:ok?1:clamp(F.gp?F.w/Math.max(1,F.l+1)/2:0,0,0.95),prog:F.gp?`${rec}${F.lgDone?' (final)':` · ${rem} to play`}`:'Not started'}; }
  if(g.k==='unbeaten'){ const dead=F.l>0; const ok=!dead&&F.lgDone&&F.gp>0; return {ok,dead,pct:dead?0:F.gp/F.lgN,prog:F.gp?`${rec}${dead?' · beaten':rem?` · ${rem} to play`:''}`:'Not started'}; }
  if(g.k==='perfect'){ const dead=F.l+F.d>0; const ok=!dead&&F.lgDone&&F.gp>0&&F.w===F.gp; return {ok,dead,pct:dead?0:F.w/F.lgN,prog:F.gp?`${rec}${dead?' · dropped points':rem?` · ${rem} to play`:''}`:'Not started'}; }
  if(g.k==='and'){ const R=g.of.map(x=>v1819sSeasonGoal(x,F)); return {ok:R.every(x=>x.ok),dead:R.some(x=>x.dead),pct:R.reduce((a,x)=>a+x.pct,0)/R.length,prog:R.map(x=>x.prog).join(' · ')}; }
  return {ok:false,dead:true,pct:0,prog:''}; }
/* the goal over the scenario: any season counts, except "every season" goals */
function v1819sGoalState(C,S,g){
  const ys=v1819sYears(S); const last=ys[ys.length-1]; const cur=Math.min(C.year,last);
  if(g.k==='topall'){ let ok=true, dead=false, txt=''; let pct=0, n=0;
    for(const y of ys){ if(y>C.year){ ok=false; continue; } const F=v1819sFactsFor(C,S,y); const e=v1819sSeasonGoal({k:'top',n:g.n},F); if(e.dead) dead=true; if(!e.ok) ok=false; pct+=e.pct; n++; if(y===cur) txt=e.prog; }
    const done=ys.filter(y=>y<=C.year&&v1819sFactsFor(C,S,y).lgDone&&v1819sSeasonGoal({k:'top',n:g.n},v1819sFactsFor(C,S,y)).ok).length;
    return {ok:ok&&!dead,dead,pct:(pct/ys.length),prog:`${done} of ${ys.length} seasons${txt?' · now '+txt:''}`,yr:ok&&!dead?last:null}; }
  let best=null;
  for(const y of ys){ if(y>C.year) break; const F=v1819sFactsFor(C,S,y); const e=v1819sSeasonGoal(g,F); if(e.ok) return {...e,yr:y};
    if(y===cur) best=e; }
  if(!best) return {ok:false,dead:false,pct:0,prog:'Not started'};
  const dead=best.dead&&cur===last; const more=best.dead&&cur<last;
  return {...best,dead,prog:more?`${best.prog} · next season`:best.prog}; }
function v1819sMedalStates(C,S){ const o={}; for(const [m] of V1819S_MEDALS){ const g=S.medals[m]; const e=v1819sGoalState(C,S,g); if(S.earned&&S.earned[m]) e.ok=true, e.dead=false, e.yr=S.earned[m].yr; o[m]=e; } return o; }
const v1819sResN=S=>S&&S.earned?(S.earned.g?3:S.earned.s?2:S.earned.b?1:0):0;

/* ---------- PREFS: medals, bests, runs (across careers) ---------- */
function v1819sP(){ let P=PREFS.v1819s; if(!P||typeof P!=='object'){ P=PREFS.v1819s={}; } P.med=P.med||{}; P.best=P.best||{}; P.runs=P.runs||[]; P.cust=P.cust||{}; return P; }
function v1819sMedalCount(){ const P=v1819sP(); let n=0; for(const d of V1819S_LIST){ const m=P.med[d.id]||{}; n+=(m.b?1:0)+(m.s?1:0)+(m.g?1:0); } return n; }
function v1819sUnlocked(d){ return !d||!d.unlock||v1819sMedalCount()>=d.unlock; }
function v1819sCustKey(S){ const D=S.def||{}; const md=D.md||{}; const g=x=>x?[x.k,x.n||0]:null; return 'c'+hashStr(JSON.stringify([D.n,D.sc,D.se,[...(D.ru||[])].sort(),g(md.b),g(md.s),g(md.g)])).toString(36); }
function v1819sSyncPrefs(C){ const S=C&&C.scn; if(!S||typeof App==='undefined'||App.C!==C) return; const P=v1819sP(); let ch=false; const res=v1819sResN(S);
  if(S.id==='custom'){ const k=v1819sCustKey(S); const o=P.cust[k]||(P.cust[k]={name:S.name,best:0,code:S.code}); if(res>o.best){ o.best=res; ch=true; } }
  else { const m=P.med[S.id]||(P.med[S.id]={}); for(const [k] of V1819S_MEDALS) if(S.earned&&S.earned[k]&&!m[k]){ m[k]=S.earned[k].yr||1; ch=true; } if(res>(P.best[S.id]||0)){ P.best[S.id]=res; ch=true; } }
  if(ch) savePrefs(); }
function v1819sLogRun(C){ const S=C.scn; if(typeof App==='undefined'||App.C!==C) return; const P=v1819sP();
  P.runs.unshift({id:S.id,name:S.name,res:v1819sResN(S),yr:S.end&&S.end.yr,rec:S.end&&S.end.rec,code:S.rcode||S.code,at:Date.now()}); if(P.runs.length>30) P.runs.length=30; savePrefs(); }

/* ---------- check: earn medals, end the scenario ---------- */
function v1819sCheck(C){ const S=v1819sLive(C); if(!S) return null;
  const ys=v1819sYears(S); const last=ys[ys.length-1]; S.earned=S.earned||{}; const fresh=[];
  const st=v1819sMedalStates(C,S);
  for(const [m] of V1819S_MEDALS){ if(st[m].ok&&!S.earned[m]){ S.earned[m]={yr:st[m].yr||C.year,md:C.md,ph:C.phase}; fresh.push(m); } }
  if(fresh.length){ S.fresh=(S.fresh||[]).concat(fresh); for(const m of fresh) addNews(C,'program',`Scenario medal: ${V1819S_MEDALS.find(x=>x[0]===m)[1]} in ${S.name}. ${v1819sGoalShort(S.medals[m])}.`,C.userSid); }
  v1819sSyncPrefs(C);
  const allSettled=V1819S_MEDALS.every(([m])=>S.earned[m]||st[m].dead);
  const timeUp=C.year>last||(C.year===last&&(C.phase==='offseason'||C.phase==='awards'));
  if(S.earned.g) v1819sEnd(C,'gold'); else if(allSettled) v1819sEnd(C,'settled'); else if(timeUp) v1819sEnd(C,'time');
  return {fresh,st}; }
function v1819sEnd(C,why){ const S=C.scn; if(!S||S.status!=='live') return; const st=v1819sMedalStates(C,S);
  S.missed={}; for(const [m] of V1819S_MEDALS) if(!S.earned[m]) S.missed[m]=st[m].dead?'dead':'time';
  const yr=Math.min(C.year,S.y0+S.seasons-1); const F=v1819sFactsFor(C,S,yr);
  S.status='done'; S.end={yr:C.year,ph:C.phase,why,res:v1819sResN(S),rec:{w:F.w,d:F.d,l:F.l},stage:F.stage,pos:F.pos};
  S.rcode=v1819sCodeFor(S,{medal:S.end.res,w:F.w,d:F.d,l:F.l}); S.pend=true;
  const nm=['no medal','bronze','silver','gold'][S.end.res];
  addNews(C,'program',why==='sudden'?`The streak is over. ${S.name} ends with ${nm}.`:`Scenario complete: ${S.name} ends with ${nm}. The program carries on.`,C.userSid);
  v1819sSyncPrefs(C); v1819sLogRun(C); }

/* ---------- challenge codes ---------- */
const V1819S_B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const V1819S_NAMEC=" ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'";
function v1819sCleanName(s){ return String(s||'').split('').filter(c=>V1819S_NAMEC.includes(c)).join('').replace(/\s+/g,' ').trim().slice(0,24); }
function v1819sEncode(o){ const bits=[]; const put=(v,n)=>{ for(let i=n-1;i>=0;i--) bits.push((Math.floor(v/Math.pow(2,i)))%2); };
  put(1,3); const kind=o.def?6:V1819S_LIST.findIndex(d=>d.id===o.id); put(kind,3); put(o.seed>>>0,32);
  put(o.res?1:0,1); if(o.res){ put(o.res.medal&3,2); put(Math.min(15,o.res.w|0),4); put(Math.min(15,o.res.d|0),4); put(Math.min(15,o.res.l|0),4); }
  if(o.def){ const D=o.def; put(D.sc&3,2); put(clamp(D.se|0,1,3),2); let mask=0; V1819S_RULE_IDS.forEach((r,i)=>{ if(D.ru.includes(r)) mask|=1<<i; }); put(mask,8);
    for(const [m] of V1819S_MEDALS){ const g=D.md[m]; put(Math.max(0,V1819S_GOAL_IDS.indexOf(g.k)),4); put(clamp((g.n||3)-1,0,7),3); }
    const nm=v1819sCleanName(D.n); put(nm.length,5); for(const c of nm) put(V1819S_NAMEC.indexOf(c),6); }
  const sum=hashStr(bits.join(''))&1023; put(sum,10);
  while(bits.length%5) bits.push(0);
  let s=''; for(let i=0;i<bits.length;i+=5){ let v=0; for(let j=0;j<5;j++) v=v*2+bits[i+j]; s+=V1819S_B32[v]; }
  const tag=o.def?'CUST':V1819S_BY[o.id].tag; return 'TL-'+tag+'-'+s.match(/.{1,4}/g).join('-'); }
function v1819sDecode(raw){
  let s=String(raw||'').trim().toUpperCase().replace(/[\s_]+/g,'-'); if(!s) return {err:'Type or paste a challenge code first.'};
  if(!/^TL-/.test(s)) return {err:'Challenge codes start with TL-. Check you copied the whole thing.'};
  const parts=s.split('-').filter(Boolean); const tag=parts[1]; const tags=[...V1819S_LIST.map(d=>d.tag),'CUST'];
  if(!tags.includes(tag)) return {err:`"${tag||''}" is not a scenario this version knows.`};
  const body=parts.slice(2).join('').replace(/O/g,'0').replace(/[IL]/g,'1'); if(body.length<9) return {err:'That code is too short. Part of it may be missing.'};
  const bits=[]; for(const c of body){ const v=V1819S_B32.indexOf(c); if(v<0) return {err:`"${c}" can't appear in a code. Check for typos.`}; for(let j=4;j>=0;j--) bits.push((v>>j)&1); }
  let p=0; const take=n=>{ let v=0; for(let i=0;i<n;i++){ if(p>=bits.length) throw new Error('short'); v=v*2+bits[p++]; } return v; };
  try{ const ver=take(3); if(ver!==1) return {err:'This code comes from a newer version of Touchline.'}; const kind=take(3); const seed=take(32)>>>0;
    const o={seed}; if(take(1)) o.res={medal:take(2),w:take(4),d:take(4),l:take(4)};
    if(kind===6){ const D={sc:take(2),se:clamp(take(2),1,3),ru:[],md:{}}; const mask=take(8); V1819S_RULE_IDS.forEach((r,i)=>{ if(mask&(1<<i)) D.ru.push(r); });
      for(const [m] of V1819S_MEDALS){ const k=V1819S_GOAL_IDS[take(4)]; const n=take(3)+1; if(!k) return {err:'That code has a medal this version does not know.'}; D.md[m]=V1819S_GOALS[k].n?{k,n}:{k}; }
      const len=take(5); let nm=''; for(let i=0;i<len;i++) nm+=V1819S_NAMEC[take(6)]||''; D.n=nm||'Custom scenario'; o.def=D; o.id='custom'; }
    else { const d=V1819S_LIST[kind]; if(!d) return {err:'That code points at a scenario this version does not know.'}; o.id=d.id; }
    const end=p; const sum=take(10); const chk=hashStr(bits.slice(0,end).join(''))&1023; if(sum!==chk) return {err:'One of the characters is off. Check the code for typos.'};
    if((o.def?'CUST':V1819S_BY[o.id].tag)!==tag) return {err:'The tag at the start does not match the rest of the code.'};
    return o; }catch(e){ return {err:'That code is too short. Part of it may be missing.'}; } }
function v1819sCodeFor(S,res){ return v1819sEncode({id:S.id,seed:S.seed,def:S.id==='custom'?S.def:null,res}); }

/* ---------- world building helpers ---------- */
function v1819sRelu(C,sid){ const s=C.schools[sid]; const user=sid===C.userSid;
  for(const lvl of LVLS){ const lu=getLu(C,sid,lvl)||{}; const caps=(lu.caps||[]).filter(id=>C.players[id]&&C.players[id].sid===sid&&C.players[id].lvl===lvl);
    let n; if(user){ const b=bestFormation(C,sid,lvl); n={...b.lineup,form:b.form}; } else n=autoLineup(C,sid,lvl,C.coaches[s.coachId].form);
    s.lu[lvl]={...n,tac:lu.tac||{pass:50,tempo:50,press:50,ment:50},strat:lu.strat||'balanced',caps};
    if(caps.length<2) s.lu[lvl].caps=[...caps,...defaultCaptains(C,sid,lvl).filter(x=>!caps.includes(x))].slice(0,2); } }
function v1819sNums(C,sid,r){ for(const lvl of LVLS){ const used=retiredSet(C,sid); for(const p of squad(C,sid,lvl).sort((a,b)=>a.id<b.id?-1:1)){ if(!p.num||used.has(p.num)) p.num=assignNum(r,used,p.pos); else used.add(p.num); } } }
function v1819sSetOvr(p,t){ for(let i=0;i<3;i++) shiftOvr(p,t-ovr(p),'balanced'); }
function v1819sLeave(C,p,yr,why){ C.alumni[p.id]=compactAlum(p,yr,why); delete C.players[p.id]; }
function v1819sNew(C,r,o){ const p=genPlayer(C,r,{sid:C.userSid,lvl:o.lvl||'V',grade:o.grade,pos:o.pos,target:o.target,user:true}); C.players[p.id]=p; p.joined=C.year; planDev(C,p,r); return p; }
function v1819sOthers(C){ return C.league.filter(s=>s!==C.userSid).map(s=>xiRating(C,s,'V')).sort((a,b)=>a-b); }
function v1819sRank(C){ const u=C.userSid; return [...C.league].sort((a,b)=>xiRating(C,b,'V')-xiRating(C,a,'V')).indexOf(u)+1; }
function v1819sCloseTryouts(C){ try{ if(typeof v1812tBox==='function'){ const T=v1812tBox(C); T.yr=C.year; T.st='none'; T.day=0; T.a={}; T.tags={}; T.cands={}; T.pool=[]; T.info={}; T.posted=null; } }catch(e){} }
function v1819sStar(C){ return squad(C,C.userSid,'V').filter(p=>p.pos==='FWD').sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1))[0]||null; }
function v1819sInjure(C,S,r){ const p=v1819sStar(C); if(!p) return; if(ovr(p)<79) v1819sSetOvr(p,(V1819S_TUNE.badbreak.star)+r()*1.5); p.pot=Math.max(p.pot,Math.ceil(ovr(p))+2); p.susp=99; S.inj={pid:p.id,yr:C.year,nm:pname(p)}; }
function v1819sTier1(C){ const s=C.schools[C.userSid]; const st=s.stadium; if(!st) return; if(st.tier!==1){ const T=STADIUM_TIERS[1]; st.tier=1; st.cap=Math.round((T.min+T.max)/20)*10; } if(st.ovr){ delete st.ovr.tier; delete st.ovr.cap; } }

/* ---------- the six setups (deterministic: rngFrom(seed + id)) ---------- */
const V1819S_SETUP={
  rebuild(C,S,r){ const u=C.userSid; const T=V1819S_TUNE.rebuild; const V=squad(C,u,'V');
    const seniors=V.filter(p=>p.grade>=12).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)); const keep=new Set(seniors.slice(0,4).map(p=>p.id));
    for(const p of V){ if(keep.has(p.id)) continue; if(p.grade<=10){ p.lvl='JV'; } else v1819sLeave(C,p,C.year-1,'Transferred out when the old coach left'); }
    const want={GK:2,DEF:6,MID:6,FWD:4}; for(const id of keep) want[C.players[id].pos]--;
    const jv=squad(C,u,'JV').filter(p=>p.grade===9).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)); let fromJV=0;
    for(const g of GROUPS){ while(want[g]>0){ const i=fromJV<6?jv.findIndex(p=>p.pos===g):-1; let p; if(i>=0){ p=jv.splice(i,1)[0]; p.lvl='V'; fromJV++; } else p=v1819sNew(C,r,{grade:9,pos:g,target:58}); want[g]--; } }
    if(!squad(C,u,'JV').some(p=>p.pos==='GK')) v1819sNew(C,r,{lvl:'JV',grade:9,pos:'GK',target:48});
    for(const p of squad(C,u,'V')){ if(p.grade===9){ v1819sSetOvr(p,T.fr[0]+gauss(r)*T.fr[1]); p.pot=Math.round(clamp(ovr(p)+19+r()*12,ovr(p)+12,93)); p.v1819f=1; } else { v1819sSetOvr(p,T.sr[0]+gauss(r)*T.sr[1]); p.pot=Math.max(p.pot,Math.ceil(ovr(p))+1); } }
    C.schools[u].prestige=Math.min(C.schools[u].prestige,38);
    addNews(C,'program',`${C.schools[u].town} start over: fourteen freshmen join four seniors on Varsity`,u); },
  lastdance(C,S,r){ const u=C.userSid; let sen=squad(C,u,'V').filter(p=>p.grade>=12).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1));
    while(sen.length<9){ sen.push(v1819sNew(C,r,{grade:12,pos:pick(r,['DEF','MID','FWD']),target:72})); }
    const gold=new Set(sen.slice(0,9).map(p=>p.id)); v1819sRelu(C,u);
    for(const id of gold){ const p=C.players[id]; v1819sSetOvr(p,V1819S_TUNE.lastdance.gold+gauss(r)*1.4); p.pot=Math.ceil(ovr(p))+1; p.v1819g=1; }
    C.schools[u].prestige=Math.max(C.schools[u].prestige,72);
    addNews(C,'program',`${C.schools[u].town}'s golden class: nine seniors, one last run at State`,u); },
  underdog(C,S,r){ const u=C.userSid; const lo=v1819sOthers(C)[0]; fitTeam(C,u,lo-V1819S_TUNE.underdog.gap-r()*0.3); C.schools[u].prestige=18; C.schools[u].strength=0.12; for(const p of schoolPlayers(C,u)) if(p.grade<=10) p.pot=Math.min(97,Math.round(p.pot+7+r()*4));
    addNews(C,'program',`${C.schools[u].town} picked to finish last in Section ${C.section}`,u); },
  streak(C,S,r){ const u=C.userSid; fitTeam(C,u,V1819S_TUNE.streak.xi+r()*0.6); },
  badbreak(C,S,r){ const u=C.userSid; v1819sInjure(C,S,r); fitTeam(C,u,V1819S_TUNE.badbreak.xi+r()*0.6,p=>p.id!==S.inj.pid);
    addNews(C,'program',`${S.inj.nm} is out for the season. ${C.schools[u].town} must find goals elsewhere`,u); },
  defense(C,S,r){ const u=C.userSid; const yr=C.year-1; const s=C.schools[u];
    const sen=squad(C,u,'V').filter(p=>p.grade>=12).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)).slice(0,8);
    const H=['Section '+C.section+' Champions','Regional Champions','State Champions'];
    for(const p of squad(C,u,'V')) if(p.grade>=11&&!sen.includes(p)) for(const h of H) p.honors.push({yr,label:h});
    for(const p of sen){ for(const h of H) p.honors.push({yr,label:h}); p.grade=12; v1819sLeave(C,p,yr,pick(r,['Playing college soccer','Walked on at the state university','Signed with a Division II program','Playing club soccer in college'])); }
    S.grads=sen.map(p=>p.id);
    const jv=squad(C,u,'JV').filter(p=>p.grade>=10).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)); for(const p of jv.slice(0,4)) p.lvl='V';
    if(!squad(C,u,'V').some(p=>p.pos==='GK')) v1819sNew(C,r,{grade:11,pos:'GK',target:66});
    v1819sRelu(C,u); fitTeam(C,u,V1819S_TUNE.defense.xi+r()*0.6);
    for(const h of H) if(!s.honors.some(x=>x.yr===yr&&x.label===h)) s.honors.push({yr,label:h});
    const co=C.coaches[s.coachId]; if(co){ co.titles=(co.titles||0)+1; co.rec[yr]={w:12,d:1,l:1}; }
    s.prestige=Math.max(s.prestige,84);
    addNews(C,'champion',`${s.name} are the defending ${C.stateName} state champions`,u);
    addNews(C,'program',`Eight seniors from the ${yr} title team have graduated. Can ${s.town} do it again?`,u); }
};
function v1819sCustomSchool(C,sc,r){ const u=C.userSid; const o=v1819sOthers(C); if(sc===0) fitTeam(C,u,o[o.length-1]+2+r()*0.8); else if(sc===1) fitTeam(C,u,(o[Math.floor(o.length/2)-1]+o[Math.floor(o.length/2)])/2); else if(sc===2){ fitTeam(C,u,o[0]-2.4-r()*0.6); C.schools[u].prestige=Math.min(C.schools[u].prestige,24); } }

/* a scenario career: the normal world for this seed, then the hand-built situation on top */
function v1819sBuild(o,meta){ meta=meta||{};
  const seed=o.seed>>>0; const def=o.def||null; const D=def?null:V1819S_BY[o.id];
  const C=newCareer({slot:meta.slot||1,coachName:meta.coach||'Sam Rivera',seed,now:meta.now||0});
  const r=rngFrom(hashStr(seed+':scn:'+(def?'custom':o.id)));
  const S={v:1,id:def?'custom':o.id,tag:def?'CUST':D.tag,name:def?(def.n||'Custom scenario'):D.name,stars:def?0:D.stars,seasons:def?clamp(def.se|0,1,3):D.seasons,
    y0:C.year,seed,rules:def?[...def.ru]:[...D.rules],medals:def?JSON.parse(JSON.stringify(def.md)):JSON.parse(JSON.stringify(D.medals)),def:def?JSON.parse(JSON.stringify(def)):null,
    status:'setup',earned:{},missed:{},hist:{},inj:null,end:null,pend:false};
  C.scn=S; C.settings.manager=false; C.directed={};
  if(def) v1819sCustomSchool(C,def.sc|0,r); else V1819S_SETUP[o.id](C,S,r);
  if(S.rules.includes('nostar')&&!S.inj) v1819sInjure(C,S,r);
  if(S.rules.includes('tier1')) v1819sTier1(C);
  if(S.rules.includes('hard')) C.settings.difficulty='hard';
  if(S.rules.includes('strict')){ C.settings.cards='strict'; C.settings.suspensions=true; }
  const u=C.userSid; v1819sNums(C,u,r); v1819sRelu(C,u);
  for(const p of schoolPlayers(C,u)){ if(!p.plan) planDev(C,p,r); p.ovr0[C.year]=r1(ovr(p)); }
  v1819sCloseTryouts(C);
  if(S.id==='streak') v1819sStreakRun(C,S);
  S.rank=v1819sRank(C); S.xi=Math.round(xiRating(C,u,'V')*10)/10;
  S.line=v1819sLine(C,S); S.code=v1819sCodeFor(S,null);
  S.status='live'; v1819sCheck(C);
  return C; }
/* The Streak: the Preseason Cup is played as normal, then nine league rounds with your result directed to a win (the engine's own
   directed-result path builds a plausible score and full match log). Directions are cleared afterwards and the fixtures carry no
   "directed" flag, so standings, fixtures, logs, player stats and news all agree. */
function v1819sStreakRun(C,S){ const u=C.userSid; let g=0; const gd=typeof v1812gBox==='function'?v1812gBox(C):null; const gdOn=gd?gd.on:undefined; if(gd) gd.on=false;
  while(C.phase==='preseason'&&g++<10){ simRound(C); advance(C); }
  while(C.phase==='regular'&&C.md<9&&g++<40){ const uf=userFixture(C); if(uf) C.directed[uf.id]={mode:'winner',winner:u}; simRound(C); if(uf){ delete C.directed[uf.id]; uf.dir=false; } advance(C); }
  C.directed={}; if(gd) gd.on=gdOn; S.pre9=v1819sFacts(C,C.year); }
function v1819sLine(C,S){ const s=C.schools[C.userSid]; const n=C.league.length; const rk=S.rank;
  const ss=S.seasons===1?'One season.':S.seasons===2?'Two seasons.':'Three seasons.';
  switch(S.id){
    case 'rebuild': return `You take over ${s.name}: fourteen freshmen and four seniors on Varsity, rated ${v1819sOrd(rk)} of ${n}. ${ss}`;
    case 'lastdance': return `You coach ${s.name} and a golden class of nine seniors, rated ${v1819sOrd(rk)} of ${n}. One season to win State.`;
    case 'underdog': return `You take over ${s.name}, rated ${v1819sOrd(rk)} of ${n} in the league. ${ss}`;
    case 'streak': return `${s.name} are ${S.pre9?`${S.pre9.w}–${S.pre9.d}–${S.pre9.l}`:'9–0'} with five rounds left. Stay unbeaten.`;
    case 'badbreak': return `${S.inj?S.inj.nm:'Your star striker'} is out for the season at ${s.name}, rated ${v1819sOrd(rk)} of ${n}. ${ss}`;
    case 'defense': return `${s.name} won State last year, then lost eight seniors. Rated ${v1819sOrd(rk)} of ${n}. Defend the title.`;
    default: return `${V1819S_SCHOOL[(S.def&&S.def.sc)|0]}: ${s.name}, rated ${v1819sOrd(rk)} of ${n}. ${ss}`; } }

/* ---------- rules, enforced on the engine side ---------- */
{ const _fm=finishMatch; finishMatch=function(C,M){ const f0=C&&M&&C.fixtures&&C.fixtures[M.fid]; const was=f0&&f0.st; const r=_fm.apply(this,arguments);
  try{ const S=v1819sLive(C); if(S&&was!=='d'&&f0&&f0.lvl==='V'){ if(S.inj&&S.inj.yr===C.year){ const p=C.players[S.inj.pid]; if(p) p.susp=Math.max(p.susp||0,99); }
      const u=C.userSid; if(f0.h===u||f0.a===u){ if(S.rules.includes('sudden')&&f0.comp==='reg'&&f0.w&&f0.w!==u&&f0.yr>=S.y0&&f0.yr<S.y0+S.seasons){ S.lostAt=f0.id; v1819sEnd(C,'sudden'); } else v1819sCheck(C); } } }catch(e){ console.warn('v1819s finish',e); }
  return r; }; }
{ const _ad=advance; advance=function(C){ const r=_ad.apply(this,arguments); try{ if(v1819sLive(C)) v1819sCheck(C); }catch(e){ console.warn('v1819s advance',e); } return r; }; }
{ const _ro=rollover; rollover=function(C){ const live=v1819sLive(C); const r=_ro.apply(this,arguments); try{ if(live&&r&&r.ok&&v1819sLive(C)){ if(C.scn.rules.includes('tier1')) v1819sTier1(C); if(C.scn.rules.includes('hard')) C.settings.difficulty='hard'; v1819sCheck(C); } }catch(e){ console.warn('v1819s rollover',e); } return r; }; }
{ const _ce=campEnsure; campEnsure=function(C){ const K=_ce.apply(this,arguments); try{ if(K&&!K.v1819s&&v1819sHas(C,'zeroscout')){ K.pts=0; K.v1819s=1; } }catch(e){} return K; }; }
{ const _sm=startMatch; startMatch=function(C,fid,opts){ try{ if(C&&C.directed&&C.directed[fid]&&v1819sLive(C)) delete C.directed[fid]; }catch(e){} return _sm.apply(this,arguments); }; }
{ const _mg=migrate; migrate=function(raw){ const C=_mg.apply(this,arguments); try{ if(C&&C.scn&&!C.scn.v) C.scn.v=1; }catch(e){} return C; }; }
