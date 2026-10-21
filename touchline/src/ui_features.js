/* ===================== v7 FEATURES: rivalry night, weather, scouting camp, hall of fame, walkouts ===================== */
NAV.splice(NAV.findIndex(n=>n[0]==='schedule')+1,0,['camp','Scouting Camp']);
NAV.splice(NAV.findIndex(n=>n[0]==='news')+1,0,['hof','Hall of Fame']);
NAV_ICON.camp='camp'; NAV_ICON.hof='hof'; TITLES.camp='Summer Scouting Camp'; TITLES.hof='Hall of Fame';
ICON.camp='<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/><path d="M8.5 11h5M11 8.5v5"/>';
ICON.hof='<path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 10h6"/>';

/* ---------- weather: atmosphere only, never part of the match engine ---------- */
const WX={clear:{n:'Clear',i:'☀️'},clouds:{n:'Overcast',i:'☁️'},rain:{n:'Rain',i:'🌧️'},fog:{n:'Fog',i:'🌫️'},snow:{n:'Snow',i:'🌨️'},golden:{n:'Golden hour',i:'🌅'}};
function weatherFor(f){ if(!f) return {k:'clear',night:false,t:65};
  const C=App.C; const r=rngFrom(hashStr('wx'+(C?C.seed:'')+f.id)); const post=['sec','rgn','st'].includes(f.comp); const pre=f.comp==='pre';
  const roll=r(); let k = post? (roll<.2?'snow':roll<.42?'rain':roll<.55?'fog':roll<.75?'clouds':'clear') : pre? (roll<.12?'rain':roll<.3?'golden':roll<.45?'clouds':'clear') : (roll<.16?'rain':roll<.24?'fog':roll<.4?'clouds':roll<.55?'golden':'clear');
  const home=C&&C.schools[f.h]; const st=home&&home.stadium; const lights=!st||st.tier>=3||post;
  const night = f.lvl==='V' && lights && k!=='golden' && (post || r()<0.6);
  const t = Math.round(post? 34+r()*14 : pre? 74+r()*12 : 52+r()*20) - (k==='snow'?6:0);
  return {k, night, t, kick: night?'7:00 PM':k==='golden'?'5:30 PM':'4:00 PM'}; }
function weatherChip(f){ const w=weatherFor(f); return `<span class="chip wx" title="Weather is for atmosphere only and never changes results">${WX[w.k].i} ${WX[w.k].n} · ${w.t}°F · ${w.night?'Under the lights':w.kick}</span>`; }

/* ---------- rivalry ---------- */
function bootTrophySVG(){ return `<svg viewBox="0 0 200 300" class="trophy-svg" aria-hidden="true"><defs><linearGradient id="ibt" x1="0" x2="1"><stop offset="0" stop-color="#4a4f57"/><stop offset=".35" stop-color="#c9ced6"/><stop offset=".5" stop-color="#f4f6f8"/><stop offset=".7" stop-color="#9aa1aa"/><stop offset="1" stop-color="#3b4048"/></linearGradient><linearGradient id="ibw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a1c"/><stop offset="1" stop-color="#2a180a"/></linearGradient><radialGradient id="ibh" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#dfe8f5" stop-opacity=".45"/><stop offset="1" stop-color="#dfe8f5" stop-opacity="0"/></radialGradient></defs>
  <circle cx="100" cy="135" r="96" fill="url(#ibh)"/><rect x="36" y="232" width="128" height="50" rx="6" fill="url(#ibw)"/><rect x="50" y="246" width="100" height="20" rx="3" fill="#c9a24a"/>
  <path d="M74 228V92c0-11 9-18 20-18h22c9 0 14 7 14 16v68c0 9 7 14 16 15l20 5c11 2 18 11 18 22v28H74z" fill="url(#ibt)" stroke="#23272d" stroke-width="3"/>
  <path d="M74 206h110" stroke="#23272d" stroke-width="3"/><g fill="#23272d">${[0,1,2,3,4].map(i=>`<circle cx="${90+i*20}" cy="220" r="4.5"/>`).join('')}</g>
  <path d="M94 74v-14h28v14" fill="none" stroke="url(#ibt)" stroke-width="5"/><path d="M88 104h40M88 122h40M88 140h40" stroke="#23272d" stroke-width="2.5" stroke-linecap="round"/></svg>`; }
const _trophySVG=trophySVG; trophySVG=function(kind,s){ return kind==='rivalry'? bootTrophySVG() : _trophySVG(kind,s); };
function isHeated(f){ const C=App.C; return f&&f.lvl==='V'&&f.comp!=='pre'&&isRivalry(C,f.h,f.a)==='heated'; }
function rivalryCard(f){ if(!isHeated(f)||f.st==='d') return ''; const C=App.C; const R=rivalrySeries(C); const opp=Sx(R.opp); const me=Sx(C.userSid);
  const holder=R.holder? (R.holder===C.userSid?'You hold it':`${esc(Sx(R.holder).town)} hold it`) : 'Up for grabs';
  return `<div class="rivcard" style="--c1:${me.c1};--c2:${opp.c1}"><div class="rivcard-bg" aria-hidden="true"></div><div class="rivcard-t">${bootTrophySVG()}</div>
    <div class="grow"><div class="eyebrow" style="color:#ffb37a">Rivalry Night</div><h3>${esc(R.name)}</h3><div class="small">${holder} · Winner takes the trophy home</div>
      <div class="riv-series"><span><b>${R.w}</b>W</span><span><b>${R.d}</b>D</span><span><b>${R.l}</b>L</span><span class="riv-last">${R.last.map(g=>`<i class="${g.res}">${g.res}</i>`).join('')||'<em class="muted small">First meeting</em>'}</span></div></div></div>`; }

/* ---------- Summer Scouting Camp ---------- */
VIEWS.camp = ()=>{ const C=App.C; const me=Sx(C.userSid);
  if(C.phase!=='offseason'||C.rolled[C.year]){ const past=C.camp&&C.camp.prospects.filter(x=>x.committed);
    return `<div class="camp-hero" style="--c1:${me.c1}"><div><div class="eyebrow">Off-season feature</div><h2 class="H2">Summer Scouting Camp</h2><p class="muted">Opens after the State final. Spend scouting points to reveal rising middle schoolers from your feeder schools, then invite the ones you want. Commits join your Modified squad next season.</p></div><div class="camp-lock">🔒 Opens in the off-season</div></div>
     ${past&&past.length?`<div class="card"><h3>Last camp's commits</h3><div class="list">${past.map(x=>{ const p=Px(x.p.id)||x.p; return `<div class="li"><span class="ld-mini">${portraitSVG(p,30)}</span>${pLink(p.id)}<span class="muted small">${p.pos} · ${'★'.repeat(x.stars)}</span></div>`; }).join('')}</div></div>`:''}`; }
  const K=campEnsure(C); const used=K.prospects.filter(x=>x.committed).length;
  const card=x=>{ const p=x.p; const fog=x.know<45; const w=Math.round((100-x.know)/100*22); const est=Math.round(ovr(p))+x.off*(100-x.know)/100; const lo=Math.round(est-w/2-2), hi=Math.round(est+w/2+2); const pl=Math.round(p.pot-(100-x.know)/100*12+x.off/2), ph=Math.round(p.pot+(100-x.know)/100*6+x.off/2);
    const state=x.committed?'committed':x.declined?'declined':x.invited?'invited':'';
    return `<div class="pro ${state} ${x.stars>=5&&x.know<60?'gem':''}">${x.committed?'<span class="pro-flag ok">Committed</span>':x.declined?'<span class="pro-flag no">Went elsewhere</span>':''}
      <div class="pro-top"><span class="pro-face ${fog?'fog':''}">${portraitSVG(p,78,{c1:'#2b3440',c2:'#8b97a6'})}</span><div class="grow"><b class="pro-name">${esc(p.fn)} <span class="${x.know<30?'blur':''}">${esc(p.ln)}</span></b><div class="small muted">${p.pos} · Grade ${p.grade} · ${esc(x.feeder)}</div><div class="stars">${'★'.repeat(x.stars)}<span>${'★'.repeat(5-x.stars)}</span></div></div></div>
      <div class="pro-row"><span>Projected OVR</span><b>${x.know>=100?Math.round(ovr(p)):`${Math.max(20,lo)}–${hi}`}</b></div><div class="pro-bar"><i style="left:${clamp((Math.max(20,lo)-25)/60*100,0,100)}%;width:${Math.max(3,(hi-Math.max(20,lo))/60*100)}%"></i></div>
      <div class="pro-row"><span>Potential</span><b>${x.know>=70?`${Math.max(pl,Math.round(ovr(p)))}–${Math.min(99,ph)}`:'?'}</b></div>
      <div class="pro-row"><span>Scouting knowledge</span><b>${x.know}%</b></div><div class="pro-know"><i style="width:${x.know}%"></i></div>
      ${x.rival?`<div class="pro-rival">📍 ${esc(Sx(x.rival).town)} are also recruiting him</div>`:''}
      <div class="pro-acts"><button class="btn sm" data-a="campScout" data-id="${p.id}" ${K.pts<2||x.know>=100||x.committed||x.declined?'disabled':''}>🔍 Scout · 2 pts</button><button class="btn sm ${x.committed?'':'pri'}" data-a="campInvite" data-id="${p.id}" ${x.invited||K.pts<1||used>=K.spots?'disabled':''}>${x.committed?'✓ Committed':x.declined?'Declined':x.invited?'Invited':'✉️ Invite · 1 pt'}</button></div></div>`; };
  return `<div class="camp-hero" style="--c1:${me.c1}"><div class="row" style="gap:16px">${logo(me,72)}<div><div class="eyebrow">June · Off-season · ${esc(me.name)}</div><h2 class="H2">Summer Scouting Camp</h2></div></div>
     <div class="camp-kpis"><div><span>Scouting points</span><b style="color:#7cc4ff">${K.pts}<small>/12</small></b></div><div><span>Commit spots</span><b>${K.spots-used}<small> open</small></b></div><div><span>Commits</span><b style="color:#ffd36b">${used}</b></div></div></div>
   <p class="small muted">Scouting narrows a prospect's rating range and reveals his potential. Invitations are a gamble: stars, your school's prestige, how well you know him and rival interest all decide whether he says yes. Commits join your Modified squad when the new season starts.</p>
   <div class="pros">${K.prospects.map(card).join('')}</div>`; };
A.campScout = el => { const r=campScout(App.C,el.dataset.id); if(!r.ok&&r.msg) toast(r.msg); queueSave(); App.keepScroll=true; render(); };
A.campInvite = el => { const r=campInvite(App.C,el.dataset.id); if(r.msg) toast(r.msg); if(r.committed){ toast('He\'s committed! He joins your Modified squad next season.'); Sound.goal&&Sound.goal(); } queueSave(); App.keepScroll=true; render(); };

/* ---------- Hall of Fame ---------- */
function hofBanners(s){ return (s.honors||[]).filter(h=>/Champ|Cup|Regional/.test(h.label)&&!/Runners/.test(h.label)).sort((a,b)=>a.yr-b.yr); }
VIEWS.hof = ()=>{ const C=App.C; const me=Sx(C.userSid); const H=(C.hof||[]).filter(x=>x.sid===C.userSid).sort((a,b)=>b.yr-a.yr||b.sc-a.sc); const ret=((C.retired||{})[C.userSid]||[]);
  const ban=hofBanners(me); const R=C.rivalry&&C.rivalry.holder===C.userSid?C.rivalry:null;
  const banners=ban.length||R? `<div class="rafters">${ban.map(h=>`<div class="banner" style="--c1:${me.c1};--c2:${me.c2}"><span class="b-ico">🏆</span><b>${esc(h.label.replace(' Champions',''))}</b><span class="b-sub">${/State/.test(h.label)?'State Champions':/Regional/.test(h.label)?'Regional Cup':'Section Champions'}</span><b class="b-yr">${h.yr}</b></div>`).join('')}${R?`<div class="banner riv" style="--c1:#5a6068;--c2:#fff"><span class="b-ico">🥾</span><b>${esc(R.name)}</b><span class="b-sub">Rivalry trophy holders</span></div>`:''}</div>` : `<div class="empty">No championship banners yet. Win a section, regional or state title to hang one here.</div>`;
  const jerseys=ret.length? `<div class="jerseys">${ret.map(j=>`<div class="jersey"><div class="j-frame">${shirtSVG(me.c1,me.c2,String(j.num),120)}</div><b>${esc(j.name)}</b><small>#${j.num} · Retired ${j.yr}</small></div>`).join('')}</div>` : '';
  const card=x=>{ const p=Px(x.pid)||{id:x.pid,sid:x.sid,num:x.num,pos:x.pos}; const stats=x.pos==='GK'?[[x.sv,'Saves'],[x.cs,'Clean sheets'],[x.gp,'Games']]:[[x.g,'Goals'],[x.a,'Assists'],[x.gp,'Games']];
    return `<div class="hof-card ${x.retired?'ret':''}"><span class="hof-face">${portraitSVG(p,96)}</span><div class="grow"><div class="eyebrow">Class of ${x.yr} · ${x.pos} · #${x.num}</div><h3>${pLink(x.pid)}</h3>
      <div class="aw-stats">${stats.map(([v,l])=>`<span><b>${v}</b><small>${l}</small></span>`).join('')}</div>
      <div class="hof-hon">${x.awards.map(k=>`<span class="pill">${esc(AWARD_NAME[k]||k)}</span>`).join('')}${x.titles.filter(t=>/Champ|Regional/.test(t)&&!/Runners/.test(t)).map(t=>`<span class="pill gold">${esc(t)}</span>`).join('')}</div></div>
      <div class="hof-act">${x.retired?`<span class="pill gold">#${x.num} retired</span>`:ret.some(r=>r.num===x.num)?'<span class="small muted">#'+x.num+' already retired</span>':`<button class="btn sm pri" data-a="retireNum" data-id="${x.pid}">Retire #${x.num}</button>`}</div></div>`; };
  return `<div class="hof-hero" style="--c1:${me.c1}"><div class="hof-beams" aria-hidden="true"></div><div class="eyebrow">${esc(me.name)}</div><h2 class="H2 gold">Hall of Fame</h2><p>Program legends are inducted when they graduate. Retire a legend's number and it hangs here forever; nobody in your program will wear it again.</p></div>
   ${banners}${jerseys}
   <div class="card"><h3>Inductees</h3>${H.length?`<div class="hof-list">${H.map(card).join('')}</div>`:'<div class="empty">No inductees yet. Seniors with outstanding Varsity careers (goals, assists, saves, awards and titles) are inducted at graduation.</div>'}</div>
   ${hofWatch()}`; };
function hofWatch(){ const C=App.C; const sr=squad(C,C.userSid,'V').filter(p=>p.grade>=11).map(p=>({p,sc:hofScore(p).sc})).sort((a,b)=>b.sc-a.sc).slice(0,5); if(!sr.length) return '';
  return `<div class="card"><h3>On track</h3><p class="small muted" style="margin-top:0">Upperclassmen building Hall of Fame careers. A score of 30 at graduation earns induction.</p><div class="list">${sr.map(({p,sc})=>`<div class="li"><span class="ld-mini">${portraitSVG(p,30)}</span><div class="grow">${pLink(p.id)} <span class="tiny muted">Gr ${p.grade} · ${p.pos}</span></div><div class="bar" style="width:min(220px,30vw)"><i style="width:${clamp(sc/30*100,3,100)}%;background:${sc>=30?'#ffd36b':'var(--accent)'}"></i></div><b class="mono" style="width:40px;text-align:right">${R(sc)}</b></div>`).join('')}</div></div>`; }
A.retireNum = el => { const C=App.C; if(retireNumber(C,el.dataset.id)){ const h=C.hof.find(x=>x.pid===el.dataset.id); toast(`#${h.num} is retired. It hangs in the rafters forever.`); Sound.goal&&Sound.goal(); queueSave(); App.keepScroll=true; render(); } };
MODALS.hofNight = m => { const C=App.C; const L=(C.hof||[]).filter(x=>m.ids.includes(x.pid)); const me=Sx(C.userSid);
  return modalShell('<h2>Hall of Fame induction</h2>',`<div class="hof-night" style="--c1:${me.c1}"><div class="eyebrow" style="text-align:center">${esc(me.name)} · Class of ${L[0]?L[0].yr:''}</div>
    <div class="hofn-list">${L.map((x,i)=>{ const p=Px(x.pid)||{id:x.pid,sid:x.sid,num:x.num}; return `<div class="hofn" style="animation-delay:${200+i*350}ms"><span class="hof-face">${portraitSVG(p,110)}</span><h3>${esc(x.name)}</h3><div class="small muted">${x.pos} · #${x.num}</div><div class="aw-stats">${(x.pos==='GK'?[[x.sv,'Saves'],[x.cs,'Clean sheets']]:[[x.g,'Goals'],[x.a,'Assists']]).map(([v,l])=>`<span><b>${v}</b><small>${l}</small></span>`).join('')}<span><b>${x.gp}</b><small>Games</small></span></div><button class="btn sm pri" data-a="retireNum" data-id="${x.pid}" ${x.retired?'disabled':''}>${x.retired?'Number retired':'Retire #'+x.num}</button></div>`; }).join('')}</div></div>`,
   `<button class="btn" data-a="go" data-r="hof">Visit the Hall of Fame</button><button class="btn pri" data-a="closeModal">Continue</button>`,'wide'); };
const _retire=A.retireNum; A.retireNum=el=>{ _retire(el); if(App.modal&&App.modal.type==='hofNight') renderModal(); };

/* ---------- pregame walkout & starting XI reveal ---------- */
function wantWalkout(f){ const C=App.C; if(!C.settings.walk2){ if(!C.settings.walkout||C.settings.walkout==='big') C.settings.walkout='all'; C.settings.walk2=1; } const mode=C.settings.walkout||'all'; if(mode==='off') return false; if(mode==='all') return true; return f.lvl==='V'&&(['sec','rgn','st'].includes(f.comp)||isHeated(f)); }
function liveWalkout(done){
  const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const el=$('#lv-intro'); const M=L.M; const S=M.sides[M.user]; const me=Sx(C.userSid);
  const xi=S.slots.map(s=>({s,p:C.players[s.pid]})).filter(x=>x.p).sort((a,b)=>a.s.y-b.s.y); if(!el||!xi.length){ done(); return; }
  const cap=(getLu(C,C.userSid,'V').caps||[])[0];
  const X=s=>50+(s.x-50)*(0.62+0.38*(1-s.y/100)), Y=s=>88-s.y*0.62;
  el.insertAdjacentHTML('beforeend',`<div class="walk" data-a="liveIntroSkip" style="--c1:${me.c1}"><div class="walk-bg"></div><div class="walk-pitch"></div>${[0,1,2].map(i=>`<i class="walk-beam b${i}"></i>`).join('')}
    <div class="walk-title"><div class="eyebrow">${esc(fixtureLabel(f))} · ${esc(S.form)}</div><h2>Tonight's<br>Starting XI</h2><div class="walk-team">${logo(me,54)}<b>${esc(me.town)}</b></div></div>
    <div class="walk-now"><div class="eyebrow">Now walking out</div><div id="wk-now"></div><div class="walk-prog"><i id="wk-prog"></i></div><small id="wk-n"></small></div>
    ${xi.map(({s,p},i)=>`<div class="wk-tok" id="wk${i}" style="left:${X(s)}%;top:${Y(s)}%;--sc:${(0.8+(1-s.y/100)*0.35).toFixed(2)}"><span class="wk-face">${portraitSVG(p,64)}</span><b><i>${p.num}</i> ${esc(p.ln)}${p.id===cap?' <em>C</em>':''}</b><small>${s.role}</small></div>`).join('')}
    <small class="walk-skip">Tap to skip</small></div>`);
  let i=0, fired=false; const step=()=>{ if(fired||App.live!==L) return; if(i<xi.length){ const {s,p}=xi[i]; $('#wk'+i)?.classList.add('in'); const now=$('#wk-now'); if(now) now.innerHTML=`<div class="wk-card"><span class="wk-big">${portraitSVG(p,84)}</span><div><b>${esc(pname(p))}</b><small>#${p.num} · ${s.role} · OVR ${Math.round(ovr(p))}</small></div></div>`; const pr=$('#wk-prog'); if(pr) pr.style.width=((i+1)/xi.length*100)+'%'; const n=$('#wk-n'); if(n) n.textContent=`${i+1} of ${xi.length} announced`; i++; L.walkT=setTimeout(step, reducedMotion()?120:520); } else { L.walkT=setTimeout(go,1300); } };
  const go=()=>{ if(fired) return; fired=true; clearTimeout(L.walkT); const node=el.querySelector('.walk'); node?.classList.add('out'); setTimeout(()=>node&&node.remove(),420); done(); };
  L.introGo=go; L.walkT=setTimeout(step,400); }

const _navBadges=navBadges; navBadges=function(C){ const b=_navBadges(C); if(C.phase==='offseason'&&!C.rolled[C.year]){ const K=C.camp&&C.camp.yr===C.year?C.camp:null; if(!K||K.pts>0) b.camp='NEW'; } return b; };
