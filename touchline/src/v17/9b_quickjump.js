/* ===================== v18.16 QUICK JUMP & PINS =====================
   Ctrl K (Cmd K on a Mac) anywhere in a career opens Quick Jump: one search across players, teams (your league and every
   school in the State Poll), pages (and their tabs) and actions. Arrow keys move, Enter opens, Tab pins, ">" shows actions
   only, Esc closes. Pinned items sit beside the search and in the Settings menu on every screen, with a live line each
   (form, next meeting, readiness), plus a coach's note. "G" then a letter jumps to a page (G O Overview, G L Lineup ...).
   On a phone the search icon opens Quick Jump. Pins and the note are saved with the career (C.qj). Identifiers v1816q. */
const V1816Q={ open:false, q:'', cat:'all', act:0, items:[], g:0 };
const V1816Q_GO={o:['office'],l:['squads',{tab:'lineup'}],s:['schedule'],m:['matchday'],t:['league'],p:['statepoll'],n:['news'],f:['families'],h:['hof'],d:['dev'],c:['school'],r:['records']};
const V1816Q_CATS=[['all','All'],['player','Players'],['team','Teams'],['page','Pages'],['action','Actions']];
function v1816qS(C){ const Q=C.qj||(C.qj={pins:[],note:''}); if(!Q.pins) Q.pins=[]; return Q; }
const v1816qEl=d=>({dataset:d,closest:()=>null,getAttribute:k=>d[k]});
function v1816qGrade(g){ return g>=9?['Fr','So','Jr','Sr'][g-9]:g+'th'; }

/* ---------- what can be found ---------- */
function v1816qPlayers(C){ const u=C.userSid; const out=[]; for(const p of Object.values(C.players)){ if(!C.league.includes(p.sid)) continue; const mine=p.sid===u;
  out.push({k:'player',id:p.id,title:pname(p),sub:`${LVL_NAME[p.lvl]} · ${v1816qGrade(p.grade)} · ${V1816_POS[p.pos]||p.pos} · OVR ${Math.round(ovr(p))}${mine?'':' · '+Sx(p.sid).town}`,ico:portraitSVG(p,36),rank:(mine?2000:0)+ovr(p),run:()=>A.openPlayer(v1816qEl({id:p.id}))}); } return out; }
function v1816qTeams(C){ const out=[]; for(const sid of C.league){ const s=Sx(sid); const t=standings(C,'V').find(r=>r.sid===sid); out.push({k:'team',id:sid,title:s.name,sub:`Team page · ${t?t.w+'-'+t.d+'-'+t.l:''} · schedule, roster, history`,ico:crest(s,30),rank:sid===C.userSid?900:500,run:()=>A.openSchool(v1816qEl({id:sid}))}); }
  try{ const P=v1812pS(C); const last=v1812pLatest(C); for(const t of P.pool.teams){ const rk=last?v1812pRankOf(last,t.id):null; out.push({k:'team',id:t.id,title:t.name,sub:`State Poll · Section ${t.sec}${rk?' · No. '+rk:''} · team analytics`,ico:crest(v1812pSchool(C,t.id),30),rank:rk?300-rk:100,run:()=>A.v1812pTeam(v1816qEl({id:t.id}))}); } }catch(e){}
  return out; }
function v1816qPages(C){ const out=[]; const add=(r,title,sub,p,key)=>{ if(!VIEWS[r]) return; out.push({k:'page',id:r+(p?JSON.stringify(p):''),r,p:p||null,title,sub,ico:`<span class="v1816q-pi">${icon(NAV_ICON[r]||r,18)}</span>`,key,rank:p?(p.lvl==='V'?900:p.lvl==='JV'?450:0):10,run:()=>A.go(v1816qEl({r,p:p?JSON.stringify(p):''}))}); };
  const gk={}; for(const [k,v] of Object.entries(V1816Q_GO)) if(!v[1]) gk[v[0]]='G '+k.toUpperCase();
  for(const r of Object.keys(TITLES)) add(r,TITLES[r],(typeof NAV_DESC!=='undefined'&&NAV_DESC[r])||'',null,gk[r]);
  for(const [l,n] of [['V','Varsity'],['JV','JV'],['MOD','Modified']]) add('squads','Lineup · '+n,'Squads → Lineup',{lvl:l,tab:'lineup'},l==='V'?'G L':'');
  add('squads','Roster','Squads → Roster',{tab:'roster'});
  for(const [t,n] of [['table','Standings'],['leaders','Leaders'],['rank','Rankings'],['schools','Schools']]) add('league',n,'League & Rankings → '+n,{tab:t});
  for(const [t,n] of [['poll','Poll'],['teams','Teams'],['players','Players'],['awards','Awards']]) add('statepoll','State Poll · '+n,'State Poll → '+n,{pt:t});
  for(const [t,n] of [['courier','The Courier'],['tv','TouchlineTV'],['wire','Newswire']]) add('news',n,'Newsroom → '+n,{nv:t});
  for(const [t,n] of [['results','Results'],['rosters','Rosters'],['yearbook','Yearbooks'],['compare','Compare players'],['alumni','Alumni']]) add('history',n,'History → '+n,{tab:t});
  return out; }
function v1816qActions(C){ const out=[]; const add=(id,title,sub,ic,run,ok)=>{ if(ok===false) return; out.push({k:'action',id,title,sub,ico:`<span class="v1816q-pi act">${ic}</span>`,rank:5,run}); };
  const uf=userFixture(C); const ph=C.phase;
  add('play',playLabel(C),uf?'Opens the match preview':'Plays the round','\u25b6\ufe0f',()=>A.playNext());
  add('round','Quick sim this round','Plays your match without watching','⏩',()=>A.simAhead(v1816qEl({k:'round'})),ph!=='offseason');
  add('regular','Sim to end of regular season','Stops before Sectionals','⏭️',()=>A.simAhead(v1816qEl({k:'regular'})),['preseason','regular'].includes(ph));
  add('season','Sim to end of season','Plays everything through the State final','🏁',()=>A.simAhead(v1816qEl({k:'season'})),ph!=='offseason');
  add('preview','Match preview',uf?'Your next game':'','📋',()=>{ App.modal={type:'fixture',id:uf.id}; renderModal(); },!!uf);
  const mail=typeof v1816Open==='function'?v1816Open(C)[0]:null; add('mail','Read the coach’s mailbox',mail?'A letter from '+pname(C.players[mail.pid]):'','✉️',()=>A.v1816Open(v1816qEl({m:mail.id})),!!mail);
  add('sound','Toggle sound','Mute or unmute the game','🔈',()=>A.toggleSound&&A.toggleSound(v1816qEl({})));
  add('theme','Appearance','Theme and colors','🎨',()=>A.openTheme(v1816qEl({})));
  add('new','What’s new','Every update, newest first','✨',()=>A.whatsNew(v1816qEl({})));
  add('saves','Switch save','Back to the save slots','💾',()=>A.toSaves(v1816qEl({})));
  return out; }
function v1816qAll(C){ return [...v1816qPlayers(C),...v1816qTeams(C),...v1816qPages(C),...v1816qActions(C)]; }

/* ---------- matching ---------- */
function v1816qMatch(text,q){ const t=text.toLowerCase(); const i=t.indexOf(q); if(i>=0){ const word=i===0||/[\s·\-'(]/.test(t[i-1]); return {s:(word?60:30)+(i===0?20:0)-text.length*0.05,hl:[[i,i+q.length]]}; }
  let j=0; const hl=[]; for(let k=0;k<t.length&&j<q.length;k++) if(t[k]===q[j]){ hl.push([k,k+1]); j++; } if(j===q.length&&q.length>=2) return {s:10-hl[hl.length-1][0]*0.1,hl,fz:true}; return null; }
function v1816qHl(text,hl){ if(!hl||!hl.length) return esc(text); let o='',p=0; for(const [a,b] of hl){ o+=esc(text.slice(p,a))+'<mark>'+esc(text.slice(a,b))+'</mark>'; p=b; } return o+esc(text.slice(p)); }
function v1816qSearch(C){ let q=V1816Q.q.trim().toLowerCase(); let cat=V1816Q.cat; if(q.startsWith('>')){ cat='action'; q=q.slice(1).trim(); }
  const all=v1816qAll(C).filter(x=>cat==='all'||x.k===cat); let res;
  if(!q){ res=all.filter(x=>x.k==='action'||(x.k==='page'&&!x.p)||(cat!=='all'&&true)).map(x=>({...x,s:x.rank,hl:null})); }
  else res=all.map(x=>{ const m=v1816qMatch(x.title,q)||(()=>{ const n=v1816qMatch(x.sub,q); return n?{s:n.s-40,hl:null}:null; })(); return m?{...x,s:m.s+x.rank/1000,hl:m.hl,fz:!!m.fz}:null; }).filter(Boolean);
  if(q&&res.filter(x=>!x.fz).length>=3) res=res.filter(x=>!x.fz);
  const lim=cat==='all'?{player:4,team:3,page:4,action:4}:{player:40,team:40,page:40,action:40};
  const out=[]; for(const k of ['player','team','page','action']){ out.push(...res.filter(x=>x.k===k).sort((a,b)=>b.s-a.s).slice(0,lim[k])); } return out; }

/* ---------- pins ---------- */
function v1816qPinKey(x){ return x.k+':'+x.id; }
function v1816qPinned(C,x){ return v1816qS(C).pins.some(p=>p.key===v1816qPinKey(x)); }
function v1816qTogglePin(C,x){ const Q=v1816qS(C); const key=v1816qPinKey(x); const i=Q.pins.findIndex(p=>p.key===key); if(i>=0) Q.pins.splice(i,1); else { Q.pins.unshift({key,k:x.k,id:x.id,r:x.r||null,p:x.p||null}); Q.pins=Q.pins.slice(0,8); } queueSave(); }
/* a pin's live line */
function v1816qLive(C,pin){
  if(pin.k==='player'){ const p=C.players[pin.id]; if(!p) return null; const yr=p.st&&p.st[C.year]&&p.st[C.year][p.lvl]; const b=yr&&yr.reg; const rt=b&&b.gp?(b.rt/b.gp).toFixed(2):null; let rd='';
    try{ if(p.sid===C.userSid&&typeof evaluate==='function'){ const ev=evaluate(C,p); if(ev&&ev.grade) rd=' · readiness '+ev.grade; } }catch(e){}
    return {title:p.ln,sub:`${p.pos} · OVR ${Math.round(ovr(p))}${rt?' · '+rt+' avg, '+b.gp+' GP':' · no games yet'}${rd}`,ico:portraitSVG(p,36),run:()=>A.openPlayer(v1816qEl({id:p.id}))}; }
  if(pin.k==='team'){ const all=v1816qTeams(C); const x=all.find(t=>t.id===pin.id); if(!x) return null; let sub=x.sub;
    if(C.league.includes(pin.id)){ const nx=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.st!=='d'&&f.lvl==='V'&&((f.h===pin.id&&f.a===C.userSid)||(f.a===pin.id&&f.h===C.userSid))).sort((a,b)=>(a.comp==='pre'?-1:0)-(b.comp==='pre'?-1:0)||a.rd-b.rd)[0];
      sub=pin.id===C.userSid?x.sub.replace('Team page · ','Your program · '):nx?`${pin.id===C.rivals.heated?'Rival · ':''}next meeting: ${nx.comp==='reg'?'Matchday '+(nx.rd+1):'postseason'} (${nx.h===C.userSid?'home':'away'})`:`${pin.id===C.rivals.heated?'Rival · ':''}no meeting left this season`; }
    return {title:x.title,sub,ico:x.ico,run:x.run}; }
  if(pin.k==='page'){ const x=v1816qPages(C).find(t=>t.id===pin.id); if(!x) return null; let sub=x.sub; if(pin.r==='squads'&&pin.p&&pin.p.lvl){ try{ const v=validateLineup(C,C.userSid,pin.p.lvl); sub=v&&v.ok===false?'Needs attention':'Ready to go'; }catch(e){} } return {title:x.title,sub,ico:x.ico,run:x.run}; }
  if(pin.k==='action'){ const x=v1816qActions(C).find(t=>t.id===pin.id); return x?{title:x.title,sub:x.sub,ico:x.ico,run:x.run}:null; }
  return null; }
function v1816qPinsHtml(C,o){ o=o||{}; const Q=v1816qS(C); const rows=Q.pins.map((pin,i)=>{ const L=v1816qLive(C,pin); if(!L) return ''; return `<div class="v1816q-pin"><button class="v1816q-pmain" data-a="v1816qPinRun" data-i="${i}">${L.ico}<span><b>${esc(L.title)}</b><small>${esc(L.sub)}</small></span></button><button class="v1816q-unpin" data-a="v1816qUnpin" data-i="${i}" title="Unpin" aria-label="Unpin">📌</button></div>`; }).join('');
  return `<div class="v1816q-pins"><h3>Pinned <small>on every screen</small></h3>${rows||`<p class="v1816q-none">Nothing pinned yet. In Quick Jump, highlight anything and press Tab to pin it.</p>`}
    <textarea class="v1816q-note" data-v1816q-note="1" rows="2" placeholder="Coach’s note: write yourself a reminder…" aria-label="Coach's note">${esc(Q.note||'')}</textarea></div>`; }
A.v1816qPinRun=el=>{ const C=App.C; const pin=v1816qS(C).pins[+el.dataset.i]; const L=pin&&v1816qLive(C,pin); v1816qClose(); if(L) L.run(); };
A.v1816qUnpin=el=>{ const C=App.C; v1816qS(C).pins.splice(+el.dataset.i,1); queueSave(); if(V1816Q.open) v1816qDraw(true); else { App.keepScroll=true; render(); } };

/* ---------- the palette ---------- */
function v1816qRoot(){ let el=document.getElementById('v1816q'); if(!el){ el=document.createElement('div'); el.id='v1816q'; document.body.appendChild(el); } return el; }
function v1816qOpen(cat){ const C=App.C; if(!C||App.live) return; V1816Q.open=true; V1816Q.q=''; V1816Q.cat=cat||'all'; V1816Q.act=0; document.body.classList.add('v1816q-on'); v1816qDraw(true); const i=document.getElementById('v1816q-in'); if(i) i.focus(); }
function v1816qClose(){ if(!V1816Q.open) return; V1816Q.open=false; document.body.classList.remove('v1816q-on'); const el=v1816qRoot(); el.innerHTML=''; }
function v1816qRow(C,x,i){ const on=i===V1816Q.act; const pinned=v1816qPinned(C,x); const badge=on?'<span class="v1816q-b hot">Enter · open</span>':x.key?`<span class="v1816q-b key">${esc(x.key)}</span>`:`<span class="v1816q-b">${pinned?'Pinned':'Tab · pin'}</span>`;
  return `<button class="v1816q-r ${on?'on':''}" data-v1816q-i="${i}" role="option" aria-selected="${on}">${x.ico}<span class="v1816q-t"><b>${v1816qHl(x.title,x.hl)}</b><small>${esc(x.sub)}</small></span>${pinned?'<i class="v1816q-pd" title="Pinned">📌</i>':''}${badge}</button>`; }
function v1816qList(C){ const items=V1816Q.items=v1816qSearch(C); if(V1816Q.act>=items.length) V1816Q.act=Math.max(0,items.length-1);
  if(!items.length) return `<div class="v1816q-empty">Nothing matches “${esc(V1816Q.q)}”. Try a surname, a school or a page.</div>`;
  const lab={player:'Players',team:'Teams',page:'Pages',action:'Actions'}; let h='', last=null; items.forEach((x,i)=>{ if(x.k!==last){ h+=`<div class="v1816q-h">${lab[x.k]}</div>`; last=x.k; } h+=v1816qRow(C,x,i); }); return h; }
function v1816qDraw(full){ const C=App.C; const el=v1816qRoot(); if(!V1816Q.open||!C) return;
  if(full||!el.querySelector('.v1816q-box')){ const cat=V1816Q.q.trim().startsWith('>')?'action':V1816Q.cat;
    el.innerHTML=`<div class="v1816q-scrim" data-v1816q-close="1"></div><div class="v1816q-wrap" role="dialog" aria-modal="true" aria-label="Quick Jump"><section class="v1816q-box"><div class="v1816q-in"><span class="v1816q-mag">${icon('search',20)}</span><input id="v1816q-in" type="text" autocomplete="off" spellcheck="false" placeholder="Jump to a player, team, page or action" value="${esc(V1816Q.q)}" aria-label="Quick Jump"><kbd>${/Mac/.test(navigator.platform)?'⌘ K':'Ctrl K'}</kbd></div>
      <div class="v1816q-cats">${V1816Q_CATS.map(([k,l])=>`<button class="${cat===k?'on':''}" data-v1816q-cat="${k}">${l}</button>`).join('')}</div>
      <div class="v1816q-list" role="listbox" id="v1816q-list">${v1816qList(C)}</div>
      <div class="v1816q-foot"><span><kbd>↑↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Tab</kbd> pin</span><span><kbd>&gt;</kbd> actions only</span><span><kbd>G</kbd> then a letter: go to a page</span><span class="grow"></span><span><kbd>Esc</kbd> close</span></div></section>
      <aside class="v1816q-side">${v1816qPinsHtml(C)}</aside></div>`;
    return; }
  const cat=V1816Q.q.trim().startsWith('>')?'action':V1816Q.cat; el.querySelectorAll('[data-v1816q-cat]').forEach(b=>b.classList.toggle('on',b.dataset.v1816qCat===cat));
  const L=el.querySelector('#v1816q-list'); if(L){ L.innerHTML=v1816qList(C); const on=L.querySelector('.v1816q-r.on'); if(on) on.scrollIntoView({block:'nearest'}); } }
function v1816qMove(d){ const n=V1816Q.items.length; if(!n) return; V1816Q.act=(V1816Q.act+d+n)%n; v1816qDraw(); }
function v1816qRun(i){ const x=V1816Q.items[i]; if(!x) return; v1816qClose(); try{ x.run(); }catch(e){ console.warn('quick jump',e); } }
function v1816qPin(i){ const C=App.C; const x=V1816Q.items[i]; if(!x) return; v1816qTogglePin(C,x); const side=document.querySelector('.v1816q-side'); if(side) side.innerHTML=v1816qPinsHtml(C); v1816qDraw(); try{ Sound.ui('pop'); }catch(e){} }

document.addEventListener('keydown',e=>{
  const k=e.key; const mod=e.ctrlKey||e.metaKey;
  if(mod&&(k==='k'||k==='K')){ if(!App.C||App.live) return; e.preventDefault(); e.stopPropagation(); if(V1816Q.open) v1816qClose(); else v1816qOpen(); return; }
  if(V1816Q.open){ const inNote=e.target&&e.target.dataset&&e.target.dataset.v1816qNote; if(inNote){ if(k==='Escape'){ e.preventDefault(); e.stopPropagation(); v1816qClose(); } return; }
    if(k==='Escape'){ e.preventDefault(); e.stopPropagation(); v1816qClose(); return; }
    if(k==='ArrowDown'){ e.preventDefault(); v1816qMove(1); return; } if(k==='ArrowUp'){ e.preventDefault(); v1816qMove(-1); return; }
    if(k==='Enter'){ e.preventDefault(); v1816qRun(V1816Q.act); return; } if(k==='Tab'){ e.preventDefault(); v1816qPin(V1816Q.act); return; } return; }
  /* G then a letter */
  const tg=e.target, typing=tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable); if(typing||mod||e.altKey||!App.C||App.modal||App.live) return;
  if(k==='g'||k==='G'){ V1816Q.g=Date.now(); return; }
  if(V1816Q.g&&Date.now()-V1816Q.g<1200){ V1816Q.g=0; const d=V1816Q_GO[k.toLowerCase()]; if(d&&VIEWS[d[0]]){ e.preventDefault(); A.go(v1816qEl({r:d[0],p:d[1]?JSON.stringify(d[1]):''})); } } },true);
document.addEventListener('input',e=>{ const t=e.target; if(t&&t.id==='v1816q-in'){ V1816Q.q=t.value; V1816Q.act=0; v1816qDraw(); return; }
  if(t&&t.dataset&&t.dataset.v1816qNote&&App.C){ v1816qS(App.C).note=t.value.slice(0,400); clearTimeout(V1816Q.nt); V1816Q.nt=setTimeout(()=>{ try{ queueSave(); }catch(x){} },500);
    document.querySelectorAll('[data-v1816q-note]').forEach(o=>{ if(o!==t) o.value=t.value; }); } });
document.addEventListener('mousemove',e=>{ if(!V1816Q.open) return; const r=e.target.closest&&e.target.closest('[data-v1816q-i]'); if(!r) return; const i=+r.dataset.v1816qI; if(i!==V1816Q.act){ V1816Q.act=i; document.querySelectorAll('.v1816q-r').forEach((b,j)=>{ const on=j===i; if(b.classList.contains('on')!==on){ b.classList.toggle('on',on); b.setAttribute('aria-selected',on); } }); } },{passive:true});
document.addEventListener('click',e=>{ if(!V1816Q.open) return; const t=e.target;
  if(t.closest('[data-v1816q-close]')){ v1816qClose(); return; }
  const c=t.closest('[data-v1816q-cat]'); if(c){ V1816Q.cat=c.dataset.v1816qCat; if(V1816Q.q.trim().startsWith('>')) V1816Q.q=V1816Q.q.replace(/^\s*>\s*/,''); const inp=document.getElementById('v1816q-in'); if(inp){ inp.value=V1816Q.q; inp.focus(); } V1816Q.act=0; v1816qDraw(); return; }
  const r=t.closest('[data-v1816q-i]'); if(r){ v1816qRun(+r.dataset.v1816qI); } });

/* ---------- where it lives: the Settings menu (pins + a Quick Jump entry), the phone search icon ---------- */
{ const _top=v15Top; v15Top=function(C){ let h=_top.apply(this,arguments); try{ const kb=/Mac/.test(navigator.platform)?'⌘K':'Ctrl K';
    const add=`<button role="menuitem" class="tn-item" data-a="v1816qOpen"><span class="tn-ico">${icon('search',18)}</span><span class="grow"><b>Quick Jump</b><small>Find anything · ${kb}</small></span></button>${v1816qS(C).pins.length?`<div class="v1816q-ddpins">${v1816qPinsHtml(C,{dd:true})}</div>`:''}`;
    h=h.replace('<div class="tn-dd tn-dd-r" role="menu" aria-label="Settings">','<div class="tn-dd tn-dd-r v1816q-gear" role="menu" aria-label="Settings">'+add); }catch(e){ console.warn('quick jump top',e); } return h; }; }
A.v1816qOpen=()=>v1816qOpen();
document.addEventListener('focusin',e=>{ if(e.target&&e.target.id==='q'&&window.matchMedia('(max-width:900px)').matches&&App.C){ e.target.blur(); v1816qOpen(); } });
