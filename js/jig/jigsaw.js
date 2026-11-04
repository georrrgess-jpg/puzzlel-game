'use strict';
/* ====================== Jigsaw: the puzzle ======================
   A picture cut into a grid (2x2 up to 5x5) and shuffled. Drag a piece (or tap it, then tap a spot) to move it: the
   pieces it lands on trade places with it. Two pieces that belong side by side lock together for good and from then on
   move as one group. The puzzle is done when every piece is home.
   Groups never break. When a group moves, every group it lands on is lifted out whole and fitted, without turning or
   splitting, into the space that is left; single pieces go to the nearest free spot (by preference straight back where
   the moving group came from, so a plain drag reads as a swap). If the groups it lands on cannot be fitted, the move
   is refused and the group springs back.
   Pieces are drawn like Picture Pop cards: a coloured frame around a slice of the picture. Where two pieces are locked
   together the frame and the rounded corners between them melt away, so a finished group reads as one card. */
const JIG_SIZES=[[2,2],[2,3],[3,3],[3,4],[4,4],[4,5],[5,5]];
/* grid size for puzzle n: a gentle climb through the first album page, then mostly 4x5 and 5x5 with a smaller
   breather every few puzzles (12 puzzles = one album page; the page ends on a big one) */
const JIG_EARLY=[0,1,2,3,2,3,4,3,4,5,4,5],JIG_MID=[4,5,3,5,4,6,4,5,6,4,5,6],JIG_LATE=[5,6,4,6,5,6,3,6,5,6,4,6];
const jigSize=n=>{const i=(n-1)%12;return n<=12?JIG_EARLY[i]:n<=36?JIG_MID[i]:JIG_LATE[i]};
/* star targets in moves, by number of pieces (measured against the solver; a careful player beats it) */
const jigPar=N=>({s3:N+1,s2:Math.ceil(N*1.6)+2});
/* pictures as image URLs, kept for a while (the album shows the same ones again) */
const JigPic=(()=>{
  const cache=new Map();
  function get(n){
    let r=cache.get(n);
    if(r){cache.delete(n);cache.set(n,r);return r}
    const c=JIGART.compose(n);r={...c,url:URL.createObjectURL(new Blob([c.svg],{type:'image/svg+xml'}))};delete r.svg;
    cache.set(n,r);
    if(cache.size>48){const k=cache.keys().next().value;URL.revokeObjectURL(cache.get(k).url);cache.delete(k)}
    return r;
  }
  return{get};
})();
INFO.jigsaw={name:'Jigsaw',icon:'🧩',col:'#ff8a3d',tip:'Drag a piece onto another to swap them. Pieces that belong together lock and move as one.'};
HOWTO.jigsaw={
  goal:'Put the picture back together.',
  steps:['Drag a piece onto another piece: they swap places. (Tap a piece, then tap a spot, works too.)','Two pieces that belong side by side lock together and from then on move as one.','Drag a whole group to move it. Hold 👁️ Peek to see the finished picture.'],
  demo:()=>{const a=ppArt(5,160),q=(k,c='')=>`<span class="jdq ${c}"><svg viewBox="${k%2?60:0} ${k>1?80:0} 60 80" preserveAspectRatio="none"><use href="#${a}"/></svg></span>`;
    return htStage(`<div class="jdm">${q(1,'tap')}${q(0)}${q(2)}${q(3)}${HT_F}</div>`,`<div class="jdm done">${q(0,'jl')}${q(1,'jr')}${q(2)}${q(3)}</div>`,'Swap the two top pieces','They lock together')}
};
sfx.jigLift=()=>{if(!ok())return;voice({f:420,dur:.07,type:'triangle',vol:.09,slide:1.5,slideT:.05})};
sfx.jigDrop=()=>{if(!ok())return;voice({f:240,dur:.09,vol:.16,slide:.7});noise({dur:.03,vol:.06,type:'bandpass',f:1600,q:2})};
sfx.jigSnap=k=>{if(!ok())return;const b=Math.min(6,k|0);marimba(pent(b+6,60),.22);marimba(pent(b+8,60),.16,.06);noise({dur:.04,vol:.07,type:'highpass',f:5000})};
sfx.jigDone=()=>{if(!ok())return;[0,2,4,7,9].forEach((s,i)=>marimba(pent(s+7,60),.2,i*.07));bell(pent(16,60),.12,1.2,.4)};

MAKERS.jigsaw=function({R,tier,level,board,api}){
  const[C,RW]=JIG_SIZES[Math.min(tier,JIG_SIZES.length-1)],N=C*RW,pic=JigPic.get(level),{s3,s2}=jigPar(N);
  /* ---------- rules (pure: the hint and the solver use them too) ---------- */
  const cx=i=>i%C,cy=i=>(i/C)|0;
  /* group id (a root cell) for every cell: neighbours lock when they hold neighbouring pieces in the same order */
  function groups(g){
    const p=Array.from({length:N},(_,i)=>i),fd=i=>{while(p[i]!==i){p[i]=p[p[i]];i=p[i]}return i};
    for(let i=0;i<N;i++){const a=g[i];
      if(cx(i)<C-1&&cx(a)<C-1&&g[i+1]===a+1)p[fd(i+1)]=fd(i);
      if(i+C<N&&g[i+C]===a+C)p[fd(i+C)]=fd(i)}
    return p.map((_,i)=>fd(i));
  }
  const links=g=>{let n=0;for(let i=0;i<N;i++){const a=g[i];if(cx(i)<C-1&&cx(a)<C-1&&g[i+1]===a+1)n++;if(i+C<N&&g[i+C]===a+C)n++}return n};
  const home=g=>{let n=0;for(let i=0;i<N;i++)if(g[i]===i)n++;return n};
  const cellsOf=(gid,G)=>{const r=[];for(let i=0;i<N;i++)if(gid[i]===G)r.push(i);return r};
  /* move group G by (ox,oy): the new board, or null when it does not fit */
  function plan(g,G,ox,oy,gid=groups(g)){
    if(!ox&&!oy)return null;
    const S=cellsOf(gid,G),T=[];
    for(const c of S){const x=cx(c)+ox,y=cy(c)+oy;if(x<0||y<0||x>=C||y>=RW)return null;T.push(y*C+x)}
    const inS=new Uint8Array(N),inT=new Uint8Array(N);S.forEach(c=>inS[c]=1);T.forEach(c=>inT[c]=1);
    const touched=new Map();
    for(const t of T)if(!inS[t]&&!touched.has(gid[t]))touched.set(gid[t],cellsOf(gid,gid[t]));
    const free=new Uint8Array(N);
    for(const c of S)if(!inT[c])free[c]=1;
    for(const cs of touched.values())for(const c of cs)if(!inT[c])free[c]=1;
    const out=g.slice();S.forEach((c,k)=>{out[T[k]]=g[c]});
    const multi=[...touched.values()].filter(cs=>cs.length>1).sort((a,b)=>b.length-a.length),singles=[...touched.values()].filter(cs=>cs.length===1).map(cs=>cs[0]);
    const used=new Uint8Array(N);let budget=4000;
    const offs=cs=>{const r=[];
      for(let dy=-RW+1;dy<RW;dy++)for(let dx=-C+1;dx<C;dx++){let ok=true;for(const c of cs){const x=cx(c)+dx,y=cy(c)+dy;if(x<0||y<0||x>=C||y>=RW||!free[y*C+x]){ok=false;break}}if(ok)r.push([dx,dy])}
      const d=([dx,dy])=>(dx+ox)**2+(dy+oy)**2+(dx*dx+dy*dy)*.01;return r.sort((a,b)=>d(a)-d(b))};
    const put=[];
    const bt=k=>{if(k===multi.length)return true;if(--budget<0)return false;const cs=multi[k];
      for(const[dx,dy]of offs(cs)){const tc=cs.map(c=>c+dy*C+dx);if(tc.some(t=>used[t]))continue;tc.forEach(t=>used[t]=1);put[k]=[cs,tc];if(bt(k+1))return true;tc.forEach(t=>used[t]=0)}
      return false};
    if(!bt(0))return null;
    put.forEach(([cs,tc])=>cs.forEach((c,i)=>{out[tc[i]]=g[c]}));
    /* single pieces: straight back along the move if that spot is free, else the nearest free spot */
    const left=[];for(let i=0;i<N;i++)if(free[i]&&!used[i])left.push(i);
    const todo=[];
    for(const c of singles){const x=cx(c)-ox,y=cy(c)-oy,t=y*C+x;if(x>=0&&y>=0&&x<C&&y<RW&&free[t]&&!used[t]){used[t]=1;out[t]=g[c]}else todo.push(c)}
    for(const c of todo){let best=-1,bd=1e9;for(const t of left)if(!used[t]){const d=Math.abs(cx(t)-cx(c))+Math.abs(cy(t)-cy(c));if(d<bd){bd=d;best=t}}if(best<0)return null;used[best]=1;out[best]=g[c]}
    return out;
  }
  /* the best next move: a group to its home spot, choosing the one that locks the most pieces; else any move that
     adds locks */
  function best(g){
    const gid=groups(g),roots=[...new Set(gid)];let bm=null,bs=-1;const base=links(g);
    for(const G of roots){const c0=G,a=g[c0],ox=cx(a)-cx(c0),oy=cy(a)-cy(c0);if(!ox&&!oy)continue;
      const ng=plan(g,G,ox,oy,gid);if(!ng)continue;const sc=(links(ng)-base)*100+home(ng)*2+cellsOf(gid,G).length;if(sc>bs){bs=sc;bm={G,ox,oy,anchor:c0}}}
    if(bm)return bm;
    for(const G of roots)for(let oy=-RW+1;oy<RW;oy++)for(let ox=-C+1;ox<C;ox++){const ng=plan(g,G,ox,oy,gid);if(!ng)continue;const sc=links(ng)-base;if(sc>bs){bs=sc;bm={G,ox,oy,anchor:G}}}
    return bs>0?bm:null;
  }
  /* the shuffle: no piece starts at home and no two pieces start locked together */
  function scramble(){
    let g;
    for(let t=0;t<4000;t++){g=shuffle([...Array(N).keys()],R);if(home(g)===0&&links(g)===0)return g}
    return g;
  }

  /* ---------- the board ---------- */
  let g=scramble(),moves=0,busy=false,sel=null,dr=null,justDragged=false,cw=60,ch=80,flags=null;
  const wrap=el('div','jgw'),frame=el('div','jgf'),bd=el('div','jgb'),tl=el('div','jtl'),peekEl=el('div','jpeek');
  wrap.style.setProperty('--C',C);wrap.style.setProperty('--R',RW);wrap.style.setProperty('--fc',pic.frame);wrap.style.setProperty('--pic',`url("${pic.url}")`);
  peekEl.innerHTML=`<img alt="" src="${pic.url}">`;
  frame.appendChild(bd);wrap.appendChild(frame);bd.appendChild(tl);bd.appendChild(peekEl);
  const pe=[];   // piece elements by piece id
  for(let p=0;p<N;p++){const e=el('div','jp','<div class="jc"><div class="ji"></div></div>');e.dataset.p=p;e.style.setProperty('--hx',cx(p));e.style.setProperty('--hy',cy(p));pe.push(e);bd.appendChild(e)}
  const tg=Array.from({length:N},()=>{const e=el('div','jtg');tl.appendChild(e);return e});
  board.appendChild(wrap);
  wrap.classList.add('loading');
  const img=new Image();img.src=pic.url;(img.decode?img.decode():Promise.resolve()).catch(()=>{}).then(()=>{wrap.classList.remove('loading');if(!gfx.reduced())pe.forEach((e,i)=>{e.style.animationDelay=(cy(g.indexOf(i))*C+cx(g.indexOf(i)))*Math.max(12,300/N)+'ms';e.classList.add('jin')})});
  function layout(){
    const w=Math.max(120,board.clientWidth-14),h=Math.max(160,board.clientHeight-10);
    let bw=Math.min(w,h*.75,620);cw=Math.floor(bw/C);ch=Math.floor(bw*4/3/RW);
    wrap.style.setProperty('--cw',cw+'px');wrap.style.setProperty('--ch',ch+'px');wrap.style.setProperty('--bw',cw*C+'px');wrap.style.setProperty('--bh',ch*RW+'px');
    place(false);
  }
  const posOf=p=>g.indexOf(p);
  function lockFlags(gg){   // per cell: [left,right,top,bottom] open (1) or locked (0)
    const f=[];for(let i=0;i<N;i++){const a=gg[i];
      f.push([+!(cx(i)>0&&cx(a)>0&&gg[i-1]===a-1),+!(cx(i)<C-1&&cx(a)<C-1&&gg[i+1]===a+1),+!(i>=C&&gg[i-C]===a-C),+!(i+C<N&&gg[i+C]===a+C)])}
    return f;
  }
  function place(anim=true){
    const f=lockFlags(g);
    for(let i=0;i<N;i++){const e=pe[g[i]],[l,r,t,b]=f[i];
      if(!anim)e.classList.add('still');e.classList.remove('pv');
      e.style.transform=`translate(${cx(i)*cw}px,${cy(i)*ch}px)`;e.dataset.c=i;
      e.style.setProperty('--ul',l);e.style.setProperty('--ur',r);e.style.setProperty('--ut',t);e.style.setProperty('--ub',b)}
    if(!anim){void bd.offsetWidth;pe.forEach(e=>e.classList.remove('still'))}
    flags=f;
  }
  const ro=window.ResizeObserver?new ResizeObserver(()=>{if(!dr)layout()}):null;if(ro)ro.observe(board);
  layout();

  /* ---------- feedback ---------- */
  function seams(before,after){
    /* sparkles along every newly locked edge; returns how many */
    const r=bd.getBoundingClientRect();let n=0;
    for(let i=0;i<N;i++){
      if(before[i][1]&&!after[i][1]){n++;if(n<=6)setTimeout(()=>flBurst(r.left+(cx(i)+1)*cw,r.top+(cy(i)+.5)*ch,'#fff3b0',8,.55),60)}
      if(before[i][3]&&!after[i][3]){n++;if(n<=6)setTimeout(()=>flBurst(r.left+(cx(i)+.5)*cw,r.top+(cy(i)+1)*ch,'#fff3b0',8,.55),60)}
    }
    return n;
  }
  function settle(prevFlags,G){
    const now=lockFlags(g),k=seams(prevFlags,now);
    if(k>0){
      const gid=groups(g),big=Math.max(...[...new Set(gid)].map(r=>cellsOf(gid,r).length));
      sfx.jigSnap(Math.min(6,big/2));buzz(12);
      const any=pe[g[(prevFlags.findIndex((f,i)=>f[1]&&!now[i][1]||f[3]&&!now[i][3])+N)%N]];api.good(any);
      /* the group that just grew gives a little pulse */
      const gid2=groups(g),root=gid2[g.indexOf(any?+any.dataset.p:0)];cellsOf(gid2,root).forEach(c=>gfx.pulse(pe[g[c]],'jsnap'));
      if(moves<=3&&!S.jig.tips.lock){S.jig.tips.lock=1;save();api.coach('🔒 Locked! Locked pieces move together')}
    }else{api.meh();sfx.jigDrop()}
    if(home(g)===N)return win();
    api.moves(moves,s3,s2);
  }
  function win(){
    busy=true;api.lock();api.moves(moves,s3,s2);
    setTimeout(()=>{wrap.classList.add('won');sfx.jigDone();buzz([20,40,30]);
      const r=frame.getBoundingClientRect();flRing(r.left+r.width/2,r.top+r.height/2,'#fff',Math.max(r.width,r.height)*.7,900)},380);
    setTimeout(()=>api.win(moves<=s3?3:moves<=s2?2:1),1700);
  }
  function commit(ng){
    const before=flags;g=ng;moves++;api.commit();place(true);settle(before);
  }

  /* ---------- drag, tap and the target outline ---------- */
  const bounds=cs=>{let x0=C,x1=0,y0=RW,y1=0;for(const c of cs){x0=Math.min(x0,cx(c));x1=Math.max(x1,cx(c));y0=Math.min(y0,cy(c));y1=Math.max(y1,cy(c))}return{x0,x1,y0,y1}};
  let tgOn=[];
  function showTarget(cs,ox,oy,ok){
    hideTarget();
    cs.forEach((c,k)=>{const e=tg[k],t=c+oy*C+ox;e.style.transform=`translate(${cx(t)*cw}px,${cy(t)*ch}px)`;e.className='jtg on'+(ok?'':' bad');tgOn.push(e)});
  }
  function hideTarget(){tgOn.forEach(e=>{e.className='jtg';delete e.dataset.h});tgOn=[]}
  /* while a group is dragged, the pieces it would push aside slide to where they would go (and back if it can't land) */
  function preview(ng,cs){
    const mv=new Set(cs.map(c=>g[c])),src=ng||g;
    for(let i=0;i<N;i++){const q=src[i];if(mv.has(q))continue;const e=pe[q];e.style.transform=`translate(${cx(i)*cw}px,${cy(i)*ch}px)`;e.classList.toggle('pv',!!ng&&g[i]!==q)}
  }
  let lift=null;
  function liftUp(cs){
    const L=el('div','jlift');bd.appendChild(L);cs.forEach(c=>L.appendChild(pe[g[c]]));lift=L;sfx.jigLift();
    requestAnimationFrame(()=>L.classList.add('up'));return L;
  }
  function liftDown(cb,toX=0,toY=0){
    const L=lift;if(!L){cb&&cb();return}lift=null;
    L.classList.add('land');L.style.transform=`translate(${toX}px,${toY}px)`;
    /* the pieces go back on the board exactly where the lift put them (no transition), then the move plays out */
    const done=()=>{if(!L.isConnected)return;[...L.children].forEach(e=>{const c=+e.dataset.c;e.classList.add('still');e.style.transform=`translate(${cx(c)*cw+toX}px,${cy(c)*ch+toY}px)`;bd.appendChild(e)});
      void bd.offsetWidth;pe.forEach(e=>e.classList.remove('still'));L.remove();cb&&cb()};
    if(gfx.reduced())done();else setTimeout(done,170);
  }
  function refuse(){api.shake();sfx.bonk();buzz(30);if(!S.jig.tips.room){S.jig.tips.room=1;save();api.coach('No room for that group there: move the other group first')}}
  const cellAt=(x,y)=>{const r=bd.getBoundingClientRect(),c=Math.floor((x-r.left)/cw),w=Math.floor((y-r.top)/ch);return c<0||w<0||c>=C||w>=RW?-1:w*C+c};
  bd.addEventListener('pointerdown',e=>{
    if(busy||api.over()||dr)return;const p=e.target.closest('.jp');if(!p||e.button>0)return;
    const c=posOf(+p.dataset.p),gid=groups(g),G=gid[c],cs=cellsOf(gid,G);
    dr={G,c,cs,b:bounds(cs),x0:e.clientX,y0:e.clientY,id:e.pointerId,moved:false,ox:0,oy:0};
    try{bd.setPointerCapture(e.pointerId)}catch(_){}
  });
  bd.addEventListener('pointermove',e=>{
    if(!dr||e.pointerId!==dr.id)return;const dx=e.clientX-dr.x0,dy=e.clientY-dr.y0;
    if(!dr.moved){if(Math.hypot(dx,dy)<7)return;dr.moved=true;clearSel();liftUp(dr.cs)}
    lift.style.transform=`translate(${dx}px,${dy}px)`;
    const ox=clamp(Math.round(dx/cw),-dr.b.x0,C-1-dr.b.x1),oy=clamp(Math.round(dy/ch),-dr.b.y0,RW-1-dr.b.y1);
    if(ox!==dr.ox||oy!==dr.oy||!tgOn.length){dr.ox=ox;dr.oy=oy;
      if(ox||oy){const ng=plan(g,dr.G,ox,oy);showTarget(dr.cs,ox,oy,!!ng);preview(ng,dr.cs)}else{hideTarget();preview(null,dr.cs)}}
  });
  const endDrag=e=>{
    if(!dr||e.pointerId!==dr.id)return;const d=dr;dr=null;
    if(!d.moved)return;   // a tap: the click handler takes it
    justDragged=true;setTimeout(()=>justDragged=false,60);hideTarget();
    const ng=e.type==='pointercancel'||(!d.ox&&!d.oy)?null:plan(g,d.G,d.ox,d.oy);
    if(ng){liftDown(()=>commit(ng),d.ox*cw,d.oy*ch)}
    else{preview(null,d.cs);if(d.ox||d.oy)refuse();liftDown(null,0,0)}
  };
  bd.addEventListener('pointerup',endDrag);bd.addEventListener('pointercancel',endDrag);
  function clearSel(){if(sel){sel=null;liftDown(null,0,0)}hideTarget()}
  bd.addEventListener('click',e=>{
    if(justDragged||busy||api.over())return;
    /* the board captures the pointer, so a tap usually arrives on the board itself: find the cell from where it was */
    let p=e.target.closest('.jp');const t=e.target.closest('.jtg[data-h]');
    const c=t?+t.dataset.c:p&&!lift?.contains(p)?posOf(+p.dataset.p):cellAt(e.clientX,e.clientY);
    if(c<0)return;if(!p||lift?.contains(p))p=pe[g[c]];
    if(!sel){if(!p)return;const gid=groups(g),cs=cellsOf(gid,gid[c]);sel={G:gid[c],c,cs};liftUp(cs);return}
    const gid=groups(g);
    if(p&&gid[c]===sel.G&&!t){clearSel();return}
    const ox=cx(c)-cx(sel.c),oy=cy(c)-cy(sel.c),G=sel.G;sel=null;hideTarget();
    const ng=plan(g,G,ox,oy);
    if(ng)liftDown(()=>commit(ng),ox*cw,oy*ch);else{liftDown(null,0,0);refuse()}
  });

  /* ---------- peek: the whole picture over the board ---------- */
  let peekT=0;
  function peek(on){clearTimeout(peekT);wrap.classList.toggle('peek',on!==false);if(on===undefined)peekT=setTimeout(()=>wrap.classList.remove('peek'),1600)}

  api.moves(0,s3,s2);
  return{
    noNudge:true,
    goal:`${C}×${RW} · ${N} pieces · ★★★ in ${s3} moves`,goalShort:`${N} pieces · ★★★ ≤${s3}`,
    snap:()=>g.join(',')+'|'+moves,
    restore(s){const[a,m]=s.split('|');g=a.split(',').map(Number);moves=+m;sel=null;if(lift){[...lift.children].forEach(e=>bd.appendChild(e));lift.remove();lift=null}hideTarget();place(true);api.moves(moves,s3,s2)},
    hint(){
      if(busy)return false;const m=best(g);if(!m){toast('No move to show');return false}
      clearSel();const gid=groups(g),cs=cellsOf(gid,m.G);
      cs.forEach(c=>api.flash(pe[g[c]],3200));pe[g[m.anchor]].dataset.h='1';
      showTarget(cs,m.ox,m.oy,true);const t=tgOn[cs.indexOf(m.anchor)]||tgOn[0];t.dataset.h='2';t.dataset.c=m.anchor+m.oy*C+m.ox;tgOn.forEach(e=>e.classList.add('hint'));
      setTimeout(()=>{if(!sel)hideTarget();pe.forEach(e=>delete e.dataset.h)},3200);
      return true;
    },
    _bot(){if(busy)return true;const m=best(g);if(!m)return false;const ng=plan(g,m.G,m.ox,m.oy);if(!ng)return false;commit(ng);return true},
    _state:()=>({g:g.slice(),moves,C,R:RW,N,links:links(g),home:home(g),groups:new Set(groups(g)).size,title:pic.title}),
    _plan:(G,ox,oy)=>!!plan(g,G,ox,oy),
    _move(G,ox,oy){if(busy)return false;const ng=plan(g,G,ox,oy);if(!ng)return false;commit(ng);return true},
    _groups:()=>groups(g),
    peek,
    begin(){if(level<=1&&!S.jig.tips.drag){S.jig.tips.drag=1;save();api.coach('👆 Drag a piece onto another to swap them')}},
    destroy(){if(ro)ro.disconnect();clearTimeout(peekT)}
  };
};
