'use strict';
/* ---------- Picture Pop: swap tiles to put pictures back together ----------
   Every picture is cut into 2 halves (side by side) or, on harder levels, 4 quarters (a 2x2 square). The grid holds
   shuffled pieces; swap any two tiles (or move one into an empty slot). When all pieces of a picture sit in place, the
   picture pops off and the freed cells refill from the deck, which can set off a chain.
   The deck deals pictures whole and in order, so at most one picture is ever split between grid and deck: the grid
   always holds every piece of some picture, and the level can always be finished. */
const PP_DEFS=(()=>{const d=document.createElement('div');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML='<svg width="0" height="0" aria-hidden="true"><defs></defs></svg>';document.body.appendChild(d);return d.querySelector('defs')})();
const ppMade=new Set();
/* the art for picture i at height H goes into the shared defs once; tiles show their part of it with a viewBox */
function ppArt(i,H){
  const id=`pp${i}h${H}`;
  if(!ppMade.has(id)){ppMade.add(id);const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id=id;g.innerHTML=PIC_ART[i].d(H,id+'_',mulberry32(hashSeed(i+1,H)));PP_DEFS.appendChild(g)}
  return id;
}
const ppPiece=(art,H,q)=>`<svg class="pim" viewBox="${q%2?60:0} ${q>1?80:0} 60 80" preserveAspectRatio="none"><use href="#${art}"/></svg>`;
sfx.picPop=k=>{if(!ok())return;const b=Math.min(4,k||0);[0,2,4,7].forEach((s,i)=>marimba(pent(s+5+b,60),.2,i*.06));bell(pent(14+b,60),.1,1,.2);
  noise({dur:.3,vol:.06,type:'bandpass',f:2000,f2:6500,q:.7,verb:.35})};

registerMode('pics',{name:'Picture Pop',icon:'🖼️',col:'#2fae6a',tip:'Swap tiles to put the pictures back together. A whole picture pops off the board and new tiles drop in.'},{
  goal:'Put every picture back together.',
  steps:['Drag a tile onto another tile to swap them. Tap one, then the other, works too.','Put the two halves of a picture side by side: it pops off the board and new tiles drop in.','Harder levels have 4-piece pictures: build them as a 2×2 square.'],
  demo:()=>{const a=ppArt(2,80),b=ppArt(0,80),t=(art,q,c='')=>`<span class="ppdt ${c}">${ppPiece(art,80,q)}</span>`;
    return htStage(`<div class="ppd">${t(a,0)}${t(b,1)}${t(a,1,'tap')}${HT_F}</div>`,`<div class="ppd"><span class="ppdw">${t(a,0)}${t(a,1)}</span>${t(b,1)}</div>`,
      'Swap the right half into place','The picture is whole: pop!')}
});

/* frame colours, one per picture in a level (bright and far apart) */
const PP_FRAME=['#ff4f8b','#ffb020','#2bc4ff','#8c5bff','#3ad67a','#ff7a3d','#ff5ad8','#18c7b4','#ffe14a','#4a7dff','#c0ff4a','#ff3d4d','#b47aff'];
/* grid size and picture mix by difficulty tier */
const PP_T=[{C:4,R:3,two:8,four:0},{C:4,R:4,two:11,four:0},{C:4,R:4,two:9,four:1},{C:5,R:4,two:9,four:2},{C:5,R:5,two:10,four:3},{C:5,R:5,two:9,four:4},{C:5,R:5,two:8,four:5}];
MAKERS.pics=function({R,tier,board,api}){
  const T=PP_T[Math.min(tier,PP_T.length-1)],C=T.C,RW=T.R,G=C*RW;
  /* ---- pictures and pieces ---- */
  /* scenes that look alike in every corner (a round window, a mosaic, layered hills) are only used as two halves */
  const art=shuffle([...PIC_ART.keys()],R),art4=art.filter(i=>!PIC_ART[i].no4),art2=art.filter(i=>!art4.slice(0,T.four).includes(i));
  const kinds=shuffle([...Array(T.two).fill(2),...Array(T.four).fill(4)],R);
  if(kinds[0]===4&&T.two){const i=kinds.indexOf(2);[kinds[0],kinds[i]]=[kinds[i],kinds[0]]}   // the first picture dealt is an easy one
  let n2=0,n4=0;
  const pics=kinds.map((k,j)=>({k,a:k===4?art4[n4++%art4.length]:art2[n2++%art2.length],fc:PP_FRAME[j%PP_FRAME.length],ids:[]})),pcs=[];
  pics.forEach((P,j)=>{for(let q=0;q<P.k;q++){P.ids.push(pcs.length);pcs.push({pic:j,q})}});
  const NP=pics.length;
  const deck=[];pics.forEach(P=>deck.push(...shuffle(P.ids.slice(),R)));
  const off=q=>q===1?1:q===2?C:q===3?C+1:0;          // where piece q sits relative to piece 0
  const fits=(cell,k)=>cell%C<C-1&&(k===2||Math.floor(cell/C)<RW-1);
  /* ---- rules (pure: also used by the solver) ---- */
  function complete(g){
    const pos=new Int16Array(pcs.length).fill(-1);g.forEach((a,i)=>{if(a>=0)pos[a]=i});
    const out=[];
    pics.forEach((P,j)=>{const c0=pos[P.ids[0]];if(c0<0||!fits(c0,P.k))return;for(let q=1;q<P.k;q++)if(pos[P.ids[q]]!==c0+off(q))return;out.push(j)});
    return out;
  }
  /* clear finished pictures, refill their cells from the deck, repeat while that finishes more; returns the chain of steps */
  function resolve(g,dp){
    const steps=[];
    for(;;){
      const done=complete(g);if(!done.length)break;
      const freed=[];done.forEach(j=>pics[j].ids.forEach(a=>{const i=g.indexOf(a);g[i]=-1;freed.push(i)}));
      freed.sort((a,b)=>a-b);const spawn=[];
      for(const i of freed){if(dp>=deck.length)break;g[i]=deck[dp++];spawn.push([i,g[i]])}
      steps.push({done,spawn});
    }
    return{steps,dp};
  }
  /* correct neighbours (a measure of how close the board is) */
  function adj(g){
    let s=0;
    for(let i=0;i<G;i++){const a=g[i];if(a<0)continue;const A=pcs[a];
      if(i%C<C-1){const b=g[i+1];if(b>=0&&pcs[b].pic===A.pic&&pcs[b].q===A.q+1&&A.q%2===0)s++}
      if(i+C<G&&A.q<2&&pics[A.pic].k===4){const b=g[i+C];if(b>=0&&pcs[b].pic===A.pic&&pcs[b].q===A.q+2)s++}}
    return s;
  }
  /* the solver: finish a picture if one swap can; else keep building the picture it is focused on; else the swap that adds
     the most correct neighbours; else focus on the picture closest to done. Every branch makes progress, so it ends. */
  function choose(g,dp,F){
    let best=null,bs=-1e9;const base=adj(g);
    for(let a=0;a<G;a++)for(let b=a+1;b<G;b++){
      if(g[a]<0&&g[b]<0)continue;
      const h=g.slice();[h[a],h[b]]=[h[b],h[a]];const r=resolve(h,dp),n=r.steps.reduce((s,x)=>s+x.done.length,0);
      const sc=n*1000+adj(h);if(sc>bs){bs=sc;best=[a,b]}
    }
    if(bs>=1000)return best;
    const pos=new Int16Array(pcs.length).fill(-1);g.forEach((a,i)=>{if(a>=0)pos[a]=i});
    const onGrid=j=>pics[j].ids.every(a=>pos[a]>=0);
    const frameMove=(j,c0)=>{const P=pics[j];for(let q=0;q<P.k;q++){const want=c0+off(q),at=pos[P.ids[q]];if(at!==want)return[Math.min(at,want),Math.max(at,want)]}return null};
    if(F.j>=0&&onGrid(F.j)&&!complete(g).includes(F.j)){const m=frameMove(F.j,F.c0);if(m)return m}
    if(bs>base)return best;
    let pick=null,pc=-1;
    pics.forEach((P,j)=>{if(!onGrid(j))return;for(let c0=0;c0<G;c0++){if(!fits(c0,P.k))continue;let n=0;for(let q=0;q<P.k;q++)if(pos[P.ids[q]]===c0+off(q))n++;if(n>pc&&n<P.k){pc=n;pick=[j,c0]}}});
    if(!pick)return best;
    F.j=pick[0];F.c0=pick[1];return frameMove(F.j,F.c0)||best;
  }

  /* ---- the deal ---- */
  let g=Array(G).fill(-1),dp=Math.min(G,deck.length);
  for(let tries=0;tries<80;tries++){
    const cells=shuffle([...Array(G).keys()],R);g.fill(-1);for(let i=0;i<dp;i++)g[cells[i]]=deck[i];
    if(!complete(g).length&&adj(g)===0)break;
  }
  /* par from the solver */
  let par=0;{const h=g.slice();let d=dp,left=NP;const F={j:-1,c0:0};
    while(left>0&&par<400){const m=choose(h,d,F);if(!m)break;[h[m[0]],h[m[1]]]=[h[m[1]],h[m[0]]];const r=resolve(h,d);d=r.dp;left-=r.steps.reduce((s,x)=>s+x.done.length,0);par++}}
  const s3=par+2+Math.floor(par*.25),s2=Math.ceil(par*1.7)+4;

  /* ---- play state ---- */
  let lastFour=false,moves=0,doneN=0,shown=0,sel=-1,busy=false,gen=0,fast=false;   // shown: pictures that have reached the gallery on screen
  const timers=[],fx=new Set(),botF={j:-1,c0:0};
  const later=(fn,ms)=>{const t=setTimeout(fn,ms);timers.push(t);return t};
  const H4=j=>pics[j].k===4?160:80;

  /* ---- DOM ---- */
  const wrap=el('div','ppw');wrap.style.setProperty('--C',C);wrap.style.setProperty('--R',RW);
  const top=el('div','pptop',`<div class="ppgal"><i>🖼️</i><b class="ppdn">0</b><small>/${NP}</small></div><div class="pppeek"><span class="ppph">👆 Tap a tile to peek at its picture</span></div><div class="ppdeck"><span class="ppcb"></span><span class="ppcb"></span><span class="ppcb"></span><b class="ppdk">0</b></div>`);
  const felt=el('div','ppg'),inner=el('div','ppb');felt.appendChild(inner);wrap.append(top,felt);board.appendChild(wrap);
  const slots=[...Array(G)].map((_,i)=>{const s=el('div','pps');s.style.setProperty('--r',Math.floor(i/C));s.style.setProperty('--c',i%C);s.dataset.i=i;inner.appendChild(s);return s});
  const els=new Map();   // piece id -> tile element (pieces on the board)
  function tileEl(a){
    const P=pics[pcs[a].pic],e=el('div','pt',ppPiece(ppArt(P.a,H4(pcs[a].pic)),H4(pcs[a].pic),pcs[a].q));
    e.style.setProperty('--pc',P.fc);   // every picture has its own frame colour, so its pieces are easy to group
    e.dataset.a=a;inner.appendChild(e);els.set(a,e);return e;
  }
  const place=(e,i)=>{e.style.setProperty('--r',Math.floor(i/C));e.style.setProperty('--c',i%C);e.dataset.i=i};
  function build(){   // the board from the state, no animation
    els.forEach(e=>e.remove());els.clear();
    g.forEach((a,i)=>{if(a>=0)place(tileEl(a),i)});
    shown=doneN;seams();counters();
  }
  /* pieces of a 4-piece picture that already fit together close the gap between them */
  function seams(){
    const at=i=>i>=0&&i<G?g[i]:-1;
    g.forEach((a,i)=>{if(a<0)return;const e=els.get(a);if(!e)return;const A=pcs[a],P=pics[A.pic];let l=0,r=0,t=0,b=0;
      if(P.k===4){const c=i%C,same=(j,q)=>{const x=at(j);return x>=0&&pcs[x].pic===A.pic&&pcs[x].q===q};
        if(A.q%2===0&&c<C-1&&same(i+1,A.q+1))r=1;if(A.q%2===1&&c>0&&same(i-1,A.q-1))l=1;
        if(A.q<2&&same(i+C,A.q+2))b=1;if(A.q>1&&same(i-C,A.q-2))t=1}
      e.style.setProperty('--jx',r-l);e.style.setProperty('--jy',b-t);
      e.classList.toggle('jl',!!l);e.classList.toggle('jr',!!r);e.classList.toggle('jt',!!t);e.classList.toggle('jb',!!b)});
  }
  function counters(){$('.ppdn',top).textContent=shown;$('.ppdk',top).textContent=deck.length-dp;top.classList.toggle('empty',dp>=deck.length)}
  function coach(){
    if(sel>=0)api.coach('👉 Now tap the tile to swap with');
    else if(!moves)api.coach(pics.some(P=>P.k===4)?'🧩 4-piece pictures make a 2×2 square':'👆 Drag a tile onto another to swap them');
    else api.coach(`🖼️ ${doneN}/${NP} pictures`);
    api.moves(moves,s3,s2);
  }
  api.setTip('Swap tiles until a picture is whole: halves side by side, quarters as a 2×2 square.');
  build();coach();
  if(!FL_RM)els.forEach((e,a)=>{const i=+e.dataset.i;e.style.animationDelay=(120+i*28)+'ms';e.classList.add('popin')});

  /* ---- moves ---- */
  function doMove(a,b,dragged){
    if(busy||api.over()||a===b||a<0||b<0||(g[a]<0&&g[b]<0))return false;
    clearHint();setSel(-1);
    const ea=g[a]>=0?els.get(g[a]):null,eb=g[b]>=0?els.get(g[b]):null;
    const r0=new Map([ea,eb].filter(Boolean).map(e=>[e,e.getBoundingClientRect()]));
    [g[a],g[b]]=[g[b],g[a]];moves++;
    const r=resolve(g,dp);dp=r.dp;
    const n=r.steps.reduce((s,x)=>s+x.done.length,0);doneN+=n;lastFour=r.steps.some(x=>x.done.some(j=>pics[j].k===4));
    if(!n)api.meh();
    if(doneN>=NP)api.lock();
    api.commit();
    sfx.tok();buzz(8);
    if(FL_RM||fast){build();coach();if(n)sfx.picPop(0);if(doneN>=NP)finish();return true}
    /* the swap: both tiles glide to their new cells (the dragged one from where the finger let go) */
    [[ea,b],[eb,a]].forEach(([e,i])=>{if(!e)return;e.classList.remove('drag','sel');e.style.translate='';place(e,i)});
    r0.forEach((rc,e)=>{const r1=e.getBoundingClientRect(),dx=rc.left-r1.left,dy=rc.top-r1.top;if(dx||dy)wa(e,[{translate:`${dx}px ${dy}px`,scale:e===ea&&dragged?1.1:1},{translate:'0 0',scale:1}],{duration:230,easing:'cubic-bezier(.3,1.25,.5,1)'})});
    if(!r.steps.length){seams();coach();return true}
    play(r.steps);return true;
  }
  /* a chain of finished pictures, one link at a time; input waits until it has played */
  function play(steps){
    busy=true;const my=gen,BL=Q.tier==='low'?640:820;
    steps.forEach((st,k)=>{
      const t=240+k*(BL+80);
      later(()=>{if(my!==gen)return;st.done.forEach((j,x)=>pop(j,k+x));},t);
      later(()=>{if(my!==gen)return;st.spawn.forEach(([i,a],x)=>drop(tileEl(a),i,x));counters()},t+BL-260);
    });
    later(()=>{if(my!==gen)return;busy=false;seams();coach();if(doneN>=NP)finish()},240+steps.length*(BL+80));
  }
  /* the finish of one picture: its pieces close up into the whole picture with a gold frame and a shine,
     sparkles and the picture's name, then it flies into the gallery counter */
  function pop(j,chain){
    const my=gen,P=pics[j],ids=P.ids,cells=ids.map(a=>+els.get(a).dataset.i),c0=Math.min(...cells);
    const tiles=ids.map(a=>els.get(a));tiles.forEach(e=>{els.delete(+e.dataset.a);e.classList.add('gone')});
    const ov=el('div','ppf'+(P.k===4?' f4':''),`${Q.tier==='high'?'<i class="pprays"></i>':''}<svg viewBox="0 0 120 ${H4(j)}" preserveAspectRatio="none"><use href="#${ppArt(P.a,H4(j))}"/></svg><i class="ppsh"></i>`);
    ov.style.setProperty('--r',Math.floor(c0/C));ov.style.setProperty('--c',c0%C);inner.appendChild(ov);fx.add(ov);
    const or=ov.getBoundingClientRect(),gr=$('.ppgal',top).getBoundingClientRect();
    const cx=or.left+or.width/2,cy=or.top+or.height/2,dx=gr.left+gr.width/2-cx,dy=gr.top+gr.height/2-cy;
    const low=Q.tier==='low',BL=low?640:820;
    const a=ov.animate([
      {opacity:0,scale:.96,translate:'0 0'},{opacity:1,scale:1,offset:.1},{scale:1.1,offset:.3},{scale:1.06,offset:.62,translate:'0 0',opacity:1},
      {scale:.12,translate:`${dx}px ${dy}px`,opacity:.4}],{duration:BL,easing:'cubic-bezier(.4,0,.3,1)',fill:'forwards'});
    a.onfinish=()=>{ov.remove();fx.delete(ov);if(my!==gen)return;shown++;counters();again($('.ppgal',top),'gb')};
    later(()=>tiles.forEach(e=>e.remove()),130);
    api.good(ov,{silent:true});sfx.picPop(chain);buzz([12,30,16]);
    later(()=>{if(!wrap.isConnected)return;const PC=PIC_ART[P.a];
      flBurst(cx,cy,'#ffd166',low?8:20,1);if(!low){flBurst(cx,cy,'#ffffff',8,.7);flRing(cx,cy,'#ffe9a8',or.width*1.6,560)}
      floatText(cx,or.top-6,`✨ ${PC.n}`,chain>0)},BL*.22);
  }
  /* a new tile from the deck drops into a freed cell */
  function drop(e,i,x){
    place(e,i);if(FL_RM)return;
    const rows=Math.floor(i/C)+1,h=e.offsetHeight+5;
    wa(e,[{translate:`0 ${-rows*h-40}px`,opacity:0},{translate:'0 6px',opacity:1,offset:.75},{translate:'0 0'}],{duration:420,delay:x*70,easing:'cubic-bezier(.5,0,.6,1.3)',fill:'backwards'});
    if(x===0)later(()=>sfx.tick(1.3),x*70+300);
  }
  function finish(){
    const r=felt.getBoundingClientRect();felt.classList.add('won');sfx.sparkle();
    if(!FL_RM)fountain(r.left+r.width/2,r.top+r.height*.5,Q.tier==='low'?16:34);
    later(()=>{if(wrap.isConnected)api.win(starsFor(moves,s3,s2))},FL_RM||fast?0:500);
  }

  /* ---- selecting, dragging ---- */
  function setSel(i){
    if(sel>=0&&g[sel]>=0){const e=els.get(g[sel]);if(e)e.classList.remove('sel')}
    sel=i;if(i>=0&&g[i]>=0){els.get(g[i]).classList.add('sel');peek(g[i])}
  }
  /* the peek: the whole picture a tile belongs to, with that tile's place in it outlined */
  function peek(a){
    const pk=$('.pppeek',top);if(a<0||!pk)return;
    const j=pcs[a].pic,P=pics[j],H=H4(j),q=pcs[a].q;
    pk.innerHTML=`<svg class="${P.k===4?'p4':'p2'}" viewBox="0 0 120 ${H}" preserveAspectRatio="none"><use href="#${ppArt(P.a,H)}"/><rect x="${q%2?61:1}" y="${q>1?81:1}" width="58" height="78" rx="5" fill="none" stroke="#fff" stroke-width="4"/><rect x="${q%2?61:1}" y="${q>1?81:1}" width="58" height="78" rx="5" fill="none" stroke="${P.fc}" stroke-width="2"/></svg>`;
    pk.style.setProperty('--pc',P.fc);again(pk,'pk');
  }
  let drag=null;
  const cellAt=(x,y)=>{const b=inner.getBoundingClientRect(),s=slots[0].getBoundingClientRect(),gp=slots[1].getBoundingClientRect().left-s.right;
    const c=Math.floor((x-b.left+gp/2)/(s.width+gp)),r=Math.floor((y-b.top+gp/2)/(s.height+gp));return c>=0&&c<C&&r>=0&&r<RW?r*C+c:-1};
  /* the tile under a dragged tile leans towards the dragged tile's cell: a preview of the swap */
  let tgEl=null;const target=(e,from)=>{if(tgEl===e)return;if(tgEl){tgEl.classList.remove('tg');tgEl.style.removeProperty('--sx');tgEl.style.removeProperty('--sy')}tgEl=e;
    if(e){if(from>=0&&e.classList.contains('pt')){const t=+e.dataset.i;e.style.setProperty('--sx',Math.sign(from%C-t%C));e.style.setProperty('--sy',Math.sign(Math.floor(from/C)-Math.floor(t/C)))}e.classList.add('tg');sfx.tick(1.5)}};
  dragify(inner,{
    start(e){
      if(busy||api.over())return false;
      const t=e.target.closest('.pt,.pps');if(!t)return false;
      const i=+t.dataset.i;drag={i,x:e.clientX,y:e.clientY,el:g[i]>=0?els.get(g[i]):null,on:false};return true;
    },
    move(x,y,e){
      if(!drag||!drag.el)return;
      if(!drag.on&&Math.hypot(x-drag.x,y-drag.y)>7){drag.on=true;drag.el.classList.add('drag');setSel(-1);peek(+drag.el.dataset.a);sfx.lift()}
      if(!drag.on)return;
      const ly=y-LIFT(e)*.5;drag.el.style.translate=`${x-drag.x}px ${ly-drag.y}px`;
      const c=cellAt(x,ly);target(c>=0&&c!==drag.i?(g[c]>=0?els.get(g[c]):slots[c]):null,drag.i);
    },
    end(x,y,e,moved){
      const d=drag;drag=null;target(null);if(!d)return;
      if(d.on){
        const c=cellAt(x,y-LIFT(e)*.5);
        if(c>=0&&c!==d.i&&doMove(d.i,c,true))return;
        d.el.classList.remove('drag');const tr=d.el.style.translate;d.el.style.translate='';
        wa(d.el,[{translate:tr||'0 0'},{translate:'0 0'}],{duration:220,easing:'cubic-bezier(.3,1.4,.5,1)'});sfx.bonk();return;
      }
      /* a tap: pick a tile up, put it down, or swap it with the one picked up */
      if(sel<0){if(g[d.i]>=0){setSel(d.i);sfx.pop(1.2);coach()}return}
      if(sel===d.i){setSel(-1);sfx.pop(.8);coach();return}
      doMove(sel,d.i,false);
    },
    cancel(){if(drag&&drag.el){drag.el.classList.remove('drag');drag.el.style.translate=''}drag=null;target(null)}
  });
  function clearHint(){inner.querySelectorAll('.hint').forEach(e=>{e.classList.remove('hint');e.removeAttribute('data-h')})}

  return{
    snap:()=>JSON.stringify({g,dp,moves,doneN}),
    restore(s){
      const o=JSON.parse(s);g=o.g;dp=o.dp;moves=o.moves;doneN=o.doneN;
      gen++;busy=false;timers.forEach(clearTimeout);timers.length=0;fx.forEach(x=>x.remove());fx.clear();
      sel=-1;botF.j=-1;felt.classList.remove('won');build();coach();
    },
    hint(){
      if(busy){toast('One moment…');return false}
      const m=choose(g,dp,botF);if(!m){toast('No move to suggest: try Undo ↩️');return false}
      clearHint();setSel(-1);
      m.forEach((i,k)=>{const e=g[i]>=0?els.get(g[i]):slots[i];e.dataset.h=k+1;api.flash(e,3200)});
      api.coach('💡 Swap the two glowing tiles');
      return true;
    },
    _done:h=>complete(h).length>0,get _lastFour(){return lastFour},   // tests
    _play(){if(busy)return true;const m=choose(g,dp,botF);return m?doMove(m[0],m[1],false):false},   // tests: the solver's move, animated
    _bot(){if(busy)return true;const m=choose(g,dp,botF);if(!m)return false;fast=true;const ok=doMove(m[0],m[1],false);fast=false;return ok},
    destroy(){gen++;timers.forEach(clearTimeout);fx.forEach(x=>x.remove())}
  };
};
