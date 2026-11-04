/* ===================== v18.19 PICK'EM POOL =====================
   Call every Varsity league game before each regular-season round (4 a round, your own game included) and race five
   pundits over the season: the Courier, your assistant, the Friday radio call-in, the athletic director and the booster club.
   A prediction game only: nothing here changes a result. Probabilities come from the engine's own odds (simProbs, 60 seeded
   runs a game, its own seed salt), frozen the moment the round starts (first real startMatch of the round, or its first
   finishMatch as a fallback). Pundit picks are seeded from the career seed and those frozen odds, so they are deterministic.
   Scoring: right winner +3, right underdog +2 on top, right draw +4, exact score (your own game) +4, all four right +5.
   A round is scored once, when advance() closes it. Season end: a Newswire story; winning the pool gives +1 prestige.
   State: C.pick (created on first use, so old saves migrate by opening them). Identifiers v1819p / V1819P. */
const V1819P={ PTS:{win:3,upset:2,draw:4,exact:4,perfect:5}, ROUNDS:14, N:60, STREAK:2, DOG:0.08, off:false };
const V1819P_PUNDITS=[
 {id:'courier',name:'Dana Whitlock',role:'Courier sports',ico:'📰',col:'#5b8def',style:'chalk',note:'Takes the favourite, every game.'},
 {id:'tran',name:'Coach Tran',role:'Your assistant',ico:'📋',col:'#3ccf91',style:'sharp',note:'Runs the numbers; takes value where he sees it.'},
 {id:'radio',name:'Section 5 Radio',role:'Friday call-in',ico:'📻',col:'#e8664a',style:'upset',note:'Loves an upset. Lives for the phone lines lighting up.'},
 {id:'ad',name:'Ms. Reyes',role:'Athletic director',ico:'🏫',col:'#b48cf2',style:'draw',note:'Expects tight games and calls a lot of draws.'},
 {id:'boost',name:'Brian',role:'Booster club',ico:'📣',col:'#f2a03d',style:'homer',note:'Your school wins. Always. Everyone else is a coin flip.'}];
const v1819pMem={ fx:new Map(), pr:new Map(), q:[], busy:false };
const v1819pR=(C,...k)=>rngFrom(hashStr([C.seed,'v1819p',...k].join('|')));
const v1819pOrd=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10<4?n%10:0]||'th');

/* ---------- state ---------- */
function v1819pS(C){
  let P=C.pick; if(!P||P.v!==1) P=C.pick={v:1,yrs:{},titles:[]};
  if(!P.yrs) P.yrs={}; if(!Array.isArray(P.titles)) P.titles=[];
  return P;
}
function v1819pYear(C,yr){
  const P=v1819pS(C); yr=yr==null?C.year:yr; let Y=P.yrs[yr];
  if(!Y){ const open=v1819pOpen(C); Y=P.yrs[yr]={from:yr===C.year?(open==null?V1819P.ROUNDS:open):0,r:{},done:false,win:null};
    for(const k of Object.keys(P.yrs)) if(+k<yr-1&&P.yrs[k].r){ const o=P.yrs[k]; if(!o.tot) o.tot=v1819pTotals(C,+k); delete o.r; } }
  if(!Y.r) Y.r={}; return Y;
}
function v1819pRound(C,yr,rd){ const Y=v1819pYear(C,yr); return Y.r[rd]||(Y.r[rd]={u:{},xs:null,lk:0,fz:null,res:null}); }
/* the round you can pick now: round 1 during the preseason, the next round during the regular season */
function v1819pOpen(C){ if(C.phase==='preseason') return 0; if(C.phase==='regular'&&C.md<V1819P.ROUNDS) return C.md; return null; }
function v1819pFx(C,yr,rd){ const k=yr+'|'+rd; let L=v1819pMem.fx.get(k);
  if(!L||L.some(id=>!C.fixtures[id])){ L=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.comp==='reg'&&f.rd===rd&&f.lvl==='V').map(f=>f.id).sort(); if(L.length) v1819pMem.fx.set(k,L); }
  return L; }
function v1819pXf(C,fx){ return fx.find(id=>{ const f=C.fixtures[id]; return f.h===C.userSid||f.a===C.userSid; })||fx[0]; }
function v1819pLocked(C,yr,rd){ const r=v1819pYear(C,yr).r[rd]; return !!(r&&(r.fz||r.res)); }
function v1819pPicked(C,yr,rd){ const r=v1819pYear(C,yr).r[rd]; return r?Object.keys(r.u).filter(k=>r.u[k]).length:0; }

/* ---------- probabilities: the engine's own odds, a small seeded run, memoised by line-ups ---------- */
function v1819pKey(C,fid){ const f=C.fixtures[fid]; return fid+'|'+[f.h,f.a].map(sid=>{ const lu=getLu(C,sid,f.lvl); return lu?lu.form+lu.slots.map(s=>s.pid+s.role).join('')+JSON.stringify(lu.tac)+(lu.strat||''):'-'; }).join('|')+C.settings.difficulty; }
function v1819pProbs(C,fid,sync){
  const k=v1819pKey(C,fid); let v=v1819pMem.pr.get(k); if(v) return v;
  if(!sync){ if(!v1819pMem.q.includes(fid)) v1819pMem.q.push(fid); if(!v1819pMem.busy){ v1819pMem.busy=true; _idle(v1819pIdle); } return null; }
  const o=simProbs(C,fid,V1819P.N); v={h:o.h,d:o.d,a:o.a,xh:o.xgH,xa:o.xgA}; v1819pMem.pr.set(k,v); return v;
}
function v1819pIdle(){ const C=App.C; const fid=v1819pMem.q.shift(); try{ if(C&&C.fixtures[fid]) v1819pProbs(C,fid,true); }catch(e){}
  if(v1819pMem.q.length){ _idle(v1819pIdle); return; } v1819pMem.busy=false;
  if(App.C&&App.route==='pickem'&&!App.modal){ App.keepScroll=true; render(); } }
function v1819pDog(p){ if(!p) return null; if(p.a>p.h+V1819P.DOG) return 'h'; if(p.h>p.a+V1819P.DOG) return 'a'; return null; }
function v1819pCrowd(C,fid,p){ if(!p) return null; const r=v1819pR(C,'crowd',fid);
  const w={h:p.h*1.06*Math.exp(gauss(r)*0.14),d:p.d*0.82*Math.exp(gauss(r)*0.1),a:p.a*Math.exp(gauss(r)*0.14)}; const t=w.h+w.d+w.a;
  const o={h:Math.round(w.h/t*100),d:Math.round(w.d/t*100)}; o.a=100-o.h-o.d; return o; }

/* ---------- kick-off labels (the season calendar if there is one, else Tue/Fri and the weather's kick-off) ---------- */
function v1819pWhen(C,f){
  if(typeof seasonDate==='function'){ try{ const d=seasonDate(C,f); if(d){ const dn=typeof d.dow==='number'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.dow]:String(d.dow||'').slice(0,3); return {day:dn||'',time:d.time||weatherFor(f).kick,label:d.label||''}; } }catch(e){} }
  return {day:f.rd%2?'Fri':'Tue',time:weatherFor(f).kick,label:''};
}
function v1819pMins(t){ const m=/(\d+):(\d+)\s*(AM|PM)?/i.exec(String(t||'')); if(!m) return 9999; let h=+m[1]%12; if(m[3]&&/pm/i.test(m[3])) h+=12; return h*60+(+m[2]); }
function v1819pLockAt(C,fx){ let best=null; for(const id of fx){ const w=v1819pWhen(C,C.fixtures[id]); if(!best||v1819pMins(w.time)<v1819pMins(best.time)) best=w; } return best?`${best.day} ${best.time}`.trim():''; }

/* ---------- freezing a round: odds, crowd and the pundits' picks ---------- */
function v1819pPunditPick(C,yr,rd,P,fid,p,xf){
  const r=v1819pR(C,'pp',yr,rd,P.id,fid); const f=C.fixtures[fid]; const dog=v1819pDog(p);
  const fav=p.h>=p.a?'h':'a'; const chalk=p.d>p.h&&p.d>p.a?'d':fav; const samp=()=>{ const x=r()*(p.h+p.d+p.a); return x<p.h?'h':x<p.h+p.d?'d':'a'; };
  let k;
  if(P.style==='chalk') k=chalk;
  else if(P.style==='sharp'){ const ev={h:p.h*(V1819P.PTS.win+(dog==='h'?V1819P.PTS.upset:0)),d:p.d*V1819P.PTS.draw,a:p.a*(V1819P.PTS.win+(dog==='a'?V1819P.PTS.upset:0))};
    for(const x in ev) ev[x]*=Math.exp(gauss(r)*0.18); k=['h','d','a'].reduce((b,x)=>ev[x]>ev[b]?x:b,'h'); }
  else if(P.style==='upset') k=dog&&p[dog]>0.16&&r()<0.6?dog:r()<0.25?'d':fav;
  else if(P.style==='draw') k=(p.d>0.2&&Math.abs(p.h-p.a)<0.24&&r()<0.8)||r()<0.12?'d':fav;
  else { const u=C.userSid; k=f.h===u?'h':f.a===u?'a':samp(); }
  let xs=null;
  if(fid===xf){ const W=[[1,0],[2,1],[2,0],[3,1],[3,2],[1,0]], D=[[1,1],[0,0],[2,2],[1,1]]; const s=k==='d'?pick(r,D):pick(r,W); xs=k==='a'?{h:s[1],a:s[0]}:{h:s[0],a:s[1]}; }
  return {k,xs};
}
function v1819pFreeze(C,yr,rd){
  if(V1819P.off||yr!==C.year||rd==null||rd<v1819pYear(C,yr).from) return null;
  const R=v1819pRound(C,yr,rd); if(R.fz) return R.fz; const fx=v1819pFx(C,yr,rd); if(!fx.length) return null;
  const xf=v1819pXf(C,fx); const p={}, crowd={}, dogs={};
  for(const id of fx){ const q=v1819pProbs(C,id,true); p[id]=[+q.h.toFixed(4),+q.d.toFixed(4),+q.a.toFixed(4)]; crowd[id]=v1819pCrowd(C,id,q); dogs[id]=v1819pDog(q); }
  const pp={}; for(const P of V1819P_PUNDITS){ const o={k:{},xs:null}; for(const id of fx){ const q={h:p[id][0],d:p[id][1],a:p[id][2]}; const x=v1819pPunditPick(C,yr,rd,P,id,q,xf); o.k[id]=x.k; if(x.xs) o.xs=x.xs; } pp[P.id]=o; }
  if(R.xs&&R.u[xf]&&v1819pOut(R.xs)!==R.u[xf]) R.xs=null;
  R.fz={fx,xf,p,crowd,dogs,pp,at:v1819pLockAt(C,fx)}; return R.fz;
}
function v1819pOut(s){ return s.h>s.a?'h':s.h<s.a?'a':'d'; }

/* ---------- scoring ---------- */
function v1819pScoreOne(C,fz,picks,xs){
  let pts=0, ok=0; const bd={};
  for(const id of fz.fx){ const f=C.fixtures[id]; const o=f.w===f.h?'h':f.w===f.a?'a':'d'; const k=picks[id]; let g=0, why='';
    if(k&&k===o){ ok++; if(o==='d'){ g=V1819P.PTS.draw; why='draw'; } else { g=V1819P.PTS.win; why='win'; if(fz.dogs[id]===k){ g+=V1819P.PTS.upset; why='upset'; } } }
    if(id===fz.xf&&xs&&xs.h===f.hg&&xs.a===f.ag){ g+=V1819P.PTS.exact; why+=(why?'+':'')+'exact'; }
    pts+=g; bd[id]={o,k:k||null,g,why}; }
  const perfect=ok===fz.fx.length; if(perfect) pts+=V1819P.PTS.perfect;
  return {pts,ok,perfect,bd};
}
function v1819pSettle(C,yr){
  if(V1819P.off) return 0; yr=yr==null?C.year:yr; const Y=v1819pYear(C,yr); let n=0;
  for(let rd=Y.from;rd<V1819P.ROUNDS;rd++){ const fx=v1819pFx(C,yr,rd); if(!fx.length||!fx.every(id=>C.fixtures[id].st==='d')) continue;
    const R=v1819pRound(C,yr,rd); if(R.res) continue; const fz=R.fz||v1819pFreeze(C,yr,rd); if(!fz) continue;
    const res={u:v1819pScoreOne(C,fz,R.u,R.xs),p:{}}; for(const P of V1819P_PUNDITS) res.p[P.id]=v1819pScoreOne(C,fz,fz.pp[P.id].k,fz.pp[P.id].xs);
    R.res=res; n++;
    if(res.u.perfect) addNews(C,'program',`Pick'em: ${C.schools[C.userSid].town}'s coach calls all ${fz.fx.length} games of Matchday ${rd+1} right, a perfect round (+${res.u.pts})`,C.userSid);
  }
  const last=Y.r[V1819P.ROUNDS-1]; if(!Y.done&&last&&last.res) v1819pSeasonEnd(C,yr);
  return n;
}
function v1819pTotals(C,yr){ const Y=C.pick&&C.pick.yrs[yr]; if(!Y) return null; if(!Y.r&&Y.tot) return Y.tot; const t={you:0}; for(const P of V1819P_PUNDITS) t[P.id]=0;
  for(const k in Y.r){ const R=Y.r[k]; if(!R.res) continue; t.you+=R.res.u.pts; for(const P of V1819P_PUNDITS) t[P.id]+=R.res.p[P.id]?R.res.p[P.id].pts:0; } return t; }
function v1819pStreak(Y,who){ let s=0; for(let rd=V1819P.ROUNDS-1;rd>=0;rd--){ const R=Y.r[rd]; if(!R||!R.res) continue; const x=who==='you'?R.res.u:R.res.p[who]; if(x&&x.ok>=V1819P.STREAK) s++; else break; } return s; }
function v1819pBoard(C,yr){
  yr=yr==null?C.year:yr; const Y=v1819pYear(C,yr); const t=v1819pTotals(C,yr)||{you:0};
  const rows=[{id:'you',name:'You',role:`Coach · ${C.schools[C.userSid].town}`,pts:t.you||0,you:true},...V1819P_PUNDITS.map(P=>({id:P.id,name:v1819pPName(C,P),role:P.role,ico:P.ico,col:P.col,pts:t[P.id]||0}))];
  for(const r of rows) r.streak=Y.r?v1819pStreak(Y,r.id):0;
  rows.sort((a,b)=>b.pts-a.pts||(a.you?-1:b.you?1:0)); rows.forEach((r,i)=>{ r.rk=i&&rows[i-1].pts===r.pts?rows[i-1].rk:i+1; });
  return rows;
}
function v1819pPName(C,P){ if(P.id==='radio') return `Section ${C.section} Radio`; if(P.id==='courier'&&typeof V1812P_VOTERS!=='undefined'&&V1812P_VOTERS[0]) return V1812P_VOTERS[0].name; return P.name; }
function v1819pGap(C,rows){ const me=rows.find(r=>r.you); const top=rows.find(r=>!r.you&&r.rk===1)||rows.find(r=>!r.you); const best=rows.filter(r=>!r.you).sort((a,b)=>b.pts-a.pts)[0];
  if(!best) return ''; const d=me.pts-best.pts;
  if(d<0){ const lead=rows.find(r=>r.rk===1); return `You are ${-d} point${d===-1?'':'s'} behind ${lead.you?best.name:lead.name}.`; }
  if(d===0) return me.pts?`You are level with ${best.name} at the top.`:'Everyone starts on zero. Make your first picks.';
  return `You lead ${best.name} by ${d} point${d===1?'':'s'}.`; }
function v1819pSeasonEnd(C,yr){
  const Y=v1819pYear(C,yr); if(Y.done) return; Y.done=true; const rows=v1819pBoard(C,yr); const me=rows.find(r=>r.you); const lead=rows[0];
  const won=me.rk===1; const s=C.schools[C.userSid]; Y.win=won?'you':lead.id; Y.tot=v1819pTotals(C,yr);
  if(won){ const P=v1819pS(C); if(!P.titles.includes(yr)) P.titles.push(yr); s.prestige=Math.min(99,(s.prestige||0)+1);
    addNews(C,'program',`${s.town}'s coach wins the Courier Pick'em Pool with ${me.pts} points${rows.filter(r=>r.rk===1).length>1?' (shared)':''}, ahead of ${rows.find(r=>!r.you).name}. Program prestige +1`,C.userSid); }
  else addNews(C,'program',`${lead.name} (${lead.role}) wins the Courier Pick'em Pool with ${lead.pts} points; ${s.town}'s coach finishes ${v1819pOrd(me.rk)} with ${me.pts}`,C.userSid);
}

/* ---------- hooks: lock at the first real kick-off of a round, score when the round closes ---------- */
{ const _sm=startMatch; startMatch=function(C,fid,opts){ if(!V1819P.off&&!(opts&&opts.fast)){ try{ const f=C.fixtures[fid]; if(f&&f.comp==='reg'&&f.st!=='d'&&f.yr===C.year) v1819pFreeze(C,f.yr,f.rd); }catch(e){ console.warn('pickem freeze',e); } } return _sm.apply(this,arguments); }; }
{ const _fm=finishMatch; finishMatch=function(C,M){ if(!V1819P.off){ try{ const f=C.fixtures[M.fid]; if(f&&f.comp==='reg'&&f.st!=='d'&&f.yr===C.year) v1819pFreeze(C,f.yr,f.rd); }catch(e){ console.warn('pickem freeze',e); } } return _fm.apply(this,arguments); }; }
{ const _ad=advance; advance=function(C){ const ph=C.phase, md=C.md, yr=C.year; const ev=_ad.apply(this,arguments); if(!V1819P.off&&ev&&ph==='regular'&&C.md!==md){ try{ v1819pSettle(C,yr); }catch(e){ console.warn('pickem settle',e); } } return ev; }; }
{ const _mg=migrate; migrate=function(C){ const o=_mg.apply(this,arguments); try{ const X=o||C; if(X&&X.pick){ if(X.pick.v!==1||!X.pick.yrs) delete X.pick; else if(!Array.isArray(X.pick.titles)) X.pick.titles=[]; } }catch(e){} return o; }; }

/* ===================== the page ===================== */
ICON.v1819ppick='<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>';
function v1819pAv(C,row,size){ size=size||34; if(row.you){ return `<span class="v1819p-av you" style="width:${size}px;height:${size}px">${crest(C.schools[C.userSid],size-6)}</span>`; }
  return `<span class="v1819p-av" style="--pc:${row.col};width:${size}px;height:${size}px;font-size:${Math.round(size*.5)}px" aria-hidden="true">${row.ico}</span>`; }
function v1819pPRow(C,id){ const P=V1819P_PUNDITS.find(x=>x.id===id); return {id,name:v1819pPName(C,P),role:P.role,ico:P.ico,col:P.col}; }
function v1819pWorth(k,dog){ const W=V1819P.PTS; if(!k) return `<span class="muted">Pick one · favourite +${W.win}${dog?` · upset +${W.win+W.upset}`:''} · draw +${W.draw}</span>`;
  if(k==='d') return `<b>Draw call:</b> +${W.draw} if right`; if(dog===k) return `<b>Upset call:</b> +${W.win} and +${W.upset} bonus if right`; return `<b>Winner:</b> +${W.win} if right`; }
function v1819pGame(C,yr,rd,id,R,locked){
  const f=C.fixtures[id], fz=R.fz, h=C.schools[f.h], a=C.schools[f.a]; const done=f.st==='d';
  const p=fz?{h:fz.p[id][0],d:fz.p[id][1],a:fz.p[id][2]}:v1819pProbs(C,id,false);
  const crowd=fz?fz.crowd[id]:v1819pCrowd(C,id,p); const dog=fz?fz.dogs[id]:v1819pDog(p); const k=R.u[id]; const o=done?(f.w===f.h?'h':f.w===f.a?'a':'d'):null;
  const xf=fz?fz.xf:v1819pXf(C,v1819pFx(C,yr,rd)); const w=v1819pWhen(C,f); const mine=f.h===C.userSid||f.a===C.userSid;
  const by={h:[],d:[],a:[]}; if(fz) for(const P of V1819P_PUNDITS){ const x=fz.pp[P.id].k[id]; if(x) by[x].push(v1819pPRow(C,P.id)); }
  const btn=x=>{ const lab=x==='h'?'Home':x==='d'?'Draw':'Away'; const on=k===x; const cls=['v1819p-opt',on?'on':'',o?(o===x?'won':on?'lost':''):''].join(' ');
    return `<button class="${cls}" data-a="v1819pPick" data-f="${id}" data-k="${x}" aria-pressed="${on}" ${locked?'disabled':''} aria-label="${esc(lab+(x==='h'?' · '+h.town:x==='a'?' · '+a.town:''))}${crowd?`, crowd ${crowd[x]}%`:''}"><span class="v1819p-ol">${lab}${dog===x?'<i class="v1819p-dogtag">Upset</i>':''}</span><b>${crowd?crowd[x]+'%':'<span class="v1819p-wait">··</span>'}</b>${o===x?'<span class="v1819p-tick">✓</span>':''}${fz?`<span class="v1819p-pp">${by[x].map(r=>`<i title="${esc(r.name)}" style="--pc:${r.col}">${r.ico}</i>`).join('')}</span>`:''}</button>`; };
  const team=(s,side)=>`<div class="v1819p-team ${side}">${crest(s,46)}<div><b>${esc(s.town)}</b><small>${esc(s.mascot||'')}</small></div></div>`;
  const mid=done?`<div class="v1819p-score"><b>${f.hg}–${f.ag}</b><small>Final</small></div>`:`<div class="v1819p-vs">vs</div>`;
  let ex='';
  if(id===xf){ const xs=R.xs; const st=s=>`<span class="v1819p-step"><button data-a="v1819pXs" data-s="${s}" data-d="-1" ${locked?'disabled':''} aria-label="One fewer ${s==='h'?'home':'away'} goal">−</button><b>${xs?xs[s]:'–'}</b><button data-a="v1819pXs" data-s="${s}" data-d="1" ${locked?'disabled':''} aria-label="One more ${s==='h'?'home':'away'} goal">+</button></span>`;
    const hit=done&&xs&&xs.h===f.hg&&xs.a===f.ag;
    ex=`<div class="v1819p-exact ${hit?'hit':''} ${xs?'set':''}"><span class="v1819p-exl"><b>Exact score</b><small>${mine?'Your game':'Game of the round'} · +${V1819P.PTS.exact} if right</small></span><span class="v1819p-exs">${st('h')}<i>–</i>${st('a')}</span>${xs&&!locked?'<button class="v1819p-x" data-a="v1819pXsClear" aria-label="Clear the exact score">×</button>':''}</div>`; }
  let foot=v1819pWorth(k,dog);
  if(R.res){ const b=R.res.u.bd[id]; const W={win:'right winner',upset:'upset call',draw:'right draw',exact:'exact score'}; foot=b&&b.g?`<b class="good">+${b.g}</b> ${b.why.split('+').map(x=>W[x]).join(' + ')}`:k?'<span class="bad">No points</span>':'<span class="muted">No pick</span>'; }
  return `<article class="v1819p-game ${mine?'mine':''} ${k?'picked':''}" data-f="${id}"><div class="v1819p-gtop"><span><b>${esc(w.day)}</b> · ${esc(w.time)}</span><span class="v1819p-ven">${esc(f.ven||h.name)}</span>${mine?'<span class="v1819p-yours">Your game</span>':''}</div>
    <div class="v1819p-teams">${team(h,'h')}${mid}${team(a,'a')}</div>
    <div class="v1819p-opts">${btn('h')}${btn('d')}${btn('a')}</div>${ex}<div class="v1819p-worth">${foot}</div></article>`;
}
function v1819pChips(){ const W=V1819P.PTS; return `<div class="v1819p-chips"><span><b>+${W.win}</b>Right winner</span><span><b>+${W.upset}</b>Upset call bonus</span><span><b>+${W.draw}</b>Right draw</span><span><b>+${W.exact}</b>Exact score</span><span><b>+${W.perfect}</b>Perfect round</span></div>`; }
function v1819pRoundCard(C){
  const yr=C.year, rd=v1819pOpen(C); const Y=v1819pYear(C,yr);
  if(rd==null||rd<Y.from){ const rows=v1819pBoard(C,yr); const me=rows.find(r=>r.you); const over=C.phase!=='preseason'&&C.phase!=='regular';
    return `<section class="v1819p-card v1819p-round"><div class="v1819p-rh"><div><span class="v1819p-kick">${yr} pool</span><h3 class="v1819p-title">${over?'The pool is closed':'Picks open next round'}</h3></div></div>
      <p class="v1819p-sub">${over?(Y.done?`The regular season is over. You finished <b>${v1819pOrd(me.rk)}</b> with <b>${me.pts}</b> points${Y.win==='you'?' and won the pool':''}. Picks for next season open in the preseason.`:'The regular season is over. Picks for next season open in the preseason.'):'This round is already under way. Your first picks open when it is played.'}</p>${v1819pChips()}</section>`; }
  const R=v1819pRound(C,yr,rd); const fx=v1819pFx(C,yr,rd); const locked=!!(R.fz||R.lk); const n=v1819pPicked(C,yr,rd); const at=R.fz?R.fz.at:v1819pLockAt(C,fx);
  const pill=R.fz?`<span class="v1819p-pill live">● Round under way</span>`:R.lk?`<span class="v1819p-pill done">🔒 Locked in · kicks off ${esc(at)}</span>`:`<span class="v1819p-pill">⏱ Locks ${esc(at)}</span>`;
  const sub=R.fz?'Picks are locked. The pundits’ calls are shown under each game.':R.lk?`You locked in ${n} of ${fx.length} picks. The pundits reveal theirs at kick-off.`:`${n} of ${fx.length} picked · change them any time until kick-off. The pundits reveal their calls when the round locks.`;
  return `<section class="v1819p-card v1819p-round"><div class="v1819p-rh"><div><span class="v1819p-kick">Matchday ${rd+1} of ${V1819P.ROUNDS}${C.phase==='preseason'?' · opens the league season':''}</span><h3 class="v1819p-title">Round ${rd+1} picks</h3></div>
      <div class="v1819p-ra">${pill}${locked?'':`<button class="btn pri v1819p-lockbtn" data-a="v1819pLock" ${n?'':'disabled'}>Lock in my picks</button>`}</div></div>
    <p class="v1819p-sub">${sub}</p>
    <div class="v1819p-games">${fx.map(id=>v1819pGame(C,yr,rd,id,R,locked)).join('')}</div>${v1819pChips()}</section>`;
}
function v1819pBoardCard(C,yr){
  const rows=v1819pBoard(C,yr); const Y=v1819pYear(C,yr); const any=Object.values(Y.r||{}).some(R=>R.res);
  return `<section class="v1819p-card v1819p-board"><div class="v1819p-bh"><h3>Season leaderboard</h3><span class="chip">${yr}</span></div>
    <ol class="v1819p-lb">${rows.map(r=>`<li class="${r.you?'you':''}" data-id="${r.id}"><span class="v1819p-rk">${any?r.rk:'–'}</span>${v1819pAv(C,r,36)}<span class="v1819p-nm"><b>${esc(r.name)}</b><small>${esc(r.role)}</small></span><span class="v1819p-st ${r.streak?'':'off'}" title="${r.streak} round${r.streak===1?'':'s'} in a row with ${V1819P.STREAK}+ right calls">🔥 ${r.streak}</span><span class="v1819p-pts"><b>${r.pts}</b><small>pts</small></span></li>`).join('')}</ol>
    <p class="v1819p-gap">${any?esc(v1819pGap(C,rows)):'No rounds scored yet. Everyone starts on zero.'}</p>
    <p class="tiny muted">🔥 rounds in a row with ${V1819P.STREAK} or more right calls.</p></section>`;
}
function v1819pChart(C,yr){
  const Y=v1819pYear(C,yr); const pts=[]; for(let rd=0;rd<V1819P.ROUNDS;rd++){ const R=Y.r&&Y.r[rd]; pts.push(R&&R.res?R.res.u.pts:null); }
  const got=pts.filter(x=>x!=null); const best=got.length?Math.max(...got):0; const max=Math.max(10,best); const bi=best>0?pts.indexOf(best):-1;
  return `<section class="v1819p-card v1819p-chart"><div class="v1819p-bh"><h3>Your points by round</h3>${got.length?`<span class="chip v1819p-best">Best: ${best}</span>`:''}</div>
    <div class="v1819p-bars" role="img" aria-label="Points per round: ${pts.map((x,i)=>'round '+(i+1)+' '+(x==null?'not played':x)).join(', ')}">${pts.map((x,i)=>`<div class="v1819p-bar ${x==null?'na':''} ${i===bi?'best':''}"><span class="v1819p-bv">${x==null?'':x}</span><i style="height:${x==null?0:Math.max(3,x/max*100)}%"></i><small>${i+1}</small></div>`).join('')}</div>
    <p class="tiny muted">${got.length?`${got.length} round${got.length===1?'':'s'} scored · average ${(got.reduce((a,b)=>a+b,0)/got.length).toFixed(1)} a round`:'Bars fill in as rounds are played.'}</p></section>`;
}
function v1819pResults(C,yr){
  const Y=v1819pYear(C,yr); const done=Object.keys(Y.r||{}).map(Number).filter(rd=>Y.r[rd].res).sort((a,b)=>a-b);
  if(!done.length) return `<section class="v1819p-card v1819p-res"><div class="v1819p-bh"><h3>Past rounds</h3></div><div class="empty">Scored rounds appear here: what you picked, what happened and the points.</div></section>`;
  let rd=+App.params.pr; if(!done.includes(rd)) rd=done[done.length-1]; const R=Y.r[rd], fz=R.fz, res=R.res;
  const rows=fz.fx.map(id=>{ const f=C.fixtures[id]; const b=res.u.bd[id]; const h=C.schools[f.h], a=C.schools[f.a]; const name=k=>k==='h'?h.town:k==='a'?a.town:k==='d'?'Draw':'No pick';
    const pp=V1819P_PUNDITS.map(P=>{ const x=res.p[P.id].bd[id]; return `<i class="${x.k===x.o?'ok':''}" title="${esc(v1819pPName(C,P))}: ${esc(name(x.k))}" style="--pc:${P.col}">${P.ico}</i>`; }).join('');
    return `<div class="v1819p-rrow"><div class="v1819p-rm">${crest(h,24)}<b>${esc(h.town)}</b><span class="v1819p-rs">${f.hg}–${f.ag}</span><b>${esc(a.town)}</b>${crest(a,24)}</div>
      <div class="v1819p-rp"><span class="v1819p-rk2 ${b.k?(b.k===b.o?'ok':'no'):'none'}">${b.k?(b.k===b.o?'✓':'✗'):'–'} ${esc(name(b.k))}${id===fz.xf&&R.xs?` · ${R.xs.h}–${R.xs.a}`:''}</span><span class="v1819p-rpp">${pp}</span><b class="v1819p-rg ${b.g?'good':''}">${b.g?'+'+b.g:'0'}</b></div></div>`; }).join('');
  const bestP=V1819P_PUNDITS.map(P=>({n:v1819pPName(C,P),v:res.p[P.id].pts})).sort((a,b)=>b.v-a.v)[0];
  return `<section class="v1819p-card v1819p-res"><div class="v1819p-bh"><h3>Past rounds</h3><div class="v1819p-rsel">${done.map(d=>`<button class="${d===rd?'on':''}" data-a="setParam" data-k="pr" data-v="${d}" aria-pressed="${d===rd}">R${d+1}</button>`).join('')}</div></div>
    <div class="v1819p-rsum"><span>Round ${rd+1}: <b>${res.u.pts} pts</b> · ${res.u.ok} of ${fz.fx.length} right${res.u.perfect?` · <b class="good">perfect round +${V1819P.PTS.perfect}</b>`:''}</span><span class="muted">Best pundit: ${esc(bestP.n)} ${bestP.v}</span></div>
    ${rows}<p class="tiny muted">✓ / ✗ is your call; the icons are the pundits’ calls (bright = right).</p></section>`;
}
function v1819pHow(C){ const P=v1819pS(C);
  return `<section class="v1819p-card v1819p-how"><div class="v1819p-bh"><h3>How it works</h3></div>
   <ul><li>Each round, call the four Varsity league games: home win, draw or away win. Your own game also takes an exact score.</li>
   <li>The underdog is the side the odds rate at least ${Math.round(V1819P.DOG*100)} points less likely to win; a right underdog call earns the bonus.</li>
   <li>Picks lock at the first kick-off of the round, or earlier if you lock them in. No pick, no points, no harm.</li>
   <li>Win the season and the program gets <b>+1 prestige</b> (it fades like any prestige) and a pool pennant. Results on the pitch are never affected.</li></ul>
   ${P.titles.length?`<div class="v1819p-pens">${P.titles.map(y=>`<span class="v1819p-pen">🏆 Pool champion ${y}</span>`).join('')}</div>`:''}</section>`; }
function v1819pPast(C){ const P=v1819pS(C); const ys=Object.keys(P.yrs).map(Number).filter(y=>y<C.year&&P.yrs[y].done).sort((a,b)=>b-a); if(!ys.length) return '';
  return `<section class="v1819p-card v1819p-hist"><div class="v1819p-bh"><h3>Past seasons</h3></div>${ys.map(y=>{ const Y=P.yrs[y]; const t=Y.tot||v1819pTotals(C,y)||{}; const W=V1819P_PUNDITS.find(x=>x.id===Y.win); const w=Y.win==='you'?'You':W?v1819pPName(C,W):'—';
    return `<div class="v1819p-hrow"><b>${y}</b><span>Winner: ${esc(w)}</span><span class="muted">You ${t.you||0} pts</span></div>`; }).join('')}</section>`; }
VIEWS.pickem=()=>{
  const C=App.C; try{ v1819pSettle(C); }catch(e){ console.warn('pickem',e); }
  const yr=C.year; const rows=v1819pBoard(C,yr); const me=rows.find(r=>r.you); const P=v1819pS(C);
  let body; try{ body=`<div class="v1819p-grid"><div class="v1819p-main">${v1819pRoundCard(C)}${v1819pResults(C,yr)}</div><div class="v1819p-side">${v1819pBoardCard(C,yr)}${v1819pChart(C,yr)}${v1819pHow(C)}${v1819pPast(C)}</div></div>`; }
  catch(e){ console.error('pickem',e); body='<div class="empty card">The Pick’em Pool could not be drawn this time. Your career is unaffected.</div>'; }
  return `<div class="v1819p"><section class="v1819p-hero"><div><span class="v1819p-kick"><i></i>The Courier Pick’em Pool · ${yr} season</span><p>Call every game in the league before each round. Beat the Courier, the radio show and the rest of the pundits over the season.</p></div>
    <div class="v1819p-me"><div><small>Your rank</small><b>${Object.values(v1819pYear(C,yr).r||{}).some(R=>R.res)?v1819pOrd(me.rk):'–'}</b></div><div><small>Points</small><b>${me.pts}</b></div><div><small>Pool titles</small><b>${P.titles.length}</b></div></div></section>${body}</div>`;
};
TITLES.pickem="Pick'em Pool"; NAV_ICON.pickem='v1819ppick'; if(typeof NAV_DESC!=='undefined') NAV_DESC.pickem='Call every league game; beat the Courier and the pundits';
{ const i=NAV.findIndex(n=>n[0]==='statepoll'); const j=i>=0?i:NAV.findIndex(n=>n[0]==='league'); if(!NAV.some(n=>n[0]==='pickem')) NAV.splice(j>=0?j+1:NAV.length,0,['pickem',"Pick'em"]); }
{ const g=TOPNAV.find(t=>t[0]==='league'); if(g&&!g[3].includes('pickem')){ const j=g[3].indexOf('countymap'); g[3].splice(j>=0?j+1:g[3].length,0,'pickem'); }
  if(typeof V1817O_MENU!=='undefined'&&V1817O_MENU.league&&V1817O_MENU.league[0]&&!V1817O_MENU.league[0][1].includes('pickem')) V1817O_MENU.league[0][1].push('pickem'); }
{ const _nb=navBadges; navBadges=function(C){ const b=_nb.apply(this,arguments); try{ const rd=v1819pOpen(C); if(rd!=null&&App.route!=='pickem'&&C.pick){ const Y=C.pick.yrs[C.year]; const R=Y&&Y.r[rd]; if(Y&&rd>=Y.from&&!(R&&(R.fz||R.lk))){ const n=v1819pFx(C,C.year,rd).length-v1819pPicked(C,C.year,rd); if(n>0) b.pickem=String(n); } } }catch(e){} return b; }; }

/* ---------- actions ---------- */
function v1819pEdit(fn){ const C=App.C; const rd=v1819pOpen(C); if(rd==null) return; const R=v1819pRound(C,C.year,rd); if(R.fz||R.lk){ toast('Picks for this round are locked.'); return; }
  fn(R,C,rd); queueSave(); App.keepScroll=true; render(); }
A.v1819pPick=el=>v1819pEdit((R,C,rd)=>{ const id=el.dataset.f, k=el.dataset.k; if(R.u[id]===k) delete R.u[id]; else R.u[id]=k;
  const xf=v1819pXf(C,v1819pFx(C,C.year,rd)); if(id===xf&&R.xs&&R.u[id]!==v1819pOut(R.xs)) R.xs=null; try{ Sound.ui('click'); }catch(e){} });
A.v1819pXs=el=>v1819pEdit((R,C,rd)=>{ const xf=v1819pXf(C,v1819pFx(C,C.year,rd)); const s=el.dataset.s, d=+el.dataset.d; const x=R.xs?{...R.xs}:{h:0,a:0}; if(R.xs) x[s]=clamp(x[s]+d,0,9); else if(d>0) x[s]=1; R.xs=x; R.u[xf]=v1819pOut(x); });
A.v1819pXsClear=()=>v1819pEdit(R=>{ R.xs=null; });
A.v1819pLock=()=>{ App.modal={type:'v1819pLock'}; renderModal(); };
A.v1819pLockYes=()=>{ const C=App.C; const rd=v1819pOpen(C); if(rd!=null){ const R=v1819pRound(C,C.year,rd); if(!R.fz) R.lk=1; } App.modal=null; renderModal(); queueSave(); App.keepScroll=true; render(); toast('Picks locked in. Good luck.'); try{ Sound.ui('success'); }catch(e){} };
MODALS.v1819pLock=()=>{ const C=App.C; const rd=v1819pOpen(C); if(rd==null) return modalShell('<h2>Pick’em Pool</h2>','<p>No round is open for picks right now.</p>','<button class="btn" data-a="closeModal">Close</button>','narrow');
  const fx=v1819pFx(C,C.year,rd); const n=v1819pPicked(C,C.year,rd); const R=v1819pRound(C,C.year,rd);
  const list=fx.map(id=>{ const f=C.fixtures[id]; const k=R.u[id]; return `<li><span>${esc(C.schools[f.h].town)} v ${esc(C.schools[f.a].town)}</span><b>${k?(k==='d'?'Draw':esc(C.schools[k==='h'?f.h:f.a].town)):'<span class="muted">no pick</span>'}</b></li>`; }).join('');
  return modalShell(`<h2>Lock in Round ${rd+1}?</h2>`,`<p>Locked picks can’t be changed, even before kick-off.${n<fx.length?` <b>You have picked ${n} of ${fx.length} games</b>; a game without a pick scores nothing.`:''}</p><ul class="v1819p-ml">${list}</ul>${R.xs?`<p class="muted">Exact score: ${R.xs.h}–${R.xs.a}</p>`:''}`,
   `<button class="btn" data-a="closeModal">Keep editing</button><button class="btn pri" data-a="v1819pLockYes">Lock in my picks</button>`,'narrow'); };

/* ---------- the Overview's This week strip ---------- */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; const rd=v1819pOpen(C); if(rd==null) return h; const Y=v1819pYear(C,C.year); if(rd<Y.from) return h;
    const R=Y.r[rd]; if(R&&(R.fz||R.lk)) return h; const fx=v1819pFx(C,C.year,rd); if(!fx.length) return h; const n=v1819pPicked(C,C.year,rd);
    const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h;
    const clr=box.querySelector('.v1817o-clear'); if(clr) clr.remove();
    const b=document.createElement('button'); b.className='dec v1819p-dec'+(n===fx.length?' ok':''); b.dataset.a='go'; b.dataset.r='pickem';
    b.innerHTML=`<span class="dec-ico">${n===fx.length?'✓':'🎯'}</span><span class="grow"><b>${n===fx.length?'Picks in for':'Make your picks for'} Matchday ${rd+1}</b><small>Pick’em Pool · ${n} of ${fx.length} picked · locks ${esc(v1819pLockAt(C,fx))}</small></span><span class="dec-go">${icon('chev',16)}</span>`;
    box.appendChild(b); return t.innerHTML; }catch(e){ console.warn('pickem overview',e); return h; } }; }
