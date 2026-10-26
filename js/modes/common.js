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

