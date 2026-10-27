/* ===================== v18.16 FAMILY TIES =====================
   Little brothers, cousins and the kids of alumni arrive with a name to live up to, at every school in the league.
   - Families share a surname and a look (skin, hair colour), hand down numbers when they are free, and show as a tree
     (father -> sons -> younger brothers) on player profiles, the Family Ties page and the Hall of Fame family wall.
   - A new career seeds families everywhere (brothers on the same roster, kids of alumni from before the career) and, at your
     school, a program legend: an older brother in the Hall of Fame with his number retired and his little brother on the roster.
   - Every off-season new middle schoolers can be younger brothers of current players (so brothers play together), of recent
     graduates, cousins, or sons of alumni. Free numbers are handed down; at your school a retired family number becomes a
     letter in the coach's mailbox with three choices (keep it retired / let him wear it / patch and ceremony) that move his
     legacy pressure (expectations, your support, teammates) and his development.
   - Brothers who start together build chemistry; the younger one grows from it at the end of the season.
   State lives on C.fam (saved with the career). Identifiers v1816 / V1816. */
const V1816={ v:1, NOTE_F:['Taught both boys to juggle in the driveway.','Still runs the clock at home games.','Drives the bus to every away game.','Has not missed a home game in twenty years.','Coached the rec league for a decade.','Keeps the program scrapbook.'],
  NOTE_P:['Practices against the garage door.','Wears his brother’s old shin guards.','First on the field, last off it.','Studies film of his brother’s senior year.','Juggles to school every morning.','Wants his own banner in the gym.'],
  HON_F:['All-League','2× All-League','Section champion','Team captain','Boosters president','Program record holder','Assistant coach'] };

/* ---------- state ---------- */
function v1816S(C){ let F=C.fam; if(!F||F.v!==1) F=C.fam={v:1,elders:{},links:{},fams:{},mail:[],meters:{},fx:{},patch:{},chem:{},n:0,seeded:false,yr:{}}; for(const k of ['elders','links','fams','meters','fx','patch','chem','yr']) if(!F[k]) F[k]={}; if(!F.mail) F.mail=[]; return F; }
function v1816R(C,...k){ return rngFrom(hashStr([C.seed,'v1816',...k].join('|'))); }
function v1816Person(C,id){ const F=v1816S(C); if(F.elders[id]) return {...F.elders[id],elder:true}; return findPerson(C,id)||null; }
function v1816Name(C,id){ const p=v1816Person(C,id); return p?p.fn+' '+p.ln:'Unknown'; }
function v1816Fam(C,id){ const F=v1816S(C); const L=F.links[id]||(F.elders[id]?{f:F.elders[id].f}:null); return L&&F.fams[L.f]||null; }
function v1816Gen(C,id){ const F=v1816S(C); if(F.elders[id]) return F.elders[id].gen; const L=F.links[id]; return L?L.gen:1; }
function v1816NewFam(C,ln,sid,first,gen){ const F=v1816S(C); const id='f'+(++F.n); F.fams[id]={id,ln,sid,mem:[first]}; if(F.elders[first]){ F.elders[first].f=id; } else F.links[first]={f:id,rel:null,of:null,gen:gen==null?1:gen}; return F.fams[id]; }
/* make `kid` (a player) related to `rel` (player or elder id): rel = 'brother' (younger brother), 'cousin', 'son' */
function v1816Join(C,kid,relId,rel,r){
  const F=v1816S(C); if(F.links[kid.id]&&F.links[kid.id].f) return null; const R=v1816Person(C,relId); if(!R) return null;
  let fam=v1816Fam(C,relId); if(!fam) fam=v1816NewFam(C,R.ln,R.sid,relId,R.elder?R.gen:1);
  const gen=rel==='son'?v1816Gen(C,relId)+1:v1816Gen(C,relId);
  F.links[kid.id]={f:fam.id,rel,of:relId,gen}; fam.mem.push(kid.id);
  const taken=new Set(fam.mem.filter(id=>id!==kid.id).map(id=>{ const q=v1816Person(C,id); return q&&q.fn; })); for(let i=0;i<12&&taken.has(kid.fn);i++) kid.fn=genName(r)[0];
  if(rel!=='cousin'||r()<0.6) kid.ln=fam.ln;
  const L=lookOf(R.elder?{id:relId,grade:12,look:R.look}:R); const mine=lookOf(kid); kid.look={...mine,skin:L.skin,hairCol:rel==='cousin'&&r()<0.5?mine.hairCol:L.hairCol};
  return fam;
}
function v1816Elder(C,r,o){ const F=v1816S(C); const id='el'+(++F.n); const [fn]=genName(r);
  const e={id,fn,ln:o.ln,sid:o.sid,cls:o.cls,pos:o.pos||pick(r,['DEF','MID','FWD','DEF','MID','GK']),num:o.num||rint(r,2,24),gen:o.gen==null?0:o.gen,honors:o.honors||shuffle(r,V1816.HON_F.slice()).slice(0,r()<0.5?1:2),note:o.note||pick(r,V1816.NOTE_F),role:o.role||'father',legend:!!o.legend,look:o.look||null};
  F.elders[id]=e; return e; }
function v1816Cls(C,p){ return C.year+(12-p.grade); }

/* ---------- a new world: families everywhere, a legend at your school ---------- */
function v1816Seed(C){
  const F=v1816S(C); if(F.seeded) return; F.seeded=true; const r=v1816R(C,'seed');
  for(const sid of C.league){ const user=sid===C.userSid; const all=schoolPlayers(C,sid).filter(p=>!F.links[p.id]);
    /* brothers on the same roster */
    if(user||r()<0.6){ const old=shuffle(r,all.filter(p=>p.grade>=9&&p.grade<=11)); for(const o of old){ const y=all.find(p=>p.id!==o.id&&!F.links[p.id]&&p.grade<o.grade&&o.grade-p.grade<=3&&p.grade>=8); if(y){ v1816Join(C,y,o.id,'brother',r); break; } } }
    /* the son of an alumnus from before the career */
    const nk=user?1:(r()<0.5?1:0); for(let i=0;i<nk;i++){ const k=pick(r,all.filter(p=>!F.links[p.id]&&p.grade<=10)); if(!k) break; const e=v1816Elder(C,r,{ln:k.ln,sid,cls:v1816Cls(C,k)-28+rint(r,-3,3)}); v1816Join(C,k,e.id,'son',r); }
    if(!user&&r()<0.3){ const a=pick(r,all.filter(p=>!F.links[p.id]&&p.grade>=10)), b=a&&pick(r,all.filter(p=>!F.links[p.id]&&p.id!==a.id&&p.grade<a.grade)); if(a&&b) v1816Join(C,b,a.id,'cousin',r); } }
  /* your program legend: a Hall of Famer with his number retired, his father, and his little brother on your roster */
  const u=C.userSid; const kid=pick(r,schoolPlayers(C,u).filter(p=>!F.links[p.id]&&p.grade>=7&&p.grade<=9&&p.pos!=='GK'))||pick(r,schoolPlayers(C,u).filter(p=>!F.links[p.id]&&p.grade<=10));
  if(kid){ const num=pick(r,[9,10,7,11]); const pos={9:'FWD',10:'MID',7:'FWD',11:'FWD'}[num]; const [,ln]=[0,kid.ln]; const yr=C.year-rint(r,2,4);
    const dad=v1816Elder(C,r,{ln,sid:u,cls:yr-27+rint(r,-2,2),pos:pick(r,['FWD','MID','DEF']),honors:[pick(r,['2× All-League','All-League','Section champion']),'Boosters president'],note:pick(r,V1816.NOTE_F),gen:0,look:lookOf(kid)});
    const leg=v1816Elder(C,r,{ln,sid:u,cls:yr,pos,num,gen:1,role:'brother',legend:true,honors:['Hall of Fame','#'+num+' retired',(rint(r,34,58))+' career goals'],note:pick(r,['Scored the sectional winner as a senior.','Still holds the single-season goals record.','Captained three Varsity seasons.']),look:lookOf(kid)});
    const fam=v1816NewFam(C,ln,u,dad.id,0); leg.f=fam.id; fam.mem.push(leg.id); kid.look={...lookOf(kid)}; v1816Join(C,kid,leg.id,'brother',r);
    const R=C.retired||(C.retired={}); const list=R[u]||(R[u]=[]); if(!list.some(x=>x.num===num)) list.push({num,pid:leg.id,yr,name:leg.fn+' '+leg.ln,legacy:true});
    for(const p of schoolPlayers(C,u)) if(p.num===num){ const used=new Set([...retiredSet(C,u),...squad(C,u,p.lvl).filter(x=>x.id!==p.id).map(x=>x.num)]); p.num=assignNum(rngFrom(hashStr(p.id+'v1816')),used,p.pos); }
    v1816Mail(C,kid,leg.id,num,'retired'); }
}
{ const _nc=newCareer; newCareer=function(){ const C=_nc.apply(this,arguments); try{ v1816Seed(C); }catch(e){ console.warn('v1816 seed',e); } return C; }; }

/* ---------- each off-season: new family arrivals at every school ---------- */
function v1816Arrivals(C){
  const F=v1816S(C); if(F.yr[C.year]) return; F.yr[C.year]=1; const r=v1816R(C,'arr',C.year); let news=0;
  for(const sid of C.league){ const user=sid===C.userSid; const fresh=shuffle(r,squad(C,sid,'MOD').filter(p=>p.joined===C.year&&p.grade===7&&!F.links[p.id])); let made=0;
    for(const kid of fresh){ if(made>=(user?2:1)) break; const x=r();
      const cur=schoolPlayers(C,sid).filter(p=>p.id!==kid.id&&p.grade>=8&&p.grade<=11);
      const alum=Object.values(C.alumni).filter(a=>a.sid===sid&&a.gradYr>=C.year-3);
      let relId=null, rel=null;
      if(x<(user?0.32:0.22)&&cur.length){ relId=pick(r,cur).id; rel='brother'; }
      else if(x<(user?0.42:0.30)&&alum.length){ relId=pick(r,alum).id; rel='brother'; }
      else if(x<(user?0.54:0.40)){ const e=v1816Elder(C,r,{ln:kid.ln,sid,cls:C.year-22-rint(r,0,8)}); relId=e.id; rel='son'; }
      else if(x<(user?0.6:0.45)&&cur.length){ relId=pick(r,cur).id; rel='cousin'; }
      if(!relId) continue; if(!v1816Join(C,kid,relId,rel,r)) continue; made++;
      const R=v1816Person(C,relId); const num=R&&R.num; const ret=num!=null&&retiredSet(C,sid).has(num);
      const handed=num!=null&&!ret&&rel!=='cousin'&&!squad(C,sid,'MOD').some(p=>p.id!==kid.id&&p.num===num); if(handed) kid.num=num;
      if(ret&&user) v1816Mail(C,kid,relId,num,'retired');
      const town=C.schools[sid].town; const who=rel==='son'?`son of ${R.fn} ${R.ln} (Class of ${R.cls})`:rel==='cousin'?`cousin of ${pname(R)}`:R.gradYr?`younger brother of ${pname(R)} (Class of ${R.gradYr})`:`younger brother of ${pname(R)}`;
      if(user||news<3){ if(!user) news++; addNews(C,'family',`${rel==='brother'&&!R.gradYr?'Another '+kid.ln+': ':''}${pname(kid)} joins ${town}'s Modified squad, ${who}${handed?`, and takes his #${num}`:''}`,sid,{pid:kid.id}); } } }
}
{ const _ro=rollover; rollover=function(C){ const F=v1816S(C); const pend=F.mail.filter(m=>m.status==='open'); const chem=v1816ChemAll(C); const res=_ro.apply(this,arguments);
  try{ if(res&&res.ok){ for(const m of pend) if(m.status==='open') v1816Choose(C,m.id,'keep',true);
      for(const [pid,num] of Object.entries(F.patch)){ const p=C.players[pid]; if(!p){ delete F.patch[pid]; continue; } if(p.num!==num){ const mate=squad(C,p.sid,p.lvl).find(x=>x.id!==pid&&x.num===num); if(mate) mate.num=p.num; p.num=num; } }
      for(const pr of chem){ const y=C.players[pr.y]; if(y&&pr.n>0){ const b=Math.min(1.2,pr.n*0.12); shiftOvr(y,b,'balanced'); y.pot=Math.max(y.pot,Math.ceil(ovr(y))); } }
      F.chem={}; v1816Arrivals(C); } }catch(e){ console.warn('v1816 rollover',e); } return res; }; }

/* ---------- brothers together, chemistry ---------- */
function v1816Pairs(C,sid){ const F=v1816S(C); const out=[]; for(const fam of Object.values(F.fams)){ const ps=fam.mem.map(id=>C.players[id]).filter(p=>p&&(!sid||p.sid===sid)); const bySid={}; ps.forEach(p=>(bySid[p.sid]||(bySid[p.sid]=[])).push(p));
  for(const arr of Object.values(bySid)){ if(arr.length<2) continue; arr.sort((a,b)=>b.grade-a.grade); for(let i=1;i<arr.length;i++){ const o=arr[0], y=arr[i]; const L=F.links[y.id]; out.push({fam:fam.id,o:o.id,y:y.id,rel:L&&L.rel==='cousin'?'cousins':'brothers',key:o.id+'|'+y.id,n:F.chem[o.id+'|'+y.id]||0}); } } } return out; }
function v1816ChemAll(C){ return v1816Pairs(C).map(x=>({...x})); }
{ const _fm=finishMatch; finishMatch=function(C,M){ const r=_fm.apply(this,arguments); try{ const F=C.fam; if(F&&F.v===1&&M&&M.sides){ const f=C.fixtures[M.fid];
    for(const S of M.sides){ const on=new Set((S.slots||[]).map(s=>s.pid).filter(Boolean)); if(on.size<2) continue; for(const pr of v1816Pairs(C,S.sid)) if(on.has(pr.o)&&on.has(pr.y)) F.chem[pr.key]=Math.min(10,(F.chem[pr.key]||0)+1); }
    for(const [pid,fx] of Object.entries(F.fx)){ if(!fx.shaky) continue; const p=C.players[pid]; if(!p){ delete fx.shaky; continue; } if(f&&f.lvl===p.lvl&&(f.h===p.sid||f.a===p.sid)){ fx.shaky.left--; if(fx.shaky.left<=0){ shiftOvr(p,fx.shaky.amt,'balanced'); delete fx.shaky; if(p.sid===C.userSid) addNews(C,'family',`${pname(p)} settles into his famous number after a shaky start`,p.sid,{pid}); } } } } }catch(e){ console.warn('v1816 match',e); } return r; }; }

/* ---------- the coach's mailbox: a retired family number ---------- */
function v1816Mail(C,kid,relId,num,kind){ const F=v1816S(C); if(F.mail.some(m=>m.pid===kid.id&&m.status==='open')) return; const R=v1816Person(C,relId); const L=F.links[kid.id];
  const exp=R&&R.legend?88:R&&(R.honors||[]).length?74:62; F.meters[kid.id]=F.meters[kid.id]||{exp,sup:54,team:71};
  const id='m'+(++F.n); F.mail.push({id,pid:kid.id,of:relId,num,kind,yr:C.year,status:'open',rel:L?L.rel:'brother'});
  addNews(C,'family',`Coach's mailbox: a note from ${pname(kid)} about #${num}`,C.userSid,{pid:kid.id}); return id; }
const V1816_CH={
  keep:{t:'Keep it retired',d:n=>`He wears his own number and the banner stays. He takes it well, mostly.`,tags:[['good','Fans respect tradition (prestige +2)'],['bad','Loyalty dips at first: slower growth this season']],m:{exp:-6,sup:-12,team:6}},
  wear:{t:n=>`Let him wear ${n}`,d:n=>`Un-retire the number. He carries the spotlight, and the old guard grumbles.`,tags:[['good','Develops faster while he wears it'],['bad','Pressure: shaky first 3 games']],m:{exp:6,sup:18,team:-12}},
  patch:{t:'Patch and ceremony',d:n=>`He wears ${n} with a legacy patch; the number stays retired. Family night at the next home game.`,tags:[['good','Crowd behind him: +1 rating'],['bad','Costs a home date (prestige −2)']],m:{exp:4,sup:12,team:4}} };
function v1816Choose(C,mid,ch,auto){
  const F=v1816S(C); const m=F.mail.find(x=>x.id===mid); if(!m||m.status!=='open') return false; const p=C.players[m.pid]; m.status='done'; m.choice=ch; m.cy=C.year; if(!p) return true;
  const M=F.meters[p.id]||(F.meters[p.id]={exp:70,sup:54,team:71}); const d=V1816_CH[ch].m; M.exp=clamp(M.exp+d.exp,0,100); M.sup=clamp(M.sup+d.sup,0,100); M.team=clamp(M.team+d.team,0,100);
  const sch=C.schools[p.sid]; const fx=F.fx[p.id]||(F.fx[p.id]={});
  const take=()=>{ const mate=squad(C,p.sid,p.lvl).find(x=>x.id!==p.id&&x.num===m.num); if(mate){ const used=new Set([...retiredSet(C,p.sid),...squad(C,p.sid,p.lvl).map(x=>x.num)]); mate.num=assignNum(rngFrom(hashStr(mate.id+'v1816swap')),used,mate.pos); } p.num=m.num; };
  if(ch==='keep'){ sch.prestige=Math.min(99,sch.prestige+2); if(p.plan) p.plan.gain*=0.92; }
  if(ch==='wear'){ const R=C.retired&&C.retired[p.sid]; const e=R&&R.find(x=>x.num===m.num); if(e){ e.unret={pid:p.id,yr:C.year,name:pname(p)}; C.retired[p.sid]=R.filter(x=>x!==e); (F.unretired||(F.unretired=[])).push(e); } take(); fx.wear=m.num; if(p.plan) p.plan.gain*=1.25; shiftOvr(p,-3,'balanced'); fx.shaky={left:3,amt:3}; }
  if(ch==='patch'){ take(); F.patch[p.id]=m.num; sch.prestige=Math.max(5,sch.prestige-2); shiftOvr(p,1,'balanced'); p.pot=Math.max(p.pot,Math.ceil(ovr(p))); }
  addNews(C,'family',auto?`${pname(p)} keeps his own number: #${m.num} stays retired`:ch==='keep'?`#${m.num} stays retired; ${pname(p)} picks his own number`:ch==='wear'?`${pname(p)} will wear #${m.num}, un-retired for his family`:`${pname(p)} wears #${m.num} with a legacy patch; family night set for the next home game`,p.sid,{pid:p.id});
  return true; }
/* the meters lean on his growth every season */
function v1816DevMult(C,pid){ const F=v1816S(C); const M=F.meters[pid]; let k=1; if(M) k*=1+(M.sup-50)/400+(M.team-50)/500-Math.max(0,M.exp-80)/300; const fx=F.fx[pid]; if(fx&&fx.wear!=null){ const p=C.players[pid]; if(p&&p.num===fx.wear) k*=1.25; } return k; }
{ const _ss=seasonStart; seasonStart=function(C){ const r=_ss.apply(this,arguments); try{ const F=C.fam; if(F&&F.v===1) for(const pid of new Set([...Object.keys(F.meters),...Object.keys(F.fx)])){ const p=C.players[pid]; if(p&&p.plan) p.plan.gain*=v1816DevMult(C,pid); } }catch(e){} return r; }; }
{ const _mg=migrate; migrate=function(raw){ const C=_mg.apply(this,arguments); try{ if(C&&C.league&&!(C.fam&&C.fam.seeded)) { v1816S(C).seeded=true; v1816S(C).yr[C.year]=1; } }catch(e){} return C; }; }

/* ---------- reading a family ---------- */
function v1816Rel(C,a,b){ /* how b is related to a, in words */ const F=v1816S(C); const ga=v1816Gen(C,a), gb=v1816Gen(C,b); const La=F.links[a], Lb=F.links[b];
  if(gb<ga) return ga-gb>1?'grandfather':'father'; if(gb>ga) return ga===gb-1?'son':'grandson';
  if((La&&La.rel==='cousin'&&La.of===b)||(Lb&&Lb.rel==='cousin'&&Lb.of===a)) return 'cousin'; return 'brother'; }
function v1816Tree(C,famId){ const F=v1816S(C); const fam=F.fams[famId]; if(!fam) return []; const gens={}; for(const id of fam.mem){ const g=v1816Gen(C,id); (gens[g]||(gens[g]=[])).push(id); } return Object.keys(gens).map(Number).sort((a,b)=>a-b).map(g=>({g,ids:gens[g]})); }
function v1816Card(C,id){ const F=v1816S(C); const e=F.elders[id]; const p=e?null:findPerson(C,id); if(!e&&!p) return null; const cur=!!C.players[id];
  if(e) return {id,elder:true,fn:e.fn,ln:e.ln,sid:e.sid,num:e.num,cls:e.cls,pos:e.pos,tags:e.honors,note:e.note,role:e.legend?'Hall of Fame':e.role==='father'?'Father':'Alumnus',face:{id,grade:12,sid:e.sid,look:e.look}};
  const t=typeof careerTotals==='function'?careerTotals(p):{g:0}; const tags=[]; const hof=(C.hof||[]).find(h=>h.pid===id); if(hof) tags.push('Hall of Fame'); const ret=Object.values(C.retired||{}).flat().find(x=>x.pid===id); if(ret) tags.push('#'+ret.num+' retired');
  (p.awards||[]).slice(0,2).forEach(a=>tags.push((typeof AWARD_NAME!=='undefined'&&AWARD_NAME[a.k])||a.k)); if(t.g>=10) tags.push(t.g+' career goals');
  return {id,elder:false,fn:p.fn,ln:p.ln,sid:p.sid,num:p.num,cls:cur?v1816Cls(C,p):(p.gradYr||C.year),pos:p.pos,tags:tags.slice(0,3),note:cur?(p.grade<=8?pick(v1816R(C,'note',id),V1816.NOTE_P):''):(p.outcome||''),role:cur?(p.lvl==='V'?'Varsity':p.lvl==='JV'?'JV':'Modified')+' · Grade '+p.grade:'Alumnus',face:p,cur};
}
