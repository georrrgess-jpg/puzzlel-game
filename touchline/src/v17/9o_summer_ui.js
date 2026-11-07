/* v18.21 Summer Development: the Summer tab on Squads -> Development, the Overview chip and "This week" item, the
   Play reminder and the nav badge. Identifiers v1821u. */
const V1821U_UI={};
function v1821uPct(m){ const v=Math.round((m-1)*100); return (v>0?'+':v<0?'−':'')+Math.abs(v)+'%'; }
function v1821uSign(v){ return (v>=0?'+':'−')+fmt1(Math.abs(v)); }
function v1821uLastRep(C){ const S=C.smr; if(!S||!S.hist) return null; const ys=Object.keys(S.hist).map(Number).sort((a,b)=>b-a); return ys.length?S.hist[ys[0]]:null; }
function v1821uMeter(C){ const bud=v1821uBudget(C); const used=v1821uUsed(C); const s=C.schools[C.userSid]; const pr=s.prestige||0; const bonus=bud-V1821U.BASE;
  const cells=Array.from({length:bud},(_,i)=>`<i class="${i<used?'on':''}"></i>`).join('');
  return `<div class="v1821u-meter" role="group" aria-label="Summer points"><div class="v1821u-mh"><b><span class="v1821u-big">${used}</span> of ${bud} points used</b><span class="${used<bud?'v1821u-left':'muted'}">${bud-used} left${used<bud?' · unspent points are lost':''}</span></div>
    <div class="v1821u-cells" role="meter" aria-valuemin="0" aria-valuemax="${bud}" aria-valuenow="${used}" aria-label="${used} of ${bud} points used">${cells}</div>
    <p class="tiny muted v1821u-form">Budget = ${V1821U.BASE} + 1 per ${V1821U.STEP} prestige over ${V1821U.FROM} (max ${V1821U.MAX}). Prestige ${pr} → ${V1821U.BASE} + ${bonus} = <b>${bud}</b> points.</p></div>`; }
function v1821uCards(){ return `<div class="v1821u-progs">${V1821U_K.map(k=>{ const P=V1821U_P[k];
    return `<div class="v1821u-prog k-${k}"><div class="v1821u-ph"><span class="v1821u-pi" aria-hidden="true">${P.ico}</span><b>${esc(P.n)}</b><span class="v1821u-cost">${P.cost?P.cost+' pt'+(P.cost===1?'':'s'):'Free'}</span></div>
      <div class="v1821u-eff">${P.m>1?`<b class="good">${v1821uPct(P.m)}</b> offseason growth`:'<b>No change</b> to growth'}${P.fl?` · leans to ${esc(P.fl)}`:''}${P.bump?` · ${Math.round(V1821U.BUMP*100)}% chance of +1 POT`:''}</div>
      <div class="tiny muted"><b class="v1821u-wh">${esc(P.who)}</b><span class="v1821u-d"> · ${esc(P.d)}</span></div></div>`; }).join('')}</div>`; }
function v1821uOpts(C,p,cur){ const left=v1821uLeft(C)+(cur?V1821U_P[cur].cost:0);
  return V1821U_K.filter(k=>k==='rest'||v1821uOk(C,p,k)).map(k=>{ const P=V1821U_P[k]; const sel=(cur||'rest')===k; const dis=!sel&&P.cost>left;
    return `<option value="${k}"${sel?' selected':''}${dis?' disabled':''}>${esc(P.n)}${P.cost?` · ${P.cost} pt${P.cost===1?'':'s'} · ${v1821uPct(P.m)}`:' · free'}${dis?' (not enough points)':''}</option>`; }).join(''); }
function v1821uRow(C,p,open){ const S=C.smr; const cur=open?(S&&S.plan[C.year]&&S.plan[C.year].a[p.id])||null:null; const k=cur&&v1821uOk(C,p,cur)?cur:null; const e=v1821uExp(C,p,k); const gap=p.pot-ovr(p); const x=e.with-e.home;
  const exp=gap<=0.05?'<span class="muted">At his potential: no growth left</span>':`<span>Home <b>+${fmt1(e.home)}</b></span>${k?`<span class="v1821u-arrow" aria-hidden="true">→</span><span>${esc(V1821U_P[k].n)} <b class="good">+${fmt1(e.with)}</b></span><span class="v1821u-x">${x>=0.05?'+'+fmt1(x)+' OVR':'no extra'}</span>`:''}`;
  return `<div class="v1821u-r${k?' on':''}"><div class="v1821u-who">${posTag(p.pos)}<div class="v1821u-nm">${pLink(p.id)}<span class="tiny muted">Gr ${p.grade} · OVR ${Math.round(ovr(p))} / POT ${p.pot}</span></div></div>
    <div class="v1821u-exp small">${exp}</div>
    <label class="v1821u-pick"><span class="v1821u-pl">Summer program</span><select data-c="v1821uPick" data-id="${p.id}" aria-label="Summer program for ${esc(pname(p))}"${open?'':' disabled'}>${v1821uOpts(C,p,k)}</select></label></div>`; }
function v1821uRoster(C){ const u=C.userSid; const open=v1821uOpen(C); const S=v1821uS(C); if(open) v1821uPrune(C);
  const out=LVLS.map(l=>{ const all=squad(C,u,l); const ps=all.filter(p=>p.grade<12).sort((a,b)=>v1821uExp(C,b,null).home-v1821uExp(C,a,null).home||a.grade-b.grade); const sen=all.length-ps.length;
    const P=S.plan[C.year]; const n=P?ps.filter(p=>P.a[p.id]).length:0;
    return `<section class="v1821u-lv"><div class="v1821u-lh"><h4>${LVL_NAME[l]}</h4><span class="chip">${n} at programs</span>${sen?`<span class="tiny muted">${sen} senior${sen===1?'':'s'} graduate${sen===1?'s':''} and can't go</span>`:''}</div>
      ${ps.length?`<div class="v1821u-rows">${ps.map(p=>v1821uRow(C,p,open)).join('')}</div>`:'<p class="muted small">No returning players at this level.</p>'}</section>`; }).join('');
  return out; }
function v1821uRepCard(C,R,title){ if(!R) return `<section class="card v1821u-rep"><div class="hd"><h3>${title||'Summer report'}</h3></div><p class="muted small">No summer report yet. The first one comes when you start the next season with players at programs.</p></section>`;
  const rows=R.rows.map(x=>{ const P=V1821U_P[x.k]||V1821U_P.rest; const ex=x.got-x.home; return `<tr><td>${C.players[x.id]?pLink(x.id,x.nm):esc(x.nm)}</td><td>${LVL_NAME[x.lvl]}</td><td><span aria-hidden="true">${P.ico}</span> ${esc(P.n)}${x.bump?' <span class="pill v1821u-bp">+1 POT</span>':''}</td><td class="n">+${fmt1(x.home)}</td><td class="n"><b>+${fmt1(x.got)}</b></td><td class="n ${ex>=0.05?'good':''}">${v1821uSign(ex)}</td></tr>`; }).join('');
  return `<section class="card v1821u-rep"><div class="hd"><h3>${title||'Summer report'} ${R.yr}</h3><span class="chip">${R.used} of ${R.bud} points</span></div>
    ${R.rows.length?`<div class="v1821u-sum3"><div><b class="good">${v1821uSign(R.extra)}</b><small>OVR more than staying home</small></div><div><b>+${fmt1(R.got)}</b><small>OVR gained at programs</small></div><div><b>${R.rows.length}</b><small>player${R.rows.length===1?'':'s'} sent${R.bumps?` · ${R.bumps} raised his potential`:''}</small></div></div>
    <div class="tw v1821u-tw"><table><thead><tr><th>Player</th><th>Level</th><th>Program</th><th class="n" title="Offseason growth he would have had at home">At home</th><th class="n" title="Offseason growth he actually had">Actual</th><th class="n">Extra</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<p class="muted small">Nobody went to a summer program; ${R.bud} points went unused.</p>`}</section>`; }
function v1821uHist(C){ const S=C.smr; const ys=S?Object.keys(S.hist).map(Number).sort((a,b)=>b-a):[]; if(ys.length<2) return '';
  return `<section class="card v1821u-hist"><div class="hd"><h3>Past summers</h3></div><ul class="v1821u-hl">${ys.map(y=>{ const R=S.hist[y]; return `<li><b>${y}</b><span>${R.rows.length} player${R.rows.length===1?'':'s'} · ${R.used}/${R.bud} pts</span><span class="${R.extra>=0.05?'good':'muted'}">${v1821uSign(R.extra)} OVR vs home</span></li>`; }).join('')}</ul></section>`; }
function v1821uTotals(C){ const P=C.smr&&C.smr.plan[C.year]; let home=0,w=0,n=0; if(P) for(const id in P.a){ const p=C.players[id]; if(!p||!v1821uOk(C,p,P.a[id])) continue; const e=v1821uExp(C,p,P.a[id]); home+=e.home; w+=e.with; n++; } return {n,x:w-home}; }
function v1821uRender(C){ const open=v1821uOpen(C); const T=open?v1821uTotals(C):null; const last=v1821uLastRep(C);
  const head=open?`<section class="card v1821u-top"><div class="hd"><h3>Summer programs</h3><span class="chip acc">Offseason</span></div>
      <p class="small muted v1821u-lead">Send returning players to a program before you start the ${C.year+1} season. Each program multiplies that player's offseason growth (the bigger half of a year's growth); nobody passes his potential, and every player's combined boosts are capped at ${v1821uPct(V1821D.CAP[1])}.</p>
      <div class="v1821u-tg">${v1821uMeter(C)}<div class="v1821u-act"><div class="v1821u-xp"><b class="${T.x>=0.05?'good':''}">+${fmt1(T.x)}</b><small>expected extra OVR this summer · ${T.n} player${T.n===1?'':'s'}</small></div>
        <div class="v1821u-bt"><button class="btn pri" data-a="v1821uSuggest">Suggest for me</button><button class="btn" data-a="v1821uClear"${T.n?'':' disabled'}>Clear</button></div></div></div>
      <p class="tiny muted">Suggest for me spends the budget where it adds the most growth per point, young high-potential players first. You can change any pick.</p></section>`
    :`<section class="card v1821u-top"><div class="hd"><h3>Summer programs</h3><span class="chip">Opens after the season</span></div>
      <p class="small muted v1821u-lead">When the ${C.year} season is over you get ${v1821uBudget(C)} summer points to send returning players to camps, club seasons and academies before rollover. Each program multiplies that player's offseason growth.</p></section>`;
  return `<div class="v1821u">${head}<section class="card"><div class="hd"><h3>Programs</h3><span class="small muted">One program per player · seniors graduate and can't go</span></div>${v1821uCards()}</section>
    ${open?`<section class="card v1821u-ros"><div class="hd"><h3>Your returning players</h3><span class="small muted">Expected offseason OVR: at home → with the program</span></div>${v1821uRoster(C)}</section>`:''}
    ${v1821uRepCard(C,last,open?'Last summer':'Summer report')}${v1821uHist(C)}</div>`; }
function v1821uRefresh(){ App.keepScroll=true; queueSave(); render(); }
CH.v1821uPick=el=>{ const C=App.C; const r=v1821uSet(C,el.dataset.id,el.value); if(!r.ok) toast(r.why); v1821uRefresh(); };
A.v1821uSuggest=()=>{ const C=App.C; const P=v1821uSuggest(C); if(P){ const T=v1821uTotals(C); toast(`Suggested: ${T.n} player${T.n===1?'':'s'}, ${v1821uUsed(C)} of ${v1821uBudget(C)} points, about +${fmt1(T.x)} extra OVR.`); } v1821uRefresh(); };
A.v1821uClear=()=>{ v1821uClear(App.C); v1821uRefresh(); };
A.v1821uOpenTab=()=>{ App.modal=null; App.route='dev'; App.params={dtab:'summer'}; renderModal(); render(); window.scrollTo(0,0); };
A.v1821uGoOn=()=>{ App.modal=null; renderModal(); A.playNext(); };
v1821dTab({id:'summer',label:'Summer',ico:'☀️',order:50,render:C=>v1821uRender(C),
  summary:C=>{ if(v1821uOpen(C)){ const b=v1821uBudget(C), u=v1821uUsed(C); return {t:`Summer: ${u} of ${b} points used`,s:u<b?`${b-u} left · unspent points are lost`:'Budget spent · see the expected gains',warn:u<b}; }
    const R=v1821uLastRep(C); if(R&&R.rows.length&&R.yr===C.year-1) return {t:`Last summer: ${v1821uSign(R.extra)} OVR from camps`,s:`${R.rows.length} player${R.rows.length===1?'':'s'} at programs · ${R.used} of ${R.bud} points`}; return null; },
  badge:C=>{ if(!v1821uOpen(C)) return ''; const l=v1821uLeft(C); return l>0?l:''; }});
/* the nav badge on Development while points are unspent */
{ const _nb=navBadges; navBadges=function(C){ const b=_nb.apply(this,arguments); try{ if(C&&v1821uOpen(C)&&App.route!=='dev'&&!b.dev&&v1821uLeft(C)>0) b.dev=String(v1821uLeft(C)); }catch(e){} return b; }; }
/* the Overview's This week strip */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; if(!v1821uOpen(C)) return h; const left=v1821uLeft(C); if(left<=0) return h;
    const t=document.createElement('template'); t.innerHTML=h; let box=t.content.querySelector('.v1817o-items');
    if(!box){ const hero=t.content.querySelector('.hero'); if(!hero) return h; const sec=document.createElement('section'); sec.className='card v1821u-week'; sec.innerHTML='<div class="hd"><h3>This week</h3><span class="small muted">Before the next season</span></div><div class="v1821u-wi"></div>'; hero.after(sec); box=sec.querySelector('.v1821u-wi'); }
    const cl=box.querySelector('.v1817o-clear'); if(cl) cl.remove(); const b=v1821uBudget(C);
    const btn=document.createElement('button'); btn.className='dec v1821u-dec'; btn.dataset.a='v1821uOpenTab';
    btn.innerHTML=`<span class="dec-ico">☀️</span><span class="grow"><b>Plan the summer: ${left} of ${b} points left</b><small>Summer programs · send returning players before the next season · unspent points are lost</small></span><span class="dec-go">${icon('chev',16)}</span>`;
    box.appendChild(btn); return t.innerHTML; }catch(e){ console.warn('summer overview',e); return h; } }; }
/* Play / Start next season: remind once per summer if no points were spent (never blocks: the second press goes on) */
MODALS.v1821uRemind=()=>{ const C=App.C; const b=v1821uBudget(C);
  return modalShell('<h2>Summer programs</h2>',`<p>You have <b>${b} summer points</b> and nobody is going to a summer program. Points you don't spend are lost when the ${C.year+1} season starts.</p><p class="small muted">Suggest for me picks programs for you in one click, and you can change them on the Summer tab.</p>`,
    `<button class="btn" data-a="v1821uGoOn">Start the season anyway</button><button class="btn" data-a="v1821uOpenTab">Plan the summer</button><button class="btn pri" data-a="v1821uSugGo">Suggest and start</button>`,'narrow v1821u-modal'); };
A.v1821uSugGo=()=>{ const C=App.C; v1821uSuggest(C); queueSave(); A.v1821uGoOn(); };
{ const _pn=A.playNext; A.playNext=function(){ const C=App.C;
    try{ if(C&&v1821uOpen(C)&&!V1821D.off&&!(typeof v1819lPending==='function'&&C.lad&&v1819lPending(C))){ const P=v1821uPlan(C); if(!P.rem&&v1821uUsed(C)===0&&v1821uBudget(C)>0){ P.rem=1; queueSave(); App.modal={type:'v1821uRemind'}; renderModal(); return; } } }catch(e){ console.warn('summer remind',e); }
    return _pn.apply(this,arguments); }; }
