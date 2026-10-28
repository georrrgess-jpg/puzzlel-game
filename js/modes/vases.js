'use strict';
/* ---------- Vase Blast: a picture-card solitaire ----------
   Piles of picture cards lie on the table like a solitaire tableau. Tap the front card of a pile and it moves to the
   shelf; three alike on the shelf blast away. The shelf holds 7.
   Which cards are gone fixes what is on the shelf (each picture's count mod 3), so a level is a small graph of pile
   heights. One exact search over it at level start gives the lowest shelf any play can keep (the star target), the best
   move from every state (hints, the bot) and whether a position can still be cleared. */
const VB_CAP=7;
/* ten pictures: body colours light/mid/dark, pattern colour, card tint */
const VB_T=[
  {n:'Red amphora',   c:['#ff9f86','#e04b3c','#8a1f17'],p:'#ffe1a8',bg:['#ffe9dd','#f0a58c']},
  {n:'Blue moon vase',c:['#9cc8ff','#2f6fe0','#163a8a'],p:'#ffffff',bg:['#e2eeff','#8fb4ef']},
  {n:'Green bottle',  c:['#a6eda4','#2f9e57','#145c30'],p:'#eaffd6',bg:['#e3f8df','#93d49a']},
  {n:'Golden urn',    c:['#fff1a6','#f0b429','#985f00'],p:'#9a3b00',bg:['#fff6d2','#efc75e']},
  {n:'Purple jug',    c:['#dcc2ff','#8a55d8','#45227e'],p:'#ffe4ff',bg:['#f1e7ff','#bfa0ef']},
  {n:'Teal gourd',    c:['#a2f3e9','#1fb3a8','#0a5d57'],p:'#fff3c2',bg:['#dcf8f4','#86d8cf']},
  {n:'Pink tulip vase',c:['#ffc6e0','#ec5fa0','#8c1d55'],p:'#ffffff',bg:['#ffe8f2','#f19fc4']},
  {n:'Orange pot',    c:['#ffcf91','#f08a2e','#92440a'],p:'#fff3d8',bg:['#ffefdc','#f0b777']},
  {n:'Porcelain flask',c:['#ffffff','#e4e1da','#9a948a'],p:'#2b5cc8',bg:['#e6edff','#a9bbea']},
  {n:'Night vase',    c:['#857ea3','#3b3556','#16122a'],p:'#f5c542',bg:['#ebe6ff','#a59bcf']}
];
/* shapes in a 60x80 box (base near y 72). b: body, x: extra parts drawn in the dark tone (feet, lids), h: handles (strokes) */
const VB_SH=[
  {b:'M24 9h12v2c0 3-2 4-2 7 0 3 10 6 12 16 2 11-3 22-9 29v4h5v4H18v-4h5v-4c-6-7-11-18-9-29 2-10 12-13 12-16 0-3-2-4-2-7z',
   h:'M25 21c-9 0-12 6-11 12M35 21c9 0 12 6 11 12',r:[30,9,6]},
  {b:'M20 6h20c0 3-3 4-5 6-1 3-1 7-1 11 9 3 15 10 15 21 0 13-8 22-19 22S11 57 11 44c0-11 6-18 15-21 0-4 0-8-1-11-2-2-5-3-5-6z',r:[30,6,10]},
  {b:'M27 5h6v3c0 6 1 11 1 15 6 2 9 6 9 12v33c0 3-2 5-5 5H22c-3 0-5-2-5-5V35c0-6 3-10 9-12 0-4 1-9 1-15z',r:[30,5,3]},
  {b:'M19 21h22v3c6 3 9 9 9 17 0 10-6 18-13 21v4h5v5H18v-5h5v-4c-7-3-13-11-13-21 0-8 3-14 9-17z',
   x:'M20 20c0-5 4-8 10-8s10 3 10 8zM30 6a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 1 1 0-6.4z',r:null},
  {b:'M21 12h16l5-3c1 2 0 4-2 6l-2 3c7 5 11 13 11 23 0 13-8 24-19 24S11 54 11 41c0-10 4-18 11-23z',x:'M22 63h16l1 6H21z',
   h:'M15 23c-9 1-9 18 0 22',r:[29,12,8]},
  {b:'M27 6h6v4c0 2-1 3-1 5 6 2 9 6 9 11 0 4-2 6-4 8 9 3 14 10 14 20 0 12-9 19-21 19S9 66 9 54c0-10 5-17 14-20-2-2-4-4-4-8 0-5 3-9 9-11 0-2-1-3-1-5z',r:[30,6,3]},
  {b:'M14 6h32c0 4-3 6-7 9-4 4-5 9-5 14 0 6 9 10 9 22 0 13-6 21-13 21S17 64 17 51c0-12 9-16 9-22 0-5-1-10-5-14-4-3-7-5-7-9z',r:[30,6,16]},
  {b:'M18 27h24v3c8 2 12 9 12 18 0 14-10 24-24 24S6 62 6 48c0-9 4-16 12-18z',x:'M15 23h30a2 2 0 0 1 0 5H15a2 2 0 0 1 0-5z',r:null},
  {b:'M26 8h8v12c9 2 17 10 17 21 0 12-9 22-21 22S9 53 9 41c0-11 8-19 17-21z',x:'M22 62h16l2 9H20z',r:[30,8,4]},
  {b:'M19 8h22l-2 4c2 10 3 30 2 52l3 6H16l3-6c-1-22 0-42 2-52z',r:[30,8,11]}
];
/* patterns, clipped to the body */
const VB_PAT=[
  p=>`<rect x="0" y="30" width="60" height="3" fill="${p}"/><path d="M8 40l5-4 5 4 5-4 5 4 5-4 5 4 5-4 5 4 5-4" fill="none" stroke="${p}" stroke-width="2.4"/><rect x="0" y="47" width="60" height="3" fill="${p}"/>`,
  p=>`<circle cx="30" cy="41" r="11" fill="none" stroke="${p}" stroke-width="2.6"/>${[0,1,2,3,4,5].map(i=>`<ellipse cx="30" cy="35" rx="2.4" ry="5" fill="${p}" transform="rotate(${i*60} 30 41)"/>`).join('')}<circle cx="30" cy="41" r="2.6" fill="${p}"/>`,
  p=>[0,1,2].map(i=>`<path d="M30 ${36+i*11}c-6 0-10-3-11-7 5 0 9 2 11 7zM30 ${36+i*11}c6 0 10-3 11-7-5 0-9 2-11 7z" fill="${p}"/>`).join('')+`<rect x="29" y="28" width="2" height="40" fill="${p}"/>`,
  p=>`<rect x="0" y="33" width="60" height="2.4" fill="${p}"/>${[0,1,2,3,4,5].map(i=>`<path d="M${11+i*8} 42l4-5 4 5-4 5z" fill="${p}"/>`).join('')}<rect x="0" y="50" width="60" height="2.4" fill="${p}"/>`,
  p=>[[24,34],[36,40],[22,48],[38,52],[30,58],[30,28],[18,40],[42,30]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.4" fill="${p}"/>`).join(''),
  p=>`<rect x="0" y="32" width="60" height="4" fill="${p}" opacity=".9"/><path d="M8 50c4-4 8-4 11 0s8 4 11 0 8-4 11 0 8 4 11 0" fill="none" stroke="${p}" stroke-width="2.4"/><path d="M8 58c4-4 8-4 11 0s8 4 11 0 8-4 11 0 8 4 11 0" fill="none" stroke="${p}" stroke-width="2"/>`,
  p=>[[30,52],[22,60],[38,60]].map(([x,y])=>[0,1,2,3,4].map(i=>`<ellipse cx="${x}" cy="${y-3.2}" rx="2" ry="3.2" fill="${p}" transform="rotate(${i*72} ${x} ${y})"/>`).join('')+`<circle cx="${x}" cy="${y}" r="1.6" fill="#ffd166"/>`).join(''),
  p=>[[18,44],[30,40],[42,44],[24,56],[36,56]].map(([x,y])=>[0,1,2,3,4].map(i=>`<ellipse cx="${x}" cy="${y-3}" rx="1.9" ry="3" fill="${p}" transform="rotate(${i*72} ${x} ${y})"/>`).join('')).join(''),
  p=>`<path d="M30 30c8 0 12 5 12 11s-5 10-11 10-9-4-9-8 3-6 7-6 5 2 5 4" fill="none" stroke="${p}" stroke-width="2.4" stroke-linecap="round"/><rect x="0" y="56" width="60" height="2" fill="${p}"/><rect x="0" y="24" width="60" height="2" fill="${p}"/>`,
  p=>`<rect x="0" y="18" width="60" height="2.4" fill="${p}"/>${[0,1,2,3].map(i=>`<path d="M30 ${28+i*9}l5 4-5 4-5-4z" fill="none" stroke="${p}" stroke-width="1.6"/>`).join('')}<rect x="0" y="62" width="60" height="2.4" fill="${p}"/>`
];
(function(){
  if(document.getElementById('vbDefs'))return;
  const sym=VB_T.map((t,i)=>{const s=VB_SH[i],[l,m,d]=t.c;
    return `<linearGradient id="vbG${i}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${l}"/><stop offset=".45" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>
      <clipPath id="vbC${i}"><path d="${s.b}"/></clipPath>
      <symbol id="vbS${i}" viewBox="0 0 60 80"><ellipse cx="30" cy="74" rx="17" ry="3.2" fill="#0000002a"/>
        ${s.h?`<path d="${s.h}" fill="none" stroke="${d}" stroke-width="4.2" stroke-linecap="round"/><path d="${s.h}" fill="none" stroke="${m}" stroke-width="2.4" stroke-linecap="round"/>`:''}
        ${s.x?`<path d="${s.x}" fill="url(#vbG${i})"/><path d="${s.x}" fill="#00000033"/>`:''}
        <path d="${s.b}" fill="url(#vbG${i})"/>
        <g clip-path="url(#vbC${i})" opacity=".9">${VB_PAT[i](t.p)}<path d="${s.b}" fill="url(#vbShade)"/></g>
        ${s.r?`<ellipse cx="${s.r[0]}" cy="${s.r[1]}" rx="${s.r[2]}" ry="1.7" fill="${d}"/>`:''}
        <path d="${s.b}" fill="none" stroke="${d}" stroke-width="1" opacity=".55"/></symbol>`}).join('');
  const d=document.createElement('div');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML=`<svg id="vbDefs" width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="vbShade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff" stop-opacity=".42"/><stop offset=".34" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
    ${sym}</defs></svg>`;
  document.body.appendChild(d);
})();
const vbFace=(t,corner=true)=>`<div class="vf" style="--b1:${VB_T[t].bg[0]};--b2:${VB_T[t].bg[1]}">${corner?`<svg class="vix" viewBox="0 0 60 80"><use href="#vbS${t}"/></svg>`:''}<svg class="vim" viewBox="0 0 60 80"><use href="#vbS${t}"/></svg></div>`;
/* the blast: a bright chord that climbs with the combo, and a glassy shimmer */
sfx.vblast=k=>{if(!ok())return;const b=Math.min(4,k||0);[0,2,4].forEach((s,i)=>marimba(pent(s+5+b,60),.22,i*.05));bell(pent(12+b,60),.1,.8,.14);
  noise({dur:.22,vol:.07,type:'bandpass',f:2400,f2:6000,q:.8,verb:.3})};

registerMode('vases',{name:'Vase Blast',icon:'🏺',col:'#e0844a',tip:'Tap the front vase of a pile to put it on the shelf. Three alike on the shelf blast away. Clear the whole table!'},{
  goal:'Clear every vase from the table.',
  steps:['Tap the front vase of any pile. It moves to the shelf.','Three alike on the shelf blast away.','The shelf holds 7. Keep it low for 3 stars: plan which vase to take next.'],
  demo:()=>htStage(
    `<div class="vbd"><div class="vbdp"><span class="vbdc">${vbFace(1)}</span><span class="vbdc tap">${vbFace(0)}${HT_F}</span></div><div class="vbds"><span class="vbdc">${vbFace(0,false)}</span><span class="vbdc">${vbFace(0,false)}</span><i></i><i></i></div></div>`,
    `<div class="vbd"><div class="vbdp"><span class="vbdc">${vbFace(1)}</span></div><div class="vbds blast"><i></i><i></i><i></i><i></i><b>💥</b></div></div>`,
    'Tap the front vase of a pile','Three alike on the shelf: blast!')
});

MAKERS.vases=function({R,tier,board,api}){
  /* ---- the deal: piles, pictures, how many are face down ---- */
  const C=tier<2?4:tier<5?5:6;
  const N=[12,15,18,21,24,27,30,30,33,33,36][Math.min(tier,10)];
  const V=tier<3?99:tier<8?2:1;          // face-up cards behind the front one (99: all face up)
  const P=tier<2?3:4;                     // the deal is built so that a shelf of P always suffices
  const d=Array(C).fill(Math.floor(N/C));for(let i=0;i<N%C;i++)d[i]++;
  for(let k=0;k<C;k++){const a=Math.floor(R()*C),b=Math.floor(R()*C);if(a!==b&&d[a]>2&&d[b]<7){d[a]--;d[b]++}}
  const D=Math.max(...d);
  /* pictures: walk a random order of taking cards and give out triples so that at most P wait on the shelf */
  function deal(P){
    for(let tries=0;tries<300;tries++){
      const h=d.slice(),seq=[];
      while(seq.length<N){const cs=[];h.forEach((v,c)=>{if(v)cs.push(c)});const c=cs[Math.floor(R()*cs.length)];seq.push([c,--h[c]])}
      const K=N/3,tri=[],open=[];let next=0,pend=0,ok=true;
      for(let i=0;i<N&&ok;i++){
        const rem=N-i,need=open.reduce((s,o)=>s+3-o.have,0);
        const opts=open.filter(o=>(o.have===2?pend-2:pend+1)<=P);
        const canNew=next<K&&pend+1<=P&&need+3<=rem;
        let o=null;
        if(canNew&&(!opts.length||R()<.42)){o={id:next++,have:0};open.push(o)}
        else if(opts.length)o=opts[Math.floor(R()*opts.length)];
        if(!o){ok=false;break}
        tri[i]=o.id;o.have++;if(o.have===3){open.splice(open.indexOf(o),1);pend-=2}else pend++;
      }
      if(!ok)continue;
      const pool=shuffle([...Array(VB_T.length).keys()],R),nt=Math.min(VB_T.length,K);
      const cards=d.map(n=>Array(n));seq.forEach(([c,k],i)=>{cards[c][k]=pool[tri[i]%nt]});
      return cards;
    }
    return null;
  }
  let cards=null;for(let p=P;!cards;p++)cards=deal(p);
  /* ---- the exact search: F[state] = lowest shelf peak still possible from this state (99: can't be cleared), B = best pile ---- */
  const rad=[];let tot=1;d.forEach((v,c)=>{rad[c]=tot;tot*=v+1});
  const F=new Int8Array(tot).fill(-1),B=new Int8Array(tot).fill(-1),cnt=new Int8Array(VB_T.length),hh=d.slice();
  function f(s,load){
    if(F[s]>=0)return F[s];
    if(s===0){F[0]=0;return 0}
    let best=99,bm=-1;
    for(let c=0;c<C;c++){
      if(!hh[c])continue;
      const t=cards[c][hh[c]-1],tri=cnt[t]===2,nl=tri?load-2:load+1;
      if(nl>=VB_CAP)continue;
      cnt[t]=tri?0:cnt[t]+1;hh[c]--;
      const v=Math.max(nl,f(s-rad[c],nl));
      hh[c]++;cnt[t]=tri?2:cnt[t]-1;
      if(v<best){best=v;bm=c}
    }
    F[s]=best;B[s]=bm;return best;
  }
  const start=d.reduce((s,v,c)=>s+v*rad[c],0),opt=f(start,0);
  const s3=Math.min(5,opt+(tier<2||V<99?1:0)),s2=Math.min(6,s3+1);
  const goalTxt=`★★★ keep the shelf at ${s3} or fewer`;

  /* ---- play state ---- */
  let h=d.slice(),shelf=[],peak=0,moves=0,gen=0,warned=false,hintT=0,doomShown=false;
  const seenMin=d.slice();               // how far each pile has ever been dug: revealed cards stay face up, even after Undo
  const state=()=>h.reduce((s,v,c)=>s+v*rad[c],0);
  const up=(c,k)=>k>=seenMin[c]-1-V;
  const zone=i=>i<=s3?'z3':i<=s2?'z2':'z1';

  /* ---- DOM ---- */
  const wrap=el('div','vbw');wrap.style.setProperty('--C',C);wrap.style.setProperty('--D',D);
  const felt=el('div','vbt'),tab=el('div','vbtab');felt.appendChild(tab);
  const shelfEl=el('div','vsh'),zbar=el('div','vzb');
  for(let i=0;i<VB_CAP;i++){const s=el('i','vsl '+zone(i+1));s.style.setProperty('--i',i);shelfEl.appendChild(s)}
  zbar.innerHTML=[3,2,1].map(n=>{const a=n===3?1:n===2?s3+1:s2+1,b=n===3?s3:n===2?s2:VB_CAP;return b>=a?`<span class="z${n}" style="flex:${b-a+1}">${'★'.repeat(n)}</span>`:''}).join('');
  wrap.append(felt,shelfEl,zbar);board.appendChild(wrap);
  const cEl=cards.map((col,c)=>col.map((t,k)=>{
    const e=el('div','vc',`<div class="vin">${vbFace(t)}<div class="vb"></div></div>`);
    e.style.setProperty('--c',c);e.style.setProperty('--k',k);e.style.zIndex=k+1;e.dataset.c=c;e.dataset.k=k;
    e.setAttribute('aria-label',VB_T[t].n);tab.appendChild(e);return e}));
  /* one-shot classes go when their animation ends */
  tab.addEventListener('animationend',ev=>{const v=ev.target.closest('.vc');if(!v)return;
    if(ev.animationName==='vdeal')v.classList.remove('deal');
    if(ev.animationName==='vsquash'){v.classList.remove('flip');v.style.removeProperty('--fd')}
    if(ev.animationName==='vnudge')v.classList.remove('nudge')});

  api.setInfo(`<div class="meter vbm"><div class="mtx"><span>Vases <b class="vleft"></b></span><span class="nx vgoal"></span></div><div class="mbar"><i class="z3 vprog"></i></div></div>`);
  api.setTip('Tap the front vase of a pile to move it to the shelf. Three alike blast away. The shelf holds 7: when it is full, Undo.');
  function hud(){
    const left=h.reduce((a,b)=>a+b,0),n=starsNow();
    const info=$('#hudInfo');if(!info.querySelector('.vbm'))return;
    $('.vleft',info).textContent=left;$('.vprog',info).style.width=(1-left/N)*100+'%';
    $('.vgoal',info).textContent=n===3?`★★★ shelf ≤${s3}`:n===2?`★★ shelf ≤${s2}`:'★ clear it!';
    api.setStars(n);
  }
  const starsNow=()=>peak<=s3?3:peak<=s2?2:1;
  function paint(){   // the table from the state (no animation)
    cEl.forEach((col,c)=>col.forEach((e,k)=>{
      e.classList.toggle('gone',k>=h[c]);e.classList.toggle('free',k===h[c]-1);e.classList.toggle('down',!up(c,k));
    }));
  }
  /* shelf cards: one element per card, laid out by slot index; a slide between slots is a CSS transition */
  let vis=[];          // [{id,t,e,landed}] in shelf order (cards blasting are taken out of it)
  let trips=[];        // triples waiting for their cards to land: [ids]
  const flying=new Set();
  function layout(){vis.forEach((v,i)=>v.e.style.setProperty('--i',i))}
  function shelfCard(id,t,at,landed){
    const e=el('div','vs'+(landed?'':' fly'),vbFace(t,false));shelfEl.appendChild(e);
    const v={id,t,e,landed};vis.splice(at,0,v);return v;
  }
  function rebuildShelf(){
    vis.forEach(v=>v.e.remove());vis=[];trips=[];
    shelf.forEach((s,i)=>shelfCard(s.id,s.t,i,true));layout();
  }
  function coach(){
    const n=shelf.length;
    if(n>=VB_CAP)api.coach('🚫 Shelf full: tap ↩️ Undo');
    else if(F[state()]===99)api.coach('⚠️ This can’t be cleared now: tap ↩️ Undo');
    else if(!moves)api.coach('👆 Tap the front vase of a pile');
    else if(n>s3)api.coach(`⚠️ Shelf ${n}/${VB_CAP}: finish a pair`);
    else api.coach(`🏺 Three alike blast · shelf ${n}/${VB_CAP}`);
  }
  function glowUndo(){const u=$('#undoBtn');u.classList.add('glow');setTimeout(()=>u.classList.remove('glow'),3200)}

  /* ---- taking a card ---- */
  function take(c){
    if(api.over()||!h[c])return false;
    if(shelf.length>=VB_CAP){sfx.bad();shakeShelf();return false}
    clearTimeout(hintT);cEl.flat().forEach(e=>e.classList.remove('hint'));vis.forEach(v=>v.e.classList.remove('hint'));
    const k=h[c]-1,t=cards[c][k],id=c*8+k,src=cEl[c][k];
    const rect=src.getBoundingClientRect();
    h[c]--;moves++;
    const before=seenMin[c];seenMin[c]=Math.min(seenMin[c],h[c]);
    const same=shelf.filter(x=>x.t===t);
    let trip=null;
    if(same.length===2){trip=same.map(x=>x.id).concat(id);shelf=shelf.filter(x=>x.t!==t)}
    else{let at=-1;shelf.forEach((x,i)=>{if(x.t===t)at=i});const e={id,t};if(at<0)shelf.push(e);else shelf.splice(at+1,0,e)}
    const oldPeak=peak;peak=Math.max(peak,shelf.length);
    /* the table: the card leaves, the one behind becomes the front, cards that come into view flip over */
    src.classList.remove('free','hint');src.classList.add('gone');
    if(h[c])cEl[c][h[c]-1].classList.add('free');
    if(seenMin[c]<before)for(let kk=0;kk<h[c];kk++){const e=cEl[c][kk];if(e.classList.contains('down')&&up(c,kk)){e.classList.remove('down');if(!FL_RM){e.classList.add('flip');sfx.flip(1.3)}}}
    /* the shelf: a placeholder slot opens next to its twins, the card flies into it */
    let at=vis.length;for(let i=vis.length-1;i>=0;i--)if(vis[i].t===t){at=i+1;break}
    const v=shelfCard(id,t,at,false);layout();
    if(trip)trips.push(trip);
    sfx.lift();buzz(8);
    if(!trip&&!same.length)api.meh();
    fly(src,rect,v,t);
    api.commit();coach();hud();
    if(peak>s3&&oldPeak<=s3&&!warned){warned=true;toast('★★★ slipped away! Tap ↩️ Undo to get it back')}
    const left=h.reduce((a,b)=>a+b,0);
    if(!left){api.lock();}
    else if(shelf.length>=VB_CAP){setTimeout(()=>{if(wrap.isConnected&&shelf.length>=VB_CAP){sfx.bad();shakeShelf();toast('The shelf is full: tap ↩️ Undo and pick another vase');glowUndo()}},FL_RM?0:380)}
    else if(F[state()]===99&&!doomShown){doomShown=true;glowUndo()}
    return true;
  }
  function fly(src,r,v,t){
    const g=gen;
    if(FL_RM){land(v,g);return}
    const sl=shelfEl.children[Math.min(vis.indexOf(v),VB_CAP-1)].getBoundingClientRect();
    const gh=el('div','vg',vbFace(t));gh.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;document.body.appendChild(gh);
    flying.add(gh);
    const sc=sl.width/r.width,dx=sl.left-r.left,dy=sl.top-r.top,lift=Math.min(60,Math.abs(dy)*.3+24),rot=dx>0?8:-8;
    const a=gh.animate([
      {transform:'translate(0,0) scale(1)',offset:0},
      {transform:`translate(0,-8px) scale(1.08) rotate(${-rot/2}deg)`,offset:.16},
      {transform:`translate(${dx*.55}px,${dy*.5-lift}px) scale(${(1+sc)/2}) rotate(${rot}deg)`,offset:.55},
      {transform:`translate(${dx}px,${dy}px) scale(${sc})`,offset:1}],{duration:400,easing:'cubic-bezier(.45,.05,.35,1)',fill:'forwards'});
    a.onfinish=()=>{gh.remove();flying.delete(gh);land(v,g)};
  }
  function land(v,g){
    if(g!==gen||!wrap.isConnected)return;
    v.landed=true;v.e.classList.remove('fly');
    if(!FL_RM)v.e.classList.add('land');
    sfx.tok();
    /* a triple whose three cards are all on the shelf now blasts */
    for(const tr of trips.slice()){if(tr.every(id=>{const x=vis.find(q=>q.id===id);return x&&x.landed})){trips.splice(trips.indexOf(tr),1);blast(tr,g)}}
  }
  let combo=0;
  function blast(ids,g){
    const parts=ids.map(id=>vis.find(q=>q.id===id));
    vis=vis.filter(q=>!ids.includes(q.id));
    const t=parts[0].t,col=VB_T[t].c[1];
    const rs=parts.map(p=>p.e.getBoundingClientRect()),mx=(rs[0].left+rs[2].right)/2,my=rs[1].top+rs[1].height/2;
    const done=!h.some(Boolean)&&!vis.length;
    api.good(parts[1].e,{silent:true});combo=cur?cur.combo:1;
    sfx.vblast(combo);buzz([10,30,14]);
    if(FL_RM){parts.forEach(p=>p.e.remove());layout();after();return}
    /* the three jump together onto the middle one (the independent translate/scale properties leave the slot transform alone), then pop */
    parts.forEach((p,i)=>{p.e.classList.add('boom');
      const dx=mx-(rs[i].left+rs[i].width/2);
      const a=p.e.animate([{translate:'0 0',scale:1},{translate:`${dx*.15}px -10px`,scale:1.12,offset:.3},
        {translate:`${dx}px -14px`,scale:1.25,opacity:1,offset:.62},{translate:`${dx}px -14px`,scale:.2,opacity:0}],{duration:440,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
      a.onfinish=()=>p.e.remove();
    });
    setTimeout(()=>{if(g!==gen||!wrap.isConnected)return;
      flBurst(mx,my-14,col,16,.9);flBurst(mx,my-14,'#ffffff',6,.6);flRing(mx,my-14,col,rs[1].width*2.6,520);
      if(combo<2)floatText(mx,my-rs[1].height*.9,'Blast! 💥');
      layout();again(shelfEl,'sp');
    },270);
    setTimeout(after,done?380:0);
    function after(){if(g!==gen||!wrap.isConnected)return;if(done)finish()}
  }
  function finish(){
    const r=felt.getBoundingClientRect();
    felt.classList.add('won');sfx.sparkle();
    if(!FL_RM){fountain(r.left+r.width/2,r.top+r.height*.55,34);flRing(r.left+r.width/2,r.top+r.height/2,'#ffd166',r.width*.9,800)}
    setTimeout(()=>{if(wrap.isConnected)api.win(starsNow())},FL_RM?0:450);
  }
  function shakeShelf(){if(FL_RM)return;again(shelfEl,'sk')}
  function blocked(e){
    sfx.bonk();api.meh();
    if(!FL_RM){e.classList.remove('nudge');void e.offsetWidth;e.classList.add('nudge')}
    api.coach(e.classList.contains('down')?'🂠 Face-down cards turn over when you dig down to them':'👆 Only the front vase of a pile can be taken');
  }
  tab.addEventListener('click',ev=>{
    const e=ev.target.closest('.vc');if(!e||api.over()||tab.classList.contains('pre'))return;
    const c=+e.dataset.c,k=+e.dataset.k;
    if(k!==h[c]-1){blocked(e);return}
    take(c);
  });

  /* ---- start: the cards are dealt onto the table, then the face-up ones turn over in a wave.
     The deal waits until the level banner is on its way out, so it is seen (cards hide until then). ---- */
  paint();rebuildShelf();coach();hud();
  if(!FL_RM){tab.classList.add('pre');
    /* safety net: if the harness never calls begin() (it always should), deal anyway once no popup is in the way */
    const safe=setInterval(()=>{if(!wrap.isConnected||!tab.classList.contains('pre')){clearInterval(safe);return}if(!document.querySelector('#modal.on')){clearInterval(safe);dealIn()}},2500)}
  function dealIn(){
    if(FL_RM||!wrap.isConnected)return;
    if(!tab.classList.contains('pre'))return;
    const intro=document.querySelector('.lvintro'),base=!intro?120:intro.classList.contains('slim')?300:1150,step=Math.min(26,700/N);
    cEl.forEach((col,c)=>col.forEach((e,k)=>{
      const dl=base+(k*C+c)*step;e.style.setProperty('--dl',dl+'ms');e.classList.add('deal');
      if(up(c,k)){e.classList.add('flip');e.style.setProperty('--fd',dl+380+'ms')}
    }));
    tab.classList.remove('pre');
    setTimeout(()=>{if(wrap.isConnected)sfx.whoosh()},base);
  }

  return{
    goal:goalTxt,goalShort:`★★★ shelf ≤${s3}`,
    begin(){setTimeout(dealIn,0)},   // after the harness has put up the level banner (or closed the how-to card)
    snap:()=>JSON.stringify({h,shelf,peak,moves}),
    restore(s){
      const o=JSON.parse(s);h=o.h;shelf=o.shelf;peak=o.peak;moves=o.moves;gen++;
      flying.forEach(x=>x.remove());flying.clear();
      cEl.flat().forEach(e=>e.classList.remove('hint','flip','nudge','deal'));
      paint();rebuildShelf();coach();hud();doomShown=false;
    },
    hint(){
      if(shelf.length>=VB_CAP){toast('The shelf is full: try Undo ↩️');return false}
      const s=state(),c=B[s];
      if(F[s]===99||c<0){toast('This table can’t be cleared from here: try Undo ↩️');return false}
      const k=h[c]-1,t=cards[c][k];
      api.flash(cEl[c][k],3200);
      vis.filter(v=>v.t===t).forEach(v=>api.flash(v.e,3200));
      api.coach('💡 Tap the glowing vase');
      clearTimeout(hintT);hintT=setTimeout(()=>{if(wrap.isConnected&&!api.over())coach()},3200);
      return true;
    },
    _t:(c,k)=>cards[c][k],   // tests: the picture on a card
    _bot(){const c=B[state()];if(c<0||shelf.length>=VB_CAP)return false;return take(c)},
    destroy(){gen++;clearTimeout(hintT);flying.forEach(x=>x.remove());flying.clear()}
  };
};
