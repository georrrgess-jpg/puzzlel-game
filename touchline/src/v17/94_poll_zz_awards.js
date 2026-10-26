/* ===================== v18.14 THE STATE POLL, part h: statewide leaderboards for everything, the State Awards =====================
   Every player at every school in the poll (your league plays the engine, the other sections the seeded model) is tracked on the
   same stat line, so the leaderboards cover tackles, interceptions, clearances, shots on target, xG, save percentage and average
   match rating, and the awards are voted from those numbers plus how the team did (final poll rank, State Tournament run).
   Awards: State Player of the Year, Offensive and Defensive Player of the Year, Goalkeeper of the Year, Underclassman of the Year,
   Coach of the Year, All-State First and Second Teams. They are given once the State Tournament is over (C.poll.aw[year]);
   your players get them as honors on their profile and the Newswire carries the ceremony. All identifiers v1814 / V1814. */
V1812P_BOARDS.push(
 ['tk','Tackle leaders','Tackles',x=>x.s.tk,x=>`${x.s.gp} GP · ${x.s.int} INT · ${x.pos}`,1],
 ['int','Interception leaders','Interceptions',x=>x.s.int,x=>`${x.s.gp} GP · ${x.s.tk} TK · ${x.pos}`,1],
 ['cl','Clearance leaders','Clearances',x=>x.s.cl,x=>`${x.s.gp} GP · ${x.s.tk} TK · ${x.pos}`,1],
 ['def','Defensive actions','TK+INT+CL',x=>x.pos!=='GK'?x.s.tk+x.s.int+x.s.cl:0,x=>`${x.s.tk} TK · ${x.s.int} INT · ${x.s.cl} CL`,1],
 ['sot','Shots on target','On target',x=>x.s.sot,x=>`${x.s.sh} shots · ${x.s.g} G`,1],
 ['xg','Expected goals','xG',x=>x.xg?Math.round(x.xg*10)/10:0,x=>`${x.s.g} G · ${x.s.sh} shots`,1],
 ['svp','Save percentage','Save %',x=>x.pos==='GK'&&x.s.gp>=5&&x.s.sv+x.s.ga>0?Math.round(x.s.sv/(x.s.sv+x.s.ga)*1000)/10:0,x=>`${x.s.sv} saves · ${x.s.ga} GA · ${x.s.gp} GP`,0]
);
const V1814A=[
 ['poy','State Player of the Year','The best player in the state'],
 ['opoy','Offensive Player of the Year','Goals, assists and the chances behind them'],
 ['dpoy','Defensive Player of the Year','Tackles, interceptions, clearances and the goals his team kept out'],
 ['gk','Goalkeeper of the Year','Save percentage, clean sheets and rating'],
 ['under','Underclassman of the Year','The best freshman or sophomore'],
 ['coy','Coach of the Year','The team that did the most with what it had']];
const V1814MIN=8;

/* ---------- inputs ---------- */
function v1814Final(C,yr){ return yr<C.year||(yr===C.year&&C.phase==='offseason'); }
function v1814PollId(C,yr,sid){ if(!sid) return null; if(C.league.includes(sid)) return sid; const S=(C.v1814||{})[yr]; return S&&S.ext[sid]||null; }
function v1814Post(C,yr){ const T=C.tourneys&&C.tourneys[yr]; const o={champ:null,run:null,field:new Set()}; if(!T) return o; o.champ=v1814PollId(C,yr,T.stChamp); o.run=v1814PollId(C,yr,T.stRunner);
  for(const rd of (T.st||[])) for(const fid of rd){ const f=C.fixtures[fid]; if(f){ const a=v1814PollId(C,yr,f.h), b=v1814PollId(C,yr,f.a); if(a) o.field.add(a); if(b) o.field.add(b); } } return o; }
function v1814Grade(C,x,yr){ if(x.virtual){ const q=v1812pParseVP(x.id); return q?v1812pVGrade(v1812pVPlayer(C,q.vid,q.c,q.k),yr):12; } const p=findPerson(C,x.id); if(!p||p.grade==null) return 12; if(C.players[x.id]) return p.grade-(C.year-yr); return p.gradYr?p.grade-(p.gradYr-yr):12; }
function v1814Ctx(C,yr){
  const polls=v1812pPolls(C,yr); const last=polls.length?polls[polls.length-1]:null; const first=polls[0]||null; const rk=v1812pRankMap(last), rk0=v1812pRankMap(first);
  const recs=v1812pRecords(C,yr,V1812P.WEEKS); const post=v1814Post(C,yr); const team=new Map();
  for(const id of v1812pAllIds(C)){ const a=recs.get(id)||[]; let pts=0,ga=0,ex=0; const R=v1812pRating(C,id,yr); for(const x of a){ pts+=x.gf>x.ga?3:x.gf===x.ga?1:0; ga+=x.ga; ex+=v1812pEPts(R-v1812pRating(C,x.opp,yr)); }
    const n=a.length||1; team.set(id,{rk:rk.get(id)||null,rk0:rk0.get(id)||null,ppg:pts/n,gapg:ga/n,exppg:ex/n,gp:a.length,R,pts,w:a.filter(x=>x.gf>x.ga).length,d:a.filter(x=>x.gf===x.ga).length,l:a.filter(x=>x.gf<x.ga).length,champ:post.champ===id,run:post.run===id,st:post.field.has(id)}); }
  return {team,post};
}
function v1814TeamBonus(t){ if(!t) return 0; return (t.rk?(V1812P.TOP+1-t.rk)/V1812P.TOP*1.1:0)+(t.champ?0.9:t.run?0.5:t.st?0.25:0); }

/* ---------- scores ---------- */
function v1814Score(k,x,t){ const s=x.s, gp=s.gp||1, ar=s.rt/gp;
  if(k==='poy') return (ar-6.4)*3+(s.g+0.7*s.a)/gp*2.4+(s.tk+s.int)/gp*0.12+v1814TeamBonus(t)+(x.pos==='GK'?-0.6:0);
  if(k==='opoy') return x.pos==='GK'||x.pos==='DEF'?-99:(s.g*1+s.a*0.65+s.sot*0.08+(x.xg||0)*0.25)/gp*3+(ar-6.4)*1.2+v1814TeamBonus(t)*0.5;
  if(k==='dpoy') return x.pos==='GK'||x.pos==='FWD'?-99:(s.tk+s.int*1.3+s.cl*0.45)/gp*0.9+(ar-6.4)*1.6+(t?Math.max(0,1.6-t.gapg)*0.9:0)+v1814TeamBonus(t)*0.5;
  if(k==='gk') return x.pos!=='GK'?-99:(s.sv+s.ga?s.sv/(s.sv+s.ga):0)*6+s.cs/gp*2.5+(ar-6.4)*1.5+v1814TeamBonus(t)*0.5;
  return 0; }
function v1814Line(k,x){ const s=x.s, gp=s.gp||1; const ar=(s.rt/gp).toFixed(2);
  if(x.pos==='GK') return `${s.sv} saves · ${s.sv+s.ga?Math.round(s.sv/(s.sv+s.ga)*100):0}% · ${s.cs} clean sheets · ${ar} avg`;
  if(k==='dpoy'||x.pos==='DEF') return `${s.tk} TK · ${s.int} INT · ${s.cl} CL · ${ar} avg`;
  return `${s.g} G · ${s.a} A · ${s.sot} on target · ${ar} avg`; }
function v1814Coach(C,id){ const s=C.schools[id]; if(s&&C.league.includes(id)){ const co=C.coaches[s.coachId]; return co?co.name:'Unknown'; } const r=v1812pRng(C,'coach',id); const [fn,ln]=genName(r); return fn+' '+ln; }

/* ---------- the ballot ---------- */
function v1814Compute(C,yr){
  const pool=v1812pLeaderPool(C,yr,'state').filter(x=>x.s.gp>=V1814MIN); const {team,post}=v1814Ctx(C,yr);
  const rank=k=>pool.map(x=>({x,v:v1814Score(k,x,team.get(x.sid))})).filter(o=>o.v>-50).sort((a,b)=>b.v-a.v||(a.x.id<b.x.id?-1:1));
  const ent=(k,o)=>({id:o.x.id,virtual:o.x.virtual,name:o.x.name,sid:o.x.sid,pos:o.x.pos,line:v1814Line(k,o.x),sc:Math.round(o.v*100)/100});
  const out={yr,list:{},fin:{},team1:[],team2:[]}; const won=new Set();
  for(const k of ['poy','opoy','dpoy','gk']){ const r=rank(k); const top=r.filter(o=>k==='poy'||!won.has(o.x.id)); if(!top.length) continue; out.list[k]=ent(k,top[0]); out.fin[k]=top.slice(1,3).map(o=>ent(k,o)); won.add(top[0].x.id); }
  const und=rank('poy').filter(o=>!won.has(o.x.id)&&v1814Grade(C,o.x,yr)<=10); if(und.length){ out.list.under=ent('poy',und[0]); out.fin.under=und.slice(1,3).map(o=>ent('poy',o)); }
  const co=[...team.entries()].filter(([id,t])=>t.gp>=10).map(([id,t])=>({id,t,v:(t.ppg-t.exppg)*2.2+(t.rk?(V1812P.TOP+1-t.rk)/V1812P.TOP*0.8:0)+(t.rk0&&t.rk&&t.rk<t.rk0?Math.min(1,(t.rk0-t.rk)/20):!t.rk0&&t.rk?0.6:0)+(t.champ?1.4:t.run?0.7:t.st?0.3:0)})).sort((a,b)=>b.v-a.v||(a.id<b.id?-1:1));
  const cent=o=>({sid:o.id,name:v1814Coach(C,o.id),line:`${o.t.w}-${o.t.d}-${o.t.l}${o.t.rk?' · No. '+o.t.rk:''}${o.t.champ?' · State champions':o.t.run?' · State runners-up':o.t.st?' · State Tournament':''}`,sc:Math.round(o.v*100)/100,user:o.id===C.userSid});
  if(co.length){ out.list.coy=cent(co[0]); out.fin.coy=co.slice(1,3).map(cent); }
  const need={GK:1,DEF:4,MID:3,FWD:3}; const all=rank('poy'); const used=new Set();
  for(const which of ['team1','team2']){ const cnt={GK:0,DEF:0,MID:0,FWD:0};
    for(const o of all){ if(used.has(o.x.id)||cnt[o.x.pos]>=need[o.x.pos]) continue; cnt[o.x.pos]++; used.add(o.x.id); out[which].push(ent('poy',o)); if(out[which].length>=11) break; }
    out[which].sort((a,b)=>GROUPS.indexOf(a.pos)-GROUPS.indexOf(b.pos)); }
  out.post={champ:post.champ,run:post.run,field:[...post.field]};
  return out;
}
/* given once per season, after States; honors for your league's players, a Newswire ceremony */
function v1814Awards(C,yr){
  const P=v1812pS(C); P.aw=P.aw||{}; if(P.aw[yr]) return P.aw[yr];
  if(!v1814Final(C,yr)||v1812pBound(C,yr)<V1812P.WEEKS) return null;
  let A; try{ A=v1814Compute(C,yr); }catch(e){ console.warn('v1814 awards',e); return null; }
  P.aw[yr]=A; if(yr===C.year) v1814Give(C,A); return A;
}
function v1814Label(k){ const a=V1814A.find(x=>x[0]===k); return a?a[1]:k; }
function v1814Give(C,A){
  const yr=A.yr; const town=id=>v1812pName(C,id);
  const hon=(e,label)=>{ if(e.virtual) return; const p=C.players[e.id]; if(p&&!(p.honors||[]).some(h=>h.yr===yr&&h.label===label)) (p.honors||(p.honors=[])).push({yr,label}); };
  for(const k of ['poy','opoy','dpoy','gk','under']){ const e=A.list[k]; if(e) hon(e,v1814Label(k)); }
  A.team1.forEach(e=>hon(e,'All-State First Team')); A.team2.forEach(e=>hon(e,'All-State Second Team'));
  const poy=A.list.poy; if(poy) addNews(C,'award',`State Awards: ${poy.name} (${town(poy.sid)}) is the ${yr} ${C.stateName} Player of the Year`,C.league.includes(poy.sid)?poy.sid:C.userSid,C.league.includes(poy.sid)&&!poy.virtual?{pid:poy.id}:{});
  const co=A.list.coy; if(co) addNews(C,'award',`State Awards: ${co.user?'Coach '+co.name+' of '+town(co.sid)+' is the '+C.stateName+' Coach of the Year':co.name+' ('+town(co.sid)+') is '+C.stateName+' Coach of the Year'}`,C.league.includes(co.sid)?co.sid:C.userSid);
  const mine=[...['poy','opoy','dpoy','gk','under'].map(k=>A.list[k]&&A.list[k].sid===C.userSid?v1814Label(k)+': '+A.list[k].name:null).filter(Boolean),...A.team1.filter(e=>e.sid===C.userSid).map(e=>e.name+' (First Team)'),...A.team2.filter(e=>e.sid===C.userSid).map(e=>e.name+' (Second Team)')];
  if(mine.length) addNews(C,'award',`State Awards for ${town(C.userSid)}: ${mine.join(' · ')}`,C.userSid);
}
{ const _adv=advance; advance=function(C){ const ph=C.phase; const ev=_adv.apply(this,arguments); try{ if(V1814.on&&ph!=='offseason'&&C.phase==='offseason') v1814Awards(C,C.year); }catch(e){ console.warn('v1814 awards',e); } return ev; }; }
/* virtual players show their state awards in "Across seasons" (league players carry them as honors) */
{ const _sh=v1812pStateHonors; v1812pStateHonors=function(C,id,yr){ const out=_sh.apply(this,arguments); try{ if(String(id).indexOf('vp_')!==0) return out; const A=(v1812pS(C).aw||{})[yr]; if(!A) return out;
  for(const k of ['poy','opoy','dpoy','gk','under']) if(A.list[k]&&A.list[k].id===id) out.unshift(v1814Label(k)); if(A.team1.some(e=>e.id===id)) out.push('All-State First Team'); if(A.team2.some(e=>e.id===id)) out.push('All-State Second Team'); }catch(e){} return out; }; }

/* ---------- the Awards tab ---------- */
function v1814Face(C,e,sz){ if(!e.virtual){ const p=findPerson(C,e.id); return p?portraitSVG(p,sz):''; } const p=v1812pPlayerRec(C,e.id); const sc=v1812pSchool(C,e.sid); return p?portraitSVG(p,sz,{c1:sc.c1,c2:sc.c2}):''; }
function v1814Open(e){ return e.virtual?`data-a="v1812pPlayer" data-id="${esc(e.id)}"`:`data-a="openPlayer" data-id="${esc(e.id)}"`; }
function v1814Card(C,k,A,i){
  const def=V1814A.find(x=>x[0]===k); const e=A.list[k]; if(!e) return ''; const sc=v1812pSchool(C,e.sid); const fin=(A.fin[k]||[]);
  const coach=k==='coy'; const mine=e.sid===C.userSid;
  const who=coach?`<span class="v1814-cface">${crest(sc,64)}</span>`:`<button class="v1814-face" ${v1814Open(e)} aria-label="${esc(e.name)}">${v1814Face(C,e,96)}</button>`;
  const fl=fin.map(f=>{ const fs=v1812pSchool(C,f.sid); return `<li>${crest(fs,14)} <b>${esc(f.name)}</b> <small>${esc(fs.town)}${coach?'':' · '+f.pos}</small></li>`; }).join('');
  return `<article class="v1814-aw ${k==='poy'?'big':''} ${coach?'coy':''} ${mine?'mine':''}" style="--c1:${sc.c1};--c2:${sc.c2};--i:${i}"><div class="v1814-awk">${esc(def[1])}</div>${who}
    <div class="v1814-awn"><b>${esc(e.name)}</b><span>${crest(sc,16)} ${esc(sc.town)}${coach?'':' · '+e.pos}</span></div><div class="v1814-awl">${esc(e.line)}</div>
    ${fl?`<div class="v1814-fin"><span>Finalists</span><ul>${fl}</ul></div>`:''}</article>`;
}
function v1814AllState(C,list,label){
  const rows=['FWD','MID','DEF','GK'].map(g=>`<div class="v1814-row">${list.filter(e=>e.pos===g).map(e=>{ const sc=v1812pSchool(C,e.sid); return `<button class="v1814-pl ${e.sid===C.userSid?'mine':''}" style="--c1:${sc.c1};--c2:${sc.c2}" ${v1814Open(e)}><span class="v1814-plf">${v1814Face(C,e,44)}</span><b>${esc(e.name)}</b><small>${crest(sc,12)} ${esc(sc.town)}</small><em>${esc(e.line.split(' · ').slice(0,2).join(' · '))}</em></button>`; }).join('')}</div>`).join('');
  return `<section class="v1812p-card v1814-team"><div class="v1812p-kick">All-State</div><h3 class="v1812p-head sm">${label}</h3><div class="v1814-pitch">${rows}</div></section>`;
}
function v1814Field14(C,yr){
  const T=C.tourneys&&C.tourneys[yr]; const S=(C.v1814||{})[yr]; if(!T||!T.st||!T.st[0]) return '';
  const fin=C.fixtures[T.st[T.st.length-1][0]]; const ids=new Set(); for(const fid of T.st[0]){ const f=C.fixtures[fid]; if(f){ ids.add(f.h); ids.add(f.a); } }
  const rk=id=>{ const v=v1814PollId(C,yr,id); return v?v1814Rank(C,v,yr):null; };
  const lab=id=>id===T.stChamp?'Champions':id===T.stRunner?'Runners-up':(T.st[1]||[]).some(fid=>{ const f=C.fixtures[fid]; return f&&(f.h===id||f.a===id); })?'Semifinal':'Quarterfinal';
  const pre=S?new Set(S.pre):new Set();
  const li=[...ids].sort((a,b)=>(rk(a)||999)-(rk(b)||999)).map(id=>{ const s=C.schools[id]; const v=v1814PollId(C,yr,id); const r=rk(id); return `<li class="${id===T.stChamp?'ch':''} ${id===C.userSid?'mine':''}">${crest(s,20)}<span class="trunc"><b>${esc(s.town)}</b><small>${esc(s.section||'Section '+C.section)}${r?' · No. '+r:' · unranked'}${v&&pre.has(v)?' · met you in the Preseason Cup':''}</small></span><em>${lab(id)}</em></li>`; }).join('');
  return `<section class="v1812p-card v1814-field"><div class="v1812p-kick">${yr} State Tournament</div><h3 class="v1812p-head sm">${fin&&fin.w?esc(C.schools[fin.w].name)+' win it all':'The field'}</h3><ol>${li}</ol><p class="tiny muted">The eight: the Regional champion and the seven best-ranked section champions in the final State Poll.</p></section>`;
}
/* during the season: the award races */
function v1814Races(C,yr){
  const pool=v1812pLeaderPool(C,yr,'state').filter(x=>x.s.gp>=Math.min(V1814MIN,Math.max(2,Math.floor(v1812pBound(C,yr)*0.6)))); if(!pool.length) return `<div class="empty card">The races start once a few games are played.</div>`;
  const {team}=v1814Ctx(C,yr);
  const box=k=>{ const r=pool.map(x=>({x,v:v1814Score(k,x,team.get(x.sid))})).filter(o=>o.v>-50).sort((a,b)=>b.v-a.v||(a.x.id<b.x.id?-1:1)).slice(0,5);
    return `<section class="v1812p-card v1814-race"><div class="v1812p-kick">${esc(v1814Label(k))}</div><ol>${r.map((o,i)=>{ const sc=v1812pSchool(C,o.x.sid); return `<li class="${o.x.sid===C.userSid?'mine':''}"><b>${i+1}</b><button ${v1814Open(o.x)}><span class="v1814-lf">${v1814Face(C,o.x,26)}</span><span class="trunc"><b>${esc(o.x.name)}</b><small>${crest(sc,12)} ${esc(sc.town)} · ${o.x.pos}</small></span></button><em>${esc(v1814Line(k,o.x).split(' · ').slice(0,2).join(' · '))}</em></li>`; }).join('')}</ol></section>`; };
  return `<div class="v1814-races">${['poy','opoy','dpoy','gk'].map(box).join('')}</div>`;
}
function v1814AwardsTab(C){
  const P=App.params; const yrs=V1812P_YRS(C); const yr=P.ayr?+P.ayr:C.year; const A=v1814Awards(C,yr);
  const sel=`<div class="v1812p-filters"><label class="v1812p-f"><span>Season</span><select data-c="v1812pYr" data-k="ayr" aria-label="Season">${yrs.map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('')}</select></label><span class="tiny muted v1814-how">Voted from the regular-season numbers of every player in the state (at least ${V1814MIN} games) and how his team finished: the final poll and the State Tournament.</span></div>`;
  if(!A){ const prev=yr===C.year&&(v1812pS(C).aw||{})[C.year-1]; return sel+`<section class="v1812p-card v1814-wait"><div class="v1812p-kick">${yr} State Awards</div><h3 class="v1812p-head sm">Given out after the State final</h3><p class="muted">Until then, here is where the races stand.${prev?` Last season: ${esc(prev.list.poy?prev.list.poy.name+' ('+v1812pName(C,prev.list.poy.sid)+') was Player of the Year':'')}. <button class="btn sm ghost" data-a="setParam" data-k="ayr" data-v="${C.year-1}">See the ${C.year-1} awards</button>`:''}</p></section>`+v1814Races(C,yr); }
  const cards=['poy','opoy','dpoy','gk','under','coy'].map((k,i)=>v1814Card(C,k,A,i)).join('');
  return sel+`<div class="v1814-hero"><span class="v1812p-kick">${esc(C.stateName)} · ${yr}</span><h2>The State Awards</h2></div><div class="v1814-grid">${cards}</div>${v1814Field14(C,yr)}<div class="grid g2 v1814-teams">${v1814AllState(C,A.team1,'First Team')}${v1814AllState(C,A.team2,'Second Team')}</div>`;
}
