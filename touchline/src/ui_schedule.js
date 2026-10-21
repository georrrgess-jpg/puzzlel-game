/* ===================== v11: SCHEDULE BUILDER — shape the Preseason Cup before a ball is kicked ===================== */
NAV.splice(NAV.findIndex(n=>n[0]==='schedule')+1,0,['presched','Schedule Builder']);
NAV_ICON.presched='presched'; TITLES.presched='Schedule Builder';
ICON.presched='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>';
const SB_TAGS={tune:['Tune-up','#3ccf91','A confidence game: you should win it, and your bench gets minutes.'],even:['Even','#ffd36b','A coin-flip against a team at your level.'],test:['Test','#ff8b5d','A stronger side that will expose weaknesses before league play.'],giant:['Giant','#ff5d5d','A heavyweight. Beat them and your program gains prestige and a headline.']};
function sbEditable(C){ return C&&C.phase==='preseason'&&C.pre&&C.pre.rd===0&&!C.pre.locked&&(C.pre.fx||[]).length===3&&C.pre.fx.every(id=>C.fixtures[id]&&C.fixtures[id].st==='s'); }
function sbTag(C,sid){ const d=xiRating(C,sid,'V')-xiRating(C,C.userSid,'V'); return d<-5?'tune':d<2.5?'even':d<7?'test':'giant'; }
function sbOpp(C,f){ return f.h===C.userSid?f.a:f.h; }
function sbVenue(C,f){ return f.neutral?'showcase':f.h===C.userSid?'home':'away'; }
/* the pool: the three opponents the cup drew, plus four more spread from tune-up to giant */
function sbPool(C){ const P=C.pre; if(P.pool&&P.pool.every(id=>C.schools[id])) return P.pool;
  const base=P.fx.map(id=>sbOpp(C,C.fixtures[id])); const me=xiRating(C,C.userSid,'V')||70; const extra=[];
  for(const off of [-9,-2,3,8]){ const t=Math.round(clamp(me+off,58,92)); const s=genExt(C,t+4,'pre'); extra.push(s.id); }
  P.pool=[...base,...extra]; return P.pool; }
function sbApply(C,i,opp,venue){ const f=C.fixtures[C.pre.fx[i]]; const u=C.userSid;
  if(venue==='away'){ f.h=opp; f.a=u; } else { f.h=u; f.a=opp; }
  if(venue==='showcase'){ f.neutral=true; f.ven=`${C.stateName} District Stadium`; } else { delete f.neutral; delete f.ven; }
  f.diff=sbTag(C,opp); App.odds.clear(); }
VIEWS.presched=()=>{ const C=App.C; const me=Sx(C.userSid);
  if(C.phase!=='preseason'||!C.pre||!(C.pre.fx||[]).length) return `<div class="empty card">The Schedule Builder opens at the start of every preseason, before the first Preseason Cup game. ${C.pre&&C.pre.locked?'':''}</div>`;
  const ed=sbEditable(C); const pool=ed?sbPool(C):(C.pre.pool||[]); const sel=+(App.params.ss??0); const fx=C.pre.fx.map(id=>C.fixtures[id]);
  const used=fx.map(f=>sbOpp(C,f)); const scrim=C.pre.scrim;
  const slot=(f,i)=>{ const o=Sx(sbOpp(C,f)); const t=SB_TAGS[f.diff||sbTag(C,o.id)]; const v=sbVenue(C,f); return `<button class="sb-slot ${ed&&i===sel?'on':''} ${f.st==='d'?'done':''}" ${ed?`data-a="setParam" data-k="ss" data-v="${i}"`:'disabled'}>
      <span class="lab">Cup · Game ${i+1}</span><span class="sb-o">${logo(o,40)}<b>${esc(o.town)}</b></span><span class="sb-meta"><i class="sb-tag" style="--t:${t[1]}">${t[0]}</i><i>${v==='home'?'Home':v==='away'?'Away':'🏟️ Showcase'}</i>${f.st==='d'?`<i class="mono">${f.h===C.userSid?f.hg+'–'+f.ag:f.ag+'–'+f.hg}</i>`:''}</span></button>`; };
  const cur=fx[sel]; const curOpp=cur?sbOpp(C,cur):null; const curVen=cur?sbVenue(C,cur):'home'; const showUsed=fx.some((f,i)=>i!==sel&&f.neutral);
  const card=sid=>{ const o=Sx(sid); const tg=sbTag(C,sid); const t=SB_TAGS[tg]; const taken=used.includes(sid)&&sid!==curOpp; const on=sid===curOpp;
    return `<button class="sb-opp ${on?'on':''}" data-a="sbPick" data-id="${sid}" ${taken||!ed?'disabled':''} aria-pressed="${on}">${logo(o,46)}<span class="sb-on"><b>${esc(o.town)}</b><small>${esc(o.mascot)} · ${esc(o.section||'Out of section')} · XI ${Math.round(xiRating(C,sid,'V'))}</small></span><i class="sb-tag" style="--t:${t[1]}">${t[0]}</i>${taken?'<small class="sb-taken">Already booked</small>':''}</button>`; };
  const mix=fx.map(f=>f.diff||sbTag(C,sbOpp(C,f)));
  return `<section class="sb-hero"><div><span class="eyebrow">Preseason · your choices</span><h2>Schedule Builder</h2><p class="small">Pick your three Preseason Cup opponents, where each game is played, and run a JV scrimmage. ${ed?'Changes save as you make them; lock it in when you are happy.':'Your preseason schedule is locked.'}</p></div>
      <div class="sb-mix">${['tune','even','test','giant'].map(k=>`<span style="--t:${SB_TAGS[k][1]}"><b>${mix.filter(x=>x===k).length}</b>${SB_TAGS[k][0]}</span>`).join('')}</div></section>
    <div class="sb-strip"><div class="sb-slot sb-jv ${scrim?'done':''}"><span class="lab">Before game 1</span><span class="sb-o">${logo(me,40)}<b>JV scrimmage</b></span><span class="sb-meta">${scrim?`<i class="mono">${scrim.sc[0]}–${scrim.sc[1]}</i><i>Played</i>`:ed?'<i>Optional</i>':'<i>Skipped</i>'}</span>${scrim?'':ed?`<button class="btn sm" data-a="sbScrim">Run scrimmage</button>`:''}</div>${fx.map(slot).join('')}</div>
    ${ed?`<div class="grid sb-grid" style="align-items:start"><div class="card"><div class="hd"><h3>Choose game ${sel+1}</h3>${seg('sbv_',[['home','Home'],['away','Away'],['showcase','🏟️ Showcase']],curVen,`data-s="${sel}"`)}</div>
        ${showUsed&&curVen!=='showcase'?'<p class="tiny muted" style="margin:0 0 8px">One game can be a showcase; moving it here frees the other slot.</p>':''}
        <div class="sb-pool">${pool.map(card).join('')}</div></div>
      <div class="card sb-why"><h3>Why it matters</h3>${Object.values(SB_TAGS).map(([n,c,d])=>`<div class="sb-w"><i class="sb-tag" style="--t:${c}">${n}</i><span>${d}</span></div>`).join('')}
        <div class="sb-w"><i class="sb-tag" style="--t:#5be3ff">Showcase</i><span>Played at the ${esc(C.stateName)} District Stadium: a bigger crowd and no home advantage for either side.</span></div>
        <div class="sb-w"><i class="sb-tag" style="--t:#c4b5fd">JV scrimmage</i><span>Your Varsity bench and the best JV players get minutes and a small development bump, and you see who is ready to move up.</span></div>
        <div class="row" style="margin-top:12px"><button class="btn pri" data-a="sbLock">Lock schedule</button><button class="btn" data-a="sbAuto">Auto-pick a balanced slate</button></div></div></div>`
      :`<div class="row"><button class="btn pri play" data-a="playNext">Play the Preseason Cup</button></div>`}
    ${scrim?sbScrimReport(C):''}`; };
function sbScrimReport(C){ const S=C.pre.scrim; const ps=S.top.map(id=>C.players[id]).filter(Boolean);
  return `<div class="card sb-scrim"><h3>JV scrimmage report</h3><p class="small muted" style="margin-top:0">Varsity ${S.sc[0]}–${S.sc[1]} JV. ${S.bumped} players earned a development bump. These JV players stood out:</p>
    <div class="sb-stand">${ps.map(p=>`<div class="sb-sp">${portraitSVG(p,54)}<div><b>${esc(pname(p))}</b><small>${p.pos} · Grade ${p.grade} · OVR ${Math.round(ovr(p))}</small></div>${p.lvl==='JV'?`<button class="btn sm" data-a="promote" data-id="${p.id}" data-to="V">Move up to Varsity</button>`:'<span class="chip">On Varsity</span>'}</div>`).join('')}</div></div>`; }
A.sbPick=el=>{ const C=App.C; if(!sbEditable(C)) return; const i=+(App.params.ss??0); const f=C.fixtures[C.pre.fx[i]]; sbApply(C,i,el.dataset.id,sbVenue(C,f)); queueSave(); App.keepScroll=true; render(); Sound.ui&&Sound.ui('tab'); };
const _setParamSB=A.setParam; A.setParam=el=>{ if(el.dataset.k==='sbv_'){ const C=App.C; if(!sbEditable(C)) return; const i=+el.dataset.s; const f=C.fixtures[C.pre.fx[i]]; const v=el.dataset.v;
    if(v==='showcase') C.pre.fx.forEach((id,j)=>{ const g=C.fixtures[id]; if(j!==i&&g.neutral) sbApply(C,j,sbOpp(C,g),j%2?'away':'home'); });
    sbApply(C,i,sbOpp(C,f),v); queueSave(); App.keepScroll=true; render(); return; } _setParamSB(el); };
A.sbAuto=()=>{ const C=App.C; if(!sbEditable(C)) return; const pool=sbPool(C); const by=k=>pool.filter(id=>sbTag(C,id)===k); const pick=[]; for(const k of ['tune','even','test','giant','even','test','tune']){ const c=by(k).find(id=>!pick.includes(id)); if(c&&pick.length<3) pick.push(c); }
  for(const id of pool) if(pick.length<3&&!pick.includes(id)) pick.push(id); pick.forEach((id,i)=>sbApply(C,i,id,i===1?'away':'home')); queueSave(); App.keepScroll=true; render(); toast('A balanced preseason: an easier start, then tougher tests.'); };
A.sbLock=()=>{ const C=App.C; if(!sbEditable(C)) return; C.pre.locked=true; queueSave(); addNews(C,'program',`${Sx(C.userSid).town} finalize their Preseason Cup schedule`,C.userSid); Sound.ui&&Sound.ui('success'); toast('Preseason schedule locked. Good luck!'); App.route='office'; App.params={}; render(); };
A.sbScrim=()=>{ const C=App.C; if(!sbEditable(C)||C.pre.scrim) return; const r=rngFrom(hashStr(C.seed+':scrim:'+C.year)); const u=C.userSid;
  const lu=getLu(C,u,'V'); const xi=new Set((lu&&lu.slots||[]).map(s=>s.pid)); const bench=squad(C,u,'V').filter(p=>!xi.has(p.id)); const jv=squad(C,u,'JV').sort((a,b)=>ovr(b)-ovr(a)).slice(0,7);
  let bumped=0; for(const p of [...bench,...jv]){ const gap=p.pot-ovr(p); if(gap>0){ shiftOvr(p,Math.min(gap,0.4+r()*0.5),'balanced'); bumped++; } }
  const top=[...jv].sort((a,b)=>(ovr(b)+(b.pot-ovr(b))*0.25)-(ovr(a)+(a.pot-ovr(a))*0.25)).slice(0,3).map(p=>p.id);
  const vR=xiRating(C,u,'V'), jR=jv.reduce((t,p)=>t+ovr(p),0)/Math.max(1,jv.length); const gv=Math.max(0,Math.round(1+(vR-jR)/6+r()*2)), gj=Math.max(0,Math.round(r()*2-(vR-jR)/10));
  C.pre.scrim={sc:[gv,gj],top,bumped}; queueSave(); App.keepScroll=true; render(); Sound.ui&&Sound.ui('success'); toast(`Scrimmage done: Varsity ${gv}–${gj} JV.`); };
/* a giant-killing in the cup lifts the program */
const _finishSB=finishMatch; finishMatch=function(C,M){ const f=C.fixtures[M.fid]; const was=f&&f.st; const out=_finishSB.apply(this,arguments);
  try{ if(was!=='d'&&f.comp==='pre'&&f.diff==='giant'&&f.w===C.userSid&&!f.giantDone){ f.giantDone=true; const s=C.schools[C.userSid]; s.prestige=Math.min(100,(s.prestige||50)+2); addNews(C,'program',`${s.town} stun ${C.schools[sbOpp(C,f)].town} in a Preseason Cup upset`,C.userSid); } }catch(e){}
  return out; };
/* point the way at the start of each preseason */
const _officeSB=VIEWS.office; VIEWS.office=()=>{ const C=App.C; const b=sbEditable(C)?`<section class="sb-banner"><div class="grow"><span class="eyebrow">New season · Preseason Cup</span><h3>Build your preseason schedule</h3><p class="small">Choose three opponents from tune-ups to giants, pick a showcase venue and run a JV scrimmage before game 1.</p></div><button class="btn pri" data-a="go" data-r="presched">Open Schedule Builder</button></section>`:''; return b+_officeSB(); };
const _navBadgesSB=navBadges; navBadges=function(C){ const b=_navBadgesSB(C); if(sbEditable(C)) b.presched='NEW'; return b; };
