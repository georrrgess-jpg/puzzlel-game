/* v18.11 Player of the Match cards (93_cards.js, styles in 93_cards.css).
   After every match of the user's school (any level, live or simulated) the best-rated player on the user's side gets a
   collectible card, stored on the career as C.cards = {v, list:[card], lk:{pid:look}} (saved with the career, exported
   with it). Presentation only: minting reads the finished match log and never touches a random stream or the result.
   - Rarity: Legendary (hat trick, bicycle kick, rating 9.8+, the player of a won Sectional/Regional/State final),
     Gold (rating 9.0+, a brace rated 8.6+, a scissor kick, a clean sheet with 5+ saves), Silver (rating 7.8+), else Bronze.
   - Reveal: live matches get a full reveal over the pitch once the full-time card is up (the control bar stays usable);
     the round results and simulation summaries show the new cards flipping in inline, and "Open pack" plays the reveal.
   - Card Binder (route 'cards', under Squad): filters by season, rarity, level and player, counts per player, a detail
     view with the flip, and the player profile lists his cards. */
const V1811C={tiers:['bronze','silver','gold','legend'], name:{bronze:'Bronze',silver:'Silver',gold:'Gold',legend:'Legendary'},
  finish:{bronze:'Matte bronze',silver:'Brushed silver',gold:'Gold foil',legend:'Holographic'}, page:48, fresh:[], rv:null, delay:1100};

function v1811cBox(C){ const B=C.cards||(C.cards={v:1,list:[],lk:{}}); if(!Array.isArray(B.list)) B.list=[]; if(!B.lk) B.lk={}; return B; }
function v1811cCmp(a,b){ return (b.rt||0)-(a.rt||0)||(b.g||0)-(a.g||0)||(b.a||0)-(a.a||0)||(b.sv||0)-(a.sv||0)||((b.tk||0)+(b.int||0))-((a.tk||0)+(a.int||0))||(String(a.pid)<String(b.pid)?-1:String(a.pid)>String(b.pid)?1:0); }
function v1811cPick(rows){ let best=null; for(const r of rows||[]){ if(!r||r.gp===0||r.pid==null) continue; if(!best||v1811cCmp(r,best)<0) best=r; } return best; }
function v1811cFinal(f){ return (f.comp==='sec'&&f.rd===2)||f.comp==='rgn'||(f.comp==='st'&&f.rd===2); }
/* pure: the tier and the feat line from the player's row, his goals' finishes and the fixture */
function v1811cRarity(row,o){ o=o||{}; const g=row.g||0, rt=row.rt||0, sty=o.sty||[], grp=ROLE_GROUP[row.role]||'';
  const bike=sty.includes('bike'), sci=sty.includes('scissor'), cs=!!o.cs, fin=!!o.finalWin;
  let rar='bronze'; if(rt>=7.8) rar='silver';
  if(rt>=9||(g>=2&&rt>=8.6)||sci||(grp==='GK'&&cs&&(row.sv||0)>=5)) rar='gold';
  if(g>=3||bike||rt>=9.8||fin) rar='legend';
  const feat=bike?'Bicycle kick':g>=4?g+'-goal haul':g===3?'Hat trick':fin?(f=>f.comp==='st'?'State final hero':f.comp==='rgn'?'Regional final hero':'Section final hero')(o.f||{}):sci?'Scissor kick':g===2?'Brace':(grp==='GK'||grp==='DEF')&&cs?'Clean sheet':(row.a||0)>=2?'Playmaker':(row.sv||0)>=6?'Brick wall':g===1&&o.winner?'Match winner':'';
  return {rar,feat}; }
function v1811cRound(f){ const L=f.lvl&&f.lvl!=='V'?(LVL_NAME[f.lvl]||f.lvl)+' · ':''; const rd=f.rd||0;
  const s=f.comp==='pre'?'Preseason Cup':f.comp==='reg'?`Matchday ${rd+1}`:f.comp==='sec'?['Sectional quarterfinal','Sectional semifinal','Sectional final'][rd]||'Sectionals':f.comp==='rgn'?'Regional final':f.comp==='st'?['State quarterfinal','State semifinal','State final'][rd]||'State Tournament':'Match';
  return L+s; }
/* mint the card for a finished fixture (idempotent: one card per fixture, id 'K'+fid) */
function v1811cMint(C,f,M){ if(!C||!f||f.st!=='d') return null; const u=C.userSid; if(f.h!==u&&f.a!==u) return null;
  const lg=C.logs&&C.logs[f.id]; if(!lg||!lg.box) return null; const B=v1811cBox(C); const id='K'+f.id; if(B.list.some(c=>c.id===id)) return null;
  const i=f.h===u?0:1; const row=v1811cPick(lg.box[i]); if(!row) return null; const p=C.players[row.pid]; if(!p) return null;
  const evs=((M&&M.ev)||lg.ev||[]).filter(e=>e.t==='goal'&&e.pid===row.pid&&e.s===i);
  const us=i===0?f.hg:f.ag, th=i===0?f.ag:f.hg; const won=f.w===u;
  const lastWin=won&&evs.some(e=>e.sc&&e.sc[i]===th+1&&e.sc[1-i]<e.sc[i]);
  const R=v1811cRarity(row,{sty:evs.map(e=>e.sty||''),cs:th===0,finalWin:won&&f.lvl==='V'&&v1811cFinal(f),f,winner:lastWin&&(row.g||0)===1});
  const st={}; for(const k of ['g','a','sh','sot','sv','tk','int','cl','ga']) st[k]=row[k]||0;
  const card={id,pid:p.id,fid:f.id,yr:f.yr,lvl:f.lvl,sid:u,opp:i===0?f.a:f.h,home:i===0,us,th,pk:f.pk?[f.pk[i],f.pk[1-i]]:null,res:won?'W':f.w?'L':'D',comp:f.comp,rd:f.rd||0,
    rt:row.rt||0,rar:R.rar,feat:R.feat,st,role:row.role||p.pos,pos:p.pos,num:p.num,nm:pname(p),fn:p.fn,ln:p.ln,n:B.list.length+1,nw:1};
  B.list.push(card); if(!B.lk[p.id]) B.lk[p.id]={...lookOf(p)}; V1811C.fresh.push(id); return card; }

if(typeof finishMatch==='function'){ const _v1811cFinish=finishMatch;
  finishMatch=function(C,M){ const f=C&&M&&C.fixtures[M.fid]; const was=f&&f.st; const out=_v1811cFinish.apply(this,arguments);
    try{ if(was!=='d'&&f&&f.st==='d') v1811cMint(C,f,M); }catch(e){ console.error(e); }
    return out; }; }
/* save shape: a career from before v18.11 simply starts with an empty binder */
if(typeof migrate==='function'){ const _v1811cMig=migrate; migrate=function(C){ const r=_v1811cMig.apply(this,arguments); try{ if(C&&C.cards) v1811cBox(C); }catch(e){} return r; }; }

/* ---------- card art ---------- */
function v1811cInk(hex){ const h=String(hex||'#000').replace('#',''); const n=h.length===3?h.split('').map(x=>x+x).join(''):h; const r=parseInt(n.slice(0,2),16)/255, g=parseInt(n.slice(2,4),16)/255, b=parseInt(n.slice(4,6),16)/255;
  const L=0.2126*r+0.7152*g+0.0722*b; return L>0.6?'#10141a':'#ffffff'; }
function v1811cPerson(c){ const C=App.C; const B=v1811cBox(C); const p=findPerson(C,c.pid); const base=p?{...p}:{id:c.pid,fn:c.fn,ln:c.ln,num:c.num,pos:c.pos,grade:12};
  base.sid=c.sid; base.look=B.lk[c.pid]||(p&&p.look)||lookOf(base); return base; }
function v1811cStats(c){ const s=c.st||{}, grp=ROLE_GROUP[c.role]||ROLE_GROUP[c.pos]||'MID';
  if(grp==='GK') return [['SV',s.sv],['GA',s.ga],['CL',s.cl],['A',s.a]];
  if(grp==='DEF') return [['TK',s.tk],['INT',s.int],['CL',s.cl],['G',s.g]];
  return [['G',s.g],['A',s.a],['SOT',s.sot],['TK',s.tk+(s.int||0)]]; }
function v1811cMatchLine(c){ const O=Sx(c.opp); const sc=`${c.us}–${c.th}${c.pk?` (${c.pk[0]}–${c.pk[1]} p)`:''}`; return {opp:O?O.town:'Opponent',sc,res:c.res,where:c.home?'vs':'at'}; }
/* o: {w:px width, cls, count:true (numbers count up from 0), back:true (render the back face too)} */
function v1811cCardHTML(c,o){ o=o||{}; const s=Sx(c.sid)||{c1:'#1d4ed8',c2:'#ffffff',town:''}; const p=v1811cPerson(c); const ink=v1811cInk(s.c1); const c1d=_mc(s.c1,'#000000',0.45), c1l=_mc(s.c1,'#ffffff',0.12);
  const ml=v1811cMatchLine(c); const w=o.w||220; const cnt=(v,d)=>o.count?`<b data-v1811c-to="${v}" data-d="${d||0}">${d?'0.0':'0'}</b>`:`<b>${d?Number(v).toFixed(d):v}</b>`;
  const stats=v1811cStats(c).map(([k,v])=>`<span>${cnt(v||0)}<i>${k}</i></span>`).join('');
  const face=`<div class="v1811c-face v1811c-front"><div class="v1811c-panel">
      <div class="v1811c-art"><div class="v1811c-stripes"></div><div class="v1811c-mark">${logo(s,120)}</div><div class="v1811c-por">${portraitSVG(p,140,{c1:s.c1,c2:s.c2})}</div></div>
      <div class="v1811c-tl"><span class="v1811c-rt">${cnt(c.rt,1)}</span><span class="v1811c-rtl">RTG</span><span class="v1811c-pos">${esc(c.pos||'')}</span><span class="v1811c-num">#${esc(c.num==null?'':c.num)}</span></div>
      <div class="v1811c-crest">${logo(s,44)}</div>
      <div class="v1811c-name"><small>${esc(c.fn||'')}</small><b>${esc(c.ln||c.nm||'')}</b></div>
      <div class="v1811c-ml"><span><em class="v1811c-res v1811c-res-${c.res}">${c.res}</em> ${ml.sc} ${ml.where} <b>${esc(ml.opp)}</b></span><small>${esc(v1811cRound(c))} · ${c.yr}</small></div>
      <div class="v1811c-st">${stats}</div>
    </div><div class="v1811c-badge"><b>${V1811C.name[c.rar]}</b>${c.feat?`<i>${esc(c.feat)}</i>`:''}</div><div class="v1811c-holo"></div><div class="v1811c-foil"></div></div>`;
  const back=o.back===false?'':`<div class="v1811c-face v1811c-back"><div class="v1811c-panel"><div class="v1811c-bpat"></div><div class="v1811c-bring">${logo(s,150)}</div><div class="v1811c-bword"><b>Touchline</b><small>Player of the Match</small><i>${esc(s.town||'')}</i></div></div><div class="v1811c-foil"></div></div>`;
  return `<div class="v1811c-card v1811c-r-${c.rar} ${o.cls||''}" style="--w:${w}px;--c1:${s.c1};--c2:${s.c2};--c1d:${c1d};--c1l:${c1l};--ink:${ink}" data-card="${esc(c.id)}"><div class="v1811c-in">${face}${back}</div></div>`; }

/* ---------- the reveal ---------- */
function v1811cOrder(list){ const r=c=>V1811C.tiers.indexOf(c.rar); return list.slice().sort((a,b)=>r(a)-r(b)||a.rt-b.rt||(a.n||0)-(b.n||0)); }
function v1811cTake(ids){ const out=V1811C.fresh.filter(id=>!ids||ids.includes(id)); V1811C.fresh=V1811C.fresh.filter(id=>!out.includes(id)); return out; }
function v1811cById(id){ const C=App.C; return C?v1811cBox(C).list.find(c=>c.id===id)||null:null; }
function v1811cOpen(cards,opts){ opts=opts||{}; cards=(cards||[]).filter(Boolean); if(!cards.length) return; v1811cClose(true);
  const host=opts.host||document.body; const ov=document.createElement('div'); ov.className='v1811c-rv'+(opts.host?' v1811c-rv-in':''); ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Player of the Match card'); ov.tabIndex=-1;
  if(opts.bottom) ov.style.bottom=opts.bottom+'px';
  host.appendChild(ov); const R={ov,cards,i:0,t:[],raf:0,prev:document.activeElement,ph:''}; V1811C.rv=R;
  ov.addEventListener('click',e=>{ if(e.target.closest('button')) return; e.stopPropagation(); v1811cAdvance(); });
  v1811cShow(R); try{ ov.focus({preventScroll:true}); }catch(e){} }
function v1811cSize(R){ const r=R.ov.getBoundingClientRect(); const h=r.height||innerHeight, w=r.width||innerWidth; return Math.round(Math.max(150,Math.min(320,w*0.74,(h-190)/1.4))); }
function v1811cShow(R){ const c=R.cards[R.i]; const rm=reducedMotion(); R.t.forEach(clearTimeout); R.t=[]; cancelAnimationFrame(R.raf); const w=v1811cSize(R); const many=R.cards.length>1; const last=R.i===R.cards.length-1;
  const top=c.rar==='gold'||c.rar==='legend';
  R.ov.className=R.ov.className.replace(/ ?v1811c-t-\w+/g,'')+' v1811c-t-'+c.rar; R.ov.style.setProperty('--w',w+'px');
  R.ov.innerHTML=`<div class="v1811c-rv-bg"></div>${top?'<div class="v1811c-rv-rays"></div>':''}<div class="v1811c-rv-sparks"></div>
    <div class="v1811c-rv-head"><span class="eyebrow">Player of the Match${many?` · ${R.i+1} of ${R.cards.length}`:''}</span></div>
    <div class="v1811c-rv-stage"><div class="v1811c-fly">${v1811cCardHTML(c,{w,count:!rm})}</div></div>
    <div class="v1811c-rv-cap"><b class="v1811c-rv-tier">${V1811C.name[c.rar]}</b><span>${esc(V1811C.finish[c.rar])}${c.feat?` · ${esc(c.feat)}`:''}</span></div>
    <div class="v1811c-rv-act"><button class="btn" data-a="v1811cBinder" data-id="${esc(c.id)}">Card binder</button><button class="btn pri" data-a="v1811cNext">${many&&!last?'Next card':'Done'}</button></div>
    <small class="v1811c-rv-hint">${rm?'':'Click, Esc or Enter to skip'}</small>`;
  if(rm){ v1811cPhase(R,'done'); R.ov.classList.add('v1811c-rm'); return; }
  const T=(ms,f)=>R.t.push(setTimeout(f,ms));
  v1811cPhase(R,'in'); T(760,()=>v1811cPhase(R,'tease')); T(1150,()=>v1811cPhase(R,'flip'));
  T(1900,()=>{ v1811cPhase(R,'show'); v1811cCount(R,900); if(top) v1811cSparks(R,c.rar==='legend'?44:30); });
  T(2900,()=>v1811cPhase(R,'done')); }
function v1811cPhase(R,ph){ R.ph=ph; R.ov.dataset.ph=ph; if(ph==='done'){ R.ov.querySelectorAll('[data-v1811c-to]').forEach(el=>{ const d=+el.dataset.d||0; el.textContent=Number(el.dataset.v1811cTo).toFixed(d); }); } }
function v1811cCount(R,dur){ const els=[...R.ov.querySelectorAll('[data-v1811c-to]')]; const t0=performance.now();
  const step=now=>{ const k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,3); for(const el of els){ const d=+el.dataset.d||0; el.textContent=(Number(el.dataset.v1811cTo)*e).toFixed(d); } if(k<1&&V1811C.rv===R) R.raf=requestAnimationFrame(step); };
  R.raf=requestAnimationFrame(step); }
function v1811cSparks(R,n){ const box=R.ov.querySelector('.v1811c-rv-sparks'); if(!box) return; const leg=R.cards[R.i].rar==='legend'; let h='';
  for(let k=0;k<n;k++){ const a=Math.random()*Math.PI*2, d=120+Math.random()*260, s=3+Math.random()*6; const col=leg?`hsl(${Math.round(Math.random()*360)} 95% 75%)`:['#fff4c2','#ffd76a','#f6b73c','#ffffff'][k%4];
    h+=`<i style="--x:${Math.round(Math.cos(a)*d)}px;--y:${Math.round(Math.sin(a)*d*0.8)}px;--s:${s.toFixed(1)}px;--d:${Math.round(Math.random()*180)}ms;--c:${col}"></i>`; }
  box.innerHTML=h; }
function v1811cAdvance(){ const R=V1811C.rv; if(!R) return; if(R.ph!=='done'){ R.t.forEach(clearTimeout); R.t=[]; cancelAnimationFrame(R.raf); R.ov.classList.add('v1811c-skip'); v1811cPhase(R,'done'); return; }
  if(R.i<R.cards.length-1){ R.i++; R.ov.classList.remove('v1811c-skip'); v1811cShow(R); return; } v1811cClose(); }
function v1811cClose(quiet){ const R=V1811C.rv; if(!R) return; V1811C.rv=null; R.t.forEach(clearTimeout); cancelAnimationFrame(R.raf); const ov=R.ov;
  if(quiet||reducedMotion()) ov.remove(); else { ov.classList.add('v1811c-out'); setTimeout(()=>ov.remove(),260); }
  if(!quiet&&R.prev&&R.prev.isConnected) try{ R.prev.focus({preventScroll:true}); }catch(e){} }
document.addEventListener('keydown',e=>{ const R=V1811C.rv; if(!R) return; if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); if(R.ph!=='done') v1811cAdvance(); else v1811cClose(); return; }
  if(e.key==='Enter'||e.key===' '){ if(R.ph==='done'&&e.target&&e.target.closest&&e.target.closest('.v1811c-rv button')) return; e.preventDefault(); e.stopImmediatePropagation(); v1811cAdvance(); return; }
  if(e.key==='ArrowRight'&&R.ph==='done'&&R.i<R.cards.length-1){ e.preventDefault(); e.stopImmediatePropagation(); v1811cAdvance(); } },true);
A.v1811cNext=()=>v1811cAdvance();
A.v1811cBinder=()=>{ const live=!!App.live; v1811cClose(true); if(live){ A.liveContinue(); return; } App.modal=null; A.go({dataset:{r:'cards'}}); };
A.v1811cPack=el=>{ const ids=String(el.dataset.ids||'').split(',').filter(Boolean); v1811cOpen(v1811cOrder(ids.map(v1811cById).filter(Boolean))); };

/* live: the reveal opens over the pitch once the full-time card is up; the control bar (Continue, Match report) stays clickable */
if(typeof endLive==='function'){ const _v1811cEnd=endLive;
  endLive=function(){ const L=App.live; const had=L&&!L.done; const r=_v1811cEnd.apply(this,arguments);
    try{ if(had&&L&&L.done&&App.C){ const c=v1811cById('K'+L.fid); if(c){ v1811cTake([c.id]); clearTimeout(V1811C.lt);
        V1811C.lt=setTimeout(()=>{ if(App.live!==L||App.modal) return; const root=document.querySelector('.live'); const ctrl=document.getElementById('lv-ctrl'); if(!root) return;
          const rr=root.getBoundingClientRect(), cr=ctrl?ctrl.getBoundingClientRect():null; const bottom=cr&&cr.height?Math.max(0,Math.round(rr.bottom-cr.top)):0;
          v1811cOpen([c],{host:root,bottom}); }, (reducedMotion()?200:1500)+V1811C.delay); } } }catch(e){ console.error(e); }
    return r; }; }
if(typeof closeLiveAndContinue==='function'){ const _v1811cCLC=closeLiveAndContinue;
  closeLiveAndContinue=function(){ clearTimeout(V1811C.lt); if(V1811C.rv&&V1811C.rv.ov.classList.contains('v1811c-rv-in')) v1811cClose(true); return _v1811cCLC.apply(this,arguments); }; }

/* round results and simulation summaries: the new cards flip in inline; Open pack plays the full reveal */
function v1811cPackHTML(m,cards,title){ if(!cards.length) return ''; const first=!m._v1811cAn; m._v1811cAn=1; const ord=v1811cOrder(cards); const show=ord.slice(-3).reverse();
  const cnt={}; for(const c of cards) cnt[c.rar]=(cnt[c.rar]||0)+1; const chips=V1811C.tiers.slice().reverse().filter(t=>cnt[t]).map(t=>`<span class="v1811c-chip v1811c-chip-${t}">${cnt[t]} ${V1811C.name[t]}</span>`).join('');
  return `<div class="v1811c-pack ${first?'v1811c-anim':''}"><div class="v1811c-fan n${show.length}">${show.map((c,k)=>`<button class="v1811c-fc" style="--k:${k}" data-a="v1811cPack" data-ids="${esc(c.id)}" aria-label="Reveal ${esc(c.nm)}'s ${V1811C.name[c.rar]} card">${v1811cCardHTML(c,{w:118,back:true})}</button>`).join('')}</div>
    <div class="v1811c-pinfo"><span class="eyebrow">${esc(title)}</span><b>${cards.length===1?esc(cards[0].nm):`${cards.length} new cards`}</b><div class="v1811c-chips">${chips}</div><small class="muted">${cards.length===1?`${esc(V1811C.finish[cards[0].rar])}${cards[0].feat?' · '+esc(cards[0].feat):''} · rating ${fmtRt(cards[0].rt)}`:'Added to your Card Binder'}</small>
    <div class="v1811c-pbtn"><button class="btn sm" data-a="v1811cPack" data-ids="${esc(ord.slice(-5).map(c=>c.id).join(','))}">${cards.length>1?'Open pack':'Reveal card'}</button><button class="btn sm ghost" data-a="v1811cGoBinder">Card binder</button></div></div></div>`; }
const fmtRt=v=>Number(v||0).toFixed(1);
A.v1811cGoBinder=()=>{ App.modal=null; A.go({dataset:{r:'cards'}}); };
if(MODALS.results){ const _v1811cRes=MODALS.results; MODALS.results=m=>{ const h=_v1811cRes(m); try{ const C=App.C; if(!m.v1811c){ const ids=(m.ids||[]).map(id=>'K'+id); v1811cTake(ids); m.v1811c=ids.filter(id=>v1811cById(id)); }
    const cards=m.v1811c.map(v1811cById).filter(Boolean); if(!cards.length) return h; const add=v1811cPackHTML(m,cards,'Player of the Match');
    const i=h.indexOf('<div class="mbody">'); return i<0?h:h.slice(0,i+19)+add+h.slice(i+19); }catch(e){ console.error(e); return h; } }; }
if(MODALS.simSummary){ const _v1811cSum=MODALS.simSummary; MODALS.simSummary=m=>{ const h=_v1811cSum(m); try{ if(!m.v1811c) m.v1811c=v1811cTake(); const cards=m.v1811c.map(v1811cById).filter(Boolean); if(!cards.length) return h;
    const add=v1811cPackHTML(m,cards,cards.length===1?'Player of the Match':'Player of the Match cards'); const i=h.lastIndexOf('<div class="mfoot">'); return i<0?h+add:h.slice(0,i).replace(/<\/div>$/,add+'</div>')+h.slice(i); }catch(e){ console.error(e); return h; } }; }

/* ---------- Card Binder ---------- */
ICON.cards='<rect x="7" y="3" width="12" height="16" rx="2"/><path d="M5 6.5v12A2.5 2.5 0 0 0 7.5 21H15"/><path d="M13 7.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>';
NAV_ICON.cards='cards'; TITLES.cards='Card Binder';
if(typeof NAV_DESC!=='undefined') NAV_DESC.cards='Player of the Match cards';
if(typeof TOPNAV!=='undefined'){ const g=TOPNAV.find(t=>t[0]==='squads'); if(g&&!g[3].includes('cards')) g[3].push('cards'); }
{ const i=NAV.findIndex(x=>x[0]==='dev'); if(i>=0&&!NAV.some(x=>x[0]==='cards')) NAV.splice(i+1,0,['cards','Card Binder']); }
if(typeof navBadges==='function'){ const _v1811cNB=navBadges; navBadges=function(C){ const b=_v1811cNB(C); try{ const n=C&&C.cards?C.cards.list.filter(c=>c.nw).length:0; if(n) b.cards=String(Math.min(n,99)); }catch(e){} return b; }; }

function v1811cFilter(C,P){ let L=v1811cBox(C).list.slice(); if(P.yr) L=L.filter(c=>String(c.yr)===String(P.yr)); if(P.rar) L=L.filter(c=>c.rar===P.rar); if(P.lvl) L=L.filter(c=>c.lvl===P.lvl); if(P.pid) L=L.filter(c=>c.pid===P.pid);
  const r=c=>V1811C.tiers.indexOf(c.rar); const so=P.sort||'new';
  L.sort(so==='rar'?(a,b)=>r(b)-r(a)||b.rt-a.rt||b.n-a.n:so==='rt'?(a,b)=>b.rt-a.rt||r(b)-r(a)||b.n-a.n:(a,b)=>b.n-a.n); return L; }
VIEWS.cards=()=>{ const C=App.C; const B=v1811cBox(C); const P=App.params||{}; const all=B.list; const s=Sx(C.userSid);
  const by={}; for(const c of all) by[c.rar]=(by[c.rar]||0)+1; const players={}; for(const c of all){ const q=players[c.pid]||(players[c.pid]={pid:c.pid,nm:c.nm,n:0,best:'bronze',c}); q.n++; if(V1811C.tiers.indexOf(c.rar)>V1811C.tiers.indexOf(q.best)){ q.best=c.rar; } }
  const years=[...new Set(all.map(c=>c.yr))].sort((a,b)=>b-a); const plist=Object.values(players).sort((a,b)=>b.n-a.n||a.nm.localeCompare(b.nm));
  const chip=(k,v,label,extra)=>`<button class="v1811c-f ${String(P[k]||'')===String(v)?'on':''} ${extra||''}" data-a="v1811cF" data-k="${k}" data-v="${esc(v)}" aria-pressed="${String(P[k]||'')===String(v)}">${label}</button>`;
  const sel=(k,arr,label)=>`<label class="v1811c-sel"><span class="lab">${label}</span><select data-c="v1811cSel" data-k="${k}" aria-label="${label}">${arr.map(([v,t])=>`<option value="${esc(v)}" ${String(P[k]||'')===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
  const stat=(t)=>`<div class="v1811c-sum-t v1811c-sum-${t}"><i></i><b>${by[t]||0}</b><span>${V1811C.name[t]}</span></div>`;
  const head=`<section class="v1811c-head" style="--c1:${s.c1};--c2:${s.c2}"><div class="v1811c-hcrest">${logo(s,72)}</div><div class="v1811c-htxt"><span class="eyebrow">${esc(s.town)} · Player of the Match</span><h2>${all.length} card${all.length===1?'':'s'} collected</h2><p class="muted small">After every match of yours, at every level, the best-rated player earns a card. Hat tricks, bicycle kicks and final heroes are Legendary.</p></div><div class="v1811c-sum">${V1811C.tiers.slice().reverse().map(stat).join('')}</div></section>`;
  if(!all.length) return head+`<div class="v1811c-empty"><div class="v1811c-ghost">${v1811cBackOnly(s)}</div><div><h3>The binder is empty</h3><p class="muted">Play or simulate your next match: the ${esc(s.town)} Player of the Match will be your first card.</p><button class="btn pri" data-a="playNext">${esc(typeof playLabel==='function'?playLabel(C):'Play next match')}</button></div></div>`;
  const L=v1811cFilter(C,P); const n=Math.max(V1811C.page,+P.n||V1811C.page); const shown=L.slice(0,n);
  const filters=`<div class="v1811c-filters"><div class="v1811c-chiprow" role="group" aria-label="Rarity">${chip('rar','','All')}${V1811C.tiers.slice().reverse().map(t=>chip('rar',t,`<i class="v1811c-dot v1811c-dot-${t}"></i>${V1811C.name[t]}`)).join('')}</div>
    <div class="v1811c-selrow">${sel('yr',[['','All seasons'],...years.map(y=>[y,String(y)])],'Season')}${sel('lvl',[['','All levels'],['V','Varsity'],['JV','JV'],['MOD','Modified']],'Level')}${sel('pid',[['','All players'],...plist.map(q=>[q.pid,`${q.nm} (${q.n})`])],'Player')}${sel('sort',[['new','Newest first'],['rar','Rarity'],['rt','Rating']],'Sort')}</div></div>`;
  const top=`<div class="v1811c-top"><span class="lab">Most cards</span><div class="v1811c-toprow">${plist.slice(0,8).map(q=>`<button class="v1811c-pc ${P.pid===q.pid?'on':''}" data-a="v1811cF" data-k="pid" data-v="${esc(P.pid===q.pid?'':q.pid)}"><span class="v1811c-pcf">${portraitSVG(v1811cPerson(q.c),34,{c1:s.c1,c2:s.c2})}</span><span class="grow"><b>${esc(q.nm)}</b><small><i class="v1811c-dot v1811c-dot-${q.best}"></i>best ${V1811C.name[q.best]}</small></span><em>${q.n}</em></button>`).join('')}</div></div>`;
  const grid=shown.length?`<div class="v1811c-grid">${shown.map(c=>`<button class="v1811c-gc" data-a="v1811cView" data-id="${esc(c.id)}" aria-label="${esc(c.nm)}, ${V1811C.name[c.rar]} card, rating ${fmtRt(c.rt)}">${c.nw?'<span class="v1811c-new">New</span>':''}${v1811cCardHTML(c,{w:176,back:false})}</button>`).join('')}</div>${L.length>n?`<div class="v1811c-more"><button class="btn" data-a="v1811cF" data-k="n" data-v="${n+V1811C.page}">Show more (${L.length-n} left)</button></div>`:''}`
    :`<div class="v1811c-empty sm"><div><h3>No cards match these filters</h3><button class="btn" data-a="v1811cReset">Clear filters</button></div></div>`;
  if(all.some(c=>c.nw)) setTimeout(()=>{ if(App.route!=='cards'||!App.C) return; let ch=0; for(const c of v1811cBox(App.C).list) if(c.nw){ delete c.nw; ch=1; } if(ch) queueSave(); },400);
  return head+filters+top+`<div class="v1811c-count small muted">${L.length} of ${all.length} cards</div>`+grid; };
function v1811cBackOnly(s){ return `<div class="v1811c-card v1811c-r-silver v1811c-flipped" style="--w:150px;--c1:${s.c1};--c2:${s.c2};--c1d:${_mc(s.c1,'#000000',0.45)};--c1l:${_mc(s.c1,'#ffffff',0.12)}"><div class="v1811c-in"><div class="v1811c-face v1811c-back"><div class="v1811c-panel"><div class="v1811c-bpat"></div><div class="v1811c-bring">${logo(s,150)}</div><div class="v1811c-bword"><b>Touchline</b><small>Player of the Match</small></div></div></div></div></div>`; }
A.v1811cF=el=>{ const k=el.dataset.k, v=el.dataset.v; const P={...(App.params||{})}; if(v===''||v==null) delete P[k]; else P[k]=v; if(k!=='n') delete P.n; App.params=P; App.keepScroll=true; render(); };
CH.v1811cSel=el=>A.v1811cF({dataset:{k:el.dataset.k,v:el.value}});
A.v1811cReset=()=>{ App.params={}; render(); };
A.v1811cView=el=>{ const C=App.C; const P=App.route==='cards'?App.params||{}:{}; const ids=App.route==='cards'?v1811cFilter(C,P).map(c=>c.id):(el.dataset.ids||'').split(',').filter(Boolean);
  App.modal={type:'v1811cCard',id:el.dataset.id,ids:ids.length?ids:[el.dataset.id],back:App.modal&&App.modal.type!=='v1811cCard'?App.modal:(App.modal&&App.modal.back)||null,an:1}; renderModal(); };
A.v1811cStep=el=>{ const m=App.modal; if(!m) return; const i=m.ids.indexOf(m.id); const j=i+(+el.dataset.d); if(j<0||j>=m.ids.length) return; m.id=m.ids[j]; m.an=1; m.fl=0; renderModal(); };
A.v1811cFlip=()=>{ const m=App.modal; if(!m) return; m.fl=!m.fl; m.an=0; const el=document.querySelector('.v1811c-det .v1811c-card'); if(el) el.classList.toggle('v1811c-flipped',!!m.fl); else renderModal(); };
MODALS.v1811cCard=m=>{ const C=App.C; const c=v1811cById(m.id); if(!c) return modalShell('<h2>Card</h2>','<p class="muted">This card is no longer in the binder.</p>','<button class="btn" data-a="closeModal">Close</button>');
  const an=m.an; m.an=0; const i=m.ids.indexOf(c.id); const O=Sx(c.opp); const p=findPerson(C,c.pid); const all=v1811cBox(C).list.filter(x=>x.pid===c.pid);
  const tally=V1811C.tiers.slice().reverse().map(t=>{ const k=all.filter(x=>x.rar===t).length; return k?`<span class="v1811c-chip v1811c-chip-${t}">${k} ${V1811C.name[t]}</span>`:''; }).join('');
  const st=v1811cStats(c).map(([k,v])=>`<div><b>${v||0}</b><span>${k}</span></div>`).join('');
  const body=`<div class="v1811c-det"><div class="v1811c-dstage ${an?'v1811c-anim':''}" data-v1811c-tilt>${v1811cCardHTML(c,{w:280,cls:m.fl?'v1811c-flipped':''})}</div>
    <div class="v1811c-dinfo"><span class="eyebrow">${esc(V1811C.finish[c.rar])} · card ${c.n}</span><h3>${esc(c.nm)}</h3><p class="muted small">${esc(c.pos||'')} · #${esc(c.num==null?'':c.num)} · ${esc(LVL_NAME[c.lvl]||c.lvl)}${p?'':' · graduated'}</p>
      <div class="v1811c-dline"><b class="v1811c-res v1811c-res-${c.res}">${c.res}</b> ${c.us}–${c.th}${c.pk?` (${c.pk[0]}–${c.pk[1]} pens)`:''} ${c.home?'vs':'at'} ${O?esc(O.town):''}<small>${esc(v1811cRound(c))} · ${c.yr}</small></div>
      ${c.feat?`<div class="v1811c-feat">${esc(c.feat)}</div>`:''}
      <div class="v1811c-dst"><div><b>${fmtRt(c.rt)}</b><span>RTG</span></div>${st}</div>
      <div class="v1811c-dtally"><span class="lab">His cards (${all.length})</span><div class="v1811c-chips">${tally}</div></div>
      <div class="v1811c-dbtn"><button class="btn sm" data-a="v1811cFlip">Flip card</button>${C.fixtures[c.fid]?`<button class="btn sm" data-a="openFixture" data-id="${esc(c.fid)}">Match report</button>`:''}${p||C.alumni[c.pid]?`<button class="btn sm" data-a="openPlayer" data-id="${esc(c.pid)}">Profile</button>`:''}</div></div></div>`;
  const foot=`<button class="btn" data-a="v1811cStep" data-d="-1" ${i<=0?'disabled':''} aria-label="Previous card">‹ Prev</button><span class="v1811c-pg small muted">${i+1} / ${m.ids.length}</span><button class="btn" data-a="v1811cStep" data-d="1" ${i>=m.ids.length-1?'disabled':''} aria-label="Next card">Next ›</button><button class="btn pri" data-a="closeModal">Close</button>`;
  return modalShell(`<h2>${V1811C.name[c.rar]} card</h2>`,body,foot,'wide v1811c-modal'); };
/* tilt: the detail card follows the pointer, and the foil follows the light */
document.addEventListener('pointermove',e=>{ const st=e.target&&e.target.closest&&e.target.closest('[data-v1811c-tilt]'); if(!st||reducedMotion()) return; const card=st.querySelector('.v1811c-card'); if(!card) return; const r=card.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width-0.5, y=(e.clientY-r.top)/r.height-0.5; card.style.setProperty('--rx',(-y*14).toFixed(2)+'deg'); card.style.setProperty('--ry',(x*18).toFixed(2)+'deg'); card.style.setProperty('--mx',((x+0.5)*100).toFixed(1)+'%'); card.classList.add('v1811c-tilting'); },{passive:true});
document.addEventListener('pointerout',e=>{ const st=e.target&&e.target.closest&&e.target.closest('[data-v1811c-tilt]'); if(!st||(e.relatedTarget&&st.contains(e.relatedTarget))) return; const card=st.querySelector('.v1811c-card'); if(card){ card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); card.classList.remove('v1811c-tilting'); } },{passive:true});

/* player profile: his cards */
if(MODALS.player){ const _v1811cMP=MODALS.player; MODALS.player=m=>{ const h=_v1811cMP(m); try{ if((m.tab||'overview')!=='overview'||!App.C) return h; const cards=v1811cBox(App.C).list.filter(c=>c.pid===m.id); if(!cards.length) return h;
    const ord=cards.slice().sort((a,b)=>V1811C.tiers.indexOf(b.rar)-V1811C.tiers.indexOf(a.rar)||b.rt-a.rt).slice(0,6); const ids=ord.map(c=>c.id).join(',');
    const sec=`<div class="v1811c-mini"><div class="v1811c-mhd"><span class="eyebrow">Player of the Match cards · ${cards.length}</span><button class="link" data-a="v1811cF2" data-pid="${esc(m.id)}">Open in binder</button></div><div class="v1811c-mrow">${ord.map(c=>`<button class="v1811c-gc" data-a="v1811cView" data-id="${esc(c.id)}" data-ids="${esc(ids)}" aria-label="${esc(V1811C.name[c.rar])} card, ${esc(v1811cRound(c))} ${c.yr}">${v1811cCardHTML(c,{w:96,back:false})}</button>`).join('')}</div></div>`;
    const i=h.lastIndexOf('<div class="mfoot">'); return i<0?h+sec:h.slice(0,i)+sec+h.slice(i); }catch(e){ console.error(e); return h; } }; }
A.v1811cF2=el=>{ App.modal=null; A.go({dataset:{r:'cards',p:JSON.stringify({pid:el.dataset.pid})}}); };
