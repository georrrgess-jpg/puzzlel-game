/* ===================== v18.11 MAIN MENU (v1811m) =====================
   The start screen is rebuilt as one calm column over the showcase match:
     brand (kicker, wordmark, one-line subtitle)
     ONE primary action: "Continue" the most recently played career (the old .cont-hero, so Enter and every test that clicks
       .cont-hero / [data-a="openSlot"] still work), or "Start a new program" in the first empty slot when there is none
     "Your careers": the three slots as compact rows (continue / delete a filled slot, new program in an empty one)
     one quiet row of secondary actions: How to play, What's new, Appearance, Import a backup, Sound
   The showcase match stays as a dimmed backdrop (a theme-tinted shade, no blur: a filter over the live canvas would be
   re-run every frame), and the score bug hidden (the canvas has its own scoreboard); the ticker, the feature row, the pitch paragraph and the LIVE
   badge are gone too, and the mascot parade is one faint strip along the bottom edge (desktop only).
   Wraps renderStart: the old chain (ui_views.js + 10_start.js) still builds #start, the backdrop and the demo match;
   this replaces only the contents of .start-ui, in the same task, so the old layout never paints.
   Entrance: staggered fade/slide (transform + opacity only, first render only), a light sweep over the primary button and a
   gentle pointer parallax on the backdrop; all off under reduced motion (OS setting or body.rm). */
const V1811M_ICON={
  play:'<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  spark:'<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.3" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const v1811mIcon=(k,s=18)=>`<svg class="v1811m-ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${V1811M_ICON[k]||''}</svg>`;
const v1811mPhase=ph=>({preseason:'Preseason',regular:'League play',sectionals:'Sectionals',regional:'Regional',states:'State tourney',awards:'Awards',offseason:'Offseason'}[ph]||ph||'');
function v1811mLatest(metas){ return metas&&metas.length?[...metas].sort((a,b)=>(b.updated||0)-(a.updated||0))[0]:null; }
const v1811mTeam=m=>`--team1:${esc(m.c1||'#3b4a5c')};--team2:${esc(m.c2||'#ffffff')}`;

function v1811mPrimary(metas,by){ const m=v1811mLatest(metas);
  if(!m){ const free=[1,2,3].find(n=>!by[n])||1;
    return `<button class="v1811m-new v1811m-in" style="--v1811m-d:3" data-a="newCareerForm" data-slot="${free}">
      <span class="v1811m-new-ic" aria-hidden="true">${v1811mIcon('plus',26)}</span>
      <span class="v1811m-new-t"><b>Start a new program</b><small>Pick a mascot, colors and a town. Every world is generated fresh.</small></span>
      <span class="v1811m-sweep" aria-hidden="true"></span></button>`; }
  const md=m.phase==='regular'&&m.md!=null?` · Matchday ${m.md+1}`:'';
  return `<button class="cont-hero v1811m-cont v1811m-in" style="--v1811m-d:3;${v1811mTeam(m)}" data-a="openSlot" data-slot="${m.slot}" aria-label="Continue ${esc(m.school)}, career ${m.slot}">
    <span class="slot-wm" aria-hidden="true">${m.mk?mascotSVG(m.mk,m.c1,m.c2,170):''}</span>
    <span class="v1811m-cont-top"><span class="ch-logo">${m.mk?mascotSVG(m.mk,m.c1,m.c2,72):''}</span>
      <span class="v1811m-cont-t"><span class="v1811m-eye">Continue · Career ${m.slot}</span><b>${esc(m.school)}</b>
      <span class="v1811m-cont-sub">${esc(m.mascot||'')} · Season ${m.seasonNo} (${m.year}) · ${esc(v1811mPhase(m.phase))}${md}</span></span></span>
    <span class="v1811m-go"><span>${v1811mIcon('play',18)}Continue</span><kbd>Enter</kbd><span class="v1811m-sweep" aria-hidden="true"></span></span></button>`; }

function v1811mSlots(by,latest){
  const rows=[1,2,3].map(n=>{ const m=by[n];
    if(!m) return `<li class="v1811m-slot v1811m-empty"><button class="v1811m-slot-new" data-a="newCareerForm" data-slot="${n}"><span class="v1811m-slot-ic" aria-hidden="true">${v1811mIcon('plus',18)}</span><span class="v1811m-slot-t"><b>New program</b><small>Slot ${n} · empty</small></span></button></li>`;
    return `<li class="v1811m-slot v1811m-filled${latest&&latest.slot===n?' latest':''}" style="${v1811mTeam(m)}">
      <button class="v1811m-slot-open" data-a="openSlot" data-slot="${n}" aria-label="Continue career ${n}: ${esc(m.school)}"><span class="slot-logo">${m.mk?mascotSVG(m.mk,m.c1,m.c2,40):''}</span>
        <span class="v1811m-slot-t"><b>${esc(m.school)}</b><small>Slot ${n} · ${m.year} · ${esc(v1811mPhase(m.phase))} · Coach ${esc(m.coach)}</small></span></button>
      <button class="v1811m-slot-del" data-a="askDelete" data-slot="${n}" aria-label="Delete career ${n}" title="Delete career ${n}">${v1811mIcon('trash',17)}</button></li>`; }).join('');
  return `<section class="v1811m-saves v1811m-in" style="--v1811m-d:4" aria-labelledby="v1811m-saves-h"><h2 id="v1811m-saves-h">Your careers</h2><ul>${rows}</ul></section>`; }

function v1811mLinks(){
  const b=(a,ic,t,x='')=>`<button class="v1811m-link${x}" data-a="${a}">${v1811mIcon(ic,17)}<span>${t}</span></button>`;
  return `<nav class="v1811m-links v1811m-in" style="--v1811m-d:5" aria-label="More">${b('howTo','book','How to play')}${b('whatsNew','spark',"What's new",' whatsnew')}${b('openTheme','palette','Appearance')}${b('importOpen','upload','Import backup')}${typeof soundBtn==='function'?soundBtn(true):''}</nav>`; }

function v1811mHTML(metas,fresh){ const by={}; for(const m of metas) by[m.slot]=m; const latest=v1811mLatest(metas);
  const word='TOUCHLINE'.split('').map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('');
  const logoWord=typeof v17LogoWord==='function'?v17LogoWord(word):`<span class="logo-word" aria-label="Touchline">${word}</span>`;
  const parade=typeof v17ParadeHTML==='function'?v17ParadeHTML():'';
  return `<div class="v1811m-wrap${fresh?' v1811m-intro':''}">
    <header class="v1811m-brand"><h1 class="logo v1811m-logo${fresh?' intro':''}"><span class="v1811m-kick v1811m-in" style="--v1811m-d:0">Friday Night Varsity</span>${logoWord}<span class="v1811m-rule" aria-hidden="true"></span><small class="v1811m-in" style="--v1811m-d:1">High school soccer manager. Build a program from Modified to Varsity and chase the state crown.</small></h1></header>
    <main class="v1811m-main">
      ${v1811mPrimary(metas,by)}
      ${App.mem?'<div class="notice warn v1811m-in" style="--v1811m-d:4">This browser blocked storage, so careers will not persist after you close the page. Use Settings → Backup to keep a copy.</div>':''}
      ${v1811mSlots(by,latest)}
      ${v1811mLinks()}
    </main>
  </div><div class="v1811m-parade" aria-hidden="true">${parade}</div>`; }

const _v1811mRenderStart=renderStart;
renderStart=async function(){
  const fresh=!document.getElementById('start'); let metas=[];
  try{ metas=await DB.getMeta(); }catch(e){}
  const r=await _v1811mRenderStart.apply(this,arguments);
  try{ const el=document.getElementById('start'), ui=el&&el.querySelector('.start-ui'); if(!ui) return r;
    el.classList.add('v1811m');
    const snd=el.querySelector('.start-snd'); if(snd) snd.innerHTML='';
    ui.innerHTML=v1811mHTML(metas,fresh);
    if(typeof v17MascotsToImg==='function') v17MascotsToImg(ui);
    if(typeof v17ParadeBuild==='function'&&ui.querySelector('.v17-parade')) v17ParadeBuild();
    if(fresh) v1811mParallax(el);
  }catch(e){ console.warn('v1811m menu',e); }
  return r; };

/* pointer parallax on the backdrop canvas: a few px of transform with a CSS transition, desktop pointers only */
function v1811mParallax(el){ if(!window.matchMedia||!matchMedia('(pointer:fine)').matches) return; let raf=0, px=0, py=0;
  const move=e=>{ px=e.clientX/innerWidth-.5; py=e.clientY/innerHeight-.5; if(raf) return; raf=requestAnimationFrame(()=>{ raf=0;
      const cv=document.getElementById('start-cv'); if(!cv||!el.isConnected){ document.removeEventListener('pointermove',move); return; }
      if(reducedMotion()){ cv.style.transform=''; return; } cv.style.transform=`translate3d(${(-px*14).toFixed(1)}px,${(-py*9).toFixed(1)}px,0) scale(1.03)`; }); };
  document.addEventListener('pointermove',move,{passive:true}); }
/* Enter on the menu with no career yet opens the new-program form (with a career, ui_v8.js already clicks .cont-hero) */
document.addEventListener('keydown',e=>{ if(e.key!=='Enter'||App.C||App.modal||e.defaultPrevented) return; const t=e.target; if(t&&/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
  if(document.querySelector('#start .cont-hero')) return; const b=document.querySelector('#start .v1811m-new'); if(b){ e.preventDefault(); b.click(); } });
