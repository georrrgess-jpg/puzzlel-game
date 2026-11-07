/* v18.21 Development Plans + Mentorship Program: the two Development hub tabs (Player Plans, Mentors), their Overview chips
   and badges, the player-card notes and a This week item. Engine side in 9m_plans.js. Identifiers v1821p / v1821m. */
const V1821P_SHORT={ f_sho:'Finishing', f_pas:'Passing', f_def:'Defending', f_spd:'Pace', f_sta:'Stamina', f_gk:'Goalkeeping' };
const V1821P_FOCI=p=>p.pos==='GK'?['f_gk','f_pas','f_spd']:['f_sho','f_pas','f_def','f_spd','f_sta'];
const v1821pPct=m=>`${m>=1?'+':'−'}${Math.round(Math.abs(m-1)*100)}%`;
const v1821pEarly=C=>C.phase==='preseason'||(C.phase==='regular'&&C.md<3);
function v1821pDtab(k){ return `data-a="go" data-r="dev" data-p="${esc(JSON.stringify({dtab:k}))}"`; }
function v1821pChip(C,p,sz){ if(!p) return '<span class="muted">Unknown</span>';
  return `<span class="v1821p-chip"><span class="v1821p-face" aria-hidden="true">${portraitSVG(p,sz||38)}</span><span class="v1821p-cn">${pLink(p.id)}<small>${posTag(p.pos)}<span>Gr ${p.grade} · ${LVL_NAME[p.lvl]}</span></small></span>${ovrBadge(ovr(p))}</span>`; }
function v1821pSpark(x,cur){ const vals=[x.s0,...x.h]; if(cur!=null&&!x.h.length) vals.push(cur); const lo=Math.min(...vals,x.s0)-0.3, hi=Math.max(...vals,x.tgt)+0.3; const W=150,H=34,n=Math.max(V1821P.MDS-x.md0,2);
  const X=i=>(i/n)*W, Y=v=>H-((v-lo)/(hi-lo||1))*H; const pts=vals.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '); const ty=Y(x.tgt-0.5).toFixed(1);
  return `<svg class="v1821p-spark" viewBox="-2 -2 ${W+4} ${H+4}" preserveAspectRatio="none" role="img" aria-label="OVR by matchday, ${vals.length-1} matchday${vals.length===2?'':'s'} played"><line x1="0" x2="${W}" y1="${ty}" y2="${ty}" class="tg"/>${vals.length>1?`<polyline points="${pts}"/>`:''}<circle cx="${X(vals.length-1).toFixed(1)}" cy="${Y(vals[vals.length-1]).toFixed(1)}" r="2.6"/></svg>`; }
function v1821pTrend(x){ if(!x.h.length) return ''; const all=[x.s0,...x.h]; const out=[];
  const k0=Math.max(1,all.length-6); let mx=0.05; for(let i=k0;i<all.length;i++) mx=Math.max(mx,all[i]-all[i-1]);
  for(let i=k0;i<all.length;i++){ const v=all[i]-all[i-1]; out.push(`<i title="Matchday ${x.md0+i}: ${v>=0?'+':''}${v.toFixed(2)}" style="height:${clamp(v/mx*100,8,100)}%"></i>`); } return out.join(''); }
/* ---------- the Player Plans tab ---------- */
function v1821pPlanCard(C,x,edit){ const p=C.players[x.pid]; if(!p) return ''; const st=v1821pStatus(C,x); const cur=ovr(p); const prog=v1821pProg(C,x); const lock=v1821pTgtLocked(C,x);
  const sug=v1821pSugFocus(p); const foci=V1821P_FOCI(p).includes(x.foc)?V1821P_FOCI(p):[...V1821P_FOCI(p),x.foc];
  const fb=foci.map(k=>`<button class="v1821p-fb ${x.foc===k?'on':''}" ${edit?`data-a="v1821pFoc" data-id="${p.id}" data-k="${k}"`:'disabled'} aria-pressed="${x.foc===k}">${esc(V1821P_SHORT[k])}${k===sug?'<sup title="Suggested: his weakest key skill">★</sup>':''}</button>`).join('');
  const sk=V1821P_SK[x.foc]; const skv=p.sk[sk];
  return `<article class="v1821p-plan st-${st.k}" data-pid="${p.id}">
    <header>${v1821pChip(C,p,40)}<span class="v1821p-st ${st.k}">${esc(st.t)}</span></header>
    <div class="v1821p-row"><span class="v1821p-lab" id="v1821pf-${p.id}">Focus</span><div class="v1821p-foc" role="group" aria-labelledby="v1821pf-${p.id}">${fb}</div></div>
    <div class="v1821p-row"><span class="v1821p-lab">Target</span><div class="v1821p-tg">${!lock&&edit?`<button class="btn sm ghost" data-a="v1821pTgt" data-id="${p.id}" data-d="-1" aria-label="Lower target">−</button>`:''}<b class="v1821p-tv">OVR ${x.tgt}</b>${!lock&&edit?`<button class="btn sm ghost" data-a="v1821pTgt" data-id="${p.id}" data-d="1" aria-label="Raise target">+</button><small>suggested ${v1821pSugTarget(C,p)} · locks at his first matchday</small>`:`<small>${x.st==='live'&&!x.hitMd?`set at OVR ${fmt1(x.s0)}`:x.hitMd!=null?`hit on matchday ${x.hitMd+1}${x.bonus?' · +0.3 bonus':''}`:''}</small>`}</div></div>
    <div class="v1821p-prog"><div class="v1821p-bar" role="progressbar" aria-label="Progress to target" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog*100)}"><i style="width:${Math.max(3,prog*100)}%"></i></div>
      <div class="v1821p-pl"><span>${fmt1(x.s0)}</span><b>${fmt1(cur)} <small class="${cur-x.s0>0?'good':''}">${cur-x.s0>=0?'+':''}${fmt1(cur-x.s0)}</small></b><span>${x.tgt}</span></div></div>
    <div class="v1821p-tr"><div><span class="v1821p-lab">Matchday trend</span>${v1821pSpark(x,cur)}</div><div class="v1821p-bars" aria-hidden="true">${v1821pTrend(x)}</div></div>
    <footer><span class="small muted">${esc(SKILL_NAME[sk])} ${R(skv)} · +15% growth</span>${edit?`<button class="btn sm ghost" data-a="v1821pRm" data-id="${p.id}">Remove plan</button>`:''}</footer></article>`; }
function v1821pSlot(C,lvl,edit,top){ if(!edit) return `<div class="v1821p-plan v1821p-empty"><p class="muted small">${esc(v1821pCanEdit(C).why||'')}</p></div>`;
  return `<div class="v1821p-plan v1821p-empty"><b class="v1821p-et">Free slot</b>${top?`<p class="small">Suggested: <b>${esc(pname(top.p))}</b> ${posTag(top.p.pos)} Gr ${top.p.grade}, about <b class="good">+${fmt1(top.e)}</b> OVR by season's end (+${fmt1(top.ex)} from the plan).</p>
    <div class="v1821p-ea"><button class="btn sm pri" data-a="v1821pAdd" data-id="${top.p.id}">Add ${esc(top.p.fn)}</button><button class="btn sm ghost" data-a="v1821pPick" data-l="${lvl}">Choose a player</button></div>`:`<p class="small muted">No ${LVL_NAME[lvl]} player has room to grow right now.</p>`}</div>`; }
function v1821pRender(C){ const u=C.userSid; const live=v1821pLive(C); const ed=v1821pCanEdit(C); const Y=live||(C.v1821p&&C.v1821p.yr[C.year])||null;
  const intro=`<section class="card v1821p-intro"><div class="hd"><h3>Player Plans</h3><span class="chip">${C.phase==='preseason'?'Preseason · plans start on matchday 1':C.phase==='regular'?`Matchday ${Math.min(C.md+1,14)} of 14`:'Regular season over'}</span></div>
    <p class="small v1821p-lead">Give up to <b>three players per level</b> an individual plan. A plan player grows <b class="good">+15% faster</b> on every regular-season matchday, steered into the skill you pick, toward an OVR target for the end of the regular season. Hit it and he earns a one-time <b class="good">+0.3 OVR</b>.</p>
    <ul class="v1821p-rules"><li><b>+15%</b> in-season growth</li><li><b>1 skill</b> gets the extra work</li><li><b class="bad">−1%</b> for the rest of a level when all 3 slots are used</li><li>Plans end with the regular season</li></ul>
    <p class="tiny muted">Every league school runs two plans per level too. Nobody grows past his potential.</p></section>`;
  const notes=Y&&Y.notes&&Y.notes.length?`<div class="notice v1821p-note">${Y.notes.slice(-3).map(n=>esc(n.t)).join('<br>')}</div>`:'';
  const lv=LVLS.map(l=>{ const L=live?live.plans[l]:[]; const full=L.length>=V1821P.SLOTS; const n=squad(C,u,l).length; const cands=ed.ok?v1821pCands(C,l):[];
    const cards=L.map(x=>v1821pPlanCard(C,x,true)); let k=0; while(cards.length<V1821P.SLOTS&&(ed.ok||!live)){ cards.push(v1821pSlot(C,l,ed.ok,cands[k++])); if(!ed.ok) break; }
    return `<section class="card v1821p-lvl"><div class="hd"><h3>${LVL_NAME[l]}</h3><span class="v1821p-hr"><span class="v1821p-slots" aria-label="${L.length} of ${V1821P.SLOTS} slots used">${[0,1,2].map(i=>`<i class="${i<L.length?'on':''}"></i>`).join('')}<b>${L.length} of ${V1821P.SLOTS}</b></span>${full?`<span class="chip v1821p-split" title="The coaches' attention is split">Other ${n-L.length} players: −1% growth</span>`:''}</span></div>
      <div class="v1821p-grid">${cards.join('')}</div></section>`; }).join('');
  return intro+notes+(live||ed.ok?lv:'')+v1821pSummary(C); }
function v1821pSummary(C){ const S=C.v1821p; if(!S) return ''; const yrs=Object.keys(S.yr).map(Number).filter(y=>S.yr[y].done&&S.yr[y].sum&&S.yr[y].sum.n).sort((a,b)=>b-a); if(!yrs.length) return ''; const y=yrs[0]; const Y=S.yr[y];
  const rows=LVLS.flatMap(l=>Y.plans[l].map(x=>({x,l}))).concat(Y.ended.map(x=>({x,l:x.lvl,ended:true})));
  return `<section class="card v1821p-sum"><div class="hd"><h3>${y} season summary</h3><span class="chip">${Y.sum.hit} of ${Y.sum.n} targets hit</span></div><div class="v1821p-sl">${rows.map(({x,l,ended})=>{ const p=findPerson(C,x.pid); const hit=x.hitMd!=null;
    return `<div class="v1821p-sr ${hit?'hit':ended?'ended':'miss'}"><span class="v1821p-si" aria-hidden="true">${hit?'✓':ended?'–':'✕'}</span><span class="grow">${p?pLink(x.pid):'Unknown'} <small class="muted">${LVL_NAME[l]} · ${esc(V1821P_SHORT[x.foc])}</small></span><span class="mono small">${fmt1(x.s0)} → ${fmt1(x.end!=null?x.end:x.s0)}</span><b class="mono">${ended?esc(x.why||'Ended'):hit?'Hit '+x.tgt:'Missed '+x.tgt}</b></div>`; }).join('')}</div></section>`; }
/* add-a-player modal */
MODALS.v1821pPick=m=>{ const C=App.C; const l=m.lvl; const cs=v1821pCands(C,l);
  const list=cs.length?cs.map(c=>{ const p=c.p; return `<div class="v1821p-pr">${v1821pChip(C,p,34)}<span class="v1821p-pm small"><span>Focus <b>${esc(V1821P_SHORT[v1821pSugFocus(p)])}</b> · target <b>${v1821pSugTarget(C,p)}</b></span><span class="muted">about +${fmt1(c.e)} OVR (+${fmt1(c.ex)} from the plan) · POT ${p.pot}</span></span><button class="btn sm pri" data-a="v1821pAdd" data-id="${p.id}">Add</button></div>`; }).join(''):'<p class="muted">No player at this level has room to grow.</p>';
  return modalShell(`<h2>${LVL_NAME[l]} plan</h2>`,`<p class="small muted" style="margin-top:0">Best first: the players who gain the most from +15% growth this season. You can change the focus and target after adding him.</p><div class="v1821p-pl2">${list}</div>`,`<button class="btn" data-a="closeModal">Cancel</button>`,'v1821p-modal'); };
A.v1821pPick=el=>{ App.modal={type:'v1821pPick',lvl:el.dataset.l}; renderModal(); };
function v1821pDone(msg){ App.modal=null; renderModal(); queueSave(); App.keepScroll=true; render(); if(msg) toast(msg); }
A.v1821pAdd=el=>{ const r=v1821pAdd(App.C,el.dataset.id); v1821pDone(r.ok?r.msg:r.why); };
A.v1821pRm=el=>{ const p=App.C.players[el.dataset.id]; v1821pRemove(App.C,el.dataset.id); v1821pDone(p?`${pname(p)}'s plan removed.`:''); };
A.v1821pFoc=el=>{ v1821pSetFocus(App.C,el.dataset.id,el.dataset.k); v1821pDone(); };
A.v1821pTgt=el=>{ v1821pSetTarget(App.C,el.dataset.id,+el.dataset.d); v1821pDone(); };
function v1821pSum(C){ const live=v1821pLive(C); if(!live){ const S=C.v1821p; const Y=S&&S.yr[C.year]; if(Y&&Y.sum&&Y.sum.n) return {t:`Plans: ${Y.sum.hit} of ${Y.sum.n} targets hit`,s:'New plans open next preseason'}; return v1821pOpenPh(C)?{t:'No player plans yet',s:'Up to 3 per level · +15% growth',warn:true}:{t:'Player Plans',s:'New plans open next preseason'}; }
  const all=LVLS.flatMap(l=>live.plans[l]); const free=LVLS.length*V1821P.SLOTS-all.length; if(!all.length) return {t:'No player plans yet',s:'Up to 3 per level · +15% growth',warn:v1821pOpenPh(C)};
  const st=all.map(x=>v1821pStatus(C,x).k); const c=k=>st.filter(s=>s===k).length;
  return {t:`${all.length} of ${LVLS.length*V1821P.SLOTS} plan slots used`,s:[c('hit')?`${c('hit')} hit`:'',c('on')?`${c('on')} on track`:'',c('behind')?`${c('behind')} behind`:''].filter(Boolean).join(' · ')||'Plans start on matchday 1',warn:free>0&&v1821pEarly(C)&&v1821pCanEdit(C).ok}; }
function v1821pBadge(C){ if(!v1821pEarly(C)||!v1821pCanEdit(C).ok) return ''; const live=v1821pLive(C); const used=live?LVLS.reduce((a,l)=>a+live.plans[l].length,0):0; const f=LVLS.length*V1821P.SLOTS-used; return f>0?f:''; }
v1821dTab({id:'plans',label:'Player Plans',ico:'🎯',order:20,render:v1821pRender,summary:v1821pSum,badge:v1821pBadge});
/* ---------- the Mentors tab ---------- */
const v1821mP=v=>{ const n=Math.round(v*1000)/10; return n%1?n.toFixed(1):String(n); };
function v1821mPairCard(C,x){ const m=C.players[x.m], e=C.players[x.e]; if(!m||!e) return ''; const b=v1821mBoost(C,m,e); const lean=v1821pAny(C,e.id)?null:v1821mLean(m,e); const g=ovr(e)-(e.ovr0&&e.ovr0[C.year]!=null?e.ovr0[C.year]:ovr(e));
  return `<article class="v1821m-pair"><div class="v1821m-duo"><div><span class="v1821m-role">Mentor</span>${v1821pChip(C,m,40)}</div><div><span class="v1821m-role">Mentee</span>${v1821pChip(C,e,40)}</div></div>
    <div class="v1821m-fx"><span class="v1821m-big good">${v1821pPct(b.m)}</span><span class="small">growth for ${esc(e.fn)}, ${lean?'in season and offseason':'in the offseason'}</span></div>
    <ul class="v1821m-parts"><li>Base <b>+8%</b></li><li>${b.pos===1?'Same position':b.pos?'Next position':'Different position'} <b>+${v1821mP(b.parts.pos)}%</b></li><li>Mentor quality <b>+${v1821mP(b.parts.qual)}%</b></li><li class="cost">${esc(m.fn)}'s coaching time <b class="bad">−3%</b></li></ul>
    <p class="small muted v1821m-meta">${lean?`Growth leans toward <b>${esc(SKILL_NAME[V1821P_SK[lean]])}</b>, ${esc(m.fn)}'s best. `:`<b>On a development plan</b>: in season the plan's +15% and focus apply instead; the mentorship counts in the offseason. `}${esc(e.fn)} ${g>=0?'+':''}${fmt1(g)} this season.${m.grade>=12?` <b>${esc(m.fn)} graduates this spring</b>: farewell bonus +0.4 OVR.`:''}</p>
    <footer><button class="btn sm ghost" data-a="v1821mUnpair" data-id="${m.id}">Unpair</button></footer></article>`; }
function v1821mRender(C){ const S=v1821mS(C); v1821mSync(C); const ed=v1821mCanEdit(C); const free=V1821M.PAIRS-S.pairs.length; const u=C.userSid;
  const intro=`<section class="card v1821m-intro"><div class="hd"><h3>Mentors</h3><span class="chip">${S.pairs.length} of ${V1821M.PAIRS} pairs</span></div>
    <p class="small v1821p-lead">Pair a <b>Varsity 11th or 12th grader</b> with a JV or Modified player at least <b>${V1821M.GAP} OVR below</b> him. The mentee grows <b class="good">+8% to +18% faster</b> all year: +8% base, +5% for the same position group (+2.5% for the next one), and up to +5% for a stronger mentor. His in-season growth leans toward his mentor's best skill.</p>
    <ul class="v1821p-rules"><li><b class="bad">−3%</b> in-season growth for the mentor (time spent coaching)</li><li>Mentor graduates: <b>+0.4 OVR</b> farewell for the mentee</li><li>Mentee on a development plan: the plan's +15% applies in season, the mentorship in the offseason</li><li>Mentee reaches Varsity: the pair is complete</li></ul><p class="tiny muted">Every league school runs one or two pairs too.</p></section>`;
  const pairs=`<section class="card v1821m-act"><div class="hd"><h3>Active pairs</h3></div>${S.pairs.length?`<div class="v1821m-grid">${S.pairs.map(x=>v1821mPairCard(C,x)).join('')}</div>`:'<p class="muted small">No mentor pairs yet. The suggestions below are the best matches in your program.</p>'}</section>`;
  let sug='', man='';
  if(ed.ok&&free>0){ const sg=v1821mSuggest(C,3);
    sug=`<section class="card v1821m-sug"><div class="hd"><h3>Suggested pairs</h3><span class="small muted">Best matches first</span></div>${sg.length?`<div class="v1821m-sl">${sg.map(s=>`<div class="v1821m-sr">${v1821pChip(C,s.m,32)}<span class="v1821m-arrow" aria-hidden="true">→</span>${v1821pChip(C,s.e,32)}<b class="good v1821m-pc">${v1821pPct(s.b.m)}</b><button class="btn sm pri" data-a="v1821mPair" data-m="${s.m.id}" data-e="${s.e.id}">Pair</button></div>`).join('')}</div>`:'<p class="muted small">No eligible pairs: no Varsity 11th or 12th grader is 8 OVR above a JV or Modified player with room to grow.</p>'}</section>`;
    const busy=new Set(S.pairs.flatMap(x=>[x.m,x.e])); const ms=squad(C,u,'V').filter(p=>p.grade>=11&&!busy.has(p.id)).sort((a,b)=>ovr(b)-ovr(a)); const es=[...squad(C,u,'JV'),...squad(C,u,'MOD')].filter(p=>!busy.has(p.id)).sort((a,b)=>(a.lvl<b.lvl?-1:a.lvl>b.lvl?1:0)||ovr(b)-ovr(a));
    const pm=App.params.v1821mM&&ms.some(p=>p.id===App.params.v1821mM)?App.params.v1821mM:''; const pe=App.params.v1821mE&&es.some(p=>p.id===App.params.v1821mE)?App.params.v1821mE:'';
    const chk=pm&&pe?v1821mCan(C,pm,pe):null; const bb=chk&&chk.ok?v1821mBoost(C,C.players[pm],C.players[pe]):null;
    man=`<section class="card v1821m-man"><div class="hd"><h3>Pair players yourself</h3></div><div class="v1821m-form"><label><span>Mentor</span><select data-c="param" data-k="v1821mM"><option value="">Choose a Varsity 11th/12th grader</option>${ms.map(p=>`<option value="${p.id}" ${p.id===pm?'selected':''}>${esc(pname(p))} · ${p.pos} · Gr ${p.grade} · OVR ${R(ovr(p))}</option>`).join('')}</select></label>
      <label><span>Mentee</span><select data-c="param" data-k="v1821mE"><option value="">Choose a JV or Modified player</option>${es.map(p=>`<option value="${p.id}" ${p.id===pe?'selected':''}>${esc(pname(p))} · ${LVL_NAME[p.lvl]} · ${p.pos} · OVR ${R(ovr(p))}</option>`).join('')}</select></label>
      <button class="btn pri" data-a="v1821mPair" data-m="${pm}" data-e="${pe}" ${chk&&chk.ok?'':'disabled'}>Pair</button></div>
      <p class="small ${chk&&!chk.ok?'bad':'muted'} v1821m-chk" aria-live="polite">${chk?(chk.ok?`Eligible: ${v1821pPct(bb.m)} growth for ${esc(C.players[pe].fn)}.`:esc(chk.why)):'Pick a mentor and a mentee to check the match.'}</p></section>`; }
  else if(!ed.ok) sug=`<div class="notice">${esc(ed.why)}</div>`;
  const hist=S.hist.length?`<section class="card v1821m-hist"><div class="hd"><h3>Past pairs</h3></div><ul class="v1821m-hl">${S.hist.slice(0,6).map(h=>`<li><span>${esc(h.mn)} → ${esc(h.en)}</span><small class="muted">${h.yr} · ${esc(h.why)}</small></li>`).join('')}</ul></section>`:'';
  return intro+pairs+sug+man+hist; }
A.v1821mPair=el=>{ const r=v1821mPair(App.C,el.dataset.m,el.dataset.e); if(r.ok){ delete App.params.v1821mM; delete App.params.v1821mE; } v1821pDone(r.ok?r.msg:r.why); };
A.v1821mUnpair=el=>{ const p=App.C.players[el.dataset.id]; v1821mUnpair(App.C,el.dataset.id); v1821pDone(p?`${pname(p)}'s mentor pair ended.`:''); };
function v1821mSum(C){ const S=C.v1821m; const n=S?S.pairs.length:0; if(!n){ const s=v1821pOpenPh(C)?v1821mSuggest(C,1)[0]:null; return {t:'No mentor pairs yet',s:s?`Best match: ${s.m.fn} ${s.m.ln[0]}. → ${s.e.fn} ${s.e.ln[0]}. ${v1821pPct(s.b.m)}`:'Varsity upperclassmen coach younger players',warn:!!s&&v1821pEarly(C)}; }
  const avg=S.pairs.reduce((a,x)=>{ const m=C.players[x.m], e=C.players[x.e]; return a+(m&&e?v1821mBoost(C,m,e).m:1); },0)/n;
  return {t:`${n} of ${V1821M.PAIRS} mentor pairs`,s:`Mentees ${v1821pPct(avg)} growth on average`}; }
function v1821mBadge(C){ if(!v1821pEarly(C)) return ''; const S=C.v1821m; const free=V1821M.PAIRS-(S?S.pairs.length:0); if(free<=0) return ''; return v1821mSuggest(C,free).length||''; }
v1821dTab({id:'mentors',label:'Mentors',ico:'🤝',order:30,render:v1821mRender,summary:v1821mSum,badge:v1821mBadge});
/* ---------- player card notes ---------- */
{ const _mp=MODALS.player; MODALS.player=function(m){ let h=_mp.apply(this,arguments); try{ const C=App.C; const p=C&&C.players[m.id]; if(!p||p.sid!==C.userSid||(m.tab||'overview')!=='overview') return h; const out=[];
    const x=v1821pAny(C,p.id); if(x){ const st=v1821pStatus(C,x); out.push(`<span class="v1821p-cnote"><b>🎯 Development plan</b> ${esc(V1821P_SHORT[x.foc])} · target OVR ${x.tgt} · ${esc(st.t)}</span>`); }
    const pr=v1821mPairOf(C,p); if(pr){ const o=C.players[pr.m===p.id?pr.e:pr.m]; if(o){ if(pr.m===p.id) out.push(`<span class="v1821p-cnote lead"><b>🤝 Leadership</b> Mentor to ${esc(pname(o))} (${LVL_NAME[o.lvl]}) · coaching time −3% growth</span>`);
      else out.push(`<span class="v1821p-cnote"><b>🤝 Mentored by</b> ${esc(pname(o))} · ${v1821pPct(v1821mBoost(C,o,p).m)} growth</span>`); } }
    if(!out.length) return h; const note=`<div class="v1821p-cnotes">${out.join('')}<button class="v1821d-fc more" ${v1821pDtab(x?'plans':'mentors')}>${x?'Player Plans':'Mentors'}</button></div>`;
    const a=h.indexOf('<div class="v1821d-pstrip">'); let j=-1; if(a>=0){ const e=h.indexOf('</button></div>',a); if(e>=0) j=e+'</button></div>'.length; }
    if(j<0){ const i=h.indexOf('<div class="mbody">'); if(i>=0) j=i+'<div class="mbody">'.length; } if(j>=0) h=h.slice(0,j)+note+h.slice(j); }catch(e){ console.warn('v1821p player',e); } return h; }; }
/* ---------- the Overview's This week item: early in the season with no plans set ---------- */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; if(!v1821pEarly(C)||!v1821pCanEdit(C).ok) return h; const live=v1821pLive(C); if(live&&LVLS.some(l=>live.plans[l].length)) return h;
    const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h; const clr=box.querySelector('.v1817o-clear'); if(clr) clr.remove();
    const b=document.createElement('button'); b.className='dec v1821p-dec'; b.dataset.a='go'; b.dataset.r='dev'; b.dataset.p=JSON.stringify({dtab:'plans'});
    b.innerHTML=`<span class="dec-ico">🎯</span><span class="grow"><b>Set development plans</b><small>Player Plans · up to 3 per level · +15% growth for each plan player</small></span><span class="dec-go">${icon('chev',16)}</span>`;
    box.appendChild(b); return t.innerHTML; }catch(e){ console.warn('v1821p overview',e); return h; } }; }
