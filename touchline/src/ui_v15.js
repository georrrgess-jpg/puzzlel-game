/* ===================== v15: TOP NAVIGATION + DASHBOARD OVERVIEW + PERFORMANCE =====================
   Desktop: a single top bar (brand, six sections with drop-downs, search, sound, play, settings) replaces the sidebar;
   phones keep the drawer + bottom tab bar. The Overview is a one-screen dashboard: team card, starting XI, next match,
   youth watch, training focus and the section table, with everything else underneath. */
ICON.more='<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>';
ICON.trophy='<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z"/>';
ICON.shield='<path d="M12 3l8 3v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z"/>';
ICON.edit='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>';
ICON.play='<path d="M7 4l13 8-13 8z" fill="currentColor"/>';
ICON.ff='<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="currentColor"/>';
ICON.doc='<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/>';
ICON.cone='<path d="M9 4h6l4 16H5z"/><path d="M7.5 12h9M6.5 16h11"/>';
ICON.chev='<path d="M9 6l6 6-6 6"/>';
ICON.chevl='<path d="M15 6l-6 6 6 6"/>';
ICON.caret='<path d="M7 10l5 5 5-5"/>';
ICON.binoc='<circle cx="7" cy="15" r="4"/><circle cx="17" cy="15" r="4"/><path d="M7 11V6h3v5M17 11V6h-3v5M10 9h4"/>';
ICON.users='<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .3 5.5 2.4 5.5 5.8"/>';

const TOPNAV=[
  ['office','Overview','office',['office']],
  ['squads','Squad','squads',['squads','dev','camp']],
  ['schedule','Schedule','schedule',['schedule','matchday','presched']],
  ['league','Competition','trophy',['league','post','awards','records']],
  ['school','Club','shield',['school','kits','settings']],
  [null,'More','more',['news','capsule','history','tourneys','hof']]
];
const NAV_DESC={office:'Your week at a glance',matchday:'Every game in this round',schedule:'Fixtures and results',presched:'Pick your preseason opponents',squads:'Lineup, tactics and roster',dev:'Training focus and player growth',camp:'Scout next year\'s freshmen',league:'Standings, leaders, rankings',post:'Sectionals to the State final',awards:'Season honors and All-League',records:'All-time program records',school:'Identity, coach and stadium',kits:'Design home, away and third kits',settings:'Rules, sound, saves and backup',news:'The Courier and TouchlineTV',capsule:'Freshman promises, opened at graduation',history:'Results, yearbooks and alumni',tourneys:'Every past bracket',hof:'Program legends'};
function navLabel(id){ const n=NAV.find(x=>x[0]===id); return n?n[1]:(TITLES[id]||id); }
function v15Top(C,uf,opp){
  const r=App.route, badges=navBadges(C), s=Sx(C.userSid);
  const tabs=TOPNAV.map(([go,label,ic,items])=>{ const on=items.includes(r); const dot=items.some(k=>badges[k]); const many=items.length>1;
    const dd=many?`<div class="tn-dd" role="menu" aria-label="${esc(label)}">${items.filter(k=>VIEWS[k]).map(k=>`<button role="menuitem" class="tn-item ${r===k?'on':''}" data-a="go" data-r="${k}" ${r===k?'aria-current="page"':''}><span class="tn-ico">${icon(NAV_ICON[k]||k,18)}</span><span class="grow"><b>${esc(navLabel(k))}</b><small>${esc(NAV_DESC[k]||'')}</small></span>${badges[k]?`<span class="nbadge ${badges[k]==='!'?'bad':badges[k]==='LIVE'?'live':''}">${badges[k]}</span>`:''}</button>`).join('')}</div>`:'';
    return `<div class="tn-tab ${on?'on':''} ${many?'has-dd':''}"><button class="tn-btn" ${go?`data-a="go" data-r="${go}"`:'data-a="tnNoop"'} ${many?'aria-haspopup="menu"':''} ${on?'aria-current="page"':''}>${icon(ic,19)}<span>${label}</span>${dot?'<i class="tn-dot" aria-hidden="true"></i>':''}${many?`<span class="tn-caret" aria-hidden="true">${icon('caret',14)}</span>`:''}</button>${dd}</div>`; }).join('');
  const cta=`<div class="cta"><button class="btn pri play" data-a="playNext"><span>${esc(playLabel(C))}</span>${opp?`<span class="cta-opp">vs ${crest(opp,16)} ${esc(opp.town)}</span>`:''}</button>${C.phase!=='offseason'?`<button class="btn pri cta-more" data-a="simMenu" aria-haspopup="menu" aria-expanded="${!!App.simMenu}" aria-label="More simulation options">▾</button>`:''}
    ${App.simMenu?`<div class="menu" role="menu"><button role="menuitem" data-a="simAhead" data-k="round">Quick sim this round<span>Plays your match without watching</span></button>${['preseason','regular'].includes(C.phase)?`<button role="menuitem" data-a="simAhead" data-k="regular">Sim to end of regular season<span>Stops before Sectionals</span></button>`:''}<button role="menuitem" data-a="simAhead" data-k="season">Sim to end of season<span>Through the State final and awards</span></button></div>`:''}</div>`;
  const gear=`<div class="tn-tab tn-gear has-dd"><button class="tn-btn tn-iconbtn" data-a="go" data-r="settings" aria-label="Settings" aria-haspopup="menu">${icon('settings',20)}</button><div class="tn-dd tn-dd-r" role="menu" aria-label="Settings">
    <button role="menuitem" class="tn-item" data-a="go" data-r="settings"><span class="tn-ico">${icon('settings',18)}</span><span class="grow"><b>Settings</b><small>Rules, sound, saves and backup</small></span></button>
    <button role="menuitem" class="tn-item" data-a="openTheme"><span class="tn-ico">${icon('kits',18)}</span><span class="grow"><b>Appearance</b><small>Theme and colors</small></span></button>
    <button role="menuitem" class="tn-item" data-a="toSaves"><span class="tn-ico">${icon('history',18)}</span><span class="grow"><b>Switch save</b><small>Coach ${esc(C.coaches[C.userCoachId].name)} · Slot ${App.slot}</small></span></button>
    <div class="tn-save tiny"></div></div></div>`;
  const head=App.route==='office'?'':`<div class="pagehead"><div class="ph-t"><span class="eyebrow">${C.year} · ${esc(C.stateName)} · Section ${C.section}</span><h1>${esc(TITLES[App.route]||'')}</h1></div>${trackerHtml(C)}</div>`;
  return `<header class="top tnav">
    <button class="btn sm burger" data-a="burger" aria-label="Open menu">${icon('menu')}</button>
    <button class="tn-brand" data-a="go" data-r="office" aria-label="Touchline home">${logo(s,44)}<span><b>Touchline</b><small>High School Soccer</small></span></button>
    <nav class="tn-tabs" aria-label="Main">${tabs}</nav>
    <div class="tn-right"><div class="search">${icon('search',16)}<input type="text" id="q" placeholder="Search players, schools, games" aria-label="Search" autocomplete="off" data-c="search" value="${esc(App.q||'')}"><div id="sres"></div></div>
    ${typeof soundBtn==='function'?soundBtn():''}${cta}${gear}</div>
  </header>${head}`;
}
A.tnNoop=()=>{};
const _paintSave15=paintSaveState; paintSaveState=function(){ const r=_paintSave15.apply(this,arguments); try{ const src=$('#savestate'); document.querySelectorAll('.tn-save').forEach(el=>{ el.innerHTML=src?src.innerHTML:''; }); }catch(e){} return r; };

/* ---------- overview dashboard ---------- */
function v15TeamCard(){ const C=App.C, u=C.userSid, s=Sx(u); const t=standings(C,'V'); const i=t.findIndex(r=>r.sid===u); const r=t[i];
  const xi=R(xiRating(C,u,'V')); const rank=[...C.league].sort((a,b)=>xiRating(C,b,'V')-xiRating(C,a,'V')).indexOf(u)+1;
  const ph=({preseason:'Preseason',regular:'League',sectionals:'Sectionals',regional:'Regional',states:'States',awards:'Awards'})[C.phase]||'Season';
  const items=checklistItems(); const done=items.filter(x=>x[0]).length; const icons=['users','shield','cone','binoc','dev'];
  const stat=(lab,val,sub,tone)=>`<div class="tc-stat"><span class="lab">${lab}</span><div><b class="${tone||''}">${val}</b><span>${sub}</span></div></div>`;
  return `<section class="ov-card ov-team" style="--c1:${s.c1};--c2:${s.c2}">
    <div class="tc-crest">${logo(s,124)}</div>
    <h2 class="tc-name">${esc(s.town)}</h2><div class="tc-masc">${esc(s.mascot)}</div><div class="tc-sec">Varsity soccer · Section ${C.section}</div>
    <div class="tc-stats">${stat('Team strength',xi,`${ordinal(rank)} strongest<br>in section`)}${stat('Record',r.p?`${r.w}-${r.d}-${r.l}`:'0-0-0',`W-D-L · ${r.p?'league':ph}`)}${stat('Goal difference',(r.gd>0?'+':'')+r.gd,`${r.gf} scored · ${r.ga} conceded`,r.gd>0?'good':r.gd<0?'bad':'')}${r.p?stat('League position',ordinal(i+1),`${r.pts} pts after ${r.p}`):''}</div>
    <div class="tc-dec"><div class="hd"><h3>Coach decisions</h3><span class="chip">${done}/${items.length} done</span></div>
      ${items.map((it,k)=>[...it,k]).sort((a,b)=>(a[0]-b[0])||(a[4]-b[4])).slice(0,3).map(([ok,tt,sub,act,k])=>`<button class="dec ${ok?'ok':''}" ${act}><span class="dec-ico">${ok?'✓':icon(icons[k]||'office',18)}</span><span class="grow"><b>${tt}</b><small>${sub}</small></span><span class="dec-go">${icon('chev',16)}</span></button>`).join('')}</div>
  </section>`; }
function v15Pitch(){ const C=App.C, u=C.userSid, s=Sx(u); const lu=getLu(C,u,'V'); const kit=kitFinish(kitSet(s).home);
  const P=(x,y)=>{ const v=y/100; const w=0.74+0.26*(1-v); return [50+(x-50)*w, 6+(1-v)*86]; };
  const pt=(x,y)=>P(x,y).map(n=>n.toFixed(2)).join(',');
  const quad=(x0,y0,x1,y1)=>`${pt(x0,y0)} ${pt(x1,y0)} ${pt(x1,y1)} ${pt(x0,y1)}`;
  let stripes=''; for(let i=0;i<10;i++) stripes+=`<polygon points="${quad(0,i*10,100,i*10+10)}" fill="${i%2?'#2c7a3e':'#287238'}"/>`;
  const arc=(cx,cy,rx,ry,a0,a1)=>{ let d=''; for(let i=0;i<=24;i++){ const a=a0+(a1-a0)*i/24; d+=(i?'L':'M')+pt(cx+rx*Math.cos(a),cy+ry*Math.sin(a)); } return d; };
  const lines=`<polygon points="${quad(2,2,98,98)}"/><path d="M${pt(2,50)}L${pt(98,50)}"/><path d="${arc(50,50,13,9,0,Math.PI*2)}"/><polygon points="${quad(22,2,78,17)}"/><polygon points="${quad(36,2,64,7)}"/><polygon points="${quad(22,83,78,98)}"/><polygon points="${quad(36,93,64,98)}"/><path d="${arc(50,17,9,5,0.35,Math.PI-0.35)}"/><path d="${arc(50,83,9,5,Math.PI+0.35,Math.PI*2-0.35)}"/>`;
  const toks=lu.slots.map(sl=>{ const p=C.players[sl.pid]; const yn=Math.max(0,Math.min(1,(sl.y-7)/78)); const [x]=P(sl.x,sl.y); const y=92-Math.pow(yn,0.82)*80; const gk=sl.role==='GK'; const sc=0.88+0.12*(1-yn);
    return `<button class="xi-tok" style="left:${x}%;top:${y}%;--s:${sc.toFixed(2)}" ${p?`data-a="openPlayer" data-id="${p.id}"`:'data-a="go" data-r="squads"'} aria-label="${esc(sl.role)} ${esc(p?pname(p):'empty')}">${shirtSVG(gk?'#f5c518':kit.shirt,gk?'#1b1b1b':kit.num,p?String(p.num):'',40)}<span class="xi-lab"><i>${esc(sl.role)}</i>${esc(p?p.ln:'Empty')}</span></button>`; }).join('');
  return `<div class="xi-pitch"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${stripes}<g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".35" vector-effect="non-scaling-stroke">${lines}</g></svg>${toks}</div>`; }
function v15XICard(){ const C=App.C, lu=getLu(C,C.userSid,'V'); const tac=lu.tac||{}; const pre=TAC_PRESETS.find(([,,t])=>['ment','tempo','press','pass'].every(k=>Math.abs((t[k]||0)-(tac[k]||0))<=2));
  return `<section class="ov-card ov-xi"><div class="hd"><h2>Your starting XI</h2><div class="row"><span class="xi-meta">${esc(lu.custom?'Custom':lu.form)}</span><span class="xi-meta">${esc(pre?pre[1]:'Custom tactics')}</span><button class="btn sm" data-a="go" data-r="squads" data-p='{"lvl":"V","tab":"lineup"}'>${icon('edit',15)} Edit lineup</button></div></div>${v15Pitch()}</section>`; }
function v15MatchCard(){ const C=App.C; const uf=userFixture(C);
  if(!uf) return `<section class="ov-card ov-match ov-match-empty">${nextMatchCard()}</section>`;
  const h=Sx(uf.h), a=Sx(uf.a); const me=C.userSid; const st=effStadium(h);
  const team=(x)=>`<div class="om-team"><div class="om-logo">${logo(x,104)}</div><b>${esc(x.town)}</b><span class="om-m">${esc(x.mascot)}</span><span class="om-sub">${x.id===me?`Section ${C.section}`:esc(recLine(x.id))}</span>${formPips(x.id)}</div>`;
  return `<section class="ov-card ov-match" style="--hc:${h.c1};--ac:${a.c1}"><div class="om-bg" aria-hidden="true">${stadiumSVG(h,st)}</div>
    <div class="om-top"><h2>${esc(fixtureLabel(uf))}</h2><span class="om-ven">${icon('office',14)} ${esc(uf.ven)}</span></div>
    <div class="om-rival">${rivalChip(uf)}</div>
    <div class="om-teams">${team(h)}<div class="om-vs">VS</div>${team(a)}</div>
    ${winBar(uf)}
    <button class="btn pri play om-play" data-a="playNext">${icon('play',22)}<span>${esc(playLabel(C))}</span></button>
    <div class="om-sec"><button class="btn" data-a="openFixture" data-id="${uf.id}">${icon('doc',18)} Match preview</button><button class="btn" data-a="quickSim" data-id="${uf.id}">${icon('ff',18)} Quick sim</button></div>
  </section>`; }
function v15Youth(){ const C=App.C; const ps=[...squad(C,C.userSid,'JV'),...squad(C,C.userSid,'MOD')].sort((a,b)=>b.pot-a.pot||ovr(b)-ovr(a)).slice(0,5);
  if(!ps.length) return `<section class="ov-card ov-youth" id="yw"><div class="hd"><h3>${icon('binoc',18)} Youth watch</h3></div><p class="muted small">No JV or Modified players yet.</p></section>`;
  const i=((App.yw||0)%ps.length+ps.length)%ps.length; const p=ps[i]; const ev=evaluate(C,p); const stars=Math.max(1,Math.min(5,Math.round((p.pot-55)/8)));
  return `<section class="ov-card ov-youth" id="yw"><div class="hd"><h3>${icon('binoc',18)} Youth watch</h3><button class="btn sm" data-a="go" data-r="dev">View all</button></div>
    <div class="yw-body">
      <button class="yw-face" data-a="openPlayer" data-id="${p.id}">${portraitSVG(p,92)}</button>
      <div class="yw-info"><b class="yw-name">${esc(p.fn)} ${esc(p.ln)}</b><span class="yw-tag">Grade ${ev.letter} · ${esc(LVL_NAME[p.lvl])} prospect</span>
        <div class="yw-sub">${posTag(p.pos)} Grade ${p.grade} · Class of ${C.year+(13-p.grade)}</div>
        <div class="yw-stars" aria-label="${stars} of 5 stars">${'★'.repeat(stars)}<i>${'★'.repeat(5-stars)}</i></div>
        <p class="yw-rec">${esc(ev.rec||'')}</p></div></div>
    <div class="yw-grow"><span>OVR <b>${R(ovr(p))}</b></span><div class="yw-bar"><i style="width:${R(ovr(p))}%"></i><em style="left:${p.pot}%"></em></div><span>POT <b>${p.pot}</b></span></div>
    <div class="yw-foot"><button class="yw-nav" data-a="ywStep" data-d="-1" aria-label="Previous prospect">${icon('chevl',16)}</button><div class="yw-dots">${ps.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div><button class="yw-nav" data-a="ywStep" data-d="1" aria-label="Next prospect">${icon('chev',16)}</button></div></section>`; }
A.ywStep=el=>{ App.yw=(App.yw||0)+(+el.dataset.d||1); const c=$('#yw'); if(c) c.outerHTML=v15Youth(); };
function v15FocusArt(k){ const ball='<circle cx="58" cy="44" r="13" fill="#f4f4f4" stroke="#1b1b1b" stroke-width="2"/><path d="M52 40l6-4 6 4-2 7h-8z" fill="#1b1b1b"/>';
  const cone=(x)=>`<path d="M${x-8} 58 L${x} 30 L${x+8} 58Z" fill="#f97316" stroke="#1b1b1b" stroke-width="1.5"/><path d="M${x-5} 46 h10" stroke="#fff" stroke-width="3"/>`;
  const art={attacking:`${cone(24)}${cone(96)}<path d="M20 60 L100 24" stroke="#fde68a" stroke-width="3" stroke-dasharray="5 5"/>${ball}`,defending:`<rect x="30" y="14" width="60" height="38" fill="none" stroke="#fff" stroke-width="3"/><path d="M30 14 l8 8 h44 l8-8" fill="none" stroke="#fff" stroke-opacity=".5"/>${ball}`,possession:`<circle cx="22" cy="40" r="5" fill="#7dd3fc"/><circle cx="96" cy="26" r="5" fill="#7dd3fc"/><circle cx="92" cy="58" r="5" fill="#7dd3fc"/><path d="M22 40 L96 26 L92 58 Z" fill="none" stroke="#7dd3fc" stroke-dasharray="4 4"/>${ball}`,fitness:`${cone(20)}${cone(44)}${cone(68)}${cone(92)}`,youth:`${cone(26)}${cone(92)}<path d="M40 60 q20-30 40 0" fill="none" stroke="#a7f3d0" stroke-width="3"/>${ball}`,balanced:`${cone(26)}${cone(92)}${ball}`};
  return `<svg viewBox="0 0 120 70" aria-hidden="true"><rect width="120" height="70" rx="8" fill="#1f6b37"/><path d="M0 62 H120" stroke="#fff" stroke-opacity=".35"/>${art[k]||art.balanced}</svg>`; }
const TRAIN_DESC={balanced:'Even gains across each player\'s position profile.',attacking:'Shooting, finishing and speed get extra work.',defending:'Tackling, positioning and goalkeeping get extra work.',possession:'Passing and stamina get extra work.',fitness:'Stamina and pace get extra work.',youth:'JV and Modified players develop faster; Varsity a little less.'};
function v15Training(){ const C=App.C; const k=C.training||'balanced';
  let segs, lab; if(C.phase==='regular'){ const n=14, d=Math.min(n,C.md||0); segs=Array.from({length:n},(_,i)=>i<d?'on':''); lab=`Matchday ${Math.min(n,d+1)} of ${n}`; }
  else { const ph=V14_PHASES.map(x=>x[0]); const at=Math.max(0,ph.indexOf(C.phase)); segs=ph.map((_,i)=>i<at?'on':i===at?'now':''); lab=(V14_PHASES[at]||['',''])[1]+' · season progress'; }
  return `<section class="ov-card ov-train"><div class="hd"><h3>${icon('cone',18)} Training focus</h3><button class="btn sm" data-a="go" data-r="dev">Adjust</button></div>
    <div class="tr-body"><div class="tr-art">${v15FocusArt(k)}</div><div><b class="tr-name">${esc(TRAINING[k])}</b><span class="tr-chip">Current focus</span><p class="tr-desc">${esc(TRAIN_DESC[k]||'')}</p></div></div>
    ${(()=>{ const rs=schoolPlayers(C,C.userSid).map(p=>({p,d:ovr(p)-((p.ovr0&&p.ovr0[C.year])??ovr(p))})).filter(x=>x.d>0.4).sort((a,b)=>b.d-a.d).slice(0,3); return rs.length?`<div class="tr-risers"><span class="lab">Biggest risers this season</span>${rs.map(x=>`<button class="tr-r" data-a="openPlayer" data-id="${x.p.id}">${esc(x.p.ln)} <b>+${fmt1(x.d)}</b></button>`).join('')}</div>`:''; })()}
    <div class="tr-prog"><span>${esc(lab)}</span><div class="tr-segs">${segs.map(x=>`<i class="${x}"></i>`).join('')}</div></div></section>`; }
function v15Table(){ const C=App.C; const t=standings(C,'V');
  return `<section class="ov-card ov-table"><div class="hd"><h3>${icon('league',18)} Section ${C.section} standings</h3><button class="btn sm" data-a="go" data-r="league">Full table</button></div>
    <table class="ot"><thead><tr><th>#</th><th>School</th><th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GD</th><th class="n">Pts</th></tr></thead><tbody>${t.map((r,i)=>`<tr class="${isUser(r.sid)?'me':''}"><td>${i+1}</td><td><span class="ot-s">${crest(Sx(r.sid),20)}${sLink(r.sid,Sx(r.sid).town)}</span></td><td class="n">${r.p}</td><td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gd>0?'+':''}${r.gd}</td><td class="n"><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></section>`; }
function v15Overview(){ const C=App.C; const P=PREFS.panels;
  const more=[P.recent?recentCard():'',P.dev?devCard():'',leadersCard(),P.miles?milestoneCard():'',typeof pressBox==='function'?pressBox():'',newsCard(5),rivalryCard()].filter(Boolean);
  return `<div class="ov-grid">${v15TeamCard()}${P.lineup!==false?v15XICard():''}${P.next!==false?v15MatchCard():''}${v15Youth()}${v15Training()}${v15Table()}</div>
   <div class="ov-more-h"><h2>Around the program</h2><button class="btn sm ghost" data-a="panelsOpen">Customize overview</button></div>
   <div class="ov-more">${more.join('')}</div>`; }

/* ---------- odds are computed in idle time, never while a menu is opening ---------- */
const _oddsQ=[]; let _oddsBusy=false;
const _idle=(f)=>(window.requestIdleCallback?requestIdleCallback(f,{timeout:500}):setTimeout(f,60));
function oddsSchedule(fid){ if(!_oddsQ.includes(fid)) _oddsQ.push(fid); if(!_oddsBusy){ _oddsBusy=true; _idle(oddsRun); } }
function oddsRun(){ const fid=_oddsQ.shift(); try{ const C=App.C; const f=C&&C.fixtures[fid]; if(f){ oddsFor(fid); document.querySelectorAll(`[data-wb="${fid}"]`).forEach(el=>{ el.outerHTML=winBar(f); }); } }catch(e){}
  if(_oddsQ.length) _idle(oddsRun); else _oddsBusy=false; }

/* ---------- sim-ahead yields to the browser between rounds, with a progress overlay ---------- */
A.simAhead=async el=>{ const kind=el.dataset.k; App.simMenu=false; const C=App.C; const u=C.userSid; let n=0,w=0,d=0,l=0; const titles=[]; const t0=C.phase;
  let ov=document.getElementById('simov'); if(!ov&&kind!=='round'){ ov=document.createElement('div'); ov.id='simov'; ov.setAttribute('role','status'); ov.innerHTML='<div class="sv-box"><b>Simulating…</b><div class="sv-bar"><i></i></div><span class="sv-l"></span></div>'; document.body.appendChild(ov); }
  const total=kind==='regular'?16:kind==='season'?22:1; let last=performance.now();
  while(n<80&&C.phase!=='offseason'){
    if(kind==='regular'&&!['preseason','regular'].includes(C.phase)) break;
    const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M); if(uf.w===u) w++; else if(uf.w) l++; else d++; const tt=uf.w===u?(uf.comp==='sec'&&uf.rd===2?`Section ${C.section} Champions`:uf.comp==='rgn'?'Regional Champions':uf.comp==='st'&&uf.rd===2?'State Champions':null):null; if(tt) titles.push([tt,uf.id,C.year]); }
    simRound(C); const ev=advance(C); n++; if(!ev) break; if(kind==='round') break;
    if(ov&&performance.now()-last>12){ ov.querySelector('i').style.width=Math.min(96,n/total*100)+'%'; ov.querySelector('.sv-l').textContent=`${w}-${d}-${l} · ${phaseLabel(C)}`; await new Promise(r=>setTimeout(r,0)); last=performance.now(); }
  }
  if(ov) ov.remove();
  App.odds.clear(); queueSave(); saveNow(); App.keepScroll=true;
  App.modal={type:'simSummary',n,w,d,l,from:t0,kind,titles:titles.map(t=>t[0])}; render();
  if(titles.length){ const [tt,fid,yr]=titles[titles.length-1]; showTrophy(tt,Sx(u),yr,{chips:titleChips(C,fid)}); } };
