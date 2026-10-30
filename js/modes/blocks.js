'use strict';
/* ---------- Block Garden: drag garden blocks onto the bed; full rows and columns bloom and clear ----------
   The piece sequence is a deterministic function of the level, so a level always plays the same. A greedy bot plays
   the level at generation time: its piece count is par, and its next move powers the hint. If the bot cannot finish,
   the level is re-rolled (bounded), so every level is known to be finishable. There is no game over: when nothing fits,
   Undo is always available. */
const BG_BASE=[
  [[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[2,0],[1,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]
];
const bgNorm=c=>{const mx=Math.min(...c.map(p=>p[0])),my=Math.min(...c.map(p=>p[1]));return c.map(p=>[p[0]-mx,p[1]-my]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])};
const bgRot=c=>bgNorm(c.map(([x,y])=>[-y,x]));
const bgKey=c=>c.map(p=>p.join(',')).join(';');
/* every orientation of every base shape, each as its own piece (deduplicated) */
const BG_SHAPES=(()=>{const out=[],seen=new Set();BG_BASE.forEach((b,bi)=>{let c=bgNorm(b);for(let r=0;r<4;r++){const k=bgKey(c);if(!seen.has(k)){seen.add(k);out.push({c,base:bi,w:Math.max(...c.map(p=>p[0]))+1,h:Math.max(...c.map(p=>p[1]))+1})}c=bgRot(c)}});return out})();
const BG_COL=[0,5,3,6,2,7,1,8,4,9,0];   // block colour per base shape
/* which base shapes appear at which tier (weights by repetition) */
const bgPool=tier=>{
  const w={0:1,1:2,2:2,3:2};if(tier>=2){w[4]=2;w[5]=1;w[6]=2}if(tier>=4){w[7]=2;w[8]=1}if(tier>=6){w[9]=1;w[10]=1}
  const p=[];BG_SHAPES.forEach((s,i)=>{const n=w[s.base];if(n)for(let k=0;k<n;k++)p.push(i)});return p;
};
registerMode('blocks',{name:'Block Garden',icon:'🌱',col:'#4fb35a',tip:'Drag a block from the tray onto the garden bed. Fill a whole row or column to make it bloom and clear!'},{
  goal:'Clear the number of lines shown, or all the weeds.',
  steps:['Drag a block from the tray onto the bed. On a phone it floats just above your finger.','Fill a whole row or column and it blooms away. A bright outline shows what will clear.','There is no timer and no game over. If nothing fits, use Undo.'],
  demo:()=>htStage(`<div class="mini" style="grid-template-columns:repeat(4,30px)">${[1,1,1,0].map((v,i)=>`<i class="${v?'on':''} ${i===3?'tap':''}">${i===3?HT_F:''}</i>`).join('')}</div>`,
    `<div class="mini" style="grid-template-columns:repeat(4,30px)">${[1,1,1,1].map(()=>'<i class="chg off"></i>').join('')}</div><div class="okbadge">✓</div>`,'Drag the block into the gap','The full row blooms away!')
});

MAKERS.blocks=function({R,tier,level,board,api}){
  const N=tier<2?6:tier<5?7:8;
  const POOL=bgPool(tier);
  const weedLevel=tier>=3&&hashSeed(level||0,53)%2===0;
  const weedsN=Math.min(9,3+Math.floor(tier/2));
  let lineGoal=3+Math.floor(tier*.9);lineGoal=Math.min(lineGoal,12);

  /* ---------- rules (pure; used by the player and the bot) ---------- */
  const fits=(g,s,bx,by)=>{if(bx<0||by<0||bx+s.w>N||by+s.h>N)return false;for(const[x,y]of s.c)if(g[(by+y)*N+bx+x])return false;return true};
  const fullLines=g=>{const r=[],c=[];for(let y=0;y<N;y++){let f=true;for(let x=0;x<N&&f;x++)if(!g[y*N+x])f=false;if(f)r.push(y)}for(let x=0;x<N;x++){let f=true;for(let y=0;y<N&&f;y++)if(!g[y*N+x])f=false;if(f)c.push(x)}return{r,c}};
  /* place a shape; returns {g2, lines, weeds, cells cleared}  */
  function apply(g,s,bx,by,col){
    const g2=g.slice();for(const[x,y]of s.c)g2[(by+y)*N+bx+x]=col;
    const{r,c}=fullLines(g2);let weeds=0;const clr=new Set();
    r.forEach(y=>{for(let x=0;x<N;x++)clr.add(y*N+x)});c.forEach(x=>{for(let y=0;y<N;y++)clr.add(y*N+x)});
    clr.forEach(i=>{if(g2[i]===-1)weeds++;g2[i]=0});
    return{g2,lines:r.length+c.length,weeds,clr,r,c};
  }
  const placements=(g,s)=>{const o=[];for(let y=0;y+s.h<=N;y++)for(let x=0;x+s.w<=N;x++)if(fits(g,s,x,y))o.push([x,y]);return o};
  /* greedy score: clear lines first, then snug placement (contact) and nearly-full lines */
  function score(g,s,bx,by){
    const a=apply(g,s,bx,by,1);let sc=a.lines*60+a.weeds*45;
    const mine=new Set(s.c.map(([x,y])=>(by+y)*N+bx+x));let contact=0;
    for(const i of mine){const x=i%N,y=(i/N)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=N||Y>=N)contact+=.6;else if(g[Y*N+X]&&!mine.has(Y*N+X))contact+=1}}
    sc+=contact*3;
    const rows=new Set([...mine].map(i=>(i/N)|0)),cols=new Set([...mine].map(i=>i%N));
    rows.forEach(y=>{let f=0;for(let x=0;x<N;x++)if(a.g2[y*N+x])f++;sc+=f*f*.35});cols.forEach(x=>{let f=0;for(let y=0;y<N;y++)if(a.g2[y*N+x])f++;sc+=f*f*.35});
    return sc;
  }
  function bestMove(g,tray){
    let best=null;
    tray.forEach((si,slot)=>{if(si==null)return;const s=BG_SHAPES[si];for(const[x,y]of placements(g,s)){const sc=score(g,s,x,y);if(!best||sc>best.sc)best={slot,x,y,sc}}});
    return best;
  }
  /* ---------- level set-up: piece sequence, weeds, bot par (re-rolled until the bot can finish) ---------- */
  let seqSalt=hashSeed(level||0,41),G0,goalLines=lineGoal,par=0;
  const pieceAt=k=>POOL[hashSeed(k,seqSalt)%POOL.length];
  const trayAt=k=>[pieceAt(k),pieceAt(k+1),pieceAt(k+2)];
  const goalMet=(lines,g)=>weedLevel?!g.includes(-1):lines>=goalLines;
  for(let attempt=0;attempt<9;attempt++){
    G0=Array(N*N).fill(0);
    if(weedLevel)shuffle([...Array(N*N).keys()],R).slice(0,weedsN).forEach(i=>G0[i]=-1);
    if(attempt>=5)goalLines=Math.max(2,goalLines-2);
    let g=G0.slice(),k=3,tray=trayAt(0),lines=0,n=0,dead=false;
    while(!goalMet(lines,g)&&n<130){
      const m=bestMove(g,tray);if(!m){dead=true;break}
      const a=apply(g,BG_SHAPES[tray[m.slot]],m.x,m.y,1);g=a.g2;lines+=a.lines;tray[m.slot]=null;n++;
      if(tray.every(v=>v==null)){tray=trayAt(k);k+=3}
    }
    if(!dead&&goalMet(lines,g)&&n>0){par=n;break}
    seqSalt=hashSeed(attempt+1,seqSalt);par=0;
  }
  if(!par){par=20}
  const s3=par+4+Math.floor(par*.3),s2=Math.ceil(par*1.8)+6;

  /* ---------- state ---------- */
  let G=G0.slice(),tray=trayAt(0),nextK=3,lines=0,moves=0,finished=false,gen=0,vis=G.slice(),vlines=0,combo=0;
  let weedsLeft=G.filter(v=>v===-1).length;

  /* ---------- DOM ---------- */
  const wrap=el('div','bgw');wrap.style.setProperty('--n',N);
  const prog=el('div','bgp','<span class="bgpt"></span><div class="bgpb"><i></i></div>');
  const grid=el('div','bgb glass');grid.style.gridTemplateColumns=`repeat(${N},1fr)`;
  const cells=[...Array(N*N)].map(()=>{const c=el('div','bz');grid.appendChild(c);return c});
  const fxL=el('div','bgfx');grid.appendChild(fxL);   // overlay for line beams and flowers (absolute, outside the grid flow)
  const trayEl=el('div','bgt');
  const slots=[0,1,2].map(i=>{const s=el('div','bgs');s.dataset.slot=i;trayEl.appendChild(s);return s});
  wrap.append(prog,grid,trayEl);board.appendChild(wrap);api.stagger(cells,10);
  const progT=$('.bgpt',prog),progB=$('.bgpb i',prog);
  let cs=40,cp=44,ox=0,oy=0;   // cell size / pitch / origin in client px (measured when needed)
  function measure(){   // from the board's box (immune to per-cell animation transforms)
    const r=grid.getBoundingClientRect(),st=getComputedStyle(grid),pl=parseFloat(st.paddingLeft)||0,pt=parseFloat(st.paddingTop)||0,pr=parseFloat(st.paddingRight)||0,gap=parseFloat(st.columnGap)||0;
    cs=(r.width-pl-pr-gap*(N-1))/N;cp=cs+gap;ox=r.left+pl;oy=r.top+pt;
  }
  const colOf=v=>COLORS[(v-1)%COLORS.length];

  function pieceHTML(s,size,gap){return `<div class="bpc" style="grid-template-columns:repeat(${s.w},${size}px);grid-template-rows:repeat(${s.h},${size}px);gap:${gap}px">${
    [...Array(s.w*s.h)].map((_,i)=>{const x=i%s.w,y=(i/s.w)|0,on=s.c.some(p=>p[0]===x&&p[1]===y);return on?`<i class="bp" style="--c:${COLORS[BG_COL[s.base]]}"></i>`:'<i></i>'}).join('')}</div>`}
  function renderTray(refill){
    const slotW=slots[0].clientWidth||80,slotH=slots[0].clientHeight||70;
    slots.forEach((el_,i)=>{
      const si=tray[i];
      if(si==null){el_.innerHTML='';el_.classList.add('used');return}
      el_.classList.remove('used');const s=BG_SHAPES[si];
      const size=Math.max(10,Math.min(cs*.62,(slotW-14)/s.w-2,(slotH-14)/s.h-2));
      el_.innerHTML=pieceHTML(s,size,2);
      /* B7: a fresh set of three slides in from the right, one after another */
      if(refill)wa(el_.firstElementChild,[{transform:'translateX(70px) scale(.8)',opacity:0},{transform:'none',opacity:1}],{duration:420,delay:i*70,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'backwards'});
    });
  }
  function render(){
    cells.forEach((c,i)=>{
      const v=vis[i];if(c._v===v)return;c._v=v;
      if(v>0){c.className='bz f';c.style.setProperty('--c',colOf(v))}
      else if(v===-1){c.className='bz w';c.style.removeProperty('--c')}
      else{c.className='bz';c.style.removeProperty('--c')}
    });
    if(weedLevel){const left=vis.filter(v=>v===-1).length;progT.textContent=left?`🌿 Pull out the weeds · ${weedsN-left}/${weedsN}`:'🌸 Garden weeded!';progB.style.width=(weedsN-left)/weedsN*100+'%'}
    else{progT.textContent=`🌸 Bloom ${goalLines} lines · ${Math.min(vlines,goalLines)}/${goalLines}`;progB.style.width=Math.min(1,vlines/goalLines)*100+'%'}
    api.coach(finished?'🌸 Beautiful garden!':'🌱 Drag a block onto the bed');
    api.moves(moves,s3,s2);
  }
  api.setTip('Drag a block onto the bed. Fill a whole row or column to bloom it away. A bright outline shows what will clear.');
  requestAnimationFrame(()=>{measure();renderTray()});render();
  const ro=window.ResizeObserver?new ResizeObserver(()=>{if(grid.isConnected){measure();renderTray()}}):null;if(ro)ro.observe(wrap);

  /* ---------- placing ---------- */
  function place(slot,bx,by){
    const si=tray[slot];if(si==null||finished)return false;const s=BG_SHAPES[si];if(!fits(G,s,bx,by))return false;
    measure();
    const col=BG_COL[s.base]+1,mine=s.c.map(([x,y])=>(by+y)*N+bx+x);
    const a=apply(G,s,bx,by,col);
    // visual step 1: the block lands
    vis=G.slice();mine.forEach(i=>vis[i]=col);
    G=a.g2;lines+=a.lines;moves++;tray[slot]=null;
    let refilled=false;if(tray.every(v=>v==null)){tray=trayAt(nextK);nextK+=3;refilled=true}
    const my=++gen;
    render();renderTray(refilled);
    mine.forEach(i=>again(cells[i],'l'));
    sfx.tok();buzz(10);
    api.commit();
    const won=goalMet(lines,G);
    if(a.lines){
      // step 2: full lines bloom away (after the block has landed)
      setTimeout(()=>{if(my===gen&&grid.isConnected)bloom(a,bx+(s.w-1)/2,by+(s.h-1)/2,my)},150);
    }else{combo=0;api.meh();vis=G.slice();vlines=lines}
    if(won){
      finished=true;api.lock();   // the win plays out for up to 1.25 s: nothing may throw it away meanwhile
      setTimeout(()=>{if(my!==gen)return;sfx.sparkle();fountain(ox+N*cp/2,oy+N*cp/2,40);vis=G.slice();vlines=lines;render();api.win(starsFor(moves,s3,s2))},a.lines?1250:350);
    }else{
      setTimeout(()=>{if(my===gen)checkStuck()},a.lines?1150:150);
    }
    return true;
  }
  /* ---------- the bloom: a light beam sweeps each full line from where the block landed, every block flashes and
     turns into a flower of its own colour that floats away, petals fly into the progress bar, then the bar ticks up ---------- */
  const BLOOM_LABEL=['','Bloom!','Double bloom!','Triple bloom!'];
  /* one flower template (petal colour from --fc), cloned per block: far cheaper than parsing SVG markup each time */
  const FLOWER=el('i','bgfl',`<svg viewBox="0 0 40 40">${[0,72,144,216,288].map(r=>`<g transform="rotate(${r} 20 20)"><ellipse class="pt" cx="20" cy="10.5" rx="7.2" ry="10"/><ellipse cx="20" cy="9" rx="3" ry="5.4" fill="#ffffff70"/></g>`).join('')}<circle cx="20" cy="20" r="6.6" fill="#ffd23d" stroke="#e09a00" stroke-width="1.2"/><circle cx="18" cy="18" r="2.1" fill="#fffc"/></svg>`);
  const FLOWER_EVERY={high:2,med:2,low:3};   // a flower on every other cleared cell reads just as full and halves the animations
  const cellXY=(x,y)=>[ox+x*cp+cs/2,oy+y*cp+cs/2];   // client centre of a cell
  function bloom(a,cx,cy,my){
    // every layout read happens up front; after this point the function only writes (no forced re-layouts)
    measure();combo++;
    const st=getComputedStyle(grid),n=a.lines,gap=cp-cs,pad=[parseFloat(st.paddingLeft)||0,parseFloat(st.paddingTop)||0],len=N*cp-gap;
    const bar=$('.bgpb',prog).getBoundingClientRect();
    const L=[...a.r.map(k=>({row:1,k})),...a.c.map(k=>({row:0,k}))],frag=document.createDocumentFragment(),anims=[],every=FLOWER_EVERY[Q.tier]||1;
    a.clr.forEach(i=>{
      const x=i%N,y=(i/N)|0,d=Math.round(Math.hypot(x-cx,y-cy)*40),c=cells[i];
      c.style.setProperty('--d',d+'ms');c.classList.add('bloom');
      if(FL_RM||(x+y)%every)return;
      const f=FLOWER.cloneNode(true);f.style.cssText=`left:${pad[0]+x*cp}px;top:${pad[1]+y*cp}px;width:${cs}px;height:${cs}px;--fc:${vis[i]>0?colOf(vis[i]):'#ffffff'}`;frag.appendChild(f);
      const sp=(Math.random()<.5?-1:1)*(25+Math.random()*30);
      anims.push([f,[{transform:'scale(0) rotate(-120deg)',opacity:0},{transform:'scale(1.3) rotate(12deg)',opacity:1,offset:.28},{transform:'scale(1) rotate(0)',opacity:1,offset:.5},
        {transform:`translate(${(Math.random()-.5)*cs*.6}px,${-cp*1.3}px) scale(.55) rotate(${sp}deg)`,opacity:0}],{duration:1050,delay:120+d,easing:'cubic-bezier(.3,.9,.4,1)',fill:'both'}]);
    });
    if(!FL_RM)L.forEach(l=>{
      const b=el('i','bgbeam'+(l.row?'':' v')),o=(l.row?cx:cy)*cp+cs/2+3;
      b.style.cssText=l.row?`left:${pad[0]-3}px;top:${pad[1]+l.k*cp-3}px;width:${len+6}px;height:${cs+6}px;transform-origin:${o}px 50%`
        :`left:${pad[0]+l.k*cp-3}px;top:${pad[1]-3}px;width:${cs+6}px;height:${len+6}px;transform-origin:50% ${o}px`;
      frag.appendChild(b);
      const sc=l.row?'scaleX':'scaleY',th=l.row?'scaleY':'scaleX';
      anims.push([b,[{transform:`${sc}(0)`,opacity:1},{transform:`${sc}(1)`,opacity:1,offset:.35},{transform:`${sc}(1) ${th}(1.15)`,opacity:.9,offset:.55},{transform:`${sc}(1.04) ${th}(.15)`,opacity:0}],{duration:720,easing:'cubic-bezier(.2,.8,.3,1)',fill:'both'}]);
    });
    fxL.appendChild(frag);
    anims.forEach(([e,k,o])=>{e.animate(k,o).onfinish=()=>e.remove()});
    sfx.lineBloom(n,combo);buzz(n>=2?[14,30,14,30,22]:[12,30,18]);
    const[px,py]=cellXY(cx,cy),[mx,my_]=cellXY((N-1)/2,(N-1)/2);
    ring(px,py,'#ffd6e8',len*(n>=2?1.5:1.05),760);
    /* sparkles along each line, and petals flying to the progress bar */
    const goal=weedLevel?weedsN:goalLines,after=weedLevel?weedsN-G.filter(v=>v===-1).length:lines;
    const tx=bar.left+bar.width*Math.min(1,after/goal),ty=bar.top+bar.height/2;
    L.forEach((l,li)=>{
      for(let k=0;k<2;k++){const[x,y]=l.row?cellXY((N-1)*(k*2+1)/4,l.k):cellXY(l.k,(N-1)*(k*2+1)/4);setTimeout(()=>{if(my===gen)burst(x,y,k?'#ffd166':'#ff8fba',4,.6)},120+k*120)}
      if(FL_RM)return;
      const[sx,sy]=l.row?cellXY(cx,l.k):cellXY(l.k,cy);
      for(let k=0,m=Math.max(2,Math.round(4*Q.pscale));k<m;k++){
        const p=el('i','bgpet');p.style.cssText=`--c:${k%2?'#ff8fba':'#ffd6e8'};left:${sx-6}px;top:${sy-6}px`;document.body.appendChild(p);
        const hx=(sx+tx)/2+(Math.random()-.5)*120,hy=Math.min(sy,ty)-40-Math.random()*60;
        p.animate([{transform:'translate(0,0) scale(.3) rotate(0)',opacity:0},{transform:`translate(${hx-sx}px,${hy-sy}px) scale(1.2) rotate(${200+k*40}deg)`,opacity:1,offset:.45},{transform:`translate(${tx-sx}px,${ty-sy}px) scale(.5) rotate(${420+k*60}deg)`,opacity:.9}],
          {duration:620,delay:260+li*70+k*45,easing:'cubic-bezier(.45,0,.55,1)',fill:'both'}).onfinish=()=>p.remove();
      }
    });
    const label=n>=4?`Mega bloom! ×${n}`:BLOOM_LABEL[n];
    const tt=el('div','bgtxt'+(n>=2?' big':''),`🌸 ${label}${combo>=2?`<small>Combo ×${combo} 🔥</small>`:''}`);tt.style.left=mx+'px';tt.style.top=my_-cp*.3+'px';document.body.appendChild(tt);setTimeout(()=>tt.remove(),1300);
    if(n>=2||combo>=3)setTimeout(()=>{if(my===gen)fountain(mx,my_,16+n*8)},200);
    wa(grid,[{transform:'scale(1)'},{transform:`scale(${n>=2?1.035:1.02})`,offset:.25},{transform:'scale(.995)',offset:.6},{transform:'scale(1)'}],{duration:480,delay:80,easing:'ease-out'});
    gfx.pulse(fxL,'bglow');
    api.good(null,{silent:true});
    /* the bed resets, the empty soil fades back in, and the progress bar ticks up as the petals arrive */
    setTimeout(()=>{
      if(my!==gen)return;vis=G.slice();vlines=lines;
      a.clr.forEach(i=>{const c=cells[i];c.classList.remove('bloom');c.style.removeProperty('--d');wa(c,[{transform:'scale(.4)',opacity:0},{transform:'none',opacity:1}],{duration:280,delay:((i%N)+((i/N)|0))*12,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'backwards'})});
      render();
      wa($('.bgpb',prog),[{transform:'scaleY(1)'},{transform:'scaleY(1.7)',offset:.3},{transform:'scaleY(1)'}],{duration:520,easing:'ease-out'});
      wa(progT,[{transform:'scale(1)'},{transform:'scale(1.18)',offset:.35},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.3,1.6,.5,1)'});
      burst(tx,ty,'#b4f06a',6,.5);
    },880);
  }
  function checkStuck(){
    if(finished||api.over())return;
    const any=tray.some(si=>si!=null&&placements(G,BG_SHAPES[si]).length);
    if(!any){toast('No room for these blocks 🌿 Undo ↩️ to try another way');const u=$('#undoBtn');u.classList.add('glow');setTimeout(()=>u.classList.remove('glow'),3200)}
  }

  /* ---------- dragging ---------- */
  let ghost=null,slotI=-1,target=null,pvCells=[],clrCells=[];
  function clearPv(){pvCells.forEach(c=>c.classList.remove('pv'));clrCells.forEach(c=>c.classList.remove('clr'));pvCells=[];clrCells=[]}
  function snapTo(x,y,e){
    // piece centre -> fractional anchor; try the nearest valid anchor within one cell
    const s=BG_SHAPES[tray[slotI]],gy=y-LIFT(e);
    const fx=(x-(ox+cs/2))/cp-(s.w-1)/2,fy=(gy-(oy+cs/2))/cp-(s.h-1)/2;
    if(fx<-1.2||fy<-1.2||fx>N-s.w+1.2||fy>N-s.h+1.2)return null;
    const rx=Math.round(fx),ry=Math.round(fy);let best=null,bd=9;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=rx+dx,Y=ry+dy;if(!fits(G,s,X,Y))continue;const d=Math.hypot(X-fx,Y-fy);if(d<bd){bd=d;best=[X,Y]}}
    return bd<=1.45?best:null;
  }
  function showPreview(t){
    clearPv();if(!t)return;
    const s=BG_SHAPES[tray[slotI]],mine=s.c.map(([x,y])=>(t[1]+y)*N+t[0]+x);
    mine.forEach(i=>{cells[i].classList.add('pv');pvCells.push(cells[i])});
    const a=apply(G,s,t[0],t[1],1);
    if(a.lines)a.clr.forEach(i=>{cells[i].classList.add('clr');clrCells.push(cells[i])});
  }
  dragify(wrap,{
    start(e){
      if(api.over()||finished)return false;
      const sl=e.target.closest&&e.target.closest('.bgs');if(!sl)return false;
      const i=+sl.dataset.slot;if(tray[i]==null)return false;
      measure();slotI=i;target=null;
      const s=BG_SHAPES[tray[i]];ghost=el('div','bgg',pieceHTML(s,cs,cp-cs));document.body.appendChild(ghost);
      sl.classList.add('lifted');sfx.lift();return true;
    },
    move(x,y,e){
      if(!ghost)return;
      const w=ghost.offsetWidth,h=ghost.offsetHeight,ly=y-LIFT(e);
      ghost.style.transform=`translate3d(${x-w/2}px,${ly-h/2}px,0) scale(1.08)`;
      const t=snapTo(x,y,e),same=(t&&target&&t[0]===target[0]&&t[1]===target[1])||(!t&&!target);
      if(!same){target=t;showPreview(t);if(t)sfx.tick(1.5)}
    },
    end(x,y,e,moved){
      if(!ghost)return;const i=slotI,t=target,g=ghost;ghost=null;slotI=-1;target=null;clearPv();slots[i].classList.remove('lifted');
      if(moved&&t&&place(i,t[0],t[1])){g.remove();return}
      // nothing valid: float the block back to its slot
      if(moved){sfx.bonk();api.meh()}
      const r=slots[i].getBoundingClientRect(),w=g.offsetWidth,h=g.offsetHeight;
      const a=wa(g,[{transform:g.style.transform},{transform:`translate3d(${r.left+r.width/2-w/2}px,${r.top+r.height/2-h/2}px,0) scale(.7)`,opacity:.3}],{duration:190,easing:'ease-out'});
      /* B6: the block lands back in its slot and the slot gives a little shake */
      const back=()=>{g.remove();if(moved)wa(slots[i],[{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'none'}],{duration:170})};
      if(a)a.onfinish=back;else g.remove();
    },
    cancel(){if(ghost){ghost.remove();ghost=null}if(slotI>=0)slots[slotI].classList.remove('lifted');slotI=-1;target=null;clearPv()}
  });

  /* ---------- hint / bot / undo ---------- */
  let hintT=0;
  function clearHint(){clearTimeout(hintT);cells.forEach(c=>c.classList.remove('ht'));slots.forEach(s=>{s.classList.remove('hint');s.removeAttribute('data-h')})}
  function restoreState(s){
    ({G,tray,nextK,lines,moves}=JSON.parse(s));gen++;finished=false;vis=G.slice();vlines=lines;combo=0;clearHint();clearPv();
    fxL.innerHTML='';cells.forEach(c=>{c.classList.remove('la','lb','bloom');c.style.removeProperty('--d');c._v=null});measure();render();renderTray();requestAnimationFrame(checkStuck);
  }
  return{
    snap:()=>JSON.stringify({G,tray,nextK,lines,moves}),
    restore:restoreState,
    hint(){
      const m=bestMove(G,tray);if(!m){toast('No room left: try Undo ↩️');return false}
      clearHint();const s=BG_SHAPES[tray[m.slot]];
      s.c.forEach(([x,y])=>cells[(m.y+y)*N+m.x+x].classList.add('ht'));
      slots[m.slot].dataset.h=1;api.flash(slots[m.slot],3200);cells[m.y*N+m.x].dataset.h=2;hintT=setTimeout(clearHint,3300);
      api.coach('💡 Follow the glow');
      return true;
    },
    _bot(){const m=bestMove(G,tray);if(!m)return false;return place(m.slot,m.x,m.y)},
    destroy(){gen++;if(ro)ro.disconnect();if(ghost)ghost.remove();clearHint()}
  };
};
