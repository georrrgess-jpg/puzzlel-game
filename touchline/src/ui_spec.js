/* ===================== v9: MATCHDAY CENTER — watch or simulate any game in the round ===================== */
NAV.splice(NAV.findIndex(n=>n[0]==='league')+1,0,['matchday','Matchday Center']);
NAV_ICON.matchday='matchday'; TITLES.matchday='Matchday Center';
ICON.matchday='<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M10 9l4 2-4 2z"/>';

/* the games that can still be watched or simulated this round (everything except your own Varsity match) */
function roundGames(C){ return roundFixtures(C).filter(Boolean); }
function isMine(C,f){ return f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid); }
function watchable(C){ return roundGames(C).filter(f=>f.st==='s'&&!isMine(C,f)); }
function roundTitle(C){ if(C.phase==='preseason') return `Preseason Cup · Round ${(C.pre.rd||0)+1}`; if(C.phase==='regular') return `League · Matchday ${C.md+1}`; const f=roundGames(C)[0]; return f?fixtureLabel(f):'Matchday'; }
function gameStakes(C,f){ // a quick read on how big the game is: table position + rivalry + knockout
  if(f.comp!=='reg') return isKO(f.comp)?100:10; const t=standings(C,f.lvl); const ih=t.findIndex(r=>r.sid===f.h), ia=t.findIndex(r=>r.sid===f.a); if(ih<0||ia<0) return 0; return 40-(ih+ia)*2.2-Math.abs(ih-ia)*1.4+(t[ih].p?0:0); }

VIEWS.matchday = ()=>{ const C=App.C; const lvl=App.params.ml||'V'; const all=roundGames(C); const uf=userFixture(C);
  if(!all.length) return `<div class="empty card">No games are scheduled right now. The next round appears here as soon as it is set.</div>`;
  const games=all.filter(f=>lvl==='all'||f.lvl===lvl);
  const open=watchable(C); const done=all.filter(f=>f.st==='d').length;
  const feat=[...open].filter(f=>f.lvl==='V').sort((a,b)=>gameStakes(C,b)-gameStakes(C,a))[0];
  const card=f=>{ const h=Sx(f.h), a=Sx(f.a); const kk=kitsFor(f); const mine=isMine(C,f), fin=f.st==='d', isFeat=feat&&f.id===feat.id;
    const side=s=>`<div class="mc-team">${teamBadge(s,34)}<div><b>${esc(s.town)}</b><span>${esc(s.mascot)}</span>${f.lvl==='V'?`<small>${recLine(s.id)}</small>`:''}</div></div>`;
    return `<article class="mc-game ${mine?'mine':''} ${fin?'fin':''} ${isFeat?'feat':''}" style="--c1:${kk.team[0].shirt};--c2:${kk.team[1].shirt}">
      <div class="mc-top"><span class="eyebrow">${LVL_NAME[f.lvl]} · ${esc(f.ven||'')}</span>${isFeat?'<span class="pill mc-gotw">Game of the round</span>':''}${mine?'<span class="pill mc-you">Your match</span>':''}${fin?'<span class="pill">Final</span>':''}</div>
      <div class="mc-body">${side(h)}<div class="mc-mid">${fin?`<div class="mc-score"><b>${f.hg}</b><i>–</i><b>${f.ag}</b></div>${f.pk?`<small>${f.pk[0]}-${f.pk[1]} pens</small>`:''}`:'<span class="vs">VS</span>'}</div>${side(a)}</div>
      ${!fin&&f.lvl==='V'?winBar(f):''}
      <div class="mc-act">${fin?`<button class="btn sm" data-a="openFixture" data-id="${f.id}">Match report</button>`
        : mine?`<button class="btn sm pri play" data-a="playNext">Go to your match</button>`
        : `<button class="btn sm" data-a="specSim" data-id="${f.id}">Quick sim</button><button class="btn sm pri" data-a="spectate" data-id="${f.id}">▶ Watch live</button><button class="btn sm ghost" data-a="openFixture" data-id="${f.id}">Preview</button>`}</div></article>`; };
  const levels=[['V','Varsity'],['JV','JV'],['MOD','Modified'],['all','All levels']].filter(([k])=>k==='all'||all.some(f=>f.lvl===k));
  return `<section class="mc-hero"><div><span class="eyebrow">Matchday Center</span><h2>${esc(roundTitle(C))}</h2><p class="small">Watch any game in the round on the broadcast, or simulate it. Results count exactly like any other game, and your own match is never affected.</p></div>
      <div class="mc-stats"><span><b>${all.length}</b>games</span><span><b>${done}</b>final</span><span><b>${open.length}</b>to watch</span></div>
      <div class="mc-hero-act">${open.length?`<button class="btn" data-a="specSimAll">Quick sim all other games</button>`:''}${uf?`<button class="btn pri play" data-a="playNext">Your match: vs ${esc(Sx(uf.h===C.userSid?uf.a:uf.h).town)}</button>`:open.length?'':`<button class="btn pri play" data-a="playNext">Finish the round</button>`}</div></section>
    ${seg('ml',levels,lvl)}
    <div class="mc-grid">${games.sort((x,y)=>(isMine(C,y)-isMine(C,x))||((feat&&y.id===feat.id)-(feat&&x.id===feat.id))||(x.st==='d')-(y.st==='d')).map(card).join('')||'<div class="empty">No games at this level this round.</div>'}</div>`; };

/* simulate one game (or all the others) without finishing the round */
function simOne(C,fid){ const f=C.fixtures[fid]; if(!f||f.st!=='s'||isMine(C,f)) return null; const M=startMatch(C,fid,{}); runToEnd(C,M); finishMatch(C,M); return f; }
A.specSim = el => { const C=App.C; const f=simOne(C,el.dataset.id); if(!f) return; App.odds.clear(); queueSave(); App.modal=null; renderModal(); App.keepScroll=true; render(); Sound.ui('success'); toast(`Final: ${Sx(f.h).town} ${f.hg}-${f.ag} ${Sx(f.a).town}${f.pk?` (${f.pk[0]}-${f.pk[1]} pens)`:''}`); };
A.specSimAll = ()=>{ const C=App.C; const L=watchable(C); for(const f of L) simOne(C,f.id); App.odds.clear(); queueSave(); App.keepScroll=true; render(); Sound.ui('success'); toast(`${L.length} game${L.length===1?'':'s'} simulated. Your match is still to play.`); };
A.spectate = el => { const C=App.C; const f=C.fixtures[el.dataset.id]; if(!f||f.st!=='s'||isMine(C,f)) return; const sp=(App.modal&&App.modal.speed)||C.settings.speed||2;
  if(C.live&&C.live.fid!==f.id&&C.fixtures[C.live.fid]&&C.fixtures[C.live.fid].st==='s'){ toast('Finish the game you were watching first.'); return; }
  const M=startMatch(C,f.id,{halftime:false}); M.spectate=true; C.live={fid:f.id,M}; queueSave(); App.modal=null; renderModal(); openLive(M,f.id,sp,false); };

/* the live screen in spectator mode: no tactics or team talk, a spectator label, and Continue returns to the Matchday Center */
const _updateLive0=updateLive;
updateLive=function(scoreOnly){ _updateLive0(scoreOnly); const L=App.live; if(!L||scoreOnly||!L.M.spectate) return; const t=document.querySelector('#lv-ctrl [data-a="liveTactics"]'); if(t) t.remove();
  if(!document.querySelector('#lv-stage .spec-tag')){ const st=$('#lv-stage'); if(st) st.insertAdjacentHTML('beforeend',`<div class="spec-tag"><i></i>Spectating · ${esc(LVL_NAME[App.C.fixtures[L.fid].lvl])}</div>`); }
  const c=document.querySelector('#lv-cont'); if(c&&L.done) c.textContent='Back to Matchday Center'; };
const _liveTactics0=A.liveTactics; A.liveTactics=()=>{ const L=App.live; if(L&&L.M.spectate) return; _liveTactics0(); };
const _closeLive0=closeLiveAndContinue;
closeLiveAndContinue=async function(){ const L=App.live; if(!L||!L.M.spectate) return _closeLive0();
  const C=App.C; const f=C.fixtures[L.fid]; L.loopId=null; if(!L.done){ L.stage.cancel(); endLive(); }
  clearTimeout(liveEmit.bt); L.stage.destroy(); App.live=null; liveRoot().innerHTML=''; document.body.classList.remove('locked'); Sound.syncMenu();
  App.odds.clear(); queueSave(); App.route='matchday'; App.params={ml:f.lvl}; render(); window.scrollTo(0,0); };
A.liveReport = async ()=>{ const fid=App.live.fid; await closeLiveAndContinue(); App.modal={type:'fixture',id:fid}; renderModal(); };

/* match preview for someone else's game: watch or sim from there too */
const _fixtureModal0=MODALS.fixture;
MODALS.fixture=m=>{ const C=App.C; const f=C.fixtures[m.id]; let h=_fixtureModal0(m); if(!f||f.st!=='s'||isMine(C,f)||!roundGames(C).some(x=>x.id===f.id)) return h;
  const sp=m.speed||C.settings.speed||2;
  const ctl=`<div class="card"><h3>Spectate this game</h3><div class="row"><span class="lab">Speed</span>${[1,2,4,8].map(s=>`<button class="btn sm ${sp===s?'pri':''}" data-a="pvSpeed" data-v="${s}" aria-pressed="${sp===s}">${s}×</button>`).join('')}</div><p class="tiny muted">Watch it on the broadcast or simulate it. The result counts like any other game; your own match is untouched.</p></div>`;
  h=h.replace('<div class="mfoot"><button class="btn" data-a="closeModal">Close</button>',`<div class="mfoot"><button class="btn" data-a="closeModal">Close</button><button class="btn" data-a="specSim" data-id="${f.id}">Quick sim</button><button class="btn pri play" data-a="spectate" data-id="${f.id}">▶ Watch live</button>`);
  return h.replace('</div><div class="mfoot">',ctl+'</div><div class="mfoot">'); };

/* nav badge: how many games are left to watch this round */
const _navBadges8=navBadges; navBadges=function(C){ const b=_navBadges8(C); const n=C.phase!=='offseason'?watchable(C).length:0; if(n) b.matchday=String(n); return b; };

/* no walkout, Senior Night or result jingle for a game you are only watching */
const _wantWalkout0=wantWalkout; wantWalkout=f=>{ const L=App.live; if(L&&L.M.spectate) return false; return _wantWalkout0(f); };
const _wantSN0=wantSeniorNight; wantSeniorNight=f=>{ const L=App.live; if(L&&L.M.spectate) return false; return _wantSN0(f); };
