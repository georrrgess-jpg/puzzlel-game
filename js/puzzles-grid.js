'use strict';
/* ====================== GRID PUZZLES: Lights Out, Spin Lock, Slide Tiles ======================
   Makers talk to the harness through `api` (see js/ui.js): moves(m,s3,s2,limit) star meter · good(el)/meh() combo ·
   commit() undo snapshot · win(stars) · fail(title,msg) · coach/setTip/setInfo/flash/shake/stagger */

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

/* ---------- Lights Out ---------- */
MAKERS.lights=function({R,tier,board,api}){
  const n=Math.min(6,3+Math.floor(tier/4));
  const pats={
    plus:[[0,0],[1,0],[-1,0],[0,1],[0,-1]],
    x:[[0,0],[1,1],[1,-1],[-1,1],[-1,-1]],
    box:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
  };
  const avail=['plus'];if(tier>=6)avail.push('x');if(tier>=10)avail.push('box');
  const pat=tier<6?'plus':R.pick(avail),offs=pats[pat];
  const apply=(g,i)=>{for(const j of gfx.hits(i,n,offs))g[j]^=1};
  const k=Math.min(Math.ceil(n*n*.3),2+Math.floor(tier*.4));
  let sol,grid;
  do{
    const idx=shuffle([...Array(n*n).keys()],R).slice(0,k);
    sol=Array(n*n).fill(0);idx.forEach(i=>sol[i]=1);
    grid=Array(n*n).fill(0);idx.forEach(i=>apply(grid,i));
  }while(grid.every(v=>!v));
  const par=k,s3=par+3+Math.floor(par*.25),s2=par*2+6;
  let U=Array(n*n).fill(0),moves=0;
  const wrap=el('div','grid glass lo');wrap.style.gridTemplateColumns=`repeat(${n},1fr)`;wrap.style.setProperty('--n',n);
  const cells=grid.map((_,i)=>{
    const c=el('button','cell light','<u></u><i><b></b></i><em></em>');
    c.style.setProperty('--fl',(2.4+((i*7)%5)*.35)+'s');c.style.setProperty('--fo',-((i*13)%9)*.3+'s');
    c.onclick=()=>press(i);gfx.tidy(c);wrap.appendChild(c);return c});
  board.appendChild(wrap);api.stagger(cells);
  const clearPv=gfx.preview(cells,i=>gfx.hits(i,n,offs),api.over);
  function render(){
    cells.forEach((c,i)=>{clearTimeout(c._lt);c.classList.toggle('on',!!grid[i])});
    glow();api.moves(moves,s3,s2)}
  function glow(){
    const lit=grid.filter(v=>v).length;
    wrap.style.setProperty('--lit',(lit/(n*n)).toFixed(3));
    api.coach(lit?`💡 ${lit} light${lit>1?'s':''} still on`:'🌙 All dark!');
    return lit}
  api.setTip(`Tap a square to flip it and ${patIcon(offs)} the squares shown. Turn every light off. Hold a square to preview it.`);
  function press(i){
    if(api.over())return;
    const need=sol[i]^U[i],before=grid.slice();apply(grid,i);U[i]^=1;moves++;
    const lit=glow();sfx.flip(1+(n*n-lit)/(n*n)*.7);buzz(8);
    const x0=i%n,y0=(i/n)|0;
    cells.forEach((c,j)=>{if(before[j]===grid[j])return;
      const d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0),ms=d*65;
      c.style.setProperty('--d',ms+'ms');gfx.pulse(c,'flip');
      clearTimeout(c._lt);
      const set=()=>{c.classList.toggle('on',!!grid[j]);
        if(before[j]&&!grid[j]&&gfx.live(c)){gfx.pulse(c,'out');const[x,y]=centerOf(c);burst(x,y,gfx.acc(),8,.55)}};
      ms?c._lt=setTimeout(set,ms+60):set();
    });
    const[cx,cy]=centerOf(cells[i]);ring(cx,cy,'var(--acc)',cells[i].offsetWidth*2.4);
    need?api.good(cells[i]):api.meh();
    cells.forEach(c=>c.classList.remove('hint'));
    api.moves(moves,s3,s2);api.commit();
    if(!lit){
      clearPv();wrap.classList.add('dark');
      cells.forEach((c,j)=>{const d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0);
        setTimeout(()=>{if(!gfx.live(c))return;const[x,y]=centerOf(c);burst(x,y,'#ffffff',5,.45);c.classList.add('twk')},150+d*60)});
      api.win(starsFor(moves,s3,s2));
    }
  }
  render();
  return{
    snap:()=>JSON.stringify({grid,U,moves}),
    restore(s){({grid,U,moves}=JSON.parse(s));wrap.classList.remove('dark');render()},
    hint(){const rem=cells.filter((_,i)=>sol[i]^U[i]);if(rem.length)api.flash(R.pick(rem)||rem[0])}
  };
};

/* ---------- Spin Lock ---------- */
MAKERS.rotate=function({R,tier,board,api}){
  const n=Math.min(5,3+Math.floor(tier/4));
  const offs=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  const k=Math.min(n*n-1,2+Math.floor(tier*.45));
  let sol,ang;
  do{
    sol=Array(n*n).fill(0);ang=Array(n*n).fill(0);
    shuffle([...Array(n*n).keys()],R).slice(0,k).forEach(j=>{
      const need=tier<3||R()<.65?1:tier<8||R()<.7?2:3,t=4-need;sol[j]=need;
      for(const q of gfx.hits(j,n,offs))ang[q]+=t;
    });
  }while(ang.every(a=>a%4===0));
  const par=sol.reduce((a,b)=>a+b,0),s3=par+3+Math.floor(par*.25),s2=par*2+6;
  let U=Array(n*n).fill(0),moves=0;
  const wrap=el('div','grid glass sl');wrap.style.gridTemplateColumns=`repeat(${n},1fr)`;wrap.style.setProperty('--n',n);
  const P='M12 2.2l8.6 10.6h-5.1v8.9H8.5v-8.9H3.4z';
  const needle=`<svg class="ndl" viewBox="0 0 24 24"><path class="sh" d="${P}" transform="translate(0 1.3)"/><path class="gm" d="${P}"/><path d="M12 2.2L3.4 12.8h5.1v8.9H12z" fill="#fff" fill-opacity=".28"/><path d="M12 2.2l8.6 10.6h-5.1v8.9H12z" fill="#000" fill-opacity=".14"/><path d="M12 4.6L6.6 11.3h2.6z" fill="#fff" fill-opacity=".7"/><path d="${P}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7" stroke-linejoin="round"/></svg>`;
  const ghost=`<svg class="ghost" viewBox="0 0 24 24"><path d="${P}"/></svg>`;
  const cells=ang.map((_,i)=>{const c=el('button','cell rot',`<div class="dial"><span class="tk"></span><span class="nt"></span>${ghost}${needle}<span class="seal"></span><em></em></div>`);c.onclick=()=>tap(i);gfx.tidy(c);wrap.appendChild(c);return c});
  const svgs=cells.map(c=>c.querySelector('.ndl')),ghosts=cells.map(c=>c.querySelector('.ghost'));
  board.appendChild(wrap);api.stagger(cells);
  const clearPv=gfx.preview(cells,i=>gfx.hits(i,n,offs),api.over);
  function render(){cells.forEach((c,i)=>{svgs[i].style.transform=`rotate(${ang[i]*90}deg)`;ghosts[i].style.transform=`rotate(${ang[i]*90+90}deg)`;c.classList.toggle('ok',ang[i]%4===0);c.classList.toggle('nx',(ang[i]+1)%4===0)});
    const bad=ang.filter(a=>a%4).length;
    api.coach(bad?`🧭 ${bad} arrow${bad>1?'s':''} still not pointing up`:'🔓 Unlocked!');
    api.moves(moves,s3,s2)}
  api.setTip(`Tap an arrow: it and ${patIcon(offs)} the arrows shown turn a quarter turn clockwise. Make every arrow point up. Hold an arrow to preview.`);
  function tap(i){
    if(api.over())return;
    const need=((sol[i]-U[i])%4+4)%4!==0,wasOk=ang.map(a=>a%4===0);
    for(const q of gfx.hits(i,n,offs)){ang[q]++;cells[q].style.setProperty('--wd',(q===i?0:55)+'ms')}
    U[i]=(U[i]+1)%4;moves++;sfx.ratchet();buzz(8);
    cells.forEach(c=>c.classList.remove('hint'));render();api.commit();
    const[cx,cy]=centerOf(cells[i]);ring(cx,cy,'var(--acc)',cells[i].offsetWidth*2.2);
    gfx.hits(i,n,offs).forEach(j=>{const c=cells[j];c.classList.remove('lock');
      if(!wasOk[j]&&ang[j]%4===0){setTimeout(()=>{if(!gfx.live(c))return;gfx.pulse(c,'lock');const[px,py]=centerOf(c);burst(px,py,'#6be585',10,.65);ring(px,py,'#6be585',c.offsetWidth*1.5,450)},260)}
      else{c.style.setProperty('--wd',(j===i?0:55)+'ms');gfx.pulse(c,'tick')}});
    need?api.good(cells[i]):api.meh();
    if(ang.every(a=>a%4===0)){
      clearPv();wrap.classList.add('open');
      const x0=i%n,y0=(i/n)|0;
      cells.forEach((c,j)=>{const d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0);
        gfx.anim(c.querySelector('.dial'),[{transform:'rotate(0)'},{transform:'rotate(-25deg)',offset:.25},{transform:'rotate(360deg)'}],{duration:450,delay:80+d*45,easing:'cubic-bezier(.4,0,.2,1)'});
        setTimeout(()=>{if(!gfx.live(c))return;gfx.pulse(c,'lock');const[px,py]=centerOf(c);burst(px,py,'#6be585',6,.5)},80+d*45+300)});
      api.win(starsFor(moves,s3,s2));
    }
  }
  render();
  return{
    snap:()=>JSON.stringify({ang,U,moves}),
    restore(s){({ang,U,moves}=JSON.parse(s));wrap.classList.remove('open');render()},
    hint(){const rem=cells.filter((_,i)=>((sol[i]-U[i])%4+4)%4);if(rem.length)api.flash(rem[0])}
  };
};

/* ---------- Slide Tiles ---------- */
MAKERS.slide=function({R,tier,board,api}){
  const sizes=[[3,3],[3,3],[3,4],[4,4],[4,4],[4,5],[5,5]];
  const[w,h]=sizes[Math.min(tier,sizes.length-1)];
  const L=Math.min(80,8+tier*6+(w*h>9?6:0));
  const V={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},OPP={U:'D',D:'U',L:'R',R:'L'};
  let tiles,blank,stack,moves=0;
  do{
    tiles=[...Array(w*h-1).keys()].map(i=>i+1).concat(0);blank=w*h-1;stack=[];
    for(let s=0;s<L;s++){
      const opts=Object.keys(V).filter(d=>{
        if(stack.length&&OPP[d]===stack[stack.length-1])return false;
        const X=blank%w+V[d][0],Y=((blank/w)|0)+V[d][1];return X>=0&&Y>=0&&X<w&&Y<h});
      const d=R.pick(opts),nb=blank+V[d][0]+V[d][1]*w;
      tiles[blank]=tiles[nb];tiles[nb]=0;blank=nb;stack.push(d);
    }
  }while(tiles.every((t,i)=>t===(i+1)%(w*h)));
  const par=stack.length,s3=Math.ceil(par*1.6)+6,s2=par*3+12;
  const box=el('div','slidebox');box.style.aspectRatio=`${w}/${h}`;box.style.setProperty('--w',w);
  box.style.setProperty('--bs',`min(92vw,calc(100dvh - 380px),480px,calc((100dvh - 380px) * ${w/h}))`);
  /* target slots underneath: faint home numbers, the final gap gets a target ring */
  for(let p=0;p<w*h;p++){
    const s=el('div','slot'+(p===w*h-1?' home':''),`<i>${p===w*h-1?'':p+1}</i>`);
    s.style.width=100/w+'%';s.style.height=100/h+'%';s.style.left=(p%w)*100/w+'%';s.style.top=((p/w)|0)*100/h+'%';box.appendChild(s);
  }
  const els={};
  for(let id=1;id<w*h;id++){
    const t=el('div','tile');t.style.width=100/w+'%';t.style.height=100/h+'%';
    const gx=(id-1)%w,gy=((id-1)/w)|0,hue=(200+gx*(150/w)+gy*(110/h))%360;
    t.style.setProperty('--h',hue);
    t.innerHTML=`<div style="background:linear-gradient(160deg,hsl(${hue} 90% 70%),hsl(${hue+20} 82% 55%) 55%,hsl(${hue+30} 78% 44%))"><b>${id}</b><i class="ck">✓</i></div>`;
    gfx.tidy(t);
    t.onclick=()=>{if(swiped)return;tryMove(tiles.indexOf(id))};
    els[id]=t;box.appendChild(t);
  }
  board.appendChild(box);api.stagger(Object.values(els).map(t=>t.firstChild),25);
  // swipe anywhere on the board: the tile next to the gap slides in the swipe direction
  let sx=0,sy=0,swiped=false;
  box.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});
  box.addEventListener('pointerup',e=>{
    const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
    swiped=true;setTimeout(()=>swiped=false,0);
    const bx=blank%w,by=(blank/w)|0;let p=-1;
    if(Math.abs(dx)>Math.abs(dy)){if(dx<0&&bx<w-1)p=blank+1;if(dx>0&&bx>0)p=blank-1}
    else{if(dy<0&&by<h-1)p=blank+w;if(dy>0&&by>0)p=blank-w}
    if(p>=0)tryMove(p);
  });
  const placed=()=>tiles.filter((id,p)=>id&&id===p+1).length;
  function render(){
    tiles.forEach((id,p)=>{if(!id)return;const t=els[id];t.style.transform=`translate(${(p%w)*100}%,${((p/w)|0)*100}%)`;t.classList.toggle('ok',id===p+1)});
    const bx=blank%w,by=(blank/w)|0;
    tiles.forEach((id,p)=>{if(id)els[id].classList.toggle('mv',p%w===bx||((p/w)|0)===by)});
    api.coach(`🔢 ${placed()} of ${w*h-1} tiles in place`);
    api.moves(moves,s3,s2);
  }
  function tryMove(p){
    if(api.over()||p<0||p===blank)return;
    const x=p%w,y=(p/w)|0,bx=blank%w,by=(blank/w)|0;
    if(x!==bx&&y!==by){sfx.bad();api.coach('↔️ Only tiles in the same row or column as the gap can slide');gfx.anim(els[tiles[p]]&&els[tiles[p]].firstChild,[{transform:'none'},{transform:'translateX(-5px) rotate(-3deg)'},{transform:'translateX(4px) rotate(2deg)'},{transform:'none'}],{duration:280});return}
    const pl=placed(),dx=Math.sign(x-bx),dy=Math.sign(y-by),k=Math.abs(x-bx)+Math.abs(y-by);
    const d=Object.keys(V).find(q=>V[q][0]===dx&&V[q][1]===dy);
    const wasOk=new Set(tiles.filter((id,q)=>id&&id===q+1)),moved=[];
    for(let i=0;i<k;i++){
      const nb=blank+dx+dy*w;moved.push(tiles[nb]);tiles[blank]=tiles[nb];tiles[nb]=0;blank=nb;
      if(stack.length&&stack[stack.length-1]===OPP[d])stack.pop();else stack.push(d);
    }
    moves+=k;sfx.swish();buzz(6);
    box.querySelectorAll('.hint').forEach(e=>e.classList.remove('hint'));
    render();api.commit();
    /* squash & stretch along the slide direction, then settle */
    const hz=dx!==0,sq=hz?'scale(1.1,.9)':'scale(.9,1.1)',bk=hz?'scale(.96,1.04)':'scale(1.04,.96)';
    moved.forEach((id,q)=>gfx.anim(els[id].firstChild,[{transform:'none'},{transform:sq,offset:.35},{transform:bk,offset:.7},{transform:'none'}],{duration:340,delay:q*25,easing:'ease-out'}));
    moved.forEach(id=>{const t=els[id];if(t.classList.contains('ok')&&!wasOk.has(id))setTimeout(()=>{gfx.pulse(t,'lockin');const[px,py]=centerOf(t);burst(px,py,'#ffffff',9,.55)},240)});
    const np=placed();
    if(np>pl){const t=els[tiles[p]]||els[tiles[blank-dx-dy*w]];api.good(t)}else if(np<pl)api.meh();
    if(tiles.every((t,i)=>t===(i+1)%(w*h))){box.classList.add('done');api.win(starsFor(moves,s3,s2))}
  }
  render();
  return{
    snap:()=>JSON.stringify({tiles,blank,stack,moves}),
    restore(s){({tiles,blank,stack,moves}=JSON.parse(s));render()},
    hint(){
      if(!stack.length)return;
      const d=OPP[stack[stack.length-1]],p=blank+V[d][0]+V[d][1]*w;
      api.flash(els[tiles[p]]);
    }
  };
};
