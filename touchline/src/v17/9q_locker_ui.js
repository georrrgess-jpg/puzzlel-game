/* v18.23 Locker Room page (Squads -> People), personality strip on the player card, This week item, menus. Identifiers v1822. */
const V1822_UI={ lvl:'V' };
function v1822Chip(P,sm){ return `<span class="v1822-chip k-${P.k}${sm?' sm':''}" title="${esc(P.d)}"><i aria-hidden="true">${P.ico}</i>${esc(P.n)}</span>`; }
function v1822Meter(C,lvl){ const c=v1822Chem(C,C.userSid,lvl); const mood=v1822Mood(C,lvl); const pct=(c+V1822.CHEM)/(2*V1822.CHEM)*100; const lab=c>=3?'Tight-knit':c>=1?'Good':c<=-3?'Fractured':c<=-1?'Tense':'Neutral';
  const parts=v1822ChemParts(C,lvl).map(x=>`<li>${v1822Chip(x.P,true)} ×${x.n}<b class="${x.sum>0?'good':'bad'}">${x.sum>0?'+':''}${x.sum}</b></li>`).join('')+(mood?`<li><span>Locker-room mood</span><b class="${mood>0?'good':'bad'}">${mood>0?'+':''}${mood}</b></li>`:'');
  return `<div class="v1822-chem"><div class="v1822-ch"><b>${LVL_NAME[lvl]}</b><span class="v1822-lab ${c>0?'up':c<0?'dn':''}">${lab} · ${c>0?'+':''}${c}</span></div>
    <div class="v1822-bar" role="img" aria-label="Chemistry ${c} of ${V1822.CHEM}"><i style="left:${pct}%"></i></div>
    <small class="muted">Match form ${c>0?'+':c<0?'−':'±'}${Math.abs(c*V1822.FORM*100).toFixed(2)}% on attack and defence</small>
    <ul class="v1822-parts">${parts||'<li class="muted">No strong personalities in the starting XI.</li>'}</ul></div>`; }
function v1822EventCard(C){ const e=v1822Pending(C); if(!e) return ''; const p=C.players[e.pid]; const P=v1822Pers(C,p); const E=V1822_EV[e.k];
  return `<section class="card v1822-ev"><div class="hd"><h3>Locker room situation</h3><span class="chip acc">Before matchday ${C.md+1}</span></div>
    <div class="v1822-evp">${crest(Sx(C.userSid),34)}<div><p class="v1822-evt">${esc(E.t).replace('{A}',pLink(p.id))}</p><div class="v1822-evm">${v1822Chip(P)} <span class="muted small">${LVL_NAME[p.lvl]} · ${posTag(p.pos)} ${ovrBadge(ovr(p))}</span></div></div></div>
    <div class="v1822-chs">${E.ch.map((c,i)=>`<button class="v1822-cho" data-a="v1822Choose" data-i="${i}"><b>${esc(c.l)}</b><span>${esc(c.d)}</span></button>`).join('')}</div>
    <p class="tiny muted">If you play the next game without deciding, the moment passes and nothing changes.</p></section>`; }
VIEWS.locker=()=>{ const C=App.C; const u=C.userSid; const lvl=V1822_UI.lvl; const S=v1822S(C);
  const sq=squad(C,u,lvl); const by={}; for(const p of sq){ const P=v1822Pers(C,p); (by[P.k]=by[P.k]||[]).push(p); }
  const groups=V1822_P.filter(P=>by[P.k]).map(P=>`<div class="v1822-grp"><div class="v1822-gh">${v1822Chip(P)}<small>${esc(P.d)}${P.g!==1?` <b class="${P.g>1?'good':'bad'}">${P.g>1?'+':'−'}${Math.round(Math.abs(P.g-1)*100)}% growth</b>`:''}${P.c?` <b class="${P.c>0?'good':'bad'}">${P.c>0?'+':''}${P.c} chemistry</b>`:''}</small></div>
    <div class="v1822-pl">${by[P.k].sort((a,b)=>ovr(b)-ovr(a)).map(p=>`<span class="v1822-p">${posTag(p.pos)}${pLink(p.id)}${ovrBadge(ovr(p))}</span>`).join('')}</div></div>`).join('');
  const log=S.log.filter(x=>x.yr===C.year).slice(0,8).map(x=>`<li><span>MD ${x.md+1} · ${V1822_BY[x.k].ico} ${esc(x.nm)}</span><b>${esc(x.c)}</b></li>`).join('');
  return `<div class="v1822-lead"><p>Every player has a personality. It shapes how fast he grows, how the starting XI gets along, and what he says after games. Chemistry gives a squad a small edge on match day; your calls in locker-room situations move the mood.</p></div>
    ${v1822EventCard(C)}
    <section class="card"><div class="hd"><h3>Team chemistry</h3><span class="small muted">From each level's starting XI and your locker-room calls</span></div><div class="v1822-chems">${LVLS.map(l=>v1822Meter(C,l)).join('')}</div></section>
    <section class="card"><div class="hd"><h3>Personalities</h3><div class="seg" role="group">${LVLS.map(l=>`<button class="${l===lvl?'on':''}" aria-pressed="${l===lvl}" data-a="v1822Lvl" data-k="${l}">${LVL_NAME[l]}</button>`).join('')}</div></div><div class="v1822-grps">${groups||'<div class="empty">No players at this level.</div>'}</div></section>
    ${log?`<section class="card"><h3>This season's calls</h3><ul class="v1822-log">${log}</ul></section>`:''}`; };
A.v1822Choose=el=>{ const r=v1822Choose(App.C,+el.dataset.i); if(r.msg) toast(r.msg); try{ Sound.ui('pop'); }catch(e){} queueSave(); App.keepScroll=true; render(); };
A.v1822Lvl=el=>{ V1822_UI.lvl=el.dataset.k; App.keepScroll=true; render(); };
TITLES.locker='Locker Room'; NAV_ICON.locker='users'; if(typeof NAV_DESC!=='undefined') NAV_DESC.locker='Personalities, chemistry and locker-room calls';
{ const i=NAV.findIndex(n=>n[0]==='families'); if(!NAV.some(n=>n[0]==='locker')) NAV.splice(i>=0?i+1:NAV.length,0,['locker','Locker Room']); }
{ const g=TOPNAV.find(t=>t[0]==='squads'); if(g&&!g[3].includes('locker')){ const j=g[3].indexOf('families'); g[3].splice(j>=0?j+1:g[3].length,0,'locker'); } }
try{ if(typeof V1817O_MENU!=='undefined'&&V1817O_MENU.squads){ const pe=V1817O_MENU.squads.find(x=>x[0]==='People'); if(pe&&!pe[1].includes('locker')) pe[1].splice(1,0,'locker'); } }catch(e){}
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('locker');
{ const _nb=navBadges; navBadges=function(C){ const b=_nb.apply(this,arguments); try{ if(C&&v1822Pending(C)) b.locker='1'; }catch(e){} return b; }; }
/* player card: personality strip */
{ const _mp=MODALS.player; MODALS.player=function(m){ let h=_mp.apply(this,arguments); try{ const C=App.C; const p=C&&C.players[m.id]; if(!p||(m.tab||'overview')!=='overview') return h; const sch=C.schools[p.sid]; if(!sch||sch.ext) return h; const P=v1822Pers(C,p);
    const fx=[P.g!==1?`${P.g>1?'+':'−'}${Math.round(Math.abs(P.g-1)*100)}% growth`:'',P.c?`${P.c>0?'+':''}${P.c} chemistry when he starts`:''].filter(Boolean).join(' · ');
    const strip=`<div class="v1822-pstrip">${v1822Chip(P)}<span class="v1822-pd">${esc(P.d)}${fx?` <b>${esc(fx)}</b>`:''}</span>${p.sid===C.userSid?'<button class="v1821d-fc more" data-a="go" data-r="locker">Locker Room</button>':''}</div>`;
    const i=h.indexOf('<div class="mbody">'); if(i>=0){ const j=i+'<div class="mbody">'.length; h=h.slice(0,j)+strip+h.slice(j); } }catch(e){ console.warn('v1822 player',e); } return h; }; }
/* Overview: This week item when a situation is waiting */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; const e=v1822Pending(C); if(!e) return h; const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h;
    const clr=box.querySelector('.v1817o-clear'); if(clr) clr.remove(); const p=C.players[e.pid]; const P=v1822Pers(C,p); const b=document.createElement('button'); b.className='dec v1822-dec'; b.dataset.a='go'; b.dataset.r='locker';
    b.innerHTML=`<span class="dec-ico">${P.ico}</span><span class="grow"><b>Locker room: ${esc(pname(p))}</b><small>${esc(P.n)} · a call to make before matchday ${C.md+1}</small></span><span class="dec-go">${icon('chev',16)}</span>`; box.appendChild(b); return t.innerHTML; }catch(e){ console.warn('locker overview',e); return h; } }; }
/* the Development hub: chemistry chip on the Overview growth card */
v1821dTab({id:'locker',label:'Personality',ico:'🧠',order:70,render:C=>VIEWS.locker(),
  summary:C=>{ const n=squad(C,C.userSid,'V').filter(p=>v1822Pers(C,p).g>1).length; const c=v1822Chem(C,C.userSid,'V'); return {t:`Personalities: ${n} hard workers on Varsity`,s:`Varsity chemistry ${c>0?'+':''}${c}${v1822Pending(C)?' · a locker-room call is waiting':''}`,warn:!!v1822Pending(C)}; }});
