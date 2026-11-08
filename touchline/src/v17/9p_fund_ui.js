/* v18.22 Booster Fund: the Facilities tab on Squads -> Development, summary chip, badge, actions. Identifiers v1821f. */
const V1821F_UI={ lvl:'V' };
function v1821fPips(l){ return `<span class="v1821f-pips" aria-label="Level ${l} of 3">${[1,2,3].map(i=>`<i class="${i<=l?'on':''}"></i>`).join('')}</span>`; }
function v1821fCovers(f){ return f.lv.map(l=>LVL_NAME[l]).join(', '); }
function v1821fFacCard(C,f){ const S=v1821fS(C); const l=S.lv[f.k]; const c=v1821fCost(C,f.k); const have=S.funds>=(c||0); const cur=l>1?`+${((l-1)*f.pc).toFixed(l>2?0:1).replace('.0','')}% growth`:'No bonus yet';
  return `<div class="v1821f-fc ${l>1?'up':''}"><div class="v1821f-fh"><span class="v1821f-ic" aria-hidden="true">${f.ico}</span><div><b>${esc(f.n)}</b><small>${esc(f.d)}</small></div>${v1821fPips(l)}</div>
    <div class="v1821f-fx"><span class="${l>1?'good':'muted'}">${cur}</span><small>+${f.pc}% per level above 1 · ${esc(v1821fCovers(f))}</small></div>
    ${c==null?`<button class="btn" disabled>Top level</button>`:`<button class="btn ${have?'pri':''}" data-a="v1821fUp" data-k="${f.k}"${have?'':' disabled'}>Upgrade to level ${l+1} · ${c} funds</button>`}</div>`; }
function v1821fRow(C,p){ const c=v1821fCanCoach(C,p); const on=v1821fCoachList(C).includes(p.id); const gap=p.pot-ovr(p);
  return `<div class="v1821f-row"><div class="v1821f-pl">${posTag(p.pos)}<span class="grow trunc">${pLink(p.id)} <small class="muted">Gr ${p.grade}</small></span></div><span class="v1821f-n">${ovrBadge(ovr(p))}<small class="muted">POT ${p.pot}</small></span>
    ${on?`<span class="chip acc">Booked ×${V1821F.COACH.m}</span>`:`<button class="btn sm" data-a="v1821fCoach" data-id="${p.id}"${c.ok?'':' disabled'} title="${esc(c.ok?'':c.msg)}">Book · ${V1821F.COACH.cost}</button>`}</div>`; }
function v1821fRender(C){ const S=v1821fS(C); const lvl=V1821F_UI.lvl; const booked=v1821fCoachList(C); const open=v1821fCoachOpen(C);
  const pool=squad(C,C.userSid,lvl).filter(p=>p.pot>ovr(p)||booked.includes(p.id)).sort((a,b)=>(booked.includes(b.id)?1:0)-(booked.includes(a.id)?1:0)||(b.pot-ovr(b))-(a.pot-ovr(a))).slice(0,14);
  const ph=C.phase==='offseason'?`+${v1821fIncome({...C,year:C.year+1,tourneys:C.tourneys,schools:C.schools,userSid:C.userSid})} funds when the next season starts`:`+${v1821fIncome(C)} funds a season (more with prestige and Section titles)`;
  const top=`<section class="card v1821f-top"><div class="hd"><h3>Booster Fund</h3><span class="chip">Max ${V1821F.MAX} banked</span></div>
    <div class="v1821f-bal"><div><b class="v1821f-big">${S.funds}</b><small>funds to spend · ${esc(ph)}</small></div>
    <p class="small muted v1821f-lead">The booster club raises money every season. Put it into <b>facilities</b> that make every player at a level grow a little faster for good, or into <b>private coaching</b> for up to ${V1821F.COACH.slots} players this season. Each facility adds a few percent, all facilities together are capped at +${Math.round((V1821F.CAP-1)*100)}%, and nobody passes his potential. Rival schools have facilities too.</p></div></section>`;
  const facs=`<section class="card"><div class="hd"><h3>Facilities</h3><span class="small muted">Permanent · Varsity, JV and Modified</span></div><div class="v1821f-fg">${V1821F.FAC.map(f=>v1821fFacCard(C,f)).join('')}</div>
    <p class="tiny muted">Level 2 costs ${V1821F.UP[2]} funds, level 3 costs ${V1821F.UP[3]} more. Spending is final.</p></section>`;
  const coach=`<section class="card"><div class="hd"><h3>Private coaching</h3><span class="chip ${booked.length>=V1821F.COACH.slots?'':'acc'}">${booked.length} of ${V1821F.COACH.slots} booked</span></div>
    <p class="small muted" style="margin-top:0">A private coach gives one player <b class="good">+${Math.round((V1821F.COACH.m-1)*100)}% in-season growth</b> for ${V1821F.COACH.cost} funds, until the season ends. Book in the preseason or through matchday ${V1821F.COACH.lastMd+1}. A player on a Player Plan already has a focused boost, so he can't be booked as well.${open?'':' <b>Booking is closed right now.</b>'}</p>
    <div class="seg v1821f-seg" role="group">${LVLS.map(l=>`<button class="${l===lvl?'on':''}" aria-pressed="${l===lvl}" data-a="v1821fLvl" data-k="${l}">${LVL_NAME[l]}</button>`).join('')}</div>
    <div class="v1821f-list">${pool.length?pool.map(p=>v1821fRow(C,p)).join(''):'<p class="muted small">Nobody at this level has room to grow.</p>'}</div>
    <p class="tiny muted">Players with the most room to grow are listed first.</p></section>`;
  const hist=S.hist.slice(0,6).map(h=>h.t==='inc'?`<li><span>${h.yr}: booster club raised</span><b class="good">+${h.c}</b></li>`:h.t==='up'?`<li><span>${h.yr}: ${esc(V1821F_BY[h.k].n)} to level ${h.l}</span><b>−${h.c}</b></li>`:`<li><span>${h.yr}: private coaching, ${esc(C.players[h.pid]?pname(C.players[h.pid]):'a player')}</span><b>−${h.c}</b></li>`).join('');
  return top+facs+coach+(hist?`<section class="card"><h3>Fund history</h3><ul class="v1821f-hist">${hist}</ul></section>`:''); }
function v1821fNote(r){ if(r&&r.msg) toast(r.msg); }
A.v1821fUp=el=>{ const r=v1821fUp(App.C,el.dataset.k); v1821fNote(r); queueSave(); App.keepScroll=true; render(); };
A.v1821fCoach=el=>{ const r=v1821fCoach(App.C,el.dataset.id); v1821fNote(r); queueSave(); App.keepScroll=true; render(); };
A.v1821fLvl=el=>{ V1821F_UI.lvl=el.dataset.k; App.keepScroll=true; render(); };
v1821dTab({id:'fund',label:'Facilities',ico:'🏗️',order:60,render:C=>v1821fRender(C),
  summary:C=>{ const S=v1821fS(C); const lv=V1821F.FAC.reduce((a,f)=>a+S.lv[f.k]-1,0); const left=V1821F.COACH.slots-v1821fCoachList(C).length; const cheap=Math.min(...V1821F.FAC.map(f=>v1821fCost(C,f.k)||99),v1821fCoachOpen(C)&&left>0?V1821F.COACH.cost:99);
    return {t:`Booster Fund: ${S.funds} to spend`,s:`${lv} facility upgrade${lv===1?'':'s'} · ${v1821fCoachList(C).length} private coach${v1821fCoachList(C).length===1?'':'es'}`,warn:S.funds>=cheap&&S.funds>=V1821F.MAX-4}; },
  badge:C=>{ if(C.phase!=='preseason'&&C.phase!=='offseason') return ''; const S=v1821fS(C); return S.funds>=V1821F.UP[2]?S.funds:''; }});
