'use strict';
/* ====================== shared helpers for every mode ======================
   Mode files (js/modes/*.js) talk to the harness in js/ui.js through `api`:
   moves(m,s3,s2,limit) star meter · good(el)/meh() combo · commit() undo snapshot · win(stars) ·
   coach/setTip/setInfo/flash/shake/stagger */
const FL_RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const flRing=(...a)=>{if(typeof ring==='function')ring(...a)};
const flBurst=(...a)=>{if(typeof burst==='function')burst(...a)};
/* ---------- local helpers (grid games only) ---------- */
const gfx={
  reduced:()=>typeof REDUCED!=='undefined'&&REDUCED,
  acc(){const v=getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();return /^#[0-9a-f]{6}$/i.test(v)?v:'#ffd166'},
  anim(e,k,o){if(!e||!e.animate||gfx.reduced())return null;try{return e.animate(k,o)}catch(_){return null}},
  /* restart a CSS animation class */
  pulse(e,cls){e.classList.remove(cls);void e.offsetWidth;e.classList.add(cls)},
  /* drop one-shot animation classes when their animation ends (so fill:both never pins a stale state) */
  ONCE:{squash:'flip',puff:'out',seal:'lock',wob:'tick',lockin:'lockin'},
  tidy(e){e.addEventListener('animationend',ev=>{const k=gfx.ONCE[ev.animationName];if(k)e.classList.remove(k)});
    // a newer animation cancels the stagger pop-in; drop its class so it can't replay later
    e.addEventListener('animationcancel',ev=>{if(ev.animationName==='popin'){ev.target.classList.remove('popin');ev.target.style.animationDelay=''}})},
  /* deferred effects must not fire on a board that's gone or under the win card */
  live:c=>c.isConnected&&!document.querySelector('#modal.on'),
  /* neighbours of i in an n×n grid for an offset pattern */
  hits(i,n,offs){const x=i%n,y=(i/n)|0,r=[];for(const[dx,dy]of offs){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<n&&Y<n)r.push(Y*n+X)}return r},
  /* press/hover preview: highlight every cell a tap would affect */
  preview(cells,affect,over){
    let lit=[];
    const clear=()=>{lit.forEach(c=>c.classList.remove('pv','pv0'));lit=[]};
    const show=i=>{clear();if(over())return;affect(i).forEach(j=>{cells[j].classList.add('pv');lit.push(cells[j])});cells[i].classList.add('pv0')};
    cells.forEach((c,i)=>{
      c.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show(i)});
      c.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')show(i)});
      c.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')clear()});
      c.addEventListener('pointerleave',clear);
      c.addEventListener('pointercancel',clear);
    });
    return clear;
  }
};


/* ---------- drag controller shared by the drag modes ----------
   One pointer at a time, moves coalesced to once per frame, pointer capture so the finger can leave the element.
   h.start(e) -> return false to ignore; h.move(x,y,e); h.end(x,y,e,moved); h.cancel().  Coordinates are client px. */
function dragify(host,h){
  let id=null,sx=0,sy=0,lx=0,ly=0,moved=false,raf=0,lastE=null;
  host.style.touchAction='none';
  const flush=()=>{raf=0;if(id!==null&&h.move)h.move(lx,ly,lastE)};
  host.addEventListener('pointerdown',e=>{
    if(id!==null||(e.pointerType==='mouse'&&e.button!==0))return;
    if(h.start&&h.start(e)===false)return;
    id=e.pointerId;sx=lx=e.clientX;sy=ly=e.clientY;moved=false;lastE=e;
    try{host.setPointerCapture(id)}catch(_){}
    e.preventDefault();
    if(h.move)h.move(lx,ly,e);
  });
  host.addEventListener('pointermove',e=>{
    if(e.pointerId!==id)return;
    lx=e.clientX;ly=e.clientY;lastE=e;
    if(!moved&&Math.hypot(lx-sx,ly-sy)>7)moved=true;
    if(!raf)raf=requestAnimationFrame(flush);
  });
  const finish=(e,cancel)=>{
    if(e.pointerId!==id)return;
    cancelAnimationFrame(raf);raf=0;const pid=id;id=null;
    try{host.releasePointerCapture(pid)}catch(_){}
    if(cancel){if(h.cancel)h.cancel();return}
    if(h.end)h.end(e.clientX,e.clientY,e,moved);
  };
  host.addEventListener('pointerup',e=>finish(e,false));
  host.addEventListener('pointercancel',e=>finish(e,true));
  host.addEventListener('lostpointercapture',e=>finish(e,true));
  return{abort(){id=null;cancelAnimationFrame(raf);raf=0}};
}
/* how far above a touching finger a dragged piece floats, so the finger never hides it */
const LIFT=e=>e&&e.pointerType==='touch'?56:0;
/* animate with the Web Animations API unless the player asked for reduced motion; returns the animation or null */
const wa=(e,k,o)=>gfx.anim(e,k,o);
/* restart a CSS animation by swapping a class pair (kA <-> kB, identical keyframes under two names): it replays with no forced reflow */
const again=(c,k)=>{const on=c['_'+k]^=1;c.classList.remove(k+(on?'b':'a'));c.classList.add(k+(on?'a':'b'))};
