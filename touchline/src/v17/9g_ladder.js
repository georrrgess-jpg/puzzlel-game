/* ===================== v18.19 THE LADDER (core) =====================
   Three classes of eight: AAA, AA and A. Your league is the class you are in (it plays the match engine); the class above and
   the class below are State Poll sections (V1819L.UP = 4 for the upper one, V1819L.LO = 7 for the lower one; Section 6 stays the Regional pool and neither class section sends a team to the State field), simulated with the
   poll's season model. At the end of every season:
     the top two of a class move up, the bottom two move down; the third of the lower class plays the sixth of the upper class in
     a promotion playoff for the last spot (one game, extra time and penalties); every class crowns its own champion.
   Schools that move into your league become real schools with full Varsity / JV / Modified rosters (a State Poll school keeps its
   id, name, colours and crest); schools that leave become State Poll schools in their new class (their notable players are kept
   as alumni). Section membership is kept per year (t.sh) so past seasons, tables and polls still read correctly; standings for a
   past year use that year's league (C.lad.lg). League balance uses a band per class (AAA tougher, A weaker); your own team is never
   touched. Your own promotion playoff is a real match you play from the Ladder page or the Play button in the off-season (it is
   simulated if you start the next season first). State: C.lad. Off when the State Poll link is off (V1814.on false, a test switch).
   Identifiers v1819l / V1819L. */
const V1819L={ CLS:['AAA','AA','A'], UP:4, LO:7, /* Section 6 stays the Regional pool */
  NAME:{AAA:'Class AAA',AA:'Class AA',A:'Class A'}, SUB:{AAA:'Largest schools · biggest crowds',AA:'Mid-size schools',A:'Smaller schools · short trips'},
  BAND:{AAA:{lo:70,hi:74.4,top:[75,77.4]},AA:{lo:65,hi:69.4,top:[70,72.4]},A:{lo:60,hi:64.4,top:[65,67.4]}},
  BASE:{AAA:{power:79,cont:77,rest:74},AA:{power:72,cont:70,rest:67},A:{power:67,cont:65,rest:62}},
  STR:{AAA:0.82,AA:0.5,A:0.22}, TIER:{AAA:[3,4],AA:[2,3],A:[1,2]}, rolling:false };
function v1819lOn(C){ return !!(C&&C.league&&C.league.length===8&&typeof v1812pS==='function'&&(typeof V1814==='undefined'||V1814.on)); }
const v1819lR=(C,...k)=>rngFrom(hashStr([C.seed,'v1819l',...k].join('|')));
function v1819lUp(c){ return c==='A'?'AA':c==='AA'?'AAA':null; }
function v1819lDown(c){ return c==='AAA'?'AA':c==='AA'?'A':null; }

/* ---------- the pool, year-aware ---------- */
function v1819lSecAt(t,yr){ if(!t) return null; let s=t.sec0!=null?t.sec0:t.sec; if(t.sh) for(const [y,v] of t.sh) if(y<=yr) s=v; return s; }
function v1819lBaseAt(t,yr,bY){ let b=(t.B!=null&&yr>=(t.bFrom!=null?t.bFrom:bY))?t.B:70.2; if(t.bh) for(const [y,v] of t.bh) if(y<=yr) b=v; return b; }
function v1819lTouch(C){ const P=v1812pS(C); P.pool.mv=(P.pool.mv||0)+1; P.pool.sig=v1814Sig(P.pool.teams)+'|m'+P.pool.mv; for(const k of ['vy','vr','ros','vs','cmp']) if(v1812pMem[k]) v1812pMem[k].clear(); }
/* the league you played in a given year (the Ladder moves schools between years) */
function v1819lLgAt(C,yr){ const L=C&&C.lad; if(!L||!L.lg||yr===C.year) return C.league; if(L.lg[yr]) return L.lg[yr]; const ys=Object.keys(L.lg).map(Number).sort((a,b)=>a-b); return ys.length&&yr<ys[0]?L.lg[ys[0]]:C.league; }
if(typeof v1812pS==='function'){
v1812pVR=function(C,vid,yr){
  const P=v1812pS(C); const k=P.pool.sig+'|'+vid+'|'+yr; let v=v1812pMem.vr.get(k); if(v!=null) return v;
  const t=v1812pPoolMap(C).get(vid); if(!t) return 70; let R=t.R, y0=P.y0; if(t.rY!=null){ R=t.rA; y0=t.rY; }
  for(let y=y0+1;y<=yr;y++){ const r=v1812pRng(C,'vr',vid,y); R=0.72*R+0.28*v1819lBaseAt(t,y,P.pool.bY||0)+gauss(r)*2; }
  v=Math.round(v1812pClamp(R,56,85)*100)/100; v1812pMem.vr.set(k,v); return v; };
v1812pVSeason=function(C,yr){
  const P=v1812pS(C); const k=P.pool.sig+'|'+yr; let v=v1812pMem.vy.get(k); if(v) return v;
  const bySec={}; for(const t of P.pool.teams){ const s=v1819lSecAt(t,yr); if(!s||v1819lLgAt(C,yr).includes(t.id)) continue; (bySec[s]||(bySec[s]=[])).push(t.id); }
  const games=[]; for(const sec of V1812P.SECS){ const ids=bySec[sec]; if(!ids||ids.length<2) continue; roundRobin(ids).forEach((pairs,rd)=>{ for(const [h,a] of pairs) games.push(v1812pGame(C,yr,rd,h,a)); }); }
  const rec=new Map(); for(const s in bySec) for(const id of bySec[s]) rec.set(id,[]);
  for(const g of games){ rec.get(g.h).push(v1812pRec(g,0)); rec.get(g.a).push(v1812pRec(g,1)); }
  for(const arr of rec.values()) arr.sort((x,y)=>x.rd-y.rd);
  v=v1812pMem.vy.set(k,{games,rec}).get(k); if(v1812pMem.vy.size>12) v1812pMem.vy.delete(v1812pMem.vy.keys().next().value); return v; };
{ const _lr=v1812pLeagueRecs; v1812pLeagueRecs=function(C,yr,bound){ const g=v1819lLgAt(C,yr); if(g===C.league) return _lr.apply(this,arguments); const keep=C.league; C.league=g; try{ return _lr.apply(this,arguments); } finally{ C.league=keep; } }; }
v1812pAllIds=function(C){ const P=v1812pS(C); return [...C.league,...P.pool.teams.filter(t=>!C.league.includes(t.id)&&v1819lSecAt(t,C.year)).map(t=>t.id)]; };
v1812pSec=function(C,id){ if(C.league.includes(id)) return C.section; return v1819lSecAt(v1812pPoolMap(C).get(id),C.year)||0; };
v1814Table=function(C,yr,sec,bound){ const vs=v1812pVSeason(C,yr); const rows=[];
  for(const t of v1812pS(C).pool.teams){ if(v1819lSecAt(t,yr)!==sec||!vs.rec.has(t.id)) continue; const a=vs.rec.get(t.id).filter(x=>bound==null||x.rd<bound); let pts=0,gf=0,ga=0,w=0,d=0,l=0; const form=[];
    for(const x of a){ gf+=x.gf; ga+=x.ga; if(x.gf>x.ga){ pts+=3; w++; form.push('W'); } else if(x.gf===x.ga){ pts++; d++; form.push('D'); } else { l++; form.push('L'); } }
    rows.push({id:t.id,sid:t.id,p:a.length,pts,gf,ga,gd:gf-ga,w,d,l,form}); }
  return rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||(a.id<b.id?-1:1)); };
{ const _ts=v1812pVTeamSeason; v1812pVTeamSeason=function(C,vid,yr,bound){ if(!v1812pVSeason(C,yr).rec.has(vid)) return {stats:new Map(),starters:[],bench:[]}; return _ts.apply(this,arguments); }; }
/* poll players of schools that left your league carry the school's own id */
v1812pParseVP=function(id){ const m=/^vp_(.+)_(\d+)_(\d)$/.exec(String(id)); return m?{vid:m[1],c:+m[2],k:+m[3]}:null; };
/* the Preseason Cup draws from outside the Ladder's class sections */
v1814PickPre=function(C,target,S){
  const r=v1812pRng(C,'v1814pre',C.year,S.pre.length); const yr=C.year; const last=S.pre.length===2; const T=last?target+4:target;
  const lad=new Set(C.lad?[...C.lad.cls.AAA,...C.lad.cls.AA,...C.lad.cls.A]:[]);
  const cand=v1812pS(C).pool.teams.filter(t=>{ const sc=v1819lSecAt(t,yr); return sc&&sc!==V1819L.UP&&sc!==V1819L.LO; }).filter(t=>!S.pre.includes(t.id)&&!C.league.includes(t.id)&&!lad.has(t.id)&&(!last||t.tier==='power'||t.tier==='cont')).map(t=>({id:t.id,d:Math.abs(v1812pVR(C,t.id,yr)-T)+r()*0.01})).sort((a,b)=>a.d-b.d).slice(0,4);
  return cand.length?cand[Math.floor(r()*cand.length)].id:null; };
}

/* ---------- state ---------- */
function v1819lS(C){ if(!v1819lOn(C)) return null; if(C.lad&&C.lad.v===1) return C.lad; return v1819lInit(C); }
function v1819lInit(C){
  const P=v1812pS(C); const yr=C.year; const fresh=C.phase==='preseason'&&!Object.values(C.fixtures).some(f=>f.yr===yr&&f.st==='d');
  const sec=s=>P.pool.teams.filter(t=>v1819lSecAt(t,yr)===s&&!C.league.includes(t.id)).map(t=>t.id).slice(0,8);
  const L=C.lad={v:1,cls:{AAA:sec(V1819L.UP),AA:[...C.league],A:sec(V1819L.LO)},mine:'AA',lg:{[yr]:[...C.league]},hist:{},y0:yr};
  for(const c of ['AAA','A']) for(const id of L.cls[c]){ const t=v1812pPoolMap(C).get(id); const B=V1819L.BASE[c][t.tier||'rest']+(v1819lR(C,'b',id)()-0.5)*2; if(t.sec0==null) t.sec0=t.sec;
    if(fresh){ t.R=Math.round((B+gauss(v1819lR(C,'r',id))*1.4)*100)/100; t.B=B; t.bFrom=0; } else { t.bh=(t.bh||[]).concat([[yr+1,B]]); } }
  v1819lTouch(C); return L; }
function v1819lClassOf(C,id){ const L=C.lad; if(!L) return null; for(const c of V1819L.CLS) if(L.cls[c].includes(id)) return c; return null; }
function v1819lSecOf(C,c){ const L=C.lad; if(c===L.mine) return 0; const others=V1819L.CLS.filter(x=>x!==L.mine); return c===others[0]?V1819L.UP:V1819L.LO; }
function v1819lRating(C,id,yr){ if(C.league.includes(id)&&C.schools[id]) return xiRating(C,id,'V'); try{ return v1812pVR(C,id,yr); }catch(e){ return 68; } }

/* ---------- tables ---------- */
function v1819lTable(C,c,yr,bound){ yr=yr||C.year; const L=C.lad;
  if(c===L.mine&&yr===C.year){ return standings(C,'V').map(r=>({id:r.sid,sid:r.sid,p:r.p,w:r.w,d:r.d,l:r.l,gf:r.gf,ga:r.ga,gd:r.gf-r.ga,pts:r.pts,form:r.form||[]})); }
  const H=L.hist[yr]; if(H&&H.tab&&H.tab[c]&&bound==null) return H.tab[c];
  const s=v1819lSecOf(C,c); if(!s) return []; if(bound==null) bound=v1812pBound(C,yr); return v1814Table(C,yr,s,bound); }
function v1819lZone(c,pos){ if(pos<=2&&c!=='AAA') return 'up'; if(pos===3&&c!=='AAA') return 'po'; if(pos===6&&c!=='A') return 'pd'; if(pos>=7&&c!=='A') return 'down'; return ''; }

/* ---------- the end of a season ---------- */
function v1819lSimGame(C,a,b,yr,tag){ const r=v1819lR(C,'po',yr,tag); const d=v1819lRating(C,a,yr)-v1819lRating(C,b,yr);
  const ma=v1812pClamp(V1812P.GM+V1812P.SLOPE*d,0.3,4.8), mb=v1812pClamp(V1812P.GM-V1812P.SLOPE*d,0.3,4.8); const ga=v1812pPoisson(r,ma), gb=v1812pPoisson(r,mb);
  let w=ga>gb?a:gb>ga?b:null, pk=null; if(!w){ const pa=0.5+v1812pClamp(d*0.02,-0.15,0.15); w=r()<pa?a:b; pk=w===a?[4,3]:[3,4]; } return {h:a,a:b,hg:ga,ag:gb,w,pk}; }
function v1819lClose(C){
  const L=v1819lS(C); if(!L) return; const yr=C.year; if(L.hist[yr]) return;
  const tab={}; for(const c of V1819L.CLS) tab[c]=v1819lTable(C,c,yr,c===L.mine?null:V1812P.WEEKS);
  const H=L.hist[yr]={yr,mine:L.mine,tab,moves:[],po:[],champ:{},done:false};
  for(const [hi,lo] of [['AAA','AA'],['AA','A']]){ const T=tab[hi], B=tab[lo];
    B.slice(0,2).forEach(r=>H.moves.push({id:r.id,from:lo,to:hi,why:'top2'})); T.slice(6,8).forEach(r=>H.moves.push({id:r.id,from:hi,to:lo,why:'bottom2'}));
    const up=B[2]&&B[2].id, dn=T[5]&&T[5].id; if(!up||!dn) continue;
    const po={hi,lo,up,dn,key:hi+'-'+lo,w:null,res:null}; H.po.push(po);
    if(up===C.userSid||dn===C.userSid) v1819lMakePo(C,po); else { po.res=v1819lSimGame(C,up,dn,yr,po.key); po.w=po.res.w; } }
  for(const c of V1819L.CLS){ if(c===L.mine){ const T=C.tourneys&&C.tourneys[yr]; H.champ[c]=T&&T.stChamp?{id:T.stChamp,state:true}:{id:tab[c][0]&&tab[c][0].id}; continue; }
    const f4=tab[c].slice(0,4).map(r=>r.id); if(f4.length<4) continue; const s1=v1819lSimGame(C,f4[0],f4[3],yr,c+'s1'), s2=v1819lSimGame(C,f4[1],f4[2],yr,c+'s2'); const fin=v1819lSimGame(C,s1.w,s2.w,yr,c+'f'); H.champ[c]={id:fin.w,fin,run:fin.w===s1.w?s2.w:s1.w}; }
  v1819lNews(C,H,false); }
function v1819lMakePo(C,po){ const u=C.userSid, opp=po.up===u?po.dn:po.up; const yr=C.year; let oid=opp;
  if(!C.league.includes(opp)||!C.schools[opp]){ const R=Math.min(POST_CAP,v1819lRating(C,opp,yr)); const s=genExt(C,R,'lad','Promotion playoff'); try{ if(v1812pPoolMap(C).get(opp)) v1814Dress(C,s,opp,R); }catch(e){} oid=s.id; }
  const hiTeam=po.dn===u?u:oid, loTeam=hiTeam===u?oid:u;
  const f=addFixture(C,{id:`${yr}-LPO-${po.key}`,comp:'rgn',rd:0,lvl:'V',h:hiTeam,a:loTeam,ven:`${V1819L.NAME[po.hi]} promotion playoff · neutral site`}); f.lpo=po.key; po.fid=f.id; po.ext=oid; po.opp=opp; }
function v1819lPlayPo(C){ const L=C.lad; const H=L&&L.hist[C.year]; if(!H) return null; const po=H.po.find(p=>p.fid&&!p.w); if(!po) return null; const f=C.fixtures[po.fid];
  if(f.st!=='d'){ const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); }
  const w=f.w; const u=C.userSid; const usWin=w===u; po.w=usWin?u:po.opp; po.res={h:f.h===u?u:po.opp,a:f.a===u?u:po.opp,hg:f.hg,ag:f.ag,w:po.w,pk:f.pk||null};
  const up=po.up===u; addNews(C,'program',usWin?(up?`${C.schools[u].town} win the promotion playoff and move up to ${V1819L.NAME[po.hi]}`:`${C.schools[u].town} survive the promotion playoff and stay in ${V1819L.NAME[po.hi]}`):(up?`${C.schools[u].town} lose the promotion playoff and stay in ${V1819L.NAME[po.lo]}`:`${C.schools[u].town} lose the promotion playoff and drop to ${V1819L.NAME[po.lo]}`),u,{fid:f.id});
  return po; }
function v1819lPending(C){ const L=C.lad; const H=L&&L.hist[C.year]; return H?H.po.find(p=>p.fid&&!p.w)||null:null; }
function v1819lNext(C){ const L=C.lad, H=L.hist[C.year]; const M={AAA:[...L.cls.AAA],AA:[...L.cls.AA],A:[...L.cls.A]};
  const mv=(id,from,to)=>{ M[from]=M[from].filter(x=>x!==id); M[to].push(id); };
  for(const m of H.moves) mv(m.id,m.from,m.to);
  for(const po of H.po){ if(po.w===po.up) { mv(po.up,po.lo,po.hi); mv(po.dn,po.hi,po.lo); H.moves.push({id:po.up,from:po.lo,to:po.hi,why:'playoff'},{id:po.dn,from:po.hi,to:po.lo,why:'playoff'}); } }
  H.done=true; return M; }
function v1819lNews(C,H,fin){ const n=id=>v1812pName(C,id); const u=C.userSid;
  for(const [hi,lo] of [['AAA','AA'],['AA','A']]){ const up=H.moves.filter(m=>m.to===hi&&m.why==='top2').map(m=>n(m.id)), dn=H.moves.filter(m=>m.from===hi&&m.why==='bottom2').map(m=>n(m.id));
    if(up.length) addNews(C,'program',`The Ladder: ${up.join(' and ')} move up to ${V1819L.NAME[hi]}; ${dn.join(' and ')} drop to ${V1819L.NAME[lo]}`,u); }
  for(const c of V1819L.CLS){ const ch=H.champ[c]; if(ch&&ch.id&&c!==H.mine) addNews(C,'champion',`${n(ch.id)} are ${C.year} ${V1819L.NAME[c]} champions`,u); } }

/* ---------- next season: the classes change ---------- */
function v1819lToPool(C,sid,c){ const P=v1812pS(C); const s=C.schools[sid]; let t=v1812pPoolMap(C).get(sid); const sec=v1819lSecOf(C,c); const yr=C.year;
  const R=Math.round(xiRating(C,sid,'V')*100)/100||66; const B=V1819L.BASE[c].rest+(v1819lR(C,'bb',sid,yr)()-0.5)*2;
  if(!t){ t={id:sid,town:s.town,name:s.name,mk:s.mk,mascot:s.mascot,c1:s.c1,c2:s.c2,sec,R,B,tier:'rest',pres:s.prestige,real:true,sec0:0,sh:[],bh:[]}; P.pool.teams.push(t); }
  if(t.sec0==null) t.sec0=t.sec; t.sh=(t.sh||[]).concat([[yr,sec]]); t.bh=(t.bh||[]).concat([[yr,B]]); t.sec=sec; t.rA=R; t.rY=yr; t.pres=s.prestige; t.c1=s.c1; t.c2=s.c2; t.mk=s.mk; t.mascot=s.mascot;
  const keep=id=>{ const p=C.players[id]; return (p.awards&&p.awards.length)||(p.honors&&p.honors.length)||(C.fam&&C.fam.links&&C.fam.links[id])||(C.hof||[]).some(h=>h.pid===id); };
  for(const p of schoolPlayers(C,sid)){ if(keep(p.id)) C.alumni[p.id]=compactAlum(p,yr+(12-p.grade),`Left with ${s.town} for ${V1819L.NAME[c]}`); delete C.players[p.id]; }
  s.lu={}; s.ladPool=c; }
function v1819lToLeague(C,id,c){ const P=v1812pS(C); const t=v1812pPoolMap(C).get(id); const r=v1819lR(C,'join',id,C.year); let s=C.schools[id];
  if(!s){ const tier=V1819L.TIER[c][r()<0.5?0:1]; s=genSchool(C,r,{strength:V1819L.STR[c],town:t.town,mk:t.mk,tier}); const old=s.id; delete C.schools[old];
    Object.assign(s,{id,name:t.name,mascot:t.mascot,c1:t.c1,c2:t.c2,prestige:t.pres||s.prestige}); C.schools[id]=s; if(C.coaches[s.coachId]) C.coaches[s.coachId].sid=id; if(s.stadium&&s.stadium.name) s.stadium.name=s.stadium.name.split(s.town).join(t.town); }
  s.strength=V1819L.STR[c]; delete s.ladPool; s.ext=null;
  for(const p of schoolPlayers(C,id)) delete C.players[p.id];
  for(const lvl of LVLS) genSquad(C,r,s,lvl,false);
  const co=C.coaches[s.coachId]; for(const lvl of LVLS) setLineup(C,id,lvl,autoLineup(C,id,lvl,co?co.form:'4-4-2'));
  if(t){ if(t.sec0==null) t.sec0=t.sec; t.sh=(t.sh||[]).concat([[C.year,0]]); t.sec=0; } }
function v1819lApply(C){
  const L=C.lad; const M=L.next; if(!M) return; delete L.next; const u=C.userSid; const prevMine=L.mine; const oldLg=[...C.league];
  const mine=V1819L.CLS.find(c=>M[c].includes(u)); L.cls=M; L.mine=mine;
  const lg=M[mine].slice(); for(const id of oldLg) if(!lg.includes(id)) v1819lToPool(C,id,V1819L.CLS.find(c=>M[c].includes(id)));
  for(const id of lg) if(!oldLg.includes(id)) v1819lToLeague(C,id,mine);
  for(const c of V1819L.CLS){ if(c===mine) continue; const sec=v1819lSecOf(C,c); for(const id of M[c]){ const t=v1812pPoolMap(C).get(id); if(!t||oldLg.includes(id)) continue; if(v1819lSecAt(t,C.year)!==sec){ if(t.sec0==null) t.sec0=t.sec; t.sh=(t.sh||[]).concat([[C.year,sec]]); t.sec=sec; const B=V1819L.BASE[c][t.tier||'rest']; t.bh=(t.bh||[]).concat([[C.year,B]]); } } }
  C.league=[u,...oldLg.filter(id=>id!==u&&lg.includes(id)),...lg.filter(id=>!oldLg.includes(id))];
  L.lg[C.year]=[...C.league];
  if(!C.league.includes(C.rivals.heated)){ const r=v1819lR(C,'riv',C.year); const cands=C.league.filter(id=>id!==u); C.rivals.heated=cands.slice().sort((a,b)=>(C.schools[b].prestige||0)-(C.schools[a].prestige||0))[0]||cands[0]; addNews(C,'rivalry',`A new rivalry: ${C.schools[u].town} and ${C.schools[C.rivals.heated].town}`,C.rivals.heated); }
  if(!C.league.includes(C.rivals.seasonal)||C.rivals.seasonal===C.rivals.heated) C.rivals.seasonal=C.league.find(id=>id!==u&&id!==C.rivals.heated);
  if(C.golden&&C.golden[C.year]&&!C.league.includes(C.golden[C.year])) delete C.golden[C.year];
  v1819lTouch(C);
  if(mine!==prevMine){ const upw=V1819L.CLS.indexOf(mine)<V1819L.CLS.indexOf(prevMine); L.flash={yr:C.year,from:prevMine,to:mine,up:upw}; addNews(C,'champion',upw?`${C.schools[u].town} begin life in ${V1819L.NAME[mine]}: bigger crowds, tougher opponents`:`${C.schools[u].town} drop to ${V1819L.NAME[mine]} for the ${C.year} season`,u); }
}

/* ---------- hooks ---------- */
{ const _nc=newCareer; newCareer=function(){ const C=_nc.apply(this,arguments); try{ if(v1819lOn(C)) v1819lInit(C); }catch(e){ console.warn('ladder init',e); } return C; }; }
{ const _mg=migrate; migrate=function(raw){ const C=_mg.apply(this,arguments); try{ if(C&&v1819lOn(C)&&!(C.lad&&C.lad.v===1)) v1819lInit(C); }catch(e){ console.warn('ladder migrate',e); } return C; }; }
{ const _adv=advance; advance=function(C){ const ph=C.phase; const ev=_adv.apply(this,arguments); try{ if(ph!=='offseason'&&C.phase==='offseason'&&v1819lS(C)) v1819lClose(C); }catch(e){ console.warn('ladder close',e); } return ev; }; }
{ const _ro=rollover; rollover=function(C){ let L=null; try{ L=v1819lS(C); if(L&&C.phase==='offseason'&&!C.rolled[C.year]){ if(!L.hist[C.year]) v1819lClose(C); if(v1819lPending(C)) v1819lPlayPo(C); L.next=v1819lNext(C); } }catch(e){ console.warn('ladder rollover',e); L=null; }
  V1819L.rolling=!!(L&&L.next); try{ return _ro.apply(this,arguments); } finally{ V1819L.rolling=false; if(C.lad) delete C.lad.next; } }; }
{ const _ss=seasonStart; seasonStart=function(C){ if(V1819L.rolling&&C.lad&&C.lad.next){ try{ v1819lApply(C); }catch(e){ console.warn('ladder apply',e); } V1819L.rolling=false; try{ balanceLeague(C,false); }catch(e){ console.warn('ladder balance',e); } }
  else if(C.lad&&!C.lad.lg[C.year]) C.lad.lg[C.year]=[...C.league];
  return _ss.apply(this,arguments); }; }
{ const _bl=balanceLeague; balanceLeague=function(C,start){ if(V1819L.rolling) return; const c=C.lad&&C.lad.mine||'AA'; const b=V1819L.BAND[c]; const keep={lo:BAL.lo,hi:BAL.hi,top:BAL.top}; BAL.lo=b.lo; BAL.hi=b.hi; BAL.top=b.top; try{ return _bl.apply(this,arguments); } finally{ BAL.lo=keep.lo; BAL.hi=keep.hi; BAL.top=keep.top; } }; }
/* the State field comes from outside the Ladder's class sections */
if(typeof v1814Champ==='function'){
v1814Field=function(C,yr){ const polls=v1812pPolls(C,yr); const last=polls.length?polls[polls.length-1]:null; const rk=v1812pRankMap(last);
  const skip=C.lad?[6,V1819L.UP,V1819L.LO]:[6]; const ch=V1812P.SECS.filter(s=>!skip.includes(s)).map(s=>v1814Champ(C,yr,s)).filter(Boolean);
  const pw=new Map(); try{ for(const r of v1812pTable(C,yr)) pw.set(r.id,r.power); }catch(e){}
  return ch.sort((a,b)=>(rk.get(a)||999)-(rk.get(b)||999)||(pw.get(b)||v1812pVR(C,b,yr))-(pw.get(a)||v1812pVR(C,a,yr))||(a<b?-1:1)).slice(0,7); };
}
/* standings for a past season use that season's league */
{ const _st=standings; standings=function(C,lvl,yr){ const L=C&&C.lad; if(L&&L.lg&&yr&&yr!==C.year){ let g=L.lg[yr]; if(!g){ const ys=Object.keys(L.lg).map(Number).sort((a,b)=>a-b); g=yr<ys[0]?L.lg[ys[0]]:null; }
  if(g&&g.join()!==C.league.join()){ const keep=C.league; C.league=g; try{ return _st.apply(this,arguments); } finally{ C.league=keep; } } } return _st.apply(this,arguments); }; }
{ const _fl=fixtureLabel; fixtureLabel=function(f){ if(f&&f.lpo){ const L=App.C&&App.C.lad; const k=String(f.lpo).split('-'); return `Promotion playoff · ${V1819L.NAME[k[0]]||''}`; } return _fl.apply(this,arguments); }; }
