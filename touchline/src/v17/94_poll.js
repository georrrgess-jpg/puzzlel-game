/* ===================== v18.12 THE STATE POLL (core: pool, polls, analytics, players) =====================
   A weekly statewide top 25 voted by seven named voters, a Game of the Week when two ranked teams meet, advanced team
   metrics for every school in the state and season-by-season player stats for any player.
   Presentation only: nothing here touches the match engine, its RNG streams or any result. Everything is a pure function of
   the career seed, the played results and (for the other sections of the state) a deterministic simulated season.
   State lives on C.poll (saved with the career); it is created on first use, so old saves migrate by opening them.
   Layout: pool of 56 statewide schools in seven sections of eight (plus the user's eight-school section = 64 teams);
   the league plays the real engine games, the other sections play a seeded model calibrated on the engine (3.7 goals a game,
   0.38 goals of margin per point of starting-XI rating); polls are built week by week from records, with inertia.
   UI is in 94_poll_ui.js. All identifiers are prefixed v1812p / V1812P. */
const V1812P={ TOP:25, WEEKS:14, SECS:[1,2,3,4,6,7,8], PER:8, GM:1.865, SLOPE:0.19, MIN:80 };
const v1812pMem={ vy:new Map(), vr:new Map(), ros:new Map(), vs:new Map(), cmp:new Map() };
const v1812pClamp=(v,a,b)=>v<a?a:v>b?b:v;
const v1812pAvg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const v1812pHash=(...a)=>hashStr(a.join('|'));
function v1812pRng(C,...k){ return rngFrom(v1812pHash(C.seed,'v1812p',...k)); }
function v1812pOrd(n){ return n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10<4?n%10:0]||'th'); }
function v1812pPoisson(r,m){ const L=Math.exp(-m); let k=0,p=1; do{ k++; p*=r(); }while(p>L&&k<14); return k-1; }

/* ---------- state ---------- */
function v1812pS(C){
  let P=C.poll;
  if(!P||P.v!==1){ P=C.poll={v:1,y0:C.year,pool:null,r0:{},fx:{},px:{},polls:{},news:{},seen:{},done:{}}; }
  for(const k of ['r0','fx','px','polls','news','seen','done']) if(!P[k]) P[k]={};
  if(!P.pool) P.pool=v1812pMakePool(C);
  return P;
}
function v1812pMakePool(C){
  const r=v1812pRng(C,'pool'); const used=new Set(Object.values(C.schools).map(s=>s.town)); const teams=[]; let n=0;
  for(const sec of V1812P.SECS){ for(let i=0;i<V1812P.PER;i++){
    const id='vt'+(++n); const idt=genIdentity(r,used); const mk=MASCOT_KEYS[Math.floor(r()*MASCOT_KEYS.length)]; const mascot=pick(r,MASCOT_BY[mk].alt); const cp=pick(r,COLOR_PAIRS);
    const R=v1812pClamp(70.2+gauss(r)*4.3,58,83);
    teams.push({id,town:idt.town,name:idt.name,mk,mascot,c1:cp[0],c2:cp[1],sec,R:Math.round(R*100)/100,pres:Math.round(v1812pClamp(30+(R-58)*2.4+gauss(r)*8,5,98))}); } }
  return {teams,sig:v1812pHash(teams.map(t=>t.id+t.town+t.R).join(','))};
}
function v1812pPoolMap(C){ const P=v1812pS(C); const k=P.pool.sig; let m=v1812pMem.cmp.get('pool'+k); if(!m){ m=new Map(P.pool.teams.map(t=>[t.id,t])); v1812pMem.cmp.set('pool'+k,m); } return m; }
/* a school-like object for crest(), logo() and friends, for league and statewide schools alike */
function v1812pSchool(C,id){ const s=C.schools[id]; if(s) return s; const t=v1812pPoolMap(C).get(id); if(!t) return null; return {id:t.id,town:t.town,name:t.name,mk:t.mk,mascot:t.mascot,c1:t.c1,c2:t.c2,virtual:true,section:'Section '+t.sec,prestige:t.pres}; }
function v1812pIsLeague(C,id){ return C.league.includes(id); }
function v1812pAllIds(C){ return [...C.league,...v1812pS(C).pool.teams.map(t=>t.id)]; }
function v1812pSec(C,id){ if(v1812pIsLeague(C,id)) return C.section; const t=v1812pPoolMap(C).get(id); return t?t.sec:0; }
function v1812pName(C,id){ const s=v1812pSchool(C,id); return s?s.town:'?'; }

/* ---------- team strength: league = starting-XI rating snapshotted at the start of each season; others = a drifting seeded rating ---------- */
function v1812pSnap(C){
  const P=v1812pS(C); const yr=C.year; if(P.r0[yr]) return P.r0[yr];
  const o={}; for(const sid of C.league){ try{ o[sid]=Math.round(xiRating(C,sid,'V')*100)/100; }catch(e){ o[sid]=70; } }
  P.r0[yr]=o; return o;
}
function v1812pVR(C,vid,yr){
  const P=v1812pS(C); const k=P.pool.sig+'|'+vid+'|'+yr; let v=v1812pMem.vr.get(k); if(v!=null) return v;
  const t=v1812pPoolMap(C).get(vid); let R=t.R;
  for(let y=P.y0+1;y<=yr;y++){ const r=v1812pRng(C,'vr',vid,y); R=0.72*R+0.28*70.2+gauss(r)*2; }
  v=Math.round(v1812pClamp(R,56,85)*100)/100; v1812pMem.vr.set(k,v); return v;
}
function v1812pRating(C,id,yr){
  if(v1812pIsLeague(C,id)){ const P=v1812pS(C); const o=P.r0[yr]; if(o&&o[id]!=null) return o[id]; if(yr===C.year) return v1812pSnap(C)[id]; const e=Object.keys(P.r0).sort()[0]; return e&&P.r0[e][id]!=null?P.r0[e][id]:70; }
  return v1812pVR(C,id,yr);
}
function v1812pPrestige(C,id){ const s=C.schools[id]; if(s) return s.prestige; const t=v1812pPoolMap(C).get(id); return t?t.pres:40; }

/* ---------- the other sections: a seeded season, calibrated on the engine ---------- */
function v1812pGame(C,yr,rd,h,a){
  const r=v1812pRng(C,'vg',yr,rd,h,a); const Rh=v1812pVR(C,h,yr), Ra=v1812pVR(C,a,yr); const d=Rh-Ra+0.25;
  const nz=()=>Math.exp(gauss(r)*0.2);
  const mh=v1812pClamp(V1812P.GM+V1812P.SLOPE*d,0.3,4.8)*nz(), ma=v1812pClamp(V1812P.GM-V1812P.SLOPE*d,0.3,4.8)*nz();
  const hg=v1812pPoisson(r,mh), ag=v1812pPoisson(r,ma);
  const tot=Math.round(25*Math.exp(gauss(r)*0.18)); const share=v1812pClamp(0.506+0.032*d+gauss(r)*0.055,0.2,0.8);
  const shh=Math.max(hg,Math.round(tot*share)), sha=Math.max(ag,tot-Math.round(tot*share));
  const soth=v1812pClamp(Math.round(shh*0.49+gauss(r)*1.2),hg,shh), sota=v1812pClamp(Math.round(sha*0.49+gauss(r)*1.2),ag,sha);
  const xgh=Math.max(0.12,0.55*mh+0.3*hg+0.15*shh*0.125+gauss(r)*0.2), xga=Math.max(0.12,0.55*ma+0.3*ag+0.15*sha*0.125+gauss(r)*0.2);
  const ph=v1812pClamp(50.3+1.46*d+gauss(r)*3.5,25,75);
  return {rd,h,a,hg,ag,sh:[shh,sha],sot:[soth,sota],xg:[Math.round(xgh*100)/100,Math.round(xga*100)/100],pos:[Math.round(ph*10)/10,Math.round((100-ph)*10)/10]};
}
function v1812pVSeason(C,yr){
  const P=v1812pS(C); const k=P.pool.sig+'|'+yr; let v=v1812pMem.vy.get(k); if(v) return v;
  const bySec={}; for(const t of P.pool.teams) (bySec[t.sec]||(bySec[t.sec]=[])).push(t.id);
  const games=[]; for(const sec of V1812P.SECS){ const rounds=roundRobin(bySec[sec]); rounds.forEach((pairs,rd)=>{ for(const [h,a] of pairs) games.push(v1812pGame(C,yr,rd,h,a)); }); }
  const rec=new Map(); for(const t of P.pool.teams) rec.set(t.id,[]);
  for(const g of games){ rec.get(g.h).push(v1812pRec(g,0)); rec.get(g.a).push(v1812pRec(g,1)); }
  for(const arr of rec.values()) arr.sort((x,y)=>x.rd-y.rd);
  v=v1812pMem.vy.set(k,{games,rec}).get(k); if(v1812pMem.vy.size>12) v1812pMem.vy.delete(v1812pMem.vy.keys().next().value); return v;
}
/* one team's view of a game: side 0 = home */
function v1812pRec(g,i){ const j=1-i; const opp=i?g.h:g.a; const gf=i?g.ag:g.hg, ga=i?g.hg:g.ag;
  return {rd:g.rd,opp,home:i===0,gf,ga,xgf:g.xg[i],xga:g.xg[j],sh:g.sh[i],sha:g.sh[j],sot:g.sot[i],sota:g.sot[j],pos:g.pos[i],fid:g.fid||null}; }

/* ---------- league games: team lines kept per fixture (so analytics never depend on the lazily loaded match logs) ---------- */
function v1812pIngest(C,f){
  const P=v1812pS(C); if(!f||f.st!=='d'||f.lvl!=='V'||P.done[f.id]) return false;
  const lg=C.logs&&C.logs[f.id]; if(!lg||!lg.st||!lg.st[0]) return false;
  const s=lg.st; const pt=(s[0].pos+s[1].pos)||1;
  P.fx[f.id]={xg:[Math.round(s[0].xg*100)/100,Math.round(s[1].xg*100)/100],sh:[s[0].sh,s[1].sh],sot:[s[0].sot,s[1].sot],pos:[Math.round(s[0].pos/pt*1000)/10,Math.round(s[1].pos/pt*1000)/10]};
  if(lg.shots){ const key=f.comp==='pre'?'p':f.comp==='reg'?'r':'o'; for(const sh of lg.shots){ if(!sh.pid||!sh.xg) continue; const o=P.px[sh.pid]||(P.px[sh.pid]={}); const y=o[f.yr]||(o[f.yr]={p:0,r:0,o:0}); y[key]=Math.round((y[key]+sh.xg)*1000)/1000; } }
  P.done[f.id]=1; return true;
}
function v1812pBackfill(C){
  const P=v1812pS(C); let n=0;
  for(const f of Object.values(C.fixtures)){ if(f.st==='d'&&f.lvl==='V'&&!P.done[f.id]&&C.logs&&C.logs[f.id]) if(v1812pIngest(C,f)) n++; }
  return n;
}
function v1812pLeagueRecs(C,yr,bound){
  const P=v1812pS(C); const rec=new Map(); for(const sid of C.league) rec.set(sid,[]);
  for(const f of Object.values(C.fixtures)){ if(f.yr!==yr||f.comp!=='reg'||f.lvl!=='V'||f.st!=='d'||f.rd>=bound) continue; if(!rec.has(f.h)||!rec.has(f.a)) continue;
    const x=P.fx[f.id]; const lg=!x&&C.logs&&C.logs[f.id]; let z=x;
    if(!z&&lg&&lg.st&&lg.st[0]){ const s=lg.st, pt=(s[0].pos+s[1].pos)||1; z={xg:[s[0].xg,s[1].xg],sh:[s[0].sh,s[1].sh],sot:[s[0].sot,s[1].sot],pos:[s[0].pos/pt*100,s[1].pos/pt*100]}; }
    const g={rd:f.rd,h:f.h,a:f.a,hg:f.hg,ag:f.ag,fid:f.id,sh:z?z.sh:[null,null],sot:z?z.sot:[null,null],xg:z?z.xg:[null,null],pos:z?z.pos:[null,null]};
    rec.get(f.h).push(v1812pRec(g,0)); rec.get(f.a).push(v1812pRec(g,1)); }
  for(const arr of rec.values()) arr.sort((x,y)=>x.rd-y.rd);
  return rec;
}
/* how many rounds of the regular season are complete in a year */
function v1812pBound(C,yr){ if(yr<C.year) return V1812P.WEEKS; if(yr>C.year) return 0; if(C.phase==='preseason') return 0; if(C.phase==='regular') return C.md; return V1812P.WEEKS; }
/* records for every team, rounds before `bound` only, plus optional hypothetical games [{rd,h,a,hg,ag}] */
function v1812pRecords(C,yr,bound,extra){
  const lg=v1812pLeagueRecs(C,yr,bound); const vs=v1812pVSeason(C,yr); const out=new Map(lg);
  for(const [id,arr] of vs.rec) out.set(id,arr.filter(x=>x.rd<bound));
  if(extra) for(const g of extra){ const base={rd:g.rd,h:g.h,a:g.a,hg:g.hg,ag:g.ag,sh:[null,null],sot:[null,null],xg:[null,null],pos:[null,null]}; const a=out.get(g.h), b=out.get(g.a); if(a&&b){ out.set(g.h,[...a,v1812pRec(base,0)]); out.set(g.a,[...b,v1812pRec(base,1)]); } }
  return out;
}

/* ---------- aggregates ---------- */
function v1812pAgg(recs,Rof,rankOf){
  const a={gp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,cs:0,xgf:0,xga:0,nx:0,sh:0,sha:0,sot:0,sota:0,posS:0,np:0,sosS:0,form:[],qw:0,best:null,worst:null,gdRun:[],last3:0,last3gd:0,streak:0,unb:0,games:[]};
  const rs=recs.slice().sort((x,y)=>x.rd-y.rd);
  for(const r0 of rs){ const res=r0.gf>r0.ga?'W':r0.gf<r0.ga?'L':'D'; const Ro=Rof(r0.opp); const orank=rankOf?rankOf(r0.opp):null; const r={...r0,res,orank,Ro};
    a.games.push(r); a.gp++; a.gf+=r.gf; a.ga+=r.ga; a.form.push(res); if(res==='W'){a.w++;a.pts+=3;} else if(res==='D'){a.d++;a.pts++;} else a.l++;
    if(r.ga===0) a.cs++; if(r.xgf!=null){ a.xgf+=r.xgf; a.xga+=r.xga; a.nx++; a.sh+=r.sh; a.sha+=r.sha; a.sot+=r.sot; a.sota+=r.sota; a.posS+=r.pos; a.np++; }
    a.sosS+=Ro; a.gdRun.push((a.gdRun.length?a.gdRun[a.gdRun.length-1]:0)+r.gf-r.ga);
    if(res==='W'){ if(orank) a.qw++; const ob=a.best?(a.best.orank||100):101, on=orank||100; if(!a.best||on<ob||(on===ob&&Ro>a.best.Ro)) a.best=r; }
    if(res==='L'){ if(!a.worst||Ro<a.worst.Ro) a.worst=r; } }
  let s=0; for(let i=a.games.length-1;i>=0&&a.games[i].res==='W';i--) s++; a.streak=s; let u=0; for(let i=a.games.length-1;i>=0&&a.games[i].res!=='L';i--) u++; a.unb=u;
  const l3=a.games.slice(-3); a.last3=l3.length?l3.reduce((x,r)=>x+(r.res==='W'?3:r.res==='D'?1:0),0)/l3.length:0; a.last3gd=l3.length?l3.reduce((x,r)=>x+r.gf-r.ga,0)/l3.length:0;
  const g=a.gp||1; a.ppg=a.pts/g; a.gd=a.gf-a.ga; a.gdpg=a.gd/g; a.gfpg=a.gf/g; a.gapg=a.ga/g; a.winPct=a.w/g; a.csPct=a.cs/g;
  a.xgd=a.nx?(a.xgf-a.xga):null; a.xgdpg=a.nx?a.xgd/a.nx:null; a.shShare=(a.sh+a.sha)?a.sh/(a.sh+a.sha):null; a.pos=a.np?a.posS/a.np:null; a.sos=a.gp?a.sosS/a.gp:null;
  return a;
}
