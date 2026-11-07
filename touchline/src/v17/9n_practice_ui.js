/* v18.21 Practice Planner UI: the "Practice" tab on Squads -> Development (coming week per level, plan ahead, the season
   strip, saved defaults), the Overview chip and badge, a "This week" item before rivalry / knockout games, and a small
   Varsity intensity control in the match preview. Identifiers v1821t. */
const V1821T_ICO={light:'🌤️',std:'⚖️',int:'🔥'}, V1821T_SICO={tech:'🎯',tac:'🧠',cond:'🫀',scrim:'🤝'};
const V1821T_SS={tech:'Technical',tac:'Tactical',cond:'Fitness',scrim:'Scrimmage'};
const v1821tPts=d=>{ const v=Math.round(d*1000); return (v>0?'+':v<0?'−':'±')+Math.abs(v); };
function v1821tIntTxt(k,wk,b2b){ const I=V1821T.INT[k]; const reg=v1821tReg(wk); const gr=k==='std'?'normal growth':reg?`×${I.g.toFixed(2).replace(/0$/,'')} growth`:'no growth outside the league season';
  const fm=k==='int'?`${v1821tPts(b2b?V1821T.B2B:I.f)} form${b2b?' (2nd Intense in a row)':' (tired legs)'}`:k==='light'?`${v1821tPts(I.f)} form (fresh legs)`:'no form change'; return [gr,fm]; }
function v1821tSesTxt(C,k,lvl,wk){ const reg=v1821tReg(wk); const fo=C.training||'balanced'; const lean=fo==='balanced'||fo==='youth';
  if(k==='tac') return `${v1821tPts(V1821T.SES.tac.f)} form next game · no growth change`;
  if(k==='scrim') return lvl==='MOD'?'Varsity and JV only':!reg?'League season only':`+${Math.round((V1821T.SCRIM-1)*100)}% growth for non-starters on Varsity and JV (sets both levels)`;
  const what=k==='tech'?'passing (DEF/MID) and finishing (FWD)':'stamina (DEF/MID) and pace (FWD)';
  if(!reg) return `Growth leans to ${what} in league weeks · no growth this week`;
  return lean?`Growth leans to ${what} · same amount`:`Your training focus (${TRAINING[fo]}) sets the direction; no extra effect`; }
function v1821tOpp(C,f){ return f?C.schools[f.h===C.userSid?f.a:f.h]:null; }
function v1821tBig(C,f){ if(!f) return null; if(isKO(f.comp)&&!f.lpo) return f.comp==='sec'&&f.rd===2?'Section final':f.comp==='st'&&f.rd===2?'State final':'Knockout game'; const r=isRivalry(C,f.h,f.a); return r?(r==='heated'?'Rivalry game':'Rival game'):null; }
function v1821tComing(C,lvl){ return v1821tWeeks(C,lvl).find(x=>x.f?x.f.st==='s':false)||null; }
function v1821tHint(C,lvl,x){ const f=x.f; const big=v1821tBig(C,f); const opp=v1821tOpp(C,f); let d=0; try{ d=xiRating(C,opp.id,lvl)-xiRating(C,C.userSid,lvl); }catch(e){}
  const p=v1821tUserPlan(C,lvl,x.wk);
  if(big) return {t:p.i==='light'?`${big}: fresh legs are set.`:`${big}: Light gives fresh legs (${v1821tPts(V1821T.INT.light.f)} form).`,big:1};
  if(d<=-2.5) return {t:`You are stronger on paper (XI ${fmt1(-d)} better). A good week to push: Intense grows more.`};
  if(d>=2.5) return {t:`They are stronger on paper (XI ${fmt1(d)} better). Light or Tactical keeps you sharp.`};
  return {t:'An even matchup on paper.'}; }
function v1821tDate(C,f){ try{ if(f&&typeof seasonDate==='function'){ const s=seasonDate(C,f); return s&&s.label?s.label:''; } }catch(e){} return ''; }
function v1821tEffect(C,lvl,wk){ const u=C.userSid; const fm=v1821tFormOf(C,u,lvl,wk); const reg=v1821tReg(wk);
  const gS=reg?v1821tGrowOf(C,u,lvl,wk,C.year,true):1, gB=reg?v1821tGrowOf(C,u,lvl,wk,C.year,false):1;
  const g=!reg?'no growth this week (form only)':gS===gB?`growth ×${gS.toFixed(2)}`:`growth ×${gS.toFixed(2)} starters · ×${gB.toFixed(2)} bench`;
  return `${g} · form ${v1821tPts(fm)}`; }
/* the planner for one level and week */
function v1821tPlanner(C,lvl,x,opts){ opts=opts||{}; const wk=x.wk; const f=x.f; const p=v1821tUserPlan(C,lvl,wk); const lock=p.src==='played';
  const b2b=v1821tPrev(C,C.userSid,lvl,wk)&&!v1821tAfterRest(wk)&&v1821tPlan(C,C.userSid,lvl,v1821tPrev(C,C.userSid,lvl,wk)).i==='int';
  const opp=v1821tOpp(C,f); const hint=f?v1821tHint(C,lvl,x):null; const big=v1821tBig(C,f);
  const tag=p.src==='played'?'Locked: game started':p.src==='week'?'This week only':'On your default';
  const oppL=f?`<div class="v1821t-opp">${crest(opp,30)}<div><b>${f.h===C.userSid?'vs':'@'} ${esc(opp.town)} <span class="muted">${esc(opp.mascot||'')}</span></b><small>${esc(fixtureLabel(f))}${v1821tDate(C,f)?' · '+esc(v1821tDate(C,f)):''}</small></div>${big?`<span class="chip riv v1821t-big">${esc(big)}</span>`:''}</div><p class="v1821t-hint ${hint&&hint.big?'big':''}">${esc(hint.t)}</p>`
    :`<div class="v1821t-opp"><div><b>${esc(v1821tWkName(wk))}</b><small>If Varsity gets there · opponent not set yet</small></div></div>`;
  const dis=lock?' disabled':''; const D=` data-l="${lvl}" data-w="${wk}"`;
  const ints=V1821T_IK.map(k=>{ const [a,b]=v1821tIntTxt(k,wk,k==='int'&&b2b); return `<button class="v1821t-int ${p.i===k?'on':''} i-${k}" role="radio" aria-checked="${p.i===k}" data-a="v1821tSet"${D} data-k="i" data-v="${k}"${dis}><span class="v1821t-ih"><span aria-hidden="true">${V1821T_ICO[k]}</span>${V1821T.INT[k].l}</span><small>${esc(a)}</small><small>${esc(b)}</small></button>`; }).join('');
  const ses=V1821T_SK.map(k=>{ const off=k==='scrim'&&(lvl==='MOD'||!v1821tReg(wk)); return `<button class="v1821t-ses ${p.s===k?'on':''}" role="radio" aria-checked="${p.s===k}" data-a="v1821tSet"${D} data-k="s" data-v="${k}"${dis||(off?' disabled':'')}><b><span aria-hidden="true">${V1821T_SICO[k]}</span> ${V1821T.SES[k].l}</b><small>${esc(v1821tSesTxt(C,k,lvl,wk))}</small></button>`; }).join('');
  const d=v1821tS(C).def[lvl]; const same=p.i===d.i&&p.s===d.s;
  return `<section class="card v1821t-pl ${big&&p.src==='default'&&p.i!=='light'?'warn':''}"><div class="hd"><h3>${opts.title||LVL_NAME[lvl]}</h3><span class="chip ${p.src==='week'?'v1821t-ov':''}">${tag}</span></div>${oppL}
    <div class="v1821t-lab" id="v1821t-il-${lvl}-${wk}">Intensity</div><div class="v1821t-ints" role="radiogroup" aria-labelledby="v1821t-il-${lvl}-${wk}">${ints}</div>
    <div class="v1821t-lab" id="v1821t-sl-${lvl}-${wk}">Session</div><div class="v1821t-sess" role="radiogroup" aria-labelledby="v1821t-sl-${lvl}-${wk}">${ses}</div>
    <div class="v1821t-eff"><span>This week: <b>${esc(v1821tEffect(C,lvl,wk))}</b></span>${lock?'':`<span class="v1821t-btns">${p.src==='week'?`<button class="btn sm ghost" data-a="v1821tReset"${D}>Back to default</button>`:''}${same?'':`<button class="btn sm" data-a="v1821tSaveDef"${D}>Save as default</button>`}</span>`}</div></section>`; }
/* the season strip for one level */
function v1821tStrip(C,lvl){ const W=v1821tWeeks(C,lvl); const u=C.userSid; const sel=App.params&&App.params.pwk;
  if(!W.length) return `<div class="empty">No ${LVL_NAME[lvl]} games on the schedule this season.</div>`;
  const tiles=W.map(x=>{ const f=x.f; const p=v1821tUserPlan(C,lvl,x.wk); const opp=v1821tOpp(C,f); const big=v1821tBig(C,f)||(x.hyp&&x.wk==='S2'?'Section final':null);
    let res=''; if(f&&f.st==='d'){ const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; const r=f.w===u?'W':f.w?'L':'D'; res=`<span class="v1821t-r r${r}">${r} ${us}-${th}</span>`; } else res=`<span class="v1821t-r">${f?(f.h===u?'vs ':'@ ')+esc(boardName(opp)):'TBD'}</span>`;
    const played=p.src==='played'; const fut=!played; const on=sel===x.wk&&(App.params.plv||'V')===lvl;
    const lab=`${v1821tWkName(x.wk)}: ${V1821T.INT[p.i].l} + ${V1821T.SES[p.s].l}${f&&f.st==='d'?', '+res.replace(/<[^>]+>/g,''):''}${big?' · '+big:''}`;
    return `<${fut?'button':'div'} class="v1821t-tile i-${p.i} ${on?'sel':''} ${played?'done':''} ${p.src==='week'?'ov':''}" ${fut?`data-a="v1821tPick" data-l="${lvl}" data-w="${x.wk}" aria-pressed="${on}"`:''} title="${esc(lab)}" aria-label="${esc(lab)}">
      <span class="v1821t-tw">${esc(v1821tWkName(x.wk,1))}${big?'<i class="v1821t-star" aria-hidden="true">★</i>':''}</span><span class="v1821t-ti"><span aria-hidden="true">${V1821T_ICO[p.i]}</span>${V1821T.INT[p.i].l}</span><span class="v1821t-ts">${V1821T_SS[p.s]}</span>${res}</${fut?'button':'div'}>`; }).join('');
  const t=v1821tTally(C,lvl); const rec=k=>t.rec[k].join('-');
  return `<div class="v1821t-strip">${tiles}</div><p class="small muted v1821t-tal">${t.n?`So far: ${t.int} Intense (${rec('int')} W-D-L)${t.b2b?`, ${t.b2b} back to back`:''} · ${t.std} Standard (${rec('std')}) · ${t.light} Light (${rec('light')})`:'Nothing played yet this season.'} Pick an upcoming week to plan it ahead; ★ marks big games.</p>`; }
function v1821tDefCard(C){ const P=v1821tS(C);
  const rows=LVLS.map(l=>{ const d=P.def[l]; return `<div class="v1821t-dr"><b>${LVL_NAME[l]}</b><div class="seg sm" role="group" aria-label="${LVL_NAME[l]} default intensity">${V1821T_IK.map(k=>`<button class="${d.i===k?'on':''}" aria-pressed="${d.i===k}" data-a="v1821tDef" data-l="${l}" data-k="i" data-v="${k}">${V1821T.INT[k].l}</button>`).join('')}</div>
    <div class="seg sm" role="group" aria-label="${LVL_NAME[l]} default session">${V1821T_SK.filter(k=>k!=='scrim'||l!=='MOD').map(k=>`<button class="${d.s===k?'on':''}" aria-pressed="${d.s===k}" data-a="v1821tDef" data-l="${l}" data-k="s" data-v="${k}">${V1821T.SES[k].l}</button>`).join('')}</div></div>`; }).join('');
  return `<section class="card v1821t-def"><div class="hd"><h3>Every week</h3><span class="small muted">Your saved default, used for every week you don't change</span></div>${rows}</section>`; }
function v1821tHow(){ const I=V1821T.INT;
  return `<section class="card v1821t-how"><div class="hd"><h3>How practice works</h3></div><ul>
    <li><b>Intense</b> ×${I.int.g} growth that matchday, but the game is played on tired legs: ${v1821tPts(I.int.f)} form, ${v1821tPts(V1821T.B2B)} if the week before was Intense too (the open week resets legs).</li>
    <li><b>Light</b> ×${I.light.g} growth, fresh legs: ${v1821tPts(I.light.f)} form. <b>Standard</b> changes nothing.</li>
    <li><b>Form</b> is match sharpness for that one game: home field is worth about 30 form points. Measured over league games: Light ≈ +1 point of win chance, Intense ≈ −2, back-to-back Intense ≈ −3.</li>
    <li>Practice changes growth only in league weeks; preseason and postseason weeks keep the form effects. One week's practice boost is capped at +${Math.round((V1821T.CAP-1)*100)}%.</li>
    <li>Other coaches plan too: mostly Standard, some Intense and Light weeks, and many taper before knockout games.</li></ul></section>`; }
function v1821tRender(C){ const u=C.userSid; const lv=(App.params&&App.params.plv)||'V'; const sel=App.params&&App.params.pwk;
  const cards=LVLS.map(l=>{ const x=v1821tComing(C,l); return x?v1821tPlanner(C,l,x,{title:`${LVL_NAME[l]} · next game`}):`<section class="card v1821t-pl"><div class="hd"><h3>${LVL_NAME[l]}</h3></div><div class="empty">${C.phase==='offseason'?'The season is over. Your defaults carry into next season.':`No more ${LVL_NAME[l]} games this season.`}</div></section>`; }).join('');
  let ahead=''; if(sel){ const x=v1821tWeeks(C,lv).find(y=>y.wk===sel); const c=v1821tComing(C,lv); if(x&&(!c||c.wk!==sel)&&v1821tUserPlan(C,lv,sel).src!=='played') ahead=`<div class="v1821t-ahead">${v1821tPlanner(C,lv,x,{title:`Plan ahead · ${LVL_NAME[lv]} · ${v1821tWkName(sel)}`})}</div>`; }
  return `<div class="v1821t"><div class="v1821t-top"><div><h2 class="v1821t-h">Practice Planner</h2><p class="small muted">Set each level's practice before its next game. Intense grows players faster but costs sharpness; Light keeps legs fresh for big games.</p></div></div>
    <div class="v1821t-cards">${cards}</div>${ahead}
    <section class="card"><div class="hd"><h3>The season</h3><div class="seg sm" role="group" aria-label="Level">${LVLS.map(l=>`<button class="${lv===l?'on':''}" aria-pressed="${lv===l}" data-a="v1821tLvl" data-l="${l}">${LVL_NAME[l]}</button>`).join('')}</div></div>${v1821tStrip(C,lv)}</section>
    <div class="v1821t-two">${v1821tDefCard(C)}${v1821tHow()}</div></div>`; }
/* ---------- summary chip and badge ---------- */
function v1821tPending(C){ const out=[]; for(const l of LVLS){ const x=v1821tComing(C,l); if(!x) continue; const big=v1821tBig(C,x.f); const p=v1821tUserPlan(C,l,x.wk); if(big&&p.src==='default'&&p.i!=='light') out.push({l,x,big}); } return out; }
function v1821tSummary(C){ const parts=[]; for(const l of LVLS){ const x=v1821tComing(C,l); if(!x) continue; const p=v1821tUserPlan(C,l,x.wk); parts.push(`${l} ${V1821T.INT[p.i].l} + ${V1821T.SES[p.s].l}`); }
  if(!parts.length) return {t:'Practice: season over',s:'Your defaults carry into next season'}; const pend=v1821tPending(C);
  return {t:'This week: '+parts[0],s:pend.length?`${pend[0].big} ahead for ${LVL_NAME[pend[0].l]}: still on defaults`:parts.slice(1).join(' · '),warn:pend.length>0}; }
v1821dTab({id:'practice',label:'Practice',ico:'📋',order:40,render:C=>v1821tRender(C),summary:C=>v1821tSummary(C),badge:C=>{ const n=v1821tPending(C).length; return n||''; }});
/* ---------- actions ---------- */
function v1821tAfter(){ App.odds.clear(); queueSave(); App.keepScroll=true; if(App.modal) renderModal(); render(); }
function v1821tLink(C,Y,wk,lvl,s){ /* Scrimmage is one session for Varsity and JV together */
  if(lvl==='MOD') return; const o=lvl==='V'?'JV':'V'; const cur=v1821tUserPlan(C,o,wk); if(cur.src==='played') return; const d=v1821tS(C).def[o];
  if(s==='scrim'&&cur.s!=='scrim'){ const w=Y.ov[wk]||(Y.ov[wk]={}); w[o]={i:cur.i,s:'scrim'}; }
  else if(s!=='scrim'&&cur.s==='scrim'){ const w=Y.ov[wk]||(Y.ov[wk]={}); w[o]={i:cur.i,s:d.s==='scrim'?'tech':d.s}; } }
function v1821tClean(C,Y,wk){ const w=Y.ov[wk]; if(!w) return; const D=v1821tS(C).def; for(const l of Object.keys(w)){ if(w[l].i===D[l].i&&w[l].s===D[l].s) delete w[l]; } if(!Object.keys(w).length) delete Y.ov[wk]; }
A.v1821tSet=el=>{ const C=App.C; const l=el.dataset.l, wk=el.dataset.w, k=el.dataset.k, v=el.dataset.v; if(!C||!LVLS.includes(l)||!wk) return; const Y=v1821tY(C);
  const cur=v1821tUserPlan(C,l,wk); if(cur.src==='played'){ toast('That game has started; its practice is locked.'); return; }
  if(k==='s'&&v==='scrim'&&(l==='MOD'||!v1821tReg(wk))) return;
  const np={i:cur.i,s:cur.s,[k]:v}; (Y.ov[wk]||(Y.ov[wk]={}))[l]=np; if(k==='s') v1821tLink(C,Y,wk,l,v); v1821tClean(C,Y,wk); v1821tAfter(); };
A.v1821tReset=el=>{ const C=App.C; const l=el.dataset.l, wk=el.dataset.w; const Y=v1821tY(C); const w=Y.ov[wk]; const was=v1821tUserPlan(C,l,wk);
  if(w) delete w[l]; const now=v1821tUserPlan(C,l,wk); if(was.s!==now.s) v1821tLink(C,Y,wk,l,now.s); v1821tClean(C,Y,wk); v1821tAfter(); };
A.v1821tSaveDef=el=>{ const C=App.C; const l=el.dataset.l, wk=el.dataset.w; const p=v1821tUserPlan(C,l,wk); const P=v1821tS(C); const s=p.s==='scrim'&&l==='MOD'?'tech':p.s;
  P.def[l]={i:p.i,s}; if(l!=='MOD'){ const o=l==='V'?'JV':'V'; if(s==='scrim') P.def[o].s='scrim'; else if(P.def[o].s==='scrim') P.def[o].s='tech'; }
  for(const y of Object.values(P.yr)) for(const w of Object.keys(y.ov)) v1821tClean(C,y,w); toast(`${LVL_NAME[l]} default: ${V1821T.INT[p.i].l} + ${V1821T.SES[s].l} every week.`); v1821tAfter(); };
A.v1821tDef=el=>{ const C=App.C; const l=el.dataset.l, k=el.dataset.k, v=el.dataset.v; const P=v1821tS(C); if(k==='s'&&v==='scrim'&&l==='MOD') return;
  P.def[l]={...P.def[l],[k]:v}; if(k==='s'&&l!=='MOD'){ const o=l==='V'?'JV':'V'; if(v==='scrim') P.def[o].s='scrim'; else if(P.def[o].s==='scrim') P.def[o].s='tech'; }
  const Y=v1821tY(C); for(const w of Object.keys(Y.ov)) v1821tClean(C,Y,w); v1821tAfter(); };
A.v1821tPick=el=>{ const l=el.dataset.l, wk=el.dataset.w; const cur=App.params||{}; const same=cur.pwk===wk&&(cur.plv||'V')===l; App.params={...cur,plv:l,pwk:same?undefined:wk}; if(same) delete App.params.pwk; App.keepScroll=true; render(); };
A.v1821tLvl=el=>{ App.params={...(App.params||{}),plv:el.dataset.l}; delete App.params.pwk; App.keepScroll=true; render(); };
/* ---------- Overview: a "This week" item before a rivalry or knockout game ---------- */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; if(!C||V1821T.off) return h; const pend=v1821tPending(C); if(!pend.length) return h;
    const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h; const cl=box.querySelector('.v1817o-clear'); if(cl) cl.remove();
    const x=pend[0]; const opp=v1821tOpp(C,x.x.f); const p=v1821tUserPlan(C,x.l,x.x.wk);
    const b=document.createElement('button'); b.className='dec v1821t-dec'; b.dataset.a='go'; b.dataset.r='dev'; b.dataset.p=JSON.stringify({dtab:'practice'});
    b.innerHTML=`<span class="dec-ico" aria-hidden="true">🌤️</span><span class="grow"><b>${esc(x.big)} next: go Light in practice?</b><small>${esc(LVL_NAME[x.l])} vs ${esc(opp?opp.town:'')} · fresh legs ${v1821tPts(V1821T.INT.light.f)} form · now ${esc(V1821T.INT[p.i].l)} + ${esc(V1821T.SES[p.s].l)}${pend.length>1?` · ${pend.length-1} more level${pend.length>2?'s':''}`:''}</small></span><span class="dec-go">${icon('chev',16)}</span>`;
    box.appendChild(b); return t.innerHTML; }catch(e){ console.warn('practice overview',e); return h; } }; }
/* ---------- match preview: the Varsity intensity for this game ---------- */
{ const _fm=MODALS.fixture; MODALS.fixture=function(m){ let h=_fm.apply(this,arguments); try{ const C=App.C; const f=C&&C.fixtures[m.id]; if(!f||f.st!=='s'||V1821T.off||f.lvl!=='V'||(f.h!==C.userSid&&f.a!==C.userSid)) return h;
    const wk=v1821tWk(f); if(!wk) return h; const c=v1821tComing(C,'V'); if(!c||c.wk!==wk) return h; const p=v1821tUserPlan(C,'V',wk); if(p.src==='played') return h;
    const b2b=v1821tPrev(C,C.userSid,'V',wk)&&!v1821tAfterRest(wk)&&v1821tPlan(C,C.userSid,'V',v1821tPrev(C,C.userSid,'V',wk)).i==='int';
    const card=`<div class="card v1821t-pv"><div class="hd"><h3>Practice this week</h3><button class="btn sm ghost" data-a="go" data-r="dev" data-p="${esc(JSON.stringify({dtab:'practice'}))}">Practice Planner</button></div>
      <div class="v1821t-ints sm" role="radiogroup" aria-label="Varsity practice intensity">${V1821T_IK.map(k=>{ const [a,b]=v1821tIntTxt(k,wk,k==='int'&&b2b); return `<button class="v1821t-int ${p.i===k?'on':''} i-${k}" role="radio" aria-checked="${p.i===k}" data-a="v1821tSet" data-l="V" data-w="${wk}" data-k="i" data-v="${k}"><span class="v1821t-ih"><span aria-hidden="true">${V1821T_ICO[k]}</span>${V1821T.INT[k].l}</span><small>${esc(a)} · ${esc(b)}</small></button>`; }).join('')}</div>
      <p class="tiny muted">Session: ${esc(V1821T.SES[p.s].l)} · this game: ${esc(v1821tEffect(C,'V',wk))}</p></div>`;
    const i=h.lastIndexOf('</div><div class="mfoot">'); if(i>=0) h=h.slice(0,i)+card+h.slice(i); }catch(e){ console.warn('practice preview',e); } return h; }; }
