/* ===================== v18.15 UI polish (with 99_ui.css) =====================
   - Views: a short stagger only when a page opens (re-rendering the same page no longer replays a fade on every click).
   - Menus: close after picking an item, hover intent and staggered items (CSS); the phone side menu gets a scrim and closes on
     a tap outside or Escape.
   - Modals and drawers: a short exit animation; re-rendering the same modal no longer replays its pop (CSS).
   - Toasts: a soft exit, tap to dismiss. "/" focuses search, Escape clears it. A back-to-top button on long pages.
   Presentation only. Identifiers prefixed v1815 / V1815. */
const V1815={ closing:false, tt:0, enterT:0 };
const v1815RM=()=>{ try{ return reducedMotion(); }catch(e){ return false; } };

/* ---------- views ---------- */
{ const _pv=polishView; polishView=function(changed){ _pv.apply(this,arguments);
  try{ const root=$('#content'); if(changed&&root&&root.classList.contains('enter')){ [...root.children].forEach((el,i)=>el.style.setProperty('--d',Math.min(i,6)*40+'ms')); clearTimeout(V1815.enterT); V1815.enterT=setTimeout(()=>{ if(root.isConnected) root.classList.remove('enter'); },900); } }catch(e){}
  v1815TopSync(); }; }

/* ---------- menus ---------- */
document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('.tn-dd [data-a]'); if(!t) return; document.body.classList.add('v1815-ddshut'); try{ document.activeElement&&document.activeElement.blur(); }catch(x){} },true);
document.addEventListener('mousemove',e=>{ if(document.body.classList.contains('v1815-ddshut')&&!(e.target.closest&&e.target.closest('.tn-tab.has-dd'))) document.body.classList.remove('v1815-ddshut'); },{passive:true});
document.addEventListener('click',e=>{ if(document.body.classList.contains('navopen')&&e.target===document.body) document.body.classList.remove('navopen'); });
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.body.classList.contains('navopen')){ document.body.classList.remove('navopen'); return; }
  const tg=e.target, typing=tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable);
  if(e.key==='Escape'&&tg&&tg.id==='q'){ tg.value=''; try{ CH.search(tg); }catch(x){} tg.blur(); return; }
  if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&App.C&&!App.modal&&!App.live){ const q=$('#q'); if(q){ e.preventDefault(); q.focus(); } } });

/* ---------- modals and drawers: a short exit ---------- */
{ const _cm=A.closeModal; A.closeModal=function(){ const root=$('#modal-root'); const sc=root&&[...root.querySelectorAll('.scrim')].find(x=>x.querySelector('.modal'));
  if(!App.modal||App.modal.back||App.drawer||!sc||v1815RM()||V1815.closing) return _cm.apply(this,arguments);
  V1815.closing=true; sc.classList.add('v1815-out'); const self=this, args=arguments, m=App.modal;
  setTimeout(()=>{ V1815.closing=false; if(App.modal===m) _cm.apply(self,args); else sc.classList.remove('v1815-out'); },150); }; }
if(typeof A.closeDrawer==='function'){ const _cd=A.closeDrawer; A.closeDrawer=function(){ const root=$('#modal-root'); const dr=root&&root.querySelector('.drawer');
  if(!App.drawer||!dr||v1815RM()||V1815.closing) return _cd.apply(this,arguments);
  V1815.closing=true; dr.classList.add('v1815-out'); root.querySelectorAll('.scrim[data-a="closeDrawer"]').forEach(s=>s.classList.add('v1815-out')); const self=this, args=arguments, d=App.drawer;
  setTimeout(()=>{ V1815.closing=false; if(App.drawer===d) _cd.apply(self,args); },170); }; }

/* the same modal drawn again (a tab inside it, a refresh) stays put instead of popping in again */
{ const _rm=renderModal; renderModal=function(){ const prev=App.lastModalKey; const r=_rm.apply(this,arguments);
  try{ if(prev&&prev===App.lastModalKey&&prev!=='|'){ const root=$('#modal-root'); root&&root.querySelectorAll('.scrim,.drawer').forEach(x=>x.classList.add('v1815-still')); } }catch(e){} return r; }; }

/* ---------- toasts ---------- */
{ const _t=toast; toast=function(m){ const r=_t.apply(this,arguments);
  try{ const el=$('#toast'); if(!el) return r; el.classList.remove('v1815-out'); clearTimeout(App.toastT); clearTimeout(V1815.tt);
    App.toastT=setTimeout(()=>{ el.classList.add('v1815-out'); V1815.tt=setTimeout(()=>{ el.hidden=true; el.classList.remove('v1815-out'); },230); },2800); }catch(e){} return r; }; }
document.addEventListener('click',e=>{ const el=e.target.closest&&e.target.closest('#toast'); if(!el) return; clearTimeout(App.toastT); el.classList.add('v1815-out'); clearTimeout(V1815.tt); V1815.tt=setTimeout(()=>{ el.hidden=true; el.classList.remove('v1815-out'); },230); });

/* ---------- back to top ---------- */
function v1815TopEl(){ let el=document.getElementById('v1815-top'); if(!el&&document.body){ el=document.createElement('button'); el.id='v1815-top'; el.className='v1815-top'; el.type='button'; el.setAttribute('aria-label','Back to top'); el.innerHTML=icon('caret',18);
  el.addEventListener('click',()=>window.scrollTo({top:0,behavior:v1815RM()?'auto':'smooth'})); document.body.appendChild(el); } return el; }
function v1815TopSync(){ const el=v1815TopEl(); if(!el) return; el.classList.toggle('on',!!(App.C&&!App.live&&window.scrollY>900)); }
window.addEventListener('scroll',()=>{ if(V1815.raf) return; V1815.raf=requestAnimationFrame(()=>{ V1815.raf=0; v1815TopSync(); }); },{passive:true});
