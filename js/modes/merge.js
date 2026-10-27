'use strict';
/* ---------- Merge Bloom: drag two matching plants together to grow the next stage ----------
   After every merge one new seed appears (position chosen deterministically from the move count), so a level always
   plays the same and the greedy "merge the highest pair" bot gives an exact par. */
const MB_MAX=7,MB_NAMES=['','Seed','Sprout','Sapling','Bud','Flower','Blossom','Golden tree'];
/* seven growth stages drawn as inline SVG (64×64). Gradients live once in a hidden <svg> so every icon can share them. */
(function(){
  if(document.getElementById('mbDefs'))return;
  const d=document.createElement('div');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML=`<svg id="mbDefs" width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="mbSeed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0c98c"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>
    <linearGradient id="mbLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8f58a"/><stop offset="1" stop-color="#2fa84f"/></linearGradient>
    <linearGradient id="mbStem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fd35a"/><stop offset="1" stop-color="#2c8a3a"/></linearGradient>
    <radialGradient id="mbPink" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#ffe3ee"/><stop offset=".55" stop-color="#ff8fba"/><stop offset="1" stop-color="#e0407e"/></radialGradient>
    <radialGradient id="mbLilac" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#f1e6ff"/><stop offset=".55" stop-color="#b99bff"/><stop offset="1" stop-color="#7a4fe0"/></radialGradient>
    <radialGradient id="mbYel" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fffbd0"/><stop offset=".6" stop-color="#ffd23d"/><stop offset="1" stop-color="#e09a00"/></radialGradient>
    <radialGradient id="mbGold" cx=".4" cy=".25" r=".95"><stop offset="0" stop-color="#fff8c8"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#c47a00"/></radialGradient>
    <linearGradient id="mbSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6a46"/><stop offset="1" stop-color="#5a3820"/></linearGradient>
  </defs></svg>`;
  document.body.appendChild(d);
})();
const mbPetals=(n,rx,ry,cy,fill,r0=0,cx0=32,cy0=32)=>[...Array(n)].map((_,i)=>`<ellipse cx="${cx0}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${r0+i*360/n} ${cx0} ${cy0})"/>`).join('');
const MB_SVG=[null,
  /*1*/`<path d="M32 9c11 9 16 21 13 32-2 8-8 14-13 14S21 49 19 41C16 30 21 18 32 9z" fill="url(#mbSeed)"/><path d="M32 19c4 7 5 14 2 22" fill="none" stroke="#ffffff55" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="26.5" cy="27" rx="3" ry="6.4" fill="#ffffff55" transform="rotate(14 26.5 27)"/>`,
  /*2*/`<ellipse cx="32" cy="53" rx="17" ry="5.5" fill="url(#mbSoil)"/><path d="M32 53C32 46 32 41 32 35" fill="none" stroke="url(#mbStem)" stroke-width="3.6" stroke-linecap="round"/><path d="M32 38c-10-1-15-8-15-16 9 0 15 6 15 16z" fill="url(#mbLeaf)"/><path d="M32 42c10-1 14-7 14-14-9 0-14 5-14 14z" fill="url(#mbLeaf)"/><path d="M32 38c-4-5-8-9-14-16" fill="none" stroke="#ffffff50" stroke-width="1.4"/>`,
  /*3*/`<ellipse cx="32" cy="55" rx="17" ry="5" fill="url(#mbSoil)"/><path d="M32 55C32 44 32 30 32 14" fill="none" stroke="url(#mbStem)" stroke-width="3.8" stroke-linecap="round"/><path d="M32 46c-11 0-16-7-16-14 9 0 16 5 16 14z" fill="url(#mbLeaf)"/><path d="M32 38c11 0 16-7 16-14-9 0-16 5-16 14z" fill="url(#mbLeaf)"/><path d="M32 28c-9 0-13-6-13-12 8 0 13 4 13 12z" fill="url(#mbLeaf)"/><path d="M32 22c6-3 9-7 9-13-6 1-9 5-9 13z" fill="url(#mbLeaf)"/>`,
  /*4*/`<ellipse cx="32" cy="55" rx="16" ry="5" fill="url(#mbSoil)"/><path d="M32 55V34" fill="none" stroke="url(#mbStem)" stroke-width="3.8" stroke-linecap="round"/><path d="M32 49c-10 0-14-6-14-12 8 0 14 4 14 12z" fill="url(#mbLeaf)"/><path d="M32 45c10 0 14-6 14-12-8 0-14 4-14 12z" fill="url(#mbLeaf)"/><path d="M32 8c9 6 11 15 9 22-1 5-5 7-9 7s-8-2-9-7c-2-7 0-16 9-22z" fill="url(#mbPink)"/><path d="M32 11v22M26.5 20c3 5 4 10 5.5 16M37.5 20c-3 5-4 10-5.5 16" fill="none" stroke="#ffffff70" stroke-width="1.6" stroke-linecap="round"/><path d="M24 36c3 4 8 5 8 5s5-1 8-5c-3 0-6 1-8 1s-5-1-8-1z" fill="url(#mbLeaf)"/>`,
  /*5*/`<path d="M32 58V38" fill="none" stroke="url(#mbStem)" stroke-width="3.8" stroke-linecap="round"/><path d="M32 52c-9 0-13-5-13-11 8 0 13 4 13 11z" fill="url(#mbLeaf)"/>${mbPetals(5,8,11.5,16,'url(#mbPink)',0,32,27)}<circle cx="32" cy="27" r="7.2" fill="url(#mbYel)"/><circle cx="29.5" cy="24.5" r="2.2" fill="#ffffff90"/>`,
  /*6*/`${mbPetals(8,6.4,13,12,'url(#mbLilac)',22.5)}${mbPetals(6,6.6,10,19,'url(#mbPink)',0)}<circle cx="32" cy="32" r="8.4" fill="url(#mbYel)"/><circle cx="28.5" cy="28.5" r="2.6" fill="#ffffffa0"/><circle cx="35" cy="34.5" r="1.3" fill="#c47a00"/><circle cx="29.5" cy="35.5" r="1.1" fill="#c47a00"/><circle cx="35.5" cy="29.5" r="1.1" fill="#c47a00"/>`,
  /*7*/`<circle cx="32" cy="30" r="28" fill="#ffd16622"/><rect x="28.8" y="38" width="6.6" height="19" rx="3" fill="url(#mbSeed)"/><circle cx="32" cy="24" r="16" fill="url(#mbGold)"/><circle cx="19.5" cy="31" r="11.5" fill="url(#mbGold)"/><circle cx="44.5" cy="31" r="11.5" fill="url(#mbGold)"/><ellipse cx="26" cy="17" rx="6" ry="3.6" fill="#ffffff80" transform="rotate(-24 26 17)"/><path d="M50 12l1.6 3.6L55 17l-3.4 1.4L50 22l-1.6-3.6L45 17l3.4-1.4z" fill="#fff"/><path d="M12 20l1.1 2.5L16 23.6l-2.4 1L12 27l-1.1-2.4L8 23.6l2.4-1z" fill="#fff"/><path d="M52 44l1 2.2 2.4.9-2.4.9L52 50l-1-2.2-2.4-.9 2.4-.9z" fill="#fff"/>`
];
const mbIcon=s=>`<svg viewBox="0 0 64 64" class="mbi">${MB_SVG[s]}</svg>`;
registerMode('merge',{name:'Merge Bloom',icon:'🌸',col:'#e45bc4',tip:'Drag a plant onto a matching one to merge them into the next stage. Grow the goal plant!'},{
  goal:'Grow the plant shown at the top.',
  steps:['Drag a plant onto an identical one. They merge into the next stage.','Every merge plants a new seed, so there is always something to grow.','Keep growing one plant: seed → sprout → sapling → bud → flower and beyond.'],
  demo:()=>htStage(`<div class="mgd"><span class="mgdc">${mbIcon(1)}${HT_F}</span><span class="mgdc">${mbIcon(1)}</span><span class="mgdc"></span></div>`,
    `<div class="mgd"><span class="mgdc"></span><span class="mgdc pop">${mbIcon(2)}</span><span class="mgdc">${mbIcon(1)}</span></div>`,'Drag a seed onto the other seed','They grow into a sprout!')
});

const MB_GOALS=[{G:4,c:1},{G:5,c:1},{G:4,c:2},{G:6,c:1},{G:5,c:2}];
MAKERS.merge=function({R,tier,level,board,api}){
  const n=tier<4?4:5,CELLS=n*n,goal=MB_GOALS[clamp(Math.floor(tier/2),0,MB_GOALS.length-1)];
  const salt=hashSeed(level||7,31);
  /* ---- pure rules (also used by the par bot) ---- */
  const hasPair=g=>{const seen={};for(const v of g)if(v&&v<MB_MAX){if(seen[v])return true;seen[v]=1}return false};
  function spawnOn(g,mv){
    const empty=[];g.forEach((v,i)=>{if(!v)empty.push(i)});
    if(empty.length){
      const h=hashSeed(mv*131+7,salt),cell=empty[h%empty.length];g[cell]=tier>=3&&(h>>5)%5===0?2:1;
    }
    if(!hasPair(g)){ // never leave the player stuck: a twin of the lowest plant appears
      const low=Math.min(...g.filter(v=>v&&v<MB_MAX));const e2=[];g.forEach((v,i)=>{if(!v)e2.push(i)});
      if(e2.length&&isFinite(low))g[e2[hashSeed(mv*17+3,salt)%e2.length]]=low;
    }
  }
  const done=g=>g.filter(v=>v>=goal.G).length>=goal.c;
  function pick(g){ // merge the highest pair below the goal stage (keeps growing one plant)
    for(let v=Math.min(goal.G-1,MB_MAX-1);v>=1;v--){const at=[];g.forEach((x,i)=>{if(x===v)at.push(i)});if(at.length>=2)return[at[0],at[1]]}
    for(let v=MB_MAX-1;v>=1;v--){const at=[];g.forEach((x,i)=>{if(x===v)at.push(i)});if(at.length>=2)return[at[0],at[1]]}
    return null;
  }
  /* ---- initial garden ---- */
  let G=Array(CELLS).fill(0);
  const c0=Math.floor(CELLS*.5);
  shuffle([...Array(CELLS).keys()],R).slice(0,c0).forEach(i=>{const r=R();G[i]=tier>=3&&r<.06?3:tier>=1&&r<.2?2:1});
  if(!hasPair(G)){const e=G.findIndex(v=>!v);const low=Math.min(...G.filter(Boolean));G[e]=low}
  /* ---- par from the bot ---- */
  let sim=G.slice(),par=0;
  while(!done(sim)&&par<700){const p=pick(sim);if(!p)break;sim[p[1]]=sim[p[0]]+1;sim[p[0]]=0;par++;if(!done(sim))spawnOn(sim,par)}
  const s3=par+4+Math.floor(par*.3),s2=Math.ceil(par*1.8)+6;
  let moves=0,sel=-1,shown=Array(CELLS).fill(-1);

  /* ---- DOM ---- */
  const wrap=el('div','mgw');
  const ladder=el('div','mgl');
  ladder.innerHTML=`<span class="mgt">Grow</span>${[...Array(goal.G)].map((_,k)=>`<span class="mgs" data-s="${k+1}">${mbIcon(k+1)}</span>${k<goal.G-1?'<i class="mga">›</i>':''}`).join('')}<span class="mgx">${goal.c>1?`×${goal.c}`:''}</span>`;
  const grid=el('div','mgb glass');grid.style.gridTemplateColumns=`repeat(${n},1fr)`;
  const cells=[...Array(CELLS)].map((_,i)=>{const c=el('div','mg');c.dataset.i=i;grid.appendChild(c);return c});
  wrap.append(ladder,grid);board.appendChild(wrap);api.stagger(cells,22);
  const stageEls=$$('.mgs',ladder);stageEls[stageEls.length-1].classList.add('mgoal');

  function render(){
    cells.forEach((c,i)=>{
      if(shown[i]!==G[i]){shown[i]=G[i];c.innerHTML=G[i]?`<div class="mgi">${mbIcon(G[i])}</div>`:'';c.classList.toggle('full',!!G[i]);c.dataset.s=G[i]||''}
      c.classList.toggle('sel',i===sel);
    });
    const best=Math.max(0,...G),cnt=G.filter(v=>v>=goal.G).length;
    stageEls.forEach((s,k)=>s.classList.toggle('on',best>=k+1));
    ladder.querySelector('.mgx').textContent=goal.c>1?`${Math.min(cnt,goal.c)}/${goal.c}`:'';
    api.coach(`🌸 Grow a ${MB_NAMES[goal.G]}${goal.c>1?` ×${goal.c}`:''}`);
    api.moves(moves,s3,s2);
  }
  api.setTip('Drag a plant onto a matching plant to merge them. Tap one, then tap its twin, works too.');
  render();

  /* ---- merging ---- */
  function cellPos(i){const c=cells[i].getBoundingClientRect();return[c.left+c.width/2,c.top+c.height/2,c.width]}
  /* a merge plays out in beats: the twin flies in, both squeeze together with a flash, the next stage sprouts with a
     squash-and-stretch (light rays from the bud stage on), the neighbours ripple, then the new seed drops in */
  const STAGE_COL=['#9be564','#c8a46a','#9be564','#7fd35a','#ff8fba','#ff8fba','#b99bff','#ffd166'];
  let fgen=0;
  function twin(x0,y0,x1,y1,v,w,dur){
    const t=el('div','mgg mgtw',mbIcon(v));t.style.width=t.style.height=w+'px';document.body.appendChild(t);
    const a=wa(t,[{transform:`translate3d(${x0-w/2}px,${y0-w/2}px,0) scale(1.05)`},{transform:`translate3d(${x1-w/2}px,${y1-w/2}px,0) scale(.8,.7)`,opacity:1,offset:.8},{transform:`translate3d(${x1-w/2}px,${y1-w/2}px,0) scale(.4)`,opacity:0}],{duration:dur,easing:'cubic-bezier(.5,0,.8,.6)',fill:'both'});
    if(a)a.onfinish=()=>t.remove();else t.remove();
  }
  function merge(a,b,from){
    if(api.over()||a===b||!G[a]||G[a]!==G[b]||G[a]>=MB_MAX)return false;
    const v=G[a],[ax,ay]=cellPos(a),[bx,by,cw]=cellPos(b),won=(()=>{const t=G.slice();t[b]=v+1;t[a]=0;return done(t)})();
    const bestBefore=Math.max(0,...G);
    G[b]=v+1;G[a]=0;moves++;sel=-1;
    if(!won)spawnOn(G,moves);
    const before=shown.slice();render();api.commit();
    const my=++fgen,FLY=FL_RM?0:200,nv=v+1,col=STAGE_COL[nv];
    sfx.grow(v);buzz(v>=4?[10,20,10]:8);
    // beat 1: both twins meet on the target cell (from where the finger let go, or from the tapped cell)
    if(FLY){const[fx,fy]=from||[ax,ay];twin(fx,fy,bx,by,v,cw*.9,FLY+60);twin(bx,by,bx,by,v,cw*.9,FLY+60)}
    // beat 2: the new stage sprouts out of the soil line
    const tgt=cells[b].firstElementChild;
    if(tgt)wa(tgt,[{transform:'scale(.2,.08)',opacity:0},{transform:'scale(1.12,1.32)',opacity:1,offset:.42},{transform:'scale(1.06,.9)',offset:.66},{transform:'scale(.98,1.03)',offset:.84},{transform:'none'}],{duration:640,delay:FLY,easing:'cubic-bezier(.3,1.3,.5,1)',fill:'backwards'});
    cells[b].classList.add('mgup');
    if(!FL_RM){
      const fl=el('i','mgflash');cells[b].appendChild(fl);wa(fl,[{transform:'scale(.3)',opacity:0},{transform:'scale(1)',opacity:1,offset:.3},{transform:'scale(1.5)',opacity:0}],{duration:560,delay:FLY-40,easing:'ease-out',fill:'both'}).onfinish=()=>fl.remove();
      if(nv>=4&&Q.tier!=='low'){const r=el('i','mgrays');r.style.setProperty('--c',col);cells[b].insertBefore(r,cells[b].firstChild);
        wa(r,[{transform:'rotate(0) scale(.4)',opacity:0},{transform:'rotate(50deg) scale(1)',opacity:1,offset:.3},{transform:'rotate(140deg) scale(1.15)',opacity:0}],{duration:1100,delay:FLY,easing:'ease-out',fill:'both'}).onfinish=()=>r.remove()}
    }
    setTimeout(()=>{
      if(my!==fgen||!grid.isConnected)return;
      cells[b].classList.remove('mgup');
      ring(bx,by,col,cw*(1.4+nv*.12),600);burst(bx,by,col,7+v*2,.6+v*.08);if(nv>=5)burst(bx,by,'#ffffff',6,.5);
      // the neighbours ripple outward from the merge
      const n0=b%n,m0=(b/n)|0;
      cells.forEach((c,i)=>{if(i===b)return;const dx=i%n-n0,dy=((i/n)|0)-m0,d=Math.hypot(dx,dy);if(d>2.3)return;
        const k=(2.6-d)*2.2;wa(c,[{transform:'none'},{transform:`translate(${dx/d*k}px,${dy/d*k}px) scale(.97)`,offset:.4},{transform:'none'}],{duration:340,delay:d*55,easing:'ease-out'})});
      // name the stage that just grew; a brand-new best stage gets a big callout and its ladder icon pops
      if(nv>bestBefore){
        floatText(bx,by-cw*.55,`${MB_NAMES[nv]}! ${nv>=5?'🌸':'🌱'}`,true);
        const s=stageEls[nv-1];if(s){wa(s,[{transform:'scale(1)'},{transform:'scale(1.7) rotate(-10deg)',offset:.35},{transform:'scale(1.08)'}],{duration:620,easing:'cubic-bezier(.3,1.6,.5,1)'});const[lx,ly]=centerOf(s);burst(lx,ly,col,6,.45)}
      }else if(!FL_RM)floatText(bx,by-cw*.5,MB_NAMES[nv]);
    },FLY);
    // beat 3: the new seed drops into its soil with a little puff
    cells.forEach((c,i)=>{if(i!==b&&G[i]&&before[i]===0&&c.firstElementChild){
      wa(c.firstElementChild,[{transform:'translateY(-70%) scale(.5)',opacity:0},{transform:'translateY(6%) scale(1.12,.82)',opacity:1,offset:.62},{transform:'scale(.96,1.05)',offset:.82},{transform:'none'}],{duration:460,delay:FLY+260,easing:'cubic-bezier(.5,0,.6,1)',fill:'backwards'});
      if(!FL_RM)setTimeout(()=>{if(my===fgen&&grid.isConnected){const[x,y,w]=cellPos(i);burst(x,y+w*.3,'#c8a46a',4,.35)}},FLY+540);
    }});
    api.good(null,{silent:true});
    if(won){api.win(starsFor(moves,s3,s2));setTimeout(()=>{if(grid.isConnected)finish(b)},FLY)}
    else if(!pick(G)&&!hasPair(G)){toast('The garden is full: Undo ↩️ and try another order')}
    return true;
  }
  function finish(b){
    const[x,y,cw]=cellPos(b);sfx.sparkle();fountain(x,y,36);ring(x,y,'#fff',cw*3,800);
    cells[b].classList.add('glow');
  }

  /* ---- dragging ---- */
  let ghost=null,from=-1,tgt=-1,rect=null,moveOnly=false;
  function mkGhost(i){
    const[,,w]=cellPos(i);ghost=el('div','mgg',mbIcon(G[i]));ghost.style.width=ghost.style.height=w*.94+'px';document.body.appendChild(ghost);
    cells[i].classList.add('lifted');
  }
  function targetAt(x,y){
    const r=rect;if(x<r.left||x>r.right||y<r.top||y>r.bottom)return -1;
    const cx=Math.floor((x-r.left)/r.width*n),cy=Math.floor((y-r.top)/r.height*n);return cy*n+cx;
  }
  dragify(grid,{
    start(e){
      if(api.over())return false;
      const c=e.target.closest('.mg');if(!c)return false;
      const i=+c.dataset.i;if(!G[i])return false;
      const a=cells[0].getBoundingClientRect(),z=cells[CELLS-1].getBoundingClientRect();
      rect={left:a.left,top:a.top,right:z.right,bottom:z.bottom,width:z.right-a.left,height:z.bottom-a.top};
      from=i;tgt=-1;mkGhost(i);sfx.lift();return true;
    },
    move(x,y,e){
      if(!ghost)return;const w=ghost.offsetWidth,ly=y-LIFT(e);
      ghost.style.transform=`translate3d(${x-w/2}px,${ly-w/2}px,0) scale(1.14)`;
      const t=targetAt(x,ly);const ok=t>=0&&t!==from&&G[t]===G[from]&&G[t]<MB_MAX?t:-1;
      if(ok!==tgt){if(tgt>=0)cells[tgt].classList.remove('tg');tgt=ok;if(ok>=0){cells[ok].classList.add('tg');sfx.tick(1.4)}}
    },
    end(x,y,e,moved){
      const i=from;if(!ghost)return;
      const t=tgt;if(t>=0)cells[t].classList.remove('tg');tgt=-1;
      const g=ghost;ghost=null;from=-1;cells[i].classList.remove('lifted');
      const drop=()=>g.remove();
      if(moved&&t>=0){drop();merge(i,t,[x,y-LIFT(e)]);return}
      if(!moved){ // tap: pick up / merge with the picked-up twin
        drop();
        if(sel>=0&&sel!==i&&G[sel]===G[i]&&merge(sel,i))return;
        sel=sel===i?-1:i;render();sfx.tick(sel>=0?1.3:.8);return;
      }
      // dropped on nothing useful: float back home
      sfx.bonk();api.meh();
      const[hx,hy,w]=cellPos(i);
      const a=wa(g,[{transform:g.style.transform},{transform:`translate3d(${hx-w*.47}px,${hy-w*.47}px,0) scale(1)`}],{duration:200,easing:'cubic-bezier(.3,1.4,.5,1)'});
      if(a)a.onfinish=drop;else drop();
    },
    cancel(){if(ghost){ghost.remove();ghost=null}if(from>=0)cells[from].classList.remove('lifted');if(tgt>=0)cells[tgt].classList.remove('tg');from=-1;tgt=-1}
  });

  return{
    snap:()=>JSON.stringify({G,moves}),
    restore(s){({G,moves}=JSON.parse(s));sel=-1;fgen++;shown.fill(-1);cells.forEach(c=>c.classList.remove('glow','hint','lifted','tg','mgup'));render()},
    hint(){
      const p=pick(G);if(!p){toast('No pairs left: try Undo ↩️');return false}
      cells.forEach(c=>{c.removeAttribute('data-h');c.classList.remove('hint')});
      [0,1].forEach(k=>{cells[p[k]].dataset.h=k+1;api.flash(cells[p[k]],3200)});
      api.coach('💡 Follow the glow');
      return true;
    },
    _bot(){const p=pick(G);if(!p)return false;return merge(p[0],p[1])},
    destroy(){if(ghost)ghost.remove()}
  };
};
