/* v18.12 Gameday Graphics (96_gameday.js, styles in 96_gameday.css).
   The program makes its own social posters, the kind every high school team posts: GAME DAY before each Varsity game,
   FINAL after each result, MILESTONE (career goals, wins, clean sheets, assists, hat trick, first goal), PLAYER OF THE WEEK,
   SENIOR NIGHT and HALL OF FAME. Players are posed in 3-D.
   - State: C.gd = {v, on (auto-make toggle), st (style), feed:[entry], pins:[{id,st,ps,fmt,e}], lk:{pid:look}, dn:[ids], pw:{}}.
     An entry holds parameters only ({id,k,yr,wk,fid,pid,m:{...},nw}); posters are drawn again on demand, never stored.
   - Engine: the poster is painted on a canvas at 1080x1350 (portrait) or 1080x1080 in three styles (varsity, chrome, news).
     The player is drawn by the game's own 3-D figure pipeline (63_p3d_figures.js) in ONE hidden WebGL renderer with its own
     camera and a transparent background (disposed after 8 s idle; never a context per poster), with the 2-D drawFigure
     pipeline as the fallback, so a poster is always produced. Presentation only: no engine or match code is touched.
   - Hooks: finishMatch (Final, milestones), advance/render (Gameday, Senior Night, Player of the Week), rollover (Hall of Fame),
     migrate (defaults for old saves). Other units can add tags to Gameday posters with V1812G.tagHooks.push((C,f)=>['TAG']). */
const V1812G={tpl:[['gameday','Gameday','Before every Varsity game'],['final','Final score','After every result'],['milestone','Milestones','Career goals, wins, clean sheets'],
    ['potw','Player of the week','From the Courier'],['senior','Senior Night','Framed jersey, the seniors'],['hof','Hall of Fame','Induction day']],
  styles:[['varsity','Varsity block'],['chrome','Chrome'],['news','Newsprint']], cap:60, pinMax:3, W:1080, H:{portrait:1350,square:1080},
  P:null, busy:0, fail:false, in2d:false, force2d:false, builds:0, timer:0, last:0, cuts:new Map(), imgs:new Map(), fontsP:null, tagHooks:[], tq:null, tqn:0, tqm:'',
  ui:{sel:null,tpl:'gameday',pose:0,fmt:'portrait',run:0,thumbs:new Map(),pv:null,mirror:0}, ms:{goals:[10,25,50,100],wins:[10,25,50,100],cs:[10,25,50],ast:[25,50]}};

/* ---------- state ---------- */
function v1812gBox(C){ let B=C&&C.gd; if(!B||typeof B!=='object'){ B={v:1,on:true,st:'varsity',feed:[],pins:[],lk:{},dn:[],pw:{},seq:0}; if(C) C.gd=B; }
  if(!Array.isArray(B.feed)) B.feed=[]; if(!Array.isArray(B.pins)) B.pins=[]; if(!Array.isArray(B.dn)) B.dn=[]; if(!B.lk||typeof B.lk!=='object') B.lk={}; if(!B.pw||typeof B.pw!=='object') B.pw={};
  if(B.on==null) B.on=true; if(!V1812G.styles.some(s=>s[0]===B.st)) B.st='varsity'; if(!(B.seq>0)) B.seq=B.feed.reduce((m,e)=>Math.max(m,e.t||0),0); return B; }
function v1812gU(C){ return C.schools[C.userSid]; }
function v1812gPerson(C,pid){ return findPerson(C,pid); }
function v1812gLook(C,p){ const B=v1812gBox(C); if(!p) return defaultLook('x',12); if(p.look) return p.look; if(B.lk[p.id]) return B.lk[p.id]; return lookOf(p); }
function v1812gShort(p){ return p?String(p.ln||'').trim():'' }
function v1812gHas(B,id){ return B.dn.includes(id)||B.feed.some(e=>e.id===id); }

/* ---------- labels, tags, schedule text ---------- */
function v1812gRoundName(f){ if(!f) return ''; if(f.comp==='reg') return `Week ${f.rd+1}`; if(f.comp==='pre') return `Preseason Cup, Game ${f.rd+1}`; return fixtureLabel(f).replace(/^Sectional /,'Sectional ').replace(/^State /,'State '); }
function v1812gWkShort(f){ if(!f) return ''; if(f.comp==='reg') return 'Wk '+(f.rd+1); if(f.comp==='pre') return 'Pre '+(f.rd+1); if(f.comp==='sec') return ['Sec QF','Sec SF','Sec Final'][f.rd]||'Sectional'; if(f.comp==='rgn') return 'Regional'; return ['St QF','St SF','St Final'][f.rd]||'State'; }
/* the day and kickoff time: the game has no calendar, so Friday-night games (the weather record says night) are Fri 7:00, the rest Sat 1:00 */
function v1812gWhen(f){ let night=true; try{ night=!!weatherFor(f).night; }catch(e){} if(f&&f.comp!=='reg'&&f.comp!=='pre') return night?['SAT','6:00 PM']:['SAT','1:00 PM']; return night?['FRI','7:00 PM']:['SAT','1:00 PM']; }
function v1812gTags(C,f){ const out=[]; const u=C.userSid; let riv=null; try{ riv=isRivalry(C,f.h,f.a); }catch(e){}
  if(riv==='heated'&&f.comp!=='pre') out.push('RIVALRY NIGHT'); else if(riv==='seasonal'&&f.comp!=='pre') out.push('SEASON RIVAL');
  try{ if(isSeniorNight(C,f)) out.push('SENIOR NIGHT'); }catch(e){}
  if(f.comp==='sec') out.push(['SECTIONAL QUARTERFINAL','SECTIONAL SEMIFINAL','SECTIONAL FINAL'][f.rd]||'SECTIONALS'); else if(f.comp==='rgn') out.push('REGIONAL FINAL'); else if(f.comp==='st') out.push(['STATE QUARTERFINAL','STATE SEMIFINAL','STATE FINAL'][f.rd]||'STATE TOURNAMENT'); else if(f.comp==='pre') out.push('PRESEASON CUP');
  else if(f.comp==='reg'&&f.rd===0) out.push(f.h===u?'HOME OPENER':'SEASON OPENER');
  for(const h of V1812G.tagHooks){ try{ const r=h(C,f); if(r) for(const t of [].concat(r)) if(t&&!out.includes(String(t).toUpperCase())) out.push(String(t).toUpperCase()); }catch(e){} }
  return out.slice(0,3); }
/* the opponent's ranking, when another unit offers one (never required) */
function v1812gRankTag(C,f){ try{ const opp=f.h===C.userSid?f.a:f.h; const fn=(typeof V1812P!=='undefined'&&V1812P&&V1812P.rankOf)||(typeof v1812pRank==='function'&&v1812pRank); if(fn){ const r=fn(opp,C); if(r&&r<=10) return 'RANKED #'+r; } }catch(e){} return null; }

/* ---------- the models: everything a poster shows, built from the career (the entry holds only parameters) ---------- */
function v1812gFxSide(C,f){ return f.h===C.userSid?0:1; }
function v1812gScoreLine(C,f){ const i=v1812gFxSide(C,f); const us=i===0?f.hg:f.ag, th=i===0?f.ag:f.hg; const res=f.w===C.userSid?'W':f.w?'L':'D'; return {us,th,res,pk:f.pk?[f.pk[i],f.pk[1-i]]:null}; }
/* goals and the player of the match, from the finished match log: small enough to keep in the entry */
function v1812gMatchBits(C,f){ const lg=C.logs&&C.logs[f.id]; const u=C.userSid; const i=v1812gFxSide(C,f); const out={sc:[],pm:null};
  if(!lg) return out;
  for(const e of (lg.ev||[])){ if(e.t!=='goal') continue; const p=v1812gPerson(C,e.pid); out.sc.push([e.s===i?0:1,v1812gShort(p)||'—',e.m,e.ty==='pen'?1:0]); }
  let best=null; for(const r of (lg.box&&lg.box[i])||[]){ if(!r||r.gp===0) continue; if(!best||(r.rt||0)>(best.rt||0)||((r.rt||0)===(best.rt||0)&&(r.g||0)>(best.g||0))) best=r; }
  if(best){ const p=v1812gPerson(C,best.pid); out.pm={pid:best.pid,nm:p?pname(p):'',rt:Math.round((best.rt||0)*10)/10,g:best.g||0,a:best.a||0,sh:best.sh||0,sot:best.sot||0,sv:best.sv||0,tk:(best.tk||0)+(best.int||0),role:best.role||(p&&p.pos)||''}; }
  return out; }

/* the player who stars on a poster: pid, his appearance, the kit he wears in that match, his body height */
function v1812gStar(C,pid,f){ const p=v1812gPerson(C,pid); if(!p) return null; const B=v1812gBox(C); const sch=Sx(p.sid)||v1812gU(C); let kit=null;
  try{ if(f){ const ks=kitsFor(f); const i=f.h===p.sid?0:1; kit=p.pos==='GK'?ks.gk[i]:ks.team[i]; } }catch(e){}
  if(!kit){ try{ kit=kitFor(p); }catch(e){ kit=null; } }
  if(!kit) kit={shirt:sch.c1,pc:sch.c2,trim:sch.c2,shorts:sch.c1,socks:sch.c1,num:'#ffffff',pat:'plain',sleeve:'short',collar:'crew',sockPat:'plain',shortsPat:'plain',numStyle:'solid'};
  const look=v1812gLook(C,p);
  return {p,pid:p.id,nm:pname(p),fn:p.fn,ln:p.ln,num:p.num,pos:p.pos,gk:p.pos==='GK',grade:p.grade,hgt:Math.max(60,Math.min(80,Math.round(p.h||68))),look,kit,sid:p.sid}; }

function v1812gModel(C,e){ if(!C||!e) return null; const sch=v1812gU(C); const M={k:e.k,e,sch,u:C.userSid,yr:e.yr||C.year,sec:C.section,state:C.stateName||'',town:sch.town,mascot:sch.mascot,c1:sch.c1,c2:sch.c2,wk:e.wk||''};
  const m=e.m||{};
  if(e.k==='gameday'||e.k==='final'||e.k==='senior'){ const f=C.fixtures[e.fid]; if(!f) return null; const opp=Sx(f.h===C.userSid?f.a:f.h); M.f=f; M.opp=opp; M.home=f.h===C.userSid; M.round=v1812gRoundName(f); M.ven=f.ven||''; const w=v1812gWhen(f); M.day=w[0]; M.time=w[1]; M.tags=e.k==='gameday'?v1812gTags(C,f):[]; if(e.k==='gameday'){ const rk=v1812gRankTag(C,f); if(rk) M.tags.unshift(rk); M.tags=M.tags.slice(0,3); } }
  if(e.k==='gameday'){ const lg=null; const star=m.pid||e.pid; M.star=v1812gStar(C,star,M.f); M.poseSet=M.star&&M.star.gk?['hips','cross','fist']:['shot','hips','cross']; }
  else if(e.k==='final'){ const sl=v1812gScoreLine(C,M.f); Object.assign(M,sl); M.sc=m.sc||[]; M.pm=m.pm||null; M.et=!!M.f.et; M.star=M.pm?v1812gStar(C,M.pm.pid,M.f):null; M.poseSet=sl.res==='W'?['fist','victory','airplane']:sl.res==='D'?['hips','cross']:['sad','hips']; }
  else if(e.k==='milestone'){ M.ms=m; M.f=C.fixtures[e.fid]||null; M.star=v1812gStar(C,e.pid||m.pid,M.f); if(M.f){ M.opp=Sx(M.f.h===C.userSid?M.f.a:M.f.h); M.home=M.f.h===C.userSid; Object.assign(M,v1812gScoreLine(C,M.f)); } M.poseSet=m.kind==='hat'||m.kind==='first'?['airplane','fist','victory','backflip']:m.kind==='cs'||(M.star&&M.star.gk)?['fist','victory','hips','cross']:['airplane','backflip','fist','victory']; }
  else if(e.k==='potw'){ M.pw=m; M.f=C.fixtures[e.fid]||null; if(M.f){ M.opp=Sx(M.f.h===C.userSid?M.f.a:M.f.h); Object.assign(M,v1812gScoreLine(C,M.f)); } M.star=v1812gStar(C,e.pid||m.pid,M.f); M.poseSet=['fist','cross','hips','victory']; }
  else if(e.k==='senior'){ M.seniors=(m.ids||[]).map(id=>{ const p=v1812gPerson(C,id); return p?{pid:id,nm:pname(p),ln:p.ln,fn:p.fn,num:p.num,pos:p.pos}:null; }).filter(Boolean).slice(0,14);
    M.star=v1812gStar(C,e.pid||m.pid||(M.seniors[0]&&M.seniors[0].pid),M.f); M.poseSet=['hold','salute','cross']; }
  else if(e.k==='hof'){ const h=(C.hof||[]).find(x=>x.pid===(e.pid||m.pid)); M.hof=h||m.h||null; M.star=v1812gStar(C,e.pid||m.pid,null); M.poseSet=['cross','salute','badge','hips']; M.class=m.yr||e.yr; }
  else return null;
  M.pose=M.poseSet&&M.poseSet.length?M.poseSet[0]:'hips'; return M; }

/* ---------- feed: creating entries ---------- */
function v1812gAdd(C,e,quiet){ const B=v1812gBox(C); if(v1812gHas(B,e.id)) return null; B.seq++; e.t=B.seq; e.yr=e.yr||C.year; if(!quiet) e.nw=1; B.feed.push(e); B.dn.push(e.id); if(B.dn.length>160) B.dn.splice(0,B.dn.length-160);
  if(e.pid&&!B.lk[e.pid]){ const p=v1812gPerson(C,e.pid); if(p) B.lk[e.pid]=Object.assign({},v1812gLook(C,p)); }
  if(B.feed.length>V1812G.cap){ B.feed.sort((a,b)=>a.t-b.t); B.feed.splice(0,B.feed.length-V1812G.cap); const keep=new Set(); for(const q of B.feed) if(q.pid) keep.add(q.pid); for(const q of B.pins) if(q.e&&q.e.pid) keep.add(q.e.pid); for(const k of Object.keys(B.lk)) if(!keep.has(k)) delete B.lk[k]; }
  if(!quiet){ V1812G.fresh=(V1812G.fresh||[]); V1812G.fresh.push(e.id); v1812gNotify(C,e); }
  return e; }
function v1812gLabel(C,e){ const m=e.m||{}; const wk=e.wk||''; if(e.k==='gameday') return {a:'GAME DAY',b:wk}; if(e.k==='final'){ const f=C.fixtures[e.fid]; const sl=f?v1812gScoreLine(C,f):null; return {a:sl?`${sl.res} ${sl.us}–${sl.th}`:'FINAL',b:wk}; }
  if(e.k==='milestone') return {a:m.short||'MILESTONE',b:wk}; if(e.k==='potw') return {a:'POTW',b:wk}; if(e.k==='senior') return {a:'SENIOR NIGHT',b:''+(e.yr||'')}; if(e.k==='hof') return {a:'HALL OF FAME',b:''+(m.yr||e.yr||'')}; return {a:'POSTER',b:wk}; }
function v1812gTitle(C,e){ const l=v1812gLabel(C,e); const nm={gameday:'Gameday',final:'Final',milestone:'Milestone',potw:'Player of the Week',senior:'Senior Night',hof:'Hall of Fame'}[e.k]||'Poster'; if(e.k==='final') return `Final · ${l.a}`; if(e.k==='milestone') return `Milestone · ${(e.m&&e.m.title)||l.a}`; if(e.k==='gameday') return `Gameday · ${e.wk||''}`.trim(); return nm+(l.b?` · ${l.b}`:''); }
function v1812gNotify(C,e){ const V=V1812G; V.tqn++; V.tqm='New poster: '+v1812gTitle(C,e).replace(/ · $/,''); clearTimeout(V.tq); V.tq=setTimeout(()=>{ const n=V.tqn; V.tqn=0; try{ toast(n>1?`${n} new posters in the Program feed`:V.tqm); }catch(x){} try{ if(App.route==='gameday'&&App.C&&typeof v1812gRefreshFeed==='function') v1812gRefreshFeed(); }catch(x){} },450); }

/* the ids of the milestone entries a finished match creates for a player (pure; testable): returns [{kind,v,short,title,first}] best first */
function v1812gPlayerMiles(prev,now,row,C,p,csNow){ const out=[]; const M=V1812G.ms; const crossed=(arr,a,b)=>arr.filter(t=>a<t&&b>=t);
  for(const t of crossed(M.goals,prev.g,now.g)) out.push({kind:'goals',v:t,pr:1000+t,short:t+' GOALS',title:`${t} career goals`,unit:'CAREER GOALS'});
  for(const t of crossed(M.ast,prev.a,now.a)) out.push({kind:'ast',v:t,pr:300+t,short:t+' ASSISTS',title:`${t} career assists`,unit:'CAREER ASSISTS'});
  for(const t of crossed(M.cs,prev.cs,now.cs)) out.push({kind:'cs',v:t,pr:400+t,short:t+' CLEAN SHEETS',title:`${t} career clean sheets`,unit:'CAREER CLEAN SHEETS'});
  if((row.g||0)>=3) out.push({kind:'hat',v:row.g,pr:500+row.g,short:row.g>=4?row.g+' GOALS':'HAT TRICK',title:row.g>=4?`${row.g}-goal game`:'hat trick',unit:row.g>=4?'GOALS IN ONE GAME':'HAT TRICK'});
  if(prev.g===0&&now.g>0) out.push({kind:'first',v:1,pr:100,short:'FIRST GOAL',title:'first career goal',unit:'FIRST CAREER GOAL'});
  out.sort((a,b)=>b.pr-a.pr); return out; }
/* has anyone else in the school's history reached this career total? */
function v1812gFirstIn(C,p,key,v){ const u=C.userSid; const all=[...Object.values(C.players),...Object.values(C.alumni||{})]; for(const q of all){ if(q.sid!==u||q.id===p.id) continue; if((careerTotals(q,'V')[key]||0)>=v) return false; } return true; }
function v1812gMostIn(C,p,key){ const u=C.userSid; const mine=careerTotals(p,'V')[key]||0; const all=[...Object.values(C.players),...Object.values(C.alumni||{})]; for(const q of all){ if(q.sid!==u||q.id===p.id) continue; if((careerTotals(q,'V')[key]||0)>=mine) return false; } return mine>0; }

/* after a finished Varsity match of the user's school: its Final poster and the milestones it produced */
function v1812gAfterMatch(C,f,M){ const B=v1812gBox(C); if(!B.on||!f||f.st!=='d'||f.lvl!=='V') return; const u=C.userSid; if(f.h!==u&&f.a!==u) return;
  const bits=v1812gMatchBits(C,f); const wk=v1812gWkShort(f);
  v1812gAdd(C,{id:'FN:'+f.id,k:'final',fid:f.id,wk,pid:bits.pm&&bits.pm.pid||null,m:{sc:bits.sc,pm:bits.pm}});
  if(f.comp==='pre') return; const lg=C.logs&&C.logs[f.id]; if(!lg||!lg.box) return; const i=v1812gFxSide(C,f); const conceded=i===0?f.ag:f.hg; let made=0;
  const rows=(lg.box[i]||[]).slice(); const list=[];
  for(const row of rows){ if(!row||row.gp===0) continue; const p=C.players[row.pid]; if(!p) continue; const T=careerTotals(p,'V'); const csNow=conceded===0&&row.role==='GK'?1:0;
    const prev={g:T.g-(row.g||0),a:T.a-(row.a||0),cs:T.cs-csNow}; const ms=v1812gPlayerMiles(prev,T,row,C,p,csNow); if(ms.length) list.push({p,ms:ms[0],all:ms,T}); }
  /* program wins: the head coach's career win total reaching a mark in a win */
  try{ if(f.w===u){ const co=C.coaches[C.userCoachId]; if(co&&co.rec){ let w=0; for(const y in co.rec) w+=co.rec[y].w||0; if(V1812G.ms.wins.includes(w)){ const pm=bits.pm; if(pm&&C.players[pm.pid]) list.push({p:C.players[pm.pid],ms:{kind:'wins',v:w,pr:200+w,short:w+' WINS',title:`coach ${co.name}'s ${w}th career win`,unit:'CAREER WINS',coach:co.name},wins:1}); } } } }catch(e){}
  list.sort((a,b)=>b.ms.pr-a.ms.pr);
  for(const it of list){ if(made>=2) break; const ms=it.ms; const key={goals:'g',ast:'a',cs:'cs'}[ms.kind]; const first=key?v1812gFirstIn(C,it.p,key,ms.v):false; const most=key?v1812gMostIn(C,it.p,key):false;
    const id=`MS:${it.p.id}:${ms.kind}:${ms.v}${ms.kind==='hat'||ms.kind==='first'?':'+f.id:''}`;
    const e=v1812gAdd(C,{id,k:'milestone',fid:f.id,pid:it.p.id,wk,m:{kind:ms.kind,v:ms.v,short:ms.short,title:ms.title,unit:ms.unit,first:first?1:0,most:most?1:0,coach:ms.coach||null}}); if(e) made++; } }

/* the upcoming Varsity game: a Gameday poster (and Senior Night); finished weeks: the Player of the Week; inducted players: the Hall of Fame */
function v1812gStarFor(C,sid,lvl){ try{ const lu=getLu(C,sid,lvl||'V'); const cands=lu.slots.map(s=>C.players[s.pid]).filter(Boolean); const att=cands.filter(p=>ROLE_GROUP[(lu.slots.find(s=>s.pid===p.id)||{}).role]!=='GK'); const pool=att.length?att:cands; pool.sort((a,b)=>(ovr(b)-ovr(a))||(a.id<b.id?-1:1)); return pool[0]||null; }catch(e){ return null; } }
function v1812gSync(C){ if(!C||!C.userSid||!C.fixtures) return; const B=v1812gBox(C); if(!B.on) return; v1812gBackfill(C); const sig=[C.year,C.phase,C.md,C.pre&&C.pre.rd,C.post&&(C.post.secRd+':'+C.post.stRd),Object.keys(C.fixtures).length,(C.hofNew||[]).join('')].join('|'); if(V1812G.syncSig===sig&&V1812G.syncC===C) return; V1812G.syncSig=sig; V1812G.syncC=C;
  let uf=null; try{ if(C.phase!=='offseason') uf=userFixture(C); }catch(e){}
  if(uf&&uf.st==='s'&&uf.lvl==='V'&&(uf.h===C.userSid||uf.a===C.userSid)){ const star=v1812gStarFor(C,C.userSid,'V');
    v1812gAdd(C,{id:'GD:'+uf.id,k:'gameday',fid:uf.id,wk:v1812gWkShort(uf),pid:star?star.id:null,m:{}});
    try{ if(isSeniorNight(C,uf)){ const sn=seniorsOf(C); if(sn.length){ const cap=(getLu(C,C.userSid,'V').caps||[]).map(id=>sn.find(p=>p.id===id)).find(Boolean); const feat=cap||sn.slice().sort((a,b)=>ovr(b)-ovr(a))[0];
      v1812gAdd(C,{id:'SN:'+C.year,k:'senior',fid:uf.id,wk:v1812gWkShort(uf),pid:feat.id,m:{ids:sn.map(p=>p.id).slice(0,14)}}); } } }catch(e){} }
  /* weeks that are complete: the Courier's Player of the Week (the league's pick when he is ours, else our best that week) */
  try{ if(C.phase!=='preseason'){ const todo=[]; for(const is of courierIssues(C,C.year)){ if(is.comp!=='reg') continue; const key=is.yr+':'+is.comp+':'+is.rd; if(B.pw[key]) continue; const fx=is.fx.map(id=>C.fixtures[id]).filter(Boolean); if(!fx.length||fx.some(f=>f.st!=='d')) continue; B.pw[key]=1; todo.push({is,key,fx}); }
      const last=todo[todo.length-1]; if(last){ const {is,key,fx}=last; const mine=fx.find(f=>f.h===C.userSid||f.a===C.userSid); const lg=mine&&C.logs[mine.id]; if(lg){ const pw=playerOfWeek(C,is); let pick=null,lgPick=false;
        if(pw&&C.players[pw.pid]&&C.players[pw.pid].sid===C.userSid){ pick=pw; lgPick=true; } else { const i=v1812gFxSide(C,mine); for(const r of lg.box[i]||[]){ if(r.gp===0) continue; if(!pick||(r.rt||0)>(pick.rt||0)) pick={...r,fid:mine.id,side:i}; } if(pick&&(pick.rt||0)<7.2) pick=null; }
        if(pick){ const p=v1812gPerson(C,pick.pid); v1812gAdd(C,{id:'PW:'+key,k:'potw',fid:pick.fid||mine.id,pid:pick.pid,wk:'Wk '+(is.rd+1),m:{rt:Math.round((pick.rt||0)*10)/10,g:pick.g||0,a:pick.a||0,sh:pick.sh||0,sv:pick.sv||0,tk:(pick.tk||0)+(pick.int||0),role:pick.role||(p&&p.pos)||'',lg:lgPick?1:0,wkn:is.rd+1}}); } } } } }catch(e){ console.warn('gameday potw',e); }
  /* inducted into the Hall of Fame at the last rollover */
  try{ for(const pid of (C.hofNew||[])){ const h=(C.hof||[]).find(x=>x.pid===pid); if(!h||h.sid!==C.userSid) continue; v1812gAdd(C,{id:`HF:${h.yr}:${pid}`,k:'hof',pid,wk:'',yr:h.yr,m:{yr:h.yr}}); } }catch(e){}
}
/* a poster for a template with nothing in the feed yet: the same layout from the career as it stands (never stored) */
function v1812gPreviewEntry(C,k){ const u=C.userSid; const mine=Object.values(C.fixtures).filter(f=>f.lvl==='V'&&(f.h===u||f.a===u)); const done=mine.filter(f=>f.st==='d'&&C.logs[f.id]).sort((a,b)=>(a.id<b.id?-1:1)); const last=done[done.length-1]||null;
  let next=null; try{ next=C.phase!=='offseason'?userFixture(C):null; }catch(e){}
  const base={id:'PV:'+k,k,pv:1,yr:C.year,t:0,m:{}};
  if(k==='gameday'){ const f=next||(mine.filter(x=>x.st==='s').sort((a,b)=>(a.id<b.id?-1:1))[0])||last; if(!f) return null; const star=v1812gStarFor(C,u,'V'); return {...base,fid:f.id,pid:star?star.id:null,wk:v1812gWkShort(f)}; }
  if(k==='final'){ if(!last) return null; const bits=v1812gMatchBits(C,last); return {...base,fid:last.id,pid:bits.pm&&bits.pm.pid||null,wk:v1812gWkShort(last),m:{sc:bits.sc,pm:bits.pm}}; }
  if(k==='milestone'){ let best=null; for(const p of Object.values(C.players)){ if(p.sid!==u) continue; const T=careerTotals(p,'V'); const sc=T.g*3+T.a+T.cs*2; if(!best||sc>best.sc) best={p,T,sc}; } if(!best) return null; const T=best.T; const gk=best.p.pos==='GK'; const kind=gk?'cs':'goals'; const v=Math.max(1,gk?T.cs:T.g); const unit=gk?'CAREER CLEAN SHEETS':'CAREER GOALS';
    return {...base,fid:last?last.id:null,pid:best.p.id,wk:last?v1812gWkShort(last):'',m:{kind,v,short:v+(gk?' CLEAN SHEETS':' GOALS'),title:`${v} ${unit.toLowerCase()}`,unit,first:0,most:v1812gMostIn(C,best.p,gk?'cs':'g')?1:0}}; }
  if(k==='potw'){ if(!last) return null; const bits=v1812gMatchBits(C,last); const pm=bits.pm; if(!pm) return null; return {...base,fid:last.id,pid:pm.pid,wk:v1812gWkShort(last),m:{rt:pm.rt,g:pm.g,a:pm.a,sh:pm.sh,sv:pm.sv,tk:pm.tk,role:pm.role,lg:0,wkn:(last.rd||0)+1}}; }
  if(k==='senior'){ const sn=seniorsOf(C); if(!sn.length) return null; const f=seniorNightFixture(C)||next||last; if(!f) return null; const feat=sn.slice().sort((a,b)=>ovr(b)-ovr(a))[0]; return {...base,fid:f.id,pid:feat.id,wk:v1812gWkShort(f),m:{ids:sn.map(p=>p.id).slice(0,14)}}; }
  if(k==='hof'){ const h=(C.hof||[]).filter(x=>x.sid===u).slice(-1)[0]; if(h) return {...base,pid:h.pid,yr:h.yr,m:{yr:h.yr}};
    let best=null; for(const p of Object.values(C.players)){ if(p.sid!==u) continue; const sc=hofScore(p); if(!best||sc.sc>best.sc) best={p,sc:sc.sc,t:sc.t}; } if(!best) return null; const p=best.p;
    return {...base,pid:p.id,yr:C.year,m:{yr:C.year,h:{pid:p.id,name:pname(p),num:p.num,pos:p.pos,g:best.t.g,a:best.t.a,sv:best.t.sv,cs:best.t.cs,gp:best.t.gp,awards:(p.awards||[]).map(a=>a.k),titles:(p.honors||[]).map(h=>h.label)}}}; }
  return null; }
/* when a career first gets the feed, show its last few results so the strip is not empty */
function v1812gBackfill(C){ const B=v1812gBox(C); if(B.bf||!B.on){ return; } B.bf=1; try{ const u=C.userSid; const done=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&(f.h===u||f.a===u)&&f.yr===C.year&&C.logs[f.id]).sort((a,b)=>(a.id<b.id?-1:1)).slice(-4);
  for(const f of done){ const bits=v1812gMatchBits(C,f); v1812gAdd(C,{id:'FN:'+f.id,k:'final',fid:f.id,wk:v1812gWkShort(f),pid:bits.pm&&bits.pm.pid||null,m:{sc:bits.sc,pm:bits.pm}},true); } }catch(e){} }

if(typeof finishMatch==='function'){ const _v1812gFinish=finishMatch;
  finishMatch=function(C,M){ const f=C&&M&&C.fixtures&&C.fixtures[M.fid]; const was=f&&f.st; const out=_v1812gFinish.apply(this,arguments);
    try{ if(was!=='d'&&f&&f.st==='d'&&C.userSid&&(f.h===C.userSid||f.a===C.userSid)) v1812gAfterMatch(C,f,M); }catch(e){ console.error(e); }
    return out; }; }
if(typeof advance==='function'){ const _v1812gAdvance=advance; advance=function(C){ const r=_v1812gAdvance.apply(this,arguments); try{ if(C&&C.userSid&&typeof App!=='undefined'&&C===App.C) v1812gSync(C); }catch(e){ console.error(e); } return r; }; }
if(typeof rollover==='function'){ const _v1812gRoll=rollover; rollover=function(C){ const r=_v1812gRoll.apply(this,arguments); try{ if(C&&C.userSid&&typeof App!=='undefined'&&C===App.C) v1812gSync(C); }catch(e){ console.error(e); } return r; }; }
/* save shape: a career from before v18.12 simply gets the defaults (feed on, varsity style, nothing in it yet) */
if(typeof migrate==='function'){ const _v1812gMig=migrate; migrate=function(C){ const r=_v1812gMig.apply(this,arguments); try{ if(C&&C.userSid&&C.schools) v1812gBox(C); }catch(e){} return r; }; }

/* ===================== poster engine: fonts, images, the 3-D player ===================== */
const V1812G_FONT={disp:'"Big Shoulders Display","Oswald","Arial Narrow",Impact,sans-serif',body:'"Instrument Sans","Segoe UI",system-ui,sans-serif',mono:'"JetBrains Mono",Consolas,monospace',serif:'"Gloock","Georgia",serif',text:'"Crimson Pro","Georgia",serif'};
/* the canvas draws with the embedded fonts only once they are loaded: wait for them (never for more than 2.5 s) */
function v1812gFonts(){ const V=V1812G; if(V.fontsP) return V.fontsP; const specs=['900 120px "Big Shoulders Display"','800 60px "Big Shoulders Display"','500 40px "Big Shoulders Display"','400 40px "Instrument Sans"','700 40px "Instrument Sans"','italic 400 40px "Instrument Sans"','700 30px "JetBrains Mono"','400 60px "Gloock"','400 40px "Crimson Pro"','italic 400 40px "Crimson Pro"'];
  const load=Promise.all(specs.map(s=>{ try{ return document.fonts.load(s,'AaBb0123456789 –—·\'').catch(()=>null); }catch(e){ return null; } })).then(()=>{ try{ return document.fonts.ready; }catch(e){ return null; } }).catch(()=>null);
  V.fontsP=Promise.race([load,new Promise(r=>setTimeout(r,2500))]).then(()=>true); return V.fontsP; }
function v1812gImg(key,mk){ const V=V1812G; let p=V.imgs.get(key); if(!p){ if(V.imgs.size>60) V.imgs.clear(); p=Promise.resolve().then(mk).catch(()=>null); V.imgs.set(key,p); } return p; }
function v1812gCrest(s,px){ return v1812gImg('crest|'+s.id+'|'+s.c1+s.c2+'|'+px,()=>svgImg(crest(s,px),px)); }
function v1812gLogo(s,px){ return v1812gImg('logo|'+s.id+'|'+s.c1+s.c2+'|'+px,()=>svgImg(logo(s,px),px)); }
function v1812gPortrait(star,sch,px){ if(!star) return Promise.resolve(null); return v1812gImg('por|'+star.pid+'|'+px+'|'+sch.c1+sch.c2,()=>svgImg(portraitSVG(Object.assign({},star.p,{look:star.look}),px,{c1:sch.c1,c2:sch.c2}),px)); }

/* ---------- the pose library: how a figure is held for a poster ----------
   q(Q,o,st) edits the solved pose (feet/hands in body units: f forward, u up, l sideways; hand/foot 0 is the left side);
   pole(sd) is the elbow's bend direction; ang turns the body away from the camera (+ toward screen-right); box = frame padding in
   metres [top, bottom, width at 70 in] so jumps and wide arms are not clipped. */
const V1812G_POSES={
  hips:{n:'Hands on hips',ang:0.5,box:[0.1,0.05,1.7],q(Q){ Q.act='hips'; Q.hands[0]={f:-0.05,u:1.03,l:-0.43}; Q.hands[1]={f:-0.05,u:1.03,l:0.43}; Q.feet[0]={f:-0.02,u:0,l:-0.27}; Q.feet[1]={f:0.1,u:0,l:0.23}; Q.lean=-0.05; Q.hipU=0.8; Q.headTilt=-0.06; Q.mouth=false; },pole:sd=>[-0.35,-0.05,sd]},
  cross:{n:'Arms crossed',ang:0.42,box:[0.1,0.05,1.5],q(Q){ Q.act='cross'; Q.hands[0]={f:0.22,u:1.33,l:0.3}; Q.hands[1]={f:0.2,u:1.26,l:-0.3}; Q.feet[0]={f:0,u:0,l:-0.2}; Q.feet[1]={f:0.08,u:0,l:0.2}; Q.lean=-0.04; Q.headTilt=-0.05; Q.mouth=false; },pole:sd=>[0.5,-1,sd*0.3]},
  shot:{n:'Shooting follow-through',ang:1.05,fit:0.92,box:[0.12,0.05,2.5],set(o,st){ o.kickT=st.now-(200+0.42*340); o.kickW=200; o.kickF=340; o.kickK='shot'; },q(Q){ Q.headTilt=0.12; },pole:null},
  airplane:{n:'Airplane',ang:0.55,fit:0.95,box:[0.28,0.12,2.6],set(o,st){ o.celeb=true; o.celebType='airplane'; o.celebT=st.now-420; },q(Q){ Q.act='celeb'; Q.rot=-0.32; Q.pivot=1.1; Q.lean=0.12; Q.lift=0.1; Q.feet[1]={f:-0.34,u:0.26,l:0.12}; Q.feet[0]={f:0.1,u:0,l:-0.12}; Q.mouth=true; },pole:null},
  backflip:{n:'Backflip',ang:1.45,fit:0.62,box:[1.25,0.06,2.7],set(o,st){ o.celeb=true; o.celebType='backflip'; o.celebT=st.now-Math.max(500,950)*0.46; },q(Q){ Q.mouth=true; },pole:null},
  fist:{n:'Fist pump',ang:0.4,fit:0.86,box:[0.4,0.08,2.0],set(o,st){ o.celeb=true; o.celebType='classic'; o.celebT=st.now-500; o.seed=1.3; },q(Q){ Q.lift=0.16; Q.mouth=true; },pole:null},
  victory:{n:'Arms up',ang:0.22,fit:0.88,box:[0.4,0.08,2.2],set(o,st){ o.celeb=true; o.celebType='mob'; o.celebT=st.now-500; o.seed=0.6; },q(Q){ Q.lift=0.14; Q.mouth=true; },pole:null},
  sad:{n:'Heads down',ang:0.3,box:[0.12,0.05,1.6],set(o){ o.sad=true; },q(Q){ Q.headTilt=0.4; Q.mouth=false; },pole:null},
  hold:{n:'Jersey hold',ang:0.14,box:[0.1,0.05,1.7],q(Q){ Q.act='hold'; Q.hands[0]={f:0.4,u:1.3,l:-0.26}; Q.hands[1]={f:0.4,u:1.3,l:0.26}; Q.feet[0]={f:0,u:0,l:-0.16}; Q.feet[1]={f:0.04,u:0,l:0.16}; Q.lean=0.02; Q.headTilt=0; Q.mouth=false; },pole:sd=>[-0.1,-1,sd*0.7]},
  salute:{n:'Salute',ang:0.5,box:[0.18,0.05,1.6],q(Q){ Q.act='salute'; Q.hands[1]={f:0.17,u:1.95,l:0.13}; Q.hands[0]={f:0.02,u:1.0,l:-0.25}; Q.feet[0]={f:0,u:0,l:-0.12}; Q.feet[1]={f:0,u:0,l:0.12}; Q.lean=-0.03; Q.mouth=false; },pole:null},
  badge:{n:'Hand on heart',ang:0.4,box:[0.1,0.05,1.5],q(Q){ Q.act='badge'; Q.hands[1]={f:0.2,u:1.43,l:-0.05}; Q.hands[0]={f:0.1,u:1.0,l:-0.26}; Q.feet[0]={f:0,u:0,l:-0.14}; Q.feet[1]={f:0.02,u:0,l:0.14}; Q.headTilt=-0.06; Q.mouth=false; },pole:null},
  bust:{n:'Portrait',ang:0.35,box:[0.1,0.05,1.6],q(Q){ Q.act='bust'; Q.hands[0]={f:-0.05,u:1.03,l:-0.43}; Q.hands[1]={f:-0.05,u:1.03,l:0.43}; Q.mouth=false; Q.headTilt=-0.04; },pole:sd=>[-0.35,-0.05,sd]}};

/* the elbow's bend direction can be set per figure (v18ArmPole is global; the figure module calls it for every arm) */
if(typeof v18ArmPole==='function'){ const _v1812gPole=v18ArmPole; v18ArmPole=function(a0,a1,a2,t0,t1,t2,sd,Q,p){ const f=p&&p._v1812gPole; if(f){ const r=f(sd); if(r) return r; } return _v1812gPole.apply(this,arguments); }; }
/* while a poster draws the 2-D fallback figure, the 3-D preview diversion (69_p3d_preview.js) must stay out of the way */
if(typeof v18PvOn==='function'){ const _v1812gPvOn=v18PvOn; v18PvOn=function(){ return !V1812G.in2d&&_v1812gPvOn.apply(this,arguments); }; }

function v1812gPoseDef(name){ return V1812G_POSES[name]||V1812G_POSES.hips; }
/* a figure and a stand-in stage for one star in one pose */
function v1812gFigure(star,poseName,opt){ opt=opt||{}; const pd=v1812gPoseDef(poseName); const st=Object.create(Stage.prototype); Object.assign(st,{now:100000,own:null,hands:false,ball:{x:999,y:0,z:0},spdMul:1,ts:1,placed:false,depthK:0.3,rm:true,proj:()=>[0,0,1]});
  const look=Object.assign({},star.look); const ang=(pd.ang||0.4)*(opt.mirror?-1:1);
  const o={x:0,y:0,look,hgt:star.hgt||68,num:star.num,face:1,yaw:Math.PI/2-ang,ph:0,spd:0,seed:2.1,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:!!star.gk,side:0,pid:undefined,v187cNm:String(star.ln||'').toUpperCase(),v187cCap:false,_pose:null,_v1812g:poseName,_v1812gPole:pd.pole||null};
  if(pd.set) pd.set(o,st);
  const base=Stage.prototype.poseOf; st.poseOf=function(p,isRef){ const Q=base.call(this,p,isRef); if(pd.q) pd.q(Q,p,this); return Q; };
  return {o,st,pd}; }

/* ---------- ONE hidden WebGL renderer, built when a poster needs a player and released after 8 s idle ---------- */
function v1812gGL(){ try{ if(V1812G.force2d||V1812G.fail||PREFS.renderer==='2d') return false; if(typeof THREE==='undefined'||typeof v18FigInit!=='function'||typeof Painter3D==='undefined') return false; const g=v18GL(); return !!(g&&g.ok); }catch(e){ return false; } }
function v1812gPainter(){ const V=V1812G; if(V.P&&!V.P.dead) return V.P; if(V.fail) return null; const T=THREE; const cv=document.createElement('canvas'); cv.width=cv.height=4; let R;
  try{ R=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,premultipliedAlpha:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'}); }catch(e){ console.warn('gameday: no WebGL, using 2-D',e); V.fail=true; return null; }
  try{ const gl=R.getContext(); if(!gl||(gl.isContextLost&&gl.isContextLost())) throw new Error('context lost'); }catch(e){ try{ R.dispose(); R.forceContextLoss(); }catch(x){} V.fail=true; return null; }
  R.setPixelRatio(1); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.NeutralToneMapping; R.toneMappingExposure=1.08; R.setClearColor(0x000000,0); R.shadowMap.enabled=false;
  const P={T,kind:'poster',renderer:R,canvas:cv,scene:new T.Scene(),camera:new T.PerspectiveCamera(14,1,0.5,80),tier:{name:'G',detail:2,shadow:0,aa:true,pr:1},extra:[],H:1000,dead:false,_mats:new Map(),cw:4,ch:4};
  P.track=Painter3D.prototype.track; P.toon=Painter3D.prototype.toon;
  P._lost=e=>{ e.preventDefault(); console.warn('gameday: WebGL context lost, posters use the 2-D figure'); V.fail=true; v1812gDispose(); };
  cv.addEventListener('webglcontextlost',P._lost);
  P.gradientMap=P.track(new T.DataTexture(new Uint8Array([78,156,222,255]),4,1,T.RedFormat)); P.gradientMap.minFilter=P.gradientMap.magFilter=T.NearestFilter; P.gradientMap.needsUpdate=true;
  P.hemi=new T.HemisphereLight('#e8eeff','#5a5048',1.25); P.key=new T.DirectionalLight('#fff0dc',2.5); P.fill=new T.DirectionalLight('#cfdcff',0.85); P.rim=new T.DirectionalLight('#ffffff',1.5);
  for(const l of [P.key,P.fill,P.rim]) P.scene.add(l,l.target); P.scene.add(P.hemi,P.camera);
  try{ v18FigInit(P); }catch(e){ console.warn('gameday: figures init failed, using 2-D',e); V.P=P; v1812gDispose(); V.fail=true; return null; }
  V.P=P; V.builds++; V.last=performance.now(); v1812gSweepLater(); return P; }
function v1812gDispose(){ const V=V1812G, P=V.P; if(!P||P.dead) return; P.dead=true; V.P=null;
  try{ const fm=P3D_MODULES.find(m=>m.name==='figures'); if(fm&&fm.dispose) fm.dispose(P); }catch(e){}
  try{ P.scene.traverse(o=>{ if(o.geometry&&o.geometry.dispose) o.geometry.dispose(); const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[]; for(const m of ms){ if(m.map) m.map.dispose(); if(m.dispose) m.dispose(); } }); }catch(e){}
  for(const o of P._track||[]) try{ o.dispose&&o.dispose(); }catch(e){}
  try{ P.renderer.dispose(); P.renderer.forceContextLoss(); }catch(e){}
  try{ P.canvas.removeEventListener('webglcontextlost',P._lost); }catch(e){} }
function v1812gSweepLater(){ if(V1812G.timer) return; V1812G.timer=setTimeout(()=>{ V1812G.timer=0; if(!V1812G.P) return; if(V1812G.busy||performance.now()-V1812G.last<8000) v1812gSweepLater(); else v1812gDispose(); },2000); }

/* the frame around a figure, in metres, from the pose's padding */
function v1812gFrame(star,pd,bust){ const S=0.92*(star.hgt||68)/70; const hairUp=/afro|mohawk|bun|spiky|curly|twists/.test((star.look&&star.look.hair)||'')?0.1:0.04; const top=1.99*S+hairUp;
  if(bust){ const FH=0.95*S*1.05; return {S,top,FH,FW:FH*0.95,yc:1.5*S+0.02,bust:true}; }
  const b=pd.box||[0.1,0.05,1.6]; const FH=top+b[0]+b[1]; const FW=Math.max(FH*0.8,b[2]*S/0.92*1.05); return {S,top,FH,FW,yc:-b[1]+FH/2}; }

/* render the star into a transparent canvas: th = his standing height in pixels. Returns {cv,feet,top,k,pts,r3d} */
function v1812gCapture3D(star,poseName,th,opt){ opt=opt||{}; const P=v1812gPainter(); if(!P) return null; const T=P.T, R=P.renderer; const bust=poseName==='bust'; const {o,st,pd}=v1812gFigure(star,poseName,opt);
  th=th*(pd.fit||1); const fr=v1812gFrame(star,pd,bust); const kk=th/(1.99*fr.S); /* pixels per metre: 1.99 body units is a standing figure */
  let RW=Math.round(fr.FW*kk), RH=Math.round(fr.FH*kk); const mx=Math.min(R.capabilities.maxTextureSize||4096,4096); const sc=Math.min(1,mx/Math.max(RW,RH)); RW=Math.max(8,Math.round(RW*sc)); RH=Math.max(8,Math.round(RH*sc)); const kpx=kk*sc;
  const d=bust?5.2:9.5; const cam=P.camera; cam.fov=2*Math.atan(fr.FH/2/d)*180/Math.PI; cam.aspect=RW/RH; cam.near=0.5; cam.far=60; cam.position.set(0,fr.yc,d); cam.rotation.set(0,0,0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  R.setSize(RW,RH,false); R.setViewport(0,0,RW,RH); P.cw=RW; P.ch=RH; P.H=RH;
  P.key.position.set(-3.2,fr.yc+3,5); P.key.target.position.set(0,fr.yc*0.8,0); P.fill.position.set(3.6,fr.yc,4.2); P.fill.target.position.set(0,fr.yc*0.8,0); P.rim.position.set(2.6,fr.yc+2,-4.5); P.rim.target.position.set(0,fr.yc,0);
  P.extra.length=0; P.extra.push({o,kit:star.kit,isRef:false});
  let cut=null; const V=V1812G; V.busy++;
  try{ v18FigFrame(P,st); const F=P._fig; F.U.uOlPx.value=Math.max(1.4,th/300); const bl=F.p&&F.p.blob; if(bl){ bl.n=0; bl.m.count=0; bl.m.visible=false; if(bl.ol) bl.ol.visible=false; }
    R.render(P.scene,cam);
    const out=document.createElement('canvas'); out.width=RW; out.height=RH; const g=out.getContext('2d'); g.drawImage(P.canvas,0,0,RW,RH);
    const pr=(x,y,z)=>{ const v=new T.Vector3(x,y,z).project(cam); return [(v.x*0.5+0.5)*RW,(-v.y*0.5+0.5)*RH]; }; const W=F.s;
    cut={cv:out,r3d:true,k:kpx,feet:pr(0,0,0),pts:{hand0:pr(W[24],W[25],W[26]),hand1:pr(W[33],W[34],W[35]),head:pr(W[42],W[43],W[44]),neck:pr(W[39],W[40],W[41]),pelvis:pr(W[36],W[37],W[38])},th}; }
  finally{ P.extra.length=0; V.busy--; V.last=performance.now(); v1812gSweepLater(); }
  return cut; }

/* the 2-D fallback: the game's own drawFigure on a stand-in stage, drawn big on a transparent canvas */
function v1812gCapture2D(star,poseName,th,opt){ opt=opt||{}; const bust=poseName==='bust'; const {o,st,pd}=v1812gFigure(star,poseName,opt); th=th*(pd.fit||1); const fr=v1812gFrame(star,pd,bust);
  const kk=th/(1.99*fr.S); const RW=Math.max(8,Math.round(fr.FW*kk)), RH=Math.max(8,Math.round(fr.FH*kk)); const cv=document.createElement('canvas'); cv.width=RW; cv.height=RH; const g=cv.getContext('2d');
  /* body units on screen: s = k * hgt/70 * 1.06 px, and a standing figure is 1.99 body units tall; the floor (y = 0) is at this row of the frame */
  const floorY=RH+(fr.yc-fr.FH/2)*kk; const kFit=(th/1.99)/(((star.hgt||68)/70)*1.06); const sc=th/1.99;
  st.proj=()=>[RW/2,floorY,kFit]; st.W=RW; st.H=RH; V1812G.in2d=true;
  try{ g.save(); Stage.prototype.drawFigure.call(st,g,o,star.kit,false); g.restore(); }finally{ V1812G.in2d=false; }
  const feet=[RW/2,floorY]; const up=(u)=>floorY-u*sc;
  return {cv,r3d:false,k:kk,feet,pts:{hand0:[RW/2-0.4*sc*0.3,up(1.3)],hand1:[RW/2+0.4*sc*0.3,up(1.3)],head:[RW/2,up(1.83)],neck:[RW/2,up(1.57)],pelvis:[RW/2,up(0.85)]},th}; }

/* a cutout for a star in a pose at a height: cached; always returns something (2-D if the 3-D path is off or fails) */
async function v1812gCutout(star,poseName,th,opt){ opt=opt||{}; const V=V1812G; await v1812gFonts();
  const base=[star.pid,poseName,Math.round(th),opt.mirror?1:0,JSON.stringify(star.look),JSON.stringify(star.kit),star.num,star.hgt].join('|'); const use3=!opt.no3d&&v1812gGL(); const k3=base+'|3d', k2=base+'|2d';
  let c=use3?V.cuts.get(k3):(V.cuts.get(k3)||V.cuts.get(k2)); if(c) return c;
  if(use3){ try{ c=v1812gCapture3D(star,poseName,th,opt); }catch(e){ console.warn('gameday: 3-D capture failed, using the 2-D figure',e); c=null; V.fail3=(V.fail3||0)+1; if(V.fail3>=2){ V.fail=true; v1812gDispose(); } } }
  const is3=!!c; if(!c){ c=V.cuts.get(k2); if(c) return c; try{ c=v1812gCapture2D(star,poseName,th,opt); }catch(e){ console.warn('gameday: 2-D figure failed',e); c=null; } }
  if(c){ c.bb=v1812gBBox(c.cv); const k=is3?k3:k2; if(V.cuts.size>16) V.cuts.delete(V.cuts.keys().next().value); V.cuts.set(k,c); }
  return c; }
function v1812gBBox(cv){ try{ const w=cv.width, h=cv.height; const d=cv.getContext('2d').getImageData(0,0,w,h).data; let x0=w,y0=h,x1=-1,y1=-1; for(let y=0;y<h;y+=2){ for(let x=0;x<w;x+=2){ if(d[(y*w+x)*4+3]>24){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } } } if(x1<0) return null; return {x0,y0,x1,y1}; }catch(e){ return null; } }
/* distinct (4-bit) colours and the luminance spread of a canvas: a blank poster has neither (the tests use it) */
function v1812gStats(cv){ try{ const w=cv.width, h=cv.height; const d=cv.getContext('2d').getImageData(0,0,w,h).data; const seen=new Set(); let n=0, s=0, s2=0; for(let i=0;i<d.length;i+=4*7){ seen.add((d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4)); const L=0.3*d[i]+0.59*d[i+1]+0.11*d[i+2]; n++; s+=L; s2+=L*L; } const m=s/n; return {colors:seen.size,sd:Math.sqrt(Math.max(0,s2/n-m*m))}; }catch(e){ return {colors:0,sd:0}; } }
/* how many pixels of a canvas are not transparent (the tests use it) */
function v1812gOpaque(cv){ try{ const w=cv.width, h=cv.height; const d=cv.getContext('2d').getImageData(0,0,w,h).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>16) n++; return n; }catch(e){ return -1; } }

/* ===================== poster engine: palettes, the three styles, drawing primitives ===================== */
function v1812gRgba(hex,a){ const c=hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function v1812gPal(sch,style,k){ const c1=sch.c1||'#1d4ed8', c2=sch.c2||'#ffffff'; let A=c1; if(lum(A)>0.42) A=_mc(c1,'#0b0f15',0.62); if(lum(A)<0.015) A=_mc(c1,'#2a3140',0.5);
  let B=c2; if(Math.abs(lum(B)-lum(A))<0.12) B=lum(A)>0.3?'#0b0f15':'#ffffff';
  const warm=c=>{ const r=hexRgb(c); return r[0]>170&&r[1]>120&&r[2]<120&&lum(c)>0.3; }; let pop=warm(c2)?c2:'#ffd23f'; if(lum(pop)-lum(A)<0.2) pop='#ffffff';
  const P={c1,c2,A,B,pop,deep:_mc(A,'#05070b',0.74),dark:_mc(A,'#05070b',0.5),light:_mc(A,'#ffffff',0.2),ink:'#0b0f15',white:'#ffffff',style,dk:true,fg:'#ffffff',mut:'rgba(255,255,255,.72)',line:'rgba(255,255,255,.22)',gold:'#e9c46a'};
  if(style==='chrome'){ P.A=_mc(c1,'#0a0d12',0.55); P.pop='#e9eef5'; P.acc=lum(c1)>0.5?_mc(c1,'#000000',0.3):c1; if(lum(P.acc)<0.06) P.acc=_mc(c2,'#ffffff',0.1); }
  if(style==='news'){ P.dk=false; P.fg='#14110d'; P.mut='rgba(20,17,13,.7)'; P.line='rgba(20,17,13,.55)'; P.paper='#ece4d2'; P.ink='#14110d'; P.pop=lum(c1)>0.45?_mc(c1,'#000000',0.5):c1; P.acc=P.pop; }
  if(k==='hof'){ P.pop='#f1cf74'; if(style==='news') P.pop=_mc('#8a6d1d','#000000',0.1); }
  return P; }
let v1812gNoise=null;
function v1812gGrain(g,W,H,a){ if(!v1812gNoise){ const c=document.createElement('canvas'); c.width=c.height=192; const q=c.getContext('2d'); const d=q.createImageData(192,192); let s=987654321; for(let i=0;i<d.data.length;i+=4){ s=(s*1664525+1013904223)>>>0; const v=(s>>>24); d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } q.putImageData(d,0,0); v1812gNoise=c; }
  g.save(); g.globalAlpha=a; g.globalCompositeOperation='overlay'; g.fillStyle=g.createPattern(v1812gNoise,'repeat'); g.fillRect(0,0,W,H); g.restore(); }
/* a field of halftone dots whose size follows a falloff from (cx,cy): the newsprint look */
function v1812gHalftone(g,W,H,cx,cy,rad,col,sp,maxR,ang){ g.save(); g.fillStyle=col; g.translate(cx,cy); g.rotate(ang||0.5); const n=Math.ceil(rad/sp); for(let i=-n;i<=n;i++) for(let j=-n;j<=n;j++){ const x=i*sp+(j%2?sp/2:0), y=j*sp*0.866; const d=Math.hypot(x,y)/rad; if(d>=1) continue; const r=maxR*(1-d)*(1-d*0.3); if(r<0.5) continue; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); } g.restore(); }
function v1812gRound(g,x,y,w,h,r){ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }

/* ----- text ----- */
function v1812gFont(o,px){ return `${o.italic?'italic ':''}${o.w||800} ${px}px ${o.fam||V1812G_FONT.disp}`; }
function v1812gFit(g,txt,o,px,maxW,min){ let s=px; g.font=v1812gFont(o,s); const ls=o.ls||0; try{ g.letterSpacing=ls+'px'; }catch(e){} while(s>(min||10)&&g.measureText(txt).width>maxW){ s-=Math.max(1,s*0.035); g.font=v1812gFont(o,s); } return s; }
/* o: {px, w, fam, italic, fill, align, base, maxW, min, ls, stroke, sw, alpha, sk (skew), shadow:[col,dx,dy,blur]} */
function v1812gT(g,txt,x,y,o){ txt=String(txt==null?'':txt); g.save(); const ls=o.ls||0; try{ g.letterSpacing=ls+'px'; }catch(e){} let px=o.px||40; if(o.maxW) px=v1812gFit(g,txt,o,px,o.maxW,o.min||10); g.font=v1812gFont(o,px);
  g.textAlign=o.align||'left'; g.textBaseline=o.base||'alphabetic'; if(o.alpha!=null) g.globalAlpha=o.alpha; if(o.sk){ g.translate(x,y); g.transform(1,0,o.sk,1,0,0); x=0; y=0; }
  if(o.shadow){ g.shadowColor=o.shadow[0]; g.shadowOffsetX=o.shadow[1]; g.shadowOffsetY=o.shadow[2]; g.shadowBlur=o.shadow[3]||0; }
  if(o.stroke){ g.lineJoin='round'; g.miterLimit=2; g.lineWidth=o.sw||4; g.strokeStyle=o.stroke; g.strokeText(txt,x,y); g.shadowColor='transparent'; }
  if(o.fill!==null){ g.fillStyle=o.fill||'#fff'; g.fillText(txt,x,y); } g.restore(); return px; }
function v1812gW(g,txt,o,px){ g.save(); try{ g.letterSpacing=(o.ls||0)+'px'; }catch(e){} g.font=v1812gFont(o,px||o.px||40); const w=g.measureText(String(txt)).width; g.restore(); return w; }
/* cap height of the display face (Big Shoulders): ~0.71 em */
const V1812G_CAP=0.71;

/* ----- the three styles ----- */
const V1812G_STYLE={
  varsity:{ bg(g,W,H,P,o){ o=o||{}; const dark=o.dark; g.fillStyle=dark?P.deep:P.A; g.fillRect(0,0,W,H);
      g.save(); g.translate(W*0.5,H*0.5); g.rotate(-0.46); const sw=dark?118:136; for(let i=-16;i<16;i++){ const x=i*sw; if(i%2===0){ g.fillStyle=dark?v1812gRgba(P.A,0.5):v1812gRgba(P.deep,0.38); g.fillRect(x-sw/2,-H*1.4,sw,H*2.8); }
        if(i%4===1){ g.fillStyle=v1812gRgba(P.B,dark?0.34:0.92); g.fillRect(x-sw*0.5-3,-H*1.4,14,H*2.8); g.fillRect(x-sw*0.5+22,-H*1.4,7,H*2.8); } } g.restore();
      let gr=g.createRadialGradient(W*0.7,H*0.32,40,W*0.7,H*0.32,H*0.8); gr.addColorStop(0,'rgba(255,255,255,.2)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H);
      gr=g.createLinearGradient(0,H*0.45,0,H); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.5)'); g.fillStyle=gr; g.fillRect(0,0,W,H);
      gr=g.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.45)'); g.fillStyle=gr; g.fillRect(0,0,W,H); v1812gGrain(g,W,H,0.13); },
    big(g,txt,x,y,px,P,o){ o=o||{}; const f={fam:V1812G_FONT.disp,w:900,px,align:o.align||'left',maxW:o.maxW,min:o.min,ls:o.ls||0}; const sz=o.maxW?v1812gFit(g,txt,f,px,o.maxW,o.min||30):px; const dep=Math.max(5,sz*0.035); g.save();
      for(let i=dep;i>=1;i--) v1812gT(g,txt,x+i*0.9,y+i*1.05,{...f,px:sz,maxW:0,fill:i>dep-1.5?P.ink:_mc(P.A,'#000000',0.55),sk:o.sk===undefined?-0.1:o.sk});
      v1812gT(g,txt,x,y,{...f,px:sz,maxW:0,fill:o.fill||P.pop,stroke:P.ink,sw:Math.max(5,sz*0.018),sk:o.sk===undefined?-0.1:o.sk}); g.restore(); return sz; },
    panel(g,x,y,w,h,P,o){ o=o||{}; g.save(); const gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,v1812gRgba(P.deep,0.94)); gr.addColorStop(1,v1812gRgba('#05070b',0.96)); g.fillStyle=gr; g.shadowColor='rgba(0,0,0,.5)'; g.shadowBlur=24; g.shadowOffsetY=8; v1812gRound(g,x,y,w,h,o.r==null?10:o.r); g.fill(); g.shadowColor='transparent'; g.fillStyle=P.pop; g.fillRect(x,y,w,o.bar==null?7:o.bar); g.restore(); },
    chip(g,txt,x,y,P,o){ o=o||{}; const px=o.px||34; const f={fam:V1812G_FONT.disp,w:800,px,ls:3}; const w=v1812gW(g,txt,f,px)+px*1.3, h=px*1.3; g.save(); g.translate(x,y); g.transform(1,0,-0.2,1,0,0); g.fillStyle=o.bg||P.pop; g.fillRect(0,-h*0.78,w,h); g.restore(); v1812gT(g,txt,x+px*0.62,y-px*0.08,{...f,fill:o.fg||P.ink,sk:-0.2}); return w; },
    num:(P)=>P.pop, soft:(P)=>v1812gRgba('#ffffff',0.1) },
  chrome:{ bg(g,W,H,P,o){ o=o||{}; let gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#0b0e13'); gr.addColorStop(0.55,'#151a22'); gr.addColorStop(1,'#07090c'); g.fillStyle=gr; g.fillRect(0,0,W,H);
      gr=g.createRadialGradient(W*0.62,H*0.42,10,W*0.62,H*0.42,H*0.72); gr.addColorStop(0,v1812gRgba(P.acc,0.62)); gr.addColorStop(0.5,v1812gRgba(P.acc,0.2)); gr.addColorStop(1,v1812gRgba(P.acc,0)); g.fillStyle=gr; g.fillRect(0,0,W,H);
      g.save(); g.translate(W*0.5,H*0.5); g.rotate(-0.5); for(let i=-9;i<10;i++){ const x=i*150+((i*53)%40); const a=0.05+((i*37)%5)*0.018; const lg=g.createLinearGradient(0,-H,0,H); lg.addColorStop(0,'rgba(255,255,255,0)'); lg.addColorStop(0.5,`rgba(220,235,255,${a})`); lg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=lg; g.fillRect(x,-H,i%3===0?5:2,H*2); } g.restore();
      g.save(); gr=g.createLinearGradient(0,H*0.72,0,H); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(1,'rgba(180,200,225,.12)'); g.fillStyle=gr; g.fillRect(0,H*0.72,W,H*0.28); g.restore();
      gr=g.createRadialGradient(W/2,H/2,H*0.4,W/2,H/2,H*0.9); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.6)'); g.fillStyle=gr; g.fillRect(0,0,W,H); v1812gGrain(g,W,H,0.1); },
    big(g,txt,x,y,px,P,o){ o=o||{}; const f={fam:V1812G_FONT.disp,w:900,px,align:o.align||'left',maxW:o.maxW,min:o.min,ls:o.ls||0}; const sz=o.maxW?v1812gFit(g,txt,f,px,o.maxW,o.min||30):px; const cap=sz*V1812G_CAP; const wd=v1812gW(g,txt,{...f},sz);
      const x0=f.align==='center'?x-wd/2:f.align==='right'?x-wd:x; const gr=g.createLinearGradient(0,y-cap,0,y); const k=o.tint||'#ffffff'; gr.addColorStop(0,'#fdfeff'); gr.addColorStop(0.36,'#b9c6d6'); gr.addColorStop(0.5,'#6b7787'); gr.addColorStop(0.53,'#e9f1fa'); gr.addColorStop(0.78,'#a9b6c6'); gr.addColorStop(1,'#eef4fb');
      g.save(); v1812gT(g,txt,x,y,{...f,px:sz,maxW:0,fill:null,stroke:'rgba(0,0,0,.9)',sw:Math.max(8,sz*0.045),shadow:['rgba(0,0,0,.65)',0,sz*0.03,sz*0.06]}); v1812gT(g,txt,x,y,{...f,px:sz,maxW:0,fill:gr,stroke:'#0b0e13',sw:Math.max(3,sz*0.014)}); g.globalCompositeOperation='lighter'; v1812gT(g,txt,x,y-sz*0.012,{...f,px:sz,maxW:0,fill:null,stroke:v1812gRgba(P.acc,0.55),sw:2});
      g.restore(); return sz; },
    panel(g,x,y,w,h,P,o){ o=o||{}; g.save(); let gr=g.createLinearGradient(0,y,0,y+h); gr.addColorStop(0,'rgba(34,40,50,.92)'); gr.addColorStop(1,'rgba(10,12,16,.96)'); g.fillStyle=gr; g.shadowColor='rgba(0,0,0,.6)'; g.shadowBlur=26; g.shadowOffsetY=8; v1812gRound(g,x,y,w,h,o.r==null?14:o.r); g.fill(); g.shadowColor='transparent';
      gr=g.createLinearGradient(x,y,x+w,y+h); gr.addColorStop(0,'rgba(255,255,255,.75)'); gr.addColorStop(0.3,'rgba(120,135,155,.45)'); gr.addColorStop(0.7,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(90,104,122,.4)'); g.strokeStyle=gr; g.lineWidth=3; v1812gRound(g,x+1.5,y+1.5,w-3,h-3,o.r==null?14:o.r); g.stroke();
      gr=g.createLinearGradient(0,y,0,y+h*0.5); gr.addColorStop(0,'rgba(255,255,255,.12)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; v1812gRound(g,x,y,w,h*0.5,o.r==null?14:o.r); g.fill(); g.restore(); },
    chip(g,txt,x,y,P,o){ o=o||{}; const px=o.px||32; const f={fam:V1812G_FONT.disp,w:800,px,ls:4}; const w=v1812gW(g,txt,f,px)+px*1.4, h=px*1.35; g.save(); const gr=g.createLinearGradient(0,y-h*0.78,0,y+h*0.22); gr.addColorStop(0,'#f2f6fb'); gr.addColorStop(0.5,'#9aa8b9'); gr.addColorStop(1,'#dfe7f0'); g.fillStyle=o.bg||gr; v1812gRound(g,x,y-h*0.78,w,h,h*0.2); g.fill(); g.restore(); v1812gT(g,txt,x+px*0.7,y-px*0.1,{...f,fill:o.fg||'#0b0e13'}); return w; },
    num:(P)=>'#e9eef5', soft:(P)=>'rgba(190,210,235,.12)' },
  news:{ bg(g,W,H,P,o){ o=o||{}; let gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#f1e9d6'); gr.addColorStop(1,'#e2d9c2'); g.fillStyle=gr; g.fillRect(0,0,W,H);
      v1812gHalftone(g,W,H,W*0.78,H*0.34,H*0.78,v1812gRgba(P.pop,0.22),16,7.2,0.52); v1812gHalftone(g,W,H,W*0.08,H*0.98,H*0.5,'rgba(20,17,13,.14)',14,5.4,0.3);
      g.save(); g.globalAlpha=0.5; g.strokeStyle='rgba(60,45,20,.07)'; g.lineWidth=1; let s=77; for(let i=0;i<900;i++){ s=(s*1664525+1013904223)>>>0; const x=(s%W), y=((s>>>10)%H), l=6+((s>>>20)%18); g.beginPath(); g.moveTo(x,y); g.lineTo(x+l,y+((s>>>5)%7)-3); g.stroke(); } g.restore();
      v1812gGrain(g,W,H,0.28); gr=g.createRadialGradient(W/2,H/2,H*0.5,W/2,H/2,H*0.95); gr.addColorStop(0,'rgba(80,55,20,0)'); gr.addColorStop(1,'rgba(80,55,20,.22)'); g.fillStyle=gr; g.fillRect(0,0,W,H); },
    big(g,txt,x,y,px,P,o){ o=o||{}; const f={fam:V1812G_FONT.serif,w:400,px,align:o.align||'left',maxW:o.maxW,min:o.min,ls:o.ls||-2}; const sz=o.maxW?v1812gFit(g,txt,f,px,o.maxW,o.min||30):px; g.save();
      v1812gT(g,txt,x+sz*0.022,y+sz*0.022,{...f,px:sz,maxW:0,fill:v1812gRgba(P.pop,0.9)}); v1812gT(g,txt,x,y,{...f,px:sz,maxW:0,fill:'#14110d'}); g.restore(); return sz; },
    panel(g,x,y,w,h,P,o){ o=o||{}; g.save(); g.fillStyle='rgba(247,241,226,.92)'; g.shadowColor='rgba(40,28,10,.35)'; g.shadowBlur=0; g.shadowOffsetX=7; g.shadowOffsetY=7; g.fillRect(x,y,w,h); g.shadowColor='transparent'; g.strokeStyle='#14110d'; g.lineWidth=4; g.strokeRect(x+2,y+2,w-4,h-4); g.lineWidth=1.5; g.strokeRect(x+9,y+9,w-18,h-18); g.restore(); },
    chip(g,txt,x,y,P,o){ o=o||{}; const px=o.px||30; const f={fam:V1812G_FONT.disp,w:800,px,ls:3}; const w=v1812gW(g,txt,f,px)+px*1.2, h=px*1.3; g.save(); g.fillStyle=o.bg||'#14110d'; g.fillRect(x,y-h*0.78,w,h); g.restore(); v1812gT(g,txt,x+px*0.6,y-px*0.08,{...f,fill:o.fg||'#efe7d6'}); return w; },
    num:(P)=>'#14110d', soft:(P)=>'rgba(20,17,13,.06)' }};
function v1812gStyle(k){ return V1812G_STYLE[k]||V1812G_STYLE.varsity; }

/* ----- small pieces shared by the templates ----- */
function v1812gBall(g,x,y,r,col){ g.save(); g.translate(x,y); g.fillStyle=col||'#ffffff'; g.beginPath(); g.arc(0,0,r,0,6.2832); g.fill(); g.fillStyle=col==='#14110d'?'#efe7d6':'#14110d'; g.beginPath(); for(let i=0;i<5;i++){ const a=-1.5708+i*1.2566; g.lineTo(Math.cos(a)*r*0.42,Math.sin(a)*r*0.42); } g.closePath(); g.fill(); g.strokeStyle=g.fillStyle; g.lineWidth=Math.max(1.5,r*0.1); for(let i=0;i<5;i++){ const a=-1.5708+i*1.2566; g.beginPath(); g.moveTo(Math.cos(a)*r*0.42,Math.sin(a)*r*0.42); g.lineTo(Math.cos(a)*r*0.92,Math.sin(a)*r*0.92); g.stroke(); } g.restore(); }
function v1812gDrawImg(g,im,x,y,w,h){ if(!im) return false; try{ g.drawImage(im,x,y,w,h); return true; }catch(e){ return false; } }
/* a mascot-less crest: the school's initial on a shield, for when the SVG could not load */
function v1812gShield(g,sch,im,x,y,w,P){ const h=w*1.15; if(im){ v1812gDrawImg(g,im,x,y,w,h); return; } g.save(); g.fillStyle=sch.c1; g.beginPath(); g.moveTo(x+w/2,y); g.lineTo(x+w,y+h*0.12); g.lineTo(x+w,y+h*0.5); g.quadraticCurveTo(x+w,y+h*0.85,x+w/2,y+h); g.quadraticCurveTo(x,y+h*0.85,x,y+h*0.5); g.lineTo(x,y+h*0.12); g.closePath(); g.fill(); g.lineWidth=w*0.05; g.strokeStyle=sch.c2; g.stroke(); v1812gT(g,(sch.town||'?')[0],x+w/2,y+h*0.68,{px:w*0.6,fill:sch.c2,align:'center'}); g.restore(); }
/* put a cutout on the poster: ground shadow, a soft backlight, the figure, a thin rim light on one edge */
function v1812gSil(cut,col){ const c=document.createElement('canvas'); c.width=cut.cv.width; c.height=cut.cv.height; const q=c.getContext('2d'); q.drawImage(cut.cv,0,0); q.globalCompositeOperation='source-in'; q.fillStyle=col; q.fillRect(0,0,c.width,c.height); return c; }
function v1812gPlace(g,cut,cx,feetY,P,o){ o=o||{}; if(!cut||!cut.cv) return {x:cx,y:feetY}; const x=Math.round(cx-cut.feet[0]), y=Math.round(feetY-cut.feet[1]); const OFF=6000; const th=cut.th;
  if(o.shadow!==false){ g.save(); const sw=th*(o.shadowW||0.3), sh=sw*0.17; g.translate(cx+th*0.03,feetY+th*0.004); g.scale(1,sh/sw); const rg=g.createRadialGradient(0,0,0,0,0,sw); rg.addColorStop(0,'rgba(0,0,0,.62)'); rg.addColorStop(0.55,'rgba(0,0,0,.3)'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.beginPath(); g.arc(0,0,sw,0,6.2832); g.fill(); g.restore(); }
  if(o.halo){ g.save(); g.globalAlpha=o.haloA==null?0.8:o.haloA; g.shadowColor=o.halo; g.shadowBlur=o.haloBlur||46; g.shadowOffsetX=OFF; g.shadowOffsetY=0; g.drawImage(cut.cv,x-OFF,y); g.restore(); }
  if(o.sticker){ g.save(); g.shadowColor=o.sticker; g.shadowBlur=0; g.shadowOffsetY=0; const r=o.stickerR||6; for(let a=0;a<12;a++){ g.shadowOffsetX=OFF+Math.cos(a*0.5236)*r; g.shadowOffsetY=Math.sin(a*0.5236)*r; g.drawImage(cut.cv,x-OFF,y); } g.restore(); }
  if(o.drop){ g.save(); g.shadowColor=o.drop; g.shadowBlur=o.dropBlur||30; g.shadowOffsetX=OFF; g.shadowOffsetY=0; g.drawImage(cut.cv,x-OFF,y+(o.dropY||14)); g.restore(); }
  g.drawImage(cut.cv,x,y);
  if(o.rim){ try{ const w=cut.cv.width, h=cut.cv.height; const t=document.createElement('canvas'); t.width=w; t.height=h; const q=t.getContext('2d'); q.drawImage(cut.cv,0,0); q.globalCompositeOperation='destination-out'; const d=Math.max(4,th/150); q.drawImage(cut.cv,-d*(o.rimDir||1),d*0.4); q.globalCompositeOperation='source-in'; q.fillStyle=o.rim; q.fillRect(0,0,w,h); g.save(); g.globalAlpha=o.rimA==null?0.85:o.rimA; g.globalCompositeOperation='lighter'; g.drawImage(t,x,y); g.restore(); }catch(e){} }
  return {x,y}; }

/* ===================== poster engine: the six layouts ===================== */
const V1812G_TPL={};
const v1812gUp=s=>String(s==null?'':s).toUpperCase();
function v1812gHead(g,W,M,P,right,o){ o=o||{}; const y=o.y||82; const rf={px:27,w:700,fam:V1812G_FONT.body,ls:5}; const rt=right?v1812gUp(right):''; const rw=rt?Math.min(420,v1812gW(g,rt,rf,27)):0;
  v1812gT(g,v1812gUp(`${M.town} ${M.mascot}`)+(rw>330?'':' · VARSITY SOCCER'),70,y,{...rf,fill:P.fg,alpha:0.92,maxW:W-140-rw-(rw?36:0),min:16}); if(rt) v1812gT(g,rt,W-70,y,{...rf,fill:P.fg,alpha:0.92,align:'right',maxW:420,min:16}); }
function v1812gFoot(g,W,H,M,P){ v1812gT(g,'TOUCHLINE · VARSITY SOCCER MANAGER',W/2,H-26,{px:19,w:700,fam:V1812G_FONT.mono,ls:4,fill:P.fg,alpha:0.4,align:'center'}); }
/* rim-light and halo colours per style for a cutout */
function v1812gFx(P,S,o){ o=o||{}; if(P.style==='chrome') return {halo:v1812gRgba(P.acc,0.9),haloBlur:60,haloA:0.7,rim:'rgba(210,230,255,.9)',rimA:0.8,drop:'rgba(0,0,0,.5)',dropBlur:24};
  if(P.style==='news') return {sticker:'#efe7d6',stickerR:7,drop:'rgba(20,17,13,.5)',dropBlur:0,dropY:10,rim:'rgba(255,255,255,.55)',rimA:0.5,shadowW:0.26};
  return {halo:v1812gRgba(P.pop,0.5),haloBlur:50,haloA:0.55,rim:v1812gRgba(P.pop,0.95),rimA:0.8,drop:'rgba(0,0,0,.45)',dropBlur:26}; }
function v1812gPoseName(M,o){ const set=M.poseSet&&M.poseSet.length?M.poseSet:['hips']; return set[(((o&&o.pose)||0)%set.length+set.length)%set.length]; }
function v1812gStatLine(pm){ if(!pm) return ''; const out=[]; if(pm.g) out.push(`${pm.g} goal${pm.g===1?'':'s'}`); if(pm.a) out.push(`${pm.a} assist${pm.a===1?'':'s'}`); if(pm.sv) out.push(`${pm.sv} save${pm.sv===1?'':'s'}`); if(pm.sh&&pm.g!==undefined&&!pm.sv) out.push(`${pm.sh} shot${pm.sh===1?'':'s'}`); if(pm.tk&&out.length<2) out.push(`${pm.tk} tackles`); out.push(`${Number(pm.rt||0).toFixed(1)} rating`); return out.slice(0,4).join(' · '); }
function v1812gWho(star){ return star?`#${star.num==null?'':star.num} ${v1812gUp(star.nm)}`:''; }

/* a headline whose cap top sits at y (the faces differ in cap height); returns {sz, base, cap, w} */
function v1812gBigAt(g,S,P,txt,x,top,px,o){ o=o||{}; const news=P.style==='news'; const f={fam:news?V1812G_FONT.serif:V1812G_FONT.disp,w:news?400:900,ls:news?-2:0}; let sz=px; if(o.maxW) sz=v1812gFit(g,txt,{...f,px},px,o.maxW,o.min||30);
  g.save(); g.font=v1812gFont(f,100); const asc=(g.measureText('H').actualBoundingBoxAscent||71)/100; g.restore(); const base=top+sz*asc; S.big(g,txt,x,base,sz,P,{...o,maxW:0}); return {sz,base,cap:sz*asc,w:v1812gW(g,txt,f,sz)}; }

/* ---------- GAMEDAY ---------- */
V1812G_TPL.gameday={ async load(M,W,H,P,o){ const sq=H<1300; const th=sq?600:800; const A={sq,th}; A.cU=await v1812gCrest(M.sch,300); A.cO=M.opp?await v1812gCrest(M.opp,300):null;
    A.cut=M.star?await v1812gCutout(M.star,o.poseName,th,{mirror:o.mirror,no3d:o.quick}):null; return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; const bh=sq?250:300, by=H-bh; S.bg(g,W,H,P,{});
    v1812gHead(g,W,M,P,`${M.round} · Section ${M.sec}`);
    const hp=sq?340:468; const r1=v1812gBigAt(g,S,P,'GAME',58,sq?104:126,hp,{maxW:930}); v1812gBigAt(g,S,P,'DAY',58,r1.base+(sq?22:30),r1.sz,{maxW:760});
    if(A.cut){ const cx=W*(M.pose==='shot'?0.7:0.72); v1812gPlace(g,A.cut,cx,by+4,P,v1812gFx(P,S)); }
    S.panel(g,0,by,W,bh+2,P,{r:0,bar:9});
    const cw=sq?150:176, cy=by+(bh-cw*1.15)/2+4; v1812gShield(g,M.sch,A.cU,52,cy,cw,P); if(M.opp) v1812gShield(g,M.opp,A.cO,W-52-cw,cy,cw,P);
    const mx=W/2, mw=W-2*(52+cw+30);
    v1812gT(g,M.home?'VS':'AT',mx,by+(sq?64:78),{px:sq?30:36,w:800,ls:10,fill:P.dk?P.pop:P.pop,align:'center'});
    v1812gT(g,v1812gUp(M.opp?M.opp.town:'TBA'),mx,by+(sq?138:166),{px:sq?96:112,w:900,fill:P.fg,align:'center',maxW:mw,min:44});
    v1812gT(g,`${M.day} · ${M.time}${M.ven?' · '+v1812gUp(M.ven):''}`,mx,by+(sq?190:228),{px:sq?25:30,w:700,fam:V1812G_FONT.body,ls:3,fill:P.mut,align:'center',maxW:mw,min:16});
    let tx=58; const ty=by-(sq?20:26); for(const t of (M.tags||[])){ tx+=S.chip(g,t,tx,ty,P,{px:sq?30:36})+14; if(tx>W-200) break; }
    v1812gFoot(g,W,H,M,P); } };

/* ---------- FINAL ---------- */
V1812G_TPL.final={ async load(M,W,H,P,o){ const sq=H<1300; const A={sq}; A.cU=await v1812gCrest(M.sch,300); A.cO=M.opp?await v1812gCrest(M.opp,300):null;
    A.bust=M.star?await v1812gCutout(M.star,'bust',sq?560:640,{mirror:o.mirror,no3d:o.quick}):null; A.por=A.bust?null:await v1812gPortrait(M.star,M.sch,220); return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; S.bg(g,W,H,P,{dark:true}); const res=M.res;
    const wmc=P.dk?'rgba(255,255,255,.075)':'rgba(20,17,13,.07)'; v1812gT(g,res,W/2+8,sq?820:1000,{px:sq?1000:1280,w:900,fill:wmc,align:'center'});
    v1812gT(g,'FINAL',70,sq?118:128,{px:sq?86:100,w:900,ls:14,fill:P.pop}); v1812gT(g,v1812gUp(`${M.town} ${M.yr} · Section ${M.sec}`),70,sq?160:176,{px:26,w:700,fam:V1812G_FONT.body,ls:5,fill:P.mut,maxW:640});
    v1812gT(g,v1812gUp(M.round),W-70,sq?118:128,{px:sq?50:58,w:800,ls:3,fill:P.fg,align:'right',maxW:420}); v1812gT(g,M.et?'AFTER EXTRA TIME':M.pk?'DECIDED ON PENALTIES':'VARSITY',W-70,sq?160:176,{px:26,w:700,fam:V1812G_FONT.body,ls:5,fill:P.mut,align:'right'});
    const cw=sq?170:196, cy=sq?210:250; v1812gShield(g,M.sch,A.cU,44,cy,cw,P); if(M.opp) v1812gShield(g,M.opp,A.cO,W-44-cw,cy,cw,P);
    v1812gT(g,v1812gUp(M.town),44+cw/2,cy+cw*1.15+(sq?48:58),{px:sq?42:50,w:800,fill:P.fg,align:'center',maxW:cw+40,min:22}); v1812gT(g,v1812gUp(M.opp?M.opp.town:''),W-44-cw/2,cy+cw*1.15+(sq?48:58),{px:sq?42:50,w:800,fill:P.fg,align:'center',maxW:cw+40,min:22});
    /* the score: two giant numerals with a bar between them */
    const sp=sq?400:500; const f={fam:V1812G_FONT.disp,w:900}; const a=String(M.us), b=String(M.th); const aw=v1812gW(g,a,f,sp), bw=v1812gW(g,b,f,sp); let gap=sq?96:116; let tot=aw+bw+gap; let sz=sp; const room=W-2*(44+cw+22); if(tot>room){ sz=sp*room/tot; }
    const aw2=v1812gW(g,a,f,sz), bw2=v1812gW(g,b,f,sz); gap=gap*sz/sp; const x0=W/2-(aw2+bw2+gap)/2; const cap=sz*V1812G_CAP; const base=cy+(sq?185:215)+cap*0.5;
    S.big(g,a,x0,base,sz,P,{fill:P.dk?'#ffffff':'#14110d',sk:-0.08}); S.big(g,b,x0+aw2+gap,base,sz,P,{fill:P.dk?'#ffffff':'#14110d',sk:-0.08});
    g.save(); g.fillStyle=P.pop; g.strokeStyle=P.dk?'#05070b':'#14110d'; g.lineWidth=5; v1812gRound(g,x0+aw2+gap*0.2,base-cap*0.5-13*sz/sp,gap*0.6,26*sz/sp+6,8); g.fill(); g.stroke(); g.restore();
    const chipTxt=M.pk?`${res==='W'?'WIN':res==='L'?'LOSS':'DRAW'} · ${M.pk[0]}–${M.pk[1]} ON PENS`:res==='W'?'VICTORY':res==='L'?'DEFEAT':'DRAW'; const cwid=v1812gW(g,chipTxt,{fam:V1812G_FONT.disp,w:800,ls:4},sq?34:40)+60; S.chip(g,chipTxt,W/2-cwid/2,base+(sq?60:74),P,{px:sq?34:40,bg:res==='W'?(P.style==='news'?'#14110d':P.pop):res==='L'?'#b3363c':'#5b6573',fg:res==='W'?(P.style==='news'?'#efe7d6':P.ink):'#ffffff'});
    /* scorers */
    const sy=sq?(base+150):(base+200); const col=(arr,x,al,name)=>{ v1812gT(g,v1812gUp(name),x,sy,{px:26,w:700,fam:V1812G_FONT.body,ls:5,fill:P.pop,align:al,maxW:430});
      const by={}; const order=[]; for(const s of arr){ if(!by[s[1]]){ by[s[1]]=[]; order.push(s[1]); } by[s[1]].push(s[2]+"'"+(s[3]?' (P)':'')); } const lines=order.map(n=>[n,by[n].join(', ')]); const max=sq?3:6; let y=sy+(sq?46:56); let shown=0;
      for(const [n,m] of lines){ if(shown>=max){ v1812gT(g,`+${lines.length-shown} more`,x,y,{px:28,w:600,fam:V1812G_FONT.body,fill:P.mut,align:al}); break; } const txt=`${n} ${m}`; const pxs=sq?34:40; const tw=Math.min(430,v1812gW(g,txt,{fam:V1812G_FONT.body,w:700},pxs)); const bx=al==='left'?x:x-tw-pxs*1.05;
        v1812gBall(g,al==='left'?x+pxs*0.4:x-pxs*0.4,y-pxs*0.3,pxs*0.4,P.dk?'#ffffff':'#14110d'); v1812gT(g,n,al==='left'?x+pxs*1.05:x-pxs*1.05,y,{px:pxs,w:800,fam:V1812G_FONT.disp,fill:P.fg,align:al,ls:1}); const nw=v1812gW(g,n,{fam:V1812G_FONT.disp,w:800,ls:1},pxs);
        v1812gT(g,m,al==='left'?x+pxs*1.05+nw+10:x-pxs*1.05-nw-10,y,{px:pxs*0.78,w:600,fam:V1812G_FONT.body,fill:P.mut,align:al}); y+=pxs*1.38; shown++; }
      if(!lines.length) v1812gT(g,'—',x,y,{px:36,w:700,fill:P.mut,align:al}); };
    col(M.sc.filter(s=>s[0]===0),60,'left',M.town); col(M.sc.filter(s=>s[0]===1),W-60,'right',M.opp?M.opp.town:'');
    /* player of the match */
    const ph=sq?190:232, py=H-ph-(sq?46:62); S.panel(g,50,py,W-100,ph,P,{r:12}); const pm=M.pm;
    if(pm){ const bx=58, bw=sq?190:226; if(A.bust){ const sc=ph*1.04/A.bust.cv.height; g.save(); g.beginPath(); g.rect(54,py-(sq?16:30),bw+12,ph+(sq?16:30)); g.clip(); const bh2=A.bust.cv.height*sc, bw2=A.bust.cv.width*sc; g.drawImage(A.bust.cv,bx+bw/2-bw2/2,py+ph-bh2+4,bw2,bh2); g.restore(); } else if(A.por){ v1812gDrawImg(g,A.por,bx,py+10,ph-20,ph-20); }
      const tx=bx+bw+26; v1812gT(g,'PLAYER OF THE MATCH',tx,py+(sq?44:56),{px:25,w:700,fam:V1812G_FONT.mono,ls:4,fill:P.pop,maxW:W-tx-80}); v1812gT(g,v1812gUp(pm.nm),tx,py+(sq?112:136),{px:sq?76:92,w:900,fill:P.fg,maxW:W-tx-80,min:36});
      v1812gT(g,v1812gStatLine(pm),tx,py+(sq?160:196),{px:sq?29:34,w:600,fam:V1812G_FONT.body,fill:P.mut,maxW:W-tx-80,min:18}); }
    else v1812gT(g,v1812gUp(M.town)+' '+M.res,W/2,py+ph/2+16,{px:56,w:800,fill:P.fg,align:'center'});
    v1812gFoot(g,W,H,M,P); } };

/* ---------- MILESTONE ---------- */
V1812G_TPL.milestone={ async load(M,W,H,P,o){ const sq=H<1300; const th=sq?640:860; const A={sq,th}; A.cut=M.star?await v1812gCutout(M.star,o.poseName,th,{mirror:o.mirror,no3d:o.quick}):null; A.cU=await v1812gCrest(M.sch,200); return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; const ms=M.ms||{}; S.bg(g,W,H,P,{}); v1812gHead(g,W,M,P,M.f?v1812gRoundName(M.f):`${M.yr}`);
    const num=String(ms.kind==='hat'?(ms.v>=4?ms.v:3):ms.kind==='first'?1:ms.v); const np=num.length===1?(sq?1000:1250):sq?700:820; const cap0=np*V1812G_CAP; 
    const nf={fam:V1812G_FONT.disp,w:900,ls:0}; let sz=np; const nw=v1812gW(g,num,nf,sz); if(nw>W-120) sz=np*(W-120)/nw; g.save(); g.font=v1812gFont(nf,100); const asc=(g.measureText(num).actualBoundingBoxAscent||78)/100; g.restore(); const capn=sz*asc; const base=(sq?150:176)+capn;
    g.save(); g.textAlign='center'; g.font=v1812gFont(nf,sz); const base0=base; const col=P.style==='chrome'?'#dfe8f3':P.style==='news'?'#14110d':P.pop;
    v1812gT(g,num,W/2+10,base+10,{...nf,px:sz,align:'center',fill:P.style==='news'?'rgba(20,17,13,.07)':'rgba(255,255,255,.07)',sk:-0.06});
    v1812gT(g,num,W/2,base,{...nf,px:sz,align:'center',fill:P.style==='chrome'?v1812gRgba(P.acc,0.34):v1812gRgba(col,P.style==='news'?0.12:0.28),stroke:col,sw:Math.max(8,sz*0.018),sk:-0.06,shadow:P.style==='news'?null:[v1812gRgba(col,0.55),0,0,28]});
    g.restore();
    const bh=sq?236:290, by=H-bh; if(A.cut) v1812gPlace(g,A.cut,W/2+(M.pose==='backflip'?0:12),by+8,P,v1812gFx(P,S));
    S.panel(g,0,by,W,bh+2,P,{r:0,bar:9}); S.chip(g,'MILESTONE',58,by-(sq?18:24),P,{px:sq?32:38});
    const unit=ms.unit||'MILESTONE'; const head=ms.kind==='hat'?(ms.v>=4?`${ms.v} GOALS IN ONE GAME`:'HAT TRICK'):ms.kind==='first'?'FIRST CAREER GOAL':`${ms.v} ${unit.replace(/^CAREER /,'CAREER ')}`;
    v1812gT(g,head,58,by+(sq?100:122),{px:sq?92:112,w:900,fill:P.fg,maxW:W-116-(sq?120:150),min:40});
    let sub=M.star?v1812gWho(M.star):''; let tail='';
    if(ms.kind==='goals'||ms.kind==='ast'||ms.kind==='cs') tail=ms.first?'FIRST IN SCHOOL HISTORY':ms.most?'MOST IN SCHOOL HISTORY':v1812gUp(M.town)+' VARSITY';
    else if(ms.kind==='hat'||ms.kind==='first') tail=M.f?v1812gUp(v1812gVs(M)):v1812gUp(M.town)+' VARSITY';
    if(ms.kind==='wins'){ sub=`COACH ${v1812gUp(ms.coach||'')} · ${v1812gUp(M.town)} VARSITY`; if(M.star) sub+=` · ${v1812gUp(M.star.nm)} PLAYER OF THE MATCH`; } else if(tail) sub+=` · ${tail}`;
    v1812gT(g,sub,60,by+(sq?156:190),{px:sq?29:34,w:700,fam:V1812G_FONT.body,ls:2,fill:P.mut,maxW:W-120-(sq?120:150),min:16});
    v1812gShield(g,M.sch,A.cU,W-58-(sq?100:124),by+(sq?64:78),sq?100:124,P);
    v1812gFoot(g,W,H,M,P); } };
function v1812gVs(M){ if(!M.f||!M.opp) return ''; const r=M.res?`${M.res} ${M.us}–${M.th} `:''; return `${r}${M.f.h===M.u?'vs':'at'} ${M.opp.town}`; }

/* ---------- PLAYER OF THE WEEK ---------- */
V1812G_TPL.potw={ async load(M,W,H,P,o){ const sq=H<1300; const th=sq?640:840; const A={sq,th}; A.cut=M.star?await v1812gCutout(M.star,o.poseName,th,{mirror:o.mirror,no3d:o.quick}):null; A.cU=await v1812gCrest(M.sch,200); return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; const pw=M.pw||{}; S.bg(g,W,H,P,{}); v1812gHead(g,W,M,P,`Week ${pw.wkn||''} · Section ${M.sec}`);
    const bh=sq?292:372, by=H-bh; const r1=v1812gBigAt(g,S,P,'PLAYER',58,sq?108:128,sq?250:300,{maxW:sq?560:600}); const r2=v1812gBigAt(g,S,P,'OF THE',60,r1.base+(sq?24:34),sq?96:116,{fill:P.fg,maxW:420}); v1812gBigAt(g,S,P,'WEEK',58,r2.base+(sq?26:36),sq?220:300,{maxW:sq?560:600});
    if(A.cut) v1812gPlace(g,A.cut,W*0.77,by+4,P,v1812gFx(P,S));
    S.panel(g,0,by,W,bh+2,P,{r:0,bar:9}); const st=M.star; v1812gShield(g,M.sch,A.cU,W-58-(sq?96:124),by+(sq?44:56),sq?96:124,P);
    v1812gT(g,v1812gUp(st?st.nm:'—'),58,by+(sq?92:112),{px:sq?84:104,w:900,fill:P.fg,maxW:W-116-(sq?120:160),min:40}); v1812gT(g,st?`#${st.num} · ${st.pos}${pw.lg?' · NAMED BY THE '+v1812gUp(M.town)+' COURIER':' · '+v1812gUp(M.town)+' VARSITY'}`:'',60,by+(sq?132:164),{px:sq?24:28,w:700,fam:V1812G_FONT.body,ls:3,fill:P.pop,maxW:W-120-(sq?120:160),min:14});
    const gk=st&&st.gk; const tiles=gk?[['RATING',Number(pw.rt||0).toFixed(1)],['SAVES',pw.sv||0],['GOALS',pw.g||0],['ASSISTS',pw.a||0]]:pw.role&&/CB|LB|RB|DM|WB|SW/.test(pw.role)?[['RATING',Number(pw.rt||0).toFixed(1)],['TACKLES',pw.tk||0],['GOALS',pw.g||0],['ASSISTS',pw.a||0]]:[['RATING',Number(pw.rt||0).toFixed(1)],['GOALS',pw.g||0],['ASSISTS',pw.a||0],['SHOTS',pw.sh||0]];
    const tw=(W-116-18*3)/4, ty=by+(sq?178:226), th2=sq?70:84; tiles.forEach((t,i)=>{ const x=58+i*(tw+18); g.save(); g.fillStyle=P.style==='news'?'rgba(20,17,13,.08)':'rgba(255,255,255,.1)'; v1812gRound(g,x,ty,tw,th2,8); g.fill(); g.restore(); v1812gT(g,String(t[1]),x+16,ty+th2*0.78,{px:th2*0.74,w:900,fill:i===0?P.pop:P.fg}); v1812gT(g,t[0],x+tw-14,ty+th2*0.7,{px:sq?19:22,w:700,fam:V1812G_FONT.mono,ls:2,fill:P.mut,align:'right'}); });
    if(M.f&&M.opp) v1812gT(g,v1812gUp(v1812gVs(M)),60,by+(sq?166:204),{px:sq?22:27,w:700,fam:V1812G_FONT.body,ls:4,fill:P.mut,maxW:W-120});
    v1812gFoot(g,W,H,M,P); } };

/* ---------- SENIOR NIGHT ---------- */
V1812G_TPL.senior={ async load(M,W,H,P,o){ const sq=H<1300; const th=sq?600:780; const A={sq,th}; A.cut=M.star?await v1812gCutout(M.star,o.poseName,th,{mirror:o.mirror,no3d:o.quick}):null; A.cU=await v1812gCrest(M.sch,200); A.shirt=await v1812gImg('shirt|'+M.sch.c1+M.sch.c2+'|'+(M.star?M.star.num:0),()=>svgImg(shirtSVG(M.sch.c1,M.sch.c2,String(M.star?M.star.num:''),400).replace('class="shirt"','class="shirt"'),400)); return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; S.bg(g,W,H,P,{}); v1812gHead(g,W,M,P,M.f?v1812gUp(v1812gVs(M).replace(/^[WLD] \d+–\d+ /,'')):'');
    const r1=v1812gBigAt(g,S,P,'SENIOR',58,sq?104:126,sq?300:340,{maxW:sq?560:620}); v1812gBigAt(g,S,P,'NIGHT',58,r1.base+(sq?22:30),r1.sz,{maxW:560});
    const nl=M.seniors.length; const rows=sq?3:7, cols=Math.max(1,Math.ceil(nl/rows)); const lh=sq?44:52; const ph=Math.min(sq?250:460,28+Math.ceil(nl/cols)*lh+(sq?60:84)); const by=H-ph-(sq?50:70);
    const fy=by-(A.th*0.78)-6;
    if(A.cut){ const px=v1812gPlace(g,A.cut,W*0.745,by+6,P,v1812gFx(P,S)); const hnd=A.cut.pts&&A.cut.pts.hand0&&A.cut.pts.hand1?[(A.cut.pts.hand0[0]+A.cut.pts.hand1[0])/2,(A.cut.pts.hand0[1]+A.cut.pts.hand1[1])/2]:[A.cut.feet[0],A.cut.feet[1]-A.th*0.6];
      const fw=sq?230:290, fh=fw*1.22, fx=px.x+hnd[0]-fw/2, fy2=px.y+hnd[1]-fh*0.46; v1812gPicFrame(g,fx,fy2,fw,fh,M,P,A,o); }
    else v1812gPicFrame(g,W*0.5-165,fy,330,400,M,P,A,o);
    S.panel(g,40,by,W-80,ph,P,{r:12}); v1812gT(g,v1812gUp(`${M.town} · ${nl} SENIOR${nl===1?'':'S'} · CLASS OF ${M.yr}`),70,by+(sq?42:56),{px:sq?24:28,w:700,fam:V1812G_FONT.mono,ls:4,fill:P.pop,maxW:W-140});
    const cw=(W-140)/cols; M.seniors.forEach((s,i)=>{ const c=Math.floor(i/Math.ceil(nl/cols)), r=i%Math.ceil(nl/cols); const x=70+c*cw, yy=by+(sq?90:118)+r*lh; const nw=v1812gW(g,'#'+s.num,{fam:V1812G_FONT.disp,w:900,ls:1},lh*0.78); v1812gT(g,'#'+s.num,x,yy,{px:lh*0.78,w:900,fill:P.pop,ls:1}); v1812gT(g,v1812gUp(s.nm),x+nw+14,yy,{px:lh*0.72,w:800,fill:P.fg,maxW:cw-nw-30,min:16}); });
    v1812gFoot(g,W,H,M,P); } };
/* the framed jersey (the Senior Night picture frame, drawn for the poster) */
function v1812gPicFrame(g,x,y,w,h,M,P,A,o){ g.save(); g.translate(x+w/2,y+h/2); g.rotate(-0.045); g.translate(-w/2,-h/2); g.shadowColor='rgba(0,0,0,.5)'; g.shadowBlur=28; g.shadowOffsetY=14; const gold=P.style==='news'?'#14110d':'#d9b45a';
  g.fillStyle=P.style==='chrome'?'#aab4c2':gold; g.fillRect(0,0,w,h); g.shadowColor='transparent'; g.fillStyle=P.style==='chrome'?'#2a303a':'#7a5c1a'; g.fillRect(w*0.04,w*0.04,w-w*0.08,h-w*0.08); g.fillStyle=P.style==='news'?'#efe7d6':'#f4efe4'; g.fillRect(w*0.075,w*0.075,w-w*0.15,h-w*0.15);
  const iw=w-w*0.15, ih=h-w*0.15; const sw=iw*0.84; if(A&&A.shirt) v1812gDrawImg(g,A.shirt,w/2-sw/2,w*0.075+ih*0.06,sw,sw); const st=M.star; if(st){ v1812gT(g,v1812gUp(st.ln),w/2,h-w*0.075-ih*0.07,{px:ih*0.075,w:800,ls:3,fill:'#14110d',align:'center',maxW:iw*0.86,min:12}); }
  g.restore(); }

/* ---------- HALL OF FAME ---------- */
V1812G_TPL.hof={ async load(M,W,H,P,o){ const sq=H<1300; const th=sq?560:740; const A={sq,th}; A.cut=M.star?await v1812gCutout(M.star,o.poseName,th,{mirror:o.mirror,no3d:o.quick}):null; A.cU=await v1812gCrest(M.sch,200); return A; },
  draw(g,W,H,M,P,S,A,o){ const sq=A.sq; const h=M.hof||{}; S.bg(g,W,H,P,{dark:true});
    let gr=g.createRadialGradient(W/2,H*0.55,10,W/2,H*0.55,H*0.6); gr.addColorStop(0,v1812gRgba(P.pop,P.style==='news'?0.0:0.3)); gr.addColorStop(1,v1812gRgba(P.pop,0)); g.fillStyle=gr; g.fillRect(0,0,W,H);
    v1812gHead(g,W,M,P,`Class of ${M.class||M.yr}`);
    const r1=v1812gBigAt(g,S,P,'HALL OF',W/2,sq?100:122,sq?120:150,{align:'center',maxW:640,fill:P.style==='chrome'?undefined:P.pop}); v1812gBigAt(g,S,P,'FAME',W/2,r1.base+(sq?16:24),sq?380:470,{align:'center',maxW:900});
    const bh=sq?262:350, by=H-bh; if(A.cut) v1812gPlace(g,A.cut,W*0.5,by+4,P,v1812gFx(P,S));
    S.panel(g,0,by,W,bh+2,P,{r:0,bar:9}); const nm=h.name||(M.star?M.star.nm:'');
    v1812gT(g,'INDUCTED '+(M.class||M.yr),60,by+(sq?38:48),{px:sq?20:24,w:700,fam:V1812G_FONT.mono,ls:5,fill:P.pop}); v1812gT(g,v1812gUp(nm),58,by+(sq?116:156),{px:sq?92:112,w:900,fill:P.fg,maxW:W-116-(sq?110:140),min:40});
    v1812gT(g,`#${h.num==null?'':h.num} · ${h.pos||''} · ${v1812gUp(M.town)} ${v1812gUp(M.mascot)}`,60,by+(sq?154:200),{px:sq?24:29,w:700,fam:V1812G_FONT.body,ls:3,fill:P.mut,maxW:W-120-(sq?110:140)});
    const gk=h.pos==='GK'; const tiles=gk?[['SAVES',h.sv||0],['CLEAN SHEETS',h.cs||0],['GAMES',h.gp||0],['AWARDS',(h.awards||[]).length]]:[['GOALS',h.g||0],['ASSISTS',h.a||0],['GAMES',h.gp||0],['AWARDS',(h.awards||[]).length]];
    const tw=(W-116-14*3)/4, ty=by+bh-(sq?66:80)-(sq?30:44), th2=sq?58:74; tiles.forEach((t,i)=>{ const x=58+i*(tw+14); g.save(); g.fillStyle=P.style==='news'?'rgba(20,17,13,.08)':'rgba(255,255,255,.1)'; v1812gRound(g,x,ty,tw,th2,8); g.fill(); g.restore(); v1812gT(g,String(t[1]),x+14,ty+th2*0.76,{px:th2*0.74,w:900,fill:P.pop}); v1812gT(g,t[0],x+tw-12,ty+th2*0.68,{px:sq?16:19,w:700,fam:V1812G_FONT.mono,ls:2,fill:P.mut,align:'right'}); });
    v1812gShield(g,M.sch,A.cU,W-58-(sq?96:120),by+(sq?36:44),sq?96:120,P);
    v1812gFoot(g,W,H,M,P); } };

/* ---------- the poster ---------- */
/* opts: {fmt:'portrait'|'square', pose:index, mirror, scale, quick (2-D figure, for thumbnails)}. Always resolves to a canvas. */
async function v1812gPoster(M,style,opts){ opts=Object.assign({},opts||{}); const fmt=opts.fmt==='square'?'square':'portrait'; const W=V1812G.W, H=V1812G.H[fmt]; const sc=opts.scale||1; const T=V1812G_TPL[M.k]; if(!T) throw new Error('no template '+M.k);
  await v1812gFonts(); const P=v1812gPal(M.sch,style,M.k); const S=v1812gStyle(style); opts.poseName=v1812gPoseName(M,opts); M.pose=opts.poseName;
  let A=null; try{ A=await T.load(M,W,H,P,opts); }catch(e){ console.warn('gameday: assets failed',e); A={sq:H<1300,th:700}; }
  const cv=document.createElement('canvas'); cv.width=Math.round(W*sc); cv.height=Math.round(H*sc); const g=cv.getContext('2d'); g.scale(sc,sc);
  try{ T.draw(g,W,H,M,P,S,A,opts); }catch(e){ console.warn('gameday: drawing failed, plain poster',e); g.setTransform(sc,0,0,sc,0,0); S.bg(g,W,H,P,{}); v1812gT(g,v1812gUp(M.town+' '+M.k),W/2,H/2,{px:120,w:900,fill:P.pop,align:'center',maxW:900}); }
  cv._gd={k:M.k,style,fmt,pose:opts.poseName,r3d:!!(A&&((A.cut&&A.cut.r3d)||(A.bust&&A.bust.r3d))),w:cv.width,h:cv.height}; return cv; }

/* ===================== saving, pinning ===================== */
function v1812gFileName(C,e,fmt){ const m=e.m||{}; const wk=String(e.wk||'').toLowerCase().replace(/[^a-z0-9]+/g,''); const nm={gameday:'gameday',final:'final',milestone:'milestone',potw:'potw',senior:'senior-night',hof:'hall-of-fame'}[e.k]||'poster'; let tail='';
  if(e.k==='gameday'||e.k==='final'||e.k==='potw') tail=wk||String(e.yr||''); else if(e.k==='milestone') tail=`${m.v||''}-${String(m.kind==='cs'?'clean-sheets':m.kind==='ast'?'assists':m.kind==='wins'?'wins':m.kind==='hat'?'hat-trick':m.kind==='first'?'first-goal':'goals')}`.replace(/^-/,'');
  else if(e.k==='senior') tail=String(e.yr||''); else if(e.k==='hof'){ const p=v1812gPerson(C,e.pid); tail=String(e.yr||m.yr||'')+(p?'-'+String(p.ln||'').toLowerCase().replace(/[^a-z0-9]+/g,''):''); }
  return `touchline-${nm}${tail?'-'+tail:''}${fmt==='square'?'-square':''}.png`; }
function v1812gBlob(cv){ return new Promise(res=>{ try{ cv.toBlob(b=>res(b),'image/png'); }catch(e){ res(null); } }); }
async function v1812gSaveCanvas(cv,name){ const blob=await v1812gBlob(cv); if(!blob){ toast('Could not create the image.'); return 'failed'; } const r=await saveFile(name,blob);
  if(r==='saved') toast('Saved '+name); else if(r==='declined') toast('Save cancelled.'); else if(r==='busy') toast('Too many downloads at once. Try again in a moment.'); else { toast('Saving files is not available in this view. Open the image and press and hold it.'); v1812gView(cv,name); }
  return r; }
async function v1812gCopyCanvas(cv){ try{ if(!(navigator.clipboard&&window.ClipboardItem)) throw new Error('no clipboard'); const blob=await v1812gBlob(cv); await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); toast('Copied the poster to your clipboard.'); return true; }
  catch(e){ toast('Copying images is not available here. Use Save image, or open it and press and hold.'); return false; } }
/* the poster as a plain image in an overlay: press and hold to save on phones, and the fallback where downloads are blocked */
function v1812gView(cv,name,opts){ opts=opts||{}; v1812gViewClose(); const ov=document.createElement('div'); ov.className='v1812g-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Poster'); ov.tabIndex=-1;
  ov.innerHTML=`<div class="v1812g-ovin"><div class="v1812g-ovimg ${opts.wait?'wait':''}"><img alt="Poster" ${opts.wait?'hidden':''}><i class="v1812g-spin" aria-hidden="true"></i></div><div class="v1812g-ovbar"><button class="btn pri" data-a="v1812gOvSave">Save image</button><button class="btn" data-a="v1812gOvCopy">Copy image</button><button class="btn ghost" data-a="v1812gOvClose">Close</button></div><p class="small muted v1812g-ovnote">Touch and hold the image to save it from your phone.</p></div>`;
  document.body.appendChild(ov); V1812G.ov={el:ov,cv:null,name,url:null}; ov.addEventListener('click',e=>{ if(e.target===ov) v1812gViewClose(); }); try{ ov.focus({preventScroll:true}); }catch(e){}
  if(cv) v1812gViewSet(cv,name); return ov; }
function v1812gViewSet(cv,name){ const O=V1812G.ov; if(!O||!O.el.isConnected) return; O.cv=cv; O.name=name||O.name; v1812gBlob(cv).then(b=>{ if(!b||!O.el.isConnected) return; if(O.url) URL.revokeObjectURL(O.url); O.url=URL.createObjectURL(b); const im=O.el.querySelector('img'); im.src=O.url; im.hidden=false; O.el.querySelector('.v1812g-ovimg').classList.remove('wait'); }); }
function v1812gViewClose(){ const O=V1812G.ov; if(!O) return; try{ O.el.remove(); }catch(e){} if(O.url) setTimeout(()=>URL.revokeObjectURL(O.url),4000); V1812G.ov=null; }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&V1812G.ov){ e.stopPropagation(); v1812gViewClose(); } },true);
A.v1812gOvClose=()=>v1812gViewClose();
A.v1812gOvSave=()=>{ const O=V1812G.ov; if(O&&O.cv) v1812gSaveCanvas(O.cv,O.name||'touchline-poster.png'); };
A.v1812gOvCopy=()=>{ const O=V1812G.ov; if(O&&O.cv) v1812gCopyCanvas(O.cv); };

/* open one entry's poster in the overlay (live full-time card, fixture report, the Office) */
async function v1812gOpenEntry(e,o){ const C=App.C; o=o||{}; const B=v1812gBox(C); const M=v1812gModel(C,e); if(!M){ toast('That poster is not available any more.'); return; } const fmt=o.fmt||B.fmt||'portrait'; const name=v1812gFileName(C,e,fmt); v1812gView(null,name,{wait:true});
  try{ const cv=await v1812gPoster(M,o.st||B.st,{fmt,pose:o.pose||0,mirror:o.mirror}); v1812gViewSet(cv,name); }catch(err){ console.warn('gameday overlay',err); toast('Could not make that poster.'); v1812gViewClose(); } }
function v1812gFixtureEntry(C,f){ const B=v1812gBox(C); const id='FN:'+f.id; const e=B.feed.find(x=>x.id===id); if(e) return e; const bits=v1812gMatchBits(C,f); return {id,k:'final',fid:f.id,wk:v1812gWkShort(f),pid:bits.pm&&bits.pm.pid||null,yr:f.yr,m:{sc:bits.sc,pm:bits.pm},pv:1}; }
A.v1812gFx=el=>{ const C=App.C; const f=C&&C.fixtures[el.dataset.id]; if(!f) return; v1812gOpenEntry(v1812gFixtureEntry(C,f)); };

/* ---------- pins: up to three posters kept on the Office ---------- */
function v1812gPinKey(p){ return [p.id,p.st,p.ps||0,p.mr?1:0,p.fmt].join('|'); }
function v1812gPinned(B,cur){ return B.pins.findIndex(p=>v1812gPinKey(p)===v1812gPinKey(cur)); }
function v1812gTogglePin(C,e,st,pose,fmt,mirror){ const B=v1812gBox(C); const cur={id:e.id,st,ps:pose||0,mr:mirror?1:0,fmt}; const i=v1812gPinned(B,cur); if(i>=0){ B.pins.splice(i,1); queueSave(); return 'off'; }
  const copy={}; for(const k of ['id','k','yr','wk','fid','pid','m']) if(e[k]!==undefined) copy[k]=e[k]; copy.pv=0; cur.e=JSON.parse(JSON.stringify(copy)); B.pins.push(cur); let dropped=false; while(B.pins.length>V1812G.pinMax){ B.pins.shift(); dropped=true; }
  if(e.pid&&!B.lk[e.pid]){ const p=v1812gPerson(C,e.pid); if(p) B.lk[e.pid]=Object.assign({},v1812gLook(C,p)); } queueSave(); return dropped?'swap':'on'; }

/* ===================== the Gameday Graphics route ===================== */
ICON.gameday='<rect x="4" y="3" width="12" height="18" rx="2"/><circle cx="10" cy="9" r="2"/><path d="M6.5 17c.6-2.3 1.9-3.5 3.5-3.5s2.9 1.2 3.5 3.5"/><path d="M19 6.5v11M21.5 9v6"/>';
NAV_ICON.gameday='gameday'; TITLES.gameday='Gameday Graphics'; if(typeof NAV_DESC!=='undefined') NAV_DESC.gameday='Posters made from your fixtures, results and milestones';
if(typeof TOPNAV!=='undefined'){ const g=TOPNAV.find(t=>t[0]==='school'); if(g&&!g[3].includes('gameday')){ const i=g[3].indexOf('settings'); g[3].splice(i<0?g[3].length:i,0,'gameday'); } }
{ const i=NAV.findIndex(x=>x[0]==='school'); if(i>=0&&!NAV.some(x=>x[0]==='gameday')) NAV.splice(i+1,0,['gameday','Gameday Graphics']); }
if(typeof navBadges==='function'){ const _v1812gNB=navBadges; navBadges=function(C){ const b=_v1812gNB(C); try{ const n=C&&C.gd?C.gd.feed.filter(e=>e.nw).length:0; if(n&&App.route!=='gameday') b.gameday=String(Math.min(n,99)); }catch(e){} return b; }; }

const V1812G_TICON={gameday:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="2"/>',final:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 10v4M12 10v4M16 10v4"/>',milestone:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',potw:'<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',senior:'<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8 8l2-1.5h4L16 8l-1.5 2.2V15h-5v-4.8z"/>',hof:'<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M9 11.5l2.2 2L15 9.5"/>'};
function v1812gCur(C){ const B=v1812gBox(C), ui=V1812G.ui; let e=null; if(ui.sel){ e=B.feed.find(x=>x.id===ui.sel)||(B.pins.find(p=>p.e&&p.e.id===ui.sel)||{}).e||null; }
  if(!e){ const L=B.feed.filter(x=>x.k===ui.tpl).sort((a,b)=>b.t-a.t); e=L[0]||v1812gPreviewEntry(C,ui.tpl); } return e; }
function v1812gCurKey(C,e){ const B=v1812gBox(C), ui=V1812G.ui; return e?[e.id,B.st,B.fmt||'portrait',ui.pose,ui.mirror].join('|'):''; }
function v1812gTplCount(B,k){ return B.feed.filter(e=>e.k===k).length; }

VIEWS.gameday=function(){ const C=App.C; const B=v1812gBox(C); v1812gSync(C); const ui=V1812G.ui; const s=Sx(C.userSid);
  if(!ui.init){ ui.init=1; const nw=B.feed.filter(e=>e.nw).sort((a,b)=>b.t-a.t)[0]||B.feed.slice().sort((a,b)=>b.t-a.t)[0]; if(nw){ ui.tpl=nw.k; ui.sel=nw.id; } }
  if(!V1812G.tpl.some(t=>t[0]===ui.tpl)) ui.tpl='gameday';
  const e=v1812gCur(C); const fmt=B.fmt||'portrait'; const pin=e&&v1812gPinned(B,{id:e.id,st:B.st,ps:ui.pose,mr:ui.mirror,fmt})>=0; const canCopy=!!(navigator.clipboard&&window.ClipboardItem);
  const tpls=V1812G.tpl.map(([k,n,d])=>`<button class="v1812g-tpl ${ui.tpl===k?'on':''}" data-a="v1812gTpl" data-k="${k}" aria-pressed="${ui.tpl===k}"><span class="v1812g-tico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V1812G_TICON[k]}</svg></span><span class="grow"><b>${esc(n)}</b><small>${esc(d)}</small></span>${v1812gTplCount(B,k)?`<em>${v1812gTplCount(B,k)}</em>`:''}</button>`).join('');
  const styles=V1812G.styles.map(([k,n])=>`<button class="v1812g-chip v1812g-st-${k} ${B.st===k?'on':''}" data-a="v1812gStyle" data-v="${k}" aria-pressed="${B.st===k}"><i></i>${esc(n)}</button>`).join('');
  const feed=B.feed.slice().sort((a,b)=>b.t-a.t); const shown=feed.slice(0,Math.max(12,ui.more||12));
  const thumbs=shown.map(x=>{ const l=v1812gLabel(C,x); return `<button class="v1812g-th ${e&&e.id===x.id?'on':''}" data-a="v1812gPick" data-id="${esc(x.id)}" aria-label="${esc(v1812gTitle(C,x))}"><canvas class="v1812g-thc" data-id="${esc(x.id)}" width="216" height="${fmt==='square'?216:270}" aria-hidden="true"></canvas><span class="v1812g-thl"><b>${esc(l.a)}</b><i>${esc(l.b)}</i></span>${x.nw?'<em>New</em>':''}</button>`; }).join('');
  const title=e?(e.pv?'Preview · '+({gameday:'Gameday',final:'Final',milestone:'Milestone',potw:'Player of the week',senior:'Senior Night',hof:'Hall of Fame'}[e.k]||''):v1812gTitle(C,e)):'';
  return `<div class="v1812g" style="--c1:${s.c1};--c2:${s.c2}">
   <section class="v1812g-hero"><div><span class="eyebrow">Program media · New</span><p class="v1812g-lede">Every week the program makes its own graphics, the kind every high school team posts: built from your real fixtures, results and milestones, with your players posed in 3-D.</p></div></section>
   <div class="v1812g-grid"><aside class="v1812g-side card" aria-label="Poster templates"><span class="lab">Templates</span><div class="v1812g-tpls">${tpls}</div><span class="lab">Style</span><div class="v1812g-chips" role="group" aria-label="Poster style">${styles}</div>
     <label class="v1812g-auto"><input type="checkbox" data-c="v1812gAuto" ${B.on?'checked':''}><span class="v1812g-sw" aria-hidden="true"></span><span class="grow"><b>Make these automatically each week</b><small>${B.on?'New posters land in the feed after every game.':'Off: nothing new is made. You can still design any poster here.'}</small></span></label></aside>
    <div class="v1812g-stage"><div class="v1812g-frame ${ui.cur&&ui.curKey===v1812gCurKey(C,e)?'':'v1812g-in'}" data-v1812g-tilt><div class="v1812g-cvbox ${fmt==='square'?'sq':''}" id="v1812g-cv" role="img" aria-label="${esc(title)}"><div class="v1812g-load" aria-hidden="true"><i class="v1812g-spin"></i></div></div><span class="v1812g-glare" aria-hidden="true"></span></div>
     <div class="v1812g-cap"><b id="v1812g-title">${esc(title)}</b><span class="small muted" id="v1812g-sub">${fmt==='square'?'1080 × 1080':'1080 × 1350'} PNG</span></div>
     <div class="v1812g-acts"><button class="btn pri" data-a="v1812gSave" ${e?'':'disabled'}>Save image</button>${canCopy?`<button class="btn" data-a="v1812gCopy" ${e?'':'disabled'}>Copy image</button>`:''}<button class="btn ${pin?'on':''}" data-a="v1812gPin" aria-pressed="${pin}" ${e?'':'disabled'}>${pin?'Pinned to the Office':'Pin to the Office'}</button><button class="btn" data-a="v1812gShuffle" ${e?'':'disabled'}>Shuffle pose</button>
      <div class="seg" role="group" aria-label="Format"><button class="${fmt==='portrait'?'on':''}" data-a="v1812gFmt" data-v="portrait" aria-pressed="${fmt==='portrait'}">4:5</button><button class="${fmt==='square'?'on':''}" data-a="v1812gFmt" data-v="square" aria-pressed="${fmt==='square'}">1:1</button></div>
      <button class="btn ghost" data-a="v1812gAll" ${feed.length?'':'disabled'}>Download all this week</button><button class="btn ghost" data-a="v1812gViewCur" ${e?'':'disabled'}>View full size</button></div></div></div>
   <section class="v1812g-feed" aria-label="Program feed"><div class="v1812g-feedh"><span class="eyebrow">Program feed · ${C.year}</span><span class="small muted">${feed.length} poster${feed.length===1?'':'s'}${feed.length>=V1812G.cap?' (latest '+V1812G.cap+')':''}</span></div>
    ${feed.length?`<div class="v1812g-strip">${thumbs}${feed.length>shown.length?`<button class="v1812g-th v1812g-more" data-a="v1812gMore">+${feed.length-shown.length}<small>more</small></button>`:''}</div>`:`<div class="v1812g-empty"><p>${B.on?'Nothing in the feed yet. Play your next game: a Gameday poster is made before it and a Final after it.':'Automatic posters are off. Turn them on to fill the feed.'}</p></div>`}</section></div>`; };

/* after every render: put the poster in its frame (the one already made when nothing changed), thumbnails, pins */
function v1812gMount(){ const C=App.C; if(!C) return; if(App.route==='gameday'){ const box=document.getElementById('v1812g-cv'); if(!box) return; const ui=V1812G.ui; const e=v1812gCur(C); const key=v1812gCurKey(C,e);
    if(!e){ box.innerHTML=`<div class="v1812g-none"><b>Nothing to show yet</b><span>Play a game and this template fills in from your season.</span></div>`; ui.cur=null; return; }
    if(ui.cur&&ui.curKey===key){ box.replaceChildren(ui.cur); } else { if(ui.cur){ box.replaceChildren(ui.cur); box.classList.add('busy'); } v1812gRefresh(); }
    if(C.gd.feed.some(x=>x.nw)){ clearTimeout(V1812G.seenT); V1812G.seenT=setTimeout(()=>{ if(App.route!=='gameday'||!App.C) return; let ch=0; for(const x of v1812gBox(App.C).feed) if(x.nw){ delete x.nw; ch=1; } if(ch){ queueSave(); try{ const b=document.querySelector('.nbadge'); }catch(er){} } },1200); } }
  v1812gFillThumbs(); }
async function v1812gRefresh(){ const C=App.C; if(!C) return; const ui=V1812G.ui, B=v1812gBox(C); const e=v1812gCur(C); const box=document.getElementById('v1812g-cv'); if(!e||!box) return; const key=v1812gCurKey(C,e); const tok=++ui.run; const fmt=B.fmt||'portrait'; box.classList.add('busy');
  const M=v1812gModel(C,e); if(!M){ box.innerHTML='<div class="v1812g-none"><b>This poster is not available</b></div>'; return; }
  let cv=null; try{ cv=await v1812gPoster(M,B.st,{fmt,pose:ui.pose,mirror:ui.mirror}); }catch(err){ console.warn('gameday preview',err); }
  if(tok!==ui.run) return; const box2=document.getElementById('v1812g-cv'); if(!box2) return; box2.classList.remove('busy'); if(!cv){ box2.innerHTML='<div class="v1812g-none"><b>Could not draw this poster</b></div>'; return; }
  cv.className='v1812g-cv'; cv.setAttribute('aria-hidden','true'); ui.cur=cv; ui.curKey=key; ui.curE=e; ui.curMeta=cv._gd; box2.replaceChildren(cv); const fr=box2.closest('.v1812g-frame'); if(fr&&!reducedMotion()){ fr.classList.remove('v1812g-in'); void fr.offsetWidth; fr.classList.add('v1812g-in'); }
  const pn=document.getElementById('v1812g-sub'); if(pn){ const pd=V1812G_POSES[cv._gd.pose]; pn.textContent=`${cv._gd.w} × ${cv._gd.h} PNG${pd?' · '+pd.n:''}${cv._gd.r3d?'':' · 2-D figure'}`; }
  v1812gThumbPut(e,B.st,fmt,ui.pose,ui.mirror,cv); v1812gFillThumbs(); }

/* thumbnails: drawn small with the 2-D figure (cheap), replaced by a downscale of the real poster once it has been made */
function v1812gThumbKey(e,st,fmt,pose,mirror){ return [e.id,st,fmt,pose||0,mirror?1:0].join('|'); }
function v1812gThumbPut(e,st,fmt,pose,mirror,cv){ const T=V1812G.ui.thumbs; const w=216, h=Math.round(cv.height/cv.width*w); const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(cv,0,0,w,h); const k=v1812gThumbKey(e,st,fmt,pose,mirror); T.delete(k); T.set(k,c); while(T.size>90) T.delete(T.keys().next().value); }
function v1812gFillThumbs(){ const C=App.C; if(!C) return; const B=v1812gBox(C); const fmt=B.fmt||'portrait'; const jobs=[];
  for(const cv of document.querySelectorAll('canvas.v1812g-thc')){ let e=null, st=B.st, pose=0, mirror=0, fm=fmt; if(cv.dataset.id) e=B.feed.find(x=>x.id===cv.dataset.id); else if(cv.dataset.pin!=null){ const p=B.pins[+cv.dataset.pin]; if(p){ e=p.e; st=p.st; pose=p.ps||0; mirror=p.mr; fm=p.fmt||'portrait'; } } if(!e) continue;
    const k=v1812gThumbKey(e,st,fm,pose,mirror); const hit=V1812G.ui.thumbs.get(k); if(hit){ v1812gDrawThumb(cv,hit); cv.classList.add('ready'); } else jobs.push({cv,e,st,pose,mirror,fm,k}); }
  for(const j of jobs){ if(V1812G.ui.tq.some(q=>q.k===j.k&&q.cv===j.cv)) continue; V1812G.ui.tq.push(j); } v1812gPumpThumbs(); }
function v1812gDrawThumb(cv,src){ const g=cv.getContext('2d'); if(cv.height!==Math.round(cv.width*src.height/src.width)) cv.height=Math.round(cv.width*src.height/src.width); g.clearRect(0,0,cv.width,cv.height); g.drawImage(src,0,0,cv.width,cv.height); }
async function v1812gPumpThumbs(){ const ui=V1812G.ui; if(ui.tb) return; ui.tb=1; try{ while(ui.tq.length){ const j=ui.tq.shift(); if(!j.cv.isConnected) continue; const C=App.C; if(!C) break; let hit=ui.thumbs.get(j.k);
      if(!hit){ const M=v1812gModel(C,j.e); if(!M) continue; try{ const cv=await v1812gPoster(M,j.st,{fmt:j.fm,pose:j.pose,mirror:j.mirror,scale:0.2,quick:true}); const c=document.createElement('canvas'); c.width=216; c.height=Math.round(cv.height/cv.width*216); c.getContext('2d').drawImage(cv,0,0,c.width,c.height); hit=c; if(!ui.thumbs.has(j.k)){ ui.thumbs.set(j.k,c); while(ui.thumbs.size>90) ui.thumbs.delete(ui.thumbs.keys().next().value); } }catch(e){ continue; } }
      if(j.cv.isConnected&&hit){ v1812gDrawThumb(j.cv,hit); j.cv.classList.add('ready'); } await new Promise(r=>setTimeout(r,16)); } }finally{ ui.tb=0; } }
V1812G.ui.tq=[];

/* ---------- actions ---------- */
function v1812gKeepRender(){ App.keepScroll=true; render(); }
A.v1812gTpl=el=>{ const ui=V1812G.ui; ui.tpl=el.dataset.k; ui.sel=null; ui.pose=0; ui.mirror=0; v1812gKeepRender(); };
A.v1812gPick=el=>{ const C=App.C, B=v1812gBox(C); const e=B.feed.find(x=>x.id===el.dataset.id); if(!e) return; const ui=V1812G.ui; ui.tpl=e.k; ui.sel=e.id; ui.pose=0; ui.mirror=0; v1812gKeepRender(); try{ document.querySelector('.v1812g-stage').scrollIntoView({block:'nearest',behavior:reducedMotion()?'auto':'smooth'}); }catch(er){} };
A.v1812gStyle=el=>{ const B=v1812gBox(App.C); if(!V1812G.styles.some(s=>s[0]===el.dataset.v)) return; B.st=el.dataset.v; queueSave(); v1812gKeepRender(); };
A.v1812gFmt=el=>{ const B=v1812gBox(App.C); B.fmt=el.dataset.v==='square'?'square':'portrait'; queueSave(); V1812G.ui.thumbs.clear(); v1812gKeepRender(); };
A.v1812gShuffle=()=>{ const ui=V1812G.ui; ui.pose=(ui.pose||0)+1; ui.mirror=Math.floor(ui.pose/ (Math.max(1,(v1812gModelPoses()||[1]).length)))%2; v1812gKeepRender(); };
function v1812gModelPoses(){ const C=App.C; const e=v1812gCur(C); if(!e) return null; const M=v1812gModel(C,e); return M&&M.poseSet; }
A.v1812gMore=()=>{ V1812G.ui.more=(V1812G.ui.more||12)+12; v1812gKeepRender(); };
CH.v1812gAuto=el=>{ const B=v1812gBox(App.C); B.on=!!el.checked; if(B.on){ V1812G.syncSig=null; v1812gSync(App.C); } queueSave(); App.keepScroll=true; render(); toast(B.on?'Posters will be made automatically each week.':'Automatic posters are off.'); };
A.v1812gSave=async()=>{ const ui=V1812G.ui, C=App.C, B=v1812gBox(C); if(!ui.cur||!ui.curE) return; await v1812gSaveCanvas(ui.cur,v1812gFileName(C,ui.curE,B.fmt||'portrait')); };
A.v1812gCopy=async()=>{ const ui=V1812G.ui; if(ui.cur) await v1812gCopyCanvas(ui.cur); };
A.v1812gViewCur=()=>{ const ui=V1812G.ui, C=App.C, B=v1812gBox(C); if(ui.cur&&ui.curE) v1812gView(ui.cur,v1812gFileName(C,ui.curE,B.fmt||'portrait')); };
A.v1812gPin=()=>{ const ui=V1812G.ui, C=App.C, B=v1812gBox(C); const e=ui.curE||v1812gCur(C); if(!e) return; const r=v1812gTogglePin(C,e,B.st,ui.pose,B.fmt||'portrait',ui.mirror);
  toast(r==='off'?'Unpinned from the Office.':r==='swap'?`Pinned. The Office keeps ${V1812G.pinMax} posters, so the oldest pin was replaced.`:'Pinned to the Office.'); v1812gKeepRender(); };
A.v1812gAll=async()=>{ const C=App.C, B=v1812gBox(C); const feed=B.feed.slice().sort((a,b)=>b.t-a.t); if(!feed.length) return; const head=feed[0]; let grp=feed.filter(e=>e.yr===head.yr&&e.wk===head.wk&&e.wk); if(grp.length<2) grp=feed.slice(0,3); grp=grp.slice(0,5); const fmt=B.fmt||'portrait';
  toast(`Making ${grp.length} poster${grp.length===1?'':'s'}…`); let n=0, last=null;
  for(const e of grp){ const M=v1812gModel(C,e); if(!M) continue; try{ const cv=await v1812gPoster(M,B.st,{fmt,pose:0}); const name=v1812gFileName(C,e,fmt); const blob=await v1812gBlob(cv); if(!blob) continue; const r=await saveFile(name,blob); last={cv,name}; if(r==='saved') n++; else if(r==='declined') break; else if(r==='busy'){ await new Promise(x=>setTimeout(x,900)); const r2=await saveFile(name,blob); if(r2==='saved') n++; } else break; await new Promise(x=>setTimeout(x,380)); }catch(err){ console.warn(err); } }
  if(n) toast(`Saved ${n} poster${n===1?'':'s'}.`); else if(last){ toast('Saving files is not available in this view. Open the image and press and hold it.'); v1812gView(last.cv,last.name); } };
A.v1812gPinOpen=el=>{ const B=v1812gBox(App.C); const p=B.pins[+el.dataset.i]; if(p) v1812gOpenEntry(p.e,{st:p.st,pose:p.ps,fmt:p.fmt,mirror:p.mr}); };
A.v1812gOffOpen=el=>{ const B=v1812gBox(App.C); const e=B.feed.find(x=>x.id===el.dataset.id); if(e) v1812gOpenEntry(e); };
A.v1812gOpenRoute=()=>{ A.go({dataset:{r:'gameday'}}); };

/* the parallax tilt of the big poster, and the light that follows the pointer */
document.addEventListener('pointermove',e=>{ const fr=e.target&&e.target.closest&&e.target.closest('[data-v1812g-tilt]'); if(!fr||reducedMotion()||e.pointerType==='touch') return; const r=fr.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-0.5, y=(e.clientY-r.top)/r.height-0.5;
  fr.style.setProperty('--rx',(-y*7).toFixed(2)+'deg'); fr.style.setProperty('--ry',(x*9).toFixed(2)+'deg'); fr.style.setProperty('--mx',((x+0.5)*100).toFixed(1)+'%'); fr.style.setProperty('--my',((y+0.5)*100).toFixed(1)+'%'); fr.classList.add('tilting'); },{passive:true});
document.addEventListener('pointerout',e=>{ const fr=e.target&&e.target.closest&&e.target.closest('[data-v1812g-tilt]'); if(!fr||(e.relatedTarget&&fr.contains(e.relatedTarget))) return; fr.style.removeProperty('--rx'); fr.style.removeProperty('--ry'); fr.classList.remove('tilting'); },{passive:true});

/* ---------- the Office: pinned posters (or the latest ones) ---------- */
function v1812gOfficeCard(C){ const B=v1812gBox(C); const pins=B.pins; const latest=B.feed.slice().sort((a,b)=>b.t-a.t).slice(0,3); const fresh=B.feed.filter(e=>e.nw).length;
  const pinHtml=pins.map((p,i)=>`<button class="v1812g-op" data-a="v1812gPinOpen" data-i="${i}" aria-label="Pinned poster: ${esc(v1812gTitle(C,p.e))}"><canvas class="v1812g-thc" data-pin="${i}" width="216" height="${p.fmt==='square'?216:270}" aria-hidden="true"></canvas><span class="v1812g-thl"><b>${esc(v1812gLabel(C,p.e).a)}</b><i>${esc(v1812gLabel(C,p.e).b)}</i></span><u>Pinned</u></button>`).join('');
  const lateHtml=pins.length?'':latest.map(e=>`<button class="v1812g-op" data-a="v1812gOffOpen" data-id="${esc(e.id)}" aria-label="${esc(v1812gTitle(C,e))}"><canvas class="v1812g-thc" data-id="${esc(e.id)}" width="216" height="270" aria-hidden="true"></canvas><span class="v1812g-thl"><b>${esc(v1812gLabel(C,e).a)}</b><i>${esc(v1812gLabel(C,e).b)}</i></span>${e.nw?'<u class="new">New</u>':''}</button>`).join('');
  const msg=pins.length?`${pins.length} pinned poster${pins.length===1?'':'s'}. Pin more from the Media page.`:latest.length?`The program feed has ${B.feed.length} poster${B.feed.length===1?'':'s'}${fresh?`, ${fresh} new`:''}. Pin one to keep it here.`:B.on?'Posters are made automatically: a Gameday poster before each Varsity game and a Final after it.':'Automatic posters are off.';
  return `<section class="card v1812g-off" aria-label="Gameday Graphics"><div class="v1812g-offh"><div><span class="eyebrow">Program media</span><h3>Gameday Graphics</h3></div><button class="btn sm" data-a="v1812gOpenRoute">Open${fresh?` · ${fresh} new`:''}</button></div>
    <div class="v1812g-offrow">${pinHtml||lateHtml||`<div class="v1812g-offempty"><i aria-hidden="true"></i></div>`}<p class="small muted v1812g-offmsg">${esc(msg)}</p></div></section>`; }
{ const _v1812gOff=VIEWS.office; VIEWS.office=function(){ let h=_v1812gOff.apply(this,arguments); try{ const C=App.C; v1812gSync(C); const card=v1812gOfficeCard(C); const i=h.indexOf('<div class="ov-more-h">'); h=i>=0?h.slice(0,i)+card+h.slice(i):h+card; }catch(e){ console.error(e); } return h; }; }

/* a Poster button on the live full-time card and in the match report */
if(typeof ftCard==='function'){ const _v1812gFt=ftCard; ftCard=function(){ const r=_v1812gFt.apply(this,arguments); try{ const L=App.live, C=App.C; const f=C&&L&&C.fixtures[L.fid]; const el=document.getElementById('lv-ftc'); const box=el&&el.querySelector('.ftc');
    if(f&&box&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid)&&!box.querySelector('.v1812g-ftb')) box.insertAdjacentHTML('beforeend',`<button class="btn sm v1812g-ftb" data-a="v1812gFx" data-id="${esc(f.id)}" aria-label="Make the Final poster">Poster</button>`); }catch(e){ console.error(e); } return r; }; }
if(MODALS.fixture){ const _v1812gFxm=MODALS.fixture; MODALS.fixture=m=>{ let h=_v1812gFxm(m); try{ const C=App.C; const f=C&&C.fixtures[m.id]; if(f&&f.st==='d'&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid)){ const i=h.lastIndexOf('<div class="mfoot">'); if(i>=0){ const j=h.indexOf('</button>',i); if(j>=0) h=h.slice(0,j+9)+`<button class="btn" data-a="v1812gFx" data-id="${esc(f.id)}">Poster</button>`+h.slice(j+9); } } }catch(e){ console.error(e); } return h; }; if(MODALS.fixtureFix) MODALS.fixtureFix=MODALS.fixture; }

/* mount hook */
{ const _v1812gRender=render; render=function(){ const r=_v1812gRender.apply(this,arguments); try{ if(App.C&&(App.route==='gameday'||App.route==='office')) v1812gMount(); }catch(e){ console.error(e); } return r; }; }
