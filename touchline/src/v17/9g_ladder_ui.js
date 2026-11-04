/* ===================== v18.19 THE LADDER (screens) =====================
   Competition -> The Ladder: the three classes top to bottom (your class as a full table with its zones, the others as a row of
   crests that opens into their table), how a season ends, where you stand, the promotion playoff when you are in it, and last
   season's moves and champions. The League table gets the zones too; the Play button and the "This week" strip carry the playoff;
   a move up or down is announced when the new season starts. */
const V1819LU={ open:{} };
function v1819lForm(f){ return `<span class="v1819l-form">${(f||[]).slice(-5).map(x=>`<i class="${x}"></i>`).join('')}</span>`; }
function v1819lSchool(C,id){ return v1812pSchool(C,id)||{town:'?',name:'?',c1:'#345',c2:'#fff'}; }
function v1819lZoneTxt(z){ return z==='up'?'▲ Moves up':z==='po'?'Promotion playoff':z==='pd'?'Playoff to stay up':z==='down'?'▼ Drops down':''; }
function v1819lRows(C,c,rows,mine){ return rows.map((r,i)=>{ const z=v1819lZone(c,i+1); const s=v1819lSchool(C,r.id); const me=r.id===C.userSid;
    return `<tr class="z-${z||'none'} ${me?'me':''}"><td class="n">${i+1}</td><td><span class="v1819l-sn">${crest(s,26)}<button class="link" ${C.league.includes(r.id)?`data-a="openSchool" data-id="${esc(r.id)}"`:`data-a="v1812pTeam" data-id="${esc(r.id)}"`}>${esc(s.name||s.town)}</button>${me?'<i class="v1819l-you">YOU</i>':''}</span></td><td class="n">${r.p}</td><td class="n mono">${r.w}-${r.d}-${r.l}</td><td class="n">${r.gd>0?'+':''}${r.gd}</td><td class="n"><b>${r.pts}</b></td><td>${v1819lForm(r.form)}</td><td class="v1819l-z">${v1819lZoneTxt(z)}</td></tr>`; }).join(''); }
function v1819lTableHtml(C,c,rows){ return `<div class="tw v1819l-tw"><table class="v1819l-t"><thead><tr><th class="n">#</th><th>School</th><th class="n">P</th><th class="n">W-D-L</th><th class="n">GD</th><th class="n">Pts</th><th>Form</th><th></th></tr></thead><tbody>${v1819lRows(C,c,rows)}</tbody></table></div>`; }
function v1819lStand(C,c,rows){ const L=C.lad; const u=C.userSid; const i=rows.findIndex(r=>r.id===u); if(i<0) return ''; const me=rows[i]; const s=C.schools[u];
  if(!me.p) return `${esc(s.town)} start the season in ${V1819L.NAME[c]}. ${c!=='AAA'?'Finish in the top two to move up; third gets a playoff.':'This is the top class.'} ${c!=='A'?'The bottom two drop; sixth plays off to stay up.':'Nobody drops from Class A.'}`;
  const bits=[`${esc(s.town)} sit ${v1812pOrd(i+1)} of ${rows.length} in ${V1819L.NAME[c]}.`];
  if(c!=='AAA'){ const line=rows[1]; const gap=line.pts-me.pts; bits.push(i<2?'You are in the promotion places.':gap<=0?'Level on points with the promotion line.':`The promotion line is ${gap} point${gap===1?'':'s'} away.`); } else bits.push(i===0?'Top of the ladder.':'This is the top class: a title here is the biggest there is.');
  if(c!=='A'){ const drop=rows[6]; const gap=me.pts-drop.pts; bits.push(i>=6?'You are in the drop zone.':`The drop zone is ${gap} point${gap===1?'':'s'} behind.`); } else bits.push('Class A is the bottom rung: nobody drops from here.');
  return bits.join(' '); }
function v1819lPoCard(C){ const po=v1819lPending(C); const L=C.lad; const H=L&&L.hist[C.year]; if(!H) return '';
  const mine=H.po.find(p=>p.up===C.userSid||p.dn===C.userSid); if(!mine) return '';
  const opp=mine.up===C.userSid?mine.dn:mine.up; const o=v1819lSchool(C,opp), s=C.schools[C.userSid]; const up=mine.up===C.userSid;
  const res=mine.w?(mine.w===C.userSid?(up?`Won. ${esc(s.town)} move up to ${V1819L.NAME[mine.hi]}.`:`Won. ${esc(s.town)} stay in ${V1819L.NAME[mine.hi]}.`):(up?`Lost. ${esc(s.town)} stay in ${V1819L.NAME[mine.lo]}.`:`Lost. ${esc(s.town)} drop to ${V1819L.NAME[mine.lo]}.`)):'';
  const sc=mine.res?`${mine.res.hg}–${mine.res.ag}${mine.res.pk?` (${mine.res.pk[0]}–${mine.res.pk[1]} pens)`:''}`:'';
  return `<section class="v1819l-po ${mine.w?(mine.w===C.userSid?'won':'lost'):''}"><div class="v1812p-kick">Promotion playoff · ${V1819L.NAME[mine.hi]} spot</div>
    <div class="v1819l-pom">${crest(s,58)}<span class="v1819l-vs">${mine.w?`<b>${sc}</b>`:'VS'}</span>${crest(o,58)}</div>
    <p>${mine.w?res:`${up?`Third in ${V1819L.NAME[mine.lo]}`:`Sixth in ${V1819L.NAME[mine.hi]}`}: one game against ${esc(o.name||o.town)} (${up?`sixth in ${V1819L.NAME[mine.hi]}`:`third in ${V1819L.NAME[mine.lo]}`}) for a place in ${V1819L.NAME[mine.hi]}. Extra time and penalties if it is level.`}</p>
    ${po?`<button class="btn pri" data-a="v1819lPlay">Play the promotion playoff</button>`:''}</section>`; }
function v1819lLast(C){ const L=C.lad; const yrs=Object.keys(L.hist).map(Number).sort((a,b)=>b-a); const H=L.hist[yrs.find(y=>L.hist[y].done)||yrs[0]]; if(!H) return '';
  const n=id=>esc(v1812pName(C,id)); const moves=H.moves.filter((m,i,a)=>a.findIndex(x=>x.id===m.id&&x.why===m.why)===i);
  const up=moves.filter(m=>V1819L.CLS.indexOf(m.to)<V1819L.CLS.indexOf(m.from)), dn=moves.filter(m=>V1819L.CLS.indexOf(m.to)>V1819L.CLS.indexOf(m.from));
  const po=H.po.map(p=>`<li>${n(p.up)} v ${n(p.dn)}: ${p.res?`${p.res.hg}–${p.res.ag}${p.res.pk?' (pens)':''}, `:''}${p.w?`<b>${n(p.w)}</b> ${p.w===p.up?'go up':'stay up'}`:'to be played'}</li>`).join('');
  return `<section class="card v1819l-last"><h3>${H.yr} season</h3><div class="v1819l-lg"><div><span class="v1812p-kick">Champions</span><ul>${V1819L.CLS.map(c=>H.champ[c]&&H.champ[c].id?`<li><b>${V1819L.NAME[c]}</b> ${n(H.champ[c].id)}${H.champ[c].state?' (State)':''}</li>`:'').join('')}</ul></div>
    <div><span class="v1812p-kick">Moved up</span><ul>${up.map(m=>`<li class="up">▲ ${n(m.id)} <small>to ${V1819L.NAME[m.to]}${m.why==='playoff'?' via playoff':''}</small></li>`).join('')||'<li class="muted">—</li>'}</ul></div>
    <div><span class="v1812p-kick">Dropped</span><ul>${dn.map(m=>`<li class="dn">▼ ${n(m.id)} <small>to ${V1819L.NAME[m.to]}${m.why==='playoff'?' via playoff':''}</small></li>`).join('')||'<li class="muted">—</li>'}</ul></div>
    <div><span class="v1812p-kick">Promotion playoffs</span><ul>${po||'<li class="muted">—</li>'}</ul></div></div></section>`; }
VIEWS.ladder=()=>{ const C=App.C; const L=v1819lS(C); if(!L) return '<div class="empty">The Ladder needs the State Poll. It starts with your next career.</div>';
  const yr=C.year; const bound=v1812pBound(C,yr); const blocks=V1819L.CLS.map((c,ci)=>{ const mine=c===L.mine; const rows=v1819lTable(C,c,yr,mine?null:bound);
    const gp=mine?Math.max(0,...rows.map(r=>r.p)):bound; const open=mine||V1819LU.open[c];
    const head=`<div class="v1819l-bh"><div><h2 class="c-${c}">${V1819L.NAME[c]}</h2><small>${mine?`Your class · standings after ${gp} game${gp===1?'':'s'}`:V1819L.SUB[c]}</small></div>${mine?'':`<div class="v1819l-crests">${L.cls[c].map(id=>{ const s=v1819lSchool(C,id); return `<button class="v1819l-cr" data-a="${C.league.includes(id)?'openSchool':'v1812pTeam'}" data-id="${esc(id)}" title="${esc(s.name||s.town)}">${crest(s,40)}<span>${esc(s.town)}</span></button>`; }).join('')}</div><button class="btn sm ghost" data-a="v1819lOpen" data-c="${c}" aria-expanded="${!!open}">${open?'Hide table':'Table'}</button>`}</div>`;
    const arrow=ci<2?`<div class="v1819l-arrow"><span class="up">⬆ The top two schools in ${V1819L.NAME[V1819L.CLS[ci+1]]} move up to ${V1819L.NAME[c]}; third plays sixth for the last spot</span><span class="dn">⬇ The bottom two in ${V1819L.NAME[c]} drop to ${V1819L.NAME[V1819L.CLS[ci+1]]}</span></div>`:'';
    return `<section class="v1819l-cls ${mine?'mine':''} c-${c}">${head}${open?v1819lTableHtml(C,c,rows):''}</section>${arrow}`; }).join('');
  const stand=v1819lStand(C,L.mine,v1819lTable(C,L.mine,yr));
  return `<div class="v1819l"><section class="v1819l-l"><p class="v1819l-lead">Schools are split into three classes. Finish near the top and you move up to tougher opponents. Finish near the bottom and you drop.</p>
    <section class="card v1819l-how"><h3>How a season ends</h3>
      <div class="v1819l-hi"><span>🪜</span><div><b>Three classes</b><p>Class AAA, AA and A, with eight schools each. Every class crowns its own champion.</p></div></div>
      <div class="v1819l-hi"><span>↕️</span><div><b>Move up or down</b><p>The top two move up and the bottom two move down. Third place plays the sixth-placed school of the class above for the last spot.</p></div></div>
      <div class="v1819l-hi"><span>🚌</span><div><b>The climb has a cost</b><p>A higher class means stronger opponents (Class AAA schools run about 70–77, AA 65–72, A 60–67) and bigger stadiums and crowds.</p></div></div></section>
    <section class="card v1819l-where"><h3>Where you stand</h3><p>${stand}</p></section>${v1819lPoCard(C)}</section>
   <section class="v1819l-r">${blocks}</section></div>${v1819lLast(C)}`; };
TITLES.ladder='The Ladder'; NAV_ICON.ladder='league'; if(typeof NAV_DESC!=='undefined') NAV_DESC.ladder='Three classes, promotion and relegation';
{ const i=NAV.findIndex(n=>n[0]==='league'); if(i>=0&&!NAV.some(n=>n[0]==='ladder')) NAV.splice(i+1,0,['ladder','The Ladder']); }
{ const g=TOPNAV.find(t=>t[0]==='league'); if(g&&!g[3].includes('ladder')) g[3].splice(1,0,'ladder'); }
if(typeof V1817O_MENU!=='undefined'&&V1817O_MENU.league){ const st=V1817O_MENU.league[0][1]; if(!st.includes('ladder')) st.splice(1,0,'ladder'); }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('ladder');
A.v1819lOpen=el=>{ const c=el.dataset.c; V1819LU.open[c]=!V1819LU.open[c]; App.keepScroll=true; render(); };
A.v1819lPlay=()=>{ const C=App.C; const po=v1819lPlayPo(C); if(!po) return; queueSave(); App.keepScroll=true; render(); const u=C.userSid; const won=po.w===u;
  App.modal={type:'v1819lRes',key:po.key}; renderModal(); try{ Sound.ui(won?'win':'pop'); }catch(e){} };
MODALS.v1819lRes=m=>{ const C=App.C; const H=C.lad.hist[C.year]; const po=H&&H.po.find(p=>p.key===m.key); if(!po) return modalShell('Promotion playoff','');
  const u=C.userSid, s=C.schools[u], o=v1819lSchool(C,po.opp), won=po.w===u, up=po.up===u; const r=po.res;
  const line=won?(up?`Up to ${V1819L.NAME[po.hi]}`:`Staying in ${V1819L.NAME[po.hi]}`):(up?`Staying in ${V1819L.NAME[po.lo]}`:`Down to ${V1819L.NAME[po.lo]}`);
  return modalShell('Promotion playoff',`<div class="v1819l-res ${won?'won':'lost'}"><div class="v1819l-pom">${crest(s,84)}<b>${r?`${r.h===u?r.hg:r.ag}–${r.h===u?r.ag:r.hg}`:''}</b>${crest(o,84)}</div>${r&&r.pk?`<p class="muted">${r.h===u?r.pk[0]:r.pk[1]}–${r.h===u?r.pk[1]:r.pk[0]} on penalties</p>`:''}<h2>${line}</h2><p>${won?'The season after this one starts in your new class.':'There is always next year.'}</p></div>`,`<button class="btn pri" data-a="closeModal">Continue</button>`,'v1819l-modal'); };
MODALS.v1819lMove=m=>{ const C=App.C; const f=C.lad&&C.lad.flash; if(!f) return ''; const s=C.schools[C.userSid];
  return modalShell('The Ladder',`<div class="v1819l-res ${f.up?'won':'lost'}"><span class="v1812p-kick">${C.year} season</span>${crest(s,110)}<h2>${f.up?'Promoted to ':'Relegated to '}${V1819L.NAME[f.to]}</h2><p>${f.up?'Bigger crowds and tougher opponents: the class above runs about '+(f.to==='AAA'?'70–77':'65–72')+'.':'A step down to regroup: the class below runs about '+(f.to==='A'?'60–67':'65–72')+'. Finish in the top two to climb back.'}</p></div>`,`<button class="btn pri" data-a="v1819lAck">Let’s go</button><button class="btn ghost" data-a="v1819lAckGo">See the Ladder</button>`,'v1819l-modal'); };
A.v1819lAck=()=>{ const C=App.C; if(C.lad) delete C.lad.flash; App.modal=null; renderModal(); queueSave(); };
A.v1819lAckGo=()=>{ A.v1819lAck(); App.route='ladder'; App.params={}; render(); };
/* the Play button plays your playoff first, and the new class is announced */
{ const _pl=playLabel; playLabel=function(C){ try{ if(C&&C.phase==='offseason'&&C.lad&&v1819lPending(C)) return 'Play promotion playoff'; }catch(e){} return _pl.apply(this,arguments); }; }
{ const _pn=A.playNext; A.playNext=function(){ const C=App.C; try{ if(C&&C.phase==='offseason'&&C.lad&&v1819lPending(C)){ A.v1819lPlay(); return; } }catch(e){ console.warn('ladder play',e); } const r=_pn.apply(this,arguments);
  try{ if(C&&C.lad&&C.lad.flash&&C.lad.flash.yr===C.year&&!App.modal){ App.modal={type:'v1819lMove'}; renderModal(); } }catch(e){} return r; }; }
/* Overview: the playoff in "This week" */
{ const _ov=VIEWS.office; VIEWS.office=function(){ let h=_ov.apply(this,arguments); try{ const C=App.C; const po=C&&C.lad&&v1819lPending(C); if(po){ const o=v1819lSchool(C,po.up===C.userSid?po.dn:po.up);
    const item=`<button class="dec v1819l-dec" data-a="v1819lPlay"><span class="dec-ico">🪜</span><span class="grow"><b>Promotion playoff vs ${esc(o.town)}</b><small>A place in ${V1819L.NAME[po.hi]} on the line</small></span><span class="dec-go"></span></button>`;
    h=h.replace('<div class="v1817o-items">','<div class="v1817o-items">'+item).replace('<p class="v1817o-clear">All set for this week. Nothing waiting on you.</p>',''); } }catch(e){} return h; }; }
/* League table: the zones */
{ const _lv=VIEWS.league; VIEWS.league=function(){ let h=_lv.apply(this,arguments); try{ const C=App.C; const L=C&&C.lad; const P=App.params; if(!L||(P.tab&&P.tab!=='table')||(P.lvl&&P.lvl!=='V')) return h;
    let i=0; h=h.replace(/<tr class="(me)?">/g,(m,me)=>{ i++; const z=v1819lZone(L.mine,i); return `<tr class="${me||''} v1819l-z-${z||'none'}" title="${esc(v1819lZoneTxt(z))}">`; });
    h=h.replace('<div class="tw"><table>',`<div class="v1819l-chip"><b>${V1819L.NAME[L.mine]}</b> · green moves up, amber plays off, red drops <button class="btn sm ghost" data-a="go" data-r="ladder">The Ladder</button></div><div class="tw"><table>`); }catch(e){} return h; }; }
