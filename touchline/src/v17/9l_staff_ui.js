/* v18.21 Coaching Staff: the Staff tab on Squads -> Development (four role cards, budget bar, hiring market with comparison,
   contract renewals), the Overview growth-card chip, the tab badge and a This week item. Identifiers v1821c. */
function v1821cPct(x){ const v=Math.round(x*100); return (v>0?'+':v<0?'−':'±')+Math.abs(v)+'%'; }
function v1821cShort(k){ return {JV:'JV',MOD:'MOD',GK:'GK',SC:'S&C'}[k]; }
function v1821cIni(nm){ return String(nm||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase(); }
function v1821cAv(c){ return c?`<span class="v1821c-av" style="--v1821c-h:${c.hue||0}" aria-hidden="true">${esc(v1821cIni(c.nm))}</span>`:`<span class="v1821c-av vac" aria-hidden="true">?</span>`; }
function v1821cCovered(C,k){ const u=C.userSid; if(k==='GK') return Object.values(C.players).filter(p=>p.sid===u&&p.pos==='GK').length; return squad(C,u,k==='SC'?'V':k).length; }
function v1821cFx(C,k,eff){ return `<span class="v1821c-fx ${eff>0.004?'up':eff<-0.004?'dn':''}">${V1821C_ROLE[k].fx} ${v1821cPct(eff)}</span>`; }
function v1821cYrs(C,c){ const left=c.end-C.year+(C.phase==='offseason'?0:1); return c.end<C.year?'ended':c.end===C.year?(C.phase==='offseason'?'ends now':'final season'):`through ${c.end} · ${left} season${left===1?'':'s'} left`; }
function v1821cWith(C,c){ if(c.since>C.year) return 'Starts next season'; const n=c.yrs+1; return `${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'} season`; }
function v1821cLenSel(id,lab){ return `<label class="v1821c-len"><span>${lab||'Contract'}</span><select id="v1821c-len-${id}" aria-label="${lab||'Contract'} length"><option value="1">1 season</option><option value="2" selected>2 seasons</option><option value="3">3 seasons</option></select></label>`; }
function v1821cRoleCard(C,k){ const S=v1821cS(C); const c=S.u[k]; const R=V1821C_ROLE[k]; const w=v1821cWin(C); const eff=v1821cRoleEff(C,k); const n=v1821cCovered(C,k);
  const head=`<header><h4>${R.t}</h4><span class="v1821c-who">Covers ${R.who} · ${n} now</span></header>`;
  if(!c) return `<article class="v1821c-role vac">${head}<div class="v1821c-co">${v1821cAv(null)}<div class="v1821c-nm"><b>Vacant</b><small>A volunteer fills in (rating ${V1821C.VOL}, no salary)</small></div><div class="v1821c-rb"><b>${V1821C.VOL}</b><small>rating</small></div></div>
    ${v1821cFx(C,k,eff)}<div class="v1821c-act">${w?`<button class="btn sm pri" data-a="v1821cFind" data-k="${k}">See ${R.s} candidates</button>`:`<span class="small muted">Hire one in the offseason or preseason.</span>`}</div></article>`;
  const m=v1821cMatch(C,c); const exp=v1821cExpiring(C,c);
  let act='';
  if(C.phase==='offseason'&&exp){ if(v1821cWilling(C,c)){ const ask=v1821cAsk(c); const pay=v1821cPay(C)-c.sal+ask; const bud=v1821cBudget(C);
      act=`<div class="v1821c-renew"><p><b>Contract ends this season.</b> He asks <b>$${ask}k</b> a season (now $${c.sal}k). Not renewed by rollover: he re-signs for one season only if the budget has room, otherwise he leaves.</p>
        <div class="v1821c-row">${v1821cLenSel(c.id,'Renew for')}<button class="btn sm pri" data-a="v1821cRenew" data-k="${k}" data-id="${c.id}" ${pay>bud?'disabled':''}>Renew at $${ask}k</button><button class="btn sm ghost" data-a="v1821cRel" data-k="${k}">Let him go</button></div>${pay>bud?`<p class="v1821c-warn">Payroll would be $${pay}k of $${bud}k. Release someone first.</p>`:''}</div>`; }
    else act=`<div class="v1821c-renew"><p><b>${esc(c.nm)} has decided to move on</b> and leaves when the season rolls over. Hire his replacement from the market.</p></div>`; }
  else if(w) act=`<div class="v1821c-act"><button class="btn sm ghost" data-a="v1821cRel" data-k="${k}">Release</button><button class="btn sm" data-a="v1821cFind" data-k="${k}">Compare candidates</button></div>`;
  return `<article class="v1821c-role${exp?' exp':''}">${head}<div class="v1821c-co">${v1821cAv(c)}<div class="v1821c-nm"><b>${esc(c.nm)}</b><small>Specialty: ${V1821C_SPN[c.sp]}${m?` <span class="v1821c-m">matches training +2%</span>`:''}</small></div><div class="v1821c-rb"><b>${c.r}</b><small>rating</small></div></div>
    <dl class="v1821c-facts"><div><dt>With you</dt><dd>${v1821cWith(C,c)}</dd></div><div><dt>Contract</dt><dd>${v1821cYrs(C,c)}</dd></div><div><dt>Salary</dt><dd>$${c.sal}k</dd></div></dl>
    ${v1821cFx(C,k,eff)}${act}</article>`; }
function v1821cBudgetCard(C){ const pay=v1821cPay(C), bud=v1821cBudget(C); const pr=Math.round(C.schools[C.userSid].prestige||0); const w=v1821cWin(C); const pct=Math.min(100,Math.round(pay/bud*100));
  const vac=V1821C.ROLES.filter(k=>!v1821cS(C).u[k]).length;
  return `<section class="card v1821c-top"><div class="hd"><h3>Coaching staff</h3><span class="chip ${w?'v1821c-open':''}">${w?`Hiring open · ${w==='off'?'Offseason':'Preseason'}`:'Hiring opens in the offseason'}</span></div>
    <p class="small muted v1821c-lead">Each assistant multiplies the normal growth of the players he coaches: rating 40 = −8%, 60 = ±0%, 90 = +12%, plus 2% when his specialty matches your training focus. A player covered by two coaches (a goalkeeper) gets both, capped at +12%. Nobody passes his potential.</p>
    <div class="v1821c-bud"><div class="v1821c-bl"><b>Payroll $${pay}k</b><span>of $${bud}k staff budget · $${bud-pay}k free</span></div><div class="v1821c-bar" role="meter" aria-label="Staff payroll" aria-valuemin="0" aria-valuemax="${bud}" aria-valuenow="${pay}"><i style="width:${pct}%" class="${pay>bud?'over':''}"></i></div>
      <small class="muted">Budget = 100 + school prestige (${pr}); it moves with prestige every season. Salaries rise with rating, so you choose where to spend.${vac?` ${vac} role${vac===1?' is':'s are'} vacant.`:''}</small></div>
    <p class="small muted">League rivals keep staffs averaging rating ${V1821C.MEAN} in every role (growth ±0%); your edge is choosing well.</p></section>`; }
function v1821cMktCard(C){ const M=v1821cMkt(C); const S=v1821cS(C);
  if(!M){ const lost=(S.lost||[]).slice(-3).reverse(); return `<section class="card v1821c-mkt"><div class="hd"><h3>Hiring market</h3></div><div class="empty">The market is closed during the season. A fresh list of candidates (3–4 per role) opens in the offseason and again in the preseason.</div>
      ${lost.length?`<ul class="v1821c-lost">${lost.map(x=>`<li>${x.yr}: ${V1821C_ROLE[x.k].t} ${esc(x.nm)} (${x.r}) ${x.why==='poach'?`was hired away${x.to&&C.schools[x.to]?` by ${esc(C.schools[x.to].name)}`:''}`:x.why==='budget'?'left (no room in the budget)':'left when his contract ran out'}</li>`).join('')}</ul>`:''}</section>`; }
  const f=App.params&&App.params.srole; const roles=f&&V1821C_ROLE[f]?[f]:V1821C.ROLES; const pay=v1821cPay(C), bud=v1821cBudget(C);
  const tabs=`<div class="v1821c-ft" role="group" aria-label="Filter candidates by role">${['all',...V1821C.ROLES].map(k=>`<button class="${k===f||(k==='all'&&!f)?'on':''}" data-a="v1821cFind" data-k="${k}" aria-pressed="${k===f||(k==='all'&&!f)}">${k==='all'?'All':v1821cShort(k)}</button>`).join('')}</div>`;
  const rows=roles.map(k=>{ const cur=S.u[k]; const now=v1821cRoleEff(C,k); const list=M.c.filter(q=>q.role===k&&!q.hired);
    const body=list.length?list.map(q=>{ const eff=v1821cEff(q.r)+(V1821C_SPT[q.sp]===C.training?V1821C.SPEC:0); const d=eff-now; const after=pay-(cur?cur.sal:0)+q.sal; const over=after>bud;
      return `<div class="v1821c-cand">${v1821cAv(q)}<div class="v1821c-nm"><b>${esc(q.nm)}</b><small>${V1821C_SPN[q.sp]}${V1821C_SPT[q.sp]===C.training?' · matches training':''}</small></div>
        <div class="v1821c-rb"><b>${q.r}</b><small>rating</small></div>
        <div class="v1821c-cfx">${v1821cFx(C,k,eff)}<small>${cur?`vs ${esc(cur.nm.split(' ').pop())} (${cur.r})`:'vs volunteer'}: <b class="${d>0.004?'good':d<-0.004?'bad':''}">${v1821cPct(d)}</b></small></div>
        <div class="v1821c-cs"><b>$${q.sal}k</b><small class="${over?'bad':''}">payroll $${after}k of $${bud}k</small></div>
        <div class="v1821c-row">${v1821cLenSel(q.id)}<button class="btn sm ${over||d<=0.004?'':'pri'}" data-a="v1821cHire" data-id="${q.id}" ${over?'disabled':''} aria-label="Hire ${esc(q.nm)} as ${V1821C_ROLE[k].t}">${over?'Over budget':cur?'Hire (replaces)':'Hire'}</button></div></div>`; }).join(''):`<div class="empty">Every ${V1821C_ROLE[k].t} candidate has been hired. New names arrive with the next window.</div>`;
    return `<div class="v1821c-grp" id="v1821c-m-${k}"><h4>${V1821C_ROLE[k].t} <span class="small muted">now: ${cur?`${esc(cur.nm)} (${cur.r})`:'volunteer (45)'} · ${V1821C_ROLE[k].fx} ${v1821cPct(now)}</span></h4>${body}</div>`; }).join('');
  return `<section class="card v1821c-mkt"><div class="hd"><h3>Hiring market</h3><span class="small muted">${C.phase==='offseason'?'Hired now: starts with the offseason training and coaches next season':'Candidates for this season'}</span></div>${tabs}${rows}</section>`; }
function v1821cRender(C){ v1821cS(C);
  return `${v1821cBudgetCard(C)}<div class="v1821c-roles">${V1821C.ROLES.map(k=>v1821cRoleCard(C,k)).join('')}</div>${v1821cMktCard(C)}`; }
function v1821cSummary(C){ const S=v1821cS(C); const vac=V1821C.ROLES.filter(k=>!S.u[k]); const pay=v1821cPay(C), bud=v1821cBudget(C);
  if(vac.length) return {t:vac.length===1?`${V1821C_ROLE[vac[0]].t} role is vacant`:`${vac.length} staff roles are vacant`, s:`A volunteer fills in: ${vac.map(k=>`${v1821cShort(k)} −6%`).join(', ')}`, warn:true};
  const parts=V1821C.ROLES.map(k=>[k,v1821cRoleEff(C,k)]).filter(([,e])=>Math.round(e*100)!==0).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return {t:parts.length?`Staff: ${parts.map(([k,e])=>`${v1821cShort(k)} ${v1821cPct(e)}`).join(', ')}`:'Staff: league-average coaches', s:`Payroll $${pay}k of $${bud}k`}; }
function v1821cBadge(C){ const n=v1821cDecisions(C).length; return n||''; }
v1821dTab({id:'staff',label:'Staff',ico:'🧢',order:10,render:v1821cRender,summary:v1821cSummary,badge:v1821cBadge});
/* ---------- actions ---------- */
function v1821cDone(res){ toast(res.msg); if(res.ok){ queueSave(); try{ App.odds&&App.odds.clear&&App.odds.clear(); }catch(e){} try{ Sound.ui('success'); }catch(e){} } App.keepScroll=true; render(); }
A.v1821cFind=el=>{ const k=el.dataset.k; App.params={...(App.params||{}),dtab:'staff',srole:k==='all'?undefined:k}; App.keepScroll=true; render();
  try{ const t=document.getElementById('v1821c-m-'+(k==='all'?'JV':k)); if(t&&k!=='all') t.scrollIntoView({block:'start',behavior:'auto'}); }catch(e){} };
A.v1821cHire=el=>{ const C=App.C; const id=el.dataset.id; const s=document.getElementById('v1821c-len-'+id); v1821cDone(v1821cHire(C,id,s?+s.value:2)); };
A.v1821cRenew=el=>{ const C=App.C; const s=document.getElementById('v1821c-len-'+el.dataset.id); v1821cDone(v1821cRenew(C,el.dataset.k,s?+s.value:1)); };
A.v1821cRel=el=>{ App.modal={type:'v1821cRel',k:el.dataset.k}; renderModal(); };
A.v1821cRelYes=el=>{ const k=App.modal&&App.modal.k; App.modal=null; renderModal(); if(k) v1821cDone(v1821cRelease(App.C,k)); };
MODALS.v1821cRel=m=>{ const C=App.C; const c=v1821cS(C).u[m.k]; const R=V1821C_ROLE[m.k]; if(!c) return modalShell('<h2>Release</h2>','<p>That role is already vacant.</p>','<button class="btn" data-a="closeModal">Close</button>','narrow');
  return modalShell(`<h2>Release ${esc(c.nm)}?</h2>`,`<p>This frees <b>$${c.sal}k</b> of the staff budget. Until you hire someone, a volunteer (rating ${V1821C.VOL}) covers ${R.who}: ${R.fx} goes from <b>${v1821cPct(v1821cRoleEff(C,m.k))}</b> to <b>${v1821cPct(v1821cEff(V1821C.VOL))}</b>. A released coach does not come back.</p>`,
    `<button class="btn" data-a="closeModal">Keep him</button><button class="btn danger" data-a="v1821cRelYes">Release</button>`,'narrow'); };
/* ---------- Overview: This week item when a role is vacant or a contract is up ---------- */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; if(!C||V1821C.off) return h; const D=v1821cDecisions(C); if(!D.length) return h;
    const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h;
    const cl=box.querySelector('.v1817o-clear'); if(cl) cl.remove();
    const vac=D.filter(d=>d.t==='vacant'), ex=D.filter(d=>d.t!=='vacant');
    const title=vac.length&&!ex.length?(vac.length===1?`${V1821C_ROLE[vac[0].k].t} role is vacant`:`${vac.length} staff roles are vacant`):ex.length===1&&!vac.length?`${V1821C_ROLE[ex[0].k].t}'s contract is up`:`${D.length} coaching staff decisions`;
    const b=document.createElement('button'); b.className='dec v1821c-dec'; b.dataset.a='go'; b.dataset.r='dev'; b.dataset.p=JSON.stringify({dtab:'staff'});
    b.innerHTML=`<span class="dec-ico">🧢</span><span class="grow"><b>${esc(title)}</b><small>Coaching staff · ${vac.length?'a volunteer covers it (−6%)':'renew or let him go'}</small></span><span class="dec-go">${icon('chev',16)}</span>`;
    box.appendChild(b); return t.innerHTML; }catch(e){ console.warn('staff overview',e); return h; } }; }
