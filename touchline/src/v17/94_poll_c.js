/* ===================== v18.12 THE STATE POLL, part c: team analytics, statewide players, seasons across a career ===================== */

/* ---------- power rating (a Massey-style rating on the starting-XI scale, shrunk toward each team's XI rating) ---------- */
function v1812pPower(C,yr,recs){
  const ids=v1812pAllIds(C); const lam=5, K=V1812P.SLOPE*2; let P=new Map(ids.map(i=>[i,v1812pRating(C,i,yr)])); const R0=new Map(P);
  for(let it=0;it<28;it++){ const N=new Map();
    for(const i of ids){ const rs=recs.get(i)||[]; let s=lam*R0.get(i); for(const r of rs) s+=v1812pClamp(r.gf-r.ga,-4,4)/K+P.get(r.opp); N.set(i,s/(lam+rs.length)); }
    P=N; }
  return P;
}
function v1812pEPts(d){ /* expected league points for a rating gap d (home or away is ignored) */
  const mu=d*V1812P.SLOPE*2; const cdf=x=>0.5*(1+Math.tanh(0.7978845608*(x+0.044715*x*x*x)));
  const pw=cdf((mu-0.5)/2.6), pl=cdf((-mu-0.5)/2.6), pd=Math.max(0,1-pw-pl); return 3*pw+pd;
}
/* all the schedule still to play, by team */
function v1812pRemaining(C,yr,bound){
  const rem=new Map(); for(const id of v1812pAllIds(C)) rem.set(id,[]);
  for(const f of Object.values(C.fixtures)) if(f.yr===yr&&f.comp==='reg'&&f.lvl==='V'&&f.rd>=bound&&rem.has(f.h)){ rem.get(f.h).push(f.a); rem.get(f.a).push(f.h); }
  for(const [id,arr] of v1812pVSeason(C,yr).rec) for(const r of arr) if(r.rd>=bound) rem.get(id).push(r.opp);
  return rem;
}
/* every school in the state, one row each, with the numbers behind the poll */
function v1812pTable(C,yr){
  yr=yr||C.year; const polls=v1812pPolls(C,yr); const bound=v1812pBound(C,yr); const ck='tb'+yr+'|'+bound+'|'+polls.length+'|'+v1812pDoneCount(C,yr)+'|'+v1812pS(C).pool.sig;
  const hit=v1812pMem.cmp.get(ck); if(hit) return hit;
  const recs=v1812pRecords(C,yr,bound); const Rof=id=>v1812pRating(C,id,yr); const power=v1812pPower(C,yr,recs); const rem=v1812pRemaining(C,yr,bound);
  const poll=polls.length?polls[Math.min(polls.length-1,Math.max(0,bound))]:null; const rk=v1812pRankMap(poll); const prevRk=v1812pRankMap(polls[bound-1]||null);
  const ids=v1812pAllIds(C); const rows=ids.map(id=>{ const A=v1812pAgg(recs.get(id)||[],Rof,o=>prevRk.get(o)||null); const sec=v1812pSec(C,id);
    let proj=A.pts; for(const o of rem.get(id)) proj+=v1812pEPts(power.get(id)-power.get(o));
    return {id,sec,A,R:Rof(id),power:power.get(id),poll:rk.get(id)||null,mv:poll&&poll.rows.find(x=>x.id===id)?poll.rows.find(x=>x.id===id).mv:null,projPts:proj,league:v1812pIsLeague(C,id)}; });
  const bySec={}; for(const r of rows) (bySec[r.sec]||(bySec[r.sec]=[])).push(r);
  for(const sec in bySec){ bySec[sec].sort((a,b)=>b.projPts-a.projPts||b.power-a.power||(a.id<b.id?-1:1)).forEach((r,i)=>{ r.seed=i+1; }); }
  rows.sort((a,b)=>b.power-a.power||(a.id<b.id?-1:1)).forEach((r,i)=>{ r.prank=i+1; });
  v1812pMem.cmp.set(ck,rows); if(v1812pMem.cmp.size>300) v1812pMem.cmp.delete(v1812pMem.cmp.keys().next().value); return rows;
}
function v1812pTeamRow(C,id,yr){ return v1812pTable(C,yr).find(r=>r.id===id)||null; }

/* ---------- statewide players: real league players + the seeded rosters of the other sections ---------- */
function v1812pVPlayer(C,vid,c,k){
  const key='vpl|'+v1812pS(C).pool.sig+'|'+vid+'|'+c+'|'+k; let p=v1812pMem.ros.get(key); if(p) return p;
  const r=v1812pRng(C,'vp',vid,c,k); const g0=k<4?10:k<7?11:12; const years=13-g0;
  const pos=[c%2===0?'GK':'DEF','DEF','MID','FWD','DEF',c%2?'GK':'MID','FWD','DEF','MID'][k];
  const [fn,ln]=genName(r); const team=v1812pPoolMap(C).get(vid); const base=v1812pVR(C,vid,c);
  const num=pos==='GK'?[1,1,12,13,18,21][Math.floor(r()*6)]:2+Math.floor(r()*29);
  p={id:`vp_${vid}_${c}_${k}`,fn,ln,num,sid:vid,pos,c,k,years,g0,ov0:base+gauss(r)*4.2+(pos==='GK'?-0.8:0),virtual:true,aw:[],honors:[]};
  v1812pMem.ros.set(key,p); return p;
}
function v1812pVOv(p,yr){ return p.ov0+1.6*(yr-p.c); }
function v1812pVRoster(C,vid,yr){
  const out=[]; for(let c=yr-2;c<=yr;c++) for(let k=0;k<9;k++){ const p=v1812pVPlayer(C,vid,c,k); if(yr<c+p.years) out.push(p); } return out;
}
function v1812pVGrade(p,yr){ return Math.min(12,p.g0+(yr-p.c)); }
function v1812pParseVP(id){ const m=/^vp_(vt\d+)_(\d+)_(\d)$/.exec(String(id)); return m?{vid:m[1],c:+m[2],k:+m[3]}:null; }
const V1812P_SLOTS={GK:1,DEF:4,MID:3,FWD:3};
function v1812pVStarters(C,vid,yr){
  const ros=v1812pVRoster(C,vid,yr).slice().sort((a,b)=>v1812pVOv(b,yr)-v1812pVOv(a,yr)||(a.id<b.id?-1:1)); const st=[]; const used=new Set();
  for(const g of ['GK','DEF','MID','FWD']){ let n=0; for(const p of ros){ if(p.pos===g&&n<V1812P_SLOTS[g]){ st.push(p); used.add(p.id); n++; } } }
  for(const p of ros){ if(st.length>=11) break; if(!used.has(p.id)&&p.pos!=='GK'){ st.push(p); used.add(p.id); } }
  return {starters:st,bench:ros.filter(p=>!used.has(p.id))};
}
/* per-game defensive actions by position, measured on the engine (v18.14) */
const V1812P_RATE={GK:{tk:0,int:0,cl:0},DEF:{tk:2.34,int:2.11,cl:1.85},MID:{tk:1.02,int:0.93,cl:0.75},FWD:{tk:0.14,int:0.11,cl:0.09}};
const V1812P_SCW={GK:0,DEF:0.09,MID:0.38,FWD:1};
const V1812P_ASW={GK:0.01,DEF:0.32,MID:1,FWD:0.6};
function v1812pBlank(){ return {gp:0,gs:0,g:0,a:0,sh:0,sot:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,ga:0,cs:0,rt:0,xg:0}; }
/* a statewide team's player stats for a season, game by game (so totals only grow as the season goes on) */
function v1812pVTeamSeason(C,vid,yr,bound){
  bound=bound==null?v1812pBound(C,yr):bound; const key='vts|'+v1812pS(C).pool.sig+'|'+vid+'|'+yr+'|'+bound; let hit=v1812pMem.vs.get(key); if(hit) return hit;
  const {starters,bench}=v1812pVStarters(C,vid,yr); const stats=new Map(); for(const p of [...starters,...bench]) stats.set(p.id,v1812pBlank());
  const recs=v1812pVSeason(C,yr).rec.get(vid).filter(x=>x.rd<bound);
  for(const rec of recs){
    const r=v1812pRng(C,'vsx',vid,yr,rec.rd); const res=rec.gf>rec.ga?'W':rec.gf<rec.ga?'L':'D';
    const usedB=new Set(); const on=starters.map(p=>{ if(p.pos==='GK'||r()>0.06) return p; const sub=bench.find(b=>b.pos===p.pos&&!usedB.has(b.id)); if(sub){ usedB.add(sub.id); return sub; } return p; });
    const present=[...new Set(on)];
    const w=(p,tab,pw)=>tab[p.pos]*Math.exp((v1812pVOv(p,yr)-70)/pw);
    const pickBy=(list,fn)=>{ let t=0; const ws=list.map(p=>{ const x=Math.max(0,fn(p)); t+=x; return x; }); if(t<=0) return list[Math.floor(r()*list.length)]; let x=r()*t; for(let i=0;i<list.length;i++){ x-=ws[i]; if(x<=0) return list[i]; } return list[list.length-1]; };
    const row=new Map(present.map(p=>[p.id,{g:0,a:0,sh:0,sot:0,tk:0,int:0,cl:0,y:0,r:0,sv:0,xs:0}]));
    for(let i=0;i<rec.gf;i++){ const s=pickBy(present,p=>w(p,V1812P_SCW,18)); row.get(s.id).g++; row.get(s.id).sh++; row.get(s.id).sot++; row.get(s.id).xs+=1.1;
      if(r()<0.74){ const others=present.filter(p=>p!==s); if(others.length){ const a=pickBy(others,p=>w(p,V1812P_ASW,25)); row.get(a.id).a++; } } }
    const rest=Math.max(0,(rec.sh==null?rec.gf+8:rec.sh)-rec.gf); const sotRest=rec.sot==null?Math.round(rest*0.4):Math.max(0,rec.sot-rec.gf); const pOn=rest?sotRest/rest:0;
    const shooters=present.filter(p=>p.pos!=='GK');
    for(let i=0;i<rest;i++){ const s=pickBy(shooters,p=>w(p,V1812P_SCW,22)+0.04); const q=row.get(s.id); q.sh++; q.xs+=1; if(r()<pOn) q.sot++; }
    const xgT=rec.xgf==null?rec.gf*0.95+0.2:rec.xgf; const xsT=[...row.values()].reduce((s,q)=>s+q.xs,0)||1;
    for(const p of present){ const q=row.get(p.id); const rt=V1812P_RATE[p.pos]; q.tk=v1812pPoisson(r,rt.tk*(0.8+0.4*r())); q.int=v1812pPoisson(r,rt.int*(0.8+0.4*r())); q.cl=v1812pPoisson(r,rt.cl*(0.7+0.6*r()));
      if(p.pos!=='GK'){ if(r()<0.045) q.y=1; if(r()<0.003) q.r=1; } }
    const gk=present.find(p=>p.pos==='GK'); const conc=rec.ga; if(gk){ const sota=rec.sota==null?Math.round(conc+3):rec.sota; row.get(gk.id).sv=Math.max(0,sota-conc); }
    for(const p of present){ const q=row.get(p.id), S=stats.get(p.id); const grp=p.pos;
      let rt=6.1+q.g*1.0+q.a*0.6+q.sot*0.12+(q.tk+q.int)*0.08+q.cl*0.04-q.y*0.4-q.r*1.6;
      if(grp==='GK') rt+=q.sv*0.28-conc*0.35+(conc===0?0.6:0); if(grp==='DEF') rt+=(conc===0?0.5:-0.12*conc);
      rt+=res==='W'?0.35:res==='D'?0.05:-0.25; rt+=(r()-0.5)*0.6; rt=6.66+(rt-6.66)*0.68; /* v18.14: the engine's spread */ rt=v1812pClamp(Math.round(rt*10)/10,3.5,10);
      S.gp++; S.gs++; for(const k of ['g','a','sh','sot','sv','tk','int','cl','y','r']) S[k]+=q[k]; S.rt+=rt; S.xg+=xgT*(q.sh+0.6*q.g)/(xsT+0.6*rec.gf)*0.9;
      if(grp==='GK'){ S.ga+=conc; if(conc===0) S.cs++; } }
  }
  for(const S of stats.values()){ S.rt=Math.round(S.rt*10)/10; S.xg=Math.round(S.xg*100)/100; }
  const out={stats,starters,bench}; v1812pMem.vs.set(key,out); if(v1812pMem.vs.size>400) v1812pMem.vs.delete(v1812pMem.vs.keys().next().value); return out;
}
/* a virtual player as a record shaped like the engine's: p.st[year].V.reg */
function v1812pVPlayerRec(C,id){
  const q=v1812pParseVP(id); if(!q) return null; const P=v1812pS(C); const p=v1812pVPlayer(C,q.vid,q.c,q.k); if(!p) return null;
  const st={}, xg={}; const y1=Math.min(C.year,p.c+p.years-1);
  for(let y=Math.max(p.c,P.y0);y<=y1;y++){ if(v1812pBound(C,y)===0) continue; const S=v1812pVTeamSeason(C,q.vid,y).stats.get(p.id); if(!S||!S.gp) continue;
    const b={...S}; delete b.xg; st[y]={V:{reg:b,pre:null,post:null,sid:q.vid}}; xg[y]=S.xg; }
  const last=Math.min(C.year,p.c+p.years-1);
  return {...p,st,vxg:xg,grade:v1812pVGrade(p,last),awards:[],honors:[],gradYr:p.c+p.years-1,ovr:Math.round(v1812pVOv(p,last)*10)/10};
}
function v1812pPlayerRec(C,id){
  if(String(id).indexOf('vp_')===0) return v1812pVPlayerRec(C,id);
  const p=findPerson(C,id); return p||null;
}
function v1812pIsVirtual(p){ return !!(p&&p.virtual); }
function v1812pPlayerName(p){ return p.fn+' '+p.ln; }
function v1812pPlayerXg(C,p,yr){
  if(p.virtual) return p.vxg&&p.vxg[yr]!=null?p.vxg[yr]:null;
  const o=v1812pS(C).px[p.id]; if(!o||!o[yr]) return null; return Math.round((o[yr].r+o[yr].o)*100)/100;
}
function v1812pSum(b){ const t={gp:0,g:0,a:0,sh:0,sot:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,ga:0,cs:0,rt:0}; for(const bk of ['reg','post']){ const x=b&&b[bk]; if(!x) continue; for(const k in t) t[k]+=x[k]||0; } return t; }
/* season rows: one per year and squad, Varsity first. Totals for Varsity equal careerTotals(p) */
function v1812pSeasonRows(C,p){
  const rows=[]; const keys=Object.keys(p.st||{}).map(Number).sort((a,b)=>a-b);
  for(const yr of keys) for(const lvl of ['V','JV','MOD']){ const b=p.st[yr][lvl]; if(!b) continue; const t=v1812pSum(b); if(!t.gp) continue;
    const xg=lvl==='V'?v1812pPlayerXg(C,p,yr):null; const sid=b.sid||p.sid;
    const awards=(p.awards||[]).filter(a=>a.yr===yr).map(a=>AWARD_NAME[a.k]||a.k); const honors=(p.honors||[]).filter(h=>h.yr===yr).map(h=>h.label);
    rows.push({yr,lvl,sid,t,xg,g90:t.g/(t.gp*V1812P.MIN)*90,a90:t.a/(t.gp*V1812P.MIN)*90,ga:t.g+t.a,rt:t.gp?t.rt/t.gp:null,awards,honors}); }
  return rows;
}
function v1812pCareer(rows,lvl){ const t={gp:0,g:0,a:0,sh:0,sot:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,ga:0,cs:0,rt:0}; let xg=0, hasXg=false, n=0; for(const r of rows){ if(lvl&&r.lvl!==lvl) continue; n++; for(const k in t) t[k]+=r.t[k]; if(r.xg!=null){ xg+=r.xg; hasXg=true; } }
  return {t,xg:hasXg?xg:null,seasons:n,g90:t.gp?t.g/(t.gp*V1812P.MIN)*90:0,a90:t.gp?t.a/(t.gp*V1812P.MIN)*90:0,rt:t.gp?t.rt/t.gp:null}; }

/* ---------- state leaderboards for a season (regular season, Varsity) ---------- */
function v1812pLeaderPool(C,yr,scope){
  const ck='lp'+yr+'|'+scope+'|'+v1812pBound(C,yr)+'|'+v1812pDoneCount(C,yr)+'|'+v1812pS(C).pool.sig+'|'+Object.keys(C.players).length+'|'+Object.keys(C.alumni).length; const hit=v1812pMem.cmp.get(ck); if(hit) return hit;
  const out=[];
  for(const p of everyone(C)){ const y=p.st&&p.st[yr]&&p.st[yr].V; if(!y||!y.reg||!y.reg.gp) continue; const sid=y.sid||p.sid; if(!C.league.includes(sid)) continue; out.push({id:p.id,virtual:false,name:pname(p),sid,pos:p.pos,s:y.reg,xg:v1812pPlayerXg(C,p,yr)}); }
  if(scope!=='league'){ const bound=v1812pBound(C,yr); if(bound>0) for(const t of v1812pS(C).pool.teams){ const T=v1812pVTeamSeason(C,t.id,yr,bound); for(const p of T.starters.concat(T.bench)){ const S=T.stats.get(p.id); if(!S||!S.gp) continue; out.push({id:p.id,virtual:true,name:v1812pPlayerName(p),sid:t.id,pos:p.pos,s:S,xg:S.xg}); } } }
  v1812pMem.cmp.set(ck,out); if(v1812pMem.cmp.size>300) v1812pMem.cmp.delete(v1812pMem.cmp.keys().next().value); return out;
}
const V1812P_BOARDS=[
 ['g','Top scorers','Goals',x=>x.s.g,x=>`${x.s.gp} GP · ${x.s.a} A`,1],
 ['a','Assist leaders','Assists',x=>x.s.a,x=>`${x.s.gp} GP · ${x.s.g} G`,1],
 ['ga','Goal involvements','G+A',x=>x.s.g+x.s.a,x=>`${x.s.g} G · ${x.s.a} A`,1],
 ['gk','Keepers','Saves',x=>x.pos==='GK'?x.s.sv:0,x=>`${x.s.cs} CS · ${x.s.gp} GP · ${x.s.sv+x.s.ga?Math.round(x.s.sv/(x.s.sv+x.s.ga)*100):0}% saved`,1],
 ['cs','Clean sheets','Clean sheets',x=>x.pos==='GK'?x.s.cs:0,x=>`${x.s.sv} saves · ${x.s.gp} GP`,1],
 ['rt','Rating leaders','Avg rating',x=>x.s.gp>=5?x.s.rt/x.s.gp:0,x=>`${x.s.gp} GP · ${x.s.g} G · ${x.s.a} A`,0]
];
function v1812pBoard(C,yr,key,scope,n){
  const def=V1812P_BOARDS.find(b=>b[0]===key)||V1812P_BOARDS[0]; const pool=v1812pLeaderPool(C,yr,scope||'state');
  return pool.map(x=>({x,v:def[3](x)})).filter(o=>o.v>0).sort((a,b)=>b.v-a.v||(a.x.s.gp-b.x.s.gp)||(a.x.id<b.x.id?-1:1)).slice(0,n||25).map((o,i)=>({...o.x,rk:i+1,v:o.v,sub:def[4](o.x)}));
}
/* pseudo-honors for the statewide leaders of a past or current season (shown in the player's career view) */
function v1812pStateHonors(C,id,yr){
  const out=[]; for(const [key,label] of [['g','Top scorer in the state'],['a','Assist leader in the state'],['gk','Keeper with the most saves'],['rt','Highest rated in the state']]){ const b=v1812pBoard(C,yr,key,'state',1); if(b[0]&&b[0].id===id) out.push(label); }
  return out;
}
