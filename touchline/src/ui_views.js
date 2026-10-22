/* ===================== VIEWS ===================== */
const A = {};           // click actions: data-a
const CH = {};          // change/input actions: data-c
const Sx = id => App.C.schools[id];
const Px = id => findPerson(App.C,id);
const isUser = sid => sid===App.C.userSid;
const canEdit = sid => isUser(sid) || App.C.settings.manager;
const sLink = (sid,label) => { const s=Sx(sid); return s?`<button class="link" data-a="openSchool" data-id="${sid}">${esc(label||s.name)}</button>`:'—'; };
const pLink = (pid,label) => { const p=Px(pid); return p?`<button class="link" data-a="openPlayer" data-id="${pid}">${esc(label||pname(p))}</button>`:'<span class="muted">Unknown</span>'; };
const fLink = (fid,label) => `<button class="link" data-a="openFixture" data-id="${fid}">${label}</button>`;
const opts = (list,cur) => list.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(cur)?'selected':''}>${esc(l)}</option>`).join('');
const seg = (name,list,cur,extra='') => `<div class="seg" role="group">${list.map(([v,l])=>`<button class="${String(v)===String(cur)?'on':''}" aria-pressed="${String(v)===String(cur)}" data-a="setParam" data-k="${name}" data-v="${esc(v)}" ${extra}>${esc(l)}</button>`).join('')}</div>`;
const tabs = (name,list,cur) => `<div class="tabs" role="tablist">${list.map(([v,l])=>`<button role="tab" class="tab ${v===cur?'on':''}" aria-selected="${v===cur}" data-a="setParam" data-k="${name}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
function phaseLabel(C){
  if(C.phase==='preseason') return `Preseason Cup · Game ${Math.min(C.pre.rd+1,3)} of 3`;
  if(C.phase==='regular') return `Regular season · Matchday ${C.md+1} of 14`;
  if(C.phase==='sectionals') return `Sectionals · ${['Quarterfinals','Semifinals','Final'][C.post.secRd]}`;
  if(C.phase==='regional') return 'Regional Final';
  if(C.phase==='states') return `State Tournament · ${['Quarterfinals','Semifinals','Final'][C.post.stRd]}`;
  return 'Offseason';
}
function fixtureLabel(f){ if(!f) return ''; if(f.comp==='pre') return `Preseason Cup · Game ${f.rd+1}`; if(f.comp==='reg') return `League · Matchday ${f.rd+1}`; if(f.comp==='sec') return `Sectional ${['Quarterfinal','Semifinal','Final'][f.rd]}`; if(f.comp==='rgn') return 'Regional Final'; return `State ${['Quarterfinal','Semifinal','Final'][f.rd]}`; }
function playLabel(C){ if(C.phase==='offseason') return 'Start next season'; const uf=userFixture(C); if(C.phase==='preseason') return 'Play preseason game'; if(uf) return C.phase==='regular'?`Play Matchday ${C.md+1}`:`Play ${fixtureLabel(uf).split('· ').pop()}`; return 'Simulate round'; }

/* ---------- shared components ---------- */
function kpi(label,value,sub,tone){ return `<div class="kpi ${tone||''}"><span class="lab">${label}</span><b>${value}</b>${sub?`<span class="kpi-sub">${sub}</span>`:''}</div>`; }
function winBar(f){ const o=oddsFor(f.id,true); if(!o) return `<div class="winbar wb-wait" data-wb="${f.id}" aria-busy="true"><div class="wb-track"><i></i></div><div class="wb-labels"><span>Running the numbers…</span></div></div>`; const k=kitsFor(f); const h=Sx(f.h).town, a=Sx(f.a).town; const pct=v=>Math.round(v*100);
  const segs = o.kind==='3way'? [[o.h,k.team[0].shirt,h],[o.d,'#59636f','Draw'],[o.a,k.team[1].shirt,a]] : [[o.h,k.team[0].shirt,h+' advance'],[o.a,k.team[1].shirt,a+' advance']];
  return `<div class="winbar" data-wb="${f.id}" title="Win probability from ${o.n} simulations of this matchup"><div class="wb-track">${segs.map(([v,c])=>`<i style="width:${Math.max(3,v*100)}%;background:${c}"></i>`).join('')}</div><div class="wb-labels">${(()=>{ const ml=moneyline2(o.h,o.a); return segs.map(([v,c,l],i)=>`<span><b>${pct(v)}%</b> ${esc(l)}${App.C.settings.odds&&!(o.kind==='3way'&&i===1)?` <em>${ml[o.kind==='3way'?(i===0?0:1):i]}</em>`:''}</span>`).join(''); })()}</div></div>`; }
function unitRatings(C,sid,lvl){ const lu=getLu(C,sid,lvl); const g={FWD:[],MID:[],DEF:[],GK:[]}; for(const s of lu.slots){ const p=C.players[s.pid]; if(p) g[ROLE_GROUP[s.role]].push(eff(p,s.role)); } const av=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0; return {att:av(g.FWD),mid:av(g.MID),def:av(g.DEF),gk:av(g.GK)}; }
function taleOfTape(f){ const C=App.C; const A=unitRatings(C,f.h,f.lvl), B=unitRatings(C,f.a,f.lvl); const k=kitsFor(f);
  return `<div class="tape">${[['att','Attack'],['mid','Midfield'],['def','Defense'],['gk','Goalkeeper']].map(([key,l])=>{ const x=A[key], y=B[key]; const lo=Math.min(x,y)-12; const px=clamp((x-lo)/(Math.max(x,y)-lo+0.01),0.08,1), py=clamp((y-lo)/(Math.max(x,y)-lo+0.01),0.08,1);
    return `<div class="tape-row"><b class="mono ${x>y+1?'win':''}">${R(x)}</b><div class="tape-bar l"><i style="width:${px*100}%;background:${k.team[0].shirt}"></i></div><span class="lab3">${l}</span><div class="tape-bar"><i style="width:${py*100}%;background:${k.team[1].shirt}"></i></div><b class="mono ${y>x+1?'win':''}">${R(y)}</b></div>`; }).join('')}</div>`; }
function shirtSVG(c1,c2,num,size=40){ const t=colorDist(c1,c2)<80?(lum(c1)>.4?'#111':'#fff'):c2; return `<svg class="shirt" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><path d="M13 4L7 6L1 13L6 19L9 16V37H31V16L34 19L39 13L33 6L27 4C26 7 23 9 20 9C17 9 14 7 13 4Z" fill="${c1}" stroke="rgba(0,0,0,.55)" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 4C14 7 17 9 20 9C23 9 26 7 27 4" fill="none" stroke="${t}" stroke-width="2"/><text x="20" y="28" text-anchor="middle" font-size="12" font-weight="800" fill="${t}" font-family="JetBrains Mono,monospace">${esc(num)}</text></svg>`; }
function cardTier(o){ return o>=82?'gold':o>=70?'silver':'bronze'; }
function playerCard(p, opt={}){ const s=Sx(p.sid); const o=R(ovr(p)); const st=p.sk;
  return `<button class="pcard ${cardTier(o)} ${opt.cls||''}" data-a="openPlayer" data-id="${p.id}" style="--c1:${s.c1};--c2:${s.c2}" aria-label="${esc(pname(p))}, ${p.pos}, rated ${o}">
   <span class="pc-wm">${logo(s,80)}</span><span class="pc-face">${portraitSVG(p,104)}</span><span class="pc-top"><b class="pc-ovr">${o}</b><span class="pc-pos">${p.pos}</span></span><span class="pc-num">#${p.num}</span>
   <span class="pc-name"><small>${esc(p.fn)}</small>${esc(p.ln)}</span>
   <span class="pc-stats">${[['SPD','spd'],['SHO','sho'],['PAS','pas'],['DEF','def'],['STA','sta'],[p.pos==='GK'?'GK':'POT',p.pos==='GK'?'gk':null]].map(([l,k])=>`<span><b>${k?R(st[k]):p.pot}</b>${l}</span>`).join('')}</span>
   <span class="pc-foot">${LVL_NAME[p.lvl]} · Gr ${p.grade} · ${ftIn(p.h)}${p.plan&&p.plan.breakout&&isUser(p.sid)?' · <em>Breakout</em>':''}</span></button>`; }
function radarSVG(p,size=220){ const ks=['spd','sho','pas','def','sta','gk']; const lab=['Speed','Shooting','Passing','Defending','Stamina','Keeping']; const c=size/2, r=size/2-34; const pt=(i,v)=>{ const a=-Math.PI/2+i*Math.PI/3; return [c+Math.cos(a)*r*v/99, c+Math.sin(a)*r*v/99]; };
  const grid=[33,66,99].map(v=>`<polygon points="${ks.map((_,i)=>pt(i,v).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`).join('');
  const s=Sx(p.sid); return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Skill profile">${grid}${ks.map((_,i)=>`<line x1="${c}" y1="${c}" x2="${pt(i,99)[0]}" y2="${pt(i,99)[1]}" stroke="var(--line)"/>`).join('')}
   <polygon points="${ks.map((k,i)=>pt(i,p.sk[k]).join(',')).join(' ')}" fill="${s.c1}" fill-opacity=".45" stroke="var(--accent)" stroke-width="2"/>${ks.map((k,i)=>{ const [x,y]=pt(i,118); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" fill="var(--muted)" font-weight="700">${lab[i]}</text><text x="${x}" y="${y+12}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--text)" font-family="JetBrains Mono,monospace" font-weight="800">${R(p.sk[k])}</text>`; }).join('')}</svg>`; }
function mascotPicker(cur, c1, c2, act, extra=''){ return `<div class="mpick" role="radiogroup" aria-label="Mascot">${MASCOT_LIST.map(([k,n])=>`<button class="mp ${k===cur?'on':''}" role="radio" aria-checked="${k===cur}" data-a="${act}" data-k="${k}" ${extra} title="${n}">${mascotSVG(k,c1,c2,52)}<span>${n}</span></button>`).join('')}</div>`; }
const SWATCHES=COLOR_PAIRS.slice(0,16);
function swatchRow(act, extra=''){ return `<div class="swatches">${SWATCHES.map(([a,b])=>`<button class="swp" ${extra} data-a="${act}" data-c1="${a}" data-c2="${b}" aria-label="Colors ${a} and ${b}"><i style="background:${a}"></i><i style="background:${b}"></i></button>`).join('')}</div>`; }
function trackerHtml(C){
  const steps=[['preseason','Preseason'],['regular','League'],['sectionals','Sectionals'],['regional','Regional'],['states','States'],['offseason','Offseason']];
  const idx=steps.findIndex(s=>s[0]===(C.phase==='awards'?'offseason':C.phase));
  return `<ol class="tracker" aria-label="Season progress">${steps.map(([k,l],i)=>{ const st=i<idx?'done':i===idx?'now':'next'; let extra='';
    if(k==='regular'){ const done=C.phase==='regular'?C.md:(i<idx?14:0); extra=`<span class="trk-bar"><i style="width:${done/14*100}%"></i></span><span class="trk-n">${C.phase==='regular'?`MD ${C.md+1}/14`:i<idx?'14/14':''}</span>`; }
    if(k==='preseason'&&C.phase==='preseason') extra=`<span class="trk-n">${Math.min(C.pre.rd+1,3)}/3</span>`;
    if(k==='sectionals'&&C.phase==='sectionals') extra=`<span class="trk-n">${['QF','SF','Final'][C.post.secRd]}</span>`;
    if(k==='states'&&C.phase==='states') extra=`<span class="trk-n">${['QF','SF','Final'][C.post.stRd]}</span>`;
    return `<li class="trk ${st}" ${st==='now'?'aria-current="step"':''}><span class="trk-dot"></span><span class="trk-l">${l}</span>${extra}</li>`; }).join('')}</ol>`; }
function navBadges(C){ const b={}; const v=validateLineup(C,C.userSid,'V'); if(!v.ok) b.squads='!'; const ready=[...squad(C,C.userSid,'JV'),...squad(C,C.userSid,'MOD')].filter(p=>evaluate(C,p).score>=2).length; if(ready) b.dev=ready; const nv=id=>parseInt(String(id||'n0').slice(1),36)||0; const unseen=C.news.filter(n=>nv(n.id)>(C.flags.newsSeen||0)).length; if(unseen&&App.route!=='news') b.news=Math.min(unseen,9)+(unseen>9?'+':''); if(['sectionals','regional','states'].includes(C.phase)) b.post='LIVE'; return b; }

/* ---------- shell ---------- */
const NAV=[
  [null,'Program'],['office',"Coach's Office"],['squads','Squads & Lineups'],['dev','Player Development'],['schedule','Match Schedule'],
  [null,'Competition'],['league','League & Rankings'],['records','Record Book'],['post','Postseason'],['awards','Awards'],
  [null,'Archive'],['history','History & Yearbooks'],['tourneys','Tournament History'],['news','Newsroom'],
  [null,'Club'],['school','School & Stadium'],['settings','Settings']
];
const NAV_ICON={office:'office',squads:'squads',dev:'dev',schedule:'schedule',league:'league',records:'records',post:'post',awards:'awards',history:'history',tourneys:'tourneys',news:'news',school:'school',settings:'settings'};
const TITLES={office:"Coach's Office",squads:'Squads & Lineups',dev:'Player Development',schedule:'Match Schedule',league:'League & Rankings',records:'Record Book',post:'Postseason',awards:'Awards',history:'History & Yearbooks',tourneys:'Tournament History',news:'Newsroom',school:'School & Stadium',settings:'Settings'};
function render(){
  applyTheme();
  const app=$('#app');
  if(!App.C){ app.className=''; app.innerHTML=''; renderStart(); renderModal(); return; }
  $('#start')?.remove();
  const C=App.C; const us=Sx(C.userSid); C.flags=C.flags||{};
  if(App.route==='news'&&C.news[0]) C.flags.newsSeen=Math.max(...C.news.map(n=>parseInt(n.id.slice(1),36)||0));
  if(App.route==='dev') C.flags.evalYear=C.year;
  const vf=VIEWS[App.route]||VIEWS.office; const view=typeof v17View==='function'?v17View(vf):vf();
  const badges=navBadges(C);
  const sideHtml=`<nav class="side" aria-label="Main">
    <div class="brand"><div class="brand-logo">${logo(us,48)}</div><div class="brand-t"><b>TOUCHLINE</b><small>${esc(us.town)} ${esc(us.mascot)}</small></div></div>
    ${NAV.map(([k,l])=>k?`<button class="nav ${App.route===k?'on':''}" data-a="go" data-r="${k}" ${App.route===k?'aria-current="page"':''}>${icon(NAV_ICON[k])}<span class="grow">${esc(l)}</span>${badges[k]?`<span class="nbadge ${badges[k]==='!'?'bad':badges[k]==='LIVE'?'live':''}">${badges[k]}</span>`:''}</button>`:`<div class="nav-group">${l}</div>`).join('')}
    <div class="side-foot"><div class="row" style="gap:8px;flex-wrap:nowrap">${crest(us,26)}<div class="grow trunc"><b>${esc(C.coaches[C.userCoachId].name)}</b><div class="tiny muted">Slot ${App.slot} · ${C.year} season ${C.seasonNo}</div></div></div><div id="savestate" class="tiny"></div><button class="btn sm ghost" data-a="toSaves">Switch save</button></div>
  </nav>`;
  const uf=C.phase!=='offseason'?userFixture(C):null; const opp=uf?Sx(uf.h===C.userSid?uf.a:uf.h):null;
  const top=(typeof v15Top==='function')?v15Top(C,uf,opp):`<header class="top">
    <button class="btn sm burger" data-a="burger" aria-label="Open menu">${icon('menu')}</button>
    <div class="ttl"><span class="eyebrow">${C.year} · ${esc(C.stateName)} · Section ${C.section}</span><h1>${esc(TITLES[App.route]||'')}</h1></div>
    ${typeof soundBtn==='function'?soundBtn():''}<div class="search">${icon('search',16)}<input type="text" id="q" placeholder="Search players, schools, games" aria-label="Search" autocomplete="off" data-c="search" value="${esc(App.q||'')}"><div id="sres"></div></div>
    <div class="cta"><button class="btn pri play" data-a="playNext"><span>${esc(playLabel(C))}</span>${opp?`<span class="cta-opp">vs ${crest(opp,18)} ${esc(opp.town)}</span>`:''}</button>${C.phase!=='offseason'?`<button class="btn pri cta-more" data-a="simMenu" aria-haspopup="menu" aria-expanded="${!!App.simMenu}" aria-label="More simulation options">▾</button>`:''}
    ${App.simMenu?`<div class="menu" role="menu"><button role="menuitem" data-a="simAhead" data-k="round">Quick sim this round<span>Plays your match without watching</span></button>${['preseason','regular'].includes(C.phase)?`<button role="menuitem" data-a="simAhead" data-k="regular">Sim to end of regular season<span>Stops before Sectionals</span></button>`:''}<button role="menuitem" data-a="simAhead" data-k="season">Sim to end of season<span>Through the State final and awards</span></button></div>`:''}</div>
  </header>${trackerHtml(C)}`;
  const y=window.scrollY;
  if(!(typeof v17Swap==='function'&&v17Swap(app,sideHtml,top,view))) app.innerHTML = sideHtml + `<div class="main">${top}<main class="content view-${App.route}" id="content">${view}</main></div>`;
  if(App.keepScroll) window.scrollTo(0,y); App.keepScroll=false;
  paintSaveState(); renderModal();
}
function renderModal(){
  let root=$('#modal-root'); if(!root){ root=document.createElement('div'); root.id='modal-root'; document.body.appendChild(root); }
  const m=App.modal; const d=App.drawer;
  let html='';
  if(m){ const fn=MODALS[m.type]; html+= fn? fn(m) : ''; }
  if(d){ const fn=DRAWERS[d.type]; html+= fn? `<div class="scrim" data-a="closeDrawer" style="background:#0007"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(d.title||'Panel')}">${fn(d)}</aside>`:''; }
  const key=(m?m.type+(m.id||''):'')+'|'+(d?d.type:''); root.innerHTML=html; if(key===App.lastModalKey) root.querySelectorAll('.scrim,.drawer').forEach(x=>x.style.animation='none'); App.lastModalKey=key; if(typeof afterModal==='function') afterModal(root);
  document.body.classList.toggle('locked', !!(m||d||App.live));
  if((m||d) && !root.contains(document.activeElement)){ const f=root.querySelector('[data-autofocus]')||root.querySelector('.x'); if(f) f.focus({preventScroll:true}); }
}
const modalShell=(title,body,foot,cls='')=>`<div class="scrim" data-a="scrimClose"><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(typeof title==='string'?title.replace(/<[^>]+>/g,''):'Dialog')}" data-stop="1"><div class="mhead">${title}<button class="x" data-a="closeModal" aria-label="Close">✕</button></div><div class="mbody">${body}</div>${foot?`<div class="mfoot">${foot}</div>`:''}</div></div>`;
const MODALS={}, DRAWERS={}, VIEWS={};

/* ---------- start / save slots ---------- */
async function renderStart(){
  let el=$('#start'); const fresh=!el;
  if(!el){ el=document.createElement('div'); el.id='start'; el.className='start'; document.body.prepend(el);
    el.innerHTML=`<div class="start-bg" aria-hidden="true"><canvas id="start-cv"></canvas><div class="start-shade"></div><div class="beam b1"></div><div class="beam b2"></div><div class="start-grain"></div></div><div class="start-live" aria-hidden="true"><i></i>LIVE · Showcase match</div><div class="start-snd">${typeof soundBtn==='function'?soundBtn(true):''}</div><div class="start-bug" id="start-bug" aria-hidden="true"></div><div class="start-ui"></div>`;
    if(!reducedMotion()) requestAnimationFrame(()=>{ try{ App.menuShow=startMenuShow($('#start-cv')); }catch(e){ console.warn(e); } }); }
  const metas=await DB.getMeta(); const by={}; for(const m of metas) by[m.slot]=m;
  /* v17: the parade is one cached canvas strip (src/v17/10_start.js); the inline-SVG version is only the fallback */
  const parade=typeof v17ParadeHTML==='function'?v17ParadeHTML():`<div class="parade" aria-hidden="true"><div class="parade-in">${[...MASCOT_LIST,...MASCOT_LIST].map(([k],i)=>{ const cp=COLOR_PAIRS[(i*7)%COLOR_PAIRS.length]; return `<span>${mascotSVG(k,cp[0],cp[1],58)}</span>`; }).join('')}</div></div>`;
  const word='TOUCHLINE'.split('').map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('');
  const logoWord=typeof v17LogoWord==='function'?v17LogoWord(word):`<span class="logo-word" aria-label="Touchline">${word}</span>`;
  const phaseName=ph=>({preseason:'Preseason',regular:'League play',sectionals:'Sectionals',regional:'Regional',states:'State tourney',awards:'Awards',offseason:'Offseason'}[ph]||ph);
  const ui=el.querySelector('.start-ui');
  ui.innerHTML=`
   <div class="logo ${fresh?'intro':''} ${metas.length?'compact':''}"><span class="logo-kicker"><i></i>Friday Night Varsity<i></i></span>${logoWord}<small>High School Soccer Manager</small></div>
   <p class="start-pitch">Take over a program. Develop raw freshmen into Varsity stars. Chase the sectional plaque, the regional cup and the state crown, one season at a time.</p>
   ${continueHero(metas)}
   <div class="slots">${[1,2,3].map(n=>{ const m=by[n]; return m?`<div class="slot filled" style="--c1:${m.c1};--c2:${m.c2};--d:${n}">
       <span class="slot-wm">${m.mk?mascotSVG(m.mk,m.c1,m.c2,170):''}</span>
       <div class="eyebrow">Career ${n}</div>
       <div class="slot-team">${m.mk?`<span class="slot-logo">${mascotSVG(m.mk,m.c1,m.c2,74)}</span>`:''}<div><h3>${esc(m.school)}</h3><div class="slot-sub">${esc(m.mascot||'')} · ${esc(m.state)}</div></div></div>
       <div class="slot-meta"><span><b>${m.year}</b>Season ${m.seasonNo}</span><span><b>${esc(phaseName(m.phase))}</b>Phase</span><span><b>${m.honors||0}</b>Honors</span></div>
       <div class="slot-coach">Coach ${esc(m.coach)}</div>
       <div class="row"><button class="btn pri play grow" data-a="openSlot" data-slot="${n}">Continue career</button><button class="btn ghost sm" data-a="askDelete" data-slot="${n}" aria-label="Delete career ${n}">Delete</button></div></div>`
     : `<button class="slot empty" data-a="newCareerForm" data-slot="${n}" style="--d:${n}"><span class="slot-plus" aria-hidden="true">+</span><span class="eyebrow">Career ${n}</span><b>New program</b><span class="slot-sub">Pick a mascot, colors and a town. Every world is generated fresh.</span></button>`; }).join('')}</div>
   ${App.mem?'<div class="notice warn">This browser blocked storage, so careers will not persist after you close the page. Use Settings → Backup to keep a copy.</div>':''}
   <div class="start-feats">${[`${MASCOT_LIST.length} original mascots`,'Live broadcast matches','Modified → JV → Varsity','Road to State'].map(t=>`<span>${t}</span>`).join('<i></i>')}</div>
   <div class="row start-links"><button class="btn ghost sm" data-a="howTo">How to play</button><button class="btn ghost sm whatsnew" data-a="whatsNew"><i></i>What's new</button><button class="btn ghost sm" data-a="importOpen">Import a backup</button><button class="btn ghost sm" data-a="openTheme">Appearance</button></div>
   <div class="start-ticker" aria-hidden="true"><div class="st-in">${startTicker()}</div></div>
   ${parade}`;
}
MODALS.newCareer = m => {
  if(m.step!==2) return modalShell('<h2>New career · 1 of 2</h2>', `
  <p class="muted" style="margin:0">Name your coach. Next you'll build your school's identity: name, colors and one of ${MASCOT_LIST.length} mascots.</p>
  <div class="field"><label for="nc-name">Your coach name</label><input type="text" id="nc-name" maxlength="40" value="${esc(m.name||'')}" placeholder="e.g. Seth Morgan" data-autofocus></div>
  <div class="field"><label for="nc-seed">World seed (optional)</label><input type="text" id="nc-seed" maxlength="12" value="${esc(m.seed||'')}" placeholder="Leave blank for a random world"><span class="tiny muted">The same seed always builds the same world.</span></div>`,
  `<button class="btn" data-a="closeModal">Cancel</button><button class="btn pri" data-a="ncNext" data-slot="${m.slot}">Next: build your program</button>`,'narrow');
  const D=App.draft; const s=D.schools[D.userSid]; const alts=MASCOT_BY[s.mk].alt;
  return modalShell('<h2>New career · 2 of 2</h2>', `<div class="nc-grid">
   <div class="nc-preview" style="--c1:${s.c1};--c2:${s.c2}"><div class="nc-logo">${typeof v14Patch==='function'?v14Patch(s,176):logo(s,150)}</div><div class="nc-crest">${crest(s,48)}</div><h2>${esc(s.name)}</h2><div class="muted">${esc(s.mascot)} · ${esc(D.stateName)} · Section ${D.section}</div><div class="nc-kit">${shirtSVG(s.c1,s.c2,'10',64)}${shirtSVG(s.c2,s.c1,'7',64)}</div></div>
   <div class="col" style="gap:12px">
    <div class="grid g2"><div class="field"><label for="nc-school">School name</label><input type="text" id="nc-school" value="${esc(s.name)}" maxlength="48"></div><div class="field"><label for="nc-town">Short name</label><input type="text" id="nc-town" value="${esc(s.town)}" maxlength="24"></div></div>
    <div class="field"><span class="lab">Mascot</span>${mascotPicker(s.mk,s.c1,s.c2,'ncMascot')}</div>
    <div class="grid g2"><div class="field"><label for="nc-mname">Team name</label><select id="nc-mname">${opts(alts.map(x=>[x,x]),s.mascot)}</select></div>
     <div class="field"><span class="lab">Colors</span><div class="row"><input type="color" id="nc-c1" value="${s.c1}" data-c="ncColor" aria-label="Primary color"><input type="color" id="nc-c2" value="${s.c2}" data-c="ncColor" aria-label="Secondary color"><button class="btn sm ghost" data-a="ncSwapColors">Swap</button></div></div></div>
    ${swatchRow('ncSwatch')}
    <p class="tiny muted" style="margin:0">Your program starts mid-table in an eight-school section with a heated rival. Every other school, coach and player is generated fresh.</p>
   </div></div>`,
  `<button class="btn ghost" data-a="ncBack">Back</button><button class="btn" data-a="ncReroll">New town & world</button><button class="btn pri" data-a="createCareer" data-slot="${m.slot}">Start career</button>`,'wide');
};
MODALS.confirmDelete = m => modalShell('<h2>Delete career?</h2>', `<p>Slot ${m.slot} (${esc(m.label||'')}) and all of its match history will be removed from this browser. Other slots are not affected. This cannot be undone.</p><div class="field"><label for="del-confirm">Type DELETE to confirm</label><input type="text" id="del-confirm" autocomplete="off" data-autofocus></div>`, `<button class="btn" data-a="closeModal">Keep it</button><button class="btn danger" data-a="doDelete" data-slot="${m.slot}">Delete slot ${m.slot}</button>`,'narrow');

/* ---------- COACH'S OFFICE ---------- */
function oddsFor(fid,lazy){
  const C=App.C; const f=C.fixtures[fid]; if(!f) return null;
  const key=fid+'|'+[f.h,f.a].map(sid=>{ const lu=getLu(C,sid,f.lvl); return lu.form+lu.slots.map(s=>s.pid+s.role).join('')+JSON.stringify(lu.tac)+(lu.strat||''); }).join('|')+C.settings.difficulty;
  if(App.odds.has(key)) return App.odds.get(key);
  if(lazy){ if(typeof oddsSchedule==='function') oddsSchedule(fid); return null; }
  const v=simProbs(C,fid,f.lvl==='V'?400:160); App.odds.set(key,v); return v;
}
function oddsHtml(f){ if(!App.C.settings.odds) return ''; const o=oddsFor(f.id); if(!o) return ''; const h=Sx(f.h).town, a=Sx(f.a).town;
  const ml=moneyline2(o.h,o.a);
  if(o.kind==='3way') return `<div class="odds" title="Fictional moneyline from ${o.n} simulations of this exact matchup. A draw returns the stake (draw no bet)."><span>${esc(h)} ${ml[0]}</span><span class="muted">Draw ${Math.round(o.d*100)}%</span><span>${esc(a)} ${ml[1]}</span></div><div class="tiny muted" style="text-align:center;margin-top:4px">Moneyline · draw no bet (a draw refunds) · fictional odds, not wagering</div>`;
  return `<div class="odds" title="Fictional advancement odds from ${o.n} simulations including extra time and penalties."><span>${esc(h)} advance ${ml[0]}</span><span>${esc(a)} advance ${ml[1]}</span></div><div class="tiny muted" style="text-align:center;margin-top:4px">To advance, incl. extra time & penalties · fictional odds</div>`; }
function rivalChip(f){ const r=isRivalry(App.C,f.h,f.a); return r? `<span class="chip riv">${r==='heated'?'Heated rivalry':'Seasonal rival'}</span>`:''; }
function formPips(sid,n=5){ const C=App.C; const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&f.comp!=='pre'&&(f.h===sid||f.a===sid)).sort((a,b)=>(a.yr-b.yr)||(fxOrder(a)-fxOrder(b))).slice(-n);
  if(!fx.length) return '<span class="pips muted tiny">No games yet</span>';
  return `<span class="pips" aria-label="Recent form">${fx.map(f=>{ const r=f.w===sid?'W':f.w?'L':'D'; return `<i class="pip ${r}" title="${esc(fixtureLabel(f))}: ${f.hg}-${f.ag}">${r}</i>`; }).join('')}</span>`; }
function recLine(sid){ const C=App.C; if(!C.league.includes(sid)) { const s=Sx(sid); return esc(s.section||(s.ext==='pre'?'Preseason opponent':'Out of section')); } const t=standings(C,'V'); const i=t.findIndex(r=>r.sid===sid); const r=t[i]; return r.p? `${r.w}-${r.d}-${r.l} · ${ordinal(i+1)} in Section ${C.section}` : `Section ${C.section}`; }
function nextMatchCard(){
  const C=App.C; const uf=userFixture(C);
  if(!uf){ const fx=roundFixtures(C); return `<section class="matchhero empty"><div class="mh-top"><span class="eyebrow">${esc(phaseLabel(C))}</span></div><h2>${C.post?`${esc(Sx(C.userSid).town)} are out of the postseason`:'No Varsity fixture this round'}</h2><p class="muted">${C.post?'The bracket plays on. Simulate the round to follow it to the State final.':''}</p>${fx.length?`<div class="mh-actions"><button class="btn pri play" data-a="playNext">Simulate round</button></div>`:''}</section>`; }
  const h=Sx(uf.h), a=Sx(uf.a);
  const team=(s)=>`<div class="mh-team"><div class="mh-logo">${logo(s,118)}</div><b>${esc(s.town)}</b><span class="mh-masc">${esc(s.mascot)}</span><span class="mh-rec">${recLine(s.id)}</span>${formPips(s.id)}</div>`;
  return `<section class="matchhero" style="--hc:${h.c1};--ac:${a.c1}">
   <div class="mh-top"><span class="eyebrow">${esc(fixtureLabel(uf))}</span><div class="row">${rivalChip(uf)}<span class="chip">${esc(uf.ven)}</span></div></div>
   <div class="mh-teams">${team(h)}<div class="mh-vs"><span class="vs">VS</span><span class="small">Team rating</span><span class="mono">${R(xiRating(C,h.id,'V'))} · ${R(xiRating(C,a.id,'V'))}</span></div>${team(a)}</div>
   ${winBar(uf)}
   <div class="mh-actions"><button class="btn" data-a="openFixture" data-id="${uf.id}">Match preview</button><button class="btn" data-a="quickSim" data-id="${uf.id}">Quick sim</button><button class="btn pri play" data-a="playNext">${esc(playLabel(C))}</button></div></section>`;
}
function kpiStrip(){ const C=App.C; const u=C.userSid; const t=standings(C,'V'); const i=t.findIndex(r=>r.sid===u); const r=t[i];
  const xi=R(xiRating(C,u,'V')); const rank=[...C.league].sort((a,b)=>xiRating(C,b,'V')-xiRating(C,a,'V')).indexOf(u)+1;
  return `<div class="kpis">${kpi('League position',r.p?ordinal(i+1):'—',r.p?`${r.pts} pts after ${r.p}`:'Season not started',i===0&&r.p?'good':'')}${kpi('Record',r.p?`${r.w}-${r.d}-${r.l}`:'0-0-0','W-D-L, league')}${kpi('Goal difference',(r.gd>0?'+':'')+r.gd,`${r.gf} scored · ${r.ga} conceded`,r.gd>0?'good':r.gd<0?'bad':'')}${kpi('Varsity XI',xi,`${ordinal(rank)} strongest in section`)}${kpi('Form',r.streak>=2?`${r.streak} wins`:r.form.length?r.form.slice(-3).join(''):'—',r.streak>=2?'Current winning streak':'Last three league games')}</div>`; }
function checklistItems(){ const C=App.C; const u=C.userSid; C.flags=C.flags||{}; const lu=getLu(C,u,'V'); const v=validateLineup(C,u,'V'); const uf=userFixture(C);
  const ready=[...squad(C,u,'JV'),...squad(C,u,'MOD')].filter(p=>evaluate(C,p).score>=2).length;
  const items=[
    [v.ok&&!v.warns.length,'Set a legal Varsity lineup', v.ok?(v.warns.length?`${v.warns.length} player${v.warns.length>1?'s':''} out of position`:'Ready to go'):v.issues[0],`data-a="go" data-r="squads" data-p='{"lvl":"V","tab":"lineup"}'`],
    [lu.caps.length===2&&lu.caps[0]!==lu.caps[1],'Name two captains', lu.caps.map(id=>esc(pname(C.players[id])||'?')).join(' & '),`data-a="go" data-r="squads" data-p='{"lvl":"V","tab":"lineup"}'`],
    [C.flags.trainingYear===C.year,'Choose a training focus', `Current: ${esc(TRAINING[C.training])}`,`data-a="go" data-r="dev"`],
    [!uf||C.flags.scouted===uf.id,'Scout your next opponent', uf?`Open the preview for ${esc(Sx(uf.h===u?uf.a:uf.h).town)}`:'No match this round', uf?`data-a="openFixture" data-id="${uf.id}"`:''],
    [C.flags.evalYear===C.year,'Review your prospects', ready?`${ready} player${ready>1?'s':''} rated ready for Varsity`:'Check JV and Modified development',`data-a="go" data-r="dev"`]];
  return items; }
function checklistCard(){ const items=checklistItems();
  const done=items.filter(x=>x[0]).length; const pct=done/items.length;
  return `<div class="card checklist"><div class="hd"><h3>Coach's checklist</h3><span class="ring" style="--p:${pct}"><b>${done}/${items.length}</b></span></div><div class="list">${items.map(([ok,t,sub,act])=>`<button class="ck ${ok?'ok':''}" ${act}><span class="ck-box" aria-hidden="true">${ok?'✓':''}</span><span class="grow"><b>${t}</b><span class="tiny muted">${sub}</span></span><span class="ck-go" aria-hidden="true">›</span></button>`).join('')}</div></div>`; }
function leadersCard(){ const C=App.C; const sq=squad(C,C.userSid,'V').map(p=>({p,b:seasonBucket(p,C.year,'V','reg')})).filter(x=>x.b&&x.b.gp);
  if(!sq.length) return `<div class="card"><h3>Team leaders</h3><div class="muted small">Leaders appear once league play starts.</div></div>`;
  const top=(f)=>sq.slice().sort((a,b)=>f(b)-f(a))[0]; const rows=[['Goals',top(x=>x.b.g),x=>x.b.g],['Assists',top(x=>x.b.a),x=>x.b.a],['Avg rating',top(x=>x.b.gp>=2?x.b.rt/x.b.gp:0),x=>fmt1(x.b.rt/x.b.gp)],['Defensive actions',top(x=>x.b.tk+x.b.int+x.b.cl),x=>x.b.tk+x.b.int+x.b.cl]];
  return `<div class="card"><h3>Team leaders</h3><div class="leaders">${rows.map(([l,x,v])=>`<button class="leader" data-a="openPlayer" data-id="${x.p.id}">${shirtSVG(Sx(C.userSid).c1,Sx(C.userSid).c2,x.p.num,34)}<span class="grow"><span class="tiny muted">${l}</span><b>${esc(pname(x.p))}</b></span><b class="mono big">${v(x)}</b></button>`).join('')}</div></div>`; }
function devCard(){
  const C=App.C; const ps=schoolPlayers(C,C.userSid).map(p=>({p,d:ovr(p)-(p.ovr0[C.year]??ovr(p))})).sort((a,b)=>b.d-a.d);
  const risers=ps.filter(x=>x.d>=1).slice(0,5); const bo=ps.filter(x=>x.p.plan&&x.p.plan.breakout).map(x=>x.p);
  const stalls=ps.filter(x=>x.p.plan&&x.p.plan.stall&&x.p.lvl!=='V').slice(0,2);
  return `<div class="card"><div class="hd"><h3>Development alerts</h3><button class="btn sm ghost" data-a="go" data-r="dev">All development</button></div><div class="list">
   ${risers.map(({p,d})=>`<div class="li">${posTag(p.pos)}<div class="grow trunc">${pLink(p.id)} <span class="muted small">${LVL_NAME[p.lvl]} · Gr ${p.grade}</span></div><span class="good mono">+${fmt1(d)}</span>${ovrBadge(ovr(p))}</div>`).join('')||'<div class="muted small">Ratings move as the season goes on. Check back after a few matchdays.</div>'}
   ${bo.map(p=>`<div class="li"><span class="pill" style="border-color:var(--accent2);color:var(--accent2)">Breakout</span><div class="grow trunc small">${pLink(p.id)} <span class="muted">${LVL_NAME[p.lvl]} · Gr ${p.grade}</span></div>${ovrBadge(ovr(p))}</div>`).join('')}
   ${stalls.map(({p})=>`<div class="li"><span class="pill">Stalled</span><div class="grow small">${pLink(p.id)} has hit a plateau this season.</div></div>`).join('')}
  </div></div>`;
}
function milestoneCard(){ const ms=milestones(App.C); return `<div class="card"><h3>Upcoming milestones</h3><div class="list">${ms.length?ms.map(m=>`<div class="li"><span class="pill">Next</span><div class="grow small">${m.pid?pLink(m.pid,m.text):esc(m.text)}</div></div>`).join(''):'<div class="muted small">Nothing within reach this week.</div>'}</div></div>`; }
function recentCard(){ const C=App.C; const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid)&&f.yr===C.year&&!(f.comp==='pre'&&(C.phase!=='preseason'&&!(C.phase==='regular'&&C.md===0)))).sort((a,b)=>fxOrder(b)-fxOrder(a)).slice(0,5);
  return `<div class="card"><h3>Recent results</h3><div class="list">${fx.map(f=>resultRow(f)).join('')||'<div class="muted small">No results yet this season.</div>'}</div></div>`; }
function fxOrder(f){ return ({pre:0,reg:100,sec:200,rgn:300,st:400}[f.comp])+f.rd; }
function resultRow(f, persp){ const C=App.C; persp=persp||C.userSid; const me=f.h===persp?0:f.a===persp?1:-1; const opp=me===1?f.h:f.a;
  let res=''; if(f.st==='d'&&me>=0){ const w=f.w===persp, l=f.w&&f.w!==persp; res=`<span class="pill" style="background:${w?'var(--good)':l?'var(--bad)':'var(--surface2)'};color:${w||l?'#0b0b0b':'inherit'}">${w?'W':l?'L':'D'}</span>`; }
  const score=f.st==='d'?`${f.hg}–${f.ag}${f.pk?` <span class="muted small">(${f.pk[0]}–${f.pk[1]} pens)</span>`:f.et?' <span class="muted small">aet</span>':''}`:'vs';
  return `<div class="li click" data-a="openFixture" data-id="${f.id}">${res}${crest(Sx(me>=0?opp:f.h),22)}<div class="grow trunc">${me>=0?`${me===0?'vs':'at'} ${esc(Sx(opp).name)}`:`${esc(Sx(f.h).town)} vs ${esc(Sx(f.a).town)}`}<div class="tiny muted">${esc(fixtureLabel(f))}${f.dir?' · directed':''}</div></div><b class="mono">${score}</b></div>`; }
function standingsMini(lvl='V'){ const C=App.C; const t=standings(C,lvl); return `<div class="card"><div class="hd"><h3>Section ${C.section} standings</h3><button class="btn sm ghost" data-a="go" data-r="league">Full table</button></div><div class="tw"><table><thead><tr><th>#</th><th>School</th><th class="n">P</th><th class="n">GD</th><th class="n">Pts</th></tr></thead><tbody>${t.map((r,i)=>`<tr class="${isUser(r.sid)?'me':''}"><td class="n">${i+1}</td><td><span class="row" style="gap:6px;flex-wrap:nowrap">${teamBadge(Sx(r.sid),26)}${sLink(r.sid,Sx(r.sid).town)}</span></td><td class="n">${r.p}</td><td class="n">${r.gd>0?'+':''}${r.gd}</td><td class="n"><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div></div>`; }
function prospectsCard(){ const C=App.C; const ps=[...squad(C,C.userSid,'JV'),...squad(C,C.userSid,'MOD')].sort((a,b)=>b.pot-a.pot||ovr(b)-ovr(a)).slice(0,6);
  return `<div class="card"><div class="hd"><div><h3>Top prospects</h3><span class="tiny muted">Potential · Varsity readiness grade</span></div><button class="btn sm ghost" data-a="go" data-r="dev">Evaluate</button></div><div class="list">${ps.map(p=>{ const ev=evaluate(C,p); return `<div class="li">${posTag(p.pos)}<div class="grow trunc">${pLink(p.id)}<div class="tiny muted">${LVL_NAME[p.lvl]} · Grade ${p.grade} · ${ftIn(p.h)}</div></div><span class="mono small muted">POT</span><b class="mono">${p.pot}</b><span class="grade" style="font-size:1.3rem;min-width:30px;text-align:right">${ev.letter}</span></div>`; }).join('')}</div></div>`; }
function newsCard(n=6){ const C=App.C; return `<div class="card"><div class="hd"><h3>School news</h3><button class="btn sm ghost" data-a="go" data-r="news">Newsroom</button></div><div class="list">${C.news.slice(0,n).map(newsRow).join('')||'<div class="muted small">No news yet.</div>'}</div></div>`; }
function newsRow(n){ return `<div class="li">${n.sid?crest(Sx(n.sid),18):''}<div class="grow small">${n.pid&&Px(n.pid)?`<button class="link" data-a="openPlayer" data-id="${n.pid}">${esc(n.text)}</button>`:n.fid&&App.C.fixtures[n.fid]?`<button class="link" data-a="openFixture" data-id="${n.fid}">${esc(n.text)}</button>`:esc(n.text)}<div class="tiny muted">${n.yr} · ${esc(n.type)}</div></div></div>`; }
function rivalryCard(){ const C=App.C; const row=(sid,lab)=>{ const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&f.comp!=='pre'&&((f.h===C.userSid&&f.a===sid)||(f.a===C.userSid&&f.h===sid))); const w=fx.filter(f=>f.w===C.userSid).length, l=fx.filter(f=>f.w===sid).length, d=fx.length-w-l; return `<div class="li">${crest(Sx(sid),30)}<div class="grow"><span class="pill" style="border-color:var(--bad)">${lab}</span> ${sLink(sid)}<div class="tiny muted">All-time Varsity: ${w}W ${d}D ${l}L</div></div></div>`; };
  return `<div class="card"><h3>Rivalries</h3><div class="list">${row(C.rivals.heated,'Heated rival')}${C.rivals.seasonal?row(C.rivals.seasonal,`${C.year} seasonal rival`):''}</div></div>`; }
VIEWS.office = ()=>{
  const C=App.C; const P=PREFS.panels;
  if(C.phase==='offseason') return offseasonView();
  if(typeof v15Overview==='function') return v15Overview();
  return `${P.next?nextMatchCard():''}${kpiStrip()}
  <div class="split"><div class="col">${P.lineup?checklistCard():''}<div class="grid g2">${P.dev?devCard():''}${P.miles?milestoneCard():''}</div>${P.recent?recentCard():''}${typeof pressBox==='function'?pressBox():''}${rivalryCard()}</div>
  <div class="col">${standingsMini()}${leadersCard()}${prospectsCard()}${newsCard()}<button class="btn sm ghost" data-a="panelsOpen" style="align-self:flex-end">Customize overview</button></div></div>`;
};
MODALS.panels = ()=> modalShell('<h2>Overview panels</h2>', [['next','Next match'],['lineup',"Coach's checklist"],['dev','Development alerts'],['miles','Upcoming milestones'],['recent','Recent results']].map(([k,l])=>`<label class="toggle"><input type="checkbox" data-c="panel" data-k="${k}" ${PREFS.panels[k]?'checked':''}> ${l}</label>`).join('')+'<p class="small muted">Standings, prospects, news and rivalries always show.</p>', `<button class="btn pri" data-a="closeModal">Done</button>`,'narrow');
function offseasonView(){
  const C=App.C; const yr=C.year; const T=C.tourneys[yr]||{}; const tab=standings(C,'V'); const pos=tab.findIndex(t=>isUser(t.sid))+1; const A=C.awards[yr];
  const seniors=schoolPlayers(C,C.userSid).filter(p=>p.grade>=12).sort((a,b)=>ovr(b)-ovr(a));
  const mine=A?Object.entries(A.list).filter(([k,a])=>a.sid===C.userSid):[];
  const al=A?[...A.al1,...A.al2].filter(id=>C.players[id]&&C.players[id].sid===C.userSid):[];
  return `<div class="hero"><span class="eyebrow" style="color:#fff">${yr} season complete</span><h1 style="margin-top:6px">${esc(Sx(C.userSid).town)} finished ${ordinal(pos)} in Section ${C.section}</h1>
   <p style="margin:.4em 0 0">${T.stChamp?`${esc(Sx(T.stChamp).name)} are state champions.`:''} ${T.secChamp?`Section title: ${esc(Sx(T.secChamp).name)}.`:''}</p>
   <div class="row" style="margin-top:14px"><button class="btn pri play" data-a="playNext">Start ${yr+1} season</button><button class="btn" data-a="go" data-r="awards">Awards</button><button class="btn" data-a="go" data-r="history" data-p='{"tab":"yearbook"}'>Yearbook</button></div></div>
  <div class="grid g2"><div class="card"><h3>Your award winners</h3><div class="list">${mine.map(([k,a])=>`<div class="li"><span class="pill">${esc(AWARD_NAME[k])}</span><div class="grow">${pLink(a.pid)}</div></div>`).join('')}${al.map(id=>`<div class="li"><span class="pill">All-League</span><div class="grow">${pLink(id)}</div></div>`).join('')||(!mine.length?'<div class="muted small">No individual honors this year.</div>':'')}</div></div>
  <div class="card"><h3>Senior class</h3><p class="small muted">These players graduate when the next season starts. Their careers, stats and honors stay in your history.</p><div class="list">${seniors.map(p=>`<div class="li">${posTag(p.pos)}<div class="grow">${pLink(p.id)} <span class="muted small">${LVL_NAME[p.lvl]}</span></div>${ovrBadge(ovr(p))}</div>`).join('')||'<div class="muted small">No seniors.</div>'}</div></div></div>
  <div class="grid g2">${newsCard(8)}${standingsMini()}</div>`;
}
const ordinal=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10<4?n%10:0]||'th');

/* ---------- SQUADS & LINEUPS ---------- */
function squadSid(){ const C=App.C; return (C.settings.manager && App.params.sid && Sx(App.params.sid)) ? App.params.sid : C.userSid; }
VIEWS.squads = ()=>{
  const C=App.C; const sid=squadSid(); const lvl=App.params.lvl||'V'; const tab=App.params.tab||'lineup';
  const schoolPick = C.settings.manager ? `<select data-c="squadSchool" aria-label="School">${opts([...C.league].map(id=>[id,Sx(id).name+(isUser(id)?' (you)':'')]),sid)}</select>` : '';
  return `<div class="row" style="justify-content:space-between">${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}<div class="row">${schoolPick}</div></div>
  ${tabs('tab',[['lineup','Lineup & tactics'],['roster','Roster']],tab)}
  ${tab==='lineup'?lineupEditor(sid,lvl):rosterTable(sid,lvl)}`;
};
function pitchLines(){ return `<svg class="lines" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".35"><rect x="1" y="1" width="66" height="98"/><path d="M1 50h66"/><circle cx="34" cy="50" r="8.7"/><rect x="13.8" y="1" width="40.4" height="15.7"/><rect x="24.8" y="1" width="18.4" height="5.2"/><rect x="13.8" y="83.3" width="40.4" height="15.7"/><rect x="24.8" y="93.8" width="18.4" height="5.2"/><path d="M26 16.7a8.7 8.7 0 0 0 16 0M26 83.3a8.7 8.7 0 0 1 16 0"/></g></svg>`; }
const TAC_PRESETS=[['bus','Park the Bus',{ment:15,tempo:30,press:20,pass:45},'Deep block, few risks'],['counter','Counter',{ment:35,tempo:80,press:35,pass:75},'Absorb, then break fast'],['bal','Balanced',{ment:50,tempo:50,press:50,pass:50},'No extremes'],['poss','Possession',{ment:60,tempo:30,press:55,pass:20},'Short passing, patience'],['press','All-Out Press',{ment:78,tempo:72,press:92,pass:40},'Win it high, attack fast']];
function formMini(form,on){ const tpl=FORMS[form]; return `<svg viewBox="0 0 40 56" aria-hidden="true"><rect x="1" y="1" width="38" height="54" rx="3" fill="none" stroke="currentColor" stroke-opacity=".35"/><path d="M1 28H39" stroke="currentColor" stroke-opacity=".25"/>${tpl.map(([r,x,y])=>`<circle cx="${2+x*0.36}" cy="${54-y*0.5}" r="2.3" fill="${r==='GK'?'#f5d142':'currentColor'}"/>`).join('')}</svg>`; }
function ringSVG(v,size=92){ const r=size/2-7, c=2*Math.PI*r, pct=clamp((v-40)/55,0,1); return `<svg class="sq-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${badgeColor(v)}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c*pct} ${c}" transform="rotate(-90 ${size/2} ${size/2})" style="filter:drop-shadow(0 0 6px ${badgeColor(v)}88)"/></svg>`; }
function lineupEditor(sid,lvl){
  const C=App.C; const lu=getLu(C,sid,lvl); const sch=Sx(sid); const ed=canEdit(sid);
  const v=validateLineup(C,sid,lvl); const sel=App.params.sel!=null?+App.params.sel:null;
  const xi=new Set(lu.slots.map(s=>s.pid)); const U=unitRatings(C,sid,lvl); const xr=R(xiRating(C,sid,lvl));
  const toks=lu.slots.map((s,i)=>{ const p=C.players[s.pid]; const mis=p&&p.pos!==ROLE_GROUP[s.role]; const cap=lu.caps.includes(s.pid); const e=p?R(eff(p,s.role)):0;
    return `<button class="tok ${sel===i?'sel':''} ${mis?'mis':''} ${p?'':'empty'}" data-slot="${i}" style="left:${s.x}%;top:${100-s.y}%;--fit:${p?badgeColor(e):'#666'}" aria-label="${esc(s.role)}: ${esc(p?pname(p):'empty')}${mis?', out of position':''}. Arrow keys move, Enter selects.">
      <span class="medal">${p?portraitSVG(p,52):'<span class="tok-plus">+</span>'}${cap?'<span class="cap" aria-hidden="true">C</span>':''}${p?`<span class="tok-ovr">${e}</span>`:''}</span><span class="nm">${p?`<i>${p.num}</i>`:''}${esc(p?p.ln:'Empty')}</span><span class="rl">${s.role}${mis?' ⚠':''}</span></button>`; }).join('');
  const sl=sel!=null?lu.slots[sel]:null; const sp=sl?C.players[sl.pid]:null;
  const benchAll=squad(C,sid,lvl).filter(p=>!xi.has(p.id));
  const bf=App.params.bf||'all';
  const bench=(bf==='all'?benchAll:benchAll.filter(p=>p.pos===bf)).sort((a,b)=> sl? eff(b,sl.role)-eff(a,sl.role) : GROUPS.indexOf(a.pos)-GROUPS.indexOf(b.pos)||ovr(b)-ovr(a));
  const tac=lu.tac; const strat=lu.strat||'balanced';
  const slider=(k,l,a,b)=>`<div class="slider-row"><label for="tac-${k}" class="lab">${l}</label><input type="range" id="tac-${k}" min="0" max="100" step="1" value="${tac[k]}" data-c="tac" data-k="${k}" ${ed?'':'disabled'}><span class="mono" id="tacv-${k}">${tac[k]}</span><div class="slider-ends"><span>${a}</span><span>${b}</span></div></div>`;
  const preset=TAC_PRESETS.find(([,,t])=>['ment','tempo','press','pass'].every(k=>Math.abs(t[k]-tac[k])<=2));
  const unit=(l,val)=>`<div class="sq-unit"><span>${l}</span><div class="bar"><i style="width:${clamp((val-40)/55,0.04,1)*100}%;background:${badgeColor(val)}"></i></div><b class="mono">${val?R(val):'—'}</b></div>`;
  const status = !v.ok ? `<span class="sq-status bad">⚠ ${v.issues.length} to fix before kickoff</span>` : v.warns.length ? `<span class="sq-status warn">● Ready · ${v.warns.length} out of position</span>` : `<span class="sq-status ok">✓ Match ready</span>`;
  const spotlight = sl ? (()=>{ const g=ROLE_GROUP[sl.role]; const e=sp?eff(sp,sl.role):0;
      const keys=g==='GK'?['gk','spd','pas']:g==='DEF'?['def','spd','pas','sta']:g==='MID'?['pas','sho','def','sta']:['sho','spd','pas'];
      const fits=benchAll.map(p=>({p,v:eff(p,sl.role)})).sort((a,b)=>b.v-a.v).slice(0,3);
      return `<div class="card sq-spot" style="--c1:${sch.c1};--c2:${sch.c2}"><div class="hd"><span class="eyebrow">Selected · ${esc(sl.role)} (${g})</span><button class="btn sm ghost" data-a="selSlot" data-i="">Done</button></div>
        ${sp?`<div class="spot-row"><span class="spot-face">${portraitSVG(sp,92)}</span><div class="grow"><h3 class="spot-name">${pLink(sp.id)}</h3><div class="row small">${posTag(sp.pos)}<span class="muted">#${sp.num} · Grade ${sp.grade}</span>${sp.pos!==g?'<span class="pill warn">Out of position</span>':''}</div>
          <div class="spot-bars">${keys.map(k=>`<div class="skill"><span>${SKILL_NAME[k]}</span><div class="bar"><i style="width:${sp.sk[k]}%;background:${badgeColor(sp.sk[k])}"></i></div><b class="mono">${R(sp.sk[k])}</b></div>`).join('')}</div></div>
          <div class="spot-ovr"><b style="color:${badgeColor(e)}">${R(e)}</b><span>as ${esc(sl.role)}</span></div></div>`:'<div class="muted">Empty slot. Pick someone below.</div>'}
        <div class="spot-ctl"><div class="field"><label for="rolesel">Role</label><select id="rolesel" data-c="role" ${ed?'':'disabled'}>${opts(Object.keys(ROLE_GROUP).map(r=>[r,r+' ('+ROLE_GROUP[r]+')']),sl.role)}</select></div>
          <div class="nudge" aria-label="Nudge position">${[['↑',0,4],['←',-4,0],['→',4,0],['↓',0,-4]].map(([l,dx,dy])=>`<button class="btn sm" data-a="nudge" data-dx="${dx}" data-dy="${dy}" aria-label="Move ${l}" ${ed?'':'disabled'}>${l}</button>`).join('')}</div></div>
        ${fits.length&&ed?`<div class="spot-fits"><span class="lab">Best options for ${esc(sl.role)}</span>${fits.map(({p,v:fv})=>{ const d=R(fv-e); return `<button class="fit" data-a="benchIn" data-id="${p.id}"><span class="fit-face">${portraitSVG(p,34)}</span><span class="grow trunc"><b>${esc(pname(p))}</b><small>${p.pos} · Gr ${p.grade}</small></span><b class="mono" style="color:${badgeColor(fv)}">${R(fv)}</b><span class="delta ${d>0?'up':d<0?'down':''}">${sp?(d>0?'+'+d:d):''}</span></button>`; }).join('')}</div>`:''}
      </div>`; })()
    : `<div class="card sq-tip"><div class="tip-ico">⇄</div><div><b>Build your XI</b><p class="small muted" style="margin:.2em 0 0">Tap a player on the pitch to see his ratings and the best replacements. Drag players to move them, drop one on a teammate to swap, or drag a bench card onto the pitch.</p></div></div>`;
  return `<div class="sq-hub" style="--c1:${sch.c1};--c2:${sch.c2}">
     <div class="sq-id">${logo(sch,64)}<div><div class="eyebrow">${LVL_NAME[lvl]} · ${lu.custom?'Custom shape':lu.form}</div><h2>${esc(sch.town)} <span class="sq-masc">${esc(sch.mascot)}</span></h2>${status}</div></div>
     <div class="sq-xi">${ringSVG(xr)}<div><b>${xr}</b><span>XI rating</span></div></div>
     <div class="sq-units">${unit('Attack',U.att)}${unit('Midfield',U.mid)}${unit('Defense',U.def)}${unit('Keeper',U.gk)}</div>
     <div class="sq-acts"><button class="btn sm pri" data-a="bestForm" ${ed?'':'disabled'}>Best formation</button><button class="btn sm" data-a="autoXI" ${ed?'':'disabled'}>Auto-pick XI</button><label class="toggle small"><input type="checkbox" data-c="snap" ${App.snap!==false?'checked':''}> Snap to grid</label></div>
   </div>
   ${!v.ok?`<div class="notice bad"><b>Fix before kickoff:</b> ${v.issues.map(esc).join(' ')}</div>`:''}
   ${App.params.why?`<div class="notice good small">${esc(App.params.why)}</div>`:''}
   <div class="sq-forms" role="group" aria-label="Formation">${Object.keys(FORMS).map(f=>`<button class="fchip ${!lu.custom&&lu.form===f?'on':''}" data-a="pickForm" data-f="${f}" aria-pressed="${!lu.custom&&lu.form===f}" ${ed?'':'disabled'}>${formMini(f)}<span>${f}</span></button>`).join('')}${lu.custom?'<span class="fchip on custom"><span>Custom</span></span>':''}</div>
   <div class="sq-grid">
   <div class="sq-pitchcol"><div class="pitchwrap" id="pitch" data-sid="${sid}" data-lvl="${lvl}"><div class="pitch-glow" aria-hidden="true"></div>${pitchLines()}${toks}</div>
     <p class="tiny muted" style="margin:.6em 0 0;text-align:center">Drag to reposition · drop on a teammate to swap · arrow keys nudge ${App.snap!==false?'(4% grid)':'(free)'}</p></div>
   <div class="col sq-side">
     ${spotlight}
     ${v.warns.length&&!sl?`<div class="notice warn small"><b>Role mismatches:</b> ${v.warns.map(esc).join(' ')}</div>`:''}
     <div class="card"><div class="hd"><h3>Bench</h3><div class="seg sm" role="group" aria-label="Filter bench">${[['all','All'],...GROUPS.map(g=>[g,g])].map(([k,l])=>`<button class="${bf===k?'on':''}" data-a="setParam" data-k="bf" data-v="${k}">${l}</button>`).join('')}</div></div>
       ${sl?`<p class="tiny muted" style="margin:0 0 8px">Sorted by fit for ${esc(sl.role)}.</p>`:''}
       <div class="bench">${bench.map(p=>{ const fv=sl?eff(p,sl.role):ovr(p); return `<div class="bcard ${p.susp?'susp':''} ${ed?'ed':''}" data-bench="${p.id}" ${ed?`data-a="benchIn" data-id="${p.id}" role="button" tabindex="0" aria-label="${sl?'Put '+esc(pname(p))+' in at '+esc(sl.role):'Start '+esc(pname(p))}"`:''}><span class="bc-face">${portraitSVG(p,48)}</span><span class="bc-txt"><b class="trunc">${esc(p.fn[0])}. ${esc(p.ln)}</b><small>${posTag(p.pos)} #${p.num} · Gr ${p.grade}${p.susp?' · susp.':''}</small></span><span class="bc-ovr" style="color:${badgeColor(fv)}">${R(fv)}</span>${ed?`<span class="bc-in" aria-hidden="true">${sl?'IN':'+'}</span>`:''}</div>`; }).join('')||'<div class="muted small">No one here.</div>'}</div></div>
     <div class="card"><h3>Tactics</h3><div class="presets">${TAC_PRESETS.map(([k,l,t,d])=>`<button class="preset ${preset&&preset[0]===k?'on':''}" data-a="tacPreset" data-k="${k}" ${ed?'':'disabled'}><b>${l}</b><span>${d}</span></button>`).join('')}</div>
       <div class="col" style="gap:10px;margin-top:12px">${slider('ment','Mentality','Defensive','Attacking')}${slider('tempo','Tempo','Patient','Direct & fast')}${slider('press','Pressing','Sit off','High press')}${slider('pass','Passing','Short','Long')}</div></div>
     <div class="card"><h3>Captains</h3><div class="grid g2">${[0,1].map(i=>`<div class="field"><label for="cap${i}">Captain ${i+1}</label><select id="cap${i}" data-c="captain" data-i="${i}" ${ed?'':'disabled'}>${opts(squad(C,sid,lvl).sort((a,b)=>a.ln.localeCompare(b.ln)).map(p=>[p.id,`${pname(p)} (Gr ${p.grade})`]),lu.caps[i])}</select></div>`).join('')}</div>${lu.caps[0]===lu.caps[1]?'<p class="bad small">Choose two different captains.</p>':''}</div>
     ${isUser(sid)?`<div class="card"><h3>Coaching strategy</h3><div class="optcards">${Object.entries(STRATS).map(([k,st])=>`<button class="opt ${strat===k?'on':''}" data-a="strat" data-k="${k}" aria-pressed="${strat===k}"><b>${esc(st.n)}</b><span>${esc(st.d)}</span></button>`).join('')}</div></div>`:''}
   </div></div>`;
}
const ROSTER_COLS=[
  ['num','#',p=>p.num,1],['name','Name',p=>p.ln+' '+p.fn,0],['pos','Pos',p=>GROUPS.indexOf(p.pos),0],['grade','Gr',p=>p.grade,1],['h','Ht',p=>p.h,1],
  ['ovr','OVR',p=>ovr(p),1],['pot','POT',p=>p.pot,1],['spd','SPD',p=>p.sk.spd,1],['sta','STA',p=>p.sk.sta,1],['sho','SHO',p=>p.sk.sho,1],['pas','PAS',p=>p.sk.pas,1],['def','DEF',p=>p.sk.def,1],['gk','GK',p=>p.sk.gk,1],['aggr','AGG',p=>p.aggr,1],
  ['gp','GP',p=>stat(p,'gp'),1],['g','G',p=>stat(p,'g'),1],['a','A',p=>stat(p,'a'),1],['sv','SV',p=>stat(p,'sv'),1],['rt','RTG',p=>{ const b=seasonBucket(p,App.C.year,p.lvl,'reg'); return b&&b.gp?b.rt/b.gp:null; },1]
];
function stat(p,k){ const b=seasonBucket(p,App.C.year,p.lvl,'reg'); return b?b[k]:null; }
function sortList(list){ const keys=App.sort||[{k:'ovr',d:-1}]; const cols=Object.fromEntries(ROSTER_COLS.map(c=>[c[0],c[2]]));
  return list.map(p=>({p,v:keys.map(s=>cols[s.k](p))})).sort((a,b)=>{ for(let i=0;i<keys.length;i++){ const x=a.v[i], y=b.v[i]; const xn=x==null, yn=y==null; if(xn&&yn) continue; if(xn) return 1; if(yn) return -1; if(x<y) return -keys[i].d; if(x>y) return keys[i].d; } return a.p.id<b.p.id?-1:1; }).map(x=>x.p); }
function rosterTable(sid,lvl){
  const C=App.C; const f=App.filt||{grade:'all',grp:'all'};
  let list=squad(C,sid,lvl).filter(p=>(f.grade==='all'||p.grade===+f.grade)&&(f.grp==='all'||p.pos===f.grp));
  list=sortList(list); const keys=App.sort||[{k:'ovr',d:-1}]; const lu=getLu(C,sid,lvl); const xi=new Set(lu.slots.map(s=>s.pid));
  const grades=[...new Set(squad(C,sid,lvl).map(p=>p.grade))].sort();
  const th=c=>{ const i=keys.findIndex(s=>s.k===c[0]); return `<th class="sort ${c[3]?'n':''}" data-a="sortBy" data-k="${c[0]}" tabindex="0" aria-sort="${i===0?(keys[0].d>0?'ascending':'descending'):'none'}">${c[1]}${i>=0?` <span class="si">${keys[i].d>0?'▲':'▼'}${keys.length>1?i+1:''}</span>`:''}</th>`; };
  const cell=(p,c)=>{ const v=c[2](p); if(c[0]==='name') return `<td>${pLink(p.id)}${xi.has(p.id)?' <span class="pill">XI</span>':''}${lu.caps.includes(p.id)?' <span class="pill">C</span>':''}${p.plan&&p.plan.breakout&&isUser(sid)?' <span class="pill" style="border-color:var(--accent2)">Breakout</span>':''}</td>`; if(c[0]==='pos') return `<td>${posTag(p.pos)}</td>`; if(c[0]==='h') return `<td class="n">${ftIn(p.h)}</td>`; if(c[0]==='ovr') return `<td class="n">${ovrBadge(v)}</td>`; if(c[0]==='rt') return `<td class="n">${v==null?'—':fmt1(v)}</td>`; return `<td class="n">${v==null?'—':R(v)}</td>`; };
  const rv=App.params.rv||'table';
  const head=`<div class="row" style="justify-content:space-between"><div class="row"><span class="lab">Grade</span>${seg('fgrade',[['all','All'],...grades.map(g=>[g,g])],f.grade)}<span class="lab">Position</span>${seg('fgrp',[['all','All'],...GROUPS.map(g=>[g,g])],f.grp)}</div>${seg('rv',[['table','Table'],['cards','Cards']],rv)}</div>`;
  if(rv==='cards') return head+`<p class="tiny muted" style="margin:0">Sorted by ${esc((ROSTER_COLS.find(c=>c[0]===keys[0].k)||[])[1]||'OVR')}. Switch to Table to change the sort.</p><div class="cards">${list.map(p=>playerCard(p)).join('')||'<div class="empty">No players match these filters.</div>'}</div>`;
  return head+`<div class="tiny muted" style="text-align:right">Click a heading to sort; Shift-click to add a second sort. Blank values sort last.</div>
  <div class="tw tall"><table><thead><tr>${ROSTER_COLS.map(th).join('')}${canEdit(sid)?'<th>Move</th>':''}</tr></thead><tbody>${list.map(p=>`<tr>${ROSTER_COLS.map(c=>cell(p,c)).join('')}${canEdit(sid)?`<td>${moveMenu(p)}</td>`:''}</tr>`).join('')||`<tr><td colspan="20" class="muted">No players match these filters.</td></tr>`}</tbody></table></div>`;
}
function moveMenu(p){ const choices=LVLS.filter(l=>l!==p.lvl&&eligible(p,l)); if(!choices.length) return '<span class="muted tiny">—</span>'; return `<select data-c="move" data-id="${p.id}" aria-label="Move ${esc(pname(p))}"><option value="">Move…</option>${choices.map(l=>`<option value="${l}">${LVL_NAME[l]}</option>`).join('')}</select>`; }

/* ---------- PLAYER DEVELOPMENT ---------- */
VIEWS.dev = ()=>{
  const C=App.C; const u=C.userSid;
  const evals=[...squad(C,u,'JV'),...squad(C,u,'MOD')].map(p=>({p,e:evaluate(C,p)})).sort((a,b)=>b.e.score-a.e.score);
  const all=schoolPlayers(C,u).map(p=>({p,d:ovr(p)-(p.ovr0[C.year]??ovr(p))})).sort((a,b)=>b.d-a.d);
  return `<div class="card"><h3>Training focus</h3><p class="small muted" style="margin-top:0">Applies to every squad each matchday. Most growth still happens in the offseason, shaped by each player's development profile and potential.</p><div class="optcards">${Object.entries(TRAINING).map(([k,l])=>`<button class="opt ${C.training===k?'on':''}" data-a="training" data-k="${k}" aria-pressed="${C.training===k}"><b>${esc(l)}</b><span>${esc({balanced:'Even gains across each player\'s position profile.',attacking:'Shooting and speed get extra work.',defending:'Defending and goalkeeping get extra work.',possession:'Passing and stamina get extra work.',fitness:'Stamina and pace get extra work.',youth:'JV and Modified gain more; Varsity a little less.'}[k])}</span></button>`).join('')}</div></div>
  <div class="split"><div class="card"><div class="hd"><h3>Varsity readiness</h3><span class="small muted">JV & Modified, best first</span></div>
   <div class="tw tall"><table><thead><tr><th>Grade</th><th>Player</th><th>Pos</th><th>Squad</th><th class="n">Gr</th><th class="n">OVR</th><th class="n">POT</th><th>Ht → proj.</th><th>Recommendation</th><th></th></tr></thead><tbody>
   ${evals.map(({p,e})=>`<tr><td><span class="grade" style="font-size:1.4rem">${e.letter}</span></td><td>${pLink(p.id)}${p.plan&&p.plan.breakout?' <span class="pill" style="border-color:var(--accent2)">Breakout</span>':''}</td><td>${posTag(p.pos)}</td><td>${LVL_NAME[p.lvl]}</td><td class="n">${p.grade}</td><td class="n">${ovrBadge(ovr(p))}</td><td class="n">${p.pot}</td><td class="mono small">${ftIn(p.h)} → ${ftIn(p.ah)}</td><td class="small" style="white-space:normal;min-width:180px">${esc(e.rec)}</td><td>${eligible(p,'V')?`<button class="btn sm" data-a="promote" data-id="${p.id}" data-to="V">To Varsity</button>`:''}${p.lvl==='MOD'&&eligible(p,'JV')?` <button class="btn sm ghost" data-a="promote" data-id="${p.id}" data-to="JV">To JV</button>`:''}</td></tr>`).join('')}</tbody></table></div>
   <p class="tiny muted">Promoting a Modified player brings in a new seventh-grade recruit. Promoting a JV player moves the best eligible Modified player at that position up to JV and adds a recruit, so every squad keeps its depth and goalkeepers.</p></div>
  <div class="col"><div class="card"><h3>Biggest risers this season</h3><div class="list">${all.slice(0,10).map(({p,d})=>`<div class="li">${posTag(p.pos)}<div class="grow trunc">${pLink(p.id)} <span class="tiny muted">${LVL_NAME[p.lvl]}</span></div><span class="mono ${d>0?'good':'muted'}">${d>0?'+':''}${fmt1(d)}</span>${ovrBadge(ovr(p))}</div>`).join('')}</div></div>
  <div class="card"><h3>How development works</h3><ul class="small muted" style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:4px"><li><b>Steady</b> players improve a little every year; <b>rapid</b> learners faster; <b>streaky</b> ones are unpredictable.</li><li>Each season two JV and two Modified players in your program are flagged for a breakout.</li><li>Late bloomers grow taller in 10th and 11th grade. Height never shrinks.</li><li>Nobody passes his potential. A stalled season happens to roughly one in nine players.</li></ul></div></div></div>`;
};

/* ---------- SCHEDULE ---------- */
VIEWS.schedule = ()=>{
  const C=App.C; const lvl=App.params.lvl||'V'; const showPre = C.phase==='preseason' || (C.phase==='regular'&&C.md===0);
  const fx=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.lvl===lvl);
  const pre=fx.filter(f=>f.comp==='pre').sort((a,b)=>a.rd-b.rd);
  let html=`<div class="row" style="justify-content:space-between">${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}${C.phase==='preseason'?'<button class="btn" data-a="skipPre">Skip preseason</button>':''}</div>`;
  if(showPre && lvl==='V') html+=`<div class="card"><h3>Preseason Cup</h3><p class="small muted" style="margin-top:0">Three friendlies to test lineups. They give small development boosts, count only in preseason stats, and never touch league standings or records.</p><div class="list">${pre.map(f=>resultRow(f)).join('')}</div></div>`;
  const rounds={}; for(const f of fx.filter(f=>f.comp==='reg')) (rounds[f.rd]=rounds[f.rd]||[]).push(f);
  html+=`<div class="grid g2">${Object.keys(rounds).sort((a,b)=>a-b).map(rd=>{ const cur=C.phase==='regular'&&+rd===C.md; return `<div class="card" ${cur?'style="border-color:var(--accent)"':''}><div class="hd"><h3>Matchday ${+rd+1}</h3>${cur?'<span class="chip acc">Next up</span>':''}</div><div class="list">${rounds[rd].map(f=>{ const mine=f.h===C.userSid||f.a===C.userSid; return `<div class="li click" data-a="openFixture" data-id="${f.id}" ${mine?'style="background:color-mix(in srgb,var(--accent) 8%,transparent)"':''}>${crest(Sx(f.h),18)}<div class="grow trunc small">${esc(Sx(f.h).town)} <span class="muted">vs</span> ${esc(Sx(f.a).town)}${isRivalry(C,f.h,f.a)?' <span class="pill" style="border-color:var(--bad)">Rivalry</span>':''}</div><b class="mono">${f.st==='d'?`${f.hg}–${f.ag}`:'—'}</b>${crest(Sx(f.a),18)}</div>`; }).join('')}</div></div>`; }).join('')}</div>`;
  const post=fx.filter(f=>['sec','rgn','st'].includes(f.comp)).sort((a,b)=>fxOrder(a)-fxOrder(b));
  if(post.length) html+=`<div class="card"><h3>Postseason</h3><div class="list">${post.map(f=>resultRow(f,f.h===C.userSid||f.a===C.userSid?C.userSid:f.h)).join('')}</div></div>`;
  return html;
};

/* ---------- LEAGUE & RANKINGS ---------- */
VIEWS.league = ()=>{
  const C=App.C; const tab=App.params.tab||'table';
  let body='';
  if(tab==='table'){ const lvl=App.params.lvl||'V'; const t=standings(C,lvl);
    body=`${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}<div class="tw"><table><thead><tr><th class="n">#</th><th>School</th><th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GF</th><th class="n">GA</th><th class="n">GD</th><th class="n">Pts</th><th>Form</th><th class="n">Win streak</th></tr></thead><tbody>${t.map((r,i)=>`<tr class="${isUser(r.sid)?'me':''}"><td class="n">${i+1}</td><td><span class="row" style="flex-wrap:nowrap;gap:8px">${teamBadge(Sx(r.sid),34)}${sLink(r.sid)}</span></td><td class="n">${r.p}</td><td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf}</td><td class="n">${r.ga}</td><td class="n">${r.gd>0?'+':''}${r.gd}</td><td class="n pts"><b>${r.pts}</b></td><td><span class="pips">${r.form.map(x=>`<i class="pip ${x}">${x}</i>`).join('')}</span></td><td class="n">${r.streak||''}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">3 points for a win, 1 for a draw. Ties broken by points, goal difference, goals scored, then school name.</p>`; }
  else if(tab==='leaders'){ const st=App.params.st||'g'; const lvl=App.params.ll||'V'; const L=leaders(C,st,C.year,lvl,10); const lab={g:'Goals',a:'Assists',sv:'Saves',def:'Tackles + interceptions + clearances',cards:'Cards (red counts 2)',rt:'Avg match rating (3+ games)'};
    const val=x=>st==='rt'?fmt1(x.v):x.v; const sub=x=>{ const b=x.b; if(!b) return ''; return st==='g'?`${b.gp} GP · ${b.a} A`:st==='a'?`${b.gp} GP · ${b.g} G`:st==='sv'?`${b.gp} GP · ${b.cs} CS`:st==='def'?`${b.tk} TK · ${b.int} INT · ${b.cl} CL`:st==='rt'?`${b.gp} GP · ${b.g} G · ${b.a} A`:`${b.y} YC · ${b.r} RC`; };
    const pod=L.slice(0,3), rest=L.slice(3);
    const podium=pod.length?`<div class="ld-podium">${[1,0,2].filter(i=>pod[i]).map(i=>{ const x=pod[i]; const sc=Sx(x.p.sid); return `<div class="ld-pod p${i+1} ${isUser(x.p.sid)?'mine':''}" style="--c1:${sc.c1};--c2:${sc.c2}" data-a="openPlayer" data-id="${x.p.id}"><span class="ld-rank">${i+1}</span><span class="ld-face">${portraitSVG(x.p,i===0?96:76)}</span><b class="ld-name">${esc(pname(x.p))}</b><span class="ld-sch">${crest(sc,16)} ${esc(sc.town)} · ${x.p.pos} · Gr ${x.p.grade}</span><span class="ld-val">${val(x)}</span><small>${esc(sub(x))}</small></div>`; }).join('')}</div>`:'';
    body=`<div class="row" style="justify-content:space-between">${seg('ll',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}${seg('st',Object.entries(lab).map(([k,l])=>[k,l.split(' (')[0].split(' + ')[0]==='Tackles'?'Defense':l.split(' (')[0]]),st)}</div>
     <div class="card ld-card"><div class="hd"><h3>${esc(lab[st])}</h3><span class="pill">${LVL_NAME[lvl]} · ${C.year} regular season</span></div>
     ${podium}
     <div class="list">${rest.map((x,i)=>`<div class="li ${isUser(x.p.sid)?'hl':''}"><b class="mono" style="width:22px">${i+4}</b><span class="ld-mini">${portraitSVG(x.p,30)}</span>${crest(Sx(x.p.sid),18)}<div class="grow trunc">${pLink(x.p.id)} <span class="tiny muted">${esc(Sx(x.p.sid).town)} · ${x.p.pos} · Gr ${x.p.grade}</span></div><span class="tiny muted mono">${esc(sub(x))}</span><b class="mono" style="width:40px;text-align:right">${val(x)}</b></div>`).join('')}</div>
     ${!L.length?`<div class="empty">No ${LVL_NAME[lvl]} league games played yet this season.</div>`:''}
     <p class="tiny muted">${lvl==='V'?'Varsity regular season only.':`${LVL_NAME[lvl]} regular season. Players promoted mid-season keep the stats they built at this level.`}</p></div>`; }
  else if(tab==='rank'){ const m=App.params.m||'ovr'; const rows=teamRankings(C).filter(r=>m!=='rt'||r.rt!=null).sort((a,b)=>(b[m]??-1)-(a[m]??-1)); const lab={ovr:'Overall (starting XI)',off:'Offense (forwards)',mid:'Midfield',def:'Defense (defenders & GK)',rt:'Average match rating'};
    body=`${seg('m',Object.entries(lab).map(([k,l])=>[k,l.split(' (')[0]]),m)}<div class="card"><h3>${lab[m]}</h3><div class="list">${rows.map((r,i)=>`<div class="li"><b class="mono" style="width:22px">${i+1}</b>${teamBadge(Sx(r.sid),28)}<div class="grow">${sLink(r.sid)}</div><div style="width:min(240px,35vw)" class="bar"><i style="width:${clamp((r[m]-(m==='rt'?5:40))/(m==='rt'?3.5:55)*100,2,100)}%"></i></div><b class="mono" style="width:44px;text-align:right">${fmt1(r[m])}</b></div>`).join('')}</div><p class="tiny muted">Ratings use each school's current Varsity starting XI and position fit. Showing all ${rows.length} league schools.</p></div>`; }
  else { body=`<div class="grid g3">${C.league.map(sid=>{ const s=Sx(sid); const co=C.coaches[s.coachId]; return `<div class="card click" data-a="openSchool" data-id="${sid}" style="cursor:pointer"><div class="row">${crest(s,46)}<div class="grow"><h3>${esc(s.name)}</h3><div class="small muted">${esc(s.mascot)} · Coach ${esc(co.name)} (${esc(co.pers)})</div></div></div><div class="row small" style="margin-top:8px"><span class="chip">XI ${R(xiRating(C,sid,'V'))}</span><span class="chip">${esc(effStadium(s).name)}</span></div></div>`; }).join('')}</div>`; }
  return tabs('tab',[['table','Standings'],['leaders','Leaders'],['rank','Rankings'],['schools','Schools']],tab)+body;
};

/* ---------- RECORD BOOK ---------- */
const REC_STATS=[['g','Goals'],['a','Assists'],['sv','Saves'],['tk','Tackles'],['cl','Clearances'],['int','Interceptions'],['y','Yellow cards'],['r','Red cards']];
VIEWS.records = ()=>{
  const C=App.C; const scope=App.params.scope||'league'; const kind=App.params.kind||'game'; const st=App.params.st||'g'; const sid=scope==='school'?(App.params.sid&&Sx(App.params.sid)?App.params.sid:C.userSid):null;
  let rows='', note='';
  const who=e=>{ const p=Px(e.pid); return `${pLink(e.pid)} <span class="tiny muted">${esc(Sx(e.sid)?Sx(e.sid).town:'')}${p&&C.alumni[p.id]?' · Class of '+C.alumni[p.id].gradYr:''}</span>`; };
  if(kind==='game'){ const L=sid?((C.rec.gameSchool[sid]||{})[st]||[]):(C.rec.game[st]||[]); rows=L.map((e,i)=>`<tr><td class="n">${i+1}</td><td>${who(e)}</td><td class="n"><b>${e.v}</b></td><td>${e.yr}</td><td>vs ${esc(Sx(e.opp)?Sx(e.opp).town:'')} · ${fLink(e.fid,esc(COMP_NAME[e.comp]))}</td></tr>`).join(''); note='Single game: Varsity league and postseason games (labeled). Preseason Cup games are excluded.'+(sid?' Top 5 kept per school.':' Top 10 kept league-wide.'); }
  else if(kind==='season'){ const L=seasonRecords(C,st,sid); rows=L.map((e,i)=>`<tr><td class="n">${i+1}</td><td>${who(e)}</td><td class="n"><b>${e.v}</b></td><td>${e.yr}</td><td>Regular season</td></tr>`).join(''); note='Single season: Varsity regular-season statistics only. Preseason and postseason are excluded.'; }
  else if(kind==='career'){ const L=careerRecords(C,st,sid); rows=L.map((e,i)=>`<tr><td class="n">${i+1}</td><td>${who(e)}</td><td class="n"><b>${e.v}</b></td><td>—</td><td>Career</td></tr>`).join(''); note='Career: Varsity regular season plus postseason. Preseason excluded.'; }
  else { const L=teamSeasonRecords(C,sid); rows=L.map((e,i)=>`<tr><td class="n">${i+1}</td><td>${crest(Sx(e.sid),16)} ${sLink(e.sid)}</td><td class="n"><b>${e.pts}</b> pts</td><td>${e.yr}${e.live?' (in progress)':''}</td><td class="mono">${e.w}-${e.d}-${e.l}, ${e.gf}:${e.ga}</td></tr>`).join(''); note='Best Varsity regular seasons ranked by points, then goal difference, goals scored, and earlier year.'; }
  return `<div class="row" style="justify-content:space-between">${seg('scope',[['league','League'],['school','School']],scope)}${scope==='school'?`<select data-c="param" data-k="sid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name]),sid)}</select>`:''}</div>
  ${tabs('kind',[['game','Single game'],['season','Single season'],['career','Career'],['team','Team seasons']],kind)}
  ${kind!=='team'?seg('st',REC_STATS,st):''}
  <div class="tw"><table><thead><tr><th class="n">#</th><th>${kind==='team'?'School':'Player'}</th><th class="n">Value</th><th>Year</th><th>Detail</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="muted">No records yet. Play some games.</td></tr>'}</tbody></table></div><p class="tiny muted">${note}</p>`;
};

/* ---------- POSTSEASON ---------- */
function bracketHtml(T, yr){
  const C=App.C; const col=(title,ids)=>`<div class="bcol"><h4>${title}</h4>${(ids||[]).map((id,i)=>{ const f=C.fixtures[id]; if(!f) return ''; const tm=sid=>{ const s=Sx(sid); const w=f.st==='d'&&f.w===sid; return `<div class="bt ${w?'w':''} ${isUser(sid)?'u':''}">${teamBadge(s,24)}<span class="grow trunc">${C.post&&C.post.seed&&C.post.seed[sid]&&yr===C.year?`<span class="muted mono tiny">${C.post.seed[sid]}</span> `:''}${esc(s.town)}</span><b class="mono">${f.st==='d'?(sid===f.h?f.hg:f.ag):''}${f.pk?`<span class="tiny muted">(${sid===f.h?f.pk[0]:f.pk[1]})</span>`:''}</b></div>`; }; return `<div class="bm ${isUser(f.h)||isUser(f.a)?'um':''} ${f.st==='d'?'done':''}" data-a="openFixture" data-id="${id}" style="animation-delay:${i*80}ms">${tm(f.h)}${tm(f.a)}</div>`; }).join('')||'<div class="muted small">TBD</div>'}</div>`;
  const sec=T.sec||[]; const st=T.st||[];
  return `<div class="card"><h3>Section ${C.section} Sectionals</h3><div class="bracket">${col('Quarterfinals',sec[0])}${col('Semifinals',sec[1])}${col('Final',sec[2])}</div></div>
  <div class="card"><h3>Regional & State</h3><div class="bracket">${col('Regional final',T.rgn?[T.rgn]:[])}${col('State quarterfinals',st[0])}${col('State semifinals',st[1])}${col('State final',st[2])}</div></div>`;
}
/* Road to State: the user's journey, the trophies at stake, and the brackets */
function roadNodes(C,P,u){
  P=P||{}; const sec=P.sec||[], st=P.st||[];
  const defs=[['Sectional','Quarterfinal',sec[0]],['Sectional','Semifinal',sec[1]],['Sectional','Final',sec[2],'section'],['Regional','Final',P.rgn?[P.rgn]:null,'regional'],['State','Quarterfinal',st[0]],['State','Semifinal',st[1]],['State','Final',st[2],'state']];
  let out=false; const nodes=[];
  for(const [stage,round,ids,trophy] of defs){ const f=(ids||[]).map(id=>C.fixtures[id]).find(f=>f&&(f.h===u||f.a===u));
    let state='locked', opp=null, score='';
    if(f){ opp=f.h===u?f.a:f.h; if(f.st==='d'){ const won=f.w===u; state=won?'won':'lost'; const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; score=`${us}–${th}${f.pk?` (${f.h===u?f.pk[0]:f.pk[1]}–${f.h===u?f.pk[1]:f.pk[0]} pens)`:''}`; if(!won) out=true; } else state='next'; }
    else if(out) state='out';
    nodes.push({stage,round,trophy,state,opp,score,fid:f&&f.id}); }
  return nodes;
}
VIEWS.post = ()=>{
  const C=App.C; const u=C.userSid; const me=Sx(u); const P=C.post;
  const nodes=roadNodes(C,P,u); const next=nodes.find(n=>n.state==='next'); const lost=nodes.find(n=>n.state==='lost'); const champ=P&&P.stChamp===u;
  const tro={section:{n:'Section Plaque',d:`Section ${C.section} champions`},regional:{n:'Regional Cup',d:'Beat the Section 6 champion'},state:{n:'State Crown',d:`${C.stateName} champions`}};
  const wonT=k=>nodes.find(n=>n.trophy===k&&n.state==='won');
  let status, sub;
  if(champ){ status='State Champions'; sub=`${esc(me.name)} are the best team in ${esc(C.stateName)}. This one goes in the trophy case forever.`; }
  else if(!P){ const t=standings(C,'V'); const pos=t.findIndex(r=>r.sid===u)+1; const left=Math.max(0,14-C.md); status=`Projected #${pos} seed`; sub=`${left} league ${left===1?'game':'games'} left. Every team in the section makes the bracket, but the top seeds earn home games and a softer road.`; }
  else if(lost){ status=`Eliminated · ${lost.stage} ${lost.round}`; sub=`Knocked out by ${esc(Sx(lost.opp).name)} (${esc(lost.score)}). ${P.stChamp?`${esc(Sx(P.stChamp).name)} won the state title.`:'The tournament continues without you.'}`; }
  else if(next){ status=`Alive · ${next.stage} ${next.round}`; sub=`Next: ${esc(Sx(next.opp).name)}. Win and advance. Lose and the season is over.`; }
  else { status='Waiting on the draw'; sub='The next round will be set when the other games finish.'; }
  const seed=P&&P.seed&&P.seed[u];
  const road=`<div class="road">${nodes.map((n,i)=>`<div class="rn ${n.state} ${n.trophy?'t':''}" style="--i:${i}">
      <div class="rn-dot">${n.state==='won'?'✓':n.state==='lost'?'✕':n.state==='next'?'▶':i+1}</div>
      <div class="rn-txt"><span class="rn-stage">${n.stage}</span><b>${n.round}</b>${n.opp?`<span class="rn-opp" ${n.fid?`data-a="openFixture" data-id="${n.fid}"`:''}>${crest(Sx(n.opp),16)} ${esc(Sx(n.opp).town)}${n.score?` · <span class="mono">${esc(n.score)}</span>`:''}</span>`:`<span class="rn-opp muted">${n.state==='out'?'—':'TBD'}</span>`}</div>
      ${n.trophy?`<div class="rn-trophy ${wonT(n.trophy)?'lit':''}" title="${tro[n.trophy].n}">${trophySVG(n.trophy,me)}<span>${tro[n.trophy].n}</span></div>`:''}</div>`).join('')}</div>`;
  let lower='';
  if(!P){ const t=standings(C,'V'); const seeds=[[0,7],[3,4],[2,5],[1,6]];
    lower=`<div class="grid g2"><div class="card"><h3>Seeding race</h3><div class="race">${t.map((r,i)=>`<div class="race-row ${r.sid===u?'u':''}"><span class="race-seed">${i+1}</span>${teamBadge(Sx(r.sid),28)}<span class="grow trunc">${sLink(r.sid)}</span><span class="mono">${r.pts} pts</span><span class="mono muted">${r.gd>0?'+':''}${r.gd}</span><span class="race-tag">${i<4?'Home QF':'Away QF'}</span></div>`).join('')}</div><p class="tiny muted">Seeds 1–4 host their quarterfinal. Top seed meets #8.</p></div>
     <div class="card"><h3>Projected quarterfinals</h3><div class="list">${seeds.map(([a,b])=>`<div class="li ${t[a].sid===u||t[b].sid===u?'hl':''}"><span class="mono muted">${a+1}</span>${crest(Sx(t[a].sid),20)}<div class="grow">${sLink(t[a].sid)} <span class="muted">vs</span> ${sLink(t[b].sid)}</div><span class="mono muted">${b+1}</span>${crest(Sx(t[b].sid),20)}</div>`).join('')}</div>
     <p class="small muted" style="margin:.8em 0 0">Knockout games go to two 10-minute extra-time periods, then a penalty shootout. State qualifiers are typically rated 83–91.</p></div></div>`; }
  else lower=bracketHtml({sec:P.sec, rgn:P.rgn, st:P.st}, C.year);
  return `<div class="rts ${champ?'champ':''} ${lost?'out':''}" style="--c1:${me.c1};--c2:${me.c2}">
    <div class="rts-bg" aria-hidden="true"></div>
    <div class="rts-head"><span class="rts-logo">${logo(me,110)}</span><div class="grow"><div class="rts-kicker">${C.year} · ${esc(C.stateName)} High School Championships</div><h2 class="rts-title">Road to State</h2><div class="rts-status">${status}${seed?` <span class="pill">#${seed} seed</span>`:''}</div><p class="rts-sub">${sub}</p></div>
     <div class="rts-cab">${['section','regional','state'].map(k=>`<div class="rts-t ${wonT(k)?'lit':''}">${trophySVG(k,me)}<span>${tro[k].n}</span><small>${wonT(k)?'Won':tro[k].d}</small></div>`).join('')}</div></div>
    ${road}</div>${lower}`;
};

/* ---------- AWARDS ---------- */
/* the numbers behind each award, from the season that earned it */
function awardStats(k,a,yr){
  const p=Px(a.pid); if(!p) return []; const st=(p.st||{})[yr]||{}; const reg=(st.V||{}).reg, post=(st.V||{}).post;
  const b=k==='tmvp'?post:k==='freshman'?(reg||(st.JV||{}).reg):reg; const rt=b&&b.gp?fmt1(b.rt/b.gp):'—';
  if(k==='breakout'){ const any=reg||(st.JV||{}).reg||(st.MOD||{}).reg; return [[`+${R(a.v||0)}`,'OVR gained'],[R(p.ovr!=null&&!p.sk?p.ovr:ovr(p)),'OVR now'],any&&any.gp?[any.gp,'Games']:[p.grade||'—','Grade']]; }
  if(!b) return [];
  const gk=p.pos==='GK';
  switch(k){
    case 'mvp': return gk?[[b.sv,'Saves'],[b.cs,'Clean sheets'],[rt,'Avg rating']]:[[b.g,'Goals'],[b.a,'Assists'],[rt,'Avg rating']];
    case 'scorer': return [[b.g,'Goals'],[b.gp?(b.g/b.gp).toFixed(2):'0','Per game'],[b.a,'Assists']];
    case 'playmaker': return [[b.a,'Assists'],[b.g,'Goals'],[rt,'Avg rating']];
    case 'dpoy': return [[b.tk,'Tackles'],[b.int,'Interceptions'],[b.cl,'Clearances']];
    case 'gk': return [[b.sv,'Saves'],[b.cs,'Clean sheets'],[b.gp,'Games']];
    case 'tmvp': return gk?[[b.sv,'Saves'],[b.cs,'Clean sheets'],[b.gp,'Playoff games']]:[[b.g,'Goals'],[b.a,'Assists'],[b.gp,'Playoff games']];
    case 'freshman': return [[b.g,'Goals'],[b.a,'Assists'],[rt,'Avg rating']];
    default: return gk?[[b.sv,'Saves'],[b.cs,'Clean sheets']]:p.pos==='DEF'?[[b.tk+b.int,'Tkl + Int'],[rt,'Rating']]:[[b.g,'Goals'],[b.a,'Assists']];
  }
}
function awardLine(k,a,yr){ const st=awardStats(k,a,yr); return st.length? st.map(([v,l])=>`${v} ${l.toLowerCase()}`).join(' · ') : ''; }
const statChips=st=>`<div class="aw-stats">${st.map(([v,l])=>`<span><b>${v}</b><small>${esc(l)}</small></span>`).join('')}</div>`;
VIEWS.awards = ()=>{
  const C=App.C; const years=Object.keys(C.awards).map(Number).sort((a,b)=>b-a); const yr=+(App.params.yr||years[0]||C.year); const A=C.awards[yr];
  const sel=years.length?`<select data-c="param" data-k="yr" aria-label="Season">${opts(years.map(y=>[y,y]),yr)}</select>`:'';
  if(!A) return `<div class="row">${sel}</div><div class="empty">Season awards are presented after the State final, whether or not your team is still playing.<br>One individual award per player per season; All-League selection counts as that award. Championships are team honors and don't use the slot.</div>`;
  const icon={mvp:'★',scorer:'⚑',playmaker:'➶',dpoy:'⛨',gk:'✋',tmvp:'♛',breakout:'↗',freshman:'✦'};
  const mvp=A.list.mvp; const mp=mvp&&Px(mvp.pid); const ms=mvp&&Sx(mvp.sid);
  const hero=mvp&&mp?`<div class="aw-hero ${isUser(mvp.sid)?'mine':''}" style="--c1:${ms.c1};--c2:${ms.c2}"><div class="aw-hero-bg" aria-hidden="true"></div>
     <span class="aw-hero-face">${portraitSVG(mp,170)}</span>
     <div class="aw-hero-txt"><span class="eyebrow">${yr} League MVP</span><h2>${pLink(mvp.pid)}</h2><div class="row small">${logo(ms,28)}<span>${esc(ms.name)} · ${mp.pos}</span>${isUser(mvp.sid)?'<span class="pill aw-you">Your program</span>':''}</div>${statChips(awardStats('mvp',mvp,yr))}</div>
     <div class="aw-hero-trophy">${trophySVG('state',ms)}</div></div>`:'';
  const card=(k)=>{ const a=A.list[k]; if(!a||k==='mvp') return ''; const p=Px(a.pid); const sc=Sx(a.sid); return `<div class="aw-card ${isUser(a.sid)?'mine':''}" style="--c1:${sc.c1};--c2:${sc.c2}"><div class="aw-top"><span class="aw-ico">${icon[k]||'★'}</span><span class="eyebrow">${esc(AWARD_NAME[k])}</span></div><div class="aw-who">${p?`<span class="aw-face">${portraitSVG(p,64)}</span>`:''}<div class="grow"><h3>${pLink(a.pid)}</h3><div class="small muted">${esc(sc.town)} · ${p?p.pos:''}</div></div>${logo(sc,34)}</div>${statChips(awardStats(k,a,yr))}</div>`; };
  const team=(ids,t)=>`<div class="card"><h3>${t}</h3><div class="aw-team">${ids.map(id=>{ const p=Px(id); const sc=p?Sx(p.sid):null; return `<div class="aw-row ${p&&isUser(p.sid)?'mine':''}">${p?`<span class="aw-mini">${portraitSVG(p,38)}</span>`:''}${posTag(p?p.pos:'MID')}<div class="grow trunc">${pLink(id)} <span class="tiny muted">${esc(sc?sc.town:'')}</span></div><span class="tiny mono muted">${p?esc(awardLine('al',{pid:id},yr)):''}</span></div>`; }).join('')}</div></div>`;
  return `<div class="row">${sel}<span class="small muted">Chosen by formula from regular-season Varsity stats (Tournament MVP uses the postseason). One award per player per season; All-League counts.</span>${years.length?`<button class="btn sm" data-a="awardsNight" data-y="${yr}" style="margin-left:auto">Replay Awards Night</button>`:''}</div>
  ${hero}
  <div class="aw-grid">${AWARD_ORDER.map(card).join('')}${A.coy?`<div class="aw-card ${isUser(A.coy.sid)?'mine':''}" style="--c1:${Sx(A.coy.sid).c1};--c2:${Sx(A.coy.sid).c2}"><div class="aw-top"><span class="aw-ico">♜</span><span class="eyebrow">Coach of the Year</span></div><div class="aw-who">${logo(Sx(A.coy.sid),52)}<div class="grow"><h3>${esc(C.coaches[A.coy.cid]?.name||'')}</h3><div class="small muted">${esc(Sx(A.coy.sid).name)}</div></div></div>${(()=>{ const t=standings(C,'V',yr).find(r=>r.sid===A.coy.sid); return t?statChips([[`${t.w}-${t.d}-${t.l}`,'Record'],[t.pts,'Points'],[(t.gd>0?'+':'')+t.gd,'Goal diff']]):''; })()}</div>`:''}</div>
  <div class="grid g2">${team(A.al1,'All-League First Team')}${team(A.al2,'All-League Second Team')}</div>`;
};


/* ---------- HISTORY ---------- */
VIEWS.history = ()=>{
  const C=App.C; const tab=App.params.tab||'results'; const years=[...new Set([C.year,...C.archives.map(a=>a.yr)])].sort((a,b)=>b-a);
  const yr=+(App.params.yr||(tab==='yearbook'||tab==='rosters'?(C.phase==='offseason'?C.year:(C.archives.length?C.archives[C.archives.length-1].yr:C.year)):C.year));
  let body='';
  if(tab==='results'){ const sid=App.params.sid&&Sx(App.params.sid)?App.params.sid:C.userSid; const lvl=App.params.lvl||'V'; needLogs(yr);
    const fx=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.lvl===lvl&&f.st==='d'&&(f.h===sid||f.a===sid)).sort((a,b)=>fxOrder(a)-fxOrder(b));
    body=`<div class="row"><select data-c="param" data-k="yr" aria-label="Season">${opts(years.map(y=>[y,y]),yr)}</select><select data-c="param" data-k="sid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name]),sid)}</select>${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}</div><div class="card"><div class="list">${fx.map(f=>resultRow(f,sid)).join('')||'<div class="muted small">No completed games.</div>'}</div><p class="tiny muted">Open any game for its full box score. Reports are read-only.</p></div>`; }
  else if(tab==='rosters'){ const sid=App.params.sid&&Sx(App.params.sid)?App.params.sid:C.userSid; const lvl=App.params.lvl||'V'; const arc=C.archives.find(a=>a.yr===yr);
    let rows, caps, form; if(arc&&arc.rosters[sid]){ const r=arc.rosters[sid][lvl]; rows=r.rows; caps=r.caps; form=r.form; } else if(yr===C.year){ const lu=getLu(C,sid,lvl); const xi=new Set(lu.slots.map(s=>s.pid)); rows=squad(C,sid,lvl).map(p=>({pid:p.id,n:pname(p),num:p.num,pos:p.pos,gr:p.grade,ovr:R(ovr(p)),pot:p.pot,xi:xi.has(p.id)})).sort((a,b)=>b.ovr-a.ovr); caps=lu.caps; form=lu.form; }
    body=`<div class="row"><select data-c="param" data-k="yr" aria-label="Season">${opts(years.map(y=>[y,y]),yr)}</select><select data-c="param" data-k="sid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name]),sid)}</select>${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}</div>
    ${rows?`<div class="card"><div class="hd"><h3>${esc(Sx(sid).name)} ${LVL_NAME[lvl]} · ${yr}</h3><span class="chip">${esc(form)}</span></div><div class="tw"><table><thead><tr><th class="n">#</th><th>Player</th><th>Pos</th><th class="n">Gr</th><th class="n">OVR</th><th class="n">POT</th><th>Role</th><th class="n">GP</th><th class="n">G</th><th class="n">A</th><th class="n">SV</th></tr></thead><tbody>${rows.map(r=>{ const p=Px(r.pid); const b=p&&p.st[yr]&&p.st[yr][lvl]&&p.st[yr][lvl].reg; return `<tr><td class="n">${r.num}</td><td>${pLink(r.pid,r.n)}</td><td>${posTag(r.pos)}</td><td class="n">${r.gr}</td><td class="n">${r.ovr}</td><td class="n">${r.pot}</td><td>${caps.includes(r.pid)?'<span class="pill">Captain</span> ':''}${r.xi?'Starter':'Squad'}</td><td class="n">${b?b.gp:0}</td><td class="n">${b?b.g:0}</td><td class="n">${b?b.a:0}</td><td class="n">${b?b.sv:0}</td></tr>`; }).join('')}</tbody></table></div><p class="tiny muted">${arc?'Snapshot taken at the end of the season.':'Current season, live.'}</p></div>`:'<div class="empty">No roster archived for that season yet.</div>'}`; }
  else if(tab==='yearbook'){ body=yearbook(yr, years); }
  else if(tab==='compare'){ body=compareView(); }
  else { const al=Object.values(C.alumni).filter(p=>p.sid===(App.params.sid||C.userSid)).sort((a,b)=>b.gradYr-a.gradYr||b.ovr-a.ovr);
    body=`<div class="row"><select data-c="param" data-k="sid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name]),App.params.sid||C.userSid)}</select></div><div class="tw"><table><thead><tr><th>Class</th><th>Player</th><th>Pos</th><th class="n">Final OVR</th><th>What's next (fictional)</th></tr></thead><tbody>${al.map(p=>`<tr><td>${p.gradYr}</td><td>${pLink(p.id)}</td><td>${posTag(p.pos)}</td><td class="n">${R(p.ovr)}</td><td>${esc(p.outcome)}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No graduates yet.</td></tr>'}</tbody></table></div>`; }
  return tabs('tab',[['results','Results'],['rosters','Rosters'],['yearbook','Yearbooks'],['compare','Compare players'],['alumni','Alumni']],tab)+body;
};
function yearbook(yr, years){
  const C=App.C; const arc=C.archives.find(a=>a.yr===yr); const T=C.tourneys[yr]; const A=C.awards[yr]; const u=C.userSid;
  if(!arc && !(yr===C.year&&C.phase==='offseason')) return `<div class="row"><select data-c="param" data-k="yr" aria-label="Season">${opts(years.map(y=>[y,y]),yr)}</select></div><div class="empty">The ${yr} yearbook is published when the season ends.</div>`;
  const stand = arc? arc.stand.V : standings(C,'V',yr);
  const fx=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.lvl==='V'&&f.st==='d'&&f.comp!=='pre'&&(f.h===u||f.a===u));
  const margin=f=>(f.h===u?f.hg-f.ag:f.ag-f.hg); const big=[...fx].sort((a,b)=>margin(b)-margin(a))[0]; const high=[...fx].sort((a,b)=>(b.hg+b.ag)-(a.hg+a.ag))[0];
  const grads=Object.values(C.alumni).filter(p=>p.sid===u&&p.gradYr===yr); const upcoming = yr===C.year? schoolPlayers(C,u).filter(p=>p.grade>=12):[];
  const roster = arc&&arc.rosters[u]? arc.rosters[u].V.rows : squad(C,u,'V').map(p=>({pid:p.id,n:pname(p),pos:p.pos,ovr:R(ovr(p)),gr:p.grade}));
  const pos=stand.findIndex(t=>t.sid===u)+1;
  const summary=`${yr} ${Sx(u).name} season: finished ${ordinal(pos)} in Section ${C.section}${T?`. Section champion: ${Sx(T.secChamp).name}. State champion: ${Sx(T.stChamp).name}`:''}. ${A?Object.entries(A.list).filter(([k,a])=>a.sid===u).map(([k,a])=>`${AWARD_NAME[k]}: ${pname(Px(a.pid))}`).join('; '):''}`;
  return `<div class="row"><select data-c="param" data-k="yr" aria-label="Season">${opts(years.map(y=>[y,y]),yr)}</select><button class="btn sm" data-a="copyText" data-t="${esc(summary)}">Copy season summary</button></div>
  <div class="hero"><span class="eyebrow" style="color:#fff">${yr} Yearbook</span><h1 style="margin-top:6px">${esc(Sx(u).name)}</h1><p style="margin:.3em 0 0">${ordinal(pos)} in Section ${C.section}${T?` · Section champion ${esc(Sx(T.secChamp).town)} · State champion ${esc(Sx(T.stChamp).name)}`:''}</p></div>
  <div class="grid g2"><div class="card"><h3>Final table</h3><div class="list">${stand.map((t,i)=>`<div class="li ${isUser(t.sid)?'':''}"><b class="mono" style="width:20px">${i+1}</b>${crest(Sx(t.sid),16)}<div class="grow">${sLink(t.sid)}</div><span class="mono small">${t.w}-${t.d}-${t.l}</span><b class="mono">${t.pts}</b></div>`).join('')}</div></div>
  <div class="card"><h3>Standout matches</h3><div class="list">${big?resultRow(big):''}${high&&high!==big?resultRow(high):''}${!big?'<div class="muted small">No league games.</div>':''}</div><h3 style="margin-top:14px">Awards</h3><div class="list">${A?Object.entries(A.list).map(([k,a])=>`<div class="li"><span class="pill">${esc(AWARD_NAME[k])}</span><div class="grow small">${pLink(a.pid)} · ${esc(Sx(a.sid).town)}</div></div>`).join(''):'<div class="muted small">Awards pending.</div>'}</div></div></div>
  <div class="grid g2"><div class="card"><h3>Varsity roster</h3><div class="list" style="max-height:340px;overflow:auto">${roster.map(r=>`<div class="li">${posTag(r.pos)}<div class="grow">${pLink(r.pid,r.n)}</div><span class="mono">${r.ovr}</span></div>`).join('')}</div></div>
  <div class="card"><h3>Graduating class</h3><div class="list">${grads.map(p=>`<div class="li">${posTag(p.pos)}<div class="grow">${pLink(p.id)}<div class="tiny muted">${esc(p.outcome)}</div></div></div>`).join('')}${upcoming.map(p=>`<div class="li">${posTag(p.pos)}<div class="grow">${pLink(p.id)}<div class="tiny muted">Graduates at season rollover</div></div></div>`).join('')||(!grads.length?'<div class="muted small">No graduates.</div>':'')}</div></div></div>`;
}

/* ---------- TOURNAMENT HISTORY ---------- */
VIEWS.tourneys = ()=>{
  const C=App.C; const yrs=Object.keys(C.tourneys).map(Number).sort((a,b)=>b-a); const yr=+(App.params.yr||0);
  if(yr&&C.tourneys[yr]){ needLogs(yr); return `<div class="row"><button class="btn sm" data-a="setParam" data-k="yr" data-v="">← All seasons</button><h2>${yr} postseason</h2></div>${bracketHtml(C.tourneys[yr],yr)}`; }
  if(!yrs.length) return '<div class="empty">Completed postseasons appear here with their full brackets.</div>';
  return `<div class="tw"><table><thead><tr><th>Season</th><th>Section ${C.section}</th><th>Regional</th><th>State champion</th><th>Runner-up</th><th></th></tr></thead><tbody>${yrs.map(y=>{ const T=C.tourneys[y]; return `<tr><td><b>${y}</b></td><td>${crest(Sx(T.secChamp),16)} ${sLink(T.secChamp)}</td><td>${sLink(T.rgnChamp)}</td><td>${crest(Sx(T.stChamp),16)} ${sLink(T.stChamp)}</td><td>${sLink(T.stRunner)}</td><td><button class="btn sm" data-a="setParam" data-k="yr" data-v="${y}">Bracket</button></td></tr>`; }).join('')}</tbody></table></div>`;
};

/* ---------- NEWSROOM ---------- */
VIEWS.news = ()=>{ const C=App.C; const t=App.params.nt||'all'; const types=[...new Set(C.news.map(n=>n.type))]; const list=C.news.filter(n=>t==='all'||n.type===t);
  return `${seg('nt',[['all','All'],...types.map(x=>[x,x[0].toUpperCase()+x.slice(1)])],t)}<div class="card"><div class="list">${list.map(newsRow).join('')||'<div class="muted">Nothing here yet.</div>'}</div></div>`; };

/* ---------- SCHOOL & STADIUM ---------- */
function trophyCase(s){ const H=s.honors||[]; const kind=l=>/State Champ/.test(l)?'state':/Regional/.test(l)?'regional':/Section/.test(l)?'section':null;
  const won=H.filter(h=>kind(h.label)).sort((a,b)=>b.yr-a.yr); const ru=H.filter(h=>/Runners-up/.test(h.label));
  const shelf=k=>{ const list=won.filter(h=>kind(h.label)===k); return `<div class="tc-slot ${list.length?'lit':''}">${trophySVG(k,s)}<b>${list.length||'—'}</b><span>${{section:'Section titles',regional:'Regional cups',state:'State crowns'}[k]}</span>${list.length?`<small>${list.map(h=>h.yr).join(' · ')}</small>`:'<small>Not yet</small>'}</div>`; };
  const RV=App.C.rivalry&&App.C.rivalry.holder===s.id&&s.id===App.C.userSid?App.C.rivalry:null;
  return `<div class="card trophycase" style="--c1:${s.c1};--c2:${s.c2}"><h3>Trophy case</h3><div class="tc-shelf" style="grid-template-columns:repeat(${RV?4:3},1fr)">${shelf('section')}${shelf('regional')}${shelf('state')}${RV?`<div class="tc-slot lit">${bootTrophySVG()}<b>🥾</b><span>${esc(RV.name)}</span><small>Rivalry trophy</small></div>`:''}</div>${ru.length?`<p class="tiny muted" style="margin:.6em 0 0">State runners-up: ${ru.map(h=>h.yr).join(', ')}</p>`:''}</div>`; }
VIEWS.school = ()=>{
  const C=App.C; const sid=(App.params.sid&&Sx(App.params.sid)&&C.settings.manager)?App.params.sid:C.userSid; const s=Sx(sid); const co=C.coaches[s.coachId]; const st=effStadium(s); const mine=isUser(sid);
  const recRows=Object.entries(co.rec).sort((a,b)=>b[0]-a[0]).map(([y,r])=>`<div class="li"><span class="mono">${y}</span><div class="grow"></div><span class="mono">${r.w}-${r.d}-${r.l}</span></div>`).join('');
  return `${C.settings.manager?`<div class="row"><span class="lab">Manager Mode · editing</span><select data-c="param" data-k="sid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name+(isUser(id)?' (you)':'')]),sid)}</select></div>`:''}
  <section class="sch-hero" style="--c1:${s.c1};--c2:${s.c2}"><div class="sch-art">${stadiumSVG(s,st)}</div>
   <div class="sch-id">${typeof v14Patch==='function'?v14Patch(s,112):logo(s,96)}<div class="grow"><h2>${esc(s.name)}</h2><div class="sch-meta">${esc(s.mascot)} · ${esc(C.stateName)} · Prestige ${s.prestige}</div>
    <div class="sch-ground"><b>${esc(st.name)}</b><span>${st.cap.toLocaleString()} seats</span><span>${st.surface==='turf'?'Synthetic turf':'Natural grass'}</span><span>${esc(STADIUM_TIERS[st.tier].n)}</span></div></div></div></section>
  <div class="grid g2" style="align-items:start"><div class="col">
   ${trophyCase(s)}
   ${mine||C.settings.manager?`<div class="card"><h3>Identity</h3><div class="grid g2">
     <div class="field"><label for="id-name">School name</label><input type="text" id="id-name" value="${esc(s.name)}" maxlength="48"></div>
     <div class="field"><label for="id-town">Short name</label><input type="text" id="id-town" value="${esc(s.town)}" maxlength="24"></div></div>
     <div class="field" style="margin-top:10px"><span class="lab">Mascot</span>${mascotPicker(s.mk,s.c1,s.c2,'idMascot',`data-s="${sid}"`)}</div>
     <div class="grid g2" style="margin-top:10px"><div class="field"><label for="id-mname">Team name</label><select id="id-mname">${opts(MASCOT_BY[s.mk].alt.map(x=>[x,x]),s.mascot)}</select></div>
     <div class="field"><span class="lab">Colors</span><div class="row"><input type="color" id="id-c1" value="${s.c1}" aria-label="Primary color"><input type="color" id="id-c2" value="${s.c2}" aria-label="Secondary color"></div></div></div>
     <div style="margin-top:8px">${swatchRow('idSwatch',`data-s="${sid}"`)}</div>
     ${mine?`<div class="field" style="margin-top:10px"><label for="id-coach">Coach name</label><input type="text" id="id-coach" value="${esc(co.name)}" maxlength="40"></div>`:''}
   <div class="row" style="margin-top:12px"><button class="btn pri" data-a="saveIdentity" data-id="${sid}">Save identity</button>${mine?'<button class="btn ghost" data-a="useSchoolColors">Use school colors for the app</button>':''}</div></div>`:''}
   <div class="card"><h3>Coach ${esc(co.name)}</h3><p class="small muted" style="margin-top:0">${esc(co.pers)}${co.user?'':` · ${esc((COACH_PERS.find(x=>x.k===co.pers)||{}).d||'')}`} · Coaching ability ${co.ab} · Titles ${co.titles}</p><div class="list">${recRows||'<div class="muted small">No Varsity games yet.</div>'}</div></div>
   <div class="card"><h3>Honors</h3><div class="list">${s.honors.slice().reverse().map(h=>`<div class="li"><span class="mono">${h.yr}</span><div class="grow">${esc(h.label)}</div></div>`).join('')||'<div class="muted small">No titles yet.</div>'}</div></div>
  </div><div class="col">
   <div class="card stadium"><div class="hd"><h3>Facilities</h3><span class="chip">Tier ${st.tier} of 4</span></div>
    <div class="tiers" style="margin-top:12px">${[1,2,3,4].map(t=>`<div class="tier ${st.tier===t?'on':''}"><b>Tier ${t}</b><div>${STADIUM_TIERS[t].n}</div><div class="tiny muted">${STADIUM_TIERS[t].min.toLocaleString()}–${STADIUM_TIERS[t].max.toLocaleString()}${t===4?'+':''}</div></div>`).join('')}</div>
    <p class="tiny muted">Organic tier ${s.stadium.tier}${s.stadium.ovr?' (Manager override active)':''}. Facilities are reviewed every ${s.stadium.every} seasons based on results and prestige; they can rise one tier per review and never downgrade. Surface is cosmetic and never affects match results. Home crowds give a small capped composure boost.</p></div>
   ${C.settings.manager?stadiumEditor(s,st):`<div class="notice small">Turn on Manager Mode in Settings to customize any stadium directly.</div>`}
  </div></div>`;
};
function stadiumEditor(s,st){ const f=(k,l,list)=>`<div class="field"><label for="se-${k}">${l}</label><select id="se-${k}" data-c="stadium" data-k="${k}">${opts(list,st[k])}</select></div>`;
  return `<div class="card"><div class="hd"><h3>Stadium overrides</h3><button class="btn sm" data-a="resetStadium" data-id="${s.id}">Reset to organic</button></div><div class="grid g2">
   <div class="field"><label for="se-name">Stadium name</label><input type="text" id="se-name" value="${esc(st.name)}" data-c="stadium" data-k="name" maxlength="48"></div>
   ${f('tier','Tier',[[1,'1 · Backyard Field'],[2,'2 · Athletic Park'],[3,'3 · Community Complex'],[4,'4 · District Stadium']])}
   ${f('surface','Surface',[['turf','Synthetic turf'],['grass','Natural grass']])}
   ${f('marks','Markings',[['soccer','Soccer only'],['multi','Multisport']])}
   <div class="field"><label for="se-markColor">Line color</label><input type="color" id="se-markColor" value="${st.markColor}" data-c="stadium" data-k="markColor"></div>
   ${f('track','Track',[['none','No track'],['red','Red track'],['blue','Blue track']])}
   ${f('goals','Goal frames',[['classic','Classic'],['box','Box frame'],['portable','Portable']])}
   ${f('lights','Lights',[['none','No lights'],['poles','Standard poles'],['towers','Light towers']])}
   ${f('stands','Stand color',[['primary','School primary'],['secondary','School secondary'],['neutral','Neutral grey']])}
   ${f('board','Scoreboard',[['led','Basic LED'],['video','Video board']])}
  </div></div>`; }

/* ---------- SETTINGS ---------- */
VIEWS.settings = ()=>{
  const C=App.C; const s=C.settings; const so=PREFS.sound;
  const vol=(k,l,m)=>`<div class="slider-row"><label class="lab" for="vol-${k}">${l}</label><input type="range" id="vol-${k}" min="0" max="1" step="0.05" value="${so[k]}" data-c="vol" data-k="${k}"><label class="toggle small"><input type="checkbox" data-c="mute" data-k="${m}" ${so[m]?'checked':''}> Mute</label></div>`;
  return `<div class="grid g2" style="align-items:start"><div class="col">
  <div class="card"><h3>Career rules (this save only)</h3><div class="col" style="gap:12px">
   <div class="field"><span class="lab">Difficulty</span>${seg('set_difficulty',[['easy','Easy'],['normal','Normal'],['hard','Hard']],s.difficulty)}<span class="tiny muted">Changes rival development speed and postseason opponent strength.</span></div>
   <div class="field"><span class="lab">Card frequency</span>${seg('set_cards',[['low','Rare'],['normal','Normal'],['strict','Strict referees']],s.cards)}</div>
   <div class="field"><span class="lab">Senior Night ceremony</span>${seg('set_senior',[['on','On'],['off','Off']],s.senior||'on')}<span class="tiny muted">Before your last regular-season home game, your seniors are honored one by one. Purely ceremonial.</span></div>
   <div class="field"><span class="lab">Pregame walkout & starting XI reveal</span>${seg('set_walkout',[['all','Every game'],['big','Big games only'],['off','Off']],s.walkout||'all')}<span class="tiny muted">Big games = postseason and Rivalry Night. The stadium announcer calls each starter's number, grade and name (volume under Sound). Tap during the other team's lineup to skip straight to yours; tap during yours to skip the rest.</span></div>
   <label class="toggle"><input type="checkbox" data-c="setting" data-k="suspensions" ${s.suspensions?'checked':''}> Red cards carry a one-match suspension</label>
   <label class="toggle"><input type="checkbox" data-c="setting" data-k="halftime" ${s.halftime?'checked':''}> Halftime team talks on by default</label>
   <label class="toggle"><input type="checkbox" data-c="setting" data-k="odds" ${s.odds?'checked':''}> Show fictional matchup odds</label>
   <label class="toggle"><input type="checkbox" data-c="setting" data-k="legacyFav" ${s.legacyFav?'checked':''}> Arcade favorites (legacy rule)</label><span class="tiny muted" style="margin-top:-8px">When your team is a heavy favorite, it plays well above its listed odds and tends to win big. Displayed odds keep using the realistic model.</span>
   <label class="toggle"><input type="checkbox" data-c="setting" data-k="manager" ${s.manager?'checked':''}> Manager Mode</label><span class="tiny muted" style="margin-top:-8px">Edit any school's players, lineups and stadium, and direct the result of unplayed matches. Directed results run through the same stats, records and awards as normal games.</span>
  </div></div>
  <div class="card"><h3>Saves & backup</h3><p class="small muted" style="margin-top:0">Careers are stored in this browser. Each slot is independent.</p><div class="row"><button class="btn" data-a="toSaves">Switch slot</button><button class="btn" data-a="exportOpen">Export backup</button><button class="btn" data-a="importOpen">Import backup</button><button class="btn danger" data-a="askDelete" data-slot="${App.slot}">Delete this career</button></div></div>
  </div><div class="col">
  <div class="card"><h3>Appearance</h3><div class="col" style="gap:10px"><button class="btn" data-a="openTheme">Theme & colors…</button><label class="toggle"><input type="checkbox" data-c="pref" data-k="compact" ${PREFS.compact?'checked':''}> Compact mode for laptops and Chromebooks</label><label class="toggle"><input type="checkbox" data-c="pref" data-k="rm" ${PREFS.rm?'checked':''}> Reduce motion</label></div></div>
  <div class="card"><h3>Sound</h3><label class="toggle"><input type="checkbox" data-c="soundOn" ${so.on?'checked':''}> Enable sound</label><div class="col" style="gap:8px;margin-top:10px">${vol('music','Music','mMusic')}${vol('sfx','Match effects (kicks, footsteps, net)','mSfx')}${vol('crowd','Crowd','mCrowd')}${vol('whistle','Whistles','mWhistle')}${vol('goal','Goals, chants & fanfares','mGoal')}${vol('voice','Stadium announcer (starting lineups)','mVoice')}${vol('ui','Menu clicks','mUi')}</div>
   <div class="row" style="margin-top:10px"><button class="btn sm" data-a="testSound" data-k="kick">Test a strike</button><button class="btn sm" data-a="testSound" data-k="whistle">Test whistle</button><button class="btn sm" data-a="testSound" data-k="goal">Test goal</button><button class="btn sm" data-a="testSound" data-k="fanfare">Test fanfare</button></div><p class="tiny muted" style="margin:.5em 0 0">Press <kbd>M</kbd> anywhere to mute or unmute.</p>
   <p class="tiny muted">Credits: every sound is synthesized live in your browser by Touchline's own Web Audio engine. No recordings or third-party samples are used; crowd and chant sounds are filtered-noise approximations.</p></div>
  <div class="card"><h3>About</h3><p class="small muted" style="margin:0">Touchline is a fictional simulation. Schools, players, college outcomes and odds are generated and have no real-world meaning. All crests and stadium art are original vector drawings.</p></div>
  </div></div>`;
};
DRAWERS.theme = ()=>{ const c=themeColors(); const t=PREFS.theme;
  return `<div class="mhead"><h2>Theme</h2><button class="x" data-a="closeDrawer" aria-label="Close">✕</button></div><div class="mbody">
  <span class="lab">Presets</span><div class="presets">${PRESETS.map(p=>`<button class="preset ${!t.custom&&t.preset===p.k?'on':''}" data-a="preset" data-k="${p.k}"><div class="sw">${['bg','surface','text','accent','accent2'].map(k=>`<i style="background:${p.c[k]}"></i>`).join('')}</div><b>${esc(p.n)}</b></button>`).join('')}</div>
  <span class="lab" style="margin-top:6px">Custom colors</span>
  ${[['bg','Background'],['surface','Cards & sidebar'],['text','Text'],['accent','Primary accent'],['accent2','Secondary highlight']].map(([k,l])=>`<div class="colorrow"><label for="tc-${k}">${l}</label><input type="color" id="tc-${k}" value="${c[k]}" data-c="themeColor" data-k="${k}"><input type="text" value="${c[k]}" maxlength="7" aria-label="${l} hex" data-c="themeHex" data-k="${k}"></div>`).join('')}
  <p class="tiny muted">Text and accents are adjusted automatically if a combination would be hard to read.</p>
  <hr style="border:0;border-top:1px solid var(--line);width:100%">
  ${App.C?`<button class="btn" data-a="useSchoolColors">Use my school colors</button>`:''}
  <button class="btn ghost" data-a="resetTheme">Reset to Classic Night Match</button></div>`; };
