'use strict';
/* ====================== GRID PUZZLES: Lights Out, Spin Lock, Slide Tiles ======================
   Makers talk to the harness through `api` (see js/ui.js): moves(m,s3,s2,limit) star meter · good(el)/meh() combo ·
   commit() undo snapshot · win(stars) · fail(title,msg) · coach/setTip/setInfo/flash/shake/stagger */
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
  const apply=(g,i)=>{const x=i%n,y=(i/n)|0;for(const[dx,dy]of offs){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<n&&Y<n)g[Y*n+X]^=1}};
  const k=Math.min(Math.ceil(n*n*.3),2+Math.floor(tier*.4));
  let sol,grid;
  do{
    const idx=shuffle([...Array(n*n).keys()],R).slice(0,k);
    sol=Array(n*n).fill(0);idx.forEach(i=>sol[i]=1);
    grid=Array(n*n).fill(0);idx.forEach(i=>apply(grid,i));
  }while(grid.every(v=>!v));
  const par=k,s3=par+1,s2=par*2+3;
  let U=Array(n*n).fill(0),moves=0;
  const wrap=el('div','grid glass');wrap.style.gridTemplateColumns=`repeat(${n},1fr)`;
  const cells=grid.map((_,i)=>{const c=el('button','cell light','<i></i>');c.onclick=()=>press(i);wrap.appendChild(c);return c});
  board.appendChild(wrap);api.stagger(cells);
  function render(){cells.forEach((c,i)=>c.classList.toggle('on',!!grid[i]));
    const lit=grid.filter(v=>v).length;
    api.coach(lit?`💡 ${lit} light${lit>1?'s':''} still on`:'🌙 All dark!');
    api.moves(moves,s3,s2)}
  api.setTip(`Tap a square to flip it and ${patIcon(offs)} the squares shown. Turn every light off.`);
  function press(i){
    if(api.over())return;
    const need=sol[i]^U[i],before=grid.slice();apply(grid,i);U[i]^=1;moves++;
    const lit=grid.filter(v=>v).length;sfx.flip(1+(n*n-lit)/(n*n)*.7);buzz(8);
    const x0=i%n,y0=(i/n)|0;
    cells.forEach((c,j)=>{if(before[j]===grid[j])return;
      const d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0);c.style.animationDelay=d*70+'ms';c.classList.remove('flip');void c.offsetWidth;c.classList.add('flip');
      if(before[j]&&!grid[j])setTimeout(()=>{const[x,y]=centerOf(c);burst(x,y,'#ffd166',7,.6)},d*70+120)});
    const[cx,cy]=centerOf(cells[i]);ring(cx,cy,'var(--acc)',cells[i].offsetWidth*2.4);
    need?api.good(cells[i]):api.meh();
    cells.forEach(c=>c.classList.remove('hint'));
    render();api.commit();
    if(!lit)api.win(starsFor(moves,s3,s2));
  }
  render();
  return{
    snap:()=>JSON.stringify({grid,U,moves}),
    restore(s){({grid,U,moves}=JSON.parse(s));render()},
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
      const x=j%n,y=(j/n)|0;
      for(const[dx,dy]of offs){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<n&&Y<n)ang[Y*n+X]+=t}
    });
  }while(ang.every(a=>a%4===0));
  const par=sol.reduce((a,b)=>a+b,0),s3=par+1,s2=par*2+3;
  let U=Array(n*n).fill(0),moves=0;
  const wrap=el('div','grid glass');wrap.style.gridTemplateColumns=`repeat(${n},1fr)`;
  const arrow='<svg viewBox="0 0 24 24"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M12 2.5l8.5 10.5h-5.2v8.5H8.7V13H3.5z"/><path d="M12 2.5l8.5 10.5h-5.2v8.5H8.7V13H3.5z" fill="url(#ag)"/></svg>';
  const cells=ang.map((_,i)=>{const c=el('button','cell rot',`<div class="dial">${arrow}</div>`);c.onclick=()=>tap(i);wrap.appendChild(c);return c});
  const svgs=cells.map(c=>c.querySelector('svg'));
  board.appendChild(wrap);api.stagger(cells);
  function render(){cells.forEach((c,i)=>{svgs[i].style.transform=`rotate(${ang[i]*90}deg)`;c.classList.toggle('ok',ang[i]%4===0)});
    const bad=ang.filter(a=>a%4).length;
    api.coach(bad?`🧭 ${bad} arrow${bad>1?'s':''} still not pointing up`:'🔓 Unlocked!');
    api.moves(moves,s3,s2)}
  api.setTip(`Tap an arrow: it and ${patIcon(offs)} the arrows shown turn a quarter turn clockwise. Make every arrow point up.`);
  function tap(i){
    if(api.over())return;
    const need=((sol[i]-U[i])%4+4)%4!==0,wasOk=ang.map(a=>a%4===0);
    const x=i%n,y=(i/n)|0;
    for(const[dx,dy]of offs){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<n&&Y<n)ang[Y*n+X]++}
    U[i]=(U[i]+1)%4;moves++;sfx.ratchet();buzz(8);
    cells.forEach(c=>c.classList.remove('hint'));render();api.commit();
    const[cx,cy]=centerOf(cells[i]);ring(cx,cy,'#9be564',cells[i].offsetWidth*2.2);
    cells.forEach((c,j)=>{if(!wasOk[j]&&ang[j]%4===0){const[px,py]=centerOf(c);burst(px,py,'#6be585',8,.6)}});
    need?api.good(cells[i]):api.meh();
    if(ang.every(a=>a%4===0))api.win(starsFor(moves,s3,s2));
  }
  render();
  return{
    snap:()=>JSON.stringify({ang,U,moves}),
    restore(s){({ang,U,moves}=JSON.parse(s));render()},
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
  const par=stack.length,s3=par+2,s2=Math.ceil(par*1.8)+6;
  const box=el('div','slidebox');box.style.aspectRatio=`${w}/${h}`;
  box.style.setProperty('--bs',`min(92vw,calc(100dvh - 380px),480px,calc((100dvh - 380px) * ${w/h}))`);
  const els={};
  for(let id=1;id<w*h;id++){
    const t=el('div','tile');t.style.width=100/w+'%';t.style.height=100/h+'%';
    const gx=(id-1)%w,gy=((id-1)/w)|0,hue=(200+gx*(150/w)+gy*(110/h))%360;
    t.innerHTML=`<div style="background:linear-gradient(160deg,hsl(${hue} 85% 66%),hsl(${hue+25} 78% 46%))">${id}</div>`;
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
    tiles.forEach((id,p)=>{if(!id)return;const t=els[id];t.style.left=(p%w)*100/w+'%';t.style.top=((p/w)|0)*100/h+'%';t.classList.toggle('ok',id===p+1)});
    const bx=blank%w,by=(blank/w)|0;
    tiles.forEach((id,p)=>{if(id)els[id].classList.toggle('mv',p%w===bx||((p/w)|0)===by)});
    api.coach(`🔢 ${placed()} of ${w*h-1} tiles in place`);
    api.moves(moves,s3,s2);
  }
  function tryMove(p){
    if(api.over()||p<0||p===blank)return;
    const x=p%w,y=(p/w)|0,bx=blank%w,by=(blank/w)|0;
    if(x!==bx&&y!==by){sfx.bad();api.coach('↔️ Only tiles in the same row or column as the gap can slide');return}
    const pl=placed(),dx=Math.sign(x-bx),dy=Math.sign(y-by),k=Math.abs(x-bx)+Math.abs(y-by);
    const d=Object.keys(V).find(q=>V[q][0]===dx&&V[q][1]===dy);
    for(let i=0;i<k;i++){
      const nb=blank+dx+dy*w;tiles[blank]=tiles[nb];tiles[nb]=0;blank=nb;
      if(stack.length&&stack[stack.length-1]===OPP[d])stack.pop();else stack.push(d);
    }
    moves+=k;sfx.swish();buzz(6);
    box.querySelectorAll('.hint').forEach(e=>e.classList.remove('hint'));
    render();api.commit();
    const np=placed();
    if(np>pl){const t=els[tiles[p]]||els[tiles[blank-dx-dy*w]];api.good(t)}else if(np<pl)api.meh();
    if(tiles.every((t,i)=>t===(i+1)%(w*h)))api.win(starsFor(moves,s3,s2));
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

